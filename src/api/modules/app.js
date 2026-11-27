/**
 * 小程序内容管理模块接口（api/swagger.json 中 tag = app 的全部接口，共 35 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 响应中的雪花 ID（int64 超长整数，如公告/Banner/文章/协议/模板/告知书 id、departmentId、updatedBy 等）已由 BigIntSafeParser 自动转为字符串
 * - 路径上的 {id} 一律按字符串传递（内部 String() + encodeURIComponent），勿传 number
 * - 请求 body / query 中的雪花 ID（departmentId、creatorId、updatedBy、排序 ids 等）内部统一 String() 归一化，调用方传字符串
 * - C 端公开接口（登录协议、Banner、文章、告知书列表）操作级无 security，显式传 { skipAuth: true } 不注入 Authorization；
 *   公司管理类与 /me/* 接口均为 JWT 鉴权，封装层自动携带 Bearer token
 *
 * 命名规范：
 * - 查询用 get + 资源名（分页加 Page，后台全量加 All），新建用 create，修改/删除/状态用 update/delete + XxxById
 * - 路径含 {id} 的接口统一使用 XxxById 后缀；本模块回复模板端点为 /app/templates/*，与 conversation 模块的 /reply-templates/* 区分，故加 App 前缀
 *
 * 通用枚举：文章/公告 type = ARTICLE 资讯 / MENTAL 心理健康 / NOTICE 公告 / SYSTEM 系统；
 *   enabled 启停 = 1 启用 / 0 停用；告知书 status = ACTIVE 生效 / ARCHIVED 归档
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

/** 把 id 数组中的每个元素转为字符串（排序等批量操作的 id 列表） */
function stringifyIdArray(ids) {
  return (Array.isArray(ids) ? ids : []).map((value) => String(value))
}

/** 后端排序接口要求 ArrayList<Long>；这里输出数字 JSON token，但不经过 JS Number，避免雪花 ID 精度丢失。 */
function buildLongIdSortBody(data) {
  const ids = stringifyIdArray(data.ids).filter((id) => /^\d+$/.test(id))
  return `{"position":${JSON.stringify(data.position)},"ids":[${ids.join(',')}]}`
}

/* -------------------------------------------------------------------------- */
/*  概览与公告（/app/overview、/app/notices/*）                                 */
/* -------------------------------------------------------------------------- */

/**
 * 小程序内容概览（JWT 接口，管理端首页统计）
 * 路径：GET /app/overview
 * 无请求参数
 * @returns {Promise<Object>} 内容概览对象，含各类内容计数与汇总字段（具体键以服务端返回为准）
 */
export function getAppOverview() {
  return http.get('/app/overview')
}

/**
 * 分页查询公告（JWT 接口，管理端公告列表，可按展位/科室/启停/关键词过滤）
 * 路径：GET /app/notices
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.position] 展位标识，HOME/DOCTOR/MINI_PROGRAM/PATIENT
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {number} [params.enabled] 启停状态：1 启用 / 0 停用
 * @param {string} [params.keyword] 标题关键词
 * @param {number} [params.page=1] 页码，从 1 开始，默认 1
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultArticle：{ list, total, page, pageSize }；
 *   list 元素 Article 含 id/departmentId（雪花 ID 字符串）、title、type（NOTICE 公告）、position、content、
 *   coverUrl、sortNo、enabled（1/0）、publishDate（yyyy-MM-dd）
 */
export function getAppNoticePage(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/app/notices', query)
}

