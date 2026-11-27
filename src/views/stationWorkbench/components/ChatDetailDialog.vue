<script setup>
import { computed, ref, watch } from 'vue'
import { getCaregiverMessagesById, getPatientById } from '../../../api/index.js'
import { MISSING_TEXT, formatTime, isMissing, safeParseJson } from '@/utils/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 列表行数据：弹窗头部优先用它渲染，避免打开时额外请求（M-G4）
  conversation: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const messages = ref([])
// 患者兜底快照：仅当列表行缺姓名等关键信息时，弹窗打开后请求一次 getPatientById
const patientFallback = ref(null)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const close = () => {
  visible.value = false
}

/* ---------------- 头部信息（优先列表行，缺失再用兜底快照） ---------------- */

const head = computed(() => ({ ...(patientFallback.value || {}), ...(props.conversation || {}) }))

const avatarText = computed(() => {
  const name = head.value.patientName || head.value.name
  return name ? String(name).slice(0, 1) : '患'
})

const nameText = computed(() => {
  const name = head.value.patientName || head.value.name
  return isMissing(name) ? MISSING_TEXT : name
})

const genderAgeText = computed(() => {
  const parts = []
  if (!isMissing(head.value.gender)) parts.push(String(head.value.gender))
  if (!isMissing(head.value.age)) parts.push(`${head.value.age}岁`)
  return parts.join('/')
})

const hospitalText = computed(() =>
  isMissing(head.value.hospitalName) ? MISSING_TEXT : head.value.hospitalName
)

const departmentText = computed(() =>
  isMissing(head.value.departmentName) ? MISSING_TEXT : head.value.departmentName
)

const headTags = computed(() => {
  const raw = head.value.tags || head.value.tagsJson
  const parsed = safeParseJson(raw, null)
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(raw)
      ? raw
      : isMissing(raw)
        ? []
        : String(raw)
            .split(/[，,、]/)
            .map((item) => item.trim())
            .filter(Boolean)
  return list.slice(0, 3)
})

const consultTimeText = computed(() => {
  const time = head.value.createTime || head.value.lastMessageAt || head.value.updateTime
  return formatTime(time, true)
})

const messageCountText = computed(() => {
  const count = head.value.messageCount
  if (isMissing(count)) return MISSING_TEXT
  return Number(count) === 0 ? '暂无消息' : `共 ${Number(count)} 条消息`
})

/* ---------------- 消息角色枚举（未知值灰标 + 原文，不猜） ---------------- */

const ROLE_META = {
  AI: { label: 'AI助手', theme: 'purple', side: 'left' },
  AI_ASSISTANT: { label: 'AI助手', theme: 'purple', side: 'left' },
  CS: { label: '客服', theme: 'green', side: 'left' },
  CS_SERVICE: { label: '客服', theme: 'green', side: 'left' },
  CAREGIVER: { label: '驻点', theme: 'green', side: 'left' },
  DOCTOR: { label: '医生', theme: 'purple', side: 'left' },
  USER: { label: '用户', theme: 'blue', side: 'right' },
  PATIENT: { label: '用户', theme: 'blue', side: 'right' },
  SYSTEM: { label: '系统', theme: 'gray', side: 'center' }
}

const roleMetaOf = (senderType) =>
  ROLE_META[senderType] || {
    label: isMissing(senderType) ? '未知角色' : String(senderType),
    theme: 'gray',
    side: 'left'
  }

const roleLabel = (msg) => roleMetaOf(msg?.senderType).label
const roleTheme = (msg) => roleMetaOf(msg?.senderType).theme
const sideOf = (msg) => roleMetaOf(msg?.senderType).side

const senderAvatarText = (msg) => {
  if (!isMissing(msg?.senderName)) return String(msg.senderName).slice(0, 1)
  return roleLabel(msg).slice(0, 1)
}

