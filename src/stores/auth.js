import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'weijun-admin-user'

export const getHomePath = (role = '') => {
  if (role === 'service') return '/serviceChatManage'
  if (role === 'hospital') return '/hospitalManage/dashboard'
  return '/dashboard'
}

export const roleProfiles = {
  admin: {
    role: 'admin',
    label: '管理员',
    name: '系统管理员',
    loginName: 'admin',
    avatar: 'S'
  },
  doctor: {
    role: 'doctor',
    label: '医生',
    name: '李医生',
    loginName: 'doctor',
    avatar: '医'
  },
  service: {
    role: 'service',
    label: '客服人员',
    name: '客服小王',
    loginName: 'service',
    avatar: '客'
  },
  hospital: {
    role: 'hospital',
    label: '医院管理',
    name: '医院管理员',
    loginName: 'hospital',
    avatar: '医'
  }
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

  const isLoggedIn = computed(() => Boolean(user.value))
  const role = computed(() => user.value?.role || '')
  const displayName = computed(() => user.value?.name || '')

  const hasRole = (roles) => {
    if (!roles || roles.length === 0) return true
    return Boolean(role.value) && roles.includes(role.value)
  }

  const login = async ({ role: selectedRole, username }) => {
    const profile = roleProfiles[selectedRole]
    user.value = {
      ...profile,
      username: username || profile.loginName,
      loginAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    user,
    role,
    displayName,
    isLoggedIn,
    hasRole,
    login,
    logout
  }
})
