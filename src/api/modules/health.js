/**
 * 健康数据模块接口（api/swagger.json 中 tag = health 的全部接口，共 54 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如患者/记录/方案/设备 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id、请求体内各 id 字段、动作项 id 数组）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create/add/bind 等动作 + 资源名，更新用 update/save + 资源名，删除用 delete + 资源名
 * - 路径含 {id}/{patientId}/{itemId} 等的接口统一使用 getXxxById / updateXxxById / deleteXxxById 等 ById 后缀
 * - /me 开头为患者本人端接口（函数名带 My），/patients/{id} 开头为 PC 管理端代患者操作接口
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

/** 把 id 数组中的每个元素转为字符串（动作项 id 等雪花 ID 列表） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/* -------------------------------------------------------------------------- */
/*  患者用药提醒与服药记录（PC 管理端）                                          */
/* -------------------------------------------------------------------------- */

/**
 * 查询患者用药提醒列表（JWT 接口）
 * 路径：GET /patients/{patientId}/medication/reminders
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} MedicationReminder 数组，元素含 id/patientId（雪花 ID 字符串）、
 *   drugName 药名、spec 规格、dosage 剂量、unit 单位、frequency 频次、timesPerDay 每日次数、
 *   scheduledTimesJson 提醒时间 JSON（如 ["08:00","12:00"]）、startDate/endDate（yyyy-MM-dd）、
 *   instructions 医嘱、pushEnabled 推送开关、statusEnabled（1 启用 0 停用）
 */
export function getMedicationRemindersByPatientId(patientId) {
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/medication/reminders`)
}

/**
 * 新增患者用药提醒（JWT 接口）
 * 路径：POST /patients/{patientId}/medication/reminders
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 提醒内容（MedicationReminder）
 * @param {string} data.drugName 药品名称
 * @param {string} [data.spec] 规格
 * @param {string} [data.dosage] 剂量
 * @param {string} [data.unit] 单位
 * @param {string} [data.frequency] 频次描述
 * @param {number} [data.timesPerDay] 每日次数
 * @param {string} [data.scheduledTimesJson] 提醒时间 JSON 字符串，如 ["08:00","12:00"]
 * @param {string} [data.startDate] 开始日期 yyyy-MM-dd
 * @param {string} [data.endDate] 结束日期 yyyy-MM-dd
 * @param {string} [data.instructions] 医嘱说明
 * @param {number} [data.pushEnabled] 推送开关
 * @param {number} [data.statusEnabled] 启用状态：1 启用 / 0 停用
 * @returns {Promise<Object>} 创建成功的 MedicationReminder（id 为雪花 ID 字符串）
 */
export function createMedicationReminderByPatientId(patientId, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId'])
  return http.post(`/patients/${encodeURIComponent(String(patientId))}/medication/reminders`, payload)
}

/**
 * 编辑患者用药提醒（JWT 接口）
 * 路径：PUT /patients/{patientId}/medication/reminders/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 提醒 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 提醒内容（MedicationReminder，字段同 createMedicationReminderByPatientId）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateMedicationReminderById(patientId, id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId'])
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/medication/reminders/${encodeURIComponent(String(id))}`,
    payload
  )
}

/**
 * 删除患者用药提醒（JWT 接口）
 * 路径：DELETE /patients/{patientId}/medication/reminders/{id}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 提醒 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteMedicationReminderById(patientId, id) {
  return http.delete(
    `/patients/${encodeURIComponent(String(patientId))}/medication/reminders/${encodeURIComponent(String(id))}`
  )
}

/**
 * 设置用药提醒推送开关（JWT 接口）
 * 路径：PUT /patients/{patientId}/medication/reminders/{id}/push
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} id 提醒 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} pushEnabled 推送开关：1 开启 / 0 关闭
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateMedicationReminderPushById(patientId, id, pushEnabled) {
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/medication/reminders/${encodeURIComponent(String(id))}/push`,
    { pushEnabled }
  )
}

/**
 * 查询患者按日用药计划与服药状态（JWT 接口）
 * 路径：GET /patients/{patientId}/medication/records
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询参数
 * @param {string} [params.date] 日期，格式 yyyy-MM-dd，不传默认今天
 * @returns {Promise<Array<Object>>} MedicationRecordRow 数组，元素含 reminderId（雪花 ID 字符串）、
 *   drugName、dosage、slots 当日服药槽位数组（含计划时间与打卡状态）
 */
