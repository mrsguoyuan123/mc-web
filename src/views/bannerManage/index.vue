<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAllAppBanners,
  createAppBanner,
  updateAppBannerById,
  deleteAppBannerById,
  updateAppBannerStatusById,
  sortAppBanners
} from '../../api/index.js'

// 展示位置：后端枚举 HOME/DOCTOR/SERVICE/HEALTH
const POSITION_OPTIONS = [
  { value: 'HOME', label: '首页' },
  { value: 'DOCTOR', label: '医生页' },
  { value: 'SERVICE', label: '服务页' },
  { value: 'HEALTH', label: '健康咨询' }
]
const positionLabel = (value) => POSITION_OPTIONS.find((item) => item.value === value)?.label || value || '-'

const loading = ref(false)
const banners = ref([])

// 筛选
const filterPosition = ref('')

const filtered = computed(() =>
  banners.value
    .filter((b) => !filterPosition.value || b.position === filterPosition.value)
    .slice()
    .sort((a, b) => (a.sortNo ?? 0) - (b.sortNo ?? 0))
)

// 前端分页（接口为全量数组）
const page = ref(1)
const pageSize = ref(10)
const pagedBanners = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
const total = computed(() => filtered.value.length)
const handlePageChange = (p) => { page.value = p }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1 }

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAllAppBanners()
    // 兼容后端返回数组或分页对象 { list, total }
    banners.value = Array.isArray(res) ? res : (res?.list || [])
  } catch (err) {
    banners.value = []
    ElMessage.error(err?.message || 'Banner 加载失败')
  } finally {
    loading.value = false
  }
}

// 同位置内上下移动，调用排序接口整体提交
const move = async (row, dir) => {
  const list = filtered.value
  const idx = list.findIndex((b) => String(b.id) === String(row.id))
  const targetIdx = idx + dir
  if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return
  const reordered = list.slice()
  const [current] = reordered.splice(idx, 1)
  reordered.splice(targetIdx, 0, current)
  // 乐观更新 sortNo
  reordered.forEach((item, i) => { item.sortNo = i + 1 })
  try {
    await sortAppBanners({ position: row.position, ids: reordered.map((item) => String(item.id)) })
    ElMessage.success('排序已更新')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '排序失败')
    fetchList()
  }
}

