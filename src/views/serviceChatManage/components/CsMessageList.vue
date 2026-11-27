<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  MESSAGE_TYPE_TEXT,
  SENDER_TYPE_TEXT,
  formatTime,
  isMissing,
  resolveFileUrl
} from '../../../utils/index.js'

const props = defineProps({
  messages: { type: Array, default: () => [] }
})

const scrollRef = ref(null)

// 客服本人消息居右；系统消息居中；患者/AI/医生/驻点居左
const alignOf = (msg) => {
  if (msg?.senderType === 'SYSTEM') return 'system'
  return msg?.senderType === 'CS' ? 'right' : 'left'
}

const senderText = (msg) => {
  if (!isMissing(msg?.senderName)) return msg.senderName
  return SENDER_TYPE_TEXT[msg?.senderType] || msg?.senderType || ''
}

const list = computed(() =>
  [...(props.messages || [])].sort((a, b) => {
    const ta = Date.parse(a?.createTime || 0)
    const tb = Date.parse(b?.createTime || 0)
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return ta - tb
  })
)

watch(
  () => props.messages,
  async () => {
    await nextTick()
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { deep: true, flush: 'post' }
)
</script>

<template>
  <div ref="scrollRef" class="message-list">
    <div
      v-for="msg in list"
      :key="String(msg.id)"
      class="message-row"
      :class="`align-${alignOf(msg)}`"
    >
      <div v-if="alignOf(msg) === 'system'" class="system-pill">
        {{ isMissing(msg.content) ? MESSAGE_TYPE_TEXT[msg.type] || '系统消息' : msg.content }}
      </div>

      <template v-else>
        <div class="bubble-meta">
          <span class="sender">{{ senderText(msg) }}</span>
          <span class="time">{{ formatTime(msg.createTime) }}</span>
        </div>
        <div class="bubble" :class="`bubble-${alignOf(msg)}`">
          <el-tag
            v-if="msg.type && msg.type !== 'TEXT'"
            size="small"
            effect="plain"
            class="type-tag"
          >
            {{ MESSAGE_TYPE_TEXT[msg.type] || msg.type }}
          </el-tag>

          <el-image
            v-if="msg.type === 'IMAGE' && !isMissing(msg.imageUrl)"
            :src="resolveFileUrl(msg.imageUrl)"
            :preview-src-list="[resolveFileUrl(msg.imageUrl)]"
            preview-teleported
            fit="cover"
            class="bubble-image"
          />

          <p v-if="!isMissing(msg.content)" class="bubble-text">{{ msg.content }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8fafc;
}

.message-row {
  display: flex;
  flex-direction: column;
  max-width: 78%;
}

.message-row.align-left {
  align-self: flex-start;
  align-items: flex-start;
}

.message-row.align-right {
  align-self: flex-end;
  align-items: flex-end;
}

.message-row.align-system {
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

.bubble-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.align-right .bubble-meta {
  flex-direction: row-reverse;
}

.sender {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.time {
  font-size: 11px;
  color: #94a3b8;
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.bubble-left {
  background: #fff;
  border: 1px solid #e8edf5;
  color: #1f2937;
  border-top-left-radius: 4px;
}

.bubble-right {
  background: #2563eb;
  color: #fff;
  border-top-right-radius: 4px;
}

.type-tag {
  margin-bottom: 6px;
}

.bubble-text {
  margin: 0;
  white-space: pre-line;
}

.bubble-image {
  width: 180px;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
}
</style>
