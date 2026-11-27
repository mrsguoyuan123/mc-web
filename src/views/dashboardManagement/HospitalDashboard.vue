<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import {
  FullScreen,
  User,
  ChatDotRound,
  OfficeBuilding,
  TrendCharts
} from '@element-plus/icons-vue'
import {
  getDashboardFilters,
  getHospitalDashboardSummary,
  getHospitalDashboardTrends,
  getHospitalDepartmentDistribution,
  getHospitalDailyActivity,
  getHospitalEfficiency
} from '../../api/index.js'
import { MISSING_TEXT, isMissing } from '../../utils/index.js'

/* ---------------- 顶部筛选（复用全局 /dashboard/filters） ---------------- */

const filters = ref({ hospitals: [], departments: [] })
const filtersLoading = ref(false)
const selectedHospitalId = ref('')

const selectedHospitalName = computed(
  () =>
    filters.value.hospitals.find(
      (item) => String(item.id) === String(selectedHospitalId.value)
    )?.name || ''
)

const fetchFilters = async () => {
  filtersLoading.value = true
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

// 雪花 ID 按字符串传递；不传时 HOSPITAL_ADMIN 由服务端强制本院
const hospitalParams = () => {
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

/* ---------------- 通用图表注册（统一 init / resize / dispose） ---------------- */

const chartInstances = new Map()

const renderChart = (key, el, option) => {
  if (!el) return
  const old = chartInstances.get(key)
  old?.observer?.disconnect()
  old?.chart?.dispose()
  const chart = echarts.init(el)
  chart.setOption(option)
  const observer = new ResizeObserver(() => chart.resize())
  observer.observe(el)
  chartInstances.set(key, { chart, observer })
}

const axisLabelStyle = { color: '#94a3b8', fontSize: 11 }
const splitLineStyle = { lineStyle: { type: 'dashed', color: 'rgba(148,163,184,0.25)' } }
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

const buildLineOption = ({ labels, values, name, color, legendBottom = true }) => ({
  grid: { left: 48, right: 20, top: 24, bottom: legendBottom ? 44 : 28 },
  tooltip: { trigger: 'axis' },
  legend: legendBottom
    ? { bottom: 0, itemWidth: 16, itemHeight: 8, textStyle: { color, fontSize: 12 } }
    : undefined,
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisLabel: axisLabelStyle
  },
  yAxis: { type: 'value', minInterval: 1, splitLine: splitLineStyle, axisLabel: axisLabelStyle },
  series: [
    {
      name,
      type: 'line',
      symbol: 'circle',
      symbolSize: 8,
      data: values,
      itemStyle: { color },
      lineStyle: { color, width: 2.5 }
    }
  ]
})

/* ---------------- 顶部 KPI（/hospital/dashboard/summary） ---------------- */

const summary = ref(null)
const summaryLoading = ref(false)
const summaryError = ref(false)

const fetchSummary = async () => {
  summaryLoading.value = true
  summaryError.value = false
  try {
    summary.value = await getHospitalDashboardSummary(hospitalParams())
  } catch {
    summary.value = null
    summaryError.value = true
  } finally {
    summaryLoading.value = false
  }
}

// deltas 结构待联调，多候选键兜底；取不到走「-」，不臆造环比
const pickField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    if (!isMissing(obj[key])) return obj[key]
  }
  return null
}

