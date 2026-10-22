<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

// 通过路由参数定位患者，避免数据混乱
const patient = {
  id: route.query.id || 'P001',
  name: route.query.name || '张三'
}

const activeTab = ref('diet')
const tabs = [
  { key: 'diet', label: '饮食记录', icon: 'Dish' },
  { key: 'weight', label: '体重管理', icon: 'Histogram' },
  { key: 'sugar', label: '血糖血压', icon: 'Sugar' },
  { key: 'medicine', label: '用药提醒', icon: 'FirstAidKit' },
  { key: 'sleep', label: '睡眠心理', icon: 'Moon' },
  { key: 'sport', label: '运动处方', icon: 'Basketball' }
]

const dates = ['04-15', '04-16', '04-17', '04-18', '04-19', '04-20', '04-21']

// 饮食照片（按日期分组）
const photoGroups = [
  { date: '2026-04-21', count: 1 },
  { date: '2026-04-20', count: 2 },
  { date: '2026-04-19', count: 1 },
  { date: '2026-04-17', count: 2 },
  { date: '2026-04-16', count: 1 },
  { date: '2026-04-15', count: 2 }
]

const dialogVisible = ref(false)

// 体重记录
const weightDates = ['04-01', '04-08', '04-15', '04-21']
const weightRecords = [
  { date: '2026-04-01', weight: 52.5, bmi: 14.2, advice: '体重稳定，继续保持良好饮食习惯' },
  { date: '2026-04-08', weight: 61.8, bmi: 24.0, advice: '体重略有下降，建议增加蛋白质摄入' },
  { date: '2026-04-15', weight: 71.5, bmi: 13.9, advice: '体重控制良好，继续保持规律运动' },
  { date: '2026-04-21', weight: 41.2, bmi: 23.8, advice: '体重保持在健康范围内' }
]

// 血糖血压记录
const sugarRecords = ref([
  { date: '2026-04-15', sugar: 5.8, systolic: 128, diastolic: 82, advice: '血糖血压正常，继续保持' },
  { date: '2026-04-16', sugar: 6.2, systolic: 132, diastolic: 85, advice: '血糖略高，注意控制糖分摄入' },
  { date: '2026-04-17', sugar: 5.5, systolic: 125, diastolic: 80, advice: '各项指标正常' },
  { date: '2026-04-18', sugar: 5.9, systolic: 130, diastolic: 84, advice: '血压略高，注意休息' },
  { date: '2026-04-19', sugar: 6.0, systolic: 129, diastolic: 82, advice: '指标稳定，继续保持' },
  { date: '2026-04-20', sugar: 6.0, systolic: 129, diastolic: 82, advice: '血糖控制良好' },
  { date: '2026-04-21', sugar: 5.6, systolic: 126, diastolic: 80, advice: '各项指标正常' }
])

// 今日用药计划
const medicineRecords = ref([
  { date: '2026-04-21 08:00', name: '二甲双胍', dose: '500mg', timing: '早餐后', taken: true, advice: '按时服用，注意监测血糖' },
  { date: '2026-04-21 12:00', name: '二甲双胍', dose: '500mg', timing: '午餐后', taken: true, advice: '继续保持规律服药' },
  { date: '2026-04-21 18:00', name: '二甲双胍', dose: '500mg', timing: '晚餐后', taken: false, advice: '请按时服药' },
  { date: '2026-04-20 21:00', name: '阿托伐他汀', dose: '20mg', timing: '睡前', taken: true, advice: '控制血脂，定期复查' }
])

// 睡眠与心理记录
const sleepRecords = [
  { date: '2026-04-15', hours: 7.5, quality: '良好', mood: '平静', advice: '睡眠质量好，精神状态佳' },
  { date: '2026-04-16', hours: 6.8, quality: '一般', mood: '焦虑', advice: '入睡困难，建议睡前放松' },
  { date: '2026-04-17', hours: 8.0, quality: '优秀', mood: '愉快', advice: '睡眠充足，心情舒畅' },
  { date: '2026-04-18', hours: 7.2, quality: '良好', mood: '平静', advice: '睡眠正常' },
  { date: '2026-04-19', hours: 6.5, quality: '较差', mood: '疲惫', advice: '睡眠不足，建议早睡' },
  { date: '2026-04-20', hours: 7.8, quality: '良好', mood: '愉快', advice: '作息规律，继续保持' },
  { date: '2026-04-21', hours: 7.5, quality: '良好', mood: '平静', advice: '睡眠质量稳定' }
]
const qualityColor = { 优秀: '#16a34a', 良好: '#16a34a', 一般: '#d97706', 较差: '#dc2626' }

