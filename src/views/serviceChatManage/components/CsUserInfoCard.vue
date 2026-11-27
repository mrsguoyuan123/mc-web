<script setup>
import { ref, watch } from 'vue'
import { Phone, Document } from '@element-plus/icons-vue'
import {
  getCsPatientById,
  getCsPatientPhoneStatusById
} from '../../../api/index.js'
import {
  HEALTH_STATUS_TAG,
  MISSING_TEXT,
  formatTime,
  healthStatusText,
  isMissing,
  safeParseJson
} from '../../../utils/index.js'
import {
  COMMUNICATE_STATUS_TAG,
  COMMUNICATE_STATUS_TEXT,
  PURCHASE_INTENT_TAG,
  PURCHASE_INTENT_TEXT,
  avatarColor,
  maskPhone
} from '../utils.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['open-profile', 'call'])

const detail = ref(null)
const phoneStatus = ref(null)
const loading = ref(false)
const error = ref(false)
const introExpanded = ref(false)

// 详情字段优先取 surgeryArchive，档案缺失再回退顶层字段
const pickArchive = (key) => {
  const archive = detail.value?.surgeryArchive
  if (archive && !isMissing(archive[key])) return archive[key]
  return detail.value?.[key]
}

const tagList = (json) => {
  const parsed = safeParseJson(json, [])
  return Array.isArray(parsed) ? parsed.filter((item) => !isMissing(item)) : []
}

