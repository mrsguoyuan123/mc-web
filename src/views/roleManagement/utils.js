// 角色管理模块公共工具：枚举映射与缺失值口径（接口未返回统一红色展示「接口未提供」）

export const MISSING_TEXT = '接口未提供'

// null / undefined / 空串视为缺失；0 为有效值，不判缺失
export const isMissing = (value) => value === undefined || value === null || value === ''

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

// 时间格式 YYYY-MM-DD HH:mm
export const formatTime = (value) => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}
