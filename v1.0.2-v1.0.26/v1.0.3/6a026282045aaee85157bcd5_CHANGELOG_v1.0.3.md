# 粉丝社群平台 - 变更日志 / CHANGELOG

---

## v1.0.3 - Bug 修复：点赞/收藏状态判断

> **版本：** v1.0.3
> **日期：** 2026-05-12
> **功能：** 修复帖子点赞/收藏状态判断 Bug
> **问题类型：** 功能缺陷（P1）

---

## 一、问题背景

在 v1.0.2 及之前版本中，帖子相关的 API 接口存在以下 Bug：

1. **`GET /posts/{id}` 帖子详情**：`is_liked` 和 `is_collected` 始终返回 `False`，未根据当前登录用户判断
2. **`GET /posts/` 帖子列表**：`collection_count` 始终为 `0`，`is_collected` 始终为 `False`

这导致前端无法正确显示用户是否已点赞/收藏帖子，影响用户体验。

---

## 二、修复内容

### 1. `app/routers/post_router.py` - `get_post` 函数

**问题代码：**
```python
return PostDetail(
    ...
    is_liked=False,          # ❌ 始终为 False
    collection_count=collection_count,
    is_collected=False,      # ❌ 始终为 False
    ...
)
```

**修复后代码：**
```python
# 根据当前登录用户判断是否点赞/收藏
is_liked = False
is_collected = False
if current_user:
    is_liked = db.query(Like).filter(
        Like.post_id == post.id,
        Like.user_id == current_user.id
    ).first() is not None
    is_collected = db.query(Collection).filter(
        Collection.post_id == post.id,
        Collection.user_id == current_user.id
    ).first() is not None

return PostDetail(
    ...
    is_liked=is_liked,          # ✅ 根据实际状态返回
    collection_count=collection_count,
    is_collected=is_collected,  # ✅ 根据实际状态返回
    ...
)
```

---

### 2. `app/routers/post_router.py` - `list_posts` 函数

**问题代码：**
```python
post_details.append(PostDetail(
    ...
    collection_count=0,      # ❌ 始终为 0
    is_collected=False,      # ❌ 始终为 False
    ...
))
```

**修复后代码：**
```python
collection_count = db.query(func.count(Collection.id)).filter(Collection.post_id == p.id).scalar()

# 根据当前登录用户判断是否点赞/收藏
is_liked = False
is_collected = False
if current_user:
    is_liked = db.query(Like).filter(
        Like.post_id == p.id,
        Like.user_id == current_user.id
    ).first() is not None
    is_collected = db.query(Collection).filter(
        Collection.post_id == p.id,
        Collection.user_id == current_user.id
    ).first() is not None

post_details.append(PostDetail(
    ...
    collection_count=collection_count,  # ✅ 返回实际收藏数
    is_collected=is_collected,          # ✅ 根据实际状态返回
    ...
))
```

---

## 三、修复影响

| 接口 | 修复前 | 修复后 |
|------|--------|--------|
| `GET /posts/{id}` | `is_liked` 始终 `False` | 根据用户实际点赞状态返回 |
| `GET /posts/{id}` | `is_collected` 始终 `False` | 根据用户实际收藏状态返回 |
| `GET /posts/` | `collection_count` 始终 `0` | 返回实际收藏数量 |
| `GET /posts/` | `is_collected` 始终 `False` | 根据用户实际收藏状态返回 |

---

## 四、测试验证

修复后应验证以下场景：

1. **未登录用户访问帖子详情**
   - `is_liked` 应为 `False`
   - `is_collected` 应为 `False`

2. **已登录用户访问自己未点赞/收藏的帖子**
   - `is_liked` 应为 `False`
   - `is_collected` 应为 `False`

3. **已登录用户访问自己已点赞的帖子**
   - `is_liked` 应为 `True`
   - `like_count` 应包含该用户的点赞

4. **已登录用户访问自己已收藏的帖子**
   - `is_collected` 应为 `True`
   - `collection_count` 应包含该用户的收藏

5. **帖子列表分页**
   - 每篇帖子的 `collection_count` 显示正确
   - 当前用户已收藏的帖子 `is_collected` 为 `True`

---

## 五、API 响应示例

### 修复前（Bug）
```json
{
  "id": 1,
  "title": "测试帖子",
  "like_count": 5,
  "is_liked": false,        // ❌ 用户已点赞，但返回 false
  "collection_count": 0,    // ❌ 实际有 3 人收藏，但返回 0
  "is_collected": false     // ❌ 用户已收藏，但返回 false
}
```

### 修复后（正确）
```json
{
  "id": 1,
  "title": "测试帖子",
  "like_count": 5,
  "is_liked": true,         // ✅ 正确显示用户已点赞
  "collection_count": 3,    // ✅ 正确显示收藏数量
  "is_collected": true      // ✅ 正确显示用户已收藏
}
```

---

## 六、影响范围

| 影响项 | 说明 |
|--------|------|
| API 版本 | 保持 1.0.3（与 CORS 修复同版本） |
| 向后兼容 | ✅ 向后兼容，仅修复 Bug，无破坏性变更 |
| 前端适配 | 前端无需修改，修复后数据将正确显示 |
| 数据库 | 无需变更 |

---

## 七、相关文件

- `app/routers/post_router.py` - 主要修复文件

---

---

# 历史版本

## v1.0.3 - CORS 安全加固

> **版本：** v1.0.3
> **日期：** 2026-05-12
> **功能：** CORS 安全加固

### 修改内容
- 新增 `CORS_ORIGINS` 环境变量配置
- CORS 从 `allow_origins=["*"]` 改为具体域名限制
- 更新相关文档

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
