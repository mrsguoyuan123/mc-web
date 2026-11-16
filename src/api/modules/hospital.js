/**
 * 医院视角患者模块接口（api/swagger.json 中 tag = hospital 的全部接口，共 3 个，全部为只读 GET）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如患者 id、hospitalId/departmentId/doctorId 等）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number
 * - 请求 query 中的 hospitalId/departmentId 内部统一 String() 归一化；服务端会按当前登录人权限覆盖越权医院参数
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 * - 数据范围由服务端强制：医院权限可看全院并按科室筛选，科室权限仅能看本科室数据
 *
 * 命名规范：查询用 get + 资源名；路径含 {id} 的健康详情接口使用 getXxxById 后缀
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
 * 分页查询医院患者列表（JWT 接口；医院权限=全部科室可筛选，科室权限=仅本科室，越权医院 ID 被服务端覆盖）
 * 路径：GET /hospital/patients
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.keyword] 关键词，匹配姓名 / 手机号
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；服务端按当前用户权限强制覆盖
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.healthStatus] 健康状态筛选，枚举：良好 / 关注 / 警告
 * @param {string} [params.tag] 患者标签筛选
 * @param {number} [params.page=1] 页码，从 1 开始，默认 1
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultPatient：{ list, total, page, pageSize }；
 *   list 元素 Patient 含 id/hospitalId/departmentId/doctorId/areaId 等雪花 ID 字符串、name、gender（男/女）、age、
 *   phone、idCard、region、surgeryType、surgeryDate（yyyy-MM-dd）、healthStatus（良好/关注/警告）、
 *   communicateStatus（PENDING/FOLLOWED/FOLLOW_UP/PURCHASED）、purchaseIntent、tagsJson、registerDate 等
 */
export function getHospitalPatientPage(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/hospital/patients', query)
}

/**
 * 查询患者健康详情（JWT 接口，医院/科室工作台查看单患者的健康数据汇总）
 * 路径：GET /hospital/patients/{id}/health-detail
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} HospitalHealthDetail：{
 *   nutrition 饮食（latest 最新值 + trend7d 近 7 天趋势）,
 *   exercise 运动（latest + trend7d）,
 *   weight 体重（latest + trend7d）,
 *   blood_pressure 血压（latest + trend7d）,
 *   blood_glucose 血糖（latest + trend7d）,
 *   tumor_marker 肿瘤标志物（latest + trend30d 近 30 天趋势）,
 *   blood_routine 血常规（latest + trend30d）,
 *   liver_function 肝功能（latest + trend30d）,
 *   otherAttachments 其他附件（取 latest 的 OTHER 记录，无则 null） }
 */
export function getHospitalPatientHealthDetailById(id) {
  return http.get(`/hospital/patients/${encodeURIComponent(String(id))}/health-detail`)
}

/**
 * 患者 tab 统计（JWT 接口，返回当前权限范围内的患者总数）
 * 路径：GET /hospital/summary
 * 无请求参数
 * @returns {Promise<Object>} HospitalSummary：{ totalPatients 患者总数（int64，响应已按字符串安全处理） }
 */
export function getHospitalSummary() {
  return http.get('/hospital/summary')
}

export default {
  getHospitalPatientPage,
  getHospitalPatientHealthDetailById,
  getHospitalSummary
}
