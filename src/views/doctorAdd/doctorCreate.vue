<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createDoctor,
  getCaregiverScope,
  getDictAreaList,
  getDictDepartmentList,
  getDictOptions,
  getDoctorOptions,
  getDoctorPage
} from '../../api/index.js'
import {
  DOCTOR_STATUS_TEXT,
  MISSING_TEXT,
  isMissing,
  safeParseJson,
  toPage
} from '@/utils/index.js'

// D-G1：职称字典接口 pending（getDictTitleList 为占位），待后端字典接口替换，不得编造 URL
const TITLE_DICT_OPTIONS = ['住院医师', '主诊医师', '主治医师', '副主任医师', '主任医师']

// 注册渠道文案：STATION_ASSIST/STATION 均视为驻点协助，未知值灰标展示原文
const CHANNEL_TEXT = {
  STATION_ASSIST: '驻点协助',
  STATION: '驻点协助',
  ADMIN: '管理员'
}

// 渠道标签配色：驻点协助橙色（warning），管理员蓝色（primary），未知值回退灰标 info
const CHANNEL_TAG_TYPE = {
  STATION_ASSIST: 'warning',
  STATION: 'warning',
  ADMIN: 'primary'
}
const flowSteps = [
  '驻点按管理员相同字段录入医生资料',
  '提交后立即写入医生角色库',
  '管理员可在医生管理仓继续维护团队与用户关系'
]

const createDefaultForm = () => ({
  name: '',
  title: '',
  specialty: '',
  phone: '',
  areaId: '',
  hospitalId: '',
  departmentId: '',
  managerId: ''
})

const formRef = ref(null)
const form = reactive(createDefaultForm())
const submitting = ref(false)

const areaOptions = ref([])
const departmentOptions = ref([])
const managerOptions = ref([])
const hospitalMap = ref(new Map())
const departmentMap = ref(new Map())

// 专科无独立字典，与科室共用 getDictDepartmentList，取科室名去重作为专科候选
const specialtyOptions = computed(() => {
  const names = departmentOptions.value.map((item) => item?.name).filter((name) => !isMissing(name))
  return [...new Set(names)]
})

