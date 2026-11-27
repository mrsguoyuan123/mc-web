<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Search,
  Download,
  Warning,
  UserFilled,
  FirstAidKit,
  BellFilled,
  CircleCheckFilled,
  FolderOpened
} from '@element-plus/icons-vue'
import {
  getPatientPage,
  deletePatientById,
  exportPatients,
  exportSelectedPatients,
  batchArchivePatients,
  getExercisePlanById,
  getRiskAlertPage,
  getRiskAlertSummary,
  getDictOptions
} from '../../api/index.js'
import {
  HEALTH_STATUS_OPTIONS,
  displayText,
  formatTime,
  toPage
} from '../../utils/index.js'
import AlertCardList from './components/AlertCardList.vue'
import CustomerFormDialog from './components/CustomerFormDialog.vue'
import CustomerRowDetail from './components/CustomerRowDetail.vue'
import ChatHistoryDrawer from './components/ChatHistoryDrawer.vue'
import ServiceRelationDrawer from './components/ServiceRelationDrawer.vue'
import BatchAssignCsDialog from './components/BatchAssignCsDialog.vue'

const router = useRouter()
const route = useRoute()

// 列表接口未返回的字段，列内统一展示该文案
// 表格字段映射（以 GET /patients 返回的 Patient 为准）：
// - 用户姓名 name（含展开箭头与风险标签）｜手机号 phone｜手术类型 surgeryType
// - 入库时间 createTime｜剩余陪诊次数 escortQuota
// - 医院/科室：列表仅返回 hospitalId/departmentId，名称由 /dict/options 字典关联，关联不到显示「接口未提供」
// - 保险ID：接口未提供（Patient 无 insuranceId 字段），整列显示「接口未提供」
const NOT_PROVIDED = '接口未提供'

// 数据范围筛选项（与角色 dataScope 枚举保持一致；/patients 实际范围仍由服务端按账号权限强制收敛）
const DATA_SCOPE_OPTIONS = [
  { label: '全部数据', value: 'ALL' },
  { label: '本院数据', value: 'HOSPITAL' },
  { label: '本科室数据', value: 'DEPARTMENT' },
  { label: '驻点数据', value: 'STATION' },
  { label: '仅本人数据', value: 'SELF' }
]

// 筛选条件（服务端分页，参数透传）
const query = reactive({
  keyword: '',
  region: '',
  hospitalId: '',
  departmentId: '',
  doctorId: '',
  disease: '',
  healthStatus: '',
  dataScope: '',
  tag: '',
  id: ''
})


watch(
  () => route.query.id,
  (newid) => {
    if (newid) {
      query.id = newid
      query.page = 1
      fetchList()
    }
  },
 
)

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const exporting = ref(false)

// 顶部异常提醒：风险列表 + 汇总（接口未就绪前为空数组 + 加载态，统计显示 0）
const alertLoading = ref(false)
const riskAlerts = ref([])
const riskSummary = ref({ pending: 0, high: 0, medium: 0, low: 0 })
const patientMap = ref({})

// 字典：医院 / 院区 / 科室 / 医生 / 标签（级联下拉包 /dict/options）
const dict = ref({ hospitals: [], areas: [], departments: [], doctors: [], tags: [] })

const hospitalOptions = computed(() => dict.value.hospitals || [])
const departmentOptions = computed(() => {
  const all = dict.value.departments || []
  if (!query.hospitalId) return all
  return all.filter((item) => String(item.hospitalId) === String(query.hospitalId))
})
const tagOptions = computed(() => dict.value.tags || [])
// 区域按院区名称去重（与患者表单的区域口径一致，区域本身为名称字符串）
const regionOptions = computed(() => {
  const seen = new Map()
  for (const area of dict.value.areas || []) {
    if (area && area.name && !seen.has(area.name)) seen.set(area.name, area)
  }
  return Array.from(seen.values())
})
const doctorOptions = computed(() => {
  const all = dict.value.doctors || []
  if (!query.hospitalId) return all
  return all.filter((item) => String(item.hospitalId) === String(query.hospitalId))
})

