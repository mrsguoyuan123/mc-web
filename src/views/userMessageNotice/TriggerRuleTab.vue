<script setup>
import { ref } from 'vue'

// 触发规则暂无后端接口（swagger 无 trigger-rule/红点规则端点），当前为只读内置规则，待接口就绪后接入
const rules = ref([
  {
    key: 'exercise-unconfigured',
    title: '运动方案未配置',
    target: '用户详情/管理员与客服提醒',
    roles: ['管理员', '客服'],
    dot: true,
    redirect: '运动分析配置',
    enabled: true
  },
  {
    key: 'medication-due',
    title: '用药时间到',
    target: '用户小程序端',
    roles: ['用户'],
    dot: true,
    redirect: '用药提醒',
    enabled: true
  },
  {
    key: 'health-group-message',
    title: '健康管理群新消息',
    target: '用户消息Tab/首页入口',
    roles: ['用户', '客服', '驻点', '医生'],
    dot: true,
    redirect: '健康管理群',
    enabled: true
  },
  {
    key: 'cs-to-doctor',
    title: '客服给医生留言',
    target: '医生小程序端',
    roles: ['医生'],
    dot: true,
    redirect: '客服留言',
    enabled: true
  },
  {
    key: 'escort-booking-change',
    title: '陪诊预约状态变化',
    target: '用户/驻点小程序端',
    roles: ['用户', '驻点'],
    dot: true,
    redirect: '陪诊服务',
    enabled: true
  },
  {
    key: 'health-data-abnormal',
    title: '健康数据异常',
    target: '健康管理团队成员',
    roles: ['管理员', '客服', '医生'],
    dot: true,
    redirect: '健康数据详情',
    enabled: false
  }
])
</script>

<template>
  <div>
    <el-alert
      class="rule-tip"
      type="info"
      :closable="false"
      show-icon
      title="触发规则暂无后端接口"
      description="规则用于解释小程序为什么亮红点。当前为只读内置规则展示，待后端提供规则配置接口后再接入启停与持久化。"
    />

    <div class="rule-grid">
      <div v-for="rule in rules" :key="rule.key" class="panel rule-card">
        <div class="rule-head">
          <div class="rule-title">
            <el-icon class="rule-icon"><Bell /></el-icon>
            {{ rule.title }}
          </div>
          <el-switch :model-value="rule.enabled" disabled />
        </div>
        <div class="rule-target">{{ rule.target }}</div>
        <div class="rule-roles">
          <el-tag v-for="role in rule.roles" :key="role" size="small" effect="plain" round>{{ role }}</el-tag>
        </div>
        <div class="rule-meta">
          <el-icon><ChatDotRound /></el-icon>
          <span>{{ rule.dot ? '产生红点' : '不产生红点' }}</span>
          <el-icon class="status-icon"><Clock /></el-icon>
          <span>{{ rule.enabled ? '已启用' : '已停用' }}</span>
        </div>
        <div class="rule-redirect">跳转：{{ rule.redirect }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}
.rule-tip {
  margin-bottom: 18px;
}
.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.rule-card {
  padding: 20px 22px;
}
.rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rule-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
}
.rule-icon {
  color: #2563eb;
}
.rule-target {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
}
.rule-roles {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rule-meta {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}
.rule-meta .status-icon {
  margin-left: 14px;
}
.rule-redirect {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  color: #4b5563;
}
@media (max-width: 992px) {
  .rule-grid {
    grid-template-columns: 1fr;
  }
}
</style>
