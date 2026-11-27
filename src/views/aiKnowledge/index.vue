<script setup>
import { onMounted, ref } from 'vue'
import OverviewTab from './components/OverviewTab.vue'
import EntryTab from './components/EntryTab.vue'
import DocumentTab from './components/DocumentTab.vue'
import UnresolvedTab from './components/UnresolvedTab.vue'
import SearchTestTab from './components/SearchTestTab.vue'
import TrainPublishTab from './components/TrainPublishTab.vue'
import { getKbOverview } from '../../api/index.js'
import { isMissing } from '@/utils/index.js'

const activeTab = ref('overview')
const pendingCount = ref(0)
const focusId = ref('')
const unresolvedKey = ref(0)

const tabs = [
  { name: 'overview', label: '数据概览', icon: 'DataAnalysis' },
  { name: 'entry', label: '问答知识', icon: 'ChatDotRound' },
  { name: 'document', label: '文档知识', icon: 'Document' },
  { name: 'unresolved', label: '未解决问题', icon: 'QuestionFilled' },
  { name: 'search', label: '检索测试', icon: 'Search' },
  { name: 'train', label: '训练与发布', icon: 'Promotion' }
]

const fetchBadge = async () => {
  try {
    const res = await getKbOverview()
    pendingCount.value = isMissing(res?.unresolvedPending) ? 0 : Number(res.unresolvedPending) || 0
  } catch {
    pendingCount.value = 0
  }
}

// 概览卡/单条「处理」：空串切 Tab；带 id 时切 Tab 并交给 UnresolvedTab 高亮
const handleGoUnresolved = (id) => {
  focusId.value = id === null || id === undefined ? '' : String(id)
  // 重新挂载未解决 Tab，保证相同 focusId 连续点击也能再次定位高亮
  unresolvedKey.value += 1
  activeTab.value = 'unresolved'
}

onMounted(() => {
  fetchBadge()
})
</script>

<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h1>智能客服知识库</h1>
      <p>维护问答与文档知识，处理未解决问题，并通过训练发布持续优化智能客服。</p>
    </div>

    <el-tabs v-model="activeTab" class="kb-tabs">
      <el-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name">
        <template #label>
          <span class="tab-label">
            <el-icon><component :is="tab.icon" /></el-icon>
            {{ tab.label }}
            <el-badge
              v-if="tab.name === 'unresolved' && pendingCount > 0"
              :value="pendingCount"
              class="tab-badge"
              type="danger"
            />
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <OverviewTab v-if="activeTab === 'overview'" @go-unresolved="handleGoUnresolved" />
    <EntryTab v-else-if="activeTab === 'entry'" />
    <DocumentTab v-else-if="activeTab === 'document'" />
    <UnresolvedTab
      v-else-if="activeTab === 'unresolved'"
      :key="`unresolved-${unresolvedKey}`"
      :focus-id="focusId"
      @badge-change="fetchBadge"
    />
    <SearchTestTab v-else-if="activeTab === 'search'" />
    <TrainPublishTab v-else />
  </div>
</template>

<style scoped>
.knowledge-page {
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

.kb-tabs {
  margin-top: 16px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.tab-badge {
  margin-left: 4px;
}

:deep(.tab-badge .el-badge__content) {
  transform: translateY(-2px) translateX(100%);
}
</style>
