<script setup>
import { onMounted, ref, watch } from 'vue'
import {
  getPatientById,
  getPatientProfileById
} from '../../../../api/index.js'
import {
  HEALTH_STATUS_TAG,
  MISSING_TEXT,
  formatTime,
  healthStatusText,
  isMissing,
  safeParseJson
} from '../../../../utils/index.js'
import {
  COMMUNICATE_STATUS_TEXT,
  PURCHASE_INTENT_TEXT,
  maskPhone
} from '../../utils.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const profile = ref(null)
const patient = ref(null)

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    // 聚合端点优先：一次性返回 patient/medicalRecord/serviceRelations/tags/sales/attachmentCount
    const res = await getPatientProfileById(String(props.patientId))
    profile.value = res
    patient.value = res?.patient || null
  } catch {
    // 聚合端点失败时兜底基础患者详情
    try {
      patient.value = await getPatientById(String(props.patientId))
      profile.value = { patient: patient.value }
    } catch {
      profile.value = null
      patient.value = null
      error.value = true
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  () => fetchData(),
  { immediate: true }
)

onMounted(fetchData)

const tags = () => {
  if (Array.isArray(profile.value?.tags)) return profile.value.tags.filter((t) => !isMissing(t))
  return safeParseJson(patient.value?.tagsJson, []).filter((t) => !isMissing(t))
}

// 资料字段统一缺失兜底；0/false 为有效值
const val = (value) => (isMissing(value) ? MISSING_TEXT : value)
const sales = () => profile.value?.sales || {}
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else-if="patient">
      <section class="info-section">
        <h4>身份与账户信息</h4>
        <div class="info-card">
          <div class="cell">
            <label>姓名</label>
            <p :class="{ missing: isMissing(patient.name) }">{{ val(patient.name) }}</p>
          </div>
          <div class="cell">
            <label>性别</label>
            <p :class="{ missing: isMissing(patient.gender) }">{{ val(patient.gender) }}</p>
          </div>
          <div class="cell">
            <label>年龄</label>
            <p :class="{ missing: isMissing(patient.age) }">
              {{ isMissing(patient.age) ? MISSING_TEXT : `${patient.age}岁` }}
            </p>
          </div>
          <div class="cell">
            <!-- 接口未提供：Patient 无用户编号字段，待后端补 patientCode -->
            <label>用户编号</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>

          <div class="cell">
            <label>手机号</label>
            <p :class="{ missing: isMissing(patient.phone) }">
              {{ isMissing(patient.phone) ? MISSING_TEXT : maskPhone(patient.phone) }}
            </p>
          </div>
          <div class="cell">
            <label>所在地区</label>
            <p :class="{ missing: isMissing(patient.region) }">{{ val(patient.region) }}</p>
          </div>
          <div class="cell">
            <label>保险ID</label>
            <p :class="{ missing: isMissing(patient.insuranceId) }">
              {{ val(patient.insuranceId) }}
            </p>
          </div>
          <div class="cell">
            <label>入库时间</label>
            <p :class="{ missing: isMissing(patient.createTime) }">
              {{ isMissing(patient.createTime) ? MISSING_TEXT : formatTime(patient.createTime, true) }}
            </p>
          </div>

          <div class="cell">
            <!-- 接口未提供：无绑定日期字段，registerDate 为注册时间，语义不一致，不强行映射 -->
            <label>绑定日期</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell">
            <label>健康状态</label>
            <el-tag
              v-if="!isMissing(patient.healthStatus)"
              size="small"
              :type="HEALTH_STATUS_TAG[patient.healthStatus] || 'info'"
            >
              {{ healthStatusText(patient.healthStatus) }}
            </el-tag>
            <p v-else class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell cell-wide">
            <label>用户标签</label>
            <div v-if="tags().length" class="tag-box">
              <el-tag v-for="tag in tags()" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            </div>
            <p v-else class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell">
            <label>附件数量</label>
            <p :class="{ missing: isMissing(profile.attachmentCount) }">
              {{ isMissing(profile.attachmentCount)
                ? MISSING_TEXT
                : `${profile.attachmentCount}份` }}
            </p>
          </div>

          <div class="cell">
            <!-- 接口未提供：当前服务状态枚举未在 Patient 模型下发 -->
            <label>当前服务状态</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell">
            <label>资料权限</label>
            <p>客服只读</p>
          </div>
        </div>
      </section>

      <section class="info-section">
        <h4>联系与服务摘要</h4>
        <div class="info-card">
          <!-- 接口未提供：紧急联系人/详细地址/最近登录/健康管理群/同步状态均无对应字段 -->
          <div class="cell cell-wide">
            <label>联系地址</label>
            <p :class="{ missing: isMissing(patient.region) }">
              {{ isMissing(patient.region) ? MISSING_TEXT : patient.region }}
            </p>
          </div>
          <div class="cell">
            <label>紧急联系人</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell">
            <label>最近登录</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>

          <div class="cell">
            <label>最近沟通</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>
          <div class="cell">
            <label>沟通状态</label>
            <p :class="{ missing: isMissing(patient.communicateStatus) }">
              {{ isMissing(patient.communicateStatus)
                ? MISSING_TEXT
                : COMMUNICATE_STATUS_TEXT[patient.communicateStatus] || patient.communicateStatus }}
            </p>
          </div>
          <div class="cell">
            <label>数据同步状态</label>
            <p class="missing">{{ MISSING_TEXT }}</p>
          </div>

          <div class="cell">
            <label>服务包</label>
            <p :class="{ missing: isMissing(patient.servicePackage) }">
              {{ val(patient.servicePackage) }}
            </p>
          </div>
          <div class="cell">
            <label>购买意向</label>
            <p :class="{ missing: isMissing(patient.purchaseIntent) }">
              {{ isMissing(patient.purchaseIntent)
                ? MISSING_TEXT
                : PURCHASE_INTENT_TEXT[patient.purchaseIntent] || patient.purchaseIntent }}
            </p>
          </div>
          <div class="cell">
            <label>注册时间</label>
            <p :class="{ missing: isMissing(patient.registerDate) }">
              {{ isMissing(patient.registerDate)
                ? MISSING_TEXT
                : formatTime(patient.registerDate, true) }}
            </p>
          </div>
        </div>
      </section>

      <div class="readonly-note">
        本页面为客服只读视图。用户资料修改需进入用户管理仓并根据角色权限操作。
      </div>
    </template>

    <el-empty v-else-if="!loading" description="暂无基本信息" :image-size="90" />
  </div>
</template>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section h4 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.info-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 24px;
  padding: 20px 22px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cell-wide {
  grid-column: span 2;
}

.cell label {
  font-size: 12px;
  color: #94a3b8;
}

.cell p {
  margin: 0;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.tag-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.readonly-note {
  padding: 12px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  font-size: 13px;
  color: #1d4ed8;
  background: #eff6ff;
}

.block-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .info-card {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
