<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAllAppReplyTemplates,
  createAppReplyTemplate,
  updateAppReplyTemplateById,
  deleteAppReplyTemplateById,
  updateAppReplyTemplateStatusById
} from '../../api/index.js'

const STATUS_META = {
  1: { label: '启用', type: 'success' },
  0: { label: '停用', type: 'info' },
  2: { label: '待完善', type: 'warning' }
}

const loading = ref(false)
const templates = ref([])
const keyword = ref('')
const filterStatus = ref('')

const filtered = computed(() => {
  const word = keyword.value.trim()
  return templates.value.filter((item) => {
    const matchWord =
      !word ||
      [item.name, item.content, item.surgeryType, item.note].filter(Boolean).some((v) => String(v).includes(word))
    const matchStatus = filterStatus.value === '' || Number(item.status) === Number(filterStatus.value)
    return matchWord && matchStatus
  })
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAllAppReplyTemplates()
    templates.value = Array.isArray(res) ? res : (res?.list || [])
  } catch (err) {
    templates.value = []
    ElMessage.error(err?.message || '消息模板加载失败')
  } finally {
    loading.value = false
  }
}

// 新增 / 编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)
const createForm = () => ({
  id: '',
  name: '',
  type: '通用',
  surgeryType: '',
  content: '',
  note: '',
  status: 1
})
const form = reactive(createForm())
const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}
const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  resetForm()
  isEdit.value = true
  form.id = String(row.id)
  form.name = row.name || ''
  form.type = row.type || '通用'
  form.surgeryType = row.surgeryType || ''
  form.content = row.content || ''
  form.note = row.note || ''
  form.status = Number(row.status)
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const buildPayload = () => ({
  name: form.name,
  type: form.type,
  surgeryType: form.type === '按手术类型' ? form.surgeryType || undefined : undefined,
  content: form.content,
  note: form.note || undefined,
  status: form.status
})

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateAppReplyTemplateById(form.id, buildPayload())
      ElMessage.success('模板已更新')
    } else {
      await createAppReplyTemplate(buildPayload())
      ElMessage.success('模板已新增')
    }
    dialogVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const onStatusChange = async (row) => {
  const next = Number(row.status) === 1 ? 0 : 1
  try {
    await updateAppReplyTemplateStatusById(String(row.id), next)
    row.status = next
    ElMessage.success(next === 1 ? '已启用' : '已停用')
  } catch (err) {
    ElMessage.error(err?.message || '状态更新失败')
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`将删除模板“${row.name}”，删除后不可恢复。`, '删除模板？', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      await deleteAppReplyTemplateById(String(row.id))
      ElMessage.success('删除成功')
      fetchList()
    } catch (err) {
      ElMessage.error(err?.message || '删除失败')
    }
  }).catch(() => {})
}

const formatTime = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')

onMounted(() => {
  fetchList()
})
</script>
<template>
  <div>
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索模板名称、内容或术式"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterStatus" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option v-for="(meta, key) in STATUS_META" :key="key" :label="meta.label" :value="Number(key)" />
        </el-select>
        <el-button type="primary" size="large" @click="openAdd">
          <el-icon><Plus /></el-icon>新增模板
        </el-button>
      </div>
    </div>

    <div class="panel table-card">
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column label="模板名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">{{ row.type }}</template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="240" show-overflow-tooltip />
        <el-table-column label="使用次数" width="100" align="center">
          <template #default="{ row }">{{ row.usageCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="最近使用" width="160">
          <template #default="{ row }">{{ formatTime(row.lastUsedAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status) === 1"
              @change="onStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无消息模板" :image-size="90" />
        </template>
      </el-table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :width="640" class="umn-dialog" :title="isEdit ? '编辑模板' : '新增模板'">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" class="full-control" size="large">
            <el-option label="通用" value="通用" />
            <el-option label="按手术类型" value="按手术类型" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type === '按手术类型'" label="关联术式">
          <el-input v-model="form.surgeryType" size="large" placeholder="请输入手术类型" />
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入模板内容，支持变量占位" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" size="large" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}
.filter-card {
  margin-top: 16px;
  padding: 18px 22px;
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
  width: 170px;
}
.table-card {
  margin-top: 18px;
  padding: 22px;
}
.full-control {
  width: 100%;
}
:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}
:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}
@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
