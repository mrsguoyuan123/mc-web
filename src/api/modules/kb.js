/**
 * 客服共享知识库模块接口（api/swagger.json 中 tag = kb 的全部接口，共 24 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如条目/文档/分块/版本 id）已由 BigIntSafeParser 自动转为字符串
 * - 请求中的雪花 ID（路径 id/jobId、请求体内各 id 字段与 id 数组）一律按字符串传递，内部已做 String() 归一化，勿传 number
 * - 本模块全部接口均为 JWT 鉴权，封装层自动注入 Authorization: Bearer <accessToken>
 *
 * 命名规范：
 * - 查询用 get + 资源名，新增用 create + 资源名，更新用 update + 资源名，删除用 delete + 资源名
 * - 路径含 {id}/{jobId} 的接口统一使用 getXxxById / updateXxxById / deleteXxxById 等 ById 后缀
 */

import { http, request } from '../frontApikit.js'

/** 把已知雪花 ID 字段安全转为字符串（仅处理存在且非空的字段，不改变其他字段） */
function stringifyIdFields(obj, idKeys) {
  if (!obj || typeof obj !== 'object') return obj
  for (const key of idKeys) {
    if (obj[key] !== undefined && obj[key] !== null) obj[key] = String(obj[key])
  }
  return obj
}

/** 把 id 数组中的每个元素转为字符串（批量操作的 id 列表） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/* -------------------------------------------------------------------------- */
/*  概览与检索测试                                                              */
/* -------------------------------------------------------------------------- */

/**
 * 知识库概览统计（JWT 接口）
 * 路径：GET /kb/overview
 * 无请求参数
 * @returns {Promise<Object>} { total 问答总数, published 已发布数, draft 草稿数,
 *   unresolvedPending 待处理未解决问题数, hitRate30d 近 30 天命中率（整数） }
 */
export function getKbOverview() {
  return http.get('/kb/overview')
}

/**
 * 知识库检索测试（JWT 接口，按关键词打分返回命中条目，用于后台调试验证）
 * 路径：POST /kb/search-test
 * @param {Object} data 请求体（KbSearchTestRequest）
 * @param {string} data.query 检索词（必填）
 * @param {number} [data.topK] 返回命中条数上限
 * @returns {Promise<Array<Object>>} KbSearchHit 数组，元素含 entry（命中的 KbEntry 问答）、score 关键词打分
 */
export function testKbSearch(data) {
  return http.post('/kb/search-test', data)
}

/* -------------------------------------------------------------------------- */
/*  知识问答条目（人工客服维护）                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询知识问答列表（JWT 接口，客服共享）
 * 路径：GET /kb/entries
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.keyword] 问题模糊关键字
 * @param {string} [params.category] 分类
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<KbEntry>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、question、answer、category、department、similarQuestionsJson、surgeryType、
 *   tagsJson、publishStatus（DRAFT/PUBLISHED）、status（1 启 0 停）、hitCount/likeCount/dislikeCount、
 *   updatedBy/createdBy（字符串）、source（MANUAL/IMPORT/UNRESOLVED）、createTime、updateTime
 */
export function getKbEntryPage(params = {}) {
  return http.get('/kb/entries', params)
}

