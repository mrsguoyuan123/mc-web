<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Edit, Share, ArrowDown, Medal, Connection } from '@element-plus/icons-vue'
import {
  getDoctorPage,
  getDoctorOptions,
  getDictOptions,
  updateDoctorStatusById,
  getDoctorChangeLogsById,
  getDoctorPatientsById
} from '../../api/index.js'
import {
  MISSING_TEXT,
  isMissing,
  TITLE_OPTIONS,
  TITLE_TAG_STYLE,
  DOCTOR_STATUS_TEXT,
  DOCTOR_STATUS_OPTIONS,
  DOCTOR_STATUS_TAG,
  formatChangeSentence,
  formatTime,
  shortTitle,
  teamChipTheme,
  toPage
} from '../../utils/index.js'
import DoctorEditDialog from './components/DoctorEditDialog.vue'
import DoctorTeamDialog from './components/DoctorTeamDialog.vue'
import DoctorTitleDialog from './components/DoctorTitleDialog.vue'
import PatientTeamDialog from './components/PatientTeamDialog.vue'

// 主页签：医生列表（D1）｜用户绑定（D3）
const activeTab = ref('list')

// 筛选条件（服务端分页，参数透传 GET /doctors）
const query = reactive({
  keyword: '',
  areaId: '',
  hospitalId: '',
  departmentId: '',
  title: '',
  doctorStatus: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 关键词防抖
let keywordTimer = null

// 字典（/dict/options：医院/院区/科室级联下拉包）
const dict = ref({ hospitals: [], areas: [], departments: [] })
// 在职医生下拉（getDoctorOptions → /doctors/options），D2 编辑弹窗选上级时使用，本步先取数
const doctorOptions = ref([])

const hospitalMap = computed(
  () => new Map(dict.value.hospitals.map((item) => [String(item.id), item.name]))
)
const areaMap = computed(
  () => new Map(dict.value.areas.map((item) => [String(item.id), item.name]))
)
const departmentMap = computed(
  () => new Map(dict.value.departments.map((item) => [String(item.id), item.name]))
)

// 科室随医院联动；字典项无 hospitalId 字段时不过滤
const departmentOptions = computed(() => {
  if (!query.hospitalId) return dict.value.departments
  return dict.value.departments.filter(
    (item) => item.hospitalId === undefined || String(item.hospitalId) === String(query.hospitalId)
  )
})

const buildParams = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const keyword = query.keyword.trim()
  if (keyword) params.keyword = keyword
  if (query.hospitalId) params.hospitalId = String(query.hospitalId)
  if (query.departmentId) params.departmentId = String(query.departmentId)
  if (query.title) params.title = query.title
  if (query.doctorStatus) params.doctorStatus = query.doctorStatus
  // areaId 是否被 GET /doctors 支持待后端确认（D1 待联调项），先按查询参数透传
  if (query.areaId) params.areaId = String(query.areaId)
  return params
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = toPage(await getDoctorPage(buildParams()))
    tableData.value = res.list
    total.value = res.total
    // 历史卡片默认取当前页首条医生；当前选中医生仍在列表中时保持不变
    if (tableData.value.length) {
      const exists = tableData.value.some(
        (item) => String(item.id) === String(historyDoctorId.value)
      )
      if (!historyDoctorId.value || !exists) {
        historyDoctorId.value = String(tableData.value[0].id)
        historyPage.value = 1
        fetchHistory()
      }
    } else {
      historyDoctorId.value = null
      historyList.value = []
      historyTotal.value = 0
    }
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '医生列表加载失败')
  } finally {
    loading.value = false
  }
}

const fetchDict = async () => {
  try {
    const res = await getDictOptions()
    dict.value = {
      hospitals: Array.isArray(res?.hospitals) ? res.hospitals : [],
      areas: Array.isArray(res?.areas) ? res.areas : [],
      departments: Array.isArray(res?.departments) ? res.departments : []
    }
  } catch {
    dict.value = { hospitals: [], areas: [], departments: [] }
  }
}

const fetchDoctorOptions = async () => {
  try {
    const res = await getDoctorOptions()
    doctorOptions.value = Array.isArray(res) ? res : []
    // 用户绑定页签已打开但下拉尚未就绪时，默认选中首位在职医生
    if (activeTab.value === 'bind' && !bindDoctorId.value && doctorOptions.value.length) {
      bindDoctorId.value = String(doctorOptions.value[0].id)
      fetchBindPatients()
    }
  } catch {
    doctorOptions.value = []
  }
}

