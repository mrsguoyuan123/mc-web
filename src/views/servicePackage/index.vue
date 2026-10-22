<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 医院 - 科室级联
const hospitalMap = {
  北京协和医院: ['体检中心', '内分泌科', '心内科'],
  上海瑞金医院: ['康复科', '骨科', '神经内科'],
  广州市人民医院: ['妇产科', '儿科', '普外科']
}
const hospitals = Object.keys(hospitalMap)
const statusOptions = ['上架', '下架']

// 服务包模拟数据
const packages = ref([
  {
    id: 1, name: '健康体检套餐A', hospital: '北京协和医院', dept: '体检中心',
    status: '下架', createdAt: '2026-04-10 09:30:00', desc: '面向中青年人群的全面健康体检套餐',
    items: [
      { name: '血常规检查', desc: '包含白细胞、红细胞等指标检测', price: 80 },
      { name: '肝功能检查', desc: '检测肝脏健康状况', price: 150 },
      { name: '心电图', desc: '心脏功能检查', price: 100 },
      { name: '胸部X光', desc: '肺部及胸腔检查', price: 200 },
      { name: '腹部B超', desc: '腹部器官检查', price: 250 },
      { name: '医生问诊', desc: '专业医生综合评估', price: 500 }
    ]
  },
  {
    id: 2, name: '慢病管理套餐', hospital: '北京协和医院', dept: '内分泌科',
    status: '下架', createdAt: '2026-04-12 14:20:00', desc: '糖尿病、高血压等慢病全年管理',
    items: [
      { name: '专家门诊4次', desc: '内分泌专家一对一诊疗', price: 800 },
      { name: '血糖监测12次', desc: '居家血糖定期监测', price: 360 },
      { name: '糖化血红蛋白检测', desc: '反映近3个月血糖水平', price: 240 },
      { name: '用药指导', desc: '个体化用药方案调整', price: 200 },
      { name: '饮食方案定制', desc: '营养师定制糖尿病食谱', price: 480 },
      { name: '健康随访', desc: '全年12次电话随访', price: 500 }
    ]
  },
  {
    id: 3, name: '康复理疗套餐', hospital: '上海瑞金医院', dept: '康复科',
    status: '下架', createdAt: '2026-04-08 11:15:00', desc: '术后及骨关节康复理疗',
    items: [
      { name: '康复评估', desc: '肢体功能与活动度评估', price: 300 },
      { name: '物理因子治疗6次', desc: '电疗、热疗等物理治疗', price: 1200 },
      { name: '运动疗法6次', desc: '治疗师指导康复训练', price: 900 },
      { name: '推拿针灸4次', desc: '传统手法舒筋通络', price: 800 }
    ]
  },
  {
    id: 4, name: '孕产全程服务包', hospital: '广州市人民医院', dept: '妇产科',
    status: '上架', createdAt: '2026-04-05 10:05:00', desc: '覆盖产检、分娩与产后康复全程',
    items: [
      { name: '孕期产检12次', desc: '覆盖全孕周规范产检', price: 1800 },
      { name: '四维彩超2次', desc: '胎儿大排畸检查', price: 900 },
      { name: '分娩床位预约', desc: '优先安排分娩床位', price: 500 },
      { name: '无痛分娩', desc: '分娩镇痛服务', price: 800 },
      { name: '新生儿筛查', desc: '先天性疾病筛查', price: 380 },
      { name: '产后康复4次', desc: '盆底与形体康复训练', price: 200 },
      { name: '母乳喂养指导', desc: '专业通乳与喂养指导', price: 60 },
      { name: '孕期营养课', desc: '孕期膳食营养讲座', price: 40 }
    ]
  },
  {
    id: 5, name: '儿童健康守护包', hospital: '广州市人民医院', dept: '儿科',
    status: '上架', createdAt: '2026-04-03 16:40:00', desc: '0-6岁儿童保健与常见病诊疗',
    items: [
      { name: '儿童体检2次', desc: '全面生长发育体检', price: 300 },
      { name: '疫苗接种指导', desc: '计划内疫苗接种规划', price: 80 },
      { name: '生长发育评估', desc: '身高体重发育跟踪', price: 200 },
      { name: '专家门诊2次', desc: '儿科专家优先接诊', price: 200 },
      { name: '在线咨询年卡', desc: '全年不限次图文咨询', price: 200 }
    ]
  },
  {
    id: 6, name: '心脑血管复查包', hospital: '北京协和医院', dept: '心内科',
    status: '上架', createdAt: '2026-04-01 08:50:00', desc: '心脑血管疾病定期复查套餐',
    items: [
      { name: '专家门诊2次', desc: '心内专家复诊解读', price: 400 },
      { name: '心脏彩超', desc: '心脏结构功能检查', price: 350 },
      { name: '颈动脉彩超', desc: '评估斑块与狭窄', price: 280 },
      { name: '动态心电图', desc: '24小时心律监测', price: 300 },
      { name: '血脂四项检测', desc: '血脂水平化验', price: 120 },
      { name: '头颅CT', desc: '脑血管影像学检查', price: 260 },
      { name: '报告解读', desc: '检查结果综合解读', price: 150 }
    ]
  }
])

