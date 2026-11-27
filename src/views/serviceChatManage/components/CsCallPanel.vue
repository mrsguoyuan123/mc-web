<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Phone, VideoPause, Connection } from '@element-plus/icons-vue'
import {
  getCsPatientPhoneStatusById,
  startCsCallById
} from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing } from '../../../utils/index.js'
import { avatarColor, maskPhone } from '../utils.js'
import CsCallRecordForm from './CsCallRecordForm.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  patientId: { type: [String, Number], default: '' },
  patient: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'recorded'])

// 通话状态机：IDLE 待呼叫 / CALLING 准备呼叫 / CONNECTED 通话中 / ENDED 已结束 / FAILED 失败
// TODO 待后端补通话状态回调/轮询端点，当前状态推进由前端交互占位
const callState = ref('IDLE')
const callId = ref('')
const virtualNumber = ref('')
const seconds = ref(0)
const starting = ref(false)
const phoneStatus = ref(null)
const showForm = ref(false)

let timer = null
let connectTimer = null

const patient = computed(() => props.patient || {})

const STATUS_TEXT = {
  IDLE: '待呼叫',
  CALLING: '准备呼叫',
  CONNECTED: '通话中',
  ENDED: '通话已结束',
  FAILED: '呼叫失败'
}

const inCall = computed(() => ['CALLING', 'CONNECTED'].includes(callState.value))
const ended = computed(() => ['ENDED', 'FAILED'].includes(callState.value))

const timerText = computed(() => {
  const min = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const sec = String(seconds.value % 60).padStart(2, '0')
  return `${min}:${sec}`
})

const clearTimers = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

const fetchPhoneStatus = async () => {
  if (!props.patientId) return
  try {
    phoneStatus.value = await getCsPatientPhoneStatusById(String(props.patientId))
  } catch {
    phoneStatus.value = null
  }
}

const resetPanel = () => {
  clearTimers()
  callState.value = 'IDLE'
  callId.value = ''
  virtualNumber.value = ''
  seconds.value = 0
  starting.value = false
  showForm.value = false
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetPanel()
      fetchPhoneStatus()
    } else {
      clearTimers()
    }
  }
)

onBeforeUnmount(clearTimers)

const startCall = async () => {
  if (!props.patientId || inCall.value || starting.value) return
  starting.value = true
  try {
    const session = await startCsCallById(String(props.patientId))
    // 保留 callId 用于提交记录幂等；virtualNumber 展示虚拟保护号
    callId.value = session?.callId || ''
    virtualNumber.value = session?.virtualNumber || ''
    callState.value = 'CALLING'
    seconds.value = 0

    // TODO 待后端补通话状态回调/轮询：此处用前端定时器占位模拟接通，真实接通时间以后端事件为准
    connectTimer = setTimeout(() => {
      if (callState.value !== 'CALLING') return
      callState.value = 'CONNECTED'
      timer = setInterval(() => {
        seconds.value += 1
      }, 1000)
    }, 2000)
  } catch {
    callState.value = 'FAILED'
    showForm.value = true
  } finally {
    starting.value = false
  }
}

const hangup = () => {
  clearTimers()
  if (inCall.value) callState.value = 'ENDED'
  showForm.value = true
}

// 模拟线路异常状态：无真实线路检测端点，仅用于前端演示失败分支
// TODO 待后端补线路状态/异常回调后，由真实事件驱动 FAILED
const simulateException = () => {
  if (!inCall.value) {
    ElMessage.info('请先拨打虚拟电话')
    return
  }
  clearTimers()
  callState.value = 'FAILED'
  showForm.value = true
}

const handleRecordSuccess = () => {
  showForm.value = false
  resetPanel()
  fetchPhoneStatus()
  emit('recorded')
}

const handleFormCancel = () => {
  showForm.value = false
  resetPanel()
}

