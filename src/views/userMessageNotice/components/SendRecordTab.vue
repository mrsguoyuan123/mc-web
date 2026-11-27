<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNotificationPage, markNotificationReadById, markAllNotificationsRead } from '../../../api/index.js'

// 发送状态/渠道在通知模型上无独立字段，按 type/isRead 映射展示
const TYPE_META = {
  MANUAL_SERVICE: { label: '人工服务提醒', scene: '健康管理群新消息' },
  SYSTEM: { label: '系统信息', scene: '系统通知' },
  ARTICLE: { label: '资料更新', scene: '内容更新' },
  RISK: { label: '风险预警', scene: '健康数据异常' }
}
const typeLabel = (value) => TYPE_META[value]?.label || value || '-'
const sceneOf = (row) => TYPE_META[row.type]?.scene || row.title || '-'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const keyword = ref('')
const filterType = ref('')
const filterRead = ref('')

const buildQuery = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  if (filterType.value) params.type = filterType.value
  if (filterRead.value !== '') params.isRead = Number(filterRead.value)
  return params
}

const formatTime = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')

// 关键词客户端过滤（接口无 keyword 参数）
const filteredData = () => {
  const word = keyword.value.trim()
  if (!word) return tableData.value
  return tableData.value.filter((row) =>
    [row.title, row.content, sceneOf(row)].filter(Boolean).some((v) => String(v).includes(word))
  )
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getNotificationPage(buildQuery())
    tableData.value = res?.list || []
    total.value = Number(res?.total) || 0
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '发送记录加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { page.value = 1; fetchList() }
const handleReset = () => {
  keyword.value = ''
  filterType.value = ''
  filterRead.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

const markRead = async (row) => {
  if (Number(row.isRead) === 1) return
  try {
    await markNotificationReadById(String(row.id))
    row.isRead = 1
    ElMessage.success('已标记为已读')
  } catch (err) {
    ElMessage.error(err?.message || '操作失败')
  }
}

const markAllRead = async () => {
  try {
    await ElMessageBox.confirm('确认将当前账号全部通知标记为已读？', '全部已读', {
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await markAllNotificationsRead()
    ElMessage.success('已全部标记为已读')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '操作失败')
  }
}

onMounted(() => {
  fetchList()
})
</script>
<template>
  <div>
    <div class="panel filter-card">
      <div class="filter-row">
        <div>
          <el-input v-model="keyword" class="search-input" size="" clearable placeholder="搜索用户、模板、场景或渠道">
            <template #prefix><el-icon>
                <Search />
              </el-icon></template>
          </el-input>
          <el-select v-model="filterType" class="filter-select" size="" clearable placeholder="全部状态"
            @change="handleSearch">
            <el-option label="成功" value="MANUAL_SERVICE" />
            <el-option label="失败" value="SYSTEM" />
            <el-option label="待发送" value="ARTICLE" />
            
          </el-select>
          <el-select v-model="filterRead" class="filter-select" size="" clearable placeholder="全部阅读状态"
            @change="handleSearch">
            <el-option label="未读" :value="0" />
            <el-option label="已读" :value="1" />
          </el-select>
        </div>
        <div>
          <el-button type="primary" size="" @click="handleSearch">查询</el-button>
          <el-button size="" @click="handleReset">重置</el-button>
          <el-button size="" @click="markAllRead">全部已读</el-button>
        </div>
      </div>
    </div>

    <div class="panel table-card">
      <el-table v-loading="loading" :data="filteredData()" stripe>
        <el-table-column label="消息编号" width="120">
          <template #default="{ row }">MR{{ String(row.id).slice(-6) }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="110">
          <template #default="{ row }">{{ row.userType }} · {{ String(row.userId).slice(-4) }}</template>
        </el-table-column>
        <el-table-column label="消息场景" min-width="150">
          <template #default="{ row }">{{ sceneOf(row) }}</template>
        </el-table-column>
        <el-table-column label="模板" prop="title" min-width="180" show-overflow-tooltip />
        <el-table-column label="推送渠道" min-width="130">
          <template #default>消息Tab红点 / 站内信</template>
        </el-table-column>
        <el-table-column label="发送时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="发送方式" width="110" align="center">
          <template #default>系统自动</template>
        </el-table-column>
        <el-table-column label="发送状态" width="100" align="center">
          <template #default>
            <el-tag type="success" effect="light" round size="small">成功</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="阅读状态" width="100" align="center">
          <template #default="{ row }">
            <el-button link :type="Number(row.isRead) === 1 ? 'info' : 'danger'" @click="markRead(row)">
              <el-icon style="margin-right:4px">
                <ChatDotRound v-if="Number(row.isRead) === 1" />
                <Bell v-else />
              </el-icon>
              {{ Number(row.isRead) === 1 ? '已读' : '未读' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="跳转" min-width="140">
          <template #default="{ row }">{{ row.bizId ? `业务 #${String(row.bizId).slice(-4)}` : '查看详情' }}</template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无发送记录" :image-size="90" />
        </template>
      </el-table>

      <el-pagination class="list-pager" background :current-page="page" :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange" @size-change="handleSizeChange" />
    </div>
  </div>
</template>

<style scoped>
.filter-card {
  margin-top: 16px;
  padding: 18px 22px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.search-input {
  width: 250px;
  max-width: 100%;
}

.filter-select {
  width: 170px;
}

.table-card {
  margin-top: 18px;
  padding: 22px;
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

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
