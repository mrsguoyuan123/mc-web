<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKbDocumentPage,
  uploadKbDocument,
  deleteKbDocumentById,
  getKbDocumentChunksById,
  reparseKbDocumentById
} from '../../../api/index.js'
import { MISSING_TEXT, formatDate, isMissing, toPage } from '@/utils/index.js'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
let pollTimer = null
let alive = true

const PARSE_META = {
  PENDING: { label: '待解析', type: 'info' },
  PARSING: { label: '解析中', type: 'primary' },
  PARSED: { label: '已解析', type: 'success' },
  FAILED: { label: '解析失败', type: 'danger' }
}

const fetchList = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await getKbDocumentPage({ page: page.value, pageSize: pageSize.value })
    const pageResult = toPage(res)
    tableData.value = pageResult.list
    total.value = pageResult.total
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '文档列表加载失败')
  } finally {
    loading.value = false
  }
  schedulePoll()
}

// 存在待解析/解析中行时，5 秒后静默刷新；不用 WebSocket，不编造进度
const hasParsingRow = () =>
  tableData.value.some((row) => row.parseStatus === 'PENDING' || row.parseStatus === 'PARSING')

const schedulePoll = () => {
  clearPoll()
  if (alive && hasParsingRow()) {
    pollTimer = setTimeout(() => fetchList(true), 5000)
  }
}

const clearPoll = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
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

const formatFileSize = (bytes) => {
  if (isMissing(bytes)) return MISSING_TEXT
  const num = Number(bytes)
  if (Number.isNaN(num)) return MISSING_TEXT
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${(num / (1024 * 1024)).toFixed(1)} MB`
}

/* ---------------- 上传 ---------------- */

const uploading = ref(false)

const handleUpload = async (fileObj) => {
  uploading.value = true
  try {
    await uploadKbDocument(fileObj.file)
    ElMessage.success('已上传，正在解析')
    page.value = 1
    await fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

/* ---------------- 重新解析 / 删除 ---------------- */

const handleReparse = (row) => {
  ElMessageBox.confirm(
    '重新解析会重新切分该文档，原有分块将被替换。',
    '重新解析该文档？',
    { type: 'warning', confirmButtonText: '重新解析', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await reparseKbDocumentById(String(row.id))
        ElMessage.success('已重新提交解析')
        fetchList()
      } catch (err) {
        ElMessage.error(err?.message || '操作失败')
      }
    })
    .catch(() => {})
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    '删除后该文档及其全部分块将不再参与检索，此操作不可恢复',
    '确认删除这份文档？',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await deleteKbDocumentById(String(row.id))
        ElMessage.success('已删除')
        if (tableData.value.length === 1 && page.value > 1) page.value -= 1
        fetchList()
      } catch (err) {
        ElMessage.error(err?.message || '删除失败')
      }
    })
    .catch(() => {})
}

/* ---------------- 分块预览 ---------------- */

const chunkVisible = ref(false)
const chunkLoading = ref(false)
const chunkDoc = ref(null)
const chunkList = ref([])
const chunkTotal = ref(0)
const chunkPage = ref(1)
const chunkPageSize = ref(10)

const openChunks = async (row) => {
  chunkDoc.value = row
  chunkPage.value = 1
  chunkVisible.value = true
  await fetchChunks()
}

const fetchChunks = async () => {
  if (!chunkDoc.value) return
  chunkLoading.value = true
  try {
    const res = await getKbDocumentChunksById(String(chunkDoc.value.id), {
      page: chunkPage.value,
      pageSize: chunkPageSize.value
    })
    const pageResult = toPage(res)
    chunkList.value = pageResult.list
    chunkTotal.value = pageResult.total
  } catch (err) {
    chunkList.value = []
    chunkTotal.value = 0
    ElMessage.error(err?.message || '分块加载失败')
  } finally {
    chunkLoading.value = false
  }
}

const handleChunkPageChange = (next) => {
  chunkPage.value = next
  fetchChunks()
}

onMounted(() => {
  fetchList()
})

onBeforeUnmount(() => {
  alive = false
  clearPoll()
})
</script>

<template>
  <div class="document-tab">
    <div class="panel head-card">
      <div>
        <h3 class="head-title">文档知识</h3>
        <p class="head-subtitle">上传 PDF、Word、TXT 文档，自动解析并分块后作为智能客服的补充知识。</p>
      </div>
      <el-upload
        accept=".pdf,.doc,.docx,.txt,.md"
        :show-file-list="false"
        :http-request="handleUpload"
      >
        <el-button type="primary" :loading="uploading">
          <el-icon><Upload /></el-icon>上传文档
        </el-button>
      </el-upload>
    </div>

    <div class="panel table-card">
      <el-table v-loading="loading" :data="tableData" stripe table-layout="fixed">
        <el-table-column label="文档名称" min-width="240">
          <template #default="{ row }">
            <div class="doc-name">
              <el-icon class="doc-icon"><Document /></el-icon>
              <span class="doc-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="解析状态" width="140">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.parseStatus === 'FAILED' && !isMissing(row.errorMessage)"
              :content="row.errorMessage"
              placement="top"
            >
              <el-tag :type="PARSE_META[row.parseStatus]?.type || 'info'" size="small">
                {{ PARSE_META[row.parseStatus]?.label || row.parseStatus }}
              </el-tag>
            </el-tooltip>
            <el-tag
              v-else
              :type="PARSE_META[row.parseStatus]?.type || 'info'"
              size="small"
            >
              {{ PARSE_META[row.parseStatus]?.label || row.parseStatus || MISSING_TEXT }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分块数" width="100" align="center">
          <template #default="{ row }">
            <span v-if="isMissing(row.chunkCount)" class="placeholder">—</span>
            <span v-else>{{ row.chunkCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="140">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openChunks(row)">分块预览</el-button>
            <el-button type="primary" link @click="handleReparse(row)">重新解析</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无文档知识" :image-size="90" />
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

    <!-- 分块预览弹窗 -->
    <el-dialog
      v-model="chunkVisible"
      width="720px"
      class="kb-dialog"
      title="文档分块预览"
    >
      <template v-if="chunkDoc">
        <p class="dialog-subtitle">
          {{ chunkDoc.name }} · {{ chunkTotal }} 个分块
        </p>
        <div v-loading="chunkLoading" class="chunk-list">
          <div v-for="chunk in chunkList" :key="String(chunk.id)" class="chunk-card">
            <div class="chunk-head">
              <span class="chunk-no">分块 {{ chunk.chunkNo }}</span>
              <span v-if="!isMissing(chunk.tokenCount)" class="chunk-token">
                {{ chunk.tokenCount }} tokens
              </span>
            </div>
            <div class="chunk-content">{{ chunk.content }}</div>
          </div>
          <el-empty v-if="!chunkLoading && !chunkList.length" description="暂无分块" :image-size="80" />
        </div>
        <el-pagination
          class="list-pager"
          background
          :current-page="chunkPage"
          :page-size="chunkPageSize"
          :total="chunkTotal"
          layout="total, prev, pager, next"
          @current-change="handleChunkPageChange"
        />
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.head-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.head-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.head-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.table-card {
  padding: 22px;
}

.doc-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.doc-icon {
  flex-shrink: 0;
  color: #2563eb;
}

.doc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin: 0 0 16px;
  font-size: 13px;
  color: #9ca3af;
}

.chunk-list {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.chunk-card {
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #f9fafb;
}

.chunk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chunk-no {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
}

.chunk-token {
  font-size: 12px;
  color: #9ca3af;
}

.chunk-content {
  font-size: 13px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