const fetchAll = async (id) => {
  loading.value = true
  error.value = false
  // 切换患者先清空旧数据，避免串号
  detail.value = null
  phoneStatus.value = null
  try {
    const [detailRes, phoneRes] = await Promise.allSettled([
      getCsPatientById(id),
      getCsPatientPhoneStatusById(id)
    ])
    if (detailRes.status === 'fulfilled') detail.value = detailRes.value
    if (phoneRes.status === 'fulfilled') phoneStatus.value = phoneRes.value
    // 两块都失败才展示整体重试；单块失败其余区块仍可用
    if (detailRes.status === 'rejected' && phoneRes.status === 'rejected') error.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  (id) => {
    if (id) fetchAll(String(id))
  },
  { immediate: true }
)

defineExpose({ refresh: () => props.patientId && fetchAll(String(props.patientId)) })
</script>

<template>
  <section v-loading="loading" class="user-card">
    <div v-if="error" class="block-error" @click="fetchAll(String(patientId))">
      用户信息加载失败，点击重试
    </div>

    <template v-else-if="detail">
      <div class="card-top">
        <span class="title">用户信息</span>
        <button type="button" class="link-btn" @click="emit('open-profile', detail)">
          查看完整资料
        </button>
      </div>

      <div class="user-head">
        <span class="avatar" :style="{ background: avatarColor(detail.name) }">
          {{ isMissing(detail.name) ? '?' : String(detail.name).slice(0, 1) }}
        </span>
        <div class="user-name-row">
          <strong :class="{ 'missing-text': isMissing(detail.name) }">
            {{ isMissing(detail.name) ? MISSING_TEXT : detail.name }}
          </strong>
          <el-tag
            v-if="!isMissing(detail.healthStatus)"
            size="small"
            :type="HEALTH_STATUS_TAG[detail.healthStatus] || 'info'"
          >
            {{ healthStatusText(detail.healthStatus) }}
          </el-tag>
        </div>
      </div>

      <dl class="info-list">
        <div class="info-row">
          <dt>性别 / 年龄</dt>
          <dd>
            <template v-if="!isMissing(detail.gender) || !isMissing(detail.age)">
              {{ isMissing(detail.gender) ? '-' : detail.gender }}
              / {{ isMissing(detail.age) ? '-' : `${detail.age}岁` }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>联系电话</dt>
          <dd>
            <template v-if="!isMissing(detail.phone)">{{ maskPhone(detail.phone) }}</template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>所在地区</dt>
          <dd>
            <template v-if="!isMissing(detail.region)">{{ detail.region }}</template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>手术地区</dt>
          <dd>
            <template v-if="!isMissing(pickArchive('surgeryRegion'))">
              {{ pickArchive('surgeryRegion') }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>就诊医院</dt>
          <dd>
            <template v-if="!isMissing(pickArchive('hospitalName'))">
              {{ pickArchive('hospitalName') }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>主治医生</dt>
          <dd>
            <template v-if="!isMissing(pickArchive('surgeon'))">
              {{ pickArchive('surgeon') }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>术式</dt>
          <dd>
            <template v-if="!isMissing(pickArchive('surgeryType'))">
              {{ pickArchive('surgeryType') }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>手术日期</dt>
          <dd>
            <template v-if="!isMissing(pickArchive('surgeryDate'))">
              {{ pickArchive('surgeryDate') }}
            </template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
        <div class="info-row">
          <dt>服务包</dt>
          <dd>
            <template v-if="!isMissing(detail.servicePackage)">{{ detail.servicePackage }}</template>
            <em v-else class="missing-text">{{ MISSING_TEXT }}</em>
          </dd>
        </div>
      </dl>

      <div v-if="!isMissing(detail.communicateStatus) || !isMissing(detail.purchaseIntent)" class="tag-row">
        <el-tag
          v-if="!isMissing(detail.communicateStatus)"
          size="small"
          :type="COMMUNICATE_STATUS_TAG[detail.communicateStatus] || 'info'"
        >
          {{ COMMUNICATE_STATUS_TEXT[detail.communicateStatus] || detail.communicateStatus }}
        </el-tag>
        <el-tag
          v-if="!isMissing(detail.purchaseIntent)"
          size="small"
          effect="plain"
          :type="PURCHASE_INTENT_TAG[detail.purchaseIntent] || 'info'"
        >
          意向{{ PURCHASE_INTENT_TEXT[detail.purchaseIntent] || detail.purchaseIntent }}
        </el-tag>
      </div>

      <div v-if="tagList(detail.tagsJson).length" class="tag-row">
        <el-tag v-for="tag in tagList(detail.tagsJson)" :key="tag" size="small" effect="plain">
          {{ tag }}
        </el-tag>
      </div>

      <div v-if="!isMissing(pickArchive('diseaseIntro'))" class="disease-box">
        <label>病情简介</label>
        <p :class="{ collapsed: !introExpanded }">{{ pickArchive('diseaseIntro') }}</p>
        <button
          v-if="String(pickArchive('diseaseIntro')).length > 40"
          type="button"
          class="link-btn"
          @click="introExpanded = !introExpanded"
        >
          {{ introExpanded ? '收起' : '展开' }}
        </button>
      </div>

      <button
        type="button"
        class="call-btn"
        :class="phoneStatus?.called ? 'called' : 'uncalled'"
        @click="emit('call', detail)"
      >
        <el-icon><Phone /></el-icon>
        <span>{{ phoneStatus?.called ? '虚拟电话（已拨打）' : '虚拟电话（未拨打）' }}</span>
        <em v-if="phoneStatus?.latestCallTime" class="call-time">
          最近通话 {{ formatTime(phoneStatus.latestCallTime) }}
        </em>
      </button>

      <button type="button" class="profile-btn" @click="emit('open-profile', detail)">
        <el-icon><Document /></el-icon>
        查看完整资料
      </button>
    </template>

    <el-empty v-else-if="!loading" description="暂无用户信息" :image-size="80" />
  </section>
</template>

<style scoped>
.user-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
}

.user-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0 4px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name-row strong {
  font-size: 17px;
  color: #1f2937;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
}

.info-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.info-row dt {
  flex-shrink: 0;
  color: #94a3b8;
}

.info-row dd {
  margin: 0;
  text-align: right;
  color: #334155;
  word-break: break-all;
}

.missing-text {
  color: #ef4444;
  font-style: normal;
  font-size: 12px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.disease-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.disease-box label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.disease-box p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-line;
}

.disease-box p.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.call-btn,
.profile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.call-btn {
  border: 1px solid transparent;
  color: #fff;
}

.call-btn.uncalled {
  background: #16a34a;
}

.call-btn.called {
  background: #2563eb;
}

.call-time {
  font-style: normal;
  font-size: 11px;
  opacity: 0.85;
}

.profile-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
}

.profile-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
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
</style>
