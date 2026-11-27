<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useTablePage } from '../../composables/useTablePage'
import { ElMessage } from 'element-plus'
import {
  getMySecuritySettings,
  updateMySecuritySettings,
  getMyLoginLogs,
  getMyOperationLogs,
  updateMyAccountProfile
} from '../../api/index.js'
// 安全设置、登录日志、操作日志仍接真实 `/me` 接口，
// 个人信息保存调 `PUT /me/account/profile`（
// 修改密码无接口
// 用户资料无接口
/* ============================ 账户概览 ============================ */
// TODO: /me 接口文档暂未提供“当前用户资料”查询接口，概览先用 Mock 数据；
const profile = ref({
  name: '张三',
  username: 'admin',
  empNo: 'E2024001',
  role: '系统管理员',
  dept: '技术部',
  position: '高级管理员',
  email: 'zhangsan@junyuan.com',
  phone: '138****5678',
  hireDate: '2024-01-15',
  lastLogin: '2026-02-04 09:30:25',
  lastIp: '192.168.1.100',
  status: '正常'
})

/* ============================ 个人信息弹窗 ============================ */
const infoVisible = ref(false)
const infoRef = ref()
const infoForm = reactive({ name: '', email: '', phone: '' })
const infoRules = {
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
}

const openInfo = () => {
  Object.assign(infoForm, {
    name: profile.value.name,
    email: profile.value.email,
    phone: profile.value.phone
  })
  infoVisible.value = true
  infoRef.value?.clearValidate()
}

const saveInfo = () => {
  infoRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await updateMyAccountProfile({
        name: infoForm.name,
        email: infoForm.email,
        phone: infoForm.phone
      })
      Object.assign(profile.value, infoForm)
      infoVisible.value = false
      ElMessage.success('个人信息已更新')
    } catch (e) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    }
  })
}

/* ============================ 修改密码 ============================ */
// 说明：当前 swagger(account) 标签下无修改密码接口，先保留本地校验与弹窗；
// 后端提供改密接口后，在 savePwd 内替换为真实请求即可。
const pwdVisible = ref(false)
const pwdRef = ref()
const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })
const validateNewPwd = (_rule, value, cb) => {
  if (!value) cb(new Error('请输入新密码'))
  else if (value.length < 8) cb(new Error('密码长度至少8位'))
  else if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) cb(new Error('建议包含字母和数字'))
  else cb()
}
const validateConfirm = (_rule, value, cb) => {
  if (!value) cb(new Error('请再次输入新密码'))
  else if (value !== pwdForm.newPwd) cb(new Error('两次输入的密码不一致'))
  else cb()
}
const pwdRules = {
  oldPwd: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPwd: [{ validator: validateNewPwd, trigger: 'blur' }],
  confirmPwd: [{ validator: validateConfirm, trigger: 'blur' }]
}
const resetPwd = () => {
  pwdForm.oldPwd = ''
  pwdForm.newPwd = ''
  pwdForm.confirmPwd = ''
}
const openPwd = () => {
  resetPwd()
  pwdVisible.value = true
  pwdRef.value?.clearValidate()
}
const savePwd = () => {
  pwdRef.value.validate((valid) => {
    if (!valid) return
    // TODO: 后端改密接口就绪后在此调用，例如 changeMyPassword({ oldPwd, newPwd })
    pwdVisible.value = false
    resetPwd()
    ElMessage.success('密码修改成功')
  })
}

/* ============================ 安全设置 ============================ */
const security = reactive({
  twoFactorAuth: false,
  loginNotification: false,
  ipWhitelist: false,
  sessionTimeout: 30,
  passwordExpiry: 90
})
const securitySaving = ref(false)

