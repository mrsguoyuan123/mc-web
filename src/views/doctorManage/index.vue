<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, defineComponent, h, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 职称标签配色（全站统一标签色）
const titleStyle = {
  主诊: { color: '#2563eb', background: 'rgba(232,241,255,0.5)' },
  主治: { color: '#16a34a', background: 'rgba(220,252,231,0.5)' },
  住院: { color: '#4b5563', background: 'rgba(243,244,246,0.5)' }
}

// 医生模拟数据
const doctors = ref([
  { name: '张主任', title: '主诊', area: '北京市', hospital: '北京协和医院', dept: '心内科', phone: '13800138001', superior: '', patients: 2 },
  { name: '李医生', title: '主治', area: '北京市', hospital: '北京协和医院', dept: '心内科', phone: '13800138002', superior: '张主任', patients: 2 },
  { name: '王医生', title: '主治', area: '北京市', hospital: '北京协和医院', dept: '心内科', phone: '13800138003', superior: '张主任', patients: 1 },
  { name: '赵医生', title: '住院', area: '北京市', hospital: '北京协和医院', dept: '心内科', phone: '13800138004', superior: '李医生', patients: 2 },
  { name: '刘医生', title: '住院', area: '北京市', hospital: '北京协和医院', dept: '心内科', phone: '13800138005', superior: '王医生', patients: 1 },
  { name: '陈主任', title: '主诊', area: '北京市', hospital: '北京同仁医院', dept: '内分泌科', phone: '13800138006', superior: '', patients: 1 },
  { name: '周医生', title: '主治', area: '北京市', hospital: '北京同仁医院', dept: '内分泌科', phone: '13800138007', superior: '陈主任', patients: 1 },
  { name: '吴主任', title: '主诊', area: '上海市', hospital: '上海华山医院', dept: '消化科', phone: '13800138008', superior: '', patients: 2 },
  { name: '郑医生', title: '主治', area: '上海市', hospital: '上海华山医院', dept: '消化科', phone: '13800138009', superior: '吴主任', patients: 1 },
  { name: '韩主任', title: '主诊', area: '广州市', hospital: '广州中山医院', dept: '骨科', phone: '13800138010', superior: '', patients: 0 },
  { name: '曹医生', title: '主治', area: '广州市', hospital: '广州中山医院', dept: '骨科', phone: '13800138011', superior: '韩主任', patients: 0 }
])

const stats = computed(() => ({
  total: doctors.value.length,
  lead: doctors.value.filter((d) => d.title === '主诊').length,
  attending: doctors.value.filter((d) => d.title === '主治').length,
  resident: doctors.value.filter((d) => d.title === '住院').length
}))

// 下拉选项
const areas = computed(() => [...new Set(doctors.value.map((d) => d.area))])
const hospitals = computed(() => [...new Set(doctors.value.map((d) => d.hospital))])
const depts = computed(() => [...new Set(doctors.value.map((d) => d.dept))])

// 筛选
const filters = reactive({ keyword: '', area: '', hospital: '', dept: '' })
const filtered = computed(() =>
  doctors.value.filter((d) => {
    const word = filters.keyword.trim()
    const matchWord = !word || d.name.includes(word) || d.dept.includes(word)
    return (
      matchWord &&
      (!filters.area || d.area === filters.area) &&
      (!filters.hospital || d.hospital === filters.hospital) &&
      (!filters.dept || d.dept === filters.dept)
    )
  })
)

const teamCount = (name) => doctors.value.filter((d) => d.superior === name).length
const activeTab = ref('list')

// 患者绑定模拟数据（team 为医生姓名数组）
const bindings = ref([
  { id: 1, patient: '患者A', age: 45, gender: '男', condition: '高血压', team: ['张主任', '李医生', '赵医生'] },
  { id: 2, patient: '患者B', age: 58, gender: '女', condition: '糖尿病', team: ['吴主任', '郑医生'] },
  { id: 3, patient: '患者C', age: 62, gender: '男', condition: '冠心病', team: ['张主任', '刘医生', '陈主任'] },
  { id: 4, patient: '患者D', age: 50, gender: '女', condition: '骨折术后康复', team: ['韩主任'] }
])

const findDoc = (name) => doctors.value.find((d) => d.name === name)

/* ---------- 调整医患绑定关系弹窗 ---------- */
const bindVisible = ref(false)
const bindTarget = ref(null)
const bindTeam = ref([])
const currentDocs = computed(() => bindTeam.value.map(findDoc).filter(Boolean))
const availableDocs = computed(() => doctors.value.filter((d) => !bindTeam.value.includes(d.name)))

