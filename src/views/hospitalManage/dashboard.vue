<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'

const userGrowthRef = ref(null)
const consultTrendRef = ref(null)
const departmentPieRef = ref(null)
const departmentBarRef = ref(null)
const activeWeekRef = ref(null)
const charts = []

const statCards = [
  { label: '用户总数', value: '528', trend: '↑ 15.6% 较上月增长', icon: 'User', theme: 'blue' },
  { label: '咨询总量', value: '1,950', trend: '↑ 13.4% 较上月增长', icon: 'ChatLineSquare', theme: 'purple' },
  { label: '活跃科室', value: '5', trend: '覆盖主要临床科室', icon: 'OfficeBuilding', theme: 'orange' },
  { label: '平均响应时间', value: '8分钟', trend: '↓ 12% 较上月优化', icon: 'Timer', theme: 'green' }
]

const insightCards = [
  {
    title: '用户活跃度',
    value: '10.6%',
    description: '日均活跃用户 56 人，本周用户访问保持稳定增长。',
    meta: '日均活跃用户 56 人',
    icon: 'TrendCharts',
    color: '#2563eb'
  },
  {
    title: '咨询效能',
    value: '3.7次/月',
    description: '人均健康咨询频次稳步提升，科室资源利用更加充分。',
    meta: '用户满意度 94%',
    icon: 'DataAnalysis',
    color: '#0891b2'
  },
  {
    title: '服务质量',
    value: '91%',
    description: '咨询问题解决率保持较高水平，平均响应时间持续缩短。',
    meta: '平均响应 8分钟',
    icon: 'CircleCheck',
    color: '#16a34a'
  }
]

const months = ['2026-01', '2026-02', '2026-03', '2026-04']
const departments = ['心内科', '骨科', '神经内科', '内分泌科', '消化内科']
const weekDays = ['04-16', '04-17', '04-18', '04-19', '04-20', '04-21', '04-22']

const makeAreaGradient = (startColor, endColor) =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: startColor },
    { offset: 1, color: endColor }
  ])

const makeBarGradient = () =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#38bdf8' },
    { offset: 0.48, color: '#2563eb' },
    { offset: 1, color: '#1e40af' }
  ])

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  borderColor: 'rgba(15, 23, 42, 0.92)',
  textStyle: { color: '#ffffff', fontSize: 12 },
  padding: [10, 14],
  extraCssText: 'border-radius: 10px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);'
}

const axisLabel = { color: '#64748b', fontSize: 12 }
const splitLine = { type: 'dashed', color: '#e8eef5' }
const baseLineGrid = { left: 48, right: 24, top: 34, bottom: 38 }

const createChart = (element, option) => {
  const chart = echarts.init(element)
  chart.setOption(option)
  charts.push(chart)
}

const initUserGrowthChart = () => {
  createChart(userGrowthRef.value, {
    color: ['#2563eb'],
    grid: baseLineGrid,
    tooltip: { trigger: 'axis', ...tooltipStyle },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLine: { lineStyle: { color: '#d7deea' } },
      axisTick: { show: false },
      axisLabel
    },
    yAxis: {
      type: 'value',
      min: 250,
      max: 570,
      interval: 80,
      axisLabel,
      splitLine: { lineStyle: splitLine }
    },
    series: [{
      name: '用户数',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#2563eb' },
      itemStyle: { color: '#2563eb', borderColor: '#ffffff', borderWidth: 2 },
      areaStyle: { color: makeAreaGradient('rgba(37, 99, 235, 0.34)', 'rgba(37, 99, 235, 0.02)') },
      data: [320, 390, 460, 528]
    }]
  })
}

const initConsultTrendChart = () => {
  createChart(consultTrendRef.value, {
    color: ['#06b6d4'],
    grid: baseLineGrid,
    tooltip: { trigger: 'axis', ...tooltipStyle },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLine: { lineStyle: { color: '#d7deea' } },
      axisTick: { show: false },
      axisLabel
    },
    yAxis: {
      type: 'value',
      min: 1100,
      max: 2050,
      interval: 190,
      axisLabel,
      splitLine: { lineStyle: splitLine }
    },
    series: [{
      name: '咨询量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#06b6d4' },
      itemStyle: { color: '#06b6d4', borderColor: '#ffffff', borderWidth: 2 },
      areaStyle: { color: makeAreaGradient('rgba(14, 165, 233, 0.32)', 'rgba(37, 99, 235, 0.03)') },
      data: [1250, 1500, 1730, 1950]
    }]
  })
}

