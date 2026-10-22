<template>
  <div class="push-manage-container">
    <div class="page-header">
      <h2>推送管理</h2>
      <p>将患者信息和AI分析推送给绑定的医生团队</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-head"><span>总推送数</span><el-icon class="stat-icon gray"><Bell /></el-icon></div>
        <strong>3</strong><small>全部推送记录</small>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>已读推送</span><el-icon class="stat-icon green"><View /></el-icon></div>
        <strong class="text-green">2</strong><small>医生已查看</small>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>未读推送</span><el-icon class="stat-icon orange"><MuteNotification /></el-icon></div>
        <strong class="text-orange">1</strong><small>待查看</small>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>查看率</span><el-icon class="stat-icon purple"><TrendCharts /></el-icon></div>
        <strong class="text-purple">66.7%</strong><small>医生响应</small>
      </div>
    </div>
    <div class="tab-switch">
      <button class="tab-btn" :class="{ active: activeTab === 'create' }" @click="activeTab = 'create'">创建推送</button>
      <button class="tab-btn" :class="{ active: activeTab === 'record' }" @click="activeTab = 'record'">推送记录</button>
    </div>
    <div v-if="activeTab === 'create'" class="create-layout">
      <section class="panel patient-panel">
        <h3>选择患者</h3>
        <p class="panel-desc">从聊天管理中选择需要推送的患者</p>
        <div class="search-box">
          <el-icon><Search /></el-icon>
          <input v-model.trim="keyword" type="text" placeholder="搜索患者姓名或ID..." />
        </div>
        <div class="patient-list">
          <div v-for="patient in filteredPatients" :key="patient.id" class="patient-card"
            :class="{ selected: selectedPatient && selectedPatient.id === patient.id, urgent: patient.urgent }"
            @click="choosePatient(patient)">
            <div class="avatar avatar-lg" :style="{ background: patient.avatarColor }">
              <img :src="patient.avatar" :alt="patient.name" @error="hideImage" /><span>{{ patient.name.slice(0, 1) }}</span>
            </div>
            <div class="patient-main">
              <div class="patient-title-row"><span class="patient-name">{{ patient.name }}</span><span v-if="patient.urgent" class="badge badge-red">紧急</span></div>
              <div class="patient-id">{{ patient.id }}</div>
              <div v-if="patient.urgent" class="urgent-line"><el-icon><WarningFilled /></el-icon><span>{{ patient.urgentText }}</span></div>
              <div class="tag-row"><span v-for="tag in patient.diseaseTags" :key="tag" class="outline-tag">{{ tag }}</span></div>
              <div class="team-text">医生团队：{{ patient.teamCount }}人</div>
            </div>
          </div>
        </div>
      </section>
      <section class="panel setting-panel">
        <div v-if="!selectedPatient" class="empty-state">
          <el-icon class="empty-icon"><User /></el-icon><p class="empty-title">请从左侧选择患者</p><p>选择后可查看详情并创建推送</p>
        </div>
        <div v-else class="setting-content">
          <div class="section-heading dark"><el-icon><UserFilled /></el-icon><span>患者信息和推送设置</span></div>
          <div class="selected-disease"><span class="outline-tag">{{ selectedPatient.diseaseTags[0] }}</span></div>
          <div class="insight-grid">
            <div class="insight-panel ai-panel">
              <div class="section-heading purple"><el-icon><MagicStick /></el-icon><span>AI沟通关键点</span></div>
              <div v-for="group in selectedPatient.aiGroups" :key="group.title" class="ai-group">
                <div class="group-head"><strong>{{ group.title }}</strong><span class="level-tag danger">高</span></div>
                <ul><li v-for="point in group.points" :key="point"><el-icon><MagicStick /></el-icon><span>{{ point }}</span></li></ul>
              </div>
            </div>
            <div class="insight-panel chat-panel">
              <div class="section-heading blue"><el-icon><ChatDotSquare /></el-icon><span>患者沟通关键点</span></div>
              <div v-for="chat in selectedPatient.chatPoints" :key="chat.time" class="chat-entry">
                <div class="chat-head"><span>{{ chat.time }}</span><span class="level-tag" :class="chat.level === '重要' ? 'danger' : 'warning'">{{ chat.level }}</span></div>
                <p>{{ chat.message }}</p>
              </div>
            </div>
          </div>
          <div class="doctor-section">
            <div class="section-heading dark doctor-heading"><el-icon><UserFilled /></el-icon><span>选择推送医生（按优先级排序）</span></div>
            <label v-for="doctor in selectedPatient.doctors" :key="doctor.id" class="doctor-card">
              <input v-model="selectedDoctorIds" type="checkbox" :value="doctor.id" />
              <div class="avatar avatar-md" :style="{ background: doctor.avatarColor }">
                <img :src="doctor.avatar" :alt="doctor.name" @error="hideImage" /><span>{{ doctor.name.slice(0, 1) }}</span>
              </div>
              <div class="doctor-info">
                <div class="doctor-name-row"><strong>{{ doctor.name }}</strong><span class="badge" :class="doctorTitleClass(doctor.title)">{{ doctor.title }}</span></div>
                <p>{{ doctor.department }} · 优先级{{ doctor.priority }}</p>
              </div>
            </label>
          </div>
          <div class="remark-block"><h4>附加说明（可选）</h4><textarea v-model="remark" placeholder="输入需要特别说明的内容..."></textarea></div>
          <button class="push-button" :disabled="selectedDoctorIds.length === 0" @click="handlePush"><el-icon><Promotion /></el-icon>推送给 {{ selectedDoctorIds.length }} 位医生</button>
        </div>
      </section>
    </div>
    <div v-else class="panel records-panel">
      <h3>推送记录列表</h3><p class="panel-desc">查看所有推送记录和医生查看状态</p>
      <div class="record-list">
        <div v-for="record in pushRecords" :key="record.recordId" class="record-card">
          <div class="record-header">
            <div class="record-patient">
              <div class="avatar avatar-lg" :style="{ background: record.avatarColor }">
                <img :src="record.avatar" :alt="record.name" @error="hideImage" /><span>{{ record.name.slice(0, 1) }}</span>
              </div>
              <div class="record-patient-info">
                <div class="record-name-row">
                  <strong>{{ record.name }}</strong><span class="id-pill">{{ record.id }}</span>
                  <span class="push-target">推送给：{{ record.doctorName }}</span>
                  <span class="badge" :class="doctorTitleClass(record.doctorTitle)">{{ record.doctorTitle }}</span>
                </div>
                <div class="tag-row record-tags"><span v-for="tag in record.diseaseTags" :key="tag" class="gray-tag">{{ tag }}</span></div>
              </div>
            </div>
            <span class="status-pill" :class="record.read ? 'read' : 'unread'">
              <el-icon>
                <View v-if="record.read" />
                <MuteNotification v-else />
              </el-icon>{{ record.read ? '已读' : '未读' }}
            </span>
          </div>
          <div class="record-summary-grid">
            <div class="summary-box ai-summary"><strong>AI关键点：{{ record.aiCount }}项</strong><p>{{ record.aiBrief }}</p></div>
            <div class="summary-box chat-summary"><strong>患者沟通：{{ record.chatCount }}条</strong><p>最近{{ record.lastChatDate }}</p></div>
          </div>
          <div class="record-footer">
            <div class="record-times">
              <span class="time-text"><el-icon><Clock /></el-icon>推送时间：{{ record.pushTime }}</span>
              <span v-if="record.read" class="read-time"><el-icon><CircleCheck /></el-icon>查看时间：{{ record.readTime }}</span>
            </div>
            <div class="record-actions">
              <button @click="openDetail(record)"><el-icon><View /></el-icon>查看详情</button>
              <button @click="rePush(record)"><el-icon><RefreshRight /></el-icon>再次推送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <el-dialog v-model="detailVisible" class="push-detail-dialog" width="560px" :show-close="true">
      <template #header>
        <div v-if="currentRecord.id" class="dialog-title">
          <div class="avatar avatar-md" :style="{ background: currentRecord.avatarColor }">
            <img :src="currentRecord.avatar" :alt="currentRecord.name" @error="hideImage" /><span>{{ currentRecord.name.slice(0, 1) }}</span>
          </div>
          <div><h3>推送详情</h3><p>{{ currentRecord.name }} → {{ currentRecord.doctorName }}</p></div>
        </div>
      </template>
      <template v-if="currentRecord.id">
        <div class="dialog-status">
          <div><label>推送时间</label><strong>{{ currentRecord.pushTime }}</strong></div>
          <div><label>查看状态</label><span class="dialog-status-pill" :class="currentRecord.read ? 'read' : 'unread'">
            <el-icon>
              <CircleCheck v-if="currentRecord.read" />
              <MuteNotification v-else />
            </el-icon>{{ currentRecord.read ? `已读于 ${currentRecord.readTime}` : '未读' }}
          </span></div>
        </div>
        <section class="dialog-card">
          <h4>患者基本信息</h4>
          <div class="dialog-info-grid">
            <div><span>患者ID：</span>{{ currentRecord.id }}</div>
            <div><span>性别/年龄：</span>{{ currentRecord.genderAge }}</div>
            <div><span>联系电话：</span>{{ currentRecord.phone }}</div>
            <div><span>保险单号：</span>{{ currentRecord.insuranceNo }}</div>
            <div class="full-line"><span>疾病信息：</span><span v-for="tag in currentRecord.diseaseTags" :key="tag" class="gray-tag">{{ tag }}</span></div>
          </div>
        </section>
        <section class="dialog-insight ai-panel">
          <h4>AI沟通关键点</h4>
          <div v-for="group in currentRecord.aiGroups" :key="group.title" class="ai-group">
            <div class="group-head"><strong>{{ group.title }}</strong><span class="level-tag danger">高优先级</span></div>
            <ul><li v-for="point in group.points" :key="point"><el-icon><MagicStick /></el-icon><span>{{ point }}</span></li></ul>
          </div>
        </section>
        <section class="dialog-insight chat-panel">
          <h4>患者沟通关键点</h4>
          <div v-for="chat in currentRecord.chatPoints" :key="chat.time" class="chat-entry">
            <div class="chat-head"><span>{{ chat.time }}</span><span class="level-tag" :class="chat.level === '重要' ? 'danger' : 'warning'">{{ chat.level }}</span></div><p>{{ chat.message }}</p>
          </div>
        </section>
      </template>
      <template #footer>
        <div v-if="currentRecord.id" class="dialog-footer-actions">
          <button class="dialog-close" @click="detailVisible = false">关闭</button>
          <button class="dark-button" @click="rePush(currentRecord)"><el-icon><RefreshRight /></el-icon>再次推送</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Bell,
  ChatDotSquare,
  CircleCheck,
  Clock,
  MagicStick,
  MuteNotification,
  Promotion,
  RefreshRight,
  Search,
  TrendCharts,
  User,
  UserFilled,
  View,
  WarningFilled
} from '@element-plus/icons-vue'

