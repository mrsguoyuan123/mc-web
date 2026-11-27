<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  getCaregiverScope,
  getCaregiverConversationPage,
  getCaregiverConversationStats
} from '../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing, safeParseJson, toPage } from '@/utils/index.js'
import ChatDetailDialog from './components/ChatDetailDialog.vue'

/* ---------------- 数据范围（getCaregiverScope 返回 scopeJson 字符串，结构做容错解析） ---------------- */

const scopeRaw = ref(null)
const scopeLoading = ref(false)

// 兼容多种可能结构：{ stationName, hospitalName, hospitals[], departments[] } / { hospitals:[{...}] }
const scopeModel = computed(() => {
  const raw = scopeRaw.value
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
  const parsed = safeParseJson(raw, null)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
})

const stationName = computed(() => scopeModel.value.stationName || scopeModel.value.caregiverName || '')

// 医院列表：优先 hospitals 数组，其次单 hospital/hospitalName
const hospitals = computed(() => {
  const model = scopeModel.value
  const list = Array.isArray(model.hospitals) ? model.hospitals : []
  if (list.length) {
    return list.map((item) =>
      typeof item === 'string'
        ? { id: '', name: item }
        : {
            id: item.hospitalId || item.id || '',
            name: item.hospitalName || item.name || ''
          }
    )
  }
  const name = model.hospitalName || model.hospital
  return name ? [{ id: model.hospitalId || '', name }] : []
})

// 科室列表：优先 departments 数组（支持挂在医院对象下），其次单 department/departmentName
const departments = computed(() => {
  const model = scopeModel.value
  let list = Array.isArray(model.departments) ? model.departments : []
  if (!list.length && Array.isArray(model.hospitals)) {
    list = model.hospitals.flatMap((hospital) =>
      Array.isArray(hospital?.departments) ? hospital.departments : []
    )
  }
  if (list.length) {
    return list.map((item) =>
      typeof item === 'string'
        ? { id: '', name: item }
        : {
            id: item.departmentId || item.id || '',
            name: item.departmentName || item.name || ''
          }
    )
  }
  const name = model.departmentName || model.department
  return name ? [{ id: model.departmentId || '', name }] : []
})

// 范围条文案：驻点 · 医院 · 科室列表；科室为空时只显示到院名
const scopeText = computed(() => {
  const parts = []
  if (!isMissing(stationName.value)) parts.push(stationName.value)
  const hospitalText = hospitals.value.map((item) => item.name).filter((name) => !isMissing(name))
  if (hospitalText.length) parts.push(hospitalText.join('、'))
  const departmentText = departments.value
    .map((item) => item.name)
    .filter((name) => !isMissing(name))
  if (departmentText.length) parts.push(departmentText.join('、'))
  return parts.length ? parts.join(' · ') : MISSING_TEXT
})

const fetchScope = async () => {
  scopeLoading.value = true
  try {
    const res = await getCaregiverScope()
    scopeRaw.value = res?.scopeJson ?? res
  } catch {
    scopeRaw.value = null
  } finally {
    scopeLoading.value = false
  }
}

/* ---------------- 筛选与分页（M-G1：参数全部透传，禁止前端本地过滤） ---------------- */

const keywordInput = ref('')
const keywordApplied = ref('')
const filterHospitalId = ref('')
const filterDepartmentId = ref('')

const listLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const hasFilter = computed(
  () =>
    Boolean(keywordApplied.value) ||
    Boolean(filterHospitalId.value) ||
    Boolean(filterDepartmentId.value)
)

const buildParams = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const word = keywordApplied.value.trim()
  if (word) params.keyword = word
  if (filterHospitalId.value) params.hospitalId = String(filterHospitalId.value)
  if (filterDepartmentId.value) params.departmentId = String(filterDepartmentId.value)
  return params
}

const fetchList = async () => {
  listLoading.value = true
  try {
    const res = await getCaregiverConversationPage(buildParams())
    const pageResult = toPage(res)
    tableData.value = pageResult.list
    total.value = pageResult.total
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    listLoading.value = false
  }
}

/* ---------------- 三卡统计（M-G3：同筛选参数透传，副行固定标注当前筛选条件） ---------------- */

const stats = ref(null)

