<script setup>
import { computed, ref, watch } from 'vue'
import { Refresh, Edit, UserFilled, Service, Avatar, Clock } from '@element-plus/icons-vue'
import {
  getPatientServiceRelationsById,
  getEscortQuotaRecordsById
} from '../../../api/index.js'
import {
  displayText,
  formatTime,
  toPage,
  RELATION_TYPE_TEXT
} from '../utils.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'update:visible',
  'edit-match',
  'edit-doctor',
  'edit-quota'
])

// 接口未就绪前统一使用空数组 + 加载态，统计/指标缺省显示 0 或 -
const loading = ref(false)
const logLoading = ref(false)
const activeTab = ref('relation')
const relations = ref({ current: null, logs: [] })
const quotaLogs = ref([])
const quotaTotal = ref(0)
const quotaPage = ref(1)
const quotaPageSize = ref(10)

const patient = computed(() => props.record || {})
const patientId = computed(() => (patient.value.id ? String(patient.value.id) : ''))
const current = computed(() => relations.value.current || {})
const relationLogs = computed(() => relations.value.logs || [])

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const pickText = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return '-'
}

const relationCards = computed(() => [
  {
    key: 'doctor',
    label: '主治医生',
    icon: UserFilled,
    name: pickText(current.value.doctorName, current.value.attendingDoctorName, patient.value.attendingDoctorName),
    extra: pickText(current.value.doctorTitle, patient.value.doctorTitle),
    event: 'edit-doctor',
    emptyTip: '尚未绑定主治医生'
  },
  {
    key: 'cs',
    label: '服务客服',
    icon: Service,
    name: pickText(current.value.csName, patient.value.csName),
    extra: pickText(current.value.csLevel, patient.value.csLevel),
    event: 'edit-match',
    emptyTip: '尚未匹配服务客服'
  },
  {
    key: 'caregiver',
    label: '服务陪诊师',
    icon: Avatar,
    name: pickText(current.value.caregiverName, current.value.stationName, patient.value.caregiverName),
    extra: pickText(current.value.caregiverArea, patient.value.caregiverArea),
    event: 'edit-match',
    emptyTip: '尚未匹配服务陪诊师'
  }
])

const remainingQuota = computed(() => {
  const quota = patient.value.escortQuota ?? current.value.escortQuota
  return Number.isFinite(Number(quota)) ? Number(quota) : 0
})

const relationTypeText = (type) => RELATION_TYPE_TEXT[type] || displayText(type)

const resetState = () => {
  relations.value = { current: null, logs: [] }
  quotaLogs.value = []
  quotaTotal.value = 0
  quotaPage.value = 1
}

const loadRelations = async () => {
  if (!patientId.value) {
    resetState()
    return
  }
  loading.value = true
  try {
    const res = await getPatientServiceRelationsById(patientId.value)
    relations.value = {
      current: res?.current ?? null,
      logs: Array.isArray(res?.logs) ? res.logs : []
    }
  } catch {
    relations.value = { current: null, logs: [] }
  } finally {
    loading.value = false
  }
}

const loadQuotaLogs = async () => {
  if (!patientId.value) {
    quotaLogs.value = []
    quotaTotal.value = 0
    return
  }
  logLoading.value = true
  try {
    const page = toPage(
      await getEscortQuotaRecordsById(patientId.value, {
        page: quotaPage.value,
        pageSize: quotaPageSize.value
      })
    )
    quotaLogs.value = page.list
    quotaTotal.value = page.total
  } catch {
    quotaLogs.value = []
    quotaTotal.value = 0
  } finally {
    logLoading.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    activeTab.value = 'relation'
    quotaPage.value = 1
    loadRelations()
    loadQuotaLogs()
  }
)

watch(activeTab, (tab) => {
  if (tab === 'quota') loadQuotaLogs()
})

const onCardAction = (event) => {
  if (event === 'edit-doctor') emit('edit-doctor', patient.value)
  if (event === 'edit-match') emit('edit-match', patient.value)
}

const onEditQuota = () => emit('edit-quota', patient.value)

const onQuotaPageChange = (page) => {
  quotaPage.value = page
  loadQuotaLogs()
}

const onQuotaSizeChange = (size) => {
  quotaPageSize.value = size
  quotaPage.value = 1
  loadQuotaLogs()
}

