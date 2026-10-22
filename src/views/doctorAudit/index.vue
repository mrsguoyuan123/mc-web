<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 状态标签配色
const completeTag = { 完整: 'success', 不完整: 'danger' }
const auditTag = { 待审核: 'warning', 驻点审核中: 'primary', 已通过: 'success', 已拒绝: 'danger' }
const stationTag = { 未推送: 'info', 审核中: 'warning', 已通过: 'success', 已拒绝: 'danger' }
const auditOptions = ['待审核', '驻点审核中', '已通过', '已拒绝']
const stationOptions = ['未推送', '审核中', '已通过', '已拒绝']

// 模拟数据
const doctors = ref([
  { id: 1, name: '李医生', dept: '心内科', hospital: '北京协和医院', campus: '东院区', submitDate: '2026-02-01', complete: '完整', auditStatus: '待审核', stationStatus: '未推送', stationPerson: '李驻点', phone: '13800138001' },
  { id: 2, name: '王医生', dept: '妇产科', hospital: '上海瑞金医院', campus: '南院', submitDate: '2026-01-28', complete: '不完整', auditStatus: '驻点审核中', stationStatus: '审核中', stationPerson: '王驻点', phone: '13800138002' },
  { id: 3, name: '张医生', dept: '骨科', hospital: '广州市人民医院', campus: '西院区', submitDate: '2026-02-02', complete: '完整', auditStatus: '已通过', stationStatus: '已通过', stationPerson: '张驻点', phone: '13800138003' },
  { id: 4, name: '刘医生', dept: '神经外科', hospital: '浙江大学医学院附属第一医院', campus: '总院', submitDate: '2026-01-25', complete: '不完整', auditStatus: '已拒绝', stationStatus: '已拒绝', stationPerson: '刘驻点', phone: '13800138004' },
  { id: 5, name: '陈医生', dept: '儿科', hospital: '重庆儿童医院', campus: '主院区', submitDate: '2026-02-03', complete: '完整', auditStatus: '待审核', stationStatus: '未推送', stationPerson: '陈驻点', phone: '13800138005' },
  { id: 6, name: '杨医生', dept: '泌尿外科', hospital: '四川大学华西医院', campus: '东区', submitDate: '2026-02-04', complete: '不完整', auditStatus: '驻点审核中', stationStatus: '审核中', stationPerson: '杨驻点', phone: '13800138006' },
  { id: 7, name: '赵医生', dept: '肿瘤科', hospital: '中国医学科学院肿瘤医院', campus: '北院', submitDate: '2026-02-05', complete: '完整', auditStatus: '已通过', stationStatus: '已通过', stationPerson: '赵驻点', phone: '13800138007' },
  { id: 8, name: '钱医生', dept: '耳鼻喉科', hospital: '西安交通大学第一附属医院', campus: '南院', submitDate: '2026-02-06', complete: '不完整', auditStatus: '待审核', stationStatus: '未推送', stationPerson: '钱驻点', phone: '13800138008' }
])

// 统计
const stats = computed(() => [
  { key: '', label: '全部申请', value: doctors.value.length, color: '#1f2937' },
  { key: '待审核', label: '待审核', value: doctors.value.filter((d) => d.auditStatus === '待审核').length, color: '#2563eb' },
  { key: '驻点审核中', label: '驻点审核中', value: doctors.value.filter((d) => d.auditStatus === '驻点审核中').length, color: '#4f7cff' },
  { key: '已通过', label: '已通过', value: doctors.value.filter((d) => d.auditStatus === '已通过').length, color: '#1d4ed8' },
  { key: '已拒绝', label: '已拒绝', value: doctors.value.filter((d) => d.auditStatus === '已拒绝').length, color: '#60a5fa' }
])

// 搜索与状态筛选
const keyword = ref('')
const activeStatus = ref('')

const filteredDoctors = computed(() => {
  const word = keyword.value.trim()
  return doctors.value.filter((d) => {
    const matchWord =
      !word ||
      [d.name, d.dept, d.hospital, d.phone].some((v) => v.includes(word))
    const matchStatus = !activeStatus.value || d.auditStatus === activeStatus.value
    return matchWord && matchStatus
  })
})