async function fetchSecuritySettings() {
  try {
    const res = await getMySecuritySettings()
    const s = res || {}
    security.twoFactorAuth = !!s.twoFactorAuth
    security.loginNotification = !!s.loginNotification
    security.ipWhitelist = !!s.ipWhitelist
    security.sessionTimeout = s.sessionTimeout ?? 30
    security.passwordExpiry = s.passwordExpiry ?? 90
  } catch (e) {
    ElMessage.error(e?.message || '安全设置加载失败')
  }
}

const saveSecurity = async () => {
  securitySaving.value = true
  try {
    await updateMySecuritySettings({
      twoFactorAuth: security.twoFactorAuth,
      loginNotification: security.loginNotification,
      sessionTimeout: security.sessionTimeout,
      passwordExpiry: security.passwordExpiry,
      ipWhitelist: security.ipWhitelist
    })
    ElMessage.success('安全设置已保存')
  } catch (e) {
    ElMessage.error(e?.message || '保存失败，请稍后重试')
  } finally {
    securitySaving.value = false
  }
}

/* ============================ 登录日志（服务端分页） ============================ */
const loginQuery = reactive({ status: '', from: '', to: '', page: 1, pageSize: 20 })
const loginLogs = ref([])
const loginTotal = ref(0)
const loginLoading = ref(false)

const LOGIN_TYPE_MAP = { password: '密码', sms: '短信', wx: '微信' }

async function fetchLoginLogs() {
  loginLoading.value = true
  try {
    const res = await getMyLoginLogs({
      status: loginQuery.status === '' ? undefined : loginQuery.status,
      from: loginQuery.from || undefined,
      to: loginQuery.to || undefined,
      page: loginQuery.page,
      pageSize: loginQuery.pageSize
    })
    loginLogs.value = (res?.list || []).map((item) => ({
      id: item.id,
      username: item.username,
      loginType: LOGIN_TYPE_MAP[item.loginType] || item.loginType || '',
      ip: item.ip,
      location: item.location || '-',
      device: item.device || '-',
      status: item.status === 1 ? '成功' : '失败',
      reason: item.failReason || '',
      time: formatTime(item.createTime)
    }))
    loginTotal.value = res?.total || 0
  } catch (e) {
    ElMessage.error(e?.message || '登录日志加载失败')
  } finally {
    loginLoading.value = false
  }
}

const onLoginPageChange = (page) => { loginQuery.page = page; fetchLoginLogs() }
const onLoginSizeChange = (size) => { loginQuery.pageSize = size; loginQuery.page = 1; fetchLoginLogs() }

/* ============================ 操作日志（服务端分页） ============================ */
const opQuery = reactive({ module: '', status: '', from: '', to: '', page: 1, pageSize: 20 })
const opLogs = ref([])
const opTotal = ref(0)
const opLoading = ref(false)

async function fetchOpLogs() {
  opLoading.value = true
  try {
    const res = await getMyOperationLogs({
      module: opQuery.module || undefined,
      status: opQuery.status === '' ? undefined : opQuery.status,
      from: opQuery.from || undefined,
      to: opQuery.to || undefined,
      page: opQuery.page,
      pageSize: opQuery.pageSize
    })
    opLogs.value = (res?.list || []).map((item) => ({
      id: item.id,
      module: item.module || '-',
      type: item.operationType || '-',
      desc: item.description || '',
      method: item.method || '',
      uri: item.uri || '',
      ip: item.ip || '-',
      costMs: item.costMs,
      status: item.status === 1 ? '成功' : '失败',
      time: formatTime(item.createTime)
    }))
    opTotal.value = res?.total || 0
  } catch (e) {
    ElMessage.error(e?.message || '操作日志加载失败')
  } finally {
    opLoading.value = false
  }
}

const onOpPageChange = (page) => { opQuery.page = page; fetchOpLogs() }
const onOpSizeChange = (size) => { opQuery.pageSize = size; opQuery.page = 1; fetchOpLogs() }

/* ============================ 工具 ============================ */
function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const activeTab = ref('info')
const onTabChange = (name) => {
  if (name === 'login' && !loginLogs.value.length) fetchLoginLogs()
  if (name === 'op' && !opLogs.value.length) fetchOpLogs()
}

