<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Picture,
  View,
  Download,
  Delete,
  UploadFilled
} from '@element-plus/icons-vue'
import {
  getPatientAttachmentsById,
  createPatientAttachmentById,
  deletePatientAttachmentById,
  uploadFile
} from '../../../api/index.js'
import { BASE_URL } from '../../../api/frontApikit.js'
import { displayText, formatTime, toPage } from '../../userManagement/utils.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

// 接口未提供的字段统一红色展示该文案
const NOT_PROVIDED = '接口未提供'

// 附件分类枚举（swagger 定稿；本版 UI 不做分类下拉，上传缺省归「其他」）
const CATEGORY_OPTIONS = ['检查报告', '影像资料', '病理资料', '饮食记录', '运动记录', '其他']
const DEFAULT_CATEGORY = '其他'

// 上传人角色中文映射
const ROLE_TEXT = {
  DOCTOR: '医生',
  CS: '客服',
  CAREGIVER: '陪诊师',
  PATIENT: '用户',
  ADMIN: '管理员'
}

// 格式白名单与文件类型样式（按扩展名区分颜色/图标）
const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
const MAX_SIZE = 20 * 1024 * 1024
const PAGE_SIZE = 20

const FILE_TYPE_MAP = {
  pdf: { label: 'PDF', icon: Document, iconClass: 'type-pdf', previewable: true },
  doc: { label: 'Word', icon: Document, iconClass: 'type-word', previewable: false },
  docx: { label: 'Word', icon: Document, iconClass: 'type-word', previewable: false },
  xls: { label: 'Excel', icon: Document, iconClass: 'type-excel', previewable: false },
  xlsx: { label: 'Excel', icon: Document, iconClass: 'type-excel', previewable: false },
  jpg: { label: '图片', icon: Picture, iconClass: 'type-image', previewable: true },
  jpeg: { label: '图片', icon: Picture, iconClass: 'type-image', previewable: true },
  png: { label: '图片', icon: Picture, iconClass: 'type-image', previewable: true },
  gif: { label: '图片', icon: Picture, iconClass: 'type-image', previewable: true }
}

const loading = ref(false)
const loadingMore = ref(false)
const uploading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const deletingId = ref('')
const fileInput = ref(null)
// 上传失败时保留已选文件，便于重试，不清空
const pendingFile = ref(null)
// 预览状态：图片走 el-image-viewer 弹层，PDF 走弹窗内嵌 iframe
const viewerVisible = ref(false)
const pdfVisible = ref(false)
const previewUrl = ref('')
const previewName = ref('')

const hasMore = computed(() => list.value.length < total.value)

const getExt = (fileName) => String(fileName || '').split('.').pop().toLowerCase()

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

const isImage = (fileName) => IMAGE_EXTS.includes(getExt(fileName))
const isPdf = (fileName) => getExt(fileName) === 'pdf'

// 附件 url 为相对路径时，用 .env 的 VITE_API_BASE_URL 拼接完整地址；已是 http(s) 地址则原样返回
const resolveFileUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

const fileTypeOf = (fileName) =>
  FILE_TYPE_MAP[getExt(fileName)] || {
    label: '文件',
    icon: Document,
    iconClass: 'type-default',
    previewable: false
  }

