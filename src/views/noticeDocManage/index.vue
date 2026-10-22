<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 统计卡片固定展示的科室
const cardDepts = ['麻醉科', '心血管科', '妇产科', '骨科', '眼科', '肿瘤科', '内科', '外科']

// 告知书模拟数据
const docs = ref([
  { id: 1, code: 'IC20240001', title: '手术麻醉知情同意书', dept: '麻醉科', filename: '手术麻醉知情同意书_v2.1.pdf', size: '2.3 MB', version: 'v2.1', date: '2024-01-15', uploader: '张医生', desc: '适用于全身麻醉、局部麻醉等各类麻醉手术前告知。' },
  { id: 2, code: 'IC20240002', title: '冠状动脉造影术知情同意书', dept: '心血管科', filename: '冠状动脉造影术知情同意书.pdf', size: '1.8 MB', version: 'v1.5', date: '2024-01-20', uploader: '李医生', desc: '说明冠脉造影检查目的、过程及造影剂相关风险。' },
  { id: 3, code: 'IC20240003', title: '剖宫产手术知情同意书', dept: '妇产科', filename: '剖宫产手术知情同意书_2024.pdf', size: '2.1 MB', version: 'v3.0', date: '2024-01-18', uploader: '王医生', desc: '告知剖宫产手术指征、术中术后风险及注意事项。' },
  { id: 4, code: 'IC20240004', title: '骨折内固定手术知情同意书', dept: '骨科', filename: '骨折内固定手术知情同意书.pdf', size: '1.5 MB', version: 'v1.2', date: '2024-01-22', uploader: '赵医生', desc: '说明内固定材料、手术风险与术后康复要求。' },
  { id: 5, code: 'IC20240005', title: '白内障超声乳化手术知情同意书', dept: '眼科', filename: '白内障超声乳化同意书.pdf', size: '1.2 MB', version: 'v2.0', date: '2024-01-25', uploader: '刘医生', desc: '告知人工晶体选择依据及手术可能并发症。' },
  { id: 6, code: 'IC20240006', title: '肿瘤化疗知情同意书', dept: '肿瘤科', filename: '肿瘤化疗知情同意书.pdf', size: '1.6 MB', version: 'v1.8', date: '2024-01-12', uploader: '周医生', desc: '说明化疗方案、不良反应及定期复查要求。' },
  { id: 7, code: 'IC20240007', title: '胃镜检查知情同意书', dept: '内科', filename: '胃镜检查知情同意书.pdf', size: '1.4 MB', version: 'v1.3', date: '2024-01-28', uploader: '吴医生', desc: '告知胃镜检查前准备及检查中可能的不适与风险。' },
  { id: 8, code: 'IC20240008', title: '阑尾切除术知情同意书', dept: '外科', filename: '阑尾切除术知情同意书.pdf', size: '1.7 MB', version: 'v2.5', date: '2024-02-01', uploader: '郑医生', desc: '说明腹腔镜与开腹手术方式选择及术后注意事项。' },
  { id: 9, code: 'IC20240009', title: '儿童疫苗接种知情同意书', dept: '儿科', filename: '儿童疫苗接种知情同意书.pdf', size: '0.9 MB', version: 'v1.0', date: '2024-01-30', uploader: '冯医生', desc: '告知接种禁忌、不良反应及留观要求。' },
  { id: 10, code: 'IC20240010', title: 'CT增强检查知情同意书', dept: '放射科', filename: 'CT增强检查知情同意书.pdf', size: '1.3 MB', version: 'v1.1', date: '2024-02-02', uploader: '韩医生', desc: '告知碘造影剂禁忌与检查后饮水要求。' },
  { id: 11, code: 'IC20240011', title: '鼻窦炎手术知情同意书', dept: '耳鼻喉科', filename: '鼻窦炎手术知情同意书.pdf', size: '1.5 MB', version: 'v1.6', date: '2024-01-16', uploader: '杨医生', desc: '说明鼻内镜手术过程及可能的并发症。' },
  { id: 12, code: 'IC20240012', title: '牙齿种植知情同意书', dept: '口腔科', filename: '牙齿种植知情同意书.pdf', size: '1.1 MB', version: 'v2.2', date: '2024-01-19', uploader: '朱医生', desc: '告知种植手术条件、周期及维护要求。' },
  { id: 13, code: 'IC20240013', title: '激光美容知情同意书', dept: '皮肤科', filename: '激光美容知情同意书.pdf', size: '1.0 MB', version: 'v1.0', date: '2024-02-03', uploader: '秦医生', desc: '告知激光治疗后护理与防晒要求。' },
  { id: 14, code: 'IC20240014', title: '脑血管造影知情同意书', dept: '神经内科', filename: '脑血管造影知情同意书.pdf', size: '1.9 MB', version: 'v1.7', date: '2024-01-14', uploader: '许医生', desc: '说明脑血管造影检查流程及相关风险。' },
  { id: 15, code: 'IC20240015', title: '急诊抢救知情同意书', dept: '急诊科', filename: '急诊抢救知情同意书_紧急版.pdf', size: '1.0 MB', version: 'v2.8', date: '2024-01-26', uploader: '何医生', desc: '适用于急危重症抢救时的紧急告知。' }
])

