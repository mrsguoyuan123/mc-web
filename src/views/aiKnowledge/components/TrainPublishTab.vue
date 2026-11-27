<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKbTrainPreview,
  startKbTrain,
  getKbTrainJobById,
  getKbVersions,
  publishKbVersionById,
  rollbackKbVersion
} from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing } from '@/utils/index.js'

/* ---------------- 待训练统计（G8） ---------------- */

const preview = ref(null)
const previewMissing = ref(false)
const previewLoading = ref(false)

const fetchPreview = async () => {
  previewLoading.value = true
  try {
    const res = await getKbTrainPreview()
    preview.value = res
    // 两个统计字段都缺失才算缺口，禁用训练按钮
    previewMissing.value = isMissing(res?.pendingQaCount) && isMissing(res?.pendingDocCount)
  } catch {
    preview.value = null
    previewMissing.value = true
  } finally {
    previewLoading.value = false
  }
}

/* ---------------- 训练与轮询 ---------------- */

const training = ref(false)
const progress = ref(0)
const trainMessage = ref('')
let pollTimer = null
let alive = true

const clearPoll = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const stopPolling = () => {
  clearPoll()
  training.value = false
}

const pollJob = async (jobId) => {
  try {
    const job = await getKbTrainJobById(jobId)
    progress.value = Number(job.progress) || 0
    if (job.message) trainMessage.value = job.message
    if (job.status === 'PENDING' || job.status === 'RUNNING') {
      if (alive) pollTimer = setTimeout(() => pollJob(jobId), 2000)
    } else if (job.status === 'COMPLETED') {
      stopPolling()
      ElMessage.success('训练完成，已生成新版本')
      fetchVersions()
      fetchPreview()
    } else {
      stopPolling()
      ElMessage.error(job.message || '训练失败')
    }
  } catch (err) {
    stopPolling()
    ElMessage.error(err?.message || '训练状态查询失败')
  }
}

const handleTrain = async () => {
  if (training.value || previewMissing.value) return
  training.value = true
  progress.value = 0
  trainMessage.value = ''
  try {
    const res = await startKbTrain()
    if (res?.placeholder === true) {
      ElMessage.warning('当前为占位能力，未实际生效')
    }
    if (res?.jobId) {
      pollJob(String(res.jobId))
    } else {
      stopPolling()
      fetchVersions()
      fetchPreview()
    }
  } catch (err) {
    stopPolling()
    ElMessage.error(err?.message || '训练启动失败')
  }
}

/* ---------------- 版本历史 ---------------- */

const versions = ref([])
const versionsLoading = ref(false)

const VERSION_STATUS_TEXT = {
  TRAINING: '训练中',
  COMPLETED: '已完成',
  PUBLISHED: '已发布',
  ROLLED_BACK: '已回滚'
}

const fetchVersions = async () => {
  versionsLoading.value = true
  try {
    const res = await getKbVersions()
    const list = Array.isArray(res) ? res : []
    // publishedAt 倒序，空值排后
    versions.value = list
      .slice()
      .sort((a, b) => {
        if (isMissing(a.publishedAt) && isMissing(b.publishedAt)) return 0
        if (isMissing(a.publishedAt)) return 1
        if (isMissing(b.publishedAt)) return -1
        return String(b.publishedAt).localeCompare(String(a.publishedAt))
      })
  } catch {
    versions.value = []
  } finally {
    versionsLoading.value = false
  }
}

// 当前线上版本：PUBLISHED 且发布时间最新
const currentVersionId = computed(() => {
  const published = versions.value
    .filter((item) => item.status === 'PUBLISHED' && !isMissing(item.publishedAt))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  return published.length ? String(published[0].id) : ''
})

const versionTime = (row) => {
  const time = !isMissing(row.publishedAt) ? row.publishedAt : row.trainedAt
  return formatTime(time)
}

const handlePublish = (row) => {
  ElMessageBox.confirm(
    '发布后该版本立即生效，当前线上的知识版本会被替换。',
    `发布 ${row.version || MISSING_TEXT} 到智能客服？`,
    { confirmButtonText: '确认发布', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await publishKbVersionById(String(row.id))
        ElMessage.success('已发布')
        fetchVersions()
      } catch (err) {
        ElMessage.error(err?.message || '发布失败')
      }
    })
    .catch(() => {})
}

/* ---------------- 回滚 ---------------- */

