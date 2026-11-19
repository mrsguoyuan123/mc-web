# 指令 8：附件管理 Tab（独立组件 AttachmentPanel.vue）

> 前置：指令 7 详情页 Tab 框架已搭好，「附件管理」为第二个 Tab；本指令只落地该 Tab 内容，独立成文件。
> 接口口径：patient 模块 swagger 已确认，路径/函数名以下列为准；字段缺失显示 `接口未提供`，红色，不写死示例文件。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../../api/index.js` 导入（按组件实际层级调整）；复用 `../utils.js` 的 `displayText / formatTime`。
- 雪花 ID 已由封装层转字符串，路径/入参 id 一律按字符串传递。
- 文件大小由后端字节数前端格式化（B/KB/MB）；时间 `YYYY-MM-DD HH:mm`。
- 不在前端写死「手术记录.pdf / 病理报告.pdf」等示例条目；接口未就绪为空数组 + 加载态。

## 二、新建组件

`src/views/userManagementDetail/components/AttachmentPanel.vue`

### Props / 事件
- `props: { patientId: { type: [String, Number], default: '' } }`。
- 组件内部 `onMounted` 与 `watch(() => props.patientId)` 变化时重新拉取列表。
- 不需要向详情页抛业务事件；上传/删除成功后内部刷新列表。

## 三、页面结构

### 标题区
- 主标题「附件管理」。
- 副说明（灰色小字）：「支持 PDF、Word、Excel、图片格式，单文件不超过 20MB」。
- 右上角黑色主按钮「上传附件」（带上传图标）。

### 附件列表
每行一条附件，横向排布：
- 左侧：文件类型图标（按 `fileExt`/`category` 区分 PDF / Word / Excel / 图片，不同颜色）。
- 中间：文件名 `fileName`（主行）；副行 `格式 · 大小 · 上传时间 · 上传人`。
- 右侧三个图标按钮：查看（眼睛）、下载（下载箭头）、删除（红色垃圾桶）。

- 空态：列表为空显示空态占位「暂无附件」样式参考其他页面空态样式。
- 加载态：请求中显示骨架或 loading，禁止渲染假数据。
- 分页：后端分页（page/pageSize，默认 20，上限 100）；先按全量拉取实现，若返回 `total > pageSize`，底部加「加载更多」。

## 四、字段映射（swagger 定稿）

列表项 `PatientAttachment`：

| 展示项 | 字段 | 说明 |
|---|---|---|
| 附件 ID | `id` | 字符串，删除/操作用 |
| 分类 | `category` | 枚举：检查报告 / 影像资料 / 病理资料 / 饮食记录 / 运动记录 / 其他 |
| 文件名 | `fileName` | |
| 文件大小 | `fileSize` | 字节，前端格式化为 KB/MB |
| 文件地址 | `url` | 查看/下载用 |
| 上传人角色 | `uploaderRole` | DOCTOR/CS/CAREGIVER/PATIENT/ADMIN；无上传人姓名时先显示角色中文 |
| 上传时间 | `createTime` | `YYYY-MM-DD HH:mm` |
| 上传人 ID | `uploaderId` | 字符串，留作后续补姓名 |

角色中文映射：DOCTOR 医生 / CS 客服 / CAREGIVER 陪诊师 / PATIENT 用户 / ADMIN 管理员。

## 五、接口对接（api/index.js 已确认函数，直接调用）

```js
import {
  getPatientAttachmentsById,
  createPatientAttachmentById,
  deletePatientAttachmentById
} from '../../../api/index.js'
```

- 列表：`getPatientAttachmentsById(patientId, { category, page, pageSize })`
  - 返回 `{ list, total, page, pageSize }`。
  - 可选分类筛选 `category`（枚举见上）；本版 UI 先不做分类下拉，预留入参。
- 登记附件：`createPatientAttachmentById(patientId, { category, fileName, fileSize, url })`。
- 删除：`deletePatientAttachmentById(patientId, attachmentId)`。

### 上传流程（两步）
1. 文件本体先经工程内文件上传接口 `uploadFile(file, dir)`（来自 `./file.js` 等价封装，以工程现有上传工具为准）拿到 `url`；dir 按医疗档案取 `medical`。
2. 再调 `createPatientAttachmentById` 登记元数据：`category`（必填，按文件类型/用户选择归类，缺省「其他」）、`fileName`、`fileSize`、`url`。
3. 成功后刷新列表；失败弹错误提示，不清空已选文件。

### 校验规则
- 格式白名单：PDF、Word（doc/docx）、Excel（xls/xlsx）、图片（jpg/jpeg/png）；不符提示「仅支持 PDF、Word、Excel、图片格式」。
- 单文件 ≤ 20MB；超限提示「文件不能超过 20MB」。
- 上传中按钮/条目显示 loading 或进度；支持单选（多文件按后端能力后续扩展）。

## 六、交互

- **查看**：`url` 在线预览；PDF/图片直接预览，Word/Excel 不支持在线预览时提示并走下载。无 `url` 时查看按钮置灰。
- **下载**：按 `url` 下载原文件，保留 `fileName` 原始文件名。
- **删除**：先二次确认「删除后无法恢复。确认删除此附件吗？」；确认后调删除接口，成功移除条目并刷新；失败提示并保留条目。
- 上传按钮在无 `patientId` 时置灰。

## 七、本步交付清单

1. `AttachmentPanel.vue` 独立组件：标题区 + 说明 + 上传按钮。
2. 附件列表（图标/文件名/副行/三操作按钮）、空态、加载态、分页加载更多。
3. 上传两步流程（先拿 url 再登记元数据）、格式与大小校验。
4. 查看、下载、删除（二次确认）交互闭环。
5. 分类枚举、角色中文映射集中在组件常量区，便于后续调整。

## 八、待联调确认项

- 附件上传工具在工程内的实际导出路径与目录参数；`uploadFile` 返回结构。
- 上传人姓名是否需结合服务关系/字典二次查询补齐；分类是否要在 UI 提供下拉选择。
- 在线预览支持的格式；`url` 是否需要鉴权头访问。

