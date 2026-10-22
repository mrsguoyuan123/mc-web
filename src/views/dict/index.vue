<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()



// 顶部统计
const stats = [
  { type: 'building', label: '医院总数', value: 5,unit:'家', desc: '医疗机构', theme: 'blue' },
  { type: 'location', label: '院区总数', value: 5,unit:'个',  desc: '院区', theme: 'green' },
  { type: 'stethoscope', label: '科室总数', value: 6,unit:'个',  desc: '科室', theme: 'red' }
]

// 管理模块
const modules = [
  {
    type: 'building',
    title: '医院管理',
    desc: '管理医疗机构的基本信息、等级、类型等',
    count: 5,
    path: '/hospital',
    theme: 'blue'
  },
  {
    type: 'location',
    title: '院区管理',
    desc: '管理医院的各个院区信息、床位配置等',
    count: 5,
    path: '/hospitalArea',
    theme: 'green'
  },
  {
    type: 'stethoscope',
    title: '科室管理',
    desc: '管理医院科室信息、医生配置、床位分配等',
    count: 6,
    path: '/department',
    theme: 'purple'
  }
]

// 使用步骤
const steps = [
  {
    title: '医院管理',
    content: '首先在医院管理中添加医疗机构的基本信息，包括医院名称、等级、类型、地址等。',
    theme: 'blue'
  },
  {
    title: '院区管理',
    content: '在院区管理中为每家医院添加院区信息，如总院、分院、东院区、西院区等，并配置床位数量。',
    theme: 'green'
  },
  {
    title: '科室管理',
    content: '最后在科室管理中为各院区添加科室信息，包括科室名称、分类、医生配置、床位分配等。',
    theme: 'purple'
  }
]

const levels = [
  { label: '医院', level: '一级', type: 'building', theme: 'blue' },
  { label: '院区', level: '二级', type: 'location', theme: 'green' },
  { label: '科室', level: '三级', type: 'stethoscope', theme: 'purple' }
]

const go = (path) => router.push(path)
</script>

<template>
  <div class="dict-page">
    <div class="page-header">
      <h1>字典维护</h1>
      <p>管理系统基础数据字典</p>
    </div>

   
    <!-- 统计卡片 -->
   
    <div class="stats-grid">
      <div v-for="m in stats" :key="m.label" class="panel monitor-card">
        <div class="monitor-top">
          <span class="monitor-label">{{ m.label }}</span>
          <span class="monitor-value">{{ m.value }}<small>{{ m.unit }}</small></span>
        </div>
        <div class="monitor-bottom">
         
          <span class="monitor-icon" :class="m.theme">
            <el-icon v-if="m.type === 'building'"><OfficeBuilding /></el-icon>
            <el-icon v-else-if="m.type === 'location'"><Location /></el-icon>
            <svg v-else class="stethoscope" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
              <circle cx="20" cy="10" r="2" />
            </svg>
          </span>
          <span class="stat-desc" :class="m.up ? 'up' : 'down'">
             {{ m.desc }}
          </span>
        </div>
      </div>
    </div>

    <!-- 管理模块 -->
    <h2 class="section-title">管理模块</h2>
    <div class="module-grid">
      <div v-for="m in modules" :key="m.title" class="panel module-card" :class="m.theme">
        <span class="icon-tile lg" :class="m.theme">
          <el-icon v-if="m.type === 'building'"><OfficeBuilding /></el-icon>
          <el-icon v-else-if="m.type === 'location'"><Location /></el-icon>
          <svg v-else class="stethoscope" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        </span>
        <h3 class="module-title">{{ m.title }}</h3>
        <p class="module-desc">{{ m.desc }}</p>
        <div class="module-footer">
          <span class="module-count">共 {{ m.count }} 条数据</span>
          <button class="enter-btn" @click="go(m.path)">
            进入管理
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="panel guide-card">
      <div class="card-heading">
        <el-icon><Document /></el-icon>
        <span>使用说明</span>
      </div>
      <div class="step-list">
        <div v-for="(step, index) in steps" :key="step.title" class="step-item">
          <span class="step-no" :class="step.theme">{{ index + 1 }}</span>
          <div class="step-body">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-content">{{ step.content }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据层级关系 -->
    <div class="panel level-card">
      <h3 class="level-heading">数据层级关系</h3>
      <p class="level-sub">字典数据之间的层级结构</p>
      <div class="level-flow">
        <template v-for="(node, index) in levels" :key="node.label">
          <div class="level-node">
            <span class="level-tile" :class="node.theme">
              <el-icon v-if="node.type === 'building'"><OfficeBuilding /></el-icon>
              <el-icon v-else-if="node.type === 'location'"><Location /></el-icon>
              <svg v-else class="stethoscope" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
              <em>{{ node.label }}</em>
            </span>
            <span class="level-name">{{ node.level }}</span>
          </div>
          <el-icon v-if="index < levels.length - 1" class="flow-arrow"><Right /></el-icon>
        </template>
      </div>
      <div class="level-note">
        医院 → 院区 → 科室，三级数据相互关联，请按顺序进行配置
      </div>
    </div>
  </div>
