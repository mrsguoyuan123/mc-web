// 用户管理仓公共枚举与工具（全部数据来自后端，前端不内置示例数据）
export const HEALTH_STATUS_OPTIONS = ['GOOD', 'ATTENTION', 'ABNORMAL']

export const HEALTH_STATUS_TAG_TYPE = {
  GOOD: 'success',
  ATTENTION: 'warning',
  ABNORMAL: 'danger',
  // 兼容旧中文值
  '良好': 'success',
  '关注': 'warning',
  '警告': 'danger'
}

// 风险等级（risk-alerts 接口枚举 LOW/MEDIUM/HIGH）
export const RISK_LEVEL_TEXT = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险'
}

// 会话消息发送人角色（Message.senderType 枚举）
export const SENDER_TYPE_TEXT = {
  PATIENT: '用户',
  CS: '客服',
  CAREGIVER: '驻点',
  DOCTOR: '医生',
  AI: '智能客服',
  SYSTEM: '系统'
}

export const MESSAGE_TYPE_TEXT = {
  TEXT: '文本',
  IMAGE: '图片',
  HEALTH_CARD: '健康卡片',
  CALL_RECORD: '通话记录'
}

// 服务关系变更类型（PatientServiceRelationLog.relationType）
export const RELATION_TYPE_TEXT = {
  CS: '客服',
  CAREGIVER: '陪诊师',
  DOCTOR: '医生'
}

export function safeParseJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function formatTime(value, withSeconds = false) {
  if (!value) return '-'
  const text = String(value).replace('T', ' ')
  return text.slice(0, withSeconds ? 19 : 16)
}

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

// 兼容分页对象 / 直接数组两种返回形态
export function toPage(res) {
  if (!res) return { list: [], total: 0, page: 1, pageSize: 10 }
  const list = Array.isArray(res) ? res : res.list || []
  return {
    list,
    total: Number(res.total) || 0,
    page: Number(res.page) || 1,
    pageSize: Number(res.pageSize) || 10
  }
}

export function displayText(value) {
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

// 从健康看板 latest 记录里取某类型最新一条
export function latestRecord(records, type) {
  const list = Array.isArray(records) ? records : []
  return list.find((item) => item && item.type === type) || null
}

export function recordMetrics(record) {
  return safeParseJson(record && record.metricsJson, {}) || {}
}
// 字段缺失兜底文案：接口未提供（红色由模板/样式控制）
export const MISSING_TEXT = '接口未提供'

// 判断是否为缺失值（null / undefined / 空串；0、false 不算缺失）
export function isMissing(v) {
  return v === null || v === undefined || v === ''
}

// 文件服务前缀（相对路径拼接用）。取值顺序：
// 1. 环境变量独立文件/OSS 域名 VITE_FILE_BASE_URL；
// 2. 缺省复用后端接口 baseURL；3. 都取不到按当前站点解析。
const FILE_BASE_URL = import.meta.env?.VITE_FILE_BASE_URL || ''

function resolveApiBase() {
  return (
    import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_BASE_URL ||
    ''
  )
}

// 解析文件地址：相对路径拼前缀；已是 http(s):// 完整地址原样返回；空值返回空串
export function resolveFileUrl(path) {
  if (isMissing(path)) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = FILE_BASE_URL || resolveApiBase()
  const clean = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${clean}` : clean
}

// 健康状态 → 中文文案
const HEALTH_STATUS_TEXT = {
  GOOD: '良好',
  ATTENTION: '关注',
  ABNORMAL: '异常',
  '良好': '良好',
  '关注': '关注',
  '警告': '异常'
}

export function healthStatusText(status) {
  return HEALTH_STATUS_TEXT[status] || displayText(status)
}
