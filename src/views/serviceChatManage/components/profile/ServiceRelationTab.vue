<script setup>
import { computed, ref, watch } from 'vue'
import { getPatientServiceRelationsById } from '../../../../api/index.js'
import {
  MISSING_TEXT,
  RELATION_TYPE_TEXT,
  formatTime,
  isMissing
} from '../../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const data = ref(null)

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    data.value = await getPatientServiceRelationsById(String(props.patientId))
  } catch {
    data.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  () => fetchData(),
  { immediate: true }
)

// swagger 中 current 仅声明为 object，子字段名未定义；按候选键防御式取值，取不到按缺失口径展示
const current = computed(() => data.value?.current || {})
const logs = computed(() =>
  Array.isArray(data.value?.logs) ? data.value.logs : []
)

const resolveName = (value) => {
  if (isMissing(value)) return ''
  if (Array.isArray(value)) {
    return value.map((item) => resolveName(item)).filter(Boolean).join('、')
  }
  if (typeof value === 'object') {
    return value.name || value.userName || value.staffName || value.nickName || ''
  }
  return String(value)
}

const pick = (keys) => {
  const source = current.value
  for (const key of keys) {
    const name = resolveName(source[key])
    if (!isMissing(name)) return name
  }
  return ''
}

const pickTime = (keys) => {
  const source = current.value
  for (const key of keys) {
    if (!isMissing(source[key])) return formatTime(source[key])
  }
  return ''
}

// 当前服务关系 12 格（顺序对齐设计稿）；候选键外的字段均属「接口未提供」，待联调确认
const cells = computed(() => [
  { label: '服务客服', value: pick(['csName', 'serviceCsName', 'csStaffName', 'cs']) },
  { label: '服务陪诊师', value: pick(['caregiverName', 'escortName', 'caregiver']) },
  { label: '所属驻点', value: pick(['stationName', 'siteName', 'station']) },
  { label: '绑定医生', value: pick(['doctorName', 'boundDoctorName', 'doctor']) },
  {
    label: '健康管理医生团队',
    // 接口未提供：团队字段名待联调，兼容数组/字符串两种形态
    value: pick(['doctorTeamNames', 'teamNames', 'doctorTeam', 'team'])
  },
  {
    label: '剩余陪诊次数',
    value: (() => {
      const raw = pick(['remainingEscortCount', 'escortQuotaLeft', 'remainingCount', 'escortCount'])
      if (!raw) return ''
      return /次$/.test(raw) || Number.isNaN(Number(raw)) ? raw : `${raw}次`
    })()
  },
  { label: '最近陪诊时间', value: pickTime(['latestEscortTime', 'lastEscortTime', 'recentEscortTime']) },
  { label: '当前服务状态', value: pick(['serviceStatus', 'statusText', 'status']) },
  // 接口未提供：群状态/生效时间/驻点同步状态 swagger 均未定义
  { label: '健康管理群状态', value: pick(['groupStatus', 'healthGroupStatus', 'imGroupStatus']) },
  { label: '关系生效时间', value: pickTime(['effectiveTime', 'bindTime', 'effectiveDate', 'createTime']) },
  { label: '服务包', value: pick(['servicePackage', 'packageName', 'servicePackageName']) },
  { label: '驻点同步状态', value: pick(['stationSyncStatus', 'syncStatus', 'stationStatus']) }
])

// 服务角色三卡（描述语无接口字段，缺失显式红色兜底，不臆造文案）
const roleCards = computed(() => [
  {
    name: pick(['csName', 'serviceCsName', 'csStaffName', 'cs']),
    role: '服务客服',
    desc: pick(['csDesc', 'serviceCsDesc', 'csResponsibility'])
  },
  {
    name: pick(['caregiverName', 'escortName', 'caregiver']),
    role: '服务陪诊师',
    desc: pick(['caregiverDesc', 'escortDesc', 'caregiverResponsibility'])
  },
  {
    name: pick(['stationName', 'siteName', 'station']),
    role: '所属驻点',
    desc: pick(['stationDesc', 'siteDesc', 'stationSyncText'])
  }
])

const relationText = (type) => RELATION_TYPE_TEXT[type] || (isMissing(type) ? MISSING_TEXT : type)
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else>
      <section class="info-section">
        <h4>当前服务关系</h4>
        <p class="section-sub">信息来自用户管理仓，仅供查看</p>
        <div class="info-card">
          <div v-for="cell in cells" :key="cell.label" class="cell">
            <label>{{ cell.label }}</label>
            <p :class="{ missing: !cell.value }">{{ cell.value || MISSING_TEXT }}</p>
          </div>
        </div>
      </section>

      <section class="info-section">
        <h4>服务角色</h4>
        <div class="role-grid">
          <div v-for="card in roleCards" :key="card.role" class="role-card">
            <strong :class="{ missing: !card.name }">{{ card.name || MISSING_TEXT }}</strong>
            <span class="role-label">{{ card.role }}</span>
            <p :class="{ missing: !card.desc }">{{ card.desc || MISSING_TEXT }}</p>
          </div>
        </div>
      </section>

      <section class="info-section">
        <h4>关系变更记录</h4>
        <div v-if="logs.length" class="timeline">
          <div v-for="log in logs" :key="log.id" class="timeline-item">
            <span class="dot"></span>
            <div class="timeline-body">
              <div class="timeline-head">
                <el-tag size="small" type="primary" effect="plain">
                  {{ relationText(log.relationType) }}
                </el-tag>
                <span class="operator">
                  {{ isMissing(log.operatorName) ? MISSING_TEXT : log.operatorName }}
                </span>
                <span class="time">{{ formatTime(log.createTime) }}</span>
              </div>
              <p v-if="!isMissing(log.reason)" class="reason">原因：{{ log.reason }}</p>
              <p class="id-change">
                变更前 ID：{{ isMissing(log.beforeId) ? MISSING_TEXT : log.beforeId }}
                ｜变更后 ID：{{ isMissing(log.afterId) ? MISSING_TEXT : log.afterId }}
              </p>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无关系变更记录" :image-size="80" />
      </section>

      <div class="readonly-note">
        客服端仅可查看服务关系。修改客服、陪诊师、驻点或绑定医生，请进入用户管理仓并根据权限操作。
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.section-sub {
  margin: 6px 0 12px;
  font-size: 12px;
  color: #94a3b8;
}

.info-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px 24px;
  padding: 22px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cell label {
  font-size: 12px;
  color: #94a3b8;
}

.cell p {
  margin: 0;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.role-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.role-card strong {
  font-size: 15px;
  color: #1f2937;
}

.role-label {
  font-size: 12px;
  color: #2563eb;
}

.role-card p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0 4px 8px;
}

.timeline-item {
  position: relative;
  padding-left: 20px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 14px;
  bottom: -18px;
  width: 1px;
  background: #e2e8f0;
}

.timeline-item:last-child::before {
  display: none;
}

.dot {
  position: absolute;
  left: 0;
  top: 5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2563eb;
}

.timeline-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.operator {
  font-size: 13px;
  color: #334155;
}

.time {
  font-size: 12px;
  color: #94a3b8;
}

.reason {
  margin: 6px 0 0;
  font-size: 12px;
  color: #475569;
}

.id-change {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.readonly-note {
  padding: 14px 18px;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #b45309;
  background: #fffbeb;
}

.block-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .info-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .role-grid {
    grid-template-columns: 1fr;
  }
}
</style>