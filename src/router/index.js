import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'
import DictView from '../views/dict/index.vue'
import HospitalView from '../views/hospital/index.vue'
import DepartmentView from '../views/department/index.vue'
import HospitalAreaView from '../views/hospitalArea/index.vue'
import UserView from '../views/user/index.vue'
import HealthRecordView from '../views/user/healthRecord.vue'
import DoctorManageView from '../views/doctorManage/index.vue'
import DoctorAuditView from '../views/doctorAudit/index.vue'
import StaffManageView from '../views/staffManage/index.vue'
import ScheduleManageView from '../views/scheduleManage/index.vue'
import NurseServiceManageView from '../views/nurseServiceManage/index.vue'
import AiKnowledgeView from '../views/aiKnowledge/index.vue'
import AccountManageView from '../views/accountManage/index.vue'
import ServicePackageView from '../views/servicePackage/index.vue'
import TemplateManageView from '../views/templateManage/index.vue'
import AnnounceManageView from '../views/announceManage/index.vue'
import BannerManageView from '../views/bannerManage/index.vue'
import NoticeDocManageView from '../views/noticeDocManage/index.vue'
import EscortOrderManageView from '../views/escortOrderManage/index.vue'
import CareOrderManageView from '../views/careOrderManage/index.vue'
import PackageOrderManageView from '../views/packageOrderManage/index.vue'
import EscortServiceManageView from '../views/escortServiceManage/index.vue'
import MiniProgramManageView from '../views/miniProgramManage/index.vue'
import OrderManageOverviewView from '../views/orderManageOverview/index.vue'
import HealthConsultManageView from '../views/healthConsultManage/index.vue'
import ServiceChatManageView from '../views/serviceChatManage/index.vue'
import ServicePushManageView from '../views/servicePushManage/index.vue'
import HospitalDashboardView from '../views/hospitalManage/dashboard.vue'
import DataOverviewView from '../views/bigScreen/dataOverview.vue'
import { useAuthStore, getHomePath } from '../stores/auth'

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
          title: '数据概览',
          icon: 'DataLine',
          group: '数据统计',
          groupIcon: 'DataAnalysis',
          roles: ['admin', 'doctor']
        }
      },
      {
        path: '/dataOverview',
        name: 'dataOverview',
        component: DataOverviewView,
        meta: {
          title: '数据概览',
          icon: 'DataBoard',
          group: '数据统计',
          groupIcon: 'DataAnalysis',
          roles: ['admin']
        }
      },
      {
        path: '/hospitalManage/dashboard',
        name: 'hospitalDashboard',
        component: HospitalDashboardView,
        meta: {
          title: '可视化看板',
          icon: 'DataLine',
          group: '医院管理',
          groupIcon: 'OfficeBuilding',
          roles: ['hospital']
        }
      },
      {
        path: '/hospitalManage/users',
        name: 'hospitalUsers',
        component: UserView,
        meta: {
          title: '用户管理',
          icon: 'User',
          group: '医院管理',
          groupIcon: 'OfficeBuilding',
          roles: ['hospital']
        }
      },
      {
        path: '/hospitalManage/healthConsult',
        name: 'hospitalHealthConsult',
        component: HealthConsultManageView,
        meta: {
          title: '健康咨询',
          icon: 'ChatDotRound',
          group: '医院管理',
          groupIcon: 'OfficeBuilding',
          roles: ['hospital']
        }
      },
      {
        path: '/orderManageOverview',
        name: 'orderManageOverview',
        component: OrderManageOverviewView,
        meta: {
          title: '订单总览',
          icon: 'ShoppingCart',
          group: '订单管理',
          groupIcon: 'ShoppingCart',
          roles: ['admin', 'doctor']
        }
      },
      {
        path: '/packageOrderManage',
        name: 'packageOrders',
        component: PackageOrderManageView,
        meta: {
          title: '服务包订单管理',
          icon: 'Tickets',
          group: '订单管理',
          groupIcon: 'ShoppingCart',
          roles: ['admin', 'doctor']
        }
      },
      {
        path: '/escortOrderManage',
        name: 'escortOrderManage',
        component: EscortOrderManageView,
        meta: {
          title: '陪诊服务订单管理',
          icon: 'Document',
          group: '订单管理',
          groupIcon: 'ShoppingCart',
          roles: ['admin']
        }
      },
      {
        path: '/careOrderManage',
        name: 'careOrderManage',
        component: CareOrderManageView,
        meta: {
          title: '健康照护师订单管理',
          icon: 'Document',
          group: '订单管理',
          groupIcon: 'ShoppingCart',
          roles: ['admin']
        }
      },
      {
        path: '/dictionaries',
        name: 'dictionaries',
        component: DictView,
        meta: {
          title: '字典维护',
          icon: 'Collection',
          group: '系统管理',
          groupIcon: 'Setting',
          roles: ['admin']
        }
      },
      {
        path: '/hospitalArea',
        name: 'hospitalArea',
        component: HospitalAreaView,
        meta: {
          title: '院区管理',
          icon: 'School',
          group: '系统管理',
          groupIcon: 'Setting',
          roles: ['admin']
        }
      },
      {
        path: '/hospital',
        name: 'hospital',
        component: HospitalView,
        meta: {
          title: '医院管理',
          icon: 'OfficeBuilding',
          group: '系统管理',
          groupIcon: 'Setting',
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
          group: '系统管理',
          groupIcon: 'Setting',
          roles: ['admin']
        }
      },
      {
        path: '/aiKnowledge',
        name: 'aiKnowledge',
        component: AiKnowledgeView,
        meta: {
          title: 'AI智能诊断回复知识库',
          icon: 'MagicStick',
          
          groupIcon: 'Setting',
          roles: ['admin']
        }
      },
      
      {
        path: '/miniProgramManage',
        name: 'miniProgramManage',
        component: MiniProgramManageView,
        meta: {
          title: '小程序管理',
          icon: 'Menu',
          group: '小程序管理',
          groupIcon: 'Menu',
          roles: ['admin']
        }
      },
      {
        path: '/healthConsultManage',
        name: 'healthConsultManage',
        component: HealthConsultManageView,
        meta: {
          title: '健康咨询',
          icon: 'ChatDotRound',
          roles: ['admin', 'doctor']
        }
      },
      {
        path: '/serviceChatManage',
        name: 'serviceChatManage',
        component: ServiceChatManageView,
        meta: {
          title: '聊天管理',
          icon: 'ChatDotRound',
          group: '客服',
          groupIcon: 'Service',
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
          title: '推送管理',
          icon: 'Bell',
          group: '客服',
          groupIcon: 'Service',
          roles: ['service']
        }
      },
      {
        path: '/servicePackage',
        name: 'servicePackage',
        component: ServicePackageView,
        meta: {
          title: '服务包管理',
          icon: 'Goods',
          group: '小程序管理',
          groupIcon: 'Menu',
          roles: ['admin']
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
          groupIcon: 'Menu',
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
          groupIcon: 'Menu',
          roles: ['admin']
        }
      },
      {
        path: '/bannerManage',
        name: 'bannerManage',
        component: BannerManageView,
        meta: {
          title: '宣称设置',
          icon: 'Picture',
          group: '小程序管理',
          groupIcon: 'Menu',
          roles: ['admin']
        }
      },
      {
        path: '/noticeDocManage',
        name: 'noticeDocManage',
        component: NoticeDocManageView,
        meta: {
          title: '告知书管理',
          icon: 'Tickets',
          group: '小程序管理',
          groupIcon: 'Menu',
          roles: ['admin']
        }
      },
      {
        path: '/user',
        name: 'user',
        component: UserView,
        meta: {
          title: '患者管理',
          icon: 'User',
          group: '用户管理',
          groupIcon: 'User',
          roles: ['admin']
        }
      },
      {
        path: '/user/healthRecord',
        name: 'userHealthRecord',
        component: HealthRecordView,
        meta: {
          title: '患者健康档案',
          group: '用户管理',
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
          group: '用户管理',
          groupIcon: 'User',
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
          group: '用户管理',
          groupIcon: 'User',
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
          group: '用户管理',
          groupIcon: 'User',
          roles: ['admin']
        }
      },
      {
        path: '/scheduleManage',
        name: 'scheduleManage',
        component: ScheduleManageView,
        meta: {
          title: '客服排班管理',
          icon: 'Calendar',
          group: '用户管理',
          groupIcon: 'User',
          roles: ['admin']
        }
      },
      {
        path: '/nurseServiceManage',
        name: 'nurseServiceManage',
        component: NurseServiceManageView,
        meta: {
          title: '健康照护师服务管理',
          icon: 'Service',
          group: '用户管理',
          groupIcon: 'User',
          roles: ['admin']
        }
      },
      {
        path: '/escortServiceManage',
        name: 'escortServiceManage',
        component: EscortServiceManageView,
        meta: {
          title: '陪诊服务管理',
          icon: 'Guide',
          group: '用户管理',
          groupIcon: 'User',
          roles: ['admin']
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
          roles: ['admin', 'doctor', 'hospital']
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

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    return auth.isLoggedIn ? { path: getHomePath(auth.role) } : true
  }

  if (!auth.isLoggedIn) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  if (to.meta.roles && !auth.hasRole(to.meta.roles)) {
    return auth.role === 'service' || auth.role === 'hospital'
      ? { path: getHomePath(auth.role) }
      : { path: '/403' }
  }

  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '后台管理'} - 卫君后台管理系统`
})

export default router
