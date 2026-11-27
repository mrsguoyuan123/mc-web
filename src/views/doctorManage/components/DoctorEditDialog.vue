<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getDoctorById,
  createDoctor,
  updateDoctorById,
  updateDoctorManagerById,
  getDoctorOptions,
  getDictOptions,
  uploadFile
} from '../../../api/index.js'
import {
  MISSING_TEXT,
  isMissing,
  TITLE_OPTIONS,
  GENDER_OPTIONS,
  resolveFileUrl
} from '../../../utils/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // create 新建 / edit 编辑
  mode: { type: String, default: 'create' },
  doctorId: { type: [String, Number], default: null }
})

const emit = defineEmits(['close', 'saved'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) emit('close')
  }
})

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const uploading = ref(false)

const dict = ref({ hospitals: [], areas: [], departments: [] })
const managerOptions = ref([])

const createDefaultForm = () => ({
  name: '',
  gender: '',
  title: '',
  phone: '',
  hospitalId: '',
  areaId: '',
  departmentId: '',
  specialty: '',
  email: '',
  introduction: '',
  idCard: '',
  certNumber: '',
  practiceNumber: '',
  education: '',
  graduateSchool: '',
  workYears: undefined,
  avatar: '',
  expertise: [],
  managerId: '',
  status: 1
})

const form = reactive(createDefaultForm())
// 留存打开时的上级医生，用于判断是否需要单独调 manager 端点
const originalManagerId = ref('')

const dialogTitle = computed(() => (props.mode === 'edit' ? '编辑医生' : '新建医生'))

const departmentOptions = computed(() => {
  if (!form.hospitalId) return dict.value.departments
  return dict.value.departments.filter(
    (item) => item.hospitalId === undefined || String(item.hospitalId) === String(form.hospitalId)
  )
})

// 上级候选：在职医生，编辑态排除本人
const managerCandidates = computed(() =>
  managerOptions.value.filter((item) => String(item.id) !== String(props.doctorId))
)

const avatarUrl = computed(() => resolveFileUrl(form.avatar))

const rules = {
  name: [{ required: true, message: '请输入医生姓名', trigger: 'blur' }],
  title: [{ required: true, message: '请选择职称', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ],
  hospitalId: [{ required: true, message: '请选择医院', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }]
}

const resetForm = () => {
  Object.assign(form, createDefaultForm())
  originalManagerId.value = ''
  formRef.value?.clearValidate?.()
}

const fillForm = (detail) => {
  form.name = detail.name || ''
  form.gender = detail.gender || ''
  form.title = detail.title || ''
  form.phone = detail.phone || ''
  form.hospitalId = detail.hospitalId ? String(detail.hospitalId) : ''
  form.areaId = detail.areaId ? String(detail.areaId) : ''
  form.departmentId = detail.departmentId ? String(detail.departmentId) : ''
  form.specialty = detail.specialty || ''
  form.email = detail.email || ''
  form.introduction = detail.introduction || ''
  form.idCard = detail.idCard || ''
  form.certNumber = detail.certNumber || ''
  form.practiceNumber = detail.practiceNumber || ''
  form.education = detail.education || ''
  form.graduateSchool = detail.graduateSchool || ''
  form.workYears = isMissing(detail.workYears) ? undefined : Number(detail.workYears)
  form.avatar = detail.avatar || ''
  form.expertise = Array.isArray(detail.expertise) ? [...detail.expertise] : []
  form.managerId = detail.managerId ? String(detail.managerId) : ''
  form.status = Number(detail.status) === 0 ? 0 : 1
  originalManagerId.value = form.managerId
}

const fetchBaseData = async () => {
  const [dictResult, optionsResult] = await Promise.allSettled([
    getDictOptions(),
    getDoctorOptions()
  ])
  const dictData = dictResult.status === 'fulfilled' ? dictResult.value : null
  dict.value = {
    hospitals: Array.isArray(dictData?.hospitals) ? dictData.hospitals : [],
    areas: Array.isArray(dictData?.areas) ? dictData.areas : [],
    departments: Array.isArray(dictData?.departments) ? dictData.departments : []
  }
  managerOptions.value =
    optionsResult.status === 'fulfilled' && Array.isArray(optionsResult.value)
      ? optionsResult.value
      : []
}

const openDialog = async () => {
  resetForm()
  loading.value = true
  try {
    await fetchBaseData()
    if (props.mode === 'edit' && props.doctorId) {
      const detail = await getDoctorById(String(props.doctorId))
      fillForm(detail || {})
    }
  } catch (err) {
    ElMessage.error(err?.message || '医生信息加载失败')
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) openDialog()
  }
)

const onHospitalChange = () => {
  form.departmentId = ''
  form.areaId = ''
}

// 头像上传：el-upload 自定义请求，先传文件本体拿 url
const handleAvatarUpload = async (options) => {
  const file = options.file
  if (!file) return
  uploading.value = true
  try {
    form.avatar = await uploadFile(file, 'avatar')
    ElMessage.success('头像上传成功')
  } catch (err) {
    ElMessage.error(err?.message || '头像上传失败')
  } finally {
    uploading.value = false
  }
}

