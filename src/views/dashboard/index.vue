<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import {
  FullScreen,
  Moon,
  Sunny,
  Refresh,
  WarningFilled,
  WarnTriangleFilled,
  InfoFilled,
  ArrowRight
} from '@element-plus/icons-vue'
import {
  getDashboardAnomalies,
  getDashboardFocusNode,
  getDashboardKnowledgeGraph,
  getDashboardFilters,
  getDashboardOverview,
  getDashboardServiceActivity,
  getDashboardServiceTrend,
  getDashboardLiveEvents
} from '../../api/index.js'
import { MISSING_TEXT, isMissing } from '../../utils/index.js'

// 自动刷新周期（毫秒），与顶部「自动刷新周期 12s」一致
const REFRESH_INTERVAL = 12000

const themeMode = ref('light')
const isLight = computed(() => themeMode.value === 'light')
const toggleTheme = () => {
  themeMode.value = isLight.value ? 'dark' : 'light'
}

/* ---------------- 顶部筛选 ---------------- */

const filters = ref({ hospitals: [], departments: [] })
const filtersLoading = ref(false)
const selectedHospitalId = ref('')

const fetchFilters = async (silent = false) => {
  if (!silent) filtersLoading.value = true
  try {
    const res = await getDashboardFilters()
    filters.value = {
      hospitals: Array.isArray(res?.hospitals) ? res.hospitals : [],
      departments: Array.isArray(res?.departments) ? res.departments : []
    }
  } catch {
    filters.value = { hospitals: [], departments: [] }
  } finally {
    filtersLoading.value = false
  }
}

const commonParams = () => {
  // range / days 取值待后端确认（DB1 待联调项），默认不传由服务端给默认区间
  const params = {}
  if (selectedHospitalId.value) params.hospitalId = String(selectedHospitalId.value)
  return params
}

/* ---------------- 全屏 ---------------- */

const isFullscreen = ref(false)
const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen?.()
  } else {
    document.documentElement.requestFullscreen?.()
  }
}
const onFullscreenChange = () => {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

/* ---------------- 实时同步时间 ---------------- */

const lastSyncTime = ref('')
const updateSyncTime = () => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  lastSyncTime.value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/* ---------------- KPI 概览（独立加载/容错） ---------------- */

const overview = ref(null)
const overviewLoading = ref(false)
const overviewError = ref(false)

const fetchOverview = async (silent = false) => {
  if (!silent) overviewLoading.value = true
  overviewError.value = false
  try {
    overview.value = await getDashboardOverview(commonParams())
  } catch {
    overview.value = null
    overviewError.value = true
  } finally {
    overviewLoading.value = false
  }
}

// 集中映射：swagger kpis 仅 departments/diseases/managedUsers/warningRate/riskUsers，
// 今日服务触达/服务完成率/环比字段后端暂未提供，缺失走红色「接口未提供」，0 值正常展示
const kpiCards = computed(() => {
  const k = overview.value?.kpis || {}
  const deltas = k.deltas || {}
  const deltaText = (keys) => {
    for (const key of keys) {
      const value = deltas[key] ?? k[key]
      if (!isMissing(value)) return String(value)
    }
    return '-'
  }
  return [
    {
      label: '覆盖科室',
      value: k.departments,
      unit: '个',
      sub: `本月 ${deltaText(['departmentDelta', 'departmentsDelta'])}`,
      tone: 'dark'
    },
    {
      label: '服务病种',
      value: k.diseases,
      unit: '个',
      sub: `本月 ${deltaText(['diseaseDelta', 'diseasesDelta'])}`,
      tone: 'dark'
    },
    {
      label: '在管用户',
      value: k.managedUsers,
      unit: '人',
      sub: `环比 ${deltaText(['managedUsersDelta', 'managedUsersRate'])}`,
      tone: 'dark'
    },
    {
      // 接口未提供：kpis 无今日触达字段，保留卡片与兜底位
      label: '今日服务触达',
      value: k.todayReach,
      unit: '次',
      sub: `环比 ${deltaText(['todayReachDelta', 'todayReachRate'])}`,
      tone: 'dark'
    },
    {
      // 接口未提供：kpis 无完成率字段（焦点对象 FocusNode 内有 completionRate，DB2 接入）
      label: '服务完成率',
      value: k.completionRate,
      unit: '%',
      sub: `较上周 ${deltaText(['completionRateDelta', 'completionRateWeek'])}`,
      tone: 'green'
    },
    {
      label: '异常预警率',
      value: k.warningRate,
      unit: '%',
      sub: isMissing(k.riskUsers) ? '高风险 -' : `高风险 ${Number(k.riskUsers)} 人`,
      tone: 'red'
    }
  ]
})

const formatKpiValue = (card) => {
  if (isMissing(card.value)) return MISSING_TEXT
  const num = Number(card.value)
  return Number.isNaN(num) ? String(card.value) : num.toLocaleString()
}

/* ---------------- 30 日服务规模趋势（独立加载/容错 + ECharts） ---------------- */

const trend = ref(null)
const trendLoading = ref(false)
const trendError = ref(false)
const trendChartRef = ref(null)
let trendChart = null
let trendObserver = null

const trendPoints = computed(() =>
  Array.isArray(trend.value?.points) ? trend.value.points : []
)

const fetchTrend = async (silent = false) => {
  if (!silent) trendLoading.value = true
  trendError.value = false
  try {
    trend.value = await getDashboardServiceTrend(commonParams())
  } catch {
    trend.value = null
    trendError.value = true
  } finally {
    trendLoading.value = false
  }
}

const axisLabelStyle = { color: '#94a3b8' }
const splitLine = { lineStyle: { type: 'dashed', color: 'rgba(148,163,184,0.25)' } }

const renderTrendChart = () => {
  const el = trendChartRef.value
  if (!el || !trendPoints.value.length) {
    trendChart?.dispose()
    trendChart = null
    return
  }
  trendChart?.dispose()
  trendChart = echarts.init(el)
  const dates = trendPoints.value.map((item) => String(item.date || '').slice(5))
  trendChart.setOption({
    grid: { left: 46, right: 18, top: 42, bottom: 30 },
    legend: {
      top: 4,
      right: 8,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#64748b', fontSize: 12 }
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => (isMissing(value) ? '-' : `${value} 人次`)
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      axisLabel: axisLabelStyle
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine,
      axisLabel: axisLabelStyle
    },
    series: [
      {
        name: '服务触达',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trendPoints.value.map((item) => item.reach),
        itemStyle: { color: '#3b82f6' },
        lineStyle: { color: '#3b82f6', width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59,130,246,0.28)' },
            { offset: 1, color: 'rgba(59,130,246,0.02)' }
          ])
        }
      },
      {
        name: '服务完成',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trendPoints.value.map((item) => item.complete),
        itemStyle: { color: '#38bdf8' },
        lineStyle: { color: '#38bdf8', width: 2.5 }
      }
    ]
  })
  trendObserver?.disconnect()
  trendObserver = new ResizeObserver(() => trendChart?.resize())
  trendObserver.observe(el)
}