// 新增 / 编辑
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)
const createForm = () => ({
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  position: '',
  sortNo: undefined,
  enabled: 1,
  startDate: '',
  endDate: ''
})
const form = reactive(createForm())
const rules = {
  title: [{ required: true, message: '请输入Banner标题', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请输入图片URL', trigger: 'blur' }],
  position: [{ required: true, message: '请选择展示位置', trigger: 'change' }]
}

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  resetForm()
  isEdit.value = true
  form.id = String(row.id)
  form.title = row.title || ''
  form.description = row.description || ''
  form.imageUrl = row.imageUrl || ''
  form.linkUrl = row.linkUrl || ''
  form.position = row.position || ''
  form.sortNo = row.sortNo
  form.enabled = Number(row.enabled) === 0 ? 0 : 1
  form.startDate = row.startDate || ''
  form.endDate = row.endDate || ''
  previewVisible.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const buildPayload = () => ({
  title: form.title,
  description: form.description || undefined,
  imageUrl: form.imageUrl,
  linkUrl: form.linkUrl || undefined,
  position: form.position,
  sortNo: form.sortNo === undefined || form.sortNo === '' ? undefined : Number(form.sortNo),
  enabled: form.enabled,
  startDate: form.startDate || undefined,
  endDate: form.endDate || undefined
})

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateAppBannerById(form.id, buildPayload())
      ElMessage.success('Banner已更新')
    } else {
      await createAppBanner(buildPayload())
      ElMessage.success('Banner已添加')
    }
    formVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 启停 switch
const statusLoadingId = ref('')
const onStatusChange = async (row) => {
  const next = Number(row.enabled) === 1 ? 0 : 1
  statusLoadingId.value = String(row.id)
  try {
    await updateAppBannerStatusById(String(row.id), next)
    row.enabled = next
    ElMessage.success(next === 1 ? '已启用' : '已停用')
  } catch (err) {
    ElMessage.error(err?.message || '状态更新失败')
  } finally {
    statusLoadingId.value = ''
  }
}

// 预览
const previewVisible = ref(false)
const preview = ref(null)
const openPreview = (row) => {
  preview.value = row
  previewVisible.value = true
}

// 删除（二次确认，文案按产品要求动态拼接标题）
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `将删除“${row.title}”。删除后小程序对应位置将不再展示该内容，历史发布记录请通过操作日志查看。`,
    '删除宣教内容？',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      await deleteAppBannerById(String(row.id))
      ElMessage.success('Banner已删除')
      if (pagedBanners.value.length === 1 && page.value > 1) page.value -= 1
      fetchList()
    } catch (err) {
      ElMessage.error(err?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchList()
})
</script>
<template>
  <div class="banner-page">
    <div class="page-header">
      <div>
        <h1>Banner管理</h1>
        <p>管理小程序各页面的Banner轮播图</p>
      </div>
      <el-button type="primary" class="btn-blue" size="" @click="openAdd">
        <el-icon><Plus /></el-icon>添加Banner
      </el-button>
    </div>

    <!-- 筛选 -->
    <div class="panel filter-card">
      <span class="filter-label">展示位置：</span>
      <el-select v-model="filterPosition" class="filter-select" size="" clearable placeholder="全部位置">
        <el-option
          v-for="item in POSITION_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>

    <!-- Banner列表 -->
    <div class="panel table-card">
      <el-table v-loading="loading" :data="pagedBanners" stripe>
        <el-table-column label="预览" width="110">
          <template #default="{ row }">
            <el-image :src="row.imageUrl" fit="cover" class="thumb">
              <template #error><div class="img-fallback"><el-icon><Picture /></el-icon></div></template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="展示位置" min-width="110">
          <template #default="{ row }"><span class="pos-tag">{{ positionLabel(row.position) }}</span></template>
        </el-table-column>
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ row, $index }">
            <div class="sort-cell">
              <span>{{ row.sortNo ?? 0 }}</span>
              <div class="sort-arrows">
                <el-icon
                  class="sort-arrow"
                  :class="{ disabled: $index === 0 }"
                  @click="move(row, -1)"
                ><CaretTop /></el-icon>
                <el-icon
                  class="sort-arrow"
                  :class="{ disabled: $index === filtered.length - 1 }"
                  @click="move(row, 1)"
                ><CaretBottom /></el-icon>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="170">
          <template #default="{ row }">
            <div class="date-cell">{{ row.startDate || '-' }}</div>
            <div class="date-cell sub">至 {{ row.endDate || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.enabled) === 1"
              :loading="statusLoadingId === String(row.id)"
              @change="onStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="预览" placement="top">
              <el-button type="primary" link @click="openPreview(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无Banner数据" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 添加 / 编辑弹窗 -->
    <el-dialog v-model="formVisible" :width="640" class="banner-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑Banner' : '添加Banner' }}</h3>
          <p>填写Banner信息，图片建议尺寸：750x360</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" size="" placeholder="请输入Banner标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" resize="none" placeholder="请输入Banner描述" />
        </el-form-item>
        <el-form-item label="图片URL" prop="imageUrl">
          <el-input v-model="form.imageUrl" size="" placeholder="https://example.com/banner.jpg" />
        </el-form-item>
        <el-image v-if="form.imageUrl" :src="form.imageUrl" fit="cover" class="form-preview">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <el-form-item label="跳转链接">
          <el-input v-model="form.linkUrl" size="" placeholder="/page/path 或 https://example.com" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="展示位置" prop="position">
            <el-select v-model="form.position" class="full-control" size="" placeholder="请选择展示位置">
              <el-option
                v-for="item in POSITION_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="排序号">
            <el-input-number v-model="form.sortNo" :min="1" controls-position="right" class="full-control" placeholder="数字越小越靠前" />
          </el-form-item>
          
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="form.startDate"
              type="date"
              class="full-control"
              size=""
              value-format="YYYY-MM-DD"
              placeholder="年 / 月 / 日"
            />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker
              v-model="form.endDate"
              type="date"
              class="full-control"
              size=""
              value-format="YYYY-MM-DD"
              placeholder="年 / 月 / 日"
            />
          </el-form-item>
          <el-form-item label="启用状态">
            <div class="switch-line">
              <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
              <span>{{ form.enabled === 1 ? '已启用' : '已停用' }}</span>
            </div>
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button size="" @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" width="640" class="banner-dialog preview-dialog" title="Banner预览">
      <div v-if="preview" class="preview-body">
        <el-image :src="preview.imageUrl" fit="cover" class="preview-image">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <div class="preview-tags">
          <span class="pos-tag">{{ positionLabel(preview.position) }}</span>
          <span class="status-tag" :class="Number(preview.enabled) === 1 ? 'on' : 'off'">
            {{ Number(preview.enabled) === 1 ? '已启用' : '已停用' }}
          </span>
        </div>
        <h3 class="preview-title">{{ preview.title }}</h3>
        <p class="preview-desc">{{ preview.description || '-' }}</p>
        <p class="preview-meta">跳转链接：{{ preview.linkUrl || '—' }}</p>
        <p class="preview-meta">有效期：{{ preview.startDate || '-' }} 至 {{ preview.endDate || '-' }}</p>
      </div>
      <template #footer>
        <el-button size="" @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.banner-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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



.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 18px 22px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.filter-select {
  width: 220px;
}

/* 表格 */
.table-card {
  margin-top: 18px;
  padding: 20px 24px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.thumb {
  width: 68px;
  height: 44px;
  border-radius: 8px;
  background: #f3f4f6;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #c0c4cc;
  font-size: 18px;
  background: #f3f4f6;
}

.pos-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
}

/* 排序 */
.sort-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sort-arrows {
  display: flex;
  flex-direction: column;
}

.sort-arrow {
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.15s ease;
}

.sort-arrow:hover {
  color: #2563eb;
}

.sort-arrow.disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.date-cell {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.date-cell.sub {
  color: #9ca3af;
}

/* 弹窗表单 */
.dialog-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.full-control {
  width: 100%;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-preview {
  width: 100%;
  height: 220px;
  margin: -4px 0 18px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  font-size: 13px;
  color: #6b7280;
}

/* 预览弹窗 */
.preview-body {
  margin-top: -4px;
}

.preview-image {
  width: 100%;
  height: 300px;
  border-radius: 14px;
  overflow: hidden;
  background: #f3f4f6;
}

.preview-tags {
  display: flex;
  gap: 10px;
  margin: 18px 0 12px;
}

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag.on {
  background: rgba(220,252,231,0.5);
  color: #16a34a;
}

.status-tag.off {
  background: rgba(243,244,246,0.5);
  color: #6b7280;
}

.preview-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
}

.preview-desc {
  margin: 0 0 14px;
  font-size: 14px;
  color: #6b7280;
}

.preview-meta {
  margin: 4px 0;
  font-size: 13px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .filter-card {
    flex-wrap: wrap;
  }

  .filter-select {
    width: 100%;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.banner-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>
