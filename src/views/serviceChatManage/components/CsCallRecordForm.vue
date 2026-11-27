<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createCsCallRecordById } from '../../../api/index.js'
import { isMissing } from '../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' },
  // 发起双呼返回的会话 id / 虚拟号，提交时回传做幂等
  callId: { type: String, default: '' },
  virtualNumber: { type: String, default: '' },
  // 挂断后带入的默认结果与计时时长（秒），客服可在表单内校正
  defaultStatus: { type: String, default: 'SUCCESS' },
  defaultDuration: { type: Number, default: 0 }
})

const emit = defineEmits(['success', 'cancel'])

const formRef = ref(null)
const submitting = ref(false)

const createDefaultForm = () => ({
  callStatus: props.defaultStatus || 'SUCCESS',
  failReason: '',
  durationSec: Number(props.defaultDuration) || 0,
  medicationStatus: '',
  recoveryStatus: '',
  complianceStatus: '',
  coreElements: '',
  precautions: '',
  problems: '',
  recordRemark: '',
  servicePackageFeedback: '',
  repurchaseIntent: '',
  ivrSatisfaction: 0,
  improvementSuggestion: '',
  otherDemand: '',
  secondarySales: false,
  csRemark: '',
  pushToGroup: false
})

const form = reactive(createDefaultForm())

watch(
  () => [props.defaultStatus, props.defaultDuration, props.patientId],
  () => {
    Object.assign(form, createDefaultForm())
  }
)

const isSuccess = computed(() => form.callStatus === 'SUCCESS')
const isFailed = computed(() => form.callStatus === 'FAILED')

const rules = computed(() => ({
  callStatus: [{ required: true, message: '请选择通话结果', trigger: 'change' }],
  failReason: isFailed.value
    ? [{ required: true, message: '请选择失败原因', trigger: 'change' }]
    : [],
  durationSec: isSuccess.value
    ? [{ required: true, message: '请填写通话时长（秒）', trigger: 'blur' }]
    : []
}))

const CALL_STATUS_OPTIONS = [
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' }
]

const FAIL_REASON_OPTIONS = [
  { value: 'NO_ANSWER', label: '无人接听' },
  { value: 'WRONG_NUMBER', label: '号码错误' },
  { value: 'REJECTED', label: '拒接' },
  { value: 'INTERRUPTED', label: '通话中断' }
]

const MEDICATION_OPTIONS = [
  { value: 'ON_TIME', label: '按时' },
  { value: 'OCCASIONAL_MISS', label: '偶漏' },
  { value: 'STOPPED', label: '已停' },
  { value: 'SELF_ADJUSTED', label: '自行调整' }
]

const RECOVERY_OPTIONS = [
  { value: 'GOOD', label: '良好' },
  { value: 'FAIR', label: '一般' },
  { value: 'POOR', label: '较差' }
]

const COMPLIANCE_OPTIONS = [
  { value: 'FULL', label: '完全' },
  { value: 'PARTIAL', label: '部分' },
  { value: 'NONE', label: '不依从' }
]

const PACKAGE_FEEDBACK_OPTIONS = [
  { value: 'USED_CORE', label: '用核心' },
  { value: 'NOT_USED', label: '未用' },
  { value: 'ISSUES', label: '有问题' }
]

const REPURCHASE_OPTIONS = [
  { value: 'INTERESTED', label: '有兴趣' },
  { value: 'NOT_INTERESTED', label: '无兴趣' },
  { value: 'UNSURE', label: '不确定' }
]

const TEXTAREA_FIELDS = [
  { key: 'coreElements', label: '核心要素' },
  { key: 'precautions', label: '注意事项宣教' },
  { key: 'problems', label: '问题记录' },
  { key: 'recordRemark', label: '记录备注' },
  { key: 'improvementSuggestion', label: '改进建议' },
  { key: 'otherDemand', label: '其他需求' },
  { key: 'csRemark', label: '客服备注（仅客服可见）' }
]

// FAILED 时强制关闭群推送：推送仅在 SUCCESS 生效
const handleStatusChange = (value) => {
  if (value === 'FAILED' && form.pushToGroup) {
    form.pushToGroup = false
    ElMessage.info('失败通话不支持同步沟通群，已取消勾选')
  }
}

