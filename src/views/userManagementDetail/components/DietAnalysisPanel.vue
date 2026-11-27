<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Picture } from '@element-plus/icons-vue'
import { getPatientHealthSummaryById } from '../../../api/index.js'
import { BASE_URL } from '../../../api/frontApikit.js'
import { formatTime } from '../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

// 配色与截图对齐：热量/脂肪橙、蛋白质蓝、维生素绿
const COLOR_ORANGE = '#f97316'
const COLOR_BLUE = '#4f7cff'
const COLOR_GREEN = '#10b981'

const MEAL_TYPE_TEXT = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
  MORNING: '早餐',
  NOON: '午餐',
  EVENING: '晚餐'
}

const loading = ref(false)
const latest = ref(null)
const trend = ref([])
const photoList = ref([])
const photoVisible = ref(false)
const viewerVisible = ref(false)
const viewerIndex = ref(0)

const lineRef = ref(null)
const proteinRef = ref(null)
const fatRef = ref(null)
const vitaminRef = ref(null)
const chartRefs = { line: lineRef, protein: proteinRef, fat: fatRef, vitamin: vitaminRef }
const charts = {}
const observers = []

const barConfigs = [
  { key: 'protein', title: '近7天蛋白质(g)', color: COLOR_BLUE, unit: 'g' },
  { key: 'fat', title: '近7天脂肪(g)', color: COLOR_ORANGE, unit: 'g' },
  { key: 'vitamin', title: '近7天维生素(mg)', color: COLOR_GREEN, unit: 'mg' }
]

const isEmpty = (value) => value === undefined || value === null || value === ''

// 指标值：0 正常显示 0，缺失显示 -
const metricValue = (value) => (isEmpty(value) ? '-' : value)

const mealText = (value) => MEAL_TYPE_TEXT[value] || value || ''

// 附件 url 为相对路径时拼接 VITE_API_BASE_URL，完整 http 地址原样返回
const resolveFileUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

const formatDateParam = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const shortDate = (value) => (value ? String(value).slice(5, 10) : '')

const dayText = (value) => (value ? String(value).slice(0, 10) : '')

const pick = (source, keys) => {
  for (const key of keys) {
    if (!isEmpty(source?.[key])) return source[key]
  }
  return ''
}

// 集中字段映射：swagger 未展开的子字段只允许在此处兜底
const normalizeTrendItem = (raw = {}) => ({
  date: pick(raw, ['date', 'recordDate', 'day']),
  axisDate: shortDate(pick(raw, ['date', 'recordDate', 'day'])),
  calorie: isEmpty(raw.calorie) ? null : Number(raw.calorie),
  protein: isEmpty(raw.protein) ? null : Number(raw.protein),
  fat: isEmpty(raw.fat) ? null : Number(raw.fat),
  vitamin: isEmpty(raw.vitamin) ? null : Number(raw.vitamin)
})

const normalizePhoto = (raw, fallback = {}) => {
  const url = resolveFileUrl(pick(raw, ['photoUrl', 'imageUrl', 'url']))
  if (!url) return null
  const time = pick(raw, ['createTime', 'recordTime', 'time']) || fallback.createTime || ''
  return {
    url,
    mealType: mealText(pick(raw, ['mealType']) || fallback.mealType),
    dishes: pick(raw, ['dishes', 'foodDesc', 'description']) || fallback.dishes || '',
    time,
    date: dayText(time),
    calorie: pick(raw, ['mealCalorie', 'calorie']) || fallback.mealCalorie || ''
  }
}

