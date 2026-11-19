<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="hero-badge">
        <el-icon><FirstAidKit /></el-icon>
        <span>伟君医疗服务平台</span>
      </div>
      <h1>医疗后台管理系统</h1>
      <p class="hero-sub">安全登录 · 角色授权 · 数据看板一体化</p>
    </section>

    <section class="login-card">
      <div class="login-title">
        <h2>欢迎登录</h2>
        <p>请输入账号密码登录后台</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-button type="primary" size="large" class="full-width" :loading="loginLoading" @click="handleLogin">
          登录系统
        </el-button>
      </el-form>

      <el-alert class="demo-tip" type="info" :closable="false" title="演示账号" :description="demoAccounts" />

      <!-- dev 免登调试面板：仅开发环境展示，生产环境不渲染，且后端该接口在生产不可用 -->
      <div v-if="isDev" class="dev-login">
        <div class="dev-title">dev 免登调试</div>
        <el-button
          v-for="key in devKeys"
          :key="key"
          size="small"
          :loading="devLoadingKey === key"
          :disabled="Boolean(devLoadingKey)"
          @click="handleDevLogin(key)"
        >
          {{ key }}
        </el-button>
      </div>
    </section>

    <!-- 多角色选择弹窗（单角色不弹窗，自动选角直跳） -->
    <el-dialog
      v-model="roleDialogVisible"
      title="请选择登录角色"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div v-loading="roleLoading" class="role-list">
        <div
          v-for="item in roleList"
          :key="item.code"
          class="role-item"
          :class="{ 'is-disabled': roleLoading }"
          @click="handleSelectRole(item)"
        >
          <div class="role-main">
            <div class="role-name">{{ item.name }}</div>
            <div class="role-desc">{{ roleDesc(item) }}</div>
          </div>
          <el-icon class="role-arrow"><ArrowRight /></el-icon>
        </div>
        <el-empty v-if="!roleLoading && roleList.length === 0" description="该账号暂无可用于 PC 端的角色" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FirstAidKit, User, Lock, ArrowRight } from '@element-plus/icons-vue'
import { useAuthStore, DOCTOR_ROLE_CODE } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isDev = import.meta.env.DEV
const devKeys = ['admin', 'hospital', 'cs', 'station', 'doctor']

const formRef = ref(null)
const loginLoading = ref(false)
const roleLoading = ref(false)
const devLoadingKey = ref('')
const form = ref({
  username: localStorage.getItem('cacheUsername') || '',
  password: ''
})
const roleDialogVisible = ref(false)
const roleList = ref([])

const demoAccounts = 'root/admin123（公司管理）；multi/1（多角色选择演示）；admin/1（客服）；admin3/1（驻点）；dev-hospital/1（医院）；deptadmin/1（科室）'

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const roleDesc = (item) => {
  const parts = []
  if (item.baseRole) parts.push(item.baseRole)
  if (item.dataScope) parts.push(`数据范围 ${item.dataScope}`)
  if (item.terminal) parts.push(`终端 ${item.terminal}`)
  return parts.join(' · ')
}

// 过滤掉医生移动端角色：mobile_doctor 不出现在 PC 登录选角入口
const pickPcRoles = (list) =>
  (Array.isArray(list) ? list : []).filter((item) => item.code && item.code !== DOCTOR_ROLE_CODE)

const redirectAfterLogin = () => {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  router.replace(target && target.startsWith('/') ? target : '/')
}

// 两步式登录第一步：pcLogin 拿 loginTicket/roles/user
const handleLogin = async () => {
  await formRef.value.validate()
  loginLoading.value = true
  try {
    const loginRes = await auth.login({
      username: form.value.username.trim(),
      password: form.value.password
    })
    localStorage.setItem('cacheUsername', form.value.username.trim())

    const pcRoles = pickPcRoles(loginRes.roles)
    // 单角色且后端给了 autoSelectRoleCode：自动完成第二步，直接跳转
    if (pcRoles.length === 1 && loginRes.autoSelectRoleCode) {
      roleLoading.value = true
      try {
        await auth.selectRole(loginRes.autoSelectRoleCode)
        ElMessage.success('登录成功')
        redirectAfterLogin()
      } finally {
        roleLoading.value = false
      }
      return
    }

    // 多角色：弹窗由用户选择 roleCode 后再 select-role
    if (pcRoles.length > 1) {
      roleList.value = pcRoles
      roleDialogVisible.value = true
      return
    }

    // 兜底：无明确角色列表时，尝试用 autoSelectRoleCode 自动选角
    if (loginRes.autoSelectRoleCode) {
      await auth.selectRole(loginRes.autoSelectRoleCode)
      ElMessage.success('登录成功')
      redirectAfterLogin()
      return
    }
    ElMessage.error('该账号没有可用于 PC 端的角色，请联系管理员')
  } catch (err) {
    ElMessage.error(err?.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

// 两步式登录第二步：选定角色后 selectPcRole 换取 token
const handleSelectRole = async (roleItem) => {
  roleLoading.value = true
  try {
    await auth.selectRole(roleItem.code)
    roleDialogVisible.value = false
    ElMessage.success(`已选择角色：${roleItem.name}`)
    redirectAfterLogin()
  } catch (err) {
    ElMessage.error(err?.message || '角色选择失败')
  } finally {
    roleLoading.value = false
  }
}

// dev 免登：拉取静态 token 后用 /auth/me 恢复会话
const handleDevLogin = async (key) => {
  devLoadingKey.value = key
  try {
    await auth.loginWithDevToken(key)
    ElMessage.success(`dev 免登成功：${key}`)
    redirectAfterLogin()
  } catch (err) {
    ElMessage.error(err?.message || 'dev 免登失败')
  } finally {
    devLoadingKey.value = ''
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 460px;
  background: #eef4ff;
}

.login-hero {
  padding: 88px;
  color: #fff;
  background:
    radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.35), transparent 32%),
    linear-gradient(135deg, #0f172a, #1457d9);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-badge {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.login-hero h1 {
  margin: 28px 0 14px;
  font-size: 42px;
  line-height: 1.25;
}

.hero-sub {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 16px;
}

.login-card {
  margin: auto;
  width: calc(100% - 64px);
  padding: 38px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(30, 64, 175, 0.16);
}

.login-title h2 {
  margin: 0 0 8px;
  font-size: 28px;
  color: #111827;
}

.login-title p {
  margin: 0 0 28px;
  color: #6b7280;
}

.full-width {
  width: 100%;
}

.demo-tip {
  margin-top: 18px;
}

.dev-login {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.dev-title {
  width: 100%;
  font-size: 12px;
  color: #94a3b8;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}

.role-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.role-item:hover {
  border-color: #2563eb;
  background: #f5f8ff;
}

.role-item.is-disabled {
  pointer-events: none;
  opacity: 0.6;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.role-desc {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

.role-arrow {
  color: #94a3b8;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    display: none;
  }

  .login-card {
    margin: 24px auto;
  }
}
</style>
