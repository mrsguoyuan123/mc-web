/**
 * 陪诊服务模块接口（api/swagger.json 中 tag = escort 的全部接口，共 21 个）
 *
 * 基于 ../frontApikit.js 的 http / request 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如预约/订单/患者/陪诊师/医院/科室 id）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number
 * - 请求 query / body 中的雪花 ID（patientId/caregiverId/departmentId 等）内部统一 String() 归一化，调用方传字符串
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>；按角色区分管理端 / 患者端 / 陪诊师端
 *
 * 命名规范：
 * - 查询用 get + 资源名，新建用 create + 资源名，动作类（取消/接单/打卡等）用 动词 + 资源 + ById
 * - 路径含 {id} 的接口统一使用 XxxById 后缀，多 ID 时按路径/参数签名顺序排列
 *
 * 预约状态机：WAIT_ACCEPT 待接单 → CONFIRMED 已确认 → IN_SERVICE 服务中 → COMPLETED 已完成；CANCELLED 已取消
 */

import { http, request } from '../frontApikit.js'

/** 把已知雪花 ID 字段安全转为字符串（仅处理存在且非空的字段，不改变其他字段） */
function stringifyIdFields(obj, idKeys) {
  if (!obj || typeof obj !== 'object') return obj
  for (const key of idKeys) {
    if (obj[key] !== undefined && obj[key] !== null) obj[key] = String(obj[key])
  }
  return obj
}

/* -------------------------------------------------------------------------- */
/*  管理端：预约管理（/escort/bookings/*）                                      */
/* -------------------------------------------------------------------------- */

/**
 * 管理员协助预约（JWT 接口，代患者下单；来源 source=ADMIN，记录操作人 operatorId）
 * 路径：POST /escort/bookings
 * @param {Object} data 预约信息（AdminBookingRequest，请求体必填）
 * @param {string} data.patientId 患者 ID，雪花 ID 字符串（必填）
 * @param {string} data.caregiverId 陪诊师 ID，雪花 ID 字符串（必填）
 * @param {string} data.serviceDate 服务日期，格式 yyyy-MM-dd（必填）
 * @param {string} data.period 服务时段（必填），枚举：MORNING 上午 / AFTERNOON 下午 / FULLDAY 全天
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.remark] 备注
 * @returns {Promise<Object>} EscortBooking：预约完整记录，含 id/patientId/caregiverId/hospitalId/departmentId（雪花 ID 字符串）、
 *   serviceDate、period、status（WAIT_ACCEPT/CONFIRMED/IN_SERVICE/COMPLETED/CANCELLED）、source（PATIENT/ADMIN）、时间戳字段
 */
export function createEscortBooking(data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'caregiverId', 'departmentId'])
  return http.post('/escort/bookings', payload)
}

/**
 * 预约管理列表（JWT 接口，公司管理端可见全量，可按患者/状态过滤）
 * 路径：GET /escort/bookings
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.patientId] 患者 ID 筛选，雪花 ID 字符串
 * @param {string} [params.status] 预约状态筛选，枚举：WAIT_ACCEPT/CONFIRMED/IN_SERVICE/COMPLETED/CANCELLED
 * @returns {Promise<Array<Object>>} EscortBooking 数组，元素含各雪花 ID 字符串、serviceDate、period、status、source、remark、时间戳
 */
export function getEscortBookings(params = {}) {
  const query = stringifyIdFields({ ...params }, ['patientId'])
  return http.get('/escort/bookings', query)
}

/**
 * 管理员改期 / 修改备注（JWT 接口，全量更新预约信息）
 * 路径：PUT /escort/bookings/{id}
 * @param {string} id 预约 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 预约信息（AdminBookingRequest，请求体必填）
 * @param {string} data.patientId 患者 ID，雪花 ID 字符串（必填）
 * @param {string} data.caregiverId 陪诊师 ID，雪花 ID 字符串（必填）
 * @param {string} data.serviceDate 服务日期，格式 yyyy-MM-dd（必填）
 * @param {string} data.period 服务时段（必填），枚举：MORNING/AFTERNOON/FULLDAY
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.remark] 备注
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；预约不存在或状态不可改返回 code=400
 */
