<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Key, CopyDocument, Delete, Lock } from '@element-plus/icons-vue'
import { getRolePage, updateRoleStatusById, deleteRoleById } from '../../api/index.js'
import { MISSING_TEXT, isMissing, TERMINAL_TEXT, DATA_SCOPE_TEXT, formatTime } from './utils.js'
import RoleEditDrawer from './components/RoleEditDrawer.vue'

// 筛选条件（服务端分页，参数透传）
const query = reactive({
  keyword: '',
  terminal: '',
  status: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 关键词防抖
let keywordTimer = null

const buildParams = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const keyword = query.keyword.trim()
  if (keyword) params.keyword = keyword
  if (query.terminal) params.terminal = query.terminal
  if (query.status !== '') params.status = Number(query.status)
  return params
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getRolePage(buildParams())
    tableData.value = Array.isArray(res?.list) ? res.list : []
    total.value = Number(res?.total) || 0
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const onKeywordInput = () => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    page.value = 1
    fetchList()
  }, 350)
}

const onFilterChange = () => {
  page.value = 1
  fetchList()
}

const handleReset = () => {
  query.keyword = ''
  query.terminal = ''
  query.status = ''
  page.value = 1
  fetchList()
}

const handlePageChange = (value) => {
  page.value = value
  fetchList()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  page.value = 1
  fetchList()
}

/* ---------------- 行标记与字段展示 ---------------- */

const isSystemRole = (row) => Number(row.system) === 1
const isDashboardRole = (row) => row.baseRole === 'DASHBOARD'

const terminalTagType = (terminal) => {
  if (terminal === 'PC') return 'primary'
  if (terminal === 'MOBILE') return 'success'
  return 'info'
}

const dataScopeText = (row) => {
  if (isMissing(row.dataScope)) return MISSING_TEXT
  return DATA_SCOPE_TEXT[row.dataScope] || row.dataScope
}

// 权限数量：优先后端统计字段，其次行内权限码数组长度；均无则显示「接口未提供」，不臆造
const permissionCount = (row) => {
  if (!isMissing(row.permissionCount)) return row.permissionCount
  if (!isMissing(row.permissionTotal)) return row.permissionTotal
  if (Array.isArray(row.permissionCodes)) return row.permissionCodes.length
  if (Array.isArray(row.permissions)) return row.permissions.length
  return MISSING_TEXT
}

// 关联账号：后端返回 accountCount 时显示数量；未返回时显示「查看」入口（R2 抽屉关联员工页签取数）
const accountCount = (row) => {
  if (!isMissing(row.accountCount)) return Number(row.accountCount)
  if (!isMissing(row.userCount)) return Number(row.userCount)
  return null
}

const hasLinkedAccounts = (row) => (accountCount(row) ?? 0) > 0

/* ---------------- 角色配置抽屉（编辑 / 复制 / 新增） ---------------- */

const drawerVisible = ref(false)
const drawerRoleId = ref(null)
const drawerMode = ref('edit')
const drawerTab = ref('basic')

// mode：edit 编辑 / copy 复制 / create 新增；tab：basic/permission/data/staff
const openDrawer = (mode, row = null, tab = 'basic') => {
  drawerMode.value = mode
  drawerRoleId.value = row?.id ? String(row.id) : null
  drawerTab.value = tab
  drawerVisible.value = true
}

const handleDrawerSaved = () => {
  drawerVisible.value = false
  fetchList()
}

// 停用必须二次确认；启用直接调用
const toggleStatus = async (row) => {
  const enabling = Number(row.status) === 0
  if (!enabling) {
    const linked = accountCount(row) ?? 0
    try {
      await ElMessageBox.confirm(
        `停用「${row.name}」后，关联的 ${linked} 个账号将失去该角色权限。确认继续吗？`,
        '确认停用角色',
        {
          type: 'warning',
          confirmButtonText: '确认停用',
          cancelButtonText: '取消',
          confirmButtonClass: 'el-button--danger'
        }
      )
    } catch {
      return
    }
  }
  try {
    await updateRoleStatusById(String(row.id), enabling ? 1 : 0)
    ElMessage.success(enabling ? '角色已启用' : '角色已停用')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '操作失败，请稍后重试')
  }
}

const handleDelete = async (row) => {
  if (isSystemRole(row) || hasLinkedAccounts(row)) return
  try {
    await ElMessageBox.confirm(
      `删除「${row.name}」后将无法恢复，相关权限配置也会一并移除。确定删除该角色吗？`,
      '删除角色',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }
  try {
    await deleteRoleById(String(row.id))
    ElMessage.success('角色已删除')
    if (tableData.value.length === 1 && page.value > 1) page.value -= 1
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '删除失败，请稍后重试')
  }
}

onMounted(() => {
  fetchList()
})

onBeforeUnmount(() => {
  clearTimeout(keywordTimer)
})
</script>

