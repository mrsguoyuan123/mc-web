# AGENTS.md —— PC 管理端前端 AI 编码代理接入指南

> 本文件写给 **AI 编码代理（Claude Code / Codex / Cursor 等）** 和 PC 后台前端开发者：
> 说明 PC 管理端接口怎么用、按什么顺序调、哪些页面用哪些接口、哪些是坑。
> 接口全集见同目录 `API_INDEX.md`（自动生成，PC 子集），字段细节以 `swagger.json` 为准；
> 业务语义以仓库 `docs/03-接口设计.md`、`docs/superpowers/specs/2026-10-30-management-demo-pc-server-api-design.md` 为准。
> 发现文档与代码不一致时：**以运行时 / `swagger.json` 为准**，并在仓库提 issue。

## 1. 快速事实

| 项 | 值 |
|---|---|
| Base URL | `http://115.159.151.158:8081/api/v1`（联调）或 `http://followup.ijunyuan.cn/api/v1` |
| 协议 | HTTP + JSON（UTF-8）；WebSocket `ws://{host}/api/v1/ws?token=...` |
| 统一响应 | HTTP 状态**恒为 200**，业务状态看响应体 `code`（0=成功） |
| 鉴权 | `Authorization: Bearer <accessToken>` |
| 登录 | PC **两步式**：`/auth/pc/login` → 角色列表 → `/auth/pc/select-role` |
| 权限 | `/auth/me` / select-role 返回 `permissions[]`；新 PC 接口按权限码校验 |
| 时间 | `yyyy-MM-dd HH:mm:ss`；日期 `yyyy-MM-dd`；日期时间入参 `yyyy-MM-ddTHH:mm:ss`（Java `LocalDateTime`） |
| 分页 | 请求 `page`(从 1)/`pageSize`(默认 20，最大 100)；响应 `{list,total,page,pageSize}` |
| 文件 | 上传 `POST /files/upload`（multipart，需登录）；读取 `GET /files/{dir}/{filename}`（公开） |

## 2. PC 接入的三条硬规则

1. **登录必须两步式**：登录页只收集账号密码，第一步拿 `loginTicket + roles[]`，第二步由用户选角色换 token。
   不要再使用“登录页选角色”或 `/auth/login` 作为 PC 新入口。
2. **菜单/按钮按 `permissions[]` 渲染**：权限码来自 select-role / `/auth/me`，不要按 `role` 硬编码。
   `role` 是基础枚举（旧接口 `hasRole` 使用），`roleCode` 是动态角色（如 `pc_admin`）。
3. **数据范围由服务端强制**：`dataScope/hospitalId/departmentId/deptScope/scopeJson` 只用于前端展示筛选条件；
   不要试图通过传别的 `hospitalId`/`departmentId` 越权，服务端会忽略或 400。

## 3. 登录与鉴权流程

```
POST /auth/pc/login          {username, password}
  → {loginTicket, user:{id,name,username,avatar}, roles:[{code,name,terminal,baseRole,dataScope}],
     autoSelectRoleCode}
  loginTicket 5 分钟有效，只能用于 select-role；只有 1 个角色时 autoSelectRoleCode 有值

POST /auth/pc/select-role    {loginTicket, roleCode}
  → {token, refreshToken, user:{userId, username, name, role, roleCode, roleName, terminal,
      permissions[], dataScope, hospitalId, departmentId, deptScope, doctorDictId},
     roles[]}

POST /auth/pc/switch-role    {roleCode}        ← 带 Bearer
  → 同 select-role，返回新 token/refreshToken（旧 refresh 仍可用）

GET  /auth/me                ← 带 Bearer；刷新页面恢复会话，返回 permissions[] 与 roles[]
POST /auth/refresh?refreshToken=xxx            ← 旋转：旧 refresh 用一次即失效
POST /auth/logout?refreshToken=xxx             ← 带 Bearer；只注销本设备
PUT  /auth/password          {oldPassword, newPassword}
```