watch(
  trendPoints,
  async () => {
    await nextTick()
    renderTrendChart()
  },
  { flush: 'post' }
)

/* ---------------- DB2：健康服务知识图谱（独立加载/容错 + ECharts） ---------------- */

const graphData = ref(null)
const graphLoading = ref(false)
const graphError = ref(false)
const graphChartRef = ref(null)
let graphChart = null
let graphObserver = null
const activeCategory = ref('全部')

// 分类固定配色（待联调：分类配色字典来源，后端 categories 下发后按名称映射）
const CATEGORY_COLORS = {
  临床诊疗: '#3b82f6',
  康复运动: '#8b5cf6',
  营养管理: '#22c55e',
  风险监测: '#f59e0b',
  随访服务: '#06b6d4'
}
// 筛选项为页面固定 UI 文案；后端 categories 就绪后优先使用后端分类名
const FALLBACK_CATEGORIES = ['全部', '临床诊疗', '康复运动', '营养管理', '风险监测', '随访服务']
const categoryColor = (name) => CATEGORY_COLORS[String(name ?? '')] || '#64748b'

const graphCategories = computed(() => {
  const raw = graphData.value?.categories
  if (Array.isArray(raw) && raw.length) {
    const names = raw
      .map((item) => (typeof item === 'object' ? item?.name : item))
      .filter((value) => !isMissing(value))
    if (names.length) return ['全部', ...names]
  }
  return FALLBACK_CATEGORIES
})

// center 为独立中心节点对象；nodes 未包含中心时前端补入，不臆造其它节点
const graphNodes = computed(() => {
  const rawNodes = Array.isArray(graphData.value?.nodes) ? graphData.value.nodes : []
  const list = rawNodes.map((node) => ({ ...node, _isCenter: false }))
  const center = graphData.value?.center
  if (center && !isMissing(center.name)) {
    const centerId = center.id ?? center.name
    const exists = list.some(
      (node) => (node.id ?? node.name) === centerId || node.name === center.name
    )
    if (!exists) {
      list.unshift({ ...center, id: center.id ?? center.name, _isCenter: true })
    }
  }
  return list
})

const hasGraphData = computed(() => graphNodes.value.length > 0)

const visibleGraphNodes = computed(() => {
  if (activeCategory.value === '全部') return graphNodes.value
  return graphNodes.value.filter(
    (node) => node._isCenter || String(node.category ?? '') === activeCategory.value
  )
})

const visibleGraphEdges = computed(() => {
  const rawEdges = Array.isArray(graphData.value?.edges) ? graphData.value.edges : []
  const ids = new Set(visibleGraphNodes.value.map((node) => String(node.id ?? node.name)))
  return rawEdges.filter(
    (edge) => ids.has(String(edge.source)) && ids.has(String(edge.target))
  )
})

const fetchKnowledgeGraph = async (silent = false) => {
  if (!silent) graphLoading.value = true
  graphError.value = false
  try {
    graphData.value = await getDashboardKnowledgeGraph(commonParams())
  } catch {
    graphData.value = null
    graphError.value = true
  } finally {
    graphLoading.value = false
  }
}

const graphTooltipFormatter = (params) => {
  if (params.dataType === 'edge') return ''
  const count = params.data?.count
  return `${params.name}<br/>计数：${isMissing(count) ? MISSING_TEXT : count}`
}