const onKeywordInput = () => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    page.value = 1
    fetchList()
  }, 350)
}

const onFilterChange = () => {
  page.value = 1
  fetchList()
}

const onHospitalChange = () => {
  // 医院切换后清空已选科室，避免跨医院 id 失效
  query.departmentId = ''
  onFilterChange()
}

const handleReset = () => {
  query.keyword = ''
  query.areaId = ''
  query.hospitalId = ''
  query.departmentId = ''
  query.title = ''
  query.doctorStatus = ''
  page.value = 1
  fetchList()
}

const handlePageChange = (value) => {
  page.value = value
  fetchList()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  page.value = 1
  fetchList()
}

/* ---------------- 字段展示（缺失显示红色「接口未提供」，0 正常显示） ---------------- */

// id → 名称：优先行内 name 字段，其次字典关联，再次展示 id，id 也缺失才显示「接口未提供」
const resolveName = (row, nameKey, idKey, map) => {
  if (!isMissing(row[nameKey])) return row[nameKey]
  const id = row[idKey]
  if (isMissing(id)) return MISSING_TEXT
  return map.get(String(id)) || `ID: ${id}`
}

const areaText = (row) => resolveName(row, 'areaName', 'areaId', areaMap.value)
const hospitalText = (row) => resolveName(row, 'hospitalName', 'hospitalId', hospitalMap.value)
const departmentText = (row) =>
  resolveName(row, 'departmentName', 'departmentId', departmentMap.value)

// 名称与 id 均缺失时整格标红
const isNameMissing = (row, nameKey, idKey) => isMissing(row[nameKey]) && isMissing(row[idKey])

const titleTagStyle = (title) =>
  TITLE_TAG_STYLE[title] || { color: '#4b5563', background: 'rgba(243,244,246,0.6)' }

const statusText = (status) =>
  isMissing(status) ? MISSING_TEXT : DOCTOR_STATUS_TEXT[status] || String(status)
const statusTagType = (status) => DOCTOR_STATUS_TAG[status]?.type || 'info'

const countText = (value) => (isMissing(value) ? MISSING_TEXT : `${Number(value)} 人`)

// 注销行整行置灰
const tableRowClassName = ({ row }) => (row.doctorStatus === 'CANCELLED' ? 'row-cancelled' : '')

// 变更状态下拉项（ACTIVE 为当前态，不作为可选项）
const STATUS_COMMANDS = [
  { value: 'SUSPENDED', label: '停诊' },
  { value: 'RESIGNED', label: '离职' },
  { value: 'CANCELLED', label: '注销' }
]

/* ---------------- D2：编辑/新建弹窗 + 团队结构抽屉 ---------------- */

const editVisible = ref(false)
const editMode = ref('create')
const editDoctorId = ref(null)

const openCreate = () => {
  editMode.value = 'create'
  editDoctorId.value = null
  editVisible.value = true
}

const openEdit = (row) => {
  editMode.value = 'edit'
  editDoctorId.value = String(row.id)
  editVisible.value = true
}

const onEditSaved = () => {
  fetchList()
  fetchDoctorOptions()
}

const teamVisible = ref(false)
const teamDoctorId = ref(null)
const teamDoctorName = ref('')

const openTeam = (row) => {
  teamDoctorId.value = String(row.id)
  teamDoctorName.value = row.name || ''
  teamVisible.value = true
}

// 职称快捷修改弹窗（职称随 PUT /doctors/{id} 全量保存，无独立端点）
const titleVisible = ref(false)
const titleDoctorId = ref(null)
const titleDoctorName = ref('')

const openTitle = (row) => {
  titleDoctorId.value = String(row.id)
  titleDoctorName.value = row.name || ''
  titleVisible.value = true
}

const onTitleSaved = () => {
  fetchList()
  fetchDoctorOptions()
}

/* ---------------- D3：变更状态（停诊/离职/注销） ---------------- */

