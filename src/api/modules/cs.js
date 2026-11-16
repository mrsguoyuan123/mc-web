/**
 * 客服工作台模块接口（api/swagger.json 中 tag = cs 的全部接口，共 9 个，移动端客服工作台）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如患者 id/时间线 id）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number；
 *   本模块请求体（CsCallRecordRequest）无 int64 主键字段，无需额外 id 归一化
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>；
 *   数据范围由服务端强制：CS 仅能看本人匹配患者，ADMIN 可看全量
 *
 * 命名规范：
 * - 查询用 get + 资源名，动作用 start/create + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / createXxxById / startXxxById 等 ById 后缀
 */

import { http } from '../frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  客服患者列表与统计                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询客服患者列表（JWT 接口；CS 仅返回本人匹配患者，ADMIN 返回全量）
 * 路径：GET /cs/patients
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 姓名/手机号关键字
 * @param {string} [params.communicateStatus] 沟通状态，枚举：PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / PURCHASED 已购买
 * @param {string} [params.purchaseIntent] 购买意向，枚举：HIGH 高 / MEDIUM 中 / LOW 低 / PURCHASED 已购买
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<CsPatientRow>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、phone、surgeryType、hospitalName、surgeon 主治医生姓名、
 *   surgeryRegion、communicateStatus、purchaseIntent、servicePackage、latestCallTime
 */
export function getCsPatientPage(params = {}) {
  return http.get('/cs/patients', params)
}

/**
 * 获取客服工作台统计（JWT 接口）
 * 路径：GET /cs/stats
 * 无请求参数
 * @returns {Promise<Object>} CsStats：{ highIntent 高意向患者数（purchaseIntent=HIGH）,
 *   pendingCall 待沟通患者数（communicateStatus=PENDING）,
 *   pendingReply 待回复会话数（会话最后一条来自患者且当前客服未读） }
 */
export function getCsStats() {
  return http.get('/cs/stats')
}

/* -------------------------------------------------------------------------- */
/*  患者详情、AI 能力与电话状态                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 获取客服视角患者详情（JWT 接口，含手术档案、AI 摘要缓存与沟通时间线）
 * 路径：GET /cs/patients/{id}
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} CsPatientDetail：id（字符串）、name、gender、age、phone、region、
 *   surgeryRegion、hospitalId/departmentId/doctorId（雪花 ID 字符串）、hospitalName、surgeon、surgeryType、
 *   surgeryDate（yyyy-MM-dd）、diseaseIntro、healthStatus、tagsJson、communicateStatus、purchaseIntent、
 *   servicePackage、surgeryArchive 手术档案（surgeryType/surgeryDate/hospitalName/surgeon/surgeryRegion/diseaseIntro）、
 *   aiSummary AI 沟通摘要只读缓存（可能为 null）、timeline 时间线数组（type MESSAGE/CALL、id 字符串、time/title/content/actor）
 */
export function getCsPatientById(id) {
  return http.get(`/cs/patients/${encodeURIComponent(String(id))}`)
}

/**
 * 获取 AI 沟通关键点总结（JWT 接口，30 分钟缓存，AI 失败时降级 mock）
 * 路径：GET /cs/patients/{id}/ai-summary
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} CsAiSummary：{ text 总结文本, tags 关键点标签数组, source 来源 AI 真实/MOCK 降级 }
 */
export function getCsPatientAiSummaryById(id) {
  return http.get(`/cs/patients/${encodeURIComponent(String(id))}/ai-summary`)
}

/**
 * 获取 AI 沟通初步预判（JWT 接口，30 分钟缓存，AI 失败时降级 mock）
 * 路径：GET /cs/patients/{id}/ai-prediction
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} CsAiPrediction：{ suggestions 沟通建议数组, source 来源 AI/MOCK }
 */
export function getCsPatientAiPredictionById(id) {
  return http.get(`/cs/patients/${encodeURIComponent(String(id))}/ai-prediction`)
}

/**
 * 获取电话按钮状态（JWT 接口，用于未拨打=绿色/已拨打=蓝色的按钮展示）
 * 路径：GET /cs/patients/{id}/phone-status
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} CsPhoneStatus：{ called 是否已拨打（由最新通话记录推导）, latestCallTime 最近通话时间 }
 */
