<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getEscortBookings,
  createEscortBooking,
  getStaffPage,
  getPatientPage,
  getDictHospitalPage,
  getDictDepartmentList
} from '../../api/index.js'

// 预约状态文案/标签
const STATUS_META = {
  WAIT_ACCEPT: { label: '待接单', type: 'warning' },
  CONFIRMED: { label: '待服务', type: 'primary' },
  IN_SERVICE: { label: '服务中', type: 'success' },
  COMPLETED: { label: '已服务', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' }
}
const PERIOD_TEXT = { MORNING: '上午', AFTERNOON: '下午', FULLDAY: '全天' }
const PERIOD_TIME = { MORNING: '09:00—11:00', AFTERNOON: '14:00—16:00', FULLDAY: '09:00—16:00' }

const loading = ref(false)
const bookings = ref([])

// 字典数据
const caregiverOptions = ref([])
const patientOptions = ref([])
const hospitalOptions = ref([])
const departmentOptions = ref([])
const caregiverMap = ref({})
const patientMap = ref({})
const hospitalMap = ref({})
const departmentMap = ref({})

// 周历锚点（本周一 00:00）
const weekAnchor = ref(getMonday(new Date()))
function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAnchor.value)
    d.setDate(d.getDate() + i)
    return d
  })
)
const fmtDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const weekRangeText = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  return `${start.getMonth() + 1}月${start.getDate()}日—${end.getMonth() + 1}月${end.getDate()}日`
})
const goPrevWeek = () => { const d = new Date(weekAnchor.value); d.setDate(d.getDate() - 7); weekAnchor.value = d; fetchBookings() }
const goNextWeek = () => { const d = new Date(weekAnchor.value); d.setDate(d.getDate() + 7); weekAnchor.value = d; fetchBookings() }
const goThisWeek = () => { weekAnchor.value = getMonday(new Date()); fetchBookings() }

const bookingsByDate = computed(() => {
  const map = {}
  weekDays.value.forEach((d) => { map[fmtDate(d)] = [] })
  bookings.value.forEach((item) => {
    if (map[item.serviceDate]) map[item.serviceDate].push(item)
  })
  return map
})

// 筛选
const keyword = ref('')
const filterCaregiverId = ref('')
const filterStatus = ref('')
const filteredBookings = computed(() => {
  const word = keyword.value.trim()
  return bookings.value.filter((item) => {
    const patient = patientMap.value[String(item.patientId)]
    const caregiver = caregiverMap.value[String(item.caregiverId)]
    const hospital = hospitalMap.value[String(item.hospitalId)]
    const department = departmentMap.value[String(item.departmentId)]
    const matchWord =
      !word ||
      [patient?.name, caregiver?.name, caregiver?.levelOrArea, hospital?.name, department?.name]
        .filter(Boolean)
        .some((value) => String(value).includes(word))
    const matchCaregiver = !filterCaregiverId.value || String(item.caregiverId) === String(filterCaregiverId.value)
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchWord && matchCaregiver && matchStatus
  })
})
const visibleBookingsByDate = computed(() => {
  const map = {}
  weekDays.value.forEach((d) => { map[fmtDate(d)] = [] })
  filteredBookings.value.forEach((item) => {
    if (map[item.serviceDate]) map[item.serviceDate].push(item)
  })
  return map
})

// 顶部统计（基于本周数据）
const stats = computed(() => {
  const weekList = bookings.value.filter((item) => bookingsByDate.value[item.serviceDate])
  return [
    { label: '本周陪诊预约', value: weekList.length },
    { label: '待接单', value: weekList.filter((b) => b.status === 'WAIT_ACCEPT').length, warn: true },
    { label: '今日服务中 / 待服务', value: weekList.filter((b) => ['IN_SERVICE', 'CONFIRMED'].includes(b.status)).length, primary: true },
    { label: '管理员协助预约', value: weekList.filter((b) => b.source === 'ADMIN').length, purple: true }
  ]
})

