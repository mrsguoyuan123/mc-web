<script setup>
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getCsFaq } from '../../../api/index.js'
import { isMissing, safeParseJson } from '../../../utils/index.js'

const props = defineProps({
  surgeryType: { type: String, default: '' }
})

const emit = defineEmits(['fill'])

const keyword = ref('')
const list = ref([])
const loading = ref(false)
const error = ref(false)
const activeId = ref('')
let timer = null

const fetchFaq = async () => {
  loading.value = true
  error.value = false
  try {
    const params = {}
    if (keyword.value) params.keyword = keyword.value
    // 术式取当前患者；不传时服务端返回通用问答
    if (!isMissing(props.surgeryType)) params.surgeryType = props.surgeryType
    const res = await getCsFaq(params)
    list.value = Array.isArray(res) ? res : []
    activeId.value = list.value[0]?.id ? String(list.value[0].id) : ''
  } catch {
    list.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(keyword, () => {
  clearTimeout(timer)
  timer = setTimeout(fetchFaq, 300)
})

watch(
  () => props.surgeryType,
  () => fetchFaq(),
  { immediate: true }
)

const choose = (item) => {
  activeId.value = String(item.id)
}
const current = () => list.value.find((item) => String(item.id) === activeId) || null
const similarQuestions = (item) => safeParseJson(item?.similarQuestionsJson, [])

const fillInput = (item) => {
  if (!isMissing(item?.answer)) emit('fill', item.answer)
}
</script>

<template>
  <div v-loading="loading" class="faq-panel">
    <div class="faq-search">
      <el-icon><Search /></el-icon>
      <input v-model.trim="keyword" type="text" placeholder="检索常用回复..." />
    </div>

    <div v-if="error" class="block-error" @click="fetchFaq">FAQ 加载失败，点击重试</div>

    <template v-else>
      <div v-if="list.length" class="faq-body">
        <div class="faq-questions">
          <button
            v-for="item in list"
            :key="String(item.id)"
            type="button"
            class="faq-question"
            :class="{ active: activeId === String(item.id) }"
            @click="choose(item)"
          >
            {{ item.question }}
          </button>
        </div>
        <div class="faq-answer">
          <template v-if="current()">
            <div class="answer-tags">
              <el-tag v-if="current().category" size="small" effect="plain">
                {{ current().category }}
              </el-tag>
              <el-tag v-if="current().department" size="small" type="info" effect="plain">
                {{ current().department }}
              </el-tag>
            </div>
            <p class="answer-text">{{ current().answer }}</p>
            <ul v-if="similarQuestions(current()).length" class="similar-list">
              <li v-for="(q, i) in similarQuestions(current())" :key="i">{{ q }}</li>
            </ul>
            <el-button type="primary" size="small" class="fill-btn" @click="fillInput(current())">
              填入输入框
            </el-button>
          </template>
          <el-empty v-else description="请选择左侧问题" :image-size="60" />
        </div>
      </div>
      <el-empty v-else description="暂无常用回复" :image-size="70" class="faq-empty" />
    </template>
  </div>
</template>

<style scoped>
.faq-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 360px;
}

.faq-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.faq-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
}

.faq-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.faq-questions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.faq-question {
  padding: 9px 12px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.faq-question.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.faq-answer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  overflow-y: auto;
}

.answer-tags {
  display: flex;
  gap: 6px;
}

.answer-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-line;
}

.similar-list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #64748b;
}

.fill-btn {
  align-self: flex-start;
}

.faq-empty {
  padding: 30px 0;
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
</style>
