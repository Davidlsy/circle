# 版本更新日志 v1.0.16

## 概述

本版本引入了 Repository 层，实现了标准的三层架构（Router → Service → Repository → Model），实现了关注点分离，提升了代码的可测试性和可维护性。

---

## 主要变更

### 1. 新增 Repository 层目录结构

```
app/
├── repositories/
│   ├── __init__.py          # 入口文件
│   ├── base.py              # BaseRepository 基类
│   ├── user_repository.py   # 用户数据访问
│   ├── post_repository.py   # 帖子数据访问
│   ├── comment_repository.py # 评论数据访问
│   ├── follow_repository.py  # 关注关系数据访问
│   └── message_repository.py # 私信数据访问
```

### 2. BaseRepository 基类

**文件**: `app/repositories/base.py`

提供通用的 CRUD 操作：

| 方法 | 说明 |
|-----|------|
| `get_by_id(id)` | 根据 ID 获取记录 |
| `get_all(skip, limit)` | 分页获取所有记录 |
| `count()` | 统计记录总数 |
| `exists(**filters)` | 检查记录是否存在 |
| `create(**kwargs)` | 创建记录 |
| `update(instance, **kwargs)` | 更新记录 |
| `delete(instance)` | 删除记录 |
| `save(instance)` | 保存实例 |
| `first(**filters)` | 根据条件获取第一条 |

### 3. 各模块 Repository

#### UserRepository

| 方法 | 说明 |
|-----|------|
| `get_by_username(username)` | 根据用户名获取用户 |
| `get_by_email(email)` | 根据邮箱获取用户 |
| `get_by_phone(phone)` | 根据手机号获取用户 |
| `get_by_username_or_email(username_or_email)` | 用户名或邮箱登录 |
| `exists_by_username/email/phone()` | 检查唯一性 |
| `exists_other_with_email/phone(user_id, value)` | 检查排除自身的唯一性 |

#### PostRepository

| 方法 | 说明 |
|-----|------|
| `get_published_posts(skip, limit, author_id)` | 获取已发布帖子 |
| `get_posts_with_auth(...)` | 获取帖子（考虑权限） |
| `get_by_author(author_id, skip, limit)` | 获取作者帖子 |
| `get_pending_posts(skip, limit)` | 获取待审核帖子 |
| `increment_view_count(post)` | 增加浏览量 |
| `count_likes/comments/collections(post_id)` | 统计数量 |
| `get_max_image_order(post_id)` | 获取最大图片顺序 |

#### FollowRepository

| 方法 | 说明 |
|-----|------|
| `is_following(follower_id, following_id)` | 检查关注关系 |
| `get_follower_ids(user_id)` | 获取粉丝 ID 列表 |
| `get_following_ids(user_id)` | 获取关注 ID 列表 |
| `count_followers/following(user_id)` | 统计数量 |
| `get_followers(user_id, skip, limit)` | 获取粉丝列表 |
| `get_following(user_id, skip, limit)` | 获取关注列表 |
| `get_mutual_followers(user_id, skip, limit)` | 获取互关好友 |
| `delete_relation(follower_id, following_id)` | 删除关注关系 |
| `create_relation(follower_id, following_id)` | 创建关注关系 |

#### CommentRepository

| 方法 | 说明 |
|-----|------|
| `get_by_post(post_id, skip, limit)` | 获取帖子评论 |
| `get_pending_comments(skip, limit)` | 获取待审核评论 |
| `get_by_post_and_parent(post_id, parent_id)` | 获取回复列表 |

#### MessageRepository

| 方法 | 说明 |
|-----|------|
| `get_conversation_between_users(u1, u2)` | 查找会话 |
| `get_or_create_conversation(u1, u2)` | 获取或创建会话 |
| `get_user_conversations(user_id)` | 获取用户会话列表 |
| `get_messages_in_conversation(conv_id, skip, limit)` | 获取消息列表 |
| `get_last_message(conv_id)` | 获取最后一条消息 |
| `count_unread_in_conversation(conv_id, user_id)` | 统计未读数 |
| `mark_all_as_read_in_conversation(conv_id, user_id)` | 标记已读 |
| `create_message(conv_id, sender_id, content)` | 创建消息 |

### 4. 架构改进

```
改进前：
┌─────────────────────────────────────────────────┐
│                   Router 层                       │
│        调用 ORM 直接查询数据库（耦合）              │
└─────────────────────────────────────────────────┘

改进后：
┌─────────────────────────────────────────────────┐
│                   Router 层                       │
│        调用 Service 层处理业务逻辑                │
├─────────────────────────────────────────────────┤
│                   Service 层                      │
│        调用 Repository 层处理数据访问              │
├─────────────────────────────────────────────────┤
│                  Repository 层                   │
│        封装数据访问逻辑，提供清晰接口              │
├─────────────────────────────────────────────────┤
│                   Model 层                        │
│        SQLAlchemy 模型定义                       │
└─────────────────────────────────────────────────┘
```

### 5. 分层职责

| 层级 | 职责 | 依赖 |
|-----|------|-----|
| **Router** | HTTP 请求处理、参数验证、响应格式化 | Service |
| **Service** | 业务逻辑、事务管理、权限校验 | Repository |
| **Repository** | 数据访问、CRUD 操作、复杂查询 | Model |
| **Model** | 数据库表结构定义 | - |

### 6. 依赖注入示例

```python
# Service 中注入 Repository
class UserService(BaseService[User]):
    def __init__(self, db: Session):
        super().__init__(db, User)
        self.user_repo = UserRepository(db)
        self.follow_repo = FollowRepository(db)

    def get_profile(self, user_id: int):
        user = self.user_repo.get_by_id(user_id)
        if not user:
            return None
        follower_count = self.follow_repo.count_followers(user_id)
        # ...
```

### 7. 代码统计

| 类型 | 数量 |
|-----|------|
| 新增文件 | 6 个 |
| 修改文件 | 3 个（auth_service.py, user_service.py, main.py） |
| Repository 类 | 5 个 |
| BaseRepository 方法 | 9 个 |
| Repository 专用方法 | 约 30 个 |

### 8. 与 v1.0.12 的 Service 层对比

| 项目 | v1.0.12 | v1.0.16 |
|-----|--------|---------|
| 分层 | Router → Service → Model | Router → Service → Repository → Model |
| 数据访问 | Service 直接调用 ORM | Service 通过 Repository 调用 ORM |
| 可测试性 | 中等（需 mock ORM） | 高（可独立测试 Repository） |
| 可维护性 | 好 | 更好（关注点分离） |

---

## 版本信息

- **版本号**: 1.0.16
- **发布日期**: 2026-05-13
- **主要功能**: 引入 Repository 层
- **新增文件**: 6 个 (`app/repositories/`)
- **修改文件**: 3 个
- **架构改进**: 实现 Router → Service → Repository → Model 分层
