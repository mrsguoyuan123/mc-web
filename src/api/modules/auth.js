/**
 * 认证模块接口（api/swagger.json 中 tag = auth 的全部接口，共 19 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数）已由 frontApikit 的 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID 字段（如 doctorId / hospitalId / departmentId）一律按字符串传递，勿传 number
 * - 公开接口显式 skipAuth（不注入 Authorization）；JWT 接口由封装层自动携带 Bearer token
 *
 * 命名规范：
 * - 查询用 get + 资源名，动作用动词 + 资源名，更新用 update + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 后缀；
 *   auth 模块没有 {id} 路径参数接口，因此本文件无 ById 后缀函数
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  PC 两步式登录                                                              */
/* -------------------------------------------------------------------------- */

/**
 * PC 账密登录（两步式第一步，公开接口）
 * 路径：POST /auth/pc/login
 * @param {Object} data 登录凭证
 * @param {string} data.username 用户名/手机号（必填）
 * @param {string} data.password 密码（必填）
 * @returns {Promise<Object>} PcLoginResponse：loginTicket（5 分钟有效，只能用于 select-role，勿持久化）、
 *   user（id 为雪花 ID 字符串，含 name/username/avatar）、roles 可选 PC 角色列表、
 *   autoSelectRoleCode（仅单角色账号有值，可据此自动进入第二步）；账号停用/无 PC 角色返回 code=400
 */
export function pcLogin(data) {
  return http.post('/auth/pc/login', data, { skipAuth: true })
}

/**
 * PC 选择角色换 token（两步式第二步，公开接口）
 * 路径：POST /auth/pc/select-role
 * @param {Object} data 票据与角色
 * @param {string} data.loginTicket 第一步返回的登录票据（必填，5 分钟过期）
 * @param {string} data.roleCode 选中的角色编码，如 pc_admin（必填）
 * @returns {Promise<Object>} AuthResponse：token（access，2h）、refreshToken（7d）、
 *   user（LoginUser，含 permissions[] 权限码、dataScope 数据范围等）、roles 可选角色列表
 */
export function selectPcRole(data) {
  return http.post('/auth/pc/select-role', data, { skipAuth: true })
}

/**
 * PC 已登录状态下切换角色（JWT 接口）
 * 路径：POST /auth/pc/switch-role
 * @param {Object} data 切换参数
 * @param {string} data.roleCode 目标角色编码（必填）
 * @returns {Promise<Object>} AuthResponse：新 token/refreshToken 及新角色的 user（权限与数据范围已变更，
 *   调用方需清空页面缓存并重新拉取菜单；旧 refreshToken 仍可用）
 */
export function switchPcRole(data) {
  return http.post('/auth/pc/switch-role', data)
}

/* -------------------------------------------------------------------------- */
/*  移动端/通用登录、注册与验证码                                               */
/* -------------------------------------------------------------------------- */

/**
 * 医生手机号验证码登录（公开接口，首次登录按医生库手机号自动建号）
 * 路径：POST /auth/doctor/sms-login
 * @param {Object} data 登录凭证
 * @param {string} data.phone 手机号（必填）
 * @param {string} data.code 短信验证码（必填）
 * @returns {Promise<Object>} AuthResponse：token/refreshToken 与医生身份 user
 */
export function doctorSmsLogin(data) {
  return http.post('/auth/doctor/sms-login', data, { skipAuth: true })
}

/**
 * 员工账号密码登录（公开接口，legacy：PC 新前端请改用 pcLogin 两步式登录）
 * 路径：POST /auth/login
 * @param {Object} data 登录凭证
 * @param {string} data.username 用户名/手机号（必填）
 * @param {string} data.password 密码（必填）
 * @returns {Promise<Object>} AuthResponse：token/refreshToken 与当前用户 user
 */
export function loginByPassword(data) {
  return http.post('/auth/login', data, { skipAuth: true })
}

