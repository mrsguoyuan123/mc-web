// 全站公共工具与枚举（由 userManagement / roleManagement / doctorManage 三个模块 utils 合并）
// 约定：字段缺失（null/undefined/空串）显示红色「接口未提供」，0 为有效值不判缺失；全部数据以后端返回为准，前端不臆造

import { BASE_URL } from '../api/frontApikit.js'

/* -------------------------------------------------------------------------- */
/*  通用基础工具                                                                */
/* -------------------------------------------------------------------------- */

// 字段缺失兜底文案：接口未提供（红色由模板/样式控制）
export const MISSING_TEXT = '接口未提供'

// null / undefined / 空串视为缺失；0 为有效值，不判缺失
export const isMissing = (value) => value === undefined || value === null || value === ''

// 缺失值统一展示为「-」
export const displayText = (value) =>
  value === undefined || value === null || value === '' ? '-' : String(value)

// 时间格式 YYYY-MM-DD HH:mm（withSeconds 时保留秒）；缺失返回「-」
export function formatTime(value, withSeconds = false) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, withSeconds ? 19 : 16)
}

// 日期格式 YYYY-MM-DD
export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

// JSON 字符串解析：失败回退 fallback，不抛错
export function safeParseJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// 兼容分页对象 / 直接数组两种返回形态
export function toPage(res) {
  if (!res) return { list: [], total: 0, page: 1, pageSize: 20 }
  const list = Array.isArray(res) ? res : res.list || []
  return {
    list,
    total: Number(res.total) || 0,
    page: Number(res.page) || 1,
    pageSize: Number(res.pageSize) || 20
  }
}

