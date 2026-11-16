/**
 * API 统一出口：具名重导出 src/api/modules 下各业务模块的全部接口函数
 *
 * 用法：import { pcLogin, getRoleById, getStaffPage } from '@/api'（按项目路径别名调整，也可用相对路径）
 * 底层封装见 ./frontApikit.js，各模块的路径/参数/返回注释见 ./modules 下对应文件
 */

/* 认证模块（19 个）：PC 两步式登录 / 验证码 / 微信 / 令牌 / 账号日志 */
export {
  pcLogin,
  selectPcRole,
  switchPcRole,
  doctorSmsLogin,
  loginByPassword,
  registerPatient,
  sendSmsCode,
  loginBySms,
  loginByWx,
  refreshToken,
  logout,
  getCurrentUser,
  getDevTokens,
  changePassword,
  getMeSettings,
  updateMeSettings,
  getLoginLogs,
  getOperationLogs,
  updateAccountSecurity
} from './modules/auth.js'

/* 患者端“我的”模块（10 个）：首页聚合 / 告知书 / 个人资料 / 病历 OCR */
export {
  getMyHome,
  getMyHealthManager,
  getMyInformedConsents,
  confirmInformedConsentById,
  getMyProfile,
  updateMyProfile,
  getMyMedicalRecord,
  scanMedicalRecord,
  getMedicalRecordScanResultById,
  confirmMedicalRecord
} from './modules/user.js'

/* 动态角色与权限模块（13 个）：角色 CRUD / 复制启停 / 权限树 / 数据范围 / 关联账号 */
export {
  getRolePage,
  createRole,
  getRoleById,
  updateRoleById,
  deleteRoleById,
  copyRoleById,
  updateRoleStatusById,
  getRolePermissionsById,
  updateRolePermissionsById,
  getPermissionTree,
  getRoleDataScopeById,
  updateRoleDataScopeById,
  getRoleAccountsById
} from './modules/rbac.js'

/* 员工管理模块（13 个）：员工 CRUD / 启停重置密码 / 多角色 / 负载 / 排班 / 绩效看板 */
export {
  getStaffPage,
  createStaff,
  getStaffById,
  updateStaffById,
  updateStaffStatusById,
  resetStaffPasswordById,
  replaceStaffRolesById,
  getStaffWorkloadById,
  getStaffSchedules,
  createStaffSchedule,
  deleteStaffScheduleById,
  getStaffPerformance,
  getHospitalDashboard
} from './modules/staff.js'

/* 机构与字典模块（27 个）：概览级联 / 医院 / 院区 / 科室 / 医生库 / 标签 */
export {
  getDictOverview,
  getDictOptions,
  getDictHospitalPage,
  createDictHospital,
  getDictHospitalById,
  updateDictHospitalById,
  deleteDictHospitalById,
  getDictAreaPage,
  getDictAreaList,
  createDictArea,
  getDictAreaById,
  updateDictAreaById,
  deleteDictAreaById,
  getDictDepartmentPage,
  getDictDepartmentList,
  createDictDepartment,
  getDictDepartmentById,
  updateDictDepartmentById,
  deleteDictDepartmentById,
  getDictDoctorPage,
  createDictDoctor,
  updateDictDoctorById,
  deleteDictDoctorById,
  getDictTagList,
  createDictTag,
  updateDictTagById,
  deleteDictTagById
} from './modules/dict.js'

/* 患者管理模块（21 个，PC）：列表导出 / 档案 / 附件 / 病历 OCR / 沟通 / 健康摘要 / 匹配标签配额 */
export {
  getPatientPage,
  exportPatients,
  createPatient,
  getPatientById,
  updatePatientById,
  deletePatientById,
  getPatientProfileById,
  getPatientServiceRelationsById,
  getEscortQuotaRecordsById,
  getPatientCommunicationsById,
  getPatientHealthSummaryById,
  getPatientAttachmentsById,
  createPatientAttachmentById,
  deletePatientAttachmentById,
  getPatientMedicalRecordById,
  updatePatientMedicalRecordById,
  createPatientMedicalRecordOcrById,
  getPatientMedicalRecordOcrResultById,
  updatePatientMatchById,
  updatePatientTagsById,
  updatePatientEscortQuotaById
} from './modules/patient.js'

/* 健康数据模块（54 个）：用药 / 睡眠 PSQI / 运动康复 / 健康记录看板 / 营养分析 / 体重 / BLE 设备 */
export {
  getMedicationRemindersByPatientId,
  createMedicationReminderByPatientId,
  updateMedicationReminderById,
  deleteMedicationReminderById,
  updateMedicationReminderPushById,
  getMedicationRecordsByPatientId,
  updateMedicationRecordByLogId,
  getSleepAssessmentsByPatientId,
  saveSleepAssessmentAdviceById,
  getSleepDeviceByPatientId,
  getExerciseWeeklyCompletionById,
  getExercisePlanById,
  saveExercisePlanById,
  saveExercisePlanOrderById,
  archiveExercisePlanItemById,
  archiveExercisePlanItemsById,
  unlockExercisePlanItemById,
  getExerciseLibrary,
  getExerciseSelfEvalLibrary,
  getExerciseSelfEvalConfigById,
  saveExerciseSelfEvalConfigById,
  getMyHealthRecords,
  createMyHealthRecord,
  getPatientHealthRecordsById,
  createPatientHealthRecordById,
  updateHealthRecordAdviceById,
  getPatientHealthDashboardById,
  getMyHealthDashboard,
  analyzeMyNutrition,
  getMyHealthArchive,
  getMyPsqiQuestions,
  getMyPsqiStatus,
  saveMyPsqiDraft,
  submitMyPsqi,
  getMyPsqiSubmissions,
  getPatientScalesById,
  getMyExercisePlan,
  completeMyExerciseSetById,
  finishMyExerciseById,
  pauseMyExerciseById,
  submitMyExerciseEvaluationById,
  getMyExerciseEvalConfig,
  getMyWeightRecords,
  createMyWeightRecord,
  deleteMyWeightRecordById,
  getMyDevices,
  bindMyDevice,
  unbindMyDeviceById,
  syncMyDeviceById,
  getMyMedicationToday,
  addMyMedication,
  takeMyMedicationById,
  deleteMyMedicationById,
  updateMyMedicationReminder
} from './modules/health.js'