/**
 * 新增公告（JWT 接口，公司管理）
 * 路径：POST /app/notices
 * @param {Object} data 公告内容（Article，请求体必填）
 * @param {string} data.title 标题
 * @param {string} [data.type] 类型，公告固定 NOTICE；枚举 ARTICLE/MENTAL/NOTICE/SYSTEM
 * @param {string} [data.position] 展位，HOME/DOCTOR/MINI_PROGRAM/PATIENT（仅 NOTICE 使用）
 * @param {string} [data.content] 正文
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.surgeryType] 术式标识，NULL/不传表示通用
 * @param {string} [data.coverUrl] 封面图 URL
 * @param {number} [data.sortNo] 排序号
 * @param {number} [data.enabled] 启停：1 启用 / 0 停用
 * @param {string} [data.publishDate] 发布日期，格式 yyyy-MM-dd
 * @returns {Promise<number>} 新建公告的 ID（integer，雪花 ID 已按字符串安全处理）
 */
export function createAppNotice(data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId'])
  return http.post('/app/notices', payload)
}

/**
 * 编辑公告（JWT 接口，公司管理，全量更新）
 * 路径：PUT /app/notices/{id}
 * @param {string} id 公告 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 公告内容（Article，请求体必填，字段同新增）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；公告不存在返回 code=400
 */
