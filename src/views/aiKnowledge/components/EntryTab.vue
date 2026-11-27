<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKbEntryPage,
  createKbEntry,
  updateKbEntryById,
  deleteKbEntryById,
  deleteKbEntryBatch,
  updateKbEntryBatchStatus,
  importKbEntries
} from '../../../api/index.js'
import { MISSING_TEXT, isMissing, safeParseJson, toPage } from '@/utils/index.js'

// 科室下拉（静态字典；后端暂无科室筛选端点，G3）
const departments = [
  '产科', '妇科', '儿科', '内科', '外科', '骨科', '皮肤科', '眼科',
  '耳鼻喉科', '口腔科', '心理科', '营养科', '中医科', '康复科', '急诊科', '全科'
]

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])

// 输入态与应用态分离：回车/清空才发查询（G3：禁止前端本地过滤，会破坏分页）
const keyword = ref('')
const appliedKeyword = ref('')

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getKbEntryPage({
      keyword: appliedKeyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    const pageResult = toPage(res)
    tableData.value = pageResult.list
    total.value = pageResult.total
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '问答列表加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  appliedKeyword.value = keyword.value.trim()
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

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

/* ---------------- 相似问 / 标签展示 ---------------- */

const parseJsonArray = (value) => {
  const parsed = safeParseJson(value, [])
  return Array.isArray(parsed) ? parsed.filter((item) => !isMissing(item)).map(String) : []
}

const similarTags = (row) => parseJsonArray(row.similarQuestionsJson)
const tagList = (row) => parseJsonArray(row.tagsJson)

const statusMeta = (row) => {
  const list = []
  if (row.publishStatus === 'PUBLISHED') list.push({ label: '已发布', type: 'success' })
  else if (row.publishStatus === 'DRAFT') list.push({ label: '草稿', type: 'warning' })
  if (Number(row.status) === 0) list.push({ label: '已停用', type: 'info' })
  return list
}

/* ---------------- 新增 / 编辑弹窗 ---------------- */

const formVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const createForm = () => ({
  id: '',
  department: '',
  question: '',
  similarText: '',
  answer: '',
  tagsText: '',
  publishStatus: 'DRAFT',
  status: 1
})
const form = reactive(createForm())
const rules = {
  question: [{ required: true, message: '请输入标准问', trigger: 'blur' }],
  answer: [{ required: true, message: '请输入标准答案', trigger: 'blur' }]
}

// 顿号/逗号（中英文）切分
const splitText = (text) =>
  String(text || '')
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean)

const openAdd = () => {
  Object.assign(form, createForm())
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  Object.assign(form, createForm(), {
    id: String(row.id),
    department: row.department || '',
    question: row.question || '',
    similarText: parseJsonArray(row.similarQuestionsJson).join('、'),
    answer: row.answer || '',
    tagsText: parseJsonArray(row.tagsJson).join('、'),
    publishStatus: row.publishStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    status: Number(row.status) === 0 ? 0 : 1
  })
  isEdit.value = true
  formVisible.value = true
  formRef.value?.clearValidate()
}

const buildPayload = () => ({
  department: form.department || undefined,
  question: form.question.trim(),
  similarQuestionsJson: JSON.stringify(splitText(form.similarText)),
  answer: form.answer.trim(),
  tagsJson: JSON.stringify(splitText(form.tagsText)),
  publishStatus: form.publishStatus,
  status: form.status
})

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateKbEntryById(form.id, buildPayload())
      ElMessage.success('已保存修改')
    } else {
      await createKbEntry(buildPayload())
      ElMessage.success('已保存并进入草稿')
    }
    formVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

/* ---------------- 详情弹窗 ---------------- */

const detailVisible = ref(false)
const current = ref(null)

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const detailSimilar = computed(() => (current.value ? similarTags(current.value) : []))
const detailTags = computed(() => (current.value ? tagList(current.value) : []))
const detailStatus = computed(() => (current.value ? statusMeta(current.value) : []))

/* ---------------- 删除（单条 / 批量） ---------------- */

const removeIds = async (ids) => {
  if (ids.length > 1) {
    await deleteKbEntryBatch({ ids })
  } else {
    await deleteKbEntryById(ids[0])
  }
  ElMessage.success('已删除')
  // 当前页删空且 page > 1 时回退一页
  if (tableData.value.length === ids.length && page.value > 1) {
    page.value -= 1
  }
  fetchList()
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    '删除后该知识将不再参与训练和检索，此操作不可恢复',
    '确认删除这条问答？',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => removeIds([String(row.id)]))
    .catch(() => {})
}

const handleBatchDelete = () => {
  const ids = selectedRows.value.map((row) => String(row.id))
  if (!ids.length) return
  ElMessageBox.confirm(
    '删除后该知识将不再参与训练和检索，此操作不可恢复',
    `确认删除选中的 ${ids.length} 条问答？`,
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => removeIds(ids))
    .catch(() => {})
}

