# 指令 11：体重动态 Tab（独立组件 WeightTrendPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「体重动态」为第五个 Tab；本指令只落地该 Tab 内容，独立成文件。
> 接口口径：健康摘要 `getPatientHealthSummaryById` 的 `weight` 模块；趋势/最新记录子字段 swagger 未展开，组件内集中映射兜底，**字段缺失（null/undefined/空串）显示红色「接口未提供」**，0 值正常显示。缺失判定复用 `../utils.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js` 导入；图表用工程内现有图表库（如已引入 ECharts，以工程现状为准；未引入先渲染占位骨架，不新增未确认依赖）。
- 接口未就绪/无数据：卡片与折线显示空态占位，不画假折线、假数值。
- 单位固定：体重 kg；X 轴日期 `MM-DD`；记录日期 `YYYY-MM-DD`。
- 不在前端写死 71.6 kg、-0.9 kg 等示例数值。

## 二、新建组件

`src/views/userManagement/userManagementDetail/WeightTrendPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取健康摘要。
- 时间窗口默认近 7 天；组件内固定 `from/to`，不暴露筛选 UI。

## 三、页面结构（从上到下）

### 1. 最近一次体重记录（整宽卡片）
- 主标题「最近一次体重记录」，副行「记录日期：YYYY-MM-DD」。
- 左侧大数字块：当前体重数值 + 单位 `kg`（蓝色数字）。
- 数字右侧说明：「较7天前变化：±X.X kg」（下降/上升带正负号；无对比数据时显示红色「接口未提供」）。

### 2. 近 7 天体重变化趋势（整宽折线图卡片）
- 标题「近7天体重变化趋势」。
- 蓝色折线 + 圆点节点；Y 轴体重 kg（刻度由数据范围自适应），X 轴日期 `MM-DD`（10-15 ~ 10-21）。
- 无数据显示空态占位。

## 四、数据来源与字段映射（swagger 定稿）

接口：`getPatientHealthSummaryById(patientId, { from, to })`
返回 `{ from, to, diet, exercise, weight, bloodPressure, bloodGlucose, sleep, tumorMarkers, bloodRoutine, liverFunction }`；本组件只取 `weight`。

`weight` 模块结构：`{ latest 最新一条（可能为空对象）, trend 窗口内趋势数组 }`。

### latest（最近一次，建议字段名，以后端为准）

| 展示项 | 建议字段 | 兜底 |
|---|---|---|
| 记录日期 | `recordDate` / `createTime` | 缺失显示红色「接口未提供」 |
| 体重 kg | `weight` / `weightKg` | |
| 较 7 天前变化 kg | `changeVs7d` / `delta` | 无对比数据显示红色「接口未提供」；前端也可用 latest 与 trend 首条差值兜底计算 |

### trend（按天聚合数组，建议字段名）

| 展示项 | 建议字段 |
|---|---|
| 日期 | `date`（渲染为 `MM-DD`） |
| 体重 kg | `weight` / `weightKg` |

> 子字段名 swagger 未展开：在组件内集中写一个 `normalizeWeight(latest, trend)` 做字段映射与空值兜底，禁止模板里散落多重判空；映射不上的数值按缺失口径显示红色「接口未提供」。

## 五、图表规则

- 折线蓝色，节点带圆点；按 trend 数组顺序排列，X 轴缺失日期不补造空日期。
- Y 轴刻度由数据范围自适应；后端未给固定刻度时不写死 71.5/71.75/72/72.25/72.5。
- 折线在体重下降/上升时不额外着色（本 Tab 单蓝色）；变化幅度仅在卡片文字体现正负号。
- 图表初始化/重绘在 `onMounted` 与数据返回后执行；组件卸载时销毁实例，避免泄漏。
- 若工程内未引入图表库，本步先渲染卡片与空态骨架，图表位留 `div` 占位并标注待引入，不临时安装依赖。

## 六、交互与规则

- 卡片数值为 0 时正常显示 0；字段缺失按缺失口径显示红色「接口未提供」，不显示 `null/undefined/NaN`。
- 变化量：下降为负、上升为正；后端未给 `changeVs7d` 时，用最新体重与 7 天前（trend 首条）体重差值计算，保留 1 位小数。
- 切换日期窗口本版不做；`from/to` 由组件按近 7 天计算。

## 七、本步交付清单

1. `WeightTrendPanel.vue` 独立组件：最近一次体重卡片（数值 kg + 较 7 天前变化 + 记录日期）。
2. 近 7 天体重变化折线图。
3. 接 `getPatientHealthSummaryById` 的 `weight` 模块，集中 `normalizeWeight` 映射兜底。
4. 空态、加载态、无数据占位；单位与日期口径一致。

## 八、待联调确认项

- `weight.latest` / `weight.trend` 记录项真实子字段名、日期格式。
- 较 7 天前变化由后端给还是前端计算；体重是否含历史目标/区间参考线。
- 工程内图表库现状；Y 轴范围是否由后端给定。

> （注：部分内容由豆包 AI 生成）