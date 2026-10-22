<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const statuses = ['正常', '停用']
const hospitalOptions = ['北京协和医院', '北京大学人民医院', '复旦大学附属中山医院']

// 模拟数据
const campuses = ref([
  { id: 1, name: '东院区', hospital: '北京协和医院', address: '北京市东城区帅府园一号', phone: '010-69156114', bedCount: 1200, status: '正常', intro: '' },
  { id: 2, name: '西院区', hospital: '北京协和医院', address: '北京市西城区大木仓胡同41号', phone: '010-69156115', bedCount: 800, status: '正常', intro: '' },
  { id: 3, name: '总院', hospital: '复旦大学附属中山医院', address: '上海市徐汇区枫林路180号', phone: '021-64041990', bedCount: 600, status: '正常', intro: '' },
  { id: 4, name: '南院区', hospital: '北京大学人民医院', address: '北京市西城区西直门南大街11号', phone: '010-88324600', bedCount: 1300, status: '正常', intro: '' },
  { id: 5, name: '北院区', hospital: '北京大学人民医院', address: '北京市昌平区生命园路11号', phone: '010-88324601', bedCount: 500, status: '正常', intro: '' }
])

// 筛选
const keyword = ref('')
const filterHospital = ref('')

const filteredCampuses = computed(() => {
  const word = keyword.value.trim()
  return campuses.value.filter((item) => {
    const matchWord =
      !word ||
      item.name.includes(word) ||
      item.hospital.includes(word) ||
      item.address.includes(word)
    const matchHospital = !filterHospital.value || item.hospital === filterHospital.value
    return matchWord && matchHospital
  })
})

// 统计
const stats = computed(() => {
  const totalBeds = campuses.value.reduce((sum, c) => sum + c.bedCount, 0)
  return [
    { label: '院区总数', value: campuses.value.length, unit: '个', desc: '全部院区', icon: 'OfficeBuilding', theme: 'blue' },
    { label: '关联医院', value: new Set(campuses.value.map((c) => c.hospital)).size, unit: '家', desc: '关联医疗机构', icon: 'FirstAidKit', theme: 'cyan' },
    { label: '床位总数', value: totalBeds, unit: '张', desc: '院区床位总量', icon: 'Location', theme: 'green' },
    { label: '平均床位', value: Math.round(totalBeds / campuses.value.length), unit: '张', desc: '平均每院区', icon: 'LocationInformation', theme: 'red' }
  ]
})

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: null,
  name: '',
  hospital: '',
  address: '',
  phone: '',
  bedCount: 0,
  status: '正常',
  intro: ''
})

const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入院区名称', trigger: 'blur' }],
  hospital: [{ required: true, message: '请选择所属医院', trigger: 'change' }],
  phone: [{ pattern: /^[\d-]{7,20}$/, message: '请输入正确的联系电话', trigger: 'blur' }]
}

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

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = campuses.value.find((item) => item.id === form.id)
      Object.assign(target, form)
      ElMessage.success('院区信息已更新')
    } else {
      campuses.value.unshift({ ...form, id: Date.now() })
      ElMessage.success('院区添加成功')
    }
    dialogVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除院区「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    campuses.value = campuses.value.filter((item) => item.id !== row.id)
    ElMessage.success('院区已删除')
  }).catch(() => {})
}
const { page: caPage, pageSize: caSize, pagedData: pagedCampuses, total: caTotal } = useTablePage(filteredCampuses)
</script>
<template>
  <div class="campus-page">
    <div class="page-header">
      <div>
        <h1>院区管理</h1>
        <p>管理医院院区信息</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        添加院区
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
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索院区名称、医院或地址...">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterHospital" class="filter-select" size="large" clearable placeholder="全部医院">
          <el-option v-for="hospital in hospitalOptions" :key="hospital" :label="hospital" :value="hospital" />
        </el-select>
      </div>
    </div>

    <!-- 院区列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>院区列表</h3>
        <span class="table-total">共 {{ filteredCampuses.length }} 个院区</span>
      </div>
      <el-table :data="pagedCampuses" stripe>
        <el-table-column prop="name" label="院区名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="hospital" label="所属医院" min-width="170" show-overflow-tooltip />
        <el-table-column prop="address" label="地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="床位数" width="100" align="center">
          <template #default="{ row }">{{ row.bedCount }} 张</template>
        </el-table-column>
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
          <el-empty description="暂无符合条件的院区" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="caPage"
        v-model:page-size="caSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="caTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="caPage = 1"
      />
    </div>
    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="640px" class="campus-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑院区' : '添加院区' }}</h3>
          <p>填写院区基本信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="campus-form">
        <el-form-item label="院区名称" prop="name">
          <el-input v-model="form.name" size="large" placeholder="如：东院区" />
        </el-form-item>
        <el-form-item label="所属医院" prop="hospital">
          <el-select v-model="form.hospital" class="full-control" placeholder="请选择医院">
            <el-option v-for="hospital in hospitalOptions" :key="hospital" :label="hospital" :value="hospital" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细地址" prop="address" class="full">
          <el-input v-model="form.address" size="large" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="床位数量" prop="bedCount">
          <el-input-number v-model="form.bedCount" :min="0" :controls="false" class="full-control"
            size="large" />
        </el-form-item>
        <el-form-item label="简介" prop="intro" class="full">
          <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="请输入院区简介" />
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
.campus-page {
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
  width: 200px;
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

.campus-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.campus-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.campus-form .el-form-item__label) {
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

  .campus-form {
    grid-template-columns: 1fr;
  }

  .campus-form .full {
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
.el-dialog.campus-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>