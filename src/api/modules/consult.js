/**
 * 专业咨询模块接口（api/swagger.json 中 tag = consult 的全部接口，共 11 个，PC 客服留言 → 医生回复 → 转发/关闭工作流）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如咨询/回复/患者 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/replyId/patientId、query 的 patientId、请求体内 patientId/parentId/doctorIds）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，状态动作用 close/resolve/mark/forward + 资源名
 * - 路径含 {id}/{replyId}/{patientId} 的接口统一使用 getXxxById / createXxxById / markXxxById 等 ById 后缀
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

/** 把 id 数组中的每个元素转为字符串（推送医生 id 列表等） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/* -------------------------------------------------------------------------- */
/*  咨询列表、发起、详情与统计                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询专业咨询列表（JWT 接口，客服工作台）
 * 路径：GET /consultations
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.patientId] 患者 ID，雪花 ID 字符串
 * @param {string} [params.status] 咨询状态，枚举：WAIT_DOCTOR_VIEW 待医生查看 / WAIT_DOCTOR_REPLY 待医生回复 /
 *   DOCTOR_REPLIED 医生已回复 / CS_PROCESSING 客服处理中 / RESOLVED 已解决 / CLOSED 已关闭
 * @param {string} [params.urgency] 紧急度，枚举：NORMAL 普通 / ATTENTION 关注 / URGENT 紧急
 * @param {string} [params.keyword] 主题/内容关键字
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ConsultationView>：{ list, total, page, pageSize }；
 *   list 元素含 consultation 咨询实体（id/patientId/parentId/createdBy 等雪花 ID 为字符串）、patientName、
 *   patientId（字符串）、doctorCount、replyCount、unreadReplies
 */
export function getConsultationPage(params = {}) {
  const query = stringifyIdFields({ ...params }, ['patientId'])
  return http.get('/consultations', query)
}

/**
 * 发起专业咨询（JWT 接口，客服代患者留言并推送给医生）
 * 路径：POST /consultations
 * @param {Object} data 咨询内容（ConsultationCreateRequest）
 * @param {string} data.patientId 患者 ID（必填，雪花 ID 字符串）
 * @param {string} data.subject 咨询主题（必填）
 * @param {string} data.content 留言正文（必填）
 * @param {string} [data.patientContext] 患者背景信息
 * @param {string} [data.note] 内部备注
 * @param {string} [data.urgency] 紧急度，枚举：NORMAL / ATTENTION / URGENT
 * @param {string} [data.expectedReplyAt] 期望回复时间（date-time，yyyy-MM-ddTHH:mm:ss）
 * @param {string[]} [data.doctorIds] 推送医生 ID 数组（雪花 ID 字符串）
 * @param {string[]} [data.attachments] 附件 URL 数组
 * @param {string} [data.parentId] 父留言 ID（再次留言链路用，雪花 ID 字符串）
 * @returns {Promise<string>} 新建咨询 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createConsultation(data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'parentId'])
  if (Array.isArray(data.doctorIds)) payload.doctorIds = stringifyIdArray(data.doctorIds)
  return http.post('/consultations', payload)
}

/**
 * 获取咨询详情（JWT 接口，聚合咨询/患者/推送医生/回复列表）
 * 路径：GET /consultations/{id}
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} { consultation Consultation 咨询实体, patient Patient 患者,
 *   doctors ConsultationDoctor[] 推送医生（id/consultationId/doctorId 字符串、priority HIGH/MEDIUM/NORMAL、viewedAt）,
 *   replies ConsultationReply[] 医生回复（id/consultationId/doctorId/doctorUserId 字符串、content、attachmentJson、supplemental、unread、createTime） }
 */
export function getConsultationById(id) {
  return http.get(`/consultations/${encodeURIComponent(String(id))}`)
}

/**
 * 获取咨询统计（JWT 接口，工作台卡片数据）
 * 路径：GET /consultations/stats
 * @param {Object} [params] 查询参数
 * @param {string} [params.patientId] 患者 ID，雪花 ID 字符串；不传则统计全部可见咨询
 * @returns {Promise<Object>} ConsultationStats：{ total 总数, pending 待处理数, replied 已回复数, closed 已关闭数 }
 */
export function getConsultationStats(params = {}) {
  const query = stringifyIdFields({ ...params }, ['patientId'])
  return http.get('/consultations/stats', query)
}

/**
 * 分页查询某患者的咨询记录（JWT 接口）
 * 路径：GET /consultations/patients/{patientId}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ConsultationView>：{ list, total, page, pageSize }，结构同 getConsultationPage
 */
export function getConsultationsByPatientId(patientId, params = {}) {
  return http.get(`/consultations/patients/${encodeURIComponent(String(patientId))}`, params)
}

/* -------------------------------------------------------------------------- */
/*  咨询流转：再次留言、状态、备注与医生回复处理                                  */
/* -------------------------------------------------------------------------- */

/**
 * 再次留言（JWT 接口，基于父咨询发起追问，生成关联的新咨询）
 * 路径：POST /consultations/{id}/follow-ups
 * @param {string} id 父咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 留言内容（ConsultationCreateRequest，patientId/subject/content 必填，结构同 createConsultation）
 * @returns {Promise<string>} 新建咨询 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createConsultationFollowUpById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'parentId'])
  if (Array.isArray(data.doctorIds)) payload.doctorIds = stringifyIdArray(data.doctorIds)
  return http.post(`/consultations/${encodeURIComponent(String(id))}/follow-ups`, payload)
}

/**
 * 关闭咨询（JWT 接口，客服将咨询置为 CLOSED）
 * 路径：PUT /consultations/{id}/close
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function closeConsultationById(id) {
  return http.put(`/consultations/${encodeURIComponent(String(id))}/close`)
}

/**
 * 标记咨询已解决（JWT 接口，状态置为 RESOLVED）
 * 路径：PUT /consultations/{id}/resolve
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function resolveConsultationById(id) {
  return http.put(`/consultations/${encodeURIComponent(String(id))}/resolve`)
}

/**
 * 保存内部备注（JWT 接口，仅客服/后台可见，不对患者展示）
 * 路径：PUT /consultations/{id}/internal-note
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} internalNote 内部备注文本，内部包装为 { internalNote } 上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateConsultationInternalNoteById(id, internalNote) {
  return http.put(`/consultations/${encodeURIComponent(String(id))}/internal-note`, { internalNote })
}

/**
 * 医生回复标记已读（JWT 接口，清除该回复的未读计数）
 * 路径：PUT /consultations/{id}/replies/{replyId}/read
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} replyId 医生回复 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function markConsultationReplyReadById(id, replyId) {
  return http.put(
    `/consultations/${encodeURIComponent(String(id))}/replies/${encodeURIComponent(String(replyId))}/read`
  )
}

/**
 * 将医生回复转发给用户（JWT 接口，把回复内容投递到患者沟通会话并返回消息 id）
 * 路径：POST /consultations/{id}/replies/{replyId}/forward-to-user
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} replyId 医生回复 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<string>} 转发生成的消息 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function forwardConsultationReplyToUserById(id, replyId) {
  return http.post(
    `/consultations/${encodeURIComponent(String(id))}/replies/${encodeURIComponent(String(replyId))}/forward-to-user`
  )
}

export default {
  getConsultationPage,
  createConsultation,
  getConsultationById,
  getConsultationStats,
  getConsultationsByPatientId,
  createConsultationFollowUpById,
  closeConsultationById,
  resolveConsultationById,
  updateConsultationInternalNoteById,
  markConsultationReplyReadById,
  forwardConsultationReplyToUserById
}
