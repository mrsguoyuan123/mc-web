<script setup>
import { ref, watch } from 'vue'
import { MagicStick } from '@element-plus/icons-vue'
import { getCsPatientAiPredictionById } from '../../../api/index.js'
import { isMissing } from '../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const prediction = ref(null)
const loading = ref(false)
const error = ref(false)

const fetchPrediction = async (id) => {
  loading.value = true
  error.value = false
  prediction.value = null
  try {
    prediction.value = await getCsPatientAiPredictionById(id)
  } catch {
    prediction.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  (id) => {
    if (id) fetchPrediction(String(id))
  },
  { immediate: true }
)

const suggestions = (data) =>
  Array.isArray(data?.suggestions)
    ? data.suggestions.filter((item) => !isMissing(item))
    : []
</script>

<template>
  <section v-loading="loading" class="ai-card predict-card">
    <div class="ai-head">
      <span class="ai-icon"><el-icon><MagicStick /></el-icon></span>
      <strong>AI 沟通预判</strong>
      <el-tag
        v-if="prediction?.source === 'MOCK'"
        size="small"
        type="warning"
        effect="plain"
      >
        降级示例
      </el-tag>
    </div>

    <div v-if="error" class="block-error" @click="fetchPrediction(String(patientId))">
      AI 预判加载失败，点击重试
    </div>
    <ul v-else-if="suggestions(prediction).length" class="suggestion-list">
      <li v-for="(item, index) in suggestions(prediction)" :key="index" class="suggestion-item">
        <span class="dot"></span>
        <span>{{ item }}</span>
      </li>
    </ul>
    <el-empty v-else-if="!loading" description="暂无沟通建议" :image-size="64" />
  </section>
</template>

<style scoped>
.predict-card {
  background: linear-gradient(180deg, #faf5ff 0%, #ffffff 60%);
}

.ai-card {
  padding: 14px 16px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-head strong {
  font-size: 14px;
  color: #1f2937;
}

.ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.1);
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
}

.dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  background: #7c3aed;
}

.block-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}
</style>
