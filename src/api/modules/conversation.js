/**
 * 沟通会话模块接口（api/swagger.json 中 tag = conversation 的全部接口，共 28 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如会话/消息/模板/请求 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/messageId、query 的 beforeId、请求体内各 id 字段与 id 数组）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增/发送/动作用对应动词 + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id}/{messageId} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 等 ById 后缀
 * - /me 开头为患者本人端路径别名（函数名带 My），其余为 PC 客服/管理端
 */

import { http } from '../frontApikit.js'

/** 把已知雪花 ID 字段安全转为字符串（仅处理存在且非空的字段，不改变其他字段） */
function stringifyIdFields(obj, idKeys) {
  if (!obj || typeof obj !== 'object') return obj
  for (const key of idKeys) {
    if (obj[key] !== undefined && obj[key] !== null) obj[key] = String(obj[key])
  }
  return obj
}

/** 把 id 数组中的每个元素转为字符串（模板 id 等雪花 ID 列表） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/* -------------------------------------------------------------------------- */
/*  会话列表、工作区与统计                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询会话列表（JWT 接口，客服工作台，按数据范围过滤）
 * 路径：GET /conversations
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.status] 会话状态，枚举：ACTIVE 进行中 / CLOSED 已关闭
 * @param {string} [params.priority] 优先级，枚举：NORMAL 普通 / URGENT 紧急
 * @param {string} [params.keyword] 患者姓名/手机号关键字
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<Conversation>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/serviceAgentId（雪花 ID 字符串）、status（ACTIVE/CLOSED）、priority（NORMAL/URGENT）、
 *   aiEnabled、membersJson 成员 JSON、acceptedAt/closedAt、lastMessage、lastSenderType、lastMsgAt、createTime、updateTime
 */
export function getConversationPage(params = {}) {
  return http.get('/conversations', params)
}

/**
 * 获取会话工作区聚合数据（JWT 接口，详情页一次取齐会话/患者/医生团队/AI 总结/健康摘要）
 * 路径：GET /conversations/{id}/workspace
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} { conversation Conversation, patient Patient,
 *   doctorTeam DictDoctor[] 医生团队, aiSummary AI 总结对象, healthSummary 健康摘要对象 }，内嵌各 id 均为雪花 ID 字符串
 */
export function getConversationWorkspaceById(id) {
  return http.get(`/conversations/${encodeURIComponent(String(id))}/workspace`)
}

/**
 * 获取会话详情（JWT 接口，含患者信息与成员）
 * 路径：GET /conversations/{id}
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} Conversation：字段同 getConversationPage 的 list 元素
 */
export function getConversationById(id) {
  return http.get(`/conversations/${encodeURIComponent(String(id))}`)
}

/**
 * 获取客服统计卡（JWT 接口）
 * 路径：GET /conversations/stats
 * 无请求参数
 * @returns {Promise<Object>} ConversationStats：{ total 总会话数, pendingReply 待回复数,
 *   urgent 紧急会话数, replyRate 答复率 0-100（占位）, avgResponseSeconds 平均响应秒数 }
 */
export function getConversationStats() {
  return http.get('/conversations/stats')
}

/**
 * 获取我的会话（JWT 接口，患者端两段式：会话入口 + 站内通知合并展示）
 * 路径：GET /me/conversations
 * 无请求参数
 * @returns {Promise<Object>} MeConversationsResponse：{ conversations ConversationItem[] 会话入口
 *   （id/name/type human|system/lastMsg/time/unread 未读数）,
 *   systemNotifications SystemNotificationItem[] 站内通知（id/title/content/time/isRead） }，id 均为雪花 ID 字符串
 */
export function getMyConversations() {
  return http.get('/me/conversations')
}

/* -------------------------------------------------------------------------- */
/*  快捷回复模板                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 查询启用中的快捷回复（JWT 接口，供客服/陪诊师在会话中按端/角色/疾病选用）
 * 路径：GET /reply-templates
 * @param {Object} [params] 过滤参数
 * @param {string} [params.terminal] 终端，如 PC / MOBILE / ALL
 * @param {string} [params.role] 角色编码
 * @param {string} [params.disease] 疾病/术式
 * @returns {Promise<Array<Object>>} ReplyTemplate 数组，元素含 id（雪花 ID 字符串）、name、content、
 *   type（通用/按手术类型）、surgeryType、terminalsJson/rolesJson/diseasesJson/questionsJson/variablesJson、
 *   common、note、creatorId（字符串）、lastUsedAt、usageCount、status
 */
export function getEnabledReplyTemplates(params = {}) {
  return http.get('/reply-templates', params)
}

