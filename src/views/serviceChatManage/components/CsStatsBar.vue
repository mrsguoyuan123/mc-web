<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ChatDotRound,
  ChatLineRound,
  Clock,
  Star,
  Timer,
  TrendCharts,
  WarningFilled
} from '@element-plus/icons-vue'
import { getConversationStats, getCsStats } from '../../../api/index.js'
import { MISSING_TEXT, isMissing } from '../../../utils/index.js'

// 工作台统计：getCsStats 仅回 highIntent / pendingCall / pendingReply 三项
const stats = ref(null)
// 会话统计：总会话数/紧急/答复率/平均响应秒数，覆盖设计稿中 /cs/stats 未提供的四项
const convStats = ref(null)
const loading = ref(false)
const error = ref(false)

const fetchStats = async () => {
  loading.value = true
  error.value = false
  try {
    const [csResult, convResult] = await Promise.allSettled([
      getCsStats(),
      getConversationStats()
    ])
    if (csResult.status === 'fulfilled') stats.value = csResult.value
    if (convResult.status === 'fulfilled') convStats.value = convResult.value
    // 主统计失败才展示整体重试；会话统计失败时四项走缺失兜底
    if (csResult.status === 'rejected') error.value = true
  } catch {
    stats.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)

defineExpose({ refresh: fetchStats })

// 平均响应秒数 → 展示口径：满 60 秒换算为分钟（与设计稿「8分」一致），否则显示秒
const formatResponseTime = (seconds) => {
  if (isMissing(seconds)) return null
  const num = Number(seconds)
  if (Number.isNaN(num)) return null
  return num >= 60 ? `${Math.round(num / 60)}分` : `${num}秒`
}

// 数值走千分位；字符串（如换算后的「8分」）原样展示
const formatStatValue = (value) => {
  if (typeof value === 'number') return value.toLocaleString()
  const num = Number(value)
  return Number.isNaN(num) ? String(value) : num.toLocaleString()
}

// 真实三项 + 设计稿四项缺口（缺口主数值显示红色「接口未提供」，禁止伪造）
const cards = computed(() => {
  const data = stats.value || {}
  const conv = convStats.value || {}
  return [
    {
      label: '高意向患者',
      value: data.highIntent,
      icon: Star,
      tone: 'blue',
      sub: '购买意向为高'
    },
    {
      label: '待沟通患者',
      value: data.pendingCall,
      icon: Clock,
      tone: 'orange',
      sub: '沟通状态待沟通'
    },
    {
      label: '待回复会话',
      value: data.pendingReply,
      icon: ChatLineRound,
      tone: 'red',
      sub: '患者末条消息未读'
    },
    {
      // 总会话数：取 conversation 统计端点（/cs/stats 未覆盖）
      label: '总会话数',
      value: conv.total,
      icon: ChatDotRound,
      tone: 'gray',
      sub: '当前活跃会话'
    },
    {
      // 紧急消息：取 conversation 统计的 urgent 会话数
      label: '紧急消息',
      value: conv.urgent,
      icon: WarningFilled,
      tone: 'red',
      sub: '优先处理'
    },
    {
      // 答复率：replyRate 0-100（接口注释标明当前为占位口径，以后端正式统计为准）
      label: '答复率',
      value: conv.replyRate,
      icon: TrendCharts,
      tone: 'green',
      sub: '待后端补字段',
      suffix: '%'
    },
    {
      // 平均答复时间：avgResponseSeconds 由秒换算分/秒
      label: '平均答复时间',
      value: formatResponseTime(conv.avgResponseSeconds),
      icon: Timer,
      tone: 'purple',
      sub: '响应速度'
    }
  ]
})
</script>

<template>
  <section v-loading="loading" class="stats-grid">
    <template v-if="!error">
      <div v-for="card in cards" :key="card.label" class="stat-card">
        <div class="stat-head">
          <span class="stat-label">{{ card.label }}</span>
          <el-icon class="stat-icon" :class="`tone-${card.tone}`">
            <component :is="card.icon" />
          </el-icon>
        </div>
        <strong class="stat-value" :class="`tone-${card.tone}`">
          <template v-if="!isMissing(card.value)">
            {{ formatStatValue(card.value) }}<small v-if="card.suffix">{{ card.suffix }}</small>
          </template>
          <span v-else class="missing">{{ MISSING_TEXT }}</span>
        </strong>
        <span class="stat-sub">{{ card.sub }}</span>
      </div>
    </template>
    <div v-else class="block-error" @click="fetchStats">统计加载失败，点击重试</div>
  </section>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-icon {
  font-size: 18px;
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
}

.stat-value small {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 600;
}

.stat-value .missing {
  font-size: 12px;
  font-weight: 500;
}

.stat-sub {
  font-size: 12px;
  color: #94a3b8;
}

.tone-blue {
  color: #2563eb;
}

.tone-orange {
  color: #f59e0b;
}

.tone-red {
  color: #ef4444;
}

.tone-green {
  color: #16a34a;
}

.tone-purple {
  color: #8b5cf6;
}

.tone-gray {
  color: #64748b;
}

.missing {
  color: #ef4444;
}

.block-error {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
