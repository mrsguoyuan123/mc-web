/**
 * API 统一出口：具名重导出 src/api/modules 下全部 23 个业务模块的接口函数（共 371 个）
 *
 * 用法：import { pcLogin, getPatientPage, uploadFile } from '../api'（相对路径；本项目无 @ 别名）
 * 底层封装见 ./frontApikit.js，各模块的路径 / 参数 / 返回注释见 ./modules 下对应文件
 * 本文件由脚本按模块导出自动聚合生成，新增模块后重新生成即可；全部导出名全局唯一，无重名冲突
 */

/* 个人账号模块（5 个） */
export {
  getMySecuritySettings,
  updateMySecuritySettings,
  getMyLoginLogs,
  getMyOperationLogs,
  updateMyAccountProfile
} from './modules/account.js'

/* 小程序内容管理模块（35 个） */
export {
  getAppOverview,
  getAppNoticePage,
  createAppNotice,
  updateAppNoticeById,
  deleteAppNoticeById,
  updateAppNoticeStatusById,
  sortAppNotices,
  updateAppBannerStatusById,
  sortAppBanners,
  getAppLoginAgreements,
  getAllAppLoginAgreements,
  updateAppLoginAgreementById,
  getAppLoginAgreementVersionsById,
  acceptAppLoginAgreementById,
  getMyPendingAppLoginAgreements,
  getAppBanners,
  createAppBanner,
  getAllAppBanners,
  updateAppBannerById,
  deleteAppBannerById,
  getAppArticlePage,
  createAppArticle,
  getAllAppArticles,
  updateAppArticleById,
  deleteAppArticleById,
  getAllAppReplyTemplates,
  createAppReplyTemplate,
  updateAppReplyTemplateById,
  deleteAppReplyTemplateById,
  updateAppReplyTemplateStatusById,
  getAppInformedConsents,
  createAppInformedConsent,
  updateAppInformedConsentById,
  deleteAppInformedConsentById,
  updateAppInformedConsentStatusById
} from './modules/app.js'

/* 认证模块（19 个） */
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

/* 驻点陪诊师聊天模块（4 个） */
export {
  getCaregiverScope,
  getCaregiverConversationPage,
  getCaregiverConversationStats,
  getCaregiverMessagesById
} from './modules/caregiver.js'

/* 会诊模块（11 个） */
export {
  getConsultationPage,
  createConsultation,
  getConsultationById,
  getConsultationStats,
  getConsultationsByPatientId,
  createConsultationFollowUpById,
  closeConsultationById,
  resolveConsultationById,
  updateConsultationInternalNoteById,
  markConsultationReplyReadById,
  forwardConsultationReplyToUserById
} from './modules/consult.js'

/* 会话与消息模块（28 个） */
export {
  getConversationPage,
  getConversationWorkspaceById,
  getConversationById,
  getConversationStats,
  getMyConversations,
  getEnabledReplyTemplates,
  createReplyTemplate,
  getReplyTemplatePage,
  updateReplyTemplateById,
  deleteReplyTemplateById,
  updateReplyTemplateStatusById,
  updateReplyTemplateBatchStatus,
  recordReplyTemplateUseById,
  getReplyTemplateUsageLogsById,
  updateConversationStatusById,
  updateConversationPriorityById,
  getConversationMessagesById,
  sendConversationMessageById,
  editConversationMessageById,
  auditConversationById,
  markConversationReadById,
  requestManualServiceById,
  evaluateConversationById,
  sendMyConversationMessageById,
  submitMyConversationEvaluationById,
  requestMyManualServiceById,
  getManualServiceRequests,
  acceptManualServiceRequestById
} from './modules/conversation.js'

/* 客服模块（9 个） */
export {
  getCsPatientPage,
  getCsStats,
  getCsPatientById,
  getCsPatientAiSummaryById,
  getCsPatientAiPredictionById,
  getCsPatientPhoneStatusById,
  getCsFaq,
  createCsCallRecordById,
  startCsCallById
} from './modules/cs.js'

/* 数据看板模块（18 个） */
export {
  getDashboardOverview,
  getDashboardServiceTrend,
  getDashboardServiceActivity,
  getDashboardKnowledgeGraph,
  getDashboardFocusNode,
  getDashboardAnomalies,
  getDashboardLiveEvents,
  getDashboardFilters,
  getHospitalDashboardSummary,
  getHospitalDashboardTrends,
  getHospitalDepartmentDistribution,
  getHospitalDailyActivity,
  getHospitalEfficiency,
  getDepartmentDashboardSummary,
  getDepartmentDashboardTrends,
  getDepartmentDailyConsultations,
  getDepartmentHourlyDistribution,
  getDepartmentEfficiency
} from './modules/dashboard.js'