/**
 * 新增快捷回复模板（JWT 接口）
 * 路径：POST /reply-templates
 * @param {Object} data 模板内容（ReplyTemplate）
 * @param {string} data.name 模板名称（必填）
 * @param {string} data.content 模板正文（必填）
 * @param {string} [data.type] 类型，枚举：通用 / 按手术类型
 * @param {string} [data.surgeryType] 手术类型（type=按手术类型 时使用）
 * @param {string} [data.terminalsJson] 适用终端 JSON 字符串
 * @param {string} [data.rolesJson] 适用角色 JSON 字符串
 * @param {string} [data.diseasesJson] 适用疾病 JSON 字符串
 * @param {string} [data.questionsJson] 触发问题 JSON 字符串
 * @param {string} [data.variablesJson] 正文变量 JSON 字符串
 * @param {number} [data.common] 是否常用
 * @param {string} [data.note] 备注
 * @param {number} [data.status] 状态：1 启用 / 0 停用 / 2 待完善
 * @returns {Promise<string>} 新建模板 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createReplyTemplate(data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'creatorId'])
  return http.post('/reply-templates', payload)
}

/**
 * 快捷回复后台分页查询（JWT 接口，含停用/待完善等全部状态）
 * 路径：GET /reply-templates/all
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.type] 类型，枚举：通用 / 按手术类型
 * @param {string} [params.surgeryType] 手术类型
 * @param {string} [params.terminal] 终端
 * @param {string} [params.role] 角色编码
 * @param {string} [params.disease] 疾病/术式
 * @param {number} [params.status] 状态：1 启用 / 0 停用 / 2 待完善
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ReplyTemplate>：{ list, total, page, pageSize }
 */
export function getReplyTemplatePage(params = {}) {
  return http.get('/reply-templates/all', params)
}

/**
 * 编辑快捷回复模板（JWT 接口）
 * 路径：PUT /reply-templates/{id}
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 模板内容（ReplyTemplate，字段同 createReplyTemplate，name/content 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateReplyTemplateById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'creatorId'])
  return http.put(`/reply-templates/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除快捷回复模板（JWT 接口）
 * 路径：DELETE /reply-templates/{id}
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteReplyTemplateById(id) {
  return http.delete(`/reply-templates/${encodeURIComponent(String(id))}`)
}

/**
 * 启用/停用/待完善快捷回复（JWT 接口，请求体为裸整数）
 * 路径：PUT /reply-templates/{id}/status
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态：1 启用 / 0 停用 / 2 待完善
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateReplyTemplateStatusById(id, status) {
  return http.put(`/reply-templates/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * 批量启用/停用快捷回复（JWT 接口）
 * 路径：PUT /reply-templates/batch-status
 * @param {Object} data 批量状态（ReplyTemplateBatchStatusRequest）
 * @param {Array<string>} data.ids 模板 ID 数组（雪花 ID 字符串）
 * @param {number} data.status 目标状态：1 启用 / 0 停用 / 2 待完善
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateReplyTemplateBatchStatus(data) {
  return http.put('/reply-templates/batch-status', {
    ids: stringifyIdArray(data.ids),
    status: data.status
  })
}

/**
 * 记录快捷回复模板使用（JWT 接口，用于使用统计）
 * 路径：POST /reply-templates/{id}/use
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 使用上下文（ReplyTemplateUseRequest）
 * @param {string} [data.patientId] 患者 ID，雪花 ID 字符串
 * @param {string} [data.conversationId] 会话 ID，雪花 ID 字符串
 * @param {string} [data.channel] 渠道，枚举：PC / MOBILE
 * @param {string} [data.role] 使用人角色
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function recordReplyTemplateUseById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'conversationId'])
  return http.post(`/reply-templates/${encodeURIComponent(String(id))}/use`, payload)
}

/**
 * 分页查询模板使用日志（JWT 接口）
 * 路径：GET /reply-templates/{id}/usage-logs
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ReplyTemplateUsageLog>：{ list, total, page, pageSize }；
 *   list 元素含 id/templateId/staffId/patientId（雪花 ID 字符串）、channel（PC/MOBILE）、role、usedAt
 */
export function getReplyTemplateUsageLogsById(id, params = {}) {
  return http.get(`/reply-templates/${encodeURIComponent(String(id))}/usage-logs`, params)
}

/* -------------------------------------------------------------------------- */
/*  会话操作：状态、优先级、消息、审计、已读、转人工、评价                        */
/* -------------------------------------------------------------------------- */