const rules = {
  name: [
    { required: true, message: '请输入医生姓名', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const name = String(value || '').trim()
        if (!name) return callback(new Error('请输入医生姓名'))
        if (name.length < 2 || name.length > 20) return callback(new Error('医生姓名需为 2-20 字'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  title: [{ required: true, message: '请选择职称', trigger: 'change' }],
  specialty: [{ required: true, message: '请选择专科', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入 11 位手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' }
  ],
  areaId: [{ required: true, message: '请选择区域', trigger: 'change' }],
  hospitalId: [{ required: true, message: '请选择医院', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }]
}

/* ---------- 注册责任留痕：getCaregiverScope 返回 scopeJson，结构做容错解析 ---------- */

const scopeRaw = ref(null)

const scopeModel = computed(() => {
  const parsed = safeParseJson(scopeRaw.value, null)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
})

const stationName = computed(
  () => scopeModel.value.stationName || scopeModel.value.caregiverName || scopeModel.value.name || ''
)

const stationId = computed(() => {
  const value = scopeModel.value.stationId || scopeModel.value.caregiverStationId || scopeModel.value.id
  return isMissing(value) ? '' : String(value)
})

// D-G5：拿不到 stationId 时后端可能返回全平台数据，表头标注「当前为全量最近录入」，禁止前端本地过滤
const showFullListNote = computed(() => !stationId.value)

const fetchScope = async () => {
  try {
    const res = await getCaregiverScope()
    scopeRaw.value = res?.scopeJson ?? res
  } catch {
    scopeRaw.value = null
  }
}

/* ---------- 字典与联动下拉 ---------- */

const setMap = (mapRef, list, idKey = 'id', nameKey = 'name') => {
  const map = new Map()
  list.forEach((item) => {
    if (item && !isMissing(item[idKey])) map.set(String(item[idKey]), item[nameKey])
  })
  mapRef.value = map
}

const fetchBaseData = async () => {
  const [optionsResult, areaResult, departmentResult] = await Promise.allSettled([
    getDictOptions(),
    getDictAreaList(),
    getDictDepartmentList()
  ])

  const dictOptions = optionsResult.status === 'fulfilled' ? optionsResult.value || {} : {}
  const dictAreas = Array.isArray(dictOptions.areas) ? dictOptions.areas : []
  const dictDepartments = Array.isArray(dictOptions.departments) ? dictOptions.departments : []
  const dictHospitals = Array.isArray(dictOptions.hospitals) ? dictOptions.hospitals : []

  areaOptions.value =
    areaResult.status === 'fulfilled' && Array.isArray(areaResult.value) ? areaResult.value : dictAreas
  departmentOptions.value =
    departmentResult.status === 'fulfilled' && Array.isArray(departmentResult.value)
      ? departmentResult.value
      : dictDepartments

  setMap(hospitalMap, dictHospitals)
  setMap(departmentMap, [...departmentOptions.value, ...dictDepartments])
}

// D-G3：按 areaId/hospitalId 逐级传参尝试；失败或无返回只保留全量，不做本地过滤、不阻塞填写
const loadDepartments = async () => {
  const params = {}
  if (form.areaId) params.areaId = String(form.areaId)
  if (form.hospitalId) params.hospitalId = String(form.hospitalId)
  try {
    const list = await getDictDepartmentList(params)
    if (Array.isArray(list) && list.length) departmentOptions.value = list
  } catch {
    // 级联失败保留当前科室选项
  }
}

// D-G6：按 departmentId 尝试过滤上级医生；不支持时回退全量，下拉可搜索
const loadManagerOptions = async () => {
  try {
    const params = form.departmentId ? { departmentId: String(form.departmentId) } : {}
    const list = await getDoctorOptions(params)
    managerOptions.value = Array.isArray(list) && list.length ? list : []
    if (!managerOptions.value.length && form.departmentId) {
      const fallback = await getDoctorOptions()
      managerOptions.value = Array.isArray(fallback) ? fallback : []
    }
  } catch {
    try {
      const fallback = await getDoctorOptions()
      managerOptions.value = Array.isArray(fallback) ? fallback : []
    } catch {
      managerOptions.value = []
    }
  }
}

const onAreaChange = () => {
  // 区域变更清空医院与科室（医院下拉在字典接口接通前本就禁用）
  form.hospitalId = ''
  form.departmentId = ''
  loadDepartments()
  loadManagerOptions()
}

const onHospitalChange = () => {
  form.departmentId = ''
  loadDepartments()
}

const onDepartmentChange = () => {
  loadManagerOptions()
}

/* ---------- 最近录入：参数透传，禁止前端本地过滤 ---------- */

const recentLoading = ref(false)
const recentList = ref([])

const fetchRecentDoctors = async () => {
  recentLoading.value = true
  try {
    // D-G5：stationId/registerChannel/sort 是否被支持未知，全部按约定透传；后端忽略则由表头小字提示
    const params = {
      registerChannel: 'STATION_ASSIST',
      page: 1,
      pageSize: 6,
      sort: 'createTime,desc'
    }
    if (stationId.value) params.stationId = stationId.value
    const pageResult = toPage(await getDoctorPage(params))
    recentList.value = pageResult.list
  } catch (err) {
    recentList.value = []
    ElMessage.error(err?.message || '最近录入医生加载失败')
  } finally {
    recentLoading.value = false
  }
}

/* ---------- 表格展示（缺失红色「接口未提供」，未知枚举灰标 + 原文） ---------- */

const doctorNameText = (row) => {
  const value = row.doctorName || row.name
  return isMissing(value) ? MISSING_TEXT : String(value)
}

const resolveRelationName = (row, nameKey, idKey, map) => {
  if (!isMissing(row[nameKey])) return String(row[nameKey])
  if (!isMissing(row[idKey])) {
    const name = map.value.get(String(row[idKey]))
    return name || `ID: ${String(row[idKey])}`
  }
  return MISSING_TEXT
}

const hospitalNameText = (row) =>
  resolveRelationName(row, 'hospitalName', 'hospitalId', hospitalMap)

const departmentNameText = (row) =>
  resolveRelationName(row, 'departmentName', 'departmentId', departmentMap)

// 兼容 doctorStatus（ACTIVE 等枚举）与 status（在职/离职文案或数值）两种返回
const statusValue = (row) => row.doctorStatus ?? row.status

const statusLabel = (row) => {
  const value = statusValue(row)
  if (isMissing(value)) return MISSING_TEXT
  return DOCTOR_STATUS_TEXT[value] || String(value)
}

const isStatusKnown = (row) => {
  const value = statusValue(row)
  return !isMissing(value) && Boolean(DOCTOR_STATUS_TEXT[value])
}

const channelValue = (row) => row.registerChannel ?? row.entrySource

const channelLabel = (row) => {
  const value = channelValue(row)
  if (isMissing(value)) return MISSING_TEXT
  return CHANNEL_TEXT[value] || String(value)
}

const isChannelKnown = (row) => {
  const value = channelValue(row)
  return !isMissing(value) && Boolean(CHANNEL_TEXT[value])
}

/* ---------- 提交与重置 ---------- */

const resetForm = () => {
  formRef.value?.resetFields?.()
  Object.assign(form, createDefaultForm())
  formRef.value?.clearValidate?.()
  loadDepartments()
  loadManagerOptions()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    // D-G4：不主动塞 registerChannel / stationId，若后端需要应由 token 推导
    const payload = {
      name: form.name.trim(),
      title: form.title,
      specialty: form.specialty,
      phone: form.phone,
      areaId: String(form.areaId),
      hospitalId: String(form.hospitalId),
      departmentId: String(form.departmentId),
      managerId: form.managerId ? String(form.managerId) : undefined
    }
    await createDoctor(payload)
    ElMessage.success('医生角色添加成功')
    resetForm()
    fetchRecentDoctors()
  } catch (err) {
    // 提交失败保留表单内容，提示后端 message，不自动重试
    ElMessage.error(err?.message || '医生角色添加失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await fetchScope()
  await fetchBaseData()
  loadManagerOptions()
  fetchRecentDoctors()
})
</script>

<template>
  <div class="doctor-create-page">
    <div class="page-header">
      <h1 class="page-title">医生角色添加</h1>
      <p class="page-subtitle">
        驻点可协助管理员注册医生角色。录入方式与管理员端“新建医生”一致，提交后直接进入医生管理仓。
      </p>
    </div>

    <el-alert class="channel-alert" type="primary" :closable="false" show-icon title="驻点协助注册通道"
      description="本入口只负责创建医生基础角色，不包含医生执照或资质附件，也不进入审核队列。管理员可在医生管理仓继续维护团队关系、状态和负责用户。" />

    <div class="page-layout">
      <div class="main-column">
        <el-card shadow="never" class="form-card">
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="doctor-form">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12">
                <el-form-item label="医生姓名" prop="name" required>
                  <el-input v-model.trim="form.name" maxlength="20" placeholder="例如：周医生" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="职称" prop="title" required>
                  <el-select v-model="form.title" class="full-width" placeholder="请选择职称">
                    <el-option v-for="title in TITLE_DICT_OPTIONS" :key="title" :label="title" :value="title" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :sm="12">
                <el-form-item label="专科" prop="specialty" required>
                  <el-select v-model="form.specialty" class="full-width" filterable placeholder="请选择专科">
                    <el-option v-for="specialty in specialtyOptions" :key="specialty" :label="specialty"
                      :value="specialty" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="手机号" prop="phone" required>
                  <el-input v-model.trim="form.phone" maxlength="11" placeholder="请输入 11 位手机号" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :sm="12">
                <el-form-item label="区域" prop="areaId" required>
                  <el-select v-model="form.areaId" class="full-width" filterable placeholder="请选择区域"
                    @change="onAreaChange">
                    <el-option v-for="item in areaOptions" :key="String(item.id)" :label="item.name"
                      :value="String(item.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="医院" prop="hospitalId" required>
                  <el-tooltip content="医院字典接口待补" placement="top" :show-after="100">
                    <span class="select-tooltip">
                      <el-select v-model="form.hospitalId" class="full-width" disabled placeholder="请选择医院"
                        @change="onHospitalChange" />
                    </span>
                  </el-tooltip>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :sm="12">
                <el-form-item label="科室" prop="departmentId" required>
                  <el-select v-model="form.departmentId" class="full-width" filterable placeholder="请选择科室"
                    @change="onDepartmentChange">
                    <el-option v-for="item in departmentOptions" :key="String(item.id)" :label="item.name"
                      :value="String(item.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="上级医生">
                  <el-select v-model="form.managerId" class="full-width" clearable filterable placeholder="暂不指定">
                    <el-option v-for="item in managerOptions" :key="String(item.id)"
                      :label="item.name + (item.title ? `（${item.title}）` : '')" :value="String(item.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-card shadow="never" class="readonly-card">
              <div class="readonly-title">提交后信息</div>
              <div class="readonly-row">
                <span class="readonly-label">医生状态</span>
                <span class="readonly-value">在职</span>
              </div>
              <div class="readonly-row">
                <span class="readonly-label">注册渠道</span>
                <span class="readonly-value">驻点协助</span>
              </div>
              <div class="readonly-row">
                <span class="readonly-label">管理员同步</span>
                <span class="readonly-value">立即同步</span>
              </div>
            </el-card>

            <div class="form-actions">
              <el-button :disabled="submitting" @click="resetForm">重置</el-button>
              <el-button type="primary" :loading="submitting" @click="handleSubmit">
                确认添加医生角色
              </el-button>
            </div>
          </el-form>
        </el-card>
      </div>

      <div class="side-column">
        <el-card shadow="never" class="side-card flow-card">
          <div class="side-title">
            <el-icon class="title-icon">
              <CircleCheck />
            </el-icon>
            <span>注册流程已简化</span>
          </div>
          <ul class="flow-list">
            <li v-for="(text, i) in flowSteps" :key="i">
              <span class="step-no">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="step-text">{{ text }}</span>
            </li>
          </ul>
        </el-card>

        <el-card shadow="never" class="side-card">
          <div class="side-title">注册责任留痕</div>
          <div class="trace-row">
            <span class="trace-label">操作驻点</span>
            <span :class="{ missing: isMissing(stationName) }">
              {{ isMissing(stationName) ? MISSING_TEXT : stationName }}
            </span>
          </div>
          <div class="trace-row">
            <span class="trace-label">所属驻点</span>
            <span>驻点协助注册通道</span>
          </div>
          <div class="trace-row">
            <span class="trace-label">数据范围</span>
            <span>以当前驻点账号授权范围为准</span>
          </div>
        </el-card>
      </div>
    </div>

    <el-card shadow="never" class="recent-card">
      <div class="recent-header">
        <span class="recent-title">最近录入的医生</span>
        <span v-if="showFullListNote" class="recent-note">当前为全量最近录入</span>
      </div>

      <el-table v-loading="recentLoading" :data="recentList" border stripe class="recent-table" empty-text="暂无录入记录">
        <el-table-column label="序号" type="index" width="64" align="center" />

        <el-table-column label="医生" min-width="120">
          <template #default="{ row }">
            <span :class="{ missing: isMissing(row.doctorName || row.name) }">
              {{ doctorNameText(row) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="职称·专科" min-width="140">
          <template #default="{ row }">
            <div class="cell-stack">
              <span :class="{ missing: isMissing(row.title) }">
                {{ isMissing(row.title) ? MISSING_TEXT : row.title }}
              </span>
              <span class="cell-sub" :class="{ missing: isMissing(row.specialty) }">
                {{ isMissing(row.specialty) ? MISSING_TEXT : row.specialty }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="医院·科室" min-width="160">
          <template #default="{ row }">
            <div class="cell-stack">
              <span :class="{ missing: isMissing(row.hospitalName) && isMissing(row.hospitalId) }">
                {{ hospitalNameText(row) }}
              </span>
              <span class="cell-sub" :class="{ missing: isMissing(row.departmentName) && isMissing(row.departmentId) }">
                {{ departmentNameText(row) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="手机号" min-width="130">
          <template #default="{ row }">
            <span :class="{ missing: isMissing(row.phone) }">
              {{ isMissing(row.phone) ? MISSING_TEXT : row.phone }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="!isMissing(statusValue(row))" :type="isStatusKnown(row) ? 'success' : 'info'" effect="light"
              round>
              {{ statusLabel(row) }}
            </el-tag>
            <span v-else class="missing">{{ MISSING_TEXT }}</span>
          </template>
        </el-table-column>

        <el-table-column label="注册渠道" min-width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="!isMissing(channelValue(row))"
              :type="isChannelKnown(row) ? CHANNEL_TAG_TYPE[channelValue(row)] : 'info'" effect="light" round>
              {{ channelLabel(row) }}
            </el-tag>
            <span v-else class="missing">{{ MISSING_TEXT }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.doctor-create-page {
  /* padding: 20px 24px 32px; */
  background: #f5f7fa;
  min-height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}

.channel-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

.page-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.main-column,
.side-column {
  min-width: 0;
}

.form-card,
.side-card,
.recent-card {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.full-width {
  width: 100%;
}

.select-tooltip {
  display: block;
  width: 100%;
}

.readonly-card {
  margin: 8px 0 20px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.readonly-title,
.side-title,
.recent-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.readonly-title {
  margin-bottom: 12px;
}

.readonly-row,
.trace-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #eef0f3;
}

.readonly-row:last-child,
.trace-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.readonly-label,
.trace-label {
  color: #6b7280;
  flex-shrink: 0;
}

.readonly-value,
.trace-row span:last-child {
  color: #374151;
  text-align: right;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.side-card {
  margin-bottom: 16px;
}

.side-title {
  margin-bottom: 12px;
}

.side-paragraph {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}

.recent-card {
  margin-top: 16px;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.recent-note {
  font-size: 12px;
  color: #b45309;
}

.recent-table {
  width: 100%;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cell-sub {
  font-size: 12px;
  color: #6b7280;
}

.missing {
  color: #f56c6c;
}

@media (max-width: 960px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}

.side-card {
  border: 1px solid #dcf5e8;
  border-radius: 10px;
  /* padding:  20px; */
}

.flow-card .side-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0e9f6e;
  font-size: 16px;
  font-weight: 600;
}

.flow-card .side-title .title-icon {
  font-size: 18px;
}

.flow-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}

.flow-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 9px 0;
  font-size: 13px;
  line-height: 1.6;
}

.step-no {
  flex: 0 0 22px;
  color: #12b886;
  font-weight: 700;
}

.step-text {
  flex: 1;
  color: #4b5563;
}
</style>
