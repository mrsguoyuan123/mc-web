<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 客服等级配置（星级、配色、标准）
const levelMap = {
  初级: { stars: 1, color: '#6b7280', desc: '新入职客服或待提升', rate: '答复率 < 90%', time: '平均响应 ≥ 6 分钟' },
  中级: { stars: 3, color: '#16a34a', desc: '可独立处理常见咨询', rate: '答复率 ≥ 90%', time: '平均响应 ≤ 5 分钟' },
  高级: { stars: 4, color: '#2563eb', desc: '可处理复杂咨询问题', rate: '答复率 ≥ 95%', time: '平均响应 ≤ 4 分钟' },
  资深: { stars: 5, color: '#9333ea', desc: '专家级客服与带教', rate: '答复率 ≥ 98%', time: '平均响应 ≤ 3 分钟' }
}
const levelOptions = ['初级', '中级', '高级', '资深']
const starText = (lv) => '★'.repeat(levelMap[lv].stars)

// 顶部统计卡片
const stats = [
  { label: '在职客服', value: '5', unit: '人', desc: '全部在岗', icon: 'User' },
  { label: '平均答复率', value: '92.5', unit: '%', desc: '较上月 +2.3%', icon: 'ChatDotRound' },
  { label: '平均响应时间', value: '4.4', unit: '分', desc: '较上月 -0.5 分', icon: 'Timer' },
  { label: '平均满意度', value: '4.4', unit: '分', desc: '满分 5.0', icon: 'Star' }
]

// 绩效模拟数据
const staffList = ref([
  { id: 1, name: '张小美', level: '资深', rate: 98.5, up: true, response: 2.3, score: 4.8, messages: 1250, grade: '优秀' },
  { id: 2, name: '李文静', level: '高级', rate: 95.2, up: true, response: 3.5, score: 4.6, messages: 980, grade: '优秀' },
  { id: 3, name: '王明', level: '中级', rate: 92.8, up: false, response: 4.2, score: 4.4, messages: 750, grade: '优秀' },
  { id: 4, name: '赵丽', level: '中级', rate: 90.5, up: false, response: 5.1, score: 4.3, messages: 620, grade: '良好' },
  { id: 5, name: '刘洋', level: '初级', rate: 85.3, up: false, response: 6.8, score: 4.1, messages: 420, grade: '良好' }
])

// 本周排班模拟数据
const activeTab = ref('perf')
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const shiftClass = { 早: 'sh-early', 中: 'sh-middle', 晚: 'sh-late', 休: 'sh-rest' }
const schedules = [
  { name: '张小美', shifts: ['早', '早', '中', '中', '晚', '休', '休'] },
  { name: '李文静', shifts: ['中', '中', '晚', '晚', '早', '早', '休'] },
  { name: '王明', shifts: ['早', '早', '早', '晚', '中', '休', '休'] },
  { name: '赵丽', shifts: ['晚', '晚', '休', '休', '中', '中', '早'] },
  { name: '刘洋', shifts: ['休', '休', '早', '早', '晚', '中', '中'] }
]

// 调整等级弹窗
const dialogVisible = ref(false)
const current = ref(null)
const selectedLevel = ref('')

const openAdjust = (row) => {
  current.value = row
  selectedLevel.value = row.level
  dialogVisible.value = true
}

// 仅选中高亮，不立即生效
const selectLevel = (lv) => {
  selectedLevel.value = lv
}

// 确认后才更新等级并关闭弹窗
const confirmLevel = () => {
  if (!current.value) return
  const changed = current.value.level !== selectedLevel.value
  current.value.level = selectedLevel.value
  if (changed) {
    ElMessage.success(`已将 ${current.value.name} 调整为${selectedLevel.value}`)
  }
  dialogVisible.value = false
}
const { page: schPerfPage, pageSize: schPerfSize, pagedData: pagedPerfStaff, total: schPerfTotal } = useTablePage(staffList)
const { page: schPage, pageSize: schSize, pagedData: pagedSchedules, total: schTotal } = useTablePage(schedules)
</script>