const normalizeDiet = (diet = {}) => {
  const latestRaw = diet.latest && Object.keys(diet.latest).length ? diet.latest : null
  let nextLatest = null
  const photos = []

  if (latestRaw) {
    const recordTime = pick(latestRaw, ['createTime', 'recordTime'])
    nextLatest = {
      recordDate: dayText(pick(latestRaw, ['recordDate', 'createTime'])),
      mealType: mealText(pick(latestRaw, ['mealType'])),
      dishes: pick(latestRaw, ['dishes', 'foodDesc']),
      createTime: recordTime,
      mealCalorie: pick(latestRaw, ['mealCalorie']),
      calorie: pick(latestRaw, ['calorie', 'mealCalorie']),
      protein: pick(latestRaw, ['protein']),
      fat: pick(latestRaw, ['fat']),
      vitamin: pick(latestRaw, ['vitamin']),
      photoUrl: resolveFileUrl(pick(latestRaw, ['photoUrl', 'imageUrl']))
    }

    const latestPhotos = Array.isArray(latestRaw.photos)
      ? latestRaw.photos
      : Array.isArray(latestRaw.photoUrls)
        ? latestRaw.photoUrls
        : []
    latestPhotos.forEach((item) => {
      const photo = typeof item === 'string' ? normalizePhoto({ photoUrl: item }, latestRaw) : normalizePhoto(item, latestRaw)
      if (photo) photos.push(photo)
    })
    if (!photos.length) {
      const photo = normalizePhoto(latestRaw, latestRaw)
      if (photo) photos.push(photo)
    }
  }

  const nextTrend = (Array.isArray(diet.trend) ? diet.trend : []).map(normalizeTrendItem)

  // 趋势中附带照片的记录一并收入照片墙（按时间倒序）
  ;(Array.isArray(diet.trend) ? diet.trend : []).forEach((item) => {
    const itemPhotos = Array.isArray(item.photos) ? item.photos : []
    itemPhotos.forEach((photoItem) => {
      const photo = normalizePhoto(photoItem, item)
      if (photo) photos.push(photo)
    })
    if (!itemPhotos.length) {
      const photo = normalizePhoto(item, item)
      if (photo) photos.push(photo)
    }
  })

  // latest 与 trend 可能包含同一照片，按 url 去重后按时间倒序
  const uniquePhotos = Array.from(new Map(photos.map((photo) => [photo.url, photo])).values())
  uniquePhotos.sort((a, b) => (a.time < b.time ? 1 : -1))
  return { latest: nextLatest, trend: nextTrend, photos: uniquePhotos }
}

const metricCards = computed(() => {
  if (!latest.value) return []
  return [
    { label: '热量', value: metricValue(latest.value.calorie), unit: 'kcal', color: COLOR_ORANGE },
    { label: '蛋白质', value: metricValue(latest.value.protein), unit: 'g', color: COLOR_BLUE },
    { label: '脂肪', value: metricValue(latest.value.fat), unit: 'g', color: COLOR_ORANGE },
    { label: '维生素', value: metricValue(latest.value.vitamin), unit: 'mg', color: COLOR_GREEN }
  ]
})

const photoGroups = computed(() => {
  const map = new Map()
  photoList.value.forEach((photo) => {
    const key = photo.date || '未标注日期'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(photo)
  })
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
})

const viewerUrls = computed(() => photoList.value.map((item) => item.url))

const buildWindow = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return { from: formatDateParam(from), to: formatDateParam(to) }
}

const fetchSummary = async () => {
  if (!props.patientId) {
    latest.value = null
    trend.value = []
    photoList.value = []
    return
  }
  loading.value = true
  try {
    const { from, to } = buildWindow()
    const summary = await getPatientHealthSummaryById(String(props.patientId), { from, to })
    const normalized = normalizeDiet(summary?.diet || {})
    latest.value = normalized.latest
    trend.value = normalized.trend
    photoList.value = normalized.photos
  } catch {
    latest.value = null
    trend.value = []
    photoList.value = []
  } finally {
    loading.value = false
    await nextTick()
    renderCharts()
  }
}

const axisLabelStyle = { color: '#6b7280' }
const splitLine = { lineStyle: { type: 'dashed', color: '#eef0f4' } }

