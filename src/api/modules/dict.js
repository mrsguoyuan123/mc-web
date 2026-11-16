/**
 * 机构与字典模块接口（api/swagger.json 中 tag = dict 的全部接口，共 27 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如医院/院区/科室/医生/标签 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id、query 的 hospitalId/areaId/departmentId、请求体内各 id 字段）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 后缀
 * - 字典资源统一加 Dict 前缀（如 getDictHospitalById），避免与业务模块同名函数冲突
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
/*  机构概览与级联下拉包                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 机构概览统计（JWT 接口）
 * 路径：GET /dict/overview
 * 无请求参数
 * @returns {Promise<Object>} DictOverview：{ hospitalCount 医院数, departmentCount 科室数,
 *   doctorCount 医生数, provinceCount 覆盖省份数 }，计数值为整数
 */
export function getDictOverview() {
  return http.get('/dict/overview')
}

/**
 * 级联下拉包（JWT 接口，医院/院区/科室/医生/标签一次性拉取，仅返回启用中数据）
 * 路径：GET /dict/options
 * 无请求参数
 * @returns {Promise<Object>} DictOptions：{ hospitals DictHospital[], areas DictArea[],
 *   departments DictDepartment[], doctors DictDoctor[], tags DictTag[] }，各数组元素内 id 均为雪花 ID 字符串
 */
export function getDictOptions() {
  return http.get('/dict/options')
}

/* -------------------------------------------------------------------------- */
/*  医院字典                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询医院字典（JWT 接口）
 * 路径：GET /dict/hospitals
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 名称/地址/电话模糊关键字
 * @param {string} [params.level] 医院等级，枚举：三甲 / 二甲 / 三乙 / 二乙 / 一甲 / 专科
 * @param {string} [params.type] 医院类型，枚举：综合 / 专科 / 中医 / 妇幼保健院
 * @param {number} [params.status] 状态：1 启用 / 0 停用
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DictHospital>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、level、type、province、city、address、phone、
 *   description、status（1 启 0 停）
 */
export function getDictHospitalPage(params = {}) {
  return http.get('/dict/hospitals', params)
}

/**
 * 新增医院（JWT 接口，公司管理）
 * 路径：POST /dict/hospitals
 * @param {Object} data 医院内容（DictHospital）
 * @param {string} data.name 医院名称（必填）
 * @param {string} [data.level] 等级，枚举：三甲 / 二甲 / 三乙 / 二乙 / 一甲 / 专科
 * @param {string} [data.type] 类型，枚举：综合 / 专科 / 中医 / 妇幼保健院
 * @param {string} [data.province] 省份
 * @param {string} [data.city] 城市
 * @param {string} [data.address] 详细地址
 * @param {string} [data.phone] 联系电话
 * @param {string} [data.description] 简介
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createDictHospital(data) {
  return http.post('/dict/hospitals', data)
}

/**
 * 获取医院详情（JWT 接口）
 * 路径：GET /dict/hospitals/{id}
 * @param {string} id 医院 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DictHospital：id（字符串）、name、level、type、province、city、
 *   address、phone、description、status
 */
export function getDictHospitalById(id) {
  return http.get(`/dict/hospitals/${encodeURIComponent(String(id))}`)
}

/**
 * 修改医院（JWT 接口，公司管理）
 * 路径：PUT /dict/hospitals/{id}
 * @param {string} id 医院 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 医院内容（DictHospital，字段同 createDictHospital，name 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDictHospitalById(id, data) {
  return http.put(`/dict/hospitals/${encodeURIComponent(String(id))}`, data)
}

/**
 * 删除医院（JWT 接口，公司管理；被院区/科室等引用时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /dict/hospitals/{id}
 * @param {string} id 医院 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteDictHospitalById(id) {
  return http.delete(`/dict/hospitals/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  院区字典                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询院区（JWT 接口）
 * 路径：GET /dict/areas/page
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.hospitalId] 所属医院 ID，雪花 ID 字符串
 * @param {string} [params.keyword] 院区名称模糊关键字
 * @param {number} [params.status] 状态：1 启用 / 0 停用
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DictArea>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、hospitalId（字符串）、address、phone、
 *   bedCount、description、status（1 启 0 停）
 */
export function getDictAreaPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId'])
  return http.get('/dict/areas/page', query)
}

/**
 * 查询院区列表（JWT 接口，不分页，常用于下拉）
 * 路径：GET /dict/areas
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；不传则返回全部院区
 * @returns {Promise<Array<Object>>} DictArea 数组，元素含 id/hospitalId（均为雪花 ID 字符串）、
 *   name、address、phone、bedCount、description、status
 */
export function getDictAreaList(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId'])
  return http.get('/dict/areas', query)
}

