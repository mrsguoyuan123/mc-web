<script setup>
import { ref, watch } from 'vue'
import { Cpu } from '@element-plus/icons-vue'
import { getCsPatientAiSummaryById } from '../../../api/index.js'
import { isMissing } from '../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const summary = ref(null)
const loading = ref(false)
const error = ref(false)

const fetchSummary = async (id) => {
  loading.value = true
  error.value = false
  summary.value = null
  try {
    summary.value = await getCsPatientAiSummaryById(id)
  } catch {
    summary.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  (id) => {
    if (id) fetchSummary(String(id))
  },
  { immediate: true }
)

const tags = (data) => (Array.isArray(data?.tags) ? data.tags.filter((tag) => !isMissing(tag)) : [])
</script>

<template>
  <section v-loading="loading" class="ai-card">
    <div class="ai-head">
      <span class="ai-icon"><el-icon><Cpu /></el-icon></span>
      <strong>AI智能总结</strong>
      <el-tag
        v-if="summary?.source === 'MOCK'"
        size="small"
        type="warning"
        effect="plain"
      >
        降级示例
      </el-tag>
      <el-tag v-else-if="summary" size="small" type="success" effect="plain">AI</el-tag>
    </div>

    <div v-if="error" class="block-error" @click="fetchSummary(String(patientId))">
      AI 总结加载失败，点击重试
    </div>
    <template v-else-if="summary && !isMissing(summary.text)">
      <p v-if="tags(summary).length" class="ai-tags">
        <el-tag v-for="tag in tags(summary)" :key="tag" size="small" effect="plain">
          {{ tag }}
        </el-tag>
      </p>
      <p class="ai-text">{{ summary.text }}</p>
    </template>
    <el-empty v-else-if="!loading" description="暂无 AI 总结" :image-size="64" />
  </section>
</template>

<style scoped>
.ai-card {
  padding: 14px 16px;
  background: #fff;
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

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
}

.ai-text {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-line;
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
