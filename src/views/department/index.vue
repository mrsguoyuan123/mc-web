<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDictOverview,
  getDictHospitalPage,
  getDictAreaList,
  getDictDepartmentPage,
  createDictDepartment,
  updateDictDepartmentById,
  deleteDictDepartmentById
} from '../../api/index.js'

// 科室类别枚举与后端 /dict/departments 对齐
const categories = ['内科', '外科', '妇产科', '儿科', '其他']
const STATUS_ENABLED = 1
const STATUS_DISABLED = 0
const STATUS_TEXT = { [STATUS_ENABLED]: '正常', [STATUS_DISABLED]: '停用' }
const statuses = [STATUS_ENABLED, STATUS_DISABLED]

// 筛选
const keyword = ref('')
const filterCategory = ref('')
const filterHospitalId = ref('')

// 服务端分页与列表
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 医院下拉：GET /dict/hospitals（id 为雪花字符串）
const hospitalOptions = ref([])
// 院区级联：GET /dict/areas 全量，按 hospitalId 过滤
const areaOptions = ref([])
const hospitalNameMap = computed(() => {
  const map = {}
  hospitalOptions.value.forEach((item) => { map[String(item.id)] = item.name })
  return map
})
const areaNameMap = computed(() => {
  const map = {}
  areaOptions.value.forEach((item) => { map[String(item.id)] = item.name })
  return map
})

// 机构概览统计：GET /dict/overview
const overview = ref({ hospitalCount: 0, departmentCount: 0, doctorCount: 0, provinceCount: 0 })
const stats = computed(() => [
  { label: '科室总数', value: overview.value.departmentCount, unit: '个', desc: '已建科室字典', icon: 'Grid', theme: 'blue' },
  { label: '覆盖医院', value: overview.value.hospitalCount, unit: '家', desc: '医疗机构总数', icon: 'OfficeBuilding', theme: 'red' },
  { label: '医生总数', value: overview.value.doctorCount, unit: '位', desc: '在册医生字典', icon: 'FirstAidKit', theme: 'cyan' },
  { label: '覆盖省份', value: overview.value.provinceCount, unit: '个', desc: '全国覆盖省份', icon: 'Location', theme: 'green' }
])

const buildQuery = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const word = keyword.value.trim()
  if (word) params.keyword = word
  if (filterCategory.value) params.category = filterCategory.value
  if (filterHospitalId.value) params.hospitalId = String(filterHospitalId.value)
  return params
}

const fetchHospitals = async () => {
  try {
    const res = await getDictHospitalPage({ page: 1, pageSize: 100, status: 1 })
    hospitalOptions.value = res?.list || []
  } catch {
    hospitalOptions.value = []
  }
}

const fetchAreas = async () => {
  try {
    areaOptions.value = await getDictAreaList() || []
  } catch {
    areaOptions.value = []
  }
}

const fetchOverview = async () => {
  try {
    overview.value = (await getDictOverview()) || {}
  } catch {
    overview.value = {}
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getDictDepartmentPage(buildQuery())
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
  filterCategory.value = ''
  filterHospitalId.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)

const createForm = () => ({
  id: '',
  name: '',
  category: '',
  hospitalId: '',
  areaId: '',
  headDoctor: '',
  doctorCount: undefined,
  bedCount: undefined,
  phone: '',
  description: '',
  status: STATUS_ENABLED
})

const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择科室分类', trigger: 'change' }],
  hospitalId: [{ required: true, message: '请选择所属医院', trigger: 'change' }],
  phone: [{ pattern: /^[\d-]{7,15}$/, message: '请输入正确的联系电话', trigger: 'blur' }]
}

// 按所选医院过滤院区
const formAreaOptions = computed(() =>
  form.hospitalId ? areaOptions.value.filter((item) => String(item.hospitalId) === String(form.hospitalId)) : []
)

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
  form.category = row.category || ''
  form.hospitalId = row.hospitalId ? String(row.hospitalId) : ''
  form.areaId = row.areaId ? String(row.areaId) : ''
  form.headDoctor = row.headDoctor || ''
  form.doctorCount = row.doctorCount ?? undefined
  form.bedCount = row.bedCount ?? undefined
  form.phone = row.phone || ''
  form.description = row.description || ''
  form.status = Number(row.status) === STATUS_DISABLED ? STATUS_DISABLED : STATUS_ENABLED
  isEdit.value = true
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 切换医院时清空院区
const handleHospitalChange = () => { form.areaId = '' }