/**
 * 新增院区（JWT 接口，公司管理）
 * 路径：POST /dict/areas
 * @param {Object} data 院区内容（DictArea）
 * @param {string} data.name 院区名称（必填）
 * @param {string} data.hospitalId 所属医院 ID（必填，雪花 ID 字符串）
 * @param {string} [data.address] 院区地址
 * @param {string} [data.phone] 联系电话
 * @param {number} [data.bedCount] 床位数
 * @param {string} [data.description] 简介
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createDictArea(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId'])
  return http.post('/dict/areas', payload)
}

/**
 * 获取院区详情（JWT 接口）
 * 路径：GET /dict/areas/{id}
 * @param {string} id 院区 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DictArea：id（字符串）、name、hospitalId（字符串）、address、
 *   phone、bedCount、description、status
 */
export function getDictAreaById(id) {
  return http.get(`/dict/areas/${encodeURIComponent(String(id))}`)
}

/**
 * 修改院区（JWT 接口，公司管理）
 * 路径：PUT /dict/areas/{id}
 * @param {string} id 院区 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 院区内容（DictArea，字段同 createDictArea，name/hospitalId 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDictAreaById(id, data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId'])
  return http.put(`/dict/areas/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除院区（JWT 接口，公司管理；被科室等引用时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /dict/areas/{id}
 * @param {string} id 院区 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteDictAreaById(id) {
  return http.delete(`/dict/areas/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  科室字典                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询科室（JWT 接口）
 * 路径：GET /dict/departments/page
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 科室名称模糊关键字
 * @param {string} [params.category] 科室类别，枚举：内科 / 外科 / 妇产科 / 儿科 / 其他
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.areaId] 院区 ID，雪花 ID 字符串
 * @param {number} [params.status] 状态：1 启用 / 0 停用
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DictDepartment>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、category、hospitalId/areaId（字符串）、headDoctor、
 *   doctorCount、bedCount、phone、description、status
 */
export function getDictDepartmentPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'areaId'])
  return http.get('/dict/departments/page', query)
}

/**
 * 查询科室列表（JWT 接口，不分页，常用于级联下拉）
 * 路径：GET /dict/departments
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.areaId] 院区 ID，雪花 ID 字符串
 * @returns {Promise<Array<Object>>} DictDepartment 数组，元素含 id/hospitalId/areaId（均为雪花 ID 字符串）、
 *   name、category（内科/外科/妇产科/儿科/其他）、headDoctor、doctorCount、bedCount、phone、status
 */
export function getDictDepartmentList(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'areaId'])
  return http.get('/dict/departments', query)
}

/**
 * 新增科室（JWT 接口，公司管理）
 * 路径：POST /dict/departments
 * @param {Object} data 科室内容（DictDepartment）
 * @param {string} data.name 科室名称（必填）
 * @param {string} data.hospitalId 所属医院 ID（必填，雪花 ID 字符串）
 * @param {string} [data.category] 类别，枚举：内科 / 外科 / 妇产科 / 儿科 / 其他
 * @param {string} [data.areaId] 所属院区 ID，雪花 ID 字符串
 * @param {string} [data.headDoctor] 科室负责人
 * @param {number} [data.doctorCount] 医生人数
 * @param {number} [data.bedCount] 床位数
 * @param {string} [data.phone] 联系电话
 * @param {string} [data.description] 简介
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createDictDepartment(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId'])
  return http.post('/dict/departments', payload)
}

/**
 * 获取科室详情（JWT 接口）
 * 路径：GET /dict/departments/{id}
 * @param {string} id 科室 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DictDepartment：id（字符串）、name、category、hospitalId/areaId（字符串）、
 *   headDoctor、doctorCount、bedCount、phone、description、status
 */
export function getDictDepartmentById(id) {
  return http.get(`/dict/departments/${encodeURIComponent(String(id))}`)
}

/**
 * 修改科室（JWT 接口，公司管理）
 * 路径：PUT /dict/departments/{id}
 * @param {string} id 科室 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 科室内容（DictDepartment，字段同 createDictDepartment，name/hospitalId 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDictDepartmentById(id, data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId'])
  return http.put(`/dict/departments/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除科室（JWT 接口，公司管理；被医生等引用时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /dict/departments/{id}
 * @param {string} id 科室 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteDictDepartmentById(id) {
  return http.delete(`/dict/departments/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  医生库字典（无账号，区别于 staff 员工账号）                                  */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询医生库列表（JWT 接口，字典数据，医生本身无登录账号）
 * 路径：GET /dict/doctors
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.keyword] 姓名模糊关键字
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DictDoctor>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、gender、title（主任医师/副主任医师/主治医师/住院医师）、
 *   hospitalId/areaId/departmentId/managerId（字符串）、phone（必填且唯一）、introduction、specialty、
 *   email、idCard、certNumber 医师资格证号、practiceNumber 执业证号、education、graduateSchool、workYears、
 *   avatar、expertiseJson 擅长领域 JSON、doctorStatus（ACTIVE 在职/SUSPENDED 停诊/RESIGNED 离职/CANCELLED 注销）、
 *   statusReason、statusChangedAt、entrySource（ADMIN/STATION/IMPORT）、entryUserId（字符串）、entryTime、status
 */
