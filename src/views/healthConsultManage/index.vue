<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { useRoute } from 'vue-router'
import { computed, reactive, ref } from 'vue'

const route = useRoute()
const pageTitle = computed(() => route.meta.servicePage ? route.meta.title : '健康咨询管理')
const pageDescription = computed(() =>
  route.meta.servicePage
    ? route.meta.description
    : '查看智能客服及客服回复的沟通记录'
)
// 状态配色
const statusStyle = {
  进行中: { color: '#2563eb', bg: 'rgba(232,241,255,0.5)' },
  待回复: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' },
  已完成: { color: '#16a34a', bg: 'rgba(220,252,231,0.5)' }
}

// 聊天消息：patient 患者 / ai 智能客服 / staff 人工客服
const P = (time, text) => ({ from: 'patient', time, text })
const AI = (time, text) => ({ from: 'ai', sender: '智能客服', time, text })
const SF = (time, sender, text) => ({ from: 'staff', sender, time, text })

// 咨询会话模拟数据
const sessions = ref([
  {
    id: 'C001', name: '王女士', pid: 'P10086', phone: '138****5678', topic: '孕期营养咨询',
    status: '进行中', total: 12, ai: 5, staff: 7, agent: '张小美',
    start: '2026-02-04 09:30', update: '2026-02-04 15:20', date: '2026-02-04',
    chat: [
      P('09:30:15', '你好，我现在怀孕3个月，想咨询一下孕期饮食应该注意什么？'),
      AI('09:30:30', '您好！很高兴为您服务。孕期3个月正是胎儿发育的关键时期，饮食方面需要注意以下几点：\n1. 补充叶酸：每天400-800微克\n2. 均衡营养：多吃新鲜蔬菜水果\n3. 补充蛋白质：适量摄入瘦肉、鱼类、豆制品\n4. 避免生冷食物\n5. 少食多餐，避免暴饮暴食\n\n您还有其他问题吗？'),
      SF('09:40:12', '客服 - 张小美', '请您保持手机畅通，我们会提前通知您。祝您身体健康！'),
      P('09:43:00', '谢谢！'),
      P('15:20:00', '问诊结束后，医生建议我注意休息，开了一些维生素。感谢你们的服务！'),
      SF('15:20:30', '客服 - 张小美', '不客气！很高兴能帮到您。请按医生建议服药，注意休息。如有任何问题随时联系我们。祝您和宝宝健康！')
    ]
  },
  {
    id: 'C002', name: '李先生', pid: 'P10087', phone: '139****8888', topic: '体检报告咨询',
    status: '已完成', total: 8, ai: 3, staff: 5, agent: '李文静',
    start: '2026-02-03 14:20', update: '2026-02-03 14:45', date: '2026-02-03',
    chat: [
      P('14:20:02', '我的体检报告显示转氨酶偏高，请问严重吗？'),
      AI('14:21:10', '转氨酶轻度升高常见于熬夜、饮酒或脂肪肝。建议清淡饮食、规律作息，一个月后复查肝功能。'),
      SF('14:25:36', '客服 - 李文静', '如需复查预约，可以随时联系我帮您安排。')
    ]
  },
  {
    id: 'C003', name: '张女士', pid: 'P10088', phone: '136****6666', topic: '失眠问题咨询',
    status: '待回复', total: 3, ai: 2, staff: 1, agent: '',
    start: '2026-02-04 16:10', update: '2026-02-04 16:15', date: '2026-02-04',
    chat: [
      P('16:10:20', '最近一周一直失眠，凌晨3点才能睡着，白天很疲惫。'),
      AI('16:10:48', '了解。失眠可能与压力或作息有关，建议先固定起床时间、睡前避免使用手机。为您转接人工客服进一步评估，请稍候。')
    ]
  },
  {
    id: 'C004', name: '赵先生', pid: 'P10089', phone: '137****1234', topic: '皮肤过敏咨询',
    status: '已完成', total: 6, ai: 2, staff: 4, agent: '王萌',
    start: '2026-02-02 10:00', update: '2026-02-02 10:30', date: '2026-02-02',
    chat: [
      P('10:00:05', '胳膊上起了一片红疹，很痒，需要怎么处理？'),
      AI('10:01:30', '请先避免抓挠，可用炉甘石洗剂外涂止痒。若出现扩散或发热，请及时到皮肤科就诊。'),
      SF('10:05:11', '客服 - 王萌', '已为您发送附近皮肤科门诊信息，请注意查收。')
    ]
  },
  {
    id: 'C005', name: '陈先生', pid: 'P10090', phone: '135****2233', topic: '高血压用药咨询',
    status: '进行中', total: 4, ai: 3, staff: 1, agent: '张小美',
    start: '2026-02-04 08:00', update: '2026-02-04 11:30', date: '2026-02-04',
    chat: [
      P('08:00:10', '服用苯磺酸氨氯地平片后有点头晕，正常吗？'),
      AI('08:01:02', '服药初期可能出现轻微头晕，建议监测血压，起身动作放缓。如持续不适请联系开药医生调整剂量。'),
      SF('08:03:44', '客服 - 张小美', '建议您记录近三天的血压数据，复诊时带给医生参考。')
    ]
  }
])