const handlePushChange = (value) => {
  if (value && isFailed.value) {
    form.pushToGroup = false
    ElMessage.warning('仅成功通话可同步通话记录卡片到沟通群')
  }
}

const handleSubmit = async () => {
  if (!formRef.value || !props.patientId) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const payload = { callStatus: form.callStatus }
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'callStatus') return
      // 空串/null/undefined 不传；0/false 为有效值保留
      if (isMissing(value)) return
      payload[key] = value
    })
    // 条件字段收口：FAILED 不带时长/服务包反馈/群推送
    if (isFailed.value) {
      delete payload.durationSec
      delete payload.servicePackageFeedback
      payload.pushToGroup = false
    }
    if (props.callId) payload.callId = String(props.callId)
    if (props.virtualNumber) payload.virtualNumber = props.virtualNumber

    await createCsCallRecordById(String(props.patientId), payload)
    ElMessage.success('通话记录已提交')
    emit('success')
  } catch {
    // 全局业务异常处理器已提示；保留表单内容与 callId，便于修正后重试
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="record-form">
    <h4>填写通话记录</h4>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="call-form"
    >
      <el-form-item label="通话结果" prop="callStatus">
        <el-radio-group
          :model-value="form.callStatus"
          @update:model-value="(v) => { form.callStatus = v; handleStatusChange(v) }"
        >
          <el-radio v-for="opt in CALL_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="isFailed" label="失败原因" prop="failReason">
        <el-select v-model="form.failReason" placeholder="请选择失败原因" class="full-width">
          <el-option
            v-for="opt in FAIL_REASON_OPTIONS"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="isSuccess" label="通话时长（秒，可人工校正）" prop="durationSec">
        <el-input-number
          v-model="form.durationSec"
          :min="0"
          :step="1"
          class="full-width"
        />
      </el-form-item>

      <div class="form-grid">
        <el-form-item label="用药情况">
          <el-select v-model="form.medicationStatus" placeholder="请选择" clearable>
            <el-option
              v-for="opt in MEDICATION_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="恢复情况">
          <el-select v-model="form.recoveryStatus" placeholder="请选择" clearable>
            <el-option
              v-for="opt in RECOVERY_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="依从性">
          <el-select v-model="form.complianceStatus" placeholder="请选择" clearable>
            <el-option
              v-for="opt in COMPLIANCE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isSuccess" label="服务包反馈">
          <el-select v-model="form.servicePackageFeedback" placeholder="请选择" clearable>
            <el-option
              v-for="opt in PACKAGE_FEEDBACK_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="复购意向">
          <el-select v-model="form.repurchaseIntent" placeholder="请选择" clearable>
            <el-option
              v-for="opt in REPURCHASE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="患者 IVR 按键满意度">
          <el-rate v-model="form.ivrSatisfaction" :max="5" />
        </el-form-item>
      </div>

      <el-form-item
        v-for="field in TEXTAREA_FIELDS"
        :key="field.key"
        :label="field.label"
      >
        <el-input
          v-model="form[field.key]"
          type="textarea"
          :rows="2"
          maxlength="1024"
          show-word-limit
          :placeholder="`请输入${field.label}（不超过 1024 字）`"
        />
      </el-form-item>

      <div class="switch-row">
        <el-form-item label="二次销售潜力（仅客服可见）">
          <el-switch v-model="form.secondarySales" />
        </el-form-item>
        <el-form-item v-if="isSuccess" label="同步通话记录卡片到沟通群">
          <el-switch :model-value="form.pushToGroup" @update:model-value="handlePushChange" />
        </el-form-item>
      </div>

      <div class="form-actions">
        <el-button @click="emit('cancel')">取消</el-button>
        <el-button type="primary" dark :loading="submitting" @click="handleSubmit">
          提交记录
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped>
.record-form {
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #edf1f7;
  border-radius: 14px;
  background: #fff;
}

.record-form h4 {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.form-grid :deep(.el-select) {
  width: 100%;
}

.full-width {
  width: 100%;
}

.switch-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>