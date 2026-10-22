<script setup>
import { computed, reactive, ref } from 'vue'

const stats = [
  { label: '总金额', value: '¥18.6M', description: '同比增长 +198.3%', icon: 'Money', color: '#2563eb' },
  { label: '总记录数', value: '1,756', description: '覆盖 6 个省份', icon: 'Tickets', color: '#10b981' },
  
  { label: '平均金额', value: '¥10,621', description: '每条记录平均值', icon: 'TrendCharts', color: '#8b5cf6' }
]

const provinceStats = [
  { name: '北京', value: 285000 },
  { name: '上海', value: 310000 },
  { name: '广东', value: 420000 },
  { name: '浙江', value: 298000 },
  { name: '江苏', value: 345000 },
  { name: '四川', value: 210000 }
]

const diseaseStats = [
  { name: '内科', value: 4200, color: '#1962ec' },
  { name: '外科', value: 3100, color: '#90bbff' },
  { name: '妇科', value: 2800, color: '#1bcb8b' },
  { name: '儿科', value: 3500, color: '#85f9f9' },
  { name: '骨科', value: 2200, color: '#fecb4b' },
  { name: '神经科', value: 1400, color: '#ff5d5e' }
]

const hospitalStats = [
  { name: '三甲医院', value: 8600 },
  { name: '二甲医院', value: 5200 },
  { name: '专科医院', value: 3800 }
]
const hospitalMax = Math.max(...hospitalStats.map((h) => h.value))

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const amountData = [560000, 590000, 635000, 680000, 705000, 735000, 760000, 790000, 815000, 845000, 875000, 890000]
const recordData = [90, 115, 130, 145, 165, 185, 205, 225, 245, 270, 305, 340]

const totalDisease = diseaseStats.reduce((sum, item) => sum + item.value, 0)

// 圆角分段圆环
const DONUT_R = 90
const DONUT_C = 2 * Math.PI * DONUT_R
const donutSegments = computed(() => {
  let start = 0
  return diseaseStats.map((item) => {
    const frac = item.value / totalDisease
    const len = frac * DONUT_C
    const dashLen = Math.max(len - 34, 3)
    const seg = {
      ...item,
      percent: (frac * 100).toFixed(1),
      dasharray: `${dashLen} ${DONUT_C - dashLen}`,
      dashoffset: DONUT_C - (start + 17)
    }
    start += len
    return seg
  })
})

// 图表 tooltip
const tip = reactive({ show: false, x: 0, y: 0, title: '', rows: [] })
const moveTip = (e) => {
  tip.x = e.clientX + 14
  tip.y = e.clientY + 14
}
const showTip = (e, title, rows) => {
  tip.title = title
  tip.rows = rows
  tip.show = true
  moveTip(e)
}
const hideTip = () => {
  tip.show = false
}

const chart = {
  width: 900,
  height: 300,
  left: 58,
  right: 58,
  top: 24,
  bottom: 42
}

const chartWidth = chart.width - chart.left - chart.right
const chartHeight = chart.height - chart.top - chart.bottom

const xPosition = (index) => chart.left + (index * chartWidth) / (months.length - 1)
const amountY = (value) => chart.top + (1 - value / 900000) * chartHeight
const recordY = (value) => chart.top + (1 - value / 340) * chartHeight

const toPoints = (data, mapper) =>
  data.map((value, index) => `${xPosition(index)},${mapper(value)}`).join(' ')

const amountPoints = computed(() => toPoints(amountData, amountY))
const recordPoints = computed(() => toPoints(recordData, recordY))

// 折线下方渐变面积
const toAreaPoints = (data, mapper) => {
  const bottom = chart.top + chartHeight
  return `${toPoints(data, mapper)} ${xPosition(data.length - 1)},${bottom} ${xPosition(0)},${bottom}`
}
const amountAreaPoints = computed(() => toAreaPoints(amountData, amountY))
const recordAreaPoints = computed(() => toAreaPoints(recordData, recordY))

// 折线图按月悬浮热区
const hoverIndex = ref(null)
const monthSlot = chartWidth / (months.length - 1)
const hoverZone = (index) => ({
  x: xPosition(index) - monthSlot / 2,
  width: monthSlot
})
const amountGrid = [0, 180000, 360000, 540000, 720000, 900000]
const recordGrid = [0, 85, 170, 255, 340]
</script>