export function updateEscortBookingById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['patientId', 'caregiverId', 'departmentId'])
  return http.put(`/escort/bookings/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 管理员取消预约（JWT 接口，取消后向患者返还 1 次陪诊额度）
 * 路径：POST /escort/bookings/{id}/cancel
 * @param {string} id 预约 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；状态不允许取消返回 code=400
 */
export function cancelEscortBookingById(id) {
  return http.post(`/escort/bookings/${encodeURIComponent(String(id))}/cancel`)
}

/**
 * 管理员改派陪诊师（JWT 接口，caregiverId 走 query 参数）
 * 路径：PUT /escort/bookings/{id}/assign
 * @param {string} id 预约 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} caregiverId 新陪诊师 ID（必填，query 参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；陪诊师不可用等返回 code=400
 */
export function assignEscortCaregiverById(id, caregiverId) {
  return request(`/escort/bookings/${encodeURIComponent(String(id))}/assign`, {
    method: 'PUT',
    params: { caregiverId: String(caregiverId) }
  })
}

/* -------------------------------------------------------------------------- */
/*  患者端：我的陪诊（/me/escort/*）                                            */
/* -------------------------------------------------------------------------- */

/**
 * 我的陪诊首页信息（JWT 接口，返回剩余陪诊次数与当前有效预约）
 * 路径：GET /me/escort
 * 无请求参数
 * @returns {Promise<Object>} MeEscort：{ escortCount 剩余陪诊次数,
 *   activeBooking 当前有效预约（WAIT_ACCEPT/CONFIRMED/IN_SERVICE，无则 null），含 id 雪花 ID 字符串、status、serviceDate、period、remark、caregiverInfo }
 */
export function getMyEscort() {
  return http.get('/me/escort')
}

/**
 * 可预约陪诊师列表（JWT 接口，含每位陪诊师的忙碌时段供前端置灰）
 * 路径：GET /me/escort/caregivers
 * 无请求参数
 * @returns {Promise<Array<Object>>} CaregiverProfile 数组：[{ caregiverId 雪花 ID 字符串, name, avatar, gender（男/女）, age,
 *   expYears 从业年限, rating 评分(0-5), tags 服务标签, desc 简介, count 累计服务人次, hospitalExperience 常驻医院,
 *   busySlots 忙碌时段映射 { 'yyyy-MM-dd': ['MORNING','AFTERNOON','FULLDAY'] } }]
 */
export function getMyEscortCaregivers() {
  return http.get('/me/escort/caregivers')
}

/**
 * 患者自助预约陪诊（JWT 接口，预约即扣减 1 次额度；仅可约明天起 10 天内日期，服务端做时段冲突校验）
 * 路径：POST /me/escort/bookings
 * @param {Object} data 预约信息（EscortBookingRequest，请求体必填）
 * @param {string} data.caregiverId 陪诊师 ID，雪花 ID 字符串（必填）
 * @param {string} data.serviceDate 服务日期，格式 yyyy-MM-dd（必填），可约窗口为明天起 10 天
 * @param {string} data.period 服务时段（必填），枚举：MORNING 上午 / AFTERNOON 下午 / FULLDAY 全天
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.remark] 备注，最长 512 字符
 * @returns {Promise<Object>} EscortBooking：预约完整记录，含 id 等雪花 ID 字符串、serviceDate、period、status、source=PATIENT、时间戳
 */
export function createMyEscortBooking(data) {
  const payload = stringifyIdFields({ ...data }, ['caregiverId', 'departmentId'])
  return http.post('/me/escort/bookings', payload)
}

/**
 * 我的预约列表（JWT 接口，含陪诊师联系方式，便于患者联系）
 * 路径：GET /me/escort/bookings
 * 无请求参数
 * @returns {Promise<Array<Object>>} EscortBookingView 数组：[{ id/caregiverId 雪花 ID 字符串, caregiverName, caregiverAvatar,
 *   caregiverPhone, serviceDate, period, status（五态枚举）, hospital 医院名, department 科室名, remark, createTime, cancelTime, finishTime }]
 */
export function getMyEscortBookings() {
  return http.get('/me/escort/bookings')
}

/**
 * 患者取消预约（JWT 接口，全额返还 1 次陪诊额度；仅 WAIT_ACCEPT/CONFIRMED 状态可取消）
 * 路径：POST /me/escort/bookings/{id}/cancel
 * @param {string} id 预约 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；状态不允许取消返回 code=400
 */
export function cancelMyEscortBookingById(id) {
  return http.post(`/me/escort/bookings/${encodeURIComponent(String(id))}/cancel`)
}

/* -------------------------------------------------------------------------- */
/*  陪诊师端：工作台与订单（/escort/stats、/escort/orders/*）                   */
/* -------------------------------------------------------------------------- */

/**
 * 陪诊师工作台统计（JWT 接口，按当前登录陪诊师聚合各状态数量）
 * 路径：GET /escort/stats
 * 无请求参数
 * @returns {Promise<Object>} EscortStats：{ waitAccept 待接单数, pending 待服务数（已接单）, inService 服务中数,
 *   completed 已完成数, users 服务过的患者数 }
 */
export function getEscortStats() {
  return http.get('/escort/stats')
}

/**
 * 陪诊师订单分页列表（JWT 接口，按状态过滤）
 * 路径：GET /escort/orders
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.status] 订单状态筛选，枚举：WAIT_ACCEPT/CONFIRMED/IN_SERVICE/COMPLETED/CANCELLED
 * @param {number} [params.page=1] 页码，从 1 开始，默认 1
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultEscortOrder：{ list, total, page, pageSize }；
 *   list 元素 EscortOrder 含 id/patientId/departmentId（雪花 ID 字符串）、patientName、age、serviceDate、period、
 *   phone（脱敏手机号）、address 患者所在地区、status（五态枚举）
 */
export function getEscortOrders(params = {}) {
  return http.get('/escort/orders', params)
}

/**
 * 陪诊师订单详情（JWT 接口；待服务态返回患者信息与风险提示，完成/取消态返回服务记录与打卡）
 * 路径：GET /escort/orders/{id}
 * @param {string} id 订单 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} EscortOrderDetail：{ booking 订单(EscortBookingView),
 *   patient 患者信息 EscortPatientInfo（待接单/待服务/服务中返回，含 id 雪花 ID 字符串、name、age、phone、address、surgeryType、riskLevel 高/中/低风险、notices 注意事项）,
 *   serviceRecord 服务记录（完成/取消时返回，含恢复情况/特殊情况/taskCompleted）,
 *   checkins 打卡记录数组（完成/取消时返回，type 为 ARRIVE/FINISH，含经纬度、地址、照片、时间） }
 */
export function getEscortOrderById(id) {
  return http.get(`/escort/orders/${encodeURIComponent(String(id))}`)
}

/**
 * 接单（JWT 接口，状态流转 WAIT_ACCEPT → CONFIRMED）
 * 路径：PUT /escort/orders/{id}/accept
 * @param {string} id 订单 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；非待接单状态返回 code=400
 */
export function acceptEscortOrderById(id) {
  return http.put(`/escort/orders/${encodeURIComponent(String(id))}/accept`)
}

/**
 * 开始服务（JWT 接口，状态流转 CONFIRMED → IN_SERVICE）
 * 路径：PUT /escort/orders/{id}/start
 * @param {string} id 订单 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；非已确认状态返回 code=400
 */
export function startEscortOrderById(id) {
  return http.put(`/escort/orders/${encodeURIComponent(String(id))}/start`)
}

/* -------------------------------------------------------------------------- */
/*  陪诊师端：打卡、服务记录与排班统计（/escort/orders/{id}/*、/escort/*）       */
/* -------------------------------------------------------------------------- */

/**
 * 到院打卡（JWT 接口，记录一条 type=ARRIVE 的打卡，含定位、地址与照片）
 * 路径：POST /escort/orders/{id}/checkin
 * @param {string} id 订单 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 打卡信息（EscortCheckinRequest，请求体必填）
 * @param {number} data.latitude 纬度（必填），范围 -90 ~ 90
 * @param {number} data.longitude 经度（必填），范围 -180 ~ 180
 * @param {string} data.address 打卡地址（必填），最长 255 字符
 * @param {Array<string>} [data.photos] 打卡照片 URL 数组，最多 9 张
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；定位参数非法返回 code=400
 */
export function checkinEscortOrderById(id, data) {
  return http.post(`/escort/orders/${encodeURIComponent(String(id))}/checkin`, data)
}

/**
 * 提交服务记录（JWT 接口，提交后订单归档为 COMPLETED；仅 taskCompleted=COMPLETED 才累加服务人次）
 * 路径：POST /escort/orders/{id}/service-record
 * @param {string} id 订单 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 服务记录（EscortServiceRecordRequest，请求体必填）
 * @param {string} data.recoveryDescription 身体恢复情况（必填），最长 1024 字符
 * @param {string} [data.otherSituation] 其他情况，枚举：EMPTY_NESTER 空巢老人 / MOBILITY_IMPAIRED 行动不便 / OTHER 其他
 * @param {string} [data.specialFeedback] 特殊情况反馈，最长 1024 字符
 * @param {string} data.taskCompleted 任务完成情况（必填），枚举：COMPLETED 已完成 / INCOMPLETE 未完成（两种都会归档订单）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；订单状态不允许提交返回 code=400
 */
export function submitEscortServiceRecordById(id, data) {
  return http.post(`/escort/orders/${encodeURIComponent(String(id))}/service-record`, data)
}

/**
 * 月历排班（JWT 接口，按月份返回每日时段对应的订单，供日历渲染）
 * 路径：GET /escort/schedules
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.month] 月份，格式 yyyy-MM，不传默认当月
 * @returns {Promise<Object>} 排班映射对象：{ 'yyyy-MM-dd': 该日各时段订单数组 }，键为日期字符串，值为当日订单/时段集合
 */
export function getEscortSchedules(params = {}) {
  return http.get('/escort/schedules', params)
}

/**
 * 陪诊师个人统计（JWT 接口，累计服务、本月单数与评分）
 * 路径：GET /escort/profile-stats
 * 无请求参数
 * @returns {Promise<Object>} EscortProfileStats：{ totalCount 累计服务人次, monthCount 本月完成单数, rating 服务评分 }
 */
export function getEscortProfileStats() {
  return http.get('/escort/profile-stats')
}

/**
 * 陪诊师服务过的患者（JWT 接口，用于会话入口，带最后消息时间与未读数）
 * 路径：GET /escort/users
 * 无请求参数
 * @returns {Promise<Array<Object>>} EscortUser 数组：[{ patientId 雪花 ID 字符串, name, age,
 *   lastMsgAt 最后消息时间(date-time), unreadCount 未读消息数 }]
 */
export function getEscortUsers() {
  return http.get('/escort/users')
}

/**
 * 修改陪诊全局配置（JWT 接口；当前后端未实现，Controller 固定返回 code=400，前端调用会进 catch）
 * 路径：PUT /escort/config
 * @param {Object} data 配置对象，如 { bookingEnabled: true } 是否开放预约
 * @returns {Promise<null>} ApiResponse 的 data；当前为占位接口，恒定返回业务错误 code=400
 */
export function updateEscortConfig(data) {
  return http.put('/escort/config', data)
}

export default {
  createEscortBooking,
  getEscortBookings,
  updateEscortBookingById,
  cancelEscortBookingById,
  assignEscortCaregiverById,
  getMyEscort,
  getMyEscortCaregivers,
  createMyEscortBooking,
  getMyEscortBookings,
  cancelMyEscortBookingById,
  getEscortStats,
  getEscortOrders,
  getEscortOrderById,
  acceptEscortOrderById,
  startEscortOrderById,
  checkinEscortOrderById,
  submitEscortServiceRecordById,
  getEscortSchedules,
  getEscortProfileStats,
  getEscortUsers,
  updateEscortConfig
}
