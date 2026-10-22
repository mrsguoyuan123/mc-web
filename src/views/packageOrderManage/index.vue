<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 订单状态配色
const statusMap = {
  已完成: { color: '#16a34a', bg: 'rgba(220,252,231,0.5)' },
  进行中: { color: '#2563eb', bg: 'rgba(232,241,255,0.5)' },
  待支付: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  退单: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  已退款: { color: '#f5222d', bg: 'rgba(254,240,240,0.5)' }
}
const statusOptions = Object.keys(statusMap)

// 订单模拟数据
const orders = ref([
  { id: 'SP20260415001', patient: '王建国', service: '健康体检套餐A', time: '2026-04-15 10:23:15', amount: 1280, status: '已完成', phone: '13856784521', payMethod: '微信支付', payTime: '2026-04-15 10:25:32' },
  { id: 'SP20260416002', patient: '李秀英', service: '慢病管理套餐', time: '2026-04-16 14:35:42', amount: 2580, status: '进行中', phone: '15967234518', payMethod: '支付宝', payTime: '2026-04-16 14:38:07' },
  { id: 'SP20260417003', patient: '张明华', service: '康复理疗套餐', time: '2026-04-17 09:12:30', amount: 3200, status: '已完成', phone: '13712345698', payMethod: '微信支付', payTime: '2026-04-17 09:14:55' },
  { id: 'SP20260418004', patient: '刘晓梅', service: '健康体检套餐B', time: '2026-04-18 16:45:18', amount: 1880, status: '待支付', phone: '15823456709', payMethod: '', payTime: '' },
  { id: 'SP20260419005', patient: '陈文博', service: '中医调理套餐', time: '2026-04-19 11:28:55', amount: 4500, status: '退单', phone: '13698745632', payMethod: '银行卡', payTime: '2026-04-19 11:31:20' },
  { id: 'SP20260420006', patient: '赵雅琴', service: '健康体检套餐A', time: '2026-04-20 15:17:22', amount: 1280, status: '已退款', phone: '15934567821', payMethod: '支付宝', payTime: '2026-04-20 15:19:48', refundStatus: '退款成功', refundTime: '2026-04-20 19:40:05', refundAmount: 1280 },
  { id: 'SP20260421007', patient: '徐丽华', service: '健康体检套餐A', time: '2026-04-21 09:08:26', amount: 1280, status: '已完成', phone: '13755667788', payMethod: '微信支付', payTime: '2026-04-21 09:10:44' },
  { id: 'SP20260422008', patient: '马志强', service: '慢病管理套餐', time: '2026-04-22 15:42:13', amount: 2580, status: '进行中', phone: '15866778899', payMethod: '微信支付', payTime: '2026-04-22 15:44:39' },
  { id: 'SP20260423009', patient: '林淑芬', service: '康复理疗套餐', time: '2026-04-23 11:25:39', amount: 3200, status: '已完成', phone: '13677889900', payMethod: '支付宝', payTime: '2026-04-23 11:28:02' },
  { id: 'SP20260424010', patient: '高建军', service: '健康体检套餐B', time: '2026-04-24 10:52:04', amount: 1880, status: '待支付', phone: '13988990011', payMethod: '', payTime: '' },
  { id: 'SP20260425011', patient: '罗晓燕', service: '中医调理套餐', time: '2026-04-25 14:16:58', amount: 4500, status: '退单', phone: '13599001122', payMethod: '微信支付', payTime: '2026-04-25 14:19:16' },
  { id: 'SP20260426012', patient: '梁国华', service: '健康体检套餐A', time: '2026-04-26 09:34:27', amount: 1280, status: '已退款', phone: '15011223344', payMethod: '微信支付', payTime: '2026-04-26 09:36:50', refundStatus: '退款成功', refundTime: '2026-04-26 16:22:13', refundAmount: 1280 },
  { id: 'SP20260427013', patient: '谢永强', service: '健康体检套餐A', time: '2026-04-27 10:05:12', amount: 1280, status: '已完成', phone: '13866554433', payMethod: '微信支付', payTime: '2026-04-27 10:07:40' },
  { id: 'SP20260428014', patient: '韩梅梅', service: '康复理疗套餐', time: '2026-04-28 14:48:33', amount: 3200, status: '进行中', phone: '13799887766', payMethod: '银行卡', payTime: '2026-04-28 14:50:55' },
  { id: 'SP20260429015', patient: '冯德伦', service: '中医调理套餐', time: '2026-04-29 09:22:18', amount: 4500, status: '待支付', phone: '13577665544', payMethod: '', payTime: '' },
  { id: 'SP20260430016', patient: '许广平', service: '健康体检套餐B', time: '2026-04-30 11:36:49', amount: 1880, status: '已完成', phone: '13655443322', payMethod: '支付宝', payTime: '2026-04-30 11:39:07' },
  { id: 'SP20260501017', patient: '邓丽君', service: '慢病管理套餐', time: '2026-05-01 15:58:27', amount: 2580, status: '进行中', phone: '15933221100', payMethod: '微信支付', payTime: '2026-05-01 16:01:14' },
  { id: 'SP20260502018', patient: '曹孟德', service: '健康体检套餐A', time: '2026-05-02 10:14:56', amount: 1280, status: '已退款', phone: '13811009988', payMethod: '微信支付', payTime: '2026-05-02 10:17:22', refundStatus: '退款成功', refundTime: '2026-05-02 20:31:46', refundAmount: 1280 },
  { id: 'SP20260503019', patient: '彭丽媛', service: '中医调理套餐', time: '2026-05-03 13:47:08', amount: 4500, status: '退单', phone: '15299001122', payMethod: '支付宝', payTime: '2026-05-03 13:49:35' },
  { id: 'SP20260504020', patient: '萧远山', service: '康复理疗套餐', time: '2026-05-04 09:31:24', amount: 3200, status: '已完成', phone: '13466778899', payMethod: '银行卡', payTime: '2026-05-04 09:33:58' },
])

