/**
 * 患者管理模块接口（api/swagger.json 中 tag = patient 的全部接口，共 21 个，PC 端）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如患者 id/附件 id/任务 id/各关联 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/taskId/attachmentId、query 与请求体内各 id 字段）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 后缀；
 *   双 id 路径（如附件删除、OCR 结果）在函数签名中依次接收主资源 id 与子资源 id
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
/*  患者列表、导出与增删改查                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询患者列表（JWT 接口，结果按创建时间倒序，并按当前账号数据范围 dataScope 强制过滤）
 * 路径：GET /patients
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 姓名/手机号模糊关键字
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.healthStatus] 健康状态，枚举：良好 / 关注 / 警告
 * @param {string} [params.tag] 患者标签（动态枚举值）
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<Patient>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、gender（男/女）、age、phone、idCard、region、surgeryRegion、
 *   hospitalId/areaId/departmentId/doctorId/attendingDoctorId（字符串）、surgeryType、surgeryDate（yyyy-MM-dd）、
 *   diseaseIntro、heightCm、weightKg、tagsJson、matchedCsId/matchedStationId（字符串）、escortQuota、
 *   healthStatus、communicateStatus、servicePackage、purchaseIntent、registerDate、createTime、updateTime
 */
export function getPatientPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'departmentId'])
  return http.get('/patients', query)
}

/**
 * 导出患者 CSV（JWT 接口，筛选条件与 getPatientPage 基本一致，额外支持院区/医生/疾病过滤）
 * 路径：GET /patients/export
 * @param {Object} [params] 筛选参数
 * @param {string} [params.keyword] 姓名/手机号模糊关键字
 * @param {string} [params.areaId] 院区 ID，雪花 ID 字符串
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.doctorId] 主治医生 ID，雪花 ID 字符串
 * @param {string} [params.disease] 疾病关键字
 * @param {string} [params.healthStatus] 健康状态，枚举：良好 / 关注 / 警告
 * @param {string} [params.tag] 患者标签
 * @returns {Promise<Response>} text/csv 非 JSON 响应，封装层不解析、直接返回原始 Response；
 *   调用方用 response.blob() 或 response.text() 取内容并自行触发下载
 */
export function exportPatients(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['areaId', 'hospitalId', 'departmentId', 'doctorId'])
  return http.get('/patients/export', query)
}

/**
 * 新增患者（JWT 接口，公司管理）
 * 路径：POST /patients
 * @param {Object} data 患者内容（Patient）
 * @param {string} data.name 姓名（必填）
 * @param {string} data.phone 手机号（必填）
 * @param {string} [data.gender] 性别，枚举：男 / 女
 * @param {number} [data.age] 年龄
 * @param {string} [data.idCard] 身份证号（明文存储）
 * @param {string} [data.region] 所在地区
 * @param {string} [data.surgeryRegion] 手术/就诊地区
 * @param {string} [data.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [data.areaId] 院区 ID，雪花 ID 字符串
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.doctorId] 主治医生 ID，雪花 ID 字符串
 * @param {string} [data.attendingDoctorId] 主管医生 ID，雪花 ID 字符串
 * @param {string} [data.surgeryType] 手术名称
 * @param {string} [data.surgeryDate] 手术日期，格式 yyyy-MM-dd
 * @param {string} [data.diseaseIntro] 病症简单介绍
 * @param {number} [data.heightCm] 身高（厘米）
 * @param {number} [data.weightKg] 体重（千克）
 * @param {number} [data.escortQuota] 陪诊配额次数
 * @param {string} [data.healthStatus] 健康状态，枚举：良好 / 关注 / 警告
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createPatient(data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId', 'departmentId', 'doctorId', 'attendingDoctorId', 'matchedCsId', 'matchedStationId'])
  return http.post('/patients', payload)
}

/**
 * 获取患者详情（JWT 接口）
 * 路径：GET /patients/{id}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} Patient：完整患者档案，id 及各关联 id 均为雪花 ID 字符串
 */
export function getPatientById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}`)
}

/**
 * 修改患者（JWT 接口，公司管理；字段同 createPatient，name/phone 必填）
 * 路径：PUT /patients/{id}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 患者内容（Patient）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updatePatientById(id, data) {
  const payload = { ...data }
  stringifyIdFields(payload, ['hospitalId', 'areaId', 'departmentId', 'doctorId', 'attendingDoctorId', 'matchedCsId', 'matchedStationId'])
  return http.put(`/patients/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除患者（JWT 接口，公司管理；存在关联业务数据时服务端可能拒绝并返回 code=400）
 * 路径：DELETE /patients/{id}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deletePatientById(id) {
  return http.delete(`/patients/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  患者档案聚合、服务关系与健康摘要                                             */
/* -------------------------------------------------------------------------- */

/**
 * 获取患者档案聚合（JWT 接口，详情页一次性取齐患者/病历/服务关系/标签/销售信息）
 * 路径：GET /patients/{id}/profile
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} PatientProfile：{ patient Patient, medicalRecord PatientMedicalRecord,
 *   serviceRelations 当前医生/主管医生/客服/陪诊师对象, tags 标签字符串数组,
 *   sales 服务包/购买意向/沟通状态对象, attachmentCount 附件数 }，内嵌各 id 均为雪花 ID 字符串
 */
export function getPatientProfileById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/profile`)
}