const statsNumber = (key) => {
  const value = stats.value?.[key]
  return isMissing(value) ? MISSING_TEXT : Number(value).toLocaleString()
}

const fetchStats = async () => {
  try {
    stats.value = await getCaregiverConversationStats(buildParams())
  } catch {
    stats.value = null
  }
}

const refreshAll = () => {
  fetchList()
  fetchStats()
}

// 搜索框回车/失焦：提交输入态到应用态并回到第 1 页
const handleSearch = () => {
  keywordApplied.value = keywordInput.value.trim()
  page.value = 1
  refreshAll()
}

const handleFilterChange = () => {
  page.value = 1
  refreshAll()
}

const handlePageChange = (next) => {
  page.value = next
  fetchList()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  page.value = 1
  refreshAll()
}

/* ---------------- 记录卡片字段（M-G2：缺失统一红色兜底，不逐行补请求） ---------------- */

const cardName = (row) => {
  const name = row?.patientName || row?.name
  return isMissing(name) ? MISSING_TEXT : name
}

const cardAvatarText = (row) => {
  const name = row?.patientName || row?.name
  return name ? String(name).slice(0, 1) : '患'
}

const genderAgeText = (row) => {
  const parts = []
  if (!isMissing(row?.gender)) parts.push(String(row.gender))
  if (!isMissing(row?.age)) parts.push(`${row.age}岁`)
  return parts.length ? parts.join(' · ') : ''
}

const cardTags = (row) => {
  const raw = row?.tags || row?.tagsJson
  const parsed = safeParseJson(raw, null)
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(raw)
      ? raw
      : isMissing(raw)
        ? []
        : String(raw)
            .split(/[，,、]/)
            .map((item) => item.trim())
            .filter(Boolean)
  return list.slice(0, 3)
}

const cardTime = (row) => formatTime(row?.lastMessageTime || row?.lastMessageAt || row?.updateTime, true)

const messageCountText = (row) => {
  const count = row?.messageCount
  if (isMissing(count)) return MISSING_TEXT
  return Number(count) === 0 ? '暂无消息' : `${Number(count)} 条消息`
}

const hospitalNameText = (row) =>
  isMissing(row?.hospitalName) ? MISSING_TEXT : row.hospitalName

const departmentNameText = (row) =>
  isMissing(row?.departmentName) ? MISSING_TEXT : row.departmentName

const patientNoText = (row) => (isMissing(row?.patientNo) ? MISSING_TEXT : row.patientNo)

/* ---------------- 详情弹窗 ---------------- */

const detailVisible = ref(false)
const currentConversation = ref(null)

const openDetail = (row) => {
  // 先清空上次数据，避免闪现旧记录
  currentConversation.value = null
  currentConversation.value = row
  detailVisible.value = true
}

onMounted(() => {
  fetchScope()
  refreshAll()
})
</script>

