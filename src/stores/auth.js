import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  pcLogin as pcLoginApi,
  selectPcRole as selectPcRoleApi,
  switchPcRole as switchPcRoleApi,
  getCurrentUser,
  logout as logoutApi,
  getDevTokens
} from '../api/modules/auth.js'
import { tokenStore } from '../api/frontApikit.js'

const STORAGE_KEY = 'weijun-admin-user'
const DOCTOR_ROLE_CODE = 'mobile_doctor'

/* 路由首页：保留旧的 getHomePath 签名（role 入参），优先按角色码映射，缺省回数据概览 */
export const getHomePath = (role = '') => {
  if (role === 'pc_customer_service' || role === 'service') return '/serviceChatManage'
  if (role === 'pc_hospital_manager' || role === 'hospital') return '/hospitalManage/dashboard'
  return '/dashboard'
}

/* 旧版布局仍引用的静态角色画像，作为没有后端资料时的兜底展示，不参与权限判断 */
export const roleProfiles = {
  admin: { role: 'admin', label: '管理员', name: '系统管理员', loginName: 'admin', avatar: 'S' },
  doctor: { role: 'doctor', label: '医生', name: '李医生', loginName: 'doctor', avatar: '医' },
  service: { role: 'service', label: '客服人员', name: '客服小王', loginName: 'service', avatar: '客' },
  hospital: { role: 'hospital', label: '医院管理', name: '医院管理员', loginName: 'hospital', avatar: '院' }
}

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(readStoredUser())
  const roles = ref([])
  // loginTicket 仅放内存，绝不 localStorage 持久化（5 分钟有效，只能用于 select-role）
  const loginTicket = ref('')
  const restoring = ref(false)
  const sessionRestored = ref(false)

  const isLoggedIn = computed(() => Boolean(tokenStore.getToken() && user.value))
  const role = computed(() => user.value?.roleCode || user.value?.role || '')
  const displayName = computed(() => user.value?.username || user.value?.name || '')
  const permissions = computed(() => user.value?.permissions || [])
  const dataScope = computed(() => user.value?.dataScope || '')
  const roleName = computed(() => user.value?.roleName || '')

  const persistUser = (value) => {
    user.value = value
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  // 权限工具：菜单、按钮统一用 can(permissionCode)，禁止硬编码 role 判断
  const can = (permissionCode) => {
    if (!permissionCode) return true
    const codes = permissions.value
    if (!codes || codes.length === 0) return false
    if (codes.includes('*') || codes.includes('*:*:*')) return true
    return codes.includes(permissionCode)
  }

  // 兼容旧布局/守卫的角色判断（新代码请使用 can）；同时兼容旧演示角色名与 pc_* 角色码
  const hasRole = (roleCodes) => {
    if (!roleCodes || roleCodes.length === 0) return true
    if (!role.value) return false
    if (roleCodes.includes(role.value)) return true
    const alias = {
      admin: ['pc_admin'],
      doctor: ['mobile_doctor'],
      service: ['pc_customer_service'],
      hospital: ['pc_hospital_manager']
    }
    return roleCodes.some((code) => (alias[code] || []).includes(role.value))
  }

  /* dataScope 处理：ALL 显示医院筛选；HOSPITAL 隐藏医院筛选；DEPARTMENT 隐藏医院+科室；SELF/CUSTOM 按 scopeJson 处理 */
  const scope = computed(() => ({
    dataScope: dataScope.value,
    scopeJson: user.value?.scopeJson || '',
    hospitalId: user.value?.hospitalId || '',
    departmentId: user.value?.departmentId || '',
    showHospitalFilter: dataScope.value === 'ALL',
    showDepartmentFilter: dataScope.value === 'ALL' || dataScope.value === 'HOSPITAL'
  }))

  const applyAuth = (data) => {
    if (data?.token) tokenStore.setTokens(data.token, data.refreshToken)
    if (data?.user) persistUser(data.user)
    if (Array.isArray(data?.roles)) roles.value = data.roles
    sessionRestored.value = true
  }

  // 两步式第一步：账密登录，拿 loginTicket / roles / user，不持久化 ticket
  const login = async ({ username, password }) => {
    const res = await pcLoginApi({ username, password })
    loginTicket.value = res.loginTicket || ''
    roles.value = Array.isArray(res.roles) ? res.roles : []
    if (res.user) persistUser({ ...res.user, loginTicket: undefined })
    return res
  }

  // 两步式第二步：选角色换 token；单角色可直接传 autoSelectRoleCode
  const selectRole = async (roleCode) => {
    if (!loginTicket.value) throw new Error('登录票据已失效，请重新登录')
    const res = await selectPcRoleApi({ loginTicket: loginTicket.value, roleCode })
    applyAuth(res)
    loginTicket.value = ''
    return res
  }

  // 已登录切换角色：携带 accessToken，成功后返回新 token/权限，调用方负责清缓存重载
  const switchRole = async (roleCode) => {
    const res = await switchPcRoleApi({ roleCode })
    applyAuth(res)
    return res
  }

  // 会话恢复：刷新页面用 /auth/me 恢复用户与权限，失败返回 false 由守卫跳登录
  const restore = async () => {
    if (!tokenStore.getToken()) {
      persistUser(null)
      return false
    }
    restoring.value = true
    try {
      const me = await getCurrentUser()
      persistUser(me)
      if (Array.isArray(me?.roles)) roles.value = me.roles
      sessionRestored.value = true
      return true
    } catch {
      persistUser(null)
      tokenStore.clear()
      roles.value = []
      sessionRestored.value = false
      return false
    } finally {
      restoring.value = false
    }
  }

  // dev 免登调试：仅 dev 环境可用，生产环境该接口 404
  const loginWithDevToken = async (key) => {
    const tokens = await getDevTokens()
    const token = tokens?.[key] || tokens?.admin
    if (!token) throw new Error('未获取到 dev 调试令牌')
    tokenStore.setTokens(token, '')
    const ok = await restore()
    if (!ok) throw new Error('dev 令牌恢复会话失败')
    return ok
  }

  const logout = async () => {
    try {
      await logoutApi(tokenStore.getRefreshToken())
    } catch {
      // 即使登出接口失败，本地仍强制清理凭证
    }
    loginTicket.value = ''
    roles.value = []
    persistUser(null)
    tokenStore.clear()
  }

  const reset = () => {
    loginTicket.value = ''
    roles.value = []
    persistUser(null)
    tokenStore.clear()
    sessionRestored.value = false
  }

  return {
    user,
    roles,
    loginTicket,
    restoring,
    sessionRestored,
    isLoggedIn,
    role,
    roleName,
    displayName,
    permissions,
    dataScope,
    scope,
    can,
    hasRole,
    login,
    selectRole,
    switchRole,
    restore,
    loginWithDevToken,
    logout,
    reset
  }
})

export { DOCTOR_ROLE_CODE }