const activeTab = ref('create')
const keyword = ref('')
const selectedPatient = ref(null)
const selectedDoctorIds = ref([])
const remark = ref('')
const detailVisible = ref(false)
const currentRecord = ref({})

const pediatricDoctors = [
  { id: 1, name: '周医生', title: '主治', department: '儿科', priority: 2, avatar: 'https://randomuser.me/api/portraits/men/44.jpg', avatarColor: '#7c3aed' },
  { id: 2, name: '孙主任', title: '主任', department: '儿科', priority: 3, avatar: 'https://randomuser.me/api/portraits/women/65.jpg', avatarColor: '#db2777' }
]

const patientList = ref([
  {
    id: 'P10086',
    name: '张小美',
    teamCount: 3,
    urgent: false,
    urgentText: '',
    diseaseTags: ['孕期头晕', '轻度贫血'],
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    avatarColor: '#b91c1c',
    aiGroups: [{ title: '孕期评估', points: ['贫血指标偏低', '头晕多为孕中期常见症状', '建议近期复查血常规'] }],
    chatPoints: [{ time: '2026-02-04 10:25:00', message: '最近经常头晕怎么办？', level: '重要' }],
    doctors: [{ id: 11, name: '陈医生', title: '住院', department: '妇产科', priority: 1, avatar: 'https://randomuser.me/api/portraits/men/32.jpg', avatarColor: '#0284c7' }]
  },
  {
    id: 'P10087',
    name: '李明',
    teamCount: 2,
    urgent: false,
    urgentText: '',
    diseaseTags: ['感冒', '轻度咳嗽'],
    avatar: 'https://randomuser.me/api/portraits/men/59.jpg',
    avatarColor: '#0f766e',
    aiGroups: [{ title: '症状分析', points: ['上呼吸道感染', '暂无持续发热表现', '建议对症处理并观察'] }],
    chatPoints: [{ time: '2026-02-04 11:10:00', message: '咳嗽一直不好', level: '一般' }],
    doctors: [{ id: 12, name: '吴医生', title: '主治', department: '呼吸内科', priority: 1, avatar: 'https://randomuser.me/api/portraits/men/51.jpg', avatarColor: '#2563eb' }]
  },
  {
    id: 'P10088',
    name: '王芳',
    teamCount: 2,
    urgent: true,
    urgentText: '儿童发热，体温39度',
    diseaseTags: ['儿童发热'],
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    avatarColor: '#be123c',
    aiGroups: [
      { title: '紧急情况', points: ['儿童发热，体温39度', '需立即关注', '患者情绪焦虑'] },
      { title: '处理建议', points: ['建议立即物理降温', '可服用儿童退烧药', '密切观察体温变化', '如持续高热建议急诊'] }
    ],
    chatPoints: [
      { time: '2026-02-04 14:25:00', message: '孩子发烧到39度了，怎么办？', level: '重要' },
      { time: '2026-02-04 14:15:00', message: '您好，孩子突然发烧了', level: '重要' }
    ],
    doctors: pediatricDoctors
  },
  {
    id: 'P10089',
    name: '赵强',
    teamCount: 1,
    urgent: false,
    urgentText: '',
    diseaseTags: ['腰椎间盘突出', '慢性腰痛'],
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    avatarColor: '#334155',
    aiGroups: [{ title: '病情评估', points: ['慢性腰痛，活动受限', '建议结合影像复查', '避免久坐和负重'] }],
    chatPoints: [{ time: '2026-02-03 09:10:00', message: '腰反复疼', level: '一般' }],
    doctors: [{ id: 13, name: '郑医生', title: '主治', department: '骨科', priority: 1, avatar: 'https://randomuser.me/api/portraits/men/29.jpg', avatarColor: '#475569' }]
  }
])

