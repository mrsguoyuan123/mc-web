# 指令 DB4：医院管理 - 效能看板（HospitalDashboard.vue）

> 模块定位：医院层级效能看板，展示全院用户、咨询、科室分布、活跃趋势与服务效能。
> **接口口径：对接 `/hospital/dashboard/*` 5 个只读 GET 端点；筛选选项复用全局 `GET /dashboard/filters`。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `@/utils/index.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**；图表复用工程已选图表库（如 ECharts）。
- 接口从 `@/api/index.js` 导入；公共工具从 `@/utils/index.js` 导入。
- 雪花 ID 按字符串传递；日期 `YYYY-MM-DD`。
- 数据范围由服务端按账号强制收敛：HOSPITAL_ADMIN 不传 `hospitalId` 时强制本院；越权 ID 被忽略或返回 400。

## 二、组件与目录

`src/views/dashboardManagement/HospitalDashboard.vue`

### 页面标题区
- 主标题「医院管理 - 效能看板」。
- 副标题「{医院名称} · 用户与健康咨询数据分析」。
- 右上角：「全屏查看」按钮；医院筛选下拉（选项来自 `getDashboardFilters().hospitals`）。
- 切换医院后按 `hospitalId` 重新拉取本页各区块。

## 三、顶部 KPI 指标卡（一行 4 张）

数据：`getHospitalDashboardSummary({ hospitalId })` → `GET /hospital/dashboard/summary`。

| 卡片 | 字段 | 副信息（deltas） | 配色 |
|---|---|---|---|
| 用户总数 | `users` | 较上月增长 +x% | 蓝色图标 |
| 咨询总量 | `consults` | 较上月增长 +x% | 紫色图标 |
| 活跃科室 | `activeDepartments` | 覆盖主要临床科室 | 橙色图标 |
| 平均响应时间 | `avgResponseMinutes` | 较上月优化 +x%（单位：分钟） | 绿色图标 |

- 环比取 `deltas` 对应字段；上升/优化为绿或蓝，下降为红；无环比显示 `-`。
- 缺失字段按空值口径兜底；`deltas` 字段结构待联调确认，组件顶部集中映射。

## 四、趋势图表区（上排双图）

### 用户增长趋势（左）
- 数据：`getHospitalDashboardTrends({ hospitalId, months })` → `GET /hospital/dashboard/trends`，返回 `{ users[], consultations[] }`。
- 标题「用户增长趋势」；副标题「各科室用户数量变化」；折线为 `users[]`，X 轴月份，图例「用户数量」。

### 健康咨询趋势（右）
- 同一份 `trends` 数据；标题「健康咨询趋势」；副标题「各科室咨询量变化」；折线为 `consultations[]`，图例「咨询次数」。

## 五、分布与对比区（中排双图）

### 科室用户分布（左，饼图）
- 数据：`getHospitalDepartmentDistribution({ hospitalId })` → `GET /hospital/dashboard/departments`，返回 `[{ departmentId, users }]`。
- 标题「科室用户分布」；副标题「各科室用户占比」；饼图扇区按 `users` 占比，标签显示科室名 + 百分比。
- 科室名若接口只回 `departmentId`，需字典补名（待联调）；补不到显示 `-`。

### 科室咨询量对比（右，柱状图）
- **接口缺口**：现有 `/hospital/dashboard/departments` 仅返回各科室用户数，无咨询量。本图先留占位：
  - 若后端在 `departments` 追加 `consults` 字段，按 `consults` 画柱；
  - 否则标注「咨询量对比待后端补端点」，柱图空态占位，不伪造科室咨询数。
- 标题「科室咨询量对比」；副标题「各科室咨询次数统计」；X 轴科室，Y 轴咨询次数。

## 六、近 7 日活跃数据（下排折线）

- 数据：`getHospitalDailyActivity({ hospitalId, days })` → `GET /hospital/dashboard/daily-activity`，返回 `[{ date, activeUsers, consultations }]`。
- 标题「近 7 日活跃数据」；副标题「用户活跃度与咨询量对比」；双折线「活跃用户 / 咨询次数」，X 轴日期。

## 七、底部效能条（三栏）

- 数据：`getHospitalEfficiency()` → `GET /hospital/dashboard/efficiency`，无入参。
- 字段：`dailyActiveUsers / activeRate / consultsPerUserMonthly / satisfactionRate / avgResponseMinutes / resolutionRate`。

| 栏 | 展示 |
|---|---|
| 用户活跃度 | 日均活跃用户 `dailyActiveUsers` 人，活跃率 `activeRate` |
| 咨询效能 | 人均咨询 `consultsPerUserMonthly` 次/月，解决率 `resolutionRate` |
| 服务质量 | 响应时间 `avgResponseMinutes` 分钟，满意度 `satisfactionRate` |

## 八、数据口径与容错

- 各区块独立加载、独立容错；单块失败显示「加载失败，点击重试」，不影响其他区块。
- 空数据显示对应空态；加载用骨架或占位。
- 筛选 `hospitalId` 变更后重置分页/趋势区间并重新拉取。

## 九、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 筛选器选项 | `getDashboardFilters()` | `GET /dashboard/filters` |
| 医院概览 KPI | `getHospitalDashboardSummary(params)` | `GET /hospital/dashboard/summary` |
| 医院趋势 | `getHospitalDashboardTrends(params)` | `GET /hospital/dashboard/trends` |
| 科室用户分布 | `getHospitalDepartmentDistribution(params)` | `GET /hospital/dashboard/departments` |
| 近 7 日活跃 | `getHospitalDailyActivity(params)` | `GET /hospital/dashboard/daily-activity` |
| 医院效能 | `getHospitalEfficiency()` | `GET /hospital/dashboard/efficiency` |

## 十、待联调确认

- `deltas` 环比字段结构与正负口径；平均响应时间单位。
- 科室名字典来源（`departmentId → 科室名`）。
- 科室咨询量对比端点/字段是否补齐。
- 趋势 `months`、活跃 `days` 默认值。

## 十一、本段交付清单

1. `HospitalDashboard.vue`：标题区、医院筛选、4 张 KPI 卡。
2. 用户/咨询趋势双折线、科室用户分布饼图、科室咨询量对比柱图（缺口占位）、近 7 日活跃双折线。
3. 底部效能三栏；对接 5 个医院端点 + 筛选器；加载态、空态、单块失败兜底。