export function getMedicationRecordsByPatientId(patientId, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/medication/records`, params)
}

/**
 * 客服代录患者服药状态（JWT 接口）
 * 路径：PUT /patients/{patientId}/medication/records/{logId}
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} logId 服药记录/槽位 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 状态内容（MedicationRecordUpdateRequest）
 * @param {string} data.status 服药状态，枚举：TAKEN 已服 / SKIPPED 跳过
 * @param {string} [data.note] 备注
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateMedicationRecordByLogId(patientId, logId, data) {
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/medication/records/${encodeURIComponent(String(logId))}`,
    data
  )
}

/* -------------------------------------------------------------------------- */
/*  睡眠评估与设备（PC 管理端）                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询患者 PSQI 睡眠评估历史（JWT 接口）
 * 路径：GET /patients/{patientId}/sleep/assessments
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ScaleSubmission>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId（雪花 ID 字符串）、scaleCode（PSQI）、status（DRAFT/SUBMITTED）、step 断点步号、
 *   answersJson 答案 JSON、score（0-21）、tier（良好/轻度/中度/重度）、tierText 解读、dimensionsJson 7 维度、
 *   valid（1 有效 0 漏答无效）、createTime、updateTime
 */
export function getSleepAssessmentsByPatientId(patientId, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/sleep/assessments`, params)
}

/**
 * 保存睡眠评估 AI 建议（JWT 接口）
 * 路径：PUT /patients/{patientId}/sleep/assessments/{assessmentId}/advice
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} assessmentId 评估记录 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} aiSuggestion AI 建议文本，内部包装为 { aiSuggestion } 上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function saveSleepAssessmentAdviceById(patientId, assessmentId, aiSuggestion) {
  return http.put(
    `/patients/${encodeURIComponent(String(patientId))}/sleep/assessments/${encodeURIComponent(String(assessmentId))}/advice`,
    { aiSuggestion }
  )
}

/**
 * 查询患者睡眠设备绑定（JWT 接口）
 * 路径：GET /patients/{patientId}/sleep/device
 * @param {string} patientId 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} DeviceBinding 数组，元素含 id/userId（雪花 ID 字符串）、
 *   deviceType（SLEEP_MONITOR/WEIGHT_SCALE）、name、model、mac、firmware、battery（0-100）、
 *   lastSyncedAt、createTime、updateTime
 */
export function getSleepDeviceByPatientId(patientId) {
  return http.get(`/patients/${encodeURIComponent(String(patientId))}/sleep/device`)
}

/* -------------------------------------------------------------------------- */
/*  运动康复方案（PC 管理端）                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 查询患者运动周完成率（JWT 接口）
 * 路径：GET /patients/{id}/exercise/weekly-completion
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} ExerciseWeeklyCompletion：{ completionRate 完成率 0-100,
 *   completedCount 已完成数, plannedCount 计划数, weekRange 周区间, trend 预留每日趋势数组 }
 */
export function getExerciseWeeklyCompletionById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/exercise/weekly-completion`)
}

/**
 * 获取患者运动方案（JWT 接口，管理端）
 * 路径：GET /patients/{id}/exercise/plan
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} ExerciseAdminPlan：{ planId（雪花 ID 字符串，无方案时为 null）、
 *   items ExercisePlanItem 动作项数组、loopEnabled 是否循环 }
 */
