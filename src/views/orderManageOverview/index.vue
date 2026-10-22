<script setup>
import { computed } from 'vue'

// 三类订单汇总
const categories = [
  {
    key: 'pkg', name: '服务包订单', icon: 'Box', color: '#2563eb',
    total: 6, amount: '¥12,420', done: 2, running: 3, refund: 1
  },
  {
    key: 'care', name: '健康照护师服务订单', icon: 'UserFilled', color: '#9333ea',
    total: 6, amount: '¥3,520', done: 2, running: 3, refund: 1
  },
  {
    key: 'escort', name: '陪诊服务订单', icon: 'Guide', color: '#7c3aed',
    total: 6, amount: '¥2,380', done: 2, running: 3, refund: 1
  }
]

// 合计
const sum = computed(() =>
  categories.reduce(
    (acc, c) => ({ total: acc.total + c.total, done: acc.done + c.done, running: acc.running + c.running, refund: acc.refund + c.refund }),
    { total: 0, done: 0, running: 0, refund: 0 }
  )
)
const doneRate = computed(() => ((sum.value.done / sum.value.total) * 100).toFixed(1) + '%')
const refundRate = computed(() => ((sum.value.refund / sum.value.total) * 100).toFixed(1) + '%')

const globalStats = computed(() => [
  { label: '总订单数', value: String(sum.value.total), sub: '所有类型订单总计' },
  { label: '总收入', value: '¥18,320', sub: '累计收入金额' },
  { label: '已完成订单', value: String(sum.value.done), sub: `完成率 ${doneRate.value}` },
  { label: '退款订单', value: String(sum.value.refund), sub: `退款率 ${refundRate.value}` }
])

// 支付方式
const payments = [
  { name: '微信支付', count: 8, rate: '44.4%', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { name: '支付宝', count: 7, rate: '38.9%', color: '#2563eb', bg: '#e8f1ff', border: '#bfdbfe' },
  { name: '银行卡', count: 3, rate: '16.7%', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' }
]
</script>

<template>
  <div class="ov-page">
    <div class="page-header">
      <h1>订单管理总览</h1>
      <p>查看所有订单的汇总数据和统计分析</p>
    </div>

    <!-- 全局统计 -->
    <div class="global-grid">
      <div v-for="s in globalStats" :key="s.label" class="stat-item">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-main">
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-sub">{{ s.sub }}</span>
        </div>
      </div>
    </div>

    <!-- 三类订单汇总 -->
    <div class="cate-grid">
      <div v-for="c in categories" :key="c.key" class="panel cate-card" >
        <div class="cate-head">
          <el-icon :style="{ color: c.color }"><component :is="c.icon" /></el-icon>
          <span>{{ c.name }}</span>
        </div>
        <div class="cate-row"><span>订单总数</span><b>{{ c.total }}</b></div>
        <div class="cate-row"><span>订单金额</span><b class="green">{{ c.amount }}</b></div>
        <div class="cate-row"><span>已完成</span><b class="blue">{{ c.done }}</b></div>
        <div class="cate-row"><span>进行中</span><b class="orange">{{ c.running }}</b></div>
        <div class="cate-row"><span>已退款</span><b class="red">{{ c.refund }}</b></div>
      </div>
    </div>

    <!-- 详细数据对比 -->
    <div class="panel table-card">
      <div class="card-title">订单详细数据对比</div>
      <el-table :data="categories" :show-header="true" :border="false">
        <el-table-column label="订单类型" prop="name" min-width="180" />
        <el-table-column label="总订单数" prop="total" min-width="100" />
        <el-table-column label="总金额" min-width="120">
          <template #default="{ row }"><span class="green">{{ row.amount }}</span></template>
        </el-table-column>
        <el-table-column label="已完成" min-width="90">
          <template #default="{ row }"><span class="blue">{{ row.done }}</span></template>
        </el-table-column>
        <el-table-column label="进行中/服务中" min-width="130">
          <template #default="{ row }"><span class="orange">{{ row.running }}</span></template>
        </el-table-column>
        <el-table-column label="已退款" min-width="90">
          <template #default="{ row }"><span class="red">{{ row.refund }}</span></template>
        </el-table-column>
        <el-table-column label="完成率" min-width="100">
          <template #default>{{ doneRate }}</template>
        </el-table-column>
      </el-table>
      <div class="sum-row">
        <span class="sum-name">合计</span>
        <span class="sum-cell">{{ sum.total }}</span>
        <span class="sum-cell green">¥18,320</span>
        <span class="sum-cell blue">{{ sum.done }}</span>
        <span class="sum-cell orange">{{ sum.running }}</span>
        <span class="sum-cell red">{{ sum.refund }}</span>
        <span class="sum-cell strong">{{ doneRate }}</span>
      </div>
    </div>

    <!-- 支付方式统计 -->
    <div class="panel pay-card">
      <div class="card-title">支付方式统计</div>
      <div class="pay-grid">
        <div v-for="p in payments" :key="p.name" class="pay-item"
          :style="{ background: p.bg, border: `1px solid ${p.border}` }">
          <span class="pay-name">{{ p.name }}</span>
          <strong :style="{ color: p.color }">{{ p.count }}</strong>
          <small>占比 {{ p.rate }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ov-page {
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

.global-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 22px;
  margin: 22px 0;
  padding: 28px 44px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.stat-label {
  font-size: 16px;
  font-weight: 400;
  color: #9ca3af;
}

.stat-main {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-top: 22px;
}

.stat-value {
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.5px;
  color: #111827;
}

.stat-sub {
  font-size: 14px;
  color: #9ca3af;
}

/* 三类订单 */
.cate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.cate-card {
  padding: 20px 22px;
}

.cate-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.cate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 14px;
  color: #6b7280;
}

.cate-row b {
  font-weight: 600;
  color: #1f2937;
}

.green { color: #16a34a !important; }
.blue { color: #2563eb !important; }
.orange { color: #ea580c !important; }
.red { color: #dc2626 !important; }

/* 对比表 */
.table-card,
.pay-card {
  margin-top: 18px;
  padding: 22px 24px;
}

.card-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.sum-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1.2fr 0.9fr 1.3fr 0.9fr 1fr;
  align-items: center;
  padding: 15px 12px;
  background: #eff6ff;
  border-radius: 0 0 10px 10px;
  font-size: 14px;
}

.sum-name {
  padding-left: 8px;
  font-weight: 700;
  color: #111827;
}

.sum-cell.strong {
  font-weight: 700;
  color: #111827;
}

/* 支付方式 */
.pay-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pay-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 22px;
  border-radius: 12px;
}

.pay-name {
  font-size: 14px;
  color: #6b7280;
}

.pay-item strong {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.pay-item small {
  font-size: 12px;
  color: #9ca3af;
}
.sum-cell{
  padding:0 12px;
}

@media (max-width: 1200px) {
  .global-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cate-grid,
  .pay-grid {
    grid-template-columns: 1fr;
  }
}
</style>