<template>
  <div class="role-manage-page">
    <div class="page-header">
      <div>
        <h1>角色管理</h1>
        <p>管理角色权限、数据范围和关联账号。</p>
      </div>
      <el-button class="create-btn" :icon="Plus" @click="openDrawer('create')">新增角色</el-button>
    </div>

    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="query.keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索角色名称或角色编码"
          @input="onKeywordInput"
          @clear="onFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="query.terminal"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部适用端"
          @change="onFilterChange"
        >
          <el-option label="电脑端" value="PC" />
          <el-option label="手机端" value="MOBILE" />
          <el-option label="全部" value="ALL" />
        </el-select>
        <el-select
          v-model="query.status"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部状态"
          @change="onFilterChange"
        >
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button size="large" :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </div>

    <div class="panel table-card">
      <div class="table-head">
        <span class="total-text">共 {{ total }} 个角色</span>
        <span class="effect-tip">权限变更保存后即时生效</span>
      </div>

      <el-table v-loading="loading" :data="tableData" stripe row-key="id" class="role-table">
        <el-table-column label="角色名称" min-width="180">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="role-name">{{ isMissing(row.name) ? MISSING_TEXT : row.name }}</span>
              <el-tag v-if="isSystemRole(row)" type="info" effect="dark" size="small" class="flag-tag">
                <el-icon class="tag-icon"><Lock /></el-icon>系统内置
              </el-tag>
              <el-tag v-if="isDashboardRole(row)" type="warning" size="small" class="flag-tag">仅看板</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="角色编码" min-width="170">
          <template #default="{ row }">
            <span v-if="isMissing(row.code)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else class="code-tag">{{ row.code }}</span>
          </template>
        </el-table-column>

        <el-table-column label="适用端" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="!isMissing(row.terminal)"
              :type="terminalTagType(row.terminal)"
              :class="{ 'terminal-mobile': row.terminal === 'MOBILE' }"
              effect="light"
              size="small"
            >
              {{ TERMINAL_TEXT[row.terminal] || row.terminal }}
            </el-tag>
            <span v-else class="missing">{{ MISSING_TEXT }}</span>
          </template>
        </el-table-column>

        <el-table-column label="数据范围" min-width="120">
          <template #default="{ row }">
            <span :class="{ missing: isMissing(row.dataScope) }">{{ dataScopeText(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="权限数量" min-width="90" align="center">
          <template #default="{ row }">
            <span :class="{ missing: permissionCount(row) === MISSING_TEXT }">{{ permissionCount(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="关联账号" min-width="100" align="center">
          <template #default="{ row }">
            <el-button v-if="accountCount(row) === null" link type="primary" @click="openDrawer('edit', row, 'staff')">
              查看
            </el-button>
            <el-button v-else link type="primary" class="count-link" @click="openDrawer('edit', row, 'staff')">
              {{ accountCount(row) }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="90" align="center">
          <template #default="{ row }">
            <span class="status-cell" :class="Number(row.status) === 1 ? 'is-on' : 'is-off'">
              <i class="status-dot"></i>{{ Number(row.status) === 1 ? '启用' : '停用' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" min-width="150">
          <template #default="{ row }">
            <span v-if="formatTime(row.updateTime)">{{ formatTime(row.updateTime) }}</span>
            <span v-else class="missing">{{ MISSING_TEXT }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="op-cell">
              <el-button link type="primary" :icon="Edit" @click="openDrawer('edit', row)">编辑</el-button>
              <el-button link type="primary" :icon="Key" @click="openDrawer('edit', row, 'permission')">权限配置</el-button>
              <el-button link type="primary" :icon="CopyDocument" @click="openDrawer('copy', row)">复制</el-button>
              <el-button link @click="toggleStatus(row)">
                {{ Number(row.status) === 1 ? '停用' : '启用' }}
              </el-button>
              <el-tooltip
                v-if="hasLinkedAccounts(row)"
                content="存在关联账号"
                placement="top"
              >
                <span class="delete-wrap">
                  <el-button link type="danger" :icon="Delete" disabled>删除</el-button>
                </span>
              </el-tooltip>
              <el-button
                v-else-if="!isSystemRole(row)"
                link
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
              >删除</el-button>
              <el-tooltip v-else content="系统内置角色不可删除" placement="top">
                <span class="delete-wrap">
                  <el-button link type="danger" :icon="Delete" disabled>删除</el-button>
                </span>
              </el-tooltip>
              <span v-if="hasLinkedAccounts(row)" class="linked-tip">存在关联账号</span>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="当前无角色" :image-size="90" />
        </template>
      </el-table>

      <el-pagination
        class="list-pager"
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <RoleEditDrawer
      :visible="drawerVisible"
      :role-id="drawerRoleId"
      :mode="drawerMode"
      :active-tab="drawerTab"
      @close="drawerVisible = false"
      @saved="handleDrawerSaved"
    />
  </div>
</template>

<style scoped>
.role-manage-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.create-btn.el-button {
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.create-btn.el-button:hover,
.create-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
  color: #fff;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 420px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

.table-card {
  padding: 12px 16px 16px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 12px;
}

.total-text {
  font-size: 14px;
  color: #374151;
}

.effect-tip {
  font-size: 12px;
  color: #9ca3af;
}

.missing {
  color: #ef4444;
  font-size: 13px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.role-name {
  font-weight: 600;
  color: #111827;
}

.flag-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.tag-icon {
  font-size: 12px;
}

.code-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

/* 手机端标签：紫色（Element 无紫色 type，自定义覆盖） */
.terminal-mobile.el-tag {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #7c3aed;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-cell.is-on {
  color: #059669;
}

.status-cell.is-on .status-dot {
  background: #10b981;
}

.status-cell.is-off {
  color: #9ca3af;
}

.status-cell.is-off .status-dot {
  background: #d1d5db;
}

.op-cell {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

.op-cell .el-button {
  margin-left: 0;
}

.delete-wrap {
  display: inline-flex;
}

.linked-tip {
  margin-left: 4px;
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.count-link {
  font-weight: 600;
}

.list-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 1100px) {
  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
