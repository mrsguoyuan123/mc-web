# 指令 13：用药提醒 Tab（独立组件 MedicationReminderPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「用药提醒」为第七个 Tab；本指令只落地该 Tab 内容，独立成文件。
> **接口现状：patient / app / account 三个 swagger 模块均未提供用药提醒相关端点，健康摘要返回体也不含 medication 模块。本 Tab 全部数据接口以占位函数 + 待联调标注处理，先搭好 UI 与交互闭环，不伪造真实数据。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `../utils.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js` 导入；用药相关接口后端未就绪时，在 api 层先建同名占位函数（resolve 空数组/空对象 + `// TODO 待后端补路径`），组件只调占位函数，不在组件内写死示例药品。
- 接口未就绪/无数据：各分区显示空态占位，不画假记录、假状态。
- 日期 `YYYY-MM-DD`；时间 `HH:mm`；药品规格、用量单位保持后端原值。
- 不在前端写死「卡培他滨 500mg/片」等示例条目。

## 二、新建组件

`src/views/userManagement/userManagementDetail/MedicationReminderPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取用药提醒数据。
- 本 Tab 含：统计卡、今日用药完成情况列表、当前用药提醒列表、已停用列表、新增/编辑弹窗。

## 三、页面结构（从上到下）

### 1. 顶部统计卡（四张，横向并排）

| 卡片 | 文案 | 取数口径（建议） |
|---|---|---|
| 今日待用药 | 数字 + 「今日待用药」 | 今日计划中状态为「待用药」的条数 |
| 今日已完成 | 数字 + 「今日已完成」 | 今日已完成条数 |
| 今日已逾期 | 数字 + 「今日已逾期」 | 今日已逾期条数 |
| 今日已跳过 | 数字 + 「今日已跳过」 | 今日已跳过条数 |

- 数字按状态分色：待用药蓝、已完成绿、已逾期红、已跳过黄（以设计稿配色为准）。
- 统计数据由今日用药记录聚合；接口未就绪显示 0 + 空态。

### 2. 今日用药完成情况（整宽列表）
- 标题「今日用药完成情况」。
- 每条为一次服药计划记录，按计划时间排序，卡片按状态着色：
  - **已完成**：绿底；药品名 + 状态标签「已完成」；计划时间；实际时间 + 服药人（如「2026-10-23 08:12 · 用户本人」）；右侧完成态图标。
  - **待用药**：蓝底；药品名 + 状态标签「待用药」；计划时间；右侧待服态图标。
  - **已跳过**：黄/橙底；药品名 + 状态标签「已跳过」；计划时间；下方跳过原因（如「用户表示胃部不适，暂跳过」）；右侧跳过态图标。
- 状态枚举（建议）：`PENDING 待用药` / `DONE 已完成` / `SKIPPED 已跳过` / `OVERDUE 已逾期`。

### 3. 当前用药提醒（整宽列表，右上角「+ 新增提醒」按钮）
- 标题「当前用药提醒」，右侧主按钮「新增提醒」。
- 每条药品提醒卡片：
  - 第一行：药品名 + 规格（如 `500mg/片`）+ 频次标签（如「每日两次」）；推送关闭时附「推送已关闭」灰标签。
  - 第二行：单次用量（如「单次 3 片」）+ 服药时间点（如 `08:00 / 20:00`）+ 用药周期（开始日期 — 结束日期）。
  - 第三行：用药说明（如「餐后30分钟服用，整片吞服，不可掰碎。」）。
  - 右侧操作：编辑（铅笔）、复制（可按后端能力决定是否保留）、停用/删除（垃圾桶，红色）。

### 4. 已停用用药提醒（整宽列表，折叠/分区展示）
- 标题「已停用用药提醒（N 条）」。
- 每条：药品名 + 规格 + 频次 + 用药周期；右侧「已停用」灰标签；不可再编辑/删除（或按后端权限）。

## 四、新增 / 编辑用药提醒弹窗

标题：新增为「新增用药提醒」，编辑为「编辑用药提醒」；副标题「配置药品信息、用药频次和推送时间」。

### 表单字段

| 字段 | 控件 | 说明 |
|---|---|---|
| 药品名称 * | 输入框 | 必填 |
| 药品规格 | 输入框 | 如 `500mg/片` |
| 单次用量 | 数字输入 + 单位下拉 | 单位如「片」 |
| 用药频次 | 下拉 | 如每日一次 / 每日两次 / 每日三次 / 按周等，选项以后端字典为准 |
| 开始日期 * | 日期选择 | `YYYY-MM-DD` |
| 结束日期 | 日期选择 | `YYYY-MM-DD`，可空（长期） |
| 每日用药时间 | 动态时间点列表 | 每行一个 `HH:mm` 时间选择，可「+ 添加时间」、单行删除；频次与时间点数量需一致 |
| 用药说明 | 文本域 | 餐后/餐前/随餐、服用方式等备注 |
| 启用提醒 | 复选框 | 默认勾选 |
| 开启推送 | 复选框 | 默认勾选 |

- 底部：「取消」「保存修改」（编辑）/「保存」（新增）。
- 校验：药品名称必填；时间点至少一个；结束日期不早于开始日期。
- 保存成功后关闭弹窗、刷新列表与统计；失败给 Element 提示，不清空表单。

## 五、数据来源与字段映射（占位，待后端定稿）

> 下列为建议字段名，以后端实际返回为准；组件内集中写 `normalizeMedication(list)`、`normalizeTodayRecord(list)` 做映射与空值兜底，禁止模板散落多重判空。

### 当前用药提醒（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 提醒 ID | `id` | 字符串，编辑/停用/删除用 |
| 药品名称 | `drugName` / `medicationName` | 缺失显示红色「接口未提供」 |
| 药品规格 | `spec` / `specification` | 如 500mg/片 |
| 单次用量 | `doseValue` + `doseUnit` | 如 3 片 |
| 频次 | `frequency` / `frequencyText` | 每日两次等，枚举码值需字典 |
| 用药时间点 | `times: string[]` | `HH:mm` 数组 |
| 用药周期 | `startDate` / `endDate` | `YYYY-MM-DD`；长期可空 |
| 用药说明 | `instructions` / `remark` | |
| 是否启用提醒 | `enabled` | 布尔 |
| 是否开启推送 | `pushEnabled` | 布尔；关闭展示「推送已关闭」 |
| 状态 | `status` | ACTIVE 生效 / STOPPED 已停用 |

### 今日用药记录（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 记录 ID | `id` | |
| 药品名称 | `drugName` | |
| 计划时间 | `scheduledAt` | `YYYY-MM-DD HH:mm` |
| 实际时间 | `takenAt` | 已完成才有；缺失显示红色「接口未提供」 |
| 服药人 | `operatorName` / `takenBy` | 如用户本人 |
| 状态 | `status` | PENDING/DONE/SKIPPED/OVERDUE |
| 跳过原因 | `skipReason` | 已跳过才有 |

### 统计卡（建议由后端聚合返回，或前端按今日记录统计）

| 展示项 | 建议字段 |
|---|---|
| 今日待用药 | `pendingCount` |
| 今日已完成 | `doneCount` |
| 今日已逾期 | `overdueCount` |
| 今日已跳过 | `skippedCount` |

## 六、接口缺口核对（patient / app / account swagger 现状）

### 已覆盖
- 无。健康摘要 `getPatientHealthSummaryById` 返回体为 `{ diet, exercise, weight, bloodPressure, bloodGlucose, sleep, tumorMarkers, bloodRoutine, liverFunction }`，**不含用药/药物模块**；patient 模块 21 个端点无任何用药提醒接口。

### 缺失接口（需后端补，本版先占位）
1. **用药提醒列表**：`GET /patients/{id}/medications`（当前生效 + 已停用，可按 `status` 筛选）。
2. **新增用药提醒**：`POST /patients/{id}/medications`（药品名/规格/用量/频次/时间点/周期/说明/启用与推送开关）。
3. **编辑用药提醒**：`PUT /patients/{id}/medications/{medicationId}`。
4. **停用 / 删除用药提醒**：`PUT /patients/{id}/medications/{medicationId}/status`（停用）或 `DELETE /patients/{id}/medications/{medicationId}`；停用与删除是否分开需后端确认。
5. **今日用药记录与统计**：`GET /patients/{id}/medication-records?date=`（今日各次服药记录 + 四态统计数）。
6. **服药打卡 / 跳过操作**：`POST /patients/{id}/medication-records/{recordId}/take`（标记完成）、`POST /{recordId}/skip`（标记跳过 + 原因）；设计稿今日列表右侧图标疑似可操作，需确认后台是否开放。
7. **药品字典 / 频次字典**：频次、用量单位、状态枚举的字典来源（是否复用 `getDictOptions`）。

### 待联调确认项
- 用药提醒归属模块（患者档案下的子资源，还是独立用药服务）。
- 「复制」操作是否提供端点；已停用记录能否恢复。
- 推送开关与小程序订阅消息的联动方式；逾期判定由前端还是后端计算。
- 用药记录是否区分空腹/餐后等时段，是否与饮食记录关联。

## 七、占位函数约定（api/index.js）

后端补路径前，先在 `src/api/index.js` 建同名占位，组件统一从这里导入：

```js
// TODO 待后端补路径：用药提醒列表
export function getPatientMedicationsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/medications`, params)
}
// TODO 待后端补路径：今日用药记录与统计
export function getPatientMedicationRecordsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/medication-records`, params)
}
// TODO 待后端补路径：新增 / 编辑 / 停用 / 打卡 / 跳过（路径与入参以上述缺口清单为准）
```

> 占位函数在接口未通时可先 resolve 空数组/空对象，保证组件空态可渲染；**禁止在组件里写死示例药品或把占位返回标注为真实数据**。

## 八、本步交付清单

1. `MedicationReminderPanel.vue`：四张统计卡 + 今日用药完成情况列表 + 当前用药提醒列表 + 已停用列表。
2. 新增/编辑弹窗：药品名/规格/用量/频次/起止日期/动态时间点/说明/启用与推送开关，含校验。
3. api 层用药占位函数（列表、今日记录、增改停、打卡/跳过），集中 `normalizeMedication` / `normalizeTodayRecord` 映射兜底。
4. 空态、加载态、无数据占位；状态配色与设计稿一致；单位与日期口径统一。

> （注：部分内容由豆包 AI 生成）