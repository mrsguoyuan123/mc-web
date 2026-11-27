# 指令 SC2-1：右侧用户信息卡与 AI 区

> 模块定位：选中患者后右侧栏：患者基础信息卡 + AI 智能总结 + AI 沟通预判。中部聊天窗与 FAQ 见 SC2-2。
> **接口口径：用户详情/电话状态/AI 总结/AI 预判对接 `/cs/*` 已有端点；缺失字段按空值口径兜底。**
> 前置：当前选中患者 `currentPatientId` 由 SC1 `index.vue` 传入。

## 一、技术规范（强制）

- Vue3 `<script setup>` + Element Plus，**不要 TypeScript**；接口从 `../../api/index.js`（API 统一出口，本项目无 `@` 别名），工具从 `@/utils/index.js`。
- 雪花 ID 按字符串传；`aiSummary` 缓存可能为 null，按空态处理。
- 各区块独立加载、独立容错；切换患者时先清空旧数据再按新 id 拉取。

## 二、组件

```
src/views/serviceChatManage/components/
├── CsUserInfoCard.vue       # 右侧上：患者基础信息卡 + 电话按钮 + 进入资料抽屉入口
├── CsAiSummaryCard.vue      # 右侧中：AI 智能总结（症状/咨询历史/关键点标签）
└── CsAiPredictionCard.vue   # 右侧下：AI 沟通预判/建议行动 + 建议问题
```

## 三、右侧用户信息卡（`CsUserInfoCard.vue`）

### 数据：`getCsPatientById(id)` → `GET /cs/patients/{id}`

返回 `CsPatientDetail`，字段映射：

| 卡片展示 | 字段 | 备注 |
|---|---|---|
| 姓名 | `name` | — |
| 性别 | `gender` | 字典口径待联调；缺失 `MISSING_TEXT` |
| 年龄 | `age` | 0 正常显示 |
| 手机号 | `phone` | 脱敏按工程口径 |
| 所在地区 | `region` | — |
| 手术地区 | `surgeryRegion` | — |
| 医院 / 科室 / 医生 | `hospitalName` / `departmentId` / `doctorId` | 科室名若只回 id 需字典补名（待联调） |
| 主治医生 | `surgeon` | — |
| 术式 | `surgeryType` | — |
| 手术日期 | `surgeryDate` | `YYYY-MM-DD` |
| 病情简介 | `diseaseIntro` | 长文本折叠 |
| 健康状态 | `healthStatus` | 用全局 `healthStatusText` / `HEALTH_STATUS_TAG_TYPE` |
| 标签 | `tagsJson` | `safeParseJson` 解析为字符串数组；解析失败按空 |
| 沟通状态 | `communicateStatus` | 模块字典（SC1） |
| 购买意向 | `purchaseIntent` | 模块字典（SC1） |
| 服务包 | `servicePackage` | — |
| 手术档案 | `surgeryArchive` | `{ surgeryType/surgeryDate/hospitalName/surgeon/surgeryRegion/diseaseIntro }`，与上字段重复时优先取档案 |
| 沟通时间线 | `timeline` | `[{ type MESSAGE/CALL, id, time, title, content, actor }]`；仅作只读摘要展示，不等同消息流 |

### 电话按钮状态：`getCsPatientPhoneStatusById(id)` → `GET /cs/patients/{id}/phone-status`

返回 `{ called, latestCallTime }`：
- `called=true` 按钮蓝色（已拨打），`false` 绿色（未拨打）；`latestCallTime` 展示「最近通话 HH:mm」。
- 点击电话按钮打开 SC4 `CsCallPanel`；本卡不直接发起双呼。

### 操作入口
- 「查看完整资料」按钮：emit `open-profile`，由 `index.vue` 打开 SC3 `CsProfileDrawer`，传入 `currentPatientId`。
- 卡片内「历史记录」「放大聊天」打开 SC2-2 聊天弹窗，不另接接口。

## 四、AI 智能总结（`CsAiSummaryCard.vue`）

### 数据：`getCsPatientAiSummaryById(id)` → `GET /cs/patients/{id}/ai-summary`

返回 `{ text, tags[], source }`：
- `text`：总结正文（主要症状/咨询历史），长文本保留换行。
- `tags`：关键点标签数组，`el-tag` 展示。
- `source`：`AI 真实 / MOCK 降级`；为 MOCK 时卡片角标标注「降级示例」，避免误判为真实 AI 结论。
- 接口失败或 `text` 缺失：显示空态「暂无 AI 总结」，不渲染假总结。

## 五、AI 预判与建议（`CsAiPredictionCard.vue`）

### 数据：`getCsPatientAiPredictionById(id)` → `GET /cs/patients/{id}/ai-prediction`

返回 `{ suggestions[], source }`：
- `suggestions`：沟通建议/建议行动数组，逐条列出；建议问题可取自该数组或 FAQ（SC2-2）。
- `source` 同总结卡，MOCK 降级需标注。
- 空数组显示空态「暂无沟通建议」。

## 六、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 患者详情 | `getCsPatientById(id)` | `GET /cs/patients/{id}` |
| 电话状态 | `getCsPatientPhoneStatusById(id)` | `GET /cs/patients/{id}/phone-status` |
| AI 总结 | `getCsPatientAiSummaryById(id)` | `GET /cs/patients/{id}/ai-summary` |
| AI 预判 | `getCsPatientAiPredictionById(id)` | `GET /cs/patients/{id}/ai-prediction` |

## 七、待联调确认

- `gender` 字典取值；`departmentId` 是否回传科室名。
- AI `source` 枚举中文映射口径；MOCK 降级是否需在界面统一角标。
- 详情 `timeline` 是否需要在右侧摘要区展开，还是仅服务于沟通记录页签。

## 八、本段交付清单

1. `CsUserInfoCard.vue`：对接详情 + 电话状态，含进入资料抽屉入口。
2. `CsAiSummaryCard.vue`、`CsAiPredictionCard.vue`：对接 AI 总结/预判，MOCK 降级标注、空态兜底。
3. 切换患者清空与重拉；各区块独立加载与失败兜底。
