# 指令 DB1：数据看板骨架 + 顶部筛选 + KPI 指标卡（DashboardManage.vue）

> 模块定位：全局健康管理大屏，展示服务规模、知识图谱、聚焦对象、异常预警与实时事件。
> **接口口径：dashboard swagger 共 18 个只读 GET；本屏为全局看板，对接 `/dashboard/*` 8 个端点；医院/科室层级端点在后续分段按需接入。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `@/utils/index.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**；图表用工程已选图表库（如 ECharts），不新增未确认依赖。
- 接口从 `@/api/index.js` 导入；公共工具从 `@/utils/index.js` 导入。
- 雪花 ID 按字符串传递；日期 `YYYY-MM-DD`，时间 `HH:mm:ss`。
- 看板为大屏只读视图；`derived=true` 的派生数据按后端返回如实展示，不标注为精确统计。

## 二、组件与目录

`src\views\dashboard\index.vue`

### 顶部导航条
- 左侧系统名「君远后台管理系统」+ 英文副标题 `HEALTHCARE MANAGEMENT INTELLIGENCE`。
- 右侧：
  - 医院筛选下拉（选项来自 `getDashboardFilters().hospitals`）；
  - 「全屏查看」按钮（调用浏览器全屏 API）；
  - 深色/浅色切换按钮（如工程已支持主题）；
  - 「数据实时同步」绿点标识 + 自动刷新周期（如 `12s`）+ 刷新时间 `YYYY-MM-DD HH:mm:ss`。
- 筛选变更后，按 `hospitalId`（及 `departmentId`）重新拉取各看板区块。

### 筛选器数据源
- `getDashboardFilters()` → `GET /dashboard/filters`，返回 `{ hospitals[], departments[] }`，选项 `{ id, name }`。

## 三、顶部 KPI 指标卡（一行 5 张）

数据来自 `getDashboardOverview(params)` → `GET /dashboard/overview`，返回 `{ kpis, range, derived }`；`kpis` 内各指标按下方映射，缺失走空值兜底。

| 卡片 | 取值（kpis 字段建议） | 副信息 | 配色 |
|---|---|---|---|
| 覆盖科室 | `departmentCount` | 本月 +N（环比） | 默认深色 |
| 服务病种 | `diseaseCount` | 本月 +N | 默认 |
| 在管用户 | `userCount` | 环比 +x% | 深色大数字 |
| 今日服务触达 | `todayReach` | 环比 +x% | 深色 |
| 服务完成率 | `completionRate` | 较上周 +x% | 绿色 |
| 异常预警率 | `anomalyRate` | 高风险 N 人 | 橙色/红色 |

> 设计稿为 6 张卡（覆盖科室/服务病种/在管用户/今日服务触达/服务完成率/异常预警率）；若后端 `kpis` 字段名不同，在组件顶部集中做映射兜底，不散落模板。
- 环比增减：上升绿/蓝、下降红；无环比数据时副信息显示 `-`。
- 每张卡右上角迷你趋势线（有趋势数据时绘制，无数据显示占位）。

## 四、服务规模趋势卡（左上）

- 数据：`getDashboardServiceTrend(params)` → `GET /dashboard/service-trend`，返回 `{ totalReach, points[], derived }`。
- 标题「30 日服务规模趋势」；右上角「全域 · 单位：人次」。
- 大数字：`totalReach` 本期触达；副标题「本期完成」。
- 折线图：`points[]` 每项 `{ date, reach, complete }`，两条线「服务触达 / 服务完成」；X 轴日期，Y 轴人次。
- 悬停提示框展示当日触达/完成数值；空数据显示空态占位。

## 五、数据口径与权限

- 查询参数统一携带 `hospitalId / departmentId / range`（按筛选器）；服务端按当前账号数据范围强制收敛，越权 ID 会被忽略或返回 400。
- 各区块独立加载、独立容错；单块失败不影响其他区块渲染，失败块显示「加载失败，点击重试」。
- 空态、加载骨架按工程现状实现。

## 六、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 筛选器选项 | `getDashboardFilters()` | `GET /dashboard/filters` |
| 概览 KPI | `getDashboardOverview(params)` | `GET /dashboard/overview` |
| 服务规模趋势 | `getDashboardServiceTrend(params)` | `GET /dashboard/service-trend` |

## 七、待联调确认

- `kpis` 内各指标真实字段名与环比字段结构（`deltas` 对象）。
- 时间范围 `range` 可选值与默认区间；趋势天数 `days` 默认值。
- 全屏/主题切换是否在本工程已有全局能力可复用。

## 八、本段交付清单

1. `index.vue`：顶部导航（医院筛选、全屏、主题、实时同步时间）。
2. 顶部 KPI 指标卡组（映射 + 环比 + 迷你趋势占位）。
3. 30 日服务规模趋势折线卡；对接 filters / overview / service-trend 接口；加载态、空态、单块失败兜底。

