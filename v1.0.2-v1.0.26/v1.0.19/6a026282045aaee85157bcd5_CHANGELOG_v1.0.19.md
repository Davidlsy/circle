# FanCommunity 后端 v1.0.19 更新日志

## 版本信息
- **版本号**: v1.0.19
- **更新日期**: 2026-05-13
- **更新类型**: 功能增强

## 更新概述
本次更新集成了 **slowapi** 请求限流中间件，为 API 端点添加了基于 IP 地址的请求频率限制，有效防止恶意刷接口和滥用行为，提升系统稳定性和安全性。

---

## 详细修改内容

### 1. 新增依赖

**文件**: `requirements.txt`

```diff
+ slowapi==0.1.9
```

- 添加 slowapi 库用于请求限流
- slowapi 基于 Redis 或内存存储实现滑动窗口限流算法

### 2. 集成限流中间件

**文件**: `app/main.py`

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 初始化限流器
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**配置说明**:
- `key_func`: 使用客户端 IP 地址作为限流键
- `default_limits`: 全局默认限制为每分钟 100 次请求
- 异常处理: 当请求超出限制时返回 429 Too Many Requests

### 3. 认证端点限流配置

**文件**: `app/routers/auth_router.py`

| 端点 | 限流策略 | 说明 |
|------|----------|------|
| `POST /auth/register` | 5/分钟 | 用户注册，防止批量注册 |
| `POST /auth/login` | 10/分钟 | 用户登录，防止暴力破解 |
| `POST /auth/refresh` | 20/分钟 | Token 刷新，允许较高频率 |
| `POST /auth/forgot-password` | 3/分钟 | 找回密码，严格限制防止滥用 |
| `POST /auth/reset-password` | 5/分钟 | 重置密码，适度限制 |

**代码示例**:
```python
@router.post("/login", response_model=TokenPair)
@get_limiter.limit("10/minute")  # 登录限流
def login(...):
    ...
```

### 4. 帖子端点限流配置

**文件**: `app/routers/post_router.py`

| 端点 | 限流策略 | 说明 |
|------|----------|------|
| `POST /posts/` | 10/分钟 | 创建帖子，防止刷屏 |
| `POST /posts/{id}/comments` | 20/分钟 | 发表评论，允许较频繁互动 |
| `POST /posts/{id}/like` | 30/分钟 | 点赞操作，高频交互场景 |
| `POST /posts/{id}/collect` | 20/分钟 | 收藏操作 |
| `POST /posts/{id}/images` | 10/分钟 | 图片上传，防止资源滥用 |

**代码示例**:
```python
@router.post("/{post_id}/like", response_model=LikeResponse)
@get_limiter.limit("30/minute")  # 点赞限流
def toggle_like(...):
    ...
```

### 5. 限流工具函数

**文件**: `app/routers/auth_router.py` / `app/routers/post_router.py`

```python
from slowapi import Limiter
from fastapi import Request

# 获取 limiter 实例的辅助函数
def get_limiter(request: Request) -> Limiter:
    return request.app.state.limiter
```

---

## 限流策略设计原则

1. **认证相关端点**: 采用较严格的限流策略，防止暴力破解和滥用
2. **内容创建端点**: 适度限制，防止刷屏但保证正常用户体验
3. **高频交互端点**（点赞）: 允许较高频率，满足用户快速操作需求
4. **资源消耗端点**（图片上传）: 严格限制，防止存储资源滥用

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端请求                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI 应用入口                          │
│              (Limiter 中间件拦截请求)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   slowapi 限流检查                           │
│         - 提取客户端 IP (get_remote_address)                │
│         - 检查请求频率是否超过阈值                           │
│         - 超限返回 429 错误                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    正常执行业务逻辑                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 错误响应

当请求超出限流阈值时，API 返回以下响应：

```json
{
  "error": "Rate limit exceeded: 10 per 1 minute"
}
```

- **HTTP 状态码**: 429 Too Many Requests
- **响应头**: `Retry-After: 60` (建议等待秒数)

---

## 后续优化建议

1. **Redis 后端**: 生产环境建议使用 Redis 作为限流存储，支持分布式部署
2. **用户级限流**: 对登录用户可基于 user_id 而非 IP 进行限流
3. **动态限流**: 根据用户等级/VIP 状态调整限流阈值
4. **限流监控**: 添加限流触发监控告警，及时发现异常流量

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `requirements.txt` | 修改 | 添加 slowapi 依赖 |
| `app/main.py` | 修改 | 集成限流中间件 |
| `app/routers/auth_router.py` | 修改 | 添加认证端点限流装饰器 |
| `app/routers/post_router.py` | 修改 | 添加帖子端点限流装饰器 |

---

## 测试建议

1. 使用 `ab` 或 `wrk` 工具进行压力测试，验证限流是否生效
2. 测试不同端点的限流阈值是否符合预期
3. 验证限流触发后的错误响应格式
4. 测试多 IP 场景下的限流隔离性

---

**版本**: v1.0.19  
**更新者**: Code Assistant  
**更新时间**: 2026-05-13