**错误语义（HTTP 一律 200，按 `code` 分流）**

| code | 处理 |
|---|---|
| 0 | 成功，取 `data` |
| 400 | 弹 `message`，不跳登录（参数/业务错误；`loginTicket` 过期也走这里，退回第一步） |
| 401 | 用 refreshToken 静默调 `/auth/refresh` 换新并重试原请求一次；无 refresh 则跳登录 |
| 402 | refresh 无效/过期 → 清凭证 → 跳登录 |
| 403 | 无权限提示（不要跳登录） |
| 500 | 通用错误提示 |

- 账号停用/无启用角色：`/auth/pc/login` 返回 400；无 PC 角色如医生账号返回 400“账号未配置可用的 PC 端角色”。
- 角色权限修改后，**下一次签发 token 才生效**；已签发 token 最长 2 小时仍带旧权限。
- 角色停用后选角色立即拒绝；JWT 无状态，已签发 token 不会立刻失效。

## 4. ID、数值与序列化（高频坑）

- **雪花 ID 是 19 位数字，超过 JS `Number.MAX_SAFE_INTEGER`**。浏览器 `JSON.parse` 会丢精度。
  - 推荐：请求层用 `json-bigint` 解析（`storeAsString: true`），或推动服务端配置 Long→String。
  - 类型定义中所有 `id/*Id` 一律用 `string | number`，不要用 `number` 做运算/比较。
- 金额/评分/百分比用 number；`*Rate` 字段通常是 0–100 数值，前端负责加 `%`。
- 枚举：服务端存 **ASCII**，中文标签由前端维护（见 §8）。
- `PUT` 请求体一般按“部分更新”实现；未传字段不改（但带校验的 PUT 可能要求必填字段，按 swagger 的 `required` 处理）。

## 5. 角色、权限与动态 RBAC

### 5.1 初始角色（9 个）

| code | 名称 | terminal | baseRole | dataScope |
|---|---|---|---|---|
| `pc_admin` | 电脑端管理员 | PC | ADMIN | ALL |
| `pc_customer_service` | 电脑端客服 | PC | CS | SELF |
| `pc_station` | 电脑端驻点 | PC | CAREGIVER | STATION |
| `pc_department_manager` | 电脑端科室管理 | PC | DEPT_ADMIN | DEPARTMENT |
| `pc_hospital_manager` | 电脑端医院管理 | PC | HOSPITAL_ADMIN | HOSPITAL |
| `mobile_customer_service` | 手机端客服 | MOBILE | CS | SELF |
| `mobile_station` | 手机端驻点 | MOBILE | CAREGIVER | STATION |
| `mobile_doctor` | 手机端医生 | MOBILE | DOCTOR | SELF |
| `dashboard` | 看板 | ALL | DASHBOARD | CUSTOM |

- `baseRole=DEPT_ADMIN` 在签发 token 时映射为 `role=HOSPITAL_ADMIN + deptScope=DEPT`，复用旧医院数据范围逻辑。
- PC 登录只返回 `terminal=PC/ALL` 的角色；手机端只返回 `MOBILE/ALL`。
- 一个账号可挂多个角色（`sys_user_role`）；每个角色独立带 `hospitalId/departmentId/deptScope/scopeJson`。
- 医助（DA）暂缓：不存在该角色/账号，不要生成页面逻辑。

### 5.2 权限码

- 菜单/页面码如 `menu:dashboard`、`menu:users`、`menu:doctors`、`menu:staff`、`menu:service`、`menu:miniapp`、`menu:ai`、`menu:chat`、`menu:consult`、`menu:station-chat`、`menu:station-audit`。
- 动作码如 `patient:view/create/update/delete/export/assign/communication/attachment`、`doctor:*`、`staff:*`、`role:*`、`chat:*`、`consult:*`、`kb:*`、`service:escort:manage`、`dashboard:view`。
- 完整权限树：`GET /permissions/tree`（分组 → 页面 → 动作，含 `code/name/type`）。
- 角色权限管理：`GET/PUT /roles/{id}/permissions`（`{permissionCodes:[]}` 全量替换）、`GET/PUT /roles/{id}/data-scope`、`GET /roles/{id}/accounts`。
- **重要取舍**：新 PC 接口用 `@PreAuthorize("hasAuthority('权限码')")`；旧接口仍按 baseRole 放行。
  因此自定义角色取消某项权限，只会影响新 PC 接口和前端菜单/按钮，**不会彻底隔离旧接口**；不要向用户宣传成“完全隔离”。