export function getExercisePlanById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/exercise/plan`)
}

/**
 * 保存患者运动方案（JWT 接口，整体覆盖）
 * 路径：PUT /patients/{id}/exercise/plan
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 方案内容（ExerciseAdminPlanRequest）
 * @param {Array<Object>} [data.items] 动作项数组（ExercisePlanItem），内嵌 id/planId/sourceActionId 等雪花 ID 按字符串传入
 * @param {boolean} [data.loopEnabled] 是否循环执行
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function saveExercisePlanById(id, data) {
  const payload = { ...data }
  if (Array.isArray(payload.items)) {
    payload.items = payload.items.map((item) =>
      stringifyIdFields({ ...item }, ['id', 'planId', 'sourceActionId'])
    )
  }
  return http.put(`/patients/${encodeURIComponent(String(id))}/exercise/plan`, payload)
}

/**
 * 保存运动方案动作项排序（JWT 接口）
 * 路径：PUT /patients/{id}/exercise/plan/order
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Array<string>} itemIds 动作项 ID 数组（雪花 ID 字符串），按期望顺序排列，内部包装为 { itemIds }
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function saveExercisePlanOrderById(id, itemIds) {
  return http.put(`/patients/${encodeURIComponent(String(id))}/exercise/plan/order`, {
    itemIds: stringifyIdArray(itemIds)
  })
}

/**
 * 归档单个运动动作项（JWT 接口）
 * 路径：POST /patients/{id}/exercise/plan/items/{itemId}/archive
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} itemId 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function archiveExercisePlanItemById(id, itemId) {
  return http.post(
    `/patients/${encodeURIComponent(String(id))}/exercise/plan/items/${encodeURIComponent(String(itemId))}/archive`
  )
}

/**
 * 批量归档运动动作项（JWT 接口）
 * 路径：POST /patients/{id}/exercise/plan/items/archive
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Array<string>} itemIds 动作项 ID 数组（雪花 ID 字符串），内部包装为 { itemIds }
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function archiveExercisePlanItemsById(id, itemIds) {
  return http.post(`/patients/${encodeURIComponent(String(id))}/exercise/plan/items/archive`, {
    itemIds: stringifyIdArray(itemIds)
  })
}

/**
 * 人工解锁运动动作项（JWT 接口，客服/医生/公司管理；用于解除 PAUSED 异常状态）
 * 路径：PUT /patients/{id}/exercise/items/{itemId}/unlock
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} itemId 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function unlockExercisePlanItemById(id, itemId) {
  return http.put(
    `/patients/${encodeURIComponent(String(id))}/exercise/items/${encodeURIComponent(String(itemId))}/unlock`
  )
}

/**
 * 查询运动动作库（JWT 接口，配置方案时选择动作）
 * 路径：GET /exercise/library
 * @param {Object} [params] 查询参数
 * @param {string} [params.category] 术式分类
 * @param {string} [params.mediaType] 媒体类型，枚举：VIDEO / IMAGE
 * @param {string} [params.keyword] 名称关键字
 * @returns {Promise<Array<Object>>} ExerciseActionLibrary 数组，元素含 id（雪花 ID 字符串）、name、
 *   surgeryCategory、mediaType、mediaUrl、defaultSets/defaultReps/defaultDuration、durationUnit、
 *   description、enabled、sortNo
 */
export function getExerciseLibrary(params = {}) {
  return http.get('/exercise/library', params)
}

/**
 * 查询运动自评项目库（JWT 接口）
 * 路径：GET /exercise/self-eval/library
 * @param {Object} [params] 查询参数
 * @param {string} [params.type] 评估类型，枚举：NUMERIC/SINGLE/MULTIPLE/YESNO/TEXT
 * @param {string} [params.keyword] 名称关键字
 * @returns {Promise<Array<Object>>} ExerciseEvalLibrary 数组，元素含 id（雪花 ID 字符串）、name、
 *   evalType、required、minValue/maxValue、optionsJson、prompt、enabled、sortNo
 */
export function getExerciseSelfEvalLibrary(params = {}) {
  return http.get('/exercise/self-eval/library', params)
}

/**
 * 查询患者运动自评配置（JWT 接口）
 * 路径：GET /patients/{id}/exercise/self-eval-config
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} ExerciseSelfEvalConfig：{ fieldsJson 配置 JSON 字符串, fields 评估字段配置数组 }
 */
export function getExerciseSelfEvalConfigById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/exercise/self-eval-config`)
}

/**
 * 保存患者运动自评配置（JWT 接口）
 * 路径：PUT /patients/{id}/exercise/self-eval-config
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 配置内容（ExerciseSelfEvalConfigRequest）
 * @param {Array<Object>} data.fields 评估字段配置数组
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function saveExerciseSelfEvalConfigById(id, data) {
  return http.put(`/patients/${encodeURIComponent(String(id))}/exercise/self-eval-config`, data)
}

/* -------------------------------------------------------------------------- */
/*  健康记录与看板                                                              */
/* -------------------------------------------------------------------------- */