const openBind = (row) => {
  bindTarget.value = row
  bindTeam.value = [...row.team]
  bindVisible.value = true
}
const removeDoc = (name) => {
  bindTeam.value = bindTeam.value.filter((n) => n !== name)
}
const addDoc = (name) => {
  bindTeam.value.push(name)
}
const finishBind = () => {
  bindTarget.value.team = [...bindTeam.value]
  bindVisible.value = false
  ElMessage.success('医疗团队调整成功')
}

/* ---------- 团队结构弹窗：递归成员卡片 ---------- */
const MemberHead = (doc) =>
  h('div', { class: 'member-head' }, [
    h('span', { class: 'member-name' }, doc.name),
    h('span', { class: 'title-tag', style: titleStyle[doc.title] }, doc.title)
  ])

const MemberInfo = (label, value) => h('div', { class: 'member-info' }, `${label}：${value}`)

// 递归节点：full 展示完整信息，compact 为嵌套灰底小卡
const TeamMember = defineComponent({
  props: { doc: { type: Object, required: true }, compact: { type: Boolean, default: false } },
  setup(props) {
    const children = computed(() => doctors.value.filter((d) => d.superior === props.doc.name))
    return () => {
      const kids = children.value
      if (props.compact) {
        return h('div', { class: 'compact-card' }, [
          MemberHead(props.doc),
          h('div', { class: 'compact-patients' }, `负责患者：${props.doc.patients} 人`),
          kids.length
            ? h('div', { class: 'compact-inner' }, kids.map((k) => h(TeamMember, { doc: k, compact: true })))
            : null
        ])
      }
      return h('div', { class: 'member-card' }, [
        MemberHead(props.doc),
        MemberInfo('区域', props.doc.area),
        MemberInfo('医院', props.doc.hospital),
        MemberInfo('科室', props.doc.dept),
        MemberInfo('电话', props.doc.phone),
        MemberInfo('负责患者', `${props.doc.patients} 人`),
        kids.length
          ? h('div', { class: 'sub-list' }, kids.map((k) => h(TeamMember, { doc: k, compact: true })))
          : null
      ])
    }
  }
})

const teamVisible = ref(false)
const teamTarget = ref(null)
const teamChildren = computed(() =>
  teamTarget.value ? doctors.value.filter((d) => d.superior === teamTarget.value.name) : []
)
const openTeam = (doctor) => {
  teamTarget.value = doctor
  teamVisible.value = true
}

/* ---------- 修改职称弹窗 ---------- */
const titleVisible = ref(false)
const titleTarget = ref(null)
const titleForm = ref('主诊')
const titleOptions = ['主诊', '主治', '住院']

