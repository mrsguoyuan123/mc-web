<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 展示位置 / 科室
const positionOptions = ['首页公告栏', '小程序公告', '医生端公告', '弹窗公告']
const deptOptions = ['麻醉科', '心内科', '妇产科', '骨科', '眼科', '肿瘤科', '消化内科', '普外科', '儿科', '放射科']

// 公告模拟数据
const announcements = ref([
  { id: 1, sort: 1, title: '手术麻醉知情同意书', dept: '麻醉科', position: '首页公告栏', date: '2026-01-15', enabled: true, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800', content: '本告知书适用于各类需要麻醉的手术。麻醉是手术过程中不可缺少的重要环节，包括全身麻醉、椎管内麻醉、神经阻滞等多种方式。麻醉前请您仔细阅读本告知书，了解麻醉相关风险及注意事项。' },
  { id: 2, sort: 2, title: '冠状动脉造影检查告知书', dept: '心内科', position: '小程序公告', date: '2026-01-20', enabled: true, image: 'https://picsum.photos/seed/cardio/800/420', content: '冠状动脉造影是诊断冠心病的常用检查方法，通过导管向冠状动脉注入造影剂，明确血管狭窄部位与程度。检查前需完成过敏试验并禁食禁水。' },
  { id: 3, sort: 3, title: '剖宫产手术知情同意书', dept: '妇产科', position: '首页公告栏', date: '2026-01-18', enabled: true, image: 'https://picsum.photos/seed/baby/800/420', content: '剖宫产为经腹切开子宫取出胎儿的手术，医生将向您说明手术指征、术中术后可能出现的风险与并发症，请您及家属充分了解后签署。' },
  { id: 4, sort: 4, title: '骨折内固定手术知情书', dept: '骨科', position: '医生端公告', date: '2026-01-22', enabled: true, image: 'https://picsum.photos/seed/bone/800/420', content: '骨折切开复位内固定术使用钢板、螺钉等固定骨折端，术后可能出现感染、内固定松动、骨折延迟愈合等情况，需按医嘱复查与康复训练。' },
  { id: 5, sort: 5, title: '白内障手术知情同意书', dept: '眼科', position: '小程序公告', date: '2026-01-25', enabled: true, image: 'https://picsum.photos/seed/eye/800/420', content: '白内障超声乳化联合人工晶体植入术可恢复视力，术中术后存在出血、感染、后囊破裂等风险，术后需按时滴药并定期复查。' },
  { id: 6, sort: 6, title: '肿瘤化疗知情同意书', dept: '肿瘤科', position: '医生端公告', date: '2026-01-12', enabled: true, image: 'https://picsum.photos/seed/tumor/800/420', content: '化疗药物在杀伤肿瘤细胞的同时可能引起恶心呕吐、骨髓抑制、脱发等不良反应，治疗期间请遵医嘱复查血常规及肝肾功能。' },
  { id: 7, sort: 7, title: '胃镜检查知情同意书', dept: '消化内科', position: '小程序公告', date: '2026-01-28', enabled: false, image: 'https://picsum.photos/seed/gastro/800/420', content: '电子胃镜检查可直接观察食管、胃、十二指肠黏膜病变，必要时取活检。检查前需空腹 6 小时以上，检查后 2 小时方可进食。' },
  { id: 8, sort: 8, title: '阑尾切除术知情同意书', dept: '普外科', position: '弹窗公告', date: '2026-02-01', enabled: true, image: 'https://picsum.photos/seed/append/800/420', content: '阑尾切除术是治疗急性阑尾炎的主要方式，可选择腹腔镜或开腹手术，术后需注意早期下床活动，预防肠粘连。' },
  { id: 9, sort: 9, title: '儿童疫苗接种告知书', dept: '儿科', position: '首页公告栏', date: '2026-01-30', enabled: true, image: 'https://picsum.photos/seed/vaccine/800/420', content: '接种疫苗前请如实告知儿童近期健康状况与过敏史，接种后留观 30 分钟。接种当天多饮水、注意休息，出现持续高热请及时就医。' },
  { id: 10, sort: 10, title: 'CT增强检查告知书', dept: '放射科', position: '弹窗公告', date: '2026-02-02', enabled: true, image: 'https://picsum.photos/seed/ctscan/800/420', content: 'CT 增强检查需静脉注射碘造影剂，有碘过敏史、严重甲亢及肾功能不全者请提前告知医生，检查后多饮水以促进造影剂排泄。' }
])

// 顶部统计
const stats = computed(() => [
  { label: '总公告数', value: announcements.value.length, tone: '#2563eb' },
  { label: '已启用', value: announcements.value.filter((a) => a.enabled).length, tone: '#16a34a' },
  { label: '首页展示', value: announcements.value.filter((a) => a.position === '首页公告栏').length, tone: '#7c3aed' },
  { label: '小程序展示', value: announcements.value.filter((a) => a.position === '小程序公告').length, tone: '#d97706' },
  { label: '医生端展示', value: announcements.value.filter((a) => a.position === '医生端公告').length, tone: '#dc2626' }
])

// 筛选
const keyword = ref('')
const filterPosition = ref('')
const filterDept = ref('')
const filtered = computed(() =>
  announcements.value.filter((a) => {
    const word = keyword.value.trim()
    const matchWord = !word || [a.title, a.content, a.dept].some((v) => v.includes(word))
    return matchWord && (!filterPosition.value || a.position === filterPosition.value)
      && (!filterDept.value || a.dept === filterDept.value)
  })
)

// 拖拽 / 上下移动排序
const dragId = ref(-1)
const overId = ref(-1)

const reorder = (fromId, toId) => {
  const arr = announcements.value
  const from = arr.findIndex((a) => a.id === fromId)
  const to = arr.findIndex((a) => a.id === toId)
  if (from < 0 || to < 0 || from === to) return
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  arr.forEach((a, i) => (a.sort = i + 1))
}

const onDragStart = (id, e) => {
  dragId.value = id
  e.dataTransfer.effectAllowed = 'move'
}
const onDragOver = (e) => {
  const tr = e.target.closest('.el-table__row')
  overId.value = tr ? filtered.value[[...tr.parentElement.querySelectorAll('.el-table__row')].indexOf(tr)]?.id : -1
}
const onDrop = (e) => {
  if (dragId.value > 0 && overId.value > 0) reorder(dragId.value, overId.value)
  dragId.value = overId.value = -1
}
const onDragEnd = () => {
  dragId.value = overId.value = -1
}
const move = (row, dir) => {
  const idx = filtered.value.findIndex((a) => a.id === row.id)
  const target = filtered.value[idx + dir]
  if (target) reorder(row.id, target.id)
}
const rowClass = ({ row }) => [
  dragId.value === row.id ? 'is-dragging' : '',
  overId.value === row.id && dragId.value !== row.id ? 'is-over' : ''
].join(' ')

// 新增 / 编辑弹窗
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const createForm = () => ({ id: null, title: '', position: '', dept: '', content: '', date: '', image: '', enabled: true })
const form = reactive(createForm())
const rules = {
  title: [{ required: true, message: '请输入告知书标题', trigger: 'blur' }],
  position: [{ required: true, message: '请选择展示位置', trigger: 'change' }],
  dept: [{ required: true, message: '请选择所属科室', trigger: 'change' }],
  content: [{ required: true, message: '请输入告知书内容', trigger: 'blur' }],
  date: [{ required: true, message: '请选择发布日期', trigger: 'change' }]
}

const openAdd = () => {
  Object.assign(form, createForm(), { date: new Date().toISOString().slice(0, 10) })
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  Object.assign(form, JSON.parse(JSON.stringify(row)))
  isEdit.value = true
  detailVisible.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (form.id) {
      Object.assign(announcements.value.find((a) => a.id === form.id), JSON.parse(JSON.stringify(form)))
      ElMessage.success('公告已更新')
    } else {
      announcements.value.unshift({ ...JSON.parse(JSON.stringify(form)), id: Date.now() })
      announcements.value.forEach((a, i) => (a.sort = i + 1))
      ElMessage.success('公告已发布')
    }
    formVisible.value = false
  })
}

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除公告「${row.title}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    announcements.value = announcements.value.filter((a) => a.id !== row.id)
    announcements.value.forEach((a, i) => (a.sort = i + 1))
    ElMessage.success('公告已删除')
  }).catch(() => {})
}
const { page: amPage, pageSize: amSize, pagedData: pagedAnnounces, total: amTotal } = useTablePage(filtered)
</script>
<template>
  <div class="ann-page">
    <div class="page-header">
      <div>
        <h1>公告管理</h1>
        <p>管理告知书公告的展示位置和排序</p>
      </div>
      <el-button type="primary" class="btn-blue" size="large" @click="openAdd">
        <el-icon><Plus /></el-icon>新增公告
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <strong class="stat-value" :style="{ color: item.tone }">{{ item.value }}</strong>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 筛选区 -->
    <div class="panel filter-card">
      <div class="filter-row">
        <el-input v-model="keyword" class="search-input" size="large" clearable
          placeholder="搜索告知书标题、内容或科室...">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterPosition" class="filter-select" size="large" clearable placeholder="全部展示位置">
          <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
        </el-select>
        <el-select v-model="filterDept" class="filter-select" size="large" clearable placeholder="全部科室">
          <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
        </el-select>
      </div>
    </div>

    <!-- 公告列表 -->
    <div class="panel table-card">
      <div class="table-head">
        <h3>公告列表</h3>
        <span class="head-sub">共 {{ filtered.length }} 条，拖动排序列可调整顺序</span>
      </div>
      <div @dragover.prevent="onDragOver" @drop="onDrop">
        <el-table :data="pagedAnnounces" row-key="id" :row-class-name="rowClass" stripe>
          <el-table-column label="排序" width="86" align="center">
            <template #default="{ row, $index }">
              <div class="sort-cell" draggable="true" @dragstart="onDragStart(row.id, $event)" @dragend="onDragEnd">
                <el-icon class="sort-arrow" :class="{ disabled: $index === 0 }" @click="move(row, -1)"><Top /></el-icon>
                <el-icon class="sort-arrow" :class="{ disabled: $index === filtered.length - 1 }" @click="move(row, 1)"><Bottom /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="告知书标题" prop="title" min-width="220">
            <template #default="{ row }">
              <span class="title-cell"><el-icon><Document /></el-icon>{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="科室" min-width="110">
            <template #default="{ row }"><span class="dept-tag">{{ row.dept }}</span></template>
          </el-table-column>
          <el-table-column label="展示位置" min-width="120">
            <template #default="{ row }"><span class="pos-tag">{{ row.position }}</span></template>
          </el-table-column>
          <el-table-column label="发布日期" prop="date" min-width="120" />
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
                  <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
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
            <el-empty description="暂无符合条件的公告" :image-size="90" />
          </template>
        </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="amPage"
        v-model:page-size="amSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="amTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="amPage = 1"
      />
      </div>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="formVisible" :width="640" class="ann-dialog"
      :title="isEdit ? '编辑公告' : '新增公告'">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="告知书标题" prop="title">
          <el-input v-model="form.title" size="large" placeholder="请输入告知书标题" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="展示位置" prop="position">
            <el-select v-model="form.position" class="full-control" size="large" placeholder="请选择展示位置">
              <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item label="所属科室" prop="dept">
            <el-select v-model="form.dept" class="full-control" size="large" placeholder="请选择所属科室">
              <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="告知书内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" resize="none"
            placeholder="请输入告知书内容" />
        </el-form-item>
        <el-form-item label="发布日期" prop="date">
          <el-date-picker v-model="form.date" type="date" class="full-control" size="large"
            value-format="YYYY-MM-DD" placeholder="请选择发布日期" />
        </el-form-item>
        <el-form-item label="配图链接（选填）">
          <el-input v-model="form.image" size="large" placeholder="https://..." />
        </el-form-item>
        <el-image v-if="form.image" :src="form.image" fit="cover" class="form-preview">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <el-form-item>
          <el-switch v-model="form.enabled" active-text="启用状态" inactive-text="" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认发布' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :width="680" class="ann-dialog detail-dialog" show-close>
      <template #header>
        <div class="detail-heading">
          <el-icon class="detail-icon"><Document /></el-icon>
          <span>{{ detail?.title }}</span>
        </div>
      </template>
      <div v-if="detail" class="detail-body">
        <el-image v-if="detail.image" :src="detail.image" fit="cover" class="detail-image">
          <template #error><div class="img-fallback">图片加载失败</div></template>
        </el-image>
        <div class="detail-grid">
          <div>
            <div class="detail-label">科室</div>
            <div class="detail-value">{{ detail.dept }}</div>
          </div>
          <div>
            <div class="detail-label">展示位置</div>
            <div class="detail-value">{{ detail.position }}</div>
          </div>
          <div>
            <div class="detail-label">发布日期</div>
            <div class="detail-value">{{ detail.date }}</div>
          </div>
          <div>
            <div class="detail-label">状态</div>
            <span class="status-tag" :class="detail.enabled ? 'on' : 'off'">
              {{ detail.enabled ? '已启用' : '已停用' }}
            </span>
          </div>
        </div>
        <div class="detail-label">告知书内容</div>
        <div class="detail-content">{{ detail.content }}</div>
      </div>
      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="openEdit(detail)">编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.ann-page {
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

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 蓝色主按钮 */
.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin: 22px 0;
}

.stat-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(31, 45, 80, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

/* 筛选区 */
.filter-card {
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
  width: 180px;
}

/* 表格 */
.table-card {
  margin-top: 22px;
  padding: 22px 24px;
}

.table-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.table-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.head-sub {
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

.title-cell {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #2563eb;
  font-weight: 500;
}

.dept-tag,
.pos-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.dept-tag {
  background: #f3f4f6;
  color: #4b5563;
}

.pos-tag {
  background: #eff6ff;
  color: #2563eb;
}

/* 排序操作 */
.sort-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: move;
  color: #6b7280;
  user-select: none;
}

.sort-arrow {
  font-size: 14px;
  transition: color 0.15s ease;
}

.sort-arrow:hover {
  color: #2563eb;
}

.sort-arrow.disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

:deep(.el-table__row.is-dragging) {
  opacity: 0.45;
}

:deep(.el-table__row.is-over td.el-table__cell) {
  background: #eff6ff;
}

/* 表单 */
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

.form-preview,
.detail-image {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 18px;
  background: #f3f4f6;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 13px;
  color: #9ca3af;
  background: #f3f4f6;
}

/* 详情弹窗 */
.detail-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 700;
}

.detail-icon {
  color: #2563eb;
  font-size: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 32px;
  margin: 22px 0 24px;
}

.detail-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #9ca3af;
}

.detail-value {
  font-size: 15px;
  font-weight: 500;
  color: #1f2937;
}

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag.on {
  background: rgba(220,252,231,0.5);
  color: #16a34a;
}

.status-tag.off {
  background: rgba(243,244,246,0.5);
  color: #6b7280;
}

.detail-content {
  padding: 18px 20px;
  background: #f0f6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.8;
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

  .filter-row {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .form-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.ann-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>
