<template>
  <div class="chat-manage-page">
    <div class="page-header">
      <h1>聊天管理</h1>
      <p>实时处理患者咨询，AI智能辅助，提供专业医疗建议</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title"><span>总会话数</span><el-icon class="gray"><ChatDotRound /></el-icon></div>
        <strong>6</strong><small>当前活跃会话</small>
      </div>
      <div class="stat-card">
        <div class="stat-title"><span>待回复</span><el-icon class="orange"><Clock /></el-icon></div>
        <strong class="orange">4</strong><small>需要及时处理</small>
      </div>
      <div class="stat-card">
        <div class="stat-title"><span>紧急消息</span><el-icon class="red"><WarningFilled /></el-icon></div>
        <strong class="red">3</strong><small>优先处理</small>
      </div>
      <div class="stat-card">
        <div class="stat-title"><span>答复率</span><el-icon class="green"><TrendCharts /></el-icon></div>
        <strong class="green">33.3%</strong><small>已处理2个会话</small>
      </div>
      <div class="stat-card">
        <div class="stat-title"><span>平均答复时间</span><el-icon class="purple"><Timer /></el-icon></div>
        <strong class="purple">8分</strong><small>响应速度</small>
      </div>
    </div>

    <div class="workspace">
      <aside class="panel session-panel">
        <div class="session-header">
          <h3>会话列表 <span>4 条未读</span></h3>
          <p>点击会话开始对话</p>
        </div>
        <div class="filters">
          <div class="search-box">
            <el-icon><Search /></el-icon>
            <input v-model.trim="keyword" placeholder="搜索患者..." />
          </div>
          <select v-model="statusFilter">
            <option value="">全部</option>
            <option value="待回复">待回复</option>
            <option value="已回复">已回复</option>
          </select>
          <select v-model="urgentFilter">
            <option value="">全部</option>
            <option value="urgent">仅紧急</option>
            <option value="normal">普通消息</option>
          </select>
        </div>
        <div class="session-list">
          <button
            v-for="item in filteredSessions"
            :key="item.id"
            class="session-item"
            :class="{ active: item.id === activeSession.id }"
            @click="chooseSession(item)"
          >
            <div class="avatar" :style="{ background: item.avatarColor }">
              <img :src="item.avatar" :alt="item.name" @error="hideImage" />
              <span>{{ item.name.slice(0, 1) }}</span>
            </div>
            <div class="session-content">
              <div class="session-row"><strong>{{ item.name }}</strong><i v-if="item.unread">{{ item.unread }}</i></div>
              <span class="patient-id">{{ item.pid }}</span>
              <p>{{ item.preview }}</p>
              <div class="session-foot"><span>{{ item.time }}</span><em v-if="item.urgent">紧急</em></div>
            </div>
          </button>
        </div>
      </aside>

      <main class="panel chat-panel">
        <div class="chat-header">
          <div class="chat-user">
            <div class="avatar large" :style="{ background: activeSession.avatarColor }">
              <img :src="activeSession.avatar" :alt="activeSession.name" @error="hideImage" />
              <span>{{ activeSession.name.slice(0, 1) }}</span>
            </div>
            <div>
              <div class="chat-name"><strong>{{ activeSession.name }}</strong><b v-if="activeSession.urgent" class="urgent-label">紧急</b></div>
              <span>{{ activeSession.pid }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button @click="historyVisible = true"><el-icon><Clock /></el-icon>历史</button>
            <button @click="enlargeVisible = true"><el-icon><FullScreen /></el-icon>放大</button>
          </div>
        </div>

        <section class="ai-summary">
          <div class="summary-title">
            <span class="ai-icon"><el-icon><Cpu /></el-icon></span>
            <strong>AI智能总结</strong><em>{{ aiView.risk }}</em>
          </div>
          <div class="summary-grid">
            <div class="summary-box">
              <label>✤ 主要症状</label>
              <div class="symptom-list"><span v-for="text in aiView.symptoms" :key="text">{{ text }}</span></div>
            </div>
            <div class="summary-box"><label>◔ 咨询历史</label><strong>{{ aiView.consultCount }} 次咨询</strong></div>
          </div>
          <div class="summary-actions">
            <label>◉ AI建议行动</label>
            <p v-for="text in aiView.actions" :key="text">{{ text }}</p>
          </div>
        </section>

        <div ref="messageBox" class="message-list">
          <div v-for="(msg, index) in activeSession.messages" :key="index" class="message-row" :class="msg.from">
            <div class="bubble">
              <div v-if="msg.from !== 'patient'" class="sender">
                <el-icon><Cpu v-if="msg.from === 'ai'" /><UserFilled v-else /></el-icon>
                <span>{{ msg.sender }}</span><em v-if="msg.from === 'ai'">AI智能</em>
              </div>
              <p>{{ msg.text }}</p><time>{{ msg.time }}</time>
            </div>
          </div>
        </div>

        <div class="reply-area">
          <textarea v-model="replyText" placeholder="输入回复内容..." @keydown.enter.exact.prevent="sendReply"></textarea>
          <button class="send-button" @click="sendReply"><el-icon><Promotion /></el-icon>发送</button>
          <small>按 Enter 发送，Shift + Enter 换行</small>
        </div>
      </main>

      <aside class="panel info-panel">
        <h3 class="side-heading"><el-icon><User /></el-icon>患者信息</h3>
        <div class="patient-card">
          <div class="patient-avatar" :style="{ background: activeSession.avatarColor }">
            <img :src="activeSession.avatar" :alt="activeSession.name" @error="hideImage" />
            <span>{{ activeSession.name.slice(0, 1) }}</span>
          </div>
          <h4>{{ activeSession.name }}</h4><span>{{ activeSession.pid }}</span>
        </div>
        <div class="basic-info">
          <div><label>性别 / 年龄</label><strong>{{ activeSession.genderAge }}</strong></div>
          <div><label>联系电话</label><strong>{{ activeSession.phone }}</strong></div>
          <div><label>保险单号</label><strong class="insurance">{{ activeSession.insurance }}</strong></div>
          <div>
            <label>疾病信息</label>
            <div class="disease-list"><span v-for="tag in activeSession.diseaseTags" :key="tag">{{ tag }}</span></div>
          </div>
          <div><label>绑定日期</label><strong>{{ activeSession.bindDate }}</strong></div>
        </div>

        <div class="doctor-team">
          <h4><el-icon><UserFilled /></el-icon>绑定医生团队</h4>
          <div v-for="doctor in activeSession.doctors" :key="doctor.name" class="doctor-item">
            <div class="doctor-avatar" :style="{ background: doctor.color }">
              <img :src="doctor.avatar" :alt="doctor.name" @error="hideImage" />
              <span>{{ doctor.name.slice(0, 1) }}</span>
            </div>
            <div>
              <div class="doctor-name"><strong>{{ doctor.name }}</strong><em :class="doctor.typeClass">{{ doctor.title }}</em></div>
              <p>{{ doctor.department }}</p>
            </div>
          </div>
        </div>

        <div class="deep-analysis">
          <h4><el-icon><Cpu /></el-icon>AI详细分析</h4>
          <section class="analysis-card purple">
            <strong>咨询历史记录</strong>
            <p v-for="text in activeSession.analysis.history" :key="text">{{ text }}</p>
          </section>
          <section class="analysis-card blue">
            <strong>AI建议询问</strong>
            <p v-for="text in activeSession.analysis.questions" :key="text">{{ text }}</p>
          </section>
          <section class="analysis-card green">
            <strong>AI建议行动</strong>
            <p v-for="text in activeSession.analysis.actions" :key="text">{{ text }}</p>
          </section>
        </div>
      </aside>
    </div>

    <el-dialog v-model="historyVisible" class="chat-history-dialog" width="560px">
      <template #header>
        <div class="dialog-title"><h3>完整历史聊天记录</h3><p>{{ activeSession.name }} ({{ activeSession.pid }})</p></div>
      </template>
      <div class="dialog-messages">
        <div v-for="(msg, index) in activeSession.messages" :key="index" class="message-row" :class="msg.from">
          <div class="bubble">
            <div v-if="msg.from !== 'patient'" class="sender">
              <el-icon><Cpu v-if="msg.from === 'ai'" /><UserFilled v-else /></el-icon>
              <span>{{ msg.sender }}</span><em v-if="msg.from === 'ai'">AI智能</em>
            </div>
            <p>{{ msg.text }}</p><time>{{ msg.time }}</time>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="enlargeVisible" class="chat-reply-dialog" width="560px">
      <template #header>
        <div class="reply-dialog-title">
          <div class="avatar" :style="{ background: activeSession.avatarColor }">
            <img :src="activeSession.avatar" :alt="activeSession.name" @error="hideImage" />
            <span>{{ activeSession.name.slice(0, 1) }}</span>
          </div>
          <div><h3>{{ activeSession.name }}<b v-if="activeSession.urgent" class="urgent-label">紧急</b></h3><p>{{ activeSession.pid }}</p></div>
        </div>
      </template>
      <div class="dialog-messages short">
        <div v-for="(msg, index) in activeSession.messages" :key="index" class="message-row" :class="msg.from">
          <div class="bubble">
            <div v-if="msg.from !== 'patient'" class="sender">
              <el-icon><Cpu v-if="msg.from === 'ai'" /><UserFilled v-else /></el-icon>
              <span>{{ msg.sender }}</span><em v-if="msg.from === 'ai'">AI智能</em>
            </div>
            <p>{{ msg.text }}</p><time>{{ msg.time }}</time>
          </div>
        </div>
      </div>
      <div class="dialog-reply">
        <textarea v-model="replyText" placeholder="输入回复内容..." @keydown.enter.exact.prevent="sendReply"></textarea>
        <button class="send-button" @click="sendReply"><el-icon><Promotion /></el-icon>发送</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  ChatDotRound,
  Clock,
  Cpu,
  FullScreen,
  Promotion,
  Search,
  Timer,
  TrendCharts,
  User,
  UserFilled,
  WarningFilled
} from '@element-plus/icons-vue'