const onRefresh = () => {
  loadRelations()
  if (activeTab.value === 'quota') loadQuotaLogs()
}

const onClose = () => emit('update:visible', false)
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :title="`服务关系 · ${displayText(patient.name)}`"
    direction="rtl"
    size="52%"
    :close-on-click-modal="false"
    class="service-relation-drawer"
    @close="onClose"
  >
    <div class="drawer-wrap" v-loading="loading">
      <div class="drawer-toolbar">
        <span class="quota-summary">
          剩余陪诊次数：<b>{{ remainingQuota }}</b> 次
        </span>
        <div>
          <el-button size="small" :icon="Edit" type="primary" plain @click="onEditQuota">修改陪诊次数</el-button>
          <el-button size="small" :icon="Refresh" @click="onRefresh">刷新</el-button>
        </div>
      </div>

      <div class="relation-cards">
        <div v-for="card in relationCards" :key="card.key" class="relation-card">
          <div class="relation-card-head">
            <el-icon class="relation-icon"><component :is="card.icon" /></el-icon>
            <span class="relation-label">{{ card.label }}</span>
          </div>
          <div class="relation-name">{{ card.name }}</div>
          <div class="relation-extra">{{ card.extra }}</div>
          <el-button link type="primary" size="small" @click="onCardAction(card.event)">
            <el-icon><Edit /></el-icon>调整绑定
          </el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="relation-tabs">
        <el-tab-pane label="服务关系变更记录" name="relation">
          <el-table :data="relationLogs" v-loading="loading" border stripe size="small">
            <el-table-column label="关系类型" width="110">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ relationTypeText(row.relationType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="变更前" min-width="120">
              <template #default="{ row }">{{ displayText(row.beforeName || row.beforeId) }}</template>
            </el-table-column>
            <el-table-column label="变更后" min-width="120">
              <template #default="{ row }">{{ displayText(row.afterName || row.afterId) }}</template>
            </el-table-column>
            <el-table-column label="操作人" min-width="110">
              <template #default="{ row }">{{ displayText(row.operatorName) }}</template>
            </el-table-column>
            <el-table-column label="变更原因" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ displayText(row.reason) }}</template>
            </el-table-column>
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ formatTime(row.createTime, true) }}</template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无服务关系变更记录" :image-size="70" />
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="陪诊次数变更记录" name="quota">
          <el-table :data="quotaLogs" v-loading="logLoading" border stripe size="small">
            <el-table-column label="变更前（次）" width="110" align="center">
              <template #default="{ row }">{{ row.beforeQuota ?? 0 }}</template>
            </el-table-column>
            <el-table-column label="变更后（次）" width="110" align="center">
              <template #default="{ row }">{{ row.afterQuota ?? 0 }}</template>
            </el-table-column>
            <el-table-column label="操作人" min-width="120">
              <template #default="{ row }">{{ displayText(row.operatorName) }}</template>
            </el-table-column>
            <el-table-column label="原因" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ displayText(row.reason) }}</template>
            </el-table-column>
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                <el-icon class="time-icon"><Clock /></el-icon>
                {{ formatTime(row.createTime, true) }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无陪诊次数变更记录" :image-size="70" />
            </template>
          </el-table>
          <div class="pagination-bar" v-if="quotaTotal > 0">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :total="quotaTotal"
              :current-page="quotaPage"
              :page-size="quotaPageSize"
              :page-sizes="[10, 20, 50]"
              @current-change="onQuotaPageChange"
              @size-change="onQuotaSizeChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 4px 16px;
}

.drawer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.quota-summary {
  font-size: 13px;
  color: #4b5563;
}

.quota-summary b {
  color: #b45309;
  font-size: 18px;
  margin: 0 2px;
}

.relation-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.relation-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.relation-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.relation-icon {
  color: #4f7cff;
  font-size: 18px;
}

.relation-label {
  font-size: 13px;
  color: #6b7280;
}

.relation-name {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.relation-extra {
  font-size: 12px;
  color: #9ca3af;
  min-height: 16px;
}

.relation-tabs {
  flex: 1;
  min-height: 0;
}

.relation-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.time-icon {
  vertical-align: -2px;
  margin-right: 2px;
  color: #9ca3af;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .relation-cards {
    grid-template-columns: 1fr;
  }
}
</style>