const kpiCards = computed(() => {
  const data = summary.value || {}
  const deltas = data.deltas || {}
  return [
    {
      label: '用户总数',
      value: data.users,
      unit: '',
      icon: User,
      tone: 'blue',
      delta: pickField(deltas, ['usersDelta', 'usersRate', 'usersGrowth', 'userGrowthRate']),
      deltaText: '较上月增长',
      goodWhen: 'up'
    },
    {
      label: '咨询总量',
      value: data.consults,
      unit: '',
      icon: ChatDotRound,
      tone: 'purple',
      delta: pickField(deltas, [
        'consultsDelta',
        'consultsRate',
        'consultsGrowth',
        'consultGrowthRate'
      ]),
      deltaText: '较上月增长',
      goodWhen: 'up'
    },
    {
      label: '活跃科室',
      value: data.activeDepartments,
      unit: '',
      icon: OfficeBuilding,
      tone: 'orange',
      staticSub: '覆盖主要临床科室'
    },
    {
      label: '平均响应时间',
      value: data.avgResponseMinutes,
      unit: '分钟',
      icon: TrendCharts,
      tone: 'green',
      delta: pickField(deltas, [
        'avgResponseMinutesDelta',
        'responseRate',
        'avgResponseDelta',
        'responseOptimizationRate'
      ]),
      deltaText: '较上月优化',
      goodWhen: 'down'
    }
  ]
})

// 数值型环比按正负给箭头与配色（增长类向上为好，响应时长向下为好）；字符串原值展示
const deltaInfo = (card) => {
  if (card.staticSub) return { text: card.staticSub, tone: 'muted' }
  if (isMissing(card.delta)) return { text: '-', tone: 'muted' }
  if (typeof card.delta === 'number') {
    const up = card.delta >= 0
    const good = card.goodWhen === 'up' ? up : !up
    return {
      symbol: up ? '↑' : '↓',
      text: `${Math.abs(card.delta)}% ${card.deltaText}`,
      tone: good ? 'good' : 'bad'
    }
  }
  return { text: `${card.delta} ${card.deltaText}`, tone: 'muted' }
}

const formatNumber = (value) => {
  const num = Number(value)
  return Number.isNaN(num) ? String(value) : num.toLocaleString()
}

/* ---------------- 趋势双图（/hospital/dashboard/trends） ---------------- */

const trends = ref(null)
const trendsLoading = ref(false)
const trendsError = ref(false)
const userTrendChartRef = ref(null)
const consultTrendChartRef = ref(null)

const fetchTrends = async () => {
  trendsLoading.value = true
  trendsError.value = false
  try {
    // months 默认值待联调，不传由服务端给默认区间
    trends.value = await getHospitalDashboardTrends(hospitalParams())
  } catch {
    trends.value = null
    trendsError.value = true
  } finally {
    trendsLoading.value = false
  }
}

// swagger 未定义趋势点元素结构，按候选键防御式提取，后端字段明确后只需收敛键名
const pointX = (item) => pickField(item, ['date', 'month', 'period', 'label', 'time'])
const monthLabel = (value) => {
  const text = String(value ?? '')
  return text.length >= 7 ? text.slice(0, 7) : text
}

const extractSeries = (list, yKeys) => {
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    x: pointX(item),
    y: pickField(item, yKeys)
  }))
}

const userSeries = computed(() =>
  extractSeries(trends.value?.users, ['value', 'count', 'num', 'total', 'users'])
)
const consultSeries = computed(() =>
  extractSeries(trends.value?.consultations, [
    'value',
    'count',
    'num',
    'total',
    'consults',
    'consultations'
  ])
)

watch(
  userSeries,
  async () => {
    await nextTick()
    if (!userSeries.value.length || !userTrendChartRef.value) return
    renderChart(
      'userTrend',
      userTrendChartRef.value,
      buildLineOption({
        labels: userSeries.value.map((item) => monthLabel(item.x)),
        values: userSeries.value.map((item) => (isMissing(item.y) ? null : Number(item.y))),
        name: '用户数量',
        color: '#3b82f6'
      })
    )
  },
  { flush: 'post' }
)

watch(
  consultSeries,
  async () => {
    await nextTick()
    if (!consultSeries.value.length || !consultTrendChartRef.value) return
    renderChart(
      'consultTrend',
      consultTrendChartRef.value,
      buildLineOption({
        labels: consultSeries.value.map((item) => monthLabel(item.x)),
        values: consultSeries.value.map((item) => (isMissing(item.y) ? null : Number(item.y))),
        name: '咨询次数',
        color: '#8b5cf6'
      })
    )
  },
  { flush: 'post' }
)

