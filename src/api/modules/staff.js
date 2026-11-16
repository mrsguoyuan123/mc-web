/**
 * 员工管理模块接口（api/swagger.json 中 tag = staff 的全部接口，共 13 个，含人员管理/排班/绩效两个同名分组）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如员工 id/角色 id/排班 id/doctorDictId）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id、query 的 roleId/staffId、请求体内各 id 字段）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById / resetXxxById 等 ById 后缀
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

/* -------------------------------------------------------------------------- */
/*  员工分页与增删改查                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询员工列表（JWT 接口，支持多角色/人员类型筛选）
 * 路径：GET /staff
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 姓名/用户名/手机号模糊关键字
 * @param {string} [params.roleId] 动态角色 ID，雪花 ID 字符串
 * @param {string} [params.personType] 人员类型，枚举：CS 客服 / CAREGIVER 陪诊师 / GENERAL 综合 / DOCTOR 医生
 * @param {number} [params.status] 账号状态：1 启用 / 0 停用
 * @param {string} [params.role] 兼容旧参数：主角色 base_role 枚举（新逻辑优先用 roleId）
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<StaffView>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、username、name、phone、personType、levelOrArea、email、avatar、
 *   employeeNo、department、jobTitle、joinDate（yyyy-MM-dd）、status、doctorDictId（字符串）、
 *   role 主角色、lastLoginAt、roleAssignments 角色分配数组（roleId/hospitalId/departmentId 均为字符串）
 */
export function getStaffPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['roleId'])
  return http.get('/staff', query)
}

/**
 * 新增员工（JWT 接口，支持多角色；密码为空时服务端默认 123456）
 * 路径：POST /staff
 * @param {Object} data 员工内容（StaffRequest）
 * @param {string} data.username 登录用户名（必填）
 * @param {string} data.name 姓名（必填）
 * @param {string} data.phone 手机号（必填）
 * @param {string} [data.password] 初始密码；新增留空默认 123456，编辑场景该字段被忽略
 * @param {string} [data.personType] 人员类型，枚举：CS / CAREGIVER / GENERAL / DOCTOR
 * @param {string} [data.levelOrArea] 层级或院区
 * @param {string} [data.email] 邮箱
 * @param {string} [data.avatar] 头像 URL
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @param {string} [data.doctorDictId] 医生库 ID，雪花 ID 字符串；personType=DOCTOR 时必填
 * @param {string} [data.role] 兼容旧接口的单角色 base_role 枚举（roleAssignments 为空时兜底）
 * @param {string} [data.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.deptScope] 科室范围，枚举：HOSPITAL 医院级 / DEPT 科室级
 * @param {string} [data.scopeJson] 自定义数据范围 JSON 字符串
 * @param {Array<Object>} [data.roleAssignments] 多角色分配，元素结构 RoleAssignmentRequest：
 *   - roleId 动态角色 ID（必填，雪花 ID 字符串）
 *   - hospitalId/departmentId 医院/科室 ID（选填，雪花 ID 字符串）
 *   - deptScope 范围 HOSPITAL/DEPT（选填）、scopeJson 自定义范围 JSON（选填）
 * @returns {Promise<string>} 新建员工 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createStaff(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['doctorDictId', 'hospitalId', 'departmentId'])
  if (Array.isArray(payload.roleAssignments)) {
    payload.roleAssignments = payload.roleAssignments.map((item) => stringifyIdFields({ ...item }, ['roleId', 'hospitalId', 'departmentId']))
  }
  return http.post('/staff', payload)
}

/**
 * 获取员工详情（JWT 接口）
 * 路径：GET /staff/{id}
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} StaffView：id（字符串）、username、name、phone、personType、levelOrArea、
 *   email、avatar、employeeNo、department、jobTitle、joinDate、status、doctorDictId（字符串）、
 *   role 主角色、lastLoginAt、roleAssignments 角色分配（含 roleCode/roleName/baseRole/primaryFlag 等）
 */
export function getStaffById(id) {
  return http.get(`/staff/${encodeURIComponent(String(id))}`)
}