/* 机构与字典模块（27 个） */
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

/* 医生模块（21 个） */
export {
  getDoctorPage,
  createDoctor,
  getDoctorById,
  updateDoctorById,
  updateDoctorStatusById,
  updateDoctorManagerById,
  getDoctorOptions,
  getDoctorTeamById,
  getDoctorPatientsById,
  updateDoctorPatientsById,
  getDoctorChangeLogsById,
  getMyConsultations,
  viewMyConsultationById,
  replyMyConsultationById,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyPatients,
  getMyPatientArchiveById,
  createMyPatientAttachmentById,
  deleteMyPatientAttachmentById,
  getMyPatientConversationById
} from './modules/doctor.js'

/* 陪诊服务模块（21 个） */
export {
  createEscortBooking,
  getEscortBookings,
  updateEscortBookingById,
  cancelEscortBookingById,
  assignEscortCaregiverById,
  getMyEscort,
  getMyEscortCaregivers,
  createMyEscortBooking,
  getMyEscortBookings,
  cancelMyEscortBookingById,
  getEscortStats,
  getEscortOrders,
  getEscortOrderById,
  acceptEscortOrderById,
  startEscortOrderById,
  checkinEscortOrderById,
  submitEscortServiceRecordById,
  getEscortSchedules,
  getEscortProfileStats,
  getEscortUsers,
  updateEscortConfig
} from './modules/escort.js'

/* 检查检验模块（15 个） */
export {
  getExamCategoriesByPatientId,
  createExamCategoryByPatientId,
  updateExamCategoryById,
  deleteExamCategoryById,
  getExamReportPageByPatientId,
  createExamReportByPatientId,
  deleteExamReportById,
  runExamReportOcrById,
  getExamIndicatorPageByPatientId,
  createExamIndicatorByPatientId,
  updateExamIndicatorById,
  deleteExamIndicatorById,
  getExamAiSummaryByPatientId,
  updateExamAiSummaryByPatientId,
  generateExamAiSummaryByPatientId
} from './modules/exam.js'

/* 文件存储模块（3 个） */
export {
  uploadFile,
  uploadFiles,
  getLocalFile
} from './modules/file.js'

/* 随访模块（7 个） */
export {
  getFollowUpTaskPage,
  createFollowUpTask,
  updateFollowUpTaskById,
  createFollowUpCallRecordById,
  getFollowUpCallRecordsById,
  getFollowUpPhoneStatusById,
  getFollowUpSummary
} from './modules/followup.js'

/* 健康数据模块（54 个） */
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

/* 医院视角患者模块（3 个） */
export {
  getHospitalPatientPage,
  getHospitalPatientHealthDetailById,
  getHospitalSummary
} from './modules/hospital.js'

/* 知识库模块（24 个） */
export {
  getKbOverview,
  testKbSearch,
  getKbEntryPage,
  createKbEntry,
  updateKbEntryById,
  deleteKbEntryById,
  updateKbEntryStatusById,
  updateKbEntryBatchStatus,
  deleteKbEntryBatch,
  importKbEntries,
  getKbDocumentPage,
  uploadKbDocument,
  deleteKbDocumentById,
  getKbDocumentChunksById,
  reparseKbDocumentById,
  getKbUnresolvedPage,
  convertKbUnresolvedById,
  mergeKbUnresolvedById,
  ignoreKbUnresolvedById,
  getKbVersions,
  startKbTrain,
  getKbTrainJobById,
  publishKbVersionById,
  rollbackKbVersion
} from './modules/kb.js'

/* 站内通知模块（6 个） */
export {
  getNotificationTodo,
  getNotificationUnreadCount,
  getNotificationPage,
  markNotificationReadById,
  markAllNotificationsRead,
  registerWxSubscribe
} from './modules/notification.js'

/* 患者管理模块（21 个） */
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

/* 动态角色与权限模块（13 个） */
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

/* 风险提示模块（4 个） */
export {
  getRiskAlertPage,
  createRiskAlert,
  getRiskAlertSummary,
  updateRiskAlertById
} from './modules/risk.js'

/* 员工管理模块（13 个） */
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

/* 患者端“我的”模块（10 个） */
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
