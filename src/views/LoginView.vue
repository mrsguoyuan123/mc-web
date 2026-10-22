<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore, getHomePath } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  role: 'admin',
  username: 'admin',
  password: 'admin123'
})

const roleOptions = [
  { value: 'admin', label: '系统管理员' },
  { value: 'doctor', label: '医生' },
  { value: 'service', label: '客服' },
  { value: 'hospital', label: '医院管理' }
]

const rules = {
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleRoleChange = (role) => {
  form.username = role
  form.password = `${role}123`
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await auth.login(form)
    ElMessage.success('登录成功')

    const redirectPath = Array.isArray(route.query.redirect)
      ? route.query.redirect[0]
      : route.query.redirect
    const servicePaths = ['/serviceChatManage', '/servicePushManage']
    const hospitalPaths = ['/hospitalManage/dashboard', '/hospitalManage/users', '/hospitalManage/healthConsult']
    const target = form.role === 'service'
      ? (servicePaths.includes(redirectPath) ? redirectPath : getHomePath(form.role))
      : form.role === 'hospital'
        ? (hospitalPaths.includes(redirectPath) ? redirectPath : getHomePath(form.role))
      : (redirectPath || getHomePath(form.role))

    router.push(target)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="hero-badge">
        <el-icon><FirstAidKit /></el-icon>
        <span>卫君医疗服务平台</span>
      </div>
      <h1>医疗服务后台管理系统！</h1>
    
    </section>

    <section class="login-card">
      <div class="login-title">
        <h2>欢迎登录</h2>
        <p>请选择演示角色并进入后台</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="登录角色" prop="role">
          <el-select v-model="form.role" class="full-width" @change="handleRoleChange">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
              <div class="role-option">
                <span>{{ item.label }}</span>
             
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="'Lock'"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button type="primary" size="large" class="full-width" :loading="loading" @click="handleLogin">
          登录系统
        </el-button>
      </el-form>

      <el-alert
        class="demo-tip"
        type="info"
        :closable="false"
        title="演示账号：admin / admin123，doctor / doctor123，service / service123，hospital / hospital123"
      />
    </section>
  </div>
</template>

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
  margin: 28px 0 18px;
  font-size: 42px;
  line-height: 1.25;
}

.login-hero p {
  max-width: 560px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 16px;
  line-height: 1.8;
}

.hero-points {
  display: grid;
  gap: 14px;
  margin-top: 36px;
}

.hero-points div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
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

.role-option {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.role-option small {
  color: #909399;
}

.demo-tip {
  margin-top: 18px;
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
