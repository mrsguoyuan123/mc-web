/**
 * 站内通知模块接口（api/swagger.json 中 tag = notification 的全部接口，共 6 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如通知 id/bizId/userId）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number；
 *   待办 TodoItem 的 id 契约本身即为字符串，无需转换
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，动作用 mark/create + 资源名
 * - 路径含 {id} 的接口统一使用 markXxxById 等 ById 后缀
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  待办、未读数与通知列表                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 查询按角色聚合的待办（JWT 接口，工作台待办卡片）
 * 路径：GET /notifications/todo
 * 无请求参数
 * @returns {Promise<Array<Object>>} TodoItem 数组，元素含 id（契约为字符串）、title 待办标题、
 *   route 跳转路由、tone 色调（danger 危险/warning 警告/info 普通）、count 待办数量
 */
export function getNotificationTodo() {
  return http.get('/notifications/todo')
}

/**
 * 查询当前用户未读通知数（JWT 接口，用于顶部铃铛红点）
 * 路径：GET /notifications/unread-count
 * 无请求参数
 * @returns {Promise<Object>} { count 未读数 }
 */
export function getNotificationUnreadCount() {
  return http.get('/notifications/unread-count')
}

/**
 * 分页查询通知列表（JWT 接口，含系统信息/资料更新/人工服务提醒/风险四类）
 * 路径：GET /notifications
 * @param {Object} [params] 查询与分页参数
 * @param {number} [params.isRead] 阅读状态：0 未读 / 1 已读
 * @param {string} [params.type] 通知类型，枚举：MANUAL_SERVICE 人工服务提醒 / SYSTEM 系统信息 / ARTICLE 资料更新 / RISK 风险
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<Notification>：{ list, total, page, pageSize }；
 *   list 元素含 id/userId/bizId（雪花 ID 字符串）、userType（STAFF/PATIENT）、
 *   type（MANUAL_SERVICE/SYSTEM/ARTICLE/RISK）、title、content、isRead（1 已读 0 未读）、readTime、createTime
 */
export function getNotificationPage(params = {}) {
  return http.get('/notifications', params)
}

/* -------------------------------------------------------------------------- */
/*  已读标记与小程序订阅                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 单条通知标记已读（JWT 接口）
 * 路径：PUT /notifications/{id}/read
 * @param {string} id 通知 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function markNotificationReadById(id) {
  return http.put(`/notifications/${encodeURIComponent(String(id))}/read`)
}

/**
 * 全部通知标记已读（JWT 接口，针对当前用户）
 * 路径：PUT /notifications/read
 * 无请求参数
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function markAllNotificationsRead() {
  return http.put('/notifications/read')
}

/**
 * 小程序订阅消息授权登记（JWT 接口，TODO 骨架能力）
 * 路径：POST /notifications/wx-subscribe
 * @param {Object} data 模板标识 → 授权值的映射，如 { templateIds: '随访提醒,用药提醒' }
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；当前为占位实现
 */
export function registerWxSubscribe(data) {
  return http.post('/notifications/wx-subscribe', data)
}

export default {
  getNotificationTodo,
  getNotificationUnreadCount,
  getNotificationPage,
  markNotificationReadById,
  markAllNotificationsRead,
  registerWxSubscribe
}
