import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElMessage } from 'element-plus'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { setBusinessErrorHandler } from './api/frontApikit.js'
import vCan from './directives/can.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.directive('can', vCan)

// 统一异常提示：401/402 已在封装层静默处理（刷新/跳登录），这里只提示其余业务与网络异常
let lastToast = { key: '', time: 0 }
setBusinessErrorHandler((error) => {
  const code = error?.code
  if (code === 401 || code === 402) return
  const now = Date.now()
  const key = `${code}|${error?.message || ''}`
  if (lastToast.key === key && now - lastToast.time < 1500) return
  lastToast = { key, time: now }
  const type = code === 403 ? 'warning' : 'error'
  ElMessage({ type, message: error?.message || '请求失败，请稍后重试', grouping: true })
})

app.mount('#app')
