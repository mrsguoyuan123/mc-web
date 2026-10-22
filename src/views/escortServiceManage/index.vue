<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 状态配色
const statusMap = {
  服务完毕: { color: '#16a34a', bg: 'rgba(220,252,231,0.5)' },
  服务中: { color: '#2563eb', bg: 'rgba(232,241,255,0.5)' },
  待分配: { color: '#f97316', bg: 'rgba(255,244,229,0.5)' }
}

// 打卡记录模板
const checkinPhoto = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300'
const mkCheckins = (date, place, addr, lng, lat, finished) => {
  const list = [
    { type: '到达打卡', time: `${date} 08:45:20`, place, addr, lng, lat, photo: checkinPhoto }
  ]
  if (finished) {
    list.push({ type: '完成打卡', time: `${date} 14:30:15`, place, addr, lng, lat, photo: checkinPhoto })
  }
  return list
}

// 服务订单模拟数据
const orders = ref([
  { id: 1, status: '服务完毕', patient: '赵国强', age: 73, staff: '李建民', date: '2026-4-10', service: '陪诊', dest: '北京协和医院', checkinCount: 2, phone: '13756892341', addr: '北京市东城区帅府园1号（北京协和医院）', lng: '116.4074', lat: '39.9139', checkins: mkCheckins('2026-04-10', '北京协和医院', '北京市东城区帅府园1号（北京协和医院）', '116.4074', '39.9139', true) },
  { id: 2, status: '服务完毕', patient: '钱秀兰', age: 68, staff: '张志强', date: '2026-4-12', service: '检查陪同', dest: '上海瑞金医院', checkinCount: 2, phone: '15812367894', addr: '上海市黄浦区瑞金二路197号', lng: '121.4737', lat: '31.2304', checkins: mkCheckins('2026-04-12', '上海瑞金医院', '上海市黄浦区瑞金二路197号', '121.4737', '31.2304', true) },
  { id: 3, status: '服务完毕', patient: '孙丽娟', age: 80, staff: '王德华', date: '2026-4-15', service: '取药陪同', dest: '广州中山医院', checkinCount: 1, phone: '13923458761', addr: '广州市越秀区中山二路58号', lng: '113.2644', lat: '23.1291', checkins: mkCheckins('2026-04-15', '广州中山医院', '广州市越秀区中山二路58号', '113.2644', '23.1291', false) },
  { id: 4, status: '服务中', patient: '李晓明', age: 65, staff: '刘永康', date: '2026-4-18', service: '住院陪护', dest: '深圳人民医院', checkinCount: 1, phone: '15867234590', addr: '深圳市罗湖区东门北路1017号', lng: '114.0579', lat: '22.5431', checkins: mkCheckins('2026-04-18', '深圳人民医院', '深圳市罗湖区东门北路1017号', '114.0579', '22.5431', false) },
  { id: 5, status: '服务中', patient: '吴海燕', age: 70, staff: '陈国平', date: '2026-4-20', service: '陪诊', dest: '北京朝阳医院', checkinCount: 1, phone: '15934562187', addr: '北京市朝阳区工人体育场南路8号', lng: '116.4419', lat: '39.9219', checkins: mkCheckins('2026-04-20', '北京朝阳医院', '北京市朝阳区工人体育场南路8号', '116.4419', '39.9219', false) },
  { id: 6, status: '服务完毕', patient: '郑建国', age: 76, staff: '李建民', date: '2026-4-21', service: '检查陪同', dest: '北京协和医院', checkinCount: 2, phone: '13587654321', addr: '北京市东城区帅府园1号（北京协和医院）', lng: '116.4074', lat: '39.9139', checkins: mkCheckins('2026-04-21', '北京协和医院', '北京市东城区帅府园1号（北京协和医院）', '116.4074', '39.9139', true) },
  { id: 7, status: '服务中', patient: '冯秀珍', age: 69, staff: '张志强', date: '2026-4-22', service: '康复陪护', dest: '上海瑞金医院', checkinCount: 1, phone: '13823456789', addr: '上海市黄浦区瑞金二路197号', lng: '121.4737', lat: '31.2304', checkins: mkCheckins('2026-04-22', '上海瑞金医院', '上海市黄浦区瑞金二路197号', '121.4737', '31.2304', false) }
])

