/**
 * 检查分类/报告/指标模块接口（api/swagger.json 中 tag = exam 的全部接口，共 15 个，PC 端）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如分类/报告/指标/总结 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 patientId/id、query 的 categoryId、请求体内 categoryId/reportId 等）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {patientId}/{id} 的接口统一使用 getXxxByPatientId / updateXxxById 等 ById 后缀；
 *   子资源函数签名依次接收患者 patientId 与子资源 id
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
/*  检查分类                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 查询患者检查分类（JWT 接口，含全局默认分类与患者自定义分类）
 * 路径：GET /patients/{patientId}/exam/categories
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} ExamCategory 数组，元素含 id/patientId（雪花 ID 字符串，patientId 为 null 表示全局默认）、
 *   name 分类名、sortNo 排序号、enabled 启用位、isDefault（1 默认分类不可删除仅可停用）
 */
export function getExamCategoriesByPatientId(patientId) {
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/exam/categories`)
}

/**
 * 新增患者检查分类（JWT 接口）
 * 路径：POST /patients/{patientId}/exam/categories
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 分类内容（ExamCategory）
 * @param {string} data.name 分类名称
 * @param {number} [data.sortNo] 排序号
 * @param {number} [data.enabled] 启用位：1 启用 / 0 停用
 * @returns {Promise<Object>} 创建成功的 ExamCategory（id 为雪花 ID 字符串）
 */
export function createExamCategoryByPatientId(patientId, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId'])
  return http.post(`/patients/${encodeURIComponent(String(patientId))}/exam/categories`, payload)
}

/**
 * 编辑检查分类（JWT 接口）
 * 路径：PUT /patients/{patientId}/exam/categories/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 分类 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 分类内容（ExamCategory，字段同 createExamCategoryByPatientId）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateExamCategoryById(patientId, id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId'])
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/exam/categories/${encodeURIComponent(String(id))}`,
    payload
  )
}

/**
 * 删除/停用检查分类（JWT 接口；默认分类 isDefault=1 不可删除，仅可停用）
 * 路径：DELETE /patients/{patientId}/exam/categories/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 分类 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteExamCategoryById(patientId, id) {
  return http.delete(
    `/patients/${encodeURIComponent(String(patientId))}/exam/categories/${encodeURIComponent(String(id))}`
  )
}

/* -------------------------------------------------------------------------- */
/*  检查报告                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询患者检查报告（JWT 接口）
 * 路径：GET /patients/{patientId}/exam/reports
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.categoryId] 检查分类 ID，雪花 ID 字符串
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ExamReport>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/categoryId/uploaderId（雪花 ID 字符串）、fileName、fileType、fileSize、url、
 *   uploadTime、uploaderRole、ocrStatus（PENDING/PROCESSING/SUCCESS/FAILED）、ocrError
 */
export function getExamReportPageByPatientId(patientId, params = {}) {
  const query = stringifyIdFields({ ...params }, ['categoryId'])
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/exam/reports`, query)
}

/**
 * 登记检查报告（JWT 接口；文件本体需先经 POST /files/upload 拿到 url，这里只登记报告元数据）
 * 路径：POST /patients/{patientId}/exam/reports
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 报告元数据（ExamReport）
 * @param {string} data.categoryId 检查分类 ID，雪花 ID 字符串
 * @param {string} data.fileName 文件名
 * @param {string} [data.fileType] 文件类型
 * @param {number} [data.fileSize] 文件大小（字节）
 * @param {string} data.url 文件 URL（来自 /files/upload）
 * @param {string} [data.uploaderRole] 上传人角色
 * @returns {Promise<Object>} 创建成功的 ExamReport（id 为雪花 ID 字符串，ocrStatus 初始为 PENDING/PROCESSING）
 */
export function createExamReportByPatientId(patientId, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'categoryId', 'uploaderId'])
  return http.post(`/patients/${encodeURIComponent(String(patientId))}/exam/reports`, payload)
}

/**
 * 删除检查报告（JWT 接口，可选择级联删除其指标与总结）
 * 路径：DELETE /patients/{patientId}/exam/reports/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 报告 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询参数
 * @param {boolean} [params.cascade] 是否级联删除该报告下的检查指标与 AI 总结
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteExamReportById(patientId, id, params = {}) {
  return http.delete(
    `/patients/${encodeURIComponent(String(patientId))}/exam/reports/${encodeURIComponent(String(id))}`,
    params
  )
}

/**
 * 触发检查报告 OCR 识别（JWT 接口，占位能力，无识别结果时返回 FAILED 与原因）
 * 路径：POST /patients/{patientId}/exam/reports/{id}/ocr
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 报告 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} 更新后的 ExamReport（ocrStatus/ocrError 反映识别状态）
 */
export function runExamReportOcrById(patientId, id) {
  return http.post(
    `/patients/${encodeURIComponent(String(patientId))}/exam/reports/${encodeURIComponent(String(id))}/ocr`
  )
}

/* -------------------------------------------------------------------------- */
/*  检查指标                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询患者检查指标（JWT 接口）
 * 路径：GET /patients/{patientId}/exam/indicators
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.categoryId] 检查分类 ID，雪花 ID 字符串
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ExamIndicator>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/reportId/categoryId（雪花 ID 字符串）、name 指标名、result 结果、unit 单位、
 *   referenceRange 参考范围、isAbnormal（0 正常 1 异常）、examTime（yyyy-MM-dd）、source（OCR/MANUAL）、enabled
 */
export function getExamIndicatorPageByPatientId(patientId, params = {}) {
  const query = stringifyIdFields({ ...params }, ['categoryId'])
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/exam/indicators`, query)
}

