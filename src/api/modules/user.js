/**
 * 患者端“我的”模块接口（api/swagger.json 中 tag = user 的全部接口，共 10 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数）已由 frontApikit 的 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/taskId、请求体内 hospitalId/departmentId/doctorId 等）一律按字符串传递，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，动作用动词 + 资源名，更新用 update + 资源名
 * - 路径含 {id}/{taskId} 的接口统一使用 getXxxById / confirmXxxById 等 ById 后缀
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  患者首页聚合与健康管家                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 患者首页聚合数据（JWT 接口）
 * 路径：GET /me/home
 * 无请求参数
 * @returns {Promise<Object>} MeHome：
 *   - postopDays 术后第 N 天（0 起算，手术日期为空时 null）
 *   - advisorCard 主治医生名片（AdvisorCard：name/departmentName/title/hospitalName/specialty/bio，无医生时 null）
 *   - monitor 健康监测最新值：bloodPressure{sbp,dbp,level 正常/偏高}、bloodGlucose{value,unit}、
 *     weight{weightKg,changeKg}、medicationToday[{name,status PENDING/TAKEN}]，无记录时对应字段为 null
 *   - escort 陪诊摘要：escortCount 剩余次数、activeBooking 当前有效预约（无则 null）
 *   - consentPending 最新一条未确认告知书（InformedConsentItem，无则 null，且不含 confirmed 字段）
 */
export function getMyHome() {
  return http.get('/me/home')
}

/**
 * 我的健康管家：主管医生 + 客服信息（JWT 接口；代码保留，文档已标记移除，新逻辑建议用 getMyHome 的 advisorCard）
 * 路径：GET /me/health-manager
 * 无请求参数
 * @returns {Promise<Object>} Patient：当前患者完整档案；id 及 hospitalId/departmentId/doctorId/
 *   attendingDoctorId/areaId/matchedCsId/matchedStationId 等雪花 ID 均为字符串
 */
export function getMyHealthManager() {
  return http.get('/me/health-manager')
}

/* -------------------------------------------------------------------------- */
/*  告知书                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * 我的告知书列表（JWT 接口，按术式匹配，含已确认标记）
 * 路径：GET /me/informed-consent
 * 无请求参数
 * @returns {Promise<Array<Object>>} InformedConsentItem 数组，元素含：
 *   id（雪花 ID 字符串）、title 标题、content 正文（为空时回退附件地址/文件名）、version 版本、
 *   surgeryType 术式（NULL/空串表示通用）、confirmed 当前患者是否已确认
 */
export function getMyInformedConsents() {
  return http.get('/me/informed-consent')
}

/**
 * 确认告知书（JWT 接口，幂等：重复确认不报错）
 * 路径：POST /me/informed-consent/{id}/confirm
 * @param {string} id 告知书 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} InformedConsentConfirmResult：{ confirmed: true }，重复确认固定返回 true
 */
export function confirmInformedConsentById(id) {
  return http.post(`/me/informed-consent/${encodeURIComponent(String(id))}/confirm`)
}

/* -------------------------------------------------------------------------- */
/*  个人资料                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 获取我的个人基本信息（JWT 接口）
 * 路径：GET /me/profile
 * 无请求参数
 * @returns {Promise<Object>} Patient：当前患者档案；id 等 int64 雪花 ID 为字符串，
 *   含 name/gender（男/女）/age/phone/idCard/region/surgeryRegion/hospitalId/departmentId/doctorId/
 *   surgeryType/surgeryDate（yyyy-MM-dd）/diseaseIntro/heightCm/weightKg 等字段
 */
export function getMyProfile() {
  return http.get('/me/profile')
}

/**
 * 编辑我的信息（JWT 接口，白名单字段 + 改手机号需验证码；字段均可选，仅提交需要修改的部分）
 * 路径：PUT /me/profile
 * @param {Object} data 个人资料（MyProfileUpdateRequest）
 * @param {string} [data.name] 姓名
 * @param {string} [data.gender] 性别，枚举：男 / 女
 * @param {number} [data.age] 年龄
 * @param {string} [data.phone] 手机号；与当前不一致时必须同时传 phoneCode
 * @param {string} [data.phoneCode] 修改手机号的短信验证码（phone 未变化时服务端忽略）
 * @param {string} [data.region] 所在地区
 * @param {string} [data.surgeryRegion] 手术/就诊地区
 * @param {string} [data.hospitalId] 就诊医院 ID，雪花 ID 字符串
 * @param {string} [data.departmentId] 就诊科室 ID，雪花 ID 字符串
 * @param {string} [data.doctorId] 主治医生 ID（患者声明），雪花 ID 字符串
 * @param {string} [data.surgeryType] 手术名称
 * @param {string} [data.surgeryDate] 手术日期，格式 yyyy-MM-dd
 * @param {string} [data.diseaseIntro] 病症简单介绍
 * @param {number} [data.heightCm] 身高（厘米）
 * @param {number} [data.weightKg] 体重（千克）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；验证码错误等返回 code=400
 */