/**
 * 查询我的健康记录（JWT 接口，患者本人端，legacy 兼容入口）
 * 路径：GET /me/health-records
 * @param {Object} [params] 查询参数
 * @param {string} [params.type] 记录类型，枚举：NUTRITION/EXERCISE/WEIGHT/BLOOD_PRESSURE/BLOOD_GLUCOSE/
 *   MEDICATION/SLEEP/TUMOR_MARKER/BLOOD_ROUTINE/LIVER_FUNCTION/OTHER
 * @param {string} [params.from] 起始日期 yyyy-MM-dd
 * @param {string} [params.to] 结束日期 yyyy-MM-dd
 * @returns {Promise<Array<Object>>} HealthRecord 数组，元素含 id/patientId（雪花 ID 字符串）、type、
 *   metricsJson 指标 JSON、attachmentsJson 附件 JSON（≤5）、timepoint、chemoCycle、targetJson、
 *   recordedBy（PATIENT/STAFF）、recordDate、advice、advisedBy（字符串）、createTime、updateTime
 */
export function getMyHealthRecords(params = {}) {
  return http.get('/me/health-records', params)
}

/**
 * 录入我的健康数据（JWT 接口，legacy；type=WEIGHT 时统一走体重 canonical 逻辑）
 * 路径：POST /me/health-records
 * @param {Object} data 健康记录（HealthRecordInput）
 * @param {string} data.type 记录类型（必填），枚举同 getMyHealthRecords
 * @param {string} [data.metricsJson] 指标 JSON 字符串，如 {"systolic":118,"diastolic":78}
 * @param {string} [data.attachmentsJson] 附件 URL JSON 字符串（≤5）
 * @param {string} [data.timepoint] 采血/测量时点
 * @param {number} [data.chemoCycle] 化疗周期序号
 * @param {string} [data.targetJson] 目标值 JSON
 * @param {string} [data.recordDate] 记录日期 yyyy-MM-dd，未传默认今天
 * @returns {Promise<string>} 新建健康记录 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createMyHealthRecord(data) {
  return http.post('/me/health-records', data)
}

/**
 * 查询患者健康记录（JWT 接口，PC 后台查看）
 * 路径：GET /patients/{id}/health-records
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询参数
 * @param {string} [params.type] 记录类型，枚举同 getMyHealthRecords
 * @returns {Promise<Array<Object>>} HealthRecord 数组（字段同 getMyHealthRecords 返回值）
 */
export function getPatientHealthRecordsById(id, params = {}) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/health-records`, params)
}

/**
 * 后台代录患者健康数据（JWT 接口，公司管理/客服）
 * 路径：POST /patients/{id}/health-records
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 健康记录（HealthRecord），type/metricsJson/recordDate 等字段同 HealthRecord 定义
 * @returns {Promise<string>} 新建健康记录 id（雪花 ID 字符串）
 */
export function createPatientHealthRecordById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'advisedBy'])
  return http.post(`/patients/${encodeURIComponent(String(id))}/health-records`, payload)
}

/**
 * 为健康记录写建议（JWT 接口，客服/后台）
 * 路径：PUT /health-records/{id}/advice
 * @param {string} id 健康记录 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} advice 建议内容，内部包装为 { advice } 上送
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateHealthRecordAdviceById(id, advice) {
  return http.put(`/health-records/${encodeURIComponent(String(id))}/advice`, { advice })
}

/**
 * 查询患者健康看板（JWT 接口，骨架：最近 20 条 + 趋势占位）
 * 路径：GET /patients/{id}/health-dashboard
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} HealthDashboard：{ latest 最近 20 条 HealthRecord, trends 趋势聚合（当前为 TODO 占位文案） }
 */
export function getPatientHealthDashboardById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/health-dashboard`)
}

/**
 * 查询我的健康看板（JWT 接口，患者本人端，骨架）
 * 路径：GET /me/health-dashboard
 * 无请求参数
 * @returns {Promise<Object>} HealthDashboard：{ latest 最近 20 条 HealthRecord, trends 趋势占位 }
 */
