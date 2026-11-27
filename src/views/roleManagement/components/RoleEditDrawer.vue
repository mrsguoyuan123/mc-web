<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, Search, Check, CircleCheckFilled } from '@element-plus/icons-vue'
import {
  getRoleById,
  createRole,
  updateRoleById,
  copyRoleById,
  getPermissionTree,
  getRolePermissionsById,
  updateRolePermissionsById,
  getRoleDataScopeById,
  updateRoleDataScopeById,
  getRoleAccountsById
} from '../../../api/index.js'
import { isMissing, MISSING_TEXT } from '../../../utils/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  roleId: { type: [String, Number], default: null },
  // edit 编辑 / copy 复制 / create 新增
  mode: { type: String, default: 'edit' },
  // basic 基本信息 / permission 功能权限 / data 数据权限 / staff 关联员工
  activeTab: { type: String, default: 'basic' }
})

const emit = defineEmits(['close', 'saved'])

const TABS = [
  { key: 'basic', label: '基本信息' },
  { key: 'permission', label: '功能权限' },
  { key: 'data', label: '数据权限' },
  { key: 'staff', label: '关联员工' }
]

const TERMINAL_OPTIONS = [
  { label: '电脑端', value: 'PC' },
  { label: '手机端', value: 'MOBILE' },
  { label: '全部', value: 'ALL' }
]

const BASE_ROLE_OPTIONS = [
  { label: '系统管理员', value: 'ADMIN' },
  { label: '医院管理员', value: 'HOSPITAL_ADMIN' },
  { label: '科室管理员', value: 'DEPT_ADMIN' },
  { label: '客服', value: 'CS' },
  { label: '陪诊师', value: 'CAREGIVER' },
  { label: '医生', value: 'DOCTOR' },
  { label: '看板', value: 'DASHBOARD' }
]

const createDefaultForm = () => ({
  name: '',
  code: '',
  terminal: 'PC',
  baseRole: '',
  sortNo: undefined,
  description: '',
  status: 1
})

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) emit('close')
  }
})

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const currentTab = ref('basic')
const form = reactive(createDefaultForm())
// 留存详情原始数据，编辑全量更新时保留 dataScope/scopeJson/permissionCodes 等字段
const rawDetail = ref({})

/* ---------------- 功能权限页签 ---------------- */

// 权限类型子标签（GROUP 为分组容器，不单独占子标签）
const PERMISSION_TYPES = [
  { key: 'MENU', label: '菜单权限' },
  { key: 'PAGE', label: '页面权限' },
  { key: 'BUTTON', label: '按钮权限' },
  { key: 'API', label: '接口权限' }
]

const treeRef = ref(null)
const permLoading = ref(false)
// 全量权限树（getPermissionTree），节点 node-key 使用权限码 code
const permissionTree = ref([])
// 当前勾选的权限码（跨类型子标签的唯一数据源）
const checkedCodes = ref([])
const activePermType = ref('MENU')
const permKeyword = ref('')

const filterNode = (value, data) => {
  if (!value) return true
  const keyword = String(value).trim().toLowerCase()
  return (
    String(data.name || '').toLowerCase().includes(keyword) ||
    String(data.code || '').toLowerCase().includes(keyword)
  )
}

// 按类型子标签过滤：保留命中类型节点及其 GROUP 父级路径，命中节点的子树保留
const filterTreeByType = (nodes, type) => {
  const result = []
  for (const node of nodes || []) {
    const children = node.children ? filterTreeByType(node.children, type) : []
    if (node.type === type || children.length) {
      result.push({ ...node, children })
    }
  }
  return result
}

