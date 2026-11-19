<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createPatient,
  updatePatientById,
  getDictOptions
} from '../../../api/index.js'
import { HEALTH_STATUS_OPTIONS } from '../utils.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  record: { type: Object, default: null }
})
const emit = defineEmits(['close', 'saved'])

const formRef = ref(null)
const submitting = ref(false)
const dict = ref({ hospitals: [], areas: [], departments: [], doctors: [] })

const createDefaultForm = () => ({
  name: '',
  age: '',
  gender: '男',
  phone: '',
  region: '',
  areaId: '',
  hospitalId: '',
  departmentId: '',
  attendingDoctorId: '',
  diseaseIntro: '',
  surgeryType: '',
  surgeryDate: '',
  healthStatus: '良好',
  enableHealthManage: true
})

const form = reactive(createDefaultForm())

const isEdit = computed(() => !!(props.record && props.record.id))

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话号码', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ],
  region: [{ required: true, message: '请选择区域', trigger: 'change' }],
  hospitalId: [{ required: true, message: '请选择医院', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }],
  attendingDoctorId: [{ required: true, message: '请选择主治医生', trigger: 'change' }]
}

const regionOptions = computed(() => {
  const seen = new Map()
  for (const area of dict.value.areas || []) {
    if (area && area.name && !seen.has(area.name)) seen.set(area.name, area)
  }
  return Array.from(seen.values())
})

const hospitalOptions = computed(() => {
  const area = (dict.value.areas || []).find((item) => item.name === form.region)
  if (!area || !area.hospitalId) return dict.value.hospitals || []
  return (dict.value.hospitals || []).filter((item) => String(item.id) === String(area.hospitalId))
})

const departmentOptions = computed(() =>
  (dict.value.departments || []).filter((item) => String(item.hospitalId) === String(form.hospitalId))
)

const doctorOptions = computed(() =>
  (dict.value.doctors || []).filter(
    (item) =>
      String(item.hospitalId) === String(form.hospitalId) &&
      (!form.departmentId || String(item.departmentId) === String(form.departmentId))
  )
)

const loadDict = async () => {
  try {
    const res = await getDictOptions()
    dict.value = {
      hospitals: res?.hospitals || [],
      areas: res?.areas || [],
      departments: res?.departments || [],
      doctors: res?.doctors || []
    }
  } catch {
    dict.value = { hospitals: [], areas: [], departments: [], doctors: [] }
  }
}

const resetForm = () => {
  Object.assign(form, createDefaultForm())
  formRef.value?.clearValidate?.()
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await loadDict()
    resetForm()
    if (props.record) {
      const r = props.record
      const area = (dict.value.areas || []).find((item) => String(item.id) === String(r.areaId))
      Object.assign(form, {
        name: r.name || '',
        age: r.age ?? '',
        gender: r.gender || '男',
        phone: r.phone || '',
        region: r.region || area?.name || '',
        areaId: r.areaId ? String(r.areaId) : '',
        hospitalId: r.hospitalId ? String(r.hospitalId) : '',
        departmentId: r.departmentId ? String(r.departmentId) : '',
        attendingDoctorId: r.attendingDoctorId ? String(r.attendingDoctorId) : '',
        diseaseIntro: r.diseaseIntro || '',
        surgeryType: r.surgeryType || '',
        surgeryDate: r.surgeryDate ? String(r.surgeryDate).slice(0, 10) : '',
        healthStatus: r.healthStatus || '良好',
        enableHealthManage: true
      })
    }
  }
)

const onRegionChange = () => {
  form.hospitalId = ''
  form.departmentId = ''
  form.attendingDoctorId = ''
  const area = (dict.value.areas || []).find((item) => item.name === form.region)
  form.areaId = area ? String(area.id) : ''
}

const onHospitalChange = () => {
  form.departmentId = ''
  form.attendingDoctorId = ''
}

const onDepartmentChange = () => {
  form.attendingDoctorId = ''
}