<template>
  <div class="dashboard-page">
    <div class="page-heading">
      <h1>系统管理 - 数据可视化</h1>
      <p>医疗数据统计分析与趋势展示</p>
    </div>
    <section class="stats-grid">
      <el-card v-for="item in stats" :key="item.label" shadow="never" class="stat-card">
        <div class="stat-content">
          <div>
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
            <span>{{ item.description }}</span>
          </div>
          <div class="stat-icon" :style="{ background: item.color }">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
        </div>
      </el-card>
    </section>

    <section class="chart-grid two-columns">
      <el-card shadow="never" class="chart-card">
        <template #header>
          <div class="card-title">
            <h2>省份金额分布</h2>
            <p>各省份医疗总金额统计</p>
          </div>
        </template>
        <div class="bar-chart">
          <div class="bar-y-axis">
            <span v-for="label in [500000, 400000, 300000, 200000, 100000, 0]" :key="label">
              {{ label / 10000 }}万
            </span>
          </div>
          <div class="bar-plot">
            <div v-for="item in provinceStats" :key="item.name" class="bar-item">
              <div class="bar-track">
                <div
                  class="bar"
                  :style="{ height: `${(item.value / 500000) * 100}%` }"
                  @mouseenter="showTip($event, item.name + ' · 医疗总金额', [{ label: '总金额', value: '¥' + item.value.toLocaleString(), color: '#2f70f2' }])"
                  @mousemove="moveTip"
                  @mouseleave="hideTip"
                ></div>
              </div>
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
        <div class="chart-legend"><i class="blue"></i>总金额</div>
      </el-card>

      <el-card shadow="never" class="chart-card">
        <template #header>
          <div class="card-title">
            <h2>疾病分类占比</h2>
            <p>各疾病类型患者数量分布</p>
          </div>
        </template>
        <div class="pie-layout">
          <svg class="donut" viewBox="0 0 220 220">
            <g transform="rotate(-90 110 110)">
              <circle
                v-for="seg in donutSegments"
                :key="seg.name"
                class="donut-seg"
                cx="110"
                cy="110"
                :r="DONUT_R"
                fill="none"
                :stroke="seg.color"
                stroke-width="30"
                stroke-linecap="round"
                :stroke-dasharray="seg.dasharray"
                :stroke-dashoffset="seg.dashoffset"
                @mouseenter="showTip($event, seg.name + ' · 患者数量', [
                  { label: '人数', value: seg.value.toLocaleString() + ' 人', color: seg.color },
                  { label: '占比', value: seg.percent + '%', color: seg.color }
                ])"
                @mousemove="moveTip"
                @mouseleave="hideTip"
              />
            </g>
          </svg>
          <div class="pie-legend">
            <div
              v-for="seg in donutSegments"
              :key="seg.name"
              @mouseenter="showTip($event, seg.name + ' · 患者数量', [
                { label: '人数', value: seg.value.toLocaleString() + ' 人', color: seg.color },
                { label: '占比', value: seg.percent + '%', color: seg.color }
              ])"
              @mousemove="moveTip"
              @mouseleave="hideTip"
            >
              <i :style="{ background: seg.color }"></i>
              <span>{{ seg.name }}</span>
              <strong>{{ seg.value.toLocaleString() }}人</strong>
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <section class="chart-grid trend-row">
    <el-card shadow="never" class="chart-card trend-card">
      <template #header>
        <div class="card-title">
          <h2>月份增长趋势</h2>
          <p>全年医疗金额与记录数量变化趋势</p>
        </div>
      </template>
      <div class="line-chart">
        <svg :viewBox="`0 0 ${chart.width} ${chart.height}`">
          <defs>
            <linearGradient id="amountLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="100%" stop-color="#1962ec" />
            </linearGradient>
            <linearGradient id="recordLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#85f9f9" />
              <stop offset="100%" stop-color="#06b6d4" />
            </linearGradient>
            <linearGradient id="amountArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="recordArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line
            v-for="value in amountGrid"
            :key="`grid-${value}`"
            :x1="chart.left"
            :x2="chart.width - chart.right"
            :y1="amountY(value)"
            :y2="amountY(value)"
            class="grid-line"
          />
          <text
            v-for="value in amountGrid"
            :key="`amount-label-${value}`"
            class="axis-label"
            :x="chart.left - 10"
            :y="amountY(value) + 4"
            text-anchor="end"
          >
            {{ value === 0 ? '0' : `${value / 10000}万` }}
          </text>
          <text
            v-for="value in recordGrid"
            :key="`record-label-${value}`"
            class="axis-label right-label"
            :x="chart.width - chart.right + 10"
            :y="recordY(value) + 4"
          >
            {{ value }}
          </text>
          <text
            v-for="(month, index) in months"
            :key="month"
            class="axis-label"
            :x="xPosition(index)"
            y="285"
            text-anchor="middle"
          >
            {{ month }}
          </text>
          <polygon :points="amountAreaPoints" fill="url(#amountArea)" />
          <polygon :points="recordAreaPoints" fill="url(#recordArea)" />
          <polyline :points="amountPoints" class="amount-line" />
          <polyline :points="recordPoints" class="record-line" />
          <circle
            v-for="(value, index) in amountData"
            :key="`amount-point-${index}`"
            :cx="xPosition(index)"
            :cy="amountY(value)"
            r="4"
            class="amount-dot"
          />
          <circle
            v-for="(value, index) in recordData"
            :key="`record-point-${index}`"
            :cx="xPosition(index)"
            :cy="recordY(value)"
            r="4"
            class="record-dot"
          />
          <circle
            v-for="(value, index) in amountData"
            v-show="hoverIndex === index"
            :key="`amount-halo-${index}`"
            :cx="xPosition(index)"
            :cy="amountY(value)"
            r="6.5"
            fill="#1962ec"
            stroke="#fff"
            stroke-width="2"
          />
          <circle
            v-for="(value, index) in recordData"
            v-show="hoverIndex === index"
            :key="`record-halo-${index}`"
            :cx="xPosition(index)"
            :cy="recordY(value)"
            r="6.5"
            fill="#06b6d4"
            stroke="#fff"
            stroke-width="2"
          />
          <rect
            v-for="(month, index) in months"
            :key="`hover-zone-${month}`"
            class="hover-zone"
            :x="hoverZone(index).x"
            :y="chart.top"
            :width="hoverZone(index).width"
            :height="chartHeight"
            fill="transparent"
            @mouseenter="hoverIndex = index; showTip($event, `${month} · 增长趋势`, [
              { label: '总金额', value: `¥${(amountData[index] / 10000).toFixed(1)}万`, color: '#1962ec' },
              { label: '记录数', value: `${recordData[index]} 条`, color: '#06b6d4' }
            ])"
            @mousemove="moveTip"
            @mouseleave="hoverIndex = null; hideTip()"
          />
        </svg>
        <div class="trend-legend">
          <span><i class="amount-dot-example"></i>总金额</span>
          <span><i class="record-dot-example"></i>记录数</span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="chart-card hospital-card">
      <template #header>
        <div class="card-title">
          <h2>医院分类统计</h2>
          <p>不同等级医院的记录数量</p>
        </div>
      </template>
      <div class="hospital-chart">
        <div v-for="item in hospitalStats" :key="item.name" class="hospital-row">
          <span class="hospital-name">{{ item.name }}</span>
          <div class="hospital-track">
            <div
              class="hbar"
              :style="{ width: `${(item.value / hospitalMax) * 100}%` }"
              @mouseenter="showTip($event, item.name + ' · 记录数量', [{ label: '记录数', value: item.value.toLocaleString() + ' 条', color: '#053bff' }])"
              @mousemove="moveTip"
              @mouseleave="hideTip"
            ></div>
          </div>
          <strong>{{ item.value.toLocaleString() }}</strong>
        </div>
      </div>
    </el-card>
    </section>

    <div v-if="tip.show" class="chart-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <strong>{{ tip.title }}</strong>
      <p v-for="(row, i) in tip.rows" :key="i">
        <i :style="{ background: row.color }"></i>{{ row.label }}：<b>{{ row.value }}</b>
      </p>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
}

