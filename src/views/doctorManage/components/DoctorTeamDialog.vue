<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { getDoctorTeamById, getDictOptions } from '../../../api/index.js'
import { MISSING_TEXT, isMissing, shortTitle } from '../../../utils/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  doctorId: { type: [String, Number], default: null },
  doctorName: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const dialogVisible = ref(props.visible)
watch(
  () => props.visible,
  (value) => {
    dialogVisible.value = value
  }
)
watch(dialogVisible, (value) => {
  if (!value) emit('close')
})

const loading = ref(false)
const team = ref({ doctor: {}, manager: {}, children: [], grandchildren: [] })
const dict = ref({ hospitals: [], areas: [], departments: [] })

const resolveName = (doc, nameKey, idKey, map) => {
  if (!isMissing(doc?.[nameKey])) return doc[nameKey]
  const id = doc?.[idKey]
  if (isMissing(id)) return MISSING_TEXT
  return map.get(String(id)) || `ID: ${id}`
}

const maps = computed(() => ({
  hospital: new Map(dict.value.hospitals.map((item) => [String(item.id), item.name])),
  area: new Map(dict.value.areas.map((item) => [String(item.id), item.name])),
  department: new Map(dict.value.departments.map((item) => [String(item.id), item.name]))
}))

// 卡片信息行：区域 / 医院 / 科室 / 电话 / 负责用户
const infoLines = (doc) => {
  const map = maps.value
  return [
    { label: '区域', value: resolveName(doc, 'areaName', 'areaId', map.area) },
    { label: '医院', value: resolveName(doc, 'hospitalName', 'hospitalId', map.hospital) },
    { label: '科室', value: resolveName(doc, 'departmentName', 'departmentId', map.department) },
    { label: '电话', value: isMissing(doc?.phone) ? MISSING_TEXT : doc.phone },
    {
      label: '负责用户',
      value: isMissing(doc?.patientCount) ? MISSING_TEXT : `${Number(doc.patientCount)} 人`
    }
  ]
}

const hasManager = computed(() => team.value.manager && !isMissing(team.value.manager.id))

// 隔级下级按 managerId 归属到直接下级；匹配不到的归入「其他下级」
const groupedGrandchildren = computed(() => {
  const groups = new Map()
  const others = []
  const childIds = new Set((team.value.children || []).map((item) => String(item.id)))
  ;(team.value.grandchildren || []).forEach((item) => {
    const managerId = item.managerId ? String(item.managerId) : ''
    if (managerId && childIds.has(managerId)) {
      if (!groups.has(managerId)) groups.set(managerId, [])
      groups.get(managerId).push(item)
    } else {
      others.push(item)
    }
  })
  return { groups, others }
})

const grandchildrenOf = (childId) => groupedGrandchildren.value.groups.get(String(childId)) || []
const otherGrandchildren = computed(() => groupedGrandchildren.value.others)

const hasSubordinates = computed(
  () => (team.value.children?.length || 0) + (team.value.grandchildren?.length || 0) > 0
)

