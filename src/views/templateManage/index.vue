<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模板类型配色
const typeMap = {
  问诊: { color: '#2563eb', bg: 'rgba(232,241,255,0.5)' },
  报告解读: { color: '#4b5563', bg: 'rgba(243,244,246,0.5)' },
  营养建议: { color: '#16a34a', bg: 'rgba(220,252,231,0.5)' },
  健康咨询: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  复诊提醒: { color: '#f5222d', bg: 'rgba(254,240,240,0.5)' }
}
const typeOptions = Object.keys(typeMap)
const statusOptions = ['启用', '停用']

// 统计内容中的变量数 {变量名}
const varCount = (content) => (content.match(/\{[^{}]+\}/g) || []).length

// 模板模拟数据
const templates = ref([
  {
    id: 1, name: '初诊问诊模板', type: '问诊', category: '妇产科', status: '启用',
    creator: '张医生', used: 256, created: '2024-01-15',
    content: '您好{患者姓名}，我是{医生姓名}医生。请问您目前主要有哪些不适症状？症状持续多久了？是否有相关病史？'
  },
  {
    id: 2, name: 'B超报告解读', type: '报告解读', category: '妇产科', status: '启用',
    creator: '李医生', used: 189, created: '2024-02-20',
    content: '{患者姓名}您好，您{检查日期}的{检查部位}超声结果：{超声所见}。建议携带报告到院面诊。'
  },
  {
    id: 3, name: '孕期营养建议', type: '营养建议', category: '产科', status: '启用',
    creator: '王医生', used: 342, created: '2024-03-08',
    content: '{孕妇姓名}您好，目前孕{孕周}。结合体重{体重}kg，建议：{饮食建议}。下次产检时间：{复诊时间}。'
  },
  {
    id: 4, name: '产后恢复咨询', type: '健康咨询', category: '产科', status: '启用',
    creator: '赵医生', used: 178, created: '2024-04-12',
    content: '{产妇姓名}您好，您于{分娩日期}{分娩方式}分娩。当前{恢复情况}，建议：{建议}。'
  },
  {
    id: 5, name: '复诊提醒通知', type: '复诊提醒', category: '通用', status: '启用',
    creator: '孙医生', used: 425, created: '2024-05-06',
    content: '{患者姓名}您好，提醒您于{复诊日期}到{复诊科室}复诊，请按时就诊。'
  }
])

// 顶部统计
const stats = computed(() => {
  const totalUsed = templates.value.reduce((s, t) => s + t.used, 0)
  const askCount = templates.value.filter((t) => t.type === '问诊').length
  return [
    { label: '模板总数', value: String(templates.value.length), unit: '个模板' },
    { label: '总使用次数', value: totalUsed.toLocaleString(), unit: '次使用' },
    { label: '问诊模板', value: String(askCount), unit: '个模板' },
    { label: '平均使用', value: String(Math.round(totalUsed / templates.value.length)), unit: '次/模板' }
  ]
})

// 筛选（实时）
const keyword = ref('')
const filterType = ref('')
const filtered = computed(() =>
  templates.value.filter((t) => {
    const word = keyword.value.trim()
    const matchWord =
      !word || [t.name, t.content, t.category].some((v) => v.includes(word))
    const matchType = !filterType.value || t.type === filterType.value
    return matchWord && matchType
  })
)

// 添加/编辑弹窗
const dialogVisible = ref(false)
const mode = ref('add')
const formRef = ref()
const createForm = () => ({ id: null, name: '', type: '问诊', category: '', status: '启用', creator: '', used: 0, content: '' })
const form = reactive(createForm())
const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  category: [{ required: true, message: '请输入分类标签', trigger: 'blur' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}

const openAdd = () => {
  Object.assign(form, createForm())
  mode.value = 'add'
  dialogVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  Object.assign(form, JSON.parse(JSON.stringify(row)))
  mode.value = 'edit'
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (mode.value === 'edit') {
      const target = templates.value.find((t) => t.id === form.id)
      Object.assign(target, {
        name: form.name, type: form.type, category: form.category,
        status: form.status, content: form.content
      })
      ElMessage.success('模板已更新')
    } else {
      templates.value.unshift({
        ...JSON.parse(JSON.stringify(form)),
        id: Date.now(), creator: '管理员', used: 0,
        created: new Date().toISOString().slice(0, 10)
      })
      ElMessage.success('模板已添加')
    }
    dialogVisible.value = false
  })
}

// 查看详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const detailVars = computed(() => detail.value?.content.match(/\{[^{}]+\}/g) || [])

const openView = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 复制模板内容
const copyContent = async () => {
  const text = detail.value.content
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  ElMessage.success('内容已复制')
}

