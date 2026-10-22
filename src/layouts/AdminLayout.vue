<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, roleProfiles, getHomePath } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const adminRoute = router.options.routes.find((item) => item.path === '/')

const menuOrder = [
  // 医院管理
  '/hospitalManage/dashboard',
  '/hospitalManage/users',
  '/hospitalManage/healthConsult',
  // 客服
  '/serviceChatManage',
  '/servicePushManage',
  // 数据统计
  '/dashboard',
  '/dataOverview',
  // 系统管理
  '/dictionaries',
  '/hospital',
  '/hospitalArea',
  '/department',
  // 用户管理
  '/user',
  '/doctorManage',
  '/doctorAudit',
  '/staffManage',
  '/scheduleManage',
  '/nurseServiceManage',
  '/escortServiceManage',
  // 小程序管理
  '/miniProgramManage',
  '/servicePackage',
  '/templateManage',
  '/announceManage',
  '/bannerManage',
  '/noticeDocManage',
  // AI智能诊断
  '/aiKnowledge',
  // 健康咨询
  '/healthConsultManage',
  // 订单管理
  '/orderManageOverview',
  '/packageOrderManage',
  '/careOrderManage',
  '/escortOrderManage',
  // 账户系统
  '/accountManage'
]

const groupParentPaths = ['/doctors']

const visibleRoutes = computed(() =>
  adminRoute.children
    .filter((child) => !child.meta?.hidden && auth.hasRole(child.meta?.roles))
    .sort((a, b) => menuOrder.indexOf(a.path) - menuOrder.indexOf(b.path))
)

const menuItems = computed(() => {
  const groups = new Map()
  const items = []
  visibleRoutes.value.forEach((record) => {
    const meta = record.meta || {}
    if (!meta.group) {
      items.push({ type: 'route', record })
      return
    }
    if (!groups.has(meta.group)) {
      const group = {
        type: 'group',
        title: meta.group,
        icon: meta.groupIcon,
        parentRecord: null,
        children: []
      }
      groups.set(meta.group, group)
      items.push(group)
    }

    if (groupParentPaths.includes(record.path)) {
      groups.get(meta.group).parentRecord = record
    } else {
      groups.get(meta.group).children.push(record)
    }
  })
  return items
})

const activeMenu = computed(() => route.path)
const profile = computed(() => roleProfiles[auth.role] || roleProfiles.admin)
const breadcrumbs = computed(() => {
  const list = [{ title: '首页', path: getHomePath(auth.role) }]

  if (route.meta.group && route.meta.group !== route.meta.title) {
    list.push({ title: route.meta.group })
  }

  if (route.path !== '/dashboard') {
    list.push({ title: route.meta.title || '未知页面' })
  }

  return list
})

const groupTarget = (group) => group.parentRecord?.path || group.children[0]?.path
const isGroupActive = (group) =>
  route.path === group.parentRecord?.path ||
  group.children.some((child) => child.path === route.path)
const defaultOpenedGroups = computed(() =>
  menuItems.value.filter((item) => item.type === 'group').map((item) => item.title)
)