export function getMyHealthDashboard() {
  return http.get('/me/health-dashboard')
}

/**
 * 拍照 AI 营养分析（JWT 接口，失败降级 mock，每日限 30 次）
 * 路径：POST /me/nutrition/analyze
 * @param {Object} data 请求体（NutritionAnalyzeRequest）
 * @param {string[]} data.imageUrls 膳食照片 URL 数组（必填，1-3 张，http/https 或 /files/ 相对路径）
 * @param {string} [data.requestId] 幂等键（10 分钟有效），重试时传同一值避免重复计费
 * @returns {Promise<Object>} NutritionAnalysis：recordId（雪花 ID 字符串）、recordDate、calories 热量、
 *   protein 蛋白质、fat 脂肪、carb 碳水、vitamin 维生素、assessment 评估（含统一免责声明）、
 *   analysisSource（AI 真实识别 / MOCK 降级）
 */
export function analyzeMyNutrition(data) {
  return http.post('/me/nutrition/analyze', data)
}

/**
 * 查询我的健康档案（JWT 接口，基本信息 + 肿瘤标志物/血常规/肝功能记录 + 历史趋势）
 * 路径：GET /me/health-archive
 * 无请求参数
 * @returns {Promise<Object>} HealthArchive：{ basicInfo HealthArchiveBasicInfo（含 hospitalId/departmentId/
 *   doctorId/attendingDoctorId 等雪花 ID 字符串与 medicalRecord 病历、scanDocs 扫描件）,
 *   tumorMarkers/bloodRoutine/liverNutrition LabModule 检验模块（含 records 与 historyTrend） }
 */
export function getMyHealthArchive() {
  return http.get('/me/health-archive')
}

/* -------------------------------------------------------------------------- */
/*  PSQI 睡眠量表（患者本人端 + 后台查看）                                       */
/* -------------------------------------------------------------------------- */

/**
 * 获取 PSQI 睡眠评估题目（JWT 接口，近 1 个月，18 题）
 * 路径：GET /me/scales/psqi
 * 无请求参数
 * @returns {Promise<Object>} PsqiQuestions：{ scaleCode PSQI, guide 引导语, timeWindow 时间窗口,
 *   questions 18 道题（q1..q9）, freqOptions/freq8Options/freq9Options 各题选项, disclaimer 免责声明 }
 */
export function getMyPsqiQuestions() {
  return http.get('/me/scales/psqi')
}

/**
 * 获取 PSQI 评估状态（JWT 接口）
 * 路径：GET /me/scales/psqi/status
 * 无请求参数
 * @returns {Promise<Object>} PsqiStatus：{ state 状态枚举 UNASSESSED 未评估/IN_PROGRESS 进行中/
 *   COMPLETED 已完成/EXPIRED 已过期, progress 答题进度, draft 进行中时的草稿, latest 最近一次有效提交 }
 */
export function getMyPsqiStatus() {
  return http.get('/me/scales/psqi/status')
}

/**
 * PSQI 断点暂存（JWT 接口，upsert 唯一草稿）
 * 路径：POST /me/scales/psqi/draft
 * @param {Object} data 草稿内容（PsqiDraftRequest）
 * @param {Object} data.answers 作答映射（必填）：q1 上床时间 HH:mm、q2 入睡分钟、q3 起床时间 HH:mm、
 *   q4 睡眠小时、q5a-q5j（0-3）、q6-q9（0-3）
 * @param {number} [data.step] 断点步号（0-18）
 * @returns {Promise<Object>} PsqiDraft：{ answers 原始作答映射, step 步号 }
 */
export function saveMyPsqiDraft(data) {
  return http.post('/me/scales/psqi/draft', data)
}

/**
 * 提交 PSQI 作答并由服务端计分（JWT 接口，总分 0-21 + 7 维度）
 * 路径：POST /me/scales/psqi/submissions
 * @param {Object} data 作答内容（PsqiSubmitRequest）
 * @param {Object} data.answers 作答映射（必填，结构同 saveMyPsqiDraft；漏答时返回 valid=false）
 * @param {number} [data.step] 断点步号（可选）
 * @returns {Promise<Object>} PsqiSubmissionResult：{ valid 是否有效（漏答为 false 且不生成结果）、
 *   score 总分（valid=true）、tier 分级（良好/轻度/中度/重度）、tierText/interpretation/levelTitle 解读文案、
 *   dimensions 7 维度、topConcerns 关注维度名、topConcernDimensions 得分最高前 2 维度 }
 */
