# 版本更新日志 v1.0.17

## 概述

本版本为所有 API 路由添加了 `/v1/` 前缀，实现了 API 版本控制，为后续版本迭代和兼容性维护奠定基础。

---

## 主要变更

### 1. API 版本控制

所有业务 API 路由统一添加 `/v1/` 前缀：

| 路由模块 | 原路径 | 新路径 |
|---------|-------|-------|
| 认证 | `/auth/*` | `/v1/auth/*` |
| 帖子 | `/posts/*` | `/v1/posts/*` |
| 关注 | `/users/*` | `/v1/users/*` |
| 私信 | `/messages/*` | `/v1/messages/*` |
| 动态流 | `/feed/*` | `/v1/feed/*` |
| 话题 | `/tags/*` | `/v1/tags/*` |
| 审核 | `/admin/*` | `/v1/admin/*` |

### 2. 代码变更

**文件**: `app/main.py`

```python
# 变更前
app.include_router(auth_router)
app.include_router(post_router)
app.include_router(follow_router)
...

# 变更后
app.include_router(auth_router, prefix="/v1")
app.include_router(post_router, prefix="/v1")
app.include_router(follow_router, prefix="/v1")
...
```

### 3. 保持不变的端点

以下端点不受影响，保持原有路径：

| 端点 | 路径 | 说明 |
|-----|------|------|
| 根路径 | `GET /` | 健康检查 |
| 健康检查 | `GET /health` | 服务状态检查 |
| 静态文件 | `GET /uploads/*` | 图片访问 |

### 4. API 路径对照表

#### 认证模块 `/v1/auth`

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/v1/auth/register` | 用户注册 |
| POST | `/v1/auth/login` | 用户登录 |
| POST | `/v1/auth/refresh` | 刷新 Token |
| POST | `/v1/auth/logout` | 登出 |
| POST | `/v1/auth/logout-all` | 登出所有设备 |
| POST | `/v1/auth/forgot-password` | 发起找回密码 |
| POST | `/v1/auth/reset-password` | 重置密码 |

#### 帖子模块 `/v1/posts`

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/v1/posts/` | 创建帖子 |
| GET | `/v1/posts/` | 帖子列表 |
| GET | `/v1/posts/{post_id}` | 帖子详情 |
| PUT | `/v1/posts/{post_id}` | 更新帖子 |
| DELETE | `/v1/posts/{post_id}` | 删除帖子 |
| POST | `/v1/posts/{post_id}/comments` | 评论帖子 |
| GET | `/v1/posts/{post_id}/comments` | 评论列表 |
| DELETE | `/v1/posts/{post_id}/comments/{comment_id}` | 删除评论 |
| POST | `/v1/posts/{post_id}/like` | 点赞/取消点赞 |
| POST | `/v1/posts/{post_id}/collect` | 收藏/取消收藏 |
| POST | `/v1/posts/{post_id}/images` | 上传图片 |
| GET | `/v1/posts/{post_id}/images` | 获取图片列表 |
| DELETE | `/v1/posts/{post_id}/images/{image_id}` | 删除图片 |

#### 关注模块 `/v1/users`

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | `/v1/users/me` | 获取当前用户资料 |
| PATCH | `/v1/users/me` | 更新当前用户资料 |
| GET | `/v1/users/{user_id}` | 获取用户资料 |
| POST | `/v1/users/{user_id}/follow` | 关注/取消关注 |
| GET | `/v1/users/{user_id}/follow/status` | 关注状态 |
| GET | `/v1/users/{user_id}/followers` | 粉丝列表 |
| GET | `/v1/users/{user_id}/following` | 关注列表 |
| GET | `/v1/users/me/friends` | 好友列表 |

#### 私信模块 `/v1/messages`

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/v1/messages/conversations` | 获取/创建会话 |
| GET | `/v1/messages/conversations` | 会话列表 |
| POST | `/v1/messages/conversations/{conv_id}/messages` | 发送消息 |
| GET | `/v1/messages/conversations/{conv_id}/messages` | 消息列表 |
| PUT | `/v1/messages/conversations/{conv_id}/read` | 标记已读 |
| GET | `/v1/messages/conversations/unread-count` | 未读总数 |

#### 动态流模块 `/v1/feed`

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | `/v1/feed/` | 获取关注用户动态 |

#### 话题模块 `/v1/tags`

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | `/v1/tags/` | 话题列表 |
| GET | `/v1/tags/search` | 搜索话题 |
| POST | `/v1/tags/` | 创建话题 |
| POST | `/v1/tags/posts/{post_id}` | 设置帖子标签 |
| GET | `/v1/tags/posts/{post_id}` | 获取帖子标签 |
| DELETE | `/v1/tags/posts/{post_id}/{tag_id}` | 移除帖子标签 |
| GET | `/v1/tags/{tag_id}/posts` | 话题下帖子列表 |

#### 审核模块 `/v1/admin`

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | `/v1/admin/posts/pending` | 待审核帖子 |
| GET | `/v1/admin/posts/rejected` | 已驳回帖子 |
| POST | `/v1/admin/posts/{post_id}/audit` | 审核帖子 |
| POST | `/v1/admin/posts/{post_id}/approve` | 通过帖子 |
| POST | `/v1/admin/posts/{post_id}/reject` | 驳回帖子 |
| GET | `/v1/admin/comments/pending` | 待审核评论 |
| POST | `/v1/admin/comments/{comment_id}/audit` | 审核评论 |
| POST | `/v1/admin/comments/{comment_id}/approve` | 通过评论 |
| POST | `/v1/admin/comments/{comment_id}/reject` | 驳回评论 |

### 5. 版本控制策略

#### 当前策略
- 所有 API 统一使用 `/v1/` 前缀
- 未来可通过 `/v2/` 等前缀实现不兼容的 API 变更

#### 推荐的 API 演进策略

| 场景 | 处理方式 |
|-----|---------|
| 新增端点 | 在当前版本中添加 |
| 新增字段 | 在响应中添加（向后兼容） |
| 修改字段语义 | 通过新版本 API |
| 删除端点/字段 | 通过新版本，过渡期两个版本共存 |

### 6. 迁移指南

前端需要将 API 路径从 `/auth/*` 变更为 `/v1/auth/*` 等。建议使用环境变量管理 API 基础路径：

```javascript
// 前端配置示例
const API_BASE = import.meta.env.VITE_API_BASE || '/v1';
// 登录请求
fetch(`${API_BASE}/auth/login`, { ... })
```

### 7. 注意事项

1. **Swagger 文档**：OpenAPI 文档将自动更新，显示新的 API 路径
2. **反向代理**：Nginx 等反向代理配置需要相应更新
3. **认证 Token**：Token 验证逻辑不受影响，无需修改
4. **CORS**：CORS 配置不受影响

---

## 版本信息

- **版本号**: 1.0.17
- **发布日期**: 2026-05-13
- **主要功能**: 添加 API 版本控制 `/v1/` 前缀
- **修改文件**: 1 个 (`app/main.py`)
- **影响路由**: 7 个模块，约 40 个 API 端点