// 总价与项目数
const totalPrice = (items) => items.reduce((sum, i) => sum + Number(i.price || 0), 0)

// 搜索（点击查询后生效）
const keyword = ref('')
const filterHospital = ref('')
const filterStatus = ref('')
const applied = reactive({ keyword: '', hospital: '', status: '' })

const filteredPackages = computed(() =>
  packages.value.filter((p) => {
    const word = applied.keyword.trim()
    return (!word || p.name.includes(word)) &&
      (!applied.hospital || p.hospital === applied.hospital) &&
      (!applied.status || p.status === applied.status)
  })
)
const handleSearch = () => {
  Object.assign(applied, { keyword: keyword.value, hospital: filterHospital.value, status: filterStatus.value })
  page.value = 1
}
const handleReset = () => {
  keyword.value = ''
  filterHospital.value = ''
  filterStatus.value = ''
  Object.assign(applied, { keyword: '', hospital: '', status: '' })
  page.value = 1
}

// 分页
const page = ref(1)
const pageSize = ref(10)
const pagedList = computed(() =>
  filteredPackages.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)

// 上/下架
const toggleStatus = (row) => {
  row.status = row.status === '上架' ? '下架' : '上架'
  ElMessage.success(`「${row.name}」已${row.status}`)
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除服务包「${row.name}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    packages.value = packages.value.filter((p) => p.id !== row.id)
    ElMessage.success('服务包已删除')
  }).catch(() => {})
}

// 新增/编辑弹窗
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const createForm = () => ({
  id: null, name: '', status: '下架', hospital: '', dept: '', desc: '', items: []
})
const form = reactive(createForm())
const rules = {
  name: [{ required: true, message: '请输入服务包名称', trigger: 'blur' }],
  hospital: [{ required: true, message: '请选择医院', trigger: 'change' }],
  dept: [{ required: true, message: '请选择科室', trigger: 'change' }]
}
const deptOptions = computed(() => (form.hospital ? hospitalMap[form.hospital] : []))

const openAdd = () => {
  Object.assign(form, createForm())
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  Object.assign(form, JSON.parse(JSON.stringify(row)))
  isEdit.value = true
  formVisible.value = true
  formRef.value?.clearValidate()
}
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (isEdit.value) {
      const target = packages.value.find((p) => p.id === form.id)
      Object.assign(target, {
        name: form.name, status: form.status, hospital: form.hospital,
        dept: form.dept, desc: form.desc, items: form.items
      })
      ElMessage.success('服务包已更新')
    } else {
      packages.value.unshift({
        ...JSON.parse(JSON.stringify(form)),
        id: Date.now(),
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      })
      ElMessage.success('服务包已添加')
    }
    formVisible.value = false
  })
}

// 服务项目管理子弹窗（草稿模式：保存后才写回）
const itemVisible = ref(false)
const itemDraft = ref([])
const itemTarget = ref(null)
const newItem = reactive({ name: '', desc: '', price: 0 })
const resetNewItem = () => {
  newItem.name = ''
  newItem.desc = ''
  newItem.price = 0
}
const openItemManager = () => {
  itemTarget.value = null
  itemDraft.value = JSON.parse(JSON.stringify(form.items))
  resetNewItem()
  itemVisible.value = true
}
const addItem = () => {
  if (!newItem.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!newItem.desc.trim()) {
    ElMessage.warning('请输入项目说明')
    return
  }
  if (newItem.price === '' || newItem.price === null || Number(newItem.price) < 0) {
    ElMessage.warning('请输入正确的项目价格')
    return
  }
  itemDraft.value.push({
    name: newItem.name.trim(),
    desc: newItem.desc.trim(),
    price: Number(newItem.price)
  })
  newItem.name = ''
  newItem.desc = ''
  newItem.price = 0
}
const removeItem = (idx) => itemDraft.value.splice(idx, 1)
const saveItems = () => {
  const items = JSON.parse(JSON.stringify(itemDraft.value))
  if (itemTarget.value) {
    itemTarget.value.items = items
  } else {
    form.items = items
  }
  itemVisible.value = false
  ElMessage.success('服务项目已保存')
}