## 6. PC 页面 → 接口地图

> 完整路由见 `API_INDEX.md`；这里只列每个页面首屏和关键动作。

| 页面 | 首屏/主接口 | 关键动作 |
|---|---|---|
| 登录 | `POST /auth/pc/login` → `POST /auth/pc/select-role` | 单角色自动选；多角色弹选择；`GET /auth/me` 恢复会话 |
| 数据看板 | `GET /dashboard/overview?range=30d`、`/dashboard/service-trend`、`/dashboard/service-activity`、`/dashboard/filters` | 医院/科室看板：`/hospital/dashboard/*`、`/department/dashboard/*`；知识图谱/焦点/实时事件响应 `derived=true` |
| 机构管理 | `GET /dict/overview`、`GET /dict/hospitals`、`GET /dict/departments`、`GET /dict/areas` | 增删改 `/dict/hospitals|departments|areas`；下拉 `/dict/options` |
| 用户管理仓（患者） | `GET /patients?keyword=&page=`、`GET /patients/{id}/profile` | 新增/编辑/删除、导出 `/patients/export`、匹配客服/陪诊师 `/patients/{id}/match`、标签、陪诊次数 |
| 患者病历 | `GET/PUT /patients/{id}/medical-record` | 员工 OCR：`POST /patients/{id}/medical-record/ocr` → 轮询 `GET .../ocr/{taskId}` |
| 检查报告 | `GET /patients/{id}/exam/categories`、`.../reports`、`.../indicators`、`.../ai-summary` | 分类/报告/指标 CRUD；AI 总结生成是占位 |
| 用药/睡眠/运动 | `/patients/{id}/medication/*`、`/patients/{id}/sleep/*`、`/patients/{id}/exercise/*` | 运动方案保存/排序/归档、自评配置、周完成率 |
| 医生管理仓 | `GET /doctors?keyword=&page=`、`GET /doctors/{id}` | 录入 `POST /doctors`（驻点按 scope）、状态/上级/团队/医患绑定/变更历史 |
| 人员管理 | `GET /staff?personType=&roleId=&page=`、`GET /roles` | 新增/编辑/启停/重置密码/全量替换角色 `/staff/{id}/roles` |
| 角色权限 | `GET /roles`、`GET /permissions/tree` | 角色 CRUD/复制、`PUT /roles/{id}/permissions`、数据范围、关联账号 |
| 会话工作台 | `GET /conversations?status=&priority=&keyword=&page=`、`GET /conversations/{id}/workspace` | 发消息、编辑、已读、关闭/重开、紧急标记、访问审计；`GET /manual-service-requests` 处理转人工 |
| 快捷回复 | `GET /reply-templates/all`、`GET /reply-templates` | 增删改、启停/待完善、批量启停、使用记录、`POST /reply-templates/{id}/use` |
| 专业咨询 | `GET /consultations?status=&urgency=`、`GET /consultations/{id}` | 发起、关闭/解决、内部备注、再次留言、医生回复已读/转发给用户 |
| 随访管理 | `GET /follow-up/summary`、`GET /follow-up/tasks` | 4 步电话记录 `POST /follow-up/tasks/{id}/calls`；风险 `/risk-alerts` |
| 通知/待办 | `GET /notifications`、`GET /notifications/unread-count`、`GET /notifications/todo` | 单条/全部已读 |
| 陪诊管理 | `GET /escort/bookings`、`GET /staff?personType=CAREGIVER` | 管理员协助预约/改期/改派/取消（同 v3 规则） |
| 驻点聊天（只读） | `GET /caregiver/scope`、`/caregiver/conversations`、`.../messages` | 不要生成发送/已读/状态修改按钮 |
| 知识库 | `GET /kb/overview`、`GET /kb/entries`、`GET /kb/documents` | 问答 CRUD/批量状态/导入/搜索测试；文档解析、训练、发布/回滚为占位 |
| 小程序内容 | `GET /app/overview`、`/app/banners`、`/app/notices`、`/app/articles`、`/app/informed-consents`、`/app/login-agreements` | Banner/公告排序启停；告知书；登录协议版本 |
| 账户中心 | `GET/PUT /me/profile`、`/me/account/profile`、`/me/security`、`/me/login-logs`、`/me/operation-logs` | 修改密码 `/auth/password`；2FA/IP 白名单只持久化，不改变登录 |

