/**
 * 医生模块接口（api/swagger.json 中 tag = doctor 的全部接口，共 21 个；含医生库管理 + 医生端工作台）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如医生/患者/咨询/附件 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/attId、query 与请求体内各 id 字段、医患 id 数组）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名
 * - 路径含 {id}/{attId} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 等 ById 后缀
 * - /doctors 为公司管理端医生库；/doctor 为医生本人端（函数名带 My 区分）
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

/** 把 id 数组中的每个元素转为字符串（医患绑定 id 列表等） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/* -------------------------------------------------------------------------- */
/*  医生库管理（公司管理/驻点）                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询医生列表（JWT 接口）
 * 路径：GET /doctors
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 姓名/手机号关键字
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.title] 职称，枚举：主任医师/副主任医师/主治医师/住院医师
 * @param {string} [params.doctorStatus] 执业状态，枚举：ACTIVE 在职/SUSPENDED 停诊/RESIGNED 离职/CANCELLED 注销
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DoctorView>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、gender、title、phone、hospitalId/areaId/departmentId/managerId（字符串）、
 *   specialty、email、introduction、certNumber/practiceNumber、education、workYears、avatar、expertise 擅长数组、
 *   managerName、teamSize、patientCount、doctorStatus、statusReason、entrySource、entryUserId（字符串）、status、createTime
 */
export function getDoctorPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'departmentId'])
  return http.get('/doctors', query)
}

/**
 * 录入医生（JWT 接口，ADMIN/驻点；手机号必填且唯一）
 * 路径：POST /doctors
 * @param {Object} data 医生内容（DoctorRequest）
 * @param {string} data.name 姓名（必填）
 * @param {string} data.title 职称（必填），枚举：主任医师/副主任医师/主治医师/住院医师
 * @param {string} data.phone 手机号（必填，全局唯一）
 * @param {string} data.hospitalId 医院 ID（必填，雪花 ID 字符串）
 * @param {string} data.departmentId 科室 ID（必填，雪花 ID 字符串）
 * @param {string} [data.gender] 性别
 * @param {string} [data.areaId] 院区 ID，雪花 ID 字符串
 * @param {string} [data.specialty] 专长
 * @param {string} [data.email] 邮箱
 * @param {string} [data.introduction] 个人简介
 * @param {string} [data.idCard] 身份证号
 * @param {string} [data.certNumber] 医师资格证号
 * @param {string} [data.practiceNumber] 执业证号
 * @param {string} [data.education] 学历
 * @param {string} [data.graduateSchool] 毕业院校
 * @param {number} [data.workYears] 从业年限
 * @param {string} [data.avatar] 头像 URL
 * @param {string[]} [data.expertise] 擅长领域数组
 * @param {string} [data.managerId] 上级医生 ID，雪花 ID 字符串
 * @param {number} [data.status] 启用状态：1 启用 / 0 停用
 * @returns {Promise<string>} 新建医生 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createDoctor(data) {
  const payload = stringifyIdFields({ ...data }, ['hospitalId', 'areaId', 'departmentId', 'managerId'])
  return http.post('/doctors', payload)
}

/**
 * 获取医生详情（JWT 接口）
 * 路径：GET /doctors/{id}
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DoctorView：完整医生信息（字段同 getDoctorPage 的 list 元素）
 */
export function getDoctorById(id) {
  return http.get(`/doctors/${encodeURIComponent(String(id))}`)
}