/**
 * 获取患者服务关系及变更记录（JWT 接口）
 * 路径：GET /patients/{id}/service-relations
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} PatientServiceRelations：{ current 当前服务关系对象,
 *   logs 最近 20 条 PatientServiceRelationLog 变更记录 }；log 含 id/patientId/beforeId/afterId/
 *   operatorId（均为雪花 ID 字符串）、relationType（CS/CAREGIVER/DOCTOR）、operatorName、reason、createTime
 */
export function getPatientServiceRelationsById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/service-relations`)
}

/**
 * 分页查询陪诊次数变更记录（JWT 接口）
 * 路径：GET /patients/{id}/escort-quota/records
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<EscortQuotaLog>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/operatorId（雪花 ID 字符串）、beforeQuota 变更前次数、afterQuota 变更后次数、
 *   reason 原因、operatorName 操作人、createTime
 */
export function getEscortQuotaRecordsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/escort-quota/records`, params)
}

/**
 * 分页查询患者沟通时间线（JWT 接口）
 * 路径：GET /patients/{id}/communications
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 筛选与分页参数
 * @param {string} [params.channel] 沟通渠道，枚举：MESSAGE 消息 / CALL 电话
 * @param {string} [params.keyword] 内容关键字
 * @param {string} [params.from] 起始日期，格式 yyyy-MM-dd
 * @param {string} [params.to] 结束日期，格式 yyyy-MM-dd
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<CommunicationItem>：{ list, total, page, pageSize }；
 *   list 元素含 type（MESSAGE/CALL）、time、title、content、operator
 */
export function getPatientCommunicationsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/communications`, params)
}

/**
 * 获取患者健康摘要（JWT 接口，按时间窗口聚合饮食/运动/体重/血压/血糖/睡眠/检验）
 * 路径：GET /patients/{id}/health-summary
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 时间窗口参数
 * @param {string} [params.from] 起始日期，格式 yyyy-MM-dd
 * @param {string} [params.to] 结束日期，格式 yyyy-MM-dd
 * @returns {Promise<Object>} { from, to, diet, exercise, weight, bloodPressure, bloodGlucose, sleep,
 *   tumorMarkers, bloodRoutine, liverFunction }；每个模块为 HealthSummaryModule：
 *   { latest 最新一条记录（可能为空对象）, trend 窗口内趋势记录数组 }
 */
export function getPatientHealthSummaryById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/health-summary`, params)
}

/* -------------------------------------------------------------------------- */
/*  患者附件                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询患者附件（JWT 接口）
 * 路径：GET /patients/{id}/attachments
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 筛选与分页参数
 * @param {string} [params.category] 附件分类，枚举：检查报告 / 影像资料 / 病理资料 / 饮食记录 / 运动记录 / 其他
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<PatientAttachment>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/uploaderId（雪花 ID 字符串）、category、fileName、fileSize（字节）、
 *   url、uploaderRole（DOCTOR/CS/CAREGIVER/PATIENT/ADMIN）、createTime、updateTime
 */
export function getPatientAttachmentsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/attachments`, params)
}

/**
 * 登记患者附件（JWT 接口；文件本体需先经 POST /files/upload 上传拿到 url，这里只登记元数据）
 * 路径：POST /patients/{id}/attachments
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 附件元数据（AttachmentCreateRequest）
 * @param {string} data.category 分类（必填），枚举：检查报告 / 影像资料 / 病理资料 / 饮食记录 / 运动记录 / 其他
 * @param {string} data.fileName 文件名（必填）
 * @param {number} [data.fileSize] 文件大小（字节）
 * @param {string} data.url 文件 URL（必填，来自 /files/upload 返回值）
 * @returns {Promise<string>} 新建附件 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createPatientAttachmentById(id, data) {
  return http.post(`/patients/${encodeURIComponent(String(id))}/attachments`, data)
}

/**
 * 删除患者附件（JWT 接口，双 id 路径）
 * 路径：DELETE /patients/{id}/attachments/{attachmentId}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} attachmentId 附件 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deletePatientAttachmentById(id, attachmentId) {
  return http.delete(
    `/patients/${encodeURIComponent(String(id))}/attachments/${encodeURIComponent(String(attachmentId))}`
  )
}

/* -------------------------------------------------------------------------- */
/*  患者病历与 OCR                                                              */
/* -------------------------------------------------------------------------- */

/**
 * 获取患者病历（JWT 接口，附件1样表结构化档案）
 * 路径：GET /patients/{id}/medical-record
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} PatientMedicalRecord：id/patientId 为雪花 ID 字符串，含 birthDate、
 *   既往史开关位、bloodPressure、bmi、allergyHistory、admissionDiagnosis、treatmentProcess、chemoPlan、
 *   dischargeDiagnosis、rehab* 康复指导、followup* 随访指标、attachmentsJson、source（MANUAL/OCR）等
 */
export function getPatientMedicalRecordById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/medical-record`)
}