const renderGraphChart = () => {
  const el = graphChartRef.value
  if (!el || !visibleGraphNodes.value.length) {
    graphChart?.dispose()
    graphChart = null
    return
  }
  graphChart?.dispose()
  graphChart = echarts.init(el)

  // 节点全部带 x/y 时用后端坐标（layout:none），否则力导布局并把中心节点固定在正中
  const useFixedLayout = visibleGraphNodes.value.every(
    (node) => !isMissing(node.x) && !isMissing(node.y)
  )
  const seriesData = visibleGraphNodes.value.map((node) => {
    const size = node._isCenter
      ? 76
      : Math.max(30, Math.min(56, 32 + Number(node.count || 0) * 0.15))
    const item = {
      id: String(node.id ?? node.name),
      name: node.name,
      count: node.count,
      symbolSize: size,
      itemStyle: node._isCenter
        ? {
            color: new echarts.graphic.RadialGradient(0.35, 0.35, 0.85, [
              { offset: 0, color: '#60a5fa' },
              { offset: 1, color: '#1d4ed8' }
            ]),
            borderColor: 'rgba(255,255,255,0.85)',
            borderWidth: 3,
            shadowColor: 'rgba(37,99,235,0.45)',
            shadowBlur: 18
          }
        : {
            color: categoryColor(node.category),
            borderColor: 'rgba(255,255,255,0.7)',
            borderWidth: 2
          },
      label: {
        show: true,
        color: '#f8fafc',
        fontSize: node._isCenter ? 14 : 11,
        fontWeight: node._isCenter ? 700 : 500,
        textBorderColor: 'rgba(15,23,42,0.35)',
        textBorderWidth: 3
      }
    }
    if (useFixedLayout) {
      item.x = Number(node.x)
      item.y = Number(node.y)
    } else if (node._isCenter) {
      item.x = 0
      item.y = 0
      item.fixed = true
    }
    return item
  })

  // 有 relation 的连线为虚线（关系强弱待后端枚举确认），无 relation 统一浅色实线
  const seriesLinks = visibleGraphEdges.value.map((edge) => ({
    source: String(edge.source),
    target: String(edge.target),
    lineStyle: {
      color: 'rgba(100,116,139,0.45)',
      width: 1.2,
      type: isMissing(edge.relation) ? 'solid' : 'dashed',
      curveness: 0.12
    }
  }))

  graphChart.setOption({
    tooltip: { trigger: 'item', formatter: graphTooltipFormatter },
    series: [
      {
        type: 'graph',
        layout: useFixedLayout ? 'none' : 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 320, edgeLength: [70, 150], gravity: 0.06, friction: 0.18 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 2 } },
        data: seriesData,
        links: seriesLinks,
        left: 8,
        right: 8,
        top: 8,
        bottom: 8
      }
    ]
  })
  graphObserver?.disconnect()
  graphObserver = new ResizeObserver(() => graphChart?.resize())
  graphObserver.observe(el)
}

watch(
  [graphData, activeCategory],
  async () => {
    await nextTick()
    renderGraphChart()
  },
  { flush: 'post' }
)

// GRAPH INTELLIGENCE：stats 键名待后端确认，多候选兜底；节点/边数可由 payload 实际长度派生
const graphStats = computed(() => {
  const stats = graphData.value?.stats || {}
  const pick = (keys) => {
    for (const key of keys) {
      if (!isMissing(stats[key])) return stats[key]
    }
    return MISSING_TEXT
  }
  const withPercent = (value) =>
    String(value).includes('%') ? value : `${value}%`
  const nodeCount = pick(['nodeCount', 'nodes', 'nodeNum', 'totalNodes'])
  const edgeCount = pick(['edgeCount', 'edges', 'edgeNum', 'totalEdges'])
  return [
    {
      label: '节点',
      value:
        nodeCount === MISSING_TEXT && hasGraphData.value ? graphNodes.value.length : nodeCount
    },
    {
      label: '关系边',
      value:
        edgeCount === MISSING_TEXT && Array.isArray(graphData.value?.edges)
          ? graphData.value.edges.length
          : edgeCount
    },
    // 接口未提供：高危热点数依赖 stats 下发，无候选键时显示红色「接口未提供」
    { label: '高危热点', value: pick(['highRiskCount', 'highRisk', 'riskNodes', 'hotspotCount', 'hotspots']) },
    // 接口未提供：连通率依赖 stats 下发，无候选键时显示红色「接口未提供」
    {
      label: '连通率',
      value:
        pick(['connectivityRate', 'connectionRate', 'connectRate', 'connectivity']) ===
        MISSING_TEXT
          ? MISSING_TEXT
          : withPercent(pick(['connectivityRate', 'connectionRate', 'connectRate', 'connectivity']))
    }
  ]
})

/* ---------------- DB2：当前聚焦对象（独立加载/容错） ---------------- */

const focusData = ref(null)
const focusLoading = ref(false)
const focusError = ref(false)

const fetchFocusNode = async (silent = false) => {
  if (!silent) focusLoading.value = true
  focusError.value = false
  try {
    focusData.value = await getDashboardFocusNode(commonParams())
  } catch {
    focusData.value = null
    focusError.value = true
  } finally {
    focusLoading.value = false
  }
}

const focusTags = computed(() =>
  Array.isArray(focusData.value?.tags)
    ? focusData.value.tags.filter((tag) => !isMissing(tag))
    : []
)

const focusCarePath = computed(() =>
  Array.isArray(focusData.value?.carePath)
    ? focusData.value.carePath.filter((step) => !isMissing(step))
    : []
)

const focusMetrics = computed(() => {
  const data = focusData.value || {}
  return [
    { label: '在管用户', value: data.count, suffix: '人' },
    { label: '服务完成率', value: data.completionRate, suffix: '%' },
    // 接口未提供：近 7 日服务单位后端未定义，仅展示数值
    { label: '近7日服务', value: data.sevenDayServices, suffix: '' },
    { label: '异常预警', value: data.warnings, suffix: '', warn: true }
  ]
})

/* ---------------- DB2：异常预警与闭环（独立加载/容错） ---------------- */

const anomalyData = ref(null)
const anomalyLoading = ref(false)
const anomalyError = ref(false)

const fetchAnomalies = async (silent = false) => {
  if (!silent) anomalyLoading.value = true
  anomalyError.value = false
  try {
    anomalyData.value = await getDashboardAnomalies(commonParams())
  } catch {
    anomalyData.value = null
    anomalyError.value = true
  } finally {
    anomalyLoading.value = false
  }
}

const anomalyItems = computed(() =>
  Array.isArray(anomalyData.value?.items) ? anomalyData.value.items : []
)

// level 枚举待联调，按中英文关键字归一为 high/medium/low 三档配色
const normalizeLevel = (level) => {
  const text = String(level ?? '').toUpperCase()
  if (text.includes('高') || text.includes('HIGH') || text === 'RED') return 'high'
  if (text.includes('中') || text.includes('MEDIUM') || text.includes('ORANGE')) return 'medium'
  return 'low'
}

/* ---------------- DB3：小程序服务项目活跃度（独立加载/容错） ---------------- */

const activityData = ref(null)
const activityLoading = ref(false)
const activityError = ref(false)

