<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import {
  FullScreen,
  User,
  ChatDotRound,
  CircleCheck,
  WarningFilled,
  TrendCharts,
  Clock
} from '@element-plus/icons-vue'
import {
  getDashboardFilters,
  getDepartmentDashboardSummary,
  getDepartmentDashboardTrends,
  getDepartmentDailyConsultations,
  getDepartmentHourlyDistribution,
  getDepartmentEfficiency
} from '../../api/index.js'
import { MISSING_TEXT, isMissing } from '../../utils/index.js'

/* ---------------- 顶部筛选（复用全局 /dashboard/filters 的 departments） ---------------- */

const filters = ref({ hospitals: [], departments: [] })
const filtersLoading = ref(false)
const selectedDepartmentId = ref('')

const selectedDepartmentName = computed(
  () =>
    filters.value.departments.find(
      (item) => String(item.id) === String(selectedDepartmentId.value)
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

// 雪花 ID 按字符串传递；不传时 DEPT_ADMIN 由服务端强制本科室
const departmentParams = () => {
  const params = {}
  if (selectedDepartmentId.value) params.departmentId = String(selectedDepartmentId.value)
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

// swagger 未定义趋势点元素结构，按候选键防御式提取，后端字段明确后只需收敛键名
const pickField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    if (!isMissing(obj[key])) return obj[key]
  }
  return null
}

const pointX = (item) => pickField(item, ['date', 'month', 'period', 'label', 'time'])
const monthLabel = (value) => {
  const text = String(value ?? '')
  return text.length >= 7 ? text.slice(0, 7) : text
}
const extractSeries = (list, yKeys) => {
  if (!Array.isArray(list)) return []
  return list.map((item) => ({ x: pointX(item), y: pickField(item, yKeys) }))
}

/* ---------------- 顶部 KPI（/department/dashboard/summary） ---------------- */

const summary = ref(null)
const summaryLoading = ref(false)
const summaryError = ref(false)

const fetchSummary = async () => {
  summaryLoading.value = true
  summaryError.value = false
  try {
    summary.value = await getDepartmentDashboardSummary(departmentParams())
  } catch {
    summary.value = null
    summaryError.value = true
  } finally {
    summaryLoading.value = false
  }
}

// deltas 结构待联调，多候选键兜底；取不到走「-」，不臆造环比
const kpiCards = computed(() => {
  const data = summary.value || {}
  const deltas = data.deltas || {}
  return [
    {
      label: '科室用户数',
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
      label: '随访完成率',
      value: data.followupCompletionRate,
      unit: '%',
      icon: CircleCheck,
      tone: 'orange',
      delta: pickField(deltas, [
        'followupCompletionRateDelta',
        'followupRate',
        'followupDelta'
      ]),
      deltaText: '较上月',
      goodWhen: 'up'
    },
    {
      label: '风险用户',
      value: data.riskUsers,
      unit: '',
      icon: WarningFilled,
      tone: 'red',
      // 医生团队人数取 summary.doctorCount（非 deltas），缺失时副信息显示「-」
      doctorCount: data.doctorCount
    }
  ]
})

// 数值型环比按正负给箭头与配色；字符串原值展示；风险卡展示医生团队人数
const deltaInfo = (card) => {
  if (Object.prototype.hasOwnProperty.call(card, 'doctorCount')) {
    if (isMissing(card.doctorCount)) return { text: '-', tone: 'muted' }
    return { text: `医生团队 ${card.doctorCount} 人`, tone: 'muted' }
  }
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

/* ---------------- 趋势（/department/dashboard/trends，驱动三张图） ---------------- */

const trends = ref(null)
const trendsLoading = ref(false)
const trendsError = ref(false)
const userTrendChartRef = ref(null)
const consultTrendChartRef = ref(null)
const combinedTrendChartRef = ref(null)

const fetchTrends = async () => {
  trendsLoading.value = true
  trendsError.value = false
  try {
    // months 默认值待联调，不传由服务端给默认区间
    trends.value = await getDepartmentDashboardTrends(departmentParams())
  } catch {
    trends.value = null
    trendsError.value = true
  } finally {
    trendsLoading.value = false
  }
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

// 综合趋势：同图双折线，X 轴取两序列并集（按用户序列对齐，咨询序列缺失补 null）
watch(
  [userSeries, consultSeries],
  async () => {
    await nextTick()
    if (!combinedTrendChartRef.value) return
    if (!userSeries.value.length && !consultSeries.value.length) return
    const labels = userSeries.value.length
      ? userSeries.value.map((item) => monthLabel(item.x))
      : consultSeries.value.map((item) => monthLabel(item.x))
    renderChart('combinedTrend', combinedTrendChartRef.value, {
      grid: { left: 48, right: 20, top: 24, bottom: 44 },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, itemWidth: 16, itemHeight: 8, textStyle: { fontSize: 12, color: '#64748b' } },
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
          name: '用户数量',
          type: 'line',
          symbol: 'circle',
          symbolSize: 7,
          data: userSeries.value.map((item) => (isMissing(item.y) ? null : Number(item.y))),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { color: '#3b82f6', width: 2.5 }
        },
        {
          name: '咨询次数',
          type: 'line',
          symbol: 'circle',
          symbolSize: 7,
          data: consultSeries.value.map((item) => (isMissing(item.y) ? null : Number(item.y))),
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { color: '#8b5cf6', width: 2.5 }
        }
      ]
    })
  },
  { flush: 'post' }
)

