# 粉丝社群平台 - 变更日志 / CHANGELOG

---

## v1.0.7 - 添加单元测试 & 修复 JWT Token Bug

> **版本：** v1.0.7
> **日期：** 2026-05-12
> **功能：** 单元测试 + Bug 修复
> **问题类型：** 工程化改进（P1）+ Bug 修复（P0）

---

## 一、问题背景

项目在 v1.0.6 及之前版本中存在以下问题：

1. **无单元测试**：核心业务逻辑（认证、权限控制）没有自动化测试，修改代码后无法快速验证正确性
2. **JWT Token Bug**：`create_access_token` 函数将 `sub`（用户ID）以整数形式编码到 JWT 中，但 `python-jose` 库要求 `sub` 必须是字符串，导致 Token 解析失败

---

## 二、修改内容

### 1. 修复 JWT Token Bug（P0）

**文件：** `app/auth.py`

**问题：** `create_access_token(data={"sub": user.id})` 传入整数 ID，`python-jose` 的 `jwt.decode` 抛出 `Subject must be a string` 异常。

**修复：**
```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # python-jose 要求 sub 必须是字符串
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    ...
```

---

### 2. 添加测试依赖

**文件：** `requirements.txt`

新增：
```
pytest==8.3.0
pytest-asyncio==0.24.0
httpx==0.27.0
```

---

### 3. 测试配置

**文件：** `pytest.ini`（新建）

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

---

### 4. 测试基础设施

**文件：** `tests/conftest.py`（新建）

提供以下 fixtures：

| Fixture | 说明 |
|---------|------|
| `setup_test_database` | 每个测试前创建表、测试后清理（autouse） |
| `db` | 测试数据库会话 |
| `client` | FastAPI TestClient（注入测试数据库） |
| `auth_headers` | 已认证普通用户的请求头 |
| `admin_headers` | 管理员用户的请求头 |
| `registered_user` | 通过 API 注册的用户 |
| `registered_user_token` | 注册用户的 JWT Token |

**关键技术决策：**
- 使用 `SQLite :memory:` 内存数据库，测试速度快
- 使用 `StaticPool` 确保所有连接共享同一个数据库实例
- 开启 `PRAGMA foreign_keys=ON` 确保外键约束生效
- 每个测试独立建表/清表，确保测试隔离

---

### 5. 认证模块测试（28 个用例）

**文件：** `tests/test_auth.py`

| 测试类 | 用例数 | 覆盖范围 |
|--------|--------|---------|
| `TestRegister` | 10 | 正常注册、重复用户名/邮箱/手机号、参数校验、密码哈希 |
| `TestLogin` | 6 | 正常登录、邮箱登录、密码错误、用户不存在、JWT 有效性 |
| `TestForgotPassword` | 4 | 正常流程、防枚举、验证码失效机制 |
| `TestResetPassword` | 5 | 正常重置、无效验证码、参数校验、一次性使用 |
| `TestTokenUtils` | 5 | 创建/解析 Token、无效 Token、密码哈希 |

---

### 6. 权限控制测试（28 个用例）

**文件：** `tests/test_permissions.py`

| 测试类 | 用例数 | 覆盖范围 |
|--------|--------|---------|
| `TestAuthenticationRequired` | 9 | 未认证访问各接口、无效 Token、格式错误头 |
| `TestUserProfilePermission` | 3 | 获取/修改个人资料、公开资料访问 |
| `TestPostPermission` | 5 | 作者编辑/删除、他人编辑/删除、管理员删除 |
| `TestAdminPermission` | 5 | 管理员审核、普通用户无权审核、未认证访问 |
| `TestSocialPermission` | 4 | 关注/好友/私信/动态流需认证 |

---

## 三、测试运行

```bash
# 运行所有测试
pytest tests/ -v

# 运行认证模块测试
pytest tests/test_auth.py -v

# 运行权限控制测试
pytest tests/test_permissions.py -v

# 查看测试覆盖率（需安装 pytest-cov）
pytest tests/ --cov=app --cov-report=html
```

---

## 四、影响分析

| 影响项 | 说明 |
|--------|------|
| API 版本 | 从 1.0.6 升级到 1.0.7 |
| Bug 修复 | JWT Token 编码修复（影响所有需要认证的接口） |
| 功能变更 | 无 |
| 向后兼容 | ✅ 兼容（Token 格式变化对前端透明） |
| 新增文件 | `tests/` 目录、`pytest.ini` |

---

## 五、相关文件

| 文件 | 变更 |
|------|------|
| `app/auth.py` | 修复 JWT Token sub 类型 Bug |
| `requirements.txt` | 添加 pytest、pytest-asyncio、httpx |
| `pytest.ini` | **新建**，pytest 配置 |
| `tests/conftest.py` | **新建**，测试 fixtures |
| `tests/test_auth.py` | **新建**，认证模块测试（28 用例） |
| `tests/test_permissions.py` | **新建**，权限控制测试（28 用例） |
| `app/main.py` | 版本号更新为 1.0.7 |

---

## 六、测试结果

```
======================= 56 passed, 12 warnings in 17.52s ========================
```

- **总用例数：** 56
- **通过：** 56 ✅
- **失败：** 0
- **测试覆盖模块：** 认证（auth）、权限控制（permissions）

---

---

# 历史版本

## v1.0.6 - 引入 Alembic 数据库迁移工具

> **版本：** v1.0.6
> **日期：** 2026-05-12
> **功能：** 数据库迁移管理

### 修改内容
- 引入 Alembic 管理数据库迁移
- 创建初始迁移脚本
- README 添加 Alembic 使用文档

---

## v1.0.5 - 代码规范：修复 feed_router 内部 import

> **版本：** v1.0.5
> **日期：** 2026-05-12
> **功能：** 代码规范修复

### 修改内容
- 将 `Collection` 的 import 从 `feed_router.py` 函数内部移至文件顶部

---

## v1.0.4 - 代码清理：移除 /auth/me 空实现

> **版本：** v1.0.4
> **日期：** 2026-05-12
> **功能：** 代码清理

### 修改内容
- 删除 `auth_router.py` 中 `/auth/me` 空实现

---

## v1.0.3 - CORS 安全加固 & Bug 修复

> **版本：** v1.0.3
> **日期：** 2026-05-12
> **功能：** CORS 安全加固 + 点赞/收藏状态 Bug 修复

### 修改内容
- CORS 从 `allow_origins=["*"]` 改为具体域名限制
- 修复 `is_liked`/`is_collected` 始终为 False 的 Bug

---

## v1.0.2 - 用户资料功能补丁

> **版本：** v1.0.2
> **日期：** 2026-04-17
> **功能：** 用户资料编辑功能

---

## v1.0.0 - 内容审核功能

> **版本：** v1.0.0
> **日期：** 2026-04-17
> **功能：** 内容审核