// Tabs 切换状态
const handleStatusChange = (name) => {
  activeStatus.value = name === 'all' ? '' : name
  daPage.value = 1
}

// 详情弹窗
const detailVisible = ref(false)
const current = ref(null)
const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}
const approve = (row) => {
  row.auditStatus = '已通过'
  row.stationStatus = '已通过'
  ElMessage.success(`已通过 ${row.name} 的注册申请`)
}

// 拒绝
const handleReject = (row) => {
  ElMessageBox.confirm(`确认拒绝 ${row.name} 的注册申请吗？`, '拒绝确认', {
    type: 'warning',
    confirmButtonText: '拒绝',
    cancelButtonText: '取消'
  }).then(() => {
    row.auditStatus = '已拒绝'
    row.stationStatus = '已拒绝'
    ElMessage.success('已拒绝该申请')
  }).catch(() => {})
}

// 编辑弹窗
const formVisible = ref(false)
const formRef = ref()
const createForm = () => ({
  id: null, name: '', dept: '', hospital: '', campus: '', phone: '',
  submitDate: '', complete: '完整', auditStatus: '待审核',
  stationStatus: '未推送', stationPerson: ''
})
const form = reactive(createForm())
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  dept: [{ required: true, message: '请输入科室', trigger: 'blur' }],
  hospital: [{ required: true, message: '请输入医院', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}
const openEdit = (row) => {
  Object.assign(form, row)
  formVisible.value = true
  formRef.value?.clearValidate()
}
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    const target = doctors.value.find((d) => d.id === form.id)
    Object.assign(target, form)
    ElMessage.success('申请信息已更新')
    formVisible.value = false
  })
}
const { page: daPage, pageSize: daSize, pagedData: pagedAudits, total: daTotal } = useTablePage(filteredDoctors)
</script>
<template>
  <div class="audit-page">
    <div class="page-header">
      <h1>医生注册审核</h1>
      <p>审核医生注册申请，支持直接审核和驻点审核</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card"
        :class="{ active: activeStatus === item.key }" @click="activeStatus = item.key">
        <span class="stat-label">{{ item.label }}</span>
        <strong class="stat-value" :style="{ color: item.color }">{{ item.value }}</strong>
      </div>
    </div>

    <!-- 搜索 -->
    <el-input v-model="keyword" class="search-input" size="large" clearable
      placeholder="搜索姓名、科室、医院或电话...">
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <!-- 状态筛选 -->
    <el-tabs :model-value="activeStatus || 'all'" class="filter-tabs" @tab-change="handleStatusChange">
      <el-tab-pane name="all">
        <template #label>全部</template>
      </el-tab-pane>
      <el-tab-pane v-for="status in auditOptions" :key="status" :name="status">
        <template #label>{{ status }}</template>
      </el-tab-pane>
    </el-tabs>

    <!-- 申请列表 -->
    <div class="panel table-card">
      <el-table :data="pagedAudits" stripe>
        <el-table-column prop="dept" label="科室" width="110" />
        <el-table-column label="医院/院区" min-width="220">
          <template #default="{ row }">
            <div class="hospital-cell">
              <span>{{ row.hospital }}</span>
              <small>{{ row.campus }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="submitDate" label="提交日期" width="130" />
        <el-table-column label="资料完整" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="completeTag[row.complete]" size="small" round>{{ row.complete }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="auditTag[row.auditStatus]" size="small" round effect="plain">
              {{ row.auditStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="驻点状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="stationTag[row.stationStatus]" size="small" round>{{ row.stationStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stationPerson" label="驻点人员" width="100" />
                <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看详情" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="拒绝" placement="top">
              <el-button type="danger" link @click="handleReject(row)"><el-icon><CircleClose /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的申请" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="daPage"
        v-model:page-size="daSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="daTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="daPage = 1"
      />
    </div>
    <!-- 申请详情 -->
    <el-dialog v-model="detailVisible" width="620px" class="audit-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>医生申请详情</h3>
          <p v-if="current">申请人: {{ current.name }}</p>
        </div>
      </template>

      <div v-if="current" class="detail-grid">
        <div class="detail-item"><label>姓名</label><span>{{ current.name }}</span></div>
        <div class="detail-item"><label>科室</label><span>{{ current.dept }}</span></div>
        <div class="detail-item"><label>联系电话</label><span>{{ current.phone }}</span></div>
        <div class="detail-item"><label>提交日期</label><span>{{ current.submitDate }}</span></div>
        <div class="detail-item"><label>医院</label><span>{{ current.hospital }}</span></div>
        <div class="detail-item"><label>院区</label><span>{{ current.campus }}</span></div>
        <div class="detail-item">
          <label>资料完整</label>
          <el-tag :type="completeTag[current.complete]" size="small" round>{{ current.complete }}</el-tag>
        </div>
        <div class="detail-item">
          <label>审核状态</label>
          <el-tag :type="auditTag[current.auditStatus]" size="small" round effect="plain">{{ current.auditStatus }}</el-tag>
        </div>
        <div class="detail-item">
          <label>驻点状态</label>
          <el-tag :type="stationTag[current.stationStatus]" size="small" round>{{ current.stationStatus }}</el-tag>
        </div>
        <div class="detail-item"><label>驻点人员</label><span>{{ current.stationPerson }}</span></div>
      </div>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
        <el-button v-if="current && ['待审核', '驻点审核中'].includes(current.auditStatus)"
          type="primary" size="large" @click="approve(current)">审核通过</el-button>
      </template>
    </el-dialog>

    <!-- 编辑申请 -->
    <el-dialog v-model="formVisible" width="640px" class="audit-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>编辑申请</h3>
          <p>修改医生注册申请信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="audit-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="科室" prop="dept">
          <el-input v-model="form.dept" size="large" placeholder="请输入科室" />
        </el-form-item>
        <el-form-item label="医院" prop="hospital">
          <el-input v-model="form.hospital" size="large" placeholder="请输入医院" />
        </el-form-item>
        <el-form-item label="院区" prop="campus">
          <el-input v-model="form.campus" size="large" placeholder="请输入院区" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="提交日期" prop="submitDate">
          <el-date-picker v-model="form.submitDate" type="date" value-format="YYYY-MM-DD"
            class="full-control" size="large" placeholder="选择提交日期" />
        </el-form-item>
        <el-form-item label="资料完整" prop="complete">
          <el-select v-model="form.complete" class="full-control">
            <el-option label="完整" value="完整" />
            <el-option label="不完整" value="不完整" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核状态" prop="auditStatus">
          <el-select v-model="form.auditStatus" class="full-control">
            <el-option v-for="status in auditOptions" :key="status" :label="status" :value="status" />
          </el-select>
        </el-form-item>
        <el-form-item label="驻点状态" prop="stationStatus">
          <el-select v-model="form.stationStatus" class="full-control">
            <el-option v-for="status in stationOptions" :key="status" :label="status" :value="status" />
          </el-select>
        </el-form-item>
        <el-form-item label="驻点人员" prop="stationPerson">
          <el-input v-model="form.stationPerson" size="large" placeholder="请输入驻点人员" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSubmit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.audit-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin: 22px 0;
}

.stat-card {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.stat-card.active {
  border-color: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.14);
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

/* 搜索与筛选 */
.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-tabs {
  margin-top: 4px;
}

.filter-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

.filter-tabs :deep(.el-tabs__content) {
  display: none;
}

/* 列表 */
.table-card {
  padding: 18px 22px;
}

.hospital-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hospital-cell small {
  font-size: 12px;
  color: #9ca3af;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

:deep(.el-table .el-button__text) {
  font-weight: 500;
}

/* 弹窗 */
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

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 24px;
}

.detail-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.detail-item span {
  font-size: 14px;
  color: #1f2937;
}

.audit-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.full-control {
  width: 100%;
}

:deep(.audit-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .search-input {
    width: 100%;
  }

  .detail-grid,
  .audit-form {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.audit-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>