/**
 * 解决/重新打开会话（JWT 接口，客服；请求体为裸 JSON 字符串）
 * 路径：PUT /conversations/{id}/status
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} status 目标状态，枚举：ACTIVE 重新打开 / CLOSED 解决
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateConversationStatusById(id, status) {
  return http.put(`/conversations/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * 紧急标记会话（JWT 接口，客服；注意方法为 PUT，请求体为裸 JSON 字符串）
 * 路径：PUT /conversations/{id}/priority
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} priority 优先级，枚举：NORMAL 普通 / URGENT 紧急
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateConversationPriorityById(id, priority) {
  return http.put(`/conversations/${encodeURIComponent(String(id))}/priority`, priority)
}

/**
 * 分页拉取历史消息（JWT 接口，beforeId 游标方式，向前翻页）
 * 路径：GET /conversations/{id}/messages
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 游标参数
 * @param {string} [params.beforeId] 游标：取此消息 ID 之前的消息，雪花 ID 字符串；首次不传
 * @param {number} [params.size=30] 拉取条数，默认 30
 * @returns {Promise<Array<Object>>} Message 数组（按时间倒序返回后由前端正序展示），元素含 id/conversationId
 *   （雪花 ID 字符串）、senderType（PATIENT/CS/CAREGIVER/DOCTOR/AI/SYSTEM）、senderId（字符串）、senderName、
 *   type（TEXT/IMAGE/HEALTH_CARD/CALL_RECORD）、content、imageUrl、extraJson、clientSeq、readJson、
 *   isEdited、editorName、editedAt、originalText、createTime、updateTime
 */
export function getConversationMessagesById(id, params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['beforeId'])
  return http.get(`/conversations/${encodeURIComponent(String(id))}/messages`, query)
}

/**
 * 发送消息（JWT 接口，患者/客服/陪诊师均可，支持文本/图片/健康卡片/通话记录）
 * 路径：POST /conversations/{id}/messages
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 消息内容（SendMessageRequest）
 * @param {string} [data.type] 消息类型，枚举：TEXT / IMAGE / HEALTH_CARD / CALL_RECORD，默认 TEXT
 * @param {string} [data.content] 文本内容（TEXT 必填，≤2000）
 * @param {string} [data.imageUrl] 图片地址（IMAGE 必填）
 * @param {string} [data.healthType] 健康卡片类型，枚举：DIET/EXERCISE/WEIGHT/BP_BG/SLEEP（HEALTH_CARD 时使用，合入 extraJson）
 * @param {string} [data.extraJson] 扩展信息 JSON 字符串
 * @param {string} [data.clientSeq] 客户端幂等序号（≤64），网络重试带同一值不会重复落库
 * @returns {Promise<Object>} 创建成功的 Message（id 为雪花 ID 字符串）
 */
export function sendConversationMessageById(id, data) {
  return http.post(`/conversations/${encodeURIComponent(String(id))}/messages`, data)
}

/**
 * 编辑消息（JWT 接口，仅作者本人可编辑；AI/SYSTEM 消息锁定不可编辑，留痕 isEdited/editorName/originalText）
 * 路径：PUT /conversations/{id}/messages/{messageId}
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} messageId 消息 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 编辑内容（EditMessageRequest）
 * @param {string} data.newText 编辑后文本（必填，≤2000）
 * @returns {Promise<Object>} 更新后的 Message
 */
export function editConversationMessageById(id, messageId, data) {
  return http.put(
    `/conversations/${encodeURIComponent(String(id))}/messages/${encodeURIComponent(String(messageId))}`,
    data
  )
}

/**
 * 显式访问审计（JWT 接口，陪诊师/客服/公司管理进入会话时上报）
 * 路径：POST /conversations/{id}/audit
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [data] 审计内容（AuditRequest，可省略）
 * @param {string} [data.entryPoint] 来源页标识，如 conversation.view；不传时 entryPoint 为空
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function auditConversationById(id, data) {
  return http.post(`/conversations/${encodeURIComponent(String(id))}/audit`, data)
}

/**
 * 标记会话已读（JWT 接口）
 * 路径：POST /conversations/{id}/read
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function markConversationReadById(id) {
  return http.post(`/conversations/${encodeURIComponent(String(id))}/read`)
}

/**
 * 患者点「人工服务」（JWT 接口，转人工的唯一触发方式，触发后 PC 端收到待处理提醒）
 * 路径：POST /conversations/{id}/manual-service
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} ManualServiceRequest：id/conversationId/patientId（雪花 ID 字符串）、
 *   status（PENDING/ACCEPTED/RESOLVED）、handlerId（字符串）、handleTime、createTime
 */
export function requestManualServiceById(id) {
  return http.post(`/conversations/${encodeURIComponent(String(id))}/manual-service`)
}

