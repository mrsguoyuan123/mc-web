<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  getEscortOrders,
  getEscortOrderById,
  getStaffPage
} from '../../api/index.js'

// 服务记录来源于已完成的陪诊订单（GET /escort/orders + /escort/orders/{id}）
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 每条订单富化后的详情：orderId -> { booking, serviceRecord, checkins }
const detailMap = ref({})
// 驻点人员字典：caregiverId -> { name, levelOrArea }
const caregiverMap = ref({})

// 筛选
const keyword = ref('')
const filterStatus = ref('')

const OTHER_SITUATION_TEXT = {
  EMPTY_NESTER: '空巢老人',
  MOBILITY_IMPAIRED: '行动不便',
  OTHER: '其他'
}
const TASK_STATUS_TEXT = { COMPLETED: '已完成', INCOMPLETE: '未完成' }

const formatTime = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')

const fetchCaregivers = async () => {
  try {
    const res = await getStaffPage({ personType: 'CAREGIVER', page: 1, pageSize: 100 })
    const map = {}
    ;(res?.list || []).forEach((item) => {
      map[String(item.id)] = { name: item.name, levelOrArea: item.levelOrArea || '' }
    })
    caregiverMap.value = map
  } catch {
    caregiverMap.value = {}
  }
}

const enrichDetails = async (list) => {
  const entries = await Promise.all(
    list.map(async (row) => {
      try {
        const detail = await getEscortOrderById(String(row.id))
        return [String(row.id), detail || {}]
      } catch {
        return [String(row.id), {}]
      }
    })
  )
  detailMap.value = Object.fromEntries(entries)
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getEscortOrders({ status: 'COMPLETED', page: page.value, pageSize: pageSize.value })
    const list = res?.list || []
    tableData.value = list
    total.value = Number(res?.total) || 0
    enrichDetails(list)
  } catch (err) {
    tableData.value = []
    total.value = 0
    detailMap.value = {}
    ElMessage.error(err?.message || '服务记录加载失败')
  } finally {
    loading.value = false
  }
}

const detailOf = (row) => detailMap.value[String(row.id)] || {}
const checkinsOf = (row) => detailOf(row).checkins || []
const recordOf = (row) => detailOf(row).serviceRecord
const bookingOf = (row) => detailOf(row).booking || {}
const caregiverOf = (row) => caregiverMap.value[String(row.caregiverId || bookingOf(row).caregiverId)] || {}

// 留痕完整度：定位打卡（ARRIVE+FINISH）、拍照（>=1 张）、服务反馈（serviceRecord）
const checkinComplete = (row) => {
  const types = checkinsOf(row).map((item) => item.type)
  return types.includes('ARRIVE') && types.includes('FINISH')
}
const arriveCheckinOf = (row) => checkinsOf(row).find((item) => item.type === 'ARRIVE')
const photoComplete = (row) => checkinsOf(row).some((item) => Array.isArray(item.photos) && item.photos.length > 0)
const feedbackComplete = (row) => Boolean(recordOf(row))
const traceScore = (row) =>
  [checkinComplete(row), photoComplete(row), feedbackComplete(row)].filter(Boolean).length

// 顶部统计（基于当前页富化数据）
const stats = computed(() => {
  const rows = tableData.value
  const checkinOk = rows.filter(checkinComplete).length
  const photoOk = rows.filter(photoComplete).length
  const fullOk = rows.filter((row) => traceScore(row) === 3).length
  return [
    { label: '服务记录总数', value: total.value, sub: '小程序提交后自动汇入' },
    { label: '定位打卡齐全', value: checkinOk, sub: '含开始打卡与结束时间' },
    { label: '拍照留痕齐全', value: photoOk, sub: '至少 1 张现场照片' },
    { label: '完整留痕', value: `${fullOk}/${rows.length}`, sub: '定位 + 拍照 + 服务反馈', highlight: true }
  ]
})

// 关键词与状态为客户端筛选（订单接口不支持 keyword，状态按留痕完整度区分）
const filteredData = computed(() => {
  const word = keyword.value.trim()
  return tableData.value.filter((row) => {
    const caregiver = caregiverOf(row)
    const matchWord =
      !word ||
      [row.patientName, row.address, caregiver.name, caregiver.levelOrArea, bookingOf(row).department]
        .filter(Boolean)
        .some((value) => String(value).includes(word))
    const score = traceScore(row)
    const matchStatus =
      filterStatus.value === '' ||
      (filterStatus.value === 'FULL' && score === 3) ||
      (filterStatus.value === 'PARTIAL' && score < 3)
    return matchWord && matchStatus
  })
})