// 待分配订单
const pendingOrders = ref([
  { id: 8, patient: '吴雅琴', age: 72, date: '2026-04-21 10:30:00', service: '检查陪同', dest: '北京协和医院', phone: '15934562187', staff: '' },
  { id: 9, patient: '郑小玲', age: 66, date: '2026-04-21 14:15:00', service: '陪诊', dest: '上海瑞金医院', phone: '13987654321', staff: '' }
])

// 陪诊人员
const staffList = ref([
  { name: '李建民', status: '空闲', area: '北京东城区', phone: '13512345670' },
  { name: '张志强', status: '空闲', area: '上海黄浦区', phone: '13687654329' },
  { name: '王德华', status: '忙碌', area: '广州越秀区', phone: '13798765438' },
  { name: '刘永康', status: '忙碌', area: '深圳罗湖区', phone: '13823456787' },
  { name: '陈国平', status: '忙碌', area: '北京朝阳区', phone: '13945678906' }
])

const activeTab = ref('orders')

// 筛选
const filters = reactive({ keyword: '', status: '' })
const applied = reactive({ keyword: '', status: '' })
const filteredOrders = computed(() =>
  orders.value.filter((o) => {
    const word = applied.keyword.trim()
    const matchWord = !word || o.patient.includes(word) || o.staff.includes(word)
    return matchWord && (!applied.status || o.status === applied.status)
  })
)
const handleSearch = () => { Object.assign(applied, filters); page.value = 1 }
const handleReset = () => {
  filters.keyword = filters.status = ''
  Object.assign(applied, filters)
  page.value = 1
}

// 分页
const page = ref(1)
const pageSize = ref(10)
const pagedOrders = computed(() =>
  filteredOrders.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)
handleReset()

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)
const openDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