const fetchTeam = async () => {
  if (!props.doctorId) return
  loading.value = true
  try {
    const [teamResult, dictResult] = await Promise.allSettled([
      getDoctorTeamById(String(props.doctorId)),
      getDictOptions()
    ])
    const data = teamResult.status === 'fulfilled' ? teamResult.value : null
    team.value = {
      doctor: data?.doctor || {},
      manager: data?.manager || {},
      children: Array.isArray(data?.children) ? data.children : [],
      grandchildren: Array.isArray(data?.grandchildren) ? data.grandchildren : []
    }
    const dictData = dictResult.status === 'fulfilled' ? dictResult.value : null
    dict.value = {
      hospitals: Array.isArray(dictData?.hospitals) ? dictData.hospitals : [],
      areas: Array.isArray(dictData?.areas) ? dictData.areas : [],
      departments: Array.isArray(dictData?.departments) ? dictData.departments : []
    }
    if (teamResult.status === 'rejected') {
      ElMessage.error(teamResult.reason?.message || '团队结构加载失败')
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) fetchTeam()
  }
)
</script>
<template>
  <el-dialog
    v-model="dialogVisible"
    width="720"
    append-to-body
    destroy-on-close
    class="team-dialog"
  >
    <template #header>
      <div class="dialog-heading">
        <h3>团队结构</h3>
        <p>{{ doctorName || team.doctor?.name }} 的医疗团队</p>
      </div>
    </template>

    <div v-loading="loading" class="team-scroll">
      <!-- 上级医生（无上级时不展示） -->
      <div v-if="hasManager" class="member-card manager-card">
        <div class="member-head">
          <span class="member-role">上级医生</span>
          <span class="title-tag title-tag-light">{{ shortTitle(team.manager.title) }}</span>
        </div>
        <div class="member-name">{{ team.manager.name || MISSING_TEXT }}</div>
        <div v-for="line in infoLines(team.manager)" :key="line.label" class="member-info">
          {{ line.label }}：{{ line.value }}
        </div>
      </div>

      <!-- 本人 -->
      <div class="member-card root-card">
        <div class="member-head">
          <span class="member-name">{{ team.doctor.name || MISSING_TEXT }}</span>
          <span class="title-tag title-tag-dark">
            {{ shortTitle(team.doctor.title) }}
          </span>
        </div>
        <div v-for="line in infoLines(team.doctor)" :key="line.label" class="member-info">
          {{ line.label }}：{{ line.value }}
        </div>
      </div>

      <!-- 下级医生 -->
      <template v-if="hasSubordinates">
        <div class="sub-title">
          <el-icon><UserFilled /></el-icon>
          <span>下级医生</span>
        </div>

        <div class="sub-tree">
          <div v-for="child in team.children" :key="String(child.id)" class="member-card sub-card">
            <div class="member-head">
              <span class="member-name">{{ child.name || MISSING_TEXT }}</span>
              <span class="title-tag title-tag-light">{{ shortTitle(child.title) }}</span>
            </div>
            <div v-for="line in infoLines(child)" :key="line.label" class="member-info">
              {{ line.label }}：{{ line.value }}
            </div>

            <!-- 隔级下级：浅灰紧凑卡片，仅展示姓名/职称/负责用户 -->
            <div v-if="grandchildrenOf(child.id).length" class="compact-inner">
              <div
                v-for="grand in grandchildrenOf(child.id)"
                :key="String(grand.id)"
                class="compact-card"
              >
                <div class="compact-head">
                  <span class="compact-name">{{ grand.name || MISSING_TEXT }}</span>
                  <span class="title-tag title-tag-plain">{{ shortTitle(grand.title) }}</span>
                </div>
                <div class="compact-info">
                  负责用户：{{ isMissing(grand.patientCount) ? MISSING_TEXT : `${grand.patientCount} 人` }}
                </div>
              </div>
            </div>
          </div>

          <!-- 归属不到直接下级的隔级下级 -->
          <template v-if="otherGrandchildren.length">
            <div class="sub-title">
              <el-icon><UserFilled /></el-icon>
              <span>其他下级</span>
            </div>
            <div
              v-for="grand in otherGrandchildren"
              :key="String(grand.id)"
              class="member-card sub-card"
            >
              <div class="member-head">
                <span class="member-name">{{ grand.name || MISSING_TEXT }}</span>
                <span class="title-tag title-tag-light">{{ shortTitle(grand.title) }}</span>
              </div>
              <div v-for="line in infoLines(grand)" :key="line.label" class="member-info">
                {{ line.label }}：{{ line.value }}
              </div>
            </div>
          </template>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="暂无下级医生" :image-size="90" />
    </div>

    <template #footer>
      <el-button class="close-btn" @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
<style scoped>
.dialog-heading h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 14px;
  color: #9ca3af;
}

.team-scroll {
  max-height: 64vh;
  overflow-y: auto;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-card {
  padding: 20px 22px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

.manager-card {
  background: #f8fafc;
  border-style: dashed;
}

.member-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.member-role {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
}

.member-name {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.member-info {
  font-size: 14px;
  line-height: 2;
  color: #6b7280;
}

/* 职称标签：本人黑底白字；下级浅灰；隔级白底描边 */
.title-tag {
  display: inline-block;
  height: 26px;
  line-height: 26px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.title-tag-dark {
  background: #111827;
  color: #fff;
}

.title-tag-light {
  background: #f3f4f6;
  color: #374151;
}

.title-tag-plain {
  background: #fff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.sub-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

/* 下级树引导竖线 */
.sub-tree {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: -4px;
  padding-left: 14px;
  border-left: 2px solid #eef0f4;
}

.sub-tree .sub-title {
  margin-top: 4px;
}

.sub-card {
  background: #fcfdff;
}

/* 隔级下级嵌套区 */
.compact-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  padding-left: 14px;
  border-left: 2px solid #e2e8f0;
}

.compact-card {
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.compact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.compact-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.compact-info {
  font-size: 13px;
  color: #6b7280;
}

.close-btn.el-button {
  min-width: 88px;
  background: #111827;
  border-color: #111827;
  color: #fff;
  font-weight: 600;
}

.close-btn.el-button:hover,
.close-btn.el-button:focus {
  background: #374151;
  border-color: #374151;
}
</style>

<style>
.el-dialog.team-dialog {
  border-radius: 18px;
  --el-color-primary: #2563eb;
}

.el-dialog.team-dialog .el-dialog__header {
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f1f3f7;
}
</style>