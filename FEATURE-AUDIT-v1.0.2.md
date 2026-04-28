# 功能审计报告

> **项目：** 粉丝社群平台后端
> **版本：** v1.0.2
> **审计日期：** 2026-04-17
> **状态：** 🟡 部分实现 / 🔴 缺陷 / 🟢 已实现

---

## 一、已实现功能总览

### 1.1 认证模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 注册 | POST | `/auth/register` | 🟢 |
| 登录 | POST | `/auth/login` | 🟢 |
| 发起找回密码 | POST | `/auth/forgot-password` | 🟢 |
| 重置密码 | POST | `/auth/reset-password` | 🟢 |
| 当前用户信息 | GET | `/auth/me` | 🟢 占位符（实际由 `/users/me` 提供） |

### 1.2 用户资料模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 获取本人资料（含粉丝/关注数） | GET | `/users/me` | 🟢 |
| 编辑本人资料 | PATCH | `/users/me` | 🟢 |
| 获取他人资料 | GET | `/users/{user_id}` | 🟢 |

### 1.3 帖子模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 创建帖子 | POST | `/posts/` | 🟢 |
| 帖子列表（分页+作者筛选） | GET | `/posts/` | 🟢 |
| 帖子详情 | GET | `/posts/{id}` | 🟢 |
| 更新帖子 | PUT | `/posts/{id}` | 🟡 缺陷（见二.1） |
| 删除帖子 | DELETE | `/posts/{id}` | 🟢 |
| 上传图片 | POST | `/posts/{id}/images` | 🟢 |
| 获取帖子图片 | GET | `/posts/{id}/images` | 🟢 |
| 删除单张图片 | DELETE | `/posts/images/{id}` | 🟢 |

### 1.4 评论模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 发表评论 | POST | `/posts/{id}/comments` | 🟢 |
| 评论列表（仅顶级+已审核） | GET | `/posts/{id}/comments` | 🟢 |
| 删除评论 | DELETE | `/posts/comments/{id}` | 🟢 |

### 1.5 互动模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 点赞/取消点赞 | POST | `/posts/{id}/like` | 🟢 |
| 收藏/取消收藏 | POST | `/posts/{id}/collect` | 🟢 |

### 1.6 关注模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 关注/取关 | POST | `/users/{id}/follow` | 🟢 |
| 关注关系 | GET | `/users/{id}/follow/status` | 🟢 |
| 粉丝列表 | GET | `/users/{id}/followers` | 🟢 |
| 关注列表 | GET | `/users/{id}/following` | 🟢 |
| 互关好友列表 | GET | `/users/me/friends` | 🟢 |

### 1.7 动态流

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 关注用户动态 | GET | `/feed/` | 🟢（有缺陷，见二.2） |

### 1.8 私信模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 发起/获取会话 | POST | `/messages/conversations` | 🟢 |
| 会话列表 | GET | `/messages/conversations` | 🟢 |
| 发送消息 | POST | `/messages/conversations/{id}/messages` | 🟢 |
| 消息列表 | GET | `/messages/conversations/{id}/messages` | 🟢 |
| 标记已读 | PUT | `/messages/conversations/{id}/read` | 🟢 |
| 未读消息总数 | GET | `/messages/conversations/unread-count` | 🟢（有缺陷，见二.3） |

### 1.9 话题/标签模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 话题列表 | GET | `/tags/` | 🟢 |
| 搜索话题 | GET | `/tags/search` | 🟢 |
| 创建话题 | POST | `/tags/` | 🟢 |
| 设置帖子标签 | POST | `/tags/posts/{post_id}` | 🟢 |
| 获取帖子标签 | GET | `/tags/posts/{post_id}` | 🟢 |
| 移除帖子标签 | DELETE | `/tags/posts/{post_id}/{tag_id}` | 🟢 |
| 话题下帖子列表 | GET | `/tags/{tag_id}/posts` | 🟢 |

### 1.10 内容审核模块

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 待审核帖子列表 | GET | `/admin/posts/pending` | 🟢 |
| 已驳回帖子列表 | GET | `/admin/posts/rejected` | 🟢 |
| 审核帖子 | POST | `/admin/posts/{id}/audit` | 🟢 |
| 快捷通过帖子 | POST | `/admin/posts/{id}/approve` | 🟢 |
| 快捷驳回帖子 | POST | `/admin/posts/{id}/reject` | 🟢 |
| 待审核评论列表 | GET | `/admin/comments/pending` | 🟢 |
| 审核评论 | POST | `/admin/comments/{id}/audit` | 🟢 |
| 快捷通过评论 | POST | `/admin/comments/{id}/approve` | 🟢 |
| 快捷驳回评论 | POST | `/admin/comments/{id}/reject` | 🟢 |

