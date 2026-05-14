# 版本更新日志 v1.0.14

## 概述

本版本创建了 `constants.py` 统一管理项目中分散在各文件的业务常量，消除了魔法数字和字符串，提升了代码的可维护性和一致性。

---

## 主要变更

### 1. 新增 constants.py

**文件**: `app/constants.py`

采用类命名空间组织常量，按业务模块分类：

| 类 | 说明 | 常量数 |
|---|------|-------|
| `Auth` | 认证相关 | 6 个 |
| `Post` | 帖子相关 | 5 个 |
| `Pagination` | 分页相关 | 8 个 |
| `Audit` | 内容审核 | 3 个 |
| `User` | 用户相关 | 3 个 |
| `Message` | 消息相关 | 2 个 |

### 2. 常量清单

#### Auth（认证常量）

| 常量 | 值 | 说明 | 原位置 |
|-----|---|------|-------|
| `CODE_EXPIRE_MINUTES` | 15 | 验证码有效期（分钟） | auth_service.py |
| `CODE_LENGTH` | 6 | 验证码位数 | auth_service.py（硬编码） |
| `MAX_LOGIN_ATTEMPTS` | 5 | 最大登录尝试次数 | 新增（预留） |
| `LOGIN_LOCKOUT_MINUTES` | 30 | 登录锁定时间 | 新增（预留） |
| `PASSWORD_MIN_LENGTH` | 6 | 密码最小长度 | 新增（预留） |
| `USERNAME_MIN_LENGTH` | 3 | 用户名最小长度 | 新增（预留） |
| `USERNAME_MAX_LENGTH` | 50 | 用户名最大长度 | 新增（预留） |

#### Post（帖子常量）

| 常量 | 值 | 说明 |
|-----|---|------|
| `TITLE_MAX_LENGTH` | 200 | 帖子标题最大长度 |
| `CONTENT_MAX_LENGTH` | 10000 | 帖子内容最大长度 |
| `MAX_TAGS_PER_POST` | 9 | 单篇帖子最多标签数 |
| `TAG_NAME_MAX_LENGTH` | 50 | 标签名最大长度 |
| `TAG_DESC_MAX_LENGTH` | 200 | 标签描述最大长度 |

#### Pagination（分页常量）

| 常量 | 值 | 说明 | 原重复位置 |
|-----|---|------|-----------|
| `DEFAULT_PAGE` | 1 | 默认页码 | 7 个路由文件 |
| `DEFAULT_PAGE_SIZE` | 10 | 默认每页条数 | 多处 |
| `MIN_PAGE_SIZE` | 1 | 最小每页条数 | 7 个路由文件（`ge=1`） |
| `MAX_PAGE_SIZE` | 50 | 最大每页条数 | 7 个路由文件（`le=50`） |
| `POST_PAGE_SIZE` | 10 | 帖子列表每页条数 | post_router, tag_router |
| `USER_PAGE_SIZE` | 20 | 用户列表每页条数 | follow_router |
| `TAG_PAGE_SIZE` | 20 | 标签列表每页条数 | tag_router |
| `MESSAGE_PAGE_SIZE` | 20 | 消息列表每页条数 | message_router |
| `AUDIT_PAGE_SIZE` | 20 | 审核列表每页条数 | audit_router |
| `FEED_PAGE_SIZE` | 10 | 动态流每页条数 | feed_router |
| `TAG_SEARCH_LIMIT` | 20 | 标签搜索最大返回数 | tag_router |

#### Audit（审核常量）

| 常量 | 值 | 说明 | 原重复位置 |
|-----|---|------|-----------|
| `STATUS_PENDING` | "pending" | 待审核 | audit_router, post_router |
| `STATUS_APPROVED` | "approved" | 已通过 | audit_router, post_router |
| `STATUS_REJECTED` | "rejected" | 已驳回 | audit_router |

#### User（用户常量）

| 常量 | 值 | 说明 |
|-----|---|------|
| `NICKNAME_MAX_LENGTH` | 50 | 昵称最大长度 |
| `BIO_MAX_LENGTH` | 500 | 个人简介最大长度 |
| `AVATAR_URL_MAX_LENGTH` | 500 | 头像 URL 最大长度 |

#### Message（消息常量）

| 常量 | 值 | 说明 |
|-----|---|------|
| `CONTENT_MAX_LENGTH` | 5000 | 消息内容最大长度 |
| `CONTENT_MIN_LENGTH` | 1 | 消息内容最小长度 |

### 3. 修改的文件

| 文件 | 变更内容 |
|-----|---------|
| `app/constants.py` | **新增** - 统一常量定义 |
| `app/services/auth_service.py` | `CODE_EXPIRE_MINUTES` → `Auth.CODE_EXPIRE_MINUTES` |
| `app/routers/post_router.py` | 分页参数使用 `Pagination` 常量 |
| `app/routers/feed_router.py` | 分页参数使用 `Pagination` 常量 |
| `app/routers/follow_router.py` | 分页参数使用 `Pagination` 常量 |
| `app/routers/message_router.py` | 分页参数使用 `Pagination` 常量 |
| `app/routers/tag_router.py` | 分页参数使用 `Pagination` 常量 |
| `app/routers/audit_router.py` | 分页参数使用 `Pagination` 常量，审核状态使用 `Audit` 常量 |
| `app/main.py` | 版本号 1.0.13 → 1.0.14 |

### 4. 代码对比

**重构前**（分散在各文件中）:
```python
# auth_service.py
CODE_EXPIRE_MINUTES = 15

# post_router.py
page_size: int = Query(10, ge=1, le=50)

# audit_router.py
Post.status == "pending"
Post.status == "approved"
Post.status == "rejected"
```

**重构后**（统一使用 constants）:
```python
from app.constants import Auth, Pagination, Audit

# auth_service.py
Auth.CODE_EXPIRE_MINUTES

# post_router.py
page_size: int = Query(Pagination.POST_PAGE_SIZE, ge=Pagination.MIN_PAGE_SIZE, le=Pagination.MAX_PAGE_SIZE)

# audit_router.py
Post.status == Audit.STATUS_PENDING
Post.status == Audit.STATUS_APPROVED
Post.status == Audit.STATUS_REJECTED
```

### 5. 设计原则

- **环境相关配置**（如数据库 URL、密钥）→ `config.py`（可通过 `.env` 覆盖）
- **业务逻辑常量**（如分页大小、审核状态）→ `constants.py`（代码内固定值）
- **类命名空间**组织，避免全局命名冲突
- 预留了部分常量（如 `MAX_LOGIN_ATTEMPTS`）供后续功能使用

---

## 版本信息

- **版本号**: 1.0.14
- **发布日期**: 2026-05-13
- **主要功能**: 创建 constants.py 统一管理常量
- **新增文件**: 1 个 (`app/constants.py`)
- **修改文件**: 9 个
- **消除魔法数字/字符串**: 约 30 处