const buildPayload = () => ({
  name: form.name,
  category: form.category || undefined,
  hospitalId: String(form.hospitalId),
  areaId: form.areaId ? String(form.areaId) : undefined,
  headDoctor: form.headDoctor || undefined,
  doctorCount: form.doctorCount === undefined || form.doctorCount === '' ? undefined : Number(form.doctorCount),
  bedCount: form.bedCount === undefined || form.bedCount === '' ? undefined : Number(form.bedCount),
  phone: form.phone || undefined,
  description: form.description || undefined,
  status: form.status
})

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateDictDepartmentById(form.id, buildPayload())
      ElMessage.success('科室信息已更新')
    } else {
      await createDictDepartment(buildPayload())
      ElMessage.success('科室添加成功')
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
  ElMessageBox.confirm(`确认删除科室「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await deleteDictDepartmentById(String(row.id))
      ElMessage.success('科室已删除')
      if (tableData.value.length === 1 && page.value > 1) page.value -= 1
      fetchList()
      fetchOverview()
    } catch (err) {
      ElMessage.error(err?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchHospitals()
  fetchAreas()
  fetchOverview()
  fetchList()
})
</script>
<template>
  <div class="hospital-page">
    <div class="page-header">
      <div>
        <h1>科室管理</h1>
        <p>维护医院科室字典信息</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        添加科室
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
          placeholder="搜索科室名称..."
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterCategory" class="filter-select" size="large" clearable placeholder="全部分类" @change="handleSearch">
          <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
        </el-select>
        <el-select v-model="filterHospitalId" class="filter-select" size="large" clearable placeholder="全部医院" @change="handleSearch">
          <el-option v-for="hospital in hospitalOptions" :key="hospital.id" :label="hospital.name" :value="hospital.id" />
        </el-select>
        <el-button type="primary" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 科室列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>科室列表</h3>
        <span class="table-total">共 {{ total }} 个科室</span>
      </div>
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="科室名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column label="所属医院" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ hospitalNameMap[String(row.hospitalId)] || '-' }}</template>
        </el-table-column>
        <el-table-column label="所属院区" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.areaId ? (areaNameMap[String(row.areaId)] || '-') : '-' }}</template>
        </el-table-column>
        <el-table-column prop="headDoctor" label="科室主任" width="110">
          <template #default="{ row }">{{ row.headDoctor || '-' }}</template>
        </el-table-column>
        <el-table-column label="医生数" width="90" align="center">
          <template #default="{ row }">{{ row.doctorCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="床位数" width="90" align="center">
          <template #default="{ row }">{{ row.bedCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="140">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
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
          <el-empty description="暂无符合条件的科室" :image-size="90" />
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
          <h3>{{ isEdit ? '编辑科室' : '添加科室' }}</h3>
          <p>填写科室基本信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="hospital-form">
        <el-form-item label="科室名称" prop="name" class="full">
          <el-input v-model="form.name" size="large" placeholder="请输入科室名称" />
        </el-form-item>
        <el-form-item label="科室分类" prop="category">
          <el-select v-model="form.category" class="full-control" placeholder="请选择分类">
            <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属医院" prop="hospitalId">
          <el-select
            v-model="form.hospitalId"
            class="full-control"
            placeholder="请选择所属医院"
            @change="handleHospitalChange"
          >
            <el-option v-for="hospital in hospitalOptions" :key="hospital.id" :label="hospital.name" :value="hospital.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属院区" prop="areaId">
          <el-select v-model="form.areaId" class="full-control" clearable placeholder="请选择所属院区（可选）">
            <el-option v-for="area in formAreaOptions" :key="area.id" :label="area.name" :value="area.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室主任" prop="headDoctor">
          <el-input v-model="form.headDoctor" size="large" placeholder="请输入科室主任姓名" />
        </el-form-item>
        <el-form-item label="医生数量" prop="doctorCount">
          <el-input-number v-model="form.doctorCount" :min="0" controls-position="right" class="full-control" placeholder="请输入医生数量" />
        </el-form-item>
        <el-form-item label="床位数量" prop="bedCount">
          <el-input-number v-model="form.bedCount" :min="0" controls-position="right" class="full-control" placeholder="请输入床位数量" />
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
        <el-form-item label="科室简介" prop="description" class="full">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入科室简介" />
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