const collectCodes = (nodes) => {
  const codes = []
  const walk = (list) => {
    for (const node of list || []) {
      if (node.code) codes.push(node.code)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return codes
}

// 当前类型子标签下实际渲染的树
const filteredPermTree = computed(() =>
  filterTreeByType(permissionTree.value, activePermType.value)
)

const visibleCodes = computed(() => collectCodes(filteredPermTree.value))

// 树（重新）渲染后，按唯一数据源恢复勾选态（仅恢复当前可见节点）
const restoreChecked = () => {
  nextTick(() => {
    if (!treeRef.value) return
    const visible = new Set(visibleCodes.value)
    treeRef.value.setCheckedKeys(checkedCodes.value.filter((code) => visible.has(code)), false)
  })
}

const onPermissionCheck = () => {
  if (!treeRef.value) return
  const visible = new Set(visibleCodes.value)
  const currentChecked = treeRef.value.getCheckedKeys(false)
  // 合并其他子标签下已勾选、当前视图不可见的权限码
  const hiddenChecked = checkedCodes.value.filter((code) => !visible.has(code))
  checkedCodes.value = Array.from(new Set([...hiddenChecked, ...currentChecked]))
}

const onPermTypeChange = () => {
  permKeyword.value = ''
  restoreChecked()
}

const onPermSearch = () => {
  treeRef.value?.filter(permKeyword.value)
}

const expandAll = () => {
  const nodesMap = treeRef.value?.store?.nodesMap
  if (!nodesMap) return
  Object.values(nodesMap).forEach((node) => {
    node.expanded = true
  })
}

const collapseAll = () => {
  const nodesMap = treeRef.value?.store?.nodesMap
  if (!nodesMap) return
  Object.values(nodesMap).forEach((node) => {
    node.expanded = false
  })
}

// 全选「人员管理」分组（无对应节点时置灰）
const staffRoot = computed(() =>
  permissionTree.value.find((node) => String(node.name || '').includes('人员管理')) || null
)

const selectStaffManagement = () => {
  if (!staffRoot.value) return
  const staffCodes = collectCodes([staffRoot.value])
  checkedCodes.value = Array.from(new Set([...checkedCodes.value, ...staffCodes]))
  restoreChecked()
}

const fetchPermissionData = async (mode, roleId) => {
  permLoading.value = true
  try {
    const [treeResult, grantedResult] = await Promise.allSettled([
      getPermissionTree(),
      // 新增态无已授权限；编辑/复制取源角色权限码用于回显
      mode === 'create' || !roleId
        ? Promise.resolve([])
        : getRolePermissionsById(String(roleId))
    ])
    permissionTree.value = treeResult.status === 'fulfilled' && Array.isArray(treeResult.value)
      ? treeResult.value
      : []
    const granted = grantedResult.status === 'fulfilled' && Array.isArray(grantedResult.value)
      ? grantedResult.value
      : []
    checkedCodes.value = granted.map((code) => String(code))
  } finally {
    permLoading.value = false
  }
}

const isSystem = computed(() => Number(rawDetail.value.system) === 1)
const accountCount = computed(() => Number(rawDetail.value.accountCount ?? rawDetail.value.userCount ?? 0))
const isEdit = computed(() => props.mode === 'edit')
const isCopy = computed(() => props.mode === 'copy')
const isCreate = computed(() => props.mode === 'create')

// 编码创建后不可改：编辑态只读；内置角色同样只读并带锁
const codeReadonly = computed(() => isEdit.value)

const drawerTitle = computed(() => {
  if (isCreate.value) return '新增角色'
  if (isCopy.value) return '复制角色'
  return `编辑角色 · ${rawDetail.value.name || ''}`
})

const saveButtonText = computed(() => (isEdit.value ? '保存修改' : '保存'))

/* ---------------- 数据权限页签 ---------------- */

// 数据范围六选一卡片（文案按 R2-3 文档，两列布局）
const DATA_SCOPE_OPTIONS = [
  { value: 'ALL', label: '全部数据', desc: '可查看系统内全部业务数据' },
  { value: 'HOSPITAL', label: '本院数据', desc: '仅可查看本院范围内的数据' },
  { value: 'DEPARTMENT', label: '本科室数据', desc: '仅可查看本科室范围内的数据' },
  { value: 'STATION', label: '驻点数据', desc: '仅可查看驻点范围内的数据' },
  { value: 'SELF', label: '本人负责的数据', desc: '仅可查看本人负责范围内的数据' },
  { value: 'CUSTOM', label: '自定义范围', desc: '按医院、科室、驻点和人员组合授权' }
]

// 自定义范围占位维度；具体字段以后端 scopeJson 结构为准（R2-3 待联调确认项）
const CUSTOM_PLACEHOLDER_FIELDS = ['医院', '科室', '驻点', '人员']

const dataScopeLoading = ref(false)
const dataScopeForm = reactive({ dataScope: '', scopeJson: '' })

const selectDataScope = (value) => {
  dataScopeForm.dataScope = value
  // 切离自定义范围时清掉草稿，避免把 scopeJson 带到其他范围
  if (value !== 'CUSTOM') dataScopeForm.scopeJson = ''
}

// 已保存的 scopeJson 只读预览；后端返回非合法 JSON 时原样展示
const formattedScopeJson = computed(() => {
  if (!dataScopeForm.scopeJson) return ''
  try {
    return JSON.stringify(JSON.parse(dataScopeForm.scopeJson), null, 2)
  } catch {
    return dataScopeForm.scopeJson
  }
})

const fetchDataScope = async (mode, roleId) => {
  // 新增态角色尚未创建，无数据范围可回显
  if (mode === 'create' || !roleId) {
    dataScopeForm.dataScope = ''
    dataScopeForm.scopeJson = ''
    return
  }
  dataScopeLoading.value = true
  try {
    const result = await getRoleDataScopeById(String(roleId))
    dataScopeForm.dataScope = result?.dataScope || ''
    dataScopeForm.scopeJson = result?.scopeJson || ''
  } catch (err) {
    // 失败不阻断抽屉，保留空态，用户可重新选择后保存
    dataScopeForm.dataScope = ''
    dataScopeForm.scopeJson = ''
    ElMessage.error(err?.message || '数据范围加载失败')
  } finally {
    dataScopeLoading.value = false
  }
}

/* ---------------- 关联员工页签（只读列表） ---------------- */

// 人员类型字典（R2-4：中文映射待字典确认，先按 swagger 枚举内置）
const PERSON_TYPE_TEXT = {
  CS: '客服',
  CAREGIVER: '陪诊师',
  GENERAL: '普通',
  DOCTOR: '医生'
}

const staffLoading = ref(false)
const staffLoaded = ref(false)
const staffList = ref([])
const staffTotal = ref(0)
const staffPage = ref(1)
const staffPageSize = ref(20)

// 已加载后以接口 total 为准；未加载时回退详情中的 accountCount
const staffHeaderCount = computed(() => {
  if (!isEdit.value) return 0
  return staffLoaded.value ? staffTotal.value : accountCount.value
})

const personTypeText = (value) => {
  if (isMissing(value)) return MISSING_TEXT
  // 未收录的枚举值原样展示，不编造中文
  return PERSON_TYPE_TEXT[value] || String(value)
}

const fetchStaffAccounts = async () => {
  // 仅编辑态存在角色 id；新增/复制态目标角色尚未创建
  if (props.mode !== 'edit' || !props.roleId) return
  staffLoading.value = true
  try {
    const result = await getRoleAccountsById(String(props.roleId), {
      page: staffPage.value,
      pageSize: staffPageSize.value
    })
    staffList.value = Array.isArray(result?.list) ? result.list : []
    staffTotal.value = Number(result?.total ?? 0)
    staffLoaded.value = true
  } catch (err) {
    staffList.value = []
    staffTotal.value = 0
    staffLoaded.value = true
    ElMessage.error(err?.message || '关联账号加载失败')
  } finally {
    staffLoading.value = false
  }
}

const onStaffPageChange = (page) => {
  staffPage.value = page
  fetchStaffAccounts()
}

const onStaffSizeChange = (size) => {
  staffPageSize.value = size
  staffPage.value = 1
  fetchStaffAccounts()
}

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '仅支持小写英文开头，可含小写英文、数字与下划线', trigger: 'blur' }
  ],
  baseRole: [{ required: true, message: '请选择基础架构角色', trigger: 'change' }]
}

