# 指令 DB2：健康服务知识图谱 + 聚焦对象 + 异常预警闭环

> 前置：DB1 骨架、顶部筛选与 KPI 已落地。本步实现中部知识图谱、右侧聚焦对象卡、异常预警与闭环卡。
> **接口口径：对接 `/dashboard/*` 的 knowledge-graph / focus-node / anomalies 三个只读端点。**
> 空值口径同 DB1：缺失显示红色「接口未提供」，0 值正常显示。

## 一、复用与位置

- 沿用 `src/views/dashboard/index.vue`；图谱与右侧两栏为本步区块。
- 接口从 `@/api/index.js` 导入；图表复用工程图表库。

## 二、健康服务知识图谱（中部主视觉）

### 数据
- `getDashboardKnowledgeGraph(params)` → `GET /dashboard/knowledge-graph`，返回 `{ center, categories, nodes[], edges[], stats, derived }`。

### 结构映射
| 字段 | 用途 |
|---|---|
| `center` | 中心节点（名称、计数、层级），最大气泡居中 |
| `categories` | 分类数组（临床诊疗/康复运动/营养管理/风险监测/随访服务等），决定节点配色 |
| `nodes[]` | 节点：`{ id, name, count, category, x?, y? }`，气泡大小按 `count` |
| `edges[]` | 连线：`{ source, target, relation? }` |
| `stats` | 图谱统计（节点数/关系边数/高风险点等），底部 GRAPH INTELLIGENCE 区展示 |

### 渲染规则
- 中心节点最大、高亮主色；一级分类节点次之；外围子节点最小。
- 节点按 `category` 着色；连线虚线/实线区分关系强弱（有 `relation` 时按后端类型，否则统一浅色）。
- 节点 hover 显示名称 + 计数；点击节点可联动聚焦对象（待联调是否回传节点 id）。
- 顶部标题「健康服务知识图谱」+ LIVE 标识；分类筛选小标签（全部/临床诊疗/康复运动/营养管理/风险监测/随访服务），点击按 `category` 过滤高亮。
- 图谱为派生结构（`derived=true`），布局在前端做防重叠排布；无节点显示空态「图谱暂无数据」。

## 三、当前聚焦对象卡（右侧上）

### 数据
- `getDashboardFocusNode(params)` → `GET /dashboard/focus-node`，返回：
  `{ focus, stage, count, warnings, sevenDayServices, completionRate, tags[], carePath[], derived }`。

### 展示
| 区域 | 字段 | 展示 |
|---|---|---|
| 标题 | — | 「当前聚焦对象」+ 英文 `FOCUS NODE` |
| 阶段 | `stage` | 如「胃癌术后 · 术后 1–3 月」 |
| 聚焦名称 | `focus` | 大号主色字，右侧 `count` 数量 |
| 标签 | `tags[]` | 重点病种 / 高危干预 / 全域 等小标签 |
| 在管用户 | 在管用户数 | 数值 + 完成率 `completionRate` |
| 近 7 日服务 | `sevenDayServices` | 数值 + 异常预警 `warnings` |
| 关键服务路径 | `carePath[]` | 风险筛查 → 专科评估 → 运动处方 → 营养干预 → 智能随访，横向步骤条 |

- 缺失字段按空值口径兜底；`carePath` 为空显示 `-`。

## 四、异常预警与闭环卡（右侧下）

### 数据
- `getDashboardAnomalies(params)` → `GET /dashboard/anomalies`，返回 `{ pending, closureRate, items[], derived }`。

### 展示
- 标题「异常预警与闭环」；右上角「{pending} 待干预」。
- 预警项列表 `items[]`，每项 `{ type, title, desc, count, level }`：
  - 左侧类型图标；标题 + 描述（如「白蛋白偏低 / 体重持续下降」「7 日体重降幅超过 5%」「异常指标超范围 / 血常规异常」）；
  - 右侧人数 `count`，按 `level` 着色（高风险红/橙，一般蓝/紫）。
- 底部「异常闭环率」`closureRate`，大号橙色字 + 百分号。
- 空列表显示「暂无异常预警」。

## 五、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 知识图谱 | `getDashboardKnowledgeGraph(params)` | `GET /dashboard/knowledge-graph` |
| 聚焦对象 | `getDashboardFocusNode(params)` | `GET /dashboard/focus-node` |
| 异常预警 | `getDashboardAnomalies(params)` | `GET /dashboard/anomalies` |

## 六、待联调确认

- 图谱节点坐标是否后端下发（`x/y`），还是前端力导布局；分类配色字典来源。
- 节点点击是否联动下钻到患者列表；聚焦对象 `focus` 是否为病种/人群聚合。
- 异常项 `level` 枚举与配色；`items` 分组口径（按来源聚合）。

## 七、本段交付清单

1. 知识图谱：中心/分类/节点/连线渲染、分类筛选、hover 与统计。
2. 聚焦对象卡：阶段/名称/标签/在管用户/近 7 日服务/照护路径步骤条。
3. 异常预警闭环卡：预警项列表 + 闭环率；对接三个只读端点；空态、加载态、单块失败兜底。

