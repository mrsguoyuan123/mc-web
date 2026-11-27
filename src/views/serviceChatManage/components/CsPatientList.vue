<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getCsPatientPage } from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing, toPage } from '../../../utils/index.js'
import {
  COMMUNICATE_STATUS_OPTIONS,
  COMMUNICATE_STATUS_TAG,
  COMMUNICATE_STATUS_TEXT,
  PURCHASE_INTENT_OPTIONS,
  PURCHASE_INTENT_TAG,
  PURCHASE_INTENT_TEXT,
  avatarColor,
  maskPhone
} from '../utils.js'

const props = defineProps({
  currentPatientId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['select'])

const keyword = ref('')
const communicateStatus = ref('')
const purchaseIntent = ref('')
// 截图第三项「全部健康数据」筛选：cs/patients 暂无对应查询参数与枚举，先保留样式占位
// TODO 待后端补健康数据筛选参数与枚举后接入
const healthFilter = ref('')

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref([])
const loading = ref(false)
const error = ref(false)

let searchTimer = null

const fetchList = async () => {
  loading.value = true
  error.value = false
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (communicateStatus.value) params.communicateStatus = communicateStatus.value
    if (purchaseIntent.value) params.purchaseIntent = purchaseIntent.value
    const res = await getCsPatientPage(params)
    const pageData = toPage(res)
    list.value = pageData.list
    total.value = pageData.total
    page.value = pageData.page
    pageSize.value = pageData.pageSize
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

// 搜索防抖 300ms，变更后重置到第一页
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchList()
  }, 300)
})

watch([communicateStatus, purchaseIntent], () => {
  page.value = 1
  fetchList()
})

const onPageChange = (value) => {
  page.value = value
  fetchList()
}

const onSizeChange = (value) => {
  pageSize.value = value
  page.value = 1
  fetchList()
}

const choosePatient = (row) => {
  emit('select', row)
}

const displayName = (row) => (isMissing(row?.name) ? MISSING_TEXT : row.name)
const initial = (row) => (isMissing(row?.name) ? '?' : String(row.name).slice(0, 1))

onMounted(fetchList)

defineExpose({ refresh: fetchList })
</script>

<template>
  <aside v-loading="loading" class="patient-panel">
    <div class="panel-head">
      <h3>会话列表</h3>
      <p>点击会话开始对话</p>
    </div>

    <div class="filters">
      <div class="search-box">
        <el-icon><Search /></el-icon>
        <input v-model.trim="keyword" type="text" placeholder="搜索用户..." />
      </div>
      <el-select v-model="communicateStatus" placeholder="全部" class="filter-select">
        <el-option label="全部" value="" />
        <el-option
          v-for="option in COMMUNICATE_STATUS_OPTIONS"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select v-model="purchaseIntent" placeholder="全部" class="filter-select">
        <el-option label="全部" value="" />
        <el-option
          v-for="option in PURCHASE_INTENT_OPTIONS"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select
        v-model="healthFilter"
        placeholder="全部健康数据"
        class="filter-select"
        disabled
      >
        <el-option label="全部健康数据" value="" />
      </el-select>
    </div>

    <div v-if="error" class="block-error" @click="fetchList">加载失败，点击重试</div>

    <div v-else-if="list.length" class="patient-list">
      <button
        v-for="row in list"
        :key="String(row.id)"
        type="button"
        class="patient-item"
        :class="{ active: String(props.currentPatientId) === String(row.id) }"
        @click="choosePatient(row)"
      >
        <span class="avatar" :style="{ background: avatarColor(row.name) }">
          {{ initial(row) }}
        </span>
        <span class="patient-content">
          <span class="patient-row">
            <strong :class="{ 'missing-text': isMissing(row.name) }">{{ displayName(row) }}</strong>
            <el-tag
              v-if="!isMissing(row.communicateStatus)"
              size="small"
              :type="COMMUNICATE_STATUS_TAG[row.communicateStatus] || 'info'"
            >
              {{ COMMUNICATE_STATUS_TEXT[row.communicateStatus] || row.communicateStatus }}
            </el-tag>
          </span>
          <span class="patient-tags">
            <el-tag
              v-if="!isMissing(row.purchaseIntent)"
              size="small"
              effect="plain"
              :type="PURCHASE_INTENT_TAG[row.purchaseIntent] || 'info'"
            >
              意向{{ PURCHASE_INTENT_TEXT[row.purchaseIntent] || row.purchaseIntent }}
            </el-tag>
          </span>
          <span class="patient-meta">
            <template v-if="!isMissing(row.phone)">{{ maskPhone(row.phone) }}</template>
            <template v-else>
              <em class="missing-text">{{ MISSING_TEXT }}</em>
            </template>
          </span>
          <span class="patient-meta">
            <template v-if="!isMissing(row.surgeryType)">{{ row.surgeryType }}</template>
            <template v-else>
              <em class="missing-text">{{ MISSING_TEXT }}</em>
            </template>
            <template v-if="!isMissing(row.hospitalName)"> · {{ row.hospitalName }}</template>
          </span>
          <span v-if="!isMissing(row.surgeon)" class="patient-meta">主治：{{ row.surgeon }}</span>
          <span class="patient-foot">
            <em>最近通话：{{ formatTime(row.latestCallTime) }}</em>
          </span>
        </span>
      </button>
    </div>

    <el-empty v-else-if="!loading" description="暂无匹配患者" :image-size="80" class="list-empty" />

    <div v-if="total > 0" class="pager">
      <el-pagination
        small
        background
        layout="total, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </aside>
</template>

<style scoped>
.patient-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
  overflow: hidden;
}

.panel-head {
  padding: 16px 16px 8px;
}

.panel-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.panel-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 16px 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.search-box .el-icon {
  color: #94a3b8;
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1f2937;
}

.filter-select {
  width: 100%;
}

.patient-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.patient-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.patient-item:hover {
  background: #f8fafc;
}

.patient-item.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.avatar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.patient-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.patient-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-row strong {
  font-size: 14px;
  color: #1f2937;
}

.patient-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.patient-meta {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-foot em {
  font-style: normal;
  font-size: 11px;
  color: #94a3b8;
}

.missing-text {
  color: #ef4444;
  font-style: normal;
  font-size: 12px;
}

.list-empty {
  padding: 40px 0;
}

.block-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  margin: 0 16px 12px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

.pager {
  display: flex;
  justify-content: center;
  padding: 10px 0 14px;
}
</style>
