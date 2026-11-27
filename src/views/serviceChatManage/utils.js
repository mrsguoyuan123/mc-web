// 客服工作台模块私有字典与展示工具（SC1 约定：不进全局 utils）
import { MISSING_TEXT, isMissing } from '../../utils/index.js'

// 沟通状态：PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / PURCHASED 已购买
export const COMMUNICATE_STATUS_TEXT = {
  PENDING: '待沟通',
  FOLLOWED: '已沟通',
  FOLLOW_UP: '待跟进',
  PURCHASED: '已购买'
}

// 购买意向：HIGH 高 / MEDIUM 中 / LOW 低 / PURCHASED 已购买
export const PURCHASE_INTENT_TEXT = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
  PURCHASED: '已购买'
}

export const COMMUNICATE_STATUS_OPTIONS = Object.entries(COMMUNICATE_STATUS_TEXT).map(
  ([value, label]) => ({ value, label })
)

export const PURCHASE_INTENT_OPTIONS = Object.entries(PURCHASE_INTENT_TEXT).map(
  ([value, label]) => ({ value, label })
)

// 标签配色（el-tag type）：待沟通/高意向用醒目色，已购买用成功色
export const COMMUNICATE_STATUS_TAG = {
  PENDING: 'danger',
  FOLLOW_UP: 'warning',
  FOLLOWED: 'info',
  PURCHASED: 'success'
}

export const PURCHASE_INTENT_TAG = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
  PURCHASED: 'success'
}

// 手机号脱敏：工程暂无统一口径，仅对标准 11 位手机号做 138****5678 处理，其余原样返回
export function maskPhone(phone) {
  if (isMissing(phone)) return ''
  const text = String(phone)
  return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(7)}` : text
}

// 列表头像底色：按姓名首字符稳定取色，不依赖网络图片
const AVATAR_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#6366f1'
]

export function avatarColor(name) {
  const text = String(name || '?')
  const code = text.charCodeAt(0) || 0
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

// 附件上传角色中文映射（swagger：DOCTOR/CS/CAREGIVER/PATIENT/ADMIN）
export const UPLOADER_ROLE_TEXT = {
  DOCTOR: '医生',
  CS: '客服',
  CAREGIVER: '陪诊师',
  PATIENT: '用户',
  ADMIN: '管理员'
}

// 附件分类（swagger 定稿六类）
export const ATTACHMENT_CATEGORY_OPTIONS = [
  '检查报告',
  '影像资料',
  '病理资料',
  '饮食记录',
  '运动记录',
  '其他'
]

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']

export const getFileExt = (fileName) =>
  String(fileName || '')
    .split('.')
    .pop()
    .toLowerCase()

export const isImageFile = (fileName) => IMAGE_EXTS.includes(getFileExt(fileName))

// 字节数转可读大小；0/非法值按缺失处理
export function formatFileSize(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return MISSING_TEXT
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 沟通记录渠道字典（swagger CommunicationItem.type：MESSAGE/CALL，细分分类待后端补）
export const COMMUNICATION_TYPE_TEXT = {
  MESSAGE: '聊天',
  CALL: '虚拟电话'
}

export const COMMUNICATION_TYPE_TAG = {
  MESSAGE: 'primary',
  CALL: 'success'
}
