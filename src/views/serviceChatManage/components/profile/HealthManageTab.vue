<script setup>
import { computed, ref, watch } from 'vue'
import { getPatientHealthSummaryById } from '../../../../api/index.js'
import HealthModuleCard from './HealthModuleCard.vue'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const summary = ref(null)

// 默认近 30 天窗口（YYYY-MM-DD）；from/to 口径待联调确认
const buildRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  const fmt = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return { from: fmt(from), to: fmt(to) }
}

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    summary.value = await getPatientHealthSummaryById(
      String(props.patientId),
      buildRange()
    )
  } catch {
    summary.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  () => fetchData(),
  { immediate: true }
)

const emptyModule = () => ({ latest: {}, trend: [] })
const mod = (key) => summary.value?.[key] || emptyModule()

const modules = computed(() => [
  { key: 'diet', title: '饮食分析' },
  { key: 'exercise', title: '运动分析' },
  { key: 'weight', title: '体重动态' },
  { key: 'bloodGlucose', title: '血糖' },
  { key: 'bloodPressure', title: '血压' },
  { key: 'tumorMarkers', title: '肿瘤标志物' },
  { key: 'bloodRoutine', title: '血常规' },
  { key: 'liverFunction', title: '肝功能 / 白蛋白' },
  { key: 'sleep', title: '睡眠管理' }
])
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else-if="summary">
      <p v-if="summary.from || summary.to" class="range-tip">
        统计窗口：{{ summary.from || '-' }} 至 {{ summary.to || '-' }}
      </p>
      <div class="module-grid">
        <HealthModuleCard
          v-for="item in modules"
          :key="item.key"
          :title="item.title"
          :module="mod(item.key)"
          :class="{ wide: ['bloodGlucose', 'liverFunction'].includes(item.key) }"
        />
      </div>
    </template>

    <el-empty v-else-if="!loading" description="暂无健康管理数据" :image-size="90" />
  </div>
</template>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.range-tip {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.module-card.wide {
  grid-column: 1 / -1;
}

.block-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
