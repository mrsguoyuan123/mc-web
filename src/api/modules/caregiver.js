/**
 * 驻点（陪诊师）只读聊天模块接口（api/swagger.json 中 tag = caregiver 的全部接口，共 4 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如会话/患者/医院/科室 id、消息 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id、query 的 hospitalId/departmentId/beforeId）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 * - 驻点端仅可读取授权范围内的会话与消息，不可发送/编辑；数据范围由服务端按 /caregiver/scope 强制
 *
 * 命名规范：
 * - 查询用 get + 资源名；路径含 {id} 的接口统一使用 getXxxById 后缀
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

/**
 * 查询驻点数据范围（JWT 接口，决定驻点可见的医院/科室会话集合）
 * 路径：GET /caregiver/scope
 * 无请求参数
 * @returns {Promise<Object>} { scopeJson 数据范围 JSON 字符串，描述可见医院/科室等范围 }
 */
export function getCaregiverScope() {
  return http.get('/caregiver/scope')
}

/**
 * 分页查询驻点只读会话列表（JWT 接口，仅返回数据范围内的会话）
 * 路径：GET /caregiver/conversations
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 患者姓名等关键字
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<CaregiverConversationRow>：{ list, total, page, pageSize }；
 *   list 元素含 conversationId/patientId/hospitalId/departmentId（均为雪花 ID 字符串）、patientName、gender、age、
 *   lastMessageAt 最近消息时间、messageCount 消息数
 */
export function getCaregiverConversationPage(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/caregiver/conversations', query)
}

/**
 * 查询驻点会话统计（JWT 接口）
 * 路径：GET /caregiver/conversations/stats
 * M-G3：swagger 当前未声明筛选入参（服务端可能按全驻点口径返回）；调用方仍按与分页一致的筛选参数透传，
 * 后端若忽略则由页面在卡片副行标注「当前筛选条件」，前端不本地统计
 * @returns {Promise<Object>} { total 会话总数, departmentCount 覆盖科室数, doctorCount 关联医生数 }
 */
export function getCaregiverConversationStats(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/caregiver/conversations/stats', query)
}

/**
 * 分页拉取驻点只读历史消息（JWT 接口，beforeId 游标方式向前翻页）
 * 路径：GET /caregiver/conversations/{id}/messages
 * @param {string} id 会话 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 游标参数
 * @param {string} [params.beforeId] 游标：取此消息 ID 之前的消息，雪花 ID 字符串；首次不传
 * @param {number} [params.size=30] 拉取条数，默认 30
 * @returns {Promise<Array<Object>>} Message 数组（按时间倒序返回后由前端正序展示），元素含 id/conversationId
 *   （雪花 ID 字符串）、senderType（PATIENT/CS/CAREGIVER/DOCTOR/AI/SYSTEM）、senderId（字符串）、senderName、
 *   type（TEXT/IMAGE/HEALTH_CARD/CALL_RECORD）、content、imageUrl、extraJson、clientSeq、readJson、
 *   isEdited、editorName、editedAt、originalText、createTime、updateTime
 */
export function getCaregiverMessagesById(id, params = {}) {
  const query = stringifyIdFields({ ...params }, ['beforeId'])
  return http.get(`/caregiver/conversations/${encodeURIComponent(String(id))}/messages`, query)
}

export default {
  getCaregiverScope,
  getCaregiverConversationPage,
  getCaregiverConversationStats,
  getCaregiverMessagesById
}