const onStatusCommand = async (row, doctorStatus) => {
  const targetText = DOCTOR_STATUS_TEXT[doctorStatus] || doctorStatus
  const needReason = doctorStatus === 'RESIGNED' || doctorStatus === 'CANCELLED'
  const handoverTip =
    doctorStatus === 'RESIGNED' || doctorStatus === 'CANCELLED'
      ? '离职/注销后，名下患者与团队成员需尽快完成交接。'
      : '停诊期间保留账号与团队关系。'
  let reason = ''
  try {
    const result = await ElMessageBox.prompt(
      `将 ${row.name} 的状态变更为「${targetText}」，确认继续吗？${handoverTip}`,
      '确认变更状态',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
        inputType: 'textarea',
        inputPlaceholder: needReason ? '请填写变更原因（必填）' : '可填写变更原因（选填）',
        inputValidator: (value) =>
          needReason && !value?.trim() ? '离职/注销必须填写变更原因' : true,
        confirmButtonClass: 'el-button--danger'
      }
    )
    reason = result.value?.trim() || ''
  } catch {
    return
  }
  try {
    await updateDoctorStatusById(String(row.id), {
      doctorStatus,
      reason: reason || undefined
    })
    ElMessage.success('状态变更成功')
    fetchList()
    if (String(historyDoctorId.value) === String(row.id)) fetchHistory()
  } catch (err) {
    ElMessage.error(err?.message || '状态变更失败，请稍后重试')
  }
}

/* ---------------- D3：团队与状态变更历史（按医生 id 查询，无全局端点） ---------------- */

const historyLoading = ref(false)
const historyList = ref([])
const historyTotal = ref(0)
const historyPage = ref(1)
const historyPageSize = ref(5)
const historyDoctorId = ref(null)

const historyDoctorName = computed(
  () =>
    tableData.value.find((item) => String(item.id) === String(historyDoctorId.value))?.name || ''
)

const fetchHistory = async () => {
  if (!historyDoctorId.value) {
    historyList.value = []
    historyTotal.value = 0
    return
  }
  historyLoading.value = true
  try {
    const res = toPage(
      await getDoctorChangeLogsById(String(historyDoctorId.value), {
        page: historyPage.value,
        pageSize: historyPageSize.value
      })
    )
    historyList.value = res.list
    historyTotal.value = res.total
  } catch (err) {
    historyList.value = []
    historyTotal.value = 0
    ElMessage.error(err?.message || '变更历史加载失败')
  } finally {
    historyLoading.value = false
  }
}

// 点击行切换历史医生
const onTableRowClick = (row) => {
  if (String(historyDoctorId.value) === String(row.id)) return
  historyDoctorId.value = String(row.id)
  historyPage.value = 1
  fetchHistory()
}

const onHistoryPageChange = (value) => {
  historyPage.value = value
  fetchHistory()
}

// 变更历史整句（医生名 + 变更类型 + 前后值 + 原因），对齐设计稿胶囊行
const buildHistorySentence = (row) =>
  formatChangeSentence({
    ...row,
    doctorName: historyDoctorName.value
  })

/* ---------------- D3：用户绑定页签 ---------------- */

const bindLoading = ref(false)
const bindList = ref([])
const bindTotal = ref(0)
const bindPage = ref(1)
const bindPageSize = ref(10)
const bindDoctorId = ref('')

const fetchBindPatients = async () => {
  if (!bindDoctorId.value) {
    bindList.value = []
    bindTotal.value = 0
    return
  }
  bindLoading.value = true
  try {
    const res = toPage(
      await getDoctorPatientsById(String(bindDoctorId.value), {
        page: bindPage.value,
        pageSize: bindPageSize.value
      })
    )
    bindList.value = res.list
    bindTotal.value = res.total
  } catch (err) {
    bindList.value = []
    bindTotal.value = 0
    ElMessage.error(err?.message || '绑定用户加载失败')
  } finally {
    bindLoading.value = false
  }
}

const onBindDoctorChange = () => {
  bindPage.value = 1
  fetchBindPatients()
}

const onBindPageChange = (value) => {
  bindPage.value = value
  fetchBindPatients()
}

const onBindSizeChange = (size) => {
  bindPageSize.value = size
  bindPage.value = 1
  fetchBindPatients()
}

// 医疗团队：后端 DoctorPatientBrief 补全 team[] 后直接使用；未返回时回退当前选中医生，避免团队列空白
const patientTeam = (row) => {
  if (Array.isArray(row.team) && row.team.length) return row.team
  const current = doctorOptions.value.find(
    (item) => String(item.id) === String(bindDoctorId.value)
  )
  if (!current) return []
  return [
    {
      doctorId: String(current.id),
      name: current.name,
      title: current.title,
      departmentName: current.departmentName,
      hospitalName: current.hospitalName
    }
  ]
}