// 运动处方执行记录
const sportRecords = [
  { date: '2026-04-15', project: '快走30分钟', duration: '30分钟', intensity: '中等', done: true, advice: '运动适量，继续保持' },
  { date: '2026-04-16', project: '慢跑20分钟', duration: '20分钟', intensity: '中等', done: true, advice: '运动强度合适，注意拉伸' },
  { date: '2026-04-17', project: '游泳45分钟', duration: '45分钟', intensity: '中等', done: false, advice: '建议完成计划运动' },
  { date: '2026-04-18', project: '瑜伽40分钟', duration: '40分钟', intensity: '轻度', done: true, advice: '有助于放松身心' },
  { date: '2026-04-19', project: '力量训练30分钟', duration: '30分钟', intensity: '中等', done: true, advice: '强度适中，继续坚持' },
  { date: '2026-04-20', project: '骑行60分钟', duration: '60分钟', intensity: '中高', done: false, advice: '建议按计划执行运动' },
  { date: '2026-04-21', project: '快走30分钟', duration: '30分钟', intensity: '中等', done: true, advice: '坚持每日运动' }
]
const sportStats = { done: 5, undone: 2, rate: '71%' }
const latestSport = { date: '2026-04-21', project: '快走30分钟', duration: '30分钟', done: true }

// 编辑建议弹窗（通用，直接修改记录对象）
const adviceVisible = ref(false)
const adviceText = ref('')
let editingRecord = null
const openAdvice = (record) => {
  editingRecord = record
  adviceText.value = record.advice
  adviceVisible.value = true
}
const saveAdvice = () => {
  if (editingRecord) editingRecord.advice = adviceText.value
  adviceVisible.value = false
  ElMessage.success('建议已保存')
}

// 蓝/青渐变
const blueArea = () => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(79, 124, 255, 0.5)' },
  { offset: 1, color: 'rgba(79, 124, 255, 0.03)' }
])
const cyanArea = () => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(47, 212, 207, 0.45)' },
  { offset: 1, color: 'rgba(47, 212, 207, 0.03)' }
])

// 图表实例
const barRef = ref()
const lineRef = ref()
const weightRef = ref()
const sugarChartRef = ref()
const bpChartRef = ref()
const sleepChartRef = ref()
const sportChartRef = ref()
let barChart = null
let lineChart = null
let weightChart = null
let sugarChart = null
let bpChart = null
let sleepChart = null
let sportChart = null

const resizeAll = () =>
  [barChart, lineChart, weightChart, sugarChart, bpChart, sleepChart, sportChart].forEach((chart) => chart?.resize())

const axisStyle = {
  axisLine: { lineStyle: { color: '#d1d5db' } },
  axisLabel: { color: '#6b7280' }
}
const splitLine = { lineStyle: { type: 'dashed', color: '#eef0f4' } }

// 营养摄入柱状图
const initBarChart = () => {
  barChart = echarts.init(barRef.value)
  barChart.setOption({
    color: ['#34eaff', '#358cff', '#3533ff'],
    grid: { left: 48, right: 20, top: 28, bottom: 60 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, icon: 'rect', itemWidth: 12, textStyle: { color: '#4b5563' } },
    xAxis: { type: 'category', data: dates, ...axisStyle },
    yAxis: { type: 'value', min: 0, max: 100, interval: 25, splitLine, axisLabel: { color: '#6b7280' } },
    series: [
      { name: '蛋白质(g)', type: 'bar', barWidth: 12, data: [65, 70, 60, 68, 72, 65, 69], itemStyle: { borderRadius: [3, 3, 0, 0] } },
      { name: '维生素(mg)', type: 'bar', barWidth: 12, data: [85, 90, 75, 88, 93, 80, 86], itemStyle: { borderRadius: [3, 3, 0, 0] } },
      { name: '脂肪(g)', type: 'bar', barWidth: 12, data: [45, 50, 48, 47, 52, 46, 49], itemStyle: { borderRadius: [3, 3, 0, 0] } }
    ]
  })
}