## 7. 关键业务流程

### 7.1 PC 登录与角色切换

```
POST /auth/pc/login {username,password}
  roles.length == 1 → 直接 POST /auth/pc/select-role {loginTicket, roleCode: roles[0].code}
  roles.length > 1  → 用户选择 → select-role
  autoSelectRoleCode 有值 → 可直接自动选
已登录切角色：POST /auth/pc/switch-role {roleCode}（Bearer）
恢复会话：GET /auth/me → 用返回的 permissions[] 重建菜单
```

前端角色选择器只展示 `roles[]`，不要自行拼接角色；选中的 `roleCode` 必须来自该数组。

### 7.2 医生录入 → 医生手机号登录

- 驻点在 PC 直接录入医生：`POST /doctors`，`name/title/phone/hospitalId/departmentId` 必填；手机号全局唯一。
- 驻点只能录入自己 `scopeJson.hospitalIds/departmentIds` 内的医院/科室，否则 400。
- 医生 C 端首次登录：`POST /auth/doctor/sms-login {phone, code}`，服务端按 `dict_doctor.phone` 自动创建 `DOCTOR` 账号（用户名 `doctor_<手机号>`）。
- **没有医生申请/审核流程**；后续若打开，会新增 `doctor_application` 与审核接口，当前不要生成审核页面。
- 医生状态：`ACTIVE/SUSPENDED/RESIGNED/CANCELLED`；停用/离职后 C 端登录被拒绝。
- PC 端医生库用 `/doctors`，不要再用 `/dict/doctors`（legacy，仅保留兼容）。

### 7.3 管理员协助陪诊预约（v3 规则不变）

```
GET  /staff?personType=CAREGIVER&page=1&pageSize=100     // 选择陪诊师（ADMIN）
GET  /escort/bookings?patientId=&status=                  // 全量预约
POST /escort/bookings {patientId,caregiverId,serviceDate,period,departmentId?,remark?}
PUT  /escort/bookings/{id} {同上}                          // 改期/备注
PUT  /escort/bookings/{id}/assign?caregiverId=              // 改派
POST /escort/bookings/{id}/cancel                           // 取消，返还 1 次
```

- `period`: `MORNING/AFTERNOON/FULLDAY`；仅可约**明天起 10 天**。
- 预约即扣患者 1 次；取消全额返还；同一陪诊师同日时段互斥（全天与一切互斥、上午互斥、下午互斥）。
- 订单 `source=ADMIN` + `operator_id` 记录操作人；接单/开始/完成仍由陪诊师在小程序操作。
- `PUT /escort/config` 固定 400（全局配置未实现），不要生成保存成功提示。

### 7.4 专业咨询

```
GET  /consultations?patientId=&status=&urgency=&keyword=&page=
POST /consultations {patientId,subject,content,patientContext?,note?,urgency?,
                     expectedReplyAt?,doctorIds[],attachments[]}
GET  /consultations/{id}
PUT  /consultations/{id}/close | /resolve | /internal-note
POST /consultations/{id}/follow-ups
PUT  /consultations/{id}/replies/{replyId}/read
POST /consultations/{id}/replies/{replyId}/forward-to-user   // 医生回复落为会话消息
```

