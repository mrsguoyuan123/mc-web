<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKbUnresolvedPage,
  convertKbUnresolvedById,
  mergeKbUnresolvedById,
  ignoreKbUnresolvedById,
  getKbEntryPage
} from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing, toPage } from '@/utils/index.js'

const props = defineProps({
  // 从概览「处理」跳入的行 id；空串/无值不高亮
  focusId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['badge-change'])

const STATUS_META = {
  PENDING: { label: '待处理', type: 'warning' },
  CONVERTED: { label: '已转问答', type: 'success' },
  MERGED: { label: '已合并', type: 'primary' },
  IGNORED: { label: '已忽略', type: 'info' }
}

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filterStatus = ref('PENDING')
let focusTimer = null

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getKbUnresolvedPage({
      status: filterStatus.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    const pageResult = toPage(res)
    tableData.value = pageResult.list
    total.value = pageResult.total
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '未解决问题加载失败')
  } finally {
    loading.value = false
  }
}

const handleStatusChange = () => {
  page.value = 1
  fetchList()
}

const handlePageChange = (next) => {
  page.value = next
  fetchList()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  page.value = 1
  fetchList()
}

// 兼容 0~1 与 0~100；< 50% 橙色
const scoreInfo = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return { text: MISSING_TEXT, low: true }
  const percent = Math.abs(num) <= 1 ? num * 100 : num
  const rounded = Math.round(percent * 10) / 10
  return { text: `${rounded}%`, low: percent < 50 }
}

/* ---------------- 详情弹窗 ---------------- */

const detailVisible = ref(false)
const current = ref(null)

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

/* ---------------- 转问答 ---------------- */

const convertVisible = ref(false)
const convertSubmitting = ref(false)
const convertFormRef = ref()
const convertTarget = ref(null)
const createConvertForm = () => ({
  department: '',
  question: '',
  answer: ''
})
const convertForm = reactive(createConvertForm())
const convertRules = {
  question: [{ required: true, message: '请输入标准问', trigger: 'blur' }],
  answer: [{ required: true, message: '请输入标准答案', trigger: 'blur' }]
}

const openConvert = (row) => {
  convertTarget.value = row
  Object.assign(convertForm, createConvertForm(), {
    department: row.suggestDepartment || row.sourceDepartment || '',
    question: row.question || ''
  })
  convertVisible.value = true
  convertFormRef.value?.clearValidate()
}

const handleConvertSubmit = async () => {
  try {
    await convertFormRef.value.validate()
  } catch {
    return
  }
  convertSubmitting.value = true
  try {
    // 必须走 convert 接口，不能调 createKbEntry
    await convertKbUnresolvedById(String(convertTarget.value.id), {
      question: convertForm.question.trim(),
      answer: convertForm.answer.trim(),
      department: convertForm.department || undefined
    })
    ElMessage.success('已转为标准问答（草稿）')
    convertVisible.value = false
    emit('badge-change')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '转换失败')
  } finally {
    convertSubmitting.value = false
  }
}

/* ---------------- 合并（G10：补目标选择器） ---------------- */

const mergeVisible = ref(false)
const mergeSubmitting = ref(false)
const mergeTarget = ref(null)
const targetEntryId = ref('')
const entryOptions = ref([])
const entrySearching = ref(false)

const searchEntries = async (keyword) => {
  entrySearching.value = true
  try {
    const res = await getKbEntryPage({ keyword: keyword || undefined, page: 1, pageSize: 20 })
    entryOptions.value = toPage(res).list
  } catch {
    entryOptions.value = []
  } finally {
    entrySearching.value = false
  }
}

const openMerge = (row) => {
  mergeTarget.value = row
  targetEntryId.value = ''
  entryOptions.value = []
  mergeVisible.value = true
  searchEntries('')
}

const entryLabel = (row) =>
  `${row.question || MISSING_TEXT}（${isMissing(row.department) ? '未分类' : row.department}）`

const handleMergeSubmit = async () => {
  if (!targetEntryId.value) return
  mergeSubmitting.value = true
  try {
    await mergeKbUnresolvedById(String(mergeTarget.value.id), {
      targetEntryId: String(targetEntryId.value)
    })
    ElMessage.success('已合并')
    mergeVisible.value = false
    emit('badge-change')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '合并失败')
  } finally {
    mergeSubmitting.value = false
  }
}

