<script setup>
import { computed, ref } from 'vue'
import { testKbSearch } from '../../../api/index.js'
import { MISSING_TEXT, isMissing } from '@/utils/index.js'

const query = ref('')
const loading = ref(false)
const results = ref([])
// idle 未测试 / hit 命中 / miss 未命中 / error 请求失败（区分“没命中”和“没请求到”）
const state = ref('idle')

const canSubmit = computed(() => query.value.trim().length > 0 && !loading.value)

const normalizeScore = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return MISSING_TEXT
  const percent = Math.abs(num) <= 1 ? num * 100 : num
  return `${Math.round(percent * 10) / 10}%`
}

const runTest = async () => {
  const keyword = query.value.trim()
  if (!keyword || loading.value) return
  // 每次测试先清空上一次结果
  results.value = []
  loading.value = true
  try {
    const res = await testKbSearch({ query: keyword, topK: 5 })
    const list = Array.isArray(res) ? res : []
    if (!list.length) {
      state.value = 'miss'
    } else {
      results.value = list
        .slice()
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 5)
      state.value = 'hit'
    }
  } catch {
    // 失败不误报“未命中”，也不弹全局 message，只在结果区呈现
    state.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="search-test-tab">
    <div class="panel test-panel">
      <div class="section-head">
        <h3 class="section-title">
          <el-icon class="section-icon"><Search /></el-icon>
          检索测试
        </h3>
        <p class="section-subtitle">
          模拟用户提问，验证智能客服能否从知识库中命中正确答案。
        </p>
      </div>

      <div class="input-row">
        <el-input
          v-model="query"
          class="test-input"
          size="large"
          clearable
          placeholder="例如：怀孕初期应该注意什么？"
          @keyup.enter="runTest"
        />
        <el-button
          type="primary"
          size="large"
          :disabled="!canSubmit"
          :loading="loading"
          @click="runTest"
        >
          开始测试
        </el-button>
      </div>

      <div v-loading="loading" class="result-area">
        <template v-if="state === 'hit'">
          <div v-for="(hit, index) in results" :key="String(hit.entry?.id || index)" class="hit-card">
            <div class="hit-head">
              <span class="hit-score">匹配分 {{ normalizeScore(hit.score) }}</span>
              <el-tag
                v-if="!isMissing(hit.entry?.department)"
                size="small"
                type="info"
                effect="plain"
              >
                {{ hit.entry.department }}
              </el-tag>
            </div>
            <div class="hit-question">{{ hit.entry?.question || MISSING_TEXT }}</div>
            <div class="hit-answer">{{ hit.entry?.answer || MISSING_TEXT }}</div>
          </div>
        </template>

        <div v-else-if="state === 'miss'" class="miss-box">
          <el-icon class="miss-icon"><QuestionFilled /></el-icon>
          <div class="miss-title">未命中任何知识</div>
          <div class="miss-sub">
            建议前往「未解决问题」新增这条问答，或补充文档知识。
          </div>
        </div>

        <div v-else-if="state === 'error'" class="error-box">
          <span class="missing">{{ MISSING_TEXT }}</span>
        </div>

        <el-empty v-else description="输入问题后开始检索测试" :image-size="100" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-head {
  margin-bottom: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.section-icon {
  color: #2563eb;
}

.section-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.input-row {
  display: flex;
  gap: 12px;
}

.test-input {
  flex: 1;
}

.result-area {
  min-height: 240px;
  margin-top: 20px;
}

.hit-card {
  padding: 16px 18px;
  margin-bottom: 14px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #f9fafb;
}

.hit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.hit-score {
  font-size: 13px;
  font-weight: 600;
  color: #16a34a;
}

.hit-question {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.hit-answer {
  font-size: 13px;
  line-height: 1.8;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-word;
}

.miss-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  background: #fff7ed;
  text-align: center;
}

.miss-icon {
  font-size: 34px;
  color: #ea580c;
  margin-bottom: 12px;
}

.miss-title {
  font-size: 16px;
  font-weight: 700;
  color: #9a3412;
}

.miss-sub {
  margin-top: 8px;
  font-size: 13px;
  color: #c2410c;
}

.error-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border-radius: 10px;
  background: #f8fafc;
}

.missing {
  color: #f56c6c;
}
</style>
