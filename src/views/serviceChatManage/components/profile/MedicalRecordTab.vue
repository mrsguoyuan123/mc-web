<script setup>
import { computed, ref, watch } from 'vue'
import { getPatientMedicalRecordById } from '../../../../api/index.js'
import {
  MISSING_TEXT,
  isMissing,
  resolveFileUrl,
  safeParseJson
} from '../../../../utils/index.js'

const props = defineProps({
  patientId: { type: [String, Number], default: '' }
})

const loading = ref(false)
const error = ref(false)
const record = ref(null)

const fetchData = async () => {
  if (!props.patientId) return
  loading.value = true
  error.value = false
  try {
    record.value = await getPatientMedicalRecordById(String(props.patientId))
  } catch {
    record.value = null
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

const SOURCE_TEXT = { MANUAL: '手动录入', OCR: 'OCR 识别' }

// 既往史开关位：1 有 / 0 无（0 为有效值，不判缺失）
const historyFlags = computed(() => {
  const r = record.value || {}
  const flags = [
    ['hypertension', '高血压'],
    ['heartDisease', '心脏病'],
    ['diabetes', '糖尿病'],
    ['cerebrovascular', '脑血管病'],
    ['respiratory', '呼吸系统疾病'],
    ['kidneyDisease', '肾病'],
    ['liverDisease', '肝病'],
    ['surgeryHistory', '手术史'],
    ['bloodTransfusion', '输血史'],
    ['poisoningHistory', '中毒史'],
    ['infectiousHistory', '传染病史'],
    ['viralHepatitis', '病毒性肝炎']
  ]
  return flags
    .filter(([key]) => !isMissing(r[key]))
    .map(([key, label]) => ({ label, value: Number(r[key]) === 1 ? '有' : '无' }))
})

const gridCells = computed(() => {
  const r = record.value || {}
  return [
    { label: '入院诊断', value: r.admissionDiagnosis },
    { label: '出院诊断', value: r.dischargeDiagnosis },
    { label: '肿瘤分期', value: r.tumorStaging },
    { label: '化疗方案', value: r.chemoPlan },
    { label: '化疗状态', value: r.chemoStatus },
    { label: '血压', value: r.bloodPressure },
    { label: 'BMI', value: isMissing(r.bmi) ? undefined : String(r.bmi) },
    { label: '过敏史', value: r.allergyHistory },
    { label: '营养状况', value: r.nutrition },
    { label: '疼痛评分', value: isMissing(r.painScore) ? undefined : `${r.painScore}分` },
    { label: '吸烟饮酒', value: r.smokingDrinking },
    { label: '长期用药', value: r.longTermMedication },
    { label: '院外用药', value: r.externalMedication },
    { label: '抗凝周', value: r.anticoagulantWeek },
    { label: '档案来源', value: SOURCE_TEXT[r.source] || r.source },
    {
      label: '出生日期',
      value: r.birthDate
    },
    { label: '籍贯', value: r.nativePlace },
    { label: '职业', value: r.occupation },
    { label: '教育程度', value: r.education },
    { label: '婚姻状况', value: r.maritalStatus }
  ]
})

const textBlocks = computed(() => {
  const r = record.value || {}
  return [
    { title: '入院情况', value: r.admissionCondition },
    { title: '诊疗过程', value: r.treatmentProcess },
    { title: 'MDT 记录', value: r.mdtRecord },
    { title: '病理报告', value: r.pathologyReport },
    { title: '出院带药', value: r.dischargeMedication }
  ].filter((item) => !isMissing(item.value))
})

const rehabBlocks = computed(() => {
  const r = record.value || {}
  return [
    { title: '康复饮食', value: r.rehabDiet },
    { title: '康复运动', value: r.rehabExercise },
    { title: '康复睡眠', value: r.rehabSleep },
    { title: '随访指标', value: r.followupIndicators },
    { title: '体重目标', value: r.weightTarget },
    { title: '中性粒细胞目标', value: r.neutrophilTarget },
    { title: '血红蛋白目标', value: r.hbTarget },
    { title: '血小板目标', value: r.pltTarget },
    { title: '肝功能目标', value: r.liverFunctionTarget },
    { title: '肾功能目标', value: r.kidneyFunctionTarget },
    { title: '电解质目标', value: r.electrolytesTarget },
    { title: '消化随访', value: r.followupDigestive },
    { title: '影像随访', value: r.followupImaging },
    { title: '肿瘤标志物随访', value: r.followupTumorMarkers },
    { title: '不良反应随访', value: r.followupAdverseReactions },
    { title: '并发症随访', value: r.followupComplications },
    { title: '长期随访', value: r.followupLongTerm }
  ].filter((item) => !isMissing(item.value))
})

const attachments = computed(() => {
  const parsed = safeParseJson(record.value?.attachmentsJson, [])
  return Array.isArray(parsed) ? parsed : []
})
</script>

<template>
  <div v-loading="loading" class="tab-pane">
    <div v-if="error" class="block-error" @click="fetchData">加载失败，点击重试</div>

    <template v-else-if="record">
      <section class="info-section">
        <h4>就诊信息</h4>
        <div class="info-card grid">
          <div v-for="cell in gridCells" :key="cell.label" class="cell">
            <label>{{ cell.label }}</label>
            <p :class="{ missing: isMissing(cell.value) }">
              {{ isMissing(cell.value) ? MISSING_TEXT : cell.value }}
            </p>
          </div>
        </div>
      </section>

      <section v-if="historyFlags.length" class="info-section">
        <h4>既往史</h4>
        <div class="info-card grid">
          <div v-for="item in historyFlags" :key="item.label" class="cell">
            <label>{{ item.label }}</label>
            <p :class="{ 'text-green': item.value === '无' }">{{ item.value }}</p>
          </div>
        </div>
      </section>

      <section v-if="textBlocks.length" class="info-section">
        <h4>诊疗信息</h4>
        <div class="info-card">
          <div v-for="item in textBlocks" :key="item.title" class="text-block">
            <label>{{ item.title }}</label>
            <p>{{ item.value }}</p>
          </div>
        </div>
      </section>

      <section v-if="rehabBlocks.length" class="info-section">
        <h4>康复与随访</h4>
        <div class="info-card grid">
          <div v-for="item in rehabBlocks" :key="item.title" class="cell">
            <label>{{ item.title }}</label>
            <p>{{ item.value }}</p>
          </div>
        </div>
      </section>

      <section v-if="attachments.length" class="info-section">
        <h4>档案附件</h4>
        <div class="info-card">
          <a
            v-for="(file, index) in attachments"
            :key="index"
            class="attach-link"
            :href="resolveFileUrl(file.url || file)"
            target="_blank"
            rel="noopener"
          >
            {{ file.fileName || file.name || `附件 ${index + 1}` }}
          </a>
        </div>
      </section>

      <el-empty
        v-if="!gridCells.some((c) => !isMissing(c.value)) && !historyFlags.length && !textBlocks.length && !rehabBlocks.length && !attachments.length"
        description="暂无医疗档案"
        :image-size="90"
      />
    </template>

    <el-empty v-else-if="!loading" description="暂无医疗档案" :image-size="90" />
  </div>
</template>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section h4 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.info-card {
  padding: 20px 22px;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  background: #fff;
}

.info-card.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 24px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cell label,
.text-block label {
  font-size: 12px;
  color: #94a3b8;
}

.cell p,
.text-block p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #1f2937;
  word-break: break-all;
}

.missing {
  color: #ef4444;
  font-size: 12px;
}

.text-green {
  color: #16a34a;
}

.text-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px dashed #edf1f7;
}

.text-block:last-child {
  border-bottom: none;
}

.attach-link {
  display: block;
  padding: 8px 0;
  font-size: 13px;
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

@media (max-width: 1200px) {
  .info-card.grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