const handleSearch = () => { page.value = 1; fetchList() }
const handleReset = () => {
  keyword.value = ''
  filterStatus.value = ''
  handleSearch()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 详情弹窗
const detailVisible = ref(false)
const detailRow = ref({})
const openTrace = (row) => {
  detailRow.value = row
  detailVisible.value = true
}
const currentDetail = computed(() => detailOf(detailRow.value))
const currentCheckins = computed(() => currentDetail.value.checkins || [])
const currentRecord = computed(() => currentDetail.value.serviceRecord)
const currentBooking = computed(() => currentDetail.value.booking || {})
const arriveCheckin = computed(() => currentCheckins.value.find((item) => item.type === 'ARRIVE'))
const finishCheckin = computed(() => currentCheckins.value.find((item) => item.type === 'FINISH'))
const allPhotos = computed(() =>
  currentCheckins.value.flatMap((item) => (item.photos || []).map((url) => ({ url, time: item.createTime })))
)

onMounted(() => {
  fetchCaregivers()
  fetchList()
})
</script>
<template>
  <div>
    <!-- 留痕统计 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card" :class="{ highlight: item.highlight }">
        <div class="stat-value">{{ item.value }}</div>
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-sub">{{ item.sub }}</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索用户、驻点、驻点人员或服务内容"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterStatus" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option label="完整留痕" value="FULL" />
          <el-option label="留痕待补全" value="PARTIAL" />
        </el-select>
        <el-button size="large" :icon="Refresh" @click="handleSearch">刷新</el-button>
      </div>
    </div>

    <!-- 服务记录列表 -->
    <div class="panel table-card">
      <el-table v-loading="loading" :data="filteredData" stripe>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ row.patientName || '-' }}</span>
              <span class="user-sub">{{ caregiverOf(row).name || '驻点人员' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="驻点" min-width="130">
          <template #default="{ row }">
            <el-tag v-if="caregiverOf(row).levelOrArea" type="warning" effect="plain" round size="small">
              {{ caregiverOf(row).levelOrArea }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="完成时间" min-width="160">
          <template #default="{ row }">
            {{ formatTime(bookingOf(row).finishTime || bookingOf(row).updateTime || row.serviceDate) }}
          </template>
        </el-table-column>
        <el-table-column label="服务内容" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ recordOf(row)?.specialFeedback || bookingOf(row).remark || bookingOf(row).department || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="定位打卡" min-width="160">
          <template #default="{ row }">
            <div v-if="arriveCheckinOf(row) || checkinsOf(row).length" class="checkin-cell">
              <el-icon class="ok-icon"><CircleCheckFilled /></el-icon>
              <span>已打卡</span>
              <span class="text-muted time">{{ formatTime((arriveCheckinOf(row) || checkinsOf(row)[0]).createTime) }}</span>
            </div>
            <span v-else class="text-muted">未打卡</span>
          </template>
        </el-table-column>
        <el-table-column label="拍照留痕" min-width="120">
          <template #default="{ row }">
            <span v-if="photoComplete(row)">
              {{ checkinsOf(row).reduce((sum, item) => sum + (item.photos?.length || 0), 0) }} 张
            </span>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default>
            <el-tag type="success" effect="light" round size="small">已完成</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openTrace(row)">查看留痕</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无服务记录" :image-size="90" />
        </template>
      </el-table>

      <el-pagination
        class="list-pager"
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 服务记录与留痕详情 -->
    <el-dialog v-model="detailVisible" width="720px" class="trace-dialog" :with-header="false">
      <div class="trace-wrap">
        <div class="trace-heading">
          <h2>服务记录与留痕详情</h2>
          <p>svc-{{ String(detailRow.id || '').slice(-8) }} · 提交于 {{ formatTime(currentBooking.finishTime || currentBooking.updateTime) }}</p>
        </div>

        <div class="trace-summary">
          <div class="summary-item">
            <span class="summary-label">用户</span>
            <span class="summary-value">{{ detailRow.patientName || '-' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">驻点 / 人员</span>
            <span class="summary-value">
              {{ caregiverOf(detailRow).levelOrArea || '-' }} · {{ caregiverOf(detailRow).name || '-' }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">服务日期</span>
            <span class="summary-value">{{ detailRow.serviceDate || currentBooking.serviceDate || '-' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">状态</span>
            <el-tag type="success" effect="light" round size="small">
              {{ TASK_STATUS_TEXT[currentRecord?.taskCompleted] || '已完成' }}
            </el-tag>
          </div>
        </div>

        <!-- 定位打卡留痕 -->
        <div class="trace-block checkin-block">
          <div class="block-head">
            <span class="block-title"><el-icon><LocationInformation /></el-icon>定位打卡留痕</span>
            <el-tag size="small" :type="checkinComplete(detailRow) ? 'primary' : 'info'">
              {{ checkinComplete(detailRow) ? '已完成' : '待补全' }}
            </el-tag>
          </div>
          <div class="checkin-times">
            <div>
              <div class="time-label">开始打卡</div>
              <div class="time-value">{{ formatTime(arriveCheckin?.createTime) }}</div>
            </div>
            <div>
              <div class="time-label">结束打卡</div>
              <div class="time-value">{{ formatTime(finishCheckin?.createTime) }}</div>
            </div>
          </div>
          <template v-if="arriveCheckin">
            <div class="addr-label">定位地址</div>
            <div class="addr-value">{{ arriveCheckin.address || '-' }}</div>
            <div class="addr-label">经纬度</div>
            <div class="addr-value">{{ arriveCheckin.latitude }}, {{ arriveCheckin.longitude }}</div>
          </template>
          <div v-else class="text-muted">暂无定位打卡信息</div>
        </div>

        <!-- 现场拍照留痕 -->
        <div class="trace-block photo-block">
          <div class="block-head">
            <span class="block-title"><el-icon><Camera /></el-icon>现场拍照留痕</span>
            <el-tag v-if="allPhotos.length" size="small" type="warning">{{ allPhotos.length }} 张</el-tag>
          </div>
          <div v-if="allPhotos.length" class="photo-grid">
            <div v-for="(photo, index) in allPhotos" :key="index" class="photo-item">
              <el-image
                :src="photo.url"
                :preview-src-list="allPhotos.map((item) => item.url)"
                :initial-index="index"
                fit="cover"
                class="photo-img"
                preview-teleported
              />
              <div class="photo-name">现场照片 {{ index + 1 }}</div>
            </div>
          </div>
          <div v-else class="text-muted">暂无现场照片</div>
        </div>

        <!-- 服务反馈 -->
        <div class="feedback-grid">
          <div class="feedback-item">
            <div class="feedback-label">身体恢复情况</div>
            <div class="feedback-value">{{ currentRecord?.recoveryDescription || '-' }}</div>
          </div>
          <div class="feedback-item">
            <div class="feedback-label">其他情况</div>
            <div class="feedback-value">
              {{ OTHER_SITUATION_TEXT[currentRecord?.otherSituation] || '行动正常' }}
            </div>
          </div>
          <div class="feedback-item full">
            <div class="feedback-label">特殊情况反馈</div>
            <div class="feedback-value">{{ currentRecord?.specialFeedback || '-' }}</div>
          </div>
          <div class="feedback-item full">
            <div class="feedback-label">服务内容</div>
            <div class="feedback-value">
              {{ currentRecord?.specialFeedback || currentBooking.remark || currentBooking.department || '-' }}
              <div class="task-line">
                <el-icon class="ok-icon"><CircleCheckFilled /></el-icon>
                任务完成状态：{{ TASK_STATUS_TEXT[currentRecord?.taskCompleted] || '已完成' }}
              </div>
            </div>
          </div>
        </div>

        <div class="trace-footer">
          <el-button size="large" @click="detailVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  padding: 22px 24px;
  border: 1px solid #eef0f4;
}

.stat-card.highlight {
  border-color: #86efac;
}

.stat-card.highlight .stat-value {
  color: #16a34a;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

/* 筛选 */
.filter-card {
  margin-top: 20px;
  padding: 20px 22px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 360px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

/* 列表 */
.table-card {
  margin-top: 18px;
  padding: 22px;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
}

.user-sub {
  font-size: 12px;
  color: #94a3b8;
}

.text-muted {
  color: #94a3b8;
}

.checkin-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ok-icon {
  color: #16a34a;
}

.checkin-cell .time {
  width: 100%;
  font-size: 12px;
}

.list-pager {
  margin-top: 18px;
  justify-content: flex-end;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

/* 详情弹窗 */
.trace-wrap {
  padding: 8px 4px;
}

.trace-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.trace-heading p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.trace-summary {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 18px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.trace-block {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 12px;
}

.checkin-block {
  background: #f5f8ff;
  border: 1px solid #dbe7ff;
}

.photo-block {
  background: #faf7ff;
  border: 1px solid #ece4ff;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1d4ed8;
}

.checkin-times {
  display: flex;
  gap: 60px;
  margin-top: 14px;
}

.time-label {
  font-size: 13px;
  color: #2563eb;
}

.time-value {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
}

.addr-label {
  margin-top: 12px;
  font-size: 12px;
  color: #2563eb;
}

.addr-value {
  margin-top: 4px;
  font-size: 14px;
  color: #374151;
}

.photo-grid {
  margin-top: 14px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.photo-item {
  width: 150px;
}

.photo-img {
  width: 150px;
  height: 110px;
  border-radius: 10px;
  cursor: pointer;
}

.photo-name {
  margin-top: 6px;
  font-size: 13px;
  color: #4b5563;
}

.feedback-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.feedback-item {
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.feedback-item.full {
  grid-column: 1 / -1;
}

.feedback-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.feedback-value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
}

.task-line {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #16a34a;
}

.trace-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .trace-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid,
  .feedback-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .feedback-item.full {
    grid-column: 1;
  }
}
</style>
