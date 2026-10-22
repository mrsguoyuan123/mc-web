<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const provinces = ['北京', '上海', '广东', '浙江', '江苏', '四川']
const diseaseTypes = ['内科', '外科', '妇科', '儿科', '骨科', '神经科']
const packageTypes = ['基础包', '标准包', '尊享包']
const statusOptions = [
  { value: 'pending', label: '待处理', type: 'warning' },
  { value: 'processing', label: '服务中', type: 'primary' },
  { value: 'completed', label: '已完成', type: 'success' },
  { value: 'cancelled', label: '已取消', type: 'info' }
]

const allOrders = ref([
  { id: 'FWB20261001', customer: '张晨', hospital: '北京协和医院', province: '北京', diseaseType: '内科', packageType: '尊享包', amount: 16800, status: 'completed', serviceDate: '2026-10-08', remark: '复诊陪同与报告解读' },
  { id: 'FWB20261002', customer: '李娜', hospital: '上海瑞金医院', province: '上海', diseaseType: '妇科', packageType: '标准包', amount: 9800, status: 'processing', serviceDate: '2026-10-12', remark: '需要女性照护师' },
  { id: 'FWB20261003', customer: '王强', hospital: '广州中山一院', province: '广东', diseaseType: '外科', packageType: '尊享包', amount: 21800, status: 'pending', serviceDate: '2026-10-18', remark: '术前咨询与住院安排' },
  { id: 'FWB20261004', customer: '赵敏', hospital: '浙江大学医学院附属第一医院', province: '浙江', diseaseType: '儿科', packageType: '基础包', amount: 3600, status: 'completed', serviceDate: '2026-09-28', remark: '儿童发热门诊' },
  { id: 'FWB20261005', customer: '陈杰', hospital: '南京鼓楼医院', province: '江苏', diseaseType: '骨科', packageType: '标准包', amount: 12600, status: 'processing', serviceDate: '2026-10-15', remark: '术后康复随访' },
  { id: 'FWB20261006', customer: '刘洋', hospital: '四川大学华西医院', province: '四川', diseaseType: '神经科', packageType: '尊享包', amount: 28500, status: 'pending', serviceDate: '2026-10-21', remark: '专家门诊预约' },
  { id: 'FWB20260918', customer: '孙丽', hospital: '北京大学人民医院', province: '北京', diseaseType: '外科', packageType: '标准包', amount: 11200, status: 'completed', serviceDate: '2026-09-18', remark: '入院手续代办' },
  { id: 'FWB20260922', customer: '周凯', hospital: '上海市第一人民医院', province: '上海', diseaseType: '内科', packageType: '基础包', amount: 4200, status: 'cancelled', serviceDate: '2026-09-22', remark: '客户临时取消' },
  { id: 'FWB20260926', customer: '吴倩', hospital: '广东省人民医院', province: '广东', diseaseType: '儿科', packageType: '标准包', amount: 8800, status: 'completed', serviceDate: '2026-09-26', remark: '儿科检查全程陪同' },
  { id: 'FWB20260930', customer: '郑海', hospital: '浙江省人民医院', province: '浙江', diseaseType: '骨科', packageType: '尊享包', amount: 19800, status: 'completed', serviceDate: '2026-09-30', remark: '复查与康复方案' },
  { id: 'FWB20261008', customer: '钱蕾', hospital: '苏州大学附属第一医院', province: '江苏', diseaseType: '妇科', packageType: '基础包', amount: 5200, status: 'processing', serviceDate: '2026-10-19', remark: '检查取药' },
  { id: 'FWB20261009', customer: '冯磊', hospital: '成都中医药大学附属医院', province: '四川', diseaseType: '内科', packageType: '标准包', amount: 7600, status: 'pending', serviceDate: '2026-10-25', remark: '中医调理咨询' }
])

const filters = reactive({
  keyword: '',
  province: '',
  status: '',
  dateRange: []
})

const currentPage = ref(1)
const pageSize = ref(8)

const filteredOrders = computed(() => {
  return allOrders.value.filter((order) => {
    const keyword = filters.keyword.trim()
    const matchesKeyword = !keyword || [order.id, order.customer, order.hospital].some((value) => value.includes(keyword))
    const matchesProvince = !filters.province || order.province === filters.province
    const matchesStatus = !filters.status || order.status === filters.status
    const matchesDate = !filters.dateRange?.length || (
      new Date(order.serviceDate).getTime() >= new Date(filters.dateRange[0]).getTime() &&
      new Date(order.serviceDate).getTime() <= new Date(filters.dateRange[1]).getTime()
    )
    return matchesKeyword && matchesProvince && matchesStatus && matchesDate
  })
})