/**
 * 新增检查指标（JWT 接口，人工录入或 OCR 回填）
 * 路径：POST /patients/{patientId}/exam/indicators
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 指标内容（ExamIndicator）
 * @param {string} [data.reportId] 所属报告 ID，雪花 ID 字符串
 * @param {string} data.categoryId 检查分类 ID，雪花 ID 字符串
 * @param {string} data.name 指标名称
 * @param {string} [data.result] 指标结果
 * @param {string} [data.unit] 单位
 * @param {string} [data.referenceRange] 参考范围
 * @param {number} [data.isAbnormal] 是否异常：0 正常 / 1 异常
 * @param {string} [data.examTime] 检查日期，格式 yyyy-MM-dd
 * @param {string} [data.source] 来源，枚举：OCR 识别 / MANUAL 人工
 * @param {number} [data.enabled] 启用位
 * @returns {Promise<Object>} 创建成功的 ExamIndicator（id 为雪花 ID 字符串）
 */
export function createExamIndicatorByPatientId(patientId, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'reportId', 'categoryId'])
  return http.post(`/patients/${encodeURIComponent(String(patientId))}/exam/indicators`, payload)
}

/**
 * 编辑检查指标（JWT 接口）
 * 路径：PUT /patients/{patientId}/exam/indicators/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 指标 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 指标内容（ExamIndicator，字段同 createExamIndicatorByPatientId）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateExamIndicatorById(patientId, id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'reportId', 'categoryId'])
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/exam/indicators/${encodeURIComponent(String(id))}`,
    payload
  )
}

/**
 * 删除检查指标（JWT 接口）
 * 路径：DELETE /patients/{patientId}/exam/indicators/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 指标 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteExamIndicatorById(patientId, id) {
  return http.delete(
    `/patients/${encodeURIComponent(String(patientId))}/exam/indicators/${encodeURIComponent(String(id))}`
  )
}

/* -------------------------------------------------------------------------- */
/*  检查 AI 总结                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 获取检查 AI 总结（JWT 接口，按分类返回原文/人工编辑文本与状态）
 * 路径：GET /patients/{patientId}/exam/ai-summary
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} params 查询参数
 * @param {string} params.categoryId 检查分类 ID（必填，雪花 ID 字符串）
 * @returns {Promise<Object>} ExamAiSummary：id/patientId/categoryId/editedBy（雪花 ID 字符串）、
 *   originalText 模型生成原文、editedText 人工编辑文本、isManuallyEdited 是否人工编辑、editedAt、generatedAt
 */
export function getExamAiSummaryByPatientId(patientId, params) {
  const query = stringifyIdFields({ ...params }, ['categoryId'])
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/exam/ai-summary`, query)
}

/**
 * 保存人工编辑的检查 AI 总结（JWT 接口）
 * 路径：PUT /patients/{patientId}/exam/ai-summary
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 总结内容
 * @param {string} data.categoryId 检查分类 ID（雪花 ID 字符串，内部转字符串）
 * @param {string} data.editedText 人工编辑后的总结文本
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateExamAiSummaryByPatientId(patientId, data) {
  const payload = stringifyIdFields({ ...data }, ['categoryId'])
  return http.put(`/patients/${encodeURIComponent(String(patientId))}/exam/ai-summary`, payload)
}

/**
 * 生成检查 AI 总结（JWT 接口，占位能力；TokenHub 失败时降级返回模板文案）
 * 路径：POST /patients/{patientId}/exam/ai-summary/generate
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} params 查询参数
 * @param {string} params.categoryId 检查分类 ID（必填，雪花 ID 字符串）
 * @returns {Promise<Object>} ExamAiSummary：新生成/更新的总结（originalText/editedText/generatedAt 等，id 为字符串）
 */
export function generateExamAiSummaryByPatientId(patientId, params) {
  const query = stringifyIdFields({ ...params }, ['categoryId'])
  return http.post(
    `/patients/${encodeURIComponent(String(patientId))}/exam/ai-summary/generate`,
    undefined,
    { params: query }
  )
}

export default {
  getExamCategoriesByPatientId,
  createExamCategoryByPatientId,
  updateExamCategoryById,
  deleteExamCategoryById,
  getExamReportPageByPatientId,
  createExamReportByPatientId,
  deleteExamReportById,
  runExamReportOcrById,
  getExamIndicatorPageByPatientId,
  createExamIndicatorByPatientId,
  updateExamIndicatorById,
  deleteExamIndicatorById,
  getExamAiSummaryByPatientId,
  updateExamAiSummaryByPatientId,
  generateExamAiSummaryByPatientId
}