const closeDrawer = () => emit('update:modelValue', false)
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="460px"
    :with-header="false"
    class="call-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="call-shell">
      <header class="call-header">
        <div>
          <h3>虚拟电话</h3>
          <!-- 接口未提供：用户编号字段缺失，待后端补 patientCode -->
          <p class="header-sub">
            当前关联：{{ isMissing(patient.name) ? MISSING_TEXT : patient.name }}
            （{{ MISSING_TEXT }}）
          </p>
        </div>
        <el-button text @click="closeDrawer">关闭</el-button>
      </header>

      <div class="dark-card">
        <span class="avatar" :style="{ background: avatarColor(patient.name) }">
          {{ isMissing(patient.name) ? '?' : String(patient.name).slice(0, 1) }}
        </span>
        <strong class="dark-name">
          {{ isMissing(patient.name) ? MISSING_TEXT : patient.name }}
        </strong>
        <p class="dark-sub">
          {{ MISSING_TEXT }} · {{ isMissing(patient.phone) ? MISSING_TEXT : maskPhone(patient.phone) }}
        </p>
        <p class="dark-status">{{ STATUS_TEXT[callState] }}</p>
        <p class="dark-timer">{{ timerText }}</p>
      </div>

      <div class="info-card">
        <div class="info-cell">
          <label>虚拟号码</label>
          <p :class="{ missing: !virtualNumber }">
            {{ virtualNumber || MISSING_TEXT }}
          </p>
        </div>
        <div class="info-cell">
          <label>线路状态</label>
          <!-- TODO 待后端补线路检测端点：不伪造「线路可用 · 网络良好」，缺失显式占位 -->
          <p class="missing">
            <el-icon><Connection /></el-icon>
            {{ MISSING_TEXT }}
          </p>
        </div>
      </div>

      <div class="phone-status">
        <template v-if="phoneStatus">
          <el-tag size="small" :type="phoneStatus.called ? 'primary' : 'success'">
            {{ phoneStatus.called ? '已拨打' : '未拨打' }}
          </el-tag>
          <span v-if="phoneStatus.latestCallTime" class="latest-time">
            最近通话 {{ formatTime(phoneStatus.latestCallTime) }}
          </span>
        </template>
        <span v-else class="missing">{{ MISSING_TEXT }}</span>
      </div>

      <el-button
        v-if="!inCall"
        type="success"
        size="large"
        class="call-btn"
        :loading="starting"
        @click="startCall"
      >
        <el-icon><Phone /></el-icon>
        {{ ended ? '重新拨打虚拟电话' : '拨打虚拟电话' }}
      </el-button>
      <el-button
        v-else
        type="danger"
        size="large"
        class="call-btn"
        @click="hangup"
      >
        <el-icon><VideoPause /></el-icon>
        挂断
      </el-button>

      <button
        type="button"
        class="simulate-link"
        :disabled="!inCall"
        @click="simulateException"
      >
        模拟线路异常状态
      </button>

      <CsCallRecordForm
        v-if="showForm && patientId"
        :patient-id="patientId"
        :call-id="callId"
        :virtual-number="virtualNumber"
        :default-status="callState === 'FAILED' ? 'FAILED' : 'SUCCESS'"
        :default-duration="seconds"
        @success="handleRecordSuccess"
        @cancel="handleFormCancel"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.call-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 22px 20px;
  overflow-y: auto;
  background: #f8fafc;
}

.call-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.call-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.header-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.dark-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  border-radius: 16px;
  background: #0b1220;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
}

.dark-name {
  font-size: 18px;
  color: #fff;
}

.dark-sub {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.dark-status {
  margin: 6px 0 0;
  font-size: 13px;
  color: #cbd5e1;
}

.dark-timer {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.info-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid #edf1f7;
  border-radius: 14px;
  background: #fff;
}

.info-cell label {
  font-size: 12px;
  color: #94a3b8;
}

.info-cell p {
  margin: 6px 0 0;
  font-size: 14px;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 4px;
}

.missing {
  color: #ef4444 !important;
  font-size: 12px !important;
}

.phone-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
}

.call-btn {
  width: 100%;
  height: 46px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
}

.simulate-link {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #64748b;
  text-decoration: underline;
  cursor: pointer;
  align-self: center;
}

.simulate-link:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
  text-decoration: none;
}
</style>
<style>
.call-drawer .el-drawer__body {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
