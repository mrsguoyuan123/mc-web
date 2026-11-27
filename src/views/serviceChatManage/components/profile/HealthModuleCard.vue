<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { isMissing } from '../../../../utils/index.js'

const props = defineProps({
  title: { type: String, required: true },
  // HealthSummaryModule：{ latest 可为空对象, trend 可为空数组 }，子字段名待联调，按通用结构渲染
  module: { type: Object, default: () => ({}) }
})

// 常见健康指标键名中文映射；未覆盖的键原样展示，不臆造字段
const KEY_TEXT = {
  date: '日期',
  time: '时间',
  day: '日期',
  recordDate: '记录日期',
  value: '数值',
  amount: '含量',
  unit: '单位',
  remark: '备注',
  weight: '体重',
  calories: '热量',
  heat: '热量',
  protein: '蛋白质',
  fat: '脂肪',
  carbs: '碳水',
  vitamin: '维生素',
  glucose: '血糖',
  fastingGlucose: '空腹血糖',
  systolic: '收缩压',
  diastolic: '舒张压',
  heartRate: '心率',
  steps: '步数',
  duration: '时长',
  durationMin: '时长(分)',
  rpe: '目标RPE',
  frequency: '频次',
  type: '类型',
  name: '名称',
  hgb: '血红蛋白 HGB',
  wbc: '白细胞 WBC',
  cea: 'CEA',
  ca125: 'CA-125',
  alt: 'ALT',
  ast: 'AST',
  alb: '白蛋白 ALB',
  totalBilirubin: '总胆红素',
  sleepDuration: '睡眠时长',
  sleepQuality: '睡眠质量'
}

const keyText = (key) => KEY_TEXT[key] || KEY_TEXT[String(key).toLowerCase()] || key

const latestEntries = computed(() => {
  const latest = props.module?.latest
  if (!latest || typeof latest !== 'object') return []
  return Object.entries(latest)
    .filter(([, value]) => !isMissing(value))
    .map(([key, value]) => ({ key, label: keyText(key), value }))
})

const trendPoints = computed(() =>
  Array.isArray(props.module?.trend) ? props.module.trend : []
)

// 自适应找 X 轴（日期/时间类键）与数值序列键
const chartModel = computed(() => {
  const points = trendPoints.value
  if (points.length < 2) return null
  const sample = points[0] || {}
  const xKey = Object.keys(sample).find((key) =>
    /date|time|day|日期|时间/i.test(key)
  )
  const yKeys = Object.keys(sample).filter((key) => {
    if (key === xKey) return false
    return points.every((point) => {
      const v = point[key]
      return isMissing(v) || typeof Number(v) === 'number' && !Number.isNaN(Number(v))
    })
  })
  if (!yKeys.length) return null
  return {
    xKey,
    yKeys,
    labels: points.map((point) =>
      xKey ? String(point[xKey] ?? '').slice(5, 10) : ''
    )
  }
})

const chartRef = ref(null)
let chart = null
let observer = null

const renderChart = async () => {
  await nextTick()
  const el = chartRef.value
  if (!el || !chartModel.value) {
    chart?.dispose()
    chart = null
    return
  }
  chart?.dispose()
  chart = echarts.init(el)
  const palette = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4']
  chart.setOption({
    color: palette,
    grid: { left: 40, right: 12, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      itemWidth: 12,
      itemHeight: 6,
      textStyle: { fontSize: 10, color: '#64748b' }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartModel.value.labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    series: chartModel.value.yKeys.map((key) => ({
      name: keyText(key),
      type: 'line',
      symbol: 'circle',
      symbolSize: 5,
      data: trendPoints.value.map((point) =>
        isMissing(point[key]) ? null : Number(point[key])
      )
    }))
  })
  observer?.disconnect()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(el)
}

watch(
  () => props.module,
  () => renderChart(),
  { deep: true, flush: 'post' }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})

const isEmpty = computed(
  () => !latestEntries.value.length && !trendPoints.value.length
)
</script>

<template>
  <section class="module-card">
    <h5>{{ title }}</h5>
    <el-empty v-if="isEmpty" description="暂无数据" :image-size="60" />
    <template v-else>
      <div v-if="latestEntries.length" class="latest-box">
        <div v-for="entry in latestEntries" :key="entry.key" class="latest-item">
          <span class="latest-label">{{ entry.label }}</span>
          <strong class="latest-value">{{ entry.value }}</strong>
        </div>
      </div>
      <div v-if="chartModel" ref="chartRef" class="trend-chart"></div>
      <el-empty
        v-else-if="trendPoints.length && !chartModel"
        description="趋势数据暂不支持图表展示"
        :image-size="50"
      />
    </template>
  </section>
</template>

<style scoped>
.module-card {
  padding: 16px 18px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.module-card h5 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.latest-box {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin-bottom: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.latest-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.latest-label {
  font-size: 12px;
  color: #94a3b8;
}

.latest-value {
  font-size: 14px;
  color: #1f2937;
}

.trend-chart {
  width: 100%;
  height: 220px;
}
</style>
