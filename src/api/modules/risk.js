/**
 * 风险提示模块接口（api/swagger.json 中 tag = risk 的全部接口，共 4 个，PC 客服核心模块）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如风险 id、patientId、handlerId）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number
 * - 请求 body 中的雪花 ID（patientId/handlerId）内部统一 String() 归一化，调用方传字符串
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 分页查询用 get + 资源名 + Page，动作用 create/update + 资源名
 * - 路径含 {id} 的处理/关闭接口统一使用 updateXxxById 后缀
 *
 * 状态与枚举：status 风险状态 PENDING 待处理 / HANDLED 已处理 / CLOSED 已关闭；
 *   level 风险等级 LOW 低 / MEDIUM 中 / HIGH 高；
 *   source 来源 AI_CHAT AI 对话 / HEALTH_DATA 健康数据 / CONVERSATION_URGENT 会话紧急 / MANUAL 人工上报
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
 * 分页查询风险提示列表（JWT 接口，PC 客服核心工作台，可按状态/等级/来源过滤）
 * 路径：GET /risk-alerts
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.status] 风险状态筛选，枚举：PENDING 待处理 / HANDLED 已处理 / CLOSED 已关闭
 * @param {string} [params.level] 风险等级筛选，枚举：LOW 低 / MEDIUM 中 / HIGH 高
 * @param {string} [params.source] 来源筛选，枚举：AI_CHAT / HEALTH_DATA / CONVERSATION_URGENT / MANUAL
 * @param {number} [params.page=1] 页码，从 1 开始，默认 1
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultRiskAlert：{ list, total, page, pageSize }；
 *   list 元素 RiskAlert 含 id/patientId/handlerId（雪花 ID 字符串）、source 来源、level（LOW/MEDIUM/HIGH）、
 *   title、content、status（PENDING/HANDLED/CLOSED）、handleNote 处理说明、handledAt 处理时间、createTime（date-time）
 */
export function getRiskAlertPage(params = {}) {
  return http.get('/risk-alerts', params)
}

/**
 * 手动上报风险（JWT 接口，兜底人工录入通道；source 服务端不做枚举校验）
 * 路径：POST /risk-alerts
 * @param {Object} data 风险信息（RiskAlert，请求体必填）
 * @param {string} data.patientId 患者 ID，雪花 ID 字符串（必填）
 * @param {string} data.source 来源标识（必填），常用 AI_CHAT/HEALTH_DATA/CONVERSATION_URGENT/MANUAL
 * @param {string} data.level 风险等级（必填），枚举：LOW 低 / MEDIUM 中 / HIGH 高
 * @param {string} data.title 风险标题（必填）
 * @param {string} [data.content] 风险详细内容
 * @param {string} [data.status] 风险状态，枚举：PENDING/HANDLED/CLOSED，不传由服务端按默认待处理落库
 * @param {string} [data.handlerId] 处理人 ID，雪花 ID 字符串
 * @param {string} [data.handleNote] 处理说明
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；必填缺失或等级非法返回 code=400
 */
export function createRiskAlert(data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'handlerId'])
  return http.post('/risk-alerts', payload)
}

/**
 * 风险统计（JWT 接口，用于顶部未处理与高/中/低风险计数卡片）
 * 路径：GET /risk-alerts/summary
 * 无请求参数
 * @returns {Promise<Object>} RiskSummary：{ pending 待处理数, high 高风险数, medium 中风险数, low 低风险数 }
 */
export function getRiskAlertSummary() {
  return http.get('/risk-alerts/summary')
}

/**
 * 处理 / 关闭风险提示（JWT 接口，写入处理状态与说明，记录处理人与处理时间）
 * 路径：PUT /risk-alerts/{id}
 * @param {string} id 风险提示 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 处理信息（请求体必填），形如 { status, note }
 * @param {string} data.status 目标状态，枚举：HANDLED 已处理 / CLOSED 已关闭
 * @param {string} [data.note] 处理说明
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；风险不存在或状态流转非法返回 code=400
 */
export function updateRiskAlertById(id, data) {
  return http.put(`/risk-alerts/${encodeURIComponent(String(id))}`, data)
}

export default {
  getRiskAlertPage,
  createRiskAlert,
  getRiskAlertSummary,
  updateRiskAlertById
}