export function submitMyPsqi(data) {
  return http.post('/me/scales/psqi/submissions', data)
}

/**
 * 分页查询我的 PSQI 历史记录（JWT 接口）
 * 路径：GET /me/scales/psqi/submissions
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ScaleSubmission>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId（雪花 ID 字符串）、scaleCode、status（DRAFT/SUBMITTED）、score、
 *   tier、tierText、dimensionsJson、valid、createTime、updateTime
 */
export function getMyPsqiSubmissions(params = {}) {
  return http.get('/me/scales/psqi/submissions', params)
}

/**
 * 查询患者 PSQI 评估结果（JWT 接口，PC 后台查看）
 * 路径：GET /patients/{id}/scales
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} ScaleSubmission 数组（字段同 getMyPsqiSubmissions 的 list 元素）
 */
export function getPatientScalesById(id) {
  return http.get(`/patients/${encodeURIComponent(String(id))}/scales`)
}

/* -------------------------------------------------------------------------- */
/*  我的运动康复（患者本人端）                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 获取我的运动康复方案（JWT 接口，含动作项与本周统计；每日重置昨日完成项）
 * 路径：GET /me/exercise/plan
 * 无请求参数
 * @returns {Promise<Object>} ExercisePlanResponse：{ planId（雪花 ID 字符串，无方案为 null）、
 *   surgeryType、generateTime、items ExercisePlanItem 动作项（按 orderNo 升序）、
 *   weeklyStats ExerciseWeeklyStats 本周统计（completionRate/completedDays/totalDays/trendText/dailyRecords） }
 */
export function getMyExercisePlan() {
  return http.get('/me/exercise/plan')
}

/**
 * 完成一组运动动作（JWT 接口，达到目标组数后动作转为 NEED_EVAL）
 * 路径：POST /me/exercise/items/{id}/complete-set
 * @param {string} id 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} 更新后的 ExercisePlanItem（id/planId/sourceActionId 为字符串，含 completedSets/status 等）
 */
export function completeMyExerciseSetById(id) {
  return http.post(`/me/exercise/items/${encodeURIComponent(String(id))}/complete-set`)
}

/**
 * 提前结束运动动作（JWT 接口，动作转为 NEED_EVAL 等待评估）
 * 路径：POST /me/exercise/items/{id}/finish
 * @param {string} id 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} 更新后的 ExercisePlanItem
 */
export function finishMyExerciseById(id) {
  return http.post(`/me/exercise/items/${encodeURIComponent(String(id))}/finish`)
}

/**
 * 暂停运动动作（JWT 接口，标记异常 PAUSED，无自动恢复，需管理端 unlock 解锁）
 * 路径：POST /me/exercise/items/{id}/pause
 * @param {string} id 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} 更新后的 ExercisePlanItem
 */
export function pauseMyExerciseById(id) {
  return http.post(`/me/exercise/items/${encodeURIComponent(String(id))}/pause`)
}

/**
 * 提交训练后评估（JWT 接口，动态表单；评估异常时动作回到 PAUSED）
 * 路径：POST /me/exercise/items/{id}/evaluation
 * @param {string} id 动作项 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 评估内容（ExerciseEvaluationRequest）
 * @param {Object} data.answers 动态表单答案（必填）：字段 id → 值
 * @param {string} [data.notes] 备注（≤512 字符）
 * @returns {Promise<Object>} ExerciseEvaluationResult：{ isAbnormal 是否异常, abnormalReasons 异常项 title 列表,
 *   itemStatus 评估后的动作状态（PENDING/NEED_EVAL/COMPLETED/PAUSED） }
 */
export function submitMyExerciseEvaluationById(id, data) {
  return http.post(`/me/exercise/items/${encodeURIComponent(String(id))}/evaluation`, data)
}

