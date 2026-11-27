<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import loginImg from '@/assets/login.png'
import {
  getAllAppLoginAgreements,
  updateAppLoginAgreementById,
  getAppLoginAgreementVersionsById
} from '../../api/index.js'

/* ============================ 列表数据 ============================ */
const loading = ref(false)
// 登录协议项（LoginAgreement）：
// id / code(USER_SERVICE 用户协议 / PRIVACY 隐私政策) / name / scene(LOGIN) /
// summary 摘要 / content 正文 / version 版本号 / enabled / updatedBy / updateTime
const agreementList = ref([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getAllAppLoginAgreements()
    agreementList.value = Array.isArray(res) ? res : res?.list || []
  } catch (e) {
    ElMessage.error(e?.message || '登录协议加载失败')
  } finally {
    loading.value = false
  }
}

// ISO 时间格式化为 YYYY-MM-DD HH:mm:ss；空值/非法值原样返回
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* ============================ 预览（含版本历史） ============================ */
const previewVisible = ref(false)
const previewRow = ref(null)
const previewTitle = ref('')
const previewContent = ref('')
const versionList = ref([])

async function onPreview(row) {
  previewRow.value = row
  previewTitle.value = row.name
  previewContent.value = row.content || '暂无正文内容'
  versionList.value = []
  previewVisible.value = true
  // 拉版本历史；失败不阻塞正文预览
  try {
    const versions = await getAppLoginAgreementVersionsById(row.id)
    versionList.value = Array.isArray(versions) ? versions : []
  } catch {
    versionList.value = []
  }
}

// 预览弹窗「编辑内容」→ 关闭预览并打开编辑
function previewToEdit() {
  const row = previewRow.value
  previewVisible.value = false
  if (row) onEdit(row)
}

/* ============================ 编辑 ============================ */
const editVisible = ref(false)
const editRef = ref()
const editForm = reactive({ id: null, name: '', summary: '', content: '', version: '' })

function onEdit(row) {
  Object.assign(editForm, {
    id: row.id,
    name: row.name,
    summary: row.summary || '',
    content: row.content || '',
    version: row.version || ''
  })
  editVisible.value = true
  editRef.value?.clearValidate()
}

const editRules = {
  name: [{ required: true, message: '请输入协议名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入协议正文', trigger: 'blur' }]
}

async function saveEdit() {
  editRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      // 编辑保存后服务端自动生成新版本号
      await updateAppLoginAgreementById(editForm.id, {
        name: editForm.name,
        summary: editForm.summary,
        content: editForm.content
      })
      ElMessage.success('协议已保存，新版本已生成')
      editVisible.value = false
      fetchList()
    } catch (e) {
      ElMessage.error(e?.message || '保存失败')
    }
  })
}

/* ============================ 停用 ============================ */

function onToggleEnabled(row) {
  ElMessage.error('用户服务协议和隐私政策均为小程序登录必填，不能停用')
}

onMounted(fetchList)
</script>