const handleCommand = (command) => {
  if (command === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<template>
  <el-container class="admin-shell">
    <el-aside class="sidebar" :width="collapsed ? '76px' : '248px'">
      <div class="brand">
        <div class="brand-icon"><el-icon><FirstAidKit /></el-icon></div>
        <strong v-show="!collapsed">卫君后台管理系统</strong>
      </div>
      <div v-show="!collapsed" class="role-label">{{ profile.label }}</div>

      <div class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          :collapse-transition="false"
          router
          :default-openeds="defaultOpenedGroups"
          background-color="#ffffff"
          text-color="#475569"
          active-text-color="#2563eb"
        >
          <template v-for="item in menuItems" :key="item.type === 'group' ? item.title : item.record.path">
            <el-menu-item
              v-if="item.type === 'group' && item.children.length === 0"
              :index="item.parentRecord.path"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
            <el-sub-menu
              v-else-if="item.type === 'group'"
              :index="item.title"
              :class="{ 'group-menu-active': isGroupActive(item) }"
            >
              <template #title>
                <router-link
                  v-if="item.parentRecord"
                  :to="groupTarget(item)"
                  class="parent-menu-link"
                  :class="{ 'parent-menu-active': isGroupActive(item) }"
                  @click.stop
                >
                  <el-icon><component :is="item.icon" /></el-icon>
                  <span>{{ item.title }}</span>
                </router-link>
                <template v-else>
                  <el-icon><component :is="item.icon" /></el-icon>
                  <span>{{ item.title }}</span>
                </template>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                <el-icon><component :is="child.meta.icon" /></el-icon>
                <template #title>{{ child.meta.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.record.path">
              <el-icon><component :is="item.record.meta.icon" /></el-icon>
              <template #title>{{ item.record.meta.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </div>

      <div class="logout-bar">
        <el-button text :class="{ 'logout-collapsed': collapsed }" @click="handleCommand('logout')">
          <el-icon><SwitchButton /></el-icon>
          <span v-show="!collapsed">退出登录</span>
        </el-button>
      </div>
    </el-aside>

    <el-container>
      <el-header class="topbar">
        <div class="header-left">
          <el-button text class="collapse-button" @click="collapsed = !collapsed">
            <el-icon size="20">
              <Fold v-if="!collapsed" />
              <Expand v-else />
            </el-icon>
          </el-button>

          <div class="header-heading">
           
            <el-breadcrumb class="top-breadcrumb" separator="/">
              <el-breadcrumb-item
                v-for="(item, index) in breadcrumbs"
                :key="`${item.title}-${index}`"
                :to="item.path ? { path: item.path } : undefined"
              >
                {{ item.title }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
        </div>

        <div class="header-actions">
          <el-badge :value="3" class="notice-badge">
            <el-icon size="20"><Bell /></el-icon>
          </el-badge>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-profile">
              <el-avatar :size="34" class="user-avatar">{{ profile.avatar }}</el-avatar>
              <span class="user-meta">
                
                <el-text class="mx-1" style="font-weight: bold;">{{ auth.user.username  }}</el-text>
                
                <el-text class="mx-1" size="small" type="info">{{ profile.label }}</el-text>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>用户：{{ auth.user.username }}</el-dropdown-item>
                <el-dropdown-item disabled>姓名：{{ profile.name }}</el-dropdown-item>
                <el-dropdown-item disabled>角色：{{ profile.label }}</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-shell {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background: #ffffff;
  color: #475569;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease;
}

.brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  color: #111827;
  flex-shrink: 0;
}

.brand-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #1769ff, #35a4ff);
  color: #fff;
  font-size: 19px;
  flex-shrink: 0;
}

.brand strong {
  font-size: 17px;
  white-space: nowrap;
  font-weight: 700;
}

.role-label {
  color: #1f2937;
  font-size: 15px;
  font-weight: 700;
  padding: 6px 20px 14px;
  flex-shrink: 0;
}

.menu-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.menu-scroll::-webkit-scrollbar {
  width: 6px;
}

.menu-scroll::-webkit-scrollbar-thumb {
  background: #d8dee8;
  border-radius: 3px;
}

.menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.menu-scroll :deep(.el-menu) {
  border-right: none;
}

.menu-scroll :deep(.el-menu--collapse) {
  width: 52px;
}

.menu-scroll :deep(.el-menu-item),
.menu-scroll :deep(.el-sub-menu__title) {
  height: 46px;
  line-height: 46px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.parent-menu-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.parent-menu-active {
  color: #2563eb;
  font-weight: 600;
}

.menu-scroll :deep(.group-menu-active > .el-sub-menu__title) {
  color: #2563eb;
  background: #f5f8ff;
  font-weight: 600;
}

.menu-scroll :deep(.el-menu-item:hover),
.menu-scroll :deep(.el-sub-menu__title:hover) {
  background: #f5f8ff !important;
  color: #2563eb;
}

.menu-scroll :deep(.el-menu-item.is-active) {
  background: #ecf5ff !important;
  color: #2563eb !important;
  font-weight: 600;
}

.menu-scroll :deep(.el-sub-menu .el-menu-item) {
  min-width: auto;
  padding-left: 48px !important;
  background: #ffffff;
  border-radius: 8px;
}

.menu-scroll :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #2563eb;
  background: #f5f8ff;
}

.menu-scroll :deep(.el-sub-menu .el-menu-item.is-active) {
  background: #ecf5ff !important;
}

.logout-bar {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 18px;
  border-top: 1px solid #eef2f7;
  flex-shrink: 0;
}

.logout-bar :deep(.el-button) {
  color: #64748b;
  width: 100%;
  justify-content: flex-start;
}

.logout-bar :deep(.el-button:hover) {
  color: #2563eb;
  background: #f5f8ff;
}

.logout-collapsed {
  justify-content: center !important;
}

.topbar {
  min-height: 64px;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.header-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.header-heading {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.system-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.system-title .el-icon {
  color: #2563eb;
}

.top-breadcrumb {
  line-height: 1;
}

.top-breadcrumb :deep(.el-breadcrumb__item) {
  font-size: 12px;
}

.collapse-button {
  color: #1f2937;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-shrink: 0;
}

.notice-badge {
  color: #1f2937;
  cursor: pointer;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #1f2937;
  padding: 5px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.user-profile:hover {
  background: #f5f7fa;
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  line-height: 1;
}

.user-avatar {
  background: #eef2ff;
  color: #1d4ed8;
  font-weight: 700;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.main-content {
  background: #f5f7fa;
  padding: 24px;
}

@media (max-width: 768px) {
  .topbar {
    padding: 0 14px;
  }

  .main-content {
    padding: 14px;
  }

  .system-title,
  .top-breadcrumb {
    display: none;
  }
}
</style>
