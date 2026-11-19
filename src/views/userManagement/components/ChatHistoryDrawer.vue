<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Search, Refresh, ChatRound, Phone, ChatDotRound, Document } from '@element-plus/icons-vue'
import { getPatientCommunicationsById } from '../../../api/index.js'
import { displayText, formatTime, toPage } from '../utils.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'loaded'])

// 渠道/角色元数据：MESSAGE 消息 / CALL 电话；其余角色占位
const CHANNEL_META = {
  MESSAGE: { label: '消息', type: 'primary', icon: ChatRound, color: '#409eff' },
  CALL: { label: '电话', type: 'success', icon: Phone, color: '#67c23a' },
  CS: { label: '客服', type: 'info', icon: ChatRound, color: '#67c23a' },
  DOCTOR: { label: '医生', type: 'info', icon: ChatRound, color: '#e6a23c' },
  ESCORT: { label: '陪诊师', type: 'info', icon: ChatRound, color: '#14b8a6' },
  STATION: { label: '驻点', type: 'info', icon: ChatRound, color: '#909399' },
  BOT: { label: '智能客服', type: 'warning', icon: ChatDotRound, color: '#7c3aed' },
  USER: { label: '用户', type: 'info', icon: ChatRound, color: '#409eff' }
}

// Tab：渠道 + 角色（角色字段待后端下发；渠道 MESSAGE/CALL 已可用）
const TABS = [
  { label: '全部', value: '' },
  { label: '消息', value: 'MESSAGE' },
  { label: '电话', value: 'CALL' },
  { label: '用户', value: 'USER' },
  { label: '客服', value: 'CS' },
  { label: '医生', value: 'DOCTOR' },
  { label: '陪诊师', value: 'ESCORT' },
  { label: '驻点', value: 'STATION' },
  { label: '智能客服', value: 'BOT' }
]

const loading = ref(false)
const list = ref([])
const total = ref(0)
// 群成员：接口未返回成员前为空数组占位
const members = ref([])
const lastChatTime = ref('')

const query = reactive({
  tab: '',
  keyword: '',
  dateRange: [],
  page: 1,
  pageSize: 10
})

const patient = computed(() => props.record || {})
const patientId = computed(() => (patient.value.id ? String(patient.value.id) : ''))

const typeMeta = (item) =>
  CHANNEL_META[item.type] || CHANNEL_META[item.channel] || CHANNEL_META[item.role] ||
  { label: '沟通', type: 'info', icon: ChatRound, color: '#909399' }

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const avatarText = (name) => (name ? String(name).trim().charAt(0) : '?')

function formatFileSize(value) {
  const size = Number(value)
  if (!size || Number.isNaN(size)) return '-'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

const buildParams = () => {
  const params = { page: query.page, pageSize: query.pageSize }
  if (query.tab) params.channel = query.tab
  if (query.tab) params.role = query.tab
  const keyword = query.keyword.trim()
  if (keyword) params.keyword = keyword
  const [from, to] = query.dateRange || []
  if (from) params.from = from
  if (to) params.to = to
  return params
}

const resetState = () => {
  list.value = []
  total.value = 0
  members.value = []
  lastChatTime.value = ''
  query.tab = ''
  query.keyword = ''
  query.dateRange = []
  query.page = 1
}

const loadList = async () => {
  if (!patientId.value) {
    resetState()
    return
  }
  loading.value = true
  try {
    const res = await getPatientCommunicationsById(patientId.value, buildParams())
    const pageResult = toPage(res)
    list.value = pageResult.list
    total.value = pageResult.total
    // 群成员：消息体里携带发送人时去重生成；接口未返回成员字段则保持空
    members.value = buildMembers(pageResult.list)
    const latest = [...list.value].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0]
    lastChatTime.value = latest?.time || ''
    emit('loaded', { total: pageResult.total })
  } catch {
    list.value = []
    total.value = 0
    members.value = []
    lastChatTime.value = ''
  } finally {
    loading.value = false
  }
}

// 由消息发送人去重生成群成员卡片；无角色/名字字段时返回空
function buildMembers(msgList) {
  const map = new Map()
  for (const msg of msgList) {
    const name = msg.operator || msg.senderName
    const role = msg.role || msg.senderRole || msg.type
    if (!name || !role) continue
    const key = `${role}-${name}`
    if (!map.has(key)) map.set(key, { id: key, name, role })
  }
  return Array.from(map.values())
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    query.page = 1
    loadList()
  }
)

const onSearch = () => {
  query.page = 1
  loadList()
}

const onReset = () => {
  query.tab = ''
  query.keyword = ''
  query.dateRange = []
  query.page = 1
  loadList()
}

const onTabChange = () => {
  query.page = 1
  loadList()
}

const onPageChange = (page) => {
  query.page = page
  loadList()
}

const onSizeChange = (size) => {
  query.pageSize = size
  query.page = 1
  loadList()
}

