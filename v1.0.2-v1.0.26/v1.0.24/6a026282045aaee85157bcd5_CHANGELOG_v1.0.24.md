# FanCommunity 后端 v1.0.24 更新日志

## 版本信息
- **版本号**: v1.0.24
- **更新日期**: 2026-05-13
- **更新类型**: 安全修复

## 更新概述
本次更新修复了 **验证码暴力破解风险** 安全漏洞。通过添加请求限流和错误次数限制，有效防止攻击者通过暴力枚举 6 位数字验证码来重置用户密码。

---

## 安全漏洞说明

### 漏洞详情
- **漏洞类型**: 暴力破解（Brute Force Attack）
- **风险等级**: 🔴 高危
- **CVE 参考**: 类似 OWASP A07:2021 - Identification and Authentication Failures

### 原有问题
```python
# 旧代码：无请求限制，无错误次数限制
@router.post("/reset-password", response_model=Msg)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    codes = db.query(VerificationCode).filter(...).all()
    for vc in codes:
        if verify_password(request.code, vc.code):  # 无限流，无次数限制
            ...
```

**风险分析**:
- 6 位数字验证码只有 **1,000,000 种组合**（000000-999999）
- 无请求频率限制，攻击者可每秒尝试数千次
- 无错误次数限制，可无限尝试直到成功
- 预估破解时间：**几分钟内**即可暴力破解成功

---

## 详细修改内容

### 1. 添加请求限流

使用 slowapi 为敏感接口添加基于 IP 的请求限流：

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

# 获取 limiter 实例
def get_limiter(request: Request) -> Limiter:
    return request.app.state.limiter

# 为各接口添加限流装饰器
@router.post("/register")
@get_limiter.limit("5/minute")  # 注册：每分钟最多 5 次
def register(...): ...

@router.post("/login")
@get_limiter.limit("10/minute")  # 登录：每分钟最多 10 次
def login(...): ...

@router.post("/forgot-password")
@get_limiter.limit("3/minute")  # 获取验证码：每分钟最多 3 次
def forgot_password(...): ...

@router.post("/reset-password")
@get_limiter.limit("5/minute")  # 重置密码：每分钟最多 5 次
def reset_password(...): ...

@router.post("/verify-code")
@get_limiter.limit("10/minute")  # 验证验证码：每分钟最多 10 次
def verify_code(...): ...
```

### 2. 添加错误次数限制

使用缓存记录每个邮箱的验证码错误尝试次数：

```python
# 安全配置
MAX_VERIFY_ATTEMPTS = 5           # 单个验证码最大尝试次数
VERIFY_ATTEMPT_TTL = 900          # 尝试次数记录有效期（秒），15分钟

def _get_verify_attempt_key(email: str) -> str:
    """获取验证码尝试次数的缓存键"""
    return f"verify_attempts:{email}"

def _increment_verify_attempts(email: str) -> int:
    """增加验证码尝试次数，返回当前次数"""
    key = _get_verify_attempt_key(email)
    current = cache.get(key) or 0
    new_count = current + 1
    cache.set(key, new_count, ttl=VERIFY_ATTEMPT_TTL)
    return new_count

def _get_verify_attempts(email: str) -> int:
    """获取当前验证码尝试次数"""
    key = _get_verify_attempt_key(email)
    return cache.get(key) or 0

def _reset_verify_attempts(email: str):
    """重置验证码尝试次数"""
    key = _get_verify_attempt_key(email)
    cache.delete(key)
```

### 3. 重置密码接口安全增强

```python
@router.post("/reset-password", response_model=Msg)
@get_limiter.limit("5/minute")  # 限流：每分钟最多 5 次
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    # ... 验证验证码 ...
    
    # 检查错误尝试次数
    attempts = _get_verify_attempts(target_email)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        # 超过最大尝试次数，作废验证码
        valid_code.used = True
        db.commit()
        _reset_verify_attempts(target_email)
        raise HTTPException(
            status_code=400,
            detail=f"验证码错误次数过多（{MAX_VERIFY_ATTEMPTS}次），请重新获取验证码"
        )
    
    # ... 更新密码 ...
    
    # 清除验证码尝试次数
    _reset_verify_attempts(target_email)
