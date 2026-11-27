<script setup>
import { computed, onMounted, ref } from 'vue'
import { getNotificationPage, getNotificationUnreadCount } from '../../../api/index.js'

const loading = ref(false)
const records = ref([])
const total = ref(0)
const unreadCount = ref(0)

const TYPE_META = {
  MANUAL_SERVICE: '健康管理群新消息',
  SYSTEM: '系统通知',
  ARTICLE: '内容更新',
  RISK: '健康数据异常'
}

const fetchData = async () => {
  loading.value = true
  try {
    const [pageRes, unreadRes] = await Promise.all([
      getNotificationPage({ page: 1, pageSize: 100 }),
      getNotificationUnreadCount().catch(() => ({ count: 0 }))
    ])
    records.value = pageRes?.list || []
    total.value = Number(pageRes?.total) || records.value.length
    unreadCount.value = Number(unreadRes?.count) || records.value.filter((r) => Number(r.isRead) === 0).length
  } catch {
    records.value = []
    total.value = 0
    unreadCount.value = 0
  } finally {
    loading.value = false
  }
}

// 通知模型无失败状态，已落库即视为发送成功
const successCount = computed(() => total.value)
const successRate = computed(() =>
  total.value ? `${Math.round((successCount.value / total.value) * 100)}%` : '0%'
)

const stats = computed(() => [
  { label: '总发送量', value: total.value, tone: '#1f2937' },
  { label: '发送成功', value: successCount.value, tone: '#16a34a' },
  { label: '未读消息', value: unreadCount.value, tone: '#dc2626' },
  { label: '发送成功率', value: successRate.value, tone: '#2563eb' }
])

// 按消息场景（通知类型）聚合
const sceneStats = computed(() => {
  const map = new Map()
  records.value.forEach((row) => {
    const scene = TYPE_META[row.type] || row.title || '其他'
    if (!map.has(scene)) map.set(scene, { scene, sent: 0, unread: 0 })
    const item = map.get(scene)
    item.sent += 1
    if (Number(row.isRead) === 0) item.unread += 1
  })
  return [...map.values()].map((item) => ({
    ...item,
    rate: item.sent ? `${Math.round((item.unread / item.sent) * 100)}%` : '0%'
  }))
})

// 未读高风险用户：优先 RISK 类型未读，不足取其他未读
const highRiskUsers = computed(() => {
  const unread = records.value.filter((row) => Number(row.isRead) === 0)
  const risk = unread.filter((row) => row.type === 'RISK')
  return (risk.length ? risk : unread).slice(0, 5).map((row) => ({
    id: row.id,
    name: `${row.userType} ${String(row.userId).slice(-4)}`,
    scene: TYPE_META[row.type] || row.title
  }))
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div v-loading="loading">
    <!-- 顶部统计 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value" :style="{ color: item.tone }">{{ item.value }}</div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 按场景统计 -->
      <div class="panel scene-card">
        <h3 class="card-title">按消息场景统计</h3>
        <el-table :data="sceneStats" stripe>
          <el-table-column label="消息场景" prop="scene" min-width="180" />
          <el-table-column label="发送量" prop="sent" width="110" align="center" />
          <el-table-column label="未读" width="100" align="center">
            <template #default="{ row }">
              <span :class="{ danger: row.unread > 0 }">{{ row.unread }}</span>
            </template>
          </el-table-column>
          <el-table-column label="未读占比" prop="rate" width="120" align="center" />
          <template #empty>
            <el-empty description="暂无统计数据" :image-size="80" />
          </template>
        </el-table>
      </div>

      <!-- 未读高风险用户 -->
      <div class="panel risk-card">
        <h3 class="card-title">未读高风险用户</h3>
        <div v-if="highRiskUsers.length" class="risk-list">
          <div v-for="user in highRiskUsers" :key="user.id" class="risk-item">
            <el-avatar :size="40" class="risk-avatar">{{ user.name.slice(-2) }}</el-avatar>
            <div class="risk-meta">
              <div class="risk-name">{{ user.name }}</div>
              <div class="risk-scene">{{ user.scene }}</div>
            </div>
            <el-tag type="danger" effect="light" round size="small">未读</el-tag>
          </div>
        </div>
        <el-empty v-else description="暂无未读高风险用户" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<style scoped>

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.stat-card {
  padding: 22px 24px;
}
.stat-label {
  font-size: 14px;
  color: #6b7280;
}
.stat-value {
  margin-top: 12px;
  font-size: 32px;
  font-weight: 700;
}
.content-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
}
.card-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
}
.scene-card,
.risk-card {
  padding: 22px;
}
.danger {
  color: #dc2626;
  font-weight: 600;
}
.risk-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.risk-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #f1f3f7;
  border-radius: 12px;
}
.risk-avatar {
  background: #fee2e2;
  color: #dc2626;
  flex-shrink: 0;
}
.risk-meta {
  flex: 1;
  min-width: 0;
}
.risk-name {
  font-size: 14px;
  font-weight: 600;
}
.risk-scene {
  margin-top: 2px;
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
@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