const resetForm = () => {
  Object.assign(form, createDefaultForm())
  rawDetail.value = {}
  formRef.value?.clearValidate?.()
  permissionTree.value = []
  checkedCodes.value = []
  activePermType.value = 'MENU'
  permKeyword.value = ''
  dataScopeForm.dataScope = ''
  dataScopeForm.scopeJson = ''
  staffList.value = []
  staffTotal.value = 0
  staffPage.value = 1
  staffPageSize.value = 20
  staffLoaded.value = false
  currentTab.value = 'basic'
}

const fillForm = (detail) => {
  form.name = detail.name || ''
  form.code = detail.code || ''
  form.terminal = detail.terminal || 'PC'
  form.baseRole = detail.baseRole || ''
  form.sortNo = isMissing(detail.sortNo) ? undefined : Number(detail.sortNo)
  form.description = detail.description || ''
  form.status = Number(detail.status) === 0 ? 0 : 1
}

const openDrawer = async () => {
  resetForm()
  currentTab.value = props.activeTab || 'basic'
  const detailTask = isCreate.value || !props.roleId
    ? Promise.resolve()
    : (async () => {
        loading.value = true
        try {
          const detail = await getRoleById(String(props.roleId))
          rawDetail.value = detail || {}
          fillForm(rawDetail.value)
          if (isCopy.value) {
            // 复制：以源角色为模板，预填建议名称与编码，用户可改
            form.name = `${rawDetail.value.name || ''}副本`
            form.code = `${rawDetail.value.code || ''}_copy`
          }
        } catch (err) {
          ElMessage.error(err?.message || '角色详情加载失败')
        } finally {
          loading.value = false
        }
      })()

  await Promise.all([
    detailTask,
    fetchPermissionData(props.mode, props.roleId),
    fetchDataScope(props.mode, props.roleId)
  ])
  if (currentTab.value === 'permission') restoreChecked()
  if (currentTab.value === 'staff' && !staffLoaded.value) fetchStaffAccounts()
}