const stats = computed(() => ({
  total: sessions.value.length,
  doing: sessions.value.filter((s) => s.status === '进行中').length,
  waiting: sessions.value.filter((s) => s.status === '待回复').length,
  done: sessions.value.filter((s) => s.status === '已完成').length
}))

// 今日数据概览（静态模拟）
const todayStats = [
  { label: '总咨询数', value: 12356, desc:'累计咨询会话' },
  { label: '进行中', value: 40, desc:'正在处理的会话' },
  { label: '待回复', value: 500, desc:'等待回复' },
  { label: '已完成', value: 4234, desc:'成功解决' }
]
const fmtNum = (n) => n.toLocaleString('en-US')

// 筛选
const filters = reactive({ keyword: '', status: '', date: '' })
const filtered = computed(() =>
  sessions.value.filter((s) => {
    const word = filters.keyword.trim()
    const matchWord = !word || s.name.includes(word) || s.pid.includes(word) || s.topic.includes(word)
    return matchWord && (!filters.status || s.status === filters.status) && (!filters.date || s.date === filters.date)
  })
)

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}
const { page: hcPage, pageSize: hcSize, pagedData: pagedConsults, total: hcTotal } = useTablePage(filtered)
</script>
<template>
  <div class="hc-page">
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
      <p>{{ pageDescription }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="today-grid">
      <div v-for="item in todayStats" :key="item.label" class="today-card">
        <div class="today-label">{{ item.label }}</div>
        <div class="today-main">
          <span class="today-value">{{ fmtNum(item.value) }}</span>
          <span class="today-compare">{{ item.desc }}</span>
        </div>
      </div>
    </div>

    <!-- 咨询记录列表 -->
    <div class="panel list-card">
      <div class="block-title">
        <h3>咨询记录列表</h3>
        <p>查看和管理所有健康咨询记录</p>
      </div>

      <div class="filter-bar">
        <el-input v-model="filters.keyword" class="search-input" size="large" clearable
          placeholder="搜索患者姓名、ID或咨询主题...">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.status" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option label="进行中" value="进行中" />
          <el-option label="待回复" value="待回复" />
          <el-option label="已完成" value="已完成" />
        </el-select>
        <el-date-picker v-model="filters.date" class="filter-date" size="large" type="date"
          value-format="YYYY-MM-DD" placeholder="全部日期" />
      </div>

      <el-table :data="pagedConsults" stripe>
        <el-table-column label="会话ID" prop="id" min-width="80" />
        <el-table-column label="患者信息" min-width="150">
          <template #default="{ row }">
            <div class="patient-cell">
              <b>{{ row.name }}</b>
              <span>{{ row.pid }}</span>
              <span>{{ row.phone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="咨询主题" prop="topic" min-width="130" />
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <span class="status-tag" :style="statusStyle[row.status]">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="消息统计" min-width="120">
          <template #default="{ row }">
            <div class="msg-stat">
              <span><el-icon><ChatDotRound /></el-icon>总计: {{ row.total }}</span>
              <span><el-icon><Cpu /></el-icon>AI: {{ row.ai }}</span>
              <span><el-icon><Service /></el-icon>客服: {{ row.staff }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="客服人员" min-width="100">
          <template #default="{ row }">
            <span v-if="row.agent" class="agent-tag">{{ row.agent }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" prop="start" min-width="150" />
        <el-table-column label="最后更新" prop="update" min-width="150" />
                <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看详情" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的咨询记录" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="hcPage"
        v-model:page-size="hcSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="hcTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="hcPage = 1"
      />
    </div>

    <!-- 咨询详情弹窗 -->
    <el-dialog v-model="detailVisible" width="640" class="hc-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>咨询详情 - {{ detail?.id }}</h3>
          <p>查看完整的咨询对话记录</p>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <!-- 基础信息 -->
        <div class="info-panel">
          <div class="info-item"><label>患者姓名</label><span>{{ detail.name }}</span></div>
          <div class="info-item"><label>患者ID</label><span>{{ detail.pid }}</span></div>
          <div class="info-item"><label>联系电话</label><span>{{ detail.phone }}</span></div>
          <div class="info-item"><label>咨询主题</label><span>{{ detail.topic }}</span></div>
          <div class="info-item">
            <label>状态</label>
            <span class="status-tag" :style="statusStyle[detail.status]">{{ detail.status }}</span>
          </div>
          <div class="info-item"><label>客服人员</label><span>{{ detail.agent || '-' }}</span></div>
          <div class="info-item"><label>开始时间</label><span>{{ detail.start }}</span></div>
          <div class="info-item"><label>最后更新</label><span>{{ detail.update }}</span></div>
        </div>

        <!-- 聊天对话区 -->
        <div class="chat-panel">
          <div v-for="(m, i) in detail.chat" :key="i" class="chat-row" :class="m.from">
            <div class="bubble" :class="`${m.from}-bubble`">
              <div class="bubble-meta">
                <el-icon><User v-if="m.from === 'patient'" /><Cpu v-else-if="m.from === 'ai'" /><Service v-else /></el-icon>
                {{ m.from === 'patient' ? detail.name : m.sender }} {{ m.time }}
              </div>
              <div class="bubble-text">{{ m.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
<style scoped>
.hc-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 顶部统计：整卡四列 */
.today-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 22px;
  margin: 22px 0;
  padding: 28px 44px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.today-card {
  padding: 0;
}

.today-label {
  font-size: 16px;
  font-weight: 400;
  color: #9ca3af;
}

.today-main {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-top: 22px;
}

.today-value {
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.5px;
  color: #111827;
}

.today-compare {
  font-size: 14px;
  color: #9ca3af;
}

/* 列表区 */
.list-card {
  padding: 22px 24px;
}

.block-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.block-title p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 170px;
}

.filter-date {
  width: 190px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.patient-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.patient-cell b {
  font-size: 14px;
  color: #111827;
}

.patient-cell span {
  color: #9ca3af;
}

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.msg-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: #6b7280;
}

.msg-stat span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.agent-tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(243,244,246,0.5);
  border-radius: 6px;
  font-size: 12px;
  color: #4b5563;
}

.muted {
  color: #c0c4cc;
}

.detail-btn {
  border-radius: 8px;
  font-weight: 600;
}

/* 弹窗 */
.dialog-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.info-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 18px;
  padding: 16px 18px;
  background: #f8fafc;
  border-radius: 12px;
}

.info-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.info-item span {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  word-break: break-all;
}

/* 聊天区 */
.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 400px;
  margin-top: 16px;
  padding: 4px 2px;
  overflow-y: auto;
}

.chat-row {
  display: flex;
}

.chat-row.patient {
  justify-content: flex-end;
}

.chat-row.ai,
.chat-row.staff {
  justify-content: flex-start;
}

.bubble {
  max-width: 78%;
  padding: 12px 16px;
  border-radius: 12px;
}

.patient-bubble {
  background: #2563eb;
  color: #fff;
  border-top-right-radius: 4px;
}

.ai-bubble {
  background: #f3e8ff;
  color: #4c1d95;
  border-top-left-radius: 4px;
}

.staff-bubble {
  background: #dcfce7;
  color: #14532d;
  border-top-left-radius: 4px;
}

.staff-bubble .bubble-meta {
  color: #16a34a;
  opacity: 1;
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 12px;
  opacity: 0.85;
}

.bubble-text {
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-line;
}

@media (max-width: 1200px) {
  .today-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .info-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.hc-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>