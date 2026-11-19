<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Edit, Key } from '@element-plus/icons-vue'
import {
  getStaffPage,
  createStaff,
  updateStaffById,
  updateStaffStatusById,
  resetStaffPasswordById,
  replaceStaffRolesById,
  getRolePage
} from '../../api/index.js'

// 弹窗人员类型：客服 CS / 陪诊师 CAREGIVER / 普通员工 GENERAL
const PERSON_TYPE_OPTIONS = [
  { value: 'CS', label: '客服' },
  { value: 'CAREGIVER', label: '陪诊师' },
  { value: 'GENERAL', label: '普通员工' }
]
// 列表筛选用完整四类（AGENTS.md 枚举）
const PERSON_TYPE_FILTER = [
  { value: 'CS', label: '客服' },
  { value: 'CAREGIVER', label: '陪诊师' },
  { value: 'GENERAL', label: '普通员工' },
  { value: 'DOCTOR', label: '医生' }
]
// 等级下拉：初级/中级/高级客服 + 客服主管
const LEVEL_OPTIONS = ['初级客服', '中级客服', '高级客服', '客服主管']
// 仅客服有等级；陪诊师/普通员工改为负责区域输入框
const isCustomerService = computed(() => form.personType === 'CS')
const personTypeLabel = (value) =>
  PERSON_TYPE_FILTER.find((item) => item.value === value)?.label || value || '-'
const STATUS_TEXT = { 1: '启用', 0: '停用' }

// 权限角色下拉 GET /roles（启用角色，PC 端可选；id 为雪花 ID 字符串）
const roleOptions = ref([])
const roleNameMap = computed(() => {
  const map = {}
  roleOptions.value.forEach((role) => { map[role.id] = role.name })
  return map
})

// 服务端分页与列表
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 筛选
const keyword = ref('')
const filterPersonType = ref('')
const filterRoleId = ref('')
const filterStatus = ref('')

const buildQuery = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const word = keyword.value.trim()
  if (word) params.keyword = word
  if (filterPersonType.value) params.personType = filterPersonType.value
  // 雪花 ID 始终字符串，不转数字
  if (filterRoleId.value) params.roleId = String(filterRoleId.value)
  if (filterStatus.value !== '') params.status = Number(filterStatus.value)
  return params
}

const fetchRoles = async () => {
  try {
    const res = await getRolePage({ page: 1, pageSize: 100, status: 1 })
    roleOptions.value = res?.list || []
  } catch {
    roleOptions.value = []
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getStaffPage(buildQuery())
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
  filterPersonType.value = ''
  filterRoleId.value = ''
  filterStatus.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 权限角色标签：roleAssignments 优先，回退主角色
const roleTagsOf = (row) => {
  if (Array.isArray(row.roleAssignments) && row.roleAssignments.length) {
    return row.roleAssignments.map(
      (item) => item.roleName || roleNameMap.value[item.roleId] || item.roleCode || item.roleId
    )
  }
  return row.role ? [row.role] : []
}
const formatTime = (value) => (value ? String(value).replace('T', ' ').slice(0, 19) : '-')

// 新增/编辑共用弹窗
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)

const createForm = () => ({
  id: '',
  name: '',
  phone: '',
  username: '',
  password: '',
  roleId: '',
  personType: 'CS',
  level: '',
  area: '',
  email: '',
  status: 1
})
const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择权限角色', trigger: 'change' }],
  personType: [{ required: true, message: '请选择人员类型', trigger: 'change' }]
}

const resetForm = () => Object.assign(form, createForm())

