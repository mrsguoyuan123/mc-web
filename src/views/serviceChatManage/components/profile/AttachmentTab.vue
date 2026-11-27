<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Folder, View } from '@element-plus/icons-vue'
import { getPatientAttachmentsById } from '../../../../api/index.js'
import {
  MISSING_TEXT,
  formatTime,
  isMissing,
  resolveFileUrl,
  toPage
} from '../../../../utils/index.js'
import {
  ATTACHMENT_CATEGORY_OPTIONS,
  UPLOADER_ROLE_TEXT,
  formatFileSize,
  getFileExt,
  isImageFile
} from '../../utils.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const activeCategory = ref('')

// 预览状态：图片走 el-image-viewer，PDF 走弹窗 iframe
const viewerVisible = ref(false)
const pdfVisible = ref(false)
const previewUrl = ref('')
const previewName = ref('')

const categoryPills = computed(() => ['', ...ATTACHMENT_CATEGORY_OPTIONS])

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (activeCategory.value) params.category = activeCategory.value
    const res = await getPatientAttachmentsById(String(props.patientId), params)
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
  () => resetAndFetch(),
  { immediate: true }
)

const resetAndFetch = () => {
  page.value = 1
  fetchData()
}

const switchCategory = (category) => {
  if (activeCategory.value === category) return
  activeCategory.value = category
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

// 最近上传时间：列表按接口顺序取第一条 createTime
const latestTime = computed(() => {
  const first = list.value[0]?.createTime
  return first ? formatTime(first, true) : ''
})

const typeLabel = (fileName) => {
  const ext = getFileExt(fileName)
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'Word'
  if (['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (isImageFile(fileName)) return '图片'
  return '文件'
}

const uploaderText = (item) => UPLOADER_ROLE_TEXT[item.uploaderRole] || ''

const fullUrl = (item) => resolveFileUrl(item.url)

const isPdf = (fileName) => getFileExt(fileName) === 'pdf'

const viewFile = (item) => {
  if (isMissing(item.url)) {
    ElMessage.warning('文件地址缺失，无法预览')
    return
  }
  previewUrl.value = fullUrl(item)
  previewName.value = item.fileName || '附件预览'
  if (isImageFile(item.fileName)) {
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
  if (isMissing(item.url)) {
    ElMessage.warning('文件地址缺失，无法下载')
    return
  }
  const link = document.createElement('a')
  link.href = fullUrl(item)
  link.download = item.fileName || ''
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else>
      <div class="panel-head">
        <div>
          <h4>全部附件</h4>
          <p class="section-sub">
            共 {{ total }} 份<span v-if="latestTime"> · 最近上传 {{ latestTime }}</span>
          </p>
        </div>
        <el-tag size="small" type="info" effect="plain">只读</el-tag>
      </div>

      <div class="pill-group">
        <button
          v-for="category in categoryPills"
          :key="category"
          type="button"
          class="pill"
          :class="{ active: activeCategory === category }"
          @click="switchCategory(category)"
        >
          {{ category || '全部' }}
        </button>
      </div>

      <div v-if="list.length" class="attachment-list">
        <div v-for="item in list" :key="item.id" class="attachment-item">
          <span class="file-icon">
            <el-icon><Folder /></el-icon>
          </span>
          <div class="file-meta">
            <div class="file-name-row">
              <span class="file-name" :class="{ missing: isMissing(item.fileName) }">
                {{ isMissing(item.fileName) ? MISSING_TEXT : item.fileName }}
              </span>
              <el-tag
                v-if="!isMissing(item.category)"
                size="small"
                effect="plain"
                class="category-tag"
              >
                {{ item.category }}
              </el-tag>
            </div>
            <div class="file-sub">
              <span>{{ typeLabel(item.fileName) }}</span>
              <span class="dot">·</span>
              <span>{{ formatFileSize(item.fileSize) }}</span>
              <span class="dot">·</span>
              <span>{{ isMissing(item.createTime) ? MISSING_TEXT : formatTime(item.createTime, true) }}</span>
              <span class="dot">·</span>
              <span>上传角色：</span>
              <span :class="{ missing: !uploaderText(item) }">
                {{ uploaderText(item) || MISSING_TEXT }}
              </span>
            </div>
          </div>
          <div class="file-actions">
            <el-button link :disabled="isMissing(item.url)" @click="viewFile(item)">
              <el-icon><View /></el-icon>预览
            </el-button>
            <el-button link :disabled="isMissing(item.url)" @click="downloadFile(item)">
              <el-icon><Download /></el-icon>下载
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无附件" :image-size="90" />

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

    <!-- 图片预览：全屏弹层 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="[previewUrl]"
      :initial-index="0"
      hide-on-click-modal
      teleported
      @close="viewerVisible = false"
    />

    <!-- PDF 预览：弹窗内嵌 iframe -->
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
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
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
  padding: 14px 18px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.file-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22px;
}

.file-meta {
  flex: 1;
  min-width: 0;
}

.file-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-tag {
  flex: 0 0 auto;
}

.file-sub {
  margin-top: 5px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.file-sub .dot {
  color: #d1d5db;
}

.file-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
}

.pdf-frame {
  width: 100%;
  height: 72vh;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
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