/**
 * 修改员工（JWT 接口，全量更新白名单字段；密码不在此处理，需调用 resetStaffPasswordById 单独重置）
 * 路径：PUT /staff/{id}
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 员工内容（StaffRequest，字段同 createStaff，username/name/phone 必填；password 被忽略）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateStaffById(id, data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['doctorDictId', 'hospitalId', 'departmentId'])
  if (Array.isArray(payload.roleAssignments)) {
    payload.roleAssignments = payload.roleAssignments.map((item) => stringifyIdFields({ ...item }, ['roleId', 'hospitalId', 'departmentId']))
  }
  return http.put(`/staff/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 启用/停用员工账号（JWT 接口，请求体为裸整数）
 * 路径：PUT /staff/{id}/status
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateStaffStatusById(id, status) {
  return http.put(`/staff/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * 重置员工密码（JWT 接口，请求体为 JSON 字符串，即对新密码再做一次 JSON 序列化）
 * 路径：PUT /staff/{id}/password
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} newPassword 新密码（明文字符串，封装层会 JSON.stringify 成 "xxx" 上送）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function resetStaffPasswordById(id, newPassword) {
  return http.put(`/staff/${encodeURIComponent(String(id))}/password`, newPassword)
}

/**
 * 全量替换员工角色（JWT 接口，按传入数组整体覆盖，未传的角色绑定会被移除）
 * 路径：PUT /staff/{id}/roles
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Array<Object>} roleAssignments 角色分配数组（RoleAssignmentRequest），元素结构：
 *   - roleId 动态角色 ID（必填，雪花 ID 字符串）
 *   - hospitalId/departmentId 医院/科室 ID（选填，雪花 ID 字符串）
 *   - deptScope 范围 HOSPITAL/DEPT（选填）、scopeJson 自定义范围 JSON（选填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function replaceStaffRolesById(id, roleAssignments) {
  const assignments = (roleAssignments || []).map((item) =>
    stringifyIdFields({ ...item }, ['roleId', 'hospitalId', 'departmentId'])
  )
  return http.put(`/staff/${encodeURIComponent(String(id))}/roles`, assignments)
}

/**
 * 获取员工负载（JWT 接口，用于客服/陪诊师分配参考）
 * 路径：GET /staff/{id}/workload
 * @param {string} id 员工 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} { userCount 负责用户数, conversationCount 会话数, latestCommunicationAt 最近沟通时间 }
 */
export function getStaffWorkloadById(id) {
  return http.get(`/staff/${encodeURIComponent(String(id))}/workload`)
}

/* -------------------------------------------------------------------------- */
/*  客服排班                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 查询客服排班（JWT 接口，按客服与日期区间过滤）
 * 路径：GET /staff/schedules
 * @param {Object} [params] 查询参数
 * @param {string} [params.staffId] 客服 ID，雪花 ID 字符串；不传则查全部
 * @param {string} [params.from] 起始日期，格式 yyyy-MM-dd
 * @param {string} [params.to] 结束日期，格式 yyyy-MM-dd
 * @returns {Promise<Array<Object>>} StaffSchedule 数组，元素含 id（排班 ID，雪花 ID 字符串）、
 *   staffId（客服 ID，字符串）、workDate（yyyy-MM-dd）、shift 班次（MORNING 上午/AFTERNOON 下午/FULL 全天）
 */
export function getStaffSchedules(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['staffId'])
  return http.get('/staff/schedules', query)
}

/**
 * 新增排班（JWT 接口）
 * 路径：POST /staff/schedules
 * @param {Object} data 排班内容（StaffSchedule）
 * @param {string} data.staffId 客服 ID（必填，雪花 ID 字符串）
 * @param {string} data.workDate 排班日期（必填，格式 yyyy-MM-dd）
 * @param {string} data.shift 班次（必填），枚举：MORNING 上午 / AFTERNOON 下午 / FULL 全天
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createStaffSchedule(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['staffId'])
  return http.post('/staff/schedules', payload)
}

/**
 * 删除排班（JWT 接口）
 * 路径：DELETE /staff/schedules/{id}
 * @param {string} id 排班 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteStaffScheduleById(id) {
  return http.delete(`/staff/schedules/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  绩效与效能看板（骨架占位）                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 客服绩效（JWT 接口，骨架占位：答复率/响应时间/满意度等当前为 TODO 占位值）
 * 路径：GET /staff/performance
 * 无请求参数
 * @returns {Promise<Array<Object>>} StaffPerformance 数组，元素含 csId（雪花 ID 字符串）、csName、level、
 *   replyRate 答复率、avgResponseSeconds 平均响应秒数、satisfaction 满意度、messageCount 消息数、grade 评级；
 *   除 csId/csName/level 外多为占位字符串，UI 上建议标注“占位未实现”
 */
export function getStaffPerformance() {
  return http.get('/staff/performance')
}

/**
 * 医院效能看板（JWT 接口，骨架 TODO，当前仅返回占位信息）
 * 路径：GET /assessment/hospital-dashboard
 * 无请求参数
 * @returns {Promise<Object>} 当前返回 { todo: string } 占位对象，后续由服务端补充真实指标
 */
export function getHospitalDashboard() {
  return http.get('/assessment/hospital-dashboard')
}

export default {
  getStaffPage,
  createStaff,
  getStaffById,
  updateStaffById,
  updateStaffStatusById,
  resetStaffPasswordById,
  replaceStaffRolesById,
  getStaffWorkloadById,
  getStaffSchedules,
  createStaffSchedule,
  deleteStaffScheduleById,
  getStaffPerformance,
  getHospitalDashboard
}