// 每日热量（蓝色渐变面积）
const initLineChart = () => {
  lineChart = echarts.init(lineRef.value)
  lineChart.setOption({
    grid: { left: 56, right: 20, top: 28, bottom: 36 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} kcal` },
    xAxis: { type: 'category', data: dates, boundaryGap: false, ...axisStyle },
    yAxis: { type: 'value', min: 0, max: 2000, interval: 500, splitLine, axisLabel: { color: '#6b7280' } },
    series: [{
      name: '热量(kcal)',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: [1950, 1980, 1920, 1960, 1940, 1970, 1960],
      itemStyle: { color: '#4f7cff' },
      lineStyle: { color: '#4f7cff', width: 2.5 },
      areaStyle: { color: blueArea() }
    }]
  })
}

// 体重变化（蓝：体重，青：BMI，双 Y 轴）
const initWeightChart = () => {
  if (weightChart || !weightRef.value) return
  weightChart = echarts.init(weightRef.value)
  weightChart.setOption({
    grid: { left: 52, right: 56, top: 28, bottom: 60 },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, icon: 'circle', itemWidth: 9, textStyle: { color: '#4b5563' } },
    xAxis: { type: 'category', boundaryGap: false, data: weightDates, ...axisStyle },
    yAxis: [
      { type: 'value', min: 0, max: 80, interval: 20, splitLine, axisLabel: { color: '#6b7280' } },
      { type: 'value', min: 0, max: 28, interval: 7, splitLine: { show: false }, axisLabel: { color: '#6b7280' } }
    ],
    series: [
      {
        name: '体重(kg)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
        data: weightRecords.map((r) => r.weight),
        itemStyle: { color: '#4f7cff', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { color: '#4f7cff', width: 2.5 },
        areaStyle: { color: blueArea() }
      },
      {
        name: 'BMI', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 8,
        data: weightRecords.map((r) => r.bmi),
        itemStyle: { color: '#2fd4cf', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { color: '#2fd4cf', width: 2.5 },
        areaStyle: { color: cyanArea() }
      }
    ]
  })
}

// 血糖变化（蓝色渐变面积）
const initSugarChart = () => {
  if (sugarChart || !sugarChartRef.value) return
  sugarChart = echarts.init(sugarChartRef.value)
  sugarChart.setOption({
    grid: { left: 44, right: 20, top: 28, bottom: 60 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} mmol/L` },
    legend: { bottom: 0, icon: 'circle', itemWidth: 9, textStyle: { color: '#4b5563' } },
    xAxis: { type: 'category', boundaryGap: false, data: dates, ...axisStyle },
    yAxis: { type: 'value', min: 4, max: 8, interval: 1, splitLine, axisLabel: { color: '#6b7280' } },
    series: [{
      name: '血糖(mmol/L)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
      data: sugarRecords.value.map((r) => r.sugar),
      itemStyle: { color: '#4f7cff', borderColor: '#fff', borderWidth: 2 },
      lineStyle: { color: '#4f7cff', width: 2.5 },
      areaStyle: { color: blueArea() }
    }]
  })
}

