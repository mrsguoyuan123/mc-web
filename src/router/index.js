import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import DashboardView from '../views/dashboard/index.vue'
import LoginView from '../views/LoginView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'
import DictView from '../views/dict/index.vue'
import HospitalView from '../views/hospital/index.vue'
import DepartmentView from '../views/department/index.vue'
import HospitalAreaView from '../views/hospitalArea/index.vue'
import UserView from '../views/user/index.vue'
import HealthRecordView from '../views/user/healthRecord.vue'
import UserManagementView from '../views/userManagement/index.vue'
import UserManagementDetailView from '../views/userManagementDetail/index.vue'
import DoctorManageView from '../views/doctorManage/index.vue'
import DoctorAuditView from '../views/doctorAudit/index.vue'
import StaffManageView from '../views/staffManage/index.vue'
import ScheduleManageView from '../views/scheduleManage/index.vue'
import NurseServiceManageView from '../views/nurseServiceManage/index.vue'
import AiKnowledgeView from '../views/aiKnowledge/index.vue'
import AccountManageView from '../views/accountManage/index.vue'
import RoleManageView from '../views/roleManagement/index.vue'
import ServicePackageView from '../views/servicePackage/index.vue'
import TemplateManageView from '../views/templateManage/index.vue'
import AnnounceManageView from '../views/announceManage/index.vue'
import BannerManageView from '../views/bannerManage/index.vue'
import NoticeDocManageView from '../views/noticeDocManage/index.vue'
import UserMessageNoticeView from '../views/userMessageNotice/index.vue'
import EscortOrderManageView from '../views/escortOrderManage/index.vue'
import CareOrderManageView from '../views/careOrderManage/index.vue'
import PackageOrderManageView from '../views/packageOrderManage/index.vue'
import EscortServiceManageView from '../views/escortServiceManage/index.vue'
import MiniProgramManageView from '../views/miniProgramManage/index.vue'
import OrderManageOverviewView from '../views/orderManageOverview/index.vue'
import HealthConsultManageView from '../views/healthConsultManage/index.vue'
import ServiceChatManageView from '../views/serviceChatManage/index.vue'
import ServicePushManageView from '../views/servicePushManage/index.vue'
import HospitalDashboardView from '../views/dashboardManagement/HospitalDashboard.vue'
import DepartmentDashboardView from '../views/dashboardManagement/DepartmentDashboard.vue'
import DataOverviewView from '../views/bigScreen/dataOverview.vue'
import csManage from '../views/csManage/index.vue'
import stationManage from '../views/stationManage/index.vue'
import StationWorkbenchView from '../views/stationWorkbench/index.vue'
import doctorAdd from '../views/doctorAdd/doctorCreate.vue'



import { useAuthStore, getHomePath } from '../stores/auth'
import { tokenStore } from '../api/frontApikit.js'