// 目标 = 列表中当前发布版本之后（更旧方向）第一个 COMPLETED / ROLLED_BACK 版本
const rollbackTarget = computed(() => {
  if (!currentVersionId.value) return null
  const index = versions.value.findIndex((item) => String(item.id) === currentVersionId.value)
  if (index < 0) return null
  return (
    versions.value
      .slice(index + 1)
      .find((item) => item.status === 'COMPLETED' || item.status === 'ROLLED_BACK') || null
  )
})

const handleRollback = () => {
  const target = rollbackTarget.value
  if (!target) return
  ElMessageBox.confirm(
    '回滚后当前线上版本将被替换。',
    `回滚到 ${target.version || MISSING_TEXT}？`,
    { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await rollbackKbVersion({ versionId: String(target.id) })
        ElMessage.success('已回滚')
        fetchVersions()
      } catch (err) {
        ElMessage.error(err?.message || '回滚失败')
      }
    })
    .catch(() => {})
}

onMounted(() => {
  fetchPreview()
  fetchVersions()
})

onBeforeUnmount(() => {
  alive = false
  clearPoll()
})
</script>

<template>
  <div class="train-tab">
    <!-- 待训练区 -->
    <div class="panel pending-panel">
      <div class="section-head">
        <h3 class="section-title">训练与发布</h3>
        <p class="section-subtitle">把草稿和最新改动重新训练成新版本，再发布到智能客服。</p>
      </div>
      <div class="pending-body">
        <div class="pending-info">
          <span class="pending-label">当前待训练知识</span>
          <template v-if="previewMissing">
            <strong class="missing missing-num">{{ MISSING_TEXT }}</strong>
            <span class="pending-hint">后端待补 GET /kb/train/preview</span>
          </template>
          <template v-else>
            <strong class="pending-num">
              {{ Number(preview?.pendingQaCount) || 0 }} 条问答 ·
              {{ Number(preview?.pendingDocCount) || 0 }} 份文档
            </strong>
          </template>
        </div>
        <el-button
          type="primary"
          size="large"
          :disabled="previewMissing || training || previewLoading"
          :loading="training"
          @click="handleTrain"
        >
          开始训练
        </el-button>
      </div>

      <!-- 训练进度：progress 只来自接口，不做假动画 -->
      <div v-if="training || progress > 0" class="progress-box">
        <div class="progress-head">
          <span class="progress-label">训练中 {{ progress }}%</span>
          <span v-if="trainMessage" class="progress-message">{{ trainMessage }}</span>
        </div>
        <el-progress :percentage="progress" :show-text="false" :stroke-width="10" />
      </div>
    </div>

    <!-- 版本历史 -->
    <div class="panel version-panel" v-loading="versionsLoading">
      <div class="section-head">
        <h3 class="section-title">版本历史</h3>
        <p class="section-subtitle">发布后立即生效，可回滚到历史版本</p>
      </div>

      <div v-for="row in versions" :key="String(row.id)" class="version-row">
        <div class="version-icon">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="version-main">
          <div class="version-title">
            {{ row.version || MISSING_TEXT }} ·
            {{ isMissing(row.qaCount) ? MISSING_TEXT : `${Number(row.qaCount)} 条知识` }}
            · {{ versionTime(row) }}
          </div>
          <div class="version-status">{{ VERSION_STATUS_TEXT[row.status] || row.status || MISSING_TEXT }}</div>
        </div>
        <div class="version-action">
          <el-tag v-if="String(row.id) === currentVersionId" type="success" size="small" effect="light">
            当前发布版本
          </el-tag>
          <el-button
            v-else-if="row.status === 'COMPLETED'"
            type="primary"
            link
            @click="handlePublish(row)"
          >
            发布此版本
          </el-button>
        </div>
      </div>
      <el-empty v-if="!versionsLoading && !versions.length" description="暂无版本记录" :image-size="90" />

      <div class="rollback-row">
        <el-button :disabled="!rollbackTarget" @click="handleRollback">回滚到上一版本</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.section-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.pending-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 22px 24px;
  border-radius: 10px;
  background: #f8fafc;
}

.pending-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-label {
  font-size: 13px;
  color: #6b7280;
}

.pending-num {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
}

.missing-num {
  font-size: 22px;
}

.missing {
  color: #f56c6c;
}

.pending-hint {
  font-size: 12px;
  color: #9ca3af;
}

.progress-box {
  margin-top: 18px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
}

.progress-message {
  font-size: 12px;
  color: #9ca3af;
}

.version-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  margin-bottom: 12px;
}

.version-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  flex-shrink: 0;
}

.version-main {
  flex: 1;
  min-width: 0;
}

.version-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.version-status {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.version-action {
  flex-shrink: 0;
}

.rollback-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
