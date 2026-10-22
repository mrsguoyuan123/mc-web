<script setup>
import { useTablePage } from '../../composables/useTablePage'
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('info')

// 账户概览信息
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

// 编辑个人信息弹窗
const infoVisible = ref(false)
const infoRef = ref()
const infoForm = reactive({ name: '', email: '', phone: '' })
const infoRules = {
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  phone: [{ required: true, message: '请输入手机号码', trigger: 'blur' }]
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
  infoRef.value.validate((valid) => {
    if (!valid) return
    Object.assign(profile.value, infoForm)
    infoVisible.value = false
    ElMessage.success('个人信息已更新')
  })
}

// 修改密码弹窗
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
    pwdVisible.value = false
    resetPwd()
    ElMessage.success('密码修改成功')
  })
}

// 安全选项
const security = reactive({
  twoFactor: false,
  loginNotice: false,
  ipWhitelist: false,
  sessionTimeout: 30,
  pwdExpire: 90
})

// 登录日志
const loginLogs = [
  { time: '2026-02-04 09:30:25', ip: '192.168.1.100', location: '北京市朝阳区', device: 'Windows 10', browser: 'Chrome 120.0', status: '成功', reason: '' },
  { time: '2026-02-03 08:45:10', ip: '192.168.1.100', location: '北京市朝阳区', device: 'Windows 10', browser: 'Chrome 120.0', status: '成功', reason: '' },
  { time: '2026-02-02 14:20:33', ip: '192.168.1.105', location: '北京市海淀区', device: 'MacOS', browser: 'Safari 17.0', status: '成功', reason: '' },
  { time: '2026-02-02 03:15:22', ip: '103.45.67.89', location: '上海市浦东新区', device: 'Android', browser: 'Chrome Mobile', status: '失败', reason: '密码错误' },
  { time: '2026-02-01 16:55:18', ip: '192.168.1.100', location: '北京市朝阳区', device: 'Windows 10', browser: 'Chrome 120.0', status: '成功', reason: '' }
]