/**
 * 获取运动评估表单配置（JWT 接口，PC 可维护；配置缺失时服务端失败关闭返回 code=400）
 * 路径：GET /me/exercise/eval-config
 * 无请求参数
 * @returns {Promise<Array<Object>>} ExerciseEvalConfigField 数组，元素含 id、title、
 *   type（slider/radio/checkbox/number/boolean/textarea）、required、min/max/step、minLabel/maxLabel、
 *   abnormalThreshold（slider 超过即异常）、options 选项
 */
export function getMyExerciseEvalConfig() {
  return http.get('/me/exercise/eval-config')
}

/* -------------------------------------------------------------------------- */
/*  体重记录与 BLE 设备（患者本人端）                                            */
/* -------------------------------------------------------------------------- */

/**
 * 查询我的体重记录（JWT 接口，最近最多 200 条）
 * 路径：GET /me/weight/records
 * @param {Object} [params] 查询参数
 * @param {string} [params.range] 时间范围，枚举：7d 近 7 天（默认）/ 30d 近 30 天
 * @returns {Promise<Array<Object>>} WeightRecord 数组，元素含 id（雪花 ID 字符串）、weightKg、
 *   source（MANUAL 手动/SCALE 体脂秤）、recordDate（yyyy-MM-dd）、createTime
 */
export function getMyWeightRecords(params = {}) {
  return http.get('/me/weight/records', params)
}

/**
 * 新增我的体重记录（JWT 接口，recordDate 固定为今天）
 * 路径：POST /me/weight/records
 * @param {Object} data 体重内容（WeightRecordRequest）
 * @param {number} data.weightKg 体重（必填，范围 25.0-250.0 kg）
 * @param {string} [data.source] 来源，枚举：MANUAL（缺省）/ SCALE（体脂秤同步产生）
 * @returns {Promise<Object>} 创建成功的 WeightRecord（id 为雪花 ID 字符串）
 */
export function createMyWeightRecord(data) {
  return http.post('/me/weight/records', data)
}

/**
 * 删除我的体重记录（JWT 接口，仅能删除本人未删除的记录）
 * 路径：DELETE /me/weight/records/{id}
 * @param {string} id 体重记录 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteMyWeightRecordById(id) {
  return http.delete(`/me/weight/records/${encodeURIComponent(String(id))}`)
}

/**
 * 查询本人已绑定 BLE 设备列表（JWT 接口）
 * 路径：GET /me/devices
 * 无请求参数
 * @returns {Promise<Array<Object>>} DeviceBinding 数组，元素含 id/userId（雪花 ID 字符串）、
 *   deviceType（SLEEP_MONITOR 睡眠仪/WEIGHT_SCALE 体脂秤）、name、model、mac、firmware、
 *   battery（0-100）、lastSyncedAt、createTime、updateTime
 */
export function getMyDevices() {
  return http.get('/me/devices')
}

/**
 * 绑定 BLE 设备（JWT 接口，同一用户同一 MAC 不可重复绑定）
 * 路径：POST /me/devices
 * @param {Object} data 设备信息（DeviceBindRequest）
 * @param {string} data.deviceType 设备类型（必填），枚举：SLEEP_MONITOR / WEIGHT_SCALE
 * @param {string} data.name 设备名称（必填）
 * @param {string} [data.model] 设备型号
 * @param {string} [data.mac] MAC 地址（同用户同 MAC 唯一）
 * @returns {Promise<Object>} 绑定成功的 DeviceBinding（id 为雪花 ID 字符串）
 */
export function bindMyDevice(data) {
  return http.post('/me/devices', data)
}

/**
 * 解绑本人设备（JWT 接口）
 * 路径：DELETE /me/devices/{id}
 * @param {string} id 设备 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function unbindMyDeviceById(id) {
  return http.delete(`/me/devices/${encodeURIComponent(String(id))}`)
}

/**
 * 同步设备数据（JWT 接口；体脂秤必传 weightKg 并 upsert 当日 SCALE 体重记录，睡眠仪仅更新时间/电量）
 * 路径：POST /me/devices/{id}/sync
 * @param {string} id 设备 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [data] 同步数据（DeviceSyncRequest，可省略）
 * @param {number} [data.weightKg] 体重（体脂秤必填，25.0-250.0 kg；睡眠仪不可传）
 * @param {number} [data.battery] 电量 0-100
 * @returns {Promise<Object>} DeviceSyncResult：设备信息（id/userId 字符串等）+ weightRecord 体脂秤同步生成的当日 SCALE 体重记录
 */
