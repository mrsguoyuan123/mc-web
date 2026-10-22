<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 订单状态配色
const statusMap = {
  已完成: { color: '#16a34a', bg: 'rgba(220,252,231,0.5)' },
  服务中: { color: '#2563eb', bg: 'rgba(232,241,255,0.5)' },
  待服务: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  退单: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  已退款: { color: '#f5222d', bg: 'rgba(254,240,240,0.5)' }
}
const statusOptions = Object.keys(statusMap)

// 订单模拟数据
const orders = ref([
  { id: 'ES20260415001', patient: '赵国强', staff: '李建民', service: '陪诊', time: '2026-04-15 09:20:15', amount: 380, status: '已完成', phone: '13756892341', payMethod: '微信支付', payTime: '2026-04-15 09:22:08' },
  { id: 'ES20260416002', patient: '钱秀兰', staff: '张志强', service: '检查陪同', time: '2026-04-16 13:45:28', amount: 280, status: '服务中', phone: '15812367894', payMethod: '支付宝', payTime: '2026-04-16 13:46:55' },
  { id: 'ES20260417003', patient: '孙丽娟', staff: '王德华', service: '取药陪同', time: '2026-04-17 10:35:42', amount: 180, status: '已完成', phone: '13923458761', payMethod: '微信支付', payTime: '2026-04-17 10:37:55' },
  { id: 'ES20260418004', patient: '李晓明', staff: '刘永康', service: '住院陪护', time: '2026-04-18 15:22:55', amount: 680, status: '待服务', phone: '15867234590', payMethod: '微信支付', payTime: '2026-04-18 15:25:10' },
  { id: 'ES20260419005', patient: '周文华', staff: '陈国平', service: '康复陪护', time: '2026-04-19 11:18:33', amount: 580, status: '退单', phone: '13698741256', payMethod: '银行卡', payTime: '2026-04-19 11:20:27' },
  { id: 'ES20260420006', patient: '吴雅琴', staff: '张志强', service: '检查陪同', time: '2026-04-20 14:50:47', amount: 280, status: '已退款', phone: '15934562187', payMethod: '支付宝', payTime: '2026-04-20 14:52:34', refundStatus: '退款成功', refundTime: '2026-04-20 17:45:22', refundAmount: 280 },
  { id: 'ES20260421007', patient: '郑建国', staff: '李建民', service: '检查陪同', time: '2026-04-21 14:08:19', amount: 280, status: '服务中', phone: '13587654321', payMethod: '微信支付', payTime: '2026-04-21 14:10:02' },
  { id: 'ES20260422008', patient: '冯秀珍', staff: '孙明辉', service: '住院陪护', time: '2026-04-22 09:40:36', amount: 680, status: '已完成', phone: '13823456789', payMethod: '支付宝', payTime: '2026-04-22 09:42:51' },
  { id: 'ES20260423009', patient: '蒋文斌', staff: '王德华', service: '取药陪同', time: '2026-04-23 16:12:07', amount: 180, status: '待服务', phone: '15212345678', payMethod: '微信支付', payTime: '2026-04-23 16:14:23' },
  { id: 'ES20260424010', patient: '沈丽华', staff: '张志强', service: '康复陪护', time: '2026-04-24 10:58:44', amount: 580, status: '退单', phone: '13345678901', payMethod: '微信支付', payTime: '2026-04-24 11:00:15' },
  { id: 'ES20260425011', patient: '何丽华', staff: '陈国平', service: '陪诊', time: '2026-04-25 10:26:18', amount: 380, status: '已完成', phone: '13822334455', payMethod: '微信支付', payTime: '2026-04-25 10:28:41' },
  { id: 'ES20260426012', patient: '武志强', staff: '李建民', service: '检查陪同', time: '2026-04-26 14:39:52', amount: 280, status: '服务中', phone: '13966554477', payMethod: '支付宝', payTime: '2026-04-26 14:42:15' },
  { id: 'ES20260427013', patient: '金秀珍', staff: '刘永康', service: '住院陪护', time: '2026-04-27 09:13:27', amount: 680, status: '待服务', phone: '13511223344', payMethod: '', payTime: '' },
  { id: 'ES20260428014', patient: '侯德榜', staff: '张志强', service: '取药陪同', time: '2026-04-28 16:05:44', amount: 180, status: '已完成', phone: '13899001122', payMethod: '微信支付', payTime: '2026-04-28 16:08:09' },
  { id: 'ES20260429015', patient: '孟小冬', staff: '王德华', service: '康复陪护', time: '2026-04-29 11:47:33', amount: 580, status: '服务中', phone: '15233445566', payMethod: '微信支付', payTime: '2026-04-29 11:50:12' },
  { id: 'ES20260430016', patient: '汤一介', staff: '李建民', service: '陪诊', time: '2026-04-30 10:21:08', amount: 380, status: '已退款', phone: '13344556677', payMethod: '支付宝', payTime: '2026-04-30 10:23:36', refundStatus: '退款成功', refundTime: '2026-04-30 19:15:42', refundAmount: 380 },
  { id: 'ES20260501017', patient: '尹瘦石', staff: '陈国平', service: '检查陪同', time: '2026-05-01 15:32:59', amount: 280, status: '退单', phone: '13677889900', payMethod: '微信支付', payTime: '2026-05-01 15:35:21' },
  { id: 'ES20260502018', patient: '姚慕莲', staff: '张志强', service: '住院陪护', time: '2026-05-02 09:56:14', amount: 680, status: '已完成', phone: '13599001122', payMethod: '银行卡', payTime: '2026-05-02 09:58:47' },
  { id: 'ES20260503019', patient: '毛彦文', staff: '刘永康', service: '陪诊', time: '2026-05-03 13:28:36', amount: 380, status: '服务中', phone: '13722334455', payMethod: '微信支付', payTime: '2026-05-03 13:31:02' },
  { id: 'ES20260504020', patient: '裘劭恒', staff: '孙明辉', service: '取药陪同', time: '2026-05-04 10:44:51', amount: 180, status: '已完成', phone: '13966554477', payMethod: '支付宝', payTime: '2026-05-04 10:47:18' },
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
        <h1>陪诊服务订单管理</h1>
        <p>管理陪诊服务订单与退款</p>
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
        <el-table-column label="患者姓名" prop="patient" min-width="90" />
        <el-table-column label="陪诊人员" prop="staff" min-width="90" />
        <el-table-column label="服务内容" prop="service" min-width="100" />
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
          <p>陪诊服务订单详细信息</p>
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
            <div class="info-label">陪诊人员</div>
            <div class="info-value">{{ detail.staff }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">服务内容</div>
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

        <template v-if="detail.status !== '待服务'">
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