/**
 * 新增知识条目（JWT 接口，人工客服）
 * 路径：POST /kb/entries
 * @param {Object} data 条目内容（KbEntry）
 * @param {string} data.question 问题（必填）
 * @param {string} data.answer 答案（必填）
 * @param {string} [data.category] 分类
 * @param {string} [data.department] 适用科室
 * @param {string} [data.similarQuestionsJson] 相似问题 JSON 数组字符串
 * @param {string} [data.surgeryType] 手术类型
 * @param {string} [data.tagsJson] 标签 JSON 字符串
 * @param {string} [data.publishStatus] 发布状态，枚举：DRAFT 草稿 / PUBLISHED 已发布
 * @param {number} [data.status] 启用状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createKbEntry(data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'updatedBy', 'createdBy'])
  return http.post('/kb/entries', payload)
}

/**
 * 修改知识条目（JWT 接口，人工客服）
 * 路径：PUT /kb/entries/{id}
 * @param {string} id 条目 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 条目内容（KbEntry，字段同 createKbEntry，question/answer 必填）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateKbEntryById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['id', 'updatedBy', 'createdBy'])
  return http.put(`/kb/entries/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除知识条目（JWT 接口，人工客服）
 * 路径：DELETE /kb/entries/{id}
 * @param {string} id 条目 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteKbEntryById(id) {
  return http.delete(`/kb/entries/${encodeURIComponent(String(id))}`)
}

/**
 * 启用/停用知识条目（JWT 接口，人工客服，请求体为裸整数）
 * 路径：PUT /kb/entries/{id}/status
 * @param {string} id 条目 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateKbEntryStatusById(id, status) {
  return http.put(`/kb/entries/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * 批量发布/转草稿（JWT 接口）
 * 路径：PUT /kb/entries/batch-status
 * @param {Object} data 批量状态（KbBatchStatusRequest）
 * @param {Array<string>} data.ids 问答条目 ID 数组（雪花 ID 字符串）
 * @param {number} data.status 目标状态：1 启用 / 0 停用（或发布状态码，按服务端约定）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateKbEntryBatchStatus(data) {
  return http.put('/kb/entries/batch-status', {
    ids: stringifyIdArray(data.ids),
    status: data.status
  })
}

/**
 * 批量删除问答（JWT 接口）
 * 路径：DELETE /kb/entries/batch
 * @param {Object} data 批量删除（KbBatchDeleteRequest）
 * @param {Array<string>} data.ids 问答条目 ID 数组（雪花 ID 字符串），内部包装为 { ids }
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteKbEntryBatch(data) {
  return request('/kb/entries/batch', { method: 'DELETE', data: { ids: stringifyIdArray(data.ids) } })
}

/**
 * 批量导入问答（JWT 接口）
 * 路径：POST /kb/entries/import
 * @param {Array<Object>} entries 问答对象数组，每个元素结构同 KbEntry（question/answer 必填）
 * @returns {Promise<string>} 实际导入条数（int64，经长整数解析后为字符串）
 */
export function importKbEntries(entries) {
  return http.post('/kb/entries/import', Array.isArray(entries) ? entries : [])
}

/* -------------------------------------------------------------------------- */
/*  知识库文档与分块                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询知识库文档（JWT 接口）
 * 路径：GET /kb/documents
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<KbDocument>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、name、url、fileSize（字节）、fileType、
 *   parseStatus（PENDING/PARSING/PARSED/FAILED）、chunkCount、errorMessage、createdBy（字符串）、createTime
 */
export function getKbDocumentPage(params = {}) {
  return http.get('/kb/documents', params)
}

/**
 * 上传知识库文档（JWT 接口，multipart/form-data；txt/md 可解析，PDF/Word 置 FAILED 占位）
 * 路径：POST /kb/documents
 * @param {File|Blob} file 文档文件（必填，表单字段名 file）；内部包装成 FormData，封装层会自动带 boundary
 * @returns {Promise<Object>} KbDocument：新建文档记录（id 为雪花 ID 字符串，parseStatus 初始为 PENDING/PARSING）
 */
export function uploadKbDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/kb/documents', formData)
}

/**
 * 删除知识库文档（JWT 接口）
 * 路径：DELETE /kb/documents/{id}
 * @param {string} id 文档 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteKbDocumentById(id) {
  return http.delete(`/kb/documents/${encodeURIComponent(String(id))}`)
}

/**
 * 分页查询文档分块（JWT 接口）
 * 路径：GET /kb/documents/{id}/chunks
 * @param {string} id 文档 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} [params] 分页参数
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<KbChunk>：{ list, total, page, pageSize }；
 *   list 元素含 id/documentId（雪花 ID 字符串）、chunkNo 分块序号、content 文本、tokenCount 令牌数
 */
export function getKbDocumentChunksById(id, params = {}) {
  return http.get(`/kb/documents/${encodeURIComponent(String(id))}/chunks`, params)
}

/**
 * 重新解析文档（JWT 接口，占位能力，触发后 parseStatus 回到 PENDING/PARSING）
 * 路径：POST /kb/documents/{id}/reparse
 * @param {string} id 文档 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} 更新后的 KbDocument
 */
export function reparseKbDocumentById(id) {
  return http.post(`/kb/documents/${encodeURIComponent(String(id))}/reparse`)
}

/* -------------------------------------------------------------------------- */
/*  未解决问题                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询未解决问题（JWT 接口，智能客服无法命中的问题沉淀）
 * 路径：GET /kb/unresolved
 * @param {Object} [params] 查询与分页参数
 * @param {string} [params.status] 处理状态，枚举：PENDING 待处理 / CONVERTED 已转问答 / MERGED 已合并 / IGNORED 已忽略
 * @param {string} [params.department] 来源科室
 * @param {number} [params.page=1] 页码，从 1 开始
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResult<KbUnresolved>：{ list, total, page, pageSize }；
 *   list 元素含 id（雪花 ID 字符串）、question、sourceUserId（字符串）、sourceUserName、sourceDepartment、
 *   occurredAt、matchScore、status、suggestDepartment、targetEntryId（字符串）、handledBy（字符串）、handledAt
 */