- 状态：`WAIT_DOCTOR_VIEW → WAIT_DOCTOR_REPLY → DOCTOR_REPLIED → CS_PROCESSING → RESOLVED/CLOSED`。
- 紧急程度：`NORMAL/ATTENTION/URGENT`。
- 新建时每位医生写 `consultation_doctor` 并发通知；医生无账号时只落库，登录后可见。
- 医生回复 → 状态 `DOCTOR_REPLIED`，通知创建客服/匹配客服，WS 推送 `consultation.reply.new`。

### 7.5 会话工作台

```
GET  /conversations?status=&priority=&keyword=&page=&pageSize=
     → list[]: {id,status,workStatus,priority,lastMessage,lastMessageAt,unreadCount,
                waitingMinutes,serviceAgent{id,name},patient{id,name,avatar,age,gender,phone,insuranceId,diseases[]}}
GET  /conversations/{id}/workspace   // 会话+患者摘要+AI总结+医生团队+健康摘要
GET  /conversations/{id}/messages?beforeId=&size=
POST /conversations/{id}/messages    // {type:TEXT|IMAGE|HEALTH_CARD, content?, imageUrl?, healthType?, clientSeq?}
PUT  /conversations/{id}/messages/{messageId} {newText}   // 仅作者本人；AI/SYSTEM 锁定
POST /conversations/{id}/read
PUT  /conversations/{id}/status      // ACTIVE/CLOSED
PUT  /conversations/{id}/priority    // NORMAL/URGENT（注意是 PUT）
POST /conversations/{id}/audit       // 显式访问审计
```

- `workStatus` 是派生值：`CLOSED → RESOLVED`；最后一条消息来自患者且未回复 → `WAITING`；否则 `REPLYING`。
- `unreadCount` 按 `conversation_read.last_read_at` 与消息 sender 计算；无已读记录视为全部未读。
- 转人工**只由患者点「人工服务」触发**；PC 通过 `GET /manual-service-requests` 拉待处理请求，
  `PUT /manual-service-requests/{id}` 受理/解决。不要生成自动转人工/AI 置信度逻辑。
- 消息编辑留痕：`isEdited/editorName/editedAt/originalText`；UI 显示“已编辑”。
- `clientSeq` 用于发送幂等：网络重试带同一 `clientSeq` 不会重复落库。

### 7.6 看板数据范围

- `ADMIN`/`DASHBOARD`：可传 `hospitalId`，缺省全量；`HOSPITAL_ADMIN`：强制本院；`DEPT_ADMIN`：强制本院+本科室。
- 前端传越权 ID 会被服务端忽略或 400；不要依赖前端过滤。
- 百分比字段统一 0–100（字段名 `*Rate`）；知识图谱/焦点/实时事件 `derived=true`，是代码常量+真实计数缩放，不是真实图谱算法。

### 7.7 小程序内容与登录协议

- Banner：`GET /app/banners`（公开，服务端按启用+日期窗口+排序过滤）、后台 `GET /app/banners/all`、`PUT /app/banners/{id}/status`、`PUT /app/banners/sort {position,ids[]}`。
- 公告：`GET /app/notices`、`PUT /app/notices/{id}/status`、`PUT /app/notices/sort {ids[]}`。
- 告知书：`GET /app/informed-consents`、`POST/PUT/DELETE`、`PUT /app/informed-consents/{id}/status`；按术式匹配，精确优先于通用。
- 登录协议：`GET /app/login-agreements?scene=LOGIN`（公开）、`GET /app/login-agreements/all`、`PUT /app/login-agreements/{id}`（自动次版本 +1）、`GET /app/login-agreements/{id}/versions`。
- `GET /app/overview` 返回 `{templateEnabled,articlePublished,bannerEnabled,loginAgreementCount}`。
- `/app/templates/*` 是 legacy，改用 `/reply-templates/*`。