// 切换人员类型时清空不适用的等级/负责区域，避免脏数据提交
const handlePersonTypeChange = (value) => {
  if (value === 'CS') {
    form.area = ''
  } else {
    form.level = ''
  }
}

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  resetForm()
  isEdit.value = true
  form.id = String(row.id)
  form.name = row.name || ''
  form.phone = row.phone || ''
  form.username = row.username || ''
  form.personType = row.personType || 'CS'
  form.email = row.email || ''
  form.status = Number(row.status) === 0 ? 0 : 1
  // levelOrArea 兼容“等级”或“负责区域”单值；department 为负责区域
  if (form.personType === 'CS') {
    form.level = LEVEL_OPTIONS.includes(row.levelOrArea) ? row.levelOrArea : ''
    form.area = ''
  } else {
    form.level = ''
    form.area = row.department || row.levelOrArea || ''
  }
  // 单选回显：取主角色（primaryFlag=1）否则第一个，保持字符串 id
  const assignments = Array.isArray(row.roleAssignments) ? row.roleAssignments : []
  const primary = assignments.find((item) => Number(item.primaryFlag) === 1) || assignments[0]
  form.roleId = primary ? String(primary.roleId) : ''
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 等级 + 负责区域合并到 levelOrArea（单字段承载，按截图“等级/负责区域”）
const mergeLevelOrArea = () => form.level || form.area || ''
// 角色全量替换载荷（roleId 雪花字符串）
const buildAssignments = () => (form.roleId ? [{ roleId: String(form.roleId) }] : [])

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    const basePayload = {
      username: form.username,
      name: form.name,
      phone: form.phone,
      personType: form.personType,
      levelOrArea: mergeLevelOrArea(),
      department: form.area || undefined,
      email: form.email,
      status: form.status
    }
    if (isEdit.value) {
      // 编辑：基础信息接口（密码不在此处理）
      await updateStaffById(form.id, basePayload)
      // 角色全量替换 PUT /staff/{id}/roles
      await replaceStaffRolesById(form.id, buildAssignments())
      // 编辑态填写了新密码才调用重置密码接口
      if (form.password) {
        await resetStaffPasswordById(form.id, form.password)
      }
      ElMessage.success('员工信息已更新')
    } else {
      const newId = await createStaff({
        ...basePayload,
        password: form.password || undefined,
        roleAssignments: buildAssignments()
      })
      if (form.roleId && newId) {
        await replaceStaffRolesById(String(newId), buildAssignments())
      }
      ElMessage.success('员工添加成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 启停账号
const statusLoadingId = ref('')
const onStatusChange = async (row) => {
  const next = Number(row.status) === 1 ? 0 : 1
  statusLoadingId.value = String(row.id)
  try {
    await updateStaffStatusById(String(row.id), next)
    row.status = next
    ElMessage.success(`账号已${next === 1 ? '启用' : '停用'}`)
  } catch (err) {
    row.status = next === 1 ? 0 : 1
    ElMessage.error(err?.message || '状态更新失败')
  } finally {
    statusLoadingId.value = ''
  }
}

// 表格行内重置密码
const handleResetPassword = (row) => {
  ElMessageBox.prompt(`将为「${row.name}」重置登录密码，请输入新密码（留空则使用默认密码 123456）`, '重置密码', {
    confirmButtonText: '确认重置',
    cancelButtonText: '取消',
    inputPattern: /^$|^[\S]{6,20}$/,
    inputErrorMessage: '密码长度需为 6-20 位',
    inputPlaceholder: '新密码（可留空）'
  }).then(async ({ value }) => {
    try {
      await resetStaffPasswordById(String(row.id), value || '123456')
      ElMessage.success(`密码重置成功，新密码已发送至${row.phone}`)
    } catch (err) {
      ElMessage.error(err?.message || '密码重置失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchRoles()
  fetchList()
})
</script>

﻿<template>
  <div class="staff-page">
    <div class="page-header">
      <div>
        <h1>员工管理</h1>
        <p>管理员工账号、权限角色、人员类型和账号状态。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAdd">新增员工</el-button>
    </div>

    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          placeholder="搜索员工姓名、用户名或手机号"
          clearable
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select v-model="filterRoleId" class="filter-select" placeholder="全部权限角色" clearable @change="handleSearch">
          <el-option v-for="role in roleOptions" :key="role.id" :label="role.name" :value="role.id" />
        </el-select>
        <el-select v-model="filterPersonType" class="filter-select" placeholder="全部人员类型" clearable @change="handleSearch">
          <el-option v-for="item in PERSON_TYPE_FILTER" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filterStatus" class="filter-select" placeholder="全部状态" clearable @change="handleSearch">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>
    </div>

    <div class="panel table-card">
      <el-table v-loading="loading" :data="tableData" style="width: 100%">
        <el-table-column label="姓名" min-width="110">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-avatar :size="30">{{ (row.name || '-').slice(0, 1) }}</el-avatar>
              <span style="font-weight:600">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限角色" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="tag in roleTagsOf(row)" :key="tag" size="small" class="role-tag" type="primary">{{ tag }}</el-tag>
            <span v-if="roleTagsOf(row).length === 0" style="color:#94a3b8">-</span>
          </template>
        </el-table-column>
        <el-table-column label="人员类型" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ personTypeLabel(row.personType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级/负责区域" min-width="160">
          <template #default="{ row }">
            <span class="scope-text">{{ row.levelOrArea || row.department || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户名" prop="username" min-width="120" />
        <el-table-column label="电话" prop="phone" min-width="130" />
        <el-table-column label="账号状态" min-width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status) === 1"
              :loading="statusLoadingId === String(row.id)"
              @change="onStatusChange(row)"
            />
            <span class="status-text" :class="Number(row.status) === 1 ? 'on' : 'off'">
              {{ STATUS_TEXT[Number(row.status)] || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.joinDate || row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button type="warning" link :icon="Key" @click="handleResetPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的员工" :image-size="90" />
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

    <!-- 新增/编辑共用弹窗 -->
    <el-dialog v-model="dialogVisible" width="720px" class="staff-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? `编辑员工 · ${form.name}` : '新增员工' }}</h3>
          <p>{{ isEdit ? '更新员工权限角色、人员类型与负责范围。' : '填写员工基本信息并分配权限角色。' }}</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="staff-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" size="large" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item :label="isEdit ? '重置密码' : '初始密码'">
          <el-input
            v-model="form.password"
            size="large"
            :placeholder="isEdit ? '无需重置可留空' : '留空默认 123456'"
            show-password
          />
        </el-form-item>
        <el-form-item label="权限角色" prop="roleId">
          <el-select v-model="form.roleId" class="full-control" placeholder="请选择权限角色（单选）">
            <el-option v-for="role in roleOptions" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="人员类型" prop="personType">
          <el-select
            v-model="form.personType"
            class="full-control"
            placeholder="请选择人员类型"
            @change="handlePersonTypeChange"
          >
            <el-option v-for="item in PERSON_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isCustomerService" label="等级">
          <el-select v-model="form.level" class="full-control" clearable placeholder="请选择等级">
            <el-option v-for="level in LEVEL_OPTIONS" :key="level" :label="level" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="负责区域">
          <el-input v-model="form.area" size="large" placeholder="如：东城区、朝阳区" />
        </el-form-item>
        <el-form-item label="账号状态" class="full">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="允许员工登录系统" inline-prompt />
        </el-form-item>
        <el-alert
          class="full staff-tip"
          type="info"
          :closable="false"
          show-icon
          title="权限与身份相互独立"
          description="权限角色决定员工可以访问哪些菜单和接口；人员类型用于区分客服、陪诊师等员工业务身份，用户服务关系不在此处维护。"
        />
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认新增' }}
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

.role-tag {
  margin: 2px 4px 2px 0;
}

.staff-tip {
  margin-top: 4px;
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