const formatSize = (bytes) => {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return NOT_PROVIDED
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const uploaderText = (item) => ROLE_TEXT[item.uploaderRole] || ''

const fetchList = async (reset = true) => {
  if (!props.patientId) {
    list.value = []
    total.value = 0
    return
  }
  if (reset) {
    page.value = 1
    loading.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const res = await getPatientAttachmentsById(String(props.patientId), {
      page: page.value,
      pageSize: PAGE_SIZE
    })
    const result = toPage(res)
    list.value = reset ? result.list : [...list.value, ...result.list]
    total.value = result.total
  } catch {
    if (reset) {
      list.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return
  page.value += 1
  fetchList(false)
}

const validateFile = (file) => {
  const ext = getExt(file.name)
  if (!ALLOWED_EXTS.includes(ext)) {
    ElMessage.error('仅支持 PDF、Word、Excel、图片格式')
    return false
  }
  if (file.size > MAX_SIZE) {
    ElMessage.error('文件不能超过 20MB')
    return false
  }
  return true
}

const triggerSelect = () => {
  if (!props.patientId) return
  fileInput.value?.click()
}

const onInputChange = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!validateFile(file)) return
  pendingFile.value = file
  submitUpload()
}

// 两步上传：先传文件本体拿 url，再登记附件元数据
const submitUpload = async () => {
  const file = pendingFile.value
  if (!file || uploading.value) return
  uploading.value = true
  try {
    const url = await uploadFile(file, 'medical')
    await createPatientAttachmentById(String(props.patientId), {
      category: DEFAULT_CATEGORY,
      fileName: file.name,
      fileSize: file.size,
      url
    })
    ElMessage.success('上传成功')
    pendingFile.value = null
    fetchList(true)
  } catch (err) {
    // 失败保留已选文件，可在待传条目中重试
    ElMessage.error(err?.message || '上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

const removePending = () => {
  pendingFile.value = null
}

const viewFile = (item) => {
  if (!item.url) return
  previewUrl.value = resolveFileUrl(item.url)
  previewName.value = item.fileName || '附件预览'
  if (isImage(item.fileName)) {
    viewerVisible.value = true
    return
  }
  if (isPdf(item.fileName)) {
    pdfVisible.value = true
    return
  }
  ElMessage.info('该格式暂不支持在线预览，将为您下载文件')
  downloadFile(item)
}

const downloadFile = (item) => {
  if (!item.url) {
    ElMessage.warning('文件地址缺失，无法下载')
    return
  }
  const link = document.createElement('a')
  link.href = resolveFileUrl(item.url)
  link.download = item.fileName || ''
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleDelete = async (item) => {
  try {
    await ElMessageBox.confirm('删除后无法恢复。确认删除此附件吗？', '删除附件', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  deletingId.value = String(item.id)
  try {
    await deletePatientAttachmentById(String(props.patientId), String(item.id))
    list.value = list.value.filter((row) => String(row.id) !== String(item.id))
    total.value = Math.max(total.value - 1, 0)
    ElMessage.success('已删除')
  } catch (err) {
    ElMessage.error(err?.message || '删除失败，请稍后重试')
  } finally {
    deletingId.value = ''
  }
}

watch(
  () => props.patientId,
  () => fetchList(true)
)

onMounted(() => {
  fetchList(true)
})
</script>

<template>
  <div class="attachment-panel">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">附件管理</h2>
        <p class="panel-sub">支持 PDF、Word、Excel、图片格式，单文件不超过 20MB</p>
      </div>
      <el-button
        class="upload-btn"
        :icon="UploadFilled"
        :loading="uploading"
        :disabled="!patientId"
        @click="triggerSelect"
      >
        上传附件
      </el-button>
      <input
        ref="fileInput"
        type="file"
        class="hidden-input"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        @change="onInputChange"
      >
    </div>

    <div v-loading="loading" class="panel-body">
      <el-empty v-if="!loading && !list.length && !pendingFile" description="暂无附件" :image-size="90" />

      <div v-else class="attachment-list">
        <div v-if="pendingFile" class="attachment-item attachment-item--pending">
          <div class="file-icon" :class="fileTypeOf(pendingFile.name).iconClass">
            <el-icon><component :is="fileTypeOf(pendingFile.name).icon" /></el-icon>
          </div>
          <div class="file-meta">
            <div class="file-name">{{ pendingFile.name }}</div>
            <div class="file-sub">
              <span>{{ fileTypeOf(pendingFile.name).label }}</span>
              <span class="dot">·</span>
              <span>{{ formatSize(pendingFile.size) }}</span>
              <span class="dot">·</span>
              <span class="pending-text">待上传</span>
            </div>
          </div>
          <div class="file-actions">
            <el-button type="primary" size="small" :loading="uploading" @click="submitUpload">重试</el-button>
            <el-button size="small" :disabled="uploading" @click="removePending">移除</el-button>
          </div>
        </div>

        <div v-for="item in list" :key="String(item.id)" class="attachment-item">
          <div class="file-icon" :class="fileTypeOf(item.fileName).iconClass">
            <el-icon><component :is="fileTypeOf(item.fileName).icon" /></el-icon>
          </div>
          <div class="file-meta">
            <div class="file-name">{{ displayText(item.fileName) }}</div>
            <div class="file-sub">
              <span>{{ fileTypeOf(item.fileName).label }}</span>
              <span class="dot">·</span>
              <span>{{ formatSize(item.fileSize) }}</span>
              <span class="dot">·</span>
              <span>{{ formatTime(item.createTime) }}</span>
              <span class="dot">·</span>
              <span :class="{ missing: !uploaderText(item) }">
                {{ uploaderText(item) || NOT_PROVIDED }}
              </span>
            </div>
          </div>
          <div class="file-actions">
            <el-button link :disabled="!item.url" title="查看" @click="viewFile(item)">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button link title="下载" @click="downloadFile(item)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button
              link
              type="danger"
              title="删除"
              :loading="deletingId === String(item.id)"
              @click="handleDelete(item)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="load-more">
        <el-button :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <!-- 图片预览：el-image-viewer 全屏弹层，支持缩放/旋转/关闭 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="[previewUrl]"
      :initial-index="0"
      hide-on-click-modal
      teleported
      @close="viewerVisible = false"
    />

    <!-- PDF 预览：弹窗内嵌 iframe，浏览器原生渲染 -->
    <el-dialog
      v-model="pdfVisible"
      :title="previewName"
      width="80%"
      top="6vh"
      append-to-body
      destroy-on-close
    >
      <iframe v-if="pdfVisible" :src="previewUrl" class="pdf-frame" title="PDF 预览"></iframe>
    </el-dialog>
  </div>
</template>

<style scoped>
.attachment-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.panel-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.upload-btn.el-button {
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.upload-btn.el-button:hover,
.upload-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
  color: #fff;
}

.hidden-input {
  display: none;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.attachment-item:hover {
  border-color: #c7d2fe;
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.06);
}

.attachment-item--pending {
  border-style: dashed;
  background: #f8faff;
}

.file-icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 22px;
}

.file-icon .el-icon {
  font-size: 22px;
}

.type-pdf {
  background: #fef2f2;
  color: #ef4444;
}

.type-word {
  background: #eff6ff;
  color: #2563eb;
}

.type-excel {
  background: #ecfdf5;
  color: #059669;
}

.type-image {
  background: #f5f3ff;
  color: #7c3aed;
}

.type-default {
  background: #f3f4f6;
  color: #6b7280;
}

.file-meta {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-sub {
  margin-top: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.file-sub .dot {
  color: #d1d5db;
}

.missing {
  color: #ef4444;
}

.pending-text {
  color: #d97706;
}

.file-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-actions .el-button {
  font-size: 17px;
  color: #374151;
}

.file-actions .el-button.is-link:hover {
  color: #4f7cff;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}

.pdf-frame {
  width: 100%;
  height: 72vh;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}
</style>