const openTitle = (doctor) => {
  titleTarget.value = doctor
  titleForm.value = doctor.title
  titleVisible.value = true
}
const confirmTitle = () => {
  titleTarget.value.title = titleForm.value
  titleVisible.value = false
  ElMessage.success('职称修改成功')
}
const { page: dmPage, pageSize: dmSize, pagedData: pagedDocs, total: dmTotal } = useTablePage(filtered)
const { page: dmBindPage, pageSize: dmBindSize, pagedData: pagedBindings, total: dmBindTotal } = useTablePage(bindings)
</script>
<template>
  <div class="dm-page">
    <div class="page-header">
      <h1>医生管理</h1>
      <p>管理医生职称、团队结构和患者绑定</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="panel stat-card">
        <span class="stat-label">医生总数</span>
        <strong class="stat-value">{{ stats.total }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">主诊医生</span>
        <strong class="stat-value lead">{{ stats.lead }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">主治医生</span>
        <strong class="stat-value attending">{{ stats.attending }}</strong>
      </div>
      <div class="panel stat-card">
        <span class="stat-label">住院医生</span>
        <strong class="stat-value resident">{{ stats.resident }}</strong>
      </div>
    </div>

    <!-- 标签栏 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <el-tab-pane label="医生列表" name="list" />
      <el-tab-pane label="患者绑定" name="bind" />
    </el-tabs>

    <!-- 医生列表 -->
    <template v-if="activeTab === 'list'">
      <div class="panel filter-card">
        <el-input v-model="filters.keyword" class="search-input" size="large" clearable
          placeholder="搜索医生姓名或专科...">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.area" class="filter-select" size="large" clearable placeholder="全部区域">
          <el-option v-for="a in areas" :key="a" :label="a" :value="a" />
        </el-select>
        <el-select v-model="filters.hospital" class="filter-select" size="large" clearable placeholder="全部医院">
          <el-option v-for="h in hospitals" :key="h" :label="h" :value="h" />
        </el-select>
        <el-select v-model="filters.dept" class="filter-select" size="large" clearable placeholder="全部科室">
          <el-option v-for="d in depts" :key="d" :label="d" :value="d" />
        </el-select>
      </div>

      <div class="panel table-card">
        <el-table :data="pagedDocs" stripe>
          <el-table-column label="姓名" prop="name" min-width="90" />
          <el-table-column label="职称" min-width="90">
            <template #default="{ row }">
              <span class="title-tag" :style="titleStyle[row.title]">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="区域" prop="area" min-width="80" />
          <el-table-column label="医院" prop="hospital" min-width="130" />
          <el-table-column label="科室" prop="dept" min-width="100" />
          <el-table-column label="电话" prop="phone" min-width="130" />
          <el-table-column label="上级医生" min-width="90">
            <template #default="{ row }">{{ row.superior || '-' }}</template>
          </el-table-column>
          <el-table-column label="团队人数" min-width="90">
            <template #default="{ row }">{{ teamCount(row.name) }} 人</template>
          </el-table-column>
          <el-table-column label="负责患者" min-width="90">
            <template #default="{ row }">{{ row.patients }} 人</template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="修改职称" placement="top">
                <el-button type="primary" link @click="openTitle(row)"><el-icon><Edit /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip content="查看团队结构" placement="top">
                <el-button type="primary" link @click="openTeam(row)"><el-icon><Share /></el-icon></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无符合条件的医生" :image-size="90" />
          </template>
        </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="dmPage"
        v-model:page-size="dmSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="dmTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="dmPage = 1"
      />
      </div>
    </template>

    <!-- 患者绑定 -->
    <template v-if="activeTab === 'bind'">
      <div class="panel table-card">
        <el-table :data="pagedBindings" stripe>
          <el-table-column label="患者姓名" prop="patient" min-width="100" />
          <el-table-column label="年龄" min-width="80">
            <template #default="{ row }">{{ row.age }}</template>
          </el-table-column>
          <el-table-column label="性别" prop="gender" min-width="70" />
          <el-table-column label="病情" prop="condition" min-width="130" />
          <el-table-column label="医疗团队" min-width="280">
            <template #default="{ row }">
              <span v-for="name in row.team" :key="name" class="title-tag team-chip"
                :style="titleStyle[findDoc(name)?.title]">{{ name }}({{ findDoc(name)?.title }})</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-tooltip content="调整医疗团队" placement="top">
                <el-button type="primary" link @click="openBind(row)"><el-icon><Connection /></el-icon></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无患者绑定数据" :image-size="90" />
          </template>
        </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="dmBindPage"
        v-model:page-size="dmBindSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="dmBindTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="dmBindPage = 1"
      />
      </div>
    </template>

    <!-- 团队结构弹窗 -->
    <el-dialog v-model="teamVisible" width="720" class="dm-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>团队结构</h3>
          <p>{{ teamTarget?.name }} 的医疗团队</p>
        </div>
      </template>

      <div class="team-scroll">
        <div v-if="teamTarget" class="member-card root-card">
          <div class="member-head">
            <span class="member-name">{{ teamTarget.name }}</span>
            <span class="title-tag" :style="titleStyle[teamTarget.title]">{{ teamTarget.title }}</span>
          </div>
          <div class="member-info">区域：{{ teamTarget.area }}</div>
          <div class="member-info">医院：{{ teamTarget.hospital }}</div>
          <div class="member-info">科室：{{ teamTarget.dept }}</div>
          <div class="member-info">电话：{{ teamTarget.phone }}</div>
          <div class="member-info">负责患者：{{ teamTarget.patients }} 人</div>
        </div>

        <template v-if="teamChildren.length">
          <div class="sub-title"><el-icon><UserFilled /></el-icon>下级医生</div>
          <TeamMember v-for="c in teamChildren" :key="c.name" :doc="c" />
        </template>
        <el-empty v-else description="该医生暂无下级医生" :image-size="80" />
      </div>

      <template #footer>
        <el-button type="primary" class="btn-blue" size="large" @click="teamVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 调整医患绑定关系弹窗 -->
    <el-dialog v-model="bindVisible" width="640" class="dm-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>调整医患绑定关系</h3>
          <p>为 {{ bindTarget?.patient }} 调整医疗团队</p>
        </div>
      </template>

      <div class="bind-scroll">
        <div class="bind-section-label">当前医疗团队</div>
        <el-empty v-if="!currentDocs.length" :image-size="60" description="暂未绑定医生" />
        <div v-for="d in currentDocs" :key="'cur-' + d.name" class="bind-doc-row">
          <div class="doc-line">
            <span class="title-tag" :style="titleStyle[d.title]">{{ d.title }}</span>
            <span class="doc-name">{{ d.name }}</span>
            <span class="doc-dept">{{ d.dept }}</span>
            <span class="doc-hospital">{{ d.hospital }}</span>
          </div>
          <el-button type="primary" link @click="removeDoc(d.name)">移除</el-button>
        </div>

        <div class="bind-section-label">可添加的医生</div>
        <el-empty v-if="!availableDocs.length" :image-size="60" description="全部医生已添加" />
        <div v-for="d in availableDocs" :key="'add-' + d.name" class="bind-doc-row">
          <div class="doc-line">
            <span class="title-tag" :style="titleStyle[d.title]">{{ d.title }}</span>
            <span class="doc-name">{{ d.name }}</span>
            <span class="doc-dept">{{ d.dept }}</span>
          </div>
          <el-button type="primary" link @click="addDoc(d.name)">添加</el-button>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" class="btn-blue" size="large" @click="finishBind">完成</el-button>
      </template>
    </el-dialog>
    <!-- 修改医生职称弹窗 -->
    <el-dialog v-model="titleVisible" width="560" class="dm-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>修改医生职称</h3>
          <p>修改 {{ titleTarget?.name }} 的职称</p>
        </div>
      </template>

      <div class="title-form">
        <label class="form-label">职称</label>
        <el-select v-model="titleForm" class="full-control" size="large">
          <el-option v-for="t in titleOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <div class="title-tip">
          <el-icon><WarningFilled /></el-icon>
          <span><b>提示：</b>职称层级关系为：主诊 &gt; 主治 &gt; 住院</span>
        </div>
      </div>

      <template #footer>
        <el-button size="large" @click="titleVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="confirmTitle">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.dm-page {
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

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin: 22px 0;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 24px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.stat-value.lead { color: #2563eb; }
.stat-value.attending { color: #16a34a; }
.stat-value.resident { color: #d97706; }

/* 胶囊标签页 */
.main-tabs {
  margin-top: 4px;
}

.main-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 20px 22px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 180px;
}

/* 表格 */
.table-card {
  /* margin-top: 18px; */
  padding: 22px 24px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.title-tag {
  display: inline-block;
  height: 24px;
  line-height: 24px;
  padding: 0 9px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.bind-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.bind-tag.on {
  color: #16a34a;
  background: rgba(220,252,231,0.5);
}

.bind-tag.off {
  color: #6b7280;
  background: rgba(243,244,246,0.5);
}

/* 弹窗通用 */
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

/* 团队结构弹窗 */
.team-scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}

.member-card {
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e5e9f0;
  border-radius: 14px;
}

.root-card {
  border-color: #d8dee9;
  box-shadow: 0 2px 10px rgba(31, 45, 80, 0.05);
}

.member-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.member-name {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.member-info {
  font-size: 13px;
  line-height: 2;
  color: #6b7280;
}

.sub-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 20px 0 12px;
  padding-left: 2px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

/* 下级完整卡片内嵌紧凑成员卡 */
.sub-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  padding-left: 14px;
  border-left: 2px solid #eef0f4;
}

.compact-card {
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.compact-card .member-head {
  margin-bottom: 8px;
}

.compact-card .member-name {
  font-size: 14px;
}

.compact-patients {
  font-size: 13px;
  color: #6b7280;
}

.compact-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

.compact-inner .compact-card {
  background: #fff;
  border: 1px solid #eef0f4;
}

/* 医疗团队标签 */
.team-chip {
  margin: 0 6px 4px 0;
}

/* 调整医患绑定弹窗 */
.bind-scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}

.bind-section-label {
  margin: 18px 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.bind-section-label:first-child {
  margin-top: 4px;
}

.bind-doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.bind-doc-row + .bind-doc-row {
  margin-top: 10px;
}

.doc-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.doc-dept {
  font-size: 13px;
  color: #6b7280;
}

.doc-hospital {
  font-size: 13px;
  color: #9ca3af;
}
/* 修改职称弹窗 */
.title-form {
  margin-top: 6px;
}

.form-label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.title-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #b45309;
}

.title-tip b {
  font-weight: 700;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-card {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.dm-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}

.el-button.btn-blue {
  font-weight: 600;
}

/* 职称下拉浅灰底 */
.el-dialog.dm-dialog .el-select .el-input__wrapper {
  background: #f5f6f8;
  box-shadow: none;
}
</style>