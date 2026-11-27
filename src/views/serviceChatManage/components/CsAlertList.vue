<script setup>
import { ref } from 'vue'
import { ArrowDown, ArrowUp, InfoFilled } from '@element-plus/icons-vue'
import { MISSING_TEXT } from '../../../utils/index.js'

// 待后端补：提醒明细随预期 GET /cs/health-overview 一并返回，端点未补前为空数组，不渲染示例患者
const alerts = ref([])
// 待后端补：待跟进人数取健康总览端点，未就绪显示「接口未提供」
const pendingCount = ref(null)

const expanded = ref(false)
const toggle = () => {
  expanded.value = !expanded.value
}

const emit = defineEmits(['enter-session'])
const enterSession = (patientId) => {
  if (patientId) emit('enter-session', String(patientId))
}

// 预留：端点就绪后的等级字典，与全局健康状态口径对齐（ABNORMAL 异常红 / ATTENTION 关注黄）
const LEVEL_TEXT = { ABNORMAL: '异常', ATTENTION: '关注' }
</script>

<template>
  <div class="alert-block">
    <button type="button" class="alert-header" @click="toggle">
      <span class="alert-title">
        <el-icon class="title-icon"><InfoFilled /></el-icon>
        <strong>异常数据提醒</strong>
        <span class="alert-badge">
          <template v-if="pendingCount !== null">{{ pendingCount }} 位待跟进</template>
          <span v-else class="missing">{{ MISSING_TEXT }}</span>
        </span>
      </span>
      <el-icon class="collapse-icon">
        <ArrowUp v-if="expanded" />
        <ArrowDown v-else />
      </el-icon>
    </button>

    <div v-show="expanded" class="alert-body">
      <div v-if="alerts.length" class="alert-list">
        <div
          v-for="item in alerts"
          :key="item.patientId ?? item.name"
          class="alert-item"
          :class="item.level === 'ATTENTION' ? 'level-attention' : 'level-abnormal'"
        >
          <div class="alert-main">
            <div class="alert-name-row">
              <strong>{{ item.patientName || item.name }}</strong>
              <el-tag
                size="small"
                :type="item.level === 'ATTENTION' ? 'warning' : 'danger'"
                effect="dark"
              >
                {{ LEVEL_TEXT[item.level] || item.level }}
              </el-tag>
            </div>
            <p class="alert-summary">{{ item.summary }}</p>
          </div>
          <button type="button" class="enter-link" @click="enterSession(item.patientId)">
            进入会话
          </button>
        </div>
      </div>
      <el-empty v-else description="暂无异常数据提醒" :image-size="70" class="alert-empty" />
    </div>
  </div>
</template>

<style scoped>
.alert-block {
  margin-top: 16px;
}

.alert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.alert-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #ef4444;
  font-size: 17px;
}

.alert-title strong {
  font-size: 14px;
  color: #1f2937;
}

.alert-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.collapse-icon {
  color: #94a3b8;
}

.alert-body {
  margin-top: 12px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
}

.alert-item.level-abnormal {
  background: #fef2f2;
  border-color: #fecaca;
}

.alert-item.level-attention {
  background: #fefce8;
  border-color: #fde68a;
}

.alert-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-summary {
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
}

.enter-link {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
}

.alert-empty {
  padding: 20px 0;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}
</style>
