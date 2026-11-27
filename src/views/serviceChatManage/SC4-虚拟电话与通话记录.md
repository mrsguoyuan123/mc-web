# 指令 SC4：虚拟电话侧栏与通话记录提交

> 模块定位：客服通过虚拟保护号双呼联系患者，通话结束后回填通话记录表单并落库；可选同步通话卡片到沟通群。
> **接口口径：发起双呼、通话记录提交、电话状态对接 `/cs/*` 已有端点；实时通话状态（准备呼叫→接通→计时→挂断）后端未覆盖，按占位标注。**
> 入参：`patientId` 由 `index.vue` 当前选中患者传入。空值口径同全局约定。

## 一、技术规范（强制）

- Vue3 `<script setup>` + Element Plus，**不要 TypeScript**；接口从 `../../api/index.js`（API 统一出口，本项目无 `@` 别名），工具从 `@/utils/index.js`。
- 雪花 ID 按字符串传；`callId` 用于提交记录幂等，发起双呼拿到后须保留到提交。
- 表单超集按 swagger 枚举校验；`SUCCESS` 才填时长、才允许 `pushToGroup`。

## 二、组件

```
src/views/serviceChatManage/components/
├── CsCallPanel.vue          # 虚拟电话侧栏：患者信息、呼叫按钮、线路状态、计时、记录表单入口
└── CsCallRecordForm.vue     # 通话记录表单（结果/时长/用药/恢复/依从性/反馈/备注等）
```

## 三、发起双呼

### 数据：`startCsCallById(id)` → `POST /cs/patients/{id}/call`

- 无请求体；返回 `CallSession`：`{ callId, virtualNumber }`。
- 流程：
  1. 点击「拨打虚拟电话」→ 调用 `startCsCallById(patientId)`。
  2. 保存返回的 `callId`（双呼会话 id）与 `virtualNumber`（虚拟保护号）到组件状态。
  3. 侧栏展示虚拟号码、线路状态占位、通话计时。
- `virtualNumber` 展示在「虚拟号码」位；缺失显示 `MISSING_TEXT`。

### 实时通话状态 —— 缺口占位

> **后端缺口：无通话状态轮询/推送端点。** `phone-status` 只回是否已拨 + 最近通话时间，不含进行中状态。

- 预留状态机：`IDLE 待呼叫 / CALLING 准备呼叫 / CONNECTED 通话中 / ENDED 已结束 / FAILED 失败`。
- 计时 `00:00` 前端秒级累加；状态推进先由前端交互占位，标注 `// TODO 待后端补通话状态回调/轮询`。
- 线路状态（线路可用/网络良好）当前无端点，展示占位文案，不伪造线路检测结果。
- 挂断后进入记录表单；通话中不重复发起双呼。

## 四、电话状态回显

### 数据：`getCsPatientPhoneStatusById(id)` → `GET /cs/patients/{id}/phone-status`

返回 `{ called, latestCallTime }`：
- 侧栏/按钮初始态按 `called` 着色（同 SC2 用户信息卡）；`latestCallTime` 展示最近通话时间。
- 提交记录成功后刷新一次该状态。

## 五、通话记录表单（`CsCallRecordForm.vue`）

### 提交：`createCsCallRecordById(id, data)` → `POST /cs/patients/{id}/calls`

`data`（`CsCallRecordRequest`）字段与枚举：

| 字段 | 类型 | 必填/条件 | 枚举 / 约束 |
|---|---|---|---|
| `callStatus` | string | **必填** | `SUCCESS 成功 / FAILED 失败` |
| `failReason` | string | FAILED 时填 | `NO_ANSWER 无人接听 / WRONG_NUMBER 号码错误 / REJECTED 拒接 / INTERRUPTED 通话中断` |
| `durationSec` | number | SUCCESS 必填，≥0 | 秒；前端由计时换算，可人工校正 |
| `medicationStatus` | string | 选填 | `ON_TIME 按时 / OCCASIONAL_MISS 偶漏 / STOPPED 已停 / SELF_ADJUSTED 自行调整` |
| `recoveryStatus` | string | 选填 | `GOOD 良好 / FAIR 一般 / POOR 较差` |
| `complianceStatus` | string | 选填 | `FULL 完全 / PARTIAL 部分 / NONE 不依从` |
| `coreElements` | string | 选填 | 核心要素，≤1024 |
| `precautions` | string | 选填 | 注意事项宣教，≤1024 |
| `problems` | string | 选填 | 问题记录，≤1024 |
| `recordRemark` | string | 选填 | 记录备注，≤1024 |
| `servicePackageFeedback` | string | 选填 | `USED_CORE 用核心 / NOT_USED 未用 / ISSUES 有问题` |
| `repurchaseIntent` | string | 选填 | `INTERESTED 有兴趣 / NOT_INTERESTED 无兴趣 / UNSURE 不确定` |
| `ivrSatisfaction` | number | 选填 | 患者 IVR 按键满意度 1–5 |
| `improvementSuggestion` | string | 选填 | 改进建议，≤1024 |
| `otherDemand` | string | 选填 | 其他需求，≤1024 |
| `secondarySales` | boolean | 选填 | 二次销售潜力，仅客服可见 |
| `csRemark` | string | 选填 | 仅客服可见备注，≤1024 |
| `pushToGroup` | boolean | 选填 | `true` 且 `SUCCESS` 时同步通话记录卡片到沟通群 |
| `callId` | string | 选填 | 双呼会话 id，非空用于提交幂等；取发起双呼返回值 |
| `virtualNumber` | string | 选填 | 虚拟保护号；取发起双呼返回值 |

### 表单规则

- `callStatus=FAILED`：隐藏/禁用时长与服务包反馈相关项，`failReason` 必填。
- `callStatus=SUCCESS`：`durationSec` 必填且 ≥0；`pushToGroup` 勾选框可用。
- 文本域 ≤1024 字数限制，超限拦截并提示；`ivrSatisfaction` 用 1–5 评分组件。
- 提交成功：返回落库记录 `FollowUpCallRecord`（`id/taskId/patientId/csId` 为雪花字符串）；关闭表单、刷新电话状态与沟通记录。
- 提交失败：保留表单内容，提示错误，不清空 `callId`。
- `pushToGroup=true` 仅在 `SUCCESS` 时生效；FAILED 时强制不勾选并提示。

## 六、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 发起双呼 | `startCsCallById(id)` | `POST /cs/patients/{id}/call` |
| 提交通话记录 | `createCsCallRecordById(id, data)` | `POST /cs/patients/{id}/calls` |
| 电话状态回显 | `getCsPatientPhoneStatusById(id)` | `GET /cs/patients/{id}/phone-status` |
| 通话实时状态（占位） | — | 待后端补状态回调/轮询端点 |

## 七、待联调确认

- 通话进行中状态推送方式：WebSocket 还是轮询；状态枚举与挂断原因口径。
- `durationSec` 是否允许客服手工修正；IVR 满意度是否由患者按键回传、客服只读。
- `pushToGroup` 同步的卡片样式与群范围；失败原因枚举是否需扩展。
- 通话记录是否需在沟通记录页签回显为 `CALL` 类型（复用 `getPatientCommunicationsById`）。

## 八、本段交付清单

1. `CsCallPanel.vue`：患者信息、虚拟号码、呼叫按钮、状态/计时占位、线路状态占位。
2. `CsCallRecordForm.vue`：超集表单 + 枚举校验 + 条件必填 + 字数限制，对接提交端点。
3. `callId` 幂等保留；提交成功刷新电话状态；失败保留表单。
4. 实时通话状态、线路检测等缺口标注待后端补，不伪造状态与计时结果。
