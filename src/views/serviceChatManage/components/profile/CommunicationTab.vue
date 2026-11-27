<script setup>
import { computed, ref, watch } from 'vue'
import { ChatLineSquare, Phone, ArrowRight, Search } from '@element-plus/icons-vue'
import { getPatientCommunicationsById } from '../../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing, toPage } from '../../../../utils/index.js'
import { COMMUNICATION_TYPE_TAG, COMMUNICATION_TYPE_TEXT } from '../../utils.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 渠道筛选：swagger 仅有 MESSAGE/CALL；智能客服/系统记录细分分类待后端确认，先置灰
const activeChannel = ref('')
const keyword = ref('')
const dateRange = ref([])

// 置灰项：待联调确认 messageType/senderType 字段后启用
const disabledPills = [
  { key: 'AI', label: '智能客服' },
  { key: 'SYSTEM', label: '系统记录' }
]

const pills = computed(() => [
  { key: '', label: '全部' },
  { key: 'MESSAGE', label: '聊天' },
  { key: 'CALL', label: '虚拟电话' }
])

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (activeChannel.value) params.channel = activeChannel.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      params.from = String(dateRange.value[0]).slice(0, 10)
      params.to = String(dateRange.value[1]).slice(0, 10)
    }
    const res = await getPatientCommunicationsById(String(props.patientId), params)
    const result = toPage(res)
    list.value = result.list
    total.value = result.total
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  () => {
    resetAndFetch()
  },
  { immediate: true }
)

const resetAndFetch = () => {
  page.value = 1
  fetchData()
}

const switchChannel = (key) => {
  if (activeChannel.value === key) return
  activeChannel.value = key
  resetAndFetch()
}

const handleSearch = () => resetAndFetch()

const handleReset = () => {
  keyword.value = ''
  dateRange.value = []
  activeChannel.value = ''
  resetAndFetch()
}

const handlePageChange = (next) => {
  page.value = next
  fetchData()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  resetAndFetch()
}

const typeText = (type) =>
  COMMUNICATION_TYPE_TEXT[type] || (isMissing(type) ? MISSING_TEXT : type)
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else>
      <div class="panel-head">
        <div>
          <h4>全部沟通记录</h4>
          <p class="section-sub">按时间从近到远 · 共 {{ total }} 条</p>
        </div>
        <div class="pill-group">
          <button
            v-for="pill in pills"
            :key="pill.key"
            type="button"
            class="pill"
            :class="{ active: activeChannel === pill.key }"
            @click="switchChannel(pill.key)"
          >
            {{ pill.label }}
          </button>
          <el-tooltip
            v-for="pill in disabledPills"
            :key="pill.key"
            content="待联调：细分分类字段待后端确认"
            placement="top"
          >
            <span class="pill-wrap">
              <button type="button" class="pill disabled" disabled>{{ pill.label }}</button>
            </span>
          </el-tooltip>
        </div>
      </div>

      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索沟通内容关键字"
          clearable
          class="keyword-input"
          @keyup.enter="handleSearch"
        />
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="date-picker"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <div v-if="list.length" class="record-list">
        <div v-for="(item, index) in list" :key="`${item.time || ''}-${index}`" class="record-card">
          <span class="type-icon" :class="item.type === 'CALL' ? 'is-call' : 'is-message'">
            <el-icon><Phone v-if="item.type === 'CALL'" /><ChatLineSquare v-else /></el-icon>
          </span>
          <div class="record-main">
            <div class="record-head">
              <span class="type-label">{{ typeText(item.type) }}</span>
              <el-tag
                v-if="!isMissing(item.title)"
                size="small"
                :type="COMMUNICATION_TYPE_TAG[item.type] || 'info'"
                effect="plain"
              >
                {{ item.title }}
              </el-tag>
            </div>
            <p class="record-meta">
              <span :class="{ missing: isMissing(item.operator) }">
                {{ isMissing(item.operator) ? MISSING_TEXT : item.operator }}
              </span>
              <span class="dot">·</span>
              <span>{{ isMissing(item.time) ? MISSING_TEXT : formatTime(item.time) }}</span>
            </p>
          </div>
          <div class="record-content" :title="item.content || ''">
            <span :class="{ missing: isMissing(item.content) }">
              {{ isMissing(item.content) ? MISSING_TEXT : item.content }}
            </span>
            <el-icon class="chevron"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无沟通记录" :image-size="90" />

      <div v-if="total > 0" class="pager">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-head h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.section-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.pill-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  padding: 5px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}

.pill.active {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.pill-wrap { display: inline-flex; }

.pill.disabled {
  color: #cbd5e1;
  background: #f8fafc;
  cursor: not-allowed;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.keyword-input {
  width: 220px;
}

.date-picker {
  width: 280px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.type-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  font-size: 18px;
}

.type-icon.is-call {
  background: #dcfce7;
  color: #16a34a;
}

.type-icon.is-message {
  background: #eff6ff;
  color: #2563eb;
}

.record-main {
  flex: 0 0 auto;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.record-meta {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.record-meta .dot {
  color: #cbd5e1;
}

.record-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.record-content > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex: 0 0 auto;
  color: #cbd5e1;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
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