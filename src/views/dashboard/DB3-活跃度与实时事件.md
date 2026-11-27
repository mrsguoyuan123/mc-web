# 指令 DB3：服务项目活跃度 + 实时事件流

> 前置：DB1 骨架、DB2 图谱与预警已落地。本步实现左下服务项目活跃度进度条、底部实时事件流统计条。
> **接口口径：对接 `/dashboard/*` 的 service-activity / live-events 两个只读端点。**
> 空值口径同 DB1：缺失显示红色「接口未提供」，0 值正常显示。

## 一、复用与位置

- 沿用 `src/views/dashboard/index.vue`；本步为左下活跃度卡与底部实时事件条。
- 接口从 `@/api/index.js` 导入。

## 二、小程序服务项目活跃度（左下）

### 数据
- `getDashboardServiceActivity(params)` → `GET /dashboard/service-activity`，返回 `{ overallCompletionRate, items[], derived }`。

### 展示
- 标题「小程序服务项目活跃度」；右上角总体完成率 `overallCompletionRate`（百分号）+ 「总体完成」。
- 进度条列表 `items[]`，每项 `{ name, rate }`：
  - 左侧项目名（体重管理/饮食分析/饮食记录/血糖/血压/睡眠分析/心理状态/肿瘤标志物 等，以后端 `name` 为准）；
  - 右侧完成率百分比；
  - 中间横向进度条，按完成率着色（高完成主色、低完成浅色），条宽随 `rate`。
- 按 `rate` 降序排列；空列表显示「暂无项目活跃度数据」。

## 三、实时事件流（底部 GRAPH INTELLIGENCE 条）

### 数据
- 统计数字：来自知识图谱 `stats`（DB2 已取）：图谱节点数、关系边数、高风险点；完成率取活跃度 `overallCompletionRate`。
- 事件流：`getDashboardLiveEvents(params)` → `GET /dashboard/live-events`，返回 `LiveEvent[]`：`{ id, time(date-time), dept, message }`。

### 展示
- 左侧「GRAPH INTELLIGENCE · 实时计算 · 实时事件 / LIVE EVENTS」。
- 统计块：图谱节点 / 关系边 / 高风险点 / 完成率（数字 + 标签）。
- 右侧事件流列表（滚动）：每条 `time（HH:mm:ss）· dept · message`；最新在最上，超出高度滚动。
- 空事件显示「暂无实时事件」。

### 自动刷新
- 按顶部「数据实时同步」周期（如 12s）轮询 `live-events` 与各概览区块；切换页面/卸载时清除定时器。
- 轮询失败不打断页面，静默重试并保留上一次数据。

## 四、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 项目活跃度 | `getDashboardServiceActivity(params)` | `GET /dashboard/service-activity` |
| 实时事件流 | `getDashboardLiveEvents(params)` | `GET /dashboard/live-events` |

## 五、待联调确认

- 活跃度 `items` 固定项目清单与 `rate` 口径；进度条配色阈值。
- 事件流是否需要 WebSocket 推送替代轮询；`limit` 默认条数。
- 图谱 `stats` 字段名（节点/边/高风险点）与完成率取值来源。

## 六、本段交付清单

1. 服务项目活跃度卡：总体完成率 + 各项目进度条列表。
2. 底部实时事件条：图谱统计块 + 事件流滚动列表 + 定时轮询。
3. 对接 service-activity / live-events 端点；空态、加载态、轮询失败兜底。