<template>
  <div v-loading="scopeLoading" class="station-workbench">
    <!-- 标题区 -->
    <header class="page-header">
      <h1>聊天管理（驻点查看）</h1>
      <p>查看所属驻点授权医院和科室的用户咨询记录（只读模式）</p>
    </header>

    <!-- 范围条：浅蓝底 + 图标 + 文案 -->
    <div class="scope-bar panel">
      <el-icon class="scope-icon"><Aim /></el-icon>
      <span class="scope-label">数据范围：</span>
      <span :class="{ missing: scopeText === MISSING_TEXT }">{{ scopeText }}</span>
    </div>

    <!-- 筛选卡 -->
    <div class="panel filter-card">
        <el-input
          v-model="keywordInput"
          class="search-input"
          placeholder="搜索用户姓名、ID或疾病.."
          clearable
          @keyup.enter="handleSearch"
          @blur="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterDepartmentId"
          class="filter-select"
          placeholder="全部科室"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="全部科室" value="" />
          <el-option
            v-for="item in departments"
            :key="`dept-${item.id}-${item.name}`"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>

        <el-select
          v-model="filterHospitalId"
          class="filter-select"
          placeholder="全部医院"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="全部医院" value="" />
          <el-option
            v-for="item in hospitals"
            :key="`hospital-${item.id}-${item.name}`"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
    </div>

    <!-- 三卡统计 -->
    <div class="stat-grid">
      <div class="panel stat-card">
        <div class="stat-num" :class="{ missing: isMissing(stats?.total) }">
          {{ statsNumber('total') }}
        </div>
        <div class="stat-label">总咨询记录</div>
        <div class="stat-sub">{{ hasFilter ? '符合筛选条件' : '全部咨询记录' }}</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-num" :class="{ missing: isMissing(stats?.departmentCount) }">
          {{ statsNumber('departmentCount') }}
        </div>
        <div class="stat-label">覆盖科室</div>
        <div class="stat-sub">个科室</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-num" :class="{ missing: isMissing(stats?.doctorCount) }">
          {{ statsNumber('doctorCount') }}
        </div>
        <div class="stat-label">医生数量</div>
        <div class="stat-sub">位医生参与</div>
      </div>
    </div>

    <!-- 记录列表（卡片式，非表格） -->
    <div v-loading="listLoading" class="record-list">
      <el-empty
        v-if="!listLoading && tableData.length === 0"
        description="暂无咨询记录"
      />

      <div v-for="row in tableData" :key="String(row.conversationId)" class="panel record-card">
        <el-avatar :size="52" class="record-avatar">
          {{ cardAvatarText(row) }}
        </el-avatar>

        <div class="record-main">
          <div class="record-line">
            <span class="record-name" :class="{ missing: cardName(row) === MISSING_TEXT }">
              {{ cardName(row) }}
            </span>
            <span v-if="genderAgeText(row)" class="record-gender-age">{{ genderAgeText(row) }}</span>
          </div>
          <div class="record-line record-sub-line">
            <span class="record-no" :class="{ missing: patientNoText(row) === MISSING_TEXT }">
              编号：{{ patientNoText(row) }}
            </span>
          </div>
          <div class="record-line record-place">
            <el-icon><OfficeBuilding /></el-icon>
            <span :class="{ missing: hospitalNameText(row) === MISSING_TEXT }">
              {{ hospitalNameText(row) }}
            </span>
            <el-icon class="place-dept"><Grid /></el-icon>
            <span :class="{ missing: departmentNameText(row) === MISSING_TEXT }">
              {{ departmentNameText(row) }}
            </span>
          </div>
          <div v-if="cardTags(row).length" class="record-tags">
            <span v-for="(tag, index) in cardTags(row)" :key="`${tag}-${index}`" class="gray-chip">
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="record-side">
          <div class="side-time">{{ cardTime(row) }}</div>
          <div
            class="side-count"
            :class="{ missing: messageCountText(row) === MISSING_TEXT }"
          >
            {{ messageCountText(row) }}
          </div>
          <el-button type="primary" plain size="small" @click="openDetail(row)">
            查看详情
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pagination-bar">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <ChatDetailDialog v-model="detailVisible" :conversation="currentConversation" />
  </div>
</template>

<style scoped>
.station-workbench {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.scope-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  background: #f0f6ff;
  border-color: #dbeafe;
  font-size: 14px;
  color: #1e3a8a;
}

.scope-icon {
  color: #2563eb;
  font-size: 17px;
}

.scope-label {
  font-weight: 600;
}

.filter-card {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
  max-width: 100%;
}

.filter-select {
  width: 200px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  margin-bottom: 0;
  padding: 22px 24px;
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  color: #111827;
}

.stat-label {
  margin-top: 8px;
  font-size: 14px;
  color: #4b5563;
}

.stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.record-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 160px;
}

.record-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 0;
  padding: 18px 22px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.record-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.1);
}

.record-avatar {
  flex-shrink: 0;
  background: #eef2ff;
  color: #1d4ed8;
  font-size: 19px;
  font-weight: 700;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.record-name {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.record-gender-age {
  font-size: 13px;
  color: #6b7280;
}

.record-sub-line {
  margin-top: 6px;
}

.record-no {
  font-size: 13px;
  color: #4b5563;
}

.record-place {
  margin-top: 6px;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.record-place .el-icon {
  color: #94a3b8;
}

.record-place .place-dept {
  margin-left: 10px;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.gray-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
}

.record-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.side-time {
  font-size: 13px;
  color: #6b7280;
}

.side-count {
  font-size: 13px;
  color: #4b5563;
}

.missing {
  color: #f56c6c;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 992px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .record-card {
    flex-direction: column;
  }

  .record-side {
    flex-direction: row;
    align-items: center;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
