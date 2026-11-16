# PC 管理端前端联调工具箱（pc-frontend-api-kit）

一句话：把本目录交给 PC 后台前端（Vue / React）和 AI 编码代理，按 **两步式登录 → 角色 → 权限菜单** 接入即可联调。

> 移动端（微信小程序）请用仓库根目录的 `frontend-api-kit/`；本目录只面向 PC 管理端。

## 目录内容

| 文件 | 用途 |
|---|---|
| `AGENTS.md` | **给 AI 编码代理 / 前端开发者的接入指南**：登录、权限、页面→接口地图、枚举、坑位（推荐先读） |
| `API_INDEX.md` | PC 相关接口索引（自动生成，按 17 个模块分组，含鉴权/占位/legacy 标记） |
| `05-PC登录与鉴权联调.md` | 两步式登录、角色列表、切换角色、权限渲染、数据范围、错误码 |
| `swagger.json` | Swagger 2.0 完整契约，导入 Apifox/Postman 生成接口与模型 |
| `smoke_pc.py` | 一键冒烟（Python3 标准库，无第三方依赖；默认只读） |
| `examples/pc-api-client.ts` | 前端请求封装示例：token、refresh、雪花 ID、权限判断、两步式登录（依赖 `json-bigint`） |

## 一分钟上手

### 1. 导接口

Apifox / Postman → 导入 `swagger.json`。  
`API_INDEX.md` 是 PC 子集（224 路径 / 287 操作），完整的移动端接口也在 `swagger.json` 里，不要误用。

### 2. 跑冒烟

```bash
# 默认只读，不写业务数据
python3 smoke_pc.py

# 指定地址
python3 smoke_pc.py http://115.159.151.158:8081/api/v1

# 额外验证写入链路（会创建 1 个医生 + 1 条咨询，dev 环境使用）
python3 smoke_pc.py --write
```

全 `PASS` = 服务端可用，可以开始写页面。

### 3. 两步式登录（PC 必须用这条）

```bash
BASE=http://115.159.151.158:8081/api/v1

# Step 1：账密 → loginTicket + 角色列表
curl -s -X POST "$BASE/auth/pc/login" -H 'Content-Type: application/json' \
  -d '{"username":"multi","password":"1"}'

# Step 2：选角色 → accessToken + refreshToken
curl -s -X POST "$BASE/auth/pc/select-role" -H 'Content-Type: application/json' \
  -d '{"loginTicket":"<上一步的 loginTicket>","roleCode":"pc_admin"}'

# 之后所有请求带 Bearer
curl -s "$BASE/auth/me" -H "Authorization: Bearer <accessToken>"
```

> 登录页只收集账号密码；**角色选择是登录后的第二步**。只有一个角色时响应带 `autoSelectRoleCode`，可直接自动进入。
> 刷新页面用 `GET /auth/me` 恢复身份与 `permissions[]`，不要重新走登录。

### 4. 免登调试（仅 dev）

```bash
TOKENS=$(curl -s "$BASE/auth/dev-tokens")
ADMIN=$(echo "$TOKENS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['admin'])")
curl -s "$BASE/patients?page=1&pageSize=5" -H "Authorization: Bearer $ADMIN"
```

`/auth/dev-tokens` 返回 **9 个 key**：`admin / hospital / cs / station / doctor / patient / deptAdmin / dashboard / multi`。

- `station` 的 role 是 `CAREGIVER`（历史 key 名，PC 端角色为 `pc_station`）
- 静态 token 是真实 JWT，权限与正常登录一致；服务重启会重新签发
- 生产 profile 该接口 404

## 联调环境

| 项 | 值 |
|---|---|
| 接口地址（端口） | `http://115.159.151.158:8081/api/v1` |
| 接口地址（域名） | `http://followup.ijunyuan.cn/api/v1` |
| Swagger UI（dev） | `http://115.159.151.158:8081/api/v1/swagger-ui.html` |
| WebSocket | `ws://115.159.151.158:8081/api/v1/ws?token=<accessToken>` |
| 服务器 | `tcpkg:/home/wyc/followup`，启停 `start.sh`，dev profile |

## dev 联调账号（密码均为 `1`，root 除外）

| 账号 | 密码 | PC 端角色 | 说明 |
|---|---|---|---|
| `root` | `admin123` | `pc_admin` | 公司管理，全量权限 |
| `multi` | `1` | `pc_admin` + `pc_customer_service` | 多角色，演示登录后选角色 |
| `admin` | `1` | `pc_customer_service` | 客服工作台 |
| `admin3` | `1` | `pc_station` | 驻点/陪诊师，仅能录入授权范围内医生、只读驻点聊天 |
| `dev-hospital` | `1` | `pc_hospital_manager` | 医院管理，hospitalId=1 |
| `deptadmin` | `1` | `pc_department_manager` | 科室管理，hospitalId=1 + departmentId=301 |
| `dashboard` | `1` | `dashboard` | 只读看板 |

- `admin5/1` 是医生，但只有 `mobile_doctor` 角色，**PC 登录会返回 400“账号未配置可用的 PC 端角色”**；医生用小程序手机号登录。
- `admin2/1` 是患者，走 `/auth/login` 或患者端登录，不走 `/auth/pc/login`。

## 暗号化约定（前端代码必须遵守）

- 响应永远是 `{code, message, data}`，**HTTP 状态恒为 200**；
- `code=0` 成功；`400` 弹提示；`401` 静默 refresh 后重试一次；`402` 清凭证跳登录；`403` 无权限提示；`500` 服务异常；
- 分页统一 `{list, total, page, pageSize}`；
- 雪花 ID 是 19 位数字，超过 JS `Number.MAX_SAFE_INTEGER`，**必须按字符串处理**（见 `AGENTS.md` §4）。

## 契约更新

`swagger.json` 与 `API_INDEX.md` 都是生成物，接口变更后在后端执行：

```bash
cd server
python3 tools/gen_swagger.py          # 同时更新 server / frontend-api-kit / pc-frontend-api-kit
python3 tools/gen_swagger.py --check  # 校验产物是否与脚本一致
python3 tools/check_swagger_paths.py  # 校验 Controller 路由 ↔ swagger
```

不要手改本目录的 `swagger.json` / `API_INDEX.md`。
