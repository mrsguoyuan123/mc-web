/**
 * 动态角色与权限模块接口（api/swagger.json 中 tag = rbac 的全部接口，共 13 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如角色 id/权限节点 id/账号 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById / copyXxxById 等 ById 后缀
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  角色分页与增删改查                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询角色列表（JWT 接口）
 * 路径：GET /roles
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 名称/编码模糊关键字
 * @param {string} [params.terminal] 终端，枚举：PC / MOBILE / ALL
 * @param {number} [params.status] 状态：1 启用 / 0 停用
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<SysRole>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、code、name、terminal、baseRole、dataScope
 *   （ALL/HOSPITAL/DEPARTMENT/STATION/SELF/CUSTOM）、scopeJson、status（1 启 0 停）、
 *   system（1 系统内置）、sortNo、description、createTime、updateTime
 */
export function getRolePage(params = {}) {
  return http.get('/roles', params)
}

/**
 * 新增角色（JWT 接口）
 * 路径：POST /roles
 * @param {Object} data 角色内容（RoleRequest）
 * @param {string} data.code 角色编码（必填，唯一）
 * @param {string} data.name 角色名称（必填）
 * @param {string} [data.terminal] 终端，枚举：PC / MOBILE / ALL
 * @param {string} data.baseRole 基础架构角色（必填），枚举：
 *   ADMIN / HOSPITAL_ADMIN / DEPT_ADMIN / CS / CAREGIVER / DOCTOR / DASHBOARD
 * @param {string} [data.dataScope] 数据范围，枚举：ALL / HOSPITAL / DEPARTMENT / STATION / SELF / CUSTOM
 * @param {string} [data.scopeJson] 自定义数据范围 JSON 字符串（dataScope=CUSTOM 时使用）
 * @param {number} [data.sortNo] 排序号
 * @param {string} [data.description] 角色描述
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @param {string[]} [data.permissionCodes] 权限码列表，全量替换该角色权限
 * @returns {Promise<string>} 新建角色 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createRole(data) {
  return http.post('/roles', data)
}

/**
 * 获取角色详情（JWT 接口）
 * 路径：GET /roles/{id}
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} SysRole：id（字符串）、code、name、terminal、baseRole、dataScope、
 *   scopeJson、status（1 启 0 停）、system（1 系统内置）、sortNo、description、createTime、updateTime
 */
export function getRoleById(id) {
  return http.get(`/roles/${encodeURIComponent(String(id))}`)
}

/**
 * 编辑角色（JWT 接口，全量更新；系统内置角色的部分字段可能被服务端限制）
 * 路径：PUT /roles/{id}
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 角色内容（RoleRequest，字段同 createRole，code/name/baseRole 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateRoleById(id, data) {
  return http.put(`/roles/${encodeURIComponent(String(id))}`, data)
}

/**
 * 删除角色（JWT 接口；系统内置角色或仍有关联账号的角色会被拒绝，返回 code=400）
 * 路径：DELETE /roles/{id}
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteRoleById(id) {
  return http.delete(`/roles/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  角色复制与启停                                                              */
/* -------------------------------------------------------------------------- */

/**
 * 复制角色（JWT 接口，基于现有角色克隆权限与配置生成新角色）
 * 路径：POST /roles/{id}/copy
 * @param {string} id 源角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 新角色标识
 * @param {string} data.name 新角色名称（必填）
 * @param {string} data.code 新角色编码（必填，唯一）
 * @returns {Promise<string>} 新角色 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function copyRoleById(id, data) {
  return http.post(`/roles/${encodeURIComponent(String(id))}/copy`, data)
}

/**
 * 启用/停用角色（JWT 接口，请求体为裸整数）
 * 路径：PUT /roles/{id}/status
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateRoleStatusById(id, status) {
  return http.put(`/roles/${encodeURIComponent(String(id))}/status`, status)
}

/* -------------------------------------------------------------------------- */
/*  角色权限与权限树                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 获取角色已授权限码（JWT 接口）
 * 路径：GET /roles/{id}/permissions
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<string[]>} 权限码字符串数组，如 ['menu:dashboard', 'patient:view']；未授权时为空数组
 */
export function getRolePermissionsById(id) {
  return http.get(`/roles/${encodeURIComponent(String(id))}/permissions`)
}

/**
 * 全量保存角色权限（JWT 接口，按传入权限码整体覆盖，不传的权限会被收回）
 * 路径：PUT /roles/{id}/permissions
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string[]} permissionCodes 权限码数组，内部包装为 { permissionCodes: [...] } 上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateRolePermissionsById(id, permissionCodes) {
  return http.put(`/roles/${encodeURIComponent(String(id))}/permissions`, { permissionCodes })
}

/**
 * 获取权限树（JWT 接口，分组 → 权限项的树形结构，供菜单/按钮授权勾选）
 * 路径：GET /permissions/tree
 * 无请求参数
 * @returns {Promise<Array<Object>>} PermissionNode 数组（树形），节点含：
 *   id（雪花 ID 字符串）、code 权限码、name 名称、type（GROUP/MENU/PAGE/BUTTON/API）、
 *   parentId（父节点 ID，字符串）、groupCode 分组编码、sortNo 排序号、children 子节点数组（递归）
 */
export function getPermissionTree() {
  return http.get('/permissions/tree')
}

/* -------------------------------------------------------------------------- */
/*  角色数据范围                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 获取角色数据范围（JWT 接口）
 * 路径：GET /roles/{id}/data-scope
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} { dataScope, scopeJson }：
 *   dataScope 范围枚举 ALL/HOSPITAL/DEPARTMENT/STATION/SELF/CUSTOM；
 *   scopeJson 自定义范围 JSON 字符串（仅 CUSTOM 时有实质内容，描述可见医院/科室等范围）
 */
export function getRoleDataScopeById(id) {
  return http.get(`/roles/${encodeURIComponent(String(id))}/data-scope`)
}

/**
 * 保存角色数据范围（JWT 接口）
 * 路径：PUT /roles/{id}/data-scope
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 范围配置
 * @param {string} data.dataScope 数据范围，枚举：ALL / HOSPITAL / DEPARTMENT / STATION / SELF / CUSTOM
 * @param {string} [data.scopeJson] 自定义范围 JSON 字符串，dataScope=CUSTOM 时携带，范围 ID 在 JSON 内按字符串处理
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateRoleDataScopeById(id, data) {
  return http.put(`/roles/${encodeURIComponent(String(id))}/data-scope`, data)
}

/* -------------------------------------------------------------------------- */
/*  角色关联账号                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询角色关联账号（JWT 接口）
 * 路径：GET /roles/{id}/accounts
 * @param {string} id 角色 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<RoleAccountView>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name 姓名、username 登录名、phone 手机号、
 *   personType 人员类型（CS/CAREGIVER/GENERAL/DOCTOR）、levelOrArea 层级或院区、status（1 启 0 停）
 */
export function getRoleAccountsById(id, params = {}) {
  return http.get(`/roles/${encodeURIComponent(String(id))}/accounts`, params)
}

export default {
  getRolePage,
  createRole,
  getRoleById,
  updateRoleById,
  deleteRoleById,
  copyRoleById,
  updateRoleStatusById,
  getRolePermissionsById,
  updateRolePermissionsById,
  getPermissionTree,
  getRoleDataScopeById,
  updateRoleDataScopeById,
  getRoleAccountsById
}
