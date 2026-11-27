<script setup>
import { computed, ref } from 'vue'
import CsHealthOverview from './components/CsHealthOverview.vue'
import CsStatsBar from './components/CsStatsBar.vue'
import CsPatientList from './components/CsPatientList.vue'
import CsChatPanel from './components/CsChatPanel.vue'
import CsUserInfoCard from './components/CsUserInfoCard.vue'
import CsAiSummaryCard from './components/CsAiSummaryCard.vue'
import CsAiPredictionCard from './components/CsAiPredictionCard.vue'
import CsProfileDrawer from './components/CsProfileDrawer.vue'
import CsCallPanel from './components/CsCallPanel.vue'

// 当前选中患者（SC1 列表回传整行）；SC2 各组件按 id 独立取数，切换即清空重拉
const currentPatient = ref(null)
const userInfoCardRef = ref(null)

const currentPatientId = computed(() => (currentPatient.value?.id ? String(currentPatient.value.id) : ''))

const handleSelect = (row) => {
  currentPatient.value = row
}

// 异常提醒「进入会话」：健康总览端点补齐后按 patientId 定位（SC1-B 预留）
const handleEnterSession = (patientId) => {
  currentPatient.value = { id: String(patientId) }
}

// SC3 资料抽屉
const profileVisible = ref(false)
const profilePatient = ref(null)

const handleOpenProfile = (detail) => {
  profilePatient.value = detail || currentPatient.value
  profileVisible.value = true
}

// SC4 虚拟电话侧栏
const callVisible = ref(false)
const callPatient = ref(null)

const handleCall = (patient) => {
  callPatient.value = patient || currentPatient.value
  callVisible.value = true
}

// 通话记录提交成功后刷新用户信息卡的电话按钮状态
const handleRecorded = () => {
  userInfoCardRef.value?.refresh?.()
}
</script>

<template>
  <div class="cs-page">
    <header class="page-header">
      <h1>客服工作台</h1>
      <p>集中处理负责用户的咨询、健康数据异常与沟通跟进</p>
    </header>

    <!-- 负责用户健康数据总览（SC1-B：健康总览端点待补，四卡与提醒列表缺口占位） -->
    <CsHealthOverview @enter-session="handleEnterSession" />

    <!-- 工作台统计（cs 三项真实对接 + 会话统计四项，缺口项红色兜底） -->
    <CsStatsBar />

    <!-- 三栏工作区 -->
    <main class="workspace">
      <CsPatientList
        class="col-left"
        :current-patient-id="currentPatientId"
        @select="handleSelect"
      />

      <CsChatPanel class="col-center" :patient="currentPatient" @call="handleCall" />

      <aside class="col-right">
        <template v-if="currentPatientId">
          <CsUserInfoCard
            ref="userInfoCardRef"
            :patient-id="currentPatientId"
            @open-profile="handleOpenProfile"
            @call="handleCall"
          />
          <CsAiSummaryCard :patient-id="currentPatientId" />
          <CsAiPredictionCard :patient-id="currentPatientId" />
        </template>
        <div v-else class="right-empty panel">
          <el-empty description="选择患者后展示用户信息与 AI 分析" :image-size="100" />
        </div>
      </aside>
    </main>

    <!-- SC3：用户完整资料抽屉（六页签懒加载，客服只读） -->
    <CsProfileDrawer
      v-model="profileVisible"
      :patient-id="String(profilePatient?.id || '')"
      :patient="profilePatient"
    />

    <!-- SC4：虚拟电话侧栏与通话记录表单 -->
    <CsCallPanel
      v-model="callVisible"
      :patient-id="String(callPatient?.id || currentPatientId || '')"
      :patient="callPatient || currentPatient"
      @recorded="handleRecorded"
    />
  </div>
</template>

<style scoped>
.cs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.page-header p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.workspace {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: stretch;
  min-height: 640px;
}



.col-left {
  min-height: 640px;
  max-height: calc(100vh - 220px);
}

.col-center {
  min-height: 640px;
}

.col-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 640px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  padding-right: 2px;
}

.right-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 1280px 以下收窄侧栏，但仍保持三栏，避免右侧栏换行（1366 笔记本常见宽度） */
@media (max-width: 1280px) {
  .workspace {
    grid-template-columns: 260px minmax(0, 1fr) 260px;
    gap: 12px;
  }
}

/* 1024px 以下窄屏才折叠为单栏 */
@media (max-width: 1024px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .col-left,
  .col-center,
  .col-right {
    min-height: 480px;
    max-height: none;
  }
}
</style>