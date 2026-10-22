<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('orders')

// 服务订单状态
const statusTag = { 待服务: 'warning', 服务中: 'primary', 已完成: 'success', 已取消: 'info' }
const statusOptions = ['待服务', '服务中', '已完成', '已取消']

// 服务订单模拟数据（含定位打卡记录）
const orders = ref([
  {
    id: 1, status: '服务中', patient: '张桂芳', age: 72, nurse: '李小华',
    time: '2026-10-15 08:00 ~ 10-16 18:00', content: '术后护理、用药提醒、康复训练',
    health: '膝关节置换术后恢复中，伴高血压', phone: '138****1001',
    checkins: [
      { type: '上岗打卡', time: '2026-10-15 07:56', location: '北京市朝阳区幸福里社区 3 号楼', lng: '116.4721', lat: '39.9085' },
      { type: '下岗打卡', time: '2026-10-15 18:05', location: '北京市朝阳区幸福里社区 3 号楼', lng: '116.4721', lat: '39.9086' },
      { type: '上岗打卡', time: '2026-10-16 07:58', location: '北京市朝阳区幸福里社区 3 号楼', lng: '116.4722', lat: '39.9085' },
      { type: '下岗打卡', time: '2026-10-16 18:02', location: '北京市朝阳区幸福里社区 3 号楼', lng: '116.4720', lat: '39.9086' }
    ]
  },
  {
    id: 2, status: '已完成', patient: '王建国', age: 68, nurse: '王秀兰',
    time: '2026-10-14 09:00 ~ 17:00', content: '康复训练、生活照料',
    health: '脑梗后左侧肢体活动受限', phone: '139****2002',
    checkins: [
      { type: '上岗打卡', time: '2026-10-14 08:55', location: '北京市海淀区健翔园小区 7 号楼', lng: '116.3724', lat: '39.9712' },
      { type: '下岗打卡', time: '2026-10-14 17:06', location: '北京市海淀区健翔园小区 7 号楼', lng: '116.3725', lat: '39.9711' }
    ]
  },
  {
    id: 3, status: '已完成', patient: '刘淑珍', age: 81, nurse: '李小华',
    time: '2026-10-13 08:30 ~ 18:30', content: '卧床护理、鼻饲、翻身拍背',
    health: '长期卧床，糖尿病', phone: '137****3003',
    checkins: [
      { type: '上岗打卡', time: '2026-10-13 08:26', location: '北京市西城区广安门外大街 12 号院', lng: '116.3528', lat: '39.8841' },
      { type: '下岗打卡', time: '2026-10-13 18:34', location: '北京市西城区广安门外大街 12 号院', lng: '116.3528', lat: '39.8842' }
    ]
  },
  {
    id: 4, status: '待服务', patient: '陈志强', age: 65, nurse: '赵敏',
    time: '2026-10-17 10:00 ~ 16:00', content: '透析往返陪护、体征观察',
    health: '慢性肾病，规律透析', phone: '136****4004',
    checkins: []
  },
  {
    id: 5, status: '服务中', patient: '周明远', age: 70, nurse: '赵敏',
    time: '2026-10-15 09:00 ~ 10-17 17:00', content: '阿尔茨海默症照护、陪伴看护',
    health: '阿尔茨海默症中期，认知障碍', phone: '135****5005',
    checkins: [
      { type: '上岗打卡', time: '2026-10-15 08:57', location: '北京市丰台区方庄芳城园 2 区', lng: '116.4389', lat: '39.8673' },
      { type: '下岗打卡', time: '2026-10-15 17:08', location: '北京市丰台区方庄芳城园 2 区', lng: '116.4388', lat: '39.8674' },
      { type: '上岗打卡', time: '2026-10-16 09:02', location: '北京市丰台区方庄芳城园 2 区', lng: '116.4390', lat: '39.8673' },
      { type: '下岗打卡', time: '2026-10-16 17:05', location: '北京市丰台区方庄芳城园 2 区', lng: '116.4389', lat: '39.8674' }
    ]
  },
  {
    id: 6, status: '已取消', patient: '孙丽华', age: 77, nurse: '王秀兰',
    time: '2026-10-12 08:00 ~ 18:00', content: '慢病管理、健康监测',
    health: '冠心病、高血压', phone: '134****6006',
    checkins: []
  }
])

// 搜索（点击查询后生效）
const keyword = ref('')
const filterStatus = ref('')
const applied = ref({ keyword: '', status: '' })

const filteredOrders = computed(() =>
  orders.value.filter((o) => {
    const word = applied.value.keyword.trim()
    const matchWord = !word || [o.patient, o.nurse].some((v) => v.includes(word))
    const matchStatus = !applied.value.status || o.status === applied.value.status
    return matchWord && matchStatus
  })
)

