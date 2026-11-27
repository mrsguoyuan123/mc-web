<script setup>
import { computed, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { getCsPatientById } from '../../../api/index.js'
import {
  HEALTH_STATUS_TAG,
  MISSING_TEXT,
  healthStatusText,
  isMissing
} from '../../../utils/index.js'
import { avatarColor, maskPhone } from '../utils.js'
import BasicInfoTab from './profile/BasicInfoTab.vue'
import MedicalRecordTab from './profile/MedicalRecordTab.vue'
import HealthManageTab from './profile/HealthManageTab.vue'
import ServiceRelationTab from './profile/ServiceRelationTab.vue'
import CommunicationTab from './profile/CommunicationTab.vue'
import AttachmentTab from './profile/AttachmentTab.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  patientId: { type: [String, Number], default: '' },
  // 列表行数据，用于打开瞬间渲染头部；详情接口返回后补全
  patient: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const detail = ref(null)
const loading = ref(false)
const activeTab = ref('basic')
// 页签懒加载：首次激活才渲染并取数，关闭抽屉后清空
const loadedTabs = ref(['basic'])

const tabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'medical', label: '医疗档案' },
  { key: 'health', label: '健康管理' },
  { key: 'relation', label: '服务关系' },
  { key: 'communication', label: '沟通记录' },
  { key: 'attachment', label: '附件资料' }
]

const summary = computed(() => detail.value || props.patient || {})

const fetchDetail = async () => {
  if (!props.patientId) return
  loading.value = true
  try {
    detail.value = await getCsPatientById(String(props.patientId))
  } catch {
    // 详情失败时保留列表行数据，页签内各自有错误兜底
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      activeTab.value = 'basic'
      loadedTabs.value = ['basic']
      fetchDetail()
    } else {
      // 关闭清缓存，避免下次打开串号
      detail.value = null
      activeTab.value = 'basic'
      loadedTabs.value = ['basic']
    }
  }
)

const closeDrawer = () => emit('update:modelValue', false)

const handleTabChange = (key) => {
  if (!loadedTabs.value.includes(key)) loadedTabs.value.push(key)
}

const genderAge = computed(() => {
  const gender = isMissing(summary.value.gender) ? '-' : summary.value.gender
  const age = isMissing(summary.value.age) ? '-' : `${summary.value.age}岁`
  return `${gender} / ${age}`
})
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="88%"
    :with-header="false"
    class="profile-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="drawer-shell">
      <header class="drawer-header">
        <div class="header-main">
          <div class="title-row">
            <h3>用户完整资料</h3>
            <el-tag size="small" type="primary" effect="plain">数据来源：用户管理仓</el-tag>
          </div>
          <!-- 接口未提供：Patient/CsPatientDetail 均无用户编号字段，待后端补 patientCode -->
          <p class="title-sub">
            {{ isMissing(summary.name) ? MISSING_TEXT : summary.name }}
            · 用户编号
            <span class="missing">{{ MISSING_TEXT }}</span>
          </p>
        </div>
        <div class="header-actions">
          <el-button @click="closeDrawer">返回聊天</el-button>
          <button type="button" class="close-btn" aria-label="关闭" @click="closeDrawer">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </header>

      <div v-loading="loading" class="summary-bar">
        <div class="summary-left">
          <span class="avatar" :style="{ background: avatarColor(summary.name) }">
            {{ isMissing(summary.name) ? '?' : String(summary.name).slice(0, 1) }}
          </span>
          <div class="summary-user">
            <strong :class="{ missing: isMissing(summary.name) }">
              {{ isMissing(summary.name) ? MISSING_TEXT : summary.name }}
            </strong>
            <span class="sub-line">{{ genderAge }}</span>
            <span class="sub-line">
              {{ isMissing(summary.phone) ? MISSING_TEXT : maskPhone(summary.phone) }}
            </span>
          </div>
        </div>

        <div class="summary-block">
          <label>医院</label>
          <p :class="{ missing: isMissing(summary.hospitalName) }">
            {{ isMissing(summary.hospitalName) ? MISSING_TEXT : summary.hospitalName }}
          </p>
        </div>
        <div class="summary-block">
          <!-- 接口未提供：CsPatientDetail 仅回传 departmentId，无科室名称 -->
          <label>科室</label>
          <p class="missing">{{ MISSING_TEXT }}</p>
        </div>
        <div class="summary-block">
          <label>健康状态</label>
          <el-tag
            v-if="!isMissing(summary.healthStatus)"
            size="small"
            :type="HEALTH_STATUS_TAG[summary.healthStatus] || 'info'"
          >
            {{ healthStatusText(summary.healthStatus) }}
          </el-tag>
          <p v-else class="missing">{{ MISSING_TEXT }}</p>
        </div>

        <div class="summary-status">
          <label>当前服务状态</label>
          <!-- 接口未提供：服务状态枚举未在 CsPatientDetail 下发 -->
          <p class="missing">{{ MISSING_TEXT }}</p>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="drawer-tabs" @tab-change="handleTabChange">
        <el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key" :label="tab.label">
          <BasicInfoTab v-if="loadedTabs.includes('basic') && tab.key === 'basic'" :patient-id="patientId" />
          <MedicalRecordTab v-if="loadedTabs.includes('medical') && tab.key === 'medical'" :patient-id="patientId" />
          <HealthManageTab v-if="loadedTabs.includes('health') && tab.key === 'health'" :patient-id="patientId" />
          <ServiceRelationTab v-if="loadedTabs.includes('relation') && tab.key === 'relation'" :patient-id="patientId" />
          <CommunicationTab v-if="loadedTabs.includes('communication') && tab.key === 'communication'" :patient-id="patientId" />
          <AttachmentTab v-if="loadedTabs.includes('attachment') && tab.key === 'attachment'" :patient-id="patientId" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 28px 16px;
  background: #fff;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.title-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1f2937;
}

.summary-bar {
  display: flex;
  align-items: center;
  gap: 48px;
  margin: 16px 28px 0;
  padding: 18px 24px;
  border: 1px solid #edf1f7;
  border-radius: 14px;
  background: #fff;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.summary-user {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-user strong {
  font-size: 16px;
  color: #1f2937;
}

.sub-line {
  font-size: 12px;
  color: #94a3b8;
}

.summary-block,
.summary-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-block label,
.summary-status label {
  font-size: 12px;
  color: #94a3b8;
}

.summary-block p,
.summary-status p {
  margin: 0;
  font-size: 13px;
  color: #1f2937;
}

.summary-status {
  margin-left: auto;
  align-items: flex-end;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.drawer-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 16px 28px 28px;
  padding: 0 20px 20px;
  border-radius: 14px;
  background: #fff;
}

.drawer-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.drawer-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.drawer-tabs :deep(.el-tab-pane) {
  min-height: 300px;
}

.drawer-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
<style>
.profile-drawer .el-drawer__body {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