/**
 * 患者自助注册（公开接口，仅患者可自助注册；注册成功即登录）
 * 路径：POST /auth/register
 * @param {Object} data 注册信息
 * @param {string} data.phone 手机号（必填）
 * @param {string} data.code 短信验证码（必填）
 * @param {string} data.name 姓名（必填）
 * @param {string} [data.gender] 性别，枚举：男 / 女
 * @param {number} data.age 年龄（必填，服务层运行时校验，传 number）
 * @param {string} [data.surgeryRegion] 手术/就诊地区
 * @param {string} [data.idCard] 身份证号（业务决策明文存储）
 * @param {string} [data.hospitalId] 就诊医院 ID，雪花 ID 字符串
 * @param {string} [data.departmentId] 就诊科室 ID，雪花 ID 字符串
 * @param {string} data.surgeryType 手术名称（必填，服务层校验）
 * @param {string} data.doctorId 主治医生 ID（dict_doctor.id，雪花 ID 字符串，必填，医患关系来源）
 * @param {string} [data.diseaseIntro] 病症简单介绍
 * @param {string} [data.bindToken] 微信新用户注册绑定令牌（wx-login 返回；纯短信注册不带）
 * @returns {Promise<Object>} AuthResponse：新患者的 token/refreshToken/user，可能附带 needRegister/bindToken
 */
export function registerPatient(data) {
  const payload = { ...data }
  // 雪花 ID 统一按字符串上送，避免超长整数精度丢失
  for (const idKey of ['doctorId', 'hospitalId', 'departmentId']) {
    if (payload[idKey] !== undefined && payload[idKey] !== null) {
      payload[idKey] = String(payload[idKey])
    }
  }
  return http.post('/auth/register', payload, { skipAuth: true })
}

/**
 * 发送短信验证码（公开接口，同一手机号 60 秒限频，仅需 phone 无 scene 字段）
 * 路径：POST /auth/sms-code
 * @param {Object} data 请求体
 * @param {string} data.phone 手机号（必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；限频/号码错误走 code=400
 */
export function sendSmsCode(data) {
  return http.post('/auth/sms-code', data, { skipAuth: true })
}

/**
 * 患者手机号验证码登录（公开接口）
 * 路径：POST /auth/sms-login
 * @param {Object} data 登录凭证
 * @param {string} data.phone 手机号（必填）
 * @param {string} data.code 短信验证码（必填）
 * @returns {Promise<Object>} AuthResponse：token/refreshToken 与患者 user
 */
export function loginBySms(data) {
  return http.post('/auth/sms-login', data, { skipAuth: true })
}

/**
 * 微信一键登录（公开接口，患者端；code 走 query 参数）
 * 路径：POST /auth/wx-login?code=xxx
 * @param {string} code 小程序 wx.login() 返回的临时登录凭证 code（必填）
 * @returns {Promise<Object>} AuthResponse：已绑定则直接返回 token/refreshToken/user；
 *   未绑定用户返回 needRegister=true 与 bindToken，配合 registerPatient 完成注册绑定
 */
export function loginByWx(code) {
  return http.post('/auth/wx-login', undefined, { params: { code }, skipAuth: true })
}

/* -------------------------------------------------------------------------- */
/*  令牌、会话与密码                                                           */
/* -------------------------------------------------------------------------- */

/**
 * 刷新令牌（公开接口，refreshToken 走 query；封装层 401 静默刷新也会调用同一路径）
 * 路径：POST /auth/refresh?refreshToken=xxx
 * @param {string} refreshToken 刷新令牌（必填，旋转策略：用一次即失效）
 * @returns {Promise<Object>} AuthResponse：新的 token/refreshToken 与 user
 */
export function refreshToken(refreshToken) {
  return http.post('/auth/refresh', undefined, { params: { refreshToken }, skipAuth: true })
}

/**
 * 登出（JWT 接口，注销本设备的 refresh token，access token 由前端清理）
 * 路径：POST /auth/logout?refreshToken=xxx
 * @param {string} [refreshToken] 待注销的刷新令牌；不传则仅依赖 access token 登出
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function logout(refreshToken) {
  return http.post('/auth/logout', undefined, { params: { refreshToken } })
}

/**
 * 获取当前登录用户信息（JWT 接口，刷新页面恢复会话用，不要改为重新登录）
 * 路径：GET /auth/me
 * @returns {Promise<Object>} LoginUser：userId（雪花 ID 字符串）、username、role（基础架构枚举
 *   ADMIN/HOSPITAL_ADMIN/CS/CAREGIVER/DOCTOR/PATIENT）、roleCode（动态角色）、roleName、terminal、
 *   permissions[] 权限码、dataScope、scopeJson、hospitalId/departmentId/doctorDictId（雪花 ID 字符串）、
 *   deptScope（HOSPITAL/DEPT）、roles[] 可选角色、isRegistered
 */
