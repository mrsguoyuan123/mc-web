<script setup>
import { computed, ref } from 'vue'
import { Warning, Location, ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import { RISK_LEVEL_TEXT, formatTime, displayText } from '../utils.js'

const props = defineProps({
  loading: { type: Boolean, default: false },
  // RiskAlert 分页列表（仅取待处理 PENDING 作为异常提醒）
  alerts: { type: Array, default: () => [] },
  // 风险统计 { pending, high, medium, low }
  summary: { type: Object, default: () => ({}) },
  // patientId -> PatientView，用于补全姓名/医院/科室
  patientMap: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['locate'])

const collapsed = ref(false)

const abnormalList = computed(() => props.alerts.filter((item) => item.level === 'HIGH'))
const attentionList = computed(() => props.alerts.filter((item) => item.level !== 'HIGH'))

const patientOf = (patientId) => props.patientMap[String(patientId)] || {}

const sourceText = (source) => {
  const map = {
    AI_CHAT: 'AI 对话',
    HEALTH_DATA: '健康数据',
    CONVERSATION_URGENT: '会话紧急',
    MANUAL: '人工上报'
  }
  return map[source] || source || '未知来源'
}

const onLocate = (patientId) => emit('locate', String(patientId))
</script>

<template>
  <el-card class="alert-panel" shadow="never">
    <div class="alert-header" @click="collapsed = !collapsed">
      <div class="alert-title">
        <el-icon class="warn-icon"><Warning /></el-icon>
        <span class="title-text">异常数据提醒</span>
        <span class="title-desc">
          共 {{ summary.pending ?? 0 }} 位用户需要优先处理，折叠后仍会在用户列表姓名旁显示风险标签。
        </span>
      </div>
      <div class="alert-actions">
        <el-tag type="danger" effect="light" size="small">{{ summary.high ?? 0 }} 异常</el-tag>
        <el-tag type="warning" effect="light" size="small">{{ (summary.medium ?? 0) + (summary.low ?? 0) }} 关注</el-tag>
        <el-icon class="collapse-icon">
          <ArrowDown v-if="!collapsed" />
          <ArrowRight v-else />
        </el-icon>
      </div>
    </div>

    <div v-show="!collapsed" v-loading="loading" class="alert-body">
      <el-empty v-if="!loading && alerts.length === 0" description="暂无待处理的异常数据提醒" :image-size="70" />
      <div v-else class="alert-grid">
        <div
          v-for="item in abnormalList"
          :key="item.id"
          class="alert-card alert-card--danger"
        >
          <div class="card-top">
            <div class="name-line">
              <span class="name">{{ displayText(patientOf(item.patientId).name) }}</span>
              <el-tag type="danger" size="small">异常</el-tag>
            </div>
            <el-button type="danger" plain size="small" @click="onLocate(item.patientId)">
              <el-icon><Location /></el-icon>定位用户
            </el-button>
          </div>
          <div class="hospital-line">
            {{ displayText(patientOf(item.patientId).hospitalName) }} /
            {{ displayText(patientOf(item.patientId).departmentName) }}
          </div>
          <div class="risk-desc">{{ item.title || RISK_LEVEL_TEXT[item.level] || '风险提醒' }}：{{ item.content || '暂无风险描述' }}</div>
          <div class="metric-tags">
            <el-tag size="small" effect="plain">{{ sourceText(item.source) }}</el-tag>
            <el-tag size="small" type="info" effect="plain">结构化指标暂无接口字段</el-tag>
          </div>
          <div class="card-time">{{ formatTime(item.createTime) }}</div>
        </div>

        <div
          v-for="item in attentionList"
          :key="item.id"
          class="alert-card alert-card--warning"
        >
          <div class="card-top">
            <div class="name-line">
              <span class="name">{{ displayText(patientOf(item.patientId).name) }}</span>
              <el-tag type="warning" size="small">关注</el-tag>
            </div>
            <el-button type="warning" plain size="small" @click="onLocate(item.patientId)">
              <el-icon><Location /></el-icon>定位用户
            </el-button>
          </div>
          <div class="hospital-line">
            {{ displayText(patientOf(item.patientId).hospitalName) }} /
            {{ displayText(patientOf(item.patientId).departmentName) }}
          </div>
          <div class="risk-desc">{{ item.title || RISK_LEVEL_TEXT[item.level] || '风险提醒' }}：{{ item.content || '暂无风险描述' }}</div>
          <div class="metric-tags">
            <el-tag size="small" effect="plain">{{ sourceText(item.source) }}</el-tag>
            <el-tag size="small" type="info" effect="plain">结构化指标暂无接口字段</el-tag>
          </div>
          <div class="card-time">{{ formatTime(item.createTime) }}</div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.alert-panel {
  border-radius: 12px;
  border: 1px solid #fecaca;
  background: #fff;
}

.alert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.alert-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.warn-icon {
  color: #ef4444;
  font-size: 18px;
}

.title-text {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.title-desc {
  font-size: 12px;
  color: #9ca3af;
}

.alert-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  color: #6b7280;
}

.alert-body {
  margin-top: 14px;
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.alert-card {
  border-radius: 10px;
  padding: 14px;
  border: 1px solid transparent;
}

.alert-card--danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.alert-card--warning {
  background: #fffbeb;
  border-color: #fde68a;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.hospital-line {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.risk-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #b91c1c;
  line-height: 1.5;
}

.alert-card--warning .risk-desc {
  color: #b45309;
}

.metric-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-time {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 1100px) {
  .alert-grid {
    grid-template-columns: 1fr;
  }
}
</style>