/**
 * 编辑医生（JWT 接口，字段同 createDoctor，name/title/phone/hospitalId/departmentId 必填）
 * 路径：PUT /doctors/{id}
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 医生内容（DoctorRequest）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDoctorById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['hospitalId', 'areaId', 'departmentId', 'managerId'])
  return http.put(`/doctors/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 变更医生执业状态（JWT 接口）
 * 路径：PUT /doctors/{id}/status
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 状态内容（DoctorStatusRequest）
 * @param {string} data.doctorStatus 目标状态（必填），枚举：ACTIVE 在职/SUSPENDED 停诊/RESIGNED 离职/CANCELLED 注销
 * @param {string} [data.reason] 变更原因
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDoctorStatusById(id, data) {
  return http.put(`/doctors/${encodeURIComponent(String(id))}/status`, data)
}

/**
 * 设置上级医生（JWT 接口）
 * 路径：PUT /doctors/{id}/manager
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} managerId 上级医生 ID，雪花 ID 字符串；内部包装为 { managerId }
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDoctorManagerById(id, managerId) {
  return http.put(`/doctors/${encodeURIComponent(String(id))}/manager`, {
    managerId: managerId === undefined || managerId === null ? managerId : String(managerId)
  })
}

/**
 * 在职医生下拉（JWT 接口，仅返回在职医生，供选择/分配用）
 * 路径：GET /doctors/options
 * @param {Object} [params] 过滤参数
 * @param {string} [params.hospitalId] 医院 ID，雪花 ID 字符串
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.keyword] 姓名关键字
 * @returns {Promise<Array<Object>>} DoctorView 数组（精简在职列表，id 为雪花 ID 字符串）
 */
export function getDoctorOptions(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['hospitalId', 'departmentId'])
  return http.get('/doctors/options', query)
}

/* -------------------------------------------------------------------------- */
/*  医生团队、医患关系与变更历史                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 获取医生团队（JWT 接口，返回本人、上级、直接下级与隔级下级）
 * 路径：GET /doctors/{id}/team
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} { doctor DoctorView 本人, manager 上级医生（无则空对象）,
 *   children DoctorView[] 直接下级, grandchildren DoctorView[] 隔级下级 }，各 id 均为雪花 ID 字符串
 */
export function getDoctorTeamById(id) {
  return http.get(`/doctors/${encodeURIComponent(String(id))}/team`)
}

/**
 * 分页查询医生负责患者（JWT 接口）
 * 路径：GET /doctors/{id}/patients
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DoctorPatientBrief>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、phone、surgeryType、healthStatus
 */
export function getDoctorPatientsById(id, params = {}) {
  return http.get(`/doctors/${encodeURIComponent(String(id))}/patients`, params)
}

/**
 * 绑定/解绑医患关系（JWT 接口，按两个数组做增量处理）
 * 路径：PUT /doctors/{id}/patients
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 患者 ID 集合
 * @param {Array<string>} [data.addPatientIds] 待绑定患者 ID 数组（雪花 ID 字符串）
 * @param {Array<string>} [data.removePatientIds] 待解绑患者 ID 数组（雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateDoctorPatientsById(id, data) {
  const payload = {
    addPatientIds: stringifyIdArray(data.addPatientIds),
    removePatientIds: stringifyIdArray(data.removePatientIds)
  }
  return http.put(`/doctors/${encodeURIComponent(String(id))}/patients`, payload)
}

/**
 * 分页查询医生变更历史（JWT 接口）
 * 路径：GET /doctors/{id}/change-logs
 * @param {string} id 医生 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.changeType] 变更类型，枚举：TITLE 职称/TEAM 团队/STATUS 状态/INFO 信息
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DoctorChangeLog>：{ list, total, page, pageSize }；
 *   list 元素含 id/doctorId/operatorId（雪花 ID 字符串）、changeType、beforeJson 变更前 JSON、
 *   afterJson 变更后 JSON、reason、operatorName、createTime
 */
export function getDoctorChangeLogsById(id, params = {}) {
  return http.get(`/doctors/${encodeURIComponent(String(id))}/change-logs`, params)
}

/* -------------------------------------------------------------------------- */
/*  医生端：咨询处理与个人档案                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询医生待处理咨询（JWT 接口，医生本人端）
 * 路径：GET /doctor/consultations
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.status] 咨询状态过滤
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<ConsultationView>：{ list, total, page, pageSize }；
 *   list 元素含 consultation 咨询实体（内嵌 id 等雪花 ID 为字符串）、patientName、patientId（字符串）、
 *   doctorCount、replyCount、unreadReplies
 */
export function getMyConsultations(params = {}) {
  return http.get('/doctor/consultations', params)
}