const fetchDictionaries = async () => {
  const [caregiverRes, patientRes, hospitalRes] = await Promise.all([
    getStaffPage({ personType: 'CAREGIVER', page: 1, pageSize: 100 }).catch(() => ({ list: [] })),
    getPatientPage({ page: 1, pageSize: 100 }).catch(() => ({ list: [] })),
    getDictHospitalPage({ page: 1, pageSize: 100, status: 1 }).catch(() => ({ list: [] }))
  ])
  caregiverOptions.value = caregiverRes?.list || []
  patientOptions.value = patientRes?.list || []
  hospitalOptions.value = hospitalRes?.list || []
  caregiverMap.value = Object.fromEntries(caregiverOptions.value.map((item) => [String(item.id), item]))
  patientMap.value = Object.fromEntries(patientOptions.value.map((item) => [String(item.id), item]))
  hospitalMap.value = Object.fromEntries(hospitalOptions.value.map((item) => [String(item.id), item]))
}

const fetchDepartments = async (hospitalId) => {
  if (!hospitalId) { departmentOptions.value = []; return }
  try {
    departmentOptions.value = await getDictDepartmentList({ hospitalId: String(hospitalId) }) || []
  } catch {
    departmentOptions.value = []
  }
}

const fetchBookings = async () => {
  loading.value = true
  try {
    const res = await getEscortBookings()
    // 兼容后端返回数组或分页对象
    bookings.value = Array.isArray(res) ? res : (res?.list || [])
  } catch (err) {
    bookings.value = []
    ElMessage.error(err?.message || '陪诊预约加载失败')
  } finally {
    loading.value = false
  }
}

// 协助新增预约弹窗
const dialogVisible = ref(false)
const formRef = ref()
const submitting = ref(false)

const createForm = () => ({
  patientId: '',
  caregiverId: '',
  serviceDate: '',
  period: 'MORNING',
  hospitalId: '',
  departmentId: '',
  remark: ''
})
const form = reactive(createForm())

const rules = {
  patientId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  caregiverId: [{ required: true, message: '请选择驻点人员', trigger: 'change' }],
  serviceDate: [{ required: true, message: '请选择陪诊日期', trigger: 'change' }],
  period: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }]
}