---

## 二、代码级缺陷（需修复）

### 🔴 缺陷 1：帖子详情 `is_liked` 硬编码为 False

**文件：** `app/routers/post_router.py`，`get_post` 函数，第 223 行

```python
return PostDetail(
    ...
    is_liked=False,   # ← 硬编码，未查数据库
    ...
    is_collected=False,  # ← 同上
```

**影响：** `GET /posts/{id}` 无论登录与否，`is_liked` 和 `is_collected` 永远为 False。已登录用户查看自己点赞过的帖子也会看到错误状态。

**对比：** `GET /posts/`（列表）中有正确逻辑，`feed_router.py` 也有正确逻辑，只有详情页这里漏了。

**修复：** 在 `get_post` 中，当 `current_user` 存在时，查询 `Like` 和 `Collection` 表获取真实状态。

---

### 🔴 缺陷 2：Feed 中 `collection_count` 硬编码为 0

**文件：** `app/routers/feed_router.py`，`_build_post_detail` 函数

```python
return PostDetail(
    ...
    collection_count=0,  # ← 硬编码，Feed 中永远显示 0
    ...
)
```

**影响：** 动态流中每条帖子的收藏数永远为 0，失去参考价值。

**修复：** 在 `_build_post_detail` 中，当 `current_user_id` 存在时同样查询 `Collection` 表获取真实收藏数。

---

### 🔴 缺陷 3：重置密码验证码匹配无用户限定（安全）

**文件：** `app/routers/auth_router.py`，`reset_password` 函数

```python
codes = db.query(VerificationCode).filter(
    VerificationCode.code != "------",
    VerificationCode.used == False,
    VerificationCode.expires_at > datetime.utcnow(),
    VerificationCode.purpose == "reset_password"
    # ↑ 缺少 email/phone 限定
).order_by(VerificationCode.created_at.desc()).all()

valid_code = None
for vc in codes:
    if verify_password(request.code, vc.code):
        valid_code = vc
        break
```

**问题：** 攻击者如果构造了一个和自己邮箱不同的 6 位数字验证码（在极短时间内猜中），系统会接受它来重置邮箱对应的用户密码——因为这里查的是所有未过期的验证码，不限定 `email`。

**修复：** `ForgotPasswordRequest` 需要同时接受 `username`（或 `email`），`reset_password` 接口应该按 `email + code` 联合查询，而不是遍历所有验证码。

---

### 🟡 缺陷 4：编辑帖子未重置审核状态

**文件：** `app/routers/post_router.py`，`update_post` 函数

**需求规范要求：** 编辑帖子后，`status` 应重置为 `pending`，需重新审核。

**实际行为：** `update_data = post_update.model_dump(exclude_unset=True)`，没有主动将 `post.status = "pending"`。且 `PostUpdate` schema 中没有 `status` 字段。

**修复：** 在 `update_post` 中，更新完成后添加 `post.status = "pending"`。

---

### 🟡 缺陷 5：互关好友查询逻辑冗余

**文件：** `app/routers/follow_router.py`，`list_friends` 函数

```python
following_ids_set = {f[0] for f in following_set}

mutual_query = db.query(Follow).filter(
    Follow.follower_id == current_user.id,
    Follow.following_id.in_(following_ids_set),
    # 第三个条件和第二个重复——A in list 且 A in (子查询) = A in list
    Follow.following_id.in_(
        db.query(Follow.follower_id).filter(Follow.following_id == current_user.id)
    )
)
```

第三个过滤条件与第二个冗余，实际结果正确但逻辑冗余，可简化为用 `INTERSECT` 或两步查询。

---

## 三、功能性缺失（需新增）

### 🟡 缺失 1：收藏列表查询

**需求：** 用户应能查看自己收藏的所有帖子（`GET /users/me/collections`）

**现状：** `CollectionList` schema 已定义，但没有任何 router 对应此接口。

---

### 🟡 缺失 2：帖子搜索

**需求：** 用户应能按关键词搜索帖子标题和内容。

**现状：** 完全缺失。

---

### 🟡 缺失 3：消息撤回

**需求：** 用户发送消息后应能撤回。

**现状：** 消息只有发送、已读，没有撤回接口。

---

### 🟡 缺失 4：编辑评论

**需求：** 评论作者应能编辑自己的评论内容。

