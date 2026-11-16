/**
 * 数据看板模块接口（api/swagger.json 中 tag = dashboard 的全部接口，共 18 个，全部为只读 GET）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如 hospitalId/departmentId/liveEvent.id）已由 BigIntSafeParser 自动转为字符串
 * - 请求 query 中的 hospitalId/departmentId 一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 * - 数据范围由服务端强制：ADMIN/DASHBOARD 可传 hospitalId 看全院，HOSPITAL_ADMIN 强制本院、DEPT_ADMIN 强制本科室；越权 ID 会被忽略或返回 code=400
 * - 多个全局看板模型 derived=true：为代码常量 + 真实计数/模板文案组合的派生数据，非完整真实统计，接入时 UI 应如实展示
 *
 * 命名规范：查询用 get + 资源名；本模块无 {id} 路径参数，故不产生 ById 后缀函数
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
/*  全局看板（/dashboard/*）                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 全局看板概览（JWT 接口）
 * 路径：GET /dashboard/overview
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.range] 时间范围标识
 * @returns {Promise<Object>} DashboardOverview：{ kpis 关键指标对象, range 时间范围, derived 是否派生占位数据 }
 */
export function getDashboardOverview(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/overview', query)
}

/**
 * 服务规模趋势（JWT 接口）
 * 路径：GET /dashboard/service-trend
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.days] 统计天数
 * @returns {Promise<Object>} ServiceTrend：{ totalReach 总触达数, points 每日 {date,reach,complete} 数组, derived }
 */
export function getDashboardServiceTrend(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/service-trend', query)
}

/**
 * 服务项目活跃度（JWT 接口）
 * 路径：GET /dashboard/service-activity
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.days] 统计天数
 * @returns {Promise<Object>} ServiceActivity：{ overallCompletionRate 总体完成率, items 各服务项目完成率数组, derived }
 */
export function getDashboardServiceActivity(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/service-activity', query)
}

/**
 * 健康服务知识图谱（JWT 接口，derived 派生结构）
 * 路径：GET /dashboard/knowledge-graph
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @returns {Promise<Object>} KnowledgeGraph：{ center 中心节点, categories 分类数组, nodes 节点数组, edges 连线数组, stats 统计对象, derived }
 */
export function getDashboardKnowledgeGraph(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/knowledge-graph', query)
}

/**
 * 当前聚焦对象（JWT 接口，derived 派生结构）
 * 路径：GET /dashboard/focus-node
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @returns {Promise<Object>} FocusNode：{ focus 聚焦对象, stage 阶段, count 数量, warnings 预警数,
 *   sevenDayServices 近 7 天服务数, completionRate 完成率, tags 标签数组, carePath 照护路径数组, derived }
 */
export function getDashboardFocusNode(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/focus-node', query)
}

/**
 * 异常预警汇总（JWT 接口，derived 派生结构）
 * 路径：GET /dashboard/anomalies
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.days] 统计天数
 * @returns {Promise<Object>} AnomalySummary：{ pending 待处理数, closureRate 闭环率, items 按来源聚合的异常项数组, derived }
 */
export function getDashboardAnomalies(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/anomalies', query)
}

/**
 * 实时事件流（JWT 接口）
 * 路径：GET /dashboard/live-events
 * @param {Object} [params] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.limit] 返回条数上限
 * @returns {Promise<Array<Object>>} LiveEvent 数组，元素含 id（雪花 ID 字符串）、time（date-time）、dept 科室、message 事件内容
 */
export function getDashboardLiveEvents(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId', 'departmentId'])
  return http.get('/dashboard/live-events', query)
}

/**
 * 看板筛选器（JWT 接口，提供全局看板可选医院/科室下拉数据）
 * 路径：GET /dashboard/filters
 * 无请求参数
 * @returns {Promise<Object>} DashboardFilters：{ hospitals 医院选项数组, departments 科室选项数组 }，选项内 id 为雪花 ID 字符串
 */
export function getDashboardFilters() {
  return http.get('/dashboard/filters')
}
/* -------------------------------------------------------------------------- */
/*  医院看板（/hospital/dashboard/*）                                          */
/* -------------------------------------------------------------------------- */

/**
 * 医院看板概览（JWT 接口）
 * 路径：GET /hospital/dashboard/summary
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；HOSPITAL_ADMIN 不传时强制本院
 * @returns {Promise<Object>} HospitalDashboardSummary：{ hospitalId 雪花 ID 字符串, users 用户数, consults 咨询数,
 *   activeDepartments 活跃科室数, avgResponseMinutes 平均响应分钟数, deltas 各指标环比变化对象 }
 */
export function getHospitalDashboardSummary(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId'])
  return http.get('/hospital/dashboard/summary', query)
}

/**
 * 医院看板趋势（JWT 接口）
 * 路径：GET /hospital/dashboard/trends
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；HOSPITAL_ADMIN 不传时强制本院
 * @param {number} [params.months] 回溯月数，控制趋势点数，由服务端给定默认值
 * @returns {Promise<Object>} HospitalTrends：{ users 用户趋势数组, consultations 咨询趋势数组 }，元素为按时间聚合的统计对象
 */
export function getHospitalDashboardTrends(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId'])
  return http.get('/hospital/dashboard/trends', query)
}

