<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  UploadFilled,
  EditPen,
  User,
  FirstAidKit,
  Document,
  Calendar,
  Tickets,
  DataAnalysis,
  ChatLineSquare
} from '@element-plus/icons-vue'
import {
  getPatientDetailById,
  updatePatientDetail,
  recognizePatientAttachment,
  getStaffPage,
  updatePatientMatchById
} from '../../api/index.js'
import { displayText } from '../../utils/index.js'
import CustomerFormDialog from '../userManagement/components/CustomerFormDialog.vue'
import AttachmentPanel from './components/AttachmentPanel.vue'
import DietAnalysisPanel from './components/DietAnalysisPanel.vue'

const route = useRoute()
const router = useRouter()

// URL 通过 query.id 携带患者 id（雪花 ID 字符串）
const patientId = computed(() => (route.query.id ? String(route.query.id) : ''))

// 接口未提供的字段统一红色展示该文案
const NOT_PROVIDED = '接口未提供'

const TABS = [
  { key: 'base', label: '基本信息' },
  { key: 'attachment', label: '附件管理' },
  { key: 'diet', label: '饮食分析' },
  { key: 'exercise', label: '运动分析' },
  { key: 'weight', label: '体重动态' },
  { key: 'blood', label: '血糖血压' },
  { key: 'medication', label: '用药提醒' },
  { key: 'sleep', label: '睡眠管理' },
  { key: 'report', label: '检查报告' }
]

const EDUCATION_OPTIONS = ['小学', '初中', '高中/中专', '大专', '本科', '硕士及以上', '其他']
const MARITAL_OPTIONS = ['已婚', '未婚', '离异', '丧偶']
const GENDER_OPTIONS = ['男', '女']
const CHEMO_OPTIONS = [
  { label: '有化疗', value: '有化疗' },
  { label: '无化疗', value: '无化疗' }
]

// 既往病史 12 项（以后端 pastHistory 枚举为准，前端只做是/否渲染）
const HISTORY_ITEMS = [
  { key: 'hypertension', label: '高血压' },
  { key: 'heartDisease', label: '心脏病' },
  { key: 'diabetes', label: '糖尿病' },
  { key: 'cerebrovascular', label: '脑血管疾病' },
  { key: 'respiratory', label: '呼吸系统疾病' },
  { key: 'kidney', label: '肾脏疾病' },
  { key: 'liver', label: '肝脏疾病' },
  { key: 'surgeryTrauma', label: '手术外伤史' },
  { key: 'transfusion', label: '输血史' },
  { key: 'poisoning', label: '药物/食物中毒史' },
  { key: 'infectious', label: '传染病史' },
  { key: 'hepatitis', label: '病毒性肝炎' }
]

// 化疗监测标准说明（固定说明文案，非业务数据）
const MONITOR_TIPS = [
  '固定监测中性粒细胞、血小板、血红蛋白，化疗前、化疗后 7/14 天关键抽血节点',
  '所有化疗副作用采用通用 CTC AE 分级量化',
  '区分奥沙利铂神经毒性、卡培他滨手足综合征等不良反应'
]

const BASE_FIELDS = [
  { key: 'name', label: '姓名', type: 'input', required: true },
  { key: 'gender', label: '性别', type: 'select', options: GENDER_OPTIONS, required: true },
  { key: 'birthDate', label: '出生日期', type: 'date', required: true },
  { key: 'age', label: '年龄', type: 'number', readonly: true },
  { key: 'region', label: '籍贯', type: 'input' },
  { key: 'occupation', label: '职业', type: 'input' },
  { key: 'phone', label: '联系方式', type: 'input' },
  { key: 'education', label: '文化程度', type: 'select', options: EDUCATION_OPTIONS },
  { key: 'heightCm', label: '身高(cm)', type: 'number' },
  { key: 'weightKg', label: '体重(kg)', type: 'number' },
  { key: 'maritalStatus', label: '婚姻状况', type: 'select', options: MARITAL_OPTIONS },
  { key: 'childrenStatus', label: '子女健康情况', type: 'textarea' },
  { key: 'spouseHealth', label: '配偶健康情况', type: 'textarea' },
  { key: 'idCard', label: '身份证号', type: 'input', readonly: true },
  { key: 'address', label: '住址', type: 'input' }
]

const loading = ref(false)
const activeTab = ref('base')
const editing = ref(false)
const saving = ref(false)
const formRef = ref(null)

// 原始档案：基础 Patient 与病历样表分开留存，保存时按端点拆分
const rawBase = ref({})
const rawRecord = ref({})