const expandedId = ref('')
const expandedRow = computed(
  () => tableData.value.find((item) => String(item.id) === String(expandedId.value)) || null
)

// 弹窗 / 抽屉状态
const formVisible = ref(false)
const formRecord = ref(null)
const chatVisible = ref(false)
const chatRecord = ref({})
const relationVisible = ref(false)
const relationRecord = ref({})

const buildParams = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const keyword = query.keyword.trim()
  if (keyword) params.keyword = keyword
  if (query.region) params.region = query.region
  if (query.hospitalId) params.hospitalId = String(query.hospitalId)
  if (query.departmentId) params.departmentId = String(query.departmentId)
  if (query.doctorId) params.doctorId = String(query.doctorId)
  const disease = query.disease.trim()
  if (disease) params.disease = disease
  if (query.healthStatus) params.healthStatus = query.healthStatus
  if (query.dataScope) params.dataScope = query.dataScope
  if (query.tag) params.tag = query.tag
  if (query.id) params.id = String(query.id)
  return params
}

/* ---------------- 运动方案配置状态 ---------------- */

// 布尔归一：只有明确 true/false 才算配置态，其余返回 null（视为接口未提供）
const toBoolLoose = (v) => {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return null
}

// 行内配置态：顶层 exercisePlanConfigured 优先，兜底 healthSnapshot 里的同名副本
const rowPlanConfigured = (row) =>
  toBoolLoose(row?.exercisePlanConfigured ?? row?.healthSnapshot?.exercisePlanConfigured)

// 仅记录「接口确认无方案」的患者 id；行内已有配置态时不发请求
const noPlanIds = ref(new Set())

// 方案是否为空：兼容 planId/id/planNo 与 items/sets/exercises/list 多种结构
const isPlanEmpty = (plan) => {
  if (!plan || typeof plan !== 'object') return true
  const planId = plan.planId ?? plan.id ?? plan.planNo
  const items = plan.items ?? plan.sets ?? plan.exercises ?? plan.list
  const hasPlanId = planId !== null && planId !== undefined && planId !== ''
  const hasItems = Array.isArray(items) && items.length > 0
  return !hasPlanId && !hasItems
}

const fetchExerciseFlags = async (rows) => {
  const list = Array.isArray(rows) ? rows : []
  const missing = new Set()
  const needQuery = []

  // 1) 行内已返回配置态的直接用，不再逐行请求
  for (const row of list) {
    const configured = rowPlanConfigured(row)
    if (configured === true) continue
    if (configured === false) {
      missing.add(String(row.id))
      continue
    }
    needQuery.push(row) // 字段缺失才回退查接口
  }

  // 2) 只对缺字段的行回退查询；请求失败或结构不识别不标记，避免误标
  if (needQuery.length) {
    const results = await Promise.allSettled(
      needQuery.map((row) => getExercisePlanById(String(row.id)))
    )
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return
      if (isPlanEmpty(result.value)) missing.add(String(needQuery[index].id))
    })
  }

  noPlanIds.value = missing
}

const fetchList = async () => {
  loading.value = true
  try {
    const result = toPage(await getPatientPage(buildParams()))
    tableData.value = result.list
    total.value = result.total
    fetchExerciseFlags(result.list)
    if (expandedId.value && !result.list.some((item) => String(item.id) === String(expandedId.value))) {
      expandedId.value = ''
    }
  } catch {
    tableData.value = []
    total.value = 0
    noPlanIds.value = new Set()
  } finally {
    loading.value = false
  }
}

const fetchAlerts = async () => {
  alertLoading.value = true
  try {
    const [alertPage, summary] = await Promise.all([
      getRiskAlertPage({ status: 'PENDING', page: 1, pageSize: 20 }),
      getRiskAlertSummary()
    ])
    riskAlerts.value = toPage(alertPage).list
    riskSummary.value = summary || { pending: 0, high: 0, medium: 0, low: 0 }
  } catch {
    riskAlerts.value = []
    riskSummary.value = { pending: 0, high: 0, medium: 0, low: 0 }
  } finally {
    alertLoading.value = false
  }
}

