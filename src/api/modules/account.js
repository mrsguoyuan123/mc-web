/**
 * 个人账号模块接口（api/swagger.json 中 tag = account 的全部接口，共 5 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如登录/操作日志的 id、userId）已由 BigIntSafeParser 自动转为字符串
 * - 本模块入参（query 与 body）均不含雪花 ID 字段，故无需 String() 归一化；日期参数统一传 yyyy-MM-dd 字符串
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>，数据强制限定为当前登录人本人
 *
 * 命名规范：查询用 get + 资源名，保存/编辑用 update + 资源名；本模块无 {id} 路径参数，故不产生 ById 后缀函数
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  个人安全设置                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 查询个人安全设置（JWT 接口，取当前登录人自己的配置）
 * 路径：GET /me/security
 * 无请求参数
 * @returns {Promise<Object>} SecuritySettings：{ twoFactorAuth 是否开启双因素认证, loginNotification 是否开启登录通知,
 *   sessionTimeout 会话超时时间（分钟）, passwordExpiry 密码过期周期（天）, ipWhitelist 是否启用 IP 白名单 }
 */
export function getMySecuritySettings() {
  return http.get('/me/security')
}

/**
 * 保存个人安全设置（JWT 接口，全量保存当前登录人的安全配置）
 * 路径：PUT /me/security
 * @param {Object} data 安全设置（SecuritySettings，请求体必填）
 * @param {boolean} data.twoFactorAuth 是否开启双因素认证
 * @param {boolean} data.loginNotification 是否开启异地/新设备登录通知
 * @param {number} data.sessionTimeout 会话超时时间，单位分钟
 * @param {number} data.passwordExpiry 密码过期周期，单位天
 * @param {boolean} data.ipWhitelist 是否启用登录 IP 白名单
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；参数非法返回 code=400
 */
export function updateMySecuritySettings(data) {
  return http.put('/me/security', data)
}

/* -------------------------------------------------------------------------- */
/*  个人日志（登录日志 / 操作日志）                                              */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询个人登录日志（JWT 接口，仅返回当前登录人自己的记录）
 * 路径：GET /me/login-logs
 * @param {Object} [params={}] 查询与分页参数
 * @param {number} [params.status] 登录状态筛选：1 成功 / 0 失败
 * @param {string} [params.from] 起始日期，格式 yyyy-MM-dd
 * @param {string} [params.to] 截止日期，格式 yyyy-MM-dd
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultLoginLog：{ list, total, page, pageSize }；
 *   list 元素 SysLoginLog 含 id/userId（雪花 ID 字符串）、username、loginType（password 密码/sms 短信/wx 微信）、
 *   ip、location 登录地、device 设备、status（1 成功 0 失败）、failReason 失败原因、createTime（date-time）
 */
export function getMyLoginLogs(params = {}) {
  return http.get('/me/login-logs', params)
}

/**
 * 分页查询个人操作日志（JWT 接口，仅返回当前登录人自己的记录）
 * 路径：GET /me/operation-logs
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.module] 业务模块标识筛选，如 user、rbac 等
 * @param {number} [params.status] 操作结果状态筛选，取值以服务端字典为准
 * @param {string} [params.from] 起始日期，格式 yyyy-MM-dd
 * @param {string} [params.to] 截止日期，格式 yyyy-MM-dd
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultOperationLog：{ list, total, page, pageSize }；
 *   list 元素 SysOperationLog 含 id/userId（雪花 ID 字符串）、username、module 模块、operationType 操作类型、
 *   description 描述、method HTTP 方法、uri 请求路径、ip、costMs 耗时毫秒、status 状态、createTime（date-time）
 */
export function getMyOperationLogs(params = {}) {
  return http.get('/me/operation-logs', params)
}

/* -------------------------------------------------------------------------- */
/*  员工个人资料                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 编辑员工个人资料（JWT 接口，当前登录员工修改自己的基础资料；字段均可选，仅提交需要修改的部分）
 * 路径：PUT /me/account/profile
 * @param {Object} data 员工资料（StaffProfileUpdateRequest，请求体必填）
 * @param {string} [data.name] 姓名
 * @param {string} [data.email] 邮箱
 * @param {string} [data.phone] 手机号
 * @param {string} [data.avatar] 头像 URL
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；校验失败返回 code=400
 */
export function updateMyAccountProfile(data) {
  return http.put('/me/account/profile', data)
}

export default {
  getMySecuritySettings,
  updateMySecuritySettings,
  getMyLoginLogs,
  getMyOperationLogs,
  updateMyAccountProfile
}