## 8. 枚举字典（wire 值 → 中文标签）

| 域 | 字段 | 值 |
|---|---|---|
| 角色 | `role`（基础枚举） | ADMIN 公司管理 / HOSPITAL_ADMIN 医院管理 / CS 客服 / CAREGIVER 陪诊师 / DOCTOR 医生 / DASHBOARD 看板 / PATIENT 患者 |
| 角色 | `baseRole` | ADMIN / HOSPITAL_ADMIN / DEPT_ADMIN / CS / CAREGIVER / DOCTOR / DASHBOARD |
| 角色 | `terminal` | PC / MOBILE / ALL |
| 角色 | `dataScope` | ALL 全部 / HOSPITAL 医院 / DEPARTMENT 科室 / STATION 驻点 / SELF 本人 / CUSTOM 自定义 |
| 员工 | `personType` | CS 客服 / CAREGIVER 陪诊师 / GENERAL 综合 / DOCTOR 医生 |
| 医生 | `doctorStatus` | ACTIVE 在职 / SUSPENDED 停诊 / RESIGNED 离职 / CANCELLED 注销 |
| 医生 | `entrySource` | ADMIN 后台录入 / STATION 驻点录入 / APPLICATION 申请（未实现） |
| 患者 | `communicateStatus` | PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / PURCHASED 已购买 |
| 患者 | `purchaseIntent`（PC 写、小程序只读） | HIGH 高 / MEDIUM 中 / LOW 低 / PURCHASED 已购 |
| 患者 | `healthStatus` | 良好 / 关注 / 警告（中文原值） |
| 随访任务 | `status` | PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / COMPLETED 已完成 |
| 随访通话 | `callStatus` | SUCCESS 成功 / FAILED 失败 |
| 随访通话 | `failReason` | NO_ANSWER 无人接听 / WRONG_NUMBER 号码错误空号 / REJECTED 拒绝沟通 / INTERRUPTED 通话中断 |
| 随访通话 | `medicationStatus` | ON_TIME 按时用药 / OCCASIONAL_MISS 偶尔漏服 / STOPPED 已停药 / SELF_ADJUSTED 自行调整 |
| 随访通话 | `recoveryStatus` | GOOD 恢复良好 / FAIR 一般 / POOR 差 |
| 随访通话 | `complianceStatus` | FULL 完全遵守 / PARTIAL 部分遵守 / NONE 未遵守 |
| 随访通话 | `repurchaseIntent` | INTERESTED 有意向 / NOT_INTERESTED 无意向 / UNSURE 不确定 |
| 会话 | `status` | ACTIVE 进行中 / CLOSED 已关闭 |
| 会话 | `workStatus`（派生） | WAITING 待回复 / REPLYING 回复中 / RESOLVED 已解决 |
| 会话 | `priority` | NORMAL 普通 / URGENT 紧急 |
| 消息 | `type` | TEXT / IMAGE / HEALTH_CARD / CALL_RECORD |
| 消息 | `senderType` | PATIENT / CS / CAREGIVER / DOCTOR / AI / SYSTEM |
| 消息 | `healthType` | DIET 饮食 / EXERCISE 运动 / WEIGHT 体重 / BP_BG 血压血糖 / SLEEP 睡眠 |
| 快捷回复 | `status` | 1 启用 / 0 停用 / 2 待完善（草稿） |
| 咨询 | `status` | WAIT_DOCTOR_VIEW / WAIT_DOCTOR_REPLY / DOCTOR_REPLIED / CS_PROCESSING / RESOLVED / CLOSED |
| 咨询 | `urgency` | NORMAL / ATTENTION / URGENT |
| 咨询 | `doctorPriority` | HIGH / MEDIUM / NORMAL |
| 通知 | `type` | SYSTEM 系统 / ARTICLE 资料更新 / MANUAL_SERVICE 人工服务 / RISK 风险 / CONSULTATION 咨询 / CONSULTATION_REPLY 咨询回复 |
| 风险 | `level/status` | HIGH/MEDIUM/LOW；PENDING/HANDLED/CLOSED |
| 陪诊 | `period` | MORNING 上午 / AFTERNOON 下午 / FULLDAY 全天 |
| 陪诊 | `status` | WAIT_ACCEPT 待接单 / CONFIRMED 待服务 / IN_SERVICE 服务中 / COMPLETED 已服务 / CANCELLED 已取消 |
| 陪诊 | `source` | PATIENT 患者预约 / ADMIN 管理员协助 |
| 运动 | item.`status` | PENDING 进行中 / NEED_EVAL 待评估 / COMPLETED 已完成 / PAUSED 已暂停 |
| 运动 | item.`mode` | REPS 计数 / TIMER 计时 |
| 运动 | `sessionStatus` | COMPLETED / STOPPED |
| 知识库 | `publishStatus` | DRAFT 草稿 / PUBLISHED 已发布 |
| 知识库 | `source` | MANUAL 人工 / IMPORT 导入 / UNRESOLVED 未解决转标准问答 |
| 文件 | `dir` | common / meal / diet / medical / avatar / checkin / attachment / chat |