/**
 * 患者评价客服（JWT 接口，v2 旧路径保留兼容，返回 void；新端可优先用 /me 路径的 submitMyConversationEvaluationById）
 * 路径：POST /conversations/{id}/evaluation
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 评价内容（EvaluationRequest）
 * @param {string} [data.targetRole] 评价对象角色，缺省 CS，当前仅支持 CS
 * @param {number} data.rating 星级（必填，1-5）
 * @param {string[]} [data.tags] 评价标签，如「专业度高」
 * @param {string} [data.comment] 文字评论（≤512）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function evaluateConversationById(id, data) {
  return http.post(`/conversations/${encodeURIComponent(String(id))}/evaluation`, data)
}

/* -------------------------------------------------------------------------- */
/*  患者端会话别名与人工服务请求（PC 客服受理）                                  */
/* -------------------------------------------------------------------------- */

/**
 * 患者发送消息（JWT 接口，/me 路径别名，消息结构与 sendConversationMessageById 一致）
 * 路径：POST /me/conversations/{id}/messages
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 消息内容（SendMessageRequest：type/content/imageUrl/healthType/extraJson/clientSeq）
 * @returns {Promise<Object>} 创建成功的 Message（id 为雪花 ID 字符串）
 */
export function sendMyConversationMessageById(id, data) {
  return http.post(`/me/conversations/${encodeURIComponent(String(id))}/messages`, data)
}

/**
 * 患者评价客服（JWT 接口，/me 路径别名，返回完整评价对象）
 * 路径：POST /me/conversations/{id}/evaluation
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 评价内容（EvaluationRequest）
 * @param {string} [data.targetRole] 评价对象角色，缺省 CS，当前仅支持 CS
 * @param {number} data.rating 星级（必填，1-5）
 * @param {string[]} [data.tags] 评价标签
 * @param {string} [data.comment] 文字评论（≤512）
 * @returns {Promise<Object>} Evaluation：id/conversationId/patientId/rateeId（雪花 ID 字符串）、
 *   targetRole/rateeType（CS）、stars 1-5、tagsJson、comment、createTime
 */
export function submitMyConversationEvaluationById(id, data) {
  return http.post(`/me/conversations/${encodeURIComponent(String(id))}/evaluation`, data)
}

/**
 * 患者点「人工服务」（JWT 接口，/me 路径别名）
 * 路径：POST /me/conversations/{id}/manual-service
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} ManualServiceRequest：id/conversationId/patientId（雪花 ID 字符串）、
 *   status（PENDING/ACCEPTED/RESOLVED）、handlerId、handleTime、createTime
 */
export function requestMyManualServiceById(id) {
  return http.post(`/me/conversations/${encodeURIComponent(String(id))}/manual-service`)
}

/**
 * 查询待响应人工服务请求列表（JWT 接口，PC 客服工作台）
 * 路径：GET /manual-service-requests
 * 无请求参数
 * @returns {Promise<Array<Object>>} ManualServiceRequest 数组，元素含 id/conversationId/patientId
 *   （雪花 ID 字符串）、status（PENDING/ACCEPTED/RESOLVED）、handlerId（字符串）、handleTime、createTime
 */
export function getManualServiceRequests() {
  return http.get('/manual-service-requests')
}

/**
 * 受理人工服务请求（JWT 接口，PC 客服）
 * 路径：PUT /manual-service-requests/{id}
 * @param {string} id 人工服务请求 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} [status='ACCEPTED'] 目标状态，默认 ACCEPTED；内部包装为 { status } 上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function acceptManualServiceRequestById(id, status = 'ACCEPTED') {
  return http.put(`/manual-service-requests/${encodeURIComponent(String(id))}`, { status })
}

export default {
  getConversationPage,
  getConversationWorkspaceById,
  getConversationById,
  getConversationStats,
  getMyConversations,
  getEnabledReplyTemplates,
  createReplyTemplate,
  getReplyTemplatePage,
  updateReplyTemplateById,
  deleteReplyTemplateById,
  updateReplyTemplateStatusById,
  updateReplyTemplateBatchStatus,
  recordReplyTemplateUseById,
  getReplyTemplateUsageLogsById,
  updateConversationStatusById,
  updateConversationPriorityById,
  getConversationMessagesById,
  sendConversationMessageById,
  editConversationMessageById,
  auditConversationById,
  markConversationReadById,
  requestManualServiceById,
  evaluateConversationById,
  sendMyConversationMessageById,
  submitMyConversationEvaluationById,
  requestMyManualServiceById,
  getManualServiceRequests,
  acceptManualServiceRequestById
}