const buildPayload = () => {
  const payload = {
    name: form.name,
    gender: form.gender || undefined,
    title: form.title,
    phone: form.phone,
    hospitalId: String(form.hospitalId),
    departmentId: String(form.departmentId),
    areaId: form.areaId ? String(form.areaId) : undefined,
    specialty: form.specialty || undefined,
    email: form.email || undefined,
    introduction: form.introduction || undefined,
    idCard: form.idCard || undefined,
    certNumber: form.certNumber || undefined,
    practiceNumber: form.practiceNumber || undefined,
    education: form.education || undefined,
    graduateSchool: form.graduateSchool || undefined,
    workYears: isMissing(form.workYears) ? undefined : Number(form.workYears),
    avatar: form.avatar || undefined,
    expertise: form.expertise,
    managerId: form.managerId ? String(form.managerId) : undefined,
    status: Number(form.status)
  }
  return payload
}

const handleSave = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    const payload = buildPayload()
    if (props.mode === 'edit' && props.doctorId) {
      await updateDoctorById(String(props.doctorId), payload)
      // 上级医生单独调整时走 manager 端点，保证团队关系同步
      if (form.managerId !== originalManagerId.value) {
        await updateDoctorManagerById(String(props.doctorId), form.managerId || null)
      }
      ElMessage.success('医生信息保存成功')
    } else {
      await createDoctor(payload)
      ElMessage.success('医生创建成功')
    }
    emit('saved')
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(err?.message || '保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="760"
    append-to-body
    destroy-on-close
    class="dm-dialog"
  >
    <el-form
      v-loading="loading"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="doctor-form"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="医生姓名" prop="name" required>
            <el-input v-model="form.name" placeholder="请输入医生姓名" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="职称" prop="title" required>
            <el-select v-model="form.title" class="full-width" placeholder="请选择职称">
              <el-option v-for="title in TITLE_OPTIONS" :key="title" :label="title" :value="title" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <div class="title-tip">
        <span>提示：职称层级关系为：主任医师 &gt; 副主任医师 &gt; 主治医师 &gt; 住院医师</span>
      </div>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="手机号" prop="phone" required>
            <el-input v-model="form.phone" maxlength="11" placeholder="请输入手机号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别">
            <el-select v-model="form.gender" class="full-width" clearable placeholder="请选择性别">
              <el-option v-for="gender in GENDER_OPTIONS" :key="gender" :label="gender" :value="gender" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="医院" prop="hospitalId" required>
            <el-select
              v-model="form.hospitalId"
              class="full-width"
              filterable
              placeholder="请选择医院"
              @change="onHospitalChange"
            >
              <el-option
                v-for="item in dict.hospitals"
                :key="String(item.id)"
                :label="item.name"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="院区">
            <el-select v-model="form.areaId" class="full-width" clearable filterable placeholder="请选择院区">
              <el-option
                v-for="item in dict.areas"
                :key="String(item.id)"
                :label="item.name"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="科室" prop="departmentId" required>
            <el-select
              v-model="form.departmentId"
              class="full-width"
              filterable
              placeholder="请选择科室"
            >
              <el-option
                v-for="item in departmentOptions"
                :key="String(item.id)"
                :label="item.name"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="上级医生">
            <el-select
              v-model="form.managerId"
              class="full-width"
              clearable
              filterable
              placeholder="请选择上级医生（在职）"
            >
              <el-option
                v-for="item in managerCandidates"
                :key="String(item.id)"
                :label="item.name + (item.title ? `（${item.title}）` : '')"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="从业年限">
            <el-input-number
              v-model="form.workYears"
              :min="0"
              controls-position="right"
              class="full-width"
              placeholder="从业年限"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="专长">
            <el-input v-model="form.specialty" placeholder="如：心血管介入" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="擅长领域">
        <el-select
          v-model="form.expertise"
          class="full-width"
          multiple
          filterable
          allow-create
          default-first-option
          collapse-tags
          collapse-tags-tooltip
          placeholder="输入后回车添加擅长领域标签"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="学历">
            <el-input v-model="form.education" placeholder="请输入学历" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="毕业院校">
            <el-input v-model="form.graduateSchool" placeholder="请输入毕业院校" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="医师资格证号">
            <el-input v-model="form.certNumber" placeholder="请输入医师资格证号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="执业证号">
            <el-input v-model="form.practiceNumber" placeholder="请输入执业证号" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="个人简介">
        <el-input
          v-model="form.introduction"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="请输入个人简介"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="头像">
            <div class="avatar-row">
              <el-upload
                :show-file-list="false"
                :http-request="handleAvatarUpload"
                accept="image/*"
              >
                <div v-loading="uploading" class="avatar-box">
                  <el-image v-if="avatarUrl" :src="avatarUrl" fit="cover" class="avatar-img" />
                  <el-icon v-else class="avatar-plus"><Plus /></el-icon>
                </div>
              </el-upload>
              <span class="avatar-hint">支持 jpg/png，单文件 ≤ 20MB</span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="启用状态">
            <div class="status-row">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
              <span class="status-text">{{ form.status === 1 ? '启用' : '停用' }}</span>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" class="btn-blue" :loading="submitting" @click="handleSave">
        {{ mode === 'edit' ? '保存修改' : '确认创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>
<style scoped>
.doctor-form {
  max-height: 64vh;
  overflow-y: auto;
  padding-right: 6px;
}

.full-width {
  width: 100%;
}

.title-tip {
  margin: -8px 0 16px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #b45309;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  overflow: hidden;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-plus {
  font-size: 22px;
  color: #9ca3af;
}

.avatar-hint {
  font-size: 12px;
  color: #9ca3af;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
}

.status-text {
  font-size: 13px;
  color: #374151;
}
</style>

<style>
.el-dialog.dm-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
}

.el-dialog.dm-dialog .btn-blue {
  font-weight: 600;
}
</style>