</template>
<style scoped>
.dict-page {
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 22px;
  font-size: 13px;
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid #f0f1f5;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

/* 主题色 */
.blue {
  color: #2f6bff;
}
.green {
  color: #16a362;
}
.purple {
  color: #9333ea;
}

.icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-tile.sm {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  font-size: 18px;
}

.icon-tile.lg {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  font-size: 26px;
}

.icon-tile.blue {
  background: #e8f0ff;
}
.icon-tile.green {
  background: #e7f7ef;
}
.icon-tile.purple {
  background: #f4ecff;
}

.stethoscope {
  width: 19px;
  height: 19px;
}

.icon-tile.lg .stethoscope {
  width: 27px;
  height: 27px;
}

/* 实时监测卡片 */
.monitor-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.monitor-card {
  padding: 24px 28px;
  border-radius: 20px;
}

.monitor-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.monitor-label {
  font-size: 15px;
  color: #1f2937;
}

.monitor-value {
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.monitor-value small {
  margin-left: 4px;
  font-size: 15px;
  font-weight: 400;
  color: #9ca3af;
}

.monitor-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 26px;
}

.monitor-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
}
.monitor-icon i{
  font-size: 1.5em;
}
.monitor-icon svg {
  width: 25px;
  height: 25px;
}

.monitor-icon.red { background: #fee2e2; color: #ef4444; }
.monitor-icon.green { background: #dcfce7; color: #16a34a; }
.monitor-icon.blue { background: #e8f0ff; color: #4f6bff; }
.monitor-icon.cyan { background: #e0f2fe; color: #0284c7; }

.monitor-rate {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: #9ca3af;
}

.monitor-rate.up { color: #ef4444; }
.monitor-rate.down { color: #16a34a; }

/* 统计卡片 */
.stats-grid,
.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  padding: 30px 32px;
  border-radius: 20px;
}

.stat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.stat-card .icon-tile.sm {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  font-size: 30px;
}

.stat-label {
  font-size: 15px;
  color: #1f2937;
}

.stat-value {
  margin-top: 26px;
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
}

.stat-desc {
  margin-top: 14px;
  font-size: 16px;
  color: #9ca3af;
}
/* 管理模块 */
.section-title {
  margin: 30px 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.module-card {
  padding: 24px 22px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(31, 45, 80, 0.12);
}

.module-title {
  margin: 18px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.module-desc {
  /* margin: 0 0 22px;
  min-height: 40px; */
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

.module-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-count {
  font-size: 13px;
  color: #9ca3af;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.enter-btn .el-icon {
  font-size: 14px;
}

.module-card:hover .enter-btn {
  color: #2f6bff;
  background: #eef4ff;
}

.module-card:hover .module-title {
  color: #2f6bff;
}
.module-card.green:hover .module-title,
.module-card.green:hover .enter-btn {
  color: #16a362;
}
.module-card.green:hover .enter-btn {
  background: #e9f8f0;
}

.module-card.purple:hover .module-title,
.module-card.purple:hover .enter-btn {
  color: #9333ea;
}
.module-card.purple:hover .enter-btn {
  background: #f6effe;
}

/* 使用说明 */
.guide-card,
.level-card {
  margin-top: 22px;
  padding: 24px 26px;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.card-heading .el-icon {
  font-size: 18px;
}

.step-list {
  margin-top: 20px;
}

.step-item {
  display: flex;
  gap: 16px;
  padding: 10px 0;
}

.step-no {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-style: normal;
  flex-shrink: 0;
}

.step-no.blue {
  background: #e8f0ff;
}
.step-no.green {
  background: #e7f7ef;
}
.step-no.purple {
  background: #f4ecff;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
}

.step-content {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}
/* 数据层级关系 */
.level-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.level-sub {
  margin: 6px 0 26px;
  font-size: 12px;
  color: #9ca3af;
}

.level-flow {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.level-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.level-tile {
  width: 104px;
  height: 96px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 26px;
  font-style: normal;
}

.level-tile.blue {
  background: #eef4ff;
}
.level-tile.green {
  background: #ebf9f1;
}
.level-tile.purple {
  background: #f7f0ff;
}

.level-tile em {
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
}

.level-tile .stethoscope {
  width: 26px;
  height: 26px;
}

.level-name {
  font-size: 12px;
  color: #9ca3af;
}

.flow-arrow {
  margin: 36px 26px 0;
  font-size: 22px;
  color: #9ca3af;
}

.level-note {
  margin-top: 30px;
  padding: 16px;
  border-radius: 10px;
  background: #f7f8fa;
  text-align: center;
  font-size: 13px;
  color: #4b5563;
}

@media (max-width: 992px) {
  .monitor-grid,
  .stats-grid,
  .module-grid {
    grid-template-columns: 1fr;
  }

  .module-desc {
    min-height: 0;
  }
}
</style>