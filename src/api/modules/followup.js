/**
 * 随访模块接口（api/swagger.json 中 tag = followup 的全部接口，共 7 个；PC 工作流与手机端同源）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如任务 id/通话记录 id/患者 id/客服 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id、query 的 assigneeId、请求体内 patientId/assigneeId/csId 等）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名
 * - 路径含 {id} 的接口统一使用 getXxxById / updateXxxById / createXxxById 等 ById 后缀
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
/*  随访任务                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询随访任务（JWT 接口，PC 工作流与手机端同源，按数据范围过滤）
 * 路径：GET /follow-up/tasks
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.status] 任务状态，枚举：PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / COMPLETED 已完成
 * @param {string} [params.assigneeId] 负责客服 ID，雪花 ID 字符串
 * @param {string} [params.priority] 优先级，枚举：HIGH 高 / MEDIUM 中 / LOW 低
 * @param {string} [params.keyword] 患者姓名/手机号关键字（代码当前未使用，预留）
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<FollowUpTask>：{ list, total, page, pageSize }；
 *   list 元素含 id/patientId/assigneeId（雪花 ID 字符串）、status（PENDING/FOLLOWED/FOLLOW_UP/COMPLETED）、
 *   priority（HIGH/MEDIUM/LOW）、nextFollowDate（yyyy-MM-dd）、remark、createTime、updateTime
 */
export function getFollowUpTaskPage(params = {}) {
  const query = { ...params }
  stringifyIdFields(query, ['assigneeId'])
  return http.get('/follow-up/tasks', query)
}

/**
 * 创建随访任务（JWT 接口）
 * 路径：POST /follow-up/tasks
 * @param {Object} data 任务内容（FollowUpTask）
 * @param {string} data.patientId 患者 ID（必填，雪花 ID 字符串）
 * @param {string} [data.status] 任务状态，枚举：PENDING / FOLLOWED / FOLLOW_UP / COMPLETED
 * @param {string} [data.assigneeId] 负责客服 ID，雪花 ID 字符串
 * @param {string} [data.priority] 优先级，枚举：HIGH / MEDIUM / LOW
 * @param {string} [data.nextFollowDate] 下次随访日期，格式 yyyy-MM-dd
 * @param {string} [data.remark] 备注
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createFollowUpTask(data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'assigneeId'])
  return http.post('/follow-up/tasks', payload)
}

/**
 * 更新随访任务（JWT 接口，用于分配客服/改期/状态流转）
 * 路径：PUT /follow-up/tasks/{id}
 * @param {string} id 任务 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 任务内容（FollowUpTask，字段同 createFollowUpTask，patientId 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateFollowUpTaskById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'patientId', 'assigneeId'])
  return http.put(`/follow-up/tasks/${encodeURIComponent(String(id))}`, payload)
}

/* -------------------------------------------------------------------------- */
/*  电话随访记录                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 提交电话随访记录（JWT 接口，PC 4 步表单）
 * 路径：POST /follow-up/tasks/{id}/calls
 * @param {string} id 随访任务 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 通话记录（FollowUpCallRecord）
 * @param {string} [data.callId] 双呼会话 id
 * @param {string} [data.virtualNumber] 虚拟保护号
 * @param {string} [data.callStatus] 通话结果，枚举：SUCCESS 成功 / FAILED 失败
 * @param {string} [data.failReason] 失败原因，枚举：NO_ANSWER 无人接听 / WRONG_NUMBER 号码错误 / REJECTED 拒接 / INTERRUPTED 通话中断
 * @param {number} [data.durationSec] 通话时长（秒）
 * @param {string} [data.medicationStatus] 用药情况，枚举：ON_TIME 按时 / OCCASIONAL_MISS 偶尔漏服 / STOPPED 已停药 / SELF_ADJUSTED 自行调整
 * @param {string} [data.recoveryStatus] 恢复情况，枚举：GOOD 良好 / FAIR 一般 / POOR 差
 * @param {string} [data.complianceStatus] 依从性，枚举：FULL 完全 / PARTIAL 部分 / NONE 无
 * @param {string} [data.coreElements] 核心要素
 * @param {string} [data.precautions] 注意事项宣教
 * @param {string} [data.problems] 问题记录
 * @param {string} [data.recordRemark] 记录备注
 * @param {string} [data.servicePackageFeedback] 服务包反馈，枚举：USED_CORE / NOT_USED / ISSUES
 * @param {string} [data.repurchaseIntent] 复购意向，枚举：INTERESTED 有意向 / NOT_INTERESTED 无意向 / UNSURE 不确定
 * @param {number} [data.ivrSatisfaction] IVR 满意度 1-5
 * @param {string} [data.improvementSuggestion] 改进建议
 * @param {string} [data.otherDemand] 其他需求
 * @param {number} [data.secondarySales] 二次销售潜力 0/1（仅客服可见）
 * @param {string} [data.csRemark] 仅客服可见备注
 * @param {number} [data.pushToGroup] 是否推送到沟通群：1 是 / 0 否
 * @returns {Promise<string>} 新建通话记录 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function createFollowUpCallRecordById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'taskId', 'patientId', 'csId'])
  return http.post(`/follow-up/tasks/${encodeURIComponent(String(id))}/calls`, payload)
}

/**
 * 查询任务的历史通话记录（JWT 接口）
 * 路径：GET /follow-up/tasks/{id}/calls
 * @param {string} id 随访任务 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} FollowUpCallRecord 数组，元素含 id/taskId/patientId/csId（雪花 ID 字符串）、
 *   callId、virtualNumber、callStatus、failReason、durationSec、medicationStatus、recoveryStatus、
 *   complianceStatus、coreElements、precautions、problems、servicePackageFeedback、repurchaseIntent、
 *   ivrSatisfaction、secondarySales、pushToGroup、createTime 等
 */
export function getFollowUpCallRecordsById(id) {
  return http.get(`/follow-up/tasks/${encodeURIComponent(String(id))}/calls`)
}

/**
 * 查询电话按钮状态（JWT 接口，用于未拨打=绿色/已拨打=蓝色的按钮展示）
 * 路径：GET /follow-up/tasks/{id}/phone-status
 * @param {string} id 随访任务 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} PhoneStatus：{ called boolean，该任务是否已有通话记录 }
 */
export function getFollowUpPhoneStatusById(id) {
  return http.get(`/follow-up/tasks/${encodeURIComponent(String(id))}/phone-status`)
}

/* -------------------------------------------------------------------------- */
/*  随访统计                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 查询随访统计（JWT 接口，工作台卡片数据）
 * 路径：GET /follow-up/summary
 * 无请求参数
 * @returns {Promise<Object>} FollowUpSummary：{ pending 待沟通数, followUp 待跟进数, today 今日随访数 }
 */
export function getFollowUpSummary() {
  return http.get('/follow-up/summary')
}

export default {
  getFollowUpTaskPage,
  createFollowUpTask,
  updateFollowUpTaskById,
  createFollowUpCallRecordById,
  getFollowUpCallRecordsById,
  getFollowUpPhoneStatusById,
  getFollowUpSummary
}