// 全部科室（用于下拉）
const deptOptions = computed(() => [...new Set(docs.value.map((d) => d.dept))])

// 科室统计卡片
const deptStats = computed(() =>
  cardDepts.map((dept) => ({ dept, count: docs.value.filter((d) => d.dept === dept).length }))
)

// 搜索筛选
const keyword = ref('')
const filterDept = ref('')
const filtered = computed(() =>
  docs.value.filter((d) => {
    const word = keyword.value.trim()
    const matchWord = !word || [d.title, d.dept, d.filename].some((v) => v.includes(word))
    return matchWord && (!filterDept.value || d.dept === filterDept.value)
  })
)

// 上传弹窗
const uploadVisible = ref(false)
const formRef = ref()
const uploadRef = ref()
const uploadFile = ref(null)
const createForm = () => ({ title: '', dept: '', version: '', desc: '' })
const form = reactive(createForm())
const rules = {
  title: [{ required: true, message: '请输入告知书标题', trigger: 'blur' }],
  dept: [{ required: true, message: '请选择所属科室', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }]
}

const openUpload = () => {
  Object.assign(form, createForm())
  uploadFile.value = null
  uploadVisible.value = true
  formRef.value?.clearValidate()
}

// 选择文件校验：类型 + 10MB
const onFileChange = (file) => {
  if (!/\.(pdf|docx?|png|jpe?g)$/i.test(file.name)) {
    ElMessage.error('仅支持 PDF、Word、图片格式')
    uploadRef.value?.clearFiles()
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    uploadRef.value?.clearFiles()
    return
  }
  uploadFile.value = { name: file.name, size: file.size }
}
const onFileRemove = () => {
  uploadFile.value = null
}