// 筛选（点击查询生效）
const filters = reactive({ patient: '', id: '', status: '' })
const applied = reactive({ patient: '', id: '', status: '' })
const filtered = computed(() =>
  orders.value.filter((o) =>
    (!applied.patient || o.patient.includes(applied.patient))
    && (!applied.id || o.id.includes(applied.id))
    && (!applied.status || o.status === applied.status)
  )
)
const handleSearch = () => { Object.assign(applied, filters); page.value = 1 }
const handleReset = () => {
  filters.patient = filters.id = filters.status = ''
  Object.assign(applied, filters)
  page.value = 1
}

// 分页
const page = ref(1)
const pageSize = ref(10)
const pagedOrders = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)
handleReset()

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)

const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 退款弹窗（仅“退单”订单显示按钮）
const refundVisible = ref(false)
const refundTarget = ref(null)
const refundReason = ref('')
const refundErr = ref('')
const handleRefund = (row) => {
  refundTarget.value = row
  refundReason.value = ''
  refundErr.value = ''
  refundVisible.value = true
}
const confirmRefund = () => {
  const reason = refundReason.value.trim()
  if (!reason) {
    refundErr.value = '请输入退款原因'
    return
  }
  const n = (v) => String(v).padStart(2, '0')
  const d = new Date()
  const row = refundTarget.value
  row.status = '已退款'
  row.refundStatus = '退款成功'
  row.refundAmount = row.amount
  row.refundReason = reason
  row.refundTime = `${d.getFullYear()}-${n(d.getMonth() + 1)}-${n(d.getDate())} ${n(d.getHours())}:${n(d.getMinutes())}:${n(d.getSeconds())}`
  refundVisible.value = false
  ElMessage.success('退款成功')
}
</script>
<template>
  <div class="order-page">
    <div class="page-header">
      <div>
        <h1>服务包订单管理</h1>
        <p>管理服务包订单与退款</p>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="panel filter-card">
      <el-input v-model="filters.patient" class="filter-input" size="large" clearable
        placeholder="请输入患者姓名" @keyup.enter="handleSearch" />
      <el-input v-model="filters.id" class="filter-input" size="large" clearable
        placeholder="请输入订单号" @keyup.enter="handleSearch" />
      <el-select v-model="filters.status" class="filter-select" size="large" clearable placeholder="全部">
        <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button type="primary" class="btn-blue" size="large" @click="handleSearch">查询</el-button>
      <el-button size="large" @click="handleReset">重置</el-button>
    </div>

    <!-- 订单列表 -->
    <div class="panel table-card">
      <el-table :data="pagedOrders" stripe>
        <el-table-column label="订单号" prop="id" min-width="150" />
        <el-table-column label="患者姓名" prop="patient" min-width="100" />
        <el-table-column label="套餐名称" prop="service" min-width="120" />
        <el-table-column label="下单时间" prop="time" min-width="170" />
        <el-table-column label="订单金额" min-width="90">
          <template #default="{ row }"><span class="amount">¥{{ row.amount }}</span></template>
        </el-table-column>
        <el-table-column label="订单状态" min-width="100">
          <template #default="{ row }">
            <span class="status-tag" :style="{ color: statusMap[row.status].color, background: statusMap[row.status].bg }">
              {{ row.status }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="联系方式" prop="phone" min-width="130" />
                <el-table-column label="操作" width="110" fixed="right" align="left">
          <template #default="{ row }">
            <el-tooltip content="详情" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="退款" placement="top" v-if="row.status === '退单'">
              <el-button type="danger" link @click="handleRefund(row)"><el-icon><RefreshLeft /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的订单" :image-size="90" />
        </template>
      </el-table>

      <el-pagination class="list-pager" background
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filtered.length"
        layout="total, prev, pager, next, sizes"
        @size-change="page = 1" />
    </div>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailVisible" width="720" class="order-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>订单详情</h3>
          <p>服务包订单详细信息</p>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <div class="section-title">基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">订单号</div>
            <div class="info-value">{{ detail.id }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">订单状态</div>
            <div class="info-value">
              <span class="status-tag" :style="{ color: statusMap[detail.status].color, background: statusMap[detail.status].bg }">
                {{ detail.status }}
              </span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">患者姓名</div>
            <div class="info-value">{{ detail.patient }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">联系方式</div>
            <div class="info-value">{{ detail.phone }}</div>
          </div>
                    <div class="info-item">
            <div class="info-label">套餐名称</div>
            <div class="info-value">{{ detail.service }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">下单时间</div>
            <div class="info-value">{{ detail.time }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">订单金额</div>
            <div class="info-value amount">¥{{ detail.amount }}</div>
          </div>
        </div>

        <template v-if="detail.status !== '待支付'">
          <div class="section-title">支付信息</div>
          <div class="pay-grid">
            <div class="pay-item">
              <div class="info-label">付款方式</div>
              <div class="pay-value">{{ detail.payMethod }}</div>
            </div>
            <div class="pay-item">
              <div class="info-label">付款时间</div>
              <div class="pay-value">{{ detail.payTime }}</div>
            </div>
          </div>
        </template>

        <template v-if="detail.status === '已退款'">
          <div class="section-title">退款信息</div>
          <div class="refund-grid">
            <div class="refund-item">
              <div class="info-label">退款状态</div>
              <div class="refund-state">{{ detail.refundStatus }}<el-icon class="ok-icon"><Select /></el-icon></div>
            </div>
            <div class="refund-item">
              <div class="info-label">退款时间</div>
              <div class="refund-value">{{ detail.refundTime }}</div>
            </div>
            <div class="refund-item">
              <div class="info-label">退款金额</div>
              <div class="refund-value">¥{{ detail.refundAmount }}</div>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog v-model="refundVisible" width="560" class="order-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>订单退款</h3>
          <p>请输入退款原因</p>
        </div>
      </template>
      <div class="refund-info">
        <div>订单号：{{ refundTarget?.id }}</div>
        <div>患者：{{ refundTarget?.patient }}</div>
        <div>金额：<span class="amount">¥{{ refundTarget?.amount }}</span></div>
      </div>
      <div class="refund-label">退款原因</div>
      <el-input v-model="refundReason" type="textarea" :rows="3" resize="none"
        placeholder="请输入退款原因" @input="refundErr = ''" />
      <div v-if="refundErr" class="refund-err">{{ refundErr }}</div>
      <template #footer>
        <el-button type="primary" class="btn-blue refund-confirm" size="large" @click="confirmRefund">确认退款</el-button>
        <el-button size="large" @click="refundVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.order-page {
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

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 22px;
  padding: 20px 22px;
}

.filter-input {
  width: 260px;
}

.filter-select {
  width: 200px;
}

.filter-card .btn-blue {
  margin-left: auto;
  border-radius: 4px;
}

/* 表格 */
.table-card {
  margin-top: 18px;
  padding: 22px 24px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.amount {
  color: #dc2626;
  font-weight: 600;
}

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.detail-btn {
  border-radius: 4px;
  font-weight: 600;
}

/* 分页 */
.list-pager {
  margin-top: 18px;
}

/* 退款弹窗 */
.refund-info {
  padding: 16px 18px;
  margin-bottom: 18px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 14px;
  color: #6b7280;
  line-height: 2;
}

.refund-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.refund-err {
  margin-top: 5px;
  font-size: 12px;
  color: #dc2626;
}

.refund-confirm {
  min-width: 118px;
}

/* 详情弹窗 */
.dialog-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.section-title {
  margin: 6px 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.section-title:not(:first-child) {
  margin-top: 26px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  padding: 13px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.info-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.pay-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pay-item {
  padding: 13px 16px;
  background: #f0f4ff;
  border: 1px solid #dbe4ff;
  border-radius: 10px;
}

.pay-value {
  font-size: 15px;
  font-weight: 600;
  color: #2563eb;
}

/* 退款信息 */
.refund-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.refund-item {
  padding: 13px 16px;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 10px;
}

.refund-state,
.refund-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #dc2626;
}

.ok-icon {
  color: #16a34a;
  font-size: 16px;
}

@media (max-width: 900px) {
  .filter-card {
    flex-wrap: wrap;
  }

  .filter-input,
  .filter-select {
    width: 100%;
  }

  .info-grid,
  .pay-grid,
  .refund-grid {
    grid-template-columns: 1fr;
  }
}
.filter-card .el-button+.el-button{
  margin-left: 0;
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.order-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>

