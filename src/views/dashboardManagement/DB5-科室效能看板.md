# 指令 DB5：科室管理 - 效能看板（DepartmentDashboard.vue）

> 模块定位：科室层级效能看板，展示本科室用户、咨询、随访完成、风险用户与时段分布。
> **接口口径：对接 `/department/dashboard/*` 5 个只读 GET 端点；筛选选项复用全局 `GET /dashboard/filters`。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `@/utils/index.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**；图表复用工程已选图表库（如 ECharts）。
- 接口从 `@/api/index.js` 导入；公共工具从 `@/utils/index.js` 导入。
- 雪花 ID 按字符串传递；日期 `YYYY-MM-DD`。
- 数据范围由服务端强制收敛：DEPT_ADMIN 不传 `departmentId` 时强制本科室。

## 二、组件与目录

`src/views/dashboardManagement/DepartmentDashboard.vue`

### 页面标题区
- 主标题「科室管理 - 效能看板」。
- 副标题「{科室名} · 用户、随访与风险概况」。
- 右上角：「全屏查看」按钮；科室筛选下拉（选项来自 `getDashboardFilters().departments`，可随医院联动）。
- 切换科室后按 `departmentId` 重新拉取本页各区块。

## 三、顶部 KPI 指标卡（一行 4 张）

数据：`getDepartmentDashboardSummary({ departmentId })` → `GET /department/dashboard/summary`。

| 卡片 | 字段 | 副信息（deltas） | 配色 |
|---|---|---|---|
| 科室用户数 | `users` | 较上月增长 +x% | 蓝色图标 |
| 咨询总量 | `consults` | 较上月增长 +x% | 紫色图标 |
| 随访完成率 | `followupCompletionRate` | 较上月 +x% | 橙色图标 |
| 风险用户 | `riskUsers` | 医生团队 `doctorCount` 人 | 红色图标 |

- 环比取 `deltas`；无环比显示 `-`；缺失字段按空值口径兜底。

## 四、趋势图表区（上排双图）

数据：`getDepartmentDashboardTrends({ departmentId, months })` → `GET /department/dashboard/trends`，返回 `{ users[], consultations[] }`。

### 用户增长趋势（左）
- 标题「用户增长趋势」；副标题「本科室用户数量变化」；折线 `users[]`，图例「用户数量」。

### 咨询量趋势（右）
- 标题「咨询量趋势」；副标题「本科室咨询次数变化」；折线 `consultations[]`，图例「咨询次数」。

## 五、咨询分布区（中排双图）

### 近 7 日咨询量（左，柱状图）
- 数据：`getDepartmentDailyConsultations({ departmentId, days })` → `GET /department/dashboard/daily-consultations`，返回 `[{ date, count }]`。
- 标题「近 7 日咨询量」；副标题「每日咨询次数统计」；橙色柱，X 轴日期，Y 轴次数。

### 咨询时段分布（右，折线）
- 数据：`getDepartmentHourlyDistribution({ departmentId })` → `GET /department/dashboard/hourly-distribution`，返回 `[{ hourStart, count }]`。
- 标题「咨询时段分布」；副标题「不同时段咨询量分布」；折线按 `hourStart`（HH:mm）排列，Y 轴次数。

## 六、用户与咨询量综合趋势（下排双折线）

- 复用第四节 `trends` 的 `users[] + consultations[]`，同图对比。
- 标题「用户与咨询量综合趋势」；副标题「用户数与咨询次数对比分析」；图例「用户数量 / 咨询次数」。

## 七、底部效能条（三栏）

- 数据：`getDepartmentEfficiency()` → `GET /department/dashboard/efficiency`，无入参。
- 字段：`dailyActiveUsers / activeRate / consultsPerUserMonthly / satisfactionRate / avgResponseMinutes / resolutionRate`。

| 栏 | 展示 |
|---|---|
| 用户活跃度 | 日均活跃用户 `dailyActiveUsers` 人，活跃率 `activeRate` |
| 咨询效能 | 人均咨询 `consultsPerUserMonthly` 次/月，解决率 `resolutionRate` |
| 服务质量 | 响应时间 `avgResponseMinutes` 分钟，满意度 `satisfactionRate` |

## 八、数据口径与容错

- 各区块独立加载、独立容错；单块失败显示「加载失败，点击重试」，不影响其他区块。
- 空数据显示对应空态；加载用骨架或占位。
- 筛选 `departmentId` 变更后重新拉取。

## 九、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 筛选器选项 | `getDashboardFilters()` | `GET /dashboard/filters` |
| 科室概览 KPI | `getDepartmentDashboardSummary(params)` | `GET /department/dashboard/summary` |
| 科室趋势 | `getDepartmentDashboardTrends(params)` | `GET /department/dashboard/trends` |
| 近 7 日咨询量 | `getDepartmentDailyConsultations(params)` | `GET /department/dashboard/daily-consultations` |
| 时段分布 | `getDepartmentHourlyDistribution(params)` | `GET /department/dashboard/hourly-distribution` |
| 科室效能 | `getDepartmentEfficiency()` | `GET /department/dashboard/efficiency` |

## 十、待联调确认

- `deltas` 环比字段结构与正负口径；随访完成率/风险用户口径。
- 科室筛选是否随医院级联；趋势 `months`、咨询 `days` 默认值。
- 时段分布是否覆盖全天 24 小时，还是仅营业时段。

## 十一、本段交付清单

1. `DepartmentDashboard.vue`：标题区、科室筛选、4 张 KPI 卡。
2. 用户/咨询趋势双折线、近 7 日咨询柱图、时段分布折线、综合趋势双折线。
3. 底部效能三栏；对接 5 个科室端点 + 筛选器；加载态、空态、单块失败兜底。

