<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getDoctorOptions,
  getDictOptions,
  updateDoctorPatientsById
} from '../../../api/index.js'
import { isMissing, shortTitle, teamChipTheme } from '../../../utils/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patientId: { type: [String, Number], default: null },
  patientName: { type: String, default: '' },
  // 初始医疗团队：[{ doctorId, name, title, departmentName, hospitalName }]
  initialTeam: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])

const dialogVisible = ref(props.visible)
watch(
  () => props.visible,
  (value) => {
    dialogVisible.value = value
  }
)
watch(dialogVisible, (value) => {
  if (!value) emit('close')
})

const loading = ref(false)
const submitting = ref(false)
// 当前团队 / 候选医生（弹窗内临时态，点「完成」统一提交）
const currentTeam = ref([])
const candidateTeam = ref([])
const dict = ref({ hospitals: [], departments: [] })

// 本次会话的增量集合（抵消同会话内的反复操作）
const addedIds = ref(new Set())
const removedIds = ref(new Set())

const resolveName = (doc, nameKey, idKey, map) => {
  if (!isMissing(doc?.[nameKey])) return doc[nameKey]
  const id = doc?.[idKey]
  if (isMissing(id)) return ''
  return map.get(String(id)) || ''
}

const maps = computed(() => ({
  hospital: new Map(dict.value.hospitals.map((item) => [String(item.id), item.name])),
  department: new Map(dict.value.departments.map((item) => [String(item.id), item.name]))
}))

// 统一医生对象结构，兼容 DoctorView 与 team[] 两种来源
const normalizeDoctor = (doc) => ({
  doctorId: String(doc.doctorId ?? doc.id),
  name: doc.name || '',
  title: doc.title || '',
  departmentName: resolveName(doc, 'departmentName', 'departmentId', maps.value.department),
  hospitalName: resolveName(doc, 'hospitalName', 'hospitalId', maps.value.hospital)
})