const patientMsg = (time, text) => ({ from: 'patient', time, text })
const aiMsg = (time, text) => ({ from: 'ai', sender: 'AI智能助手', time, text })
const staffMsg = (time, text) => ({ from: 'staff', sender: '客服小王', time, text })

const doctors = [
  { name: '李主任', title: '主任', department: '产科', typeClass: 'red', color: '#b91c1c', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
  { name: '王医生', title: '主治', department: '产科', typeClass: 'blue', color: '#2563eb', avatar: 'https://randomuser.me/api/portraits/women/25.jpg' },
  { name: '陈护士', title: '住院', department: '产科', typeClass: 'green', color: '#059669', avatar: 'https://randomuser.me/api/portraits/women/51.jpg' }
]

const defaultAnalysis = {
  history: ['暂无更早咨询记录'],
  questions: ['目前症状持续多久？', '是否已经线下就诊？'],
  actions: ['记录患者症状变化', '及时跟进患者咨询']
}

const defaultSummary = {
  risk: '中风险',
  symptoms: ['需要关注', '持续随访'],
  consultCount: 2,
  actions: ['建议结合患者描述继续评估', '必要时提醒患者线下就医']
}

const keyword = ref('')
const statusFilter = ref('')
const urgentFilter = ref('')
const replyText = ref('')
const historyVisible = ref(false)
const enlargeVisible = ref(false)
const messageBox = ref(null)

const sessions = ref([
  {
    id: 'C2026020401',
    pid: 'P10086',
    name: '张小美',
    status: '待回复',
    urgent: true,
    unread: 0,
    preview: '医生，我最近总是感觉头晕，这是怎么回事？',
    time: '14:30:25',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    avatarColor: '#9f1239',
    genderAge: '女 / 32岁',
    phone: '138****5678',
    insurance: 'INS-2024-001234',
    bindDate: '2024-12-15',
    diseaseTags: ['孕期头晕', '轻度贫血'],
    doctors,
    summary: {
      risk: '中风险',
      symptoms: ['头晕', '乏力', '孕期不适'],
      consultCount: 3,
      actions: ['建议进行血常规检查', '评估是否需要补铁']
    },
    analysis: {
      history: ['2026-01-15：咨询孕期营养问题', '2026-01-28：询问孕早期注意事项', '2026-02-04：反映头晕症状加重'],
      questions: ['头晕持续多久？', '是否有贫血检查结果？', '饮食是否规律？', '是否按时补充叶酸？'],
      actions: ['建议进行血常规检查', '评估是否需要补铁', '建议休息，避免过度劳累', '定期产检监测']
    },
    messages: [
      aiMsg('2026-02-04 14:20:00', '您好，张小美女士。我是AI智能助手，已为您调取历史就诊记录。您曾于1月15日咨询过孕期营养问题，1月28日询问孕早期注意事项。请问您现在有什么需要帮助的吗？'),
      patientMsg('2026-02-04 14:25:10', '您好，我想咨询一下'),
      staffMsg('2026-02-04 14:25:30', '您好，请问有什么可以帮助您的?'),
      patientMsg('2026-02-04 14:30:25', '医生，我最近总是感觉头晕，这是怎么回事?')
    ]
  },
  {
    id: 'C2026020402',
    pid: 'P10087',
    name: '李明',
    status: '待回复',
    urgent: false,
    unread: 0,
    preview: '谢谢医生的建议，我会按时复查。',
    time: '14:28:15',
    avatar: 'https://randomuser.me/api/portraits/men/59.jpg',
    avatarColor: '#0f766e',
    genderAge: '男 / 41岁',
    phone: '139****8888',
    insurance: 'INS-2024-001235',
    bindDate: '2025-01-08',
    diseaseTags: ['感冒', '轻度咳嗽'],
    doctors,
    summary: { risk: '低风险', symptoms: ['咳嗽', '低热'], consultCount: 2, actions: ['观察体温变化', '症状加重及时复诊'] },
    analysis: defaultAnalysis,
    messages: [
      aiMsg('2026-02-04 14:18:00', '根据您的描述，目前更像普通上呼吸道感染，建议多饮水、注意休息。'),
      patientMsg('2026-02-04 14:22:10', '需要吃什么药吗？'),
      patientMsg('2026-02-04 14:28:15', '谢谢医生的建议，我会按时复查。')
    ]
  },
  {
    id: 'C2026020403',
    pid: 'P10088',
    name: '王芳',
    status: '待回复',
    urgent: true,
    unread: 2,
    preview: '孩子发烧到39度了，怎么办？',
    time: '14:25:00',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    avatarColor: '#be123c',
    genderAge: '女 / 35岁',
    phone: '132****1234',
    insurance: 'INS-2024-001236',
    bindDate: '2024-11-20',
    diseaseTags: ['儿童发热'],
    doctors,
    summary: { risk: '高风险', symptoms: ['高热', '情绪焦虑'], consultCount: 2, actions: ['立即物理降温', '持续观察体温变化'] },
    analysis: {
      history: ['2026-01-20：儿童咳嗽咨询', '2026-02-04：突发高热'],
      questions: ['发热持续多久？', '是否有呕吐或抽搐？', '是否服用退烧药？'],
      actions: ['建议立即联系儿科医生', '指导物理降温', '持续不退建议急诊']
    },
    messages: [
      patientMsg('2026-02-04 14:15:00', '您好，孩子突然发烧了'),
      aiMsg('2026-02-04 14:16:20', '请先测量体温并观察精神状态，我马上为您对接医生。'),
      patientMsg('2026-02-04 14:25:00', '孩子发烧到39度了，怎么办？')
    ]
  },
  {
    id: 'C2026020404',
    pid: 'P10089',
    name: '赵强',
    status: '待回复',
    urgent: false,
    unread: 1,
    preview: '腰疼需要做什么检查？',
    time: '14:20:00',
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    avatarColor: '#334155',
    genderAge: '男 / 48岁',
    phone: '137****1234',
    insurance: 'INS-2024-001237',
    bindDate: '2024-09-16',
    diseaseTags: ['腰椎间盘突出', '慢性腰痛'],
    doctors,
    summary: { risk: '中风险', symptoms: ['腰痛', '活动受限'], consultCount: 3, actions: ['建议影像复查', '避免久坐和负重'] },
    analysis: defaultAnalysis,
    messages: [
      aiMsg('2026-02-04 14:12:00', '腰痛如果伴随下肢麻木，需要尽快进行影像检查。'),
      patientMsg('2026-02-04 14:20:00', '腰疼需要做什么检查？')
    ]
  },
  {
    id: 'C2026020405',
    pid: 'P10090',
    name: '陈丽',
    status: '已回复',
    urgent: false,
    unread: 0,
    preview: '好的，我明白了，谢谢。',
    time: '14:10:00',
    avatar: 'https://randomuser.me/api/portraits/women/72.jpg',
    avatarColor: '#7c3aed',
    genderAge: '女 / 29岁',
    phone: '135****2233',
    insurance: 'INS-2024-001238',
    bindDate: '2025-02-01',
    diseaseTags: ['睡眠咨询'],
    doctors,
    summary: { risk: '低风险', symptoms: ['睡眠不佳'], consultCount: 1, actions: ['调整作息', '一周后回访'] },
    analysis: defaultAnalysis,
    messages: [
      patientMsg('2026-02-04 14:05:00', '最近总是睡不好，白天很疲惫。'),
      staffMsg('2026-02-04 14:08:00', '建议先固定作息，睡前减少使用手机。'),
      patientMsg('2026-02-04 14:10:00', '好的，我明白了，谢谢。')
    ]
  },
  {
    id: 'C2026020406',
    pid: 'P10091',
    name: '刘洋',
    status: '待回复',
    urgent: true,
    unread: 1,
    preview: '降压药是否需要调整？',
    time: '14:08:00',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    avatarColor: '#3f3f46',
    genderAge: '男 / 62岁',
    phone: '136****6666',
    insurance: 'INS-2024-001239',
    bindDate: '2024-06-10',
    diseaseTags: ['高血压', '血压不稳'],
    doctors,
    summary: { risk: '高风险', symptoms: ['血压波动', '头晕'], consultCount: 3, actions: ['建议动态血压监测', '复诊评估用药'] },
    analysis: {
      history: ['2026-01-10：高血压复诊', '2026-01-25：询问用药调整', '2026-02-04：血压不稳定'],
      questions: ['最近血压数值是多少？', '是否按时服药？', '有没有胸闷或头晕？'],
      actions: ['建议记录血压', '尽快复诊调整用药', '避免剧烈活动']
    },
    messages: [
      aiMsg('2026-02-04 14:03:00', '血压波动明显时请勿自行停药，建议尽快联系医生评估。'),
      patientMsg('2026-02-04 14:08:00', '降压药是否需要调整？')
    ]
  }
])

const activeSession = ref(sessions.value[0])

const filteredSessions = computed(() => {
  const word = keyword.value.toLowerCase()
  return sessions.value.filter((item) => {
    const matchWord = !word || item.name.toLowerCase().includes(word) || item.pid.toLowerCase().includes(word)
    const matchStatus = !statusFilter.value || item.status === statusFilter.value
    const matchUrgent =
      !urgentFilter.value ||
      (urgentFilter.value === 'urgent' ? item.urgent : !item.urgent)
    return matchWord && matchStatus && matchUrgent
  })
})

const aiView = computed(() => activeSession.value.summary || defaultSummary)

const scrollToBottom = () => {
  nextTick(() => {
    if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight
  })
}

const chooseSession = (item) => {
  activeSession.value = item
  item.unread = 0
  scrollToBottom()
}

const hideImage = (event) => {
  event.target.style.display = 'none'
}

const currentTime = () => {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const sendReply = () => {
  const text = replyText.value.trim()
  if (!text) return
  activeSession.value.messages.push(staffMsg(currentTime(), text))
  activeSession.value.status = '已回复'
  activeSession.value.unread = 0
  replyText.value = ''
  scrollToBottom()
}

onMounted(scrollToBottom)
</script>

<style scoped>
.chat-manage-page {
  min-height: 100%;
  padding: 28px 30px 36px;
  background: #f8f9fb;
  color: #1f2937;
  box-sizing: border-box;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 26px;
  line-height: 1.25;
  font-weight: 700;
}

.page-header p {
  margin: 0 0 24px;
  font-size: 15px;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.stat-card {
  min-height: 132px;
  padding: 20px 20px 18px;
  border: 1px solid #edf0f4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.stat-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #374151;
  font-size: 14px;
}

.stat-title .el-icon {
  font-size: 19px;
}

.gray { color: #8b93a1; }
.orange { color: #f97316; }
.red { color: #ef1b2e; }
.green { color: #16a34a; }
.purple { color: #9333ea; }

.stat-card strong {
  display: block;
  margin: 18px 0 8px;
  font-size: 30px;
  line-height: 1;
  color: #111827;
}

.stat-card small {
  font-size: 12px;
  color: #9ca3af;
}

.workspace {
  display: grid;
  grid-template-columns: 240px minmax(420px, 1fr) 282px;
  gap: 18px;
  align-items: stretch;
}

.panel {
  border: 1px solid #edf0f4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.session-panel {
  min-height: 820px;
  padding: 20px 14px;
}

.session-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.session-header h3 span {
  margin-left: 7px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #ff3347;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  vertical-align: 2px;
}

.session-header p {
  margin: 8px 0 16px;
  color: #6b7280;
  font-size: 14px;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e7ebf1;
  border-radius: 8px;
  background: #f7f8fa;
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 13px;
}

.filters select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #f7f8fa;
  color: #374151;
  font-size: 13px;
  outline: none;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-item {
  position: relative;
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 13px 10px;
  border: 1px solid #edf0f4;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.session-item.active {
  border-color: #b9d4ff;
  background: #eef6ff;
}

.avatar,
.patient-avatar,
.doctor-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
}

.avatar {
  width: 42px;
  height: 42px;
}

.avatar.large {
  width: 44px;
  height: 44px;
}

.avatar img,
.patient-avatar img,
.doctor-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.session-content {
  flex: 1;
  min-width: 0;
}

.session-row,
.session-foot,
.chat-name,
.doctor-name {
  display: flex;
  align-items: center;
}

.session-row {
  justify-content: space-between;
  gap: 8px;
}

.session-row strong {
  font-size: 15px;
  color: #111827;
}

.session-row i {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ff3b30;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  line-height: 18px;
  text-align: center;
  box-sizing: border-box;
}

.patient-id {
  display: block;
  margin: 2px 0 5px;
  color: #8a94a6;
  font-size: 12px;
}

.session-content p {
  margin: 0;
  color: #374151;
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-foot {
  justify-content: space-between;
  margin-top: 7px;
  color: #9ca3af;
  font-size: 12px;
}

.session-foot em {
  padding: 2px 6px;
  border-radius: 5px;
  background: #ffe9e9;
  color: #e11d2e;
  font-size: 11px;
  font-style: normal;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 820px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #eef1f5;
}

.chat-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-name {
  gap: 8px;
  margin-bottom: 3px;
}

.chat-name strong {
  font-size: 17px;
}

.chat-header span {
  color: #7b8493;
  font-size: 13px;
}

.urgent-label {
  padding: 3px 9px !important;
  border-radius: 6px;
  background: #ff4d5e !important;
  color: #fff !important;
  font-size: 12px !important;
  font-style: normal;
}

.header-actions {
  display: flex;
  gap: 9px;
}

.header-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 13px;
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  cursor: pointer;
}

.ai-summary {
  margin: 18px 20px 12px;
  padding: 16px;
  border: 1px solid #e8dcff;
  border-radius: 12px;
  background: linear-gradient(135deg, #faf5ff 0%, #eef6ff 100%);
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}

.ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  font-size: 19px;
}

.summary-title strong {
  color: #5b21b6;
  font-size: 16px;
}

.summary-title em {
  padding: 3px 9px;
  border: 1px solid #fdba74;
  border-radius: 6px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 12px;
  font-style: normal;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.summary-box,
.summary-actions {
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  padding: 12px;
}

.summary-box label,
.summary-actions label {
  display: block;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
}

.summary-box strong {
  color: #1f2937;
  font-size: 14px;
}

.symptom-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.symptom-list span {
  padding: 4px 9px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.summary-actions {
  margin-top: 10px;
}

.summary-actions p {
  position: relative;
  margin: 5px 0 5px 12px;
  color: #7e22ce;
  font-size: 13px;
}

.summary-actions p::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 8px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #9333ea;
}

.message-list,
.dialog-messages {
  flex: 1;
  padding: 14px 20px 18px;
  overflow-y: auto;
  background: #fff;
  box-sizing: border-box;
}

.message-list {
  min-height: 390px;
  max-height: 460px;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.ai,
.message-row.staff {
  justify-content: flex-start;
}

.message-row.patient {
  justify-content: flex-end;
}

.bubble {
  max-width: 82%;
  padding: 12px 14px;
  border-radius: 10px;
  box-sizing: border-box;
}

.message-row.ai .bubble {
  border: 1px solid #e9d8fd;
  background: #f8f1ff;
}

.message-row.patient .bubble {
  background: #f3f4f6;
  color: #1f2937;
}

.message-row.staff .bubble {
  background: #2f80ed;
  color: #fff;
}

.sender {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  font-size: 13px;
}

.sender span {
  color: #7e22ce;
}

.message-row.staff .sender span {
  color: #fff;
}

.sender em {
  padding: 2px 6px;
  border-radius: 5px;
  background: #dcc8ff;
  color: #6d28d9;
  font-size: 11px;
  font-style: normal;
}

.bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
}

.bubble time {
  display: block;
  margin-top: 7px;
  text-align: right;
  font-size: 12px;
  color: #9333ea;
}

.message-row.patient time {
  color: #6b7280;
}

.message-row.staff time {
  color: rgba(255, 255, 255, 0.78);
}

.reply-area {
  position: relative;
  padding: 14px 20px 18px;
  border-top: 1px solid #eef1f5;
}

.reply-area textarea,
.dialog-reply textarea {
  width: 100%;
  height: 64px;
  padding: 12px 14px;
  border: 1px solid #dfe4ec;
  border-radius: 9px;
  background: #f6f7f9;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.send-button {
  position: absolute;
  right: 24px;
  bottom: 35px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: #020617;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.reply-area small {
  display: block;
  margin-top: 9px;
  color: #9ca3af;
  font-size: 12px;
}

.info-panel {
  min-height: 820px;
  padding: 20px 18px;
}

.side-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 700;
}

.patient-card {
  text-align: center;
}

.patient-avatar {
  width: 82px;
  height: 82px;
  margin: 0 auto 12px;
  font-size: 28px;
}

.patient-card h4 {
  margin: 0 0 4px;
  font-size: 20px;
}

.patient-card > span {
  color: #7b8493;
  font-size: 14px;
}

.basic-info {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf0f4;
}

.basic-info > div {
  margin-bottom: 13px;
}

.basic-info label,
.doctor-team h4,
.deep-analysis h4 {
  display: block;
  margin-bottom: 7px;
  color: #8a94a6;
  font-size: 13px;
  font-weight: 400;
}

.basic-info strong {
  color: #1f2937;
  font-size: 15px;
  font-weight: 500;
}

.insurance {
  display: inline-block;
  padding: 6px 8px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8 !important;
  font-size: 13px !important;
}

.disease-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.disease-list span {
  padding: 4px 8px;
  border: 1px solid #d8dfeb;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 12px;
}

.doctor-team {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf0f4;
}

.doctor-team h4,
.deep-analysis h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.doctor-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #e8edf4;
  border-radius: 10px;
  background: #fbfcfe;
}

.doctor-avatar {
  width: 42px;
  height: 42px;
}

.doctor-name {
  gap: 7px;
  margin-bottom: 4px;
}

.doctor-name strong {
  font-size: 14px;
}

.doctor-name em {
  padding: 2px 7px;
  border-radius: 5px;
  color: #fff;
  font-size: 11px;
  font-style: normal;
}

.doctor-name em.red { background: #ef1b2e; }
.doctor-name em.blue { background: #2563eb; }
.doctor-name em.green { background: #16a34a; }

.doctor-item p {
  margin: 0;
  color: #8a94a6;
  font-size: 12px;
}

.deep-analysis {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf0f4;
}

.analysis-card {
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 10px;
}

.analysis-card.purple {
  background: #f6efff;
}

.analysis-card.blue {
  background: #eef6ff;
}

.analysis-card.green {
  background: #eefdf4;
}

.analysis-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.analysis-card.purple strong { color: #6d28d9; }
.analysis-card.blue strong { color: #1d4ed8; }
.analysis-card.green strong { color: #15803d; }

.analysis-card p {
  position: relative;
  margin: 5px 0 5px 12px;
  font-size: 12px;
  line-height: 1.45;
  color: #374151;
}

.analysis-card.blue p::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 7px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #2563eb;
}

.analysis-card.green p::before {
  content: "✓";
  position: absolute;
  left: -14px;
  top: 0;
  color: #16a34a;
  font-size: 11px;
}

.dialog-messages {
  min-height: 360px;
  max-height: 560px;
}

.dialog-messages.short {
  min-height: 280px;
  max-height: 390px;
}

.dialog-reply {
  position: relative;
  padding: 12px 20px 18px;
}

.dialog-reply .send-button {
  bottom: 30px;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .workspace {
    grid-template-columns: 230px minmax(380px, 1fr);
  }

  .info-panel {
    grid-column: 1 / -1;
    min-height: auto;
  }
}

@media (max-width: 900px) {
  .chat-manage-page {
    padding: 20px 14px 28px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .session-panel,
  .chat-panel,
  .info-panel {
    min-height: auto;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.chat-history-dialog,
.chat-reply-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.chat-history-dialog .el-dialog__header,
.chat-reply-dialog .el-dialog__header {
  margin: 0;
  padding: 20px 24px 12px;
}

.chat-history-dialog .el-dialog__body,
.chat-reply-dialog .el-dialog__body {
  padding: 0 20px 14px;
}

.dialog-title h3,
.reply-dialog-title h3 {
  margin: 0 0 5px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.dialog-title p,
.reply-dialog-title p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.reply-dialog-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 28px;
}

.reply-dialog-title .avatar {
  width: 42px;
  height: 42px;
}

.reply-dialog-title .urgent-label {
  display: inline-block;
  margin-left: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #ff4d5e;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
}

@media (max-width: 640px) {
  .chat-history-dialog,
  .chat-reply-dialog {
    width: calc(100vw - 24px) !important;
  }
}
</style>