// 分配弹窗
const assignVisible = ref(false)
const assignTarget = ref(null)
const assignStaff = ref('')
const openAssign = (row) => {
  assignTarget.value = row
  assignStaff.value = row.staff || ''
  assignVisible.value = true
}
const confirmAssign = () => {
  if (!assignStaff.value) {
    ElMessage.warning('请选择陪诊人员')
    return
  }
  assignTarget.value.staff = assignStaff.value
  orders.value.unshift({
    id: assignTarget.value.id,
    status: '服务中',
    patient: assignTarget.value.patient,
    age: assignTarget.value.age,
    staff: assignStaff.value,
    date: assignTarget.value.date,
    service: assignTarget.value.service,
    dest: assignTarget.value.dest,
    checkinCount: 0,
    phone: assignTarget.value.phone,
    addr: assignTarget.value.dest,
    lng: '—', lat: '—',
    checkins: []
  })
  pendingOrders.value = pendingOrders.value.filter((o) => o.id !== assignTarget.value.id)
  assignVisible.value = false
  ElMessage.success('分配成功')
}
const { page: esPendingPage, pageSize: esPendingSize, pagedData: pagedPending, total: esPendingTotal } = useTablePage(pendingOrders)
const { page: esStaffPage, pageSize: esStaffSize, pagedData: pagedStaffList, total: esStaffTotal } = useTablePage(staffList)
</script>
<template>
  <div class="esc-page">
    <div class="page-header">
      <div>
        <h1>陪诊服务管理</h1>
        <p>管理陪诊服务订单和人员分配</p>
      </div>
    </div>

    <!-- 顶部标签 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <el-tab-pane label="服务订单" name="orders" />
      <el-tab-pane label="待分配订单" name="pending" />
      <el-tab-pane label="陪诊人员" name="staff" />
    </el-tabs>

    <!-- 服务订单 -->
    <template v-if="activeTab === 'orders'">
      <div class="panel filter-card">
        <el-input v-model="filters.keyword" class="search-input" size="large" clearable
          placeholder="请输入患者或陪诊人员姓名" @keyup.enter="handleSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.status" class="filter-select" size="large" clearable placeholder="全部状态">
          <el-option label="服务完毕" value="服务完毕" />
          <el-option label="服务中" value="服务中" />
        </el-select>
        <el-button type="primary" class="btn-blue" size="large" @click="handleSearch">查询</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>

      <div class="panel table-card">
        <el-table :data="pagedOrders" stripe>
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <span class="status-tag" :style="{ color: statusMap[row.status].color, background: statusMap[row.status].bg }">
                {{ row.status }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="患者姓名" prop="patient" min-width="90" />
          <el-table-column label="年龄" min-width="70">
            <template #default="{ row }">{{ row.age }}岁</template>
          </el-table-column>
          <el-table-column label="陪诊人员" prop="staff" min-width="90" />
          <el-table-column label="服务时间" prop="date" min-width="100" />
          <el-table-column label="服务内容" prop="service" min-width="100" />
          <el-table-column label="目的地" prop="dest" min-width="120" show-overflow-tooltip />
          <el-table-column label="打卡记录" min-width="90">
            <template #default="{ row }">
              <span :class="['checkin-count', { zero: row.checkinCount === 0 }]">{{ row.checkinCount }}次打卡</span>
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
            <el-empty description="暂无符合条件的订单" :image-size="90" />
          </template>
        </el-table>
        <el-pagination class="list-pager" background
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredOrders.length"
          layout="total, prev, pager, next, sizes"
          @size-change="page = 1" />
      </div>
    </template>

    <!-- 待分配订单 -->
    <template v-if="activeTab === 'pending'">
      <div class="panel table-card">
        <el-table :data="pagedPending" stripe>
          <el-table-column label="患者姓名" prop="patient" min-width="100" />
          <el-table-column label="年龄" min-width="80">
            <template #default="{ row }">{{ row.age }}岁</template>
          </el-table-column>
          <el-table-column label="下单时间" prop="date" min-width="170" />
          <el-table-column label="服务内容" prop="service" min-width="110" />
          <el-table-column label="目的地" prop="dest" min-width="140" />
          <el-table-column label="联系方式" prop="phone" min-width="130" />
                  <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="分配陪诊" placement="top">
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
        v-model:current-page="esPendingPage"
        v-model:page-size="esPendingSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="esPendingTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="esPendingPage = 1"
      />
      </div>
    </template>

    <!-- 陪诊人员 -->
    <template v-if="activeTab === 'staff'">
      <div class="panel table-card">
        <el-table :data="pagedStaffList" stripe>
          <el-table-column label="陪诊人员" prop="name" min-width="140" />
          <el-table-column label="状态" min-width="110">
            <template #default="{ row }">
              <span class="status-tag" :style="row.status === '空闲'
                ? { color: '#16a34a', background: 'rgba(220,252,231,0.5)' }
                : { color: '#f97316', background: 'rgba(255,244,229,0.5)' }">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="服务区域" prop="area" min-width="160" />
          <el-table-column label="联系方式" prop="phone" min-width="150" />
          <template #empty>
            <el-empty description="暂无陪诊人员" :image-size="90" />
          </template>
        </el-table>
      <el-pagination
        class="list-pager"
        background
        v-model:current-page="esStaffPage"
        v-model:page-size="esStaffSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="esStaffTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="esStaffPage = 1"
      />
      </div>
    </template>

    <!-- 服务订单详情弹窗 -->
    <el-dialog v-model="detailVisible" width="640" class="esc-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>服务订单详情</h3>
          <p>陪诊服务详细信息和打卡记录</p>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <div class="detail-card">
          <div class="card-title">基本信息</div>
          <div class="info-grid">
            <div><span class="info-label">患者姓名</span><div class="info-value">{{ detail.patient }}</div></div>
            <div><span class="info-label">年龄</span><div class="info-value">{{ detail.age }}岁</div></div>
            <div><span class="info-label">陪诊人员</span><div class="info-value">{{ detail.staff }}</div></div>
            <div><span class="info-label">服务时间</span><div class="info-value">{{ detail.date }}</div></div>
            <div><span class="info-label">服务内容</span><div class="info-value">{{ detail.service }}</div></div>
            <div><span class="info-label">目的地</span><div class="info-value">{{ detail.dest }}</div></div>
            <div><span class="info-label">联系方式</span><div class="info-value">{{ detail.phone }}</div></div>
            <div>
              <span class="info-label">服务状态</span>
              <div class="info-value">
                <span class="status-tag" :style="{ color: statusMap[detail.status].color, background: statusMap[detail.status].bg }">
                  {{ detail.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <div class="card-title"><el-icon class="loc-icon"><LocationInformation /></el-icon>定位打卡记录</div>
          <el-empty v-if="!detail.checkins.length" description="暂无打卡记录" :image-size="70" />
          <div v-for="(c, i) in detail.checkins" :key="i" class="checkin-item">
            <div class="checkin-main">
              <span class="checkin-type" :class="c.type === '到达打卡' ? 'arrive' : 'finish'">{{ c.type }}</span>
              <div class="checkin-row">
                <el-icon><Clock /></el-icon><span class="row-label">打卡时间</span>
              </div>
              <div class="checkin-text">{{ c.time }}</div>
              <div class="checkin-row">
                <el-icon><LocationInformation /></el-icon><span class="row-label">打卡位置</span>
              </div>
              <div class="checkin-text">{{ c.addr }}</div>
              <div class="coord">经度: {{ c.lng }} | 纬度: {{ c.lat }}</div>
            </div>
            <div class="checkin-photo">
              <div class="photo-title"><el-icon><Camera /></el-icon>打卡照片</div>
              <el-image :src="c.photo" fit="cover" class="photo-img">
                <template #error><div class="photo-fallback">打卡照片</div></template>
              </el-image>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button size="large" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分配陪诊人员弹窗 -->
    <el-dialog v-model="assignVisible" width="560" class="esc-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>分配陪诊人员</h3>
          <p>为患者分配合适的陪诊人员</p>
        </div>
      </template>
      <div v-if="assignTarget" class="assign-info">
        <div>患者：{{ assignTarget.patient }}</div>
        <div>服务内容：{{ assignTarget.service }}</div>
        <div>目的地：{{ assignTarget.dest }}</div>
      </div>
      <div class="assign-label">选择陪诊人员</div>
      <el-select v-model="assignStaff" class="full-control" size="large" placeholder="请选择陪诊人员">
        <el-option v-for="s in staffList.filter((i) => i.status === '空闲')" :key="s.name"
          :label="`${s.name}（${s.area}）`" :value="s.name" />
      </el-select>
      <template #footer>
        <el-button size="large" @click="assignVisible = false">取消</el-button>
        <el-button type="primary" class="btn-blue" size="large" @click="confirmAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.esc-page {
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

.btn-blue {
  border-radius: 9px;
  font-weight: 600;
}

/* 胶囊标签页 */
.main-tabs {
  margin-top: 16px;
}

.main-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

/* 筛选区 */
.filter-card {
  display: flex;
  align-items: center;
  gap: 14px;
  /* margin-top: 18px; */
  padding: 20px 22px;
}

.filter-card .el-button--primary {
  margin-left: auto;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.filter-select {
  width: 200px;
}

/* 表格 */
.table-card {
  margin-top: 18px;
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

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.checkin-count {
  color: #16a34a;
  font-weight: 600;
}

.checkin-count.zero {
  color: #9ca3af;
  font-weight: 400;
}

.detail-btn {
  border-radius: 8px;
  font-weight: 600;
}

/* 分页 */
.list-pager {
  margin-top: 18px;
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

.detail-card {
  padding: 20px;
  border: 1px solid #eef0f4;
  border-radius: 14px;
}

.detail-card + .detail-card {
  margin-top: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.loc-icon {
  color: #2563eb;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 32px;
}

.info-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* 打卡记录 */
.checkin-item {
  display: flex;
  gap: 20px;
  padding: 18px;
  background: #fafbfc;
  border-radius: 12px;
}

.checkin-item + .checkin-item {
  margin-top: 14px;
}

.checkin-main {
  flex: 1;
}

.checkin-type {
  display: inline-block;
  margin-bottom: 12px;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.checkin-type.arrive {
  color: #16a34a;
  background: rgba(220,252,231,0.5);
}

.checkin-type.finish {
  color: #2563eb;
  background: rgba(232,241,255,0.5);
}

.checkin-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
}

.checkin-text {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.coord {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.checkin-photo {
  width: 132px;
  flex-shrink: 0;
}

.photo-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.photo-img {
  width: 132px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
}

.photo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 120px;
  background: #f1f5f9;
  border-radius: 8px;
  color: #9ca3af;
  font-size: 12px;
}

/* 分配弹窗 */
.assign-info {
  padding: 15px 18px;
  margin-bottom: 18px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 14px;
  color: #6b7280;
  line-height: 2;
}

.assign-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.full-control {
  width: 100%;
}

@media (max-width: 768px) {
  .filter-card {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .checkin-item {
    flex-direction: column;
  }
}
.filter-card .el-button+.el-button{
  margin-left: 0;
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.esc-dialog {
  --el-color-primary: #2563eb;
  border-radius: 18px;
  overflow: hidden;
}
</style>