<template>
  <div class="schedule-page">
    <div class="page-header">
      <h1>排班管理</h1>
      <p>客服排班、答复效率统计与分级管理</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="panel stat-card">
        <div class="stat-top">
          <span class="stat-label">{{ item.label }}</span>
          <el-icon class="stat-icon"><component :is="item.icon" /></el-icon>
        </div>
        <div class="stat-num">{{ item.value }}<em>{{ item.unit }}</em></div>
        <span class="stat-desc">{{ item.desc }}</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="seg-tabs">
      <!-- 效率统计与分级 -->
      <el-tab-pane label="效率统计与分级" name="perf">
        <div class="panel content-panel">
          <div class="section-head">
            <h3>客服绩效统计</h3>
            <p>答复效率、满意度及等级评定</p>
          </div>
          <el-table :data="pagedPerfStaff" stripe>
            <el-table-column label="客服姓名" prop="name" min-width="110" />
            <el-table-column label="等级" min-width="150">
              <template #default="{ row }">
                <span class="lv-badge" :style="{ background: levelMap[row.level].color }">
                  {{ row.level }}<i>{{ starText(row.level) }}</i>
                </span>
              </template>
            </el-table-column>
            <el-table-column label="答复率" min-width="120">
              <template #default="{ row }">
                <span>{{ row.rate }}%</span>
                <el-icon v-if="row.up" class="trend-up"><TrendCharts /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="平均响应时间" min-width="130">
              <template #default="{ row }">{{ row.response }} 分钟</template>
            </el-table-column>
            <el-table-column label="满意度" min-width="100">
              <template #default="{ row }">
                <el-icon class="score-star"><StarFilled /></el-icon>{{ row.score }}
              </template>
            </el-table-column>
            <el-table-column label="总消息数" min-width="100">
              <template #default="{ row }">{{ row.messages.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="绩效评定" min-width="100">
              <template #default="{ row }">
                <span class="grade" :class="row.grade === '优秀' ? 'good' : 'normal'">{{ row.grade }}</span>
              </template>
            </el-table-column>
                    <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="调整等级" placement="top">
              <el-button type="primary" link @click="openAdjust(row)"><el-icon><Avatar /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
          </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="schPerfPage"
        v-model:page-size="schPerfSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="schPerfTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="schPerfPage = 1"
      />
        </div>

        <!-- 等级标准 -->
        <div class="panel content-panel">
          <div class="section-head">
            <h3>客服等级标准</h3>
            <p>各等级答复率与响应时间要求</p>
          </div>
          <div class="standard-grid">
            <div v-for="lv in levelOptions" :key="lv" class="standard-card">
              <span class="lv-badge" :style="{ background: levelMap[lv].color }">
                {{ lv }}<i>{{ starText(lv) }}</i>
              </span>
              <p class="sd-desc">{{ levelMap[lv].desc }}</p>
              <p class="sd-metric">{{ levelMap[lv].rate }}</p>
              <p class="sd-metric">{{ levelMap[lv].time }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 排班管理 -->
      <el-tab-pane label="排班管理" name="schedule">
        <div class="panel content-panel">
          <div class="section-head">
            <h3>本周排班表</h3>
            <p>早班 08:00-14:00 · 中班 14:00-20:00 · 晚班 20:00-08:00</p>
          </div>
          <el-table :data="pagedSchedules" stripe>
            <el-table-column label="客服" prop="name" width="120" />
            <el-table-column v-for="(day, index) in weekDays" :key="day" :label="day" align="center">
              <template #default="{ row }">
                <span class="shift-tag" :class="shiftClass[row.shifts[index]]">
                  {{ row.shifts[index] === '休' ? '休息' : row.shifts[index] + '班' }}
                </span>
              </template>
            </el-table-column>
          </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="schPage"
        v-model:page-size="schSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="schTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="schPage = 1"
      />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 调整等级弹窗 -->
    <el-dialog v-model="dialogVisible" width="620px" class="level-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>调整客服等级</h3>
          <p v-if="current">调整 {{ current.name }} 的等级</p>
        </div>
      </template>

      <div class="current-level">
        <span class="block-label">当前等级</span>
        <span v-if="current" class="lv-badge" :style="{ background: levelMap[current.level].color }">
          {{ current.level }}<i>{{ starText(current.level) }}</i>
        </span>
      </div>

      <div class="new-level">
        <span class="block-label">新等级</span>
        <div class="level-options">
          <div
            v-for="lv in levelOptions"
            :key="lv"
            class="level-option"
            :class="{ active: selectedLevel === lv }"
            @click="selectLevel(lv)"
          >
            <span class="lv-badge" :style="{ background: levelMap[lv].color }">
              {{ lv }}<i>{{ starText(lv) }}</i>
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="confirmLevel">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.schedule-page {
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
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-icon {
  font-size: 18px;
  color: #9ca3af;
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-num em {
  margin-left: 4px;
  font-size: 15px;
  font-style: normal;
  font-weight: 500;
  color: #6b7280;
}

.stat-desc {
  font-size: 12px;
  color: #9ca3af;
}

/* 分段标签页 */
.seg-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

.content-panel {
  margin-top: 18px;
  padding: 22px 24px;
}

.section-head h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.section-head p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #9ca3af;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

/* 等级徽章 */
.lv-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.lv-badge i {
  font-style: normal;
  font-size: 11px;
  letter-spacing: 1px;
}

.trend-up {
  margin-left: 6px;
  font-size: 14px;
  color: #16a34a;
  vertical-align: -2px;
}

.score-star {
  margin-right: 4px;
  color: #f59e0b;
  vertical-align: -2px;
}

.grade {
  font-weight: 600;
}

.grade.good {
  color: #16a34a;
}

.grade.normal {
  color: #2563eb;
}

/* 等级标准卡片 */
.standard-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.standard-card {
  padding: 18px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  transition: border-color 0.2s ease;
}

.standard-card:hover {
  border-color: #bfdbfe;
}

.sd-desc {
  margin: 12px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.sd-metric {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

/* 排班表班次 */
.shift-tag {
  display: inline-block;
  min-width: 44px;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.sh-early {
  background: #eff6ff;
  color: #2563eb;
}

.sh-middle {
  background: #dbeafe;
  color: #1d4ed8;
}

.sh-late {
  background: #2563eb;
  color: #fff;
}

.sh-rest {
  background: #f1f5f9;
  color: #94a3b8;
}

/* 调整等级弹窗 */
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

.block-label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.new-level {
  margin-top: 22px;
}

.level-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.level-option {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.level-option:hover {
  border-color: #93c5fd;
}

.level-option.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 1px #2563eb inset;
}

@media (max-width: 992px) {
  .stats-grid,
  .standard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .level-options {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.level-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>