const selectedPatient = computed(() => patientMap.value[String(form.patientId)])
const selectedCaregiver = computed(() => caregiverMap.value[String(form.caregiverId)])
const timeRangeText = computed(() => PERIOD_TIME[form.period] || '')

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  departmentOptions.value = []
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const onHospitalChange = async (hospitalId) => {
  form.departmentId = ''
  await fetchDepartments(hospitalId)
}

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    await createEscortBooking({
      patientId: String(form.patientId),
      caregiverId: String(form.caregiverId),
      serviceDate: form.serviceDate,
      period: form.period,
      departmentId: form.departmentId ? String(form.departmentId) : undefined,
      remark: form.remark || undefined
    })
    ElMessage.success('预约已保存（管理员协助）')
    dialogVisible.value = false
    fetchBookings()
  } catch (err) {
    ElMessage.error(err?.message || '保存预约失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await fetchDictionaries()
  fetchBookings()
})
</script>
<template>
  <div v-loading="loading">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div
          class="stat-value"
          :class="{ warn: item.warn, primary: item.primary, purple: item.purple }"
        >{{ item.value }}</div>
      </div>
    </div>

    <!-- 同步提示 -->
    <el-alert
      class="sync-tip"
      type="primary"
      :closable="false"
      show-icon
    >
      <template #title>
        <span class="sync-title">手机端预约与后台实时同步</span>
      </template>
      <template #default>
        驻点人员在小程序与用户确认陪诊时间后，预约会显示在这里。<strong>管理员可协助新增、改期、调整状态或取消预约，保存后会标记为“管理员协助”。</strong>
      </template>
    </el-alert>

    <!-- 周历工具栏 -->
    <div class="panel calendar-card">
      <div class="calendar-toolbar">
        <div class="week-nav">
          <el-button :icon="ArrowLeft" circle @click="goPrevWeek" />
          <div class="week-text">
            <div class="week-range">{{ weekRangeText }}</div>
            <div class="week-sub">驻点陪诊预约</div>
          </div>
          <el-button :icon="ArrowRight" circle @click="goNextWeek" />
          <el-button :icon="Refresh" @click="goThisWeek">本周</el-button>
        </div>
        <el-button type="primary" :icon="Plus" @click="openAdd">协助新增预约</el-button>
      </div>

      <!-- 筛选 -->
      <div class="filter-row">
        <el-input
          v-model="keyword"
          class="search-input"
          size="large"
          clearable
          placeholder="搜索用户、驻点人员、医院或科室"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterCaregiverId" class="filter-select" size="large" clearable placeholder="全部驻点人员">
          <el-option
            v-for="caregiver in caregiverOptions"
            :key="caregiver.id"
            :label="caregiver.name"
            :value="caregiver.id"
          />
        </el-select>
        <el-select v-model="filterStatus" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option
            v-for="(meta, key) in STATUS_META"
            :key="key"
            :label="meta.label"
            :value="key"
          />
        </el-select>
        <span class="current-count">当前显示 {{ filteredBookings.length }} 条</span>
      </div>

      <!-- 周历 -->
      <div class="week-grid">
        <div v-for="(day, index) in weekDays" :key="fmtDate(day)" class="day-col">
          <div class="day-head">
            <div class="day-name">{{ ['周一','周二','周三','周四','周五','周六','周日'][index] }}</div>
            <div class="day-date">{{ day.getMonth() + 1 }}/{{ day.getDate() }}</div>
            <el-button link type="primary" class="day-add" @click="openAdd">+ 协助添加</el-button>
          </div>
          <div class="day-body">
            <div
              v-for="booking in visibleBookingsByDate[fmtDate(day)] || []"
              :key="booking.id"
              class="booking-card"
              :class="`st-${booking.status}`"
            >
              <div class="booking-top">
                <span class="booking-patient">{{ patientMap[String(booking.patientId)]?.name || '未知用户' }}</span>
                <el-tag size="small" :type="STATUS_META[booking.status]?.type" round>
                  {{ STATUS_META[booking.status]?.label || booking.status }}
                </el-tag>
              </div>
              <div class="booking-line">
                <el-icon><Clock /></el-icon>{{ PERIOD_TIME[booking.period] || PERIOD_TEXT[booking.period] }}
              </div>
              <div class="booking-line">
                <el-icon><Location /></el-icon>{{ caregiverMap[String(booking.caregiverId)]?.levelOrArea || '-' }}
              </div>
              <div class="booking-content">
                {{ booking.remark || departmentMap[String(booking.departmentId)]?.name || '陪诊服务' }}
              </div>
              <div class="booking-hospital">
                {{ hospitalMap[String(booking.hospitalId)]?.name || '' }}
                <template v-if="departmentMap[String(booking.departmentId)]"> · {{ departmentMap[String(booking.departmentId)].name }}</template>
              </div>
              <div class="booking-source">
                <el-icon><Cellphone v-if="booking.source !== 'ADMIN'" /><Avatar v-else /></el-icon>
                {{ booking.source === 'ADMIN' ? '管理员协助' : '驻点手机端' }}
              </div>
            </div>
            <div v-if="!(visibleBookingsByDate[fmtDate(day)] || []).length" class="day-empty">暂无陪诊预约</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 协助新增陪诊预约 -->
    <el-dialog v-model="dialogVisible" width="720px" class="booking-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>协助新增陪诊预约</h3>
          <p>该预约通常由驻点人员在手机端与用户确认；管理员保存后将标记为“管理员协助”。</p>
        </div>
      </template>

      <el-alert
        class="dialog-tip"
        type="primary"
        :closable="false"
        show-icon
        title="请核对用户、驻点人员与陪诊时间。同一驻点人员在同一时段不能存在重叠预约。"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="booking-form">
        <el-form-item label="用户姓名" prop="patientId">
          <el-select
            v-model="form.patientId"
            class="full-control"
            filterable
            placeholder="请输入用户姓名"
          >
            <el-option
              v-for="patient in patientOptions"
              :key="patient.id"
              :label="patient.name"
              :value="patient.id"
            >
              <span>{{ patient.name }}</span>
              <span class="option-phone">{{ patient.phone }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="用户手机号">
          <el-input :model-value="selectedPatient?.phone || ''" size="large" placeholder="11 位手机号" readonly />
        </el-form-item>
        <el-form-item label="驻点人员" prop="caregiverId">
          <el-select v-model="form.caregiverId" class="full-control" filterable placeholder="请选择驻点人员">
            <el-option
              v-for="caregiver in caregiverOptions"
              :key="caregiver.id"
              :label="`${caregiver.name} · ${caregiver.levelOrArea || '驻点'}`"
              :value="caregiver.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所属驻点">
          <el-input :model-value="selectedCaregiver?.levelOrArea || ''" size="large" placeholder="选择驻点人员后自动带出" readonly />
        </el-form-item>
        <el-form-item label="陪诊日期" prop="serviceDate">
          <el-date-picker
            v-model="form.serviceDate"
            class="full-control"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择陪诊日期"
          />
        </el-form-item>
        <el-form-item label="服务类型" prop="period">
          <el-select v-model="form.period" class="full-control" placeholder="请选择服务类型">
            <el-option label="院内陪诊（上午）" value="MORNING" />
            <el-option label="院内陪诊（下午）" value="AFTERNOON" />
            <el-option label="全天陪诊" value="FULLDAY" />
          </el-select>
        </el-form-item>
        <el-form-item label="陪诊医院">
          <el-select
            v-model="form.hospitalId"
            class="full-control"
            clearable
            filterable
            placeholder="请选择医院（用于筛选科室）"
            @change="onHospitalChange"
          >
            <el-option v-for="hospital in hospitalOptions" :key="hospital.id" :label="hospital.name" :value="hospital.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室" prop="departmentId">
          <el-select v-model="form.departmentId" class="full-control" clearable filterable placeholder="请选择科室">
            <el-option v-for="dept in departmentOptions" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-input :model-value="timeRangeText.split('—')[0] || '-'" size="large" readonly />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-input :model-value="timeRangeText.split('—')[1] || '-'" size="large" readonly />
        </el-form-item>
        <el-form-item label="预约状态">
          <el-input model-value="待接单" size="large" readonly />
        </el-form-item>
        <el-form-item label="预约来源">
          <el-input model-value="管理员协助（保存后标记）" size="large" readonly />
        </el-form-item>
        <el-form-item label="备注" class="full">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="填写集合地点、资料准备或需要提醒用户的注意事项"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">保存预约</el-button>
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

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  padding: 20px 24px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
  color: #111827;
}