## 9. 文件上传

```
POST /files/upload?dir=medical        multipart: file=<binary>       // 返回 URL 字符串
POST /files/uploads?dir=medical       multipart: files=<binary...>   // 批量，返回 URL 数组
GET  /files/{dir}/{filename}                                          // 公开；cos 模式 302 到预签名 URL
```

- `dir` 白名单：`common / meal / diet / medical / avatar / checkin / attachment / chat`。
- 单文件 20MB、单请求 100MB；扩展名白名单：`jpg/jpeg/png/gif/webp/pdf/doc/docx/xls/xlsx`。
- 上传必须带 JWT；读取公开。COS 模式的预签名 URL 短期有效（默认 30 分钟），**不要缓存跳转地址**。

## 10. WebSocket

```
ws://{host}/api/v1/ws?token=<accessToken>
```

已实现事件（只依赖这三个）：

- `{"type":"message.new","data":<Message>}`
- `{"type":"notification.new","data":<Notification>}`
- `{"type":"pong"}`

> `manual.service.requested`、`risk.alert`、`ai.typing`、`consultation.reply.new` 为规划/部分实现，PC 端不要只依赖 WS：
> 转人工用 `GET /manual-service-requests`、咨询用列表轮询/刷新兜底。
> 单机实现；断线重连后用 REST 游标（`beforeId`）补偿。

## 11. 占位、降级与不要调用的接口

### 11.1 占位/降级（可展示，但要标注“占位/未实现”）

| 接口 | 行为 |
|---|---|
| `PUT /escort/config` | 固定 400“陪诊全局配置暂未实现” |
| `POST /patients/{id}/exam/reports/{id}/ocr` | 占位；无法识别返回 FAILED + 原因 |
| `POST /patients/{id}/exam/ai-summary/generate` | 占位；TokenHub 失败降级返回模板文案 |
| `GET /patients/{id}/health-dashboard` | 骨架：最近 20 条 + 趋势占位 |
| `GET /staff/performance` | 骨架：答复率/响应时间/满意度占位 |
| `GET /assessment/hospital-dashboard` | 骨架 TODO |
| `GET/PUT /me/settings`、`PUT /accounts/security` | 骨架：安全设置持久化，不改变登录校验 |
| `POST /kb/documents`、`POST /kb/documents/{id}/reparse` | 文档解析占位 |
| `POST /kb/train`、`GET /kb/train/{jobId}`、`POST /kb/versions/{id}/publish`、`POST /kb/rollback` | 训练/发布占位，响应 `placeholder=true` |
| `GET /conversations/stats` | `replyRate/avgResponseSeconds` 部分占位（注意 summary 标注） |

### 11.2 不要调用/不要生成页面

