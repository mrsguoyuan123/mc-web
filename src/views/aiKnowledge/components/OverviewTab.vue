<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import {
  getKbOverview,
  getKbUnresolvedPage,
  getKbVersions,
  getKbHitTrend
} from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing } from '@/utils/index.js'

const emit = defineEmits(['go-unresolved'])

const overview = ref(null)
const unresolvedList = ref([])
const versions = ref([])
const trendData = ref([])
const trendEmpty = ref(true)

const totalText = computed(() =>
  isMissing(overview.value?.total)
    ? MISSING_TEXT
    : Number(overview.value.total).toLocaleString()
)

// 0~1 的小数自动 ×100，其余按 0~100 拼百分号
const toPercent = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return MISSING_TEXT
  const percent = Math.abs(num) <= 1 ? num * 100 : num
  return `${Math.round(percent * 10) / 10}%`
}

const rateText = computed(() =>
  isMissing(overview.value?.hitRate30d) ? MISSING_TEXT : toPercent(overview.value.hitRate30d)
)

// G2：环比字段缺失时整行隐藏，不写死数据
const deltaVisible = computed(() => !isMissing(overview.value?.hitRateDelta))
const deltaText = computed(() => {
  const num = Number(overview.value.hitRateDelta)
  if (Number.isNaN(num)) return MISSING_TEXT
  const percent = Math.abs(num) <= 1 ? num * 100 : num
  const rounded = Math.round(percent * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
})

const pendingText = computed(() =>
  isMissing(overview.value?.unresolvedPending)
    ? MISSING_TEXT
    : Number(overview.value.unresolvedPending).toLocaleString()
)

const fetchUnresolved = async () => {
  try {
    const res = await getKbUnresolvedPage({ status: 'PENDING', page: 1, pageSize: 3 })
    unresolvedList.value = Array.isArray(res) ? res : (res?.list || [])
  } catch {
    unresolvedList.value = []
  }
}

const goUnresolved = (id) => {
  emit('go-unresolved', id === '' ? '' : String(id))
}

const fetchVersions = async () => {
  try {
    const res = await getKbVersions()
    versions.value = Array.isArray(res) ? res : []
  } catch {
    versions.value = []
  }
}

// 当前版本：PUBLISHED 且 publishedAt 最新的一条，保证只有一个绿标
const currentVersionId = computed(() => {
  const published = versions.value
    .filter((item) => item.status === 'PUBLISHED' && !isMissing(item.publishedAt))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  return published.length ? String(published[0].id) : ''
})

const displayVersions = computed(() => versions.value.slice(0, 3))

const versionTime = (row) => {
  const time = !isMissing(row.publishedAt) ? row.publishedAt : row.trainedAt
  return formatTime(time)
}

const versionQaText = (row) =>
  isMissing(row.qaCount) ? MISSING_TEXT : Number(row.qaCount).toLocaleString()

/* ---------------- 近 7 天命中趋势（G1 占位） ---------------- */

const trendChartRef = ref()
let trendChart = null
let trendObserver = null

const renderTrend = () => {
  if (!trendChartRef.value || !trendData.value.length) return
  trendChart?.dispose()
  trendObserver?.disconnect()
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    grid: { left: 44, right: 20, top: 28, bottom: 44 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      bottom: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#6b7280', fontSize: 12 }
    },
    xAxis: {
      type: 'category',
      data: trendData.value.map((item) => String(item.date).slice(5)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [
      {
        name: '命中',
        type: 'bar',
        data: trendData.value.map((item) => Number(item.hit) || 0),
        itemStyle: { color: '#16a34a', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 22
      },
      {
        name: '未命中',
        type: 'bar',
        data: trendData.value.map((item) => Number(item.miss) || 0),
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 22
      }
    ]
  })
  trendObserver = new ResizeObserver(() => trendChart?.resize())
  trendObserver.observe(trendChartRef.value)
}

const fetchTrend = async () => {
  try {
    const res = await getKbHitTrend({ days: 7 })
    const list = Array.isArray(res) ? res : (res?.list || [])
    trendData.value = list.filter((item) => item && !isMissing(item.date))
    trendEmpty.value = trendData.value.length === 0
    if (!trendEmpty.value) {
      await nextTick()
      renderTrend()
    }
  } catch {
    // 接口失败时只展示灰底空态 + 红色缺失文案，不画假柱
    trendData.value = []
    trendEmpty.value = true
  }
}

const fetchOverview = async () => {
  try {
    overview.value = await getKbOverview()
  } catch {
    overview.value = null
  }
}

onMounted(() => {
  fetchOverview()
  fetchUnresolved()
  fetchVersions()
  fetchTrend()
})

onBeforeUnmount(() => {
  trendObserver?.disconnect()
  trendChart?.dispose()
  trendChart = null
  trendObserver = null
})
</script>

<template>
  <div class="overview-tab">
    <!-- 三张统计卡 -->
    <div class="stat-grid">
      <div class="panel stat-card">
        <div class="stat-head">
          <span class="stat-label">知识条目总数</span>
          <el-icon class="stat-icon is-blue"><Files /></el-icon>
        </div>
        <div class="stat-num" :class="{ missing: isMissing(overview?.total) }">{{ totalText }}</div>
        <div class="stat-sub">
          已发布
          <span :class="{ missing: isMissing(overview?.published) }">
            {{ isMissing(overview?.published) ? MISSING_TEXT : overview.published }}
          </span>
          · 草稿
          <span :class="{ missing: isMissing(overview?.draft) }">
            {{ isMissing(overview?.draft) ? MISSING_TEXT : overview.draft }}
          </span>
        </div>
      </div>

      <div class="panel stat-card">
        <div class="stat-head">
          <span class="stat-label">近 30 天命中率</span>
          <el-icon class="stat-icon is-green"><TrendCharts /></el-icon>
        </div>
        <div
          class="stat-num is-green-text"
          :class="{ missing: isMissing(overview?.hitRate30d) }"
        >
          {{ rateText }}
        </div>
        <div v-if="deltaVisible" class="stat-sub">较上周 {{ deltaText }}</div>
      </div>

      <div class="panel stat-card stat-card--warn" @click="goUnresolved('')">
        <div class="stat-head">
          <span class="stat-label">待处理未解决问题</span>
          <el-icon class="stat-icon is-orange"><QuestionFilled /></el-icon>
        </div>
        <div
          class="stat-num is-orange-text"
          :class="{ missing: isMissing(overview?.unresolvedPending) }"
        >
          {{ pendingText }}
        </div>
        <div class="stat-link">前往处理 →</div>
      </div>
    </div>

    <!-- 近 7 天命中趋势 -->
    <div class="panel trend-panel">
      <div class="section-head">
        <h3>近 7 天命中趋势</h3>
        <p>智能客服回答命中与未命中问题数量（单位：条）</p>
      </div>
      <div v-show="!trendEmpty" ref="trendChartRef" class="trend-chart"></div>
      <div v-if="trendEmpty" class="trend-empty">
        <span class="missing">{{ MISSING_TEXT }}</span>
      </div>
    </div>

    <!-- 最新未解决问题 / 发布状态 -->
    <div class="bottom-grid">
      <div class="panel bottom-panel">
        <div class="section-head">
          <h3>最新未解决问题</h3>
          <p>来自小程序用户，等待你转成标准问答</p>
        </div>

        <div v-for="row in unresolvedList" :key="row.id" class="issue-row">
          <div class="issue-main">
            <div class="issue-question">{{ row.question || MISSING_TEXT }}</div>
            <div class="issue-meta">
              <span :class="{ missing: isMissing(row.sourceDepartment) }">
                {{ isMissing(row.sourceDepartment) ? MISSING_TEXT : row.sourceDepartment }}
              </span>
              <span>· {{ formatTime(row.occurredAt) }}</span>
            </div>
          </div>
          <el-button class="dark-btn" size="small" @click="goUnresolved(row.id)">处理</el-button>
        </div>
        <el-empty v-if="!unresolvedList.length" description="暂无未解决问题" :image-size="80" />
      </div>

      <div class="panel bottom-panel">
        <div class="section-head">
          <h3>发布状态</h3>
          <p>当前智能客服使用的知识版本</p>
        </div>

        <div v-for="row in displayVersions" :key="row.id" class="version-row">
          <div class="version-icon">
            <el-icon><Promotion /></el-icon>
          </div>
          <div class="version-main">
            <div class="version-title">
              {{ row.version || MISSING_TEXT }} · {{ versionQaText(row) }} 条知识
            </div>
            <div class="version-time">{{ versionTime(row) }}</div>
          </div>
          <span
            class="version-tag"
            :class="String(row.id) === currentVersionId ? 'is-current' : 'is-history'"
          >
            {{ String(row.id) === currentVersionId ? '当前版本' : '历史版本' }}
          </span>
        </div>
        <el-empty v-if="!displayVersions.length" description="暂无发布版本" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  margin-bottom: 0;
  padding: 22px 24px;
}

.stat-card--warn {
  background: #fff7ed;
  border-color: #fed7aa;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.stat-card--warn:hover {
  box-shadow: 0 8px 22px rgba(234, 88, 12, 0.12);
}

.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 14px;
  color: #4b5563;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
  padding: 9px;
  box-sizing: border-box;
}

