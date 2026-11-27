<script setup>
import { Bell, CircleCheckFilled, FirstAidKit, User, WarningFilled } from '@element-plus/icons-vue'
import { MISSING_TEXT } from '../../../utils/index.js'
import CsAlertList from './CsAlertList.vue'

defineEmits(['enter-session'])

// TODO 待后端补：预期 GET /cs/health-overview，返回 { total, abnormal, attention, normal, alerts }
// 预估取数函数（端点确认前不发起请求，四卡主数值统一显示「接口未提供」，禁止写死 6/3/1/2）：
// async function loadHealthOverview() {
//   const res = await getCsHealthOverview()
// }

// 四卡配置：主数值位全部缺口占位，副文案为静态指标说明
const cards = [
  { label: '负责用户', icon: User, tone: 'blue', sub: '当前客服服务范围' },
  { label: '数据异常', icon: WarningFilled, tone: 'red', sub: '需要优先回访' },
  { label: '需要关注', icon: Bell, tone: 'orange', sub: '用药或训练待确认' },
  { label: '数据正常', icon: CircleCheckFilled, tone: 'green', sub: '近期数据平稳' }
]
</script>

<template>
  <section class="health-panel">
    <div class="health-header">
      <div class="health-titles">
        <h2>
          <el-icon class="heart-icon"><FirstAidKit /></el-icon>
          负责用户健康数据总览
        </h2>
        <p>仅统计当前客服负责的用户，异常数据可直接进入对应会话跟进。</p>
      </div>
      <!-- 负责用户总数待健康总览端点下发，未就绪显示红色「接口未提供」 -->
      <span class="owner-tag">
        负责用户 <em class="missing">{{ MISSING_TEXT }}</em> 人
      </span>
    </div>

    <div class="health-cards">
      <div v-for="card in cards" :key="card.label" class="health-card">
        <div class="health-card-head">
          <span class="health-label">{{ card.label }}</span>
          <el-icon class="health-icon" :class="`tone-${card.tone}`">
            <component :is="card.icon" />
          </el-icon>
        </div>
        <strong class="health-value missing">{{ MISSING_TEXT }}</strong>
        <span class="health-sub">{{ card.sub }}</span>
      </div>
    </div>

    <CsAlertList @enter-session="(patientId) => $emit('enter-session', patientId)" />
  </section>
</template>

<style scoped>
.health-panel {
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.health-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.health-titles h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.heart-icon {
  color: #ef4444;
}

.health-titles p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.owner-tag {
  padding: 5px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  white-space: nowrap;
}

.health-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.health-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fbfcfe;
}

.health-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.health-label {
  font-size: 13px;
  color: #64748b;
}

.health-icon {
  font-size: 18px;
}

.health-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.health-value.missing {
  font-size: 13px;
  font-weight: 500;
}

.health-sub {
  font-size: 12px;
  color: #94a3b8;
}

.tone-blue {
  color: #2563eb;
}

.tone-red {
  color: #ef4444;
}

.tone-orange {
  color: #f59e0b;
}

.tone-green {
  color: #16a34a;
}

.missing {
  color: #ef4444;
  font-style: normal;
}

@media (max-width: 1440px) {
  .health-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .health-cards {
    grid-template-columns: 1fr;
  }
}
</style>
