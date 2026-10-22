<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 科室列表
const departments = [
  '产科', '妇科', '儿科', '内科', '外科', '骨科', '皮肤科', '眼科',
  '耳鼻喉科', '口腔科', '心理科', '营养科', '中医科', '康复科', '急诊科', '全科'
]

// 问答模拟数据
const qaList = ref([
  {
    id: 'Q001', dept: '产科', question: '怀孕初期应该注意什么？',
    answer: '怀孕初期（1-3个月）是胎儿发育的关键时期，需要特别注意以下几点：\n1. 补充叶酸：每天服用400-800微克叶酸，预防胎儿神经管畸形\n2. 均衡饮食：多吃新鲜蔬菜水果，保证营养充足\n3. 避免接触有害物质：远离烟酒、辐射、化学物质\n4. 注意休息：保证充足睡眠，避免过度劳累\n5. 定期产检：按时进行各项产前检查\n6. 避免剧烈运动：可以进行散步等轻度运动\n7. 保持心情愉快：避免情绪波动过大\n\n如有任何不适，请及时就医。',
    tags: ['孕早期', '注意事项', '营养'], views: 1250, used: 856,
    createdAt: '2026-01-15', updatedAt: '2026-02-01'
  },
  {
    id: 'Q002', dept: '产科', question: '怀孕期间可以同房吗？',
    answer: '孕期同房需根据孕周和身体状况判断：\n可以同房的情况：\n- 孕中期（4-7个月）身体状况稳定\n- 产检一切正常，无流产或早产风险\n需要避免的情况：\n- 孕早期（1-3个月）和孕晚期（8-10个月）\n- 有先兆流产、前置胎盘、阴道出血等情况\n- 有习惯性流产史\n建议事前咨询产科医生，注意卫生和动作轻柔。',
    tags: ['孕期生活', '注意事项'], views: 980, used: 654,
    createdAt: '2026-01-16', updatedAt: '2026-02-01'
  },
  {
    id: 'Q003', dept: '产科', question: '孕吐怎么缓解？',
    answer: '孕吐是孕早期常见反应，可以通过以下方法帮助缓解：\n饮食调整：\n1. 少食多餐，避免空腹\n2. 选择清淡、易消化食物，如面包、饼干\n3. 避免油腻、辛辣和刺激性气味\n生活调整：\n1. 充分休息，避免过度疲劳\n2. 适当补充维生素B6\n3. 保持室内空气流通\n若出现严重呕吐、无法进食进水、体重明显下降，请及时就医。',
    tags: ['孕吐', '孕早期'], views: 1680, used: 1203,
    createdAt: '2026-01-18', updatedAt: '2026-02-03'
  },
  {
    id: 'Q004', dept: '妇科', question: '月经不调是什么原因？',
    answer: '月经不调常见原因包括：\n生理因素：\n1. 青春期和更年期：内分泌系统不稳定\n2. 妊娠相关：怀孕、宫外孕等\n生活因素：精神压力大、熬夜、过度节食或肥胖、剧烈运动\n疾病因素：多囊卵巢综合征、甲状腺疾病、子宫肌瘤等\n若连续3个月以上月经异常，建议就医检查性激素和B超。',
    tags: ['月经不调', '内分泌'], views: 2100, used: 1680,
    createdAt: '2026-01-12', updatedAt: '2026-02-02'
  },
  {
    id: 'Q005', dept: '妇科', question: '白带异常是怎么回事？',
    answer: '正常白带呈白色稀糊状、无异味。白带异常可能提示健康问题：\n正常白带特征：量少、白色或透明、无异味\n异常表现：\n- 豆腐渣样伴瘙痒：霉菌性阴道炎\n- 灰白色鱼腥味：细菌性阴道病\n- 黄绿色泡沫状：滴虫性阴道炎\n- 白带带血：需警惕宫颈病变\n建议及时就医做白带常规检查，勿自行用药。',
    tags: ['白带异常', '阴道炎'], views: 1560, used: 1080,
    createdAt: '2026-01-14', updatedAt: '2026-02-02'
  },
  {
    id: 'Q006', dept: '儿科', question: '孩子发烧怎么处理？',
    answer: '儿童发烧是常见症状，正确处理很重要：\n体温分级：\n- 低热：37.5-38℃\n- 中度发热：38.1-39℃\n- 高热：39.1-41℃\n家庭护理：\n1. 体温低于38.5℃：多喝水、减少衣物、温水擦浴\n2. 超过38.5℃：可服用对乙酰氨基酚或布洛芬（按体重计算剂量）\n3. 观察精神状态，每隔1-2小时测量体温\n出现持续高热不退、精神萎靡、抽搐、皮疹等情况立即就医。',
    tags: ['发烧', '儿童护理'], views: 3200, used: 2100,
    createdAt: '2026-01-10', updatedAt: '2026-02-04'
  },
  {
    id: 'Q007', dept: '儿科', question: '宝宝腹泻该怎么办？',
    answer: '儿童腹泻需要根据具体情况处理：\n腹泻分类：\n1. 急性腹泻（<2周）\n常见原因：病毒感染（轮状病毒）、细菌感染、食物不耐受、着凉\n护理要点：\n1. 预防脱水：口服补液盐（ORS），少量多次喂服\n2. 继续饮食：清淡易消化，避免高糖高脂\n3. 不要自行使用止泻药和抗生素\n出现大便带血、持续呕吐、明显脱水（尿少、口干、精神差）需立即就医。',
    tags: ['腹泻', '脱水'], views: 2340, used: 1780,
    createdAt: '2026-01-11', updatedAt: '2026-02-03'
  },
  {
    id: 'Q008', dept: '内科', question: '高血压患者日常应该注意什么？',
    answer: '高血压是慢性疾病，需要长期管理：\n血压控制目标：\n- 一般成人：<140/90 mmHg\n- 老年人（≥65岁）：<150/90 mmHg\n日常管理：\n1. 规律服药，不可自行停药\n2. 低盐饮食（每日<5克）\n3. 控制体重，适量运动\n4. 戒烟限酒，避免熬夜\n5. 定期监测并记录血压\n出现头晕、头痛加重、胸闷等不适及时就医。',
    tags: ['高血压', '慢性病'], views: 1950, used: 1420,
    createdAt: '2026-01-20', updatedAt: '2026-02-02'
  },
  {
    id: 'Q009', dept: '内科', question: '糖尿病患者饮食注意事项？',
    answer: '糖尿病饮食管理是控制血糖的基础：\n饮食原则：\n1. 控制总热量：根据身高、体重和活动量计算\n2. 合理分配三大营养素：碳水化合物50-60%、蛋白质15-20%、脂肪<30%\n3. 少食多餐，定时定量\n4. 多吃蔬菜和粗粮，避免含糖饮料和甜点\n5. 水果选择低GI种类，在两餐之间食用\n同时配合规律运动、按时用药，定期监测血糖。',
    tags: ['糖尿病', '饮食'], views: 2120, used: 1650,
    createdAt: '2026-01-19', updatedAt: '2026-02-03'
  },
  {
    id: 'Q010', dept: '皮肤科', question: '痤疮（青春痘）如何治疗和预防？',
    answer: '痤疮是常见的皮肤问题，需要综合治疗：\n痤疮成因：\n1. 皮脂腺分泌过多\n2. 毛囊口角化异常\n3. 痤疮丙酸杆菌感染\n4. 激素水平变化\n治疗与预防：\n- 轻度：外用维A酸、过氧化苯甲酰\n- 中重度：需医生指导口服药物\n- 日常：温和清洁、避免挤压、少吃高糖高奶饮食、规律作息',
    tags: ['痤疮', '青春痘'], views: 1760, used: 1280,
    createdAt: '2026-01-21', updatedAt: '2026-02-04'
  },
  {
    id: 'Q011', dept: '营养科', question: '如何科学减肥？',
    answer: '科学减肥需要合理的饮食和运动相结合：\n减重目标：健康减重速度为0.5-1kg/周\n饮食原则：\n1. 控制总热量，每日减少300-500千卡\n2. 保证蛋白质摄入（每公斤体重1.0-1.2g）\n3. 多吃蔬菜，主食换成粗粮\n4. 拒绝高糖饮料、油炸食品\n运动建议：每周150分钟中等强度有氧 + 2次力量训练\n避免极端节食，防止反弹和营养不良。',
    tags: ['减肥', '营养'], views: 3200, used: 2450,
    createdAt: '2026-01-08', updatedAt: '2026-02-04'
  },
  {
    id: 'Q012', dept: '心理科', question: '如何缓解焦虑情绪？',
    answer: '焦虑是现代人常见的心理问题，可以通过多种方法缓解：\n识别焦虑：\n心理症状：过度担心、难以集中、易怒\n躯体症状：心跳加快、肌肉紧张、睡眠障碍\n缓解方法：\n1. 腹式呼吸：每天2次，每次5-10分钟\n2. 规律运动：每周3-5次有氧运动\n3. 正念冥想，减少咖啡因摄入\n4. 与亲友倾诉，必要时寻求心理咨询师帮助\n若持续2周以上影响日常生活，建议到心理科就诊。',
    tags: ['焦虑', '心理健康'], views: 2650, used: 1920,
    createdAt: '2026-01-09', updatedAt: '2026-02-03'
  }
])