const pushRecords = ref([
  {
    recordId: 1,
    id: 'P10086',
    name: '张小美',
    doctorName: '陈医生',
    doctorTitle: '住院',
    diseaseTags: ['孕期头晕', '轻度贫血'],
    read: true,
    aiCount: 4,
    aiBrief: '症状分析等',
    chatCount: 3,
    lastChatDate: '2026-02-04',
    pushTime: '2026-02-04 14:35:00',
    readTime: '2026-02-04 14:40:00',
    genderAge: '女 / 28岁',
    phone: '134****3456',
    insuranceNo: 'INS-2024-006789',
    avatar: patientList.value[0].avatar,
    avatarColor: patientList.value[0].avatarColor,
    aiGroups: [{ title: '孕期评估', points: ['贫血指标偏低', '头晕多为孕中期常见症状', '建议近期复查血常规'] }],
    chatPoints: [{ time: '2026-02-04 10:25:00', message: '最近经常头晕怎么办？', level: '重要' }]
  },
  {
    recordId: 2,
    id: 'P10088',
    name: '王芳',
    doctorName: '周医生',
    doctorTitle: '主治',
    diseaseTags: ['儿童发热'],
    read: false,
    aiCount: 2,
    aiBrief: '紧急情况等',
    chatCount: 2,
    lastChatDate: '2026-02-04',
    pushTime: '2026-02-04 14:30:00',
    readTime: '',
    genderAge: '女 / 35岁',
    phone: '132****1234',
    insuranceNo: 'INS-2024-006790',
    avatar: patientList.value[2].avatar,
    avatarColor: patientList.value[2].avatarColor,
    aiGroups: patientList.value[2].aiGroups,
    chatPoints: patientList.value[2].chatPoints
  },
  {
    recordId: 3,
    id: 'P10091',
    name: '刘洋',
    doctorName: '杨医生',
    doctorTitle: '主治',
    diseaseTags: ['高血压', '血压不稳'],
    read: true,
    aiCount: 3,
    aiBrief: '病情监测等',
    chatCount: 2,
    lastChatDate: '2026-02-04',
    pushTime: '2026-02-04 14:20:00',
    readTime: '2026-02-04 14:25:00',
    genderAge: '男 / 62岁',
    phone: '134****3456',
    insuranceNo: 'INS-2024-006789',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    avatarColor: '#3f3f46',
    aiGroups: [
      { title: '病情监测', points: ['血压波动明显', '需要调整用药方案', '患者依从性良好'] },
      { title: '检查建议', points: ['建议24小时动态血压监测', '评估血压波动规律'] },
      { title: '用药调整', points: ['可能需要调整降压药剂量', '建议复诊评估'] }
    ],
    chatPoints: [
      { time: '2026-02-04 14:18:00', message: '血压一直不稳定，是什么原因？', level: '重要' },
      { time: '2026-01-25 16:20:00', message: '降压药是否需要调整？', level: '一般' }
    ]
  }
])