export function getCurrentUser() {
  return http.get('/auth/me')
}

/**
 * 获取 dev 免登静态 token（公开接口，仅 dev profile 生效，生产环境返回 404）
 * 路径：GET /auth/dev-tokens
 * @returns {Promise<Object>} 角色 key 到静态 JWT 的映射，含 admin/hospital/cs/station/doctor/patient
 *   等 key（以实际环境返回为准）；token 为真实 JWT，权限与正常登录一致，服务重启会重新签发
 */
export function getDevTokens() {
  return http.get('/auth/dev-tokens', undefined, { skipAuth: true })
}

/**
 * 修改自己的密码（JWT 接口，员工/患者共用）
 * 路径：PUT /auth/password
 * @param {Object} data 密码变更
 * @param {string} [data.oldPassword] 原密码；患者首次设置账密时可省略，其余情况必填
 * @param {string} data.newPassword 新密码（必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function changePassword(data) {
  return http.put('/auth/password', data)
}

/* -------------------------------------------------------------------------- */
/*  系统设定、账号日志与安全选项                                                */
/* -------------------------------------------------------------------------- */

/**
 * 获取当前用户系统设定（JWT 接口，骨架占位）
 * 路径：GET /me/settings
 * @returns {Promise<Object>} MeSettings：fontSize 字体设置（当前仅 normal）
 */
export function getMeSettings() {
  return http.get('/me/settings')
}

/**
 * 更新当前用户系统设定（JWT 接口，骨架占位）
 * 路径：PUT /me/settings
 * @param {Object} data 设定内容，如 { fontSize: 'normal' }
 * @param {string} [data.fontSize] 字体设置
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateMeSettings(data) {
  return http.put('/me/settings', data)
}

/**
 * 分页查询登录日志（JWT 接口，公司管理）
 * 路径：GET /accounts/login-logs
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<SysLoginLog>：{ list, total, page, pageSize }；
 *   list 元素含 id/userId（雪花 ID 字符串）、username、loginType（password/sms/wx）、ip、location、
 *   device、status（1 成功 0 失败）、failReason、createTime（yyyy-MM-dd HH:mm:ss）
 */
export function getLoginLogs(params = {}) {
  return http.get('/accounts/login-logs', params)
}

/**
 * 分页查询操作日志（JWT 接口，公司管理）
 * 路径：GET /accounts/operation-logs
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<SysOperationLog>：{ list, total, page, pageSize }；
 *   list 元素含 id/userId（雪花 ID 字符串）、username、module、operationType、description、
 *   method、uri、ip、costMs（耗时毫秒）、status、createTime（yyyy-MM-dd HH:mm:ss）
 */
export function getOperationLogs(params = {}) {
  return http.get('/accounts/operation-logs', params)
}

/**
 * 更新安全选项（JWT 接口，骨架占位）
 * 路径：PUT /accounts/security
 * @param {Object} data 安全配置，如 { sessionTimeoutMinutes: 30, passwordExpireDays: 90 }
 * @param {number} [data.sessionTimeoutMinutes] 会话超时分钟数
 * @param {number} [data.passwordExpireDays] 密码过期天数
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateAccountSecurity(data) {
  return http.put('/accounts/security', data)
}

export default {
  pcLogin,
  selectPcRole,
  switchPcRole,
  doctorSmsLogin,
  loginByPassword,
  registerPatient,
  sendSmsCode,
  loginBySms,
  loginByWx,
  refreshToken,
  logout,
  getCurrentUser,
  getDevTokens,
  changePassword,
  getMeSettings,
  updateMeSettings,
  getLoginLogs,
  getOperationLogs,
  updateAccountSecurity
}