// 各科室问答数量（由列表实时统计）
const deptStats = computed(() =>
  departments.map((name) => ({
    name,
    count: qaList.value.filter((q) => q.dept === name).length
  }))
)

// 搜索与科室筛选
const keyword = ref('')
const activeDept = ref('')
const filteredList = computed(() =>
  qaList.value.filter((q) => {
    const matchDept = !activeDept.value || q.dept === activeDept.value
    const word = keyword.value.trim().toLowerCase()
    const matchWord =
      !word ||
      q.question.toLowerCase().includes(word) ||
      q.answer.toLowerCase().includes(word) ||
      q.tags.some((t) => t.toLowerCase().includes(word))
    return matchDept && matchWord
  })
)
const toggleDept = (name) => {
  activeDept.value = activeDept.value === name ? '' : name
}

// 添加/编辑弹窗
const formVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const createForm = () => ({ id: '', dept: '', question: '', answer: '', tagsText: '' })
const form = reactive(createForm())
const rules = {
  dept: [{ required: true, message: '请选择科室', trigger: 'change' }],
  question: [{ required: true, message: '请输入问题', trigger: 'blur' }],
  answer: [{ required: true, message: '请输入标准答案', trigger: 'blur' }]
}

const openAdd = () => {
  Object.assign(form, createForm())
  isEdit.value = false
  formVisible.value = true
  formRef.value?.clearValidate()
}
const openEdit = (row) => {
  Object.assign(form, { ...row, tagsText: row.tags.join('，') })
  isEdit.value = true
  formVisible.value = true
  formRef.value?.clearValidate()
}
const parseTags = (text) =>
  text.split(/[,，]/).map((t) => t.trim()).filter(Boolean)

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    const tags = parseTags(form.tagsText)
    if (isEdit.value) {
      const target = qaList.value.find((q) => q.id === form.id)
      Object.assign(target, {
        dept: form.dept, question: form.question, answer: form.answer, tags,
        updatedAt: new Date().toISOString().slice(0, 10)
      })
      ElMessage.success('问答已更新')
    } else {
      const maxNum = qaList.value.reduce((max, q) => Math.max(max, Number(q.id.slice(1))), 0)
      qaList.value.unshift({
        id: `Q${String(maxNum + 1).padStart(3, '0')}`,
        dept: form.dept, question: form.question, answer: form.answer, tags,
        views: 0, used: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10)
      })
      ElMessage.success('问答已添加')
    }
    formVisible.value = false
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除问答「${row.question}」吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(() => {
    qaList.value = qaList.value.filter((q) => q.id !== row.id)
    ElMessage.success('问答已删除')
  }).catch(() => {})
}