/* ---------------- 科室分布（/hospital/dashboard/departments） ---------------- */

const distribution = ref([])
const distributionLoading = ref(false)
const distributionError = ref(false)
const deptPieRef = ref(null)
const deptBarRef = ref(null)

const fetchDistribution = async () => {
  distributionLoading.value = true
  distributionError.value = false
  try {
    const res = await getHospitalDepartmentDistribution(hospitalParams())
    distribution.value = Array.isArray(res) ? res : []
  } catch {
    distribution.value = []
    distributionError.value = true
  } finally {
    distributionLoading.value = false
  }
}

// 接口仅回 departmentId，科室名用 filters.departments 字典补；补不到显示「-」
const departmentName = (id) => {
  const hit = filters.value.departments.find(
    (item) => String(item.id) === String(id)
  )
  return hit?.name || ''
}

const pieData = computed(() =>
  distribution.value
    .filter((item) => !isMissing(item.users))
    .map((item) => ({
      name: departmentName(item.departmentId) || '-',
      value: Number(item.users) || 0
    }))
)

// 接口缺口：departments 暂无 consults 字段；后端补齐后自动渲染柱图，否则空态占位
const hasDeptConsults = computed(() =>
  distribution.value.some((item) => !isMissing(item.consults))
)

const barData = computed(() =>
  distribution.value
    .filter((item) => !isMissing(item.consults))
    .map((item) => ({
      name: departmentName(item.departmentId) || '-',
      value: Number(item.consults) || 0
    }))
)

watch(
  pieData,
  async () => {
    await nextTick()
    if (!pieData.value.length || !deptPieRef.value) return
    renderChart('deptPie', deptPieRef.value, {
      color: PIE_COLORS,
      tooltip: { trigger: 'item', formatter: '{b}：{c} 人（{d}%）' },
      series: [
        {
          type: 'pie',
          radius: '62%',
          center: ['50%', '46%'],
          label: { formatter: '{b} {d}%', color: '#475569', fontSize: 12 },
          labelLine: { length: 12, length2: 10 },
          data: pieData.value
        }
      ]
    })
  },
  { flush: 'post' }
)