/**
 * 维护患者病历（JWT 接口，公司管理/医院管理，全量更新样表字段）
 * 路径：PUT /patients/{id}/medical-record
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 病历内容（PatientMedicalRecord，结构同 getPatientMedicalRecordById 返回值）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updatePatientMedicalRecordById(id, data) {
  return http.put(`/patients/${encodeURIComponent(String(id))}/medical-record`, data)
}

/**
 * 创建员工侧病历 OCR 识别任务（JWT 接口，异步识别）
 * 路径：POST /patients/{id}/medical-record/ocr
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 请求体（MedicalRecordOcrRequest）
 * @param {string[]} data.imageUrls 病历照片 URL 数组（必填，1-5 张，需为 /files/medical/ 下的地址）
 * @returns {Promise<Object>} OcrScanResponse：taskId（雪花 ID 字符串，用于轮询）、status 固定 PENDING
 */
export function createPatientMedicalRecordOcrById(id, data) {
  return http.post(`/patients/${encodeURIComponent(String(id))}/medical-record/ocr`, data)
}

/**
 * 查询员工侧病历 OCR 结果（JWT 接口，建议按 taskId 轮询直到 SUCCESS/FAILED）
 * 路径：GET /patients/{id}/medical-record/ocr/{taskId}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} taskId OCR 任务 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} OcrScanResult：taskId（字符串）、status（PENDING/SUCCESS/FAILED）、
 *   result（PENDING/FAILED 时为 null；成功时含 fields 归一化字段、confidence 置信度 0-1、missing 未识别字段数组）、
 *   failReason（FAILED 原因）、note（部分更新说明）
 */
export function getPatientMedicalRecordOcrResultById(id, taskId) {
  return http.get(
    `/patients/${encodeURIComponent(String(id))}/medical-record/ocr/${encodeURIComponent(String(taskId))}`
  )
}

/* -------------------------------------------------------------------------- */
/*  匹配、标签与陪诊配额配置                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 匹配客服/陪诊师（JWT 接口，PC 端配置；参数走 query，数据范围由服务端强制，越权 ID 会被忽略或 400）
 * 路径：PUT /patients/{id}/match
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} params 匹配参数
 * @param {string} [params.csId] 客服 ID，雪花 ID 字符串
 * @param {string} [params.stationId] 陪诊师 ID（遗留字段名 stationId），雪花 ID 字符串
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updatePatientMatchById(id, params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['csId', 'stationId'])
  return http.put(`/patients/${encodeURIComponent(String(id))}/match`, undefined, { params: query })
}

/**
 * 更新患者标签（JWT 接口，动态枚举，前端维护；请求体为标签 JSON 字符串）
 * 路径：PUT /patients/{id}/tags
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string[]} tags 标签字符串数组，内部 JSON.stringify 成字符串上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updatePatientTagsById(id, tags) {
  return http.put(`/patients/${encodeURIComponent(String(id))}/tags`, JSON.stringify(tags || []))
}

/**
 * 配置陪诊次数（JWT 接口，PC 端配置，合法范围 0-999；参数走 query）
 * 路径：PUT /patients/{id}/escort-quota
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} quota 陪诊次数（必填，整数 0-999）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；超范围返回 code=400
 */
export function updatePatientEscortQuotaById(id, quota) {
  return http.put(`/patients/${encodeURIComponent(String(id))}/escort-quota`, undefined, { params: { quota } })
}

export default {
  getPatientPage,
  exportPatients,
  createPatient,
  getPatientById,
  updatePatientById,
  deletePatientById,
  getPatientProfileById,
  getPatientServiceRelationsById,
  getEscortQuotaRecordsById,
  getPatientCommunicationsById,
  getPatientHealthSummaryById,
  getPatientAttachmentsById,
  createPatientAttachmentById,
  deletePatientAttachmentById,
  getPatientMedicalRecordById,
  updatePatientMedicalRecordById,
  createPatientMedicalRecordOcrById,
  getPatientMedicalRecordOcrResultById,
  updatePatientMatchById,
  updatePatientTagsById,
  updatePatientEscortQuotaById
}