/* ---------------- 忽略 ---------------- */

const handleIgnore = (row) => {
  ElMessageBox.confirm('忽略后该问题不再出现在待处理列表。', '忽略这条问题？', {
    confirmButtonText: '忽略',
    cancelButtonText: '取消'
  })
    .then(async () => {
      try {
        await ignoreKbUnresolvedById(String(row.id))
        ElMessage.success('已忽略')
        emit('badge-change')
        fetchList()
      } catch (err) {
        ElMessage.error(err?.message || '操作失败')
      }
    })
    .catch(() => {})
}

/* ---------------- 定位高亮（从概览跳入） ---------------- */

const highlightId = ref('')

const applyFocus = async () => {
  const id = props.focusId === null || props.focusId === undefined ? '' : String(props.focusId)
  if (!id) return
  // 目标行不在当前页时回到第 1 页重新加载
  const exists = tableData.value.some((row) => String(row.id) === id)
  if (!exists) {
    filterStatus.value = 'PENDING'
    page.value = 1
    await fetchList()
  }
  await nextTick()
  highlightId.value = id
  const el = document.querySelector(`.kb-row-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (focusTimer) clearTimeout(focusTimer)
  focusTimer = setTimeout(() => {
    highlightId.value = ''
  }, 2000)
}

watch(
  () => props.focusId,
  (value) => {
    if (value) applyFocus()
  }
)

onMounted(() => {
  fetchList()
  if (props.focusId) applyFocus()
})

onBeforeUnmount(() => {
  if (focusTimer) clearTimeout(focusTimer)
})

defineExpose({ refresh: fetchList })
</script>

<template>
  <div class="unresolved-tab">
    <div class="panel tip-bar">
      <h3 class="tip-title">这里是小程序用户问过、但智能客服没有答好的问题</h3>
      <p class="tip-subtitle">
        把高频或重要的问题转成标准问答，重新训练发布后，智能客服下次就能正确回答。
      </p>
    </div>

    <div class="panel filter-card">
      <span class="filter-label">状态</span>
      <el-select v-model="filterStatus" class="filter-select" clearable placeholder="全部状态" @change="handleStatusChange">
        <el-option
          v-for="(meta, key) in STATUS_META"
          :key="key"
          :label="meta.label"
          :value="key"
        />
      </el-select>
    </div>

    <div class="panel table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        table-layout="fixed"
        :row-class-name="({ row }) => (String(row.id) === highlightId ? `row-focus kb-row-${String(row.id)}` : `kb-row-${String(row.id)}`)"
      >
        <el-table-column label="原始问法" prop="question" min-width="220" show-overflow-tooltip />
        <el-table-column label="来源用户" width="130">
          <template #default="{ row }">
            <span v-if="isMissing(row.sourceUserName)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ row.sourceUserName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="科室" width="120">
          <template #default="{ row }">
            <span v-if="isMissing(row.sourceDepartment)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ row.sourceDepartment }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发生时间" width="160">
          <template #default="{ row }">{{ formatTime(row.occurredAt) }}</template>
        </el-table-column>
        <el-table-column label="匹配度" width="110">
          <template #default="{ row }">
            <span :class="{ 'score-low': scoreInfo(row.matchScore).low }">
              {{ scoreInfo(row.matchScore).text }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="STATUS_META[row.status]?.type || 'info'" size="small">
              {{ STATUS_META[row.status]?.label || row.status || MISSING_TEXT }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button type="primary" link @click="openConvert(row)">转问答</el-button>
              <el-button type="primary" link @click="openMerge(row)">合并</el-button>
              <el-button type="warning" link @click="handleIgnore(row)">忽略</el-button>
            </template>
            <el-button v-else type="primary" link @click="openDetail(row)">查看</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无未解决问题" :image-size="90" />
        </template>
      </el-table>

      <el-pagination
        class="list-pager"
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 详情弹窗（G9：无业务编号 code，缺失只显示通用标题，不伪造 U 编号） -->
    <el-dialog
      v-model="detailVisible"
      width="600px"
      class="kb-dialog"
      :title="current && !isMissing(current.code) ? `#${current.code}` : '未解决问题详情'"
    >
      <template v-if="current">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">发生时间</span>
            <span>{{ formatTime(current.occurredAt) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">来源用户</span>
            <span v-if="isMissing(current.sourceUserName)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ current.sourceUserName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">来源科室</span>
            <span v-if="isMissing(current.sourceDepartment)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ current.sourceDepartment }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">建议归类</span>
            <span v-if="isMissing(current.suggestDepartment)" class="placeholder">—</span>
            <span v-else>{{ current.suggestDepartment }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">已有知识匹配度</span>
            <span :class="{ 'score-low': scoreInfo(current.matchScore).low }">
              {{ scoreInfo(current.matchScore).text }}
            </span>
          </div>
        </div>
        <div class="detail-block">
          <span class="detail-label">原始问法</span>
          <div class="question-warm-box">{{ current.question }}</div>
        </div>
      </template>
    </el-dialog>

    <!-- 转问答弹窗（复用新增标准问答形态，提交走 convert 接口） -->
    <el-dialog v-model="convertVisible" width="600px" class="kb-dialog" title="新增标准问答">
      <p class="dialog-subtitle">标准问、相似问和标准答案将作为智能客服的训练数据。</p>
      <el-form ref="convertFormRef" :model="convertForm" :rules="convertRules" label-position="top">
        <el-form-item label="科室">
          <el-input v-model="convertForm.department" placeholder="来源/建议科室已预填，可修改" />
        </el-form-item>
        <el-form-item label="标准问*" prop="question">
          <el-input v-model="convertForm.question" placeholder="请输入标准问" />
        </el-form-item>
        <el-form-item label="标准答案*" prop="answer">
          <el-input v-model="convertForm.answer" type="textarea" :rows="4" resize="none" placeholder="请输入标准答案" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="convertVisible = false">取消</el-button>
        <el-button type="primary" :loading="convertSubmitting" @click="handleConvertSubmit">
          保存并进入草稿
        </el-button>
      </template>
    </el-dialog>

    <!-- 合并弹窗（G10：设计稿漏画目标选择器，这里补齐） -->
    <el-dialog v-model="mergeVisible" width="600px" class="kb-dialog" title="合并到已有问答">
      <p v-if="mergeTarget" class="dialog-subtitle">
        把「{{ mergeTarget.question }}」作为相似问法合并到已有标准问，之后该问法也能命中同一答案。
      </p>
      <el-form label-position="top">
        <el-form-item label="目标问答 *" required>
          <el-select
            v-model="targetEntryId"
            class="full-control"
            filterable
            remote
            clearable
            placeholder="输入关键词搜索标准问"
            :remote-method="searchEntries"
            :loading="entrySearching"
          >
            <el-option
              v-for="entry in entryOptions"
              :key="String(entry.id)"
              :label="entryLabel(entry)"
              :value="String(entry.id)"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mergeVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!targetEntryId"
          :loading="mergeSubmitting"
          @click="handleMergeSubmit"
        >
          确认合并
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tip-bar {
  background: #fff7ed;
  border-color: #fed7aa;
}

.tip-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #9a3412;
}

.tip-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #c2410c;
}

.filter-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
}

.filter-label {
  font-size: 13px;
  color: #475569;
}

.filter-select {
  width: 180px;
}

.table-card {
  padding: 22px;
}

.missing {
  color: #f56c6c;
}

.placeholder {
  color: #9ca3af;
}

.score-low {
  color: #ea580c;
  font-weight: 600;
}

.list-pager {
  margin-top: 18px;
  justify-content: flex-end;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

:deep(.el-table .row-focus) {
  background: #fef3c7 !important;
  animation: focus-fade 2s ease;
}

@keyframes focus-fade {
  from {
    background: #fde68a;
  }
  to {
    background: #fef3c7;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  margin-bottom: 18px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.detail-grid .detail-label {
  margin-bottom: 0;
}

.question-warm-box {
  padding: 14px 16px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 14px;
  font-weight: 600;
  word-break: break-word;
}

.dialog-subtitle {
  margin: 0 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.full-control {
  width: 100%;
}
</style>
