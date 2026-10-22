<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 展示位置
const positionOptions = ['首页', '医生页', '健康咨询', '服务页']

// Banner 模拟数据
const banners = ref([
  {
    id: 1, title: '春季健康体检优惠', desc: '全套体检套餐8折优惠', position: '首页', sort: 1,
    start: '2026-02-01', end: '2026-03-31', enabled: true,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900',
    link: '/service/health-check'
  },
  {
    id: 2, title: '儿科专家团队', desc: '资深儿科医生为您服务', position: '医生页', sort: 1,
    start: '2026-01-01', end: '2026-12-31', enabled: true,
    image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=900',
    link: '/doctor/pediatrics'
  },
  {
    id: 3, title: '健康讲座', desc: '每周三下午2点健康讲座', position: '健康咨询', sort: 1,
    start: '2026-02-01', end: '2026-12-31', enabled: false,
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900',
    link: '/consult/lecture'
  },
  {
    id: 4, title: '专家在线问诊', desc: '三甲医院专家在线解答', position: '首页', sort: 2,
    start: '2026-02-01', end: '2026-12-31', enabled: true,
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=900',
    link: '/consult/online'
  }
])

// 筛选
const filterPosition = ref('')
const filtered = computed(() =>
  banners.value
    .filter((b) => !filterPosition.value || b.position === filterPosition.value)
    .sort((a, b) => a.sort - b.sort)
)

// 上下箭头排序（同位置内调整）
const move = (row, dir) => {
  const list = filtered.value
  const idx = list.findIndex((b) => b.id === row.id)
  const target = list[idx + dir]
  if (!target) return
  const tmp = row.sort
  row.sort = target.sort
  target.sort = tmp
}

// 新增 / 编辑弹窗
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const createForm = () => ({
  id: null, title: '', desc: '', image: '', link: '',
  position: '', enabled: true, start: '', end: ''
})
const form = reactive(createForm())
const rules = {
  title: [{ required: true, message: '请输入Banner标题', trigger: 'blur' }],
  image: [{ required: true, message: '请输入图片URL', trigger: 'blur' }],
  position: [{ required: true, message: '请选择展示位置', trigger: 'change' }]
}

const openAdd = () => {
  Object.assign(form, createForm())
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  Object.assign(form, JSON.parse(JSON.stringify(row)))
  isEdit.value = true
  previewVisible.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (form.id) {
      Object.assign(banners.value.find((b) => b.id === form.id), JSON.parse(JSON.stringify(form)))
      ElMessage.success('Banner已更新')
    } else {
      const samePos = banners.value.filter((b) => b.position === form.position)
      banners.value.push({
        ...JSON.parse(JSON.stringify(form)),
        id: Date.now(),
        sort: samePos.length ? Math.max(...samePos.map((b) => b.sort)) + 1 : 1
      })
      ElMessage.success('Banner已添加')
    }
    formVisible.value = false
  })
}

// 预览弹窗
const previewVisible = ref(false)
const preview = ref(null)
const openPreview = (row) => {
  preview.value = row
  previewVisible.value = true
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除Banner「${row.title}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    banners.value = banners.value.filter((b) => b.id !== row.id)
    ElMessage.success('Banner已删除')
  }).catch(() => {})
}
const { page: bmPage, pageSize: bmSize, pagedData: pagedBanners, total: bmTotal } = useTablePage(filtered)
</script>
<template>
  <div class="banner-page">
    <div class="page-header">
      <div>
        <h1>Banner管理</h1>
        <p>管理小程序各页面的Banner轮播图</p>
      </div>
      <el-button type="primary" class="btn-blue" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>添加Banner
      </el-button>
    </div>

    <!-- 筛选 -->
    <div class="panel filter-card">
      <span class="filter-label">展示位置：</span>
      <el-select v-model="filterPosition" class="filter-select" size="large" clearable placeholder="全部位置">
        <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
      </el-select>
    </div>

    <!-- Banner列表 -->
    <div class="panel table-card">
      <el-table :data="pagedBanners" stripe>
        <el-table-column label="预览" width="110">
          <template #default="{ row }">
            <el-image :src="row.image" fit="cover" class="thumb">
              <template #error><div class="img-fallback"><el-icon><Picture /></el-icon></div></template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column label="标题" prop="title" min-width="150" />
        <el-table-column label="描述" prop="desc" min-width="180" show-overflow-tooltip />
        <el-table-column label="展示位置" min-width="110">
          <template #default="{ row }"><span class="pos-tag">{{ row.position }}</span></template>
        </el-table-column>
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ row, $index }">
            <div class="sort-cell">
              <span>{{ row.sort }}</span>
              <div class="sort-arrows">
                <el-icon class="sort-arrow" :class="{ disabled: $index === 0 }" @click="move(row, -1)"><CaretTop /></el-icon>
                <el-icon class="sort-arrow" :class="{ disabled: $index === filtered.length - 1 }" @click="move(row, 1)"><CaretBottom /></el-icon>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="170">
          <template #default="{ row }">
            <div class="date-cell">{{ row.start }}</div>
            <div class="date-cell sub">至 {{ row.end }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
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
        v-model:current-page="bmPage"
        v-model:page-size="bmSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="bmTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="bmPage = 1"
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
          <el-input v-model="form.title" size="large" placeholder="请输入Banner标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" type="textarea" :rows="2" resize="none" placeholder="请输入Banner描述" />
        </el-form-item>
        <el-form-item label="图片URL" prop="image">
          <el-input v-model="form.image" size="large" placeholder="https://example.com/banner.jpg" />
        </el-form-item>
        <el-image v-if="form.image" :src="form.image" fit="cover" class="form-preview">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" size="large" placeholder="/page/path 或 https://example.com" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="展示位置" prop="position">
            <el-select v-model="form.position" class="full-control" size="large" placeholder="请选择展示位置">
              <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item label="启用状态">
            <div class="switch-line">
              <el-switch v-model="form.enabled" />
              <span>{{ form.enabled ? '已启用' : '已停用' }}</span>
            </div>
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.start" type="date" class="full-control" size="large"
              value-format="YYYY-MM-DD" placeholder="年 / 月 / 日" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.end" type="date" class="full-control" size="large"
              value-format="YYYY-MM-DD" placeholder="年 / 月 / 日" />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" width="640" class="banner-dialog preview-dialog" title="Banner预览">
      <div v-if="preview" class="preview-body">
        <el-image :src="preview.image" fit="cover" class="preview-image">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <div class="preview-tags">
          <span class="pos-tag">{{ preview.position }}</span>
          <span class="status-tag" :class="preview.enabled ? 'on' : 'off'">
            {{ preview.enabled ? '已启用' : '已停用' }}
          </span>
        </div>
        <h3 class="preview-title">{{ preview.title }}</h3>
        <p class="preview-desc">{{ preview.desc }}</p>
        <p class="preview-meta">跳转链接：{{ preview.link || '—' }}</p>
        <p class="preview-meta">有效期：{{ preview.start }} 至 {{ preview.end }}</p>
      </div>
      <template #footer>
        <el-button size="large" @click="previewVisible = false">关闭</el-button>
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

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
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
