<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()

// 功能入口
const entries = [
  { title: '模板管理', desc: '管理小程序模板配置', icon: 'Document', color: '#2563eb', bg: '#e8f1ff', path: '/templateManage' },
  { title: '资讯管理', desc: '发布和管理小程序资讯内容', icon: 'Notification', color: '#16a34a', bg: '#f0fdf4', path: '/announceManage' },
  { title: '宣称设置', desc: '配置小程序横幅和宣传内容', icon: 'Promotion', color: '#ea580c', bg: '#fff7ed', path: '/bannerManage' },
  { title: '告知书管理', desc: '管理用户告知书和同意书', icon: 'CircleCheck', color: '#9333ea', bg: '#faf5ff', path: '/noticeDocManage' },
  { title: '服务包管理', desc: '管理医疗服务包和价格配置', icon: 'Box', color: '#4f46e5', bg: '#eef2ff', path: '/servicePackage' }
]

// 小程序概览
const overview = [
  { label: '活跃模板', value: 12, color: '#2563eb' },
  { label: '已发布资讯', value: 45, color: '#16a34a' },
  { label: '活动横幅', value: 8, color: '#f97316' }
]

// 服务包概览统计
const pkgStats = [
  { label: '服务包总数', value: '28', sub: '上架 18 / 下架 10', subColor: '#16a34a', icon: 'Box', iconColor: '#6366f1', iconBg: '#eef2ff' },
  { label: '服务包总金额', value: '¥52,680', sub: '平均 ¥1,881 / 包', subColor: '#6b7280', icon: 'ShoppingCart', iconColor: '#16a34a', iconBg: '#f0fdf4' },
  { label: '热门医院', value: '北京协和医院', sub: '服务包数量 12 个', subColor: '#6b7280', icon: 'OfficeBuilding', iconColor: '#0891b2', iconBg: '#ecfeff' },
  { label: '本月订单', value: '156', sub: '↑ 23.5% 较上月增长', subColor: '#16a34a', icon: 'Promotion', iconColor: '#f43f5e', iconBg: '#fff1f2' }
]

// 热门服务包
const hotPackages = [
  {
    name: '健康体检套餐A', org: '北京协和医院 · 体检中心',
    services: '血常规、肝功能、心电图、胸部X光、腹部B超、医生问诊',
    count: 6, sales: 68, score: 4.8, date: '2026-04-10', price: '¥1,280', on: true,
    color: '#6366f1', bg: '#eef2ff'
  },
  {
    name: '慢病管理套餐', org: '北京协和医院 · 内分泌科',
    services: '血糖监测、糖化血红蛋白、血压监测、营养咨询、用药指导、定期随访',
    count: 6, sales: 52, score: 4.9, date: '2026-04-12', price: '¥2,580', on: true,
    color: '#9333ea', bg: '#faf5ff'
  },
  {
    name: '康复理疗套餐', org: '上海瑞金医院 · 康复科',
    services: '物理治疗10次、针灸治疗8次、推拿按摩6次、康复评估',
    count: 4, sales: 36, score: 4.7, date: '2026-04-08', price: '¥3,200', on: false,
    color: '#0891b2', bg: '#ecfeff'
  }
]

// 图表
const hospitalPie = ref(null)
const pricePie = ref(null)
let charts = []

const pieOption = (data, colors) => ({
  color: colors,
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 个 ({d}%)' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#6b7280', fontSize: 12 } },
  series: [
    {
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
      label: { show: false },
      data
    }
  ]
})

onMounted(() => {
  const c1 = echarts.init(hospitalPie.value)
  c1.setOption(pieOption(
    [
      { value: 12, name: '北京协和医院' },
      { value: 9, name: '上海瑞金医院' },
      { value: 7, name: '广州中山医院' }
    ],
    ['#1962ec', '#90bbff', '#1bcb8b']
  ))
  const c2 = echarts.init(pricePie.value)
  c2.setOption(pieOption(
    [
      { value: 8, name: '¥0 - ¥1,000' },
      { value: 13, name: '¥1,001 - ¥2,500' },
      { value: 7, name: '¥2,501以上' }
    ],
    ['#1bcb8b', '#22d3ee', '#ff5d5e']
  ))
  charts = [c1, c2]
  window.addEventListener('resize', resizeCharts)
})