const filteredPatients = computed(() => {
  const search = keyword.value.toLowerCase()
  if (!search) return patientList.value
  return patientList.value.filter((patient) => {
    return patient.name.toLowerCase().includes(search) || patient.id.toLowerCase().includes(search)
  })
})

const choosePatient = (patient) => {
  selectedPatient.value = patient
  selectedDoctorIds.value = []
}

const doctorTitleClass = (title) => {
  if (title === '主任') return 'badge-green'
  if (title === '住院') return 'badge-red'
  return 'badge-blue'
}

const hideImage = (event) => {
  event.target.style.display = 'none'
}

const handlePush = () => {
  if (!selectedPatient.value || selectedDoctorIds.value.length === 0) return
  ElMessage.success(`已推送给 ${selectedDoctorIds.value.length} 位医生`)
}

const openDetail = (record) => {
  currentRecord.value = record
  detailVisible.value = true
}

const rePush = (record) => {
  ElMessage.success(`已再次推送：${record.name}`)
}
</script>

<style scoped>
.push-manage-container {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f4f7fb;
  color: #1f2937;
  box-sizing: border-box;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 700;
}

.page-header p {
  margin: 0 0 22px;
  font-size: 16px;
  color: #5f6b7a;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.stat-card {
  min-height: 128px;
  padding: 22px 24px 18px;
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 6px 18px rgba(31, 41, 55, 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.08);
}

