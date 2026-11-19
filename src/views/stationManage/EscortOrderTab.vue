<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose } from '@element-plus/icons-vue'
import {
  getEscortBookings,
  createEscortBooking,
  updateEscortBookingById,
  cancelEscortBookingById,
  getStaffPage,
  getPatientPage,
  getDictHospitalPage,
  getDictDepartmentList
} from '../../api/index.js'

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
const orders = ref([])

// 字典
const caregiverOptions = ref([])
const patientOptions = ref([])
const hospitalOptions = ref([])
const departmentOptions = ref([])
const caregiverMap = ref({})
const patientMap = ref({})
const hospitalMap = ref({})
const departmentMap = ref({})

// 筛选
const keyword = ref('')
const filterCaregiverId = ref('')
const filterStatus = ref('')

const orderNo = (id) => `sc-apt${String(id).slice(-5)}`

const filteredOrders = computed(() => {
  const word = keyword.value.trim()
  return orders.value.filter((item) => {
    const patient = patientMap.value[String(item.patientId)]
    const caregiver = caregiverMap.value[String(item.caregiverId)]
    const hospital = hospitalMap.value[String(item.hospitalId)]
    const department = departmentMap.value[String(item.departmentId)]
    const matchWord =
      !word ||
      [patient?.name, patient?.phone, caregiver?.name, caregiver?.levelOrArea, hospital?.name, department?.name, orderNo(item.id)]
        .filter(Boolean)
        .some((value) => String(value).includes(word))
    const matchCaregiver = !filterCaregiverId.value || String(item.caregiverId) === String(filterCaregiverId.value)
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchWord && matchCaregiver && matchStatus
  })
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
    const list = await getDictDepartmentList({ hospitalId: String(hospitalId) })
    departmentOptions.value = list || []
    departmentMap.value = {
      ...departmentMap.value,
      ...Object.fromEntries((list || []).map((item) => [String(item.id), item]))
    }
  } catch {
    departmentOptions.value = []
  }
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await getEscortBookings()
    // 兼容后端返回数组或分页对象
    orders.value = Array.isArray(res) ? res : (res?.list || [])
  } catch (err) {
    orders.value = []
    ElMessage.error(err?.message || '陪诊订单加载失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  keyword.value = ''
  filterCaregiverId.value = ''
  filterStatus.value = ''
}

// 协助新增/编辑订单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)

const createForm = () => ({
  id: '',
  patientId: '',
  caregiverId: '',
  serviceDate: '',
  period: '',
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

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  departmentOptions.value = []
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  resetForm()
  isEdit.value = true
  form.id = String(row.id)
  form.patientId = row.patientId ? String(row.patientId) : ''
  form.caregiverId = row.caregiverId ? String(row.caregiverId) : ''
  form.serviceDate = row.serviceDate || ''
  form.period = row.period || ''
  form.hospitalId = row.hospitalId ? String(row.hospitalId) : ''
  form.departmentId = row.departmentId ? String(row.departmentId) : ''
  form.remark = row.remark || ''
  if (form.hospitalId) fetchDepartments(form.hospitalId)
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const onHospitalChange = async (hospitalId) => {
  form.departmentId = ''
  await fetchDepartments(hospitalId)
}

const buildPayload = () => ({
  patientId: String(form.patientId),
  caregiverId: String(form.caregiverId),
  serviceDate: form.serviceDate,
  period: form.period,
  departmentId: form.departmentId ? String(form.departmentId) : undefined,
  remark: form.remark || undefined
})

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateEscortBookingById(form.id, buildPayload())
      ElMessage.success('订单已更新')
    } else {
      await createEscortBooking(buildPayload())
      ElMessage.success('订单已新增（管理员协助）')
    }
    dialogVisible.value = false
    fetchOrders()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = (row) => {
  ElMessageBox.confirm(`确认取消订单「${orderNo(row.id)}」吗？取消后将返还患者陪诊额度。`, '取消订单', {
    type: 'warning',
    confirmButtonText: '确认取消',
    cancelButtonText: '再想想'
  }).then(async () => {
    try {
      await cancelEscortBookingById(String(row.id))
      ElMessage.success('订单已取消')
      fetchOrders()
    } catch (err) {
      ElMessage.error(err?.message || '取消失败')
    }
  }).catch(() => {})
}

onMounted(async () => {
  await fetchDictionaries()
  fetchOrders()
})
</script>
<template>
  <div>
    <div class="panel order-head">
      <div>
        <h3 class="head-title">陪诊订单</h3>
        <p class="head-sub">将用户申请、驻点执行与管理员协助统一为订单视图，保留字段与排班数据同源。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAdd">协助新增订单</el-button>
    </div>

    <!-- 筛选 -->
    <div class="panel filter-card">
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
        <el-button size="large" @click="handleReset">重置</el-button>
        <span class="current-count">当前显示 {{ filteredOrders.length }} 条订单</span>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="panel table-card">
      <el-table v-loading="loading" :data="filteredOrders" stripe>
        <el-table-column label="订单编号" min-width="120">
          <template #default="{ row }">
            <span class="order-no">{{ orderNo(row.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ patientMap[String(row.patientId)]?.name || '-' }}</span>
              <span class="user-sub">{{ patientMap[String(row.patientId)]?.phone || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="驻点" min-width="130">
          <template #default="{ row }">
            <div class="user-cell">
              <span>{{ caregiverMap[String(row.caregiverId)]?.name || '-' }}</span>
              <el-tag
                v-if="caregiverMap[String(row.caregiverId)]?.levelOrArea"
                size="small"
                type="warning"
                effect="plain"
                round
                class="station-tag"
              >{{ caregiverMap[String(row.caregiverId)].levelOrArea }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="服务类型" min-width="110">
          <template #default="{ row }">{{ PERIOD_TEXT[row.period] || row.period || '-' }}</template>
        </el-table-column>
        <el-table-column label="医院 / 科室" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="user-cell">
              <span>{{ hospitalMap[String(row.hospitalId)]?.name || '-' }}</span>
              <span class="user-sub">{{ departmentMap[String(row.departmentId)]?.name || '' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="预约时间" min-width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <span>{{ row.serviceDate || '-' }}</span>
              <span class="user-sub">{{ PERIOD_TIME[row.period] || PERIOD_TEXT[row.period] || '' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_META[row.status]?.type" effect="light" round size="small">
              {{ STATUS_META[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="130">
          <template #default="{ row }">
            <span class="source-cell">
              <el-icon><Cellphone v-if="row.source !== 'ADMIN'" /><Avatar v-else /></el-icon>
              {{ row.source === 'ADMIN' ? '管理员协助' : '驻点手机端' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 'CANCELLED' && row.status !== 'COMPLETED'"
              type="danger"
              link
              :icon="CircleClose"
              @click="handleCancel(row)"
            >取消</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无陪诊订单" :image-size="90" />
        </template>
      </el-table>
    </div>
    <!-- 协助新增/编辑订单 -->
    <el-dialog v-model="dialogVisible" width="720px" class="order-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '协助编辑陪诊预约' : '协助新增陪诊预约' }}</h3>
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

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="order-form">
        <el-form-item label="用户姓名" prop="patientId">
          <el-select v-model="form.patientId" class="full-control" filterable placeholder="请输入用户姓名">
            <el-option v-for="patient in patientOptions" :key="patient.id" :label="patient.name" :value="patient.id">
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
          <el-date-picker v-model="form.serviceDate" class="full-control" type="date" value-format="YYYY-MM-DD" placeholder="选择陪诊日期" />
        </el-form-item>
        <el-form-item label="服务类型" prop="period">
          <el-select v-model="form.period" class="full-control" clearable placeholder="请选择服务类型">
            <el-option label="上午（09:00—11:00）" value="MORNING" />
            <el-option label="下午（14:00—16:00）" value="AFTERNOON" />
            <el-option label="全天（09:00—16:00）" value="FULLDAY" />
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

.order-head {
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.head-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.head-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.filter-card {
  margin-top: 18px;
  padding: 20px 22px;
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
  width: 170px;
}

.current-count {
  margin-left: auto;
  font-size: 13px;
  color: #9ca3af;
}

.table-card {
  margin-top: 18px;
  padding: 22px;
}

.order-no {
  font-weight: 600;
  color: #4b5563;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
}

.user-sub {
  font-size: 12px;
  color: #94a3b8;
}

.station-tag {
  margin-top: 2px;
  width: fit-content;
}

.source-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

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

.order-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
}

.order-form .full {
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

@media (max-width: 768px) {
  .order-head,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .order-form {
    grid-template-columns: 1fr;
  }

  .order-form .full {
    grid-column: 1;
  }
}
</style>