watch(
  [barData, hasDeptConsults],
  async () => {
    await nextTick()
    if (!hasDeptConsults.value || !barData.value.length || !deptBarRef.value) return
    renderChart('deptBar', deptBarRef.value, {
      grid: { left: 48, right: 20, top: 24, bottom: 36 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: barData.value.map((item) => item.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', interval: 0, fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: splitLineStyle,
        axisLabel: axisLabelStyle
      },
      series: [
        {
          type: 'bar',
          barWidth: 38,
          data: barData.value.map((item) => item.value),
          itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  },
  { flush: 'post' }
)

/* ---------------- 近 7 日活跃（/hospital/dashboard/daily-activity） ---------------- */

const dailyActivity = ref([])
const dailyLoading = ref(false)
const dailyError = ref(false)
const dailyChartRef = ref(null)

const fetchDailyActivity = async () => {
  dailyLoading.value = true
  dailyError.value = false
  try {
    // days 默认值待联调，不传由服务端给默认区间
    const res = await getHospitalDailyActivity(hospitalParams())
    dailyActivity.value = Array.isArray(res) ? res : []
  } catch {
    dailyActivity.value = []
    dailyError.value = true
  } finally {
    dailyLoading.value = false
  }
}

const dayLabel = (value) => String(value ?? '').slice(5, 10)

watch(
  dailyActivity,
  async () => {
    await nextTick()
    if (!dailyActivity.value.length || !dailyChartRef.value) return
    const list = dailyActivity.value
    renderChart('daily', dailyChartRef.value, {
      grid: { left: 48, right: 20, top: 24, bottom: 44 },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, itemWidth: 16, itemHeight: 8, textStyle: { fontSize: 12, color: '#64748b' } },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: list.map((item) => dayLabel(pickField(item, ['date', 'day']))),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: axisLabelStyle
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: splitLineStyle, axisLabel: axisLabelStyle },
      series: [
        {
          name: '活跃用户',
          type: 'line',
          symbol: 'circle',
          symbolSize: 7,
          data: list.map((item) =>
            isMissing(item.activeUsers) ? null : Number(item.activeUsers)
          ),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { color: '#3b82f6', width: 2.5 }
        },
        {
          name: '咨询次数',
          type: 'line',
          symbol: 'circle',
          symbolSize: 7,
          data: list.map((item) =>
            isMissing(item.consultations) ? null : Number(item.consultations)
          ),
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { color: '#8b5cf6', width: 2.5 }
        }
      ]
    })
  },
  { flush: 'post' }
)

/* ---------------- 底部效能条（/hospital/dashboard/efficiency，无入参） ---------------- */

const efficiency = ref(null)
const efficiencyLoading = ref(false)
const efficiencyError = ref(false)

const fetchEfficiency = async () => {
  efficiencyLoading.value = true
  efficiencyError.value = false
  try {
    efficiency.value = await getHospitalEfficiency()
  } catch {
    efficiency.value = null
    efficiencyError.value = true
  } finally {
    efficiencyLoading.value = false
  }
}

const efficiencyCards = computed(() => {
  const data = efficiency.value || {}
  return [
    {
      title: '用户活跃度',
      icon: User,
      tone: 'blue',
      parts: [
        { label: '日均活跃用户', value: data.dailyActiveUsers, suffix: '人' },
        { label: '活跃率', value: data.activeRate, suffix: '%' }
      ]
    },
    {
      title: '咨询效能',
      icon: ChatDotRound,
      tone: 'purple',
      parts: [
        { label: '人均咨询', value: data.consultsPerUserMonthly, suffix: '次/月' },
        { label: '解决率', value: data.resolutionRate, suffix: '%' }
      ]
    },
    {
      title: '服务质量',
      icon: TrendCharts,
      tone: 'green',
      parts: [
        { label: '响应时间', value: data.avgResponseMinutes, suffix: '分钟' },
        { label: '满意度', value: data.satisfactionRate, suffix: '%' }
      ]
    }
  ]
})

/* ---------------- 统一加载与医院切换 ---------------- */

const fetchHospitalBlocks = () =>
  Promise.allSettled([
    fetchSummary(),
    fetchTrends(),
    fetchDistribution(),
    fetchDailyActivity()
  ])

watch(selectedHospitalId, () => {
  fetchHospitalBlocks()
})

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  fetchFilters()
  fetchHospitalBlocks()
  // 效能接口无入参，数据范围服务端强制，仅加载一次
  fetchEfficiency()
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  for (const instance of chartInstances.values()) {
    instance.observer?.disconnect()
    instance.chart?.dispose()
  }
  chartInstances.clear()
})
</script>

<template>
  <div class="hd-page">
    <!-- 标题区 -->
    <header class="hd-header">
      <div class="hd-titles">
        <h1>医院管理 - 效能看板</h1>
        <p>{{ selectedHospitalName || '全部医院' }} · 用户与健康咨询数据分析</p>
      </div>
      <div class="hd-tools">
        <el-button :icon="FullScreen" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏查看' }}
        </el-button>
        <el-select
          v-model="selectedHospitalId"
          class="hospital-select"
          placeholder="医院筛选"
          clearable
          filterable
          :loading="filtersLoading"
        >
          <el-option
            v-for="item in filters.hospitals"
            :key="String(item.id)"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
      </div>
    </header>

    <!-- KPI 指标卡 -->
    <section v-loading="summaryLoading" class="kpi-grid">
      <template v-if="!summaryError">
        <div v-for="card in kpiCards" :key="card.label" class="panel kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ card.label }}</span>
            <el-icon class="kpi-icon" :class="`tone-${card.tone}`">
              <component :is="card.icon" />
            </el-icon>
          </div>
          <strong class="kpi-num" :class="`tone-${card.tone}`">
            <template v-if="!isMissing(card.value)">
              {{ formatNumber(card.value) }}<small v-if="card.unit">{{ card.unit }}</small>
            </template>
            <span v-else class="missing">{{ MISSING_TEXT }}</span>
          </strong>
          <span class="kpi-sub" :class="`sub-${deltaInfo(card).tone}`">
            <template v-if="card.staticSub">{{ card.staticSub }}</template>
            <template v-else-if="isMissing(card.delta)">-</template>
            <template v-else>
              {{ deltaInfo(card).symbol }}{{ deltaInfo(card).text }}
            </template>
          </span>
        </div>
      </template>
      <div v-else class="block-error" @click="fetchSummary">
        概览加载失败，点击重试
      </div>
    </section>

    <!-- 趋势双图 -->
    <section class="chart-grid">
      <div v-loading="trendsLoading" class="panel chart-card">
        <template v-if="!trendsError">
          <div class="chart-head">
            <el-icon class="head-icon tone-blue"><User /></el-icon>
            <div>
              <h3>用户增长趋势</h3>
              <p>各科室用户数量变化</p>
            </div>
          </div>
          <div v-if="userSeries.length" ref="userTrendChartRef" class="chart-body"></div>
          <el-empty v-else description="暂无用户增长数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchTrends">趋势加载失败，点击重试</div>
      </div>

      <div v-loading="trendsLoading" class="panel chart-card">
        <template v-if="!trendsError">
          <div class="chart-head">
            <el-icon class="head-icon tone-purple"><ChatDotRound /></el-icon>
            <div>
              <h3>健康咨询趋势</h3>
              <p>各科室咨询量变化</p>
            </div>
          </div>
          <div v-if="consultSeries.length" ref="consultTrendChartRef" class="chart-body"></div>
          <el-empty v-else description="暂无咨询趋势数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchTrends">趋势加载失败，点击重试</div>
      </div>
    </section>

    <!-- 分布与对比 -->
    <section class="chart-grid">
      <div v-loading="distributionLoading" class="panel chart-card">
        <template v-if="!distributionError">
          <div class="chart-head">
            <el-icon class="head-icon tone-blue"><User /></el-icon>
            <div>
              <h3>科室用户分布</h3>
              <p>各科室用户占比</p>
            </div>
          </div>
          <div v-if="pieData.length" ref="deptPieRef" class="chart-body pie-body"></div>
          <el-empty v-else description="暂无科室分布数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchDistribution">
          分布加载失败，点击重试
        </div>
      </div>

      <div v-loading="distributionLoading" class="panel chart-card">
        <template v-if="!distributionError">
          <div class="chart-head">
            <el-icon class="head-icon tone-purple"><ChatDotRound /></el-icon>
            <div>
              <h3>科室咨询量对比</h3>
              <p>各科室咨询次数统计</p>
            </div>
          </div>
          <div v-if="hasDeptConsults" ref="deptBarRef" class="chart-body"></div>
          <!-- 接口缺口：/hospital/dashboard/departments 暂无 consults，待后端补端点/字段 -->
          <el-empty
            v-else
            description="咨询量对比待后端补端点"
            :image-size="80"
            class="chart-empty"
          />
        </template>
        <div v-else class="block-error" @click="fetchDistribution">
          对比加载失败，点击重试
        </div>
      </div>
    </section>

    <!-- 近 7 日活跃 -->
    <section v-loading="dailyLoading" class="panel chart-card daily-card">
      <template v-if="!dailyError">
        <div class="chart-head">
          <el-icon class="head-icon tone-green"><TrendCharts /></el-icon>
          <div>
            <h3>近7日活跃数据</h3>
            <p>用户活跃度与咨询量对比</p>
          </div>
        </div>
        <div v-if="dailyActivity.length" ref="dailyChartRef" class="chart-body daily-body"></div>
        <el-empty v-else description="暂无近7日活跃数据" :image-size="80" class="chart-empty" />
      </template>
      <div v-else class="block-error" @click="fetchDailyActivity">
        活跃数据加载失败，点击重试
      </div>
    </section>

    <!-- 底部效能三栏 -->
    <section v-loading="efficiencyLoading" class="eff-grid">
      <template v-if="!efficiencyError">
        <div
          v-for="card in efficiencyCards"
          :key="card.title"
          class="panel eff-card"
          :class="`eff-${card.tone}`"
        >
          <div class="eff-head">
            <el-icon class="eff-icon" :class="`tone-${card.tone}`">
              <component :is="card.icon" />
            </el-icon>
            <h3>{{ card.title }}</h3>
          </div>
          <p class="eff-line">
            <template v-for="(part, index) in card.parts" :key="part.label">
              <span v-if="index > 0" class="eff-sep">，</span>
              <span class="eff-label">{{ part.label }}</span>
              <span v-if="!isMissing(part.value)" class="eff-value" :class="`tone-${card.tone}`">
                {{ formatNumber(part.value) }}<small>{{ part.suffix }}</small>
              </span>
              <span v-else class="missing">{{ MISSING_TEXT }}</span>
            </template>
          </p>
        </div>
      </template>
      <div v-else class="block-error" @click="fetchEfficiency">
        效能数据加载失败，点击重试
      </div>
    </section>
  </div>
</template>

<style scoped>
.hd-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  color: #1f2937;
}



