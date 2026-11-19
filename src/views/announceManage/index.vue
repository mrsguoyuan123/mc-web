<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAppNoticePage,
  createAppNotice,
  updateAppNoticeById,
  deleteAppNoticeById,
  updateAppNoticeStatusById,
  sortAppNotices,
  getDictDepartmentList
} from '../../api/index.js'

// 展示位置：后端枚举 HOME/DOCTOR/MINI_PROGRAM/PATIENT
const POSITION_OPTIONS = [
  { value: 'HOME', label: '首页公告栏' },
  { value: 'DOCTOR', label: '医生端' },
  { value: 'MINI_PROGRAM', label: '小程序首页' },
  { value: 'PATIENT', label: '用户中心' }
]
const positionLabel = (value) => POSITION_OPTIONS.find((item) => item.value === value)?.label || value || '-'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const statusLoadingId = ref('')

// 筛选
const keyword = ref('')
const filterPosition = ref('')
const filterDepartmentId = ref('')

// 科室下拉
const departmentOptions = ref([])
const departmentNameMap = computed(() =>
  Object.fromEntries(departmentOptions.value.map((item) => [String(item.id), item.name]))
)

// 顶部统计（拉取较大一页后在前端汇总）
const stats = ref([
  { label: '总公告数', value: 0, tone: '#2563eb' },
  { label: '已启用', value: 0, tone: '#16a34a' },
  { label: '首页展示', value: 0, tone: '#7c3aed' },
  { label: '小程序展示', value: 0, tone: '#d97706' },
  { label: '医生端展示', value: 0, tone: '#dc2626' }
])

const buildQuery = () => {
  const params = { page: page.value, pageSize: pageSize.value }
  const word = keyword.value.trim()
  if (word) params.keyword = word
  if (filterPosition.value) params.position = filterPosition.value
  if (filterDepartmentId.value) params.departmentId = String(filterDepartmentId.value)
  return params
}

const fetchDepartments = async () => {
  try {
    departmentOptions.value = (await getDictDepartmentList()) || []
  } catch {
    departmentOptions.value = []
  }
}