.stat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 15px;
}

.stat-icon.gray { color: #8b93a1; font-size: 20px; }
.stat-icon.green { color: #16b364; font-size: 20px; }
.stat-icon.orange { color: #ff7a1a; font-size: 20px; }
.stat-icon.purple { color: #9333ea; font-size: 20px; }

.stat-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 30px;
  line-height: 1;
  color: #111827;
}

.text-green { color: #16a34a !important; }
.text-orange { color: #f04400 !important; }
.text-purple { color: #9333ea !important; }

.stat-card small {
  font-size: 13px;
  color: #7b8493;
}

.tab-switch {
  display: flex;
  gap: 28px;
  margin-bottom: 18px;
  border-bottom: 1px solid #e4e8f0;
}

.tab-btn {
  position: relative;
  height: 46px;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: #5f6b7a;
  font-size: 16px;
  cursor: pointer;
}

.tab-btn.active {
  color: #2563eb;
  font-weight: 600;
}

.tab-btn.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: #2563eb;
}

.create-layout {
  display: grid;
  grid-template-columns: minmax(360px, 486px) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.panel {
  border: 1px solid #e6e9f0;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.patient-panel,
.setting-panel,
.records-panel {
  padding: 24px 22px;
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
}

.panel-desc {
  margin: 0 0 18px;
  font-size: 16px;
  color: #8a93a3;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  margin-bottom: 18px;
  padding: 0 14px;
  border-radius: 7px;
  background: #f3f4f7;
  color: #9aa2af;
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
}

.patient-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patient-card {
  display: flex;
  gap: 14px;
  min-height: 118px;
  padding: 16px 14px;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.patient-card:hover {
  border-color: #b9d2fb;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.08);
}

.patient-card.selected {
  border-color: #3f7feb;
  background: #eef6ff;
  box-shadow: 0 7px 18px rgba(37, 99, 235, 0.12);
}

.patient-card.urgent {
  border-color: #ffc9c9;
  background: #fff5f5;
}

.patient-card.urgent.selected {
  border-color: #8fb4f7;
  background: #eef6ff;
}

.avatar {
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

.avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-lg { width: 48px; height: 48px; font-size: 18px; }
.avatar-md { width: 40px; height: 40px; font-size: 15px; }

.patient-main { flex: 1; min-width: 0; }
.patient-title-row,
.doctor-name-row,
.record-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-name { font-size: 17px; font-weight: 600; }
.patient-id { margin: 3px 0 6px; font-size: 14px; color: #6b7280; }

.urgent-line {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 2px 0 6px;
  font-size: 13px;
  color: #e11d2e;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.outline-tag,
.gray-tag,
.badge,
.level-tag,
.status-pill,
.dialog-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
}

.outline-tag {
  border: 1px solid #cfd6df;
  background: #fff;
  color: #333b46;
}

.gray-tag {
  background: #f0f2f5;
  color: #333b46;
}

.team-text {
  margin-top: 6px;
  font-size: 13px;
  color: #9aa2af;
}

.setting-panel { min-height: 760px; }

.empty-state {
  min-height: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a0a8b5;
}

.empty-icon { margin-bottom: 18px; font-size: 64px; color: #c3c9d3; }
.empty-state p { margin: 0 0 10px; font-size: 18px; color: #9aa3b1; }
.empty-state .empty-title { color: #8f98a6; }

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 17px;
  font-weight: 700;
}

.section-heading.dark { color: #20242a; }
.section-heading.purple { color: #6d28d9; }
.section-heading.blue { color: #254b9a; }

.selected-disease { min-height: 42px; margin-bottom: 14px; }

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.insight-panel {
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 0;
  box-sizing: border-box;
}

.ai-panel {
  border: 1px solid #eadcff;
  background: #fbf5ff;
}

.chat-panel {
  border: 1px solid #dceaff;
  background: #eef6ff;
}

.ai-group,
.chat-entry {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: #fff;
  box-shadow: 0 4px 12px rgba(76, 29, 149, 0.04);
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #5d319f;
}

.group-head strong { font-size: 14px; }
.level-tag.danger { color: #e11d48; background: #ffe9ec; }
.level-tag.warning { color: #d97706; background: #fff2df; }

.ai-group ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ai-group li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 7px 0;
  font-size: 14px;
  color: #374151;
}

.ai-group li .el-icon { margin-top: 2px; color: #a855f7; }

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
  font-size: 13px;
  color: #6b7280;
}

.chat-entry p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: #1f2937;
}

.doctor-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid #e4e8ef;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.doctor-card:hover {
  border-color: #b9d2fb;
  background: #fbfdff;
}

.doctor-card:has(input:checked) {
  border-color: #60a5fa;
  background: #f5f9ff;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.1);
}

.doctor-card input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}

.doctor-info { flex: 1; min-width: 0; }
.doctor-info strong { font-size: 15px; }
.doctor-info p { margin: 5px 0 0; font-size: 13px; color: #7b8493; }

.badge-red { background: #ff6b72; color: #fff; }
.badge-blue { background: #2f80ed; color: #fff; }
.badge-green { background: #19b66a; color: #fff; }

.remark-block { margin-top: 16px; }
.remark-block h4 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
}

.remark-block textarea {
  width: 100%;
  height: 58px;
  padding: 12px;
  resize: none;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  background: #f8fafc;
  font: inherit;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}

.remark-block textarea:focus {
  border-color: #60a5fa;
  background: #fff;
}

.push-button {
  width: 100%;
  height: 48px;
  margin-top: 14px;
  border: 0;
  border-radius: 7px;
  background: #7f8490;
  color: #fff;
  font-size: 16px;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.push-button:not(:disabled) {
  background: #2f6fed;
  cursor: pointer;
}

.record-card {
  padding: 18px 20px;
  border: 1px solid #e5e8ef;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.record-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.record-patient {
  display: flex;
  gap: 14px;
  min-width: 0;
}

.record-patient-info { min-width: 0; }
.record-name-row { flex-wrap: wrap; }
.record-name-row strong { font-size: 18px; }

.id-pill {
  padding: 2px 8px;
  border: 1px solid #d8dde6;
  border-radius: 6px;
  color: #4b5563;
  font-size: 13px;
}

.push-target {
  font-size: 15px;
  color: #4b5563;
}

.status-pill.read {
  background: #10b96a;
  color: #fff;
}

.status-pill.unread {
  background: #ff6b1a;
  color: #fff;
}

.record-tags { margin-top: 8px; }

.record-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 14px 0;
}

.summary-box {
  min-height: 62px;
  padding: 12px 14px;
  border-radius: 8px;
  box-sizing: border-box;
}

.ai-summary {
  border: 1px solid #e9d8fd;
  background: #fbf5ff;
}

.chat-summary {
  border: 1px solid #d8e9ff;
  background: #eef6ff;
}

.summary-box strong {
  display: block;
  margin-bottom: 7px;
  font-size: 14px;
  color: #5b21b6;
}

.chat-summary strong {
  color: #1d4ed8;
}

.summary-box p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.record-times {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.time-text,
.read-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.read-time {
  color: #16a34a;
}

.record-actions {
  display: flex;
  gap: 10px;
}

.record-actions button {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #d9dee7;
  border-radius: 7px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.record-actions button:first-child {
  border-color: #93b7fb;
  background: #f8fbff;
  color: #2563eb;
}

.record-actions button:last-child {
  color: #374151;
}

.dialog-insight.ai-panel h4 {
  color: #7e22ce;
}

.dialog-insight.chat-panel h4 {
  color: #1d4ed8;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .create-layout {
    grid-template-columns: 1fr;
  }

  .setting-panel {
    min-height: auto;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .push-manage-container {
    padding: 20px 14px 28px;
  }

  .stats-grid,
  .record-summary-grid {
    grid-template-columns: 1fr;
  }

  .record-header,
  .record-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .record-actions {
    justify-content: flex-end;
  }
}
</style>

<style>
.push-detail-dialog {
  border-radius: 10px;
  overflow: hidden;
}

.push-detail-dialog .el-dialog__header {
  margin: 0;
  padding: 20px 24px 14px;
  border-bottom: 0;
}

.push-detail-dialog .el-dialog__body {
  padding: 0 28px 12px;
}

.push-detail-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
}

.push-detail-dialog .el-dialog__headerbtn {
  top: 18px;
  right: 20px;
  width: 28px;
  height: 28px;
  font-size: 20px;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 30px;
}

.dialog-title h3 {
  margin: 0 0 4px;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 700;
  color: #111827;
}

.dialog-title p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.dialog-status {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e7eaf0;
  border-radius: 9px;
  background: #f8fafc;
  box-sizing: border-box;
}

.dialog-status label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.dialog-status strong {
  font-size: 15px;
  color: #1f2937;
}

.dialog-status-pill.read {
  height: 28px;
  border-radius: 8px;
  background: #10b96a;
  color: #fff;
}

.dialog-status-pill.unread {
  height: 28px;
  border-radius: 8px;
  background: #ff6b1a;
  color: #fff;
}

.dialog-card {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid #e5e8ef;
  border-radius: 9px;
  background: #f8fafc;
  box-sizing: border-box;
}

.dialog-card h4,
.dialog-insight h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.dialog-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  font-size: 14px;
  color: #374151;
}

.dialog-info-grid span {
  color: #6b7280;
}

.dialog-info-grid .full-line {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.dialog-insight {
  margin-top: 14px;
  padding: 16px;
  border-radius: 9px;
  box-sizing: border-box;
}

.dialog-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-close,
.dark-button {
  height: 40px;
  padding: 0 20px;
  border-radius: 7px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.dialog-close {
  border: 1px solid #d8dde7;
  background: #fff;
  color: #1f2937;
}

.dark-button {
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
}

@media (max-width: 640px) {
  .push-detail-dialog {
    width: calc(100vw - 28px) !important;
  }

  .dialog-status,
  .dialog-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