const fetchServiceActivity = async (silent = false) => {
  if (!silent) activityLoading.value = true
  activityError.value = false
  try {
    activityData.value = await getDashboardServiceActivity(commonParams())
  } catch {
    activityData.value = null
    activityError.value = true
  } finally {
    activityLoading.value = false
  }
}

// 按 rate 降序；rate 缺失的项目排末尾，0 值正常参与排序
const activityItems = computed(() => {
  const raw = Array.isArray(activityData.value?.items) ? activityData.value.items : []
  return [...raw].sort((a, b) => {
    if (isMissing(a?.rate)) return 1
    if (isMissing(b?.rate)) return -1
    return Number(b.rate) - Number(a.rate)
  })
})

// 配色阈值待联调：高完成（>=60%）主色，低完成浅色，缺失用灰底
const activityBarColor = (rate) => {
  const num = Number(rate)
  if (Number.isNaN(num)) return '#cbd5e1'
  return num >= 60 ? '#2563eb' : '#7dd3fc'
}

const clampRate = (rate) => {
  const num = Number(rate)
  if (Number.isNaN(num)) return 0
  return Math.min(100, Math.max(0, num))
}

/* ---------------- DB3：实时事件流（轮询失败静默保留旧数据） ---------------- */

// 单次拉取条数（limit 为 swagger 合法 query，默认值待联调）
const LIVE_EVENT_LIMIT = 10

const liveEvents = ref([])
const liveLoading = ref(false)
const liveError = ref(false)

const fetchLiveEvents = async () => {
  // 轮询时已有数据则不展示整卡 loading，避免列表闪烁
  if (!liveEvents.value.length) liveLoading.value = true
  try {
    const res = await getDashboardLiveEvents({
      ...commonParams(),
      limit: LIVE_EVENT_LIMIT
    })
    liveEvents.value = Array.isArray(res) ? res : []
    liveError.value = false
  } catch {
    // 轮询失败不打断页面：已有数据静默保留，仅首次加载失败展示重试入口
    if (!liveEvents.value.length) liveError.value = true
  } finally {
    liveLoading.value = false
  }
}

// 后端返回顺序未约定：全部带可解析时间时按时间倒序（最新在最上），否则保留原序
const sortedLiveEvents = computed(() => {
  const list = Array.isArray(liveEvents.value) ? [...liveEvents.value] : []
  const allParseable =
    list.length > 0 &&
    list.every((event) => !isMissing(event?.time) && !Number.isNaN(Date.parse(event.time)))
  if (allParseable) {
    return list.sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  }
  return list
})

// 事件时间仅展示 HH:mm:ss；不可解析时兜底截取原字符串
const formatEventTime = (value) => {
  if (isMissing(value)) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(11, 19)
  }
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 底部统计块：节点/边/高风险点复用 DB2 graphStats，完成率取活跃度总体完成率
const liveStatBlocks = computed(() => {
  const stats = graphStats.value
  const completion = activityData.value?.overallCompletionRate
  return [
    { label: '图谱节点', value: stats[0]?.value },
    { label: '关系边', value: stats[1]?.value },
    { label: '高风险点', value: stats[2]?.value },
    {
      label: '完成率',
      value: isMissing(completion) ? MISSING_TEXT : `${completion}%`
    }
  ]
})

/* ---------------- 统一刷新与轮询 ---------------- */

let refreshTimer = null

const refreshAll = async (showLoading = false) => {
  if (showLoading) {
    overviewLoading.value = true
    trendLoading.value = true
    graphLoading.value = true
    focusLoading.value = true
    anomalyLoading.value = true
    activityLoading.value = true
  }
  // 定时轮询静默刷新：不展示 v-loading 遮罩，避免页面每 12s 闪烁；手动刷新/切医院仍带 loading
  const silent = !showLoading
  await Promise.allSettled([
    fetchOverview(silent),
    fetchTrend(silent),
    fetchKnowledgeGraph(silent),
    fetchFocusNode(silent),
    fetchAnomalies(silent),
    fetchServiceActivity(silent),
    fetchLiveEvents()
  ])
  updateSyncTime()
}

const onHospitalChange = () => {
  refreshAll(true)
}