const initDepartmentPieChart = () => {
  createChart(departmentPieRef.value, {
    color: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'],
    tooltip: {
      trigger: 'item',
      ...tooltipStyle,
      formatter: '{b}<br/>用户占比：{d}%（{c}人）'
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#64748b', fontSize: 12 }
    },
    series: [{
      name: '科室用户分布',
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#ffffff', borderWidth: 3 },
      label: {
        formatter: '{b}\n{d}%',
        color: '#475569',
        fontSize: 12,
        lineHeight: 17
      },
      labelLine: { length: 12, length2: 10 },
      data: [
        { value: 30, name: '心内科' },
        { value: 24, name: '骨科' },
        { value: 19, name: '神经内科' },
        { value: 16, name: '内分泌科' },
        { value: 11, name: '消化内科' }
      ]
    }]
  })
}

const initDepartmentBarChart = () => {
  createChart(departmentBarRef.value, {
    grid: { left: 22, right: 22, top: 30, bottom: 36, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...tooltipStyle
    },
    xAxis: {
      type: 'category',
      data: departments,
      axisLine: { lineStyle: { color: '#d7deea' } },
      axisTick: { show: false },
      axisLabel
    },
    yAxis: {
      type: 'value',
      minInterval: 100,
      axisLabel,
      splitLine: { lineStyle: splitLine }
    },
    series: [{
      name: '咨询量',
      type: 'bar',
      barWidth: 38,
      itemStyle: { color: makeBarGradient(), borderRadius: [8, 8, 0, 0] },
      data: [590, 460, 380, 320, 210]
    }]
  })
}

const initActiveWeekChart = () => {
  createChart(activeWeekRef.value, {
    color: ['#06b6d4', '#2563eb'],
    grid: { left: 48, right: 52, top: 34, bottom: 62 },
    tooltip: { trigger: 'axis', ...tooltipStyle },
    legend: {
      bottom: 8,
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      textStyle: { color: '#64748b', fontSize: 12 }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: weekDays,
      axisLine: { lineStyle: { color: '#d7deea' } },
      axisTick: { show: false },
      axisLabel
    },
    yAxis: [
      {
        type: 'value',
        name: '活跃用户',
        min: 35,
        max: 75,
        interval: 10,
        nameTextStyle: { color: '#94a3b8', padding: [0, 0, 0, -18] },
        axisLabel,
        splitLine: { lineStyle: splitLine }
      },
      {
        type: 'value',
        name: '咨询次数',
        min: 110,
        max: 210,
        interval: 25,
        nameTextStyle: { color: '#94a3b8', padding: [0, -20, 0, 0] },
        axisLabel,
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '活跃用户',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#06b6d4' },
        itemStyle: { color: '#06b6d4', borderColor: '#ffffff', borderWidth: 2 },
        areaStyle: { color: makeAreaGradient('rgba(6, 182, 212, 0.24)', 'rgba(6, 182, 212, 0.02)') },
        data: [45, 51, 47, 60, 57, 64, 69]
      },
      {
        name: '咨询次数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#2563eb' },
        itemStyle: { color: '#2563eb', borderColor: '#ffffff', borderWidth: 2 },
        areaStyle: { color: makeAreaGradient('rgba(37, 99, 235, 0.20)', 'rgba(37, 99, 235, 0.02)') },
        data: [128, 147, 141, 170, 154, 179, 192]
      }
    ]
  })
}

const resizeCharts = () => {
  charts.forEach((chart) => chart.resize())
}

onMounted(() => {
  initUserGrowthChart()
  initConsultTrendChart()
  initDepartmentPieChart()
  initDepartmentBarChart()
  initActiveWeekChart()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  charts.forEach((chart) => chart.dispose())
})
</script>

