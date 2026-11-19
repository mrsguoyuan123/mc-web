/**
 * 沟通记录（只读）模块接口
 *
 * 用于用户管理-沟通记录抽屉：群成员 + 消息流分页查询。
 * 后端接口路径尚未确认，当前为占位实现，直接返回空数据，页面以空数组 + 加载态正常渲染；
 * 路径确认后替换为 http.get 调用即可（import { http } from '../frontApikit.js'）。
 */

/**
 * 分页查询会话消息（只读）
 * @param {string|number} userId 用户/患者 ID
 * @param {{ page?: number, pageSize?: number, role?: string, keyword?: string }} params 查询参数
 * @returns {Promise<{ list: Array, total: number }>} 消息分页数据
 */
export function getConversationMessages(userId, params = {}) {
  // TODO 待后端补路径，例如：return http.get(`/users/${encodeURIComponent(userId)}/conversation/messages`, { ...params })
  void userId
  void params
  return Promise.resolve({ list: [], total: 0 })
}

/**
 * 查询会话群成员
 * @param {string|number} userId 用户/患者 ID
 * @returns {Promise<Array>} 成员列表，字段：id / name / role(USER|CS|DOCTOR|STATION|BOT)
 */
export function getConversationMembers(userId) {
  // TODO 待后端补路径，例如：return http.get(`/users/${encodeURIComponent(userId)}/conversation/members`)
  void userId
  return Promise.resolve([])
}

export default {
  getConversationMessages,
  getConversationMembers
}