onMounted(() => {
  updateSyncTime()
  document.addEventListener('fullscreenchange', onFullscreenChange)
  fetchFilters()
  refreshAll(true)
  refreshTimer = setInterval(() => refreshAll(), REFRESH_INTERVAL)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  trendObserver?.disconnect()
  trendChart?.dispose()
  graphObserver?.disconnect()
  graphChart?.dispose()
})
</script>
<template>
  <div class="db-page" :class="themeMode">
    <!-- 顶部导航条 -->
    <header class="db-header panel">
      <div class="brand">
        <div class="brand-logo">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div class="brand-meta">
          <h1>君远后台管理系统</h1>
          <p>HEALTHCARE MANAGEMENT INTELLIGENCE</p>
        </div>
      </div>

      <div class="header-tools">
        <el-select
          v-model="selectedHospitalId"
          class="hospital-select"
          :popper-class="isLight ? 'db-select-popper' : 'db-select-popper is-db-dark'"
          placeholder="医院筛选"
          clearable
          filterable
          :loading="filtersLoading"
          @change="onHospitalChange"
        >
          <el-option
            v-for="item in filters.hospitals"
            :key="String(item.id)"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>

        <el-button :icon="FullScreen" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏查看' }}
        </el-button>
        <el-button :icon="Refresh" @click="refreshAll(true)">刷新</el-button>
        <el-button :icon="isLight ? Moon : Sunny" @click="toggleTheme">
          {{ isLight ? '深色' : '浅色' }}
        </el-button>

        <div class="sync-box">
          <span class="sync-dot"></span>
          <span class="sync-text">数据实时同步</span>
          <span class="sync-period">自动刷新周期 12s</span>
          <span class="sync-time">{{ lastSyncTime || '—' }}</span>
        </div>
      </div>
    </header>

    <!-- KPI 指标卡（6 张，字段集中映射） -->
    <section v-loading="overviewLoading" class="kpi-grid">
      <div v-for="card in kpiCards" :key="card.label" class="panel kpi-card">
        <div class="kpi-main">
          <span class="kpi-label">{{ card.label }}</span>
          <div class="kpi-value-row">
            <strong
              v-if="!isMissing(card.value)"
              class="kpi-value"
              :class="`tone-${card.tone}`"
            >
              {{ formatKpiValue(card) }}<small class="kpi-unit">{{ card.unit }}</small>
            </strong>
            <strong v-else class="kpi-value kpi-missing">{{ MISSING_TEXT }}</strong>
          </div>
          <span class="kpi-sub">{{ card.sub }}</span>
        </div>
        <!-- 迷你趋势线：overview 未返回趋势数据，统一占位不臆造 -->
        <div class="kpi-spark">
          <span>暂无趋势数据</span>
        </div>
      </div>
      <div v-if="overviewError" class="panel block-error" @click="fetchOverview">
        概览加载失败，点击重试
      </div>
      <el-tag
        v-if="overview?.derived"
        size="small"
        type="info"
        effect="plain"
        class="derived-tag"
      >
        派生数据
      </el-tag>
    </section>

    <!-- 主体三栏 -->
    <main class="db-grid">
      <!-- 左栏 -->
      <div class="col col-left">
        <section v-loading="trendLoading" class="panel trend-card">
          <template v-if="!trendError">
            <div class="card-head">
              <div>
                <h3>30日服务规模趋势</h3>
                <div class="trend-total">
                  <strong>{{ isMissing(trend?.totalReach) ? MISSING_TEXT : Number(trend.totalReach).toLocaleString() }}</strong>
                  <span>本期触达</span>
                </div>
              </div>
              <div class="head-right">
                <el-tag v-if="trend?.derived" size="small" type="info" effect="plain">派生</el-tag>
                <span class="head-note">全域 · 单位：人次</span>
              </div>
            </div>
            <div v-if="trendPoints.length" ref="trendChartRef" class="trend-chart"></div>
            <el-empty v-else description="暂无服务趋势数据" :image-size="90" class="chart-empty" />
          </template>
          <div v-else class="block-error" @click="fetchTrend">趋势加载失败，点击重试</div>
        </section>

        <!-- DB3：小程序服务项目活跃度 -->
        <section v-loading="activityLoading" class="panel activity-card">
          <template v-if="!activityError">
            <div class="card-head">
              <h3>小程序服务项目活跃度</h3>
              <div class="head-right">
                <el-tag
                  v-if="activityData?.derived"
                  size="small"
                  type="info"
                  effect="plain"
                >
                  派生
                </el-tag>
                <div class="activity-overall">
                  <strong
                    :class="{ 'missing-text': isMissing(activityData?.overallCompletionRate) }"
                  >
                    <template v-if="!isMissing(activityData?.overallCompletionRate)">
                      {{ activityData.overallCompletionRate }}<small>%</small>
                    </template>
                    <template v-else>{{ MISSING_TEXT }}</template>
                  </strong>
                  <span>总体完成</span>
                </div>
              </div>
            </div>

            <div v-if="activityItems.length" class="activity-list">
              <div
                v-for="(item, index) in activityItems"
                :key="index"
                class="activity-item"
              >
                <span class="activity-name">
                  <template v-if="!isMissing(item.name)">{{ item.name }}</template>
                  <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                </span>
                <div class="activity-bar-track">
                  <div
                    class="activity-bar"
                    :style="{
                      width: `${clampRate(item.rate)}%`,
                      background: activityBarColor(item.rate)
                    }"
                  ></div>
                </div>
                <span
                  class="activity-rate"
                  :class="{ 'missing-text': isMissing(item.rate) }"
                >
                  <template v-if="!isMissing(item.rate)">{{ item.rate }}%</template>
                  <template v-else>{{ MISSING_TEXT }}</template>
                </span>
              </div>
            </div>
            <el-empty
              v-else
              description="暂无项目活跃度数据"
              :image-size="80"
              class="chart-empty"
            />
          </template>
          <div v-else class="block-error" @click="fetchServiceActivity">
            活跃度加载失败，点击重试
          </div>
        </section>
      </div>

      <!-- 中栏 -->
      <div class="col col-center">
        <!-- DB2：健康服务知识图谱 -->
        <section v-loading="graphLoading" class="panel graph-card">
          <template v-if="!graphError">
            <div class="card-head">
              <div class="graph-title">
                <h3>健康服务知识图谱</h3>
                <span class="live-badge"><i class="live-dot"></i>LIVE</span>
                <!-- <el-tag
                  v-if="graphData?.derived"
                  size="small"
                  type="info"
                  effect="plain"
                >
                  派生
                </el-tag> -->
              </div>
              <!-- <span class="head-note">GRAPH INTELLIGENCE</span> -->
            </div>

            <div class="graph-filters">
              <button
                v-for="cat in graphCategories"
                :key="cat"
                type="button"
                class="graph-pill"
                :class="{ active: activeCategory === cat }"
                @click="activeCategory = cat"
              >
                {{ cat }}
              </button>
            </div>

            <div v-if="hasGraphData" ref="graphChartRef" class="graph-chart"></div>
            <el-empty
              v-else
              description="图谱暂无数据"
              :image-size="100"
              class="chart-empty"
            />

            <div class="graph-stats">
              <div v-for="stat in graphStats" :key="stat.label" class="graph-stat">
                <span class="stat-label">{{ stat.label }}</span>
                <strong
                  class="stat-value"
                  :class="{ 'missing-text': stat.value === MISSING_TEXT }"
                >
                  {{ stat.value }}
                </strong>
              </div>
            </div>
          </template>
          <div v-else class="block-error" @click="fetchKnowledgeGraph">
            图谱加载失败，点击重试
          </div>
        </section>

      <!-- DB3：实时事件（中栏，知识图谱下方） -->
      <section v-loading="liveLoading" class="panel live-bar">
        <div class="live-intro">
          <div class="live-intro-title">
            <i class="live-pulse"></i>
            <span>实时事件</span>
            <small>LIVE EVENTS</small>
          </div>
          <!-- <p>GRAPH INTELLIGENCE · 实时计算</p> -->
        </div>

        <!-- <div class="live-stats">
          <div v-for="block in liveStatBlocks" :key="block.label" class="live-stat">
            <strong :class="{ 'missing-text': block.value === MISSING_TEXT }">
              {{ block.value }}
            </strong>
            <span>{{ block.label }}</span>
          </div>
        </div> -->

        <div class="live-stream">
          <template v-if="!liveError">
            <div v-if="sortedLiveEvents.length" class="live-stream-list">
              <div
                v-for="(event, index) in sortedLiveEvents"
                :key="event.id ?? index"
                class="live-event"
              >
                <span class="event-time">{{ formatEventTime(event.time) }}</span>
                <span class="event-dot">·</span>
                <span class="event-dept">
                  <template v-if="!isMissing(event.dept)">{{ event.dept }}</template>
                  <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                </span>
                <span class="event-dot">·</span>
                <span class="event-message">
                  <template v-if="!isMissing(event.message)">{{ event.message }}</template>
                  <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                </span>
              </div>
            </div>
            <el-empty v-else description="暂无实时事件" :image-size="60" class="live-empty" />
          </template>
          <div v-else class="block-error live-retry" @click="fetchLiveEvents">
            事件加载失败，点击重试
          </div>
        </div>
      </section>
      </div>

      <!-- 右栏 -->
      <div class="col col-right">
        <!-- DB2：当前聚焦对象 -->
        <section v-loading="focusLoading" class="panel focus-card">
          <template v-if="!focusError">
            <div class="card-head">
              <div>
                <h3>当前聚焦对象</h3>
                <p class="card-subtitle">FOCUS NODE</p>
              </div>
              <el-tag
                v-if="focusData?.derived"
                size="small"
                type="info"
                effect="plain"
              >
                派生
              </el-tag>
            </div>

            <div v-if="focusData" class="focus-body">
              <div class="focus-stage">
                <template v-if="!isMissing(focusData.stage)">{{ focusData.stage }}</template>
                <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
              </div>

              <div class="focus-name-row">
                <strong class="focus-name">
                  <template v-if="!isMissing(focusData.focus)">{{ focusData.focus }}</template>
                  <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                </strong>
                <span v-if="!isMissing(focusData.count)" class="focus-count">
                  {{ focusData.count }}
                </span>
              </div>

              <div v-if="focusTags.length" class="focus-tags">
                <span v-for="tag in focusTags" :key="tag" class="focus-tag">{{ tag }}</span>
              </div>

              <div class="focus-metrics">
                <div v-for="metric in focusMetrics" :key="metric.label" class="focus-metric">
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong
                    class="metric-value"
                    :class="{
                      'missing-text': isMissing(metric.value),
                      'metric-warn': metric.warn && !isMissing(metric.value)
                    }"
                  >
                    {{ isMissing(metric.value) ? MISSING_TEXT : metric.value }}
                    <small v-if="metric.suffix && !isMissing(metric.value)">{{ metric.suffix }}</small>
                  </strong>
                </div>
              </div>

              <div class="care-path">
                <div class="care-title">
                  关键服务路径 <span>CARE PATH</span>
                </div>
                <div v-if="focusCarePath.length" class="care-steps">
                  <template v-for="(step, index) in focusCarePath" :key="index">
                    <span class="care-step">{{ step }}</span>
                    <el-icon v-if="index < focusCarePath.length - 1" class="care-arrow">
                      <ArrowRight />
                    </el-icon>
                  </template>
                </div>
                <div v-else class="care-empty">-</div>
              </div>
            </div>
            <el-empty
              v-else
              description="暂无聚焦对象数据"
              :image-size="80"
              class="chart-empty"
            />
          </template>
          <div v-else class="block-error" @click="fetchFocusNode">
            聚焦对象加载失败，点击重试
          </div>
        </section>

        <!-- DB2：异常预警与闭环 -->
        <section v-loading="anomalyLoading" class="panel anomaly-card">
          <template v-if="!anomalyError">
            <div class="card-head">
              <h3>异常预警与闭环</h3>
              <span class="pending-badge">
                <template v-if="!isMissing(anomalyData?.pending)">
                  {{ anomalyData.pending }} 待干预
                </template>
                <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
              </span>
            </div>

            <div v-if="anomalyItems.length" class="anomaly-list">
              <div
                v-for="(item, index) in anomalyItems"
                :key="index"
                class="anomaly-item"
              >
                <el-icon class="anomaly-icon" :class="`lv-${normalizeLevel(item.level)}`">
                  <WarningFilled v-if="normalizeLevel(item.level) === 'high'" />
                  <WarnTriangleFilled v-else-if="normalizeLevel(item.level) === 'medium'" />
                  <InfoFilled v-else />
                </el-icon>
                <div class="anomaly-body">
                  <div class="anomaly-title">
                    <template v-if="!isMissing(item.title)">{{ item.title }}</template>
                    <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                  </div>
                  <div class="anomaly-desc">
                    <template v-if="!isMissing(item.desc)">{{ item.desc }}</template>
                    <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                  </div>
                </div>
                <div
                  class="anomaly-count"
                  :class="`lv-${normalizeLevel(item.level)}`"
                >
                  <template v-if="!isMissing(item.count)">
                    {{ item.count }}<small>人</small>
                  </template>
                  <span v-else class="missing-text">{{ MISSING_TEXT }}</span>
                </div>
              </div>
            </div>
            <el-empty
              v-else
              description="暂无异常预警"
              :image-size="80"
              class="chart-empty"
            />

            <div class="closure-box">
              <span class="closure-label">异常闭环率</span>
              <strong v-if="!isMissing(anomalyData?.closureRate)" class="closure-value">
                {{ anomalyData.closureRate }}<small>%</small>
              </strong>
              <strong v-else class="closure-value missing-text">{{ MISSING_TEXT }}</strong>
            </div>
          </template>
          <div v-else class="block-error" @click="fetchAnomalies">
            异常预警加载失败，点击重试
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
<style scoped>
.db-page {
  --db-bg: #f3f6fb;
  --db-panel: #ffffff;
  --db-border: #e8edf5;
  --db-text: #1f2937;
  --db-text-soft: #64748b;
  --db-text-faint: #94a3b8;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 4px;
  color: var(--db-text);
  background: var(--db-bg);
  transition: background 0.25s ease, color 0.25s ease;
}