// 简单 markdown 粗体（**xx**）渲染；先转义 HTML，不解析图片链接
const renderContent = (content) => {
  if (isMissing(content)) return ''
  const escaped = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

// 接口按时间倒序返回，弹窗统一正序展示
const sortedMessages = computed(() =>
  [...messages.value].sort((a, b) => {
    const ta = Date.parse(a?.createTime || 0)
    const tb = Date.parse(b?.createTime || 0)
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return ta - tb
  })
)

const fetchMessages = async () => {
  const conversationId = props.conversation?.conversationId
  if (isMissing(conversationId)) {
    messages.value = []
    return
  }
  loading.value = true
  try {
    const res = await getCaregiverMessagesById(String(conversationId), { size: 100 })
    messages.value = Array.isArray(res) ? res : Array.isArray(res?.list) ? res.list : []
  } catch {
    messages.value = []
  } finally {
    loading.value = false
  }
}

// M-G4：列表行连姓名都缺失时才兜底请求一次患者资料
const fetchPatientFallback = async () => {
  const row = props.conversation
  const patientId = row?.patientId
  const nameMissing = isMissing(row?.patientName) && isMissing(row?.name)
  if (!nameMissing || isMissing(patientId)) {
    patientFallback.value = null
    return
  }
  try {
    patientFallback.value = await getPatientById(String(patientId))
  } catch {
    patientFallback.value = null
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    // 打开前先清空上一次数据，避免闪现旧记录
    messages.value = []
    patientFallback.value = null
    fetchMessages()
    fetchPatientFallback()
  }
)
</script>

<template>
  <el-dialog
    v-model="visible"
    width="680px"
    :show-close="true"
    append-to-body
    class="chat-detail-dialog"
  >
    <template #header>
      <span class="dialog-header-sr-only">聊天记录</span>
    </template>

    <!-- 头部：大头像 + 姓名 + 性别/年龄 + 只读模式标 + 医院/科室/标签 -->
    <div class="detail-head">
      <el-avatar :size="56" class="head-avatar">
        {{ avatarText }}
      </el-avatar>
      <div class="head-main">
        <div class="head-line">
          <span class="head-name" :class="{ missing: nameText === MISSING_TEXT }">{{ nameText }}</span>
          <span v-if="genderAgeText" class="head-gender-age">{{ genderAgeText }}</span>
          <el-tag size="small" type="info" effect="plain" class="readonly-tag">只读模式</el-tag>
        </div>
        <div class="head-sub">
          <el-icon><OfficeBuilding /></el-icon>
          <span :class="{ missing: hospitalText === MISSING_TEXT }">{{ hospitalText }}</span>
          <el-icon class="dept-icon"><Grid /></el-icon>
          <span :class="{ missing: departmentText === MISSING_TEXT }">{{ departmentText }}</span>
        </div>
        <div v-if="headTags.length" class="head-tags">
          <span
            v-for="(tag, index) in headTags"
            :key="`${tag}-${index}`"
            class="gray-chip"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div class="detail-summary">
      咨询时间：{{ consultTimeText }} · {{ messageCountText }}
    </div>

    <!-- 消息流：只读，无输入框、无发送按钮 -->
    <div v-loading="loading" class="message-stream">
      <el-empty
        v-if="!loading && sortedMessages.length === 0"
        description="暂无消息"
        :image-size="72"
      />
      <div
        v-for="msg in sortedMessages"
        :key="String(msg.id)"
        class="msg-row"
        :class="`side-${sideOf(msg)}`"
      >
        <div v-if="sideOf(msg) === 'center'" class="system-pill">
          {{ isMissing(msg.content) ? roleLabel(msg) : msg.content }}
        </div>

        <template v-else>
          <div class="msg-meta">
            <el-avatar v-if="sideOf(msg) === 'left'" :size="30" class="msg-avatar">
              {{ senderAvatarText(msg) }}
            </el-avatar>
            <span class="role-tag" :class="`role-${roleTheme(msg)}`">{{ roleLabel(msg) }}</span>
            <span
              v-if="sideOf(msg) === 'right' && !isMissing(msg.senderName)"
              class="sender-name"
            >
              {{ msg.senderName }}
            </span>
            <span class="msg-time">{{ formatTime(msg.createTime, true) }}</span>
          </div>
          <div class="msg-bubble" :class="`bubble-${roleTheme(msg)}`">
            <el-tag
              v-if="msg.type && msg.type !== 'TEXT'"
              size="small"
              effect="plain"
              class="type-tag"
            >
              {{ msg.type }}
            </el-tag>
            <p
              v-if="!isMissing(msg.content)"
              class="bubble-text"
              v-html="renderContent(msg.content)"
            ></p>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <el-button @click="close">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-header-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.detail-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.head-avatar {
  flex-shrink: 0;
  background: #eef2ff;
  color: #1d4ed8;
  font-size: 20px;
  font-weight: 700;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.head-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.head-name {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.head-gender-age {
  font-size: 13px;
  color: #6b7280;
}

.readonly-tag {
  border-radius: 4px;
}

.head-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  color: #4b5563;
}

.head-sub .el-icon {
  color: #94a3b8;
}

.head-sub .dept-icon {
  margin-left: 8px;
}

.head-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.gray-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
}

.detail-summary {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #eef0f4;
  font-size: 13px;
  color: #6b7280;
}

.missing {
  color: #f56c6c;
}

.message-stream {
  margin-top: 14px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.msg-row {
  display: flex;
  flex-direction: column;
  max-width: 82%;
}

.msg-row.side-left {
  align-self: flex-start;
  align-items: flex-start;
}

.msg-row.side-right {
  align-self: flex-end;
  align-items: flex-end;
}

.msg-row.side-center {
  align-self: center;
  max-width: 90%;
}

.system-pill {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  color: #64748b;
  background: #e2e8f0;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.side-right .msg-meta {
  flex-direction: row-reverse;
}

.msg-avatar {
  background: #e0e7ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 700;
}

.role-tag {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 18px;
}

.role-purple {
  color: #7c3aed;
  background: #f3e8ff;
}

.role-green {
  color: #16a34a;
  background: #dcfce7;
}

.role-blue {
  color: #2563eb;
  background: #dbeafe;
}

.role-gray {
  color: #6b7280;
  background: #f3f4f6;
}

.sender-name,
.msg-time {
  font-size: 11px;
  color: #94a3b8;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.bubble-purple {
  background: #f5f0ff;
  color: #312e81;
  border-top-left-radius: 4px;
}

.bubble-green {
  background: #f0fdf4;
  color: #14532d;
  border-top-left-radius: 4px;
}

.bubble-blue {
  background: #2563eb;
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble-gray {
  background: #f3f4f6;
  color: #374151;
  border-top-left-radius: 4px;
}

.type-tag {
  margin-bottom: 6px;
}

.bubble-text {
  margin: 0;
  white-space: pre-line;
}

.bubble-text :deep(strong) {
  font-weight: 700;
}
</style>