export function getKbUnresolvedPage(params = {}) {
  return http.get('/kb/unresolved', params)
}

/**
 * 未解决问题转标准问答（JWT 接口）
 * 路径：POST /kb/unresolved/{id}/convert
 * @param {string} id 未解决问题 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 问答内容（KbConvertRequest）
 * @param {string} [data.question] 标准问题
 * @param {string} [data.answer] 标准答案
 * @param {string} [data.department] 适用科室
 * @returns {Promise<string>} 新建知识条目 id（int64，经长整数解析后为雪花 ID 字符串）
 */
export function convertKbUnresolvedById(id, data) {
  return http.post(`/kb/unresolved/${encodeURIComponent(String(id))}/convert`, data)
}

/**
 * 未解决问题合并到已有问答（JWT 接口）
 * 路径：POST /kb/unresolved/{id}/merge
 * @param {string} id 未解决问题 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 合并目标（KbMergeRequest）
 * @param {string} data.targetEntryId 目标知识条目 ID（必填，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function mergeKbUnresolvedById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['targetEntryId'])
  return http.post(`/kb/unresolved/${encodeURIComponent(String(id))}/merge`, payload)
}

/**
 * 忽略未解决问题（JWT 接口）
 * 路径：POST /kb/unresolved/{id}/ignore
 * @param {string} id 未解决问题 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function ignoreKbUnresolvedById(id) {
  return http.post(`/kb/unresolved/${encodeURIComponent(String(id))}/ignore`)
}

/* -------------------------------------------------------------------------- */
/*  版本、训练与回滚（部分为占位）                                               */
/* -------------------------------------------------------------------------- */

/**
 * 查询知识库版本列表（JWT 接口）
 * 路径：GET /kb/versions
 * 无请求参数
 * @returns {Promise<Array<Object>>} KbVersion 数组，元素含 id（雪花 ID 字符串）、version 版本号、
 *   status（TRAINING/COMPLETED/PUBLISHED/ROLLED_BACK）、qaCount 问答数、trainedAt、publishedAt、publishedBy（字符串）
 */
export function getKbVersions() {
  return http.get('/kb/versions')
}

/**
 * 触发知识库训练（JWT 接口，占位能力）
 * 路径：POST /kb/train
 * 无请求参数
 * @returns {Promise<Object>} { versionId（雪花 ID 字符串）, jobId 训练任务 ID（字符串）,
 *   placeholder 是否为占位实现 }
 */
export function startKbTrain() {
  return http.post('/kb/train')
}

/**
 * 查询训练任务状态（JWT 接口，建议前端按 jobId 轮询）
 * 路径：GET /kb/train/{jobId}
 * @param {string} jobId 训练任务 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Object>} KbTrainJob：id/versionId（雪花 ID 字符串）、
 *   status（PENDING/RUNNING/COMPLETED/FAILED）、progress 进度、message、startedAt、finishedAt
 */
export function getKbTrainJobById(jobId) {
  return http.get(`/kb/train/${encodeURIComponent(String(jobId))}`)
}

/**
 * 发布知识库版本（JWT 接口，占位能力）
 * 路径：POST /kb/versions/{id}/publish
 * @param {string} id 版本 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function publishKbVersionById(id) {
  return http.post(`/kb/versions/${encodeURIComponent(String(id))}/publish`)
}

/**
 * 回滚知识库版本（JWT 接口，占位能力）
 * 路径：POST /kb/rollback
 * @param {Object} data 回滚请求（KbRollbackRequest）
 * @param {string} data.versionId 目标版本 ID（必填，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function rollbackKbVersion(data) {
  const payload = stringifyIdFields({ ...data }, ['versionId'])
  return http.post('/kb/rollback', payload)
}

export default {
  getKbOverview,
  testKbSearch,
  getKbEntryPage,
  createKbEntry,
  updateKbEntryById,
  deleteKbEntryById,
  updateKbEntryStatusById,
  updateKbEntryBatchStatus,
  deleteKbEntryBatch,
  importKbEntries,
  getKbDocumentPage,
  uploadKbDocument,
  deleteKbDocumentById,
  getKbDocumentChunksById,
  reparseKbDocumentById,
  getKbUnresolvedPage,
  convertKbUnresolvedById,
  mergeKbUnresolvedById,
  ignoreKbUnresolvedById,
  getKbVersions,
  startKbTrain,
  getKbTrainJobById,
  publishKbVersionById,
  rollbackKbVersion
}
