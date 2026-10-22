<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

// 跳转健康档案，携带患者定位信息
const goRecord = (row) => {
  router.push({ path: '/user/healthRecord', query: { id: row.id, name: row.name } })
}
const statusMap = {
  良好: { type: 'success', effect: 'light' },
  关注: { type: 'warning', effect: 'plain' },
  警告: { type: 'danger', effect: 'dark' }
}

const deptOptions = ['心内科', '内分泌科', '消化科', '呼吸内科', '神经内科']
const hospitalOptions = ['北京协和医院', '北京同仁医院', '上海华山医院', '广州中山医院', '深圳人民医院']
const genderOptions = ['男', '女']

// 模拟患者数据
const patients = ref([
  { id: 'P001', name: '张三', age: 45, gender: '男', phone: '13800138000', city: '北京市', hospital: '北京协和医院', dept: '心内科', doctor: '王医生', status: '良好', registerDate: '2026-01-15', lastCheck: '2026-04-20' },
  { id: 'P002', name: '李娟', age: 38, gender: '女', phone: '13900139000', city: '上海市', hospital: '上海华山医院', dept: '消化科', doctor: '孙医生', status: '关注', registerDate: '2026-02-02', lastCheck: '2026-04-21' },
  { id: 'P003', name: '周强', age: 52, gender: '男', phone: '13700137000', city: '北京市', hospital: '北京同仁医院', dept: '心内科', doctor: '何医生', status: '警告', registerDate: '2026-01-08', lastCheck: '2026-04-19' },
  { id: 'P004', name: '吴敏', age: 41, gender: '女', phone: '13600136000', city: '广州市', hospital: '广州中山医院', dept: '内分泌科', doctor: '郑医生', status: '良好', registerDate: '2026-03-01', lastCheck: '2026-04-18' },
  { id: 'P005', name: '郑洁', age: 48, gender: '女', phone: '13500135000', city: '上海市', hospital: '上海华山医院', dept: '心内科', doctor: '吴医生', status: '良好', registerDate: '2026-02-12', lastCheck: '2026-04-17' },
  { id: 'P006', name: '王芳', age: 35, gender: '女', phone: '13300133000', city: '广州市', hospital: '广州中山医院', dept: '内分泌科', doctor: '郑医生', status: '关注', registerDate: '2026-01-20', lastCheck: '2026-04-16' },
  { id: 'P007', name: '冯磊', age: 43, gender: '男', phone: '13200132000', city: '广州市', hospital: '广州中山医院', dept: '心内科', doctor: '冯医生', status: '良好', registerDate: '2026-02-25', lastCheck: '2026-04-15' },
  { id: 'P008', name: '韩雪', age: 50, gender: '女', phone: '13100131000', city: '深圳市', hospital: '深圳人民医院', dept: '消化科', doctor: '韩医生', status: '警告', registerDate: '2026-01-30', lastCheck: '2026-04-14' },
  { id: 'P009', name: '曹斌', age: 39, gender: '男', phone: '13000130000', city: '深圳市', hospital: '深圳人民医院', dept: '心内科', doctor: '曹医生', status: '良好', registerDate: '2026-03-10', lastCheck: '2026-04-13' },
  { id: 'P010', name: '田丽', age: 46, gender: '女', phone: '13888138000', city: '北京市', hospital: '北京协和医院', dept: '内分泌科', doctor: '田医生', status: '关注', registerDate: '2026-02-18', lastCheck: '2026-04-12' },
  { id: 'P011', name: '何军', age: 55, gender: '男', phone: '13777137000', city: '北京市', hospital: '北京同仁医院', dept: '心内科', doctor: '何医生', status: '警告', registerDate: '2026-01-05', lastCheck: '2026-04-11' },
  { id: 'P012', name: '罗琳', age: 37, gender: '女', phone: '13666136000', city: '上海市', hospital: '上海华山医院', dept: '消化科', doctor: '罗医生', status: '良好', registerDate: '2026-03-15', lastCheck: '2026-04-10' },
  { id: 'P013', name: '韦明', age: 44, gender: '男', phone: '13555135000', city: '广州市', hospital: '广州中山医院', dept: '心内科', doctor: '韦医生', status: '良好', registerDate: '2026-02-08', lastCheck: '2026-04-09' },
  { id: 'P014', name: '谢瑶', age: 40, gender: '女', phone: '13444134000', city: '深圳市', hospital: '深圳人民医院', dept: '内分泌科', doctor: '谢医生', status: '关注', registerDate: '2026-01-22', lastCheck: '2026-04-08' },
  { id: 'P015', name: '杨光', age: 51, gender: '男', phone: '13333133000', city: '北京市', hospital: '北京协和医院', dept: '心内科', doctor: '杨医生', status: '警告', registerDate: '2026-02-20', lastCheck: '2026-04-07' }
])