// 操作日志
const opLogs = [
  { time: '2026-02-04 10:30:15', module: '员工管理', type: '添加员工', desc: '添加新员工：李四（客服）', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-04 10:15:30', module: '排班管理', type: '修改排班', desc: '修改张小美的排班（2026-02-05）', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-04 09:45:22', module: '医生审核', type: '审核通过', desc: '审核通过医生：王医生', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-03 16:20:10', module: 'Banner管理', type: '删除Banner', desc: '删除Banner：春节活动', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-03 15:30:45', module: '公告管理', type: '发布公告', desc: '发布新公告：系统维护通知', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-03 14:10:33', module: '患者管理', type: '修改信息', desc: '修改患者信息：P10086', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-02 11:25:18', module: '账户设置', type: '修改密码', desc: '修改登录密码', ip: '192.168.1.100', status: '成功' },
  { time: '2026-02-02 10:50:05', module: 'QA管理', type: '添加问答', desc: '添加新问答：孕期营养', ip: '192.168.1.100', status: '成功' }
]
const { page: acLoginPage, pageSize: acLoginSize, pagedData: pagedLoginLogs, total: acLoginTotal } = useTablePage(loginLogs)
const { page: acOpPage, pageSize: acOpSize, pagedData: pagedOpLogs, total: acOpTotal } = useTablePage(opLogs)
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
            <span class="ov-value">{{ profile.name }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">用户名</span>
            <span class="ov-value">{{ profile.username }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">员工编号</span>
            <span class="ov-value">{{ profile.empNo }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">角色</span>
            <el-tag type="primary" effect="dark" round size="small">{{ profile.role }}</el-tag>
          </div>
          <div class="ov-item">
            <span class="ov-label">部门</span>
            <span class="ov-value">{{ profile.dept }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">职位</span>
            <span class="ov-value">{{ profile.position }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">邮箱</span>
            <span class="ov-value icon-text"><el-icon><Message /></el-icon>{{ profile.email }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">手机号</span>
            <span class="ov-value icon-text"><el-icon><Phone /></el-icon>{{ profile.phone }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">入职日期</span>
            <span class="ov-value">{{ profile.hireDate }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">最后登录时间</span>
            <span class="ov-value">{{ profile.lastLogin }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">最后登录IP</span>
            <span class="ov-value">{{ profile.lastIp }}</span>
          </div>
          <div class="ov-item">
            <span class="ov-label">账户状态</span>
            <el-tag type="success" effect="dark" round size="small">{{ profile.status }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="seg-tabs">
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
              <div class="read-box">{{ profile.name }}</div>
            </div>
            <div class="info-field">
              <label>手机号码</label>
              <div class="read-box icon-text"><el-icon><Phone /></el-icon>{{ profile.phone }}</div>
            </div>
            <div class="info-field">
              <label>用户名</label>
              <div class="read-box">{{ profile.username }}</div>
            </div>
            <div class="info-field">
              <label>员工编号</label>
              <div class="read-box">{{ profile.empNo }}</div>
            </div>
            <div class="info-field">
              <label>邮箱地址</label>
              <div class="read-box icon-text"><el-icon><Message /></el-icon>{{ profile.email }}</div>
            </div>
            <div class="info-field">
              <label>入职日期</label>
              <div class="read-box">{{ profile.hireDate }}</div>
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
              <li>密码长度至少 8 位</li>
              <li>包含大小写字母、数字和特殊字符</li>
              <li>不要使用生日、手机号等易猜信息</li>
              <li>定期更换密码</li>
              <li>不要在多个平台使用相同密码</li>
            </ul>
          </el-alert>
          <div class="last-pwd">
            <div>
              <strong>上次修改密码</strong>
              <p>2026-02-02 11:25:18</p>
            </div>
            <el-tag type="info" round>30天前</el-tag>
          </div>
        </div>

        <div class="panel content-panel">
          <div class="section-head">
            <div>
              <h3>安全选项</h3>
              <p class="panel-sub">配置账户安全防护</p>
            </div>
          </div>
          <div class="security-list">
            <div class="security-item">
              <span class="sec-icon blue"><el-icon><Key /></el-icon></span>
              <div class="sec-text">
                <strong>双因素认证</strong>
                <p>登录时需要输入手机验证码，提升账户安全</p>
              </div>
              <el-switch v-model="security.twoFactor" />
            </div>
            <div class="security-item">
              <span class="sec-icon green"><el-icon><MessageChecked /></el-icon></span>
              <div class="sec-text">
                <strong>登录通知</strong>
                <p>账户登录时发送邮件通知，及时发现异常登录</p>
              </div>
              <el-switch v-model="security.loginNotice" />
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
                <span>分钟</span>
              </div>
            </div>
            <div class="security-item input-item">
              <span class="sec-icon red"><el-icon><Lock /></el-icon></span>
              <div class="sec-text">
                <strong>密码有效期</strong>
                <p>密码到期后需要强制修改</p>
              </div>
              <div class="suffix-input">
                <el-input-number v-model="security.pwdExpire" :min="30" :max="365" />
                <span>天</span>
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
          <el-table :data="pagedLoginLogs" stripe>
            <el-table-column label="登录时间" prop="time" min-width="170" />
            <el-table-column label="IP地址" min-width="140">
              <template #default="{ row }">
                <span class="icon-text"><el-icon><LocationInformation /></el-icon>{{ row.ip }}</span>
              </template>
            </el-table-column>
            <el-table-column label="登录地点" prop="location" min-width="130" />
            <el-table-column label="设备" min-width="120">
              <template #default="{ row }">
                <span class="icon-text"><el-icon><Monitor /></el-icon>{{ row.device }}</span>
              </template>
            </el-table-column>
            <el-table-column label="浏览器" prop="browser" min-width="130" />
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
        v-model:current-page="acLoginPage"
        v-model:page-size="acLoginSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="acLoginTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="acLoginPage = 1"
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
          <el-table :data="pagedOpLogs" stripe>
            <el-table-column label="操作时间" prop="time" min-width="170" />
            <el-table-column label="操作模块" min-width="110">
              <template #default="{ row }">
                <el-tag round size="small" class="module-tag">{{ row.module }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作类型" prop="type" min-width="100" />
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
        v-model:current-page="acOpPage"
        v-model:page-size="acOpSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="acOpTotal"
        layout="total, prev, pager, next, sizes"
        @size-change="acOpPage = 1"
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
          <el-input v-model="infoForm.name" size="large" />
        </el-form-item>
        <el-form-item label="邮箱地址" prop="email">
          <el-input v-model="infoForm.email" size="large" />
        </el-form-item>
        <el-form-item label="手机号码" prop="phone">
          <el-input v-model="infoForm.phone" size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="infoVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="saveInfo">保存修改</el-button>
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
          <el-input v-model="pwdForm.oldPwd" type="password" size="large" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPwd">
          <el-input v-model="pwdForm.newPwd" type="password" size="large" show-password placeholder="请输入新密码" />
          <span class="form-hint">密码长度至少8位，建议包含大小写字母、数字和特殊字符</span>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" type="password" size="large" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" size="large" @click="savePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.account-page {
  --el-color-primary: #2563eb;
  color: #1f2937;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(31, 45, 80, 0.05);
}

.panel h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.panel-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

/* 账户概览 */
.overview-panel {
  margin-top: 22px;
  padding: 22px 24px;
}

.overview-body {
  display: flex;
  gap: 32px;
  margin-top: 18px;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a9ba8 0%, #5f7481 55%, #3d4f5a 100%);
  color: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.overview-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px 24px;
}

.ov-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ov-label {
  font-size: 12px;
  color: #9ca3af;
}

.ov-value {
  font-size: 14px;
  font-weight: 600;
}

.icon-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.icon-text .el-icon {
  color: #9ca3af;
  font-size: 14px;
}

/* 分段标签页（截图：灰底胶囊，选中白底黑字） */
.seg-tabs {
  margin-top: 22px;
}

.seg-tabs :deep(.el-tabs__header) {
  margin: 0 0 18px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.content-panel {
  padding: 22px 24px;
}

.content-panel + .content-panel {
  margin-top: 18px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.btn-blue {
  font-weight: 600;
}

/* 个人信息只读表单 */
.info-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 28px;
}

.info-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.read-box {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f5f6f8;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.read-box.icon-text .el-icon {
  color: #9ca3af;
}

/* 密码管理 */
.pwd-tip {
  border-radius: 10px;
}

.tip-list {
  margin: 6px 0 0;
  padding-left: 18px;
  line-height: 1.9;
}

.last-pwd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding: 14px 18px;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.last-pwd strong {
  font-size: 14px;
}

.last-pwd p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

/* 安全选项 */
.security-list {
  display: flex;
  flex-direction: column;
}

.security-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 4px;
  border-bottom: 1px solid #f1f3f7;
}

.security-item:last-child {
  border-bottom: none;
}

.sec-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.sec-icon.blue { background: #eff6ff; color: #2563eb; }
.sec-icon.green { background: #ecfdf5; color: #16a34a; }
.sec-icon.purple { background: #f5f3ff; color: #9333ea; }
.sec-icon.orange { background: #fff7ed; color: #ea580c; }
.sec-icon.red { background: #fef2f2; color: #dc2626; }

.sec-text {
  flex: 1;
}

.sec-text strong {
  font-size: 14px;
}

.sec-text p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.suffix-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

/* 表格（截图：白底表头、无斑马纹） */
:deep(.el-table) {
  --el-table-header-bg-color: #fff;
  --el-table-header-text-color: #1f2937;
  --el-table-border-color: #f1f3f7;
  --el-table-row-hover-bg-color: #fafbfc;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 700;
  background: #fff;
}

:deep(.el-table .el-table__row--striped td.el-table__cell) {
  background: #fff;
}

.module-tag {
  background: #f5f6f8;
  border-color: #f5f6f8;
  color: #4b5563;
}

.fail-reason {
  margin-top: 2px;
  font-size: 12px;
  color: #dc2626;
}

/* 弹窗 */
.dialog-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.dialog-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}

@media (max-width: 992px) {
  .overview-grid,
  .info-form {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .overview-body {
    flex-direction: column;
    align-items: center;
  }

  .overview-grid,
  .info-form {
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>

<style>
/* 弹窗 teleport 至 body，需用全局样式 */
.el-dialog.account-dialog {
  --el-color-primary: #2563eb;
  border-radius: 16px;
  overflow: hidden;
}

/* 弹窗输入框：截图为灰底填充 */
.el-dialog.account-dialog .el-input__wrapper,
.el-dialog.account-dialog .el-textarea__inner {
  background: #f5f6f8;
  border-radius: 9px;
  box-shadow: none;
}

.el-dialog.account-dialog .el-input__wrapper.is-focus,
.el-dialog.account-dialog .el-textarea__inner:focus {
  background: #fff;
  box-shadow: 0 0 0 1px #2563eb;
}

</style>