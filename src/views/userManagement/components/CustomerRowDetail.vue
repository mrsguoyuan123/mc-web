<script setup>
import { computed, ref, watch } from 'vue'
import {
  WarningFilled,
  Bell,
  ChatRound,
  ChatDotRound,
  Connection,
  Folder,
  Edit,
  ArrowRight,
  UserFilled,
  Service,
  View
} from '@element-plus/icons-vue'
import {
  getRiskAlertPage,
  getPatientCommunicationsById,
  getPatientServiceRelationsById,
  getEscortQuotaRecordsById
} from '../../../api/index.js'
import { HEALTH_STATUS_TAG_TYPE, displayText, formatTime, toPage } from '../../../utils/index.js'

const props = defineProps({
  record: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'view-detail',
  'edit-doctor',
  'group-manage',
  'service-relation',
  'view-communications',
  'attachment-manage',
  'edit-quota',
  'change-log'
])

// 接口未就绪前统一使用空数组 + 加载态，统计/指标缺省显示 0 或 -
const loading = ref({ risk: false, metric: false, service: false, communication: false })
const riskAlerts = ref([])
const communications = ref([])
const serviceRelations = ref({ current: null, logs: [] })
const quotaLogs = ref([])

const patient = computed(() => props.record || {})
const patientId = computed(() => (patient.value.id ? String(patient.value.id) : ''))

const pickText = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return '-'
}