watch(
  () => props.visible,
  (open) => {
    if (open) openDrawer()
  }
)

// 切到功能权限页签或权限树异步返回后，恢复勾选态
watch(currentTab, (tab) => {
  if (tab === 'permission') restoreChecked()
  if (tab === 'staff' && !staffLoaded.value) fetchStaffAccounts()
})

watch(permissionTree, () => {
  if (currentTab.value === 'permission') restoreChecked()
})

const buildPayload = () => ({
  code: form.code,
  name: form.name,
  terminal: form.terminal,
  baseRole: form.baseRole,
  dataScope: dataScopeForm.dataScope || undefined,
  scopeJson:
    dataScopeForm.dataScope === 'CUSTOM' ? dataScopeForm.scopeJson || undefined : undefined,
  sortNo: isMissing(form.sortNo) ? undefined : Number(form.sortNo),
  description: form.description,
  status: Number(form.status),
  permissionCodes: Array.isArray(rawDetail.value.permissionCodes)
    ? rawDetail.value.permissionCodes
    : Array.isArray(rawDetail.value.permissions)
      ? rawDetail.value.permissions
      : undefined
})

const handleSave = async () => {
  // 非基本信息页签时表单未渲染（v-if），跳过表单校验直接提交当前数据
  if (formRef.value) await formRef.value.validate()
  submitting.value = true
  try {
    if (isCreate.value) {
      await createRole({ ...buildPayload(), permissionCodes: [...checkedCodes.value] })
      ElMessage.success('角色创建成功')
    } else if (isCopy.value) {
      // 复制仅提交新名称/编码，权限与配置由后端按源角色克隆
      await copyRoleById(String(props.roleId), { name: form.name, code: form.code })
      ElMessage.success('角色复制成功')
    } else if (currentTab.value === 'data') {
      // 数据权限页签：单独走数据范围端点，全量覆盖
      if (!dataScopeForm.dataScope) {
        ElMessage.warning('请选择数据范围')
        return
      }
      const scopePayload = {
        dataScope: dataScopeForm.dataScope,
        scopeJson:
          dataScopeForm.dataScope === 'CUSTOM'
            ? dataScopeForm.scopeJson || undefined
            : undefined
      }
      await updateRoleDataScopeById(String(props.roleId), scopePayload)
      // 同步本地详情，基本信息页签全量更新时保持一致
      rawDetail.value.dataScope = scopePayload.dataScope
      rawDetail.value.scopeJson = scopePayload.scopeJson
      ElMessage.success('数据范围保存成功')
    } else {
      await updateRoleById(String(props.roleId), { ...rawDetail.value, ...buildPayload() })
      // 功能权限全量覆盖保存；权限树加载失败（为空）时跳过，避免误清空已授权限
      if (permissionTree.value.length) {
        await updateRolePermissionsById(String(props.roleId), [...checkedCodes.value])
      }
      ElMessage.success('角色保存成功')
    }
    emit('saved')
    drawerVisible.value = false
  } catch (err) {
    // ApiError 消息已含编码唯一冲突/内置受限等原因，保留表单不重置
    ElMessage.error(err?.message || '保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :size="560"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
    class="role-edit-drawer"
  >
    <template #header>
      <div class="drawer-head">
        <span class="head-icon"><el-icon><Lock /></el-icon></span>
        <div class="head-meta">
          <h2 class="head-title">
            {{ drawerTitle }}
            <el-icon v-if="isEdit && isSystem" class="head-lock" title="系统内置角色"><Lock /></el-icon>
          </h2>
          <p class="head-sub">配置角色基础信息、功能权限、数据范围与关联员工。</p>
        </div>
      </div>
    </template>

    <div v-loading="loading" class="drawer-body">
      <el-alert
        v-if="isEdit"
        type="warning"
        :closable="false"
        show-icon
        :title="`当前角色已关联 ${accountCount} 个账号，停用或删除前请确认影响范围。`"
        class="account-alert"
      />

      <el-tabs v-model="currentTab" class="role-tabs">
        <el-tab-pane
          v-for="tab in TABS"
          :key="tab.key"
          :label="tab.label"
          :name="tab.key"
        />
      </el-tabs>

      <!-- 基本信息 -->
      <el-form
        v-if="currentTab === 'basic'"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="role-form"
      >
        <div v-if="isEdit && isSystem" class="lock-tip">
          <el-icon><Lock /></el-icon>
          <span>系统内置角色的角色编码与删除权限已锁定。</span>
        </div>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="name" required>
              <el-input v-model="form.name" placeholder="请输入角色名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色编码" prop="code" required>
              <el-input
                v-model="form.code"
                :readonly="codeReadonly"
                placeholder="请输入角色编码"
              >
                <template v-if="codeReadonly" #suffix>
                  <el-icon class="input-lock"><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="field-hint">创建后不可修改，建议使用小写英文与下划线。</p>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="适用端">
              <el-select v-model="form.terminal" class="full-width" placeholder="请选择适用端">
                <el-option
                  v-for="option in TERMINAL_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number
                v-model="form.sortNo"
                :min="0"
                controls-position="right"
                class="full-width"
                placeholder="排序号"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 基础架构角色仅新增态配置，编辑/复制态由后端按源角色保留 -->
        <el-row v-if="isCreate" :gutter="16">
          <el-col :span="12">
            <el-form-item label="基础架构角色" prop="baseRole" required>
              <el-select v-model="form.baseRole" class="full-width" placeholder="请选择基础架构角色">
                <el-option
                  v-for="option in BASE_ROLE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="角色说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入角色说明"
          />
        </el-form-item>

        <div class="status-card">
          <div class="status-meta">
            <span class="status-label">角色状态</span>
            <span class="status-hint">停用后，该角色关联账号将失去对应权限。</span>
          </div>
          <div class="status-switch">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
            <span class="switch-text">{{ form.status === 1 ? '启用' : '停用' }}</span>
          </div>
        </div>
      </el-form>

      <!-- 功能权限 -->
      <div v-else-if="currentTab === 'permission'" v-loading="permLoading" class="perm-panel">
        <div class="perm-head">
          <div>
            <h3 class="perm-count">已选 {{ checkedCodes.length }} 项权限</h3>
            <p class="perm-desc">支持菜单、页面、按钮与接口权限统一配置</p>
          </div>
          <div class="perm-tools">
            <el-button size="small" :disabled="!filteredPermTree.length" @click="expandAll">全部展开</el-button>
            <el-button size="small" :disabled="!filteredPermTree.length" @click="collapseAll">全部折叠</el-button>
            <el-button size="small" :disabled="!staffRoot" @click="selectStaffManagement">全选人员管理</el-button>
          </div>
        </div>

        <el-input
          v-model="permKeyword"
          class="perm-search"
          clearable
          placeholder="搜索权限名称"
          @input="onPermSearch"
          @clear="onPermSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="perm-type-tabs">
          <button
            v-for="item in PERMISSION_TYPES"
            :key="item.key"
            type="button"
            class="type-item"
            :class="{ active: activePermType === item.key }"
            @click="activePermType = item.key; onPermTypeChange()"
          >
            {{ item.label }}
          </button>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="权限保存为全量覆盖：未勾选的权限将被收回。"
          class="perm-alert"
        />

        <el-empty v-if="!permLoading && !filteredPermTree.length" description="暂无权限数据" :image-size="80" />
        <el-tree
          v-else
          ref="treeRef"
          :data="filteredPermTree"
          node-key="code"
          show-checkbox
          highlight-current
          :props="{ label: 'name', children: 'children' }"
          :filter-node-method="filterNode"
          class="perm-tree"
          @check="onPermissionCheck"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <span class="tree-label">{{ data.name }}</span>
              <span v-if="data.code" class="tree-code">{{ data.code }}</span>
            </span>
          </template>
        </el-tree>
      </div>

      <!-- 数据权限 -->
      <div v-else-if="currentTab === 'data'" v-loading="dataScopeLoading" class="scope-panel">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          :icon="CircleCheckFilled"
          title="数据权限决定该角色可以查看哪些业务数据，功能权限决定该角色可以访问哪些菜单和操作。"
          class="scope-banner"
        />

        <div class="scope-grid">
          <div
            v-for="item in DATA_SCOPE_OPTIONS"
            :key="item.value"
            class="scope-card"
            :class="{ active: dataScopeForm.dataScope === item.value }"
            @click="selectDataScope(item.value)"
          >
            <div class="scope-meta">
              <span class="scope-label">{{ item.label }}</span>
              <span class="scope-desc">{{ item.desc }}</span>
            </div>
            <span class="scope-radio">
              <el-icon v-if="dataScopeForm.dataScope === item.value" class="scope-radio-check">
                <Check />
              </el-icon>
            </span>
          </div>
        </div>

        <!-- 自定义范围：维度与 scopeJson 结构待后端定稿，本版先留占位控件与空态 -->
        <div v-if="dataScopeForm.dataScope === 'CUSTOM'" class="custom-scope">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            title="自定义范围的医院 / 科室 / 驻点 / 人员维度待后端 scopeJson 结构确认后开放，当前版本先保留占位。"
            class="custom-alert"
          />
          <div class="custom-fields">
            <el-select
              v-for="field in CUSTOM_PLACEHOLDER_FIELDS"
              :key="field"
              disabled
              class="custom-field"
              :placeholder="field + '（待联调）'"
            />
          </div>
          <div v-if="formattedScopeJson" class="scope-json-box">
            <p class="scope-json-title">已保存的 scopeJson（只读预览）</p>
            <pre class="scope-json">{{ formattedScopeJson }}</pre>
          </div>
          <el-empty v-else description="暂无自定义范围数据" :image-size="70" />
        </div>
      </div>

      <!-- 关联员工（只读，绑定/解绑在人员管理侧操作） -->
      <div v-else-if="currentTab === 'staff'" v-loading="staffLoading" class="staff-panel">
        <div class="staff-head">
          <h3 class="staff-count">关联账号 {{ staffHeaderCount }} 个</h3>
          <p class="staff-desc">
            员工的权限角色在「人员管理 → 员工管理」中调整，修改后会实时同步到本页。
          </p>
        </div>

        <el-table :data="staffList" stripe table-layout="fixed" class="staff-table">
          <el-table-column label="姓名" min-width="90">
            <template #default="{ row }">
              <span v-if="isMissing(row.name)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else>{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="用户名" min-width="110">
            <template #default="{ row }">
              <span v-if="isMissing(row.username)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else>{{ row.username }}</span>
            </template>
          </el-table-column>
          <el-table-column label="手机号" min-width="120">
            <template #default="{ row }">
              <span v-if="isMissing(row.phone)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else>{{ row.phone }}</span>
            </template>
          </el-table-column>
          <el-table-column label="人员类型" min-width="90">
            <template #default="{ row }">
              <span :class="{ missing: isMissing(row.personType) }">
                {{ personTypeText(row.personType) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="等级/区域" min-width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="isMissing(row.levelOrArea)" class="missing">{{ MISSING_TEXT }}</span>
              <span v-else>{{ row.levelOrArea }}</span>
            </template>
          </el-table-column>
          <el-table-column label="账号状态" min-width="90" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="!isMissing(row.status)"
                :type="Number(row.status) === 1 ? 'success' : 'info'"
                size="small"
                effect="light"
              >
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </el-tag>
              <span v-else class="missing">{{ MISSING_TEXT }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="当前角色暂无关联员工" :image-size="90" />
          </template>
        </el-table>

        <el-pagination
          v-if="staffTotal > 0"
          class="staff-pager"
          background
          :current-page="staffPage"
          :page-size="staffPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="staffTotal"
          layout="total, prev, pager, next, sizes"
          @current-change="onStaffPageChange"
          @size-change="onStaffSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button
          v-if="currentTab !== 'staff'"
          type="primary"
          class="save-btn"
          :loading="submitting"
          @click="handleSave"
        >
          {{ saveButtonText }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.drawer-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.head-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  font-size: 20px;
  flex: 0 0 auto;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.head-lock {
  color: #9ca3af;
  font-size: 16px;
}

.head-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.account-alert {
  margin-bottom: 16px;
}

.role-tabs {
  margin-bottom: 18px;
}

.role-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.lock-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 13px;
}

.field-hint {
  margin: -8px 0 14px;
  font-size: 12px;
  color: #9ca3af;
}

.full-width {
  width: 100%;
}

.input-lock {
  color: #9ca3af;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.status-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.status-hint {
  font-size: 12px;
  color: #9ca3af;
}

.status-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-text {
  font-size: 13px;
  color: #374151;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-btn.el-button {
  background: #111827;
  border-color: #111827;
}

.save-btn.el-button:hover,
.save-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
}

/* 功能权限页签 */
.perm-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.perm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.perm-count {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.perm-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.perm-tools {
  display: flex;
  gap: 8px;
}

.perm-type-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-item {
  padding: 5px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-item.active {
  color: #2563eb;
  border-color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

.perm-alert {
  margin: 0;
}

.perm-tree {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 12px;
  max-height: 46vh;
  overflow-y: auto;
  background: #fff;
}

.perm-tree :deep(.el-tree-node__content) {
  height: 34px;
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tree-label {
  font-size: 13px;
  color: #1f2937;
}

.tree-code {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

/* 数据权限页签 */
.scope-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scope-banner {
  margin: 0;
}

.scope-banner.el-alert {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.scope-banner :deep(.el-alert__icon) {
  color: #2563eb;
}

.scope-banner :deep(.el-alert__title) {
  color: #1d4ed8;
  font-size: 13px;
  line-height: 1.6;
}

.scope-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.scope-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scope-card:hover {
  border-color: #93c5fd;
}

.scope-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.scope-radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid #d1d5db;
  border-radius: 50%;
  background: #fff;
  flex: 0 0 auto;
}

.scope-card.active .scope-radio {
  background: #2563eb;
  border-color: #2563eb;
}

.scope-radio-check {
  color: #fff;
  font-size: 13px;
}

.scope-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.scope-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.scope-desc {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

.custom-scope {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
}

.custom-alert {
  margin: 0;
}

.custom-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.custom-field {
  width: 100%;
}

.scope-json-box {
  margin: 0;
}

.scope-json-title {
  margin: 0 0 6px;
  font-size: 12px;
  color: #6b7280;
}

.scope-json {
  margin: 0;
  padding: 10px 12px;
  max-height: 200px;
  overflow: auto;
  border-radius: 8px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 关联员工页签 */
.staff-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.staff-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.staff-count {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.staff-desc {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

.staff-table {
  width: 100%;
}

.staff-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.missing {
  color: #ef4444;
  font-size: 13px;
}
</style>
