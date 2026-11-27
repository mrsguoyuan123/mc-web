# 指令 SC1：客服工作台骨架、患者列表与顶部统计

> 模块定位：客服坐席工作台主页面，左侧患者会话列表 + 顶部统计卡；健康总览 4 卡与异常提醒列表见 SC1-B，中部聊天与右侧用户信息见 SC2，资料抽屉见 SC3，虚拟电话见 SC4。
> **接口口径：本模块对接三类来源——① cs 模块 9 端点（列表/统计/详情/AI/电话/FAQ/双呼/记录）；② 复用 patient 只读端点（资料抽屉六页签，见 SC3）；③ 复用 conversation 会话消息端点（聊天窗收发，见 SC2-2）。**
> 其余设计稿指标（健康异常/关注/正常、答复率、平均响应时长、紧急消息）后端未覆盖，按缺口占位，禁止写死示例数。
> 空值口径：字段缺失（null/undefined/空串）显示红色「接口未提供」，0、false 算有效值；复用 `@/utils/index.js` 的 `isMissing` / `MISSING_TEXT`。

## 一、技术规范（强制）

- Vue3 `<script setup>` 组合式 API + Element Plus，**不要 TypeScript**。
- 接口从 `../../api/index.js`（API 统一出口，具名重导出全部模块；本项目无 `@` 别名）导入；公共工具/枚举从 `@/utils/index.js` 导入。
- 雪花 ID 由封装层转字符串，路径/入参 id 一律按字符串传；日期 `YYYY-MM-DD`，时间 `YYYY-MM-DD HH:mm`。
- 数据范围服务端强制：CS 仅返回本人匹配患者，ADMIN 全量；前端不做越权过滤。

## 二、组件与目录

```
src/views/serviceChatManage/
├── index.vue                       # 工作台主页面（SC1 骨架 + 列表 + 统计；SC2 中部/右侧区块在此组装）
└── components/
    ├── CsPatientList.vue           # 左侧患者会话列表（搜索、状态筛选、分页、选中态）
    ├── CsStatsBar.vue              # 顶部统计卡组（已有 3 项 + 缺口占位项）
    ├── CsChatPanel.vue             # 中部聊天窗（SC2）
    ├── CsUserInfoCard.vue          # 右侧用户信息 + AI 区（SC2）
    ├── CsProfileDrawer.vue         # 完整资料抽屉（SC3，六页签）
    └── CsCallPanel.vue             # 虚拟电话侧栏 + 通话记录表单（SC4）
```

### 页面职责
- `index.vue`：三栏布局容器；持有当前选中患者 `currentPatientId`；拉取列表与统计；点击列表行切换选中并联动 SC2/SC3/SC4 取数。
- 切换选中患者时，先置空右侧/中部旧数据再按新 id 加载，避免串号。

## 三、顶部统计卡组（`CsStatsBar.vue`）

### 已有数据：`getCsStats()` → `GET /cs/stats`（无参）

返回 `{ highIntent, pendingCall, pendingReply }`，映射：

| 卡片 | 字段 | 文案 | 说明 |
|---|---|---|---|
| 高意向患者 | `highIntent` | 高意向 | purchaseIntent=HIGH 计数 |
| 待沟通患者 | `pendingCall` | 待沟通 | communicateStatus=PENDING 计数 |
| 待回复会话 | `pendingReply` | 待回复 | 末条来自患者且客服未读会话数 |

- 数值为缺失时按空值口径兜底；`0` 正常显示 0。

### 缺口占位（后端未覆盖，禁止伪造数值）

设计稿另有两组指标 `/cs/stats` 未返回，先占位：

| 设计稿指标 | 缺口状态 | 占位处理 |
|---|---|---|
| 健康总览 4 卡（负责用户/数据异常/需要关注/数据正常）+ 异常数据提醒列表 | 无健康总览/提醒列表端点 | 见 SC1-B 专项指令；卡片与提醒列表按缺口占位，不渲染假告警 |
| 总会话数 / 紧急消息 / 答复率 / 平均答复时间 | stats 未覆盖 | 占位卡片；答复率、平均响应时长显示 `MISSING_TEXT`，不写死百分比/分钟 |