const openDialog = async () => {
  loading.value = true
  currentTeam.value = (props.initialTeam || []).map(normalizeDoctor)
  candidateTeam.value = []
  addedIds.value = new Set()
  removedIds.value = new Set()
  try {
    const [optionsResult, dictResult] = await Promise.allSettled([
      getDoctorOptions(),
      getDictOptions()
    ])
    const dictData = dictResult.status === 'fulfilled' ? dictResult.value : null
    dict.value = {
      hospitals: Array.isArray(dictData?.hospitals) ? dictData.hospitals : [],
      departments: Array.isArray(dictData?.departments) ? dictData.departments : []
    }
    // 字典就绪后重新解析初始团队的科室/医院名
    currentTeam.value = (props.initialTeam || []).map(normalizeDoctor)
    const options =
      optionsResult.status === 'fulfilled' && Array.isArray(optionsResult.value)
        ? optionsResult.value
        : []
    const boundIds = new Set(currentTeam.value.map((item) => item.doctorId))
    candidateTeam.value = options
      .map(normalizeDoctor)
      .filter((item) => !boundIds.has(item.doctorId))
    if (optionsResult.status === 'rejected') {
      ElMessage.error(optionsResult.reason?.message || '医生候选加载失败')
    }
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

// 移除：当前团队 → 候选；若为本次新加则抵消，否则记入移除集合
const removeDoctor = (doctor) => {
  currentTeam.value = currentTeam.value.filter((item) => item.doctorId !== doctor.doctorId)
  candidateTeam.value = [...candidateTeam.value, doctor]
  if (addedIds.value.has(doctor.doctorId)) {
    addedIds.value.delete(doctor.doctorId)
  } else {
    removedIds.value.add(doctor.doctorId)
  }
}

// 添加：候选 → 当前团队；若为本次移除则抵消，否则记入添加集合
const addDoctor = (doctor) => {
  candidateTeam.value = candidateTeam.value.filter((item) => item.doctorId !== doctor.doctorId)
  currentTeam.value = [...currentTeam.value, doctor]
  if (removedIds.value.has(doctor.doctorId)) {
    removedIds.value.delete(doctor.doctorId)
  } else {
    addedIds.value.add(doctor.doctorId)
  }
}

// 患者侧调整医生团队：复用医生侧增量端点，按医生逐个提交患者 id（方向待后端患者侧端点确认）
const handleFinish = async () => {
  if (!props.patientId) return
  if (!addedIds.value.size && !removedIds.value.size) {
    ElMessage.info('未调整医生')
    dialogVisible.value = false
    return
  }
  submitting.value = true
  try {
    const tasks = []
    addedIds.value.forEach((doctorId) => {
      tasks.push(
        updateDoctorPatientsById(String(doctorId), {
          addPatientIds: [String(props.patientId)],
          removePatientIds: []
        })
      )
    })
    removedIds.value.forEach((doctorId) => {
      tasks.push(
        updateDoctorPatientsById(String(doctorId), {
          addPatientIds: [],
          removePatientIds: [String(props.patientId)]
        })
      )
    })
    await Promise.all(tasks)
    ElMessage.success('医疗团队调整成功')
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
    width="720"
    append-to-body
    destroy-on-close
    class="team-bind-dialog"
  >
    <template #header>
      <div class="dialog-heading">
        <h3>调整医患绑定关系</h3>
        <p>为 {{ patientName }} 调整医疗团队</p>
      </div>
    </template>

    <div v-loading="loading" class="bind-scroll">
      <div class="section-label">当前医疗团队</div>
      <el-empty
        v-if="!currentTeam.length"
        description="暂未绑定医生"
        :image-size="64"
      />
      <div v-for="doc in currentTeam" :key="doc.doctorId" class="doctor-row">
        <div class="doc-line">
          <span class="team-chip" :class="teamChipTheme(doc.title)">
            {{ shortTitle(doc.title) }}
          </span>
          <span class="doc-name">{{ doc.name || '接口未提供' }}</span>
          <span class="doc-dept">{{ doc.departmentName || '-' }}</span>
          <span class="doc-hospital">{{ doc.hospitalName || '-' }}</span>
        </div>
        <el-button link type="primary" @click="removeDoctor(doc)">移除</el-button>
      </div>

      <div class="section-label">可添加的医生</div>
      <el-empty
        v-if="!candidateTeam.length"
        description="暂无可添加医生"
        :image-size="64"
      />
      <div v-for="doc in candidateTeam" :key="doc.doctorId" class="doctor-row">
        <div class="doc-line">
          <span class="team-chip" :class="teamChipTheme(doc.title)">
            {{ shortTitle(doc.title) }}
          </span>
          <span class="doc-name">{{ doc.name || '接口未提供' }}</span>
          <span class="doc-dept">{{ doc.departmentName || '-' }}</span>
          <span class="doc-hospital">{{ doc.hospitalName || '-' }}</span>
        </div>
        <el-button link type="primary" @click="addDoctor(doc)">添加</el-button>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" class="finish-btn" :loading="submitting" @click="handleFinish">
        完成
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

.bind-scroll {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}

.section-label {
  margin: 16px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.section-label:first-child {
  margin-top: 2px;
}

.doctor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.doctor-row + .doctor-row {
  margin-top: 10px;
}

.doc-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.team-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.team-chip.dark {
  background: #111827;
  color: #fff;
}

.team-chip.light {
  background: #f3f4f6;
  color: #374151;
}

.doc-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

.doc-dept {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.doc-hospital {
  font-size: 14px;
  color: #9ca3af;
  white-space: nowrap;
}

.finish-btn.el-button {
  min-width: 100px;
  background: #111827;
  border-color: #111827;
  font-weight: 600;
}

.finish-btn.el-button:hover,
.finish-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
}
</style>

<style>
.el-dialog.team-bind-dialog {
  border-radius: 18px;
}
</style>