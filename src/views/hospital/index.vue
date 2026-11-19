<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDictOverview,
  getDictHospitalPage,
  createDictHospital,
  updateDictHospitalById,
  deleteDictHospitalById
} from '../../api/index.js'

// 字典项
// 等级/类型枚举与后端 /dict/hospitals 对齐
const levels = ['三甲', '三乙', '二甲', '二乙', '一甲', '专科']
const types = ['综合', '专科', '中医', '妇幼保健院']
const STATUS_ENABLED = 1
const STATUS_DISABLED = 0
const STATUS_TEXT = { [STATUS_ENABLED]: '正常', [STATUS_DISABLED]: '停用' }
const statuses = [STATUS_ENABLED, STATUS_DISABLED]

// 筛选
const keyword = ref('')
const filterLevel = ref('')
const filterType = ref('')

// 服务端分页与列表
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 机构概览统计：GET /dict/overview
const overview = ref({ hospitalCount: 0, departmentCount: 0, doctorCount: 0, provinceCount: 0 })
const stats = computed(() => [
  { label: '医院总数', value: overview.value.hospitalCount, unit: '家', desc: '医疗机构', icon: 'OfficeBuilding', theme: 'blue' },
  { label: '科室数量', value: overview.value.departmentCount, unit: '个', desc: '已建科室字典', icon: 'Medal', theme: 'red' },
  { label: '医生数量', value: overview.value.doctorCount, unit: '位', desc: '在册医生字典', icon: 'FirstAidKit', theme: 'cyan' },
  { label: '覆盖省份', value: overview.value.provinceCount, unit: '个', desc: '全国覆盖省份', icon: 'Location', theme: 'green' }
])

const buildQuery = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const word = keyword.value.trim()
  if (word) params.keyword = word
  if (filterLevel.value) params.level = filterLevel.value
  if (filterType.value) params.type = filterType.value
  return params
}

const fetchOverview = async () => {
  try {
    const res = await getDictOverview()
    overview.value = res || {}
  } catch {
    overview.value = {}
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getDictHospitalPage(buildQuery())
    tableData.value = res?.list || []
    total.value = Number(res?.total) || 0
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { page.value = 1; fetchList() }
const handleReset = () => {
  keyword.value = ''
  filterLevel.value = ''
  filterType.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: '',
  name: '',
  level: '三甲',
  type: '综合',
  province: '',
  city: '',
  address: '',
  phone: '',
  description: '',
  status: STATUS_ENABLED
})

const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入医院名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择医院等级', trigger: 'change' }],
  type: [{ required: true, message: '请选择医院类型', trigger: 'change' }],
  province: [{ required: true, message: '请选择省份', trigger: 'change' }],
  city: [{ required: true, message: '请选择城市', trigger: 'change' }],
  phone: [{ pattern: /^[\d-]{7,15}$/, message: '请输入正确的联系电话', trigger: 'blur' }]
}

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  resetForm()
  form.id = String(row.id)
  form.name = row.name || ''
  form.level = row.level || ''
  form.type = row.type || ''
  form.province = row.province || ''
  form.city = row.city || ''
  form.address = row.address || ''
  form.phone = row.phone || ''
  form.description = row.description || ''
  form.status = Number(row.status) === STATUS_DISABLED ? STATUS_DISABLED : STATUS_ENABLED
  isEdit.value = true
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const buildPayload = () => ({
  name: form.name,
  level: form.level || undefined,
  type: form.type || undefined,
  province: form.province || undefined,
  city: form.city || undefined,
  address: form.address || undefined,
  phone: form.phone || undefined,
  description: form.description || undefined,
  status: form.status
})