// 批量发布 / 转草稿（语义待联调：先按 publishStatus 字符串透传）
const handleBatchStatus = (publishStatus) => {
  const ids = selectedRows.value.map((row) => String(row.id))
  if (!ids.length) return
  updateKbEntryBatchStatus({ ids, status: publishStatus })
    .then(() => {
      ElMessage.success(publishStatus === 'PUBLISHED' ? '已批量发布' : '已转为草稿')
      fetchList()
    })
    .catch((err) => ElMessage.error(err?.message || '批量操作失败'))
}

/* ---------------- 模板下载（G5：前端生成静态 CSV） ---------------- */

const downloadTemplate = () => {
  const header = '科室,标准问,相似问,标准答案,标签,状态'
  const sample = '产科,怀孕初期应该注意什么？,孕早期注意事项、早孕注意什么,补充叶酸并定期产检。,孕早期,草稿'
  // BOM 保证 Excel 打开中文不乱码
  const blob = new Blob([`﻿${header}\n${sample}\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '问答导入模板.csv'
  link.click()
  URL.revokeObjectURL(url)
}

/* ---------------- 批量导入（G4：接口只收 JSON 数组，前端解析 CSV 兜底） ---------------- */

const importing = ref(false)

// 兼容引号包裹、引号转义、CRLF 的简易 CSV 解析
const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const content = String(text).replace(/^﻿/, '')
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

const normalizeStatus = (value) => {
  const text = String(value || '').trim()
  if (text === 'PUBLISHED' || text === '已发布') return 'PUBLISHED'
  return 'DRAFT'
}

const handleImportFile = async (fileObj) => {
  const file = fileObj.file
  importing.value = true
  try {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) {
      ElMessage.warning('模板内没有可导入的数据行')
      return
    }
    // 列顺序：科室,标准问,相似问,标准答案,标签,状态
    const entries = rows.slice(1).map((cells) => {
      const [department, question, similar, answer, tags, status] = cells
      return {
        department: department?.trim() || undefined,
        question: (question || '').trim(),
        similarQuestionsJson: JSON.stringify(splitText(similar)),
        answer: (answer || '').trim(),
        tagsJson: JSON.stringify(splitText(tags)),
        publishStatus: normalizeStatus(status)
      }
    })
    const valid = entries.filter((item) => item.question && item.answer)
    if (entries.length - valid.length > 0) {
      ElMessage.warning(`有 ${entries.length - valid.length} 行缺少标准问或标准答案，已跳过`)
    }
    if (!valid.length) {
      ElMessage.warning('没有符合要求的问答数据')
      return
    }
    const count = await importKbEntries(valid)
    ElMessage.success(`已导入 ${Number(count) || valid.length} 条问答`)
    page.value = 1
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '导入失败，请检查模板格式')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  fetchList()
})

defineExpose({ refresh: fetchList })
</script>

<template>
  <div class="entry-tab">
    <div class="panel toolbar-card">
      <div class="toolbar-left">
        <el-input
          v-model="keyword"
          class="search-input"
          clearable
          placeholder="搜索标准问、相似问、答案或标签"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-tooltip content="后端待补筛选参数" placement="top">
          <span class="disabled-select-wrap">
            <el-select model-value="" disabled class="filter-select" placeholder="科室">
              <el-option v-for="name in departments" :key="name" :label="name" :value="name" />
            </el-select>
          </span>
        </el-tooltip>
        <el-tooltip content="后端待补筛选参数" placement="top">
          <span class="disabled-select-wrap">
            <el-select model-value="" disabled class="filter-select" placeholder="状态">
              <el-option label="草稿" value="DRAFT" />
              <el-option label="已发布" value="PUBLISHED" />
            </el-select>
          </span>
        </el-tooltip>
      </div>
      <div class="toolbar-right">
        <el-button @click="downloadTemplate">
          <el-icon><Download /></el-icon>下载导入模板
        </el-button>
        <el-upload
          class="import-upload"
          accept=".csv"
          :show-file-list="false"
          :http-request="handleImportFile"
        >
          <el-button :loading="importing">
            <el-icon><Upload /></el-icon>批量导入
          </el-button>
        </el-upload>
        <el-button type="primary" @click="openAdd">
          <el-icon><Plus /></el-icon>新建问答
        </el-button>
      </div>
    </div>

    <div v-if="selectedRows.length" class="panel batch-bar">
      <span>已选 {{ selectedRows.length }} 条</span>
      <el-button size="small" @click="handleBatchStatus('PUBLISHED')">批量发布</el-button>
      <el-button size="small" @click="handleBatchStatus('DRAFT')">转草稿</el-button>
      <el-button size="small" type="danger" plain @click="handleBatchDelete">批量删除</el-button>
    </div>

    <div class="panel table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        table-layout="fixed"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" fixed />
        <el-table-column label="科室" width="110">
          <template #default="{ row }">
            <span v-if="isMissing(row.department)" class="missing">{{ MISSING_TEXT }}</span>
            <span v-else>{{ row.department }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标准问" prop="question" min-width="200" show-overflow-tooltip />
        <el-table-column label="相似问" min-width="180">
          <template #default="{ row }">
            <template v-if="similarTags(row).length">
              <el-tag
                v-for="tag in similarTags(row).slice(0, 2)"
                :key="tag"
                size="small"
                effect="plain"
                class="similar-tag"
              >
                {{ tag }}
              </el-tag>
              <el-tag
                v-if="similarTags(row).length > 2"
                size="small"
                type="info"
                effect="plain"
              >
                +{{ similarTags(row).length - 2 }}
              </el-tag>
            </template>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="标准答案" prop="answer" min-width="240" show-overflow-tooltip />
        <el-table-column label="命中" width="90" align="right">
          <template #default="{ row }">{{ Number(row.hitCount) || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <el-tag
              v-for="meta in statusMeta(row)"
              :key="meta.label"
              :type="meta.type"
              size="small"
              class="status-tag"
            >
              {{ meta.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无问答知识" :image-size="90" />
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

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      width="600px"
      class="kb-dialog"
      :title="isEdit ? '编辑问答' : '新增标准问答'"
    >
      <p class="dialog-subtitle">标准问、相似问和标准答案将作为智能客服的训练数据。</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="科室*">
          <el-select v-model="form.department" class="full-control" clearable placeholder="选择科室">
            <el-option v-for="name in departments" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="标准问*" prop="question">
          <el-input v-model="form.question" placeholder="请输入标准问" />
        </el-form-item>
        <el-form-item label="相似问法（顿号/逗号分隔）">
          <el-input v-model="form.similarText" placeholder="例如：孕早期注意事项、早孕注意什么" />
        </el-form-item>
        <el-form-item label="标准答案*" prop="answer">
          <el-input v-model="form.answer" type="textarea" :rows="4" resize="none" placeholder="请输入标准答案" />
        </el-form-item>
        <el-form-item label="标签（顿号/逗号分隔）">
          <el-input v-model="form.tagsText" placeholder="例如：孕早期、注意事项" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.publishStatus">
            <el-radio value="DRAFT">草稿</el-radio>
            <el-radio value="PUBLISHED">已发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '保存并进入草稿' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" width="640px" class="kb-dialog" title="问答详情">
      <template v-if="current">
        <div class="detail-head">
          <span class="detail-id">#{{ String(current.id) }}</span>
          <el-tag
            v-for="meta in detailStatus"
            :key="meta.label"
            :type="meta.type"
            size="small"
          >
            {{ meta.label }}
          </el-tag>
        </div>

        <div class="detail-line">
          <span class="detail-label">科室</span>
          <span v-if="isMissing(current.department)" class="missing">{{ MISSING_TEXT }}</span>
          <span v-else>{{ current.department }}</span>
        </div>

        <div class="detail-block">
          <span class="detail-label">标准问</span>
          <div class="question-box">{{ current.question }}</div>
        </div>

        <div class="detail-block">
          <span class="detail-label">相似问</span>
          <div v-if="detailSimilar.length" class="tag-wrap">
            <el-tag v-for="tag in detailSimilar" :key="tag" size="small" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
          <span v-else class="placeholder">—</span>
        </div>

        <div class="detail-block">
          <span class="detail-label">标准答案</span>
          <div class="answer-box">{{ current.answer }}</div>
        </div>

        <div class="detail-block">
          <span class="detail-label">标签</span>
          <div v-if="detailTags.length" class="tag-wrap">
            <el-tag v-for="tag in detailTags" :key="tag" size="small" type="info" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
          <span v-else class="placeholder">—</span>
        </div>

        <div class="metric-grid">
          <div class="metric-cell">
            <strong>{{ Number(current.hitCount) || 0 }}</strong>
            <span>命中次数</span>
          </div>
          <div class="metric-cell">
            <strong>{{ Number(current.likeCount) || 0 }}</strong>
            <span>点赞</span>
          </div>
          <div class="metric-cell">
            <strong>{{ Number(current.dislikeCount) || 0 }}</strong>
            <span>点踩</span>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.disabled-select-wrap {
  display: inline-block;
}

.filter-select {
  width: 140px;
}

.import-upload {
  display: inline-block;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  margin-bottom: 12px;
  background: #f8fafc;
  font-size: 13px;
  color: #475569;
}

.table-card {
  padding: 22px;
}

.similar-tag,
.status-tag {
  margin-right: 6px;
}

.missing {
  color: #f56c6c;
}

.placeholder {
  color: #9ca3af;
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

.dialog-subtitle {
  margin: 0 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.full-control {
  width: 100%;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-id {
  font-weight: 700;
  color: #374151;
}

.detail-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 14px;
}

.detail-block {
  margin-bottom: 14px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.detail-line .detail-label {
  display: inline;
  margin-bottom: 0;
}

.question-box {
  padding: 12px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  font-weight: 700;
  font-size: 14px;
}

.answer-box {
  padding: 14px 16px;
  border-radius: 8px;
  background: #f8fafc;
  color: #374151;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 0;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #f9fafb;
}

.metric-cell strong {
  font-size: 22px;
  color: #111827;
}

.metric-cell span {
  font-size: 12px;
  color: #9ca3af;
}
</style>