- 已删除业务：交易/订单/支付、健康照护师/护理员、服务包、保险台账、旧驻点排班、睡眠音乐、ODI/GAD-7/PHQ-9（只保留 PSQI）。
- 已移除页面：`PatientHealthDetail`、`MiniprogramDashboard`、`QAManagement`、`DoctorAuditDashboard`。
- 医生申请/审核：未实现，不要生成“医生注册审核”页面。
- 医助（DA）：未建角色/账号/接口。
- legacy：`/auth/login`（PC 新前端用 `/auth/pc/*`）、`/dict/doctors`（用 `/doctors`）、`/app/templates/*`（用 `/reply-templates/*`）、`POST /conversations/{id}/evaluation`（患者端 v2 旧路径）。

## 12. 前端统一封装（TypeScript 示例）

完整可复制版本见 `examples/pc-api-client.ts`。关键点：

```ts
// npm i json-bigint
const client = {
  async request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const r = JSONbig({ storeAsString: true }).parse(await res.text())
    if (r.code === 0) return r.data as T
    if (r.code === 401 && !retried) {
      const rf = await refresh()
      if (rf) return client.request<T>(method, path, body, true)
    }
    if (r.code === 402) { clearAuth(); location.href = '/login'; throw new ApiError(r.code, r.message) }
    if (r.code === 400 || r.code === 403) { toast(r.message); throw new ApiError(r.code, r.message) }
    toast('服务异常，请稍后重试'); throw new ApiError(r.code, r.message)
  },
}
```

- 菜单/按钮守卫：`hasPerm('patient:create')` 读取登录时保存的 `permissions[]`；不要发请求探测权限。
- 切换角色后必须**清空页面缓存/重新拉菜单**，因为权限和数据范围都变了。
- 登录票据 `loginTicket` 只存内存（或 sessionStorage），不要长期持久化；token 存 localStorage/sessionStorage 由项目安全策略决定。

## 13. 联调自检清单

- [ ] 登录走 `/auth/pc/login` → `/auth/pc/select-role`，没有使用 `/auth/login` 作为 PC 入口
- [ ] 单角色账号自动进入，多角色账号展示角色选择
- [ ] 菜单/按钮按 `permissions[]` 渲染，没有硬编码 `role === 'ADMIN'`
- [ ] 刷新页面用 `GET /auth/me` 恢复，不重新登录
- [ ] 401 静默 refresh 只重试一次；402 清凭证跳登录
- [ ] 雪花 ID 以字符串处理（json-bigint）
- [ ] 患者列表/详情按 `dataScope` 决定筛选器显隐；不传越权 ID
- [ ] 医生录入手机号必填且唯一；驻点只录授权范围
- [ ] 管理员协助预约校验“明天起 10 天”和时段互斥；取消才返还
- [ ] 会话工作台 `workStatus/unreadCount` 用服务端派生值，不在前端重算
- [ ] 转人工只读 `/manual-service-requests`，不自行实现自动转人工
- [ ] 知识库/OCR/AI 总结等占位接口在 UI 上明确标注“占位/未实现”
- [ ] 接口变更后运行 `python3 tools/gen_swagger.py --check` 与 `check_swagger_paths.py`

## 14. 契约更新流程

- `swagger.json` / `API_INDEX.md` 都是**生成物**：接口变更后由后端执行
  `cd server && python3 tools/gen_swagger.py`，会同时更新
  `server/swagger.json`、`frontend-api-kit/*`、`pc-frontend-api-kit/*`。
- 校验：`python3 tools/gen_swagger.py --check`（含 PC 索引）与
  `python3 tools/check_swagger_paths.py`（Controller ↔ swagger 路由一致性）。
- **不要手改** `swagger.json` / `API_INDEX.md`；新增接口先在后端实现并重新生成。
- 前端 AI 代理工作顺序：`AGENTS.md`（本文件）→ `API_INDEX.md`（找接口）→ `swagger.json`（看字段）→ `docs/03-接口设计.md`（看语义与实现状态）。