const handleSearch = () => {
  applied.value = { keyword: keyword.value, status: filterStatus.value }
}
const handleReset = () => {
  keyword.value = ''
  filterStatus.value = ''
  applied.value = { keyword: '', status: '' }
}

// 打卡次数统计
const countByType = (checkins, type) => checkins.filter((c) => c.type === type).length

// 详情弹窗
const detailVisible = ref(false)
const current = ref(null)
const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

// 待分配订单
const pendingOrders = ref([
  { id: 101, patient: '李桂兰', age: 83, time: '2026-10-18 08:00 ~ 18:00', content: '术后居家护理、伤口观察' },
  { id: 102, patient: '吴德海', age: 76, time: '2026-10-18 09:00 ~ 17:00', content: '康复训练陪护、辅助行走' },
  { id: 103, patient: '郑小梅', age: 69, time: '2026-10-19 10:00 ~ 16:00', content: '透析往返陪护' }
])

// 健康照护师人员
const nurseOptions = ['李小华', '王秀兰', '赵敏', '孙丽']
const nurses = ref([
  { id: 1, name: '李小华', age: 42, phone: '138****8101', level: '资深照护师', orders: 156, score: 4.9, status: '在岗' },
  { id: 2, name: '王秀兰', age: 38, phone: '138****8102', level: '高级照护师', orders: 128, score: 4.8, status: '在岗' },
  { id: 3, name: '赵敏', age: 35, phone: '138****8103', level: '高级照护师', orders: 112, score: 4.8, status: '休息' },
  { id: 4, name: '孙丽', age: 29, phone: '138****8104', level: '中级照护师', orders: 86, score: 4.7, status: '在岗' },
  { id: 5, name: '周强', age: 45, phone: '138****8105', level: '中级照护师', orders: 54, score: 4.6, status: '休假' }
])
const levelClass = { 资深照护师: 'lv-senior', 高级照护师: 'lv-high', 中级照护师: 'lv-mid', 初级照护师: 'lv-low' }
const nurseStatusTag = { 在岗: 'success', 休息: 'info', 休假: 'warning' }

// 分配照护师弹窗
const assignVisible = ref(false)
const assignTarget = ref(null)
const assignNurse = ref('')
const openAssign = (row) => {
  assignTarget.value = row
  assignNurse.value = ''
  assignVisible.value = true
}
const confirmAssign = () => {
  if (!assignNurse.value) {
    ElMessage.warning('请选择健康照护师')
    return
  }
  const row = assignTarget.value
  orders.value.unshift({
    id: Date.now(), status: '待服务', patient: row.patient, age: row.age,
    nurse: assignNurse.value, time: row.time, content: row.content,
    health: '待服务前进一步评估', phone: '—', checkins: []
  })
  pendingOrders.value = pendingOrders.value.filter((p) => p.id !== row.id)
  assignVisible.value = false
  ElMessage.success(`已分配给 ${assignNurse.value}`)
}
const { page: nsOrderPage, pageSize: nsOrderSize, pagedData: pagedNurseOrders, total: nsOrderTotal } = useTablePage(filteredOrders)
const { page: nsPendingPage, pageSize: nsPendingSize, pagedData: pagedNursePending, total: nsPendingTotal } = useTablePage(pendingOrders)
const { page: nsNursePage, pageSize: nsNurseSize, pagedData: pagedNurses, total: nsNurseTotal } = useTablePage(nurses)
</script>