export function getDictDoctorPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'departmentId'])
  return http.get('/dict/doctors', query)
}

/**
 * 新增医生（JWT 接口，公司管理；手机号必填且唯一）
 * 路径：POST /dict/doctors
 * @param {Object} data 医生内容（DictDoctor）
 * @param {string} data.name 姓名（必填）
 * @param {string} data.phone 手机号（必填，全局唯一）
 * @param {string} [data.gender] 性别
 * @param {string} [data.title] 职称，枚举：主任医师 / 副主任医师 / 主治医师 / 住院医师
 * @param {string} [data.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [data.areaId] 院区 ID，雪花 ID 字符串
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.introduction] 个人简介
 * @param {string} [data.specialty] 专长
 * @param {string} [data.email] 邮箱
 * @param {string} [data.idCard] 身份证号
 * @param {string} [data.certNumber] 医师资格证号
 * @param {string} [data.practiceNumber] 执业证号
 * @param {string} [data.education] 学历
 * @param {string} [data.graduateSchool] 毕业院校
 * @param {number} [data.workYears] 从业年限
 * @param {string} [data.avatar] 头像 URL
 * @param {string} [data.expertiseJson] 擅长领域 JSON 数组字符串
 * @param {string} [data.managerId] 上级医生 ID，雪花 ID 字符串
 * @param {string} [data.doctorStatus] 执业状态，枚举：ACTIVE / SUSPENDED / RESIGNED / CANCELLED
 * @param {string} [data.entrySource] 录入来源，枚举：ADMIN 后台录入 / STATION 驻点录入 / IMPORT 导入
 * @param {number} [data.status] 启用状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createDictDoctor(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId', 'departmentId', 'managerId', 'entryUserId'])
  return http.post('/dict/doctors', payload)
}

/**
 * 修改医生（JWT 接口，公司管理）
 * 路径：PUT /dict/doctors/{id}
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 医生内容（DictDoctor，字段同 createDictDoctor，name/phone 必填；内嵌 id 字段按字符串传入）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDictDoctorById(id, data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId', 'departmentId', 'managerId', 'entryUserId'])
  return http.put(`/dict/doctors/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除医生（JWT 接口，公司管理；被医患关系等引用时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /dict/doctors/{id}
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteDictDoctorById(id) {
  return http.delete(`/dict/doctors/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  患者标签字典（动态枚举）                                                     */
/* -------------------------------------------------------------------------- */

/**
 * 查询患者标签列表（JWT 接口，动态枚举，不分页）
 * 路径：GET /dict/tags
 * 无请求参数
 * @returns {Promise<Array<Object>>} DictTag 数组，元素含 id（雪花 ID 字符串）、name 标签名、
 *   color 颜色、sortNo 排序号、status（1 启 0 停）
 */
export function getDictTagList() {
  return http.get('/dict/tags')
}

/**
 * 新增标签（JWT 接口，公司管理）
 * 路径：POST /dict/tags
 * @param {Object} data 标签内容（DictTag）
 * @param {string} [data.name] 标签名
 * @param {string} [data.color] 标签颜色（色值/主题名）
 * @param {number} [data.sortNo] 排序号
 * @param {number} [data.status] 状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createDictTag(data) {
  return http.post('/dict/tags', data)
}

/**
 * 修改标签（JWT 接口，公司管理）
 * 路径：PUT /dict/tags/{id}
 * @param {string} id 标签 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 标签内容（DictTag，字段同 createDictTag）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDictTagById(id, data) {
  return http.put(`/dict/tags/${encodeURIComponent(String(id))}`, data)
}

/**
 * 删除标签（JWT 接口，公司管理；被患者引用时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /dict/tags/{id}
 * @param {string} id 标签 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteDictTagById(id) {
  return http.delete(`/dict/tags/${encodeURIComponent(String(id))}`)
}

export default {
  getDictOverview,
  getDictOptions,
  getDictHospitalPage,
  createDictHospital,
  getDictHospitalById,
  updateDictHospitalById,
  deleteDictHospitalById,
  getDictAreaPage,
  getDictAreaList,
  createDictArea,
  getDictAreaById,
  updateDictAreaById,
  deleteDictAreaById,
  getDictDepartmentPage,
  getDictDepartmentList,
  createDictDepartment,
  getDictDepartmentById,
  updateDictDepartmentById,
  deleteDictDepartmentById,
  getDictDoctorPage,
  createDictDoctor,
  updateDictDoctorById,
  deleteDictDoctorById,
  getDictTagList,
  createDictTag,
  updateDictTagById,
  deleteDictTagById
}