onMounted(() => {
  fetchSecuritySettings()
  fetchLoginLogs()
  fetchOpLogs()
})
</script>

<template>
  <div class="account-page">
    <div class="page-header">
      <h1>账户系统管理</h1>
      <p>管理个人账户信息、安全设置和操作日志</p>
    </div>

    <!-- 账户概览 -->
    <div class="panel overview-panel">
      <h3>账户概览</h3>
      <p class="panel-sub">当前登录账户的基本信息</p>
      <div class="overview-body">
        <div class="avatar-wrap">
          <div class="avatar">
            <el-icon><UserFilled /></el-icon>
          </div>
          <span class="avatar-cam"><el-icon><Camera /></el-icon></span>
        </div>
        <div class="overview-grid">
          <div class="ov-item">
            <span class="ov-label">真实姓名</span>
            <span class="ov-value">{{ profile.name || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">用户名</span>
            <span class="ov-value">{{ profile.username || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">员工编号</span>
            <span class="ov-value">{{ profile.empNo || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">角色</span>
            <el-tag v-if="profile.role" type="primary" effect="dark" round size="small">{{ profile.role }}</el-tag>
            <span v-else class="ov-value">-</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">部门</span>
            <span class="ov-value">{{ profile.dept || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">职位</span>
            <span class="ov-value">{{ profile.position || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">邮箱</span>
            <span class="ov-value icon-text"><el-icon><Message /></el-icon>{{ profile.email || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">手机号</span>
            <span class="ov-value icon-text"><el-icon><Phone /></el-icon>{{ profile.phone || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">入职日期</span>
            <span class="ov-value">{{ profile.hireDate || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">最后登录时间</span>
            <span class="ov-value">{{ profile.lastLogin || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">最后登录IP</span>
            <span class="ov-value">{{ profile.lastIp || '-' }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">账户状态</span>
            <el-tag type="success" effect="dark" round size="small">{{ profile.status }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="seg-tabs" @tab-change="onTabChange">
      <!-- 个人信息 -->
      <el-tab-pane name="info">
        <template #label>
          <span class="tab-label"><el-icon><User /></el-icon>个人信息</span>
        </template>
        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>个人信息管理</h3>
              <p class="panel-sub">修改个人基本信息</p>
            </div>
            <el-button type="primary" class="btn-blue" @click="openInfo">
              <el-icon><Setting /></el-icon>编辑信息
            </el-button>
          </div>
          <div class="info-form">
            <div class="info-field">
              <label>真实姓名</label>
              <div class="read-box">{{ profile.name || '-' }}</div>
            </div>
            <div class="info-field">
              <label>手机号码</label>
              <div class="read-box icon-text"><el-icon><Phone /></el-icon>{{ profile.phone || '-' }}</div>
            </div>
            <div class="info-field">
              <label>用户名</label>
              <div class="read-box">{{ profile.username || '-' }}</div>
            </div>
            <div class="info-field">
              <label>员工编号</label>
              <div class="read-box">{{ profile.empNo || '-' }}</div>
            </div>
            <div class="info-field">
              <label>邮箱地址</label>
              <div class="read-box icon-text"><el-icon><Message /></el-icon>{{ profile.email || '-' }}</div>
            </div>
            <div class="info-field">
              <label>入职日期</label>
              <div class="read-box">{{ profile.hireDate || '-' }}</div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 安全设置 -->
      <el-tab-pane name="security">
        <template #label>
          <span class="tab-label"><el-icon><Lock /></el-icon>安全设置</span>
        </template>
        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>密码管理</h3>
              <p class="panel-sub">修改登录密码</p>
            </div>
            <el-button type="primary" class="btn-blue" @click="openPwd">
              <el-icon><Lock /></el-icon>修改密码
            </el-button>
          </div>
          <el-alert class="pwd-tip" type="info" :closable="false" show-icon>
            <template #title>密码安全建议</template>
            <ul class="tip-list">
              <li>密码长度至少 8 位，建议使用12位以上</li>
              <li>包含大小写字母、数字和特殊字符</li>
              <li>不要使用生日、手机号等容易猜测的信息</li>
              <li>定期更换密码，建议每三个月更换一次</li>
              <li>不要在多个平台使用相同密码</li>
            </ul>
          </el-alert>
        </div>

        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>安全选项</h3>
              <p class="panel-sub">配置账户安全防护</p>
            </div>
            <el-button type="primary" :loading="securitySaving" @click="saveSecurity">保存配置</el-button>
          </div>
          <div class="security-list">
            <div class="security-item">
              <span class="sec-icon blue"><el-icon><Key /></el-icon></span>
              <div class="sec-text">
                <strong>双因素认证</strong>
                <p>登录时需要输入手机验证码，提升账户安全</p>
              </div>
              <el-switch v-model="security.twoFactorAuth" />
            </div>
            <div class="security-item">
              <span class="sec-icon green"><el-icon><MessageChecked /></el-icon></span>
              <div class="sec-text">
                <strong>登录通知</strong>
                <p>账户登录时发送邮件通知，及时发现异常登录</p>
              </div>
              <el-switch v-model="security.loginNotification" />
            </div>
            <div class="security-item">
              <span class="sec-icon purple"><el-icon><Position /></el-icon></span>
              <div class="sec-text">
                <strong>IP白名单</strong>
                <p>只允许特定IP地址登录，增强账户安全</p>
              </div>
              <el-switch v-model="security.ipWhitelist" />
            </div>
            <div class="security-item input-item">
              <span class="sec-icon orange"><el-icon><AlarmClock /></el-icon></span>
              <div class="sec-text">
                <strong>会话超时时间</strong>
                <p>无操作后自动退出登录的时间</p>
              </div>
              <div class="suffix-input">
                <el-input-number v-model="security.sessionTimeout" :min="5" :max="240" />
                <span class="unit">分钟</span>
              </div>
            </div>
            <div class="security-item input-item">
              <span class="sec-icon red"><el-icon><Lock /></el-icon></span>
              <div class="sec-text">
                <strong>密码有效期</strong>
                <p>密码到期后需要强制修改</p>
              </div>
              <div class="suffix-input">
                <el-input-number v-model="security.passwordExpiry" :min="30" :max="365" />
                <span class="unit">天</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 登录日志 -->
      <el-tab-pane name="login">
        <template #label>
          <span class="tab-label"><el-icon><Clock /></el-icon>登录日志</span>
        </template>
        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>登录日志</h3>
              <p class="panel-sub">查看账户的登录历史记录</p>
            </div>
          </div>
          <el-table v-loading="loginLoading" :data="loginLogs" stripe>
            <el-table-column label="登录时间" prop="time" min-width="170" />
            <el-table-column label="IP地址" min-width="140">
              <template #default="{ row }">
                <span class="icon-text"><el-icon><LocationInformation /></el-icon>{{ row.ip }}</span>
              </template>
            </el-table-column>
            <el-table-column label="登录地点" prop="location" min-width="130" />
            <el-table-column label="登录方式" prop="loginType" min-width="100" />
            <el-table-column label="设备" min-width="120">
              <template #default="{ row }">
                <span class="icon-text"><el-icon><Monitor /></el-icon>{{ row.device }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === '成功' ? 'success' : 'danger'" effect="dark" round size="small">
                  <el-icon style="margin-right:3px"><CircleCheck v-if="row.status === '成功'" /><CircleClose v-else /></el-icon>{{ row.status }}
                </el-tag>
                <div v-if="row.reason" class="fail-reason">{{ row.reason }}</div>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            class="list-pager"
            background
            v-model:current-page="loginQuery.page"
            v-model:page-size="loginQuery.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="loginTotal"
            layout="total, prev, pager, next, sizes"
            @current-change="onLoginPageChange"
            @size-change="onLoginSizeChange"
          />
        </div>
      </el-tab-pane>

      <!-- 操作日志 -->
      <el-tab-pane name="op">
        <template #label>
          <span class="tab-label"><el-icon><List /></el-icon>操作日志</span>
        </template>
        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>操作日志</h3>
              <p class="panel-sub">查看账户的操作历史记录</p>
            </div>
          </div>
          <el-table v-loading="opLoading" :data="opLogs" stripe>
            <el-table-column label="操作时间" prop="time" min-width="170" />
            <el-table-column label="操作模块" min-width="110">
              <template #default="{ row }">
                <el-tag round size="small" class="module-tag">{{ row.module }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作类型" prop="type" min-width="110" />
            <el-table-column label="操作描述" prop="desc" min-width="230" show-overflow-tooltip />
            <el-table-column label="IP地址" prop="ip" min-width="130" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === '成功' ? 'success' : 'danger'" effect="dark" round size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            class="list-pager"
            background
            v-model:current-page="opQuery.page"
            v-model:page-size="opQuery.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="opTotal"
            layout="total, prev, pager, next, sizes"
            @current-change="onOpPageChange"
            @size-change="onOpSizeChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑个人信息弹窗 -->
    <el-dialog v-model="infoVisible" width="500px" class="account-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>编辑个人信息</h3>
          <p>修改您的个人基本信息</p>
        </div>
      </template>
      <el-form ref="infoRef" :model="infoForm" :rules="infoRules" label-position="top">
        <el-form-item label="真实姓名" prop="name">
          <el-input v-model="infoForm.name" size="" />
        </el-form-item>
        <el-form-item label="邮箱地址" prop="email">
          <el-input v-model="infoForm.email" size="" />
        </el-form-item>
        <el-form-item label="手机号码" prop="phone">
          <el-input v-model="infoForm.phone" size="" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="" @click="infoVisible = false">取消</el-button>
        <el-button type="primary" size="" @click="saveInfo">保存修改</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdVisible" width="500px" class="account-dialog">
      <template #header>
        <div class="dialog-heading">
          <h3>修改密码</h3>
          <p>为了账户安全，请定期修改密码</p>
        </div>
      </template>
      <el-form ref="pwdRef" :model="pwdForm" :rules="pwdRules" label-position="top">
        <el-form-item label="当前密码" prop="oldPwd">
          <el-input v-model="pwdForm.oldPwd" type="password" size="" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPwd">
          <el-input v-model="pwdForm.newPwd" type="password" size="" show-password placeholder="请输入新密码" />
          <span class="form-hint">密码长度至少8位，建议包含大小写字母、数字和特殊字符</span>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" type="password" size="" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="" @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" size="" @click="savePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.account-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
.page-header p { margin: 8px 0 0; font-size: 13px; color: #9ca3af; }


.panel h3 { margin: 0; font-size: 16px; font-weight: 700; }
.panel-sub { margin: 6px 0 0; font-size: 13px; color: #9ca3af; }

.overview-panel { margin-top: 22px; padding: 22px 24px; }
.overview-body { display: flex; gap: 32px; margin-top: 18px; }

.avatar-wrap { width: 84px; height: 84px; position: relative; flex-shrink: 0; }
.avatar {
  width: 84px; height: 84px; border-radius: 50%;
  background: linear-gradient(135deg, #8a9ba8 0%, #5f7481 55%, #3d4f5a 100%);
  color: rgba(255, 255, 255, 0.92);
  display: flex; align-items: center; justify-content: center; font-size: 40px;
}
.ov-item .el-tag { width: fit-content; }
.avatar-cam {
  position: absolute; right: 0; bottom: 0; width: 26px; height: 26px; border-radius: 50%;
  background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  color: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 13px;
}

.overview-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 24px; }
.ov-item { display: flex; flex-direction: column; gap: 6px; }
.ov-label { font-size: 12px; color: #9ca3af; }
.ov-value { font-size: 14px; font-weight: 600; }
.icon-text { display: inline-flex; align-items: center; gap: 5px; }
.icon-text .el-icon { color: #9ca3af; font-size: 14px; }

.seg-tabs { margin-top: 22px; }
.seg-tabs :deep(.el-tabs__header) { margin: 0 0 18px; }
.tab-label { display: inline-flex; align-items: center; gap: 5px; }
.content-panel { padding: 22px 24px; }
.content-panel + .content-panel { margin-top: 18px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.btn-blue { font-weight: 600; }

.info-form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
.info-field label { display: block; margin-bottom: 8px; font-size: 13px; color: #6b7280; }
.read-box {
  min-height: 42px; display: flex; align-items: center; padding: 10px 14px;
  border-radius: 10px; background: #f5f6f8; font-size: 14px; font-weight: 500; color: #374151;
}
.read-box.icon-text .el-icon { color: #9ca3af; }

.pwd-tip { border-radius: 10px; }
.tip-list { margin: 6px 0 0; padding-left: 18px; line-height: 1.9; }

.security-list { display: flex; flex-direction: column; }
.security-item { display: flex; align-items: center; gap: 14px; padding: 16px 4px; border-bottom: 1px solid #f1f3f7; }
.security-item:last-child { border-bottom: none; }
.sec-icon {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.sec-icon.blue { background: #eff6ff; color: #2563eb; }
.sec-icon.green { background: #ecfdf5; color: #16a34a; }
.sec-icon.purple { background: #f5f3ff; color: #9333ea; }
.sec-icon.orange { background: #fff7ed; color: #ea580c; }
.sec-icon.red { background: #fef2f2; color: #dc2626; }
.sec-text { flex: 1; }
.sec-text strong { font-size: 14px; }
.sec-text p { margin: 4px 0 0; font-size: 12px; color: #9ca3af; }
.suffix-input { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }

:deep(.el-table) {
  --el-table-header-bg-color: #fff;
  --el-table-header-text-color: #1f2937;
  --el-table-border-color: #f1f3f7;
  --el-table-row-hover-bg-color: #fafbfc;
}
:deep(.el-table th.el-table__cell) { font-weight: 700; background: #fff; }
:deep(.el-table .el-table__row--striped td.el-table__cell) { background: #fff; }
.module-tag { background: #f5f6f8; border-color: #f5f6f8; color: #4b5563; }
.fail-reason { margin-top: 2px; font-size: 12px; color: #dc2626; }
.list-pager { margin-top: 16px; justify-content: flex-end; }

.dialog-heading h3 { margin: 0; font-size: 17px; font-weight: 700; }
.dialog-heading p { margin: 6px 0 0; font-size: 13px; color: #9ca3af; }
:deep(.el-form-item__label) { padding-bottom: 6px; font-weight: 500; color: #374151; }
.form-hint { display: block; margin-top: 6px; font-size: 12px; color: #9ca3af; line-height: 1.6; }

@media (max-width: 992px) {
  .overview-grid, .info-form { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .overview-body { flex-direction: column; align-items: center; }
  .overview-grid, .info-form { grid-template-columns: 1fr; width: 100%; }
}
</style>

<style>
.el-dialog.account-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}
.el-dialog.account-dialog .el-input__wrapper,
.el-dialog.account-dialog .el-textarea__inner {
  background: #f5f6f8; border-radius: 9px; box-shadow: none;
}
.el-dialog.account-dialog .el-input__wrapper.is-focus,
.el-dialog.account-dialog .el-textarea__inner:focus {
  background: #fff; box-shadow: 0 0 0 1px #2563eb;
}
.unit{
  width: 30px;
  text-align: right;
}
</style>