export const placeholderRoutes = []

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      public: true,
      title: '登录'
    }
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: () => getHomePath(useAuthStore().role),
    children: [
      {
        path: '/dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: {
          title: '数据看板',
          icon: 'DataLine',
          groupIcon: 'DataAnalysis',
          roles: ['admin', 'doctor']
        }
      },
      {
        path: '/hospitalManage/dashboard',
        name: 'hospitalDashboard',
        component: HospitalDashboardView,
        meta: {
          title: '医院效能看板',
          icon: 'DataLine',
          roles: ['hospital']
        }
      },
      {
        // 科室效能看板：科室管理角色默认首页（getHomePath 指向此路由）
        path: '/hospitalManage/departmentDashboard',
        name: 'departmentDashboard',
        component: DepartmentDashboardView,
        meta: {
          title: '科室效能看板',
          icon: 'DataLine',
          roles: ['department']
        }
      },
      // {
      //   path: '/hospitalManage/users',
      //   name: 'hospitalUsers',
      //   component: UserView,
      //   meta: {
      //     title: '人员管理',
      //     icon: 'User',
      //     group: '医院管理',
      //     groupIcon: 'OfficeBuilding',
      //     roles: ['hospital']
      //   }
      // },
      // {
      //   path: '/hospitalManage/healthConsult',
      //   name: 'hospitalHealthConsult',
      //   component: HealthConsultManageView,
      //   meta: {
      //     title: '健康咨询',
      //     icon: 'ChatDotRound',
      //     group: '医院管理',
      //     groupIcon: 'OfficeBuilding',
      //     roles: ['hospital']
      //   }
      // },
      // {
      //   path: '/orderManageOverview',
      //   name: 'orderManageOverview',
      //   component: OrderManageOverviewView,
      //   meta: {
      //     title: '订单总览',
      //     icon: 'ShoppingCart',
      //     group: '订单管理',
      //     groupIcon: 'ShoppingCart',
      //     roles: ['admin', 'doctor']
      //   }
      // },
      // {
      //   path: '/packageOrderManage',
      //   name: 'packageOrders',
      //   component: PackageOrderManageView,
      //   meta: {
      //     title: '服务包订单管理',
      //     icon: 'Tickets',
      //     group: '订单管理',
      //     groupIcon: 'ShoppingCart',
      //     roles: ['admin', 'doctor']
      //   }
      // },
      // {
      //   path: '/escortOrderManage',
      //   name: 'escortOrderManage',
      //   component: EscortOrderManageView,
      //   meta: {
      //     title: '陪诊服务订单管理',
      //     icon: 'Document',
      //     group: '订单管理',
      //     groupIcon: 'ShoppingCart',
      //     roles: ['admin']
      //   }
      // },
      // {
      //   path: '/careOrderManage',
      //   name: 'careOrderManage',
      //   component: CareOrderManageView,
      //   meta: {
      //     title: '健康照护师订单管理',
      //     icon: 'Document',
      //     group: '订单管理',
      //     groupIcon: 'ShoppingCart',
      //     roles: ['admin']
      //   }
      // },
      // {
      //   path: '/dictionaries',
      //   name: 'dictionaries',
      //   component: DictView,
      //   meta: {
      //     title: '字典维护',
      //     icon: 'Collection',
      //     group: '机构管理',
      //     groupIcon: 'Setting',
      //     roles: ['admin']
      //   }
      // },
      // {
      //   path: '/hospitalArea',
      //   name: 'hospitalArea',
      //   component: HospitalAreaView,
      //   meta: {
      //     title: '院区管理',
      //     icon: 'School',
      //     group: '机构管理',
      //     groupIcon: 'Setting',
      //     roles: ['admin']
      //   }
      // },
      {
        path: '/hospital',
        name: 'hospital',
        component: HospitalView,
        meta: {
          title: '医院管理',
          icon: 'OfficeBuilding',
          group: '机构管理',
          groupIcon: 'Coin',
          roles: ['admin']
        }
      },
      {
        path: '/department',
        name: 'department',
        component: DepartmentView,
        meta: {
          title: '科室管理',
          icon: 'Grid',
          group: '机构管理',
          groupIcon: 'Coin',
          roles: ['admin']
        }
      },
      {
        path: '/aiKnowledge',
        name: 'aiKnowledge',
        component: AiKnowledgeView,
        meta: {
          title: '智能客服知识库',
          icon: 'Connection',
          roles: ['admin']
        }
      },
      
      // {
      //   path: '/miniProgramManage',
      //   name: 'miniProgramManage',
      //   component: MiniProgramManageView,
      //   meta: {
      //     title: '小程序管理',
      //     icon: 'Menu',
      //     group: '小程序管理',
      //     groupIcon: 'Menu',
      //     roles: ['admin']
      //   }
      // },
      // {
      //   path: '/healthConsultManage',
      //   name: 'healthConsultManage',
      //   component: HealthConsultManageView,
      //   meta: {
      //     title: '健康咨询',
      //     icon: 'ChatDotRound',
      //     roles: ['admin', 'doctor']
      //   }
      // },
      {
        path: '/serviceChatManage',
        name: 'serviceChatManage',
        component: ServiceChatManageView,
        meta: {
          title: '客服工作台',
          icon: 'ChatDotRound',
         
          roles: ['service'],
          servicePage: true,
          description: '接待用户咨询，查看智能客服和人工客服的沟通记录'
        }
      },
      {
        path: '/servicePushManage',
        name: 'servicePushManage',
        component: ServicePushManageView,
        meta: {
          title: '专业咨询/医生留言',
          icon: 'Bell',
      
          roles: ['service']
        }
      },
      // {
      //   path: '/servicePackage',
      //   name: 'servicePackage',
      //   component: ServicePackageView,
      //   meta: {
      //     title: '服务包管理',
      //     icon: 'Goods',
      //     group: '小程序管理',
      //     groupIcon: 'Menu',
      //     roles: ['admin']
      //   }
      // },
      {
        path: '/userManagement',
        name: 'userManagement',
        component: UserManagementView,
        meta: {
          title: '用户管理仓',
          icon: 'User',
        
          roles: ['admin', 'hospital', 'department','station','service']
        }
      },
      {
        // 用户详情页：URL 通过 query.id 携带患者 id，如 /userManagementDetail?id=123
        path: '/userManagementDetail',
        name: 'userManagementDetail',
        component: UserManagementDetailView,
        meta: {
          title: '用户详情',
          hidden: true,
          roles: ['admin', 'hospital', 'department']
        }
      },
      {
        path: '/templateManage',
        name: 'templateManage',
        component: TemplateManageView,
        meta: {
          title: '模板管理',
          icon: 'Files',
          group: '小程序管理',
          groupIcon: 'Document',
          roles: ['admin']
        }
      },
      {
        path: '/announceManage',
        name: 'announceManage',
        component: AnnounceManageView,
        meta: {
          title: '资讯管理',
          icon: 'BellFilled',
          group: '小程序管理',
          groupIcon: 'Document',
          roles: ['admin']
        }
      },
      {
        path: '/bannerManage',
        name: 'bannerManage',
        component: BannerManageView,
        meta: {
          title: '宣教内容',
          icon: 'Picture',
          group: '小程序管理',
          groupIcon: 'Document',
          roles: ['admin']
        }
      },
      {
        path: '/noticeDocManage',
        name: 'noticeDocManage',
        component: NoticeDocManageView,
        meta: {
          title: '小程序告知书',
          icon: 'Tickets',
          group: '小程序管理',
          groupIcon: 'Document',
          roles: ['admin']
        }
      },
      {
        path: '/userMessageNotice',
        name: 'userMessageNotice',
        component: UserMessageNoticeView,
        meta: {
          title: '用户消息通知',
          icon: 'Bell',
          group: '小程序管理',
          groupIcon: 'Document',
          roles: ['admin']
        }
      },
      // {
      //   path: '/user',
      //   name: 'user',
      //   component: UserView,
      //   meta: {
      //     title: '患者管理',
      //     icon: 'User',
      //     group: '人员管理',
      //     groupIcon: 'User',
      //     roles: ['admin']
      //   }
      // },
      {
        path: '/user/healthRecord',
        name: 'userHealthRecord',
        component: HealthRecordView,
        meta: {
          title: '患者健康档案',
          group: '人员管理',
          hidden: true,
          roles: ['admin']
        }
      },
      {
        path: '/doctorManage',
        name: 'doctorManage',
        component: DoctorManageView,
        meta: {
          title: '医生管理',
          icon: 'FirstAidKit',
          group: '医生管理仓',
          groupIcon: 'Stethoscope',
          roles: ['admin']
        }
      },
      {
        path: '/doctorAudit',
        name: 'doctorAudit',
        component: DoctorAuditView,
        meta: {
          title: '医生注册审核',
          icon: 'CircleCheck',
          group: '医生管理仓',
          groupIcon: 'Stethoscope',
          roles: ['admin']
        }
      },
      {
        path: '/staffManage',
        name: 'staffManage',
        component: StaffManageView,
        meta: {
          title: '员工管理',
          icon: 'Avatar',
          group: '人员管理',
          groupIcon: 'UserFilled',
          roles: ['admin']
        }
      },
      {
        path: '/roleManagement',
        name: 'roleManagement',
        component: RoleManageView,
        meta: {
          title: '角色管理',
          icon: 'UserFilled',
          group: '人员管理',
          groupIcon: 'UserFilled',
          roles: ['admin']
        }
      },
      // {
      //   path: '/scheduleManage',
      //   name: 'scheduleManage',
      //   component: ScheduleManageView,
      //   meta: {
      //     title: '客服排班管理',
      //     icon: 'Calendar',
      //     group: '人员管理',
      //     groupIcon: 'User',
      //     roles: ['admin']
      //   }
      // },
      // {
      //   path: '/nurseServiceManage',
      //   name: 'nurseServiceManage',
      //   component: NurseServiceManageView,
      //   meta: {
      //     title: '健康照护师服务管理',
      //     icon: 'Service',
      //     group: '人员管理',
      //     groupIcon: 'User',
      //     roles: ['admin']
      //   }
      // },
      {
        path: '/escortServiceManage',
        name: 'escortServiceManage',
        component: EscortServiceManageView,
        meta: {
          title: '陪诊服务管理',
          icon: 'Guide',
          group: '人员管理',
          groupIcon: 'User',
          hidden: true,
          roles: ['admin']
        }
      },
      {
        path: '/csManage',
        name: 'csManage',
        component: csManage,
        meta: {
          title: '客服管理',
          icon: 'Service',
          group: '服务运营',
          groupIcon: 'Briefcase',
          roles: ['admin']
        }
      },
      {
        path: '/stationManage',
        name: 'stationManage',
        component: stationManage,
        meta: {
          title: '驻点管理',
          icon: 'Coin',
          group: '服务运营',
          groupIcon: 'Briefcase',
          roles: ['admin']
        }
      },
      {
        path: '/station/workbench',
        name: 'stationWorkbench',
        component: StationWorkbenchView,
        meta: {
          title: '驻点工作台',
          icon: 'ChatDotRound',
          roles: ['station']
        }
      },
      {
        // 驻点角色页面：业务功能待开发，先使用 PlaceholderView 占位
        path: '/station/doctorAdd',
        name: 'stationDoctorAdd',
        component: doctorAdd,
        meta: {
          title: '医生角色添加',
          icon: 'UserFilled',
          roles: ['station']
        }
      },
      {
        path: '/accountManage',
        name: 'accountManage',
        component: AccountManageView,
        meta: {
          title: '账户系统管理',
          icon: 'Setting',
          groupIcon: 'Setting',
          roles: ['admin']
        }
      },
     
      ...placeholderRoutes.map((item) => ({
        path: item.path,
        name: item.path.slice(1),
        component: PlaceholderView,
        meta: item
      })),
      {
        path: '/403',
        name: 'forbidden',
        component: PlaceholderView,
        meta: {
          title: '无权限访问',
          hidden: true,
          roles: ['admin', 'doctor', 'hospital', 'department', 'station']
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => getHomePath(useAuthStore().role)
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 公开页（登录页）：已登录回首页，否则放行
  if (to.meta.public) {
    return auth.isLoggedIn ? { path: getHomePath(auth.role) } : true
  }

  // 无本地 access token：直接跳登录并带回跳地址
  if (!tokenStore.getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 刷新页面后首次进入：GET /auth/me 恢复会话与权限；失败（含 402）清凭证跳登录
  if (!auth.sessionRestored) {
    const ok = await auth.restore()
    if (!ok) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  // 权限码控制（新规范，菜单/按钮/路由统一 can()，禁止硬编码 role）
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { path: '/403' }
  }

  // 兼容历史 meta.roles
  if (to.meta.roles && !auth.hasRole(to.meta.roles)) {
    // 兜底防死循环：/403 自身仍无权访问时终止导航，避免 /403 -> /403 无限重定向
    if (to.path === '/403') return false
    const homeRoleCodes = ['service', 'hospital', 'department', 'station']
    // 通过 hasRole 走别名映射，兼容 pc_station / pc_customer_service 等真实角色码
    return auth.hasRole(homeRoleCodes)
      ? { path: getHomePath(auth.role) }
      : { path: '/403' }
  }

  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '后台管理'} - 卫君后台管理系统`
})

export default router
