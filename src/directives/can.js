/**
 * 全局按钮/元素级权限指令：v-can="'user:add'" 或 v-can="['user:add','user:edit']"
 *
 * 依据登录用户 user.permissions 权限码判断，无权限的元素直接从 DOM 移除；
 * 权限判断统一走 auth store 的 can()，禁止在模板里硬编码 role。
 */
import { useAuthStore } from '../stores/auth'

const evaluate = (binding) => {
  const auth = useAuthStore()
  const value = binding.value
  if (Array.isArray(value)) {
    // 数组语义：拥有其中任意一个权限即可（OR）
    return value.length === 0 || value.some((code) => auth.can(code))
  }
  return auth.can(value)
}

export const vCan = {
  mounted(el, binding) {
    if (!evaluate(binding)) el.parentNode && el.parentNode.removeChild(el)
  },
  updated(el, binding) {
    if (!evaluate(binding) && el.parentNode) el.parentNode.removeChild(el)
  }
}

export default vCan