// 复制模板
const handleCopy = (row) => {
  templates.value.unshift({
    ...JSON.parse(JSON.stringify(row)),
    id: Date.now(),
    name: `${row.name}（副本）`,
    creator: '管理员',
    used: 0
  })
  ElMessage.success('模板已复制')
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除模板「${row.name}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    templates.value = templates.value.filter((t) => t.id !== row.id)
    ElMessage.success('模板已删除')
  }).catch(() => {})
}
const { page: tmPage, pageSize: tmSize, pagedData: pagedTemplates, total: tmTotal } = useTablePage(filtered)
</script>
<template>
  <div class="tpl-page">
    <div class="page-header">
      <div>
        <h1>模板管理</h1>
        <p>管理各类回复模板</p>
      </div>
      <el-button type="primary" class="btn-blue" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>添加模板
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="stat-item">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-main">
          <span class="stat-value">{{ item.value }}</span>
          <span class="stat-sub">{{ item.unit }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <h3>筛选条件</h3>
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索模板名称、内容或分类...">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterType" class="filter-select" size="large" clearable placeholder="全部类型">
          <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
        </el-select>
      </div>
    </div>

    <!-- 模板列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>模板列表</h3>
        <span class="head-sub">共 {{ filtered.length }} 个模板</span>
      </div>
      <el-table :data="pagedTemplates" stripe>
        <el-table-column label="模板名称" prop="name" min-width="150" />
        <el-table-column label="类型" min-width="110">
          <template #default="{ row }">
            <span class="type-tag" :style="{ color: typeMap[row.type].color, background: typeMap[row.type].bg }">
              {{ row.type }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="category" min-width="90" />
        <el-table-column label="变量数" min-width="90" align="center">
          <template #default="{ row }">{{ varCount(row.content) }} 个</template>
        </el-table-column>
        <el-table-column label="使用次数" min-width="100">
          <template #default="{ row }">
            <span class="used-pill">{{ row.used }} 次</span>
          </template>
        </el-table-column>
        <el-table-column label="创建人" prop="creator" min-width="90" />
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <span class="status-tag" :class="row.status === '启用' ? 'on' : 'off'">{{ row.status }}</span>
          </template>
        </el-table-column>
                <el-table-column label="操作" width="170" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openView(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="复制" placement="top">
              <el-button type="primary" link @click="handleCopy(row)"><el-icon><CopyDocument /></el-icon></el-button>
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
          <el-empty description="暂无符合条件的模板" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="tmPage"
        v-model:page-size="tmSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="tmTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="tmPage = 1"
      />
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="620px" class="tpl-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ mode === 'edit' ? '编辑模板' : '添加模板' }}</h3>
          <p>{{ mode === 'edit' ? '修改模板信息' : '添加新的回复模板' }}</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="模板名称" prop="name">
            <el-input v-model="form.name" size="large" placeholder="请输入模板名称" />
          </el-form-item>
          <el-form-item label="模板类型" prop="type">
            <el-select v-model="form.type" class="full-control" size="large">
              <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类标签" prop="category">
            <el-input v-model="form.category" size="large" placeholder="如：妇产科" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" class="full-control" size="large">
              <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" resize="none"
            placeholder="请输入模板内容，变量使用 {变量名} 格式" />
        </el-form-item>
        <div v-if="form.content" class="var-tip">
          模板变量（{{ varCount(form.content) }} 个）：
          <el-tag v-for="v in form.content.match(/\{[^{}]+\}/g) || []" :key="v"
            size="small" round effect="plain" class="var-tag">{{ v.replace(/[{}]/g, '') }}</el-tag>
        </div>
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="handleSubmit">
          {{ mode === 'edit' ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情弹窗 -->
    <el-dialog v-model="detailVisible" width="780px" class="tpl-detail-dialog">
      <template #header>
        <div class="detail-heading">
          <h2>{{ detail?.name }}</h2>
          <p>{{ detail?.type }} · {{ detail?.category }}</p>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <div class="detail-label">模板内容</div>
        <div class="detail-content">{{ detail.content }}</div>

        <div class="detail-grid">
          <div>
            <div class="detail-label">模板变量</div>
            <div class="var-list">
              <span v-for="v in detailVars" :key="v" class="var-pill">{{ v }}</span>
              <span v-if="!detailVars.length" class="no-var">无变量</span>
            </div>
          </div>
          <div>
            <div class="detail-label">使用次数</div>
            <span class="detail-used">{{ detail.used }} 次</span>
          </div>
          <div>
            <div class="detail-label">创建人</div>
            <div class="detail-value">{{ detail.creator }}</div>
          </div>
          <div>
            <div class="detail-label">创建时间</div>
            <div class="detail-value">{{ detail.created }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button size="large" class="copy-btn" @click="copyContent">
          <el-icon><CopyDocument /></el-icon>复制内容
        </el-button>
        <el-button size="large" type="primary" class="btn-blue" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.tpl-page {
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
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 22px;
  margin: 22px 0;
  padding: 28px 44px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.stat-label {
  font-size: 16px;
  font-weight: 400;
  color: #9ca3af;
}

.stat-main {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-top: 22px;
}

.stat-value {
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.5px;
  color: #111827;
}

.stat-sub {
  font-size: 14px;
  color: #9ca3af;
}

/* 筛选区 */
.filter-card {
  padding: 20px 22px;
}

.filter-card h3 {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
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

:deep(.el-table .el-button__text) {
  font-weight: 500;
}

/* 类型标签 */
.type-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* 使用次数灰胶囊 */
.used-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
}

/* 状态标签（截图为黑色实心） */
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

/* 表单弹窗 */
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

.var-tip {
  margin-top: -6px;
  font-size: 12px;
  color: #6b7280;
}

.var-tag {
  margin: 0 6px 4px 0;
}

/* 查看详情弹窗 */
.detail-heading h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #111827;
}

.detail-heading p {
  margin: 10px 0 0;
  font-size: 15px;
  color: #9ca3af;
}

.detail-body {
  padding-top: 2px;
}

.detail-label {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
}

.detail-content {
  padding: 22px 24px;
  background: #f7f8fa;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  font-size: 16px;
  line-height: 1.75;
  color: #1f2937;
  white-space: pre-wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px 32px;
  margin-top: 28px;
}

.var-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.var-pill {
  padding: 5px 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  font-size: 14px;
  color: #374151;
}

.no-var {
  font-size: 13px;
  color: #9ca3af;
}

.detail-used {
  display: inline-block;
  padding: 5px 14px;
  background: #f3f4f6;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
}

.detail-value {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
}

.copy-btn {
  border-radius: 10px;
  font-weight: 500;
}

@media (max-width: 992px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
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
.el-dialog.tpl-dialog,
.el-dialog.tpl-detail-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>