const fetchDict = async () => {
  try {
    const res = await getDictOptions()
    dict.value = {
      hospitals: res?.hospitals || [],
      areas: res?.areas || [],
      departments: res?.departments || [],
      doctors: res?.doctors || [],
      tags: res?.tags || []
    }
  } catch {
    dict.value = { hospitals: [], areas: [], departments: [], doctors: [], tags: [] }
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}

const handleReset = () => {
  query.keyword = ''
  query.region = ''
  query.hospitalId = ''
  query.departmentId = ''
  query.doctorId = ''
  query.disease = ''
  query.healthStatus = ''
  query.dataScope = ''
  query.tag = ''
  query.id = ''
  page.value = 1
  fetchList()
  router.replace({ path: route.path, query: {} })
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

const onHospitalChange = () => {
  query.departmentId = ''
  query.doctorId = ''
}

const toggleExpand = (row) => {
  expandedId.value = expandedId.value === String(row.id) ? '' : String(row.id)
}

/* ---------------- 勾选与批量操作 ---------------- */

const tableRef = ref(null)
// 展开行详情可用宽度：跟随表格可视宽度变化，避免详情内容撑出表格横向滚动
const detailMaxWidth = ref('100%')
let tableResizeObserver = null
// 选中 id 集合（ref 维护，雪花 ID 统一字符串）
const selectedIds = ref([])
const assignVisible = ref(false)

const handleSelectionChange = (rows) => {
  selectedIds.value = (rows || []).map((row) => String(row.id))
}

const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedIds.value = []
}

// 待处理风险提醒按患者聚合：HIGH 记为异常，MEDIUM/LOW 记为关注（HIGH 优先）
const riskLevelMap = computed(() => {
  const map = {}
  for (const alert of riskAlerts.value) {
    const patientId = alert.patientId ? String(alert.patientId) : ''
    if (!patientId) continue
    if (alert.level === 'HIGH') map[patientId] = 'HIGH'
    else if (!map[patientId]) map[patientId] = alert.level
  }
  return map
})

// 健康状态码值：后端为 GOOD / ATTENTION / ABNORMAL，兼容旧中文值
const ABNORMAL_STATUSES = ['ABNORMAL', '异常', '警告']
const ATTENTION_STATUSES = ['ATTENTION', '关注']

// 异常：风险提醒 HIGH 或健康状态为异常
const isAbnormal = (row) =>
  riskLevelMap.value[String(row.id)] === 'HIGH' || ABNORMAL_STATUSES.includes(row.healthStatus)

// 关注：排除已判异常的行，避免「异常 + 关注」重复挂标签
const isAttention = (row) => {
  if (isAbnormal(row)) return false
  return Boolean(riskLevelMap.value[String(row.id)]) || ATTENTION_STATUSES.includes(row.healthStatus)
}

// 运动方案未配置：行内有配置态就用行内值，否则看回退查询结果
const isExerciseMissing = (row) => {
  const configured = rowPlanConfigured(row)
  if (configured !== null) return configured === false
  return noPlanIds.value.has(String(row.id))
}

// 医院/科室名称：患者列表仅返回 hospitalId/departmentId，名称经字典接口 /dict/options 关联，
// 字典缺失或行内无 id 时显示「接口未提供」
const resolveDictName = (options, id) => {
  if (id === undefined || id === null || id === '') return NOT_PROVIDED
  const hit = (options || []).find((item) => String(item.id) === String(id))
  return hit ? hit.name : NOT_PROVIDED
}

const hospitalName = (row) => resolveDictName(hospitalOptions.value, row.hospitalId)
const departmentName = (row) => resolveDictName(departmentOptions.value, row.departmentId)

const downloadCsv = async (response, filename) => {
  const blob = response instanceof Response ? await response.blob() : new Blob([response], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleExport = async () => {
  exporting.value = true
  try {
    await downloadCsv(await exportPatients(buildParams()), `患者列表_${new Date().toISOString().slice(0, 10)}.csv`)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

// 导出所选：复用已确认的 /patients/export 并透传 patientIds（独立批量导出端点待后端补路径）
const handleExportSelected = async () => {
  if (!selectedIds.value.length) return
  exporting.value = true
  try {
    const response = await exportSelectedPatients([...selectedIds.value], buildParams())
    await downloadCsv(response, `患者列表_所选${selectedIds.value.length}条_${new Date().toISOString().slice(0, 10)}.csv`)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

const openAssignDialog = () => {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先勾选用户')
    return
  }
  assignVisible.value = true
}

const handleAssignSaved = () => {
  assignVisible.value = false
  clearSelection()
  fetchList()
}

// 批量归档：确认后调批量归档接口，本地移除所选并清空勾选
const handleBatchArchive = async () => {
  if (!selectedIds.value.length) return
  const count = selectedIds.value.length
  try {
    await ElMessageBox.confirm(
      '归档后用户将从当前列表隐藏，历史服务记录和健康数据会保留。此操作不会直接清除历史数据。',
      `归档选中的 ${count} 位用户？`,
      {
        type: 'warning',
        confirmButtonText: '确认归档',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }
  const archiveIds = [...selectedIds.value]
  try {
    await batchArchivePatients({ patientIds: archiveIds })
    tableData.value = tableData.value.filter((row) => !archiveIds.includes(String(row.id)))
    total.value = Math.max(total.value - archiveIds.length, 0)
    if (expandedId.value && archiveIds.includes(String(expandedId.value))) expandedId.value = ''
    ElMessage.success('已归档')
    clearSelection()
    fetchAlerts()
  } catch (err) {
    ElMessage.error(err?.message || '归档失败，请稍后重试')
  }
}

const openCreate = () => {
  formRecord.value = null
  formVisible.value = true
}

const openEdit = (row) => {
  formRecord.value = row
  formVisible.value = true
}

const handleFormSaved = () => {
  formVisible.value = false
  fetchList()
}

const openChat = (row) => {
  chatRecord.value = row || {}
  chatVisible.value = true
}

const openRelation = (row) => {
  relationRecord.value = row || {}
  relationVisible.value = true
}

const archivingId = ref('')

const handleArchive = async (row) => {
  try {
    await ElMessageBox.confirm(
      '归档后用户将从当前列表隐藏，历史服务记录和健康数据会保留。此操作不会直接清除历史数据。',
      '归档该用户？',
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  archivingId.value = String(row.id)
  try {
    await deletePatientById(String(row.id))
    ElMessage.success('该用户已归档')
    if (expandedId.value === String(row.id)) expandedId.value = ''
    if (tableData.value.length === 1 && page.value > 1) page.value -= 1
    fetchList()
    fetchAlerts()
  } catch (err) {
    ElMessage.error(err?.message || '归档失败，请稍后重试')
  } finally {
    archivingId.value = ''
  }
}

const notReady = (action) => {
  ElMessage.info(`「${action}」功能接口未就绪，暂不可用`)
}

// 查看详情：跳转用户详情页，URL 通过 query 携带患者 id
const goDetail = (row) => {
  if (!row?.id) {
    ElMessage.warning('未获取到用户 id，无法查看详情')
    return
  }
  router.push({ path: '/userManagementDetail', query: { id: String(row.id) } })
}

const onLocatePatient = (patientId) => {
  const target = tableData.value.find((item) => String(item.id) === String(patientId))
  if (target) {
    expandedId.value = String(target.id)
  } else {
    ElMessage.info('该用户不在当前页，请通过关键字搜索定位')
  }
}

// 顶部四卡：abnormal/attention 取全量风险提醒汇总，normal 用总数倒算（口径待后端按数据范围返回）
const healthStats = computed(() => {
  const abnormal = Number(riskSummary.value.high) || 0
  const attention = Number(riskSummary.value.medium) + Number(riskSummary.value.low) || 0
  const normal = Math.max(total.value - abnormal - attention, 0)
  return [
    {
      key: 'total',
      label: '管辖用户',
      value: total.value,
      desc: '当前数据范围内用户',
      icon: UserFilled,
      iconClass: 'icon-blue'
    },
    {
      key: 'abnormal',
      label: '数据异常',
      value: abnormal,
      desc: '需优先联系并跟进',
      icon: Warning,
      iconClass: 'icon-red'
    },
    {
      key: 'attention',
      label: '需要关注',
      value: attention,
      desc: '用药或训练待确认',
      icon: BellFilled,
      iconClass: 'icon-amber'
    },
    {
      key: 'normal',
      label: '数据正常',
      value: normal,
      desc: '近期指标相对平稳',
      icon: CircleCheckFilled,
      iconClass: 'icon-green'
    }
  ]
})

const onRowClick = (row, column) => {
  if (column && (column.type === 'expand' || column.type === 'selection')) return
  toggleExpand(row)
}

const rowClassName = () => 'clickable-row'

onMounted(() => {
  const newid = route.query.id
  if(newid){
    query.id = newid
    query.page = 1
    fetchList()
  }
  fetchDict()
  fetchList()
  fetchAlerts()

  nextTick(() => {
    const tableEl = tableRef.value?.$el
    if (!tableEl || typeof ResizeObserver === 'undefined') return
    tableResizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) detailMaxWidth.value = `${Math.floor(width)}px`
    })
    tableResizeObserver.observe(tableEl)
  })
})

onBeforeUnmount(() => {
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
})

// 展开/收起后重新计算表格布局，防止固定列与展开行宽度错位
watch(expandedId, () => {
  nextTick(() => tableRef.value?.doLayout?.())
})
</script>


<template>
  <div class="user-management-page">
    <div class="page-header">
      <div>
        <h1>用户管理仓</h1>
        <p>查看和管理权限范围内的用户数据。</p>
      </div>
      <div class="header-actions">
        <!-- <el-button :icon="Refresh" @click="fetchList">刷新</el-button> -->
        <el-button type="success" plain :icon="Download" :loading="exporting" @click="handleExport">
          导出用户
        </el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
      </div>
    </div>

    <section class="panel health-overview">
      <div class="overview-head">
        <div>
          <h2 class="overview-title">
            <el-icon class="title-icon">
              <FirstAidKit />
            </el-icon>
            健康数据总览
          </h2>
          <p class="overview-subtitle">数据范围与用户列表一致，异常提醒可折叠查看，折叠后仍会在用户名旁显示风险标签。</p>
        </div>
        <el-tag type="primary" effect="light" round size="">数据范围：全部数据</el-tag>
      </div>
      <div class="stat-grid">
        <div v-for="item in healthStats" :key="item.key" class="stat-card">
          <div class="stat-label">{{ item.label }}</div>
          <el-icon class="stat-icon" :class="item.iconClass">
            <component :is="item.icon" />
          </el-icon>
          <div class="stat-value">{{ item.value ?? 0 }}</div>
          <div class="stat-desc">{{ item.desc }}</div>
        </div>
      </div>
    </section>

    <AlertCardList :loading="alertLoading" :alerts="riskAlerts" :summary="riskSummary" :patient-map="patientMap"
      @locate="onLocatePatient" />

    <div class="panel filter-card">
      <div class="filter-row">
        <div>

        <el-input v-model="query.keyword" class="search-input" size="" clearable placeholder="搜索姓名、保险ID或电话"
          @keyup.enter="handleSearch" @clear="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="query.region" class="filter-select" size="" clearable filterable placeholder="全部区域">
          <el-option v-for="item in regionOptions" :key="item.id || item.name" :label="item.name" :value="item.name" />
        </el-select>
        <el-select v-model="query.hospitalId" class="filter-select" size="" clearable placeholder="全部医院"
          @change="onHospitalChange">
          <el-option v-for="item in hospitalOptions" :key="item.id" :label="item.name" :value="String(item.id)" />
        </el-select>
        <el-select v-model="query.departmentId" class="filter-select" size="" clearable placeholder="全部科室">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="String(item.id)" />
        </el-select>
        <el-select v-model="query.doctorId" class="filter-select" size="" clearable filterable placeholder="全部医生">
          <el-option v-for="item in doctorOptions" :key="String(item.id)" :label="item.name" :value="String(item.id)" />
        </el-select>
        <el-input v-model="query.disease" class="filter-select" size="" clearable placeholder="疾病关键字"
          @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-select v-model="query.healthStatus" class="filter-select" size="" clearable placeholder="健康状态">
          <el-option v-for="item in HEALTH_STATUS_OPTIONS" :key="item" :label="item" :value="item" />
        </el-select>
        <!-- <el-select v-model="query.dataScope" class="filter-select" size="" clearable placeholder="数据范围">
          <el-option
            v-for="item in DATA_SCOPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select v-model="query.tag" class="filter-select" size="" clearable placeholder="患者标签">
          <el-option v-for="item in tagOptions" :key="item.id || item.name" :label="item.name" :value="item.name" />
        </el-select> -->
        </div>
        <div>
        <el-button type="primary" size="" @click="handleSearch">查询</el-button>
        <el-button size="" @click="handleReset">重置</el-button>
      </div>
    </div>
    </div>

    <div class="panel table-card">
      <div v-if="selectedIds.length" class="batch-bar">
        <div class="batch-info">
          <el-icon class="batch-icon">
            <UserFilled />
          </el-icon>
          <span>已选择 {{ selectedIds.length }} 位用户</span>
        </div>
        <div class="batch-actions">
          <el-button type="primary" plain @click="openAssignDialog">批量分配客服</el-button>
          <el-button type="danger" link @click="handleBatchArchive">
            <el-icon>
              <FolderOpened />
            </el-icon>批量归档
          </el-button>
          <el-button :icon="Download" :loading="exporting" @click="handleExportSelected">导出所选</el-button>
          <el-button link type="primary" class="clear-link" @click="clearSelection">取消选择</el-button>
        </div>
      </div>
      <el-table ref="tableRef" v-loading="loading" :data="tableData" stripe row-key="id" :row-class-name="rowClassName"
        :style="{ '--detail-max-width': detailMaxWidth }"
        :expand-row-keys="expandedRow ? [String(expandedId)] : []" @row-click="onRowClick"
        @selection-change="handleSelectionChange"
        @expand-change="(row, expandedRows) => (expandedId = expandedRows.length ? String(row.id) : '')">
        <el-table-column type="selection" width="48" align="center" reserve-selection />
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="row-detail-wrap">
              <CustomerRowDetail :record="row" @view-detail="goDetail" @edit-doctor="openEdit"
                @group-manage="notReady('健康管理群管理')" @service-relation="openRelation" @view-communications="openChat"
                @attachment-manage="notReady('附件管理')" @edit-quota="openRelation" @change-log="openRelation" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户姓名" min-width="180">
          <template #default="{ row }">
            <div class="name-cell">
              <el-avatar :size="34">{{ (row.name || '-').slice(0, 1) }}</el-avatar>
              <div class="name-meta">
                <span class="name-text">
                  {{ displayText(row.name) }}
                  <el-tag v-if="isAbnormal(row)" type="danger" effect="dark" size="small" class="status-tag">异常</el-tag>
                  <el-tag v-else-if="isAttention(row)" type="warning" size="small" class="status-tag">关注</el-tag>
                  <el-tag v-if="isExerciseMissing(row)" type="danger" effect="plain" size="small"
                    class="exercise-tag">运动方案未配置</el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 保险ID：接口未提供，患者列表/详情接口均无 insuranceId 字段，列内统一显示「接口未提供」 -->
        <el-table-column label="保险ID" min-width="120">
          <template #default>
            <span class="not-provided">{{ NOT_PROVIDED }}</span>
          </template>
        </el-table-column>
        <el-table-column label="手机号" min-width="130">
          <template #default="{ row }">{{ displayText(row.phone) }}</template>
        </el-table-column>
        <el-table-column label="医院" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'not-provided': hospitalName(row) === NOT_PROVIDED }">{{ hospitalName(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="科室" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'not-provided': departmentName(row) === NOT_PROVIDED }">{{ departmentName(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="手术类型" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            {{ displayText(row.surgeryType) }}
          </template>
        </el-table-column>
        <el-table-column label="入库时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="剩余陪诊次数" min-width="110" align="center">
          <template #default="{ row }">{{ row.escortQuota ?? 0 }} 次</template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon>
                  <Edit />
                </el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="沟通" placement="top">
              <el-button type="primary" link @click="openChat(row)">
                <el-icon><ChatDotRound /></el-icon>

              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleArchive(row)"><el-icon>
                  <Delete />
                </el-icon></el-button>
            </el-tooltip>

          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的患者" :image-size="90" />
        </template>
      </el-table>

      <el-pagination class="list-pager" background :current-page="page" :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange" @size-change="handleSizeChange" />
    </div>

    <CustomerFormDialog :visible="formVisible" :record="formRecord" @close="formVisible = false"
      @saved="handleFormSaved" />
    <BatchAssignCsDialog :visible="assignVisible" :ids="selectedIds" @close="assignVisible = false"
      @saved="handleAssignSaved" />
    <ChatHistoryDrawer :visible="chatVisible" :record="chatRecord" @close="chatVisible = false" />
    <ServiceRelationDrawer v-model:visible="relationVisible" :record="relationRecord"
      @edit-match="notReady('调整客服 / 陪诊师匹配')" @edit-doctor="openEdit" @edit-quota="notReady('修改陪诊次数')" />
  </div>
</template>

<style scoped>
.user-management-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}



.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 250px;
}

.filter-select {
  width: 140px;
}

.table-card {
  padding: 12px 16px 16px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #d6e2ff;
  background: #ecf2ff;
}

.batch-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1d4ed8;
}

.batch-icon {
  font-size: 17px;
}

.batch-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.batch-actions :deep(.el-button.is-link) .el-icon {
  margin-right: 2px;
}

.clear-link {
  margin-left: 4px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name-text {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 14px;
  /* font-weight: 600; */
  color: #111827;
}

/* 红描边：运动方案未配置（danger plain 默认红字红边，补强描边对比度） */
.exercise-tag {
  border-color: #ef4444;
}

.not-provided {
  color: #9ca3af;
  font-size: 13px;
}

.sub-text {
  font-size: 12px;
  color: #9ca3af;
}

.health-overview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.overview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.title-icon {
  color: #ef4444;
  font-size: 20px;
}

.overview-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  position: relative;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 6px 16px rgba(17, 24, 39, 0.08);
}

.stat-label {
  font-size: 14px;
  color: #4b5563;
}

.stat-icon {
  position: absolute;
  top: 16px;
  right: 18px;
  font-size: 33px;
  padding: 8px;
  border-radius: 50%;
}

.icon-blue {
  color: #4f7cff;
  background: #eef2ff;
}

.icon-red {
  color: #ef4444;
  background: #fef2f2;
}

.icon-amber {
  color: #d97706;
  background: #fffbeb;
}

.icon-green {
  color: #16a34a;
  background: #ecfdf5;
}

.stat-value {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

.stat-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

:deep(.clickable-row) {
  cursor: pointer;
}

.row-detail-wrap {
  padding: 8px 16px 12px;
  background: #f9fafb;
  box-sizing: border-box;
  /* width: 100vw;
  max-width: var(--detail-max-width, 100%); */
  min-width: 0;
  overflow-x: hidden;
}

.row-detail-wrap :deep(.customer-row-detail),
.row-detail-wrap :deep(.detail-card),
.row-detail-wrap :deep(.el-row),
.row-detail-wrap :deep(.el-col),
.row-detail-wrap :deep(.chat-panel) {
  min-width: 0;
  max-width: 100%;
}

.row-detail-wrap :deep(.detail-card) {
  box-sizing: border-box;
  width: 100%;
}

.row-detail-wrap :deep(.el-row) {
  flex-wrap: wrap;
}

.user-management-page :deep(.el-table .el-table__expanded-cell) {
  padding: 16px;
}

.list-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 1100px) {

  .search-input,
  .filter-select {
    width: 100%;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