.stat-value.warn { color: #f59e0b; }
.stat-value.primary { color: #2563eb; }
.stat-value.purple { color: #7c3aed; }

/* 同步提示 */
.sync-tip {
  margin-top: 18px;
}

.sync-title {
  font-weight: 600;
}

/* 周历卡片 */
.calendar-card {
  margin-top: 18px;
  padding: 20px 22px;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-range {
  font-size: 17px;
  font-weight: 700;
}

.week-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #9ca3af;
}

/* 筛选 */
.filter-row {
  margin-top: 18px;
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

.current-count {
  margin-left: auto;
  font-size: 13px;
  color: #9ca3af;
}

/* 周历网格 */
.week-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border: 1px solid #eef0f4;
  border-radius: 12px;
  overflow: hidden;
}

.day-col {
  min-height: 420px;
  border-right: 1px solid #eef0f4;
  display: flex;
  flex-direction: column;
}

.day-col:last-child {
  border-right: none;
}

.day-head {
  padding: 12px 10px;
  text-align: center;
  background: #f8fafc;
  border-bottom: 1px solid #eef0f4;
}

.day-name {
  font-size: 14px;
  font-weight: 600;
}

.day-date {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.day-add {
  margin-top: 6px;
  height: auto;
  font-size: 12px;
}

.day-body {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-empty {
  margin-top: 30px;
  text-align: center;
  font-size: 12px;
  color: #cbd5e1;
}

/* 预约卡片 */
.booking-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f8fafc;
}

.booking-card.st-WAIT_ACCEPT { background: #fffbeb; border-color: #fde68a; }
.booking-card.st-CONFIRMED { background: #eff6ff; border-color: #bfdbfe; }
.booking-card.st-IN_SERVICE { background: #f5f3ff; border-color: #ddd6fe; }
.booking-card.st-COMPLETED { background: #ecfdf5; border-color: #a7f3d0; }
.booking-card.st-CANCELLED { background: #f3f4f6; border-color: #e5e7eb; opacity: 0.8; }

.booking-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.booking-patient {
  font-size: 14px;
  font-weight: 700;
}

.booking-line {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #4b5563;
}

.booking-content {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-hospital {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.booking-source {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

/* 弹窗 */
.dialog-heading h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.dialog-tip {
  margin-bottom: 16px;
}

.booking-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
}

.booking-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

.option-phone {
  float: right;
  color: #9ca3af;
  font-size: 12px;
}

:deep(.booking-dialog) {
  --el-color-primary: #2563eb;
}

@media (max-width: 1200px) {
  .week-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .day-col {
    border-right: 1px solid #eef0f4;
    border-bottom: 1px solid #eef0f4;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .calendar-toolbar,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .week-grid {
    grid-template-columns: 1fr;
  }

  .booking-form {
    grid-template-columns: 1fr;
  }

  .booking-form .full {
    grid-column: 1;
  }
}
</style>
