<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 字典项
const categories = ['内科', '外科', '妇产科', '儿科', '五官科', '急诊科', '中医科', '肿瘤科']
const statuses = ['正常', '停用']

const hospitalCampusMap = {
  北京协和医院: ['东院区', '西院区'],
  北京大学人民医院: ['西直门院区', '白塔寺院区'],
  复旦大学附属中山医院: ['总院', '东院分部'],
  广东省人民医院: ['总院', '东病区'],
  温州眼科医院: ['总院', '分院']
}
const hospitalOptions = Object.keys(hospitalCampusMap)

// 模拟数据
const departments = ref([
  { id: 1, name: '心内科', category: '内科', hospital: '北京协和医院', campus: '东院区', director: '张主任', phone: '010-69156114-2101', doctorCount: 25, bedCount: 80, status: '正常', intro: '专注心血管疾病诊疗，拥有先进的介入治疗设备' },
  { id: 2, name: '骨科', category: '外科', hospital: '北京大学人民医院', campus: '西直门院区', director: '李主任', phone: '010-88324600-3201', doctorCount: 30, bedCount: 90, status: '正常', intro: '' },
  { id: 3, name: '妇产科', category: '妇产科', hospital: '复旦大学附属中山医院', campus: '总院', director: '王主任', phone: '021-64041990-6601', doctorCount: 22, bedCount: 60, status: '正常', intro: '' },
  { id: 4, name: '儿科', category: '儿科', hospital: '广东省人民医院', campus: '总院', director: '陈主任', phone: '020-83827812-5501', doctorCount: 18, bedCount: 50, status: '正常', intro: '' },
  { id: 5, name: '眼科', category: '五官科', hospital: '温州眼科医院', campus: '总院', director: '刘主任', phone: '0577-88061366-8801', doctorCount: 20, bedCount: 70, status: '正常', intro: '' },
  { id: 6, name: '神经外科', category: '外科', hospital: '北京协和医院', campus: '西院区', director: '赵主任', phone: '010-69156114-2109', doctorCount: 15, bedCount: 50, status: '正常', intro: '' }
])

// 筛选
const keyword = ref('')
const filterCategory = ref('')
const filterHospital = ref('')

const filteredDepartments = computed(() => {
  const word = keyword.value.trim()
  return departments.value.filter((item) => {
    const matchWord =
      !word ||
      item.name.includes(word) ||
      item.hospital.includes(word) ||
      (item.director || '').includes(word)
    const matchCategory = !filterCategory.value || item.category === filterCategory.value
    const matchHospital = !filterHospital.value || item.hospital === filterHospital.value
    return matchWord && matchCategory && matchHospital
  })
})

// 统计
const stats = computed(() => {
  const totalDoctors = departments.value.reduce((sum, d) => sum + d.doctorCount, 0)
  const totalBeds = departments.value.reduce((sum, d) => sum + d.bedCount, 0)
  return [
    { label: '科室总数', value: departments.value.length, unit: '个', desc: '全部科室', icon: 'stethoscope', theme: 'blue' },
    { label: '医生总数', value: totalDoctors, unit: '名', desc: '在岗医生', icon: 'UserFilled', theme: 'cyan' },
    { label: '床位总数', value: totalBeds, unit: '张', desc: '科室床位', icon: 'FirstAidKit', theme: 'green' },
    { label: '平均医生', value: Math.round(totalDoctors / departments.value.length), unit: '名', desc: '平均每科室', icon: 'User', theme: 'red' }
  ]
})

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: null,
  name: '',
  category: '',
  hospital: '',
  campus: '',
  director: '',
  phone: '',
  doctorCount: 0,
  bedCount: 0,
  status: '正常',
  intro: ''
})

const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择科室分类', trigger: 'change' }],
  hospital: [{ required: true, message: '请选择所属医院', trigger: 'change' }],
  campus: [{ required: true, message: '请选择所属院区', trigger: 'change' }],
  phone: [{ pattern: /^[\d-]{7,20}$/, message: '请输入正确的联系电话', trigger: 'blur' }]
}