const total = computed(() => filteredOrders.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pagedOrders = computed(() => {
  const page = Math.min(currentPage.value, totalPages.value)
  const start = (page - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const stats = computed(() => {
  const amount = filteredOrders.value.reduce((sum, item) => sum + item.amount, 0)
  const users = new Set(filteredOrders.value.map((item) => item.customer)).size
  return [
    { label: '总金额', value: formatCurrency(amount), icon: 'Money', color: '#2563eb' },
    { label: '订单数', value: total.value, icon: 'Tickets', color: '#10b981' },
    { label: '用户数', value: users, icon: 'User', color: '#f59e0b' },
    { label: '平均金额', value: formatCurrency(total.value ? amount / total.value : 0), icon: 'TrendCharts', color: '#8b5cf6' }
  ]
})

watch(
  filters,
  () => {
    currentPage.value = 1
  },
  { deep: true }
)

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value
})

const getStatusMeta = (status) => statusOptions.find((item) => item.value === status)

function formatCurrency(value) {
  return `¥${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}

const resetFilters = () => {
  Object.assign(filters, { keyword: '', province: '', status: '', dateRange: [] })
}

const handleSearch = () => {
  ElMessage.success(`查询到 ${total.value} 条订单`)
}

const formDialogVisible = ref(false)
const viewDialogVisible = ref(false)
const dialogMode = ref('add')
const formRef = ref()
const selectedOrder = ref(null)

const getDefaultForm = () => ({
  id: '',
  customer: '',
  hospital: '',
  province: '',
  diseaseType: '',
  packageType: '基础包',
  amount: 5000,
  status: 'pending',
  serviceDate: '',
  remark: ''
})

const form = reactive(getDefaultForm())

const rules = {
  customer: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  hospital: [{ required: true, message: '请输入医院名称', trigger: 'blur' }],
  province: [{ required: true, message: '请选择省份', trigger: 'change' }],
  diseaseType: [{ required: true, message: '请选择疾病分类', trigger: 'change' }],
  packageType: [{ required: true, message: '请选择服务包', trigger: 'change' }],
  amount: [{ required: true, message: '请输入订单金额', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  serviceDate: [{ required: true, message: '请选择服务日期', trigger: 'change' }]
}

const openCreate = () => {
  dialogMode.value = 'add'
  Object.assign(form, getDefaultForm())
  formDialogVisible.value = true
}

const openEdit = (order) => {
  dialogMode.value = 'edit'
  Object.assign(form, JSON.parse(JSON.stringify(order)))
  formDialogVisible.value = true
}

const openView = (order) => {
  selectedOrder.value = order
  viewDialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (dialogMode.value === 'add') {
    allOrders.value.unshift({
      ...JSON.parse(JSON.stringify(form)),
      id: `FWB${Date.now().toString().slice(-8)}`
    })
    ElMessage.success('订单新增成功')
  } else {
    const index = allOrders.value.findIndex((item) => item.id === form.id)
    if (index !== -1) allOrders.value[index] = { ...form }
    ElMessage.success('订单更新成功')
  }

  formDialogVisible.value = false
}

const handleDelete = (order) => {
  ElMessageBox.confirm(`确认删除订单 ${order.id} 吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    const index = allOrders.value.findIndex((item) => item.id === order.id)
    if (index !== -1) allOrders.value.splice(index, 1)
    ElMessage.success('订单已删除')
  }).catch(() => {})
}
</script>