export function updateMyProfile(data) {
  const payload = { ...data }
  // 雪花 ID 统一按字符串上送，避免超长整数精度丢失
  for (const idKey of ['hospitalId', 'departmentId', 'doctorId']) {
    if (payload[idKey] !== undefined && payload[idKey] !== null) {
      payload[idKey] = String(payload[idKey])
    }
  }
  return http.put('/me/profile', payload)
}

/* -------------------------------------------------------------------------- */
/*  我的病历与 OCR 扫一扫                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 获取我的病历（JWT 接口，附件1样表结构化档案）
 * 路径：GET /me/medical-record
 * 无请求参数
 * @returns {Promise<Object>} PatientMedicalRecord：id/patientId 为雪花 ID 字符串；
 *   含 birthDate、既往史开关位（hypertension/diabetes 等 0/1）、bloodPressure、bmi、allergyHistory、
 *   admissionDiagnosis、treatmentProcess、chemoPlan、dischargeDiagnosis、rehab* 康复指导、
 *   followup* 随访指标、attachmentsJson 附件 JSON、source（MANUAL 手动/OCR 识别）等字段
 */
export function getMyMedicalRecord() {
  return http.get('/me/medical-record')
}

/**
 * 扫一扫添加病历：创建异步 OCR 识别任务（JWT 接口，附件1样表结构化）
 * 路径：POST /me/medical-record/scan
 * @param {Object} data 请求体（OcrScanRequest）
 * @param {string[]} data.imageUrls 病历/检查报告图片 URL 数组（必填，1-5 张，必须是 /files/medical/ 下的地址，
 *   即先通过 POST /files/upload?dir=medical 上传后得到的 URL）
 * @returns {Promise<Object>} OcrScanResponse：taskId（雪花 ID 字符串，用于轮询结果）、status 固定 PENDING
 */
export function scanMedicalRecord(data) {
  return http.post('/me/medical-record/scan', data)
}

/**
 * 查询 OCR 识别结果（JWT 接口，建议前端按 taskId 轮询直到 SUCCESS/FAILED）
 * 路径：GET /me/medical-record/scan/{taskId}
 * @param {string} taskId 任务 ID（必填，路径参数，雪花 ID 字符串，由 scanMedicalRecord 返回）
 * @returns {Promise<Object>} OcrScanResult：
 *   - taskId 任务 ID（字符串）
 *   - status 识别状态：PENDING 识别中 / SUCCESS 成功 / FAILED 失败
 *   - result 识别结果（PENDING/FAILED 时为 null）：{ fields 归一化字段（疾病史 0/1、日期 yyyy-MM-dd）,
 *     confidence 各字段置信度 0-1, missing 未识别字段名数组 }
 *   - failReason FAILED 原因，前端据此引导人工录入
 *   - note 再次识别为更新信息、支持部分更新、未识别字段留空的说明
 */
export function getMedicalRecordScanResultById(taskId) {
  return http.get(`/me/medical-record/scan/${encodeURIComponent(String(taskId))}`)
}

/**
 * 确认 OCR 结果并回填（JWT 接口，部分更新患者档案 + 写入病历/检验指标）
 * 路径：POST /me/medical-record/confirm
 * @param {Object} data 确认内容（OcrConfirmRequest）
 * @param {string} [data.taskId] OCR 任务 ID，雪花 ID 字符串；传入后做归属校验并保证检验记录幂等
 * @param {Object} [data.basicInfoPatch] 附件1样表字段补丁（部分更新，可含 patient 字段；
 *   phone/idCard/name 建议由患者主动勾选后再提交；其中若含雪花 ID 字段请按字符串传入）
 * @param {string} data.labModule 检验模块，枚举：TUMOR_MARKER 肿瘤标志物 / BLOOD_ROUTINE 血常规 / LIVER_FUNCTION 肝功能
 * @param {Array<Object>} data.indicators 检验指标数组，元素结构：
 *   - name 指标名（必填，不能为保留字 date）
 *   - value 指标值（必填，数字或字符串）
 *   - unit 单位（选填）
 *   - referenceRange 参考范围（选填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；同一 taskId 重复提交检验记录幂等
 */
export function confirmMedicalRecord(data) {
  const payload = { ...data }
  // 任务 ID 为雪花 ID，统一按字符串上送
  if (payload.taskId !== undefined && payload.taskId !== null) {
    payload.taskId = String(payload.taskId)
  }
  return http.post('/me/medical-record/confirm', payload)
}

export default {
  getMyHome,
  getMyHealthManager,
  getMyInformedConsents,
  confirmInformedConsentById,
  getMyProfile,
  updateMyProfile,
  getMyMedicalRecord,
  scanMedicalRecord,
  getMedicalRecordScanResultById,
  confirmMedicalRecord
}