.page-heading h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
}

.page-heading p {
  margin: 0;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  border: 0;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-content p {
  margin: 0 0 10px;
  color: #4b5563;
}

.stat-content strong {
  display: block;
  font-size: 28px;
  color: #111827;
  margin-bottom: 8px;
}

.stat-content span {
  color: #6b7280;
  font-size: 13px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 21px;
}

.chart-grid {
  display: grid;
  gap: 20px;
}

.trend-row {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: stretch;
}

.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-card {
  border: 0;
  border-radius: 12px;
}

.card-title h2 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #111827;
}

.card-title p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.bar-chart {
  height: 320px;
  display: flex;
}

.bar-y-axis {
  width: 46px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: right;
  color: #6b7280;
  font-size: 12px;
  padding-right: 10px;
}

.bar-plot {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  align-items: end;
  gap: 18px;
  border-left: 1px solid #d7dce5;
  border-bottom: 1px solid #d7dce5;
  background-image: repeating-linear-gradient(
    to top,
    transparent 0,
    transparent calc(20% - 1px),
    #e5e7eb calc(20% - 1px),
    #e5e7eb 20%
  );
  padding: 12px 10px 0;
}

.bar-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.bar-track {
  width: 100%;
  max-width: 42px;
  height: 235px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  min-height: 20px;
  border-radius: 0;
  background: linear-gradient(180deg, #4f8dff, #2f70f2);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.bar:hover {
  opacity: 0.85;
}

.bar-item span {
  color: #4b5563;
  white-space: nowrap;
}

.chart-legend,
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  color: #4b5563;
  margin-top: 10px;
}

