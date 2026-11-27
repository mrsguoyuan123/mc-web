<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, FullScreen, Phone, Promotion, ChatLineSquare } from '@element-plus/icons-vue'
import {
  getConversationPage,
  getConversationMessagesById,
  markConversationReadById,
  sendConversationMessageById
} from '../../../api/index.js'
import { MISSING_TEXT, isMissing } from '../../../utils/index.js'
import CsMessageList from './CsMessageList.vue'
import CsFaqPanel from './CsFaqPanel.vue'

const props = defineProps({
  // SC1 列表选中行：{ id, name, surgeryType, ... }
  patient: { type: Object, default: null }
})

const emit = defineEmits(['call'])

const conversation = ref(null)
const messages = ref([])
const locating = ref(false)
const messageLoading = ref(false)
const locateError = ref(false)
const noConversation = ref(false)
const sending = ref(false)

const draft = ref('')
const historyVisible = ref(false)
const enlargeVisible = ref(false)
const faqVisible = ref(false)

const patientId = computed(() => (props.patient?.id ? String(props.patient.id) : ''))
const patientName = computed(() =>
  isMissing(props.patient?.name) ? MISSING_TEXT : props.patient.name
)
const surgeryType = computed(() => props.patient?.surgeryType || '')

// 待联调：patientId → conversationId 的唯一查询口径未确认；
// 当前按 getConversationPage 拉 ACTIVE 会话后以 conversation.patientId 匹配，匹配不到再查全部状态
const locateConversation = async (id) => {
  const calls = [
    getConversationPage({ page: 1, pageSize: 100, status: 'ACTIVE' }),
    getConversationPage({ page: 1, pageSize: 100 })
  ]
  for (const request of calls) {
    const res = await request
    const list = Array.isArray(res?.list) ? res.list : Array.isArray(res) ? res : []
    const hit = list.find((item) => String(item.patientId) === id)
    if (hit) return hit
  }
  return null
}

const loadMessages = async (conversationId) => {
  messageLoading.value = true
  try {
    const res = await getConversationMessagesById(conversationId, { page: 1, pageSize: 100 })
    messages.value = Array.isArray(res) ? res : Array.isArray(res?.list) ? res.list : []
    // 打开会话后静默标记已读，失败不影响消息展示
    markConversationReadById(conversationId).catch(() => {})
  } catch {
    messages.value = []
  } finally {
    messageLoading.value = false
  }
}

const resetState = () => {
  conversation.value = null
  messages.value = []
  draft.value = ''
  noConversation.value = false
  locateError.value = false
}

watch(
  patientId,
  async (id) => {
    resetState()
    if (!id) return
    locating.value = true
    try {
      const hit = await locateConversation(id)
      if (!hit) {
        noConversation.value = true
        return
      }
      conversation.value = hit
      await loadMessages(String(hit.id))
    } catch {
      locateError.value = true
    } finally {
      locating.value = false
    }
  },
  { immediate: true }
)

const sendMessage = async () => {
  const content = draft.value.trim()
  if (!content) return
  if (!conversation.value) {
    ElMessage.warning('暂无进行中的会话，无法发送')
    return
  }
  if (content.length > 2000) {
    ElMessage.warning('单条消息不能超过 2000 字')
    return
  }
  sending.value = true
  try {
    const created = await sendConversationMessageById(String(conversation.value.id), {
      type: 'TEXT',
      content
    })
    if (created && typeof created === 'object') messages.value.push(created)
    draft.value = ''
    await nextTick()
  } catch (err) {
    // 发送失败保留输入内容，不清空
    ElMessage.error(err?.message || '发送失败，请重试')
  } finally {
    sending.value = false
  }
}