.db-page.dark {
  --db-bg: #0b1220;
  --db-panel: #111c30;
  --db-border: #1e2c44;
  --db-text: #e5edf8;
  --db-text-soft: #9fb2cc;
  --db-text-faint: #647896;
}

/* 深色模式：顶部 Element Plus 控件跟随主题（select 浮层见文件末尾全局样式） */
.db-page.dark .header-tools :deep(.el-select__wrapper) {
  background: #0b1220;
  box-shadow: 0 0 0 1px #1e2c44 inset;
}

.db-page.dark .header-tools :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #33507a inset;
}

.db-page.dark .header-tools :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #2563eb inset;
}

.db-page.dark .header-tools :deep(.el-select__placeholder),
.db-page.dark .header-tools :deep(.el-select__selected-item),
.db-page.dark .header-tools :deep(.el-select__input) {
  color: #e5edf8;
}

.db-page.dark .header-tools :deep(.el-select__placeholder.is-transparent) {
  color: #647896;
}

.db-page.dark .header-tools :deep(.el-select__caret),
.db-page.dark .header-tools :deep(.el-select__suffix .el-icon),
.db-page.dark .header-tools :deep(.el-select__clear) {
  color: #9fb2cc;
}

.db-page.dark .header-tools :deep(.el-button) {
  background: #111c30;
  border-color: #1e2c44;
  color: #e5edf8;
}