const handleClose = () => emit('close')

const handleSubmit = async () => {
  await formRef.value.validate()
  if (!Number.isFinite(Number(form.age)) || Number(form.age) <= 0) {
    ElMessage.warning('年龄需为正整数')
    return
  }
  const payload = {
    name: form.name.trim(),
    age: Number(form.age),
    gender: form.gender,
    phone: form.phone.trim(),
    region: form.region,
    areaId: form.areaId ? String(form.areaId) : undefined,
    hospitalId: form.hospitalId ? String(form.hospitalId) : undefined,
    departmentId: form.departmentId ? String(form.departmentId) : undefined,
    attendingDoctorId: form.attendingDoctorId ? String(form.attendingDoctorId) : undefined,
    diseaseIntro: form.diseaseIntro || undefined,
    surgeryType: form.surgeryType || undefined,
    surgeryDate: form.surgeryDate || undefined,
    healthStatus: form.healthStatus
    // 「启用健康管理」开关：Patient 暂无对应后端字段，当前不持久化
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updatePatientById(String(props.record.id), payload)
      ElMessage.success('保存成功')
    } else {
      await createPatient(payload)
      ElMessage.success('新增成功')
    }
    emit('saved')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="720px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="dialog-subtitle">请填写用户基本信息。</div>
    <el-alert
      v-if="!dict.hospitals.length"
      type="warning"
      :closable="false"
      show-icon
      title="机构字典暂无数据"
      description="区域/医院/科室/医生下拉来自 /dict/options，字典为空时无法选择，请先在机构管理中维护。"
      class="dict-tip"
    />
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" label-position="right">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年龄" prop="age">
            <el-input v-model="form.age" placeholder="请输入年龄" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别">
            <el-select v-model="form.gender" class="full-width">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入电话号码" maxlength="11" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="区域" prop="region">
            <el-select v-model="form.region" placeholder="请选择区域" class="full-width" @change="onRegionChange">
              <el-option v-for="item in regionOptions" :key="item.id" :label="item.name" :value="item.name" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="医院" prop="hospitalId">
            <el-select
              v-model="form.hospitalId"
              :placeholder="form.region ? '请选择医院' : '请先选择区域'"
              class="full-width"
              @change="onHospitalChange"
            >
              <el-option v-for="item in hospitalOptions" :key="item.id" :label="item.name" :value="String(item.id)" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="科室" prop="departmentId">
            <el-select
              v-model="form.departmentId"
              :placeholder="form.hospitalId ? '请选择科室' : '请先选择医院'"
              class="full-width"
              @change="onDepartmentChange"
            >
              <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="String(item.id)" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="主治医生" prop="attendingDoctorId">
            <el-select
              v-model="form.attendingDoctorId"
              :placeholder="form.departmentId ? '请选择主治医生' : '请先选择科室'"
              class="full-width"
            >
              <el-option
                v-for="item in doctorOptions"
                :key="item.id"
                :label="`${item.name}${item.title ? `（${item.title}）` : ''}`"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="疾病诊断">
            <el-input v-model="form.diseaseIntro" placeholder="如：冠心病" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手术类型">
            <el-input v-model="form.surgeryType" placeholder="如：冠脉支架植入术" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手术时间">
            <el-date-picker
              v-model="form.surgeryDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择手术时间"
              class="full-width"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="健康状态">
            <el-select v-model="form.healthStatus" class="full-width">
              <el-option v-for="item in HEALTH_STATUS_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="健康管理">
            <el-checkbox v-model="form.enableHealthManage">启用健康管理</el-checkbox>
            <span class="field-hint">（Patient 暂无对应后端字段，当前不持久化）</span>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-subtitle {
  margin-bottom: 16px;
  font-size: 13px;
  color: #9ca3af;
}

.dict-tip {
  margin-bottom: 14px;
}

.full-width {
  width: 100%;
}

.field-hint {
  font-size: 12px;
  color: #9ca3af;
}
</style>