<template>
  <div class="hospital-dashboard">
    <section class="dashboard-hero">
      <div>
        <div class="hero-kicker">HOSPITAL PERFORMANCE</div>
        <h1>医院管理 - 效能看板</h1>
        <p>北京协和医院 - 用户与健康咨询数据分析</p>
      </div>
      <div class="hero-date">
        <span>数据更新时间</span>
        <strong>2026-04-22 18:00</strong>
      </div>
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-icon" :class="card.theme">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-trend">{{ card.trend }}</div>
        </div>
      </article>
    </section>

    <section class="chart-grid">
      <article class="chart-card">
        <div class="chart-heading">
          <div>
            <h3>用户增长趋势</h3>
            <p>近4个月平台用户规模变化</p>
          </div>
          <el-tag type="primary" effect="light">用户</el-tag>
        </div>
        <div ref="userGrowthRef" class="chart-body"></div>
      </article>

      <article class="chart-card">
        <div class="chart-heading">
          <div>
            <h3>健康咨询趋势</h3>
            <p>近4个月健康咨询服务量变化</p>
          </div>
          <el-tag type="success" effect="light">咨询</el-tag>
        </div>
        <div ref="consultTrendRef" class="chart-body"></div>
      </article>

      <article class="chart-card">
        <div class="chart-heading">
          <div>
            <h3>科室用户分布</h3>
            <p>各科室注册用户占比</p>
          </div>
          <el-tag effect="light">分布</el-tag>
        </div>
        <div ref="departmentPieRef" class="chart-body"></div>
      </article>

      <article class="chart-card">
        <div class="chart-heading">
          <div>
            <h3>科室咨询量对比</h3>
            <p>各科室健康咨询总量</p>
          </div>
          <el-tag type="warning" effect="light">咨询量</el-tag>
        </div>
        <div ref="departmentBarRef" class="chart-body"></div>
      </article>

      <article class="chart-card chart-wide">
        <div class="chart-heading">
          <div>
            <h3>近7日活跃数据</h3>
            <p>活跃用户与咨询次数联动趋势</p>
          </div>
          <el-tag type="info" effect="light">近7日</el-tag>
        </div>
        <div ref="activeWeekRef" class="chart-body wide-chart"></div>
      </article>
    </section>

    <section class="insight-grid">
      <article v-for="item in insightCards" :key="item.title" class="insight-card">
        <div class="insight-top">
          <div class="insight-icon" :style="{ backgroundColor: `${item.color}14`, color: item.color }">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <el-tag effect="plain" round>本月</el-tag>
        </div>
        <h3>{{ item.title }}</h3>
        <div class="insight-value" :style="{ color: item.color }">{{ item.value }}</div>
        <p>{{ item.description }}</p>
        <div class="insight-meta">{{ item.meta }}</div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.hospital-dashboard {
  color: #172033;
}

.dashboard-hero {
  min-height: 148px;
  padding: 28px 30px;
  border-radius: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: #ffffff;
  background:
    radial-gradient(circle at 88% 18%, rgba(103, 232, 249, 0.28), transparent 30%),
    radial-gradient(circle at 12% 100%, rgba(96, 165, 250, 0.22), transparent 34%),
    linear-gradient(135deg, #082f68 0%, #0f4eaf 48%, #0891b2 100%);
  box-shadow: 0 18px 40px rgba(15, 76, 129, 0.22);
}

.hero-kicker {
  margin-bottom: 10px;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.68);
}

.dashboard-hero h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 700;
}

.dashboard-hero p {
  margin: 12px 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-date {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(8px);
  text-align: right;
  white-space: nowrap;
}

.hero-date span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.hero-date strong {
  font-size: 14px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 22px;
}

.stat-card,
.chart-card,
.insight-card {
  background: #ffffff;
  border: 1px solid #edf1f7;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.stat-card {
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 25px;
}

.stat-icon.blue {
  color: #2563eb;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0.05));
}

.stat-icon.purple {
  color: #7c3aed;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(124, 58, 237, 0.05));
}

.stat-icon.orange {
  color: #d97706;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.17), rgba(245, 158, 11, 0.05));
}

.stat-icon.green {
  color: #16a34a;
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.14), rgba(22, 163, 74, 0.05));
}

.stat-content {
  min-width: 0;
}

.stat-value {
  font-size: 30px;
  line-height: 1;
  font-weight: 750;
  letter-spacing: -0.5px;
}

.stat-label {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
}

.stat-trend {
  margin-top: 7px;
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 22px;
}

.chart-card {
  padding: 20px 22px 14px;
  min-width: 0;
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.chart-heading h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.chart-heading p {
  margin: 7px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.chart-body {
  width: 100%;
  height: 310px;
}

.wide-chart {
  height: 360px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 22px;
}

.insight-card {
  padding: 22px;
}

.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.insight-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.insight-card h3 {
  margin: 18px 0 8px;
  font-size: 16px;
  font-weight: 700;
}

.insight-value {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 750;
  letter-spacing: -0.4px;
}

.insight-card p {
  min-height: 40px;
  margin: 12px 0 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
}

.insight-meta {
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 1180px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .dashboard-hero {
    flex-direction: column;
    gap: 18px;
  }

  .hero-date {
    text-align: left;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-hero {
    padding: 22px;
  }

  .dashboard-hero h1 {
    font-size: 23px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 18px;
  }

  .chart-body,
  .wide-chart {
    height: 280px;
  }
}
</style>