export function syncMyDeviceById(id, data) {
  return http.post(`/me/devices/${encodeURIComponent(String(id))}/sync`, data)
}

/* -------------------------------------------------------------------------- */
/*  我的用药（患者本人端，v3 简化模型）                                          */
/* -------------------------------------------------------------------------- */

/**
 * 查询今日用药列表（JWT 接口，status 由当日打卡情况推导）
 * 路径：GET /me/medication/today
 * 无请求参数
 * @returns {Promise<Array<Object>>} MedicationItem 数组，元素含 id（雪花 ID 字符串）、name 药名、
 *   timesPerDay 每日次数（1-3）、status（PENDING 待服/TAKEN 已服）、createdAt
 */
export function getMyMedicationToday() {
  return http.get('/me/medication/today')
}

/**
 * 添加我的用药（JWT 接口，v3 仅需药名 + 每日次数，不再设置提醒时间）
 * 路径：POST /me/medication
 * @param {Object} data 用药内容（MedicationAddRequest）
 * @param {string} data.name 药名（必填）
 * @param {number} data.timesPerDay 每日次数（必填，1-3）
 * @returns {Promise<Object>} 创建成功的 MedicationItem（id 为雪花 ID 字符串）
 */
export function addMyMedication(data) {
  return http.post('/me/medication', data)
}

/**
 * 用药打卡（JWT 接口，当日重复调用幂等）
 * 路径：POST /me/medication/{id}/take
 * @param {string} id 用药 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function takeMyMedicationById(id) {
  return http.post(`/me/medication/${encodeURIComponent(String(id))}/take`)
}

/**
 * 删除我的用药提醒（JWT 接口）
 * 路径：DELETE /me/medication/{id}
 * @param {string} id 用药 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteMyMedicationById(id) {
  return http.delete(`/me/medication/${encodeURIComponent(String(id))}`)
}

/**
 * 用药提醒设置（JWT 接口，已移除：服务端固定返回 code=400，仅保留契约占位，前端不应再调用）
 * 路径：PUT /me/medication/reminder
 * @returns {Promise<null>} 实际固定失败，ApiError code=400
 */
export function updateMyMedicationReminder() {
  return http.put('/me/medication/reminder')
}

export default {
  getMedicationRemindersByPatientId,
  createMedicationReminderByPatientId,
  updateMedicationReminderById,
  deleteMedicationReminderById,
  updateMedicationReminderPushById,
  getMedicationRecordsByPatientId,
  updateMedicationRecordByLogId,
  getSleepAssessmentsByPatientId,
  saveSleepAssessmentAdviceById,
  getSleepDeviceByPatientId,
  getExerciseWeeklyCompletionById,
  getExercisePlanById,
  saveExercisePlanById,
  saveExercisePlanOrderById,
  archiveExercisePlanItemById,
  archiveExercisePlanItemsById,
  unlockExercisePlanItemById,
  getExerciseLibrary,
  getExerciseSelfEvalLibrary,
  getExerciseSelfEvalConfigById,
  saveExerciseSelfEvalConfigById,
  getMyHealthRecords,
  createMyHealthRecord,
  getPatientHealthRecordsById,
  createPatientHealthRecordById,
  updateHealthRecordAdviceById,
  getPatientHealthDashboardById,
  getMyHealthDashboard,
  analyzeMyNutrition,
  getMyHealthArchive,
  getMyPsqiQuestions,
  getMyPsqiStatus,
  saveMyPsqiDraft,
  submitMyPsqi,
  getMyPsqiSubmissions,
  getPatientScalesById,
  getMyExercisePlan,
  completeMyExerciseSetById,
  finishMyExerciseById,
  pauseMyExerciseById,
  submitMyExerciseEvaluationById,
  getMyExerciseEvalConfig,
  getMyWeightRecords,
  createMyWeightRecord,
  deleteMyWeightRecordById,
  getMyDevices,
  bindMyDevice,
  unbindMyDeviceById,
  syncMyDeviceById,
  getMyMedicationToday,
  addMyMedication,
  takeMyMedicationById,
  deleteMyMedicationById,
  updateMyMedicationReminder
}