const resizeCharts = () => charts.forEach((c) => c.resize())

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  charts.forEach((c) => c.dispose())
})
</script>
<template>
  <div class="mp-page">
    <div class="page-header">
      <h1>小程序管理</h1>
      <p>管理小程序内容、模板和配置</p>
    </div>

    <!-- 功能入口卡片组 -->
    <div class="entries-grid">
      <div v-for="e in entries" :key="e.title" class="panel entry-card" @click="router.push(e.path)">
        <div class="entry-icon" :style="{ background: e.bg, color: e.color }">
          <el-icon><component :is="e.icon" /></el-icon>
        </div>
        <h3>{{ e.title }}</h3>
        <p>{{ e.desc }}</p>
        <span class="entry-link">点击进入管理 <el-icon><ArrowRight /></el-icon></span>
      </div>
    </div>

    <!-- 小程序概览 -->
    <div class="panel block-card">
      <div class="block-title">
        <h3>小程序概览</h3>
        <p>当前小程序运行状态</p>
      </div>
      <div class="overview-grid">
        <div v-for="o in overview" :key="o.label" class="overview-item">
          <strong :style="{ color: o.color }">{{ o.value }}</strong>
          <span>{{ o.label }}</span>
        </div>
      </div>
    </div>

    <!-- 服务包管理预览 -->
    <div class="panel block-card">
      <div class="block-title">
        <h3>服务包管理预览</h3>
        <p>小程序服务包数据统计与预览</p>
      </div>
      <div class="pkg-grid">
        <div v-for="s in pkgStats" :key="s.label" class="pkg-stat">
          <div class="pkg-stat-head">
            <span>{{ s.label }}</span>
            <span class="pkg-icon" :style="{ background: s.iconBg, color: s.iconColor }">
              <el-icon><component :is="s.icon" /></el-icon>
            </span>
          </div>
          <strong class="pkg-value">{{ s.value }}</strong>
          <small :style="{ color: s.subColor }">{{ s.sub }}</small>
        </div>
      </div>
    </div>

    <!-- 热门服务包 -->
    <div class="panel block-card">
      <div class="block-title hot-head">
        <div>
          <h3><el-icon class="hot-flag"><Flag /></el-icon>热门服务包</h3>
          <p>用户购买最多的服务包</p>
        </div>
        <el-button type="primary" class="btn-blue" @click="router.push('/servicePackage')">查看全部</el-button>
      </div>
      <div class="pkg-list">
        <div v-for="p in hotPackages" :key="p.name" class="pkg-item">
          <div class="pkg-main">
            <span class="pkg-cube" :style="{ background: p.bg, color: p.color }">
              <el-icon><Box /></el-icon>
            </span>
            <div class="pkg-intro">
              <h4>{{ p.name }}</h4>
              <p>{{ p.org }}</p>
              <p class="pkg-services">包含{{ p.count }}项服务：{{ p.services }}</p>
              <div class="pkg-meta">
                <span>本月销量: <b style="color:#2563eb">{{ p.sales }}单</b></span>
                <span>评分: <b style="color:#f59e0b">{{ p.score }}分</b></span>
                <span>创建时间: {{ p.date }}</span>
              </div>
            </div>
          </div>
          <div class="pkg-right">
            <strong>{{ p.price }}</strong>
            <span class="pkg-status" :class="p.on ? 'on' : 'off'">{{ p.on ? '上架' : '下架' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="charts-grid">
      <div class="panel block-card chart-card">
        <div class="block-title">
          <h3>各医院服务包分布</h3>
          <p>按医院统计的服务包数量</p>
        </div>
        <div ref="hospitalPie" class="chart-box"></div>
      </div>
      <div class="panel block-card chart-card">
        <div class="block-title">
          <h3>服务包价格区间分布</h3>
          <p>不同价格段的服务包数量</p>
        </div>
        <div ref="pricePie" class="chart-box"></div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.mp-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 功能入口 */
.entries-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin: 22px 0;
}

.entry-card {
  padding: 22px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.entry-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-bottom: 14px;
  border-radius: 10px;
  font-size: 20px;
}

.entry-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.entry-card p {
  margin: 0;
  /* min-height: 38px; */
  font-size: 13px;
  line-height: 1.5;
  color: #9ca3af;
}

.entry-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 14px;
  font-size: 13px;
  color: #2563eb;
}

/* 通用区块 */
.block-card {
  margin-top: 18px;
  padding: 22px 24px;
}

.block-title h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.block-title p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.hot-flag {
  color: #6366f1;
}

/* 小程序概览 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  background: #f8fafc;
  border-radius: 12px;
}

.overview-item strong {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.overview-item span {
  font-size: 13px;
  color: #6b7280;
}

/* 服务包统计 */
.pkg-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.pkg-stat {
  padding: 18px 20px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.pkg-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}

.pkg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 16px;
}

.pkg-value {
  display: block;
  margin: 14px 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #059669;
}

.pkg-stat small {
  font-size: 12px;
}

/* 热门服务包 */
.hot-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.pkg-list {
  margin-top: 16px;
}

.pkg-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border: 1px solid #f1f3f7;
  border-radius: 12px;
}

.pkg-item + .pkg-item {
  margin-top: 12px;
}

.pkg-main {
  display: flex;
  gap: 14px;
}

.pkg-cube {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 20px;
  flex-shrink: 0;
}

.pkg-intro h4 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.pkg-intro p {
  margin: 0 0 4px;
  font-size: 13px;
  color: #9ca3af;
}

.pkg-services {
  max-width: 640px;
}

.pkg-meta {
  display: flex;
  gap: 18px;
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.pkg-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.pkg-right strong {
  font-size: 22px;
  font-weight: 700;
  color: #059669;
}

.pkg-status {
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.pkg-status.on {
  color: #16a34a;
  background: rgba(220,252,231,0.5);
}

.pkg-status.off {
  color: #6b7280;
  background: rgba(243,244,246,0.5);
}

/* 图表 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 24px;
}

.chart-card {
  margin-top: 18px;
}

.chart-box {
  height: 300px;
  margin-top: 10px;
}

@media (max-width: 1200px) {
  .entries-grid,
  .pkg-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .entries-grid,
  .pkg-grid,
  .overview-grid,
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .pkg-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>