// 文件地址：相对路径依次尝试 VITE_FILE_BASE_URL / VITE_API_BASE_URL 拼接；完整 http(s) 地址原样返回
export function resolveFileUrl(path) {
  if (isMissing(path)) return ''
  if (/^https?:\/\//i.test(path)) return path
  const fileBase = import.meta.env?.VITE_FILE_BASE_URL || ''
  const apiBase =
    import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_BASE_URL || BASE_URL || ''
  const base = fileBase || apiBase
  const clean = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${clean}` : clean
}

/* -------------------------------------------------------------------------- */
/*  健康状态（用户管理 / 医生管理共用）                                          */
/* -------------------------------------------------------------------------- */

export const HEALTH_STATUS_OPTIONS = ['GOOD', 'ATTENTION', 'ABNORMAL']

export const HEALTH_STATUS_TAG_TYPE = {
  GOOD: 'success',
  ATTENTION: 'warning',
  ABNORMAL: 'danger',
  // 兼容旧中文值
  良好: 'success',
  关注: 'warning',
  警告: 'danger'
}

export const HEALTH_STATUS_TEXT = {
  GOOD: '良好',
  ATTENTION: '关注',
  ABNORMAL: '异常',
  // 兼容旧中文值
  良好: '良好',
  关注: '关注',
  警告: '异常'
}

// el-tag 类型（英文码值版）
export const HEALTH_STATUS_TAG = {
  GOOD: 'success',
  ATTENTION: 'warning',
  ABNORMAL: 'danger'
}

// 健康状态 → 中文文案；未知码值原样展示
export function healthStatusText(status) {
  if (isMissing(status)) return MISSING_TEXT
  return HEALTH_STATUS_TEXT[status] || String(status)
}

/* -------------------------------------------------------------------------- */
/*  用户管理域枚举与工具                                                        */
/* -------------------------------------------------------------------------- */

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

// 从健康看板 latest 记录里取某类型最新一条
export function latestRecord(records, type) {
  const list = Array.isArray(records) ? records : []
  return list.find((item) => item && item.type === type) || null
}

export function recordMetrics(record) {
  return safeParseJson(record && record.metricsJson, {}) || {}
}

/* -------------------------------------------------------------------------- */
/*  角色管理域枚举                                                              */
/* -------------------------------------------------------------------------- */

// 适用端（SysRole.terminal：PC / MOBILE / ALL）
export const TERMINAL_TEXT = {
  PC: '电脑端',
  MOBILE: '手机端',
  ALL: '全部'
}

// 数据范围（SysRole.dataScope）
export const DATA_SCOPE_TEXT = {
  ALL: '全部数据',
  HOSPITAL: '本院数据',
  DEPARTMENT: '本科室',
  STATION: '驻点数据',
  SELF: '本人/指定客户',
  CUSTOM: '自定义范围'
}

/* -------------------------------------------------------------------------- */
/*  医生管理域枚举与工具                                                        */
/* -------------------------------------------------------------------------- */

// 职称（title 为中文直传枚举；层级：主任医师 > 副主任医师 > 主治医师 > 住院医师）
export const TITLE_OPTIONS = ['主任医师', '副主任医师', '主治医师', '住院医师']

// 职称标签配色
export const TITLE_TAG_STYLE = {
  主任医师: { color: '#2563eb', background: 'rgba(232,241,255,0.6)' },
  副主任医师: { color: '#0891b2', background: 'rgba(207,250,254,0.6)' },
  主治医师: { color: '#16a34a', background: 'rgba(220,252,231,0.6)' },
  住院医师: { color: '#d97706', background: 'rgba(254,243,199,0.6)' }
}

// 职称简称（设计稿标签/下拉展示用；提交仍以 swagger 中文枚举全称直传）
export const TITLE_SHORT = {
  主任医师: '主诊',
  副主任医师: '副主诊',
  主治医师: '主治',
  住院医师: '住院'
}

// 职称 → 简称；未知值原样返回，不臆造
export function shortTitle(title) {
  if (isMissing(title)) return MISSING_TEXT
  return TITLE_SHORT[title] || String(title)
}

// 医疗团队标签配色（按设计稿）：主治为浅灰底，其余职称（主诊/住院等）为深色底白字
export function teamChipTheme(title) {
  return title === '主治医师' ? 'light' : 'dark'
}

// 执业状态（doctorStatus）
export const DOCTOR_STATUS_TEXT = {
  ACTIVE: '在职',
  SUSPENDED: '停诊',
  RESIGNED: '离职',
  CANCELLED: '注销'
}

// 状态筛选下拉（数组形态，便于 el-option 遍历）
export const DOCTOR_STATUS_OPTIONS = Object.entries(DOCTOR_STATUS_TEXT).map(([value, label]) => ({
  value,
  label
}))

// 状态标签 el-tag 类型
export const DOCTOR_STATUS_TAG = {
  ACTIVE: { type: 'success' },
  SUSPENDED: { type: 'warning' },
  RESIGNED: { type: 'danger' },
  CANCELLED: { type: 'info' }
}

// 性别（swagger 未约束枚举，沿用全站「男/女」中文直传约定）
export const GENDER_OPTIONS = ['男', '女']

// 变更历史类型（DoctorChangeLog.changeType）
export const CHANGE_TYPE_TEXT = {
  TITLE: '职称调整',
  TEAM: '团队调整',
  STATUS: '状态变更',
  INFO: '信息变更'
}

// 变更内容：拼接 beforeJson/afterJson 的前后值，解析失败时回退原文
export function formatChangeContent(beforeJson, afterJson) {
  const before = safeParseJson(beforeJson)
  const after = safeParseJson(afterJson)
  if (!before && !after) {
    return [beforeJson, afterJson].filter((item) => !isMissing(item)).join(' → ') || '-'
  }
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  const lines = []
  keys.forEach((key) => {
    const from = before?.[key]
    const to = after?.[key]
    lines.push(`${key}：${isMissing(from) ? '空' : from} → ${isMissing(to) ? '空' : to}`)
  })
  return lines.length ? lines.join('；') : '-'
}

// 变更历史整句：「{医生} {主语}由「前」变更为「后」，原因：xxx」，对齐设计稿胶囊行
export function formatChangeSentence({ changeType, beforeJson, afterJson, reason, doctorName } = {}) {
  const before = safeParseJson(beforeJson)
  const after = safeParseJson(afterJson)

  // 从 before/after JSON 中取可读值；状态枚举转中文，其余取原始值
  const pickValue = (obj) => {
    if (obj === null || obj === undefined || obj === '') return ''
    if (typeof obj !== 'object') return String(obj)
    if ('doctorStatus' in obj) {
      return DOCTOR_STATUS_TEXT[obj.doctorStatus] || String(obj.doctorStatus)
    }
    if ('title' in obj) return String(obj.title)
    if ('managerId' in obj) return obj.managerName || String(obj.managerId ?? '')
    return Object.values(obj)
      .map((value) => (value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')))
      .join('、')
  }

  const subjectMap = { STATUS: '状态', TITLE: '职称', TEAM: '团队', INFO: '信息' }
  const subject = subjectMap[changeType] || '信息'
  const from = pickValue(before)
  const to = pickValue(after)
  let sentence = `${doctorName || ''} ${subject}由「${from || '空'}」变更为「${to || '空'}」`.trim()
  if (!isMissing(reason)) sentence += `，原因：${reason}`
  return sentence
}