```

### 4. 新增验证码验证接口

```python
@router.post("/verify-code")
@get_limiter.limit("10/minute")  # 限流：每分钟最多 10 次
def verify_code(email: str, code: str, purpose: str = "reset_password", db: Session = Depends(get_db)):
    """验证验证码（通用接口）"""
    # 检查错误尝试次数
    attempts = _get_verify_attempts(email)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"验证码错误次数过多（{MAX_VERIFY_ATTEMPTS}次），请重新获取验证码"
        )
    
    # 验证失败时增加尝试次数
    if not verify_password(code, vc.code):
        new_attempts = _increment_verify_attempts(email)
        remaining = MAX_VERIFY_ATTEMPTS - new_attempts
        raise HTTPException(
            status_code=400,
            detail=f"验证码错误，剩余尝试次数：{remaining}"
        )
    
    # 验证成功，重置尝试次数
    _reset_verify_attempts(email)
    return {"valid": True, "message": "验证码验证成功"}
```

---

## 安全措施总结

| 接口 | 限流策略 | 错误次数限制 | 说明 |
|------|----------|--------------|------|
| `/auth/register` | 5次/分钟 | - | 防止批量注册 |
| `/auth/login` | 10次/分钟 | - | 防止暴力破解密码 |
| `/auth/forgot-password` | 3次/分钟 | - | 防止滥用获取验证码 |
| `/auth/reset-password` | 5次/分钟 | 5次/验证码 | 防止暴力破解验证码 |
| `/auth/verify-code` | 10次/分钟 | 5次/邮箱 | 通用验证码验证 |

---

## 攻击场景分析

### 场景 1：单 IP 暴力破解

**攻击方式**: 攻击者从单一 IP 尝试枚举验证码

**防御效果**:
- 限流 5次/分钟 → 每分钟最多尝试 5 次
- 错误次数限制 5 次 → 5 次错误后验证码作废
- **破解概率**: 从 ~100% 降低到 **0.0005%**（5/1,000,000）

### 场景 2：多 IP 分布式攻击

**攻击方式**: 攻击者使用多个代理 IP 同时攻击

**防御效果**:
- 每个 IP 限流 5次/分钟
- 错误次数限制基于邮箱，跨 IP 共享
- 5 次错误后验证码作废，需重新获取
- 获取验证码限流 3次/分钟，增加攻击成本

### 场景 3：验证码重放攻击

**攻击方式**: 攻击者截获验证码后多次尝试

**防御效果**:
- 验证码一次性使用
- 使用后立即标记 `used=True`
- 无法重复使用同一验证码

---

## 错误响应示例

### 超过限流阈值

```json
{
  "error": "Rate limit exceeded: 5 per 1 minute"
}
```
- HTTP 状态码: 429 Too Many Requests
- 响应头: `Retry-After: 60`

### 超过错误次数限制

```json
{
  "detail": "验证码错误次数过多（5次），请重新获取验证码"
}
```
- HTTP 状态码: 400 Bad Request
- 验证码自动作废，需重新获取

### 验证码错误（剩余次数提示）

```json
{
  "detail": "验证码错误，剩余尝试次数：3"
}
```
- HTTP 状态码: 400 Bad Request
- 提示剩余尝试次数，提升用户体验

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `app/routers/auth_router.py` | 修改 | 添加限流装饰器、错误次数限制逻辑、验证码验证接口 |
| `app/main.py` | 修改 | 版本号更新为 1.0.24 |

---

## 安全最佳实践

### ✅ 已实现
- [x] 请求限流（基于 IP）
- [x] 错误次数限制（基于邮箱）
- [x] 验证码一次性使用
- [x] 验证码有效期限制（15 分钟）
- [x] 验证码哈希存储（bcrypt）
- [x] 防止用户枚举攻击（统一响应）

### 🔄 建议增强
- [ ] 验证码复杂度提升（字母+数字，6位 → 8位）
- [ ] 多因素认证（短信/邮件验证）
- [ ] 设备指纹识别
- [ ] 行为分析（异常请求检测）

---

## 后续安全建议

1. **验证码复杂度**: 将纯数字验证码改为字母+数字组合，增加熵值
2. **发送频率限制**: 同一邮箱/手机号发送验证码间隔至少 60 秒
3. **验证码长度**: 从 6 位增加到 8 位，组合空间从 100 万增加到 1 亿
4. **日志监控**: 记录验证码验证失败事件，触发告警
5. **CAPTCHA**: 在获取验证码前增加图形验证码，防止自动化攻击

---

**版本**: v1.0.24  
**更新者**: Code Assistant  
**更新时间**: 2026-05-13