> 待后端补：`/cs/stats` 扩充异常/关注/正常计数、总会话数、紧急消息数、答复率、平均响应时长；或新增 `/cs/health-overview`。见本段「待联调确认」。

## 四、左侧患者列表（`CsPatientList.vue`）

### 数据：`getCsPatientPage(params)` → `GET /cs/patients`

入参：

| 参数 | 类型 | 说明 |
|---|---|---|
| `keyword` | string | 姓名/手机号关键字，搜索框输入，防抖 300ms |
| `communicateStatus` | string | 沟通状态筛选：`PENDING` 待沟通 / `FOLLOWED` 已沟通 / `FOLLOW_UP` 待跟进 / `PURCHASED` 已购买 |
| `purchaseIntent` | string | 购买意向：`HIGH` 高 / `MEDIUM` 中 / `LOW` 低 / `PURCHASED` 已购买 |
| `page` | number | 页码，从 1 开始，默认 1 |
| `pageSize` | number | 默认 20，上限 100 |

返回 `PageResult<CsPatientRow>`：`{ list, total, page, pageSize }`。行字段映射：

| 列表展示 | 字段 | 备注 |
|---|---|---|
| 患者名 | `name` | 缺失显示 `MISSING_TEXT` |
| 手机号 | `phone` | 脱敏规则按工程既有口径 |
| 术式 | `surgeryType` | 缺失显示 `MISSING_TEXT` |
| 就诊医院 | `hospitalName` | — |
| 主治医生 | `surgeon` | — |
| 手术地区 | `surgeryRegion` | 列表可折叠/次要展示 |
| 沟通状态标签 | `communicateStatus` | 枚举转中文，字典见下 |
| 购买意向标签 | `purchaseIntent` | 枚举转中文，字典见下 |
| 服务包 | `servicePackage` | — |
| 最近通话时间 | `latestCallTime` | 格式 `YYYY-MM-DD HH:mm`；缺失显示 `-` |

### 交互与状态
- 选中态：当前 `currentPatientId === row.id` 高亮；点击行 emit `select`，把整行与 `id` 传给页面。
- 搜索、状态/意向筛选变更后重置 `page=1` 重新拉取。
- 分页：`el-pagination`，`total` 来自返回；`table-layout: fixed`；空列表显示空态「暂无匹配患者」。
- 加载态：骨架或 loading；单块失败显示「加载失败，点击重试」。

### 模块内私有字典（放 `src/views/serviceChatManage/utils.js`，不进全局）

- `COMMUNICATE_STATUS_TEXT`：`PENDING 待沟通 / FOLLOWED 已沟通 / FOLLOW_UP 待跟进 / PURCHASED 已购买`。
- `PURCHASE_INTENT_TEXT`：`HIGH 高 / MEDIUM 中 / LOW 低 / PURCHASED 已购买`。
- 标签配色：高意向/待沟通用醒目色，已购买用成功色；具体色值沿用工程既有标签风格。

## 五、本段接口对接

| 用途 | 函数 | 路径 / 方法 |
|---|---|---|
| 患者分页列表 | `getCsPatientPage(params)` | `GET /cs/patients` |
| 工作台统计 | `getCsStats()` | `GET /cs/stats` |

## 六、待联调确认

- 健康异常/关注/正常计数、异常提醒横幅：stats 扩充还是新增 `/cs/health-overview`。
- 总会话数、紧急消息数、答复率、平均答复时间：返回字段名与口径（答复率百分比、响应时长单位/秒还是分钟）。
- 列表是否直接返回未读数、最新一条消息摘要（当前行字段无此两项）。
- 手机号脱敏规则与列表是否展示患者编号。

## 七、本段交付清单

1. `index.vue`：三栏骨架、当前选中患者状态、列表与统计区块组装。
2. `CsPatientList.vue`：搜索 + 沟通状态/购买意向筛选 + 分页 + 选中联动，对接 `getCsPatientPage`。
3. `CsStatsBar.vue`：已有 3 项真实对接 `getCsStats`；缺口指标占位并标注待后端补。
4. 空态、加载态、失败重试；枚举字典在模块私有 `utils.js`。