**现状：** 有 `CommentUpdate` schema，但无对应 router 接口。

---

### 🟡 缺失 5：用户黑名单/拉黑

**需求：** 用户应能屏蔽他人，被屏蔽者不能给屏蔽者发私信或关注。

**现状：** 完全缺失。

---

### 🟡 缺失 6：帖子/用户举报

**需求：** 用户应能举报违规帖子或用户。

**现状：** 完全缺失。

---

### 🟡 缺失 7：通知系统

**需求：** 用户应收到点赞、评论、关注、私信等事件通知。

**现状：** 完全缺失。

---

### 🟡 缺失 8：帖子下所有评论（含子评论）

**现状：** `GET /posts/{id}/comments` 只返回顶级评论，`parent_id` 下的子评论需要前端自行递归请求，没有一次性返回整棵评论树的接口。

---

### 🟡 缺失 9：用户搜索

**需求：** 用户应能搜索其他用户（按用户名或昵称）。

**现状：** 完全缺失。

---

### 🟡 缺失 10：修改密码

**需求：** 已登录用户应能主动修改自己的密码（验证旧密码后修改，不依赖验证码）。

**现状：** 只有通过验证码重置，没有"修改密码"接口。

---

## 四、安全问题

### 🔴 安全 1：默认 JWT 密钥未更换

**文件：** `app/config.py`

```python
SECRET_KEY: str = "your-super-secret-key-change-in-production"
```

生产环境必须设置随机字符串，当前默认值任何人只要知道项目代码就能构造合法 JWT。

**修复：** 启动时检查是否为默认密钥，是则拒绝启动并报错。

---

### 🔴 安全 2：CORS 全开放

**文件：** `app/main.py`

```python
allow_origins=["*"]
```

允许任何来源的跨域请求，生产环境应限定具体域名。

---

### 🟡 安全 3：上传文件内容未校验

**文件：** `app/routers/post_router.py`，`_save_image_file`

```python
content = file.file.read()
if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
    raise HTTPException(...)
```

仅校验 MIME type，未校验文件真实内容（图片头），攻击者可上传恶意文件。

**修复：** 读取文件头（PNG/JPEG magic bytes）做二次校验。

---

## 五、性能问题

### 🟡 性能 1：N+1 查询——未读消息总数

**文件：** `app/routers/message_router.py`，`total_unread_count`

```python
Message.conversation_id.in_(
    db.query(Conversation.id).filter(Conversation.user1_id == current_user.id)
),
Message.conversation_id.in_(
    db.query(Conversation.id).filter(Conversation.user2_id == current_user.id)
)
```

两次子查询，结果取并集，低效。应合并为一次查询。

---

### 🟡 性能 2：Feed 翻页不感知新增关注

**文件：** `app/routers/feed_router.py`

Feed 使用 `OFFSET` 分页，用户在第 2 页时关注了新用户，新用户发布的帖子不会出现在已加载的 Feed 中——体验问题，不算 bug，但建议后续改为 `cursor-based` 分页。

---

## 六、待办优先级建议

### P0（必须修复，影响功能正确性）

1. 🔴 帖子详情 `is_liked`/`is_collected` 硬编码为 False
2. 🔴 Feed 中 `collection_count` 硬编码为 0
3. 🔴 重置密码验证码无用户限定（安全漏洞）
4. 🔴 默认 JWT 密钥需强制更换

### P1（应修复，影响业务流程）

5. 🟡 编辑帖子后未重置 `status` 为 `pending`
6. 🟡 新增 `GET /users/me/collections`（收藏列表）
7. 🟡 新增帖子搜索 `GET /posts/search`
8. 🟡 新增评论编辑 `PATCH /posts/comments/{id}`
9. 🟡 新增修改密码 `POST /auth/change-password`
10. 🟡 CORS 生产环境配置

### P2（建议修复，体验优化）

11. 🟡 消息撤回 `DELETE /messages/conversations/{id}/messages/{id}`
12. 🟡 用户搜索 `GET /users/search?q=`
13. 🟡 全局评论树接口（一次性返回完整评论树）
14. 🟡 上传文件 MIME+真实内容双重校验
15. 🟡 N+1 查询优化（未读消息总数）
16. 🟡 互关好友查询逻辑简化

### P3（后续版本规划）

17. 🔵 用户黑名单/拉黑
18. 🔵 内容举报
19. 🔵 通知系统
20. 🔵 Feed cursor 分页

---

*审计版本：v1.0.2 | 报告日期：2026-04-17*