.stat-icon.is-blue {
  color: #2563eb;
  background: #eff6ff;
}

.stat-icon.is-green {
  color: #16a34a;
  background: #f0fdf4;
}

.stat-icon.is-orange {
  color: #ea580c;
  background: #ffedd5;
}

.stat-num {
  margin-top: 14px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  color: #111827;
}

.stat-num.is-green-text {
  color: #16a34a;
}

.stat-num.is-orange-text {
  color: #ea580c;
}

.stat-sub {
  margin-top: 10px;
  font-size: 13px;
  color: #9ca3af;
}

.stat-link {
  margin-top: 10px;
  font-size: 13px;
  color: #2563eb;
}

.missing {
  color: #f56c6c;
}

.trend-panel {
  margin-top: 18px;
}

.section-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.section-head p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.trend-chart {
  width: 100%;
  height: 300px;
}

.trend-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 14px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.bottom-panel {
  margin-bottom: 0;
}

.issue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  margin-bottom: 12px;
}

.issue-question {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.issue-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.dark-btn {
  flex-shrink: 0;
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.dark-btn:hover {
  background: #374151;
  border-color: #374151;
  color: #fff;
}

.version-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  margin-bottom: 12px;
}

.version-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  flex-shrink: 0;
}

.version-main {
  flex: 1;
  min-width: 0;
}

.version-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.version-time {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.version-tag {
  flex-shrink: 0;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.version-tag.is-current {
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.version-tag.is-history {
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

@media (max-width: 992px) {
  .stat-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