.missing {
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
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

/* 标题区 */
.hd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.hd-titles h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.hd-titles p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.hd-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hospital-select {
  width: 220px;
}

/* 配色 */
.tone-blue {
  color: #2563eb;
}

.tone-purple {
  color: #8b5cf6;
}

.tone-orange {
  color: #f59e0b;
}

.tone-green {
  color: #16a34a;
}

/* KPI 卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 13px;
  color: #64748b;
}

.kpi-icon {
  font-size: 20px;
}

.kpi-num {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-num small {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 500;
}

.kpi-num .missing {
  font-size: 13px;
}

.kpi-sub {
  font-size: 12px;
}

.sub-good {
  color: #16a34a;
}

.sub-bad {
  color: #ef4444;
}

.sub-muted {
  color: #94a3b8;
}

/* 图表卡片 */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-card {
  padding: 18px 20px;
}

.chart-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.head-icon {
  font-size: 18px;
}

.chart-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.chart-head p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.chart-body {
  width: 100%;
  height: 300px;
}

.pie-body {
  height: 320px;
}

.daily-body {
  height: 320px;
}

.chart-empty {
  padding: 48px 0;
}

.daily-card {
  width: 100%;
}

/* 底部效能三栏 */
.eff-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.eff-card {
  padding: 16px 18px;
  border-left: 3px solid transparent;
}

.eff-blue {
  border-left-color: #2563eb;
}

.eff-purple {
  border-left-color: #8b5cf6;
}

.eff-green {
  border-left-color: #16a34a;
}

.eff-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eff-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  font-size: 18px;
  background: rgba(148, 163, 184, 0.12);
}

.eff-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.eff-line {
  margin: 12px 0 0;
  font-size: 12px;
  color: #64748b;
}

.eff-value {
  font-weight: 700;
}

.eff-value small {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 500;
}

.eff-sep {
  margin: 0 2px;
}

@media (max-width: 1000px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid,
  .eff-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .hospital-select {
    width: 100%;
  }

  .chart-body,
  .pie-body,
  .daily-body {
    height: 260px;
  }
}
</style>
