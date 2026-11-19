# 指令 14：睡眠管理 Tab（独立组件 SleepManagementPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「睡眠管理」为第八个 Tab；本指令只落地该 Tab 内容，独立成文件。
> **接口现状：patient / app / account 三个 swagger 模块中，仅健康摘要返回体含 `sleep` 模块占位（`{ latest, trend }`）；睡眠评估结果、历史评估记录、睡眠仪连接状态、评估方案与题目配置均无独立端点。除摘要 `sleep` 外，其余数据接口以占位函数 + 待联调标注处理，先搭好 UI 与交互闭环，不伪造真实数据。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `../utils.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js` 导入；后端未就绪的接口在 api 层先建同名占位函数（resolve 空对象/空数组 + `// TODO 待后端补路径`），组件只调占位函数，不在组件内写死示例评分、题目、设备信息。
- 接口未就绪/无数据：各分区显示空态占位，不画假评分条、假设备状态、假题目选项。
- 日期时间 `YYYY-MM-DD HH:mm`；时间 `HH:mm`；评分与选项分值保持后端原值。

## 二、新建组件

`src/views/userManagement/userManagementDetail/SleepManagementPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取睡眠相关数据。
- 本 Tab 分区：最新睡眠评估结果、睡眠仪连接状态、历史评估记录、睡眠评估方案配置（题目列表 + 编辑/新增弹窗）。

## 三、页面结构（从上到下）

### 1. 上排两栏：最新评估结果 + 睡眠仪状态（左右并排）

#### 1.1 最新睡眠评估结果（左卡）
- 标题「最新睡眠评估结果」，右侧操作「历史评估」（点击展开/切换历史评估记录区，见 1.3）。
- 左侧总分块：大数字总分 + 「总分/21」；上方结果标签（如「睡眠质量差」，按分值区间映射，待后端定区间）；副标题量表名（如「匹兹堡睡眠质量指数（PSQI）」）+ 评估时间。
- 维度评分条列表（每项一行）：
  - 维度名 + 进度条（按得分占比着色）+ 右侧档位文字（如 `2/3 较差`、`2/3 >30分钟`、`1/3 6-7小时`）。
  - 维度（PSQI 七项，建议）：睡眠质量、入睡时间、睡眠时间、睡眠效率、睡眠障碍、催眠药物、日间功能、睡眠效率（以实际量表为准）。
- 底部 AI/健康建议条：
  - 标签「AI健康建议」+ 人工编辑标记（如「已人工编辑」）；右侧「编辑」「重新生成」操作。
  - 建议正文；底部编辑人 + 最后编辑时间（如「最后编辑：李客服 · 2026-10-20 14:30」）。

#### 1.2 睡眠仪连接状态（右卡，浅绿底）
- 标题「睡眠仪连接状态」，右侧「刷新」。
- 连接状态：「已连接 ·」绿色圆点（未连接/离线另给状态样式）。
- 信息两列：设备名称、设备编号；最近连接时间、最近同步时间。
- 同步进度条：进度百分比（如 72%）；无设备时显示未绑定空态。

### 1.3 历史评估记录（可折叠/切换展开，整宽）
- 标题「历史评估记录」。
- 每条：评估时间、量表名；右侧总分 + 结果标签 + 「最新」标记（当前最新一条高亮）。
- 点击某条可回填/查看对应评估详情（详情接口待补，见缺口清单）。

### 2. 睡眠评估方案配置（整宽）
- 标题「睡眠评估方案配置」，右侧「预览」「编辑题目」按钮。
- 副行：「当前方案：匹兹堡睡眠质量指数（PSQI）标准模板」。
- 题目列表（Q1~Q7），每题卡片：
  - 序号徽标（Q1…）+ 题干；下方维度标签（如「入睡时间」）+ 「必填」/「启用」状态标签。
  - 选项行：各选项 + 括号分值（如 `≤15分钟 (0分)`、`16-30分钟 (1分)`）。
  - 编辑态下：右侧编辑（铅笔）、停用/删除图标；底部「+ 新增题目」。
- 方案为只读预览态时，操作图标隐藏；点「编辑题目」进入编辑态。

## 四、新增 / 编辑题目弹窗

### 编辑题目弹窗（睡眠3）
- 标题「编辑题目」。
- 字段：
  - 题目内容 *（多行输入）
  - 评估维度 *（选择/输入，如入睡时间、睡眠时间…）
  - 题目类型（下拉：单选 / 多选 / 数字评分 / 文本补充，以实际为准）
- 底部「取消」「保存」。

### 新增评估题目弹窗（睡眠4）
- 标题「新增评估题目」。
- 字段：题目内容 *、评估维度 *、题目类型（下拉，默认单选）。
- 底部「取消」「确认新增」。
- 选项与分值配置在题目保存后的二级编辑里维护（接口未明确时先留位，不臆造交互）。

## 五、数据来源与字段映射（占位，待后端定稿）

### 5.1 健康摘要 `sleep` 模块（swagger 已占位，子字段未展开）
结构：`{ latest 最新一条, trend 窗口内趋势数组 }`。
> 子字段名 swagger 未展开；组件内集中 `normalizeSleep(latest, trend)` 做映射兜底。

### 5.2 最新评估结果（建议字段，待后端定稿）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 评估记录 ID | `id` | 历史记录/详情用 |
| 量表名 | `scaleName` / `questionnaireName` | 如 PSQI |
| 总分 | `totalScore` | 缺失显示红色「接口未提供」 |
| 总分上限 | `maxScore` | 如 21 |
| 结果标签 | `level` / `levelText` | 睡眠质量差/一般/良好，区间映射待后端定 |
| 评估时间 | `assessedAt` | `YYYY-MM-DD HH:mm` |
| 维度得分 | `dimensions: [{ key, name, score, maxScore, levelText }]` | 评分条与档位文字 |
| 建议正文 | `advice` / `aiAdvice` | |
| 建议是否人工编辑 | `adviceManualEdited` | 布尔 |
| 建议编辑人 | `adviceEditorName` | |
| 建议最后编辑时间 | `adviceEditedAt` | |

### 5.3 睡眠仪连接状态（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 连接状态 | `status` | CONNECTED 已连接 / OFFLINE 离线 / UNBOUND 未绑定 |
| 设备名称 | `deviceName` | |
| 设备编号 | `deviceSn` / `deviceCode` | |
| 最近连接时间 | `lastConnectedAt` | |
| 最近同步时间 | `lastSyncedAt` | |
| 同步进度 | `syncProgress` | 0~100 整数 |

### 5.4 历史评估记录（建议字段）

| 展示项 | 建议字段 |
|---|---|
| 记录 ID | `id` |
| 评估时间 | `assessedAt` |
| 量表名 | `scaleName` |
| 总分 | `totalScore` |
| 结果标签 | `levelText` |
| 是否最新 | `isLatest` |

### 5.5 评估方案与题目（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 方案 ID | `planId` / `templateId` | |
| 方案名 | `planName` | 如 PSQI 标准模板 |
| 题目列表 | `questions: []` | |
| 题目 ID | `questionId` | |
| 题干 | `content` | |
| 评估维度 | `dimension` / `dimensionText` | |
| 题目类型 | `questionType` | SINGLE 单选 / MULTI 多选 / NUMBER 数字 / TEXT 文本 |
| 是否必填 | `required` | 布尔 |
| 是否启用 | `enabled` | 布尔 |
| 选项 | `options: [{ label, score }]` | 选项文案 + 分值 |
| 排序 | `sort` | 题目顺序 |

## 六、接口缺口核对（patient / app / account swagger 现状）

### 已覆盖
- 健康摘要 `getPatientHealthSummaryById` 返回体含 `sleep` 模块（`{ latest, trend }`），可承接最新/趋势类展示；但子字段未展开，且不含评估明细、设备、方案题目。

### 缺失接口（需后端补，本版先占位）
1. **睡眠评估结果详情**：`GET /patients/{id}/sleep-assessments/{assessmentId}`（维度得分、建议、编辑信息）。
2. **历史评估记录列表**：`GET /patients/{id}/sleep-assessments`（分页/时间范围，返回总分、量表、结果标签、是否最新）。
3. **健康建议编辑 / 重新生成**：`PUT /patients/{id}/sleep-assessments/{id}/advice`（人工编辑建议）；`POST /.../advice/regenerate`（AI 重新生成）。
4. **睡眠仪绑定与状态**：`GET /patients/{id}/sleep-device`（设备名/编号/连接/同步进度）；`POST /.../sync`（手动刷新/同步）；解绑/绑定端点待确认。
5. **评估方案查询**：`GET /patients/{id}/sleep-plan`（当前方案 + 题目 + 选项 + 分值）。
6. **题目增删改**：`POST /patients/{id}/sleep-plan/questions`（新增）、`PUT /.../questions/{questionId}`（编辑）、`DELETE /.../questions/{questionId}`（停用/删除）；题目排序、启停端点。
7. **量表/维度/题型字典**：评估维度、题目类型、结果等级区间的字典来源（是否复用 `getDictOptions`）。

### 待联调确认项
- 摘要 `sleep` 模块与上述评估结果接口的数据关系：摘要是否只给趋势/最新分，明细走独立端点。
- 结果标签（差/一般/良好）的分值区间由后端给定还是前端映射。
- 睡眠仪数据来源：院内设备对接还是小程序穿戴上报；同步进度是否实时轮询。
- 方案是患者个性化配置还是全局模板；题目改动是否影响历史评估记录。
- AI 建议重新生成的限流、人工编辑后是否允许再次覆盖。

## 七、占位函数约定（api/index.js）

后端补路径前，先建同名占位，组件统一从这里导入：

```js
// TODO 待后端补路径：历史睡眠评估记录
export function getPatientSleepAssessmentsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/sleep-assessments`, params)
}
// TODO 待后端补路径：评估结果详情
export function getPatientSleepAssessmentById(id, assessmentId) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/sleep-assessments/${encodeURIComponent(String(assessmentId))}`)
}
// TODO 待后端补路径：睡眠仪状态 / 方案题目 / 题目增改停（路径与入参以上述缺口清单为准）
```

> 占位函数在接口未通时可先 resolve 空对象/空数组，保证组件空态可渲染；**禁止在组件里写死示例评分、题目选项或把占位返回标注为真实数据**。

## 八、本步交付清单

1. `SleepManagementPanel.vue`：最新评估结果（总分 + 七维度评分条 + 建议条）、睡眠仪连接状态卡、历史评估记录区、评估方案题目列表。
2. 编辑题目 / 新增题目弹窗：题干、评估维度、题目类型，含必填校验。
3. api 层睡眠评估/设备/方案题目占位函数；集中 `normalizeSleep` 等映射兜底。
4. 空态、加载态、无数据占位；状态配色与设计稿一致；单位与日期口径统一。

> （注：部分内容由豆包 AI 生成）