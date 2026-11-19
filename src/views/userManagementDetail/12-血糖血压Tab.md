# 指令 12：血糖血压 Tab（独立组件 BloodPressureGlucosePanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「血糖血压」为第六个 Tab；本指令只落地该 Tab 内容，独立成文件。
> 接口口径：健康摘要 `getPatientHealthSummaryById` 的 `bloodGlucose`（血糖）与 `bloodPressure`（血压）两个模块；趋势/最新记录子字段 swagger 未展开，组件内集中映射兜底，**字段缺失（null/undefined/空串）显示红色「接口未提供」**，0 值正常显示。缺失判定复用 `../utils.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js` 导入；图表用工程内现有图表库（如已引入 ECharts，以工程现状为准；未引入先渲染占位骨架，不新增未确认依赖）。
- 接口未就绪/无数据：卡片与折线显示空态占位，不画假折线、假数值、假参考线。
- 单位固定：血糖 `mmol/L`；血压 `mmHg`（收缩压/舒张压）；X 轴日期 `MM-DD`；记录日期 `YYYY-MM-DD`。
- 不在前端写死 5.2、127/82 等示例数值。

## 二、新建组件

`src/views/userManagement/userManagementDetail/BloodPressureGlucosePanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取健康摘要。
- 时间窗口默认近 7 天；组件内固定 `from/to`，不暴露筛选 UI。

## 三、页面结构（左右两栏，2×2 卡片网格）

### 上排：两张「最近一次记录」卡片（左右并排）

#### 1. 最近一次血糖记录（左）
- 主标题「最近一次血糖记录」，副行「记录日期：YYYY-MM-DD」。
- 浅橙/米色底卡片块：橙色大数字 + 单位 `mmol/L`。
- 字段缺失按缺失口径显示红色「接口未提供」，不显示 `null/undefined/NaN`。

#### 2. 最近一次血压记录（右）
- 主标题「最近一次血压记录」，副行「记录日期：YYYY-MM-DD」。
- 浅蓝底卡片块：蓝色大数字 `收缩压/舒张压`，下方小字 `mmHg（收缩压/舒张压）`。
- 收缩压或舒张压缺失时，对应位置显示红色「接口未提供」；两个都缺则整块按缺失口径处理。

### 下排：两张「近 7 天趋势」折线卡片（左右并排）

#### 3. 近 7 天血糖趋势（左，标题带单位 `mmol/L`）
- 橙色折线 + 圆点节点；X 轴日期 `MM-DD`（10-15 ~ 10-21），Y 轴血糖 `mmol/L`（刻度由数据范围自适应）。
- 参考线：高血糖上限（红色虚线）、低血糖下限（橙色/黄色虚线）；参考阈值以后端配置/医学标准为准，本版先按占位常量标注，**阈值缺失时不画参考线**。

#### 4. 近 7 天血压趋势（右，标题带单位 `mmHg`）
- 双折线：收缩压（蓝色）、舒张压（绿色），均带圆点节点；底部图例「收缩压 / 舒张压」。
- X 轴日期 `MM-DD`；Y 轴血压 `mmHg`（刻度自适应）。
- 参考线：收缩压上限（红色虚线）、舒张压上限（黄色虚线）；阈值缺失时不画。

## 四、数据来源与字段映射（swagger 定稿）

接口：`getPatientHealthSummaryById(patientId, { from, to })`
返回 `{ from, to, diet, exercise, weight, bloodPressure, bloodGlucose, sleep, tumorMarkers, bloodRoutine, liverFunction }`；本组件只取 `bloodGlucose`、`bloodPressure`。

每个模块结构：`{ latest 最新一条（可能为空对象）, trend 窗口内趋势记录数组 }`。

### bloodGlucose.latest（建议字段名，以后端为准）

| 展示项 | 建议字段 | 兜底 |
|---|---|---|
| 记录日期 | `recordDate` / `createTime` | 缺失显示红色「接口未提供」 |
| 血糖值 mmol/L | `glucose` / `value` / `bloodGlucose` | 缺失显示红色「接口未提供」 |
| 测量时点（空腹/餐后等，可选） | `measureType` / `period` | 无则不展示，不臆造 |

### bloodGlucose.trend（按天聚合数组）

| 展示项 | 建议字段 |
|---|---|
| 日期 | `date`（渲染为 `MM-DD`） |
| 血糖值 mmol/L | `glucose` / `value` |

### bloodPressure.latest（建议字段名，以后端为准）

| 展示项 | 建议字段 | 兜底 |
|---|---|---|
| 记录日期 | `recordDate` / `createTime` | 缺失显示红色「接口未提供」 |
| 收缩压 mmHg | `systolic` / `systolicPressure` | 缺失显示红色「接口未提供」 |
| 舒张压 mmHg | `diastolic` / `diastolicPressure` | 缺失显示红色「接口未提供」 |

### bloodPressure.trend（按天聚合数组）

| 展示项 | 建议字段 |
|---|---|
| 日期 | `date`（渲染为 `MM-DD`） |
| 收缩压 mmHg | `systolic` / `systolicPressure` |
| 舒张压 mmHg | `diastolic` / `diastolicPressure` |

> 子字段名 swagger 未展开：在组件内集中写 `normalizeGlucose(latest, trend)`、`normalizePressure(latest, trend)` 做字段映射与空值兜底，禁止模板里散落多重判空；映射不上的数值按缺失口径显示红色「接口未提供」。

## 五、图表规则

- 折线按 trend 数组顺序排列，X 轴缺失日期不补造空日期。
- Y 轴刻度由数据范围自适应；后端未给固定刻度时不写死 60/85/110/135 等数值。
- 血糖单橙色折线；血压双折线（收缩压蓝、舒张压绿）；本 Tab 不按升降额外着色。
- 参考线阈值：优先取后端返回的阈值配置；无配置时不画参考线，不在前端写死医学阈值。
- 图表初始化/重绘在 `onMounted` 与数据返回后执行；组件卸载时销毁实例，避免泄漏。
- 若工程内未引入图表库，本步先渲染卡片与空态骨架，图表位留 `div` 占位并标注待引入，不临时安装依赖。

## 六、交互与规则

- 卡片数值为 0 时正常显示 0；字段缺失按缺失口径显示红色「接口未提供」，不显示 `null/undefined/NaN`。
- 本 Tab 为**只读展示**：不提供新增/编辑/删除血压血糖记录的入口（对应后端接口见第七节缺口）。
- 切换日期窗口本版不做；`from/to` 由组件按近 7 天计算。

## 七、接口覆盖核对与缺口

### 已覆盖（可对接）
- `GET /patients/{id}/health-summary`（`getPatientHealthSummaryById`）：返回体含 `bloodPressure`、`bloodGlucose` 两个模块，各含 `latest` + `trend`，满足本 Tab 只读展示。

### swagger 未展开（需后端补字段明细）
- `bloodGlucose.latest` / `bloodGlucose.trend` 记录项真实子字段名、日期格式、是否区分空腹/餐后。
- `bloodPressure.latest` / `bloodPressure.trend` 收缩压/舒张压真实字段名。
- 血糖高低限、血压收缩/舒张上限参考线阈值由哪个字段下发。

### 缺失接口（patient 模块当前未提供，本版不做对应功能）
- **无独立血压/血糖记录列表/详情端点**：若后续要在详情页查看某一天的明细记录，需后端补 `GET /patients/{id}/blood-pressure`、`GET /patients/{id}/blood-glucose`（或合并的生命体征记录端点）。
- **无新增/编辑/删除血压血糖记录接口**：当前 swagger 未提供生命体征记录的写操作端点；本 Tab 不做录入/修改。若陪诊师/客服需代录，需后端补对应 POST/PUT/DELETE 端点。
- **无阈值配置端点**：血糖高低限、血压警戒线阈值目前无独立配置接口；暂以前端占位常量或健康摘要内嵌字段兜底，待后端确认。

## 八、本步交付清单

1. `BloodPressureGlucosePanel.vue` 独立组件：上排血糖/血压最近一次记录卡片，下排血糖/血压近 7 天趋势折线。
2. 接 `getPatientHealthSummaryById` 的 `bloodGlucose`、`bloodPressure` 模块，集中 `normalizeGlucose` / `normalizePressure` 映射兜底。
3. 血压双折线 + 图例；血糖单折线；参考线阈值缺失不画。
4. 空态、加载态、无数据占位；单位与日期口径一致。

## 九、待联调确认项

- 两个模块 latest/trend 真实子字段名与日期格式；血压收缩/舒张压字段名。
- 参考线阈值来源（后端字段 / 字典 / 前端常量）。
- 工程内图表库现状；Y 轴范围是否由后端给定。
- 是否需要生命体征记录明细下钻、代录入口（依赖第七节缺失接口）。

> （注：部分内容由豆包 AI 生成）