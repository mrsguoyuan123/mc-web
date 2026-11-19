# 指令 9：饮食分析 Tab（独立组件 DietAnalysisPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「饮食分析」为第三个 Tab；本指令只落地该 Tab 内容，独立成文件。
> 接口口径：健康摘要 `getPatientHealthSummaryById` 的 `diet` 模块；趋势/最新记录子字段 swagger 未展开，组件内集中做映射兜底，缺失显示 `-` 或空态。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../../api/index.js` 导入；图表用工程内现有图表库（如已引入 ECharts，以工程现状为准；未引入则先用 Element Plus 占位骨架，不新增未确认依赖）。
- 接口未就绪/无数据：图表区与指标块显示空态占位，不画假折线、假柱、假数值。
- 单位固定：热量 kcal、蛋白质 g、脂肪 g、维生素 mg；日期 X 轴 `MM-DD`，记录时间 `YYYY-MM-DD HH:mm`。
- 不在前端写死 1716 kcal、61 g 等示例数值。

## 二、新建组件

`src/views/userManagementDetail/components/DietAnalysisPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取健康摘要。
- 时间窗口默认近 7 天；组件内可先固定 `from/to` 近 7 天，不暴露筛选 UI。

## 三、页面结构（从上到下）

### 1. 最近一次饮食记录（整宽卡片）
- 主标题「最近一次饮食记录」，副行「记录日期：YYYY-MM-DD」。
- 右上角按钮「查看饮食照片」（带图片图标）；无照片时置灰/隐藏。
- 记录卡片：
  - 背景为饮食照片；左上角餐次标签（如「午餐」，橙底）；照片上叠加菜品描述；时间 `YYYY-MM-DD HH:mm`；右上角本餐热量 `xxx kcal`。
  - 照片下方 4 个指标块（横向 4 列）：热量（橙）、蛋白质 g（蓝）、脂肪 g（橙）、维生素 mg（绿）。

### 2. 近 7 天热量趋势（整宽折线图卡片）
- 标题「近7天热量趋势」。
- 橙色折线 + 圆点节点；Y 轴热量 kcal，X 轴日期 `MM-DD`。
- 无数据显示空态占位。

### 3. 近 7 天营养素柱状图（三栏卡片）
- 左：近7天蛋白质(g)，蓝色柱。
- 中：近7天脂肪(g)，橙色柱。
- 右：近7天维生素(mg)，绿色柱。
- 每张图 X 轴 `MM-DD`，Y 轴对应单位刻度；无数据空态。

## 四、数据来源与字段映射（swagger 定稿）

接口：`getPatientHealthSummaryById(patientId, { from, to })`
返回 `{ from, to, diet, exercise, weight, bloodPressure, bloodGlucose, sleep, tumorMarkers, bloodRoutine, liverFunction }`；本组件只取 `diet`。

`diet` 模块结构：`{ latest 最新一条（可能为空对象）, trend 窗口内趋势数组 }`。

### latest（最近一餐，建议字段名，以后端为准）

| 展示项 | 建议字段 | 兜底 |
|---|---|---|
| 记录日期 | `recordDate` / `createTime` | 缺项显示 `-` |
| 餐次 | `mealType`（早餐/午餐/晚餐/加餐） | 码值转中文，未知显示原值 |
| 菜品描述 | `dishes` / `foodDesc` | |
| 记录时间 | `createTime` | `YYYY-MM-DD HH:mm` |
| 本餐热量 kcal | `mealCalorie` | |
| 热量 kcal | `calorie` | 无本餐热量时用全天值 |
| 蛋白质 g | `protein` | |
| 脂肪 g | `fat` | |
| 维生素 mg | `vitamin` | |
| 饮食照片 | `photoUrl` / `imageUrl` | 单图；多图取首张 |

### trend（按天聚合数组，建议字段名）

| 展示项 | 建议字段 |
|---|---|
| 日期 | `date`（渲染为 `MM-DD`） |
| 每日热量 | `calorie`（kcal） |
| 每日蛋白质 | `protein`（g） |
| 每日脂肪 | `fat`（g） |
| 每日维生素 | `vitamin`（mg） |

> 子字段名 swagger 未展开：在组件内集中写一个 `normalizeDiet(latest, trend)` 做字段映射与空值兜底，禁止模板里散落多重判空；映射不上的指标显示 `-`。

## 五、图表规则

- 配色：热量折线橙；蛋白质柱蓝；脂肪柱橙；维生素柱绿。与卡片指标块颜色一致。
- 折线节点带圆点；柱状图按天排列；X 轴缺失日期由 trend 数组顺序决定，不补造空日期。
- Y 轴刻度由数据范围自适应；后端未给固定刻度时不写死 1500/1700/1900/2200。
- 图表初始化/重绘在 `onMounted` 与数据返回后执行；组件卸载时销毁实例，避免泄漏。
- 若工程内未引入图表库，本步先渲染指标块与空态骨架，图表位留 `div` 占位并标注待引入，不临时安装依赖。

## 六、交互

- 「查看饮食照片」：弹出大图预览（单图或轮播）；无照片按钮置灰。
- 切换日期窗口本版不做；接口 `from/to` 由组件按近 7 天计算。
- 指标块数值为 0 时正常显示 0；字段缺失显示 `-`，不显示 `null/undefined/NaN`。

## 七、本步交付清单

1. `DietAnalysisPanel.vue` 独立组件：最近一餐卡片（照片/餐次/菜品/时间/本餐热量 + 4 指标块）。
2. 近 7 天热量折线图；蛋白质/脂肪/维生素三栏柱状图。
3. 接 `getPatientHealthSummaryById` 的 `diet` 模块，集中 `normalizeDiet` 映射兜底。
4. 空态、加载态、无数据占位；图表颜色与单位口径一致。

## 八、待联调确认项

- `diet.latest` / `diet.trend` 记录项的真实子字段名、日期字段格式。
- 维生素是单一指标还是分维 A/C 等多项；一天多餐时热量/营养按哪餐汇总。
- 照片字段单图还是多图列表；照片是否需鉴权预览。
- 工程内图表库现状；Y 轴范围是否由后端给定。

> （注：部分内容由豆包 AI 生成）