const createDefaultForm = () => ({
  name: '',
  gender: '',
  birthDate: '',
  age: '',
  region: '',
  occupation: '',
  phone: '',
  education: '',
  heightCm: '',
  weightKg: '',
  maritalStatus: '',
  childrenStatus: '',
  spouseHealth: '',
  idCard: '',
  address: '',
  bloodPressure: '',
  painScore: '',
  nutritionStatus: '',
  bmi: '',
  smokingDrinking: '',
  allergyHistory: '',
  longTermMedication: '',
  externalMedication: '',
  recentAntibiotic: '',
  admissionDiagnosis: '',
  admissionCondition: '',
  treatmentCourse: '',
  chemoRegimen: '',
  mdtRecord: '',
  dischargeDiagnosis: '',
  pathologyReport: '',
  dischargeMedication: '',
  tumorStage: '',
  dietPlan: '',
  exercisePlan: '',
  sleepPlan: '',
  reviewItems: '',
  weightTarget: '',
  chemoStatus: '',
  neutrophilTarget: '',
  hbTarget: '',
  pltTarget: '',
  liverTarget: '',
  renalTarget: '',
  electrolyteTarget: '',
  nutritionFollowup: '',
  imagingFollowup: '',
  tumorMarkers: '',
  adverseReaction: '',
  longTermFollowup: '',
  history: Object.fromEntries(HISTORY_ITEMS.map((item) => [item.key, false]))
})

const form = reactive(createDefaultForm())

const isEmpty = (value) => value === undefined || value === null || value === ''

const pick = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key]
    if (!isEmpty(value)) return value
  }
  return ''
}

