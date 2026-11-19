<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, User } from '@element-plus/icons-vue'
import {
  getStaffPage,
  getStaffWorkloadById,
  updateStaffStatusById
} from '../../api/index.js'

const router = useRouter()

// 客服等级（员工 levelOrArea 承载），与员工管理保持一致
const LEVEL_OPTIONS = ['初级客服', '中级客服', '高级客服', '客服主管']
const STATUS_ENABLED = 1
const STATUS_DISABLED = 0
const STATUS_TEXT = { [STATUS_ENABLED]: '启用', [STATUS_DISABLED]: '停用' }

// 筛选
const keyword = ref('')
const filterLevel = ref('')
const filterStatus = ref('')

// 服务端分页与列表（固定查询客服人员）
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
// 每位客服的负载：id -> { userCount, conversationCount, latestCommunicationAt }
const workloadMap = ref({})
// 启停请求中的行
const statusLoadingId = ref('')

const buildQuery = () => {
  const params = { personType: 'CS', page: page.value, pageSize: pageSize.value }
  const word = keyword.value.trim()
  if (word) params.keyword = word
  if (filterStatus.value !== '') params.status = Number(filterStatus.value)
  return params
}

const formatTime = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')

// 拉取当前页客服的负载（负责用户数/会话数/最近沟通时间）
const fetchWorkloads = async (list) => {
  const entries = await Promise.all(
    list.map(async (row) => {
      try {
        const data = await getStaffWorkloadById(String(row.id))
        return [String(row.id), data || {}]
      } catch {
        return [String(row.id), {}]
      }
    })
  )
  workloadMap.value = Object.fromEntries(entries)
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getStaffPage(buildQuery())
    const list = res?.list || []
    tableData.value = list
    total.value = Number(res?.total) || 0
    fetchWorkloads(list)
  } catch {
    tableData.value = []
    total.value = 0
    workloadMap.value = {}
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { page.value = 1; fetchList() }
const handleReset = () => {
  keyword.value = ''
  filterLevel.value = ''
  filterStatus.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 等级为客户端筛选（等级字段 levelOrArea 非接口查询参数）
const filteredData = computed(() =>
  filterLevel.value ? tableData.value.filter((row) => row.levelOrArea === filterLevel.value) : tableData.value
)
const workloadOf = (row) => workloadMap.value[String(row.id)] || {}

// switch 启停：停用前二次确认，提示负责用户交接
const onStatusChange = async (row) => {
  const next = Number(row.status) === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
  const load = workloadOf(row)
  try {
    if (next === STATUS_DISABLED) {
      await ElMessageBox.confirm(
        `停用后 ${row.name} 将无法登录，其当前负责的 ${load.userCount ?? 0} 位用户需要安排交接。`,
        '确认停用客服账号？',
        { type: 'warning', confirmButtonText: '确认停用', cancelButtonText: '取消' }
      )
    } else {
      await ElMessageBox.confirm(
        '启用后该客服可恢复登录、接待咨询和服务权限。',
        '确认启用客服账号？',
        { type: 'info', confirmButtonText: '确认启用', cancelButtonText: '取消' }
      )
    }
  } catch {
    return
  }
  statusLoadingId.value = String(row.id)
  try {
    await updateStaffStatusById(String(row.id), next)
    row.status = next
    ElMessage.success(next === STATUS_ENABLED ? '账号已启用' : '账号已停用')
  } catch (err) {
    ElMessage.error(err?.message || '状态更新失败')
  } finally {
    statusLoadingId.value = ''
  }
}

// 详情抽屉
const detailVisible = ref(false)
const detailRow = ref({})
const openDetail = (row) => {
  detailRow.value = row
  detailVisible.value = true
}
const detailWorkload = computed(() => workloadOf(detailRow.value) || {})

// 服务用户：跳转用户管理仓
const goUserManagement = () => {
  detailVisible.value = false
  router.push('/userManagement')
}

onMounted(() => {
  fetchList()
})
</script>
<template>
  <div class="cs-page">
    <div class="page-header">
      <div>
        <h1>客服管理</h1>
        <p>查看客服服务负载、负责用户和历史沟通概况。</p>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索客服姓名、用户名或手机号"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterLevel" class="filter-select" size="large" clearable placeholder="全部等级">
          <el-option v-for="level in LEVEL_OPTIONS" :key="level" :label="level" :value="level" />
        </el-select>
        <el-select v-model="filterStatus" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 客服列表 -->
    <div class="panel table-card">
      <el-table v-loading="loading" :data="filteredData" stripe>
        <el-table-column label="姓名" min-width="150">
          <template #default="{ row }">
            <div class="name-cell">
              <el-avatar :size="32">{{ (row.name || '-').slice(0, 1) }}</el-avatar>
              <span class="name-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="客服等级" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="row.levelOrArea" type="primary" effect="plain" round size="small">{{ row.levelOrArea }}</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="当前负责用户数" min-width="140" align="center">
          <template #default="{ row }">
            <span class="link-text">{{ workloadOf(row).userCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最近沟通时间" min-width="170">
          <template #default="{ row }">{{ formatTime(workloadOf(row).latestCommunicationAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status) === 1"
              :loading="statusLoadingId === String(row.id)"
              @change="onStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="openDetail(row)">详情</el-button>
            <el-button type="primary" link :icon="User" @click="goUserManagement">服务用户</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的客服" :image-size="90" />
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
    <!-- 客服详情抽屉 -->
    <el-drawer v-model="detailVisible" size="46%" class="cs-drawer" :with-header="false">
      <div class="drawer-wrap">
        <div class="drawer-heading">
          <h2>客服详情 · {{ detailRow.name }}</h2>
          <p>账号、服务负载与最近沟通概况</p>
        </div>

        <div class="detail-panel">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="姓名">{{ detailRow.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="等级">{{ detailRow.levelOrArea || '-' }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ detailRow.username || '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ detailRow.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="负责用户">
              <span class="link-text">{{ detailWorkload.userCount ?? 0 }} 人</span>
            </el-descriptions-item>
            <el-descriptions-item label="最近沟通">
              {{ formatTime(detailWorkload.latestCommunicationAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <el-alert
          class="drawer-tip"
          type="primary"
          :closable="false"
          show-icon
          title="停用客服前应完成负责用户交接，避免用户后续消息无人处理。"
        />

        <div class="drawer-footer">
          <el-button type="primary" size="large" :icon="User" @click="goUserManagement">查看负责用户</el-button>
          <el-button
            size="large"
            :type="Number(detailRow.status) === 1 ? 'danger' : 'primary'"
            :loading="statusLoadingId === String(detailRow.id)"
            @click="onStatusChange(detailRow)"
          >
            {{ Number(detailRow.status) === 1 ? '停用账号' : '启用账号' }}
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.cs-page {
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

.table-card {
  margin-top: 22px;
  padding: 22px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 600;
}

.link-text {
  color: #2563eb;
  font-weight: 600;
}

.text-muted {
  color: #94a3b8;
}

.list-pager {
  margin-top: 18px;
  justify-content: flex-end;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

/* 详情抽屉 */
.drawer-wrap {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 28px 30px;
}

.drawer-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.drawer-heading p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.detail-panel {
  margin-top: 24px;
}

.drawer-tip {
  margin-top: 20px;
}

.drawer-footer {
  margin-top: auto;
  padding-top: 28px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }
}
</style>