// 表格【项目】按钮：直接打开项目管理弹窗
const openItems = (row) => {
  itemTarget.value = row
  itemDraft.value = JSON.parse(JSON.stringify(row.items))
  resetNewItem()
  itemVisible.value = true
}
</script>
<template>
  <div class="pkg-page">
    <div class="page-header">
      <div>
        <h1>服务包管理</h1>
        <p>管理医疗服务包，支持不同医院和科室</p>
      </div>
      <el-button type="primary" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>新增服务包
      </el-button>
    </div>

    <!-- 搜索区 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="请输入服务包名称" @keyup.enter="handleSearch">
        </el-input>
        <el-select v-model="filterHospital" class="filter-select" size="large" clearable placeholder="全部医院">
          <el-option v-for="h in hospitals" :key="h" :label="h" :value="h" />
        </el-select>
        <el-select v-model="filterStatus" class="filter-select status-select" size="large" clearable placeholder="全部状态">
          <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-button type="primary" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 服务包表格 -->
    <div class="panel table-card">
      <el-table :data="pagedList" stripe>
        <el-table-column label="服务包名称" prop="name" min-width="150" />
        <el-table-column label="医院" prop="hospital" min-width="130" />
        <el-table-column label="科室" prop="dept" min-width="100" />
        <el-table-column label="服务项目数" min-width="100" align="center">
          <template #default="{ row }">{{ row.items.length }}项</template>
        </el-table-column>
        <el-table-column label="总价格" min-width="100">
          <template #default="{ row }">
            <span class="price">¥{{ totalPrice(row.items).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '上架' ? 'success' : 'info'" effect="plain" round size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" min-width="170" />
                <el-table-column label="操作" width="170" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="项目" placement="top">
              <el-button type="primary" link @click="openItems(row)"><el-icon><Box /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip :content="row.status === '上架' ? '下架' : '上架'" placement="top">
              <el-button type="primary" link @click="toggleStatus(row)"><el-icon><Bottom v-if="row.status === '上架'" /><Top v-else /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无服务包数据" :image-size="90" />
        </template>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        class="list-pager"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredPackages.length"
        layout="total, prev, pager, next, sizes"
        background
        @size-change="page = 1"
      />
    </div>

    <!-- 新增/编辑服务包弹窗 -->
    <el-dialog v-model="formVisible" :title="isEdit ? '编辑服务包' : '新增服务包'" width="640px" class="pkg-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑服务包' : '新增服务包' }}</h3>
          <p>配置服务包基本信息和所属医院科室</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="服务包名称" prop="name">
            <el-input v-model="form.name" size="large" placeholder="请输入服务包名称" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" class="full-control" size="large">
              <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="医院" prop="hospital">
            <el-select v-model="form.hospital" class="full-control" size="large" placeholder="请选择医院"
              @change="form.dept = ''">
              <el-option v-for="h in hospitals" :key="h" :label="h" :value="h" />
            </el-select>
          </el-form-item>
          <el-form-item label="科室" prop="dept">
            <el-select v-model="form.dept" class="full-control" size="large" placeholder="请选择科室"
              :disabled="!form.hospital">
              <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="服务包描述">
          <el-input v-model="form.desc" type="textarea" :rows="3" resize="none" placeholder="请输入服务包描述" />
        </el-form-item>
      </el-form>

      <!-- 服务项目列表 -->
      <div class="items-box">
        <div class="items-head">
          <span>服务项目列表</span>
          <span class="items-total" v-if="form.items.length">合计 ¥{{ totalPrice(form.items).toLocaleString() }}</span>
        </div>
        <div v-if="form.items.length" class="items-list">
          <div v-for="(item, idx) in form.items" :key="idx" class="item-row">
            <span class="item-name">
              {{ item.name }}
              <small v-if="item.desc">{{ item.desc }}</small>
            </span>
            <span class="item-price">¥{{ item.price }}</span>
          </div>
        </div>
        <el-empty v-else description='暂无服务项目，请点击"管理服务项目"添加' :image-size="64" />
      </div>

      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button size="large" @click="openItemManager">
          <el-icon><Setting /></el-icon>管理服务项目
        </el-button>
        <el-button type="primary" size="large" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 服务项目管理子弹窗 -->
    <el-dialog v-model="itemVisible" width="720px" class="pkg-dialog sub-dialog" append-to-body>
      <template #header>
        <div class="dialog-heading">
          <h3>管理服务项目</h3>
          <p>逐条编辑服务包内的服务项目和价格</p>
        </div>
      </template>

      <!-- 新增服务项目 -->
      <div class="add-card">
        <div class="add-card-title">新增服务项目</div>
        <div class="add-fields">
          <div class="add-field add-name">
            <label>项目名称 <i>*</i></label>
            <el-input v-model="newItem.name" size="large" placeholder="如：血常规"
              @keyup.enter="addItem" />
          </div>
          <div class="add-field add-desc">
            <label>项目说明 <i>*</i></label>
            <el-input v-model="newItem.desc" size="large" placeholder="如：包含白细胞、红细胞等"
              @keyup.enter="addItem" />
          </div>
          <div class="add-field add-price">
            <label>价格(元) <i>*</i></label>
            <el-input v-model.number="newItem.price" type="number" size="large" placeholder="0" />
          </div>
          <el-button type="primary" circle size="large" class="add-plus" @click="addItem">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 已添加项目 -->
      <div class="added-title">已添加的服务项目 ({{ itemDraft.length }}项)</div>
      <div class="draft-card">
        <div class="draft-list">
          <div v-for="(item, idx) in itemDraft" :key="idx" class="draft-row">
            <span class="draft-index">{{ idx + 1 }}</span>
            <span class="cell-gray">{{ item.name }}</span>
            <span class="cell-gray desc-cell">{{ item.desc || '—' }}</span>
            <span class="cell-gray price-cell">¥{{ item.price }}</span>
            <el-button type="danger" text circle @click="removeItem(idx)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-empty v-if="!itemDraft.length" description="暂无服务项目" :image-size="64" />
        </div>
        <div class="draft-total">
          <span>总价格：</span>
          <b>¥{{ totalPrice(itemDraft).toLocaleString() }}</b>
        </div>
      </div>

      <template #footer>
        <el-button size="large" @click="itemVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="saveItems">保存项目</el-button>
      </template>
    </el-dialog>

  </div>
</template>
<style scoped>
.pkg-page {
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

/* 筛选区 */
.filter-card {
  margin-top: 22px;
  padding: 20px 22px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.filter-row .el-button--primary {
  margin-left: auto;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 170px;
}

/* 表格 */
.table-card {
  margin-top: 22px;
  padding: 22px 24px;
}

.price {
  color: #16a34a;
  font-weight: 700;
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

/* 分页 */
.list-pager {
  justify-content: flex-end;
  margin-top: 18px;
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.full-control {
  width: 100%;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

/* 服务项目列表 */
.items-box {
  margin-top: 4px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  padding: 14px 18px;
}

.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.items-total {
  font-size: 13px;
  color: #16a34a;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid #f1f3f7;
  border-radius: 9px;
  background: #fbfcfe;
}

.item-row.view {
  margin-bottom: 8px;
  background: #fff;
}

.item-index {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-name {
  flex: 1;
  font-size: 13px;
  color: #374151;
}

.item-name small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
}

.item-price {
  font-size: 13px;
  font-weight: 700;
  color: #16a34a;
}

/* 管理服务项目弹窗 */
.add-card {
  padding: 16px 18px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #fbfdff;
}

.add-card-title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.add-fields {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.add-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-field label {
  font-size: 13px;
  color: #374151;
}

.add-field label i {
  font-style: normal;
  color: #ef4444;
}

.add-name {
  flex: 1;
}

.add-desc {
  flex: 1.6;
}

.add-price {
  width: 100px;
  flex-shrink: 0;
}

.add-plus {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.added-title {
  margin: 18px 2px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.draft-card {
  padding: 14px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.draft-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1.6fr) 90px 32px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  background: #f6f8fb;
  border-radius: 10px;
}

.draft-index {
  text-align: center;
  font-size: 13px;
  color: #64748b;
}

.cell-gray {
  padding: 7px 10px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #374151;
  word-break: break-all;
}

.desc-cell {
  color: #64748b;
}

.price-cell {
  text-align: right;
  font-weight: 700;
}

.draft-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eef0f4;
  font-size: 15px;
  color: #374151;
}

.draft-total b {
  color: #16a34a;
  font-size: 20px;
}

.view-total {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f1f3f7;
  text-align: right;
  font-size: 14px;
  color: #4b5563;
}

.view-total b {
  color: #16a34a;
  font-size: 16px;
}

@media (max-width: 768px) {
  .filter-row {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
.filter-card .el-button+.el-button{
  margin-left: 0;
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.pkg-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}

.el-dialog.sub-dialog {
  margin-top: 12vh !important;
}
</style>