// 统计
const stats = [
  { label: '总患者数', value: 15, color: '#2563eb', icon: 'user' },
  { label: '健康管理中', value: 13, color: '#16a34a', icon: 'pulse' },
  { label: '需要关注', value: 4, color: '#b45309', icon: 'heart' },
  { label: '健康警告', value: 4, color: '#dc2626', icon: 'trend' }
]

// 筛选
const keyword = ref('')
const ageRange = ref('')
const filterDept = ref('')
const ageRanges = [
  { label: '全部年龄', value: '' },
  { label: '18-30岁', value: '18-30' },
  { label: '31-45岁', value: '31-45' },
  { label: '46-60岁', value: '46-60' },
  { label: '60岁以上', value: '60-200' }
]

const filteredPatients = computed(() => {
  const word = keyword.value.trim()
  return patients.value.filter((p) => {
    const matchWord = !word || [p.name, p.phone, p.city, p.hospital, p.doctor].some((v) => v.includes(word))
    const matchDept = !filterDept.value || p.dept === filterDept.value
    let matchAge = true
    if (ageRange.value) {
      const [min, max] = ageRange.value.split('-').map(Number)
      matchAge = p.age >= min && p.age <= max
    }
    return matchWord && matchDept && matchAge
  })
})
// 详情弹窗
const detailVisible = ref(false)
const current = ref(null)
const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

// 新增/编辑弹窗
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const createForm = () => ({
  id: '',
  name: '',
  age: null,
  gender: '男',
  phone: '',
  city: '',
  hospital: '',
  dept: '',
  doctor: '',
  status: '良好',
  registerDate: '',
  lastCheck: ''
})
const form = reactive(createForm())

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

const resetForm = () => Object.assign(form, createForm())

const openAdd = () => {
  resetForm()
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row) => {
  Object.assign(form, row)
  isEdit.value = true
  detailVisible.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = patients.value.find((p) => p.id === form.id)
      Object.assign(target, form)
      ElMessage.success('患者信息已更新')
    } else {
      const nextId = `P${String(patients.value.length + 1).padStart(3, '0')}`
      patients.value.unshift({ ...form, id: nextId })
      ElMessage.success('患者添加成功')
    }
    formVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除患者「${row.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    patients.value = patients.value.filter((p) => p.id !== row.id)
    ElMessage.success('患者已删除')
  }).catch(() => {})
}

// 图表
const lineRef = ref()
const pieRef = ref()
const barRef = ref()
let lineChart = null
let pieChart = null
let barChart = null
// 蓝/青渐变
const blueArea = () => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(79, 124, 255, 0.5)' },
  { offset: 1, color: 'rgba(79, 124, 255, 0.03)' }
])
const cyanArea = () => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(47, 212, 207, 0.45)' },
  { offset: 1, color: 'rgba(47, 212, 207, 0.03)' }
])
const resizeAll = () => [lineChart, pieChart, barChart].forEach((chart) => chart?.resize())

const initLineChart = () => {
  lineChart = echarts.init(lineRef.value)
  lineChart.setOption({
    grid: { left: 44, right: 20, top: 24, bottom: 36 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['04-15', '04-16', '04-17', '04-18', '04-19', '04-20', '04-21'],
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 16,
      interval: 4,
      splitLine: { lineStyle: { type: 'dashed', color: '#eef0f4' } },
      axisLabel: { color: '#6b7280' }
    },
    series: [{
      name: '患者数',
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 7,
      data: [12, 13, 13, 14, 14, 15, 15],
      itemStyle: { color: '#4f7cff' },
      lineStyle: { color: '#4f7cff', width: 2.5 },
      areaStyle: { color: blueArea() }
    }]
  })
}
// 饼图
const initPieChart = () => {
  pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    color: ['#1962ec', '#90bbff', '#86f7f8'],
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      textStyle: { color: '#4b5563' }
    },
    series: [{
      name: '健康状态',
      type: 'pie',
      radius: ['0%', '62%'],
      center: ['50%', '44%'],
      label: {
        formatter: '{b}: {c}',
        color: '#4b5563',
        fontSize: 12
      },
      data: [
        { value: 7, name: '良好' },
        { value: 4, name: '关注' },
        { value: 4, name: '警告' }
      ]
    }]
  })
}

