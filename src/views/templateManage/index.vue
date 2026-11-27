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

/* ============================ 枚举字典 ============================ */
// 适用端 terminalsJson（多选）
const TERMINAL_OPTIONS = [
  { label: '电脑端', value: 'PC' },
  { label: '小程序', value: 'MINI_PROGRAM' }
]
// 疾病标签候选（来自字典维护 - 疾病字典；接口未就绪前用占位，接入字典后替换）
const DISEASE_OPTIONS = [
  '妇科', '产科', '肿瘤科', '肛肠科', '骨科', '内分泌科', '孕期头晕',
  '轻度贫血', '孕期管理', '产后恢复', '高血压', '糖尿病'
]
// 模板场景（type / 场景标签）
const SCENE_OPTIONS = [
  { label: '问诊', value: 'CONSULT' },
  { label: '报告解读', value: 'REPORT_REVIEW' },
  { label: '营养建议', value: 'NUTRITION' },
  { label: '健康咨询', value: 'HEALTH_ADVICE' },
  { label: '复诊提醒', value: 'FOLLOWUP_REMINDER' },
  { label: '用药提醒', value: 'MEDICATION' },
  { label: '术后护理', value: 'POSTOP_CARE' },
  { label: '其他', value: 'OTHER' }
]
// 适用角色 rolesJson
const ROLE_OPTIONS = [
  { label: '客服', value: 'CS' },
  { label: '医生', value: 'DOCTOR' },
  { label: '陪诊师', value: 'ESCORT' },
  { label: '驻点人员', value: 'STATION' }
]
// 状态：1 启用 / 0 停用 / 2 待完善
const STATUS_OPTIONS = [
  { label: '已启用', value: 1 },
  { label: '已停用', value: 0 },
  { label: '待完善', value: 2 }
]
const STATUS_MAP = {
  1: { label: '已启用', type: 'success' },
  0: { label: '已停用', type: 'danger' },
  2: { label: '待完善', type: 'warning' }
}

/* ============================ 列表与筛选 ============================ */
const loading = ref(false)
const list = ref([])

// 筛选条件
const query = reactive({
  keyword: '',
  terminal: '',
  scene: '',
  role: '',
  status: '',
  creator: '',
  disease: ''
})

// 本地筛选（接口为全量 getAll；若后端提供分页查询参数，可改为服务端筛选）
async function fetchList() {
  loading.value = true
  try {
    const res = await getAllAppReplyTemplates()
    list.value = Array.isArray(res) ? res : res?.list || []
  } catch (e) {
    ElMessage.error(e?.message || '模板加载失败')
  } finally {
    loading.value = false
  }
}