const calcAge = (birthDate) => {
  if (!birthDate) return ''
  const birth = new Date(String(birthDate).slice(0, 10))
  if (Number.isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? age : ''
}

const calcBmi = (heightCm, weightKg) => {
  const height = Number(heightCm)
  const weight = Number(weightKg)
  if (!height || !weight) return ''
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

const normalizeChemoStatus = (value) => {
  if (value === true || value === 1 || value === '有化疗' || value === 'CHEMO' || value === 'YES') {
    return '有化疗'
  }
  if (value === false || value === 0 || value === '无化疗' || value === 'NONE' || value === 'NO') {
    return '无化疗'
  }
  return ''
}

// 集中字段映射：后端命名差异只允许在此处兜底，模板内不散落映射逻辑
const normalizeDetail = (raw = {}) => {
  const next = createDefaultForm()
  const set = (key, candidates) => {
    const value = pick(raw, candidates)
    if (!isEmpty(value)) next[key] = value
  }
  set('name', ['name'])
  set('gender', ['gender'])
  set('birthDate', ['birthDate'])
  set('age', ['age'])
  set('region', ['region', 'nativePlace'])
  set('occupation', ['occupation', 'job'])
  set('phone', ['phone'])
  set('education', ['education', 'educationLevel'])
  set('heightCm', ['heightCm', 'height'])
  set('weightKg', ['weightKg', 'weight'])
  set('maritalStatus', ['maritalStatus', 'marriage'])
  set('childrenStatus', ['childrenStatus', 'childHealth'])
  set('spouseHealth', ['spouseHealth'])
  set('idCard', ['idCard'])
  set('address', ['address', 'homeAddress'])
  set('bloodPressure', ['bloodPressure', 'bp'])
  set('painScore', ['painScore'])
  set('nutritionStatus', ['nutritionStatus'])
  set('bmi', ['bmi'])
  set('smokingDrinking', ['smokingDrinking', 'smokingHistory'])
  set('allergyHistory', ['allergyHistory'])
  set('longTermMedication', ['longTermMedication', 'chronicMedication'])
  set('externalMedication', ['externalMedication'])
  set('recentAntibiotic', ['recentAntibiotic'])
  set('admissionDiagnosis', ['admissionDiagnosis'])
  set('admissionCondition', ['admissionCondition'])
  set('treatmentCourse', ['treatmentCourse', 'treatmentProcess'])
  set('chemoRegimen', ['chemoRegimen', 'chemoPlan'])
  set('mdtRecord', ['mdtRecord'])
  set('dischargeDiagnosis', ['dischargeDiagnosis'])
  set('pathologyReport', ['pathologyReport'])
  set('dischargeMedication', ['dischargeMedication'])
  set('tumorStage', ['tumorStage'])
  set('dietPlan', ['dietPlan', 'rehabDiet'])
  set('exercisePlan', ['exercisePlan', 'rehabExercise'])
  set('sleepPlan', ['sleepPlan', 'rehabSleep'])
  set('reviewItems', ['reviewItems'])
  set('weightTarget', ['weightTarget'])
  next.chemoStatus = normalizeChemoStatus(raw.chemoStatus)
  set('neutrophilTarget', ['neutrophilTarget'])
  set('hbTarget', ['hbTarget'])
  set('pltTarget', ['pltTarget'])
  set('liverTarget', ['liverTarget'])
  set('renalTarget', ['renalTarget'])
  set('electrolyteTarget', ['electrolyteTarget'])
  set('nutritionFollowup', ['nutritionFollowup', 'followupNutrition'])
  set('imagingFollowup', ['imagingFollowup', 'followupImaging'])
  set('tumorMarkers', ['tumorMarkers', 'followupTumorMarkers'])
  set('adverseReaction', ['adverseReaction', 'followupAdverse'])
  set('longTermFollowup', ['longTermFollowup', 'followupLongTerm'])

  // 既往史：优先取嵌套 pastHistory，其次取平铺开关位
  const historySource =
    raw.pastHistory && typeof raw.pastHistory === 'object' ? raw.pastHistory : raw
  HISTORY_ITEMS.forEach((item) => {
    next.history[item.key] = Boolean(historySource[item.key])
  })

  if (isEmpty(next.age)) next.age = calcAge(next.birthDate)
  if (isEmpty(next.bmi)) next.bmi = calcBmi(next.heightCm, next.weightKg)
  return next
}

const ageDisplay = computed(() => (!isEmpty(form.age) ? form.age : calcAge(form.birthDate)))
const bmiDisplay = computed(() => (!isEmpty(form.bmi) ? form.bmi : calcBmi(form.heightCm, form.weightKg)))

const subtitleName = computed(() => displayText(rawBase.value.name))
const insuranceText = computed(() => rawBase.value.insuranceId || '')

const roleCards = computed(() => [
  {
    key: 'doctor',
    label: '主治医生',
    icon: User,
    cardClass: 'role-card--blue',
    name: pick(rawBase.value, ['attendingDoctorName', 'doctorName']) || '未指定',
    action: '修改',
    onClick: openDoctorEdit
  },
  {
    key: 'cs',
    label: '服务客服',
    icon: User,
    cardClass: 'role-card--green',
    name: pick(rawBase.value, ['matchedCsName', 'csName']) || '未指定',
    action: '指定',
    onClick: () => openAssign('CS')
  },
  {
    key: 'caregiver',
    label: '服务陪诊师',
    icon: User,
    cardClass: 'role-card--purple',
    name: pick(rawBase.value, ['matchedCaregiverName', 'caregiverName', 'stationName']) || '未指定',
    action: '指定',
    onClick: () => openAssign('CAREGIVER')
  }
])

const fetchDetail = async () => {
  if (!patientId.value) return
  loading.value = true
  try {
    const detail = await getPatientDetailById(patientId.value)
    rawBase.value = detail || {}
    // 病历样表字段在聚合对象内同层，保存时仍需原始结构，故整体留存
    rawRecord.value = detail || {}
    Object.assign(form, normalizeDetail(detail))
  } catch (err) {
    ElMessage.error(err?.message || '用户详情加载失败')
  } finally {
    loading.value = false
  }
}

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }]
}

let snapshot = null

const enterEdit = () => {
  snapshot = JSON.parse(JSON.stringify(form))
  editing.value = true
}

const cancelEdit = () => {
  if (snapshot) Object.assign(form, JSON.parse(JSON.stringify(snapshot)))
  editing.value = false
  snapshot = null
  formRef.value?.clearValidate?.()
}

const BASE_KEYS = ['name', 'gender', 'age', 'phone', 'idCard', 'region', 'heightCm', 'weightKg']

