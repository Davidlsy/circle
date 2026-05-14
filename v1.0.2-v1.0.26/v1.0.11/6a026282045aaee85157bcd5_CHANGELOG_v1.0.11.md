# 版本更新日志 v1.0.11

## 概述

本版本实现了**双 Token（Access Token + Refresh Token）认证机制**，解决了此前 Token 过期后用户需重新登录的问题。Access Token 有效期缩短为 30 分钟，Refresh Token 有效期 7 天，支持 Token 刷新、单设备登出和全设备登出。

---

## 主要变更

### 1. JWT Token 配置调整

**文件**: `app/config.py`

| 配置项 | v1.0.10 | v1.0.11 | 说明 |
|-------|---------|---------|------|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 10080（7天） | **30**（30分钟） | 大幅缩短，降低 Token 泄露风险 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 无 | **7**（7天） | 新增，Refresh Token 有效期 |

```python
# 修改前
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天

# 修改后
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30            # Access Token 有效期：30 分钟
REFRESH_TOKEN_EXPIRE_DAYS: int = 7               # Refresh Token 有效期：7 天
```

### 2. 新增 RefreshToken 数据模型

**文件**: `app/models.py`

新增 `refresh_tokens` 表，用于存储和管理 Refresh Token：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | Integer | 主键 |
| `user_id` | Integer (FK) | 关联用户，级联删除 |
| `token` | String(500) | Refresh Token 值，唯一索引 |
| `expires_at` | DateTime | 过期时间 |
| `revoked` | Boolean | 是否已吊销（默认 False） |
| `created_at` | DateTime | 创建时间 |

### 3. 新增请求/响应模型

**文件**: `app/schemas.py`

| 模型 | 用途 |
|-----|------|
| `TokenPair` | 双 Token 响应（access_token + refresh_token + expires_in） |
| `RefreshTokenRequest` | 刷新 Token / 登出请求体 |

```python
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Access Token 有效期（秒）

class RefreshTokenRequest(BaseModel):
    refresh_token: str
```

### 4. 认证模块重构

**文件**: `app/auth.py`

新增 5 个函数：

| 函数 | 说明 |
|-----|------|
| `create_refresh_token()` | 生成 Refresh Token（JWT，type="refresh"） |
| `save_refresh_token()` | 保存 Refresh Token 到数据库 |
| `verify_refresh_token()` | 验证 Refresh Token（JWT 解码 + 数据库校验 + 过期检查） |
| `revoke_refresh_token()` | 吊销指定 Refresh Token |
| `revoke_all_refresh_tokens()` | 吊销用户所有 Refresh Token |

**Token 类型区分**：

Access Token 和 Refresh Token 均为 JWT，通过 `type` 字段区分：

```python
# Access Token payload
{"sub": "1", "type": "access", "exp": 1700000000}

# Refresh Token payload
{"sub": "1", "type": "refresh", "exp": 1700604800}
```

### 5. 认证路由更新

**文件**: `app/routers/auth_router.py`

#### 5.1 登录接口变更

| 项目 | v1.0.10 | v1.0.11 |
|-----|---------|---------|
| 路径 | `POST /auth/login` | `POST /auth/login`（不变） |
| 响应模型 | `Token` | `TokenPair` |
| 返回字段 | `access_token`, `token_type` | `access_token`, `refresh_token`, `token_type`, `expires_in` |

**响应示例**：
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 1800
}
```

#### 5.2 新增接口

| 接口 | 方法 | 说明 | 认证 |
|-----|------|------|------|
| `/auth/refresh` | POST | 使用 Refresh Token 刷新双 Token | 无需 |
| `/auth/logout` | POST | 登出当前设备（吊销指定 Refresh Token） | 无需 |
| `/auth/logout-all` | POST | 登出所有设备（吊销所有 Refresh Token） | 需要 Access Token |

**POST /auth/refresh**：
```json
// 请求
{"refresh_token": "eyJhbGciOiJIUzI1NiJ9..."}