const renderLineChart = () => {
  const el = chartRefs.line.value
  if (!el || !trend.value.length) return
  charts.line?.dispose()
  charts.line = echarts.init(el)
  charts.line.setOption({
    grid: { left: 54, right: 22, top: 26, bottom: 34 },
    tooltip: { trigger: 'axis', valueFormatter: (value) => `${value ?? '-'} kcal` },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.value.map((item) => item.axisDate),
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisTick: { show: false },
      axisLabel: axisLabelStyle
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine,
      axisLabel: axisLabelStyle
    },
    series: [
      {
        name: '热量(kcal)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        data: trend.value.map((item) => item.calorie),
        itemStyle: { color: COLOR_ORANGE },
        lineStyle: { color: COLOR_ORANGE, width: 2.5 }
      }
    ]
  })
}

const renderBarChart = (key, color, unit) => {
  const el = chartRefs[key].value
  if (!el || !trend.value.length) return
  charts[key]?.dispose()
  charts[key] = echarts.init(el)
  charts[key].setOption({
    grid: { left: 46, right: 14, top: 22, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${value ?? '-'} ${unit}`
    },
    xAxis: {
      type: 'category',
      data: trend.value.map((item) => item.axisDate),
      axisLine: { lineStyle: { color: '#d1d5db' } },
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
        type: 'bar',
        barWidth: 16,
        data: trend.value.map((item) => item[key]),
        itemStyle: { color, borderRadius: [4, 4, 0, 0] }
      }
    ]
  })
}

const renderCharts = () => {
  if (!trend.value.length) {
    Object.values(charts).forEach((chart) => chart?.dispose())
    Object.keys(charts).forEach((key) => delete charts[key])
    return
  }
  renderLineChart()
  barConfigs.forEach((config) => renderBarChart(config.key, config.color, config.unit))
  // 数据返回后图表容器才渲染，此时重挂 ResizeObserver，兼容 Tab 隐藏/显示的尺寸变化
  observers.splice(0).forEach((observer) => observer.disconnect())
  Object.keys(chartRefs).forEach(observeChart)
}

const observeChart = (key) => {
  const el = chartRefs[key].value
  if (!el) return
  const observer = new ResizeObserver(() => charts[key]?.resize())
  observer.observe(el)
  observers.push(observer)
}

const openPhoto = (index) => {
  viewerIndex.value = index
  viewerVisible.value = true
}

watch(
  () => props.patientId,
  () => fetchSummary()
)

onMounted(() => {
  fetchSummary()
})

onBeforeUnmount(() => {
  observers.forEach((observer) => observer.disconnect())
  Object.values(charts).forEach((chart) => chart?.dispose())
})
</script>

<template>
  <div v-loading="loading" class="diet-panel">
    <!-- 最近一次饮食记录 -->
    <section class="panel-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">最近一次饮食记录</h2>
          <p class="card-sub">记录日期：{{ latest?.recordDate || '-' }}</p>
        </div>
        <el-button :icon="Picture" :disabled="!photoList.length" @click="photoVisible = true">
          查看饮食照片
        </el-button>
      </div>

      <el-empty v-if="!loading && !latest" description="暂无饮食记录" :image-size="90" />

      <template v-else-if="latest">
        <div v-if="latest.photoUrl" class="meal-hero" :style="{ backgroundImage: `url(${latest.photoUrl})` }">
          <span v-if="latest.mealType" class="meal-tag">{{ latest.mealType }}</span>
          <div class="hero-mask">
            <div class="hero-dishes">{{ latest.dishes || '-' }}</div>
            <div class="hero-time">{{ formatTime(latest.createTime) }}</div>
          </div>
          <div v-if="!isEmpty(latest.mealCalorie)" class="hero-calorie">
            {{ latest.mealCalorie }}<small>kcal</small>
          </div>
        </div>
        <div v-else class="meal-hero meal-hero--empty">
          <el-icon><Picture /></el-icon>
          <span>暂无饮食照片</span>
        </div>

        <div class="metric-grid">
          <div v-for="metric in metricCards" :key="metric.label" class="metric-block">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value" :style="{ color: metric.color }">
              {{ metric.value }} <small>{{ metric.unit }}</small>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- 近 7 天热量趋势 -->
    <section class="panel-card">
      <h2 class="card-title">近7天热量趋势</h2>
      <el-empty v-if="!loading && !trend.length" description="暂无热量趋势数据" :image-size="80" />
      <div v-else ref="lineRef" class="chart chart-line"></div>
    </section>

    <!-- 近 7 天营养素柱状图 -->
    <div class="bar-grid">
      <section v-for="config in barConfigs" :key="config.key" class="panel-card">
        <h2 class="card-title">{{ config.title }}</h2>
        <el-empty v-if="!loading && !trend.length" description="暂无数据" :image-size="70" />
        <div v-else :ref="(el) => (chartRefs[config.key].value = el)" class="chart chart-bar"></div>
      </section>
    </div>

    <!-- 饮食照片记录弹窗 -->
    <el-dialog
      v-model="photoVisible"
      title="饮食照片记录"
      width="640px"
      append-to-body
      destroy-on-close
    >
      <p class="dialog-sub">按时间倒序展示，共 {{ photoList.length }} 张</p>
      <el-empty v-if="!photoList.length" description="暂无饮食照片" :image-size="80" />
      <div v-else class="photo-groups">
        <div v-for="group in photoGroups" :key="group.date" class="photo-group">
          <div class="date-divider">{{ group.date }}</div>
          <div class="photo-grid">
            <div
              v-for="(photo, index) in group.items"
              :key="`${group.date}-${index}`"
              class="photo-card"
              :style="{ backgroundImage: `url(${photo.url})` }"
              @click="openPhoto(photoList.findIndex((item) => item.url === photo.url))"
            >
              <span v-if="photo.mealType" class="meal-tag">{{ photo.mealType }}</span>
              <div class="photo-mask">
                <div class="photo-dishes">{{ photo.dishes || '-' }}</div>
                <div class="photo-bottom">
                  <span>{{ photo.time ? formatTime(photo.time) : '-' }}</span>
                  <span v-if="photo.calorie" class="photo-calorie">{{ photo.calorie }} kcal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 大图预览 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="viewerUrls"
      :initial-index="viewerIndex"
      hide-on-click-modal
      teleported
      @close="viewerVisible = false"
    />
  </div>
</template>

<style scoped>
.diet-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.card-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

/* 最近一餐照片 */
.meal-hero {
  position: relative;
  height: 200px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.meal-hero--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 13px;
}

.meal-hero--empty .el-icon {
  font-size: 30px;
}

.meal-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f97316;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.hero-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 26px 14px 12px;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0) 0%, rgba(17, 24, 39, 0.72) 100%);
  color: #fff;
}

.hero-dishes {
  font-size: 14px;
  font-weight: 600;
}

.hero-time {
  margin-top: 4px;
  font-size: 12px;
  color: #e5e7eb;
}

.hero-calorie {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 2;
  color: #f97316;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(17, 24, 39, 0.6);
}

.hero-calorie small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 400;
  color: #fed7aa;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.metric-block {
  padding: 14px 10px;
  border-radius: 10px;
  background: #f9fafb;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #9ca3af;
}

.metric-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 700;
}

.metric-value small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 400;
}

/* 图表 */
.chart {
  width: 100%;
}

.chart-line {
  height: 280px;
}

.chart-bar {
  height: 240px;
}

.bar-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

/* 照片弹窗 */
.dialog-sub {
  margin: 0 0 14px;
  font-size: 13px;
  color: #9ca3af;
}

.date-divider {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.photo-group + .photo-group {
  margin-top: 16px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.photo-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  cursor: pointer;
}

.photo-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 10px 8px;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0) 0%, rgba(17, 24, 39, 0.72) 100%);
  color: #fff;
  font-size: 12px;
}

.photo-dishes {
  font-weight: 600;
  margin-bottom: 4px;
}

.photo-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: #e5e7eb;
}

.photo-calorie {
  color: #f97316;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bar-grid {
    grid-template-columns: 1fr;
  }
}
</style>
