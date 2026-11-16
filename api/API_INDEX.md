# PC 管理端接口索引（自动生成）

> 本文件由 `server/tools/gen_pc_api_guide.py` 从 swagger 契约自动生成，**请勿手改**。
> 当前：224 个 PC 相关路径 / 287 个操作（契约共 302 个路径 / 371 个操作；已排除小程序患者/医生/C 端客服专属接口）。
> Base URL：`/api/v1`；完整契约（含移动端接口）见同目录 `swagger.json`。
> 重新生成：`cd server && python3 tools/gen_swagger.py`；校验：`python3 tools/gen_swagger.py --check`。
> 登录/权限/页面接入顺序见 `AGENTS.md`；两步式登录细节见 `05-PC登录与鉴权联调.md`。

## 目录

- [01 认证与账号](#01-认证与账号)（21）
- [02 角色与权限](#02-角色与权限)（13）
- [03 人员管理](#03-人员管理)（13）
- [04 医生库](#04-医生库)（11）
- [05 机构与字典](#05-机构与字典)（30）
- [06 患者管理](#06-患者管理)（21）
- [07 健康档案](#07-健康档案)（41）
- [08 会话工作台](#08-会话工作台)（22）
- [09 专业咨询](#09-专业咨询)（11）
- [10 随访与风险](#10-随访与风险)（11）
- [11 通知与待办](#11-通知与待办)（5）
- [12 陪诊管理](#12-陪诊管理)（6）
- [13 驻点只读聊天](#13-驻点只读聊天)（4）
- [14 知识库](#14-知识库)（24）
- [15 内容运营](#15-内容运营)（33）
- [16 数据看板](#16-数据看板)（18）
- [17 文件](#17-文件)（3）

## 01 认证与账号

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/accounts/login-logs` | 登录日志（公司管理） | JWT |  |
| GET | `/accounts/operation-logs` | 操作日志（公司管理） | JWT |  |
| PUT | `/accounts/security` | 安全选项（骨架占位） | JWT | 占位 |
| GET | `/auth/dev-tokens` | dev 免登静态 token（仅 dev profile 生效，生产 404） | 公开 |  |
| POST | `/auth/login` | 员工账号密码登录（PC后台/手机端客服陪诊师医生医院管理） | 公开 | legacy：PC 新前端用 /auth/pc/login |
| POST | `/auth/logout` | 登出（注销 refresh token；需携带 access token） | JWT |  |
| GET | `/auth/me` | 当前登录用户（角色/数据范围） | JWT |  |
| PUT | `/auth/password` | 修改自己的密码（员工/患者共用） | JWT |  |
| POST | `/auth/pc/login` | PC 账密登录：返回 loginTicket + 角色列表 | 公开 |  |
| POST | `/auth/pc/select-role` | PC 选择角色换 token | 公开 |  |
| POST | `/auth/pc/switch-role` | PC 已登录切换角色 | JWT |  |
| POST | `/auth/refresh` | 刷新令牌 | 公开 |  |
| PUT | `/me/account/profile` | 员工个人资料编辑 | JWT |  |
| GET | `/me/login-logs` | 个人登录日志 | JWT |  |
| GET | `/me/operation-logs` | 个人操作日志 | JWT |  |
| GET | `/me/profile` | 我的个人基本信息 | JWT |  |
| PUT | `/me/profile` | 编辑我的信息（白名单字段+手机号验证码） | JWT |  |
| GET | `/me/security` | 个人安全设置 | JWT |  |
| PUT | `/me/security` | 保存个人安全设置 | JWT |  |
| GET | `/me/settings` | 系统设定（骨架占位） | JWT | 占位 |
| PUT | `/me/settings` | 更新系统设定（骨架占位） | JWT | 占位 |

## 02 角色与权限

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/permissions/tree` | 权限树（分组→权限项） | JWT |  |
| GET | `/roles` | 角色分页列表 | JWT |  |
| POST | `/roles` | 新增角色 | JWT |  |
| GET | `/roles/{id}` | 角色详情 | JWT |  |
| PUT | `/roles/{id}` | 编辑角色 | JWT |  |
| DELETE | `/roles/{id}` | 删除角色（系统内置/有关联账号拒绝） | JWT |  |
| GET | `/roles/{id}/accounts` | 角色关联账号 | JWT |  |
| POST | `/roles/{id}/copy` | 复制角色 | JWT |  |
| GET | `/roles/{id}/data-scope` | 角色数据范围 | JWT |  |
| PUT | `/roles/{id}/data-scope` | 保存角色数据范围 | JWT |  |
| GET | `/roles/{id}/permissions` | 角色已授权限码 | JWT |  |
| PUT | `/roles/{id}/permissions` | 全量保存角色权限 | JWT |  |
| PUT | `/roles/{id}/status` | 启用/停用角色 | JWT |  |

## 03 人员管理

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/assessment/hospital-dashboard` | 医院效能看板（骨架 TODO） | JWT |  |
| GET | `/staff` | 员工分页列表（多角色/人员类型） | JWT |  |
| POST | `/staff` | 新增员工（多角色） | JWT |  |
| GET | `/staff/performance` | 客服绩效（骨架：答复率/响应时间/满意度占位） | JWT | 占位 |
| GET | `/staff/schedules` | 客服排班查询 | JWT |  |
| POST | `/staff/schedules` | 新增排班 | JWT |  |
| DELETE | `/staff/schedules/{id}` | 删除排班 | JWT |  |
| GET | `/staff/{id}` | 员工详情 | JWT |  |
| PUT | `/staff/{id}` | 修改员工（密码需单独重置） | JWT |  |
| PUT | `/staff/{id}/password` | 重置密码 | JWT |  |
| PUT | `/staff/{id}/roles` | 全量替换员工角色 | JWT |  |
| PUT | `/staff/{id}/status` | 启停账号 | JWT |  |
| GET | `/staff/{id}/workload` | 员工负载 | JWT |  |

## 04 医生库

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/doctors` | 医生分页列表 | JWT |  |
| POST | `/doctors` | 录入医生（ADMIN/驻点） | JWT |  |
| GET | `/doctors/options` | 在职医生下拉 | JWT |  |
| GET | `/doctors/{id}` | 医生详情 | JWT |  |
| PUT | `/doctors/{id}` | 编辑医生 | JWT |  |
| GET | `/doctors/{id}/change-logs` | 医生变更历史 | JWT |  |
| PUT | `/doctors/{id}/manager` | 设置上级医生 | JWT |  |
| GET | `/doctors/{id}/patients` | 医生负责患者 | JWT |  |
| PUT | `/doctors/{id}/patients` | 绑定/解绑医患 | JWT |  |
| PUT | `/doctors/{id}/status` | 变更医生状态 | JWT |  |
| GET | `/doctors/{id}/team` | 医生团队 | JWT |  |

## 05 机构与字典

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/dict/areas` | 院区列表 | JWT |  |
| POST | `/dict/areas` | 新增院区（公司管理） | JWT |  |
| GET | `/dict/areas/page` | 院区分页 | JWT |  |
| GET | `/dict/areas/{id}` | 院区详情 | JWT |  |
| PUT | `/dict/areas/{id}` | 修改院区（公司管理） | JWT |  |
| DELETE | `/dict/areas/{id}` | 删除院区（公司管理） | JWT |  |
| GET | `/dict/departments` | 科室列表 | JWT |  |
| POST | `/dict/departments` | 新增科室（公司管理） | JWT |  |
| GET | `/dict/departments/page` | 科室分页 | JWT |  |
| GET | `/dict/departments/{id}` | 科室详情 | JWT |  |
| PUT | `/dict/departments/{id}` | 修改科室（公司管理） | JWT |  |
| DELETE | `/dict/departments/{id}` | 删除科室（公司管理） | JWT |  |
| GET | `/dict/doctors` | 医生库列表（字典，无账号） | JWT | legacy：PC 新前端用 /doctors |
| POST | `/dict/doctors` | 新增医生（公司管理） | JWT | legacy：PC 新前端用 /doctors |
| PUT | `/dict/doctors/{id}` | 修改医生（公司管理） | JWT | legacy：PC 新前端用 /doctors |
| DELETE | `/dict/doctors/{id}` | 删除医生（公司管理） | JWT | legacy：PC 新前端用 /doctors |
| GET | `/dict/hospitals` | 医院字典分页列表 | JWT |  |
| POST | `/dict/hospitals` | 新增医院（公司管理） | JWT |  |
| GET | `/dict/hospitals/{id}` | 医院详情 | JWT |  |
| PUT | `/dict/hospitals/{id}` | 修改医院（公司管理） | JWT |  |
| DELETE | `/dict/hospitals/{id}` | 删除医院（公司管理） | JWT |  |
| GET | `/dict/options` | 级联下拉包（医院/院区/科室/医生/标签一次性拉取） | JWT |  |
| GET | `/dict/overview` | 机构概览 | JWT |  |
| GET | `/dict/tags` | 患者标签列表（动态枚举） | JWT |  |
| POST | `/dict/tags` | 新增标签（公司管理） | JWT |  |
| PUT | `/dict/tags/{id}` | 修改标签（公司管理） | JWT |  |
| DELETE | `/dict/tags/{id}` | 删除标签（公司管理） | JWT |  |
| GET | `/hospital/patients` | 患者列表（医院权限=全部科室可筛选；科室权限=仅本科室） | JWT |  |
| GET | `/hospital/patients/{id}/health-detail` | 患者健康详情（饮食/运动/体重/血糖血压7天；检查指标30天；其他附件） | JWT |  |
| GET | `/hospital/summary` | 患者 tab 统计 | JWT |  |

## 06 患者管理

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/patients` | 患者列表（时间倒序+姓名/手机号搜索；按数据范围过滤） | JWT |  |
| POST | `/patients` | 新增患者（公司管理） | JWT |  |
| GET | `/patients/export` | 导出患者 CSV | JWT |  |
| GET | `/patients/{id}` | 患者详情 | JWT |  |
| PUT | `/patients/{id}` | 修改患者（公司管理） | JWT |  |
| DELETE | `/patients/{id}` | 删除患者（公司管理） | JWT |  |
| GET | `/patients/{id}/attachments` | 患者附件列表 | JWT |  |
| POST | `/patients/{id}/attachments` | 登记患者附件 | JWT |  |
| DELETE | `/patients/{id}/attachments/{attachmentId}` | 删除患者附件 | JWT |  |
| GET | `/patients/{id}/communications` | 患者沟通时间线 | JWT |  |
| PUT | `/patients/{id}/escort-quota` | 陪诊次数配置 0-999（PC配置） | JWT |  |
| GET | `/patients/{id}/escort-quota/records` | 陪诊次数变更记录 | JWT |  |
| GET | `/patients/{id}/health-summary` | 患者健康摘要（饮食/运动/体重/血压/睡眠/检验） | JWT |  |
| PUT | `/patients/{id}/match` | 匹配客服/陪诊师（PC端配置） | JWT |  |
| GET | `/patients/{id}/medical-record` | 患者病历（附件1样表结构） | JWT |  |
| PUT | `/patients/{id}/medical-record` | 维护病历（公司管理/医院管理） | JWT |  |
| POST | `/patients/{id}/medical-record/ocr` | 员工侧病历 OCR 任务 | JWT |  |
| GET | `/patients/{id}/medical-record/ocr/{taskId}` | 员工侧病历 OCR 结果 | JWT |  |
| GET | `/patients/{id}/profile` | 患者档案聚合 | JWT |  |
| GET | `/patients/{id}/service-relations` | 患者服务关系+变更 | JWT |  |
| PUT | `/patients/{id}/tags` | 患者标签（动态枚举，前端维护） | JWT |  |

## 07 健康档案

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/exercise/library` | 运动动作库 | JWT |  |
| GET | `/exercise/self-eval/library` | 运动自评项目库 | JWT |  |
| PUT | `/health-records/{id}/advice` | 健康记录写建议（客服/后台） | JWT |  |
| PUT | `/patients/{id}/exercise/items/{itemId}/unlock` | 人工解锁动作项（客服/医生/公司管理） | JWT |  |
| GET | `/patients/{id}/exercise/plan` | 运动方案（管理端） | JWT |  |
| PUT | `/patients/{id}/exercise/plan` | 保存运动方案 | JWT |  |
| POST | `/patients/{id}/exercise/plan/items/archive` | 批量归档动作项 | JWT |  |
| POST | `/patients/{id}/exercise/plan/items/{itemId}/archive` | 归档动作项 | JWT |  |
| PUT | `/patients/{id}/exercise/plan/order` | 保存运动方案排序 | JWT |  |
| GET | `/patients/{id}/exercise/self-eval-config` | 患者自评配置 | JWT |  |
| PUT | `/patients/{id}/exercise/self-eval-config` | 保存患者自评配置 | JWT |  |
| GET | `/patients/{id}/exercise/weekly-completion` | 运动周完成率 | JWT |  |
| GET | `/patients/{id}/health-dashboard` | 患者看板（骨架：最近20条+趋势占位） | JWT | 占位 |
| GET | `/patients/{id}/health-records` | 患者健康记录（后台） | JWT |  |
| POST | `/patients/{id}/health-records` | 后台代录健康数据（公司管理/客服） | JWT |  |
| GET | `/patients/{id}/scales` | 患者 PSQI 结果（后台查看） | JWT |  |
| GET | `/patients/{patientId}/exam/ai-summary` | 检查 AI 总结 | JWT |  |
| PUT | `/patients/{patientId}/exam/ai-summary` | 保存人工编辑的 AI 总结 | JWT |  |
| POST | `/patients/{patientId}/exam/ai-summary/generate` | 生成检查 AI 总结（占位） | JWT | 占位 |
| GET | `/patients/{patientId}/exam/categories` | 检查分类 | JWT |  |
| POST | `/patients/{patientId}/exam/categories` | 新增检查分类 | JWT |  |
| PUT | `/patients/{patientId}/exam/categories/{id}` | 编辑检查分类 | JWT |  |
| DELETE | `/patients/{patientId}/exam/categories/{id}` | 删除/停用检查分类 | JWT |  |
| GET | `/patients/{patientId}/exam/indicators` | 检查指标分页 | JWT |  |
| POST | `/patients/{patientId}/exam/indicators` | 新增检查指标 | JWT |  |
| PUT | `/patients/{patientId}/exam/indicators/{id}` | 编辑检查指标 | JWT |  |
| DELETE | `/patients/{patientId}/exam/indicators/{id}` | 删除检查指标 | JWT |  |
| GET | `/patients/{patientId}/exam/reports` | 检查报告分页 | JWT |  |
| POST | `/patients/{patientId}/exam/reports` | 登记检查报告 | JWT |  |
| DELETE | `/patients/{patientId}/exam/reports/{id}` | 删除检查报告 | JWT |  |
| POST | `/patients/{patientId}/exam/reports/{id}/ocr` | 检查报告 OCR（占位） | JWT | 占位 |
| GET | `/patients/{patientId}/medication/records` | 按日用药计划+状态 | JWT |  |
| PUT | `/patients/{patientId}/medication/records/{logId}` | 客服代录服药状态 | JWT |  |
| GET | `/patients/{patientId}/medication/reminders` | 用药提醒列表 | JWT |  |
| POST | `/patients/{patientId}/medication/reminders` | 新增用药提醒 | JWT |  |
| PUT | `/patients/{patientId}/medication/reminders/{id}` | 编辑用药提醒 | JWT |  |
| DELETE | `/patients/{patientId}/medication/reminders/{id}` | 删除用药提醒 | JWT |  |
| PUT | `/patients/{patientId}/medication/reminders/{id}/push` | 推送开关 | JWT |  |
| GET | `/patients/{patientId}/sleep/assessments` | PSQI 评估历史 | JWT |  |
| PUT | `/patients/{patientId}/sleep/assessments/{assessmentId}/advice` | 保存睡眠 AI 建议 | JWT |  |
| GET | `/patients/{patientId}/sleep/device` | 睡眠设备绑定 | JWT |  |

## 08 会话工作台

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/conversations` | 会话列表（客服工作台） | JWT |  |
| GET | `/conversations/stats` | 客服统计卡（总会话/ACTIVE 会话/紧急/答复率占位） | JWT | 占位 |
| GET | `/conversations/{id}` | 会话详情（患者信息+成员） | JWT |  |
| POST | `/conversations/{id}/audit` | 显式访问审计（陪诊师/客服/公司管理） | JWT |  |
| GET | `/conversations/{id}/messages` | 历史消息（beforeId 游标，size 默认 30） | JWT |  |
| POST | `/conversations/{id}/messages` | 发送消息（患者/客服/陪诊师；文本/图片/健康卡片） | JWT |  |
| PUT | `/conversations/{id}/messages/{messageId}` | 编辑消息（仅作者本人；AI/SYSTEM 锁定） | JWT |  |
| PUT | `/conversations/{id}/priority` | 紧急标记（客服；注意是 PUT） | JWT |  |
| POST | `/conversations/{id}/read` | 标记已读 | JWT |  |
| PUT | `/conversations/{id}/status` | 解决/重新打开会话（客服） | JWT |  |
| GET | `/conversations/{id}/workspace` | 会话工作区（会话+患者+AI 总结+健康摘要） | JWT |  |
| GET | `/manual-service-requests` | 待响应人工服务请求列表（PC客服） | JWT |  |
| PUT | `/manual-service-requests/{id}` | 受理人工服务请求（PC客服） | JWT |  |
| GET | `/reply-templates` | 启用快捷回复（按端/角色/疾病） | JWT |  |
| POST | `/reply-templates` | 新增快捷回复 | JWT |  |
| GET | `/reply-templates/all` | 快捷回复后台分页 | JWT |  |
| PUT | `/reply-templates/batch-status` | 批量启停 | JWT |  |
| PUT | `/reply-templates/{id}` | 编辑快捷回复 | JWT |  |
| DELETE | `/reply-templates/{id}` | 删除快捷回复 | JWT |  |
| PUT | `/reply-templates/{id}/status` | 启用/停用/待完善 | JWT |  |
| GET | `/reply-templates/{id}/usage-logs` | 模板使用日志 | JWT |  |
| POST | `/reply-templates/{id}/use` | 记录模板使用 | JWT |  |

## 09 专业咨询

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/consultations` | 专业咨询列表 | JWT |  |
| POST | `/consultations` | 发起专业咨询 | JWT |  |
| GET | `/consultations/patients/{patientId}` | 某患者咨询记录 | JWT |  |
| GET | `/consultations/stats` | 咨询统计 | JWT |  |
| GET | `/consultations/{id}` | 咨询详情 | JWT |  |
| PUT | `/consultations/{id}/close` | 关闭咨询 | JWT |  |
| POST | `/consultations/{id}/follow-ups` | 再次留言（父留言） | JWT |  |
| PUT | `/consultations/{id}/internal-note` | 保存内部备注 | JWT |  |
| POST | `/consultations/{id}/replies/{replyId}/forward-to-user` | 医生回复转发给用户 | JWT |  |
| PUT | `/consultations/{id}/replies/{replyId}/read` | 医生回复标记已读 | JWT |  |
| PUT | `/consultations/{id}/resolve` | 标记已解决 | JWT |  |

## 10 随访与风险

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/follow-up/summary` | 随访统计（待沟通/待跟进/今日随访） | JWT |  |
| GET | `/follow-up/tasks` | 随访任务列表（PC工作流+手机端同源） | JWT |  |
| POST | `/follow-up/tasks` | 创建随访任务 | JWT |  |
| PUT | `/follow-up/tasks/{id}` | 更新任务（分配/改期/状态流转） | JWT |  |
| GET | `/follow-up/tasks/{id}/calls` | 历史通话记录 | JWT |  |
| POST | `/follow-up/tasks/{id}/calls` | 提交电话随访记录（PC 4步表单） | JWT |  |
| GET | `/follow-up/tasks/{id}/phone-status` | 电话按钮状态（未拨打=绿/已拨打=蓝） | JWT |  |
| GET | `/risk-alerts` | 风险提示列表（PC客服核心模块） | JWT |  |
| POST | `/risk-alerts` | 手动上报风险（兜底） | JWT |  |
| GET | `/risk-alerts/summary` | 风险统计（未处理/高中低） | JWT |  |
| PUT | `/risk-alerts/{id}` | 处理/关闭风险提示 | JWT |  |

## 11 通知与待办

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/notifications` | 通知列表（系统信息/资料更新/人工服务提醒/风险） | JWT |  |
| PUT | `/notifications/read` | 全部标记已读 | JWT |  |
| GET | `/notifications/todo` | 按角色聚合待办 | JWT |  |
| GET | `/notifications/unread-count` | 未读数 | JWT |  |
| PUT | `/notifications/{id}/read` | 单条已读 | JWT |  |

## 12 陪诊管理

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/escort/bookings` | 预约管理（公司管理全量列表） | JWT |  |
| POST | `/escort/bookings` | 管理员协助预约 | JWT |  |
| PUT | `/escort/bookings/{id}` | 管理员改期/备注 | JWT |  |
| PUT | `/escort/bookings/{id}/assign` | 管理员改派陪诊师 | JWT |  |
| POST | `/escort/bookings/{id}/cancel` | 管理员取消预约（返还 1 次） | JWT |  |
| PUT | `/escort/config` | 陪诊全局配置（未实现：Controller 固定返回 400） | JWT | 固定 400（未实现） |

## 13 驻点只读聊天

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/caregiver/conversations` | 驻点只读会话列表 | JWT |  |
| GET | `/caregiver/conversations/stats` | 驻点会话统计 | JWT |  |
| GET | `/caregiver/conversations/{id}/messages` | 驻点只读消息 | JWT |  |
| GET | `/caregiver/scope` | 驻点数据范围 | JWT |  |

## 14 知识库

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/kb/documents` | 知识库文档分页 | JWT |  |
| POST | `/kb/documents` | 上传知识库文档（解析占位） | JWT | 占位 |
| DELETE | `/kb/documents/{id}` | 删除知识库文档 | JWT |  |
| GET | `/kb/documents/{id}/chunks` | 文档分块 | JWT |  |
| POST | `/kb/documents/{id}/reparse` | 重新解析文档（占位） | JWT | 占位 |
| GET | `/kb/entries` | 知识库问答列表（客服共享） | JWT |  |
| POST | `/kb/entries` | 新增知识条目（人工客服） | JWT |  |
| DELETE | `/kb/entries/batch` | 批量删除问答 | JWT |  |
| PUT | `/kb/entries/batch-status` | 批量发布/转草稿 | JWT |  |
| POST | `/kb/entries/import` | 批量导入问答 | JWT |  |
| PUT | `/kb/entries/{id}` | 修改知识条目（人工客服） | JWT |  |
| DELETE | `/kb/entries/{id}` | 删除知识条目（人工客服） | JWT |  |
| PUT | `/kb/entries/{id}/status` | 启用/停用（人工客服） | JWT |  |
| GET | `/kb/overview` | 知识库概览 | JWT |  |
| POST | `/kb/rollback` | 回滚版本（占位） | JWT | 占位 |
| POST | `/kb/search-test` | 知识库检索测试 | JWT |  |
| POST | `/kb/train` | 训练（占位） | JWT | 占位 |
| GET | `/kb/train/{jobId}` | 训练任务 | JWT |  |
| GET | `/kb/unresolved` | 未解决问题分页 | JWT |  |
| POST | `/kb/unresolved/{id}/convert` | 未解决转标准问答 | JWT |  |
| POST | `/kb/unresolved/{id}/ignore` | 忽略未解决 | JWT |  |
| POST | `/kb/unresolved/{id}/merge` | 未解决合并到问答 | JWT |  |
| GET | `/kb/versions` | 知识库版本列表 | JWT |  |
| POST | `/kb/versions/{id}/publish` | 发布版本（占位） | JWT | 占位 |

## 15 内容运营

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/app/articles` | 资讯/健康文章/心理健康内容（C端公开，按科室+术式） | 公开 |  |
| POST | `/app/articles` | 新增文章（公司管理） | JWT |  |
| GET | `/app/articles/all` | 全部文章（公司管理） | JWT |  |
| PUT | `/app/articles/{id}` | 修改文章（公司管理） | JWT |  |
| DELETE | `/app/articles/{id}` | 删除文章（公司管理） | JWT |  |
| GET | `/app/banners` | Banner（健康知识库精选等，C端公开） | 公开 |  |
| POST | `/app/banners` | 新增 Banner（公司管理） | JWT |  |
| GET | `/app/banners/all` | 全部 Banner（公司管理） | JWT |  |
| PUT | `/app/banners/sort` | Banner 排序 | JWT |  |
| PUT | `/app/banners/{id}` | 修改 Banner（公司管理） | JWT |  |
| DELETE | `/app/banners/{id}` | 删除 Banner（公司管理） | JWT |  |
| PUT | `/app/banners/{id}/status` | 启停 Banner | JWT |  |
| GET | `/app/informed-consents` | 告知书列表（C端公开，生效中） | 公开 |  |
| POST | `/app/informed-consents` | 新增告知书（公司管理） | JWT |  |
| PUT | `/app/informed-consents/{id}` | 修改告知书（公司管理） | JWT |  |
| DELETE | `/app/informed-consents/{id}` | 删除告知书（公司管理） | JWT |  |
| PUT | `/app/informed-consents/{id}/status` | 启用/归档告知书（公司管理） | JWT |  |
| GET | `/app/login-agreements` | 当前登录协议（公开） | 公开 |  |
| GET | `/app/login-agreements/all` | 登录协议后台列表 | JWT |  |
| PUT | `/app/login-agreements/{id}` | 编辑登录协议并自动升版 | JWT |  |
| GET | `/app/login-agreements/{id}/versions` | 登录协议版本历史 | JWT |  |
| GET | `/app/notices` | 公告分页 | JWT |  |
| POST | `/app/notices` | 新增公告 | JWT |  |
| PUT | `/app/notices/sort` | 公告排序 | JWT |  |
| PUT | `/app/notices/{id}` | 编辑公告 | JWT |  |
| DELETE | `/app/notices/{id}` | 删除公告 | JWT |  |
| PUT | `/app/notices/{id}/status` | 启停公告 | JWT |  |
| GET | `/app/overview` | 小程序内容概览 | JWT |  |
| POST | `/app/templates` | 新增模板（公司管理） | JWT | legacy：PC 新前端用 /reply-templates |
| GET | `/app/templates/all` | 全部回复模板（公司管理） | JWT | legacy：PC 新前端用 /reply-templates |
| PUT | `/app/templates/{id}` | 修改模板（公司管理） | JWT | legacy：PC 新前端用 /reply-templates |
| DELETE | `/app/templates/{id}` | 删除模板（公司管理） | JWT | legacy：PC 新前端用 /reply-templates |
| PUT | `/app/templates/{id}/status` | 启用/停用模板（公司管理） | JWT | legacy：PC 新前端用 /reply-templates |

## 16 数据看板

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| GET | `/dashboard/anomalies` | 异常预警 | JWT |  |
| GET | `/dashboard/filters` | 看板筛选器 | JWT |  |
| GET | `/dashboard/focus-node` | 当前聚焦对象 | JWT |  |
| GET | `/dashboard/knowledge-graph` | 健康服务知识图谱 | JWT |  |
| GET | `/dashboard/live-events` | 实时事件 | JWT |  |
| GET | `/dashboard/overview` | 全局看板概览 | JWT |  |
| GET | `/dashboard/service-activity` | 服务项目活跃度 | JWT |  |
| GET | `/dashboard/service-trend` | 服务规模趋势 | JWT |  |
| GET | `/department/dashboard/daily-consultations` | 科室近 N 日咨询 | JWT |  |
| GET | `/department/dashboard/efficiency` | 科室效能 | JWT |  |
| GET | `/department/dashboard/hourly-distribution` | 科室时段分布 | JWT |  |
| GET | `/department/dashboard/summary` | 科室看板概览 | JWT |  |
| GET | `/department/dashboard/trends` | 科室看板趋势 | JWT |  |
| GET | `/hospital/dashboard/daily-activity` | 医院近 N 日活跃 | JWT |  |
| GET | `/hospital/dashboard/departments` | 医院科室分布 | JWT |  |
| GET | `/hospital/dashboard/efficiency` | 医院效能 | JWT |  |
| GET | `/hospital/dashboard/summary` | 医院看板概览 | JWT |  |
| GET | `/hospital/dashboard/trends` | 医院看板趋势 | JWT |  |

## 17 文件

| 方法 | 路径 | 说明 | 鉴权 | 备注 |
|---|---|---|---|---|
| POST | `/files/upload` | 上传文件（图片/文档，≤20MB）→本地存储（需登录；COS 实现 TODO） | JWT |  |
| POST | `/files/uploads` | 批量上传（其他指标5附件等；需登录） | JWT |  |
| GET | `/files/{dir}/{filename}` | 本地存储读取（开发用；匿名可访问） | 公开 |  |