.chart-legend i,
.trend-legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 5px;
}

.chart-legend .blue,
.amount-dot-example {
  background: linear-gradient(135deg, #60a5fa, #1962ec);
}

.record-dot-example {
  background: linear-gradient(135deg, #85f9f9, #06b6d4);
}

.pie-layout {
  min-height: 300px;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: center;
}

.donut {
  width: 230px;
  height: 230px;
  margin: 0 auto;
  overflow: visible;
}

.donut-seg {
  cursor: pointer;
  transition: opacity 0.2s ease, stroke-width 0.2s ease;
}

.donut-seg:hover {
  opacity: 0.82;
  stroke-width: 33;
}

.pie-legend {
  display: grid;
  gap: 12px;
}

.pie-legend div {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.pie-legend div:hover {
  background: #f6f9ff;
}

.pie-legend strong {
  color: #111827;
}

.pie-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pie-legend em {
  font-style: normal;
  color: #6b7280;
  font-size: 12px;
}
</style>

<style scoped>
.line-chart {
  width: 100%;
  overflow-x: auto;
}

.line-chart svg {
  min-width: 580px;
  width: 100%;
  height: auto;
}

.grid-line {
  stroke: #e5e7eb;
  stroke-dasharray: 4 4;
}

.axis-label {
  fill: #6b7280;
  font-size: 13px;
}

.right-label {
  text-anchor: start;
}

.amount-line {
  fill: none;
  stroke: url(#amountLine);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.record-line {
  fill: none;
  stroke: url(#recordLine);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.amount-dot {
  fill: #fff;
  stroke: #1962ec;
  stroke-width: 3;
}

.record-dot {
  fill: #fff;
  stroke: #06b6d4;
  stroke-width: 3;
}

.trend-legend i {
  border-radius: 50%;
}

.hospital-chart {
  padding: 12px 10px 0;
}

.hospital-row {
  display: grid;
  grid-template-columns: 90px 1fr 70px;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.hospital-name {
  color: #4b5563;
  text-align: right;
}

.hospital-track {
  height: 40px;
  display: flex;
  align-items: center;
  background-image: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(20% - 1px),
    #f1f3f7 calc(20% - 1px),
    #f1f3f7 20%
  );
}

.hbar {
  height: 22px;
  border-radius: 0;
  background: #053bff;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.hbar:hover {
  opacity: 0.82;
}

.hover-zone {
  cursor: crosshair;
}

/* 图表 tooltip */
.chart-tip {
  position: fixed;
  z-index: 3000;
  pointer-events: none;
  min-width: 130px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.25);
}

.chart-tip strong {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
}

.chart-tip p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 0;
}

.chart-tip i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-tip b {
  margin-left: auto;
  padding-left: 12px;
  color: #93c5fd;
  font-weight: 600;
}

.hospital-row strong {
  color: #111827;
}

.hospital-axis {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 14px;
  color: #6b7280;
  font-size: 13px;
}

.hospital-axis span:not(:first-child) {
  grid-column: 2;
}

.hospital-axis {
  grid-template-columns: 90px repeat(4, 1fr);
  text-align: center;
}

.hospital-axis span:first-child {
  text-align: left;
}

@media (max-width: 1100px) {
  .stats-grid,
  .trend-row {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: stretch;
}

.two-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid,
  .two-columns,
  .trend-row,
  .pie-layout {
    grid-template-columns: 1fr;
  }

  .pie-layout {
    justify-items: center;
  }
}
</style>