// 血压变化（蓝：收缩压，青：舒张压）
const initBpChart = () => {
  if (bpChart || !bpChartRef.value) return
  bpChart = echarts.init(bpChartRef.value)
  bpChart.setOption({
    grid: { left: 48, right: 20, top: 28, bottom: 60 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} mmHg` },
    legend: { bottom: 0, icon: 'circle', itemWidth: 9, textStyle: { color: '#4b5563' } },
    xAxis: { type: 'category', boundaryGap: false, data: dates, ...axisStyle },
    yAxis: { type: 'value', min: 60, max: 150, interval: 30, splitLine, axisLabel: { color: '#6b7280' } },
    series: [
      {
        name: '收缩压(mmHg)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
        data: sugarRecords.value.map((r) => r.systolic),
        itemStyle: { color: '#4f7cff', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { color: '#4f7cff', width: 2.5 },
        areaStyle: { color: blueArea() }
      },
      {
        name: '舒张压(mmHg)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
        data: sugarRecords.value.map((r) => r.diastolic),
        itemStyle: { color: '#2fd4cf', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { color: '#2fd4cf', width: 2.5 },
        areaStyle: { color: cyanArea() }
      }
    ]
  })
}

// 睡眠时长趋势（紫色柱状）
const initSleepChart = () => {
  if (sleepChart || !sleepChartRef.value) return
  sleepChart = echarts.init(sleepChartRef.value)
  sleepChart.setOption({
    grid: { left: 48, right: 20, top: 28, bottom: 60 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${v} 小时` },
    legend: { bottom: 0, icon: 'rect', itemWidth: 12, textStyle: { color: '#4b5563' } },
    xAxis: { type: 'category', data: dates, ...axisStyle },
    yAxis: { type: 'value', min: 0, max: 10, interval: 3, splitLine, axisLabel: { color: '#6b7280' } },
    series: [{
      name: '睡眠时长(小时)',
      type: 'bar',
      barWidth: 46,
      data: sleepRecords.map((r) => r.hours),
      itemStyle: { color: '#8b7cf6', borderRadius: [5, 5, 0, 0] }
    }]
  })
}