const pickMetric = (...keys) => {
  for (const key of keys) {
    const value = patient.value[key]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return '-'
}

const healthTagType = computed(() => HEALTH_STATUS_TAG_TYPE[patient.value.healthStatus] || 'info')

const baseInfo = computed(() => [
  { key: 'age', label: '年龄', value: displayText(patient.value.age) },
  { key: 'phone', label: '电话', value: displayText(patient.value.phone) },
  { key: 'region', label: '区域', value: displayText(patient.value.region) },
  { key: 'hospital', label: '医院', value: pickText(patient.value.hospitalName, patient.value.hospital) },
  { key: 'department', label: '科室', value: pickText(patient.value.departmentName, patient.value.dept) },
  { key: 'disease', label: '疾病诊断', value: displayText(patient.value.diseaseIntro) },
  { key: 'health', label: '健康状态' },
  { key: 'insurance', label: '保险ID', value: displayText(patient.value.insuranceId) }
])

const metricList = computed(() => [
  { label: '体重', value: pickMetric('weightKg', 'weight') },
  { label: '血压', value: pickMetric('bloodPressure', 'bp') },
  { label: '血糖', value: pickMetric('bloodGlucose', 'glucose') },
  { label: '用药', value: pickMetric('medication', 'medicine') },
  { label: '睡眠 PSQI', value: pickMetric('sleepPsqi', 'psqi') },
  { label: '运动状态', value: pickMetric('exercise', 'sport') }
])

const latestRisk = computed(() => riskAlerts.value[0] || null)
const riskDescription = computed(() =>
  latestRisk.value ? latestRisk.value.content || latestRisk.value.title || '暂无风险描述' : '暂无待处理异常'
)

const currentRelation = computed(() => serviceRelations.value.current || {})
const doctorName = computed(() =>
  pickText(
    currentRelation.value.doctorName,
    currentRelation.value.attendingDoctorName,
    patient.value.attendingDoctorName,
    patient.value.doctorName
  )
)
const csName = computed(() =>
  pickText(currentRelation.value.csName, patient.value.csName, patient.value.serviceCsName)
)
const caregiverName = computed(() =>
  pickText(currentRelation.value.caregiverName, currentRelation.value.stationName, patient.value.caregiverName)
)
const remainingQuota = computed(() => {
  const quota = patient.value.escortQuota ?? currentRelation.value.escortQuota
  return Number.isFinite(Number(quota)) ? Number(quota) : 0
})
const changeLogCount = computed(() => serviceRelations.value.logs?.length ?? 0)

const latestCommunication = computed(() => communications.value[0] || null)
const unreadCount = computed(() => {
  const count = latestCommunication.value?.unreadCount ?? patient.value.unreadCount ?? 0
  return Number(count) || 0
})

const resetAll = () => {
  riskAlerts.value = []
  communications.value = []
  serviceRelations.value = { current: null, logs: [] }
  quotaLogs.value = []
  loading.value = { risk: false, metric: false, service: false, communication: false }
}

const loadDetail = async () => {
  if (!patientId.value) {
    resetAll()
    return
  }
  loading.value = { risk: true, metric: true, service: true, communication: true }
  const [riskRes, commRes, relationRes, quotaRes] = await Promise.allSettled([
    getRiskAlertPage({ status: 'PENDING', page: 1, pageSize: 20 }),
    getPatientCommunicationsById(patientId.value, { page: 1, pageSize: 5 }),
    getPatientServiceRelationsById(patientId.value),
    getEscortQuotaRecordsById(patientId.value, { page: 1, pageSize: 20 })
  ])
  riskAlerts.value =
    riskRes.status === 'fulfilled'
      ? toPage(riskRes.value).list.filter((item) => String(item.patientId) === patientId.value)
      : []
  communications.value = commRes.status === 'fulfilled' ? toPage(commRes.value).list : []
  serviceRelations.value =
    relationRes.status === 'fulfilled'
      ? { current: relationRes.value?.current ?? null, logs: relationRes.value?.logs ?? [] }
      : { current: null, logs: [] }
  quotaLogs.value = quotaRes.status === 'fulfilled' ? toPage(quotaRes.value).list : []
  loading.value = { risk: false, metric: false, service: false, communication: false }
}

watch(patientId, loadDetail, { immediate: true })

const onEditQuota = () => emit('edit-quota', patient.value)
const onChangeLog = () =>
  emit('change-log', { record: patient.value, logs: serviceRelations.value.logs, quotaLogs: quotaLogs.value })

const footerActions = [
  { key: 'view-detail', label: '查看详情', icon: View },
  { key: 'edit-doctor', label: '修改绑定主治医生', icon: Edit },
  { key: 'group-manage', label: '健康管理群管理', icon: ChatDotRound },
  { key: 'service-relation', label: '服务关系', icon: Connection },
  { key: 'view-communications', label: '查看沟通记录', icon: ChatRound },
  { key: 'attachment-manage', label: '附件管理', icon: Folder }
]
const onFooter = (action) => emit(action.key, patient.value)
</script>

<template>
  <div class="customer-row-detail">
    <section class="detail-card">
      <h3 class="section-title">
        <el-icon><UserFilled /></el-icon>
        基础信息
      </h3>
      <el-row :gutter="10" class="base-grid">
        <el-col v-for="item in baseInfo" :key="item.key" :span="6">
          <div class="info-item">
            <span class="info-label">{{ item.label }}</span>
            <template v-if="item.key === 'health'">
              <el-tag :type="healthTagType" effect="light" size="small">
                {{ displayText(patient.healthStatus) }}
              </el-tag>
            </template>
            <span v-else class="info-value">{{ item.value }}</span>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- <section class="detail-card risk-card" v-loading="loading.risk">
      <div class="risk-head">
        <el-icon class="risk-heart"><WarningFilled /></el-icon>
        <el-tag type="danger" effect="light" size="small">异常</el-tag>
        <span class="risk-desc">{{ riskDescription }}</span>
      </div>
      <div class="metric-grid" v-loading="loading.metric">
        <div v-for="metric in metricList" :key="metric.label" class="metric-tag">
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-value" :class="{ 'metric-empty': metric.value === '-' }">{{ metric.value }}</span>
        </div>
      </div>
    </section> -->

    <section class="detail-card service-card" v-loading="loading.service || loading.communication">
      <el-row :gutter="16">
        <el-col :span="12">
          <div class="chat-panel">
 <h3 class="section-title">
            <el-icon><Service /></el-icon>
            服务与沟通概况
          </h3>
          <ul class="service-list">
            <li>
              <span class="info-label">主治医生</span>
              <span class="info-value">{{ doctorName }}</span>
            </li>
            <li>
              <span class="info-label">服务客服</span>
              <span class="info-value">{{ csName }}</span>
            </li>
            <li>
              <span class="info-label">服务陪诊师</span>
              <span class="info-value">{{ caregiverName }}</span>
            </li>
            <li>
              <span class="info-label">剩余陪诊次数</span>
              <span class="info-value quota-value">{{ remainingQuota }} 次</span>
              <el-button link type="primary" size="small" @click="onEditQuota">修改</el-button>
            </li>
            <li>
              <span class="info-label">变更记录</span>
              <el-button link type="primary" size="small" @click="onChangeLog">
                查看变更记录（{{ changeLogCount }}）
                <el-icon class="link-icon"><ArrowRight /></el-icon>
              </el-button>
            </li>
          </ul>
          </div>
         
        </el-col>
        <el-col :span="12">
          <div class="chat-panel">
            <div class="chat-head">
              <span class="chat-title">
                <el-icon><Bell /></el-icon>
                最近沟通
              </span>
              <el-badge v-if="unreadCount > 0" :value="unreadCount" class="unread-badge" />
            </div>
            <template v-if="latestCommunication">
              <div class="chat-time">{{ formatTime(latestCommunication.time) }}</div>
              <div class="chat-operator">客服：{{ displayText(latestCommunication.operator) }}</div>
              <div class="chat-message">{{ displayText(latestCommunication.content || latestCommunication.title) }}</div>
            </template>
            <el-empty v-else description="暂无沟通记录" :image-size="56" />
          </div>
        </el-col>
      </el-row>
    </section>

    <footer class="detail-footer">
      <el-button
        v-for="action in footerActions"
        :key="action.key"
        :type="action.key === 'view-detail' ? 'primary' : 'default'"
        plain
        @click="onFooter(action)"
      >
        <el-icon><component :is="action.icon" /></el-icon>
        {{ action.label }}
      </el-button>
    </footer>
  </div>
</template>

<style scoped>
.customer-row-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.section-title .el-icon {
  color: #4f7cff;
}

.base-grid {
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.6;
}

.info-label {
  flex: 0 0 60px;
  color: #6b7280;
}

.info-value {
  color: #1f2937;
  word-break: break-all;
}

.risk-card {
  background: #fef2f2;
  border-color: #fecaca;
}

.risk-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.risk-heart {
  color: #ef4444;
  font-size: 18px;
}

.risk-desc {
  font-size: 13px;
  color: #b91c1c;
  line-height: 1.5;
}

.metric-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.metric-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #fecaca;
  font-size: 12px;
}

.metric-label {
  color: #6b7280;
  white-space: nowrap;
}

.metric-value {
  color: #111827;
  font-weight: 600;
}

.metric-empty {
  color: #9ca3af;
  font-weight: 400;
}

.service-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.quota-value {
  font-weight: 700;
  color: #b45309;
}

.link-icon {
  margin-left: 2px;
}

.chat-panel {
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  padding: 12px;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.unread-badge :deep(.el-badge__content) {
  background: #ef4444;
}

.chat-time {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.chat-operator {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.chat-message {
  margin-top: 4px;
  font-size: 13px;
  color: #1f2937;
  line-height: 1.5;
  word-break: break-all;
}

.detail-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 2px;
}

.detail-footer .el-button .el-icon {
  margin-right: 4px;
}

@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