<template>
  <div class="nurse-page">
    <div class="page-header">
      <h1>健康照护师服务管理</h1>
      <p>管理照护服务订单、待分配订单与照护师人员</p>
    </div>

    <el-tabs v-model="activeTab" class="page-tabs">
      <!-- 服务订单 -->
      <el-tab-pane label="服务订单" name="orders">
        <!-- 搜索区 -->
        <div class="panel filter-card">
          <div class="filter-row">
            <el-input v-model="keyword" class="search-input" size="large" clearable
              placeholder="搜索患者 / 照护师姓名" @keyup.enter="handleSearch">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" class="filter-select" size="large" clearable placeholder="服务状态">
              <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
            </el-select>
            <el-button type="primary" size="large" @click="handleSearch">
              <el-icon><Search /></el-icon>查询
            </el-button>
            <el-button size="large" @click="handleReset">
              <el-icon><RefreshLeft /></el-icon>重置
            </el-button>
          </div>
        </div>

        <!-- 订单表格 -->
        <div class="panel table-card">
          <div class="table-head">
            <h3>服务订单列表</h3>
            <span class="total-badge">共 {{ filteredOrders.length }} 条</span>
          </div>
          <el-table :data="pagedNurseOrders" stripe>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTag[row.status]" round effect="light">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="患者姓名" prop="patient" min-width="100" />
            <el-table-column label="年龄" prop="age" width="70" />
            <el-table-column label="健康照护师" prop="nurse" min-width="110" />
            <el-table-column label="服务时间" prop="time" min-width="210" />
            <el-table-column label="服务内容" prop="content" min-width="180" show-overflow-tooltip />
            <el-table-column label="打卡记录" min-width="130">
              <template #default="{ row }">
                <div class="check-cell">
                  <strong :class="{ muted: !row.checkins.length }">{{ row.checkins.length }} 次</strong>
                  <span v-if="row.checkins.length">上岗 {{ countByType(row.checkins, '上岗打卡') }} · 下岗 {{ countByType(row.checkins, '下岗打卡') }}</span>
                  <span v-else>暂无打卡</span>
                </div>
              </template>
            </el-table-column>
                    <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="查看详情" placement="top">
              <el-button type="primary" link @click="openDetail(row)"><el-icon><View /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
            <template #empty>
              <el-empty description="暂无符合条件的服务订单" :image-size="90" />
            </template>
          </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="nsOrderPage"
        v-model:page-size="nsOrderSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="nsOrderTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="nsOrderPage = 1"
      />
        </div>
      </el-tab-pane>

      <!-- 待分配订单 -->
      <el-tab-pane label="待分配订单" name="pending">
        <div class="panel table-card">
          <div class="table-head">
            <h3>待分配订单</h3>
            <span class="total-badge">共 {{ pendingOrders.length }} 条</span>
          </div>
          <el-table :data="pagedNursePending" stripe>
            <el-table-column label="状态" width="110">
              <template #default>
                <el-tag type="danger" round effect="light">待分配</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="患者姓名" prop="patient" min-width="110" />
            <el-table-column label="年龄" prop="age" width="80" />
            <el-table-column label="预约时间" prop="time" min-width="220" />
            <el-table-column label="服务内容" prop="content" min-width="200" show-overflow-tooltip />
                    <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="分配照护师" placement="top">
              <el-button type="primary" link @click="openAssign(row)"><el-icon><Promotion /></el-icon></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
            <template #empty>
              <el-empty description="暂无待分配订单" :image-size="90" />
            </template>
          </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="nsPendingPage"
        v-model:page-size="nsPendingSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="nsPendingTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="nsPendingPage = 1"
      />
        </div>
      </el-tab-pane>

      <!-- 健康照护师人员 -->
      <el-tab-pane label="健康照护师人员" name="nurses">
        <div class="panel table-card">
          <div class="table-head">
            <h3>照护师人员列表</h3>
            <span class="total-badge">共 {{ nurses.length }} 人</span>
          </div>
          <el-table :data="pagedNurses" stripe>
            <el-table-column label="姓名" prop="name" min-width="100" />
            <el-table-column label="年龄" prop="age" width="70" />
            <el-table-column label="联系电话" prop="phone" min-width="130" />
            <el-table-column label="等级" min-width="120">
              <template #default="{ row }">
                <span class="lv-tag" :class="levelClass[row.level]">{{ row.level }}</span>
              </template>
            </el-table-column>
            <el-table-column label="服务订单" min-width="100">
              <template #default="{ row }">{{ row.orders }} 单</template>
            </el-table-column>
            <el-table-column label="评分" min-width="110">
              <template #default="{ row }">
                <el-icon class="score-star"><StarFilled /></el-icon>{{ row.score }}
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="90">
              <template #default="{ row }">
                <el-tag :type="nurseStatusTag[row.status]" round effect="light">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="nsNursePage"
        v-model:page-size="nsNurseSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="nsNurseTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="nsNursePage = 1"
      />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 服务订单详情弹窗 -->
    <el-dialog v-model="detailVisible" width="760px" class="detail-dialog" top="6vh">
      <template #header>
        <div class="dialog-heading">
          <h3>服务订单详情</h3>
          <p v-if="current">订单编号 NO.{{ current.id }} · {{ current.patient }}</p>
        </div>
      </template>

      <template v-if="current">
        <!-- 基本信息 -->
        <div class="detail-module">
          <h4 class="module-title"><el-icon><InfoFilled /></el-icon>基本信息</h4>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">患者姓名</span><span class="info-value">{{ current.patient }}</span></div>
            <div class="info-item"><span class="info-label">年龄</span><span class="info-value">{{ current.age }} 岁</span></div>
            <div class="info-item"><span class="info-label">照护师姓名</span><span class="info-value">{{ current.nurse }}</span></div>
            <div class="info-item"><span class="info-label">联系方式</span><span class="info-value">{{ current.phone }}</span></div>
            <div class="info-item"><span class="info-label">服务时间</span><span class="info-value">{{ current.time }}</span></div>
            <div class="info-item">
              <span class="info-label">服务状态</span>
              <el-tag :type="statusTag[current.status]" round effect="light" size="small">{{ current.status }}</el-tag>
            </div>
            <div class="info-item full"><span class="info-label">服务内容</span><span class="info-value">{{ current.content }}</span></div>
            <div class="info-item full"><span class="info-label">健康状况</span><span class="info-value">{{ current.health }}</span></div>
          </div>
        </div>

        <!-- 定位打卡记录 -->
        <div class="detail-module">
          <h4 class="module-title">
            <el-icon><MapLocation /></el-icon>定位打卡记录
            <em>共 {{ current.checkins.length }} 条</em>
          </h4>
          <div v-if="current.checkins.length" class="checkin-list">
            <div v-for="(item, idx) in current.checkins" :key="idx" class="checkin-item">
              <div class="checkin-main">
                <div class="checkin-row">
                  <el-tag :type="item.type === '上岗打卡' ? 'success' : 'primary'" size="small" round>
                    {{ item.type }}
                  </el-tag>
                  <span class="checkin-time">{{ item.time }}</span>
                </div>
                <div class="checkin-row loc">
                  <el-icon><LocationInformation /></el-icon>{{ item.location }}
                </div>
                <div class="checkin-row coord">经度 {{ item.lng }} · 纬度 {{ item.lat }}</div>
              </div>
              <div class="checkin-photo">
                <el-icon><Camera /></el-icon>
                <span>打卡照片</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无打卡记录" :image-size="70" />
        </div>
      </template>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分配照护师弹窗 -->
    <el-dialog v-model="assignVisible" width="440px" class="assign-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>分配健康照护师</h3>
          <p v-if="assignTarget">为患者「{{ assignTarget.patient }}」分配照护师</p>
        </div>
      </template>
      <el-select v-model="assignNurse" size="large" class="assign-select" placeholder="请选择健康照护师">
        <el-option v-for="n in nurseOptions" :key="n" :label="n" :value="n" />
      </el-select>
      <template #footer>
        <el-button size="large" @click="assignVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="confirmAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.nurse-page {
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

/* 标签页 */
.page-tabs {
  margin-top: 18px;
}

.page-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

/* 筛选区 */
.filter-card {
  padding: 20px 22px;
  margin-bottom:20px
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.filter-row .el-button--primary {
  margin-left: auto;
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
  padding: 22px 24px;
}

.table-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.table-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.total-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #374151;
  --el-table-border-color: #f1f3f7;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
}

.check-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.check-cell strong {
  color: #2563eb;
}

.check-cell strong.muted {
  color: #9ca3af;
}

.check-cell span {
  font-size: 12px;
  color: #9ca3af;
}

.score-star {
  margin-right: 4px;
  color: #f59e0b;
  vertical-align: -2px;
}

/* 照护师等级标签 */
.lv-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.lv-senior {
  background: rgba(232,241,255,0.5);
  color: #2563eb;
}

.lv-high {
  background: rgba(220,252,231,0.5);
  color: #16a34a;
}

.lv-mid {
  background: rgba(255,244,229,0.5);
  color: #f97316;
}

.lv-low {
  background: rgba(243,244,246,0.5);
  color: #4b5563;
}

/* 详情弹窗 */
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

.detail-module {
  margin-bottom: 24px;
}

.detail-module:last-child {
  margin-bottom: 0;
}

.module-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
}

.module-title em {
  margin-left: 6px;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  color: #9ca3af;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.info-item.full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

/* 打卡记录 */
.checkin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  transition: border-color 0.2s ease;
}

.checkin-item:hover {
  border-color: #bfdbfe;
}

.checkin-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkin-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.checkin-time {
  font-weight: 600;
}

.checkin-row.loc {
  color: #4b5563;
}

.checkin-row.loc .el-icon {
  color: #2563eb;
}

.checkin-row.coord {
  font-size: 12px;
  color: #9ca3af;
  padding-left: 2px;
}

.checkin-photo {
  flex-shrink: 0;
  width: 86px;
  height: 68px;
  border-radius: 10px;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #2563eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
}

.checkin-photo .el-icon {
  font-size: 22px;
}

/* 分配弹窗 */
.assign-select {
  width: 100%;
}

@media (max-width: 992px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .filter-row {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .checkin-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.detail-dialog,
.el-dialog.assign-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
</style>