const saveDetail = async () => {
  await formRef.value.validate()
  const base = {}
  BASE_KEYS.forEach((key) => {
    base[key] = form[key]
  })
  const { history, ...rest } = form
  const record = { ...rawRecord.value, ...rest, pastHistory: { ...history } }
  BASE_KEYS.forEach((key) => delete record[key])
  saving.value = true
  try {
    // 独立详情保存端点待后端补路径，当前拆分到已确认的患者档案 / 病历样表两个更新接口
    await updatePatientDetail(patientId.value, { base, record })
    ElMessage.success('保存成功')
    editing.value = false
    snapshot = null
    fetchDetail()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const beforeTabLeave = (newTab) => {
  if (!editing.value || newTab === activeTab.value) return true
  return ElMessageBox.confirm('有未保存修改，确认离开当前 Tab？', '提示', {
    type: 'warning',
    confirmButtonText: '离开',
    cancelButtonText: '留存'
  })
    .then(() => true)
    .catch(() => false)
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push({ path: '/userManagement' })
}

/* ---------------- 主治医生修改（复用现有编辑弹窗） ---------------- */

const formDialogVisible = ref(false)

function openDoctorEdit() {
  formDialogVisible.value = true
}

const onFormSaved = () => {
  formDialogVisible.value = false
  fetchDetail()
}

/* ---------------- 客服 / 陪诊师指定 ---------------- */

const assignVisible = ref(false)
const assignType = ref('CS')
const assignLoading = ref(false)
const assignSubmitting = ref(false)
const assignOptions = ref([])
const assignForm = reactive({ staffId: '' })

const assignTitle = computed(() => (assignType.value === 'CS' ? '指定服务客服' : '指定服务陪诊师'))

async function openAssign(type) {
  assignType.value = type
  assignForm.staffId = ''
  assignVisible.value = true
  assignLoading.value = true
  try {
    const res = await getStaffPage({ personType: type, status: 1, page: 1, pageSize: 100 })
    assignOptions.value = Array.isArray(res?.list) ? res.list : []
  } catch {
    assignOptions.value = []
  } finally {
    assignLoading.value = false
  }
}

const submitAssign = async () => {
  if (!assignForm.staffId) {
    ElMessage.warning('请选择人员')
    return
  }
  assignSubmitting.value = true
  try {
    const params =
      assignType.value === 'CS'
        ? { csId: String(assignForm.staffId) }
        : { stationId: String(assignForm.staffId) }
    await updatePatientMatchById(patientId.value, params)
    ElMessage.success('指定成功')
    assignVisible.value = false
    fetchDetail()
  } catch (err) {
    ElMessage.error(err?.message || '指定失败，请稍后重试')
  } finally {
    assignSubmitting.value = false
  }
}

/* ---------------- 上传附件并识别 ---------------- */

const ACCEPT_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'docx']
const MAX_SIZE = 20 * 1024 * 1024

const uploadVisible = ref(false)
const uploadLoading = ref(false)
const fileList = ref([])
const uploadInput = ref(null)
const dragOver = ref(false)

const formatSize = (size) => {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const validateFile = (file) => {
  const ext = String(file.name || '').split('.').pop().toLowerCase()
  if (!ACCEPT_TYPES.includes(ext)) {
    ElMessage.error('仅支持 PDF、JPG、PNG、DOCX')
    return false
  }
  if (file.size > MAX_SIZE) {
    ElMessage.error('文件不能超过 20MB')
    return false
  }
  return true
}

const pickFile = (file) => {
  if (!file || !validateFile(file)) return
  // 先单选占位：新文件替换已选文件
  fileList.value = [file]
}

const onInputChange = (event) => {
  pickFile(event.target.files?.[0])
  event.target.value = ''
}

const onDrop = (event) => {
  dragOver.value = false
  pickFile(event.dataTransfer?.files?.[0])
}

const openUpload = () => {
  fileList.value = []
  uploadVisible.value = true
}

const startRecognize = async () => {
  const file = fileList.value[0]
  if (!file) return
  uploadLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    // 一体化识别端点待后端补路径，当前内部复用 文件上传 + 病历 OCR 任务 + 轮询
    const result = await recognizePatientAttachment(patientId.value, formData)
    const fields = result?.result?.fields
    if (fields && typeof fields === 'object') {
      const recognized = normalizeDetail(fields)
      Object.keys(recognized).forEach((key) => {
        if (key === 'history') return
        if (!isEmpty(recognized[key])) form[key] = recognized[key]
      })
    }
    ElMessage.success('识别完成，已回填可识别字段，请核对后保存')
    uploadVisible.value = false
    fileList.value = []
  } catch (err) {
    // 识别失败保留已选文件，便于重试
    ElMessage.error(err?.message || '识别失败，请稍后重试')
  } finally {
    uploadLoading.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div v-loading="loading" class="user-detail-page">
    <div class="detail-header">
      <el-button :icon="ArrowLeft" plain @click="goBack">返回列表</el-button>
      <div class="header-title">
        <h1>用户详情</h1>
        <p>
          {{ subtitleName }} · 保险ID
          <span :class="{ missing: !insuranceText }">{{ insuranceText || NOT_PROVIDED }}</span>
        </p>
      </div>
    </div>

    <el-empty v-if="!loading && !patientId" description="缺少用户 id，请从用户管理仓列表进入" :image-size="110">
      <el-button type="primary" @click="goBack">返回用户管理仓</el-button>
    </el-empty>

    <template v-else>
      <section class="role-card-grid">
        <div v-for="card in roleCards" :key="card.key" class="role-card" :class="card.cardClass">
          <div class="role-main">
            <el-icon class="role-icon"><component :is="card.icon" /></el-icon>
            <div class="role-meta">
              <span class="role-label">{{ card.label }}</span>
              <span class="role-name">{{ card.name }}</span>
            </div>
          </div>
          <el-button link type="primary" @click="card.onClick">{{ card.action }}</el-button>
        </div>
      </section>

      <el-tabs v-model="activeTab" :before-leave="beforeTabLeave" class="detail-tabs">
        <el-tab-pane v-for="tab in TABS" :key="tab.key" :label="tab.label" :name="tab.key">
          <AttachmentPanel v-if="tab.key === 'attachment'" :patient-id="patientId" />
          <DietAnalysisPanel v-else-if="tab.key === 'diet'" :patient-id="patientId" />
          <el-empty v-else-if="tab.key !== 'base'" description="内容待补充" :image-size="90" />

          <div v-else class="tab-body">
            <div class="tab-actions">
              <template v-if="!editing">
                <el-button type="primary" :icon="UploadFilled" @click="openUpload">上传附件并识别</el-button>
                <el-button :icon="EditPen" @click="enterEdit">编辑信息</el-button>
              </template>
              <template v-else>
                <el-button @click="cancelEdit">取消</el-button>
                <el-button type="primary" :loading="saving" @click="saveDetail">保存修改</el-button>
              </template>
            </div>

            <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
              <!-- 5.1 基本信息 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><User /></el-icon>基本信息</h2>
                <el-row :gutter="16">
                  <el-col v-for="field in BASE_FIELDS" :key="field.key" :xs="12" :sm="12" :md="8" :lg="6">
    <el-form-item :label="field.label" :prop="['name', 'gender', 'birthDate', 'phone'].includes(field.key) ? field.key : ''">
                      <template v-if="!editing">
                        <span v-if="field.key === 'age'">{{ displayText(ageDisplay) }}</span>
                        <span v-else-if="isEmpty(form[field.key])" class="missing">{{ NOT_PROVIDED }}</span>
                        <span v-else class="readonly-text">{{ form[field.key] }}</span>
                      </template>
                      <template v-else>
                        <el-input
                          v-if="field.type === 'input'"
                          v-model="form[field.key]"
                          :readonly="field.readonly"
                          :placeholder="field.readonly ? '' : `请输入${field.label}`"
                        />
                        <el-select
                          v-else-if="field.type === 'select'"
                          v-model="form[field.key]"
                          clearable
                          class="full-width"
                          :placeholder="`请选择${field.label}`"
                        >
                          <el-option v-for="option in field.options" :key="option" :label="option" :value="option" />
                        </el-select>
                        <el-date-picker
                          v-else-if="field.type === 'date'"
                          v-model="form[field.key]"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="full-width"
                          placeholder="请选择出生日期"
                        />
                        <el-input-number
                          v-else-if="field.type === 'number'"
                          v-model="form[field.key]"
                          :min="0"
                          :disabled="field.readonly"
                          :placeholder="field.readonly ? '由出生日期推算' : ''"
                          controls-position="right"
                          class="full-width"
                        />
                        <el-input
                          v-else
                          v-model="form[field.key]"
                          type="textarea"
                          :autosize="{ minRows: 1, maxRows: 3 }"
                          :placeholder="`请输入${field.label}`"
                        />
                      </template>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>

              <!-- 5.2 医疗信息 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><FirstAidKit /></el-icon>医疗信息</h2>
                <h3 class="sub-title">既往病史</h3>
                <el-row :gutter="12">
                  <el-col v-for="item in HISTORY_ITEMS" :key="item.key" :xs="12" :sm="8" :md="6">
                    <div
                      class="history-item"
                      :class="{ 'is-on': form.history[item.key], 'is-editable': editing }"
                      @click="editing && (form.history[item.key] = !form.history[item.key])"
                    >
                      <span class="history-label">{{ item.label }}</span>
                      <span class="history-badge" :class="form.history[item.key] ? 'badge-on' : 'badge-off'">
                        {{ form.history[item.key] ? '是' : '否' }}
                      </span>
                    </div>
                  </el-col>
                </el-row>

                <h3 class="sub-title">体征与评分</h3>
                <el-row :gutter="16">
                  <el-col :xs="12" :sm="12" :md="6">
                    <el-form-item label="血压(mmHg)">
                      <el-input v-if="editing" v-model="form.bloodPressure" placeholder="如 138/86" />
                      <span v-else-if="isEmpty(form.bloodPressure)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.bloodPressure }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :sm="12" :md="6">
                    <el-form-item label="疼痛分">
                      <el-input-number v-if="editing" v-model="form.painScore" :min="0" controls-position="right" class="full-width" />
                      <span v-else-if="isEmpty(form.painScore)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.painScore }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :sm="12" :md="6">
                    <el-form-item label="营养状态">
                      <el-input v-if="editing" v-model="form.nutritionStatus" placeholder="请输入营养状态" />
                      <span v-else-if="isEmpty(form.nutritionStatus)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.nutritionStatus }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :sm="12" :md="6">
                    <el-form-item label="BMI">
                      <span v-if="isEmpty(bmiDisplay)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ bmiDisplay }}</span>
                    </el-form-item>
                  </el-col>
                </el-row>

                <h3 class="sub-title">用药与过敏</h3>
                <el-row :gutter="16">
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="烟酒史">
                      <el-input v-if="editing" v-model="form.smokingDrinking" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.smokingDrinking)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.smokingDrinking }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="过敏史">
                      <el-input v-if="editing" v-model="form.allergyHistory" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.allergyHistory)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.allergyHistory }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="长期用药情况">
                      <el-input v-if="editing" v-model="form.longTermMedication" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.longTermMedication)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.longTermMedication }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="外院用药">
                      <el-input v-if="editing" v-model="form.externalMedication" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.externalMedication)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.externalMedication }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :span="24">
                    <el-form-item label="近一周使用抗菌药情况">
                      <el-input v-if="editing" v-model="form.recentAntibiotic" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.recentAntibiotic)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.recentAntibiotic }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>

              <!-- 5.3 入院情况 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><Calendar /></el-icon>入院情况</h2>
                <el-row :gutter="16">
                  <el-col :span="24">
                    <el-form-item label="入院诊断">
                      <el-input v-if="editing" v-model="form.admissionDiagnosis" />
                      <span v-else-if="isEmpty(form.admissionDiagnosis)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.admissionDiagnosis }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :span="24">
                    <el-form-item label="入院情况">
                      <el-input v-if="editing" v-model="form.admissionCondition" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.admissionCondition)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.admissionCondition }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :span="24">
                    <el-form-item label="诊疗经过">
                      <el-input v-if="editing" v-model="form.treatmentCourse" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.treatmentCourse)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.treatmentCourse }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="化疗方案">
                      <el-input v-if="editing" v-model="form.chemoRegimen" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.chemoRegimen)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.chemoRegimen }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="多学科会诊记录">
                      <el-input v-if="editing" v-model="form.mdtRecord" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.mdtRecord)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.mdtRecord }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>

              <!-- 5.4 出院情况 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><Document /></el-icon>出院情况</h2>
                <el-row :gutter="16">
                  <el-col :span="24">
                    <el-form-item label="出院诊断">
                      <el-input v-if="editing" v-model="form.dischargeDiagnosis" />
                      <span v-else-if="isEmpty(form.dischargeDiagnosis)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.dischargeDiagnosis }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="病理报告">
                      <el-input v-if="editing" v-model="form.pathologyReport" type="textarea" :autosize="{ minRows: 3 }" />
                      <p v-else-if="isEmpty(form.pathologyReport)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.pathologyReport }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="出院带药">
                      <el-input v-if="editing" v-model="form.dischargeMedication" type="textarea" :autosize="{ minRows: 3 }" />
                      <p v-else-if="isEmpty(form.dischargeMedication)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.dischargeMedication }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>

              <!-- 5.5 康复管理方案 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><Tickets /></el-icon>康复管理方案（各类针对性处方）</h2>
                <el-row :gutter="16">
                  <el-col :xs="24" :md="8">
                    <el-form-item label="肿瘤分期">
                      <el-select
                        v-if="editing"
                        v-model="form.tumorStage"
                        filterable
                        allow-create
                        clearable
                        class="full-width"
                        placeholder="请选择肿瘤分期"
                      >
                        <el-option :label="form.tumorStage" :value="form.tumorStage" v-if="form.tumorStage" />
                      </el-select>
                      <span v-else-if="isEmpty(form.tumorStage)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.tumorStage }}</span>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :xs="24" :md="8">
                    <el-form-item label="饮食处方">
                      <el-input v-if="editing" v-model="form.dietPlan" type="textarea" :autosize="{ minRows: 3 }" />
                      <p v-else-if="isEmpty(form.dietPlan)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.dietPlan }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="8">
                    <el-form-item label="运动处方">
                      <el-input v-if="editing" v-model="form.exercisePlan" type="textarea" :autosize="{ minRows: 3 }" />
                      <p v-else-if="isEmpty(form.exercisePlan)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.exercisePlan }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="8">
                    <el-form-item label="睡眠处方">
                      <el-input v-if="editing" v-model="form.sleepPlan" type="textarea" :autosize="{ minRows: 3 }" />
                      <p v-else-if="isEmpty(form.sleepPlan)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.sleepPlan }}</p>
                    </el-form-item>
                  </el-col>
                  <el-col :span="24">
                    <el-form-item label="复查指标">
                      <el-input v-if="editing" v-model="form.reviewItems" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form.reviewItems)" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form.reviewItems }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>

              <!-- 5.6 康复监测数据及恢复目标 -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><DataAnalysis /></el-icon>康复管理监测数据以及恢复目标</h2>
                <el-row :gutter="16" class="target-head">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="体重目标">
                      <el-input v-if="editing" v-model="form.weightTarget" />
                      <span v-else-if="isEmpty(form.weightTarget)" class="missing">{{ NOT_PROVIDED }}</span>
                      <span v-else>{{ form.weightTarget }}</span>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="化疗状态">
                      <el-segmented v-if="editing" v-model="form.chemoStatus" :options="CHEMO_OPTIONS" />
                      <el-tag v-else-if="form.chemoStatus === '有化疗'" type="primary" effect="dark" size="small">有化疗</el-tag>
                      <el-tag v-else-if="form.chemoStatus === '无化疗'" size="small">无化疗</el-tag>
                      <span v-else class="missing">{{ NOT_PROVIDED }}</span>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col v-for="target in [
                    { key: 'neutrophilTarget', label: '白细胞/中性粒细胞' },
                    { key: 'hbTarget', label: '血红蛋白(HB)' },
                    { key: 'pltTarget', label: '血小板(PLT)' }
                  ]" :key="target.key" :xs="24" :md="8">
                    <el-form-item :label="`血常规目标 · ${target.label}`">
                      <el-input v-if="editing" v-model="form[target.key]" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form[target.key])" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form[target.key] }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col v-for="target in [
                    { key: 'liverTarget', label: '肝功能' },
                    { key: 'renalTarget', label: '肾功能' },
                    { key: 'electrolyteTarget', label: '电解质' }
                  ]" :key="target.key" :xs="24" :md="8">
                    <el-form-item :label="`其他指标目标 · ${target.label}`">
                      <el-input v-if="editing" v-model="form[target.key]" type="textarea" :autosize="{ minRows: 2 }" />
                      <p v-else-if="isEmpty(form[target.key])" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form[target.key] }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
                <div class="monitor-tips">
                  <p class="tips-title">化疗监测标准说明：</p>
                  <ul>
                    <li v-for="tip in MONITOR_TIPS" :key="tip">{{ tip }}</li>
                  </ul>
                </div>
              </section>

              <!-- 5.7 随访记录汇总（只读） -->
              <section class="info-card">
                <h2 class="card-title"><el-icon><ChatLineSquare /></el-icon>随访记录（查看各项指标汇总）</h2>
                <el-row :gutter="16">
                  <el-col v-for="item in [
                    { key: 'nutritionFollowup', label: '消化道与营养评估' },
                    { key: 'imagingFollowup', label: '影像学检查' },
                    { key: 'tumorMarkers', label: '肿瘤标志物' },
                    { key: 'adverseReaction', label: '不良反应记录' },
                    { key: 'longTermFollowup', label: '长期随访' }
                  ]" :key="item.key" :xs="24" :md="item.key === 'longTermFollowup' ? 24 : 12">
                    <el-form-item :label="item.label">
                      <p v-if="isEmpty(form[item.key])" class="missing">{{ NOT_PROVIDED }}</p>
                      <p v-else class="multiline">{{ form[item.key] }}</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </section>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- 上传附件并识别弹窗 -->
    <el-dialog v-model="uploadVisible" title="上传附件并识别" width="520px" :close-on-click-modal="false" append-to-body>
      <p class="upload-subtitle">上传用户档案、病历或表格，系统将自动识别并填充基本信息字段。</p>
      <div
        class="upload-dragger"
        :class="{ 'is-dragover': dragOver }"
        @click="uploadInput?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <p class="upload-text">点击选择文件，或拖拽至此处</p>
        <p class="upload-hint">支持 PDF、JPG、PNG、DOCX，最大 20MB</p>
        <input
          ref="uploadInput"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          class="hidden-input"
          @change="onInputChange"
        >
      </div>
      <div v-if="fileList.length" class="file-list">
        <div v-for="file in fileList" :key="file.name" class="file-item">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <el-button link type="danger" @click="fileList = []">移除</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!fileList.length" :loading="uploadLoading" @click="startRecognize">
          开始识别
        </el-button>
      </template>
    </el-dialog>

    <!-- 客服 / 陪诊师指定弹窗 -->
    <el-dialog v-model="assignVisible" :title="assignTitle" width="440px" :close-on-click-modal="false" append-to-body>
      <el-form label-position="top">
        <el-form-item :label="assignType === 'CS' ? '服务客服' : '服务陪诊师'" required>
          <el-select
            v-model="assignForm.staffId"
            class="full-width"
            filterable
            :loading="assignLoading"
            :placeholder="assignType === 'CS' ? '请选择客服人员' : '请选择陪诊师'"
          >
            <el-option
              v-for="item in assignOptions"
              :key="String(item.id)"
              :label="item.name || item.username || `人员 ${item.id}`"
              :value="String(item.id)"
            />
            <template #empty><span class="missing">暂无可选人员</span></template>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignSubmitting" @click="submitAssign">确认指定</el-button>
      </template>
    </el-dialog>

    <!-- 主治医生修改：复用用户编辑弹窗链路 -->
    <CustomerFormDialog
      :visible="formDialogVisible"
      :record="rawBase"
      @close="formDialogVisible = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<style scoped>
