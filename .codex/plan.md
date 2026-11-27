# 智能客服知识库（aiKnowledge）改造进度

## 已完成

### 1. 消息模板 Tab 查询/重置（userMessageNotice）
- 文件：src/views/userMessageNotice/components/MessageTemplateTab.vue
- 新增 appliedKeyword / appliedStatus 两个“已应用查询态”，过滤 computed 改为读它们
- 新增 handleSearch（提交当前输入到应用态）、handleReset（清空输入态与应用态，恢复全量）

### 2. K1 数据概览 Tab
- 新增文件：src/views/aiKnowledge/components/OverviewTab.vue（构建通过）
- 三卡：知识条目总数（含已发布/草稿副行）、近 30 天命中率（0~1 自动 ×100）、待处理未解决（暖色卡，点击 emit go-unresolved 空串）
- 缺失值统一红色「接口未提供」（MISSING_TEXT + isMissing），0/false 不判缺失
- G2：hitRateDelta 缺失时整行隐藏，未写死 +3.2%
- 近 7 天趋势：echarts 双柱状（命中/未命中），占位接口 getKbHitTrend({days:7}) 目前组件内直接调 http.get('/kb/hit-trend')；失败或无数据时灰底空态 + 红色缺失文案，不画假柱
- 最新未解决 3 条：getKbUnresolvedPage({status:'PENDING',page:1,pageSize:3})，单条“处理”emit go-unresolved + 行 id
- 发布状态：getKbVersions() 取前 3 条；当前版本按 status==='PUBLISHED' 且 publishedAt 最新判定，仅一个绿标，其余历史灰标；时间优先 publishedAt 否则 trainedAt
- 雪花 id 全部 String 化；工具走 @/utils/index.js，接口走 ../../../api/index.js

## 待办（K1 之外，尚未开始）

- 父组件接线：src/views/aiKnowledge/index.vue 目前仍是旧单页，未引入 OverviewTab。需要：
  - 按设计稿改为顶部 6 个 Tab（数据概览/问答知识/文档知识/未解决问题/检索测试/训练与发布），挂载 OverviewTab
  - 监听 go-unresolved：空串切到未解决 Tab；带 id 时切 Tab 并高亮对应行
  - 未解决 Tab 角标数字（>0 才显示），数据来自 getKbOverview().unresolvedPending
- K2~K6：问答知识、文档知识、未解决问题、检索测试、训练与发布，对应同目录 K2~K6 的 md 指令（均尚未实施）
- G1 收口：后端提供命中趋势端点后，把 getKbHitTrend 从组件内联 http 调用迁移到 src/api/modules/kb.js 并经 api/index.js 导出（K1 指令要求只改本文件，故暂未动 api 层）
