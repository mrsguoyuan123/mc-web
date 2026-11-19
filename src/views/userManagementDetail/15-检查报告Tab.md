# 指令 15：检查报告 Tab（独立组件 LabReportPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「检查报告」为第九个 Tab；本指令只落地该 Tab 内容，独立成文件。
> **接口现状：附件上传/查看/删除复用患者附件链路；检验指标、指标趋势、AI 识别总结在 patient / app / account swagger 中均无独立端点，健康摘要仅占位 `tumorMarkers`（肿瘤标志物）、`bloodRoutine`（血常规）、`liverFunction`（肝功能/白蛋白）三个模块（`{ latest, trend }`，子字段未展开）。除附件与摘要占位外，其余数据接口以占位函数 + 待联调标注处理，先搭好 UI 与交互闭环，不伪造真实数据。**
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 值正常显示；复用 `../utils.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js` 导入；后端未就绪的接口在 api 层先建同名占位函数（resolve 空对象/空数组 + `// TODO 待后端补路径`），组件只调占位函数，不在组件内写死示例指标值、趋势点、AI 总结。
- 接口未就绪/无数据：各分区显示空态占位，不画假指标行、假趋势线、假总结。
- 日期 `YYYY-MM-DD`；时间 `YYYY-MM-DD HH:mm`；指标单位、参考范围保持后端原值。

## 二、新建组件