/**
 * 医生查看咨询（JWT 接口，标记已读/进入处理）
 * 路径：PUT /doctor/consultations/{id}/view
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function viewMyConsultationById(id) {
  return http.put(`/doctor/consultations/${encodeURIComponent(String(id))}/view`)
}

/**
 * 医生回复咨询（JWT 接口）
 * 路径：POST /doctor/consultations/{id}/replies
 * @param {string} id 咨询 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 回复内容（DoctorConsultationReplyRequest）
 * @param {string} data.content 回复正文（必填）
 * @param {string[]} [data.attachments] 附件 URL 数组
 * @param {boolean} [data.supplemental] 是否补充回复
 * @returns {Promise<Object>} ConsultationReply：id/consultationId/doctorId/doctorUserId（雪花 ID 字符串）、
 *   content、attachmentJson、supplemental、unread、createTime
 */
export function replyMyConsultationById(id, data) {
  return http.post(`/doctor/consultations/${encodeURIComponent(String(id))}/replies`, data)
}

/**
 * 获取医生个人档案（JWT 接口，医生本人端）
 * 路径：GET /doctor/profile
 * 无请求参数
 * @returns {Promise<Object>} DoctorProfile：name、gender、phone、email、hospitalId/departmentId（雪花 ID 字符串）、
 *   hospitalName、departmentName、title、specialty、bio 个人简介、certified 账号是否启用、
 *   prescriptionSignEnabled 电子处方签名权限位（0/1，仅展示）
 */
export function getMyDoctorProfile() {
  return http.get('/doctor/profile')
}

/**
 * 编辑医生个人档案（JWT 接口，写入 dict_doctor，5 个必填字段）
 * 路径：PUT /doctor/profile
 * @param {Object} data 档案内容（DoctorProfileUpdateRequest）
 * @param {string} data.name 姓名（必填）
 * @param {string} data.phone 手机号（必填）
 * @param {string} data.hospitalId 医院 ID（必填，雪花 ID 字符串）
 * @param {string} data.departmentId 科室 ID（必填，雪花 ID 字符串）
 * @param {string} data.title 职称（必填）
 * @param {string} [data.specialty] 专长
 * @param {string} [data.bio] 个人简介
 * @param {string} [data.email] 邮箱
 * @param {string} [data.gender] 性别
 * @returns {Promise<Object>} 更新后的 DoctorProfile
 */
export function updateMyDoctorProfile(data) {
  const payload = stringifyIdFields({ ...data }, ['hospitalId', 'departmentId'])
  return http.put('/doctor/profile', payload)
}

/* -------------------------------------------------------------------------- */
/*  医生端：本人患者、临床档案、附件与只读群聊                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询本人患者列表（JWT 接口，支持多条件搜索与手术日期区间/排序）
 * 路径：GET /doctor/patients
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 关键词（姓名/手机号/术式/病症/入院诊断）
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.from] 手术日期起，格式 yyyy-MM-dd
 * @param {string} [params.to] 手术日期止，格式 yyyy-MM-dd
 * @param {string} [params.sort] 排序方向 asc/desc，默认 desc（按 surgery_date）
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<DoctorPatientRow>：{ list, total, page, pageSize }；
 *   list 元素含 id/hospitalId/departmentId（雪花 ID 字符串）、name、gender、age、phone、surgeryType、
 *   surgeryDate、hospitalName、departmentName、healthStatus、mainDiagnosis（入院诊断优先，缺失回退病症介绍）
 */
export function getMyPatients(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['departmentId'])
  return http.get('/doctor/patients', query)
}

/**
 * 获取患者 10 模块临床档案（JWT 接口，进入时服务端自动写访问审计）
 * 路径：GET /doctor/patients/{id}/archive
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DoctorArchive：{ basicInfo 基本信息（含 sources/medicalRecord/scanDocs）,
 *   attachments 全部附件, diet/exercise/weight 各 ClinicalTrendModule（latest + trend7d）,
 *   bloodGlucosePressure（glucose/bloodPressure 各含 latest + trend7d）,
 *   tumorMarkers/bloodRoutine/liverNutrition 各 ClinicalLabModule（latestCards + trend30d）,
 *   otherAttachments 非本人上传的附件（只读） }，内嵌各 id 均为雪花 ID 字符串
 */