const initBarChart = () => {
  const counts = deptOptions.map((dept) => ({
    dept,
    count: patients.value.filter((p) => p.dept === dept).length
  }))
  barChart = echarts.init(barRef.value)
  barChart.setOption({
    grid: { left: 20, right: 20, top: 24, bottom: 36, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: counts.map((c) => c.dept),
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed', color: '#eef0f4' } },
      axisLabel: { color: '#6b7280' }
    },
    series: [{
      type: 'bar',
      barWidth: 42,
      data: counts.map((c) => c.count),
      itemStyle: { color: '#053bff', borderRadius: [5, 5, 0, 0] }
    }]
  })
}

onMounted(() => {
  initLineChart()
  initPieChart()
  initBarChart()
  window.addEventListener('resize', resizeAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  ;[lineChart, pieChart, barChart].forEach((chart) => chart?.dispose())
})
const { page: upPage, pageSize: upSize, pagedData: pagedPatients, total: upTotal } = useTablePage(filteredPatients)
</script>

<template>
  <div class="user-page">
    <div class="page-header">
      <div>
        <h1>患者管理</h1>
        <p>管理患者信息和健康档案</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>
        新增患者
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-main">
          <div class="stat-value" :style="{ color: item.color }">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
        <span class="stat-icon" :style="{ color: item.color }">
          <el-icon v-if="item.icon === 'user'"><User /></el-icon>
          <el-icon v-else-if="item.icon === 'trend'"><TrendCharts /></el-icon>
          <svg v-else-if="item.icon === 'pulse'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
          </svg>
        </span>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-row">
      <div class="panel chart-card line-card">
        <h3 class="chart-title">患者注册趋势</h3>
        <div ref="lineRef" class="chart-body"></div>
      </div>
      <div class="panel chart-card pie-card">
        <h3 class="chart-title">健康状态分布</h3>
        <div ref="pieRef" class="chart-body"></div>
      </div>
    </div>
    <div class="panel chart-card bar-card">
      <h3 class="chart-title">科室分布</h3>
      <div ref="barRef" class="chart-body"></div>
    </div>

    <!-- 筛选条件 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索姓名、电话、城市、医院或医生...">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="ageRange" class="filter-select" size="large" placeholder="年龄范围">
          <el-option v-for="item in ageRanges" :key="item.value || 'all'" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filterDept" class="filter-select" size="large" clearable placeholder="全部科室">
          <el-option v-for="dept in deptOptions" :key="dept" :label="dept" :value="dept" />
        </el-select>
      </div>
    </div>
    <!-- 患者列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>患者列表</h3>
        <span class="table-total">共 {{ filteredPatients.length }} 位患者</span>
      </div>
      <el-table :data="pagedPatients" stripe>
        <el-table-column prop="age" label="年龄" width="80">
          <template #default="{ row }">{{ row.age }}岁</template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="70" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="city" label="城市" width="90" />
        <el-table-column prop="hospital" label="医院" min-width="150" show-overflow-tooltip />
        <el-table-column prop="dept" label="科室" width="100" />
        <el-table-column prop="doctor" label="主治医生" width="100" />
        <el-table-column label="健康状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status].type" :effect="statusMap[row.status].effect" size="small" round>
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCheck" label="最近检查" width="120" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看详情" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><Document /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="健康档案" placement="top">
              <el-button type="primary" link @click="goRecord(row)">
                <el-icon>
                  <svg class="health-record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <path d="M9 4v2.2h6V4" />
                    <path d="M8.2 13.2h2.1l1.1-2.7 1.9 4.6 1.2-1.9h2.3" />
                  </svg>
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的患者" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="upPage"
        v-model:page-size="upSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="upTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="upPage = 1"
      />
    </div>

    <!-- 患者详细信息 -->
    <el-dialog v-model="detailVisible" width="620px" class="detail-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>患者详细信息</h3>
          <p v-if="current">患者ID: {{ current.id }}</p>
        </div>
      </template>

      <div v-if="current" class="detail-body">
        <h4 class="detail-section blue">基本信息</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>患者ID</label>
            <span>{{ current.id }}</span>
          </div>
          <div class="detail-item">
            <label>姓名</label>
            <span>{{ current.name }}</span>
          </div>
          <div class="detail-item">
            <label>年龄</label>
            <span>{{ current.age }}岁</span>
          </div>
          <div class="detail-item">
            <label>性别</label>
            <span>{{ current.gender }}</span>
          </div>
          <div class="detail-item">
            <label>联系电话</label>
            <span>{{ current.phone }}</span>
          </div>
          <div class="detail-item">
            <label>注册日期</label>
            <span>{{ current.registerDate }}</span>
          </div>
        </div>

        <h4 class="detail-section green">医疗信息</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>区域</label>
            <span>{{ current.city }}</span>
          </div>
          <div class="detail-item">
            <label>医院</label>
            <span>{{ current.hospital }}</span>
          </div>
          <div class="detail-item">
            <label>科室</label>
            <span>{{ current.dept }}</span>
          </div>
          <div class="detail-item">
            <label>主治医生</label>
            <span>{{ current.doctor }}</span>
          </div>
          <div class="detail-item">
            <label>健康状态</label>
            <el-tag :type="statusMap[current.status].type" :effect="statusMap[current.status].effect" size="small" round>
              {{ current.status }}
            </el-tag>
          </div>
          <div class="detail-item">
            <label>最近检查日期</label>
            <span>{{ current.lastCheck }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" size="large" @click="openEdit(current)">编辑</el-button>
      </template>
    </el-dialog>
    <!-- 新增/编辑患者 -->
    <el-dialog v-model="formVisible" width="640px" class="patient-dialog" @closed="resetForm">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑患者' : '新增患者' }}</h3>
          <p>填写患者基本信息</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="patient-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" size="large" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="form.age" :min="0" :max="120" :controls="false" class="full-control"
            size="large" placeholder="请输入年龄" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" class="full-control">
            <el-option v-for="gender in genderOptions" :key="gender" :label="gender" :value="gender" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" size="large" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" size="large" placeholder="请输入城市" />
        </el-form-item>
        <el-form-item label="医院" prop="hospital">
          <el-select v-model="form.hospital" class="full-control" filterable placeholder="请选择医院">
            <el-option v-for="hospital in hospitalOptions" :key="hospital" :label="hospital" :value="hospital" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室" prop="dept">
          <el-select v-model="form.dept" class="full-control" placeholder="请选择科室">
            <el-option v-for="dept in deptOptions" :key="dept" :label="dept" :value="dept" />
          </el-select>
        </el-form-item>
        <el-form-item label="主治医生" prop="doctor">
          <el-input v-model="form.doctor" size="large" placeholder="请输入主治医生" />
        </el-form-item>
        <el-form-item label="健康状态" prop="status">
          <el-select v-model="form.status" class="full-control">
            <el-option label="良好" value="良好" />
            <el-option label="关注" value="关注" />
            <el-option label="警告" value="警告" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册日期" prop="registerDate">
          <el-date-picker v-model="form.registerDate" type="date" value-format="YYYY-MM-DD"
            class="full-control" size="large" placeholder="选择注册日期" />
        </el-form-item>
        <el-form-item label="最近检查日期" prop="lastCheck" class="full">
          <el-date-picker v-model="form.lastCheck" type="date" value-format="YYYY-MM-DD"
            class="full-control" size="large" placeholder="选择最近检查日期" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.user-page {
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
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
}

.stat-icon {
  display: inline-flex;
  font-size: 30px;
  opacity: 0.55;
}

.stat-icon svg {
  width: 30px;
  height: 30px;
}

/* 图表 */
.chart-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 22px;
}

.chart-card {
  padding: 20px 22px;
}

.bar-card {
  margin-top: 20px;
}

.chart-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}

.chart-body {
  width: 100%;
  height: 260px;
}

.bar-card .chart-body {
  height: 240px;
}

/* 筛选区 */
.filter-card {
  margin-top: 22px;
  padding: 20px 22px;
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

.detail-section {
  margin: 0 0 14px;
  padding-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
  border-bottom: 1px solid #f1f3f7;
}

.detail-section.blue {
  color: #2563eb;
}

.detail-section.green {
  margin-top: 22px;
  color: #16a34a;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 20px;
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

.patient-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 8px;
}

.patient-form .full {
  grid-column: 1 / -1;
}

.full-control {
  width: 100%;
}

:deep(.patient-form .el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-row {
    grid-template-columns: 1fr;
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

  .detail-grid,
  .patient-form {
    grid-template-columns: 1fr;
  }

  .patient-form .full {
    grid-column: 1;
  }
}
.el-icon{
  font-size: 1.5em;
}

.health-record-icon {
  width: 1em;
  height: 1em;
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.detail-dialog,
.el-dialog.patient-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>
