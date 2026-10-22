<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const roles = ['客服', '驻点', '健康照护师']
const serviceLevels = ['初级客服', '中级客服', '高级客服']
const roleTag = { 客服: 'primary', 驻点: 'info', 健康照护师: 'success' }

// 模拟员工数据
const staffList = ref([
  { id: 1, name: '张小美', role: '客服', level: '高级客服', username: 'zhangxm', phone: '13800138001', enabled: true },
  { id: 2, name: '李小华', role: '客服', level: '中级客服', username: 'lixh', phone: '13800138002', enabled: true },
  { id: 3, name: '王驻点', role: '驻点', level: '', provinces: 2, departments: 3, username: 'wangzd', phone: '13800138003', enabled: false },
  { id: 4, name: '赵客服', role: '客服', level: '初级客服', username: 'zhaokf', phone: '13800138004', enabled: true },
  { id: 5, name: '刘驻点', role: '驻点', level: '', provinces: 2, departments: 3, username: 'liuzd', phone: '13800138005', enabled: true },
  { id: 6, name: '孙健康照护师', role: '健康照护师', level: '', provinces: 1, departments: 2, username: 'sunhg', phone: '13800138006', enabled: true },
  { id: 7, name: '周护理', role: '健康照护师', level: '', provinces: 1, departments: 2, username: 'zhouhl', phone: '13800138007', enabled: true }
])

// 搜索与角色筛选
const keyword = ref('')
const filterRole = ref('')

const filteredStaff = computed(() => {
  const word = keyword.value.trim()
  return staffList.value.filter((s) => {
    const matchWord =
      !word ||
      [s.name, s.username, s.phone].some((v) => v.includes(word))
    const matchRole = !filterRole.value || s.role === filterRole.value
    return matchWord && matchRole
  })
})

// 等级/负责区域展示
const scopeText = (row) =>
  row.role === '客服'
    ? row.level
    : `省份: ${row.provinces} 个  科室: ${row.departments} 个`

// 账号开关
const onStatusChange = (row) => {
  ElMessage.success(`${row.name} 账号已${row.enabled ? '开启' : '关闭'}`)
}

// 添加/编辑弹窗
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: null,
  name: '',
  phone: '',
  username: '',
  role: '客服',
  level: '初级客服'
})
const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    phone: row.phone,
    username: row.username,
    role: row.role,
    level: row.level || '初级客服'
  })
  isEdit.value = true
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = staffList.value.find((s) => s.id === form.id)
      Object.assign(target, {
        name: form.name,
        phone: form.phone,
        username: form.username,
        role: form.role,
        level: form.role === '客服' ? form.level : ''
      })
      ElMessage.success('员工信息已更新')
    } else {
      staffList.value.unshift({
        ...form,
        level: form.role === '客服' ? form.level : '',
        provinces: form.role === '客服' ? undefined : 0,
        departments: form.role === '客服' ? undefined : 0,
        enabled: true,
        id: Date.now()
      })
      ElMessage.success('员工添加成功')
    }
    dialogVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除员工「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    staffList.value = staffList.value.filter((s) => s.id !== row.id)
    ElMessage.success('员工已删除')
  }).catch(() => {})
}
const { page: smPage, pageSize: smSize, pagedData: pagedStaffList, total: smTotal } = useTablePage(filteredStaff)
</script>
<template>
  <div class="staff-page">
    <div class="page-header">
      <div>
        <h1>员工管理</h1>
        <p>管理客服和驻点员工，设置账号状态</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        添加员工
      </el-button>
    </div>

    <!-- 搜索筛选 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索员工姓名、用户名或电话...">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterRole" class="filter-select" size="large" clearable placeholder="全部角色">
          <el-option v-for="role in roles" :key="role" :label="role" :value="role" />
        </el-select>
      </div>
    </div>

    <!-- 员工列表 -->
    <div class="panel table-card">
      <el-table :data="pagedStaffList" stripe>
        <el-table-column prop="name" label="姓名" min-width="130" show-overflow-tooltip />
        <el-table-column label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="roleTag[row.role]" size="small" effect="dark" round>{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级/负责区域" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.role === '客服'" size="small" effect="plain" round>{{ row.level }}</el-tag>
            <span v-else class="scope-text">{{ scopeText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column label="账号状态" width="140" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="onStatusChange(row)" />
            <span class="status-text" :class="{ on: row.enabled, off: !row.enabled }">
              {{ row.enabled ? '开启' : '关闭' }}
            </span>
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
          <el-empty description="暂无符合条件的员工" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="smPage"
        v-model:page-size="smSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="smTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="smPage = 1"
      />
    </div>
    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="560px" class="staff-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑员工信息' : '添加员工' }}</h3>
          <p>{{ isEdit ? `编辑 ${form.name} 的员工信息` : '填写员工基本信息' }}</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="staff-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" size="large" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" class="full-control" placeholder="请选择角色">
            <el-option v-for="role in roles" :key="role" :label="role" :value="role" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === '客服'" label="客服等级" prop="level" class="full">
          <el-select v-model="form.level" class="full-control" placeholder="请选择客服等级">
            <el-option v-for="level in serviceLevels" :key="level" :label="level" :value="level" />
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
.staff-page {
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

/* 筛选区 */
.filter-card {
  margin-top: 22px;
  padding: 20px 22px;
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

.scope-text {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.7;
  white-space: pre-line;
}

.status-text {
  margin-left: 8px;
  font-size: 13px;
}

.status-text.on {
  color: #16a34a;
}

.status-text.off {
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

.staff-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.staff-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.staff-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .staff-form {
    grid-template-columns: 1fr;
  }

  .staff-form .full {
    grid-column: 1;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.staff-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>