// 运动时长趋势（紫色平滑面积）
const initSportChart = () => {
  if (sportChart || !sportChartRef.value) return
  sportChart = echarts.init(sportChartRef.value)
  sportChart.setOption({
    grid: { left: 44, right: 16, top: 24, bottom: 36 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} 分钟` },
    xAxis: { type: 'category', boundaryGap: false, data: dates, ...axisStyle },
    yAxis: { type: 'value', min: 0, max: 60, interval: 15, splitLine, axisLabel: { color: '#6b7280' } },
    series: [{
      name: '运动时长(分钟)',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: [30, 20, 45, 40, 30, 60, 30],
      itemStyle: { color: '#8b5cf6' },
      lineStyle: { color: '#8b5cf6', width: 2.5 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
          { offset: 1, color: 'rgba(139, 92, 246, 0.03)' }
        ])
      }
    }]
  })
}

// 内容块 v-show 常驻 DOM：首次进入初始化，再次进入仅 resize
watch(activeTab, (tab) => {
  nextTick(() => {
    if (tab === 'weight') weightChart ? weightChart.resize() : initWeightChart()
    if (tab === 'sugar') {
      sugarChart ? sugarChart.resize() : initSugarChart()
      bpChart ? bpChart.resize() : initBpChart()
    }
    if (tab === 'sleep') sleepChart ? sleepChart.resize() : initSleepChart()
    if (tab === 'sport') sportChart ? sportChart.resize() : initSportChart()
  })
})

onMounted(() => {
  initBarChart()
  initLineChart()
  window.addEventListener('resize', resizeAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  ;[barChart, lineChart, weightChart, sugarChart, bpChart, sleepChart, sportChart].forEach((chart) => chart?.dispose())
})
</script>
<template>
  <div class="record-page">
    <!-- 顶部信息 -->
    <div class="record-header">
      <el-button text class="back-btn" @click="router.push('/user')">
        <el-icon><ArrowLeft /></el-icon>
        返回患者列表
      </el-button>
      <div class="title-block">
        <h1>患者健康档案</h1>
        <p>患者: {{ patient.name }} (ID: {{ patient.id }})</p>
      </div>
    </div>

    <!-- 功能标签页 -->
    <el-tabs v-model="activeTab" class="record-tabs">
      <el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key">
        <template #label>
          <span class="tab-label">
            <el-icon><component :is="tab.icon" /></el-icon>
            {{ tab.label }}
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 饮食记录 -->
    <div v-show="activeTab === 'diet'">
      <div class="panel chart-card">
        <h3 class="card-title">营养摄入趋势</h3>
        <div ref="barRef" class="chart-body"></div>
      </div>
      <div class="panel chart-card">
        <h3 class="card-title">每日热量摄入</h3>
        <div ref="lineRef" class="chart-body"></div>
      </div>
      <div class="panel photo-card">
        <div class="photo-head">
          <h3 class="card-title">
            <el-icon><PictureFilled /></el-icon>
            饮食照片记录
          </h3>
          <el-button text type="primary" @click="dialogVisible = true">
            <el-icon><View /></el-icon>
            查看详情
          </el-button>
        </div>
        <div class="photo-list">
          <div v-for="group in photoGroups.slice(0, 3)" :key="group.date" class="photo-row">
            <div class="photo-meta">
              <span class="photo-date">{{ group.date }}</span>
              <span class="photo-count">{{ group.count }} 张照片</span>
            </div>
            <div class="photo-thumbs">
              <div v-for="i in group.count" :key="i" class="photo-thumb">
                <el-icon><Picture /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 体重管理 -->
    <div v-show="activeTab === 'weight'">
      <div class="panel chart-card">
        <h3 class="card-title">体重变化趋势</h3>
        <div ref="weightRef" class="chart-body"></div>
      </div>
      <div class="panel records-card">
        <h3 class="card-title">体重记录与建议</h3>
        <div v-for="record in weightRecords" :key="record.date" class="record-item">
          <div class="record-info">
            <div class="record-line">
              <span class="record-date">{{ record.date }}</span>
              <strong class="value-blue">{{ record.weight }} kg</strong>
              <em>BMI: {{ record.bmi }}</em>
            </div>
            <p class="record-advice">{{ record.advice }}</p>
          </div>
          <el-icon class="record-edit"><Edit /></el-icon>
        </div>
      </div>
    </div>

    <!-- 血糖血压 -->
    <div v-show="activeTab === 'sugar'">
      <div class="dual-chart">
        <div class="panel chart-card">
          <h3 class="card-title">血糖变化</h3>
          <div ref="sugarChartRef" class="chart-body small"></div>
        </div>
        <div class="panel chart-card">
          <h3 class="card-title">血压变化</h3>
          <div ref="bpChartRef" class="chart-body small"></div>
        </div>
      </div>
      <div class="panel records-card">
        <h3 class="card-title">血糖血压记录与建议</h3>
        <div v-for="record in sugarRecords" :key="record.date" class="record-item">
          <div class="record-info">
            <div class="record-line">
              <span class="record-date">{{ record.date }}</span>
              <em>血糖: <strong class="value-blue">{{ record.sugar }} mmol/L</strong></em>
              <em>血压: <strong class="value-cyan">{{ record.systolic }}/{{ record.diastolic }} mmHg</strong></em>
            </div>
            <p class="record-advice">{{ record.advice }}</p>
          </div>
          <el-icon class="record-edit" @click="openAdvice(record)"><Edit /></el-icon>
        </div>
      </div>
    </div>

    <!-- 用药提醒 -->
    <div v-show="activeTab === 'medicine'">
      <div class="panel records-card">
        <h3 class="card-title">今日用药计划</h3>
        <div v-for="(record, index) in medicineRecords" :key="index" class="record-item">
          <div class="record-info">
            <div class="record-line">
              <span class="record-date">{{ record.date }}</span>
              <strong>{{ record.name }}</strong>
              <em>{{ record.dose }}</em>
              <em>{{ record.timing }}</em>
              <el-tag :type="record.taken ? 'success' : 'warning'" size="small" round>
                {{ record.taken ? '已服用' : '待服用' }}
              </el-tag>
            </div>
            <p class="record-advice">{{ record.advice }}</p>
          </div>
          <el-icon class="record-edit" @click="openAdvice(record)"><Edit /></el-icon>
        </div>
      </div>
    </div>

    <!-- 睡眠心理 -->
    <div v-show="activeTab === 'sleep'">
      <div class="panel chart-card">
        <h3 class="card-title">睡眠时长趋势</h3>
        <div ref="sleepChartRef" class="chart-body"></div>
      </div>
      <div class="panel records-card">
        <h3 class="card-title">睡眠与心理记录</h3>
        <div v-for="record in sleepRecords" :key="record.date" class="record-item">
          <div class="record-info">
            <div class="record-line">
              <span class="record-date">{{ record.date }}</span>
              <em>时长: <strong class="value-blue">{{ record.hours }}小时</strong></em>
              <em>质量: <strong :style="{ color: qualityColor[record.quality] }">{{ record.quality }}</strong></em>
              <em>心情: <strong class="value-purple">{{ record.mood }}</strong></em>
            </div>
            <p class="record-advice">{{ record.advice }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 运动处方 -->
    <div v-show="activeTab === 'sport'">
      <div class="sport-overview">
        <div class="panel chart-card">
          <h3 class="card-title">运动时长趋势</h3>
          <div ref="sportChartRef" class="chart-body overview-chart"></div>
        </div>
        <div class="panel stat-panel">
          <h3 class="card-title">完成率统计</h3>
          <div class="stat-row">
            <span>本周完成</span>
            <strong class="value-green">{{ sportStats.done }}</strong>
          </div>
          <div class="stat-row">
            <span>本周未完成</span>
            <strong class="value-orange">{{ sportStats.undone }}</strong>
          </div>
          <el-divider />
          <div class="stat-row">
            <span>完成率</span>
            <strong class="rate">{{ sportStats.rate }}</strong>
          </div>
        </div>
        <div class="panel stat-panel">
          <h3 class="card-title">最新运动记录</h3>
          <div class="latest-row"><label>日期</label><span>{{ latestSport.date }}</span></div>
          <div class="latest-row"><label>项目</label><span>{{ latestSport.project }}</span></div>
          <div class="latest-row"><label>时长</label><span>{{ latestSport.duration }}</span></div>
          <div class="latest-row">
            <label>状态</label>
            <el-tag type="success" size="small" round>
              <el-icon><CircleCheckFilled /></el-icon>{{ latestSport.done ? '已完成' : '未完成' }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="panel records-card">
        <h3 class="card-title">运动处方执行记录</h3>
        <div v-for="record in sportRecords" :key="record.date"
          class="record-item sport-item" :class="record.done ? 'done' : 'undone'">
          <div class="record-info">
            <div class="record-line">
              <span class="record-date">{{ record.date }}</span>
              <strong>{{ record.project }}</strong>
              <em>时长: <strong class="value-blue">{{ record.duration }}</strong></em>
              <em>强度: <strong class="value-purple">{{ record.intensity }}</strong></em>
              <el-tag :type="record.done ? 'success' : 'warning'" size="small" round>
                <el-icon><CircleCheckFilled v-if="record.done" /><CircleCloseFilled v-else /></el-icon>
                {{ record.done ? '已完成' : '未完成' }}
              </el-tag>
            </div>
            <p class="record-advice">{{ record.advice }}</p>
          </div>
          <el-icon class="record-edit" @click="openAdvice(record)"><Edit /></el-icon>
        </div>
      </div>
    </div>

    <!-- 其他模块占位 -->
    <el-empty v-show="!['diet', 'weight', 'sugar', 'medicine', 'sleep', 'sport'].includes(activeTab)"
      :description="`「${tabs.find((t) => t.key === activeTab)?.label || ''}」功能开发中`"
      :image-size="110" class="panel empty-panel" />

    <!-- 饮食照片历史记录 -->
    <el-dialog v-model="dialogVisible" width="560px" class="photo-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>
            <el-icon><PictureFilled /></el-icon>
            饮食照片历史记录
          </h3>
          <p>查看患者的所有饮食照片记录</p>
        </div>
      </template>
      <div class="history-scroll">
        <div v-for="group in photoGroups" :key="group.date" class="history-item">
          <div class="history-meta">
            <span class="history-date">{{ group.date }}</span>
            <span class="history-count">{{ group.count }} 张照片</span>
          </div>
          <div class="history-thumbs">
            <div v-for="i in group.count" :key="i" class="photo-thumb lg">
              <el-icon><Picture /></el-icon>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 编辑建议 -->
    <el-dialog v-model="adviceVisible" width="520px" class="advice-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>编辑建议</h3>
          <p>修改健康管理建议内容</p>
        </div>
      </template>
      <el-input v-model="adviceText" type="textarea" :rows="4" resize="none"
        placeholder="请输入建议内容" />
      <template #footer>
        <el-button size="large" @click="adviceVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="saveAdvice">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.record-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.record-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.back-btn {
  align-self: flex-start;
  font-size: 14px;
  padding: 0;
}

.title-block h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.title-block p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

/* 标签页 */
.record-tabs {
  margin-top: 18px;
}

.record-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.chart-card {
  margin-top: 22px;
  padding: 20px 22px;
}

.card-title {
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
}

.chart-body {
  width: 100%;
  height: 280px;
}

.chart-body.small {
  height: 260px;
}

/* 血糖血压双图 */
.dual-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dual-chart .chart-card {
  margin-top: 22px;
}

/* 记录列表 */
.records-card {
  margin: 22px 0 6px;
  padding: 20px 22px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  margin-bottom: 14px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.record-item:last-child {
  margin-bottom: 0;
}

.record-item:hover {
  border-color: #cfe0ff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);
}

.record-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.record-date {
  font-size: 15px;
  font-weight: 500;
}

.record-line em {
  font-style: normal;
  font-size: 14px;
  color: #4b5563;
}

.record-line strong {
  font-size: 16px;
}

.value-blue {
  color: #2563eb;
}

.value-cyan {
  color: #0ea5a0;
}

.record-advice {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.record-edit {
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s ease;
}

.record-edit:hover {
  color: #2563eb;
}

/* 运动处方 */
.sport-overview {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1fr;
  gap: 20px;
}

.sport-overview .chart-card {
  margin-top: 22px;
}

.overview-chart {
  height: 230px;
}

.stat-panel {
  margin-top: 22px;
  padding: 20px 22px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px;
  font-size: 15px;
  color: #4b5563;
}

.stat-row strong {
  font-size: 22px;
}

.stat-panel :deep(.el-divider) {
  margin: 14px 0;
}

.rate {
  color: #2563eb;
  font-size: 26px;
}

.value-green {
  color: #16a34a;
}

.value-orange {
  color: #ea580c;
}

.value-purple {
  color: #9333ea;
}

.latest-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 2px;
  font-size: 14px;
  border-bottom: 1px solid #f5f6f9;
}

.latest-row:last-child {
  border-bottom: none;
}

.latest-row label {
  color: #9ca3af;
}

.latest-row .el-tag .el-icon {
  margin-right: 2px;
}

.sport-item.done {
  background: #f0fbf4;
  border-color: #c9f0d8;
}

.sport-item.undone {
  background: #fff7ed;
  border-color: #feddb4;
}
/* 饮食照片 */
.photo-card {
  margin: 22px 0 6px;
  padding: 20px 22px;
}

.photo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.photo-head .card-title {
  margin-bottom: 16px;
}

.photo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #f1f3f7;
}

.photo-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-date {
  font-size: 14px;
  font-weight: 500;
}

.photo-count {
  font-size: 12px;
  color: #9ca3af;
}

.photo-thumbs {
  display: flex;
  gap: 10px;
}

.photo-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: #f3f5f9;
  color: #b6bdc9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.photo-thumb.lg {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

.empty-panel {
  margin-top: 22px;
  padding: 40px 0;
}

/* 弹窗 */
.dialog-heading h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
}

.dialog-heading h3 .el-icon {
  color: #2563eb;
}

.dialog-heading p {
  margin: 6px 0 0 26px;
  font-size: 13px;
  color: #9ca3af;
}

.history-scroll {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 6px;
}

.history-item {
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.history-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.history-date {
  font-size: 15px;
  font-weight: 600;
}

.history-count {
  font-size: 13px;
  color: #9ca3af;
}

@media (max-width: 1100px) {
  .sport-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 992px) {
  .dual-chart {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.photo-dialog,
.el-dialog.advice-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>