<template>
  <div class="order-page">
    <div class="page-heading">
      <h1>服务包订单管理</h1>
      <p>订单检索、分页查看、状态跟踪和新增编辑维护</p>
    </div>
    <section class="stats-grid">
      <el-card v-for="item in stats" :key="item.label" shadow="never" class="stat-card">
        <div class="stat-content">
          <div>
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
          </div>
          <div class="stat-icon" :style="{ background: item.color }">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
        </div>
      </el-card>
    </section>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="订单号 / 客户 / 医院"
            :prefix-icon="'Search'"
            class="filter-item"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="省份">
          <el-select v-model="filters.province" clearable placeholder="全部省份" class="filter-item">
            <el-option v-for="item in provinces" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" class="filter-item">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务日期">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="date-filter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="handleSearch">查询</el-button>
          <el-button :icon="'RefreshLeft'" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <div>
            <h2>订单列表</h2>
            <p>共 {{ total }} 条符合条件的数据</p>
          </div>
          <el-button type="primary" :icon="'Plus'" @click="openCreate">新增订单</el-button>
        </div>
      </template>

      <el-table :data="pagedOrders" border stripe class="order-table">
        <el-table-column
          label="序号"
          type="index"
          width="70"
          align="center"
          :index="(index) => (Math.min(currentPage, totalPages) - 1) * pageSize + index + 1"
        />
        <el-table-column prop="id" label="订单编号" width="140" />
        <el-table-column prop="customer" label="客户" width="90" />
        <el-table-column prop="hospital" label="医院" min-width="220" show-overflow-tooltip />
        <el-table-column prop="province" label="省份" width="90" />
        <el-table-column prop="diseaseType" label="疾病分类" width="100" />
        <el-table-column prop="packageType" label="服务包" width="100" />
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">
            <strong>{{ formatCurrency(row.amount) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status)?.type" effect="light">
              {{ getStatusMeta(row.status)?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="serviceDate" label="服务日期" width="120" />
                <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openView(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          background
          layout="total, prev, pager, next, sizes"
        />
      </div>
    </el-card>
    <el-dialog
      v-model="formDialogVisible"
      :title="dialogMode === 'add' ? '新增订单' : '编辑订单'"
      width="720px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
        class="order-form"
      >
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="客户姓名" prop="customer">
              <el-input v-model="form.customer" placeholder="请输入客户姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务日期" prop="serviceDate">
              <el-date-picker
                v-model="form.serviceDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="医院名称" prop="hospital">
              <el-input v-model="form.hospital" placeholder="请输入医院名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="省份" prop="province">
              <el-select v-model="form.province" placeholder="请选择省份" class="full-width">
                <el-option v-for="item in provinces" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="疾病分类" prop="diseaseType">
              <el-select v-model="form.diseaseType" placeholder="请选择疾病分类" class="full-width">
                <el-option v-for="item in diseaseTypes" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务包" prop="packageType">
              <el-radio-group v-model="form.packageType">
                <el-radio v-for="item in packageTypes" :key="item" :value="item">
                  {{ item }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单金额" prop="amount">
              <el-input-number
                v-model="form.amount"
                :min="1"
                :step="100"
                controls-position="right"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态" class="full-width">
                <el-option
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注说明">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="4"
                maxlength="200"
                show-word-limit
                placeholder="请输入服务需求或备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewDialogVisible" title="订单详情" width="680px">
      <el-descriptions v-if="selectedOrder" :column="2" border>
        <el-descriptions-item label="订单编号">{{ selectedOrder.id }}</el-descriptions-item>
        <el-descriptions-item label="客户姓名">{{ selectedOrder.customer }}</el-descriptions-item>
        <el-descriptions-item label="医院名称" :span="2">{{ selectedOrder.hospital }}</el-descriptions-item>
        <el-descriptions-item label="省份">{{ selectedOrder.province }}</el-descriptions-item>
        <el-descriptions-item label="疾病分类">{{ selectedOrder.diseaseType }}</el-descriptions-item>
        <el-descriptions-item label="服务包">{{ selectedOrder.packageType }}</el-descriptions-item>
        <el-descriptions-item label="订单金额">{{ formatCurrency(selectedOrder.amount) }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusMeta(selectedOrder.status)?.type">
            {{ getStatusMeta(selectedOrder.status)?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="服务日期">{{ selectedOrder.serviceDate }}</el-descriptions-item>
        <el-descriptions-item label="备注说明" :span="2">{{ selectedOrder.remark }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="viewDialogVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 18px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card,
.filter-card,
.table-card {
  border: 0;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-content p {
  margin: 0 0 10px;
  color: #4b5563;
}

.stat-content strong {
  font-size: 26px;
  color: #111827;
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

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.filter-item {
  width: 210px;
}

.date-filter {
  width: 280px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #111827;
}

.table-header p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.order-table {
  width: 100%;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.full-width {
  width: 100%;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-item,
  .date-filter,
  .filter-form,
  .filter-form :deep(.el-form-item),
  .filter-form :deep(.el-select),
  .filter-form :deep(.el-date-editor) {
    width: 100%;
  }

  .table-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
