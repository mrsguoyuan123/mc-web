<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Search, Refresh, ChatRound, Phone } from '@element-plus/icons-vue'
import { getPatientCommunicationsById } from '../../../api/index.js'
import { displayText, formatTime, toPage } from '../utils.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'loaded'])

// 接口未就绪前统一使用空数组 + 加载态，统计/指标缺省显示 0 或 -
const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  channel: '',
  keyword: '',
  dateRange: [],
  page: 1,
  pageSize: 10
})

const patient = computed(() => props.record || {})
const patientId = computed(() => (patient.value.id ? String(patient.value.id) : ''))

const channelOptions = [
  { label: '全部渠道', value: '' },
  { label: '消息', value: 'MESSAGE' },
  { label: '电话', value: 'CALL' }
]

const channelMeta = {
  MESSAGE: { label: '消息', type: 'primary', icon: ChatRound },
  CALL: { label: '电话', type: 'success', icon: Phone }
}

const typeMeta = (item) =>
  channelMeta[item.type] || channelMeta[item.channel] || { label: '沟通', type: 'info', icon: ChatRound }

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const buildParams = () => {
  const params = {
    page: query.page,
    pageSize: query.pageSize
  }
  if (query.channel) params.channel = query.channel
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
  query.channel = ''
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
    const page = toPage(res)
    list.value = page.list
    total.value = page.total
    emit('loaded', { total: page.total })
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
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
  query.channel = ''
  query.keyword = ''
  query.dateRange = []
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
    :title="`沟通记录 · ${displayText(patient.name)}`"
    direction="rtl"
    size="46%"
    :close-on-click-modal="false"
    class="chat-history-drawer"
    @close="onClose"
  >
    <div class="drawer-wrap">
      <div class="filter-bar">
        <el-select v-model="query.channel" placeholder="全部渠道" style="width: 120px" @change="onSearch">
          <el-option v-for="item in channelOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-model="query.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
        <el-input
          v-model="query.keyword"
          placeholder="搜索沟通内容关键字"
          clearable
          class="keyword-input"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <div class="timeline-wrap" v-loading="loading">
        <el-empty v-if="!loading && list.length === 0" description="暂无沟通记录" :image-size="90" />
        <el-timeline v-else class="chat-timeline">
          <el-timeline-item
            v-for="item in list"
            :key="item.id || `${item.time}-${item.type}`"
            :timestamp="formatTime(item.time, true)"
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
              <div class="timeline-content">{{ displayText(item.content) }}</div>
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

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
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

  .keyword-input {
    width: 100%;
  }
}
</style>
