# 粉丝社群平台 - 变更日志 / CHANGELOG

---

## v1.0.4 - 代码清理：移除 /auth/me 空实现

> **版本：** v1.0.4
> **日期：** 2026-05-12
> **功能：** 代码清理
> **问题类型：** 代码缺陷（P1）

---

## 一、问题背景

在 v1.0.3 及之前版本中，`app/routers/auth_router.py` 存在一个 `/auth/me` 接口的空实现：

```python
@router.get("/me", response_model=UserPublic)
def get_me(db: Session = Depends(get_db)):
    """
    获取当前用户信息（需要 token）
    """
    pass  # 实际由 Depends(get_current_user) 处理，见 main.py
```

该接口存在以下问题：

1. **空实现（pass）**：函数体只有 `pass`，调用时不会执行任何逻辑，也不会返回用户信息
2. **误导性**：注释声称"实际由 Depends(get_current_user) 处理"，但函数参数中并未声明该依赖
3. **与正确实现冲突**：`follow_router.py` 中已有功能完整的 `GET /users/me` 接口，该空实现会造成混淆
4. **Swagger 文档污染**：空接口会出现在 Swagger UI 文档中，误导前端开发者

---

## 二、修改内容

### 1. `app/routers/auth_router.py` - 删除空实现

**删除代码：**
```python
@router.get("/me", response_model=UserPublic)
def get_me(db: Session = Depends(get_db)):
    """
    获取当前用户信息（需要 token）
    """
    pass  # 实际由 Depends(get_current_user) 处理，见 main.py
```

**说明：** 该接口被完整删除，不再出现在 `/auth` 路由组中。

---

### 2. `app/main.py` - 版本号更新

API 版本号从 `1.0.3` 升级到 `1.0.4`。

---

## 三、替代方案

获取当前用户信息的正确接口已存在于 `follow_router.py` 中：

| 接口 | 说明 |
|------|------|
| `GET /users/me` | 获取当前登录用户的个人资料（含粉丝数/关注数） |
| `PATCH /users/me` | 编辑当前用户的个人资料 |

该接口功能完整，包含认证依赖和实际业务逻辑：

```python
# app/routers/follow_router.py
@router.get("/me", response_model=UserProfile)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取当前登录用户的个人资料（含粉丝数/关注数）"""
    follower_count, following_count = _get_counts(db, current_user.id)
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        ...
        follower_count=follower_count,
        following_count=following_count
    )
```

---

## 四、影响分析

| 影响项 | 说明 |
|--------|------|
| API 版本 | 从 1.0.3 升级到 1.0.4 |
| 删除接口 | `GET /auth/me`（空实现，无实际功能） |
| 替代接口 | `GET /users/me`（功能完整） |
| 向后兼容 | ⚠️ 如果有前端调用了 `/auth/me`，需改为 `/users/me` |
| Swagger 文档 | `/auth/me` 不再出现在文档中 |

---

## 五、迁移指南

如果前端代码中调用了 `/auth/me`，请替换为 `/users/me`：

**修改前：**
```javascript
// ❌ 已移除
const response = await fetch('/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**修改后：**
```javascript
// ✅ 使用正确接口
const response = await fetch('/users/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**注意：** 响应格式可能存在差异，`/users/me` 返回 `UserProfile`（含 `follower_count` 和 `following_count`），比原来的 `UserPublic` 信息更丰富。

---

## 六、测试验证

1. **确认 `/auth/me` 已移除**
   ```bash
   curl -X GET http://localhost:8000/auth/me
   # 应返回 404 Not Found
   ```

2. **确认 `/users/me` 正常工作**
   ```bash
   curl -X GET http://localhost:8000/users/me \
     -H "Authorization: Bearer <token>"
   # 应返回用户信息（含 follower_count、following_count）
   ```

3. **确认 Swagger 文档中不再显示 `/auth/me`**
   - 访问 `http://localhost:8000/docs`
   - 在 `/auth` 分组中不应看到 `/auth/me` 接口

---

## 七、相关文件

| 文件 | 变更 |
|------|------|
| `app/routers/auth_router.py` | 删除 `/auth/me` 空实现 |
| `app/main.py` | 版本号更新为 1.0.4 |

---

---

# 历史版本

## v1.0.3 - CORS 安全加固 & Bug 修复

> **版本：** v1.0.3
> **日期：** 2026-05-12
> **功能：** CORS 安全加固 + 点赞/收藏状态 Bug 修复

### 修改内容
- 新增 `CORS_ORIGINS` 环境变量配置，CORS 从 `allow_origins=["*"]` 改为具体域名限制
- 修复 `GET /posts/{id}` 中 `is_liked`/`is_collected` 始终为 `False` 的 Bug
- 修复 `GET /posts/` 中 `collection_count` 始终为 `0` 的 Bug

---

## v1.0.2 - 用户资料功能补丁

> **版本：** v1.0.2
> **日期：** 2026-04-17
> **功能：** 用户资料编辑功能

### 新增功能
- 用户可编辑个人资料（昵称、头像、简介、邮箱、手机号）
- `PATCH /users/me` 接口

---

## v1.0.1 - 用户资料功能补丁

> **版本：** v1.0.1
> **日期：** 2026-04-17
> **功能：** 用户资料功能补丁

---

## v1.0.0 - 内容审核功能

> **版本：** v1.0.0
> **日期：** 2026-04-17
> **功能：** 内容审核

### 新增功能
- 所有用户发布的内容（帖子、评论）默认进入待审核状态
- 管理员可对内容进行通过或驳回操作
- 新增 `/admin` 路由组，包含 9 个审核相关接口

### 数据模型变更
- `posts` 表新增 `status` 字段
- `comments` 表新增 `status` 字段