const onClose = () => emit('update:visible', false)
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    size="46%"
    :close-on-click-modal="false"
    class="chat-history-drawer"
    @close="onClose"
  >
    <div class="drawer-wrap">
      <!-- 顶部概要 -->
      <div class="chat-header">
        <div class="chat-title-row">
          <div class="chat-title">{{ displayText(patient.name) }}—沟通记录</div>
          <el-button text @click="onClose">关闭</el-button>
        </div>
        <div class="chat-subtitle">只读查看用户完整沟通历史，不支持编辑、删除或撤回。</div>
        <div class="chat-meta">
          <div class="chat-meta-item">
            <div class="chat-meta-label">服务客服</div>
            <div class="chat-meta-value">{{ displayText(patient.matchedCsName) }}</div>
          </div>
          <div class="chat-meta-item">
            <div class="chat-meta-label">所属驻点</div>
            <div class="chat-meta-value">{{ displayText(patient.stationName || patient.matchedStationId) }}</div>
          </div>
          <div class="chat-meta-item">
            <div class="chat-meta-label">最近沟通时间</div>
            <div class="chat-meta-value">{{ lastChatTime ? formatTime(lastChatTime) : '-' }}</div>
          </div>
          <div class="chat-meta-item">
            <div class="chat-meta-label">消息数量</div>
            <div class="chat-meta-value">{{ total }} 条</div>
          </div>
        </div>
      </div>

      <!-- 群成员 -->
      <div class="chat-section">
        <div class="section-title">群成员 · {{ members.length }}</div>
        <div v-if="members.length" class="member-grid">
          <div v-for="member in members" :key="member.id" class="member-card">
            <div class="member-avatar" :style="{ backgroundColor: typeMeta(member).color }">
              {{ avatarText(member.name) }}
            </div>
            <div class="member-name">{{ displayText(member.name) }}</div>
            <el-tag size="small" :type="typeMeta(member).type">
              {{ typeMeta(member).label }}
            </el-tag>
          </div>
        </div>
        <el-empty v-else description="暂无群成员" :image-size="80" />
      </div>

      <!-- 筛选：Tab + 日期区间 + 关键词 -->
      <div class="chat-section">
        <div class="filter-bar">
          <el-radio-group v-model="query.tab" @change="onTabChange">
            <el-radio-button v-for="tab in TABS" :key="tab.value" :value="tab.value">
              {{ tab.label }}
            </el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="date-range"
          />
          <el-input
            v-model="query.keyword"
            placeholder="搜索发送人或消息关键词"
            clearable
            class="keyword-input"
            :prefix-icon="Search"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
          <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
        </div>
      </div>

      <!-- 时间线消息流 -->
      <div class="timeline-wrap" v-loading="loading">
        <el-empty v-if="!loading && list.length === 0" description="暂无沟通记录" :image-size="90" />
        <el-timeline v-else class="chat-timeline">
          <el-timeline-item
            v-for="item in list"
            :key="item.id || `${item.time}-${item.type}-${item.title}`"
            :timestamp="formatTime(item.time)"
            placement="top"
            :type="typeMeta(item).type"
          >
            <div class="timeline-card">
              <div class="timeline-head">
                <el-tag :type="typeMeta(item).type" effect="light" size="small">
                  <el-icon class="tag-icon"><component :is="typeMeta(item).icon" /></el-icon>
                  {{ typeMeta(item).label }}
                </el-tag>
                <span class="timeline-title">{{ displayText(item.title) }}</span>
              </div>
              <div class="timeline-operator">客服：{{ displayText(item.operator) }}</div>
              <div v-if="item.type === 'FILE'" class="file-message">
                <el-icon class="file-icon"><Document /></el-icon>
                <span class="file-name">{{ displayText(item.fileName) }}</span>
                <span class="file-size">{{ formatFileSize(item.fileSize) }}</span>
              </div>
              <div v-else-if="item.content" class="timeline-content">{{ displayText(item.content) }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div class="pagination-bar" v-if="total > 0">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 0 4px 12px;
}

.chat-header {
  padding: 16px 18px;
  background: #fff;
  border-radius: 10px;
}

.chat-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.chat-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.chat-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.chat-meta-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.chat-meta-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.chat-section {
  padding: 14px 18px;
  background: #fff;
  border-radius: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.member-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  border-radius: 50%;
  font-size: 17px;
  flex-shrink: 0;
}

.member-name {
  font-size: 13px;
  color: #303133;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.date-range {
  width: 260px;
}

.keyword-input {
  width: 200px;
}

.timeline-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.chat-timeline {
  padding: 8px 4px 0;
}

.timeline-card {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  transition: box-shadow 0.2s ease;
}

.timeline-card:hover {
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.08);
}

.timeline-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-icon {
  margin-right: 2px;
  vertical-align: -1px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.timeline-operator {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.timeline-content {
  margin-top: 6px;
  font-size: 13px;
  color: #1f2937;
  line-height: 1.6;
  word-break: break-all;
}

.file-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.file-icon {
  font-size: 18px;
  color: #409eff;
}

.file-name {
  color: #303133;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 12px 0;
}

@media (max-width: 900px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .date-range,
  .keyword-input {
    width: 100%;
  }
  .member-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .chat-meta {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