.db-page.dark .header-tools :deep(.el-button:hover),
.db-page.dark .header-tools :deep(.el-button:focus) {
  background: #16243c;
  border-color: #38bdf8;
  color: #38bdf8;
}

.db-page.dark .header-tools :deep(.el-button:active) {
  background: #0f1a2d;
}

.db-page.dark .header-tools :deep(.el-button .el-icon) {
  color: inherit;
}


/* 顶部导航 */
.db-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #38bdf8);
  color: #fff;
  font-size: 20px;
}

.brand-meta h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--db-text);
}

.brand-meta p {
  margin: 2px 0 0;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--db-text-faint);
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hospital-select {
  width: 220px;
}

.sync-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--db-text-soft);
  white-space: nowrap;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

.sync-text {
  color: #16a34a;
  font-weight: 600;
}

.sync-period,
.sync-time {
  color: var(--db-text-faint);
}

/* KPI 卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  position: relative;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  min-height: 132px;
}

.kpi-label {
  font-size: 13px;
  color: var(--db-text-soft);
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 8px;
}

.kpi-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: var(--db-text);
}

.kpi-value.tone-green {
  color: #16a34a;
}

.kpi-value.tone-red {
  color: #ef4444;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--db-text-soft);
}

.kpi-missing {
  font-size: 15px;
  color: #ef4444;
}

.kpi-sub {
  font-size: 12px;
  color: var(--db-text-faint);
}

.kpi-spark {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border: 1px dashed var(--db-border);
  border-radius: 8px;
  font-size: 11px;
  color: var(--db-text-faint);
}

.derived-tag {
  position: absolute;
  right: 8px;
  top: -10px;
}

.block-error {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

/* 主体三栏 */
.db-grid {
  display: grid;
  grid-template-columns: minmax(300px, 3fr) minmax(0, 5fr) minmax(280px, 3fr);
  gap: 16px;
  align-items: start;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.card-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--db-text);
}

.head-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.head-note {
  font-size: 12px;
  color: var(--db-text-faint);
  white-space: nowrap;
}

.trend-card {
  padding: 18px 20px;
  min-height: 380px;
}

.trend-total {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.trend-total strong {
  font-size: 28px;
  font-weight: 700;
  color: var(--db-text);
}

.trend-total span {
  font-size: 12px;
  color: var(--db-text-faint);
}

.trend-chart {
  width: 100%;
  height: 280px;
}

.chart-empty {
  padding: 40px 0;
}

/* 通用缺失值（红色「接口未提供」，0 值不受影响） */
.missing-text {
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
}

/* DB2 知识图谱 */
.graph-card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  min-height: 520px;
}

.graph-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.graph-title h3 {
  margin: 0;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #16a34a;
  background: rgba(34, 197, 94, 0.12);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: live-pulse 1.6s infinite;
}

@keyframes live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.graph-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.graph-pill {
  padding: 4px 12px;
  border: 1px solid var(--db-border);
  border-radius: 999px;
  background: var(--db-panel);
  color: var(--db-text-soft);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.graph-pill:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.graph-pill.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.graph-chart {
  flex: 1;
  width: 100%;
  height: 380px;
  min-height: 320px;
}

.graph-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--db-border);
}

.graph-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--db-text-faint);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--db-text);
}

.stat-value.missing-text {
  font-size: 12px;
}

/* DB2 聚焦对象 */
.focus-card,
.anomaly-card {
  padding: 18px 20px;
}

.card-subtitle {
  margin: 4px 0 0;
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--db-text-faint);
}

.focus-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.focus-stage {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}

.focus-name-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.focus-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--db-text);
}

.focus-count {
  font-size: 22px;
  font-weight: 700;
  color: #06b6d4;
}

.focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.focus-tag {
  padding: 3px 10px;
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.1);
}

.focus-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.focus-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--db-border);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.06);
}