const submitting = ref(false)
const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateDictHospitalById(form.id, buildPayload())
      ElMessage.success('医院信息已更新')
    } else {
      await createDictHospital(buildPayload())
      ElMessage.success('医院添加成功')
    }
    dialogVisible.value = false
    fetchList()
    fetchOverview()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除医院「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await deleteDictHospitalById(String(row.id))
      ElMessage.success('医院已删除')
      if (tableData.value.length === 1 && page.value > 1) page.value -= 1
      fetchList()
      fetchOverview()
    } catch (err) {
      ElMessage.error(err?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchOverview()
  fetchList()
})
</script>
<template>
  <div class="hospital-page">
    <div class="page-header">
      <div>
        <h1>医院管理</h1>
        <p>管理医疗机构信息</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        添加医院
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-top">
          <span class="stat-label">{{ item.label }}</span>
          <span class="stat-value">{{ item.value }}<small>{{ item.unit }}</small></span>
        </div>
        <div class="stat-bottom">
          <span class="stat-icon" :class="item.theme">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span class="stat-desc">{{ item.desc }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <div class="card-label">筛选条件</div>
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索医院名称、地址或电话..."
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterLevel" class="filter-select" size="large" clearable placeholder="全部等级" @change="handleSearch">
          <el-option v-for="level in levels" :key="level" :label="level" :value="level" />
        </el-select>
        <el-select v-model="filterType" class="filter-select" size="large" clearable placeholder="全部类型" @change="handleSearch">
          <el-option v-for="type in types" :key="type" :label="type" :value="type" />
        </el-select>
        <el-button type="primary" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 医院列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>医院列表</h3>
        <span class="table-total">共 {{ total }} 家医院</span>
      </div>
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="医院名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="level" label="等级" width="90" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="所在地" min-width="160">
          <template #default="{ row }">{{ row.province }} {{ row.city }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="dark" size="small" round>
              {{ STATUS_TEXT[Number(row.status)] || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的医院" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="640px" class="hospital-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑医院' : '添加医院' }}</h3>
          <p>填写医院基本信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="hospital-form">
        <el-form-item label="医院名称" prop="name" class="full">
          <el-input v-model="form.name" size="large" placeholder="请输入医院名称" />
        </el-form-item>
        <el-form-item label="医院等级" prop="level">
          <el-select v-model="form.level" class="full-control" placeholder="请选择等级">
            <el-option v-for="level in levels" :key="level" :label="level" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="医院类型" prop="type">
          <el-select v-model="form.type" class="full-control" placeholder="请选择类型">
            <el-option v-for="type in types" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-input v-model="form.province" size="large" placeholder="如：北京市" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" size="large" placeholder="如：东城区" />
        </el-form-item>
        <el-form-item label="详细地址" prop="address" class="full">
          <el-input v-model="form.address" size="large" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" class="full-control">
            <el-option
              v-for="status in statuses"
              :key="status"
              :label="STATUS_TEXT[status]"
              :value="status"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="简介" prop="description" class="full">
          <el-input v-model="form.description" type="textarea" :rows="3"
            placeholder="请输入医院简介" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
      </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hospital-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.page-header .el-button {
  border-radius: 10px;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 22px;
}

.stat-card {
  padding: 24px 28px;
  border-radius: 20px;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 15px;

  color: #1f2937;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.stat-value small {
  margin-left: 4px;
  font-size: 15px;
  font-weight: 400;
  color: #9ca3af;
}

.stat-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 26px;
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
}

.stat-icon i {
  font-size: 1.5em;
}

.stat-icon svg {
  width: 25px;
  height: 25px;
}

.stat-icon.blue { background: #e8f0ff; color: #4f6bff; }
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-icon.red { background: #fee2e2; color: #ef4444; }
.stat-icon.cyan { background: #e0f2fe; color: #0284c7; }

.stat-desc {
  margin-top: 14px;
  font-size: 16px;
  color: #9ca3af;
}

/* 筛选区 */
.filter-card {
  margin-top: 22px;
  padding: 20px 22px;
}

.card-label {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

/* 列表 */
.table-card {
  margin-top: 22px;
  padding: 22px;
}

.table-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

.table-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.table-total {
  font-size: 13px;
  color: #9ca3af;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

:deep(.el-table .el-button__text) {
  font-weight: 500;
}

/* 弹窗 */
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

.hospital-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.hospital-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.hospital-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

/* 弹窗 teleport 到 body，使用全局样式 */

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .hospital-form {
    grid-template-columns: 1fr;
  }

  .hospital-form .full {
    grid-column: 1;
  }
}
.el-button+.el-button{
  margin-left: 0;
}
.el-button{
  font-weight: bold;
}
</style>
<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.hospital-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>