<template>
  <div class="notice-page" v-loading="loading">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h1>小程序告知书</h1>
        <p class="header-sub">配置小程序登录页需要用户勾选确认的协议与隐私内容。</p>
      </div>
      <el-tag type="success" effect="plain" round class="count-tag">
        <el-icon><Document /></el-icon>共 {{ agreementList.length }} 份登录告知书
      </el-tag>
    </div>

    <div class="notice-body">
      <!-- 左侧：协议卡片列表 -->
      <div class="notice-list">
        <div v-for="row in agreementList" :key="row.id" class="notice-card">
          <div class="card-head">
            <div class="head-left">
              <el-icon class="doc-icon"><Document /></el-icon>
              <div>
                <h3>{{ row.name }}</h3>
                <p class="card-desc">{{ row.summary || '暂无摘要' }}</p>
              </div>
            </div>
            <el-tag :type="row.enabled ? 'dark' : 'info'" round size="small">
              {{ row.enabled ? '已启用' : '已停用' }}
            </el-tag>
          </div>

          <div class="meta-row">
            <div class="meta-item">
              <span class="meta-label">使用场景</span>
              <span class="meta-value">{{ row.scene === 'LOGIN' ? '小程序登录' : row.scene || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">当前版本</span>
              <span class="meta-value">{{ row.version || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">更新时间</span>
              <span class="meta-value">{{ formatTime(row.updateTime) }}</span>
            </div>
          </div>

          <div class="card-actions">
            <el-button size="small" @click="onPreview(row)">
              <el-icon><View /></el-icon>预览
            </el-button>
            <el-button size="small" @click="onEdit(row)">
              <el-icon><EditPen /></el-icon>编辑
            </el-button>
             <el-button size="small"  @click="onToggleEnabled(row)">
              {{ row.enabled ? '停用' : '启用' }}
            </el-button>
            <el-tag size="small" type="success" effect="plain" round>登录必需</el-tag>
           
          </div>
        </div>

        <el-empty v-if="!agreementList.length && !loading" description="暂无登录协议" />
      </div>

      <!-- 右侧：小程序登录页效果预览（使用 login.png 效果图） -->
      <div class="preview-panel">
        <div class="preview-head">
          <el-icon><Document /></el-icon>
          <div>
            <h3>小程序登录页效果</h3>
            <p class="preview-sub">以下区域用于展示用户登录时的协议勾选位置和文案。</p>
          </div>
        </div>

        <div class="phone-wrap">
          <img class="login-img" :src="loginImg" alt="小程序登录页效果" />
        </div>

        <el-alert type="primary" :closable="false"  class="preview-tip">
          当前两份协议均为登录必需。修改内容会自动生成新版本；用户未勾选时，“登录 / 注册”按钮保持禁用。
        </el-alert>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" width="560px" class="notice-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ previewTitle }}</h3>
          <p>小程序登录 · {{ previewRow?.version || '-' }} · 更新于 {{ formatTime(previewRow?.updateTime) }}</p>
        </div>
      </template>
      <div class="preview-content" v-html="previewContent"></div>
      <template #footer>
        <el-button @click="previewVisible = false" class="mr-10">关闭</el-button>
        <el-button type="primary" @click="previewToEdit">
          <el-icon><EditPen /></el-icon>编辑内容
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" width="620px" class="notice-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>编辑小程序告知书</h3>
          <p>修改后将作为小程序登录页的展示内容。</p>
        </div>
      </template>
      <el-form ref="editRef" :model="editForm" :rules="editRules" label-position="top">
        <div class="form-two-col">
          <el-form-item label="告知书名称 *" prop="name">
            <el-input v-model="editForm.name" placeholder="请输入告知书名称" />
          </el-form-item>
          <el-form-item label="版本号">
            <el-input v-model="editForm.version" disabled placeholder="保存后自动升版" />
          </el-form-item>
        </div>
        <el-form-item label="摘要说明" prop="summary">
          <el-input v-model="editForm.summary" placeholder="请输入一句话摘要" />
        </el-form-item>
        <el-form-item label="正文内容 *" prop="content">
          <el-input v-model="editForm.content" type="textarea" :rows="8" placeholder="请输入协议正文" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false" class="mr-10">取消</el-button>
        <el-button type="primary" @click="saveEdit">
          <el-icon><EditPen /></el-icon>保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notice-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
  padding: 4px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}
.page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
.header-sub { margin: 8px 0 0; font-size: 13px; color: #9ca3af; }
.count-tag { font-weight: 600; }

.notice-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  align-items: stretch;
}

/* 左侧卡片 */
.notice-list { display: flex; flex-direction: column; gap: 18px;     border: 1px solid #eef0f4;
    border-radius: 14px;
    box-shadow: 0 4px 16px rgb(31 45 80 / 5%);
    background: #fff;
     padding: 22px 24px;
}
.notice-card {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
  padding: 22px 24px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.head-left { display: flex; gap: 12px; }
.doc-icon { font-size: 20px; color: #2563eb; margin-top: 2px; }
.card-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
.card-desc { margin: 6px 0 0; font-size: 13px; color: #9ca3af; }

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding: 14px 16px;
  background: #f7f8fa;
  border-radius: 10px;
}
.meta-item { display: flex; flex-direction: column; gap: 5px; }
.meta-label { font-size: 12px; color: #9ca3af; }
.meta-value { font-size: 12px;  color: #374151; }

.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  justify-content: flex-end;
}

/* 右侧预览 */
.preview-panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
}
.preview-head { display: flex; gap: 10px; }
.preview-head .el-icon { font-size: 18px; color: #2563eb; margin-top: 2px; }
.preview-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
.preview-sub { margin: 6px 0 0; font-size: 13px; color: #9ca3af; }

.phone-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin: 26px 0;
  min-height: 0;
}
.login-img {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  object-fit: contain;
  display: block;
}

.preview-tip { margin-top: 8px; border-radius: 10px; flex-shrink: 0; }

/* 弹窗 */
.dialog-heading h3 { margin: 0; font-size: 17px; font-weight: 700; }
.dialog-heading p { margin: 6px 0 0; font-size: 13px; color: #9ca3af; }
.preview-content {
  line-height: 1.9;
  font-size: 14px;
  color: #374151;
  padding: 16px 18px;
  background: #f7f8fa;
  border-radius: 12px;
}
.form-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
}
.el-button+.el-button{
  margin-left: 0;
}
@media (max-width: 1100px) {
  .notice-body { grid-template-columns: 1fr; }
}
</style>

<style>
.el-dialog.notice-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>