.metric-label {
  font-size: 12px;
  color: var(--db-text-soft);
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--db-text);
}

.metric-value small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--db-text-soft);
}

.metric-value.missing-text {
  font-size: 13px;
}

.metric-value.metric-warn {
  color: #f59e0b;
}

.care-path {
  padding-top: 12px;
  border-top: 1px dashed var(--db-border);
}

.care-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--db-text);
}

.care-title span {
  margin-left: 6px;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--db-text-faint);
}

.care-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.care-step {
  padding: 4px 10px;
  border: 1px solid rgba(6, 182, 212, 0.25);
  border-radius: 8px;
  font-size: 12px;
  color: #0e7490;
  background: rgba(6, 182, 212, 0.1);
  white-space: nowrap;
}

.care-arrow {
  font-size: 12px;
  color: var(--db-text-faint);
}

.care-empty {
  font-size: 13px;
  color: var(--db-text-faint);
}

/* DB2 异常预警与闭环 */
.pending-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #ea580c;
  background: rgba(249, 115, 22, 0.12);
  white-space: nowrap;
}

.anomaly-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.anomaly-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--db-border);
  border-radius: 10px;
}

.anomaly-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 18px;
}

.anomaly-icon.lv-high {
  color: #ef4444;
}

.anomaly-icon.lv-medium {
  color: #f59e0b;
}

.anomaly-icon.lv-low {
  color: #3b82f6;
}

.anomaly-body {
  flex: 1;
  min-width: 0;
}

.anomaly-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--db-text);
}

.anomaly-desc {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--db-text-soft);
}

.anomaly-count {
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
}

.anomaly-count small {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 500;
}

.anomaly-count.lv-high {
  color: #ef4444;
}

.anomaly-count.lv-medium {
  color: #f59e0b;
}

.anomaly-count.lv-low {
  color: #3b82f6;
}

.closure-box {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--db-border);
}

.closure-label {
  font-size: 13px;
  color: var(--db-text-soft);
}

.closure-value {
  font-size: 30px;
  font-weight: 800;
  color: #f97316;
}

.closure-value small {
  font-size: 14px;
  font-weight: 600;
}

.closure-value.missing-text {
  font-size: 15px;
}

/* DB3 服务项目活跃度 */
.activity-card {
  padding: 18px 20px;
}

.activity-overall {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}

.activity-overall strong {
  font-size: 26px;
  font-weight: 800;
  color: #2563eb;
}

.activity-overall strong small {
  font-size: 13px;
  font-weight: 600;
}

.activity-overall strong.missing-text {
  font-size: 13px;
}

.activity-overall span {
  font-size: 11px;
  color: var(--db-text-faint);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.activity-item {
  display: grid;
  grid-template-columns: 88px 1fr 48px;
  align-items: center;
  gap: 10px;
}

.activity-name {
  font-size: 12px;
  color: var(--db-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.activity-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.activity-rate {
  font-size: 12px;
  font-weight: 600;
  color: var(--db-text);
  text-align: right;
}

/* DB3 底部实时事件条 */
.live-bar {
  /* 移入中栏后改为纵向卡片：标题 / 统计 2x2 / 事件流 */
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
}

.live-intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--db-border);
}

.live-intro-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--db-text);
}

.live-intro-title small {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  color: var(--db-text-faint);
}

.live-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: live-pulse 1.6s infinite;
}

.live-intro p {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--db-text-faint);
}

.live-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-content: center;
}

.live-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--db-border);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.06);
}

.live-stat strong {
  font-size: 20px;
  font-weight: 800;
  color: var(--db-text);
}

.live-stat strong.missing-text {
  font-size: 13px;
}

.live-stat span {
  font-size: 12px;
  color: var(--db-text-faint);
}

.live-stream {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.live-stream-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.live-event {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.event-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #2563eb;
}

.event-dot {
  color: var(--db-text-faint);
}

.event-dept {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--db-text);
}

.event-message {
  min-width: 0;
  color: var(--db-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-empty {
  padding: 12px 0;
}

.live-retry {
  grid-column: auto;
  min-height: 60px;
}

@media (max-width: 1000px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .db-grid {
    grid-template-columns: 1fr;
  }

  .graph-chart {
    height: 320px;
    min-height: 280px;
  }

}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hospital-select {
    width: 100%;
  }
}
</style>

<style>
/* 全局：医院筛选下拉浮层深色适配（浮层 teleport 至 body，需脱离 scoped；仅深色模式挂 is-db-dark） */
.db-select-popper.is-db-dark.el-select__popper.el-popper {
  --el-bg-color-overlay: #111c30;
  --el-border-color-light: #1e2c44;
  --el-text-color-regular: #9fb2cc;
  --el-text-color-secondary: #647896;
  --el-fill-color-light: rgba(148, 163, 184, 0.14);
  --el-color-primary: #38bdf8;
  background: #111c30;
  border: 1px solid #1e2c44;
  box-shadow: 0 12px 32px rgba(2, 8, 20, 0.55);
}

/* 箭头跟随浮层底色与描边（EP 通过同一 CSS 变量驱动，显式兜底） */
.db-select-popper.is-db-dark .el-popper__arrow::before {
  background: #111c30;
  border-color: #1e2c44;
}

.db-select-popper.is-db-dark .el-select-dropdown__item {
  color: #9fb2cc;
}

.db-select-popper.is-db-dark .el-select-dropdown__item.is-hovering,
.db-select-popper.is-db-dark .el-select-dropdown__item:hover {
  background: rgba(148, 163, 184, 0.14);
  color: #e5edf8;
}

.db-select-popper.is-db-dark .el-select-dropdown__item.is-selected {
  color: #38bdf8;
  font-weight: 700;
}

.db-select-popper.is-db-dark .el-select-dropdown__empty {
  color: #647896;
}

.db-select-popper.is-db-dark .el-scrollbar__wrap {
  scrollbar-width: thin;
  scrollbar-color: #33507a transparent;
}
</style>