/**
 * 医院科室用户分布（JWT 接口）
 * 路径：GET /hospital/dashboard/departments
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；HOSPITAL_ADMIN 不传时强制本院
 * @returns {Promise<Array<Object>>} DepartmentUserStat 数组：[{ departmentId 科室雪花 ID 字符串, users 该科室用户数 }]
 */
export function getHospitalDepartmentDistribution(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId'])
  return http.get('/hospital/dashboard/departments', query)
}

/**
 * 医院近 N 日活跃（JWT 接口）
 * 路径：GET /hospital/dashboard/daily-activity
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串；HOSPITAL_ADMIN 不传时强制本院
 * @param {number} [params.days] 回溯天数，控制返回的每日统计条数，由服务端给定默认值
 * @returns {Promise<Array<Object>>} HospitalDailyStat 数组：[{ date 日期(YYYY-MM-DD), activeUsers 当日活跃用户数, consultations 当日咨询数 }]
 */
export function getHospitalDailyActivity(params = {}) {
  const query = stringifyIdFields({ ...params }, ['hospitalId'])
  return http.get('/hospital/dashboard/daily-activity', query)
}

/**
 * 医院效能指标（JWT 接口，数据范围按当前登录用户权限强制收敛，无入参）
 * 路径：GET /hospital/dashboard/efficiency
 * 无请求参数
 * @returns {Promise<Object>} Efficiency：{ dailyActiveUsers 日活用户数, activeRate 活跃率, consultsPerUserMonthly 人均月咨询数,
 *   satisfactionRate 满意度, avgResponseMinutes 平均响应分钟数, resolutionRate 解决率 }
 */
export function getHospitalEfficiency() {
  return http.get('/hospital/dashboard/efficiency')
}

/* -------------------------------------------------------------------------- */
/*  科室看板（/department/dashboard/*）                                        */
/* -------------------------------------------------------------------------- */

/**
 * 科室看板概览（JWT 接口）
 * 路径：GET /department/dashboard/summary
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串；DEPT_ADMIN 不传时强制本科室
 * @returns {Promise<Object>} DepartmentDashboardSummary：{ departmentId 科室雪花 ID 字符串, hospitalId 医院雪花 ID 字符串,
 *   users 用户数, consults 咨询数, followupCompletionRate 随访完成率, riskUsers 风险用户数, doctorCount 医生数, deltas 环比变化对象 }
 */
export function getDepartmentDashboardSummary(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/department/dashboard/summary', query)
}

/**
 * 科室看板趋势（JWT 接口）
 * 路径：GET /department/dashboard/trends
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串；DEPT_ADMIN 不传时强制本科室
 * @param {number} [params.months] 回溯月数，控制趋势点数，由服务端给定默认值
 * @returns {Promise<Object>} HospitalTrends：{ users 用户趋势数组, consultations 咨询趋势数组 }，元素为按时间聚合的统计对象
 */
export function getDepartmentDashboardTrends(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/department/dashboard/trends', query)
}

/**
 * 科室近 N 日咨询量（JWT 接口）
 * 路径：GET /department/dashboard/daily-consultations
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串；DEPT_ADMIN 不传时强制本科室
 * @param {number} [params.days] 回溯天数，控制返回的每日统计条数，由服务端给定默认值
 * @returns {Promise<Array<Object>>} DailyCountStat 数组：[{ date 日期(YYYY-MM-DD), count 当日咨询数 }]
 */
export function getDepartmentDailyConsultations(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/department/dashboard/daily-consultations', query)
}

/**
 * 科室咨询时段分布（JWT 接口）
 * 路径：GET /department/dashboard/hourly-distribution
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串；DEPT_ADMIN 不传时强制本科室
 * @returns {Promise<Array<Object>>} HourlyStat 数组：[{ hourStart 时段起点(HH:mm), count 该时段咨询数 }]
 */
export function getDepartmentHourlyDistribution(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/department/dashboard/hourly-distribution', query)
}

/**
 * 科室效能指标（JWT 接口，数据范围按当前登录用户权限强制收敛，无入参）
 * 路径：GET /department/dashboard/efficiency
 * 无请求参数
 * @returns {Promise<Object>} Efficiency：{ dailyActiveUsers 日活用户数, activeRate 活跃率, consultsPerUserMonthly 人均月咨询数,
 *   satisfactionRate 满意度, avgResponseMinutes 平均响应分钟数, resolutionRate 解决率 }
 */
export function getDepartmentEfficiency() {
  return http.get('/department/dashboard/efficiency')
}

export default {
  getDashboardOverview,
  getDashboardServiceTrend,
  getDashboardServiceActivity,
  getDashboardKnowledgeGraph,
  getDashboardFocusNode,
  getDashboardAnomalies,
  getDashboardLiveEvents,
  getDashboardFilters,
  getHospitalDashboardSummary,
  getHospitalDashboardTrends,
  getHospitalDepartmentDistribution,
  getHospitalDailyActivity,
  getHospitalEfficiency,
  getDepartmentDashboardSummary,
  getDepartmentDashboardTrends,
  getDepartmentDailyConsultations,
  getDepartmentHourlyDistribution,
  getDepartmentEfficiency
}