export function getMyPatientArchiveById(id) {
  return http.get(`/doctor/patients/${encodeURIComponent(String(id))}/archive`)
}

/**
 * 登记患者附件（JWT 接口；文件本体需先经 POST /files/upload 拿到 url，这里只登记元数据）
 * 路径：POST /doctor/patients/{id}/attachments
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 附件元数据（AttachmentCreateRequest）
 * @param {string} data.category 分类（必填），枚举：检查报告/影像资料/病理资料/饮食记录/运动记录/其他
 * @param {string} data.fileName 文件名（必填）
 * @param {number} [data.fileSize] 文件大小（字节）
 * @param {string} data.url 文件 URL（必填，来自 /files/upload 返回值）
 * @returns {Promise<Object>} PatientAttachment：id/patientId/uploaderId（雪花 ID 字符串）、category、
 *   fileName、fileSize、url、uploaderRole、createTime、updateTime
 */
export function createMyPatientAttachmentById(id, data) {
  return http.post(`/doctor/patients/${encodeURIComponent(String(id))}/attachments`, data)
}

/**
 * 删除本人上传的患者附件（JWT 接口；他人上传的附件只读，删除返回 code=403）
 * 路径：DELETE /doctor/patients/{id}/attachments/{attId}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} attId 附件 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteMyPatientAttachmentById(id, attId) {
  return http.delete(
    `/doctor/patients/${encodeURIComponent(String(id))}/attachments/${encodeURIComponent(String(attId))}`
  )
}

/**
 * 获取患者只读群聊（JWT 接口，进入时服务端自动写访问审计；医生端不可发消息）
 * 路径：GET /doctor/patients/{id}/conversation
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} DoctorConversation：{ conversation Conversation 会话实体,
 *   groupMeta GroupMeta 群元信息, members 成员快照（已解析为字符串数组）, messages Message[] 只读消息列表 }，
 *   内嵌各 id 均为雪花 ID 字符串
 */
export function getMyPatientConversationById(id) {
  return http.get(`/doctor/patients/${encodeURIComponent(String(id))}/conversation`)
}

/* -------------------------------------------------------------------------- */
/*  驻点协助注册：字典占位（pending，后端接口未提供，禁止编造 URL）                */
/* -------------------------------------------------------------------------- */

/**
 * 职称字典下拉（pending：后端职称字典接口尚未提供，不得编造 URL）
 * 待后端字典接口替换；接通前调用方（doctorCreate）使用本地职称常量，不调用本函数
 * @returns {Promise<Array>} 占位固定返回空数组，避免在无 URL 的情况下发起请求
 */
export function getDictTitleList() {
  // pending: 后端职称字典接口待补，禁止编造 URL
  return Promise.resolve([])
}

/**
 * 医院字典下拉（pending：后端医院字典列表接口尚未提供，不得编造 URL）
 * 待后端接口替换；接通前驻点注册页医院下拉保持 disabled + tooltip「医院字典接口待补」
 * @param {Object} [params] 预留过滤参数（如 areaId），后端接口定稿后透传
 * @returns {Promise<Array>} 占位固定返回空数组，避免在无 URL 的情况下发起请求
 */
export function getDictHospitalList(params = {}) {
  // pending: 后端医院字典接口待补，禁止编造 URL
  return Promise.resolve([])
}

export default {
  getDoctorPage,
  createDoctor,
  getDoctorById,
  updateDoctorById,
  updateDoctorStatusById,
  updateDoctorManagerById,
  getDoctorOptions,
  getDoctorTeamById,
  getDoctorPatientsById,
  updateDoctorPatientsById,
  getDoctorChangeLogsById,
  getMyConsultations,
  viewMyConsultationById,
  replyMyConsultationById,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyPatients,
  getMyPatientArchiveById,
  createMyPatientAttachmentById,
  deleteMyPatientAttachmentById,
  getMyPatientConversationById,
  getDictTitleList,
  getDictHospitalList
}