const fetchStats = async () => {
  try {
    const res = await getAppNoticePage({ page: 1, pageSize: 100 })
    const list = res?.list || []
    stats.value = [
      { label: '总公告数', value: Number(res?.total) || list.length, tone: '#2563eb' },
      { label: '已启用', value: list.filter((a) => Number(a.enabled) === 1).length, tone: '#16a34a' },
      { label: '首页展示', value: list.filter((a) => a.position === 'HOME').length, tone: '#7c3aed' },
      { label: '小程序展示', value: list.filter((a) => a.position === 'MINI_PROGRAM').length, tone: '#d97706' },
      { label: '医生端展示', value: list.filter((a) => a.position === 'DOCTOR').length, tone: '#dc2626' }
    ]
  } catch {
    /* 统计失败不阻塞列表 */
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAppNoticePage(buildQuery())
    tableData.value = res?.list || []
    total.value = Number(res?.total) || 0
  } catch (err) {
    tableData.value = []
    total.value = 0
    ElMessage.error(err?.message || '公告加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { page.value = 1; fetchList() }
const handleReset = () => {
  keyword.value = ''
  filterPosition.value = ''
  filterDepartmentId.value = ''
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => { page.value = p; fetchList() }
const handleSizeChange = (size) => { pageSize.value = size; page.value = 1; fetchList() }

// 同展位内上下移动，调用排序接口整体提交
const move = async (row, dir) => {
  const idx = tableData.value.findIndex((item) => String(item.id) === String(row.id))
  const targetIdx = idx + dir
  if (idx < 0 || targetIdx < 0 || targetIdx >= tableData.value.length) return
  const reordered = tableData.value.slice()
  const [current] = reordered.splice(idx, 1)
  reordered.splice(targetIdx, 0, current)
  reordered.forEach((item, i) => { item.sortNo = i + 1 })
  try {
    await sortAppNotices({ position: row.position, ids: reordered.map((item) => String(item.id)) })
    ElMessage.success('排序已更新')
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '排序失败')
    fetchList()
  }
}

// 启停 switch
const onStatusChange = async (row) => {
  const next = Number(row.enabled) === 1 ? 0 : 1
  statusLoadingId.value = String(row.id)
  try {
    await updateAppNoticeStatusById(String(row.id), next)
    row.enabled = next
    ElMessage.success(next === 1 ? '已启用' : '已停用')
    fetchStats()
  } catch (err) {
    ElMessage.error(err?.message || '状态更新失败')
  } finally {
    statusLoadingId.value = ''
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
  position: '',
  departmentId: '',
  content: '',
  publishDate: '',
  coverUrl: '',
  sortNo: undefined,
  enabled: 1
})
const form = reactive(createForm())
const rules = {
  title: [{ required: true, message: '请输入告知书标题', trigger: 'blur' }],
  position: [{ required: true, message: '请选择展示位置', trigger: 'change' }],
  content: [{ required: true, message: '请输入告知书内容', trigger: 'blur' }],
  publishDate: [{ required: true, message: '请选择发布日期', trigger: 'change' }]
}

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  form.publishDate = new Date().toISOString().slice(0, 10)
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  resetForm()
  isEdit.value = true
  form.id = String(row.id)
  form.title = row.title || ''
  form.position = row.position || ''
  form.departmentId = row.departmentId ? String(row.departmentId) : ''
  form.content = row.content || ''
  form.publishDate = row.publishDate || ''
  form.coverUrl = row.coverUrl || ''
  form.sortNo = row.sortNo
  form.enabled = Number(row.enabled) === 0 ? 0 : 1
  detailVisible.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const buildPayload = () => ({
  title: form.title,
  type: 'NOTICE',
  position: form.position || undefined,
  departmentId: form.departmentId ? String(form.departmentId) : undefined,
  content: form.content || undefined,
  coverUrl: form.coverUrl || undefined,
  sortNo: form.sortNo === undefined || form.sortNo === '' ? undefined : Number(form.sortNo),
  enabled: form.enabled,
  publishDate: form.publishDate || undefined
})

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateAppNoticeById(form.id, buildPayload())
      ElMessage.success('公告已更新')
    } else {
      await createAppNotice(buildPayload())
      ElMessage.success('公告已发布')
    }
    formVisible.value = false
    fetchList()
    fetchStats()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 删除（二次确认，文案按产品要求动态拼接标题）
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `将删除“${row.title}”。删除后对应位置将不再展示该公告。`,
    '删除公告？',
    {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      await deleteAppNoticeById(String(row.id))
      ElMessage.success('删除成功')
      if (tableData.value.length === 1 && page.value > 1) page.value -= 1
      fetchList()
      fetchStats()
    } catch (err) {
      ElMessage.error(err?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchDepartments()
  fetchList()
  fetchStats()
})
</script>
<template>
  <div class="ann-page">
    <div class="page-header">
      <div>
        <h1>公告管理</h1>
        <p>管理告知书公告的展示位置和排序</p>
      </div>
      <el-button type="primary" class="btn-blue" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>新增公告
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <strong class="stat-value" :style="{ color: item.tone }">{{ item.value }}</strong>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 筛选区 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索告知书标题、内容或科室..."
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select
          v-model="filterPosition"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部展示位置"
          @change="handleSearch"
        >
          <el-option
            v-for="item in POSITION_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filterDepartmentId"
          class="filter-select"
          size="large"
          clearable
          placeholder="全部科室"
          @change="handleSearch"
        >
          <el-option
            v-for="dept in departmentOptions"
            :key="dept.id"
            :label="dept.name"
            :value="dept.id"
          />
        </el-select>
        <el-button type="primary" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 公告列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>公告列表</h3>
        <span class="head-sub">共 {{ total }} 条，可通过上下箭头调整顺序</span>
      </div>
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe>
        <el-table-column label="排序" width="86" align="center">
          <template #default="{ row, $index }">
            <div class="sort-cell">
              <el-icon
                class="sort-arrow"
                :class="{ disabled: $index === 0 }"
                @click="move(row, -1)"
              ><Top /></el-icon>
              <el-icon
                class="sort-arrow"
                :class="{ disabled: $index === tableData.length - 1 }"
                @click="move(row, 1)"
              ><Bottom /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="告知书标题" prop="title" min-width="220">
          <template #default="{ row }">
            <span class="title-cell"><el-icon><Document /></el-icon>{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="科室" min-width="110">
          <template #default="{ row }">
            <span class="dept-tag">{{ departmentNameMap[String(row.departmentId)] || '全院通用' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="展示位置" min-width="120">
          <template #default="{ row }">
            <span class="pos-tag">{{ positionLabel(row.position) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布日期" prop="publishDate" min-width="120">
          <template #default="{ row }">{{ row.publishDate || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="90">
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
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
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
          <el-empty description="暂无符合条件的公告" :image-size="90" />
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
    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="formVisible" :width="640" class="ann-dialog" :title="isEdit ? '编辑公告' : '新增公告'">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="告知书标题" prop="title">
          <el-input v-model="form.title" size="large" placeholder="例如：手术麻醉知情同意书" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="展示位置" prop="position">
            <el-select v-model="form.position" class="full-control" size="large" placeholder="请选择展示位置">
              <el-option
                v-for="item in POSITION_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="所属科室">
            <el-select
              v-model="form.departmentId"
              class="full-control"
              size="large"
              clearable
              filterable
              placeholder="不选则全院通用"
            >
              <el-option
                v-for="dept in departmentOptions"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="告知书内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="请输入告知书详细内容"
          />
        </el-form-item>
        <el-form-item label="发布日期" prop="publishDate">
          <el-date-picker
            v-model="form.publishDate"
            type="date"
            class="full-control"
            size="large"
            value-format="YYYY-MM-DD"
            placeholder="年 / 月 / 日"
          />
        </el-form-item>
        <el-form-item label="配图链接（选填）">
          <el-input v-model="form.coverUrl" size="large" placeholder="https://example.com/image.jpg" />
        </el-form-item>
        <el-image v-if="form.coverUrl" :src="form.coverUrl" fit="cover" class="form-preview">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sortNo" :min="1" controls-position="right" class="full-control" placeholder="数字越小越靠前" />
        </el-form-item>
        <el-form-item>
          <div class="switch-line">
            <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
            <span>立即启用</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :width="680" class="ann-dialog detail-dialog" show-close>
      <template #header>
        <div class="detail-heading">
          <el-icon class="detail-icon"><Document /></el-icon>
          <span>{{ detail?.title }}</span>
        </div>
      </template>
      <div v-if="detail" class="detail-body">
        <el-image v-if="detail.coverUrl" :src="detail.coverUrl" fit="cover" class="detail-image">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <div class="detail-grid">
          <div>
            <div class="detail-label">科室</div>
            <div class="detail-value">{{ departmentNameMap[String(detail.departmentId)] || '全院通用' }}</div>
          </div>
          <div>
            <div class="detail-label">展示位置</div>
            <div class="detail-value">{{ positionLabel(detail.position) }}</div>
          </div>
          <div>
            <div class="detail-label">发布日期</div>
            <div class="detail-value">{{ detail.publishDate || '-' }}</div>
          </div>
          <div>
            <div class="detail-label">状态</div>
            <span class="status-tag" :class="Number(detail.enabled) === 1 ? 'on' : 'off'">
              {{ Number(detail.enabled) === 1 ? '已启用' : '已停用' }}
            </span>
          </div>
        </div>
        <div class="detail-label">告知书内容</div>
        <div class="detail-content">{{ detail.content }}</div>
      </div>
      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="openEdit(detail)">编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ann-page {
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

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 蓝色主按钮 */
.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin: 22px 0;
}

.stat-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(31, 45, 80, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

/* 筛选区 */
.filter-card {
  padding: 20px 22px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

/* 表格 */
.table-card {
  margin-top: 22px;
  padding: 22px 24px;
}

.table-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.table-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.head-sub {
  font-size: 13px;
  color: #9ca3af;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.title-cell {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #2563eb;
  font-weight: 500;
}

.dept-tag,
.pos-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.dept-tag {
  background: #f3f4f6;
  color: #4b5563;
}

.pos-tag {
  background: #eff6ff;
  color: #2563eb;
}

/* 排序操作 */
.sort-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: move;
  color: #6b7280;
  user-select: none;
}

.sort-arrow {
  font-size: 14px;
  transition: color 0.15s ease;
}

.sort-arrow:hover {
  color: #2563eb;
}

.sort-arrow.disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

:deep(.el-table__row.is-dragging) {
  opacity: 0.45;
}

:deep(.el-table__row.is-over td.el-table__cell) {
  background: #eff6ff;
}

/* 表单 */
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

.form-preview,
.detail-image {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 18px;
  background: #f3f4f6;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 13px;
  color: #9ca3af;
  background: #f3f4f6;
}

/* 详情弹窗 */
.detail-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 700;
}

.detail-icon {
  color: #2563eb;
  font-size: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 32px;
  margin: 22px 0 24px;
}

.detail-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #9ca3af;
}

.detail-value {
  font-size: 15px;
  font-weight: 500;
  color: #1f2937;
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

.detail-content {
  padding: 18px 20px;
  background: #f0f6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-row {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .form-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.ann-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>
