<script setup>
import { ref } from 'vue'
import MessageTemplateTab from './components/MessageTemplateTab.vue'
import SendRecordTab from './components/SendRecordTab.vue'
import ReadStatTab from './components/ReadStatTab.vue'
import TriggerRuleTab from './components/TriggerRuleTab.vue'

const activeTab = ref('template')
const tabs = [
  { name: 'template', label: '消息模板', icon: 'Document' },
  { name: 'records', label: '发送记录', icon: 'Promotion' },
  { name: 'stats', label: '已读/未读统计', icon: 'View' },
  { name: 'rules', label: '触发规则', icon: 'Bell' }
]
</script>

<template>
  <div class="umn-page">
    <div class="page-header">
      <h1>用户消息通知</h1>
      <p>管理小程序用户消息模板、发送记录、已读/未读统计与红点触发规则。</p>
    </div>

    <el-tabs v-model="activeTab" class="umn-tabs">
      <el-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name">
        <template #label>
          <span class="tab-label">
            <el-icon><component :is="tab.icon" /></el-icon>
            {{ tab.label }}
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <MessageTemplateTab v-if="activeTab === 'template'" />
    <SendRecordTab v-else-if="activeTab === 'records'" />
    <ReadStatTab v-else-if="activeTab === 'stats'" />
    <TriggerRuleTab v-else />
  </div>
</template>

<style scoped>
.umn-page {
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

.umn-tabs {
  margin-top: 16px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
