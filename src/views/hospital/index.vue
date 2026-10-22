<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 字典项
const levels = ['三甲', '三乙', '二甲', '二乙']
const types = ['综合医院', '专科医院', '中医医院', '中西医结合医院']
const statuses = ['正常', '停用']

const provinceCityMap = {
  北京市: ['东城区', '西城区', '海淀区', '朝阳区'],
  上海市: ['黄浦区', '徐汇区', '静安区', '浦东新区'],
  广东省: ['广州市', '深圳市', '佛山市', '东莞市'],
  浙江省: ['杭州市', '宁波市', '温州市', '绍兴市']
}
const provinces = Object.keys(provinceCityMap)

// 模拟数据
const hospitals = ref([
  { id: 1, name: '北京协和医院', level: '三甲', type: '综合医院', province: '北京市', city: '东城区', address: '帅府园1号', phone: '010-69156114', status: '正常', intro: '' },
  { id: 2, name: '北京大学人民医院', level: '三甲', type: '综合医院', province: '北京市', city: '西城区', address: '西直门南大街11号', phone: '010-88324600', status: '正常', intro: '' },
  { id: 3, name: '复旦大学附属中山医院', level: '三甲', type: '综合医院', province: '上海市', city: '徐汇区', address: '枫林路180号', phone: '021-64041990', status: '正常', intro: '' },
  { id: 4, name: '广东省人民医院', level: '三甲', type: '综合医院', province: '广东省', city: '广州市', address: '中山二路106号', phone: '020-83827812', status: '正常', intro: '' },
  { id: 5, name: '温州眼科医院', level: '二甲', type: '专科医院', province: '浙江省', city: '温州市', address: '学院西路270号', phone: '0577-88061366', status: '正常', intro: '' }
])

// 筛选
const keyword = ref('')
const filterLevel = ref('')
const filterType = ref('')

const filteredHospitals = computed(() => {
  const word = keyword.value.trim()
  return hospitals.value.filter((item) => {
    const matchWord =
      !word ||
      item.name.includes(word) ||
      `${item.province}${item.city}${item.address}`.includes(word) ||
      item.phone.includes(word)
    const matchLevel = !filterLevel.value || item.level === filterLevel.value
    const matchType = !filterType.value || item.type === filterType.value
    return matchWord && matchLevel && matchType
  })
})

// 统计
const stats = computed(() => [
  { label: '医院总数', value: hospitals.value.length, unit: '家', desc: '医疗机构', icon: 'OfficeBuilding', theme: 'blue' },
  { label: '三甲医院', value: hospitals.value.filter((h) => h.level === '三甲').length, unit: '家', desc: '三甲等级医院', icon: 'Medal', theme: 'red' },
  { label: '专科医院', value: hospitals.value.filter((h) => h.type === '专科医院').length, unit: '家', desc: '专科医疗机构', icon: 'FirstAidKit', theme: 'cyan' },
  { label: '覆盖省份', value: new Set(hospitals.value.map((h) => h.province)).size, unit: '个', desc: '全国覆盖省份', icon: 'Location', theme: 'green' }
])

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: null,
  name: '',
  level: '三甲',
  type: '综合医院',
  province: '',
  city: '',
  address: '',
  phone: '',
  status: '正常',
  intro: ''
})

const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入医院名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择医院等级', trigger: 'change' }],
  type: [{ required: true, message: '请选择医院类型', trigger: 'change' }],
  province: [{ required: true, message: '请选择省份', trigger: 'change' }],
  city: [{ required: true, message: '请选择城市', trigger: 'change' }],
  phone: [{ pattern: /^[\d-]{7,15}$/, message: '请输入正确的联系电话', trigger: 'blur' }]
}