.user-detail-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.header-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.header-title p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.missing {
  color: #ef4444;
  font-size: 13px;
}

/* 顶部角色卡 */
.role-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.role-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid transparent;
}

.role-card--blue {
  background: #eff6ff;
  border-color: #dbeafe;
}

.role-card--green {
  background: #ecfdf5;
  border-color: #d1fae5;
}

.role-card--purple {
  background: #f5f3ff;
  border-color: #ede9fe;
}

.role-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.role-icon {
  font-size: 20px;
  padding: 8px;
  border-radius: 50%;
  background: #fff;
}

.role-card--blue .role-icon {
  color: #2563eb;
}

.role-card--green .role-icon {
  color: #059669;
}

.role-card--purple .role-icon {
  color: #7c3aed;
}

.role-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.role-label {
  font-size: 12px;
  color: #6b7280;
}

.role-name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.detail-tabs {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px 16px 18px;
}

.tab-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.info-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 18px 4px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.card-title .el-icon {
  color: #4f7cff;
}

.sub-title {
  margin: 6px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.full-width {
  width: 100%;
}

.readonly-text,
.multiline {
  font-size: 14px;
  color: #1f2937;
  word-break: break-all;
}

.multiline {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  color: #6b7280;
  padding-bottom: 2px;
}

/* 既往病史是/否标签 */
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 13px;
  color: #4b5563;
}