const campusOptions = computed(() => hospitalCampusMap[form.hospital] || [])

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  Object.assign(form, row)
  isEdit.value = true
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const onHospitalChange = () => {
  form.campus = ''
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = departments.value.find((item) => item.id === form.id)
      Object.assign(target, form)
      ElMessage.success('科室信息已更新')
    } else {
      departments.value.unshift({ ...form, id: Date.now() })
      ElMessage.success('科室添加成功')
    }
    dialogVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除科室「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    departments.value = departments.value.filter((item) => item.id !== row.id)
    ElMessage.success('科室已删除')
  }).catch(() => {})
}
const { page: dpPage, pageSize: dpSize, pagedData: pagedDepartments, total: dpTotal } = useTablePage(filteredDepartments)
</script>
<template>
  <div class="department-page">
    <div class="page-header">
      <div>
        <h1>科室管理</h1>
        <p>管理医院科室信息</p>
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
            <svg v-if="item.icon === 'stethoscope'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
              <circle cx="20" cy="10" r="2" />
            </svg>
            <el-icon v-else><component :is="item.icon" /></el-icon>
          </span>
          <span class="stat-desc">{{ item.desc }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <div class="card-label">筛选条件</div>
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索科室名称、医院或主任...">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterCategory" class="filter-select" size="large" clearable placeholder="全部分类">
          <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
        </el-select>
        <el-select v-model="filterHospital" class="filter-select" size="large" clearable placeholder="全部医院">
          <el-option v-for="hospital in hospitalOptions" :key="hospital" :label="hospital" :value="hospital" />
        </el-select>
      </div>
    </div>

    <!-- 科室列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>科室列表</h3>
        <span class="table-total">共 {{ filteredDepartments.length }} 个科室</span>
      </div>
      <el-table :data="pagedDepartments" stripe>
        <el-table-column prop="name" label="科室名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column label="所属医院/院区" min-width="200">
          <template #default="{ row }">
            <div class="hospital-cell">
              <span>{{ row.hospital }}</span>
              <small>{{ row.campus }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="director" label="科室主任" width="100" />
        <el-table-column prop="doctorCount" label="医生数" width="90" align="center" />
        <el-table-column prop="bedCount" label="床位数" width="90" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '正常' ? 'success' : 'info'" effect="dark" size="small" round>
              {{ row.status }}
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
        v-model:current-page="dpPage"
        v-model:page-size="dpSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="dpTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="dpPage = 1"
      />
    </div>
    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="640px" class="department-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑科室' : '添加科室' }}</h3>
          <p>{{ isEdit ? '修改科室信息' : '填写科室基本信息' }}</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="department-form">
        <el-form-item label="科室名称" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入科室名称" />
        </el-form-item>
        <el-form-item label="科室分类" prop="category">
          <el-select v-model="form.category" class="full-control" placeholder="请选择分类">
            <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属医院" prop="hospital">
          <el-select v-model="form.hospital" class="full-control" placeholder="请选择医院"
            @change="onHospitalChange">
            <el-option v-for="hospital in hospitalOptions" :key="hospital" :label="hospital" :value="hospital" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属院区" prop="campus">
          <el-select v-model="form.campus" class="full-control" placeholder="请选择院区">
            <el-option v-for="campus in campusOptions" :key="campus" :label="campus" :value="campus" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室主任" prop="director">
          <el-input v-model="form.director" size="large" placeholder="请输入科室主任" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="医生数量" prop="doctorCount">
          <el-input-number v-model="form.doctorCount" :min="0" :controls="false" class="full-control"
            size="large" />
        </el-form-item>
        <el-form-item label="床位数量" prop="bedCount">
          <el-input-number v-model="form.bedCount" :min="0" :controls="false" class="full-control"
            size="large" />
        </el-form-item>
        <el-form-item label="科室简介" prop="intro" class="full">
          <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="请输入科室简介" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" class="full-control">
            <el-option v-for="status in statuses" :key="status" :label="status" :value="status" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.department-page {
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
  font-size: 18px;

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

.hospital-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hospital-cell small {
  font-size: 12px;
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

.department-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.department-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.department-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

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

  .department-form {
    grid-template-columns: 1fr;
  }

  .department-form .full {
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
.el-dialog.department-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>