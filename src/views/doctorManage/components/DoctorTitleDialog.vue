<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDoctorById, updateDoctorById } from '../../../api/index.js'
import { isMissing, TITLE_OPTIONS, shortTitle } from '../../../utils/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  doctorId: { type: [String, Number], default: null },
  doctorName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'saved'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) emit('close')
  }
})

const loading = ref(false)
const submitting = ref(false)
const title = ref('')
const detail = ref({})

// 职称下拉：label 用设计稿简称，value 用 swagger 中文枚举全称（提交全称）
const titleOptions = TITLE_OPTIONS.map((value) => ({ value, label: shortTitle(value) }))

const openDialog = async () => {
  if (!props.doctorId) return
  loading.value = true
  title.value = ''
  detail.value = {}
  try {
    const data = await getDoctorById(String(props.doctorId))
    detail.value = data || {}
    title.value = data?.title || ''
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

// 职称走 PUT /doctors/{id} 全量更新（无独立职称端点），按 DoctorRequest 白名单带上原详情
const buildPayload = () => {
  const source = detail.value || {}
  return {
    name: source.name,
    title: title.value,
    phone: source.phone,
    hospitalId: source.hospitalId ? String(source.hospitalId) : undefined,
    departmentId: source.departmentId ? String(source.departmentId) : undefined,
    gender: source.gender || undefined,
    areaId: source.areaId ? String(source.areaId) : undefined,
    specialty: source.specialty || undefined,
    email: source.email || undefined,
    introduction: source.introduction || undefined,
    idCard: source.idCard || undefined,
    certNumber: source.certNumber || undefined,
    practiceNumber: source.practiceNumber || undefined,
    education: source.education || undefined,
    graduateSchool: source.graduateSchool || undefined,
    workYears: isMissing(source.workYears) ? undefined : Number(source.workYears),
    avatar: source.avatar || undefined,
    expertise: Array.isArray(source.expertise) ? source.expertise : [],
    managerId: source.managerId ? String(source.managerId) : undefined,
    status: Number(source.status) === 0 ? 0 : 1
  }
}

const handleConfirm = async () => {
  if (!title.value) {
    ElMessage.warning('请选择职称')
    return
  }
  submitting.value = true
  try {
    await updateDoctorById(String(props.doctorId), buildPayload())
    ElMessage.success('职称修改成功')
    emit('saved')
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(err?.message || '职称修改失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    width="560"
    append-to-body
    destroy-on-close
    class="title-dialog"
  >
    <template #header>
      <div class="dialog-heading">
        <h3>修改医生职称</h3>
        <p>修改 {{ doctorName }} 的职称</p>
      </div>
    </template>

    <div v-loading="loading" class="title-form">
      <label class="form-label">职称</label>
      <el-select v-model="title" class="title-select" size="large" placeholder="请选择职称">
        <el-option
          v-for="item in titleOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <div class="title-tip">
        <span><b>提示：</b>职称层级关系为：主诊 &gt; 主治 &gt; 住院</span>
      </div>
    </div>

    <template #footer>
      <el-button size="large" @click="dialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        size="large"
        class="confirm-btn"
        :loading="submitting"
        @click="handleConfirm"
      >
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-heading h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.dialog-heading p {
  margin: 8px 0 0;
  font-size: 14px;
  color: #9ca3af;
}

.title-form {
  margin-top: 8px;
}

.form-label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.title-select {
  width: 100%;
}

.title-select :deep(.el-input__wrapper) {
  background: #f5f6f8;
  box-shadow: none;
}

.title-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 16px 18px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  font-size: 14px;
  color: #b45309;
}

.title-tip b {
  font-weight: 700;
}

.confirm-btn.el-button {
  min-width: 110px;
  background: #111827;
  border-color: #111827;
  font-weight: 600;
}

.confirm-btn.el-button:hover,
.confirm-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
}
</style>

<style>
.el-dialog.title-dialog {
  border-radius: 18px;
}
</style>