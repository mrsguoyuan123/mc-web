#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC 管理端联调冒烟脚本（Python3 标准库，无第三方依赖）。

用法:
    python3 smoke_pc.py [base_url] [--write]

    base_url 默认 http://115.159.151.158:8081/api/v1
    --write  额外验证写入链路（会创建 1 个医生 + 1 条咨询，仅在 dev 环境使用）

默认只读：只登录、查列表/详情，不修改业务数据。
退出码: 0 = 全部通过, 1 = 有失败项。

说明:
- 优先使用 /auth/dev-tokens（仅 dev profile）测试免登 token；
- 如果 dev-tokens 不存在（生产/非 dev），脚本会尝试用 multi/1 走两步式登录；
- 需要真实账号时可用环境变量 PC_KIT_USERNAME / PC_KIT_PASSWORD 覆盖（默认 multi/1）。
"""
import json
import os
import random
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "http://115.159.151.158:8081/api/v1"
FAILED = []


def call(base, method, path, token=None, body=None, timeout=15):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, {"_raw": raw}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"_raw": raw}
    except Exception as e:  # 连接失败/超时
        return 0, {"code": -1, "message": str(e)}


def check(name, ok, detail=""):
    print(("PASS" if ok else "FAIL") + " | " + name + ((" | " + detail) if detail else ""))
    if not ok:
        FAILED.append(name)


def data_of(resp):
    return resp.get("data") if isinstance(resp, dict) else None


def pc_login(base, username, password):
    _, r = call(base, "POST", "/auth/pc/login", body={"username": username, "password": password})
    return r


def select_role(base, ticket, role_code):
    _, r = call(base, "POST", "/auth/pc/select-role",
                body={"loginTicket": ticket, "roleCode": role_code})
    return r


def main():
    base = DEFAULT_BASE
    write_mode = False
    for arg in sys.argv[1:]:
        if arg == "--write":
            write_mode = True
        elif arg.startswith("http"):
            base = arg.rstrip("/")
        else:
            print(f"未知参数: {arg}")
            return 2

    print(f"冒烟目标: {base}")
    print(f"模式: {'读写（--write）' if write_mode else '只读'}\n")

    # 0. 公开接口
    _, banners = call(base, "GET", "/app/banners")
    check("公开接口 /app/banners", banners.get("code") == 0, f"code={banners.get('code')}")

    # 1. dev 免登 token（仅 dev）
    _, dev = call(base, "GET", "/auth/dev-tokens")
    dev_tokens = data_of(dev) or {}
    has_dev = dev.get("code") == 0 and isinstance(dev_tokens, dict)
    if has_dev:
        expected = {"admin", "hospital", "cs", "station", "doctor", "patient",
                    "deptAdmin", "dashboard", "multi"}
        check("dev 免登 token（9 个 key）", expected.issubset(set(dev_tokens.keys())),
              "keys=" + ",".join(sorted(dev_tokens.keys())))
        admin_dev = dev_tokens.get("admin", "")
        _, me_dev = call(base, "GET", "/auth/me", token=admin_dev)
        perms_dev = (data_of(me_dev) or {}).get("permissions") or []
        check("dev admin token 携带权限", len(perms_dev) > 0,
              f"permissions={len(perms_dev)}（若为 0，检查 RbacSeedRunner/DevTokenInitializer 顺序）")
    else:
        print("NOTE | 非 dev 环境（无 /auth/dev-tokens），改用账号登录")

    # 2. 两步式登录（multi 多角色）
    username = os.environ.get("PC_KIT_USERNAME", "multi")
    password = os.environ.get("PC_KIT_PASSWORD", "1")
    login = pc_login(base, username, password)
    login_data = data_of(login) or {}
    roles = login_data.get("roles") or []
    check("PC 登录返回角色列表", login.get("code") == 0 and len(roles) >= 1,
          f"code={login.get('code')} roles={[r.get('code') for r in roles]}")

    ticket = login_data.get("loginTicket")
    role_code = login_data.get("autoSelectRoleCode") or "pc_admin"
    if roles and role_code not in [r.get("code") for r in roles]:
        role_code = roles[0].get("code")
    selected = select_role(base, ticket, role_code)
    selected_data = data_of(selected) or {}
    admin = selected_data.get("token")
    check("选角色换 token", selected.get("code") == 0 and bool(admin),
          f"code={selected.get('code')} roleCode={(selected_data.get('user') or {}).get('roleCode')}")

    _, me = call(base, "GET", "/auth/me", token=admin)
    me_data = data_of(me) or {}
    check("GET /auth/me 权限非空", me.get("code") == 0 and len(me_data.get("permissions") or []) > 0,
          f"permissions={len(me_data.get('permissions') or [])}")

    # 3. 切换角色（只有多角色账号可切）
    all_roles = selected_data.get("roles") or roles
    switch_target = next((r["code"] for r in all_roles if r["code"] != role_code), None)
    if switch_target:
        _, switched = call(base, "POST", "/auth/pc/switch-role", token=admin,
                           body={"roleCode": switch_target})
        sw_user = (data_of(switched) or {}).get("user") or {}
        check("切换角色", switched.get("code") == 0 and sw_user.get("roleCode") == switch_target,
              f"roleCode={sw_user.get('roleCode')}")
    else:
        print("SKIP | 切换角色（当前账号只有一个角色）")

    # 4. 角色/权限
    _, role_page = call(base, "GET", "/roles?page=1&pageSize=5", token=admin)
    role_total = (data_of(role_page) or {}).get("total", 0)
    check("角色列表（>=9）", role_page.get("code") == 0 and role_total >= 9, f"total={role_total}")

    _, tree = call(base, "GET", "/permissions/tree", token=admin)
    check("权限树非空", tree.get("code") == 0 and len(data_of(tree) or []) > 0,
          f"groups={len(data_of(tree) or [])}")

    # 5. 患者/健康
    _, patients = call(base, "GET", "/patients?page=1&pageSize=5", token=admin)
    check("患者列表", patients.get("code") == 0 and "list" in (data_of(patients) or {}),
          f"total={(data_of(patients) or {}).get('total')}")

    _, profile = call(base, "GET", "/patients/501/profile", token=admin)
    check("患者档案聚合", profile.get("code") == 0 and "serviceRelations" in (data_of(profile) or {}),
          f"code={profile.get('code')}")

    _, exam = call(base, "GET", "/patients/501/exam/categories", token=admin)
    check("检查分类（>=6）", exam.get("code") == 0 and len(data_of(exam) or []) >= 6,
          f"count={len(data_of(exam) or [])}")

    # 6. 客服/会话/通知（优先 dev cs，否则 admin/1）
    cs = dev_tokens.get("cs") if has_dev else None
    if not cs:
        cs_login = pc_login(base, "admin", "1")
        cs_ticket = (data_of(cs_login) or {}).get("loginTicket")
        cs = (data_of(select_role(base, cs_ticket, "pc_customer_service")) or {}).get("token")
    _, conv = call(base, "GET", "/conversations?page=1&pageSize=5", token=cs)
    check("会话工作台列表", conv.get("code") == 0 and "list" in (data_of(conv) or {}),
          f"total={(data_of(conv) or {}).get('total')} code={conv.get('code')}")

    _, todo = call(base, "GET", "/notifications/todo", token=cs)
    check("通知待办列表", todo.get("code") == 0 and isinstance(data_of(todo), list),
          f"count={len(data_of(todo) or [])}")

    # 7. 驻点/医生库（优先 dev station，否则 admin3/1）
    station = dev_tokens.get("station") if has_dev else None
    if not station:
        st_login = pc_login(base, "admin3", "1")
        st_ticket = (data_of(st_login) or {}).get("loginTicket")
        station = (data_of(select_role(base, st_ticket, "pc_station")) or {}).get("token")
    _, doctors = call(base, "GET", "/doctors?page=1&pageSize=3", token=station)
    check("驻点可查医生库", doctors.get("code") == 0 and "list" in (data_of(doctors) or {}),
          f"code={doctors.get('code')}")

    # 8. 内容/看板/账户
    _, agreements = call(base, "GET", "/app/login-agreements")
    check("登录协议 2 份", agreements.get("code") == 0 and len(data_of(agreements) or []) == 2,
          f"count={len(data_of(agreements) or [])}")

    _, overview = call(base, "GET", "/app/overview", token=admin)
    check("小程序内容概览", overview.get("code") == 0 and "templateEnabled" in (data_of(overview) or {}),
          f"code={overview.get('code')}")

    _, dashboard = call(base, "GET", "/dashboard/overview?range=30d", token=admin)
    check("看板概览", dashboard.get("code") == 0 and "kpis" in (data_of(dashboard) or {}),
          f"code={dashboard.get('code')}")

    _, my = call(base, "GET", "/me/profile", token=admin)
    check("账户中心 /me/profile", my.get("code") == 0 and "username" in (data_of(my) or {}),
          f"code={my.get('code')}")

    # 9. 错误语义
    _, no_token = call(base, "GET", "/auth/me")
    check("无 token → code 401", no_token.get("code") == 401, f"code={no_token.get('code')}")

    bad_pwd = pc_login(base, username, "definitely-wrong")
    check("错误密码 → code 400", bad_pwd.get("code") == 400, f"code={bad_pwd.get('code')}")

    # 10. 可选写入链路
    if write_mode:
        phone = "139%08d" % random.randint(0, 99999999)
        _, doc = call(base, "POST", "/doctors", token=station, body={
            "name": "冒烟医生",
            "title": "主治医师",
            "phone": phone,
            "hospitalId": 1,
            "departmentId": 301,
        })
        check("写入：驻点录入医生", doc.get("code") == 0,
              f"code={doc.get('code')} message={doc.get('message')} phone={phone}")

        _, consult = call(base, "POST", "/consultations", token=cs, body={
            "patientId": 501,
            "subject": "冒烟咨询",
            "content": "请医生确认（smoke_pc.py --write）",
            "doctorIds": [901],
        })
        check("写入：发起专业咨询", consult.get("code") == 0,
              f"code={consult.get('code')} message={consult.get('message')}")

    print()
    if FAILED:
        print(f"失败 {len(FAILED)} 项: {', '.join(FAILED)}")
        return 1
    print("全部通过 ✅ PC 管理端服务可用，可以开始联调。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