const cityOptions = computed(() => provinceCityMap[form.province] || [])

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  Object.assign(form, row)
  isEdit.value = true
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const onProvinceChange = () => {
  form.city = ''
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = hospitals.value.find((item) => item.id === form.id)
      Object.assign(target, form)
      ElMessage.success('医院信息已更新')
    } else {
      hospitals.value.unshift({ ...form, id: Date.now() })
      ElMessage.success('医院添加成功')
    }
    dialogVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除医院「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    hospitals.value = hospitals.value.filter((item) => item.id !== row.id)
    ElMessage.success('医院已删除')
  }).catch(() => {})
}
const { page: hpPage, pageSize: hpSize, pagedData: pagedHospitals, total: hpTotal } = useTablePage(filteredHospitals)
</script>
<template>
  <div class="hospital-page">
    <div class="page-header">
      <div>
        <h1>医院管理</h1>
        <p>管理医疗机构信息</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        添加医院
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-top">
          <span class="stat-label">{{ item.label }}</span>
          <span class="stat-value">{{ item.value }}<small>{{ item.unit }}</small></span>
        </div>
        <div class="stat-bottom">
          <span class="stat-icon" :class="item.theme">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span class="stat-desc">{{ item.desc }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <div class="card-label">筛选条件</div>
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索医院名称、地址或电话...">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterLevel" class="filter-select" size="large" clearable placeholder="全部等级">
          <el-option v-for="level in levels" :key="level" :label="level" :value="level" />
        </el-select>
        <el-select v-model="filterType" class="filter-select" size="large" clearable placeholder="全部类型">
          <el-option v-for="type in types" :key="type" :label="type" :value="type" />
        </el-select>
      </div>
    </div>

    <!-- 医院列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>医院列表</h3>
        <span class="table-total">共 {{ filteredHospitals.length }} 家医院</span>
      </div>
      <el-table :data="pagedHospitals" stripe>
        <el-table-column prop="name" label="医院名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="level" label="等级" width="90" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="所在地" min-width="160">
          <template #default="{ row }">{{ row.province }} {{ row.city }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '正常' ? 'success' : 'info'" effect="dark" size="small" round>
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
                <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的医院" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="hpPage"
        v-model:page-size="hpSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="hpTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="hpPage = 1"
      />
    </div>
    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" width="640px" class="hospital-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑医院' : '添加医院' }}</h3>
          <p>填写医院基本信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="hospital-form">
        <el-form-item label="医院名称" prop="name" class="full">
          <el-input v-model="form.name" size="large" placeholder="请输入医院名称" />
        </el-form-item>
        <el-form-item label="医院等级" prop="level">
          <el-select v-model="form.level" class="full-control" placeholder="请选择等级">
            <el-option v-for="level in levels" :key="level" :label="level" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="医院类型" prop="type">
          <el-select v-model="form.type" class="full-control" placeholder="请选择类型">
            <el-option v-for="type in types" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-select v-model="form.province" class="full-control" placeholder="如：北京市"
            @change="onProvinceChange">
            <el-option v-for="province in provinces" :key="province" :label="province" :value="province" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-select v-model="form.city" class="full-control" placeholder="如：东城区">
            <el-option v-for="city in cityOptions" :key="city" :label="city" :value="city" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细地址" prop="address" class="full">
          <el-input v-model="form.address" size="large" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" class="full-control">
            <el-option v-for="status in statuses" :key="status" :label="status" :value="status" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介" prop="intro" class="full">
          <el-input v-model="form.intro" type="textarea" :rows="3"
            placeholder="请输入医院简介" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
      </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hospital-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.page-header .el-button {
  border-radius: 10px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 22px;
}

.stat-card {
  padding: 24px 28px;
  border-radius: 20px;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 15px;

  color: #1f2937;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.stat-value small {
  margin-left: 4px;
  font-size: 15px;
  font-weight: 400;
  color: #9ca3af;
}

.stat-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 26px;
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
}

.stat-icon i {
  font-size: 1.5em;
}

.stat-icon svg {
  width: 25px;
  height: 25px;
}

.stat-icon.blue { background: #e8f0ff; color: #4f6bff; }
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-icon.red { background: #fee2e2; color: #ef4444; }
.stat-icon.cyan { background: #e0f2fe; color: #0284c7; }

.stat-desc {
  margin-top: 14px;
  font-size: 16px;
  color: #9ca3af;
}

/* 筛选区 */
.filter-card {
  margin-top: 22px;
  padding: 20px 22px;
}

.card-label {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

/* 列表 */
.table-card {
  margin-top: 22px;
  padding: 22px;
}

.table-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

.table-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.table-total {
  font-size: 13px;
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

.hospital-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.hospital-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.hospital-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

/* 弹窗 teleport 到 body，使用全局样式 */

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .hospital-form {
    grid-template-columns: 1fr;
  }

  .hospital-form .full {
    grid-column: 1;
  }
}
.el-button+.el-button{
  margin-left: 0;
}
.el-button{
  font-weight: bold;
}
</style>
<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.hospital-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>