// 响应
{
    "access_token": "新的 access_token",
    "refresh_token": "新的 refresh_token",
    "token_type": "bearer",
    "expires_in": 1800
}
```

**POST /auth/logout**：
```json
// 请求
{"refresh_token": "eyJhbGciOiJIUzI1NiJ9..."}

// 响应
{"msg": "登出成功"}
```

**POST /auth/logout-all**：
```json
// 响应（需要 Authorization: Bearer <access_token>）
{"msg": "已登出所有设备，共吊销 3 个 Refresh Token"}
```

#### 5.3 密码重置安全增强

`POST /auth/reset-password` 新增安全措施：密码重置成功后**自动吊销该用户的所有 Refresh Token**，防止旧 Token 被滥用。

### 6. 版本号更新

**文件**: `app/main.py`

- 版本号: `1.0.10` → `1.0.11`

---

## 双 Token 工作流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  登录    │────>│ 返回双    │────>│ 前端保存  │
│ /login   │     │ Token    │     │ 两个Token │
└──────────┘     └──────────┘     └──────────┘
                                        │
                    ┌───────────────────┤
                    │                   │
              ┌─────▼─────┐     ┌──────▼──────┐
              │ 正常请求   │     │ Access Token │
              │ 携带       │     │ 过期         │
              │ Access     │     └──────┬──────┘
              │ Token      │            │
              └─────┬─────┘     ┌──────▼──────┐
                    │           │ /auth/refresh│
                    │           │ 携带Refresh  │
                    │           │ Token        │
                    │           └──────┬──────┘
                    │                  │
              ┌─────▼──────────────────▼─────┐
              │    获取新的双 Token            │
              │    旧 Refresh Token 被吊销     │
              └──────────────────────────────┘
```

---

## 前端对接指南

### 登录

```javascript
const response = await fetch('/auth/login', {
    method: 'POST',
    body: new URLSearchParams({
        username: 'user1',
        password: 'password123'
    })
});
const { access_token, refresh_token, expires_in } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### 请求拦截（自动刷新）

```javascript
async function fetchWithAuth(url, options) {
    let accessToken = localStorage.getItem('access_token');
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    // Access Token 过期，自动刷新
    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');
        const refreshRes = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            localStorage.setItem('access_token', tokens.access_token);
            localStorage.setItem('refresh_token', tokens.refresh_token);

            // 用新 Token 重试原请求
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${tokens.access_token}`
                }
            });
        } else {
            // Refresh Token 也过期，跳转登录
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        }
    }
    return response;
}
```

### 登出

```javascript
// 登出当前设备
await fetch('/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: localStorage.getItem('refresh_token') })
});
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

---

## 与 v1.0.10 的对比

| 特性 | v1.0.10 | v1.0.11 |
|-----|---------|---------|
| Token 类型 | 单 Token | 双 Token（Access + Refresh） |
| Access Token 有效期 | 7 天 | 30 分钟 |
| Token 刷新 | 不支持 | 支持（/auth/refresh） |
| 登出 | 不支持 | 支持（单设备 + 全设备） |
| Token 吊销 | 不支持 | 支持（数据库级管理） |
| 密码重置安全 | 无额外措施 | 自动吊销所有 Refresh Token |
| Token 类型区分 | 无 | JWT payload 中 type 字段区分 |
| 新增数据表 | 无 | refresh_tokens |

---

## 环境配置

```bash
# .env
ACCESS_TOKEN_EXPIRE_MINUTES=30    # Access Token 有效期（分钟）
REFRESH_TOKEN_EXPIRE_DAYS=7       # Refresh Token 有效期（天）
```

---

## 版本信息

- **版本号**: 1.0.11
- **发布日期**: 2026-05-12
- **主要功能**: 双 Token 认证机制（Access Token + Refresh Token）