`src/views/userManagement/userManagementDetail/LabReportPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- `onMounted` 与 `watch(() => props.patientId)` 变化时拉取检验指标、报告附件、AI 总结。
- 本 Tab 布局：左侧检查分类侧栏 + 右侧内容区（报告列表 → 检查指标表 → 变化趋势 → AI 识别总结）。

## 三、页面结构

### 1. 左侧检查分类侧栏
- 标题「检查分类」，右上「+ 新增」。
- 分类项（与右侧模块一一对应）：
  - 肿瘤标志物（`tumorMarkers`）
  - 血常规（`bloodRoutine`）
  - 肝功能/白蛋白（`liverFunction`）
- 选中态高亮；切换分类时右侧报告、指标、趋势、总结随分类刷新。
- 分类增删本版先留入口占位，待后端字典/端点确认。

### 2. 右侧 · 检查报告（附件列表，复用附件链路）
- 标题「检查报告」，说明「支持 PDF、JPG、PNG，单文件最大 20MB」，右上「上传报告」。
- 每条报告行：文件图标、文件名、格式 + 大小 + 上传时间 + 上传人；右侧操作：识别状态标签（如「识别成功」）、查看（眼睛）、重新识别、删除（红色垃圾桶）。
- 附件取数复用 `getPatientAttachmentsById`，按分类 `category=检查报告` 或本 Tab 分类维度筛选；上传两步流程（先 `/files/upload` 拿 url，再 `createPatientAttachmentById` 登记元数据）；删除复用 `deletePatientAttachmentById`。
- 「重新识别」复用病历 OCR 链路（上传 → 建任务 → 轮询结果）；OCR 入参目录与返回结构待联调。

### 3. 右侧 · 检查指标（表格）
- 标题「检查指标」+ 异常计数标签（如「7 项异常」）；右上搜索框「搜索指标…」+「+ 新增指标」。
- 表格列：指标名称、结果、单位、参考范围、状态、检查时间、来源、操作（编辑、删除）。
- 状态：正常（绿标签）/ 异常（红标签，结果旁带异常圈标）；异常行浅红底。
- 来源标签：如「OCR 识别」/「手动录入」。
- 表格 `table-layout: fixed`；长文本省略，不横向撑破。

### 4. 右侧 · 变化趋势（按指标小卡片折线）
- 标题「变化趋势（根据历史报告自动生成）」。
- 每个指标一张小趋势卡：指标名 + 单位 + 最新值（带升降箭头与幅度，如 `↓11.0`）；折线 + 圆点节点；参考范围绿色虚线；底部参考范围标注（如「参考范围：0-5」）。
- 异常指标卡片浅红底；无历史数据的指标不生成趋势卡。
- 图表用工程内现有图表库；未引入先留 `div` 占位，不临时装依赖。

### 5. 右侧 · AI 识别总结
- 标题「AI 识别总结」，右上「重新生成」「编辑」。
- 编辑状态条：标注「已由 {操作人} 于 {时间} 手动修改」。
- 总结正文（文本域/只读段落）；底部「AI 生成时间：{时间} · 本内容仅供健康管理参考，不构成医学诊断结论」。
- 操作：
  - **编辑**：进入可编辑态，底部「取消」「保存」；保存记录修改人与修改时间。
  - **重新生成**：弹确认框「重新生成将覆盖当前 AI 总结内容（包括人工修改部分）。确认继续？」，按钮「取消」「确认重新生成」。

## 四、新增检查指标弹窗（检查2）

- 标题「新增检查指标」。
- 字段：
  - 指标名称 *（输入，如 CEA）
  - 结果 *（输入，如 4.2）
  - 单位（输入，如 ng/mL）
  - 参考范围（输入，如 0-5）
  - 检查时间（日期选择 `YYYY-MM-DD`）
  - 是否异常（开关/单选：正常 / 异常，默认正常）
- 底部「取消」「确认新增」。
- 校验：指标名称、结果必填；结果需为可比较数值（单位/参考范围可空）。
- 保存后刷新指标表与趋势；失败给提示，不清空表单。

## 五、数据来源与字段映射（占位，待后端定稿）

### 5.1 健康摘要三模块（swagger 已占位，子字段未展开）
`tumorMarkers` / `bloodRoutine` / `liverFunction`，结构均为 `{ latest, trend }`。组件内集中写 `normalizeLab(module, category)` 做映射兜底。

### 5.2 检查指标行（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 指标 ID | `id` | 编辑/删除用 |
| 分类 | `category` | tumorMarkers / bloodRoutine / liverFunction |
| 指标名称 | `indicatorName` / `name` | 缺失显示红色「接口未提供」 |
| 结果值 | `result` / `value` | 数值，缺失显示红色「接口未提供」 |
| 单位 | `unit` | |
| 参考范围 | `referenceRange` | 如 0-5 |
| 状态 | `status` | NORMAL 正常 / ABNORMAL 异常；也可由结果与参考范围前端判定 |
| 检查时间 | `checkedAt` | `YYYY-MM-DD HH:mm` 或日期 |
| 来源 | `source` | OCR / MANUAL 手动 |
| 关联报告 | `attachmentId` | 来自哪份报告 |

### 5.3 趋势点（建议字段）

| 展示项 | 建议字段 |
|---|---|
| 指标名称 | `indicatorName` |
| 单位 | `unit` |
| 参考范围 | `referenceRange` |
| 历史点 | `points: [{ date, value }]` |
| 最新值 / 升降幅度 | `latestValue` / `delta` / `trend` |

### 5.4 AI 总结（建议字段）

| 展示项 | 建议字段 | 备注 |
|---|---|---|
| 总结 ID | `id` | |
| 分类 | `category` | 与指标分类一致 |
| 总结正文 | `summary` / `content` | |
| 是否人工编辑 | `manualEdited` | 布尔 |
| 修改人 | `editorName` | |
| 最后修改时间 | `editedAt` | |
| AI 生成时间 | `generatedAt` | |

## 六、接口缺口核对（patient / app / account swagger 现状）

### 已覆盖 / 可复用
- `GET /patients/{id}/attachments`、`POST .../attachments`、`DELETE .../attachments/{attachmentId}`：报告附件的列表/上传/删除。
- 病历 OCR 链路：`POST /patients/{id}/medical-record/ocr`、`GET .../ocr/{taskId}`（识别结果轮询）；检查报告指标识别是否复用该链路待后端确认。
- 健康摘要三模块占位：`tumorMarkers` / `bloodRoutine` / `liverFunction`（仅 `{ latest, trend }` 骨架，子字段未展开）。

### 缺失接口（需后端补，本版先占位）
1. **检验指标列表**：`GET /patients/{id}/lab-indicators?category=`（按分类返回指标行：名称/结果/单位/参考范围/状态/时间/来源）。
2. **新增指标**：`POST /patients/{id}/lab-indicators`；**编辑** `PUT /patients/{id}/lab-indicators/{indicatorId}`；**删除** `DELETE /.../{indicatorId}`。
3. **指标趋势**：`GET /patients/{id}/lab-indicators/{indicatorId}/trend` 或由列表历史点聚合；返回按时间排序的 `{ date, value }` 与参考范围。
4. **AI 总结查询**：`GET /patients/{id}/lab-summary?category=`（正文、人工编辑标记、修改人/时间、AI 生成时间）。
5. **AI 总结保存（人工编辑）**：`PUT /patients/{id}/lab-summary/{summaryId}`。
6. **AI 总结重新生成**：`POST /patients/{id}/lab-summary/regenerate`（需明确是否清空人工修改、是否异步任务 + 轮询）。
7. **检查分类/指标字典**：分类枚举、指标名称与默认单位/参考范围字典来源（是否复用 `getDictOptions`）。

### 待联调确认项
- 摘要三模块与独立指标接口的数据关系：摘要是否只给最新值/趋势，明细走独立端点。
- 指标异常判定规则：后端给 `status` 还是前端按参考范围解析；上下限格式（区间/阈值）。
- 报告 OCR 识别结果如何回填到指标表；重新识别是否覆盖已有指标。
- AI 总结是按分类分别生成，还是患者整体一份；重新生成的权限与限流。
- 血常规、肝功能指标项清单与单位口径。

## 七、占位函数约定（api/index.js）

后端补路径前，先建同名占位，组件统一从这里导入：

```js
// TODO 待后端补路径：检验指标列表
export function getPatientLabIndicatorsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/lab-indicators`, params)
}
// TODO 待后端补路径：新增 / 编辑 / 删除指标
// TODO 待后端补路径：指标趋势、AI 总结查询 / 保存 / 重新生成（路径与入参以上述缺口清单为准）
```

> 占位函数在接口未通时可先 resolve 空对象/空数组，保证组件空态可渲染；**禁止在组件里写死示例指标值、趋势点或把占位返回标注为真实数据**。

## 八、本步交付清单

1. `LabReportPanel.vue`：左侧三分类侧栏 + 右侧报告列表、检查指标表、趋势卡片、AI 总结区。
2. 新增指标弹窗：名称/结果/单位/参考范围/检查时间/是否异常，含校验。
3. AI 总结编辑（保存修改人/时间）与重新生成确认弹窗；报告附件上传/查看/删除/重新识别复用现有链路。
4. api 层检验指标/趋势/总结占位函数；集中 `normalizeLab` 映射兜底。
5. 空态、加载态、无数据占位；状态配色与设计稿一致；单位与日期口径统一。

> （注：部分内容由豆包 AI 生成）