const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const handleUpload = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (!uploadFile.value) {
      ElMessage.warning('请先上传告知书文件')
      return
    }
    const id = Math.max(...docs.value.map((d) => d.id)) + 1
    docs.value.unshift({
      id,
      code: `IC2024${String(id).padStart(4, '0')}`,
      title: form.title,
      dept: form.dept,
      filename: uploadFile.value.name,
      size: formatSize(uploadFile.value.size),
      version: form.version,
      date: new Date().toISOString().slice(0, 10),
      uploader: '管理员',
      desc: form.desc
    })
    ElMessage.success('告知书已上传')
    uploadVisible.value = false
    uploadRef.value?.clearFiles()
  })
}

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 模拟下载
const downloadDoc = (row) => {
  const blob = new Blob([`${row.title}\n${row.filename}\n\n${row.desc || ''}`], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = row.filename.replace(/\.(pdf|docx?|png|jpe?g)$/i, '.txt')
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('开始下载')
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除告知书「${row.title}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    docs.value = docs.value.filter((d) => d.id !== row.id)
    ElMessage.success('告知书已删除')
  }).catch(() => {})
}
const { page: ndPage, pageSize: ndSize, pagedData: pagedNotices, total: ndTotal } = useTablePage(filtered)
</script>
<template>
  <div class="notice-page">
    <div class="page-header">
      <div>
        <h1>告知书管理</h1>
        <p>按科室管理医院告知书，支持上传和删减</p>
      </div>
      <el-button type="primary" class="btn-blue" size="large" @click="openUpload">
        <el-icon><Upload /></el-icon>上传告知书
      </el-button>
    </div>

    <!-- 科室统计 -->
    <div class="stats-grid">
      <div v-for="item in deptStats" :key="item.dept" class="panel stat-card">
        <strong class="stat-value">{{ item.count }}</strong>
        <span class="stat-label">{{ item.dept }}</span>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="panel filter-card">
      <el-input v-model="keyword" class="search-input" size="large" clearable
        placeholder="搜索告知书标题、科室或文件名...">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filterDept" class="filter-select" size="large" clearable placeholder="全部科室">
        <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
      </el-select>
    </div>

    <!-- 告知书列表 -->
    <div class="panel table-card">
      <el-table :data="pagedNotices" stripe>
        <el-table-column label="告知书标题" min-width="220">
          <template #default="{ row }">
            <span class="title-cell">
              <span class="serial">{{ String(row.id).padStart(3, '0') }}</span>
              <el-icon><Document /></el-icon>{{ row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="科室" min-width="110">
          <template #default="{ row }"><span class="dept-tag">{{ row.dept }}</span></template>
        </el-table-column>
        <el-table-column label="文件名" prop="filename" min-width="230" show-overflow-tooltip />
        <el-table-column label="文件大小" prop="size" min-width="100" />
        <el-table-column label="版本" min-width="80">
          <template #default="{ row }"><span class="ver-pill">{{ row.version }}</span></template>
        </el-table-column>
        <el-table-column label="上传日期" prop="date" min-width="110" />
        <el-table-column label="上传人" prop="uploader" min-width="90" />
                <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="下载" placement="top">
              <el-button type="success" link @click="downloadDoc(row)"><el-icon><Download /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的告知书" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="ndPage"
        v-model:page-size="ndSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="ndTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="ndPage = 1"
      />
    </div>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadVisible" width="600" class="notice-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>上传告知书</h3>
          <p>上传新的医院告知书文件</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="告知书标题" prop="title">
          <el-input v-model="form.title" size="large" placeholder="例如：手术麻醉知情同意书" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="所属科室" prop="dept">
            <el-select v-model="form.dept" class="full-control" size="large" placeholder="选择科室" filterable>
              <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
          <el-form-item label="版本号" prop="version">
            <el-input v-model="form.version" size="large" placeholder="例如：v1.0" />
          </el-form-item>
        </div>
        <el-form-item label="文件上传" required>
          <el-upload ref="uploadRef" drag class="upload-area" :auto-upload="false" :limit="1"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" :on-change="onFileChange" :on-remove="onFileRemove">
            <el-icon class="upload-icon"><Upload /></el-icon>
            <div class="upload-text">点击上传或拖拽文件到此处</div>
            <div class="upload-hint">支持 PDF、Word、图片格式，最大 10MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述说明">
          <el-input v-model="form.desc" type="textarea" :rows="3" resize="none"
            placeholder="简要描述告知书的用途和适用范围" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="handleUpload">确认上传</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" width="600" class="notice-dialog">
      <template #header>
        <div class="detail-heading">
          <el-icon class="detail-icon"><Document /></el-icon>
          <div>
            <h3>{{ detail?.title }}</h3>
            <p>告知书详细信息</p>
          </div>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <div class="detail-grid">
          <div>
            <div class="detail-label">编号</div>
            <div class="detail-value">{{ detail.code }}</div>
          </div>
          <div>
            <div class="detail-label">科室</div>
            <span class="dept-tag">{{ detail.dept }}</span>
          </div>
          <div>
            <div class="detail-label">版本</div>
            <div class="detail-value">{{ detail.version }}</div>
          </div>
          <div>
            <div class="detail-label">文件大小</div>
            <div class="detail-value">{{ detail.size }}</div>
          </div>
          <div>
            <div class="detail-label">上传日期</div>
            <div class="detail-value">{{ detail.date }}</div>
          </div>
          <div>
            <div class="detail-label">上传人</div>
            <div class="detail-value">{{ detail.uploader }}</div>
          </div>
        </div>
        <div class="detail-label">文件名</div>
        <div class="file-box">{{ detail.filename }}</div>
        <div class="detail-label">描述说明</div>
        <div class="desc-box">{{ detail.desc || '暂无描述' }}</div>
      </div>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="downloadDoc(detail)">
          <el-icon><Download /></el-icon>下载文件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.notice-page {
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

.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 科室统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 14px;
  margin: 22px 0;
}

.stat-card {
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(31, 45, 80, 0.1);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: #2563eb;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 200px;
}

/* 表格 */
.table-card {
  margin-top: 18px;
  padding: 20px 24px;
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

.serial {
  color: #9ca3af;
  font-size: 12px;
  font-weight: 400;
  margin-right: 2px;
}

.dept-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
}

.ver-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
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

/* 上传区域 */
.upload-area {
  width: 100%;
}

:deep(.upload-area .el-upload-dragger) {
  width: 100%;
  padding: 26px 20px;
  border-radius: 12px;
  background: #fafbfc;
}

.upload-icon {
  font-size: 38px;
  color: #9ca3af;
}

.upload-text {
  margin-top: 10px;
  font-size: 14px;
  color: #374151;
}

.upload-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

/* 详情弹窗 */
.detail-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.detail-heading h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.detail-heading p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.detail-icon {
  margin-top: 3px;
  font-size: 20px;
  color: #2563eb;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 32px;
  margin-bottom: 22px;
}

.detail-label {
  margin-bottom: 7px;
  font-size: 13px;
  color: #9ca3af;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.file-box {
  padding: 11px 14px;
  margin-bottom: 18px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  word-break: break-all;
}

.desc-box {
  padding: 14px 16px;
  background: #f0f6ff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-card {
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
.el-dialog.notice-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>