// 年龄/性别/病情：字段来源待后端在 DoctorPatientBrief 补全（age/gender/diagnosis），缺失显示「-」
const dashText = (value) => (isMissing(value) ? '-' : value)

// 调整医患绑定关系弹窗
const teamDialogVisible = ref(false)
const teamPatient = ref(null)

const openTeamAdjust = (row) => {
  teamPatient.value = row
  teamDialogVisible.value = true
}

const onTeamSaved = () => {
  fetchBindPatients()
  fetchList()
}

watch(activeTab, (tab) => {
  if (tab === 'bind' && !bindDoctorId.value && doctorOptions.value.length) {
    bindDoctorId.value = String(doctorOptions.value[0].id)
    fetchBindPatients()
  }
})

onMounted(() => {
  fetchDict()
  fetchDoctorOptions()
  fetchList()
})

onBeforeUnmount(() => {
  clearTimeout(keywordTimer)
})
</script>
<template>
  <div class="dm-page">
    <div class="page-header">
      <div>
        <h1>医生管理</h1>
        <p>管理医生职称、团队结构和用户绑定关系。</p>
      </div>
      <el-button class="create-btn" type="primary" :icon="Plus" @click="openCreate">新建医生</el-button>
    </div>

    <!-- 统计卡：医生总数取列表 total；分类计数待后端 /doctors/stats，未返回前不臆造数字 -->
    <div class="stats-grid">
      <div class="panel stat-card">
        <span class="stat-label">医生总数</span>
        <strong class="stat-value">{{ total }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">主任医师</span>
        <strong class="stat-value lead stat-missing">{{ MISSING_TEXT }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">主治医师</span>
        <strong class="stat-value attending stat-missing">{{ MISSING_TEXT }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">住院医师</span>
        <strong class="stat-value resident stat-missing">{{ MISSING_TEXT }}</strong>
      </div>
    </div>

    <!-- 团队与状态变更历史（D3 分段接入 getDoctorChangeLogsById） -->
    <div class="panel history-card">
      <h3 class="history-title">团队与状态变更历史</h3>
      <div v-loading="historyLoading" class="history-list">
        <div v-for="row in historyList" :key="String(row.id)" class="history-item">
          <span class="history-text">{{ buildHistorySentence(row) }}</span>
          <span class="history-time">{{ formatTime(row.createTime) }}</span>
        </div>
        <el-empty
          v-if="!historyLoading && !historyList.length"
          description="暂无变更记录，职称、团队和状态调整会记录在这里。"
          :image-size="80"
        />
      </div>
      <el-pagination
        v-if="historyTotal > historyPageSize"
        class="history-pager"
        background
        small
        :current-page="historyPage"
        :page-size="historyPageSize"
        :total="historyTotal"
        layout="total, prev, pager, next"
        @current-change="onHistoryPageChange"
      />
    </div>

    <el-tabs v-model="activeTab" class="main-tabs">
      <el-tab-pane label="医生列表" name="list" />
      <el-tab-pane label="用户绑定" name="bind" />
    </el-tabs>

    <!-- 医生列表 -->
    <template v-if="activeTab === 'list'">
      <div class="panel filter-card">
        <el-input
          v-model="query.keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索医生姓名或专科..."
          @input="onKeywordInput"
          @clear="onFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="query.areaId"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部区域"
          @change="onFilterChange"
        >
          <el-option
            v-for="item in dict.areas"
            :key="String(item.id)"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
        <el-select
          v-model="query.hospitalId"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部医院"
          @change="onHospitalChange"
        >
          <el-option
            v-for="item in dict.hospitals"
            :key="String(item.id)"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
        <el-select
          v-model="query.departmentId"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部科室"
          @change="onFilterChange"
        >
          <el-option
            v-for="item in departmentOptions"
            :key="String(item.id)"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
        <el-select
          v-model="query.title"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部职称"
          @change="onFilterChange"
        >
          <el-option v-for="title in TITLE_OPTIONS" :key="title" :label="title" :value="title" />
        </el-select>
        <el-select
          v-model="query.doctorStatus"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部状态"
          @change="onFilterChange"
        >
          <el-option
            v-for="item in DOCTOR_STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button size="large" :icon="Refresh" @click="handleReset">重置</el-button>
      </div>

      <div class="panel table-card">
        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          table-layout="fixed"
          row-key="id"
          highlight-current-row
          :row-class-name="tableRowClassName"
          @row-click="onTableRowClick"
        >
          <el-table-column label="姓名" min-width="90">
            <template #default="{ row }">
              <span v-if="isMissing(row.name)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else class="doctor-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="职称" min-width="100">
            <template #default="{ row }">
              <span v-if="isMissing(row.title)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else class="title-tag" :style="titleTagStyle(row.title)">
                {{ shortTitle(row.title) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="区域" min-width="90">
            <template #default="{ row }">
              <span :class="{ missing: isNameMissing(row, 'areaName', 'areaId') }">
                {{ areaText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="医院" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ missing: isNameMissing(row, 'hospitalName', 'hospitalId') }">
                {{ hospitalText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="科室" min-width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ missing: isNameMissing(row, 'departmentName', 'departmentId') }">
                {{ departmentText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="电话" min-width="130">
            <template #default="{ row }">
              <span v-if="isMissing(row.phone)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else>{{ row.phone }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="!isMissing(row.doctorStatus)"
                :type="statusTagType(row.doctorStatus)"
                size="small"
                effect="light"
              >
                {{ statusText(row.doctorStatus) }}
              </el-tag>
              <span v-else class="missing">{{ MISSING_TEXT }}</span>
            </template>
          </el-table-column>
          <el-table-column label="上级医生" min-width="100">
            <template #default="{ row }">
              <span v-if="isMissing(row.managerName)" class="text-dash">-</span>
              <span v-else>{{ row.managerName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="团队人数" min-width="90" align="center">
            <template #default="{ row }">
              <span :class="{ missing: isMissing(row.teamSize) }">{{ countText(row.teamSize) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="负责用户" min-width="90" align="center">
            <template #default="{ row }">
              <span :class="{ missing: isMissing(row.patientCount) }">
                {{ countText(row.patientCount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="op-cell">
                <!-- <el-tooltip content="编辑医生" placement="top">
                  <el-button link type="primary" :icon="Edit" @click="openEdit(row)" />
                </el-tooltip> -->
                <el-tooltip content="修改职称" placement="top">
                  <el-button link type="primary" :icon="Edit" @click="openTitle(row)" />
                </el-tooltip>
                <el-tooltip content="团队结构" placement="top">
                  <el-button link type="primary" :icon="Share" @click="openTeam(row)" />
                </el-tooltip>
                <el-dropdown trigger="click" @command="(cmd) => onStatusCommand(row, cmd)">
                  <el-button link type="primary">
                    变更状态<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="cmd in STATUS_COMMANDS"
                        :key="cmd.value"
                        :command="cmd.value"
                        :disabled="row.doctorStatus === cmd.value"
                      >
                        {{ cmd.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="当前无医生" :image-size="90" />
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
    </template>

    <!-- 用户绑定 -->
    <div v-else class="panel table-card bind-panel">
      <div class="bind-toolbar">
        <el-select
          v-model="bindDoctorId"
          class="bind-doctor-select"
          size="large"
          filterable
          placeholder="请选择医生"
          @change="onBindDoctorChange"
        >
          <el-option
            v-for="item in doctorOptions"
            :key="String(item.id)"
            :label="item.name + (item.title ? `（${item.title}）` : '')"
            :value="String(item.id)"
          />
        </el-select>
      </div>

      <el-table
        v-loading="bindLoading"
        :data="bindList"
        stripe
        table-layout="fixed"
        row-key="id"
      >
        <el-table-column label="用户姓名" min-width="110">
          <template #default="{ row }">
            <span v-if="isMissing(row.name)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="年龄" min-width="80" align="center">
          <template #default="{ row }">
            {{ dashText(row.age) }}
          </template>
        </el-table-column>
        <el-table-column label="性别" min-width="80" align="center">
          <template #default="{ row }">
            {{ dashText(row.gender) }}
          </template>
        </el-table-column>
        <el-table-column label="病情" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            {{ dashText(row.diagnosis) }}
          </template>
        </el-table-column>
        <el-table-column label="医疗团队" min-width="320">
          <template #default="{ row }">
            <template v-if="patientTeam(row).length">
              <span
                v-for="member in patientTeam(row)"
                :key="String(member.doctorId ?? member.id)"
                class="team-chip"
                :class="teamChipTheme(member.title)"
              >
                {{ member.name }}({{ shortTitle(member.title) }})
              </span>
            </template>
            <span v-else class="text-dash">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="80" align="center">
          <template #default="{ row }">
            <el-tooltip content="调整绑定" placement="top">
              <el-button link type="primary" :icon="Connection" @click="openTeamAdjust(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无绑定用户" :image-size="90" />
        </template>
      </el-table>

      <el-pagination
        v-if="bindTotal > 0"
        class="list-pager"
        background
        :current-page="bindPage"
        :page-size="bindPageSize"
        :page-sizes="[10, 20, 50]"
        :total="bindTotal"
        layout="total, prev, pager, next, sizes"
        @current-change="onBindPageChange"
        @size-change="onBindSizeChange"
      />
    </div>

    <!-- D2：新建/编辑医生弹窗 -->
    <DoctorEditDialog
      :visible="editVisible"
      :mode="editMode"
      :doctor-id="editDoctorId"
      @close="editVisible = false"
      @saved="onEditSaved"
    />

    <!-- D2：团队结构弹窗 -->
    <DoctorTeamDialog
      :visible="teamVisible"
      :doctor-id="teamDoctorId"
      :doctor-name="teamDoctorName"
      @close="teamVisible = false"
    />

    <!-- D2：修改医生职称快捷弹窗 -->
    <DoctorTitleDialog
      :visible="titleVisible"
      :doctor-id="titleDoctorId"
      :doctor-name="titleDoctorName"
      @close="titleVisible = false"
      @saved="onTitleSaved"
    />

    <!-- D3：调整医患绑定关系弹窗（患者视角增删团队医生） -->
    <PatientTeamDialog
      :visible="teamDialogVisible"
      :patient-id="teamPatient?.id"
      :patient-name="teamPatient?.name"
      :initial-team="teamPatient ? patientTeam(teamPatient) : []"
      @close="teamDialogVisible = false"
      @saved="onTeamSaved"
    />
  </div>
</template>
<style scoped>
.dm-page {
  --el-color-primary: #2563eb;
  display: flex;
  flex-direction: column;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.create-btn {
  font-weight: 600;
}



/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 18px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 24px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.stat-value.lead {
  color: #2563eb;
}

.stat-value.attending {
  color: #16a34a;
}

.stat-value.resident {
  color: #d97706;
}

.stat-missing {
  font-size: 18px;
}

/* 变更历史卡片 */
.history-card {
  margin-top: 18px;
  padding: 18px 22px;
}

.history-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.history-text {
  font-size: 15px;
  color: #1f2937;
  min-width: 0;
}

.history-time {
  flex: 0 0 auto;
  font-size: 14px;
  color: #9ca3af;
  white-space: nowrap;
}

.history-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 胶囊标签页 */
.main-tabs {
  margin-top: 4px;
}

.main-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 20px 22px;
}

.search-input {
  width: 250px;
  max-width: 100%;
}

.filter-select {
  width: 160px;
}

/* 表格 */
.table-card {
  margin-top: 18px;
  padding: 22px 24px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.doctor-name {
  font-weight: 600;
  color: #111827;
}

.title-tag {
  display: inline-block;
  height: 24px;
  line-height: 24px;
  padding: 0 9px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.missing {
  color: #ef4444;
  font-size: 13px;
}

.text-dash {
  color: #9ca3af;
}

.op-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 注销行整行置灰 */
:deep(.row-cancelled) {
  color: #9ca3af;
}

:deep(.row-cancelled .doctor-name) {
  color: #9ca3af;
}

.list-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.bind-panel {
  padding: 22px 24px;
}

.bind-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.bind-doctor-select {
  width: 280px;
  max-width: 100%;
}

/* 医疗团队标签：主诊/住院深色底白字，主治浅灰底 */
.team-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  margin: 0 8px 6px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.team-chip.dark {
  background: #111827;
  color: #fff;
}

.team-chip.light {
  background: #f3f4f6;
  color: #374151;
}

/* 行可点击切换历史医生 */
:deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-card {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }
}
</style>