// 解析 JSON 字符串字段为数组
function parseJsonArray(val) {
  if (Array.isArray(val)) return val
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 标签翻译：按字典匹配，匹配不到原样展示
function labelOf(options, value) {
  const hit = options.find((o) => o.value === value)
  return hit ? hit.label : value
}

// 行数据规整
const tableData = computed(() => {
  return list.value.map((item) => ({
    ...item,
    terminalList: parseJsonArray(item.terminalsJson),
    roleList: parseJsonArray(item.rolesJson),
    diseaseList: parseJsonArray(item.diseasesJson),
    questionList: parseJsonArray(item.questionsJson)
  }))
})

// 疾病标签聚合（用于顶部疾病标签栏）
const diseaseGroups = computed(() => {
  const map = new Map()
  tableData.value.forEach((t) => {
    t.diseaseList.forEach((d) => {
      map.set(d, (map.get(d) || 0) + 1)
    })
  })
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
})

// 统计卡片
const stats = computed(() => ({
  total: list.value.length,
  enabled: list.value.filter((t) => t.status === 1).length,
  diseaseCount: diseaseGroups.value.length,
  monthUse: list.value.reduce((sum, t) => sum + (Number(t.usageCount) || 0), 0)
}))

// 筛选后结果
const filteredData = computed(() => {
  return tableData.value.filter((t) => {
    if (query.keyword) {
      const kw = query.keyword.toLowerCase()
      const hay = `${t.name || ''} ${t.content || ''} ${(t.questionList || []).join(' ')}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    if (query.terminal && !t.terminalList.includes(query.terminal)) return false
    if (query.scene && t.surgeryType !== query.scene) return false
    if (query.role && !t.roleList.includes(query.role)) return false
    if (query.status !== '' && t.status !== Number(query.status)) return false
    if (query.creator && t.creatorId !== query.creator) return false
    if (query.disease && !t.diseaseList.includes(query.disease)) return false
    return true
  })
})

/* ============================ 选择与批量操作 ============================ */
const selectedIds = ref([])
const onSelectionChange = (rows) => {
  selectedIds.value = rows.map((r) => r.id)
}

const batchEnable = async () => {
  if (!selectedIds.value.length) return ElMessage.warning('请先勾选模板')
  try {
    for (const id of selectedIds.value) {
      await updateAppReplyTemplateStatusById(id, 1)
    }
    ElMessage.success('批量启用成功')
    fetchList()
  } catch (e) {
    ElMessage.error(e?.message || '批量启用失败')
  }
}

const batchDisable = async () => {
  if (!selectedIds.value.length) return ElMessage.warning('请先勾选模板')
  try {
    for (const id of selectedIds.value) {
      await updateAppReplyTemplateStatusById(id, 0)
    }
    ElMessage.success('批量停用成功')
    fetchList()
  } catch (e) {
    ElMessage.error(e?.message || '批量停用失败')
  }
}

/* ============================ 单条操作 ============================ */
// 复制模板：带原内容打开新增弹窗，名称追加「副本」，默认草稿态
function onCopyRow(row) {
  openCreate()
  Object.assign(form, {
    name: `${row.name}（副本）`,
    surgeryType: row.surgeryType || '',
    universal: row.common === 1,
    terminals: parseJsonArray(row.terminalsJson),
    roles: parseJsonArray(row.rolesJson),
    diseases: parseJsonArray(row.diseasesJson),
    questions: parseJsonArray(row.questionsJson),
    content: row.content || '',
    note: row.note || '',
    status: 2
  })
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」？删除后不可恢复。`, '删除确认', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消'
  })
  try {
    await deleteAppReplyTemplateById(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

async function toggleStatus(row) {
  const next = row.status === 1 ? 0 : 1
  try {
    await updateAppReplyTemplateStatusById(row.id, next)
    ElMessage.success(next === 1 ? '已启用' : '已停用')
    fetchList()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  }
}

/* ============================ 新增 / 编辑弹窗 ============================ */
const dialogVisible = ref(false)
const dialogRef = ref()
const isEdit = ref(false)
const isView = ref(false) // 查看模式：同弹窗只读，不可编辑
const previewTab = ref('PC') // PC / MINI_PROGRAM
const questionInput = ref('')

const form = reactive({
  id: null,
  name: '',
  surgeryType: '',      // 模板场景
  universal: false,     // 通用模板开关
  terminals: [],
  roles: [],
  diseases: [],
  questions: [],
  content: '',
  note: '',
  status: 1
})

const formRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  surgeryType: [{ required: true, message: '请选择模板场景', trigger: 'change' }],
  diseases: [{ required: true, message: '请选择关联疾病', trigger: 'change' }],
  terminals: [{ required: true, message: '请选择适用端', trigger: 'change' }],
  roles: [{ required: true, message: '请选择适用角色', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板正文', trigger: 'blur' }]
}

function fillForm(row) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    surgeryType: row.surgeryType || '',
    universal: row.common === 1,
    terminals: parseJsonArray(row.terminalsJson),
    roles: parseJsonArray(row.rolesJson),
    diseases: parseJsonArray(row.diseasesJson),
    questions: parseJsonArray(row.questionsJson),
    content: row.content || '',
    note: row.note || '',
    status: row.status
  })
}

function openCreate() {
  isEdit.value = false
  isView.value = false
  previewTab.value = 'PC'
  questionInput.value = ''
  Object.assign(form, {
    id: null,
    name: '',
    surgeryType: '',
    universal: false,
    terminals: [],
    roles: [],
    diseases: [],
    questions: [],
    content: '',
    note: '',
    status: 1
  })
  dialogVisible.value = true
  dialogRef.value?.clearValidate()
}

function openEdit(row) {
  isEdit.value = true
  isView.value = false
  previewTab.value = 'PC'
  questionInput.value = ''
  fillForm(row)
  dialogVisible.value = true
  dialogRef.value?.clearValidate()
}

// 查看：同编辑弹窗，表单只读
function openView(row) {
  isEdit.value = true
  isView.value = true
  previewTab.value = 'PC'
  questionInput.value = ''
  fillForm(row)
  dialogVisible.value = true
  dialogRef.value?.clearValidate()
}

// 查看态直接跳编辑
function gotoEdit() {
  openEdit({
    id: form.id,
    name: form.name,
    common: form.universal ? 1 : 0,
    surgeryType: form.surgeryType,
    terminalsJson: JSON.stringify(form.terminals),
    rolesJson: JSON.stringify(form.roles),
    diseasesJson: JSON.stringify(form.diseases),
    questionsJson: JSON.stringify(form.questions),
    content: form.content,
    note: form.note,
    status: form.status
  })
}

// 关联问题增删
function addQuestion() {
  const q = questionInput.value.trim()
  if (!q) return
  if (!form.questions.includes(q)) form.questions.push(q)
  questionInput.value = ''
}
function removeQuestion(q) {
  form.questions = form.questions.filter((item) => item !== q)
}

// 变量占位示例值，用于右侧预览替换
const PREVIEW_VARS = {
  '{{用户姓名}}': '张小美',
  '{{下次复诊时间}}': '2026年2月18日',
  '{{医院名称}}': '北京协和医院',
  '{{科室名称}}': '妇科',
  '{{客服姓名}}': '李客服',
  '{{医生姓名}}': '王医生',
  '{{疾病名称}}': '轻度贫血'
}
const previewContent = computed(() => {
  let text = form.content || ''
  Object.entries(PREVIEW_VARS).forEach(([key, val]) => {
    text = text.replaceAll(key, val)
  })
  return text || '模板内容预览 · 使用前可继续编辑'
})

function toggleDisease(d) {
  if (form.diseases.includes(d)) {
    form.diseases = form.diseases.filter((item) => item !== d)
  } else {
    form.diseases.push(d)
  }
}

// savedStatus: 1 保存并启用 / 2 保存草稿
async function saveForm(savedStatus) {
  dialogRef.value.validate(async (valid) => {
    if (!valid) return
    const payload = {
      name: form.name,
      content: form.content,
      type: form.universal ? '通用' : '按手术类型',
      surgeryType: form.surgeryType,
      terminalsJson: JSON.stringify(form.terminals),
      rolesJson: JSON.stringify(form.roles),
      diseasesJson: JSON.stringify(form.diseases),
      questionsJson: JSON.stringify(form.questions),
      common: form.universal ? 1 : 0,
      note: form.note,
      status: savedStatus === undefined ? form.status : savedStatus
    }
    try {
      if (isEdit.value) {
        await updateAppReplyTemplateById(form.id, payload)
        ElMessage.success('模板已更新')
      } else {
        await createAppReplyTemplate(payload)
        ElMessage.success('模板已创建')
      }
      dialogVisible.value = false
      fetchList()
    } catch (e) {
      ElMessage.error(e?.message || '保存失败')
    }
  })
}

/* ============================ 查询 / 重置 ============================ */
function onSearch() { }
function onReset() {
  Object.assign(query, { keyword: '', terminal: '', scene: '', role: '', status: '', creator: '', disease: '' })
}

onMounted(fetchList)
</script>

<template>
  <div class="tpl-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h1>模板管理</h1>
        <p class="header-sub">管理电脑端和小程序常用回复模板，并按疾病标签精准匹配用户。</p>
      </div>
      <el-button type="primary" class="btn-dark" @click="openCreate">
        <el-icon>
          <Plus />
        </el-icon>新增模板
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-label">模板总数</div>
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-foot">全部回复模板</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已启用模板</div>
        <div class="stat-value green">{{ stats.enabled }}</div>
        <div class="stat-foot">当前可被调用</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">覆盖疾病</div>
        <div class="stat-value">{{ stats.diseaseCount }}</div>
        <div class="stat-foot">已关联疾病标签</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月使用次数</div>
        <div class="stat-value orange">{{ stats.monthUse.toLocaleString() }}</div>
        <div class="stat-foot">电脑端与小程序累计</div>
      </div>
    </div>

    <!-- 筛选区 -->
    <div class="panel filter-panel">
      <div class="filter-row">
        <div>
          <el-input v-model="query.keyword" placeholder="搜索模板名称、回复内容、关联问题或疾病标签..." clearable class="kw-input"
            @keyup.enter="onSearch" />
          <el-select v-model="query.terminal" placeholder="全部适用端" clearable>
            <el-option v-for="o in TERMINAL_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="query.scene" placeholder="全部场景" clearable>
            <el-option v-for="o in SCENE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="query.role" placeholder="全部角色" clearable>
            <el-option v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="query.status" placeholder="全部状态" clearable>
            <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="query.creator" placeholder="全部创建人" clearable />
        </div>
        <div class="filter-actions">
          <el-button @click="onReset"><el-icon>
              <RefreshLeft />
            </el-icon>重置</el-button>
          <el-button type="primary" @click="onSearch"><el-icon>
              <Search />
            </el-icon>查询</el-button>
        </div>
      </div>

    </div>

    <!-- 疾病标签栏 -->
    <div class="panel disease-bar">
      <div class="disease-left">
        <span class="disease-title">疾病标签</span>
        <el-tag :type="query.disease === '' ? 'primary' : 'info'" round size="small" class="disease-tag"
          @click="query.disease = ''">
          全部模板 {{ stats.total }}
        </el-tag>
        <el-tag v-for="d in diseaseGroups" :key="d.name" :type="query.disease === d.name ? 'primary' : 'info'" round
          size="small" class="disease-tag" @click="query.disease = query.disease === d.name ? '' : d.name">
          {{ d.name }} {{ d.count }}
        </el-tag>
        <el-dropdown v-if="diseaseGroups.length > 6" trigger="click">
          <el-tag round size="small" class="disease-tag">更多疾病<el-icon>
              <ArrowDown />
            </el-icon></el-tag>
        </el-dropdown>
      </div>
      <el-link type="primary" :underline="false">前往字典维护 →</el-link>
    </div>

    <!-- 模板列表 -->
    <div class="panel table-panel">
      <div class="table-head">
        <div class="table-title">
          模板列表 <span class="count">共 {{ filteredData.length }} 条结果</span>
        </div>
        <div v-if="selectedIds.length" class="batch-bar">
          已选择 {{ selectedIds.length }} 项，支持批量启用、停用和设置疾病标签：
          <el-button size="small" @click="batchEnable">批量启用</el-button>
          <el-button size="small" @click="batchDisable">批量停用</el-button>
          <el-button size="small">设置疾病标签</el-button>
          <el-dropdown trigger="click">
            <el-button size="small" type="primary" plain>按使用次数<el-icon>
                <ArrowDown />
              </el-icon></el-button>
          </el-dropdown>
        </div>
        <el-dropdown v-else trigger="click">
          <el-button size="small" plain>按使用次数<el-icon>
              <ArrowDown />
            </el-icon></el-button>
        </el-dropdown>
      </div>

      <el-table v-loading="loading" :data="filteredData" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="44" />
        <el-table-column label="模板名称及内容" min-width="320">
          <template #default="{ row }">
            <div class="tpl-name">{{ row.name }}</div>
            <div class="tpl-content">{{ row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column label="关联疾病" min-width="150">
          <template #default="{ row }">
            <el-tag v-for="d in row.diseaseList" :key="d" round size="small" class="disease-chip">{{ d }}</el-tag>
            <span v-if="!row.diseaseList.length" class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="模板场景" min-width="110">
          <template #default="{ row }">
            <el-tag round size="small" type="warning" effect="plain">{{ labelOf(SCENE_OPTIONS, row.surgeryType)
              }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="适用端" min-width="90">
          <template #default="{ row }">
            <el-tag v-for="t in row.terminalList" :key="t" round size="small" type="primary">
              {{ labelOf(TERMINAL_OPTIONS, t) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="适用角色" min-width="130">
          <template #default="{ row }">
            <el-tag v-for="r in row.roleList" :key="r" round size="small" effect="plain">{{ labelOf(ROLE_OPTIONS, r)
              }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用次数" prop="usageCount" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type" round size="small" effect="plain">
              {{ STATUS_MAP[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" label-class-name="operation-header-cell">
          <template #default="{ row }">
            <el-button text size="small" @click="openView(row)"><el-icon>
                <View />
              </el-icon></el-button>
            <el-button text size="small" @click="onCopyRow(row)"><el-icon>
                <CopyDocument />
              </el-icon></el-button>
            <el-button text size="small" @click="openEdit(row)"><el-icon>
                <EditPen />
              </el-icon></el-button>
            <el-button text size="small" @click="toggleStatus(row)"><el-icon>
                <Switch />
              </el-icon></el-button>
            <el-button text size="small" class="danger" @click="onDelete(row)"><el-icon>
                <Delete />
              </el-icon></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <span>共 {{ filteredData.length }} 条</span>
      </div>
    </div>

    <!-- 新增/编辑弹窗（左右双栏：表单 + 双端预览） -->
    <el-dialog v-model="dialogVisible" width="1080px" class="tpl-dialog" top="6vh">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isView ? '查看回复模板' : isEdit ? '编辑回复模板' : '新增回复模板' }}</h3>
          <p>设置适用疾病、适用端和适用角色，右侧可实时预览双端效果。</p>
        </div>
      </template>

      <div class="dialog-body">
        <!-- 左侧表单 -->
        <el-form ref="dialogRef" :model="form" :rules="formRules" label-position="top" class="dialog-form"
          :disabled="isView">
          <div class="form-two-col">
            <el-form-item label="模板名称 *" prop="name">
              <el-input v-model="form.name" placeholder="请输入模板名称" :disabled="isView" />
            </el-form-item>
            <el-form-item label="模板场景 *" prop="surgeryType">
              <el-select v-model="form.surgeryType" style="width: 100%" :disabled="isView">
                <el-option v-for="o in SCENE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item prop="diseases">
            <div class="disease-head">
              <span class="form-label">关联疾病 *</span>
              <el-checkbox v-model="form.universal" :disabled="isView">通用模板</el-checkbox>
            </div>
            <div class="disease-chip-box">
              <el-tag v-for="d in DISEASE_OPTIONS" :key="d" :type="form.diseases.includes(d) ? 'primary' : 'info'" round
                size="small" class="pick-chip" @click="!isView && toggleDisease(d)">{{ d }}</el-tag>
            </div>
            <div class="field-tip">标签来源：字典维护 - 疾病字典，当前页面不能新建疾病名称。</div>
          </el-form-item>

          <div class="form-two-col">
            <el-form-item label="适用端 *" prop="terminals">
              <el-checkbox-group v-model="form.terminals" :disabled="isView">
                <el-checkbox v-for="o in TERMINAL_OPTIONS" :key="o.value" :label="o.value">{{ o.label }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="适用角色 *" prop="roles">
              <el-checkbox-group v-model="form.roles" :disabled="isView">
                <el-checkbox v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.value">{{ o.label }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </div>

          <el-form-item label="关联问题 / 用户问法">
            <div class="question-list">
              <div v-for="q in form.questions" :key="q" class="question-item">
                <span>{{ q }}</span>
                <el-icon v-if="!isView" class="question-close" @click="removeQuestion(q)">
                  <Close />
                </el-icon>
              </div>
            </div>
            <div v-if="!isView" class="question-add">
              <el-input v-model="questionInput" placeholder="添加用户可能的问法" @keyup.enter="addQuestion" />
              <el-button @click="addQuestion">添加</el-button>
            </div>
          </el-form-item>

          <el-form-item label="回复模板内容 *" prop="content">
            <el-input v-model="form.content" type="textarea" :rows="5" placeholder="支持变量占位，如{{用户姓名}}、{{科室名称}}"
              :disabled="isView" />
          </el-form-item>

          <div class="form-two-col">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%" :disabled="isView">
                <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.note" placeholder="模板维护说明" :disabled="isView" />
            </el-form-item>
          </div>
        </el-form>

        <!-- 右侧预览 -->
        <div class="dialog-preview">
          <div class="preview-tabs">
            <el-radio-group v-model="previewTab" size="small">
              <el-radio-button value="PC"><el-icon>
                  <Monitor />
                </el-icon>电脑端预览</el-radio-button>
              <el-radio-button value="MINI_PROGRAM"><el-icon>
                  <Cellphone />
                </el-icon>小程序预览</el-radio-button>
            </el-radio-group>
          </div>

          <div class="preview-user">
            <div class="pu-title">当前匹配用户</div>
            <div class="pu-name">张小美 · P10086</div>
            <el-tag round size="small" class="pu-chip">妇科</el-tag>
            <el-tag round size="small" class="pu-chip">轻度贫血</el-tag>
          </div>

          <!-- 电脑端预览 -->
          <div v-if="previewTab === 'PC'" class="preview-chat">
            <div class="chat-row">
              <div class="chat-avatar">张</div>
              <div class="chat-meta">
                <div class="chat-name">张小美</div>
                <div class="chat-sub">电脑端客服会话</div>
              </div>
            </div>
            <div class="chat-bubble">{{ previewContent }}</div>
            <div class="chat-tip">模板内容预览 · 使用前可继续编辑</div>
          </div>

          <!-- 小程序预览（手机壳） -->
          <div v-else class="mini-phone">
            <div class="mini-screen">
              <div class="mini-header">健康咨询</div>
              <div class="mini-time">今天 10:28</div>
              <div class="mini-row">
                <div class="mini-avatar">张</div>
                <div class="mini-bubble">{{ previewContent }}</div>
              </div>
            </div>
          </div>

          <div class="preview-priority">
            <div class="pp-title"><el-icon>
                <MagicStick />
              </el-icon>模板匹配优先级</div>
            <div class="pp-item">
              <span class="pp-no">1</span>
              <div>
                <div class="pp-name">疾病完全匹配模板</div>
                <div class="pp-sub">妇科 + 轻度贫血</div>
              </div>
            </div>
            <div class="pp-item">
              <span class="pp-no">2</span>
              <div>
                <div class="pp-name">同疾病分类模板</div>
                <div class="pp-sub">妇科 / 产科</div>
              </div>
            </div>
            <div class="pp-item">
              <span class="pp-no">3</span>
              <div>
                <div class="pp-name">通用模板</div>
                <div class="pp-sub">所有用户可用</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <template v-if="isView">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="gotoEdit">去编辑</el-button>
        </template>
        <template v-else>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button @click="saveForm(2)">保存草稿</el-button>
          <el-button type="primary" @click="saveForm(1)">保存并启用</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tpl-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
  padding: 4px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.header-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.btn-dark {
  font-weight: 600;
}

/* 统计卡片 */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 22px;
}

.stat-card {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
  padding: 20px 22px;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.stat-value {
  margin: 10px 0 6px;
  font-size: 28px;
  font-weight: 700;
}

.stat-value.green {
  color: #16a34a;
}

.stat-value.orange {
  color: #ea580c;
}

.stat-foot {
  font-size: 12px;
  color: #9ca3af;
}



/* 筛选 */
.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
}

.filter-row .el-select {
  width: 150px;
}

.kw-input {
  flex: 1;
  min-width: 260px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  width: 100%;
}

/* 疾病标签栏 */
.disease-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.disease-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.disease-title {
  font-size: 14px;
  font-weight: 600;
  margin-right: 6px;
}

.disease-tag {
  cursor: pointer;
}

/* 表格 */
.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
}

.table-title .count {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 400;
  margin-left: 6px;
}

.batch-bar {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tpl-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.tpl-content {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}

.disease-chip {
  margin: 2px 4px 2px 0;
}

.muted {
  color: #9ca3af;
}

.danger :deep(.el-icon) {
  color: #dc2626;
}

.table-panel :deep(.operation-header-cell) {
  background-color: #f8fafc !important;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
  font-size: 13px;
  color: #6b7280;
}

.form-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
}

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

/* 弹窗双栏 */
.dialog-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

.dialog-form {
  min-width: 0;
}

.dialog-preview {
  background: #f7f8fa;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.disease-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.disease-chip-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pick-chip {
  cursor: pointer;
}

.field-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.question-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  font-size: 13px;
}

.question-close {
  color: #9ca3af;
  cursor: pointer;
}

.question-close:hover {
  color: #dc2626;
}

.question-add {
  display: flex;
  gap: 10px;
}

.question-add .el-input {
  flex: 1;
}

/* 右侧预览 */
.preview-tabs {
  display: flex;
  justify-content: center;
}

.preview-user {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
}

.pu-title {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
}

.pu-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.pu-chip {
  margin-right: 6px;
}

.preview-chat {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.chat-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #2563eb;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-name {
  font-size: 13px;
  font-weight: 600;
}

.chat-sub {
  font-size: 12px;
  color: #9ca3af;
}

.chat-bubble {
  background: #2563eb;
  color: #fff;
  border-radius: 12px 12px 12px 2px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
  margin-left: 46px;
}

.chat-tip {
  margin-top: 10px;
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
}

.preview-priority {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
}

.pp-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.pp-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.pp-no {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pp-name {
  font-size: 13px;
  font-weight: 500;
}

.pp-sub {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

/* 小程序手机壳预览 */
.mini-phone {
  display: flex;
  justify-content: center;
}

.mini-screen {
  width: 220px;
  background: #f2f3f5;
  border: 3px solid #1f2937;
  border-radius: 26px;
  padding: 12px 12px 24px;
  min-height: 300px;
}

.mini-header {
  background: #2563eb;
  color: #fff;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 0;
  border-radius: 12px 12px 4px 4px;
  margin: -12px -12px 12px;
}

.mini-time {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 12px;
}

.mini-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.mini-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.mini-bubble {
  background: #fff;
  border-radius: 4px 12px 12px 12px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.7;
  color: #1f2937;
  flex: 1;
}

@media (max-width: 1100px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .dialog-body {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.el-dialog.tpl-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>