export function updateAppNoticeById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId'])
  return http.put(`/app/notices/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除公告（JWT 接口，公司管理）
 * 路径：DELETE /app/notices/{id}
 * @param {string} id 公告 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteAppNoticeById(id) {
  return http.delete(`/app/notices/${encodeURIComponent(String(id))}`)
}

/**
 * 启停公告（JWT 接口，公司管理）
 * 路径：PUT /app/notices/{id}/status
 * @param {string} id 公告 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态（请求体为裸整数）：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateAppNoticeStatusById(id, status) {
  return http.put(`/app/notices/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * 公告排序（JWT 接口，按展位整体提交有序 ID 列表）
 * 路径：PUT /app/notices/sort
 * @param {Object} data 排序请求（NoticeSortRequest，请求体必填）
 * @param {string} data.position 展位标识，HOME/DOCTOR/MINI_PROGRAM/PATIENT
 * @param {Array<string>} data.ids 按目标顺序排列的公告 ID 数组，元素为雪花 ID 字符串；请求体中序列化为 Long 数字数组
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function sortAppNotices(data) {
  return http.put('/app/notices/sort', undefined, { rawBody: buildLongIdSortBody(data) })
}

/* -------------------------------------------------------------------------- */
/*  Banner 启停与排序（/app/banners/*）                                         */
/* -------------------------------------------------------------------------- */

/**
 * 启停 Banner（JWT 接口，公司管理）
 * 路径：PUT /app/banners/{id}/status
 * @param {string} id Banner ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态（请求体为裸整数）：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateAppBannerStatusById(id, status) {
  return http.put(`/app/banners/${encodeURIComponent(String(id))}/status`, status)
}

/**
 * Banner 排序（JWT 接口，按展位整体提交有序 ID 列表）
 * 路径：PUT /app/banners/sort
 * @param {Object} data 排序请求（BannerSortRequest，请求体必填）
 * @param {string} data.position 展位标识，HOME/HEALTH/DOCTOR/SERVICE
 * @param {Array<string>} data.ids 按目标顺序排列的 Banner ID 数组，元素为雪花 ID 字符串；请求体中序列化为 Long 数字数组
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function sortAppBanners(data) {
  return http.put('/app/banners/sort', undefined, { rawBody: buildLongIdSortBody(data) })
}

/* -------------------------------------------------------------------------- */
/*  登录协议（/app/login-agreements/*、/me/login-agreements/*）                 */
/* -------------------------------------------------------------------------- */

/**
 * 查询当前生效登录协议（公开接口，C 端登录页展示，不注入 Authorization）
 * 路径：GET /app/login-agreements
 * 无请求参数
 * @returns {Promise<Array<Object>>} LoginAgreement 数组：[{ id 雪花 ID 字符串, code（USER_SERVICE 用户协议/PRIVACY 隐私政策）,
 *   name, scene（LOGIN）, summary 摘要, content 正文, version 版本号, enabled, updatedBy 雪花 ID 字符串, updateTime }]
 */
export function getAppLoginAgreements() {
  return http.get('/app/login-agreements', undefined, { skipAuth: true })
}

/**
 * 登录协议后台列表（JWT 接口，公司管理，含未启用/历史条目）
 * 路径：GET /app/login-agreements/all
 * 无请求参数
 * @returns {Promise<Array<Object>>} LoginAgreement 数组，字段同 getAppLoginAgreements
 */
export function getAllAppLoginAgreements() {
  return http.get('/app/login-agreements/all')
}

/**
 * 编辑登录协议并自动升版（JWT 接口，公司管理；保存后服务端自动生成新版本号）
 * 路径：PUT /app/login-agreements/{id}
 * @param {string} id 协议 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 协议内容（请求体必填）
 * @param {string} [data.name] 协议名称
 * @param {string} [data.summary] 协议摘要
 * @param {string} [data.content] 协议正文
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；协议不存在返回 code=400
 */
export function updateAppLoginAgreementById(id, data) {
  return http.put(`/app/login-agreements/${encodeURIComponent(String(id))}`, data)
}

/**
 * 查询登录协议版本历史（JWT 接口，公司管理）
 * 路径：GET /app/login-agreements/{id}/versions
 * @param {string} id 协议 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<Array<Object>>} LoginAgreementVersion 数组：[{ id, agreementId 雪花 ID 字符串, version 版本号,
 *   summary, content, publishedAt 发布时间(date-time), publishedBy 发布人雪花 ID 字符串 }]
 */
export function getAppLoginAgreementVersionsById(id) {
  return http.get(`/app/login-agreements/${encodeURIComponent(String(id))}/versions`)
}

/**
 * 患者接受指定协议版本（JWT 接口，记录当前患者对某版本的接受行为）
 * 路径：POST /me/login-agreements/{id}/accept
 * @param {string} id 协议 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 版本信息（请求体必填）
 * @param {string} data.version 接受的协议版本号
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function acceptAppLoginAgreementById(id, data) {
  return http.post(`/me/login-agreements/${encodeURIComponent(String(id))}/accept`, data)
}

/**
 * 查询当前患者尚未接受的协议（JWT 接口，用于登录后强制弹窗确认）
 * 路径：GET /me/login-agreements/pending
 * 无请求参数
 * @returns {Promise<Array<Object>>} LoginAgreement 数组，仅包含当前患者待接受的生效协议，字段同 getAppLoginAgreements
 */
export function getMyPendingAppLoginAgreements() {
  return http.get('/me/login-agreements/pending')
}

/* -------------------------------------------------------------------------- */
/*  Banner 管理（/app/banners/*）                                               */
/* -------------------------------------------------------------------------- */

/**
 * 查询 C 端 Banner（公开接口，不注入 Authorization；健康知识库精选等展位）
 * 路径：GET /app/banners
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.position] 展位标识，枚举：HOME/HEALTH
 * @returns {Promise<Array<Object>>} Banner 数组：[{ id 雪花 ID 字符串, title, description, imageUrl, linkUrl,
 *   position（HOME/HEALTH/DOCTOR/SERVICE）, sortNo, enabled（1/0）, startDate, endDate（yyyy-MM-dd） }]
 */
export function getAppBanners(params = {}) {
  return http.get('/app/banners', params, { skipAuth: true })
}

/**
 * 新增 Banner（JWT 接口，公司管理）
 * 路径：POST /app/banners
 * @param {Object} data Banner 内容（请求体必填）
 * @param {string} data.title 标题
 * @param {string} [data.description] 描述
 * @param {string} data.imageUrl 图片 URL
 * @param {string} [data.linkUrl] 跳转链接
 * @param {string} data.position 展位，HOME/HEALTH/DOCTOR/SERVICE
 * @param {number} [data.sortNo] 排序号
 * @param {number} [data.enabled] 启停：1 启用 / 0 停用
 * @param {string} [data.startDate] 生效开始日期，格式 yyyy-MM-dd
 * @param {string} [data.endDate] 生效结束日期，格式 yyyy-MM-dd
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createAppBanner(data) {
  return http.post('/app/banners', data)
}

/**
 * 查询全部 Banner（JWT 接口，公司管理后台，含停用/未生效条目）
 * 路径：GET /app/banners/all
 * 无请求参数
 * @returns {Promise<Array<Object>>} Banner 数组，字段同 getAppBanners
 */
export function getAllAppBanners() {
  return http.get('/app/banners/all')
}

/**
 * 修改 Banner（JWT 接口，公司管理，全量更新）
 * 路径：PUT /app/banners/{id}
 * @param {string} id Banner ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data Banner 内容（请求体必填，字段同新增）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；Banner 不存在返回 code=400
 */
export function updateAppBannerById(id, data) {
  return http.put(`/app/banners/${encodeURIComponent(String(id))}`, data)
}

/**
 * 删除 Banner（JWT 接口，公司管理）
 * 路径：DELETE /app/banners/{id}
 * @param {string} id Banner ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteAppBannerById(id) {
  return http.delete(`/app/banners/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  资讯/文章（/app/articles/*）                                                */
/* -------------------------------------------------------------------------- */

/**
 * 分页查询 C 端资讯/健康文章/心理健康内容（公开接口，不注入 Authorization，按科室+术式过滤）
 * 路径：GET /app/articles
 * @param {Object} [params={}] 查询与分页参数
 * @param {string} [params.type] 内容类型，枚举：ARTICLE 资讯 / MENTAL 心理健康 / NOTICE 公告 / SYSTEM 系统
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [params.surgeryType] 手术类型；NULL/不传=通用，精确匹配或通用内容均返回
 * @param {number} [params.page=1] 页码，从 1 开始，默认 1
 * @param {number} [params.pageSize=20] 每页条数，默认 20，服务端上限 100
 * @returns {Promise<Object>} PageResultArticle：{ list, total, page, pageSize }；
 *   list 元素 Article 含 id/departmentId（雪花 ID 字符串）、title、type、position、content、surgeryType、
 *   coverUrl、sortNo、enabled（1/0）、publishDate（yyyy-MM-dd）
 */
export function getAppArticlePage(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/app/articles', query, { skipAuth: true })
}

/**
 * 新增文章（JWT 接口，公司管理）
 * 路径：POST /app/articles
 * @param {Object} data 文章内容（Article，请求体必填）
 * @param {string} data.title 标题
 * @param {string} [data.type] 类型，枚举 ARTICLE/MENTAL/NOTICE/SYSTEM
 * @param {string} [data.position] 展位，HOME/DOCTOR/MINI_PROGRAM/PATIENT
 * @param {string} [data.content] 正文
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.surgeryType] 术式标识，NULL/不传表示通用
 * @param {string} [data.coverUrl] 封面图 URL
 * @param {number} [data.sortNo] 排序号
 * @param {number} [data.enabled] 启停：1 启用 / 0 停用
 * @param {string} [data.publishDate] 发布日期，格式 yyyy-MM-dd
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createAppArticle(data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId'])
  return http.post('/app/articles', payload)
}

/**
 * 查询全部文章（JWT 接口，公司管理后台，可按类型过滤）
 * 路径：GET /app/articles/all
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.type] 内容类型筛选，枚举：ARTICLE/MENTAL/NOTICE/SYSTEM
 * @returns {Promise<Array<Object>>} Article 数组，字段同 getAppArticlePage 的 list 元素
 */
export function getAllAppArticles(params = {}) {
  return http.get('/app/articles/all', params)
}

/**
 * 修改文章（JWT 接口，公司管理，全量更新）
 * 路径：PUT /app/articles/{id}
 * @param {string} id 文章 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 文章内容（Article，请求体必填，字段同新增）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；文章不存在返回 code=400
 */
export function updateAppArticleById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId'])
  return http.put(`/app/articles/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除文章（JWT 接口，公司管理）
 * 路径：DELETE /app/articles/{id}
 * @param {string} id 文章 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteAppArticleById(id) {
  return http.delete(`/app/articles/${encodeURIComponent(String(id))}`)
}

/* -------------------------------------------------------------------------- */
/*  回复模板（/app/templates/*，与 conversation 模块 /reply-templates/* 区分）   */
/* -------------------------------------------------------------------------- */

/**
 * 查询全部回复模板（JWT 接口，公司管理后台）
 * 路径：GET /app/templates/all
 * 无请求参数
 * @returns {Promise<Array<Object>>} ReplyTemplate 数组：[{ id/creatorId 雪花 ID 字符串, name, type（通用/按手术类型）,
 *   surgeryType, terminalsJson, rolesJson, diseasesJson, questionsJson, common, note, content 正文,
 *   variablesJson 变量 JSON, usageCount 使用次数, status（1 启用/0 停用/2 待完善）, lastUsedAt }]
 */
export function getAllAppReplyTemplates() {
  return http.get('/app/templates/all')
}

/**
 * 新增回复模板（JWT 接口，公司管理）
 * 路径：POST /app/templates
 * @param {Object} data 模板内容（ReplyTemplate，请求体必填）
 * @param {string} data.name 模板名称（必填）
 * @param {string} data.content 模板正文（必填），可含变量占位
 * @param {string} [data.type] 类型，枚举：通用 / 按手术类型
 * @param {string} [data.surgeryType] 关联术式，type=按手术类型 时使用
 * @param {string} [data.terminalsJson] 适用终端 JSON 字符串
 * @param {string} [data.rolesJson] 适用角色 JSON 字符串
 * @param {string} [data.diseasesJson] 适用病症 JSON 字符串
 * @param {string} [data.questionsJson] 关联问题 JSON 字符串
 * @param {number} [data.common] 是否常用标记
 * @param {string} [data.note] 备注
 * @param {string} [data.variablesJson] 变量定义 JSON 字符串
 * @param {number} [data.status] 状态：1 启用 / 0 停用 / 2 待完善
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createAppReplyTemplate(data) {
  const payload = stringifyIdFields({ ...data }, ['creatorId'])
  return http.post('/app/templates', payload)
}

/**
 * 修改回复模板（JWT 接口，公司管理，全量更新）
 * 路径：PUT /app/templates/{id}
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 模板内容（ReplyTemplate，请求体必填，字段同新增）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；模板不存在返回 code=400
 */
export function updateAppReplyTemplateById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['creatorId'])
  return http.put(`/app/templates/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除回复模板（JWT 接口，公司管理）
 * 路径：DELETE /app/templates/{id}
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteAppReplyTemplateById(id) {
  return http.delete(`/app/templates/${encodeURIComponent(String(id))}`)
}

/**
 * 启用 / 停用回复模板（JWT 接口，公司管理）
 * 路径：PUT /app/templates/{id}/status
 * @param {string} id 模板 ID（必填，路径参数，雪花 ID 字符串）
 * @param {number} status 目标状态（请求体为裸整数）：1 启用 / 0 停用
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateAppReplyTemplateStatusById(id, status) {
  return http.put(`/app/templates/${encodeURIComponent(String(id))}/status`, status)
}

/* -------------------------------------------------------------------------- */
/*  告知书（/app/informed-consents/*）                                          */
/* -------------------------------------------------------------------------- */

/**
 * 查询生效中告知书列表（公开接口，不注入 Authorization；C 端按科室获取）
 * 路径：GET /app/informed-consents
 * @param {Object} [params={}] 查询参数
 * @param {string} [params.departmentId] 科室 ID，雪花 ID 字符串
 * @returns {Promise<Array<Object>>} InformedConsent 数组（仅 status=ACTIVE）：[{ id/departmentId/uploadBy 雪花 ID 字符串,
 *   title, content 正文（可空=仅附件）, surgeryType（NULL=通用）, fileUrl, fileName, fileSize, version, status（ACTIVE/ARCHIVED） }]
 */
export function getAppInformedConsents(params = {}) {
  const query = stringifyIdFields({ ...params }, ['departmentId'])
  return http.get('/app/informed-consents', query, { skipAuth: true })
}

/**
 * 新增告知书（JWT 接口，公司管理）
 * 路径：POST /app/informed-consents
 * @param {Object} data 告知书内容（InformedConsent，请求体必填）
 * @param {string} data.title 告知书标题（必填）
 * @param {string} data.fileUrl 附件 URL（必填）
 * @param {string} [data.content] 告知书正文，可空（空表示仅附件）
 * @param {string} [data.departmentId] 科室 ID，雪花 ID 字符串
 * @param {string} [data.surgeryType] 匹配术式，NULL/不传=通用
 * @param {string} [data.fileName] 附件文件名
 * @param {number} [data.fileSize] 附件大小（字节）
 * @param {string} [data.version] 版本号
 * @param {string} [data.status] 状态，枚举 ACTIVE 生效 / ARCHIVED 归档
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function createAppInformedConsent(data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId', 'uploadBy'])
  return http.post('/app/informed-consents', payload)
}

/**
 * 修改告知书（JWT 接口，公司管理，全量更新）
 * 路径：PUT /app/informed-consents/{id}
 * @param {string} id 告知书 ID（必填，路径参数，雪花 ID 字符串）
 * @param {Object} data 告知书内容（InformedConsent，请求体必填，字段同新增）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0；告知书不存在返回 code=400
 */
export function updateAppInformedConsentById(id, data) {
  const payload = stringifyIdFields({ ...data }, ['departmentId', 'uploadBy'])
  return http.put(`/app/informed-consents/${encodeURIComponent(String(id))}`, payload)
}

/**
 * 删除告知书（JWT 接口，公司管理）
 * 路径：DELETE /app/informed-consents/{id}
 * @param {string} id 告知书 ID（必填，路径参数，雪花 ID 字符串）
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function deleteAppInformedConsentById(id) {
  return http.delete(`/app/informed-consents/${encodeURIComponent(String(id))}`)
}

/**
 * 启用 / 归档告知书（JWT 接口，公司管理）
 * 路径：PUT /app/informed-consents/{id}/status
 * @param {string} id 告知书 ID（必填，路径参数，雪花 ID 字符串）
 * @param {string} status 目标状态（请求体为 JSON 字符串）："ACTIVE" 生效 / "ARCHIVED" 归档
 * @returns {Promise<null>} ApiResponse 的 data，通常为空，成功看 code=0
 */
export function updateAppInformedConsentStatusById(id, status) {
  return http.put(`/app/informed-consents/${encodeURIComponent(String(id))}/status`, status)
}

export default {
  getAppOverview,
  getAppNoticePage,
  createAppNotice,
  updateAppNoticeById,
  deleteAppNoticeById,
  updateAppNoticeStatusById,
  sortAppNotices,
  updateAppBannerStatusById,
  sortAppBanners,
  getAppLoginAgreements,
  getAllAppLoginAgreements,
  updateAppLoginAgreementById,
  getAppLoginAgreementVersionsById,
  acceptAppLoginAgreementById,
  getMyPendingAppLoginAgreements,
  getAppBanners,
  createAppBanner,
  getAllAppBanners,
  updateAppBannerById,
  deleteAppBannerById,
  getAppArticlePage,
  createAppArticle,
  getAllAppArticles,
  updateAppArticleById,
  deleteAppArticleById,
  getAllAppReplyTemplates,
  createAppReplyTemplate,
  updateAppReplyTemplateById,
  deleteAppReplyTemplateById,
  updateAppReplyTemplateStatusById,
  getAppInformedConsents,
  createAppInformedConsent,
  updateAppInformedConsentById,
  deleteAppInformedConsentById,
  updateAppInformedConsentStatusById
}