/* ---------------- 近 7 日咨询量柱图（/department/dashboard/daily-consultations） ---------------- */

const dailyConsults = ref([])
const dailyLoading = ref(false)
const dailyError = ref(false)
const dailyChartRef = ref(null)

const fetchDailyConsultations = async () => {
  dailyLoading.value = true
  dailyError.value = false
  try {
    // days 默认值待联调，不传由服务端给默认区间
    const res = await getDepartmentDailyConsultations(departmentParams())
    dailyConsults.value = Array.isArray(res) ? res : []
  } catch {
    dailyConsults.value = []
    dailyError.value = true
  } finally {
    dailyLoading.value = false
  }
}

watch(
  dailyConsults,
  async () => {
    await nextTick()
    if (!dailyConsults.value.length || !dailyChartRef.value) return
    const list = dailyConsults.value
    renderChart('dailyBar', dailyChartRef.value, {
      grid: { left: 48, right: 20, top: 24, bottom: 36 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: list.map((item) => String(item.date ?? '').slice(5, 10)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: axisLabelStyle
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: splitLineStyle, axisLabel: axisLabelStyle },
      series: [
        {
          name: '咨询次数',
          type: 'bar',
          barWidth: 28,
          data: list.map((item) => (isMissing(item.count) ? null : Number(item.count))),
          itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  },
  { flush: 'post' }
)

/* ---------------- 咨询时段分布折线（/department/dashboard/hourly-distribution） ---------------- */

const hourlyConsults = ref([])
const hourlyLoading = ref(false)
const hourlyError = ref(false)
const hourlyChartRef = ref(null)

const fetchHourlyDistribution = async () => {
  hourlyLoading.value = true
  hourlyError.value = false
  try {
    const res = await getDepartmentHourlyDistribution(departmentParams())
    hourlyConsults.value = Array.isArray(res) ? res : []
  } catch {
    hourlyConsults.value = []
    hourlyError.value = true
  } finally {
    hourlyLoading.value = false
  }
}

watch(
  hourlyConsults,
  async () => {
    await nextTick()
    if (!hourlyConsults.value.length || !hourlyChartRef.value) return
    const list = hourlyConsults.value
    renderChart(
      'hourlyLine',
      hourlyChartRef.value,
      buildLineOption({
        labels: list.map((item) => item.hourStart),
        values: list.map((item) => (isMissing(item.count) ? null : Number(item.count))),
        name: '咨询次数',
        color: '#06b6d4'
      })
    )
  },
  { flush: 'post' }
)

/* ---------------- 底部效能条（/department/dashboard/efficiency，无入参） ---------------- */

const efficiency = ref(null)
const efficiencyLoading = ref(false)
const efficiencyError = ref(false)

const fetchEfficiency = async () => {
  efficiencyLoading.value = true
  efficiencyError.value = false
  try {
    efficiency.value = await getDepartmentEfficiency()
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

/* ---------------- 统一加载与科室切换 ---------------- */

const fetchDepartmentBlocks = () =>
  Promise.allSettled([
    fetchSummary(),
    fetchTrends(),
    fetchDailyConsultations(),
    fetchHourlyDistribution()
  ])

watch(selectedDepartmentId, () => {
  fetchDepartmentBlocks()
})

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  fetchFilters()
  fetchDepartmentBlocks()
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
  <div class="dd-page">
    <!-- 标题区 -->
    <header class="dd-header">
      <div class="dd-titles">
        <h1>科室管理 - 效能看板</h1>
        <p>{{ selectedDepartmentName || '本科室' }} · 用户、随访与风险概况</p>
      </div>
      <div class="dd-tools">
        <el-button :icon="FullScreen" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏查看' }}
        </el-button>
        <el-select
          v-model="selectedDepartmentId"
          class="department-select"
          placeholder="科室筛选"
          clearable
          filterable
          :loading="filtersLoading"
        >
          <el-option
            v-for="item in filters.departments"
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
            <template v-if="deltaInfo(card).symbol">{{ deltaInfo(card).symbol }}</template>
            {{ deltaInfo(card).text }}
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
              <p>本科室用户数量变化</p>
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
              <h3>咨询量趋势</h3>
              <p>本科室咨询次数变化</p>
            </div>
          </div>
          <div v-if="consultSeries.length" ref="consultTrendChartRef" class="chart-body"></div>
          <el-empty v-else description="暂无咨询趋势数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchTrends">趋势加载失败，点击重试</div>
      </div>
    </section>

    <!-- 咨询分布双图 -->
    <section class="chart-grid">
      <div v-loading="dailyLoading" class="panel chart-card">
        <template v-if="!dailyError">
          <div class="chart-head">
            <el-icon class="head-icon tone-orange"><CircleCheck /></el-icon>
            <div>
              <h3>近7日咨询量</h3>
              <p>每日咨询次数统计</p>
            </div>
          </div>
          <div v-if="dailyConsults.length" ref="dailyChartRef" class="chart-body"></div>
          <el-empty v-else description="暂无近7日咨询数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchDailyConsultations">
          咨询量加载失败，点击重试
        </div>
      </div>

      <div v-loading="hourlyLoading" class="panel chart-card">
        <template v-if="!hourlyError">
          <div class="chart-head">
            <el-icon class="head-icon tone-cyan"><Clock /></el-icon>
            <div>
              <h3>咨询时段分布</h3>
              <p>不同时段咨询量分布</p>
            </div>
          </div>
          <div v-if="hourlyConsults.length" ref="hourlyChartRef" class="chart-body"></div>
          <el-empty v-else description="暂无时段分布数据" :image-size="80" class="chart-empty" />
        </template>
        <div v-else class="block-error" @click="fetchHourlyDistribution">
          时段分布加载失败，点击重试
        </div>
      </div>
    </section>

    <!-- 用户与咨询量综合趋势 -->
    <section v-loading="trendsLoading" class="panel chart-card combined-card">
      <template v-if="!trendsError">
        <div class="chart-head">
          <el-icon class="head-icon tone-blue"><TrendCharts /></el-icon>
          <div>
            <h3>用户与咨询量综合趋势</h3>
            <p>用户数与咨询次数对比分析</p>
          </div>
        </div>
        <div
          v-if="userSeries.length || consultSeries.length"
          ref="combinedTrendChartRef"
          class="chart-body combined-body"
        ></div>
        <el-empty v-else description="暂无综合趋势数据" :image-size="80" class="chart-empty" />
      </template>
      <div v-else class="block-error" @click="fetchTrends">趋势加载失败，点击重试</div>
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
.dd-page {
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
.dd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.dd-titles h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.dd-titles p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.dd-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.department-select {
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

.tone-red {
  color: #ef4444;
}

.tone-cyan {
  color: #06b6d4;
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

.combined-body {
  height: 320px;
}

.combined-card {
  width: 100%;
}

.chart-empty {
  padding: 48px 0;
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

@media (max-width: 1440px) {
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

  .department-select {
    width: 100%;
  }

  .chart-body,
  .combined-body {
    height: 260px;
  }
}
</style>