const onKeydown = (event) => {
  // Enter 发送，Shift+Enter 换行
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const fillDraft = (text) => {
  draft.value = text
  faqVisible.value = false
}

const retry = () => {
  if (patientId.value) {
    resetState()
    locating.value = true
    locateConversation(patientId.value)
      .then((hit) => {
        if (!hit) {
          noConversation.value = true
          return
        }
        conversation.value = hit
        return loadMessages(String(hit.id))
      })
      .catch(() => {
        locateError.value = true
      })
      .finally(() => {
        locating.value = false
      })
  }
}
</script>

<template>
  <section class="chat-panel">
    <!-- 未选择患者 -->
    <el-empty
      v-if="!patient"
      description="请从左侧列表选择患者开始对话"
      :image-size="120"
      class="full-empty"
    />

    <template v-else>
      <header class="chat-header">
        <div class="chat-user">
          <strong>{{ patientName }}</strong>
          <el-tag v-if="conversation?.priority === 'URGENT'" size="small" type="danger">
            紧急
          </el-tag>
          <el-tag v-else-if="conversation" size="small" type="info" effect="plain">
            {{ conversation.status === 'CLOSED' ? '已关闭' : '进行中' }}
          </el-tag>
        </div>
        <div class="header-actions">
          <button type="button" class="action-btn" @click="historyVisible = true">
            <el-icon><Clock /></el-icon>历史
          </button>
          <button type="button" class="action-btn" @click="enlargeVisible = true">
            <el-icon><FullScreen /></el-icon>放大
          </button>
          <button type="button" class="action-btn" @click="emit('call', patient)">
            <el-icon><Phone /></el-icon>虚拟电话
          </button>
        </div>
      </header>

      <div v-if="locating" v-loading="true" class="chat-loading"></div>

      <div v-else-if="locateError" class="state-error" @click="retry">
        会话加载失败，点击重试
      </div>

      <el-empty
        v-else-if="noConversation"
        description="暂无进行中的会话"
        :image-size="100"
        class="full-empty"
      />

      <template v-else>
        <div v-loading="messageLoading" class="chat-main">
          <CsMessageList :messages="messages" />
        </div>

        <footer class="chat-input">
          <div class="input-tools">
            <el-tooltip content="附件能力待接入" placement="top">
              <button type="button" class="tool-btn" disabled>附件</button>
            </el-tooltip>
            <el-tooltip content="图片能力待接入" placement="top">
              <button type="button" class="tool-btn" disabled>图片</button>
            </el-tooltip>
            <el-tooltip content="表情能力待接入" placement="top">
              <button type="button" class="tool-btn" disabled>表情</button>
            </el-tooltip>
            <button type="button" class="tool-btn primary" @click="faqVisible = true">
              <el-icon><ChatLineSquare /></el-icon>常用回复
            </button>
          </div>
          <div class="input-row">
            <textarea
              v-model="draft"
              rows="3"
              placeholder="输入回复内容..."
              @keydown="onKeydown"
            ></textarea>
            <el-button
              type="primary"
              :icon="Promotion"
              :loading="sending"
              @click="sendMessage"
            >
              发送
            </el-button>
          </div>
          <p class="input-hint">按 Enter 发送，Shift + Enter 换行</p>
        </footer>
      </template>
    </template>

    <!-- 历史记录弹窗：复用同一消息流，不新增接口 -->
    <el-dialog
      v-model="historyVisible"
      :title="`历史记录 - ${patientName}`"
      width="640px"
      append-to-body
    >
      <div class="dialog-message-wrap">
        <CsMessageList :messages="messages" />
      </div>
    </el-dialog>

    <!-- 放大聊天：全屏覆盖，保留输入与发送 -->
    <el-dialog
      v-model="enlargeVisible"
      :title="patientName"
      fullscreen
      append-to-body
      class="enlarge-dialog"
    >
      <div class="enlarge-body">
        <CsMessageList :messages="messages" />
        <div class="enlarge-input">
          <textarea
            v-model="draft"
            rows="3"
            placeholder="输入回复内容..."
            @keydown="onKeydown"
          ></textarea>
          <el-button type="primary" :icon="Promotion" :loading="sending" @click="sendMessage">
            发送
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 常用回复 FAQ 抽屉 -->
    <el-drawer v-model="faqVisible" title="常用回复" size="520px" append-to-body>
      <CsFaqPanel :surgery-type="surgeryType" @fill="fillDraft" />
    </el-drawer>
  </section>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 640px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
  overflow: hidden;
}

.full-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #edf1f7;
}

.chat-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-user strong {
  font-size: 16px;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}

.action-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.chat-loading {
  flex: 1;
  min-height: 300px;
}

.state-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

.chat-main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.chat-main :deep(.message-list) {
  width: 100%;
}

.chat-input {
  border-top: 1px solid #edf1f7;
  padding: 10px 16px 12px;
}

.input-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-btn {
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}

.tool-btn.primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.tool-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
  background: #f8fafc;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-row textarea,
.enlarge-input textarea {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  resize: none;
  font-size: 13px;
  font-family: inherit;
  color: #1f2937;
}

.input-row textarea:focus,
.enlarge-input textarea:focus {
  border-color: #2563eb;
}

.input-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.dialog-message-wrap {
  height: 480px;
  display: flex;
  border: 1px solid #edf1f7;
  border-radius: 10px;
  overflow: hidden;
}

.enlarge-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  border: 1px solid #edf1f7;
  border-radius: 10px;
  overflow: hidden;
}

.enlarge-input {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #edf1f7;
}
</style>