.history-item.is-editable {
  cursor: pointer;
}

.history-item.is-on {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #92400e;
  font-weight: 600;
}

.history-badge {
  flex: 0 0 auto;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.badge-on {
  background: #f59e0b;
  color: #fff;
}

.badge-off {
  background: #e5e7eb;
  color: #6b7280;
}

.monitor-tips {
  margin: 4px 0 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 13px;
}

.tips-title {
  margin: 0 0 6px;
  font-weight: 700;
}

.monitor-tips ul {
  margin: 0;
  padding-left: 18px;
}

.monitor-tips li {
  line-height: 1.8;
}

/* 上传识别弹窗 */
.upload-subtitle {
  margin: 0 0 14px;
  font-size: 13px;
  color: #6b7280;
}

.upload-dragger {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 34px 16px;
  border: 1.5px dashed #c7d2fe;
  border-radius: 12px;
  background: #f8faff;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-dragger:hover,
.upload-dragger.is-dragover {
  border-color: #4f7cff;
  background: #eef2ff;
}

.upload-icon {
  font-size: 34px;
  color: #9ca3af;
}

.upload-text {
  margin: 4px 0 0;
  font-size: 14px;
  color: #374151;
}

.upload-hint {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.hidden-input {
  display: none;
}

.file-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.file-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 900px) {
  .role-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