// 详情弹窗
const detailVisible = ref(false)
const current = ref(null)
const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}
const { page: akPage, pageSize: akSize, pagedData: pagedQaList, total: akTotal } = useTablePage(filteredList)
</script>
<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h1>AI智能诊断回复知识库</h1>
      <p>维护各科室常见问题与标准回答，支撑智能诊断回复</p>
    </div>

    <!-- 科室问答分布 -->
    <div class="panel dist-panel">
      <div class="section-head">
        <h3>科室问答分布</h3>
        <p>各科室的问答数量统计</p>
      </div>
      <div class="dist-grid">
        <div
          v-for="item in deptStats"
          :key="item.name"
          class="dist-card"
          :class="{ active: activeDept === item.name }"
          @click="toggleDept(item.name)"
        >
          <span class="dist-name">{{ item.name }}</span>
          <strong class="dist-count">{{ item.count }}</strong>
          <span class="dist-unit">个问答</span>
        </div>
      </div>
    </div>

    <!-- 问答列表 -->
    <div class="panel table-card">
      <div class="list-head">
        <div>
          <h3>问答列表</h3>
          <p>管理常见问题和标准答案</p>
        </div>
        <el-button type="primary" size="large" @click="openAdd">
          <el-icon><Plus /></el-icon>添加问答
        </el-button>
      </div>

      <el-input v-model="keyword" class="search-input" size="large" clearable
        placeholder="搜索问题、答案或标签...">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <!-- 科室筛选 -->
      <div class="dept-pills">
        <button class="pill" :class="{ active: activeDept === '' }" @click="activeDept = ''">全部科室</button>
        <button
          v-for="name in departments"
          :key="name"
          class="pill"
          :class="{ active: activeDept === name }"
          @click="activeDept = name"
        >{{ name }}</button>
      </div>

      <el-table :data="pagedQaList" stripe>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="科室" width="100">
          <template #default="{ row }">
            <span class="dept-pill-tag">{{ row.dept }}</span>
          </template>
        </el-table-column>
        <el-table-column label="问题" prop="question" min-width="220" show-overflow-tooltip />
        <el-table-column label="标准答案" prop="answer" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="answer-cell">{{ row.answer }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" round effect="plain" class="qa-tag">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="浏览量" width="90" align="center">
          <template #default="{ row }">{{ row.views.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="使用量" width="90" align="center">
          <template #default="{ row }">
            <span class="used-num">{{ row.used.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updatedAt" width="120" />
                <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" link @click="openEdit(row)"><el-icon><Edit /></el-icon></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" link @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的问答" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="akPage"
        v-model:page-size="akSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="akTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="akPage = 1"
      />
    </div>

    <!-- 添加/编辑问答弹窗 -->
    <el-dialog v-model="formVisible" width="560px" class="qa-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>{{ isEdit ? '编辑常见问题解答' : '添加常见问题解答' }}</h3>
          <p>{{ isEdit ? '编辑知识库中的问答内容' : '添加新的问答到知识库' }}</p>
        </div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="科室" prop="dept">
          <el-select v-model="form.dept" class="full-control" size="large" placeholder="选择科室">
            <el-option v-for="name in departments" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题" prop="question">
          <el-input v-model="form.question" size="large" placeholder="输入常见问题" />
        </el-form-item>
        <el-form-item label="标准答案" prop="answer">
          <el-input v-model="form.answer" type="textarea" :rows="5" resize="none"
            placeholder="输入详细的标准答案..." />
        </el-form-item>
        <el-form-item label="标签（用逗号分隔）">
          <el-input v-model="form.tagsText" size="large" placeholder="例如：症状, 治疗, 预防" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="formVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 问答详情弹窗 -->
    <el-dialog v-model="detailVisible" width="640px" class="qa-dialog" top="6vh">
      <template #header>
        <div class="dialog-heading">
          <h3>问答详情</h3>
        </div>
      </template>
      <template v-if="current">
        <div class="detail-info">
          <div class="info-item">
            <span class="info-label">ID</span>
            <span class="info-value">{{ current.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">科室</span>
            <span class="dept-pill-tag">{{ current.dept }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">浏览量</span>
            <span class="info-value">{{ current.views.toLocaleString() }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">使用量</span>
            <span class="info-value used-num">{{ current.used.toLocaleString() }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ current.createdAt }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间</span>
            <span class="info-value">{{ current.updatedAt }}</span>
          </div>
        </div>

        <div class="detail-block">
          <span class="block-label">问题</span>
          <div class="question-box">{{ current.question }}</div>
        </div>
        <div class="detail-block">
          <span class="block-label">标准答案</span>
          <div class="answer-box">{{ current.answer }}</div>
        </div>
        <div class="detail-block">
          <span class="block-label">标签</span>
          <div class="tag-list">
            <el-tag v-for="tag in current.tags" :key="tag" round effect="plain">{{ tag }}</el-tag>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.knowledge-page {
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

/* 科室分布 */
.dist-panel {
  margin-top: 22px;
  padding: 22px 24px;
}

.section-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.section-head p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.dist-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 14px;
}

.dist-card {
  padding: 16px 10px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dist-card:hover {
  border-color: #93c5fd;
  transform: translateY(-2px);
}

.dist-card.active {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: 0 0 0 1px #2563eb inset;
}

.dist-name {
  font-size: 13px;
  color: #4b5563;
}

.dist-count {
  font-size: 26px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1;
}

.dist-unit {
  font-size: 12px;
  color: #9ca3af;
}

/* 列表区 */
.table-card {
  margin-top: 22px;
  padding: 22px 24px;
}

.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.list-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.list-head p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

/* 科室筛选胶囊 */
.dept-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 20px;
}

.pill {
  padding: 6px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.pill.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  font-weight: 600;
}

:deep(.el-table) {
  --el-table-header-bg-color: #ffffff;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #edf0f5;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.dept-pill-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
}

.answer-cell {
  color: #6b7280;
  font-size: 13px;
}

.qa-tag {
  margin: 0 6px 4px 0;
}

.used-num {
  color: #16a34a;
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

.full-control {
  width: 100%;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

/* 详情弹窗 */
.detail-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
  padding: 18px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 12px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.detail-block {
  margin-top: 18px;
}

.block-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.question-box {
  padding: 12px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 14px;
  font-weight: 500;
}

.answer-box {
  max-height: 240px;
  overflow-y: auto;
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1200px) {
  .dist-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .dist-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .detail-info {
    grid-template-columns: 1fr;
  }
}

.el-button{
  font-weight: bold;
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.qa-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>