export function getCsPatientPhoneStatusById(id) {
  return http.get(`/cs/patients/${encodeURIComponent(String(id))}/phone-status`)
}

/* -------------------------------------------------------------------------- */
/*  FAQ、通话记录与双呼                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 查询客服 FAQ（JWT 接口，取启用中的知识库问答，按术式 + 关键词匹配）
 * 路径：GET /cs/faq
 * @param {Object} [params] 查询参数
 * @param {string} [params.keyword] 问题模糊关键字
 * @param {string} [params.surgeryType] 手术类型（含通用问答）
 * @returns {Promise<Array<Object>>} KbEntry 数组，元素含 id（雪花 ID 字符串）、question、answer、category、
 *   department、similarQuestionsJson、surgeryType、tagsJson、publishStatus、status、hitCount 等
 */
export function getCsFaq(params = {}) {
  return http.get('/cs/faq', params)
}

/**
 * 提交通话记录（JWT 接口，表单超集；pushToGroup=true 且 SUCCESS 时同步 CALL_RECORD 卡片到沟通群）
 * 路径：POST /cs/patients/{id}/calls
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 通话记录（CsCallRecordRequest）
 * @param {string} data.callStatus 通话结果（必填），枚举：SUCCESS 成功 / FAILED 失败
 * @param {string} [data.failReason] 失败原因，枚举：NO_ANSWER 无人接听 / WRONG_NUMBER 号码错误 / REJECTED 拒接 / INTERRUPTED 通话中断
 * @param {number} [data.durationSec] 通话时长秒数；SUCCESS 必填且 ≥0，FAILED 可空
 * @param {string} [data.medicationStatus] 用药情况，枚举：ON_TIME / OCCASIONAL_MISS / STOPPED / SELF_ADJUSTED
 * @param {string} [data.recoveryStatus] 恢复情况，枚举：GOOD / FAIR / POOR
 * @param {string} [data.complianceStatus] 依从性，枚举：FULL / PARTIAL / NONE
 * @param {string} [data.coreElements] 核心要素（≤1024）
 * @param {string} [data.precautions] 注意事项宣教（≤1024）
 * @param {string} [data.problems] 问题记录（≤1024）
 * @param {string} [data.recordRemark] 记录备注（≤1024）
 * @param {string} [data.servicePackageFeedback] 服务包反馈，枚举：USED_CORE / NOT_USED / ISSUES
 * @param {string} [data.repurchaseIntent] 复购意向，枚举：INTERESTED / NOT_INTERESTED / UNSURE
 * @param {number} [data.ivrSatisfaction] 患者 IVR 按键满意度 1-5
 * @param {string} [data.improvementSuggestion] 改进建议（≤1024）
 * @param {string} [data.otherDemand] 其他需求（≤1024）
 * @param {boolean} [data.secondarySales] 二次销售潜力（仅客服可见）
 * @param {string} [data.csRemark] 仅客服可见备注（≤1024）
 * @param {boolean} [data.pushToGroup] true 且 SUCCESS 时同步通话记录卡片到沟通群
 * @param {string} [data.callId] 双呼会话 id（非空时用于提交幂等）
 * @param {string} [data.virtualNumber] 虚拟保护号
 * @returns {Promise<Object>} FollowUpCallRecord：落库后的通话记录（id/taskId/patientId/csId 为雪花 ID 字符串）
 */
export function createCsCallRecordById(id, data) {
  return http.post(`/cs/patients/${encodeURIComponent(String(id))}/calls`, data)
}

/**
 * 发起双呼（JWT 接口，通过虚拟保护号联系患者，隐藏双方真实号码）
 * 路径：POST /cs/patients/{id}/call
 * @param {string} id 患者 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} CallSession：{ callId 双呼会话 id（后续提交通话记录时回传做幂等）, virtualNumber 虚拟保护号 }
 */
export function startCsCallById(id) {
  return http.post(`/cs/patients/${encodeURIComponent(String(id))}/call`)
}

export default {
  getCsPatientPage,
  getCsStats,
  getCsPatientById,
  getCsPatientAiSummaryById,
  getCsPatientAiPredictionById,
  getCsPatientPhoneStatusById,
  getCsFaq,
  createCsCallRecordById,
  startCsCallById
}
