# 版本更新日志 v1.0.12

## 概述

本版本引入了 **Service 层**，将业务逻辑从路由中抽离，实现了清晰的分层架构（Router → Service → Model）。这是代码架构的重要改进，显著提升了代码的可维护性、可测试性和可复用性。

---

## 主要变更

### 1. 新增 Service 层目录结构

```
app/
├── services/
│   ├── __init__.py          # Service 层入口，导出所有服务
│   ├── base.py              # Service 基类，提供通用 CRUD 操作
│   ├── auth_service.py      # 认证服务（注册/登录/Token/密码重置）
│   ├── user_service.py      # 用户服务（资料/关注/粉丝）
│   ├── post_service.py      # 帖子服务（CRUD/评论/点赞/收藏/图片）
│   └── message_service.py   # 私信服务（会话/消息/未读）
```

### 2. BaseService 基类

**文件**: `app/services/base.py`

提供通用的 CRUD 操作封装，所有 Service 继承此类：

| 方法 | 说明 |
|-----|------|
| `get_by_id(id)` | 根据 ID 获取单条记录 |
| `get_all(skip, limit, **filters)` | 分页查询，支持过滤 |
| `count(**filters)` | 统计记录数 |
| `create(**kwargs)` | 创建记录 |
| `update(instance, **kwargs)` | 更新记录 |
| `delete(instance)` | 删除记录 |
| `exists(**filters)` | 检查记录是否存在 |

```python
class BaseService(Generic[T]):
    def __init__(self, db: Session, model: type):
        self.db = db
        self.model = model

    def get_by_id(self, id: int) -> Optional[T]:
        return self.db.query(self.model).filter(self.model.id == id).first()
    # ... 其他方法
```

### 3. AuthService 认证服务

**文件**: `app/services/auth_service.py`

| 方法 | 说明 |
|-----|------|
| `register(user_data)` | 用户注册（唯一性校验 + 密码加密） |
| `login(username, password)` | 用户登录（返回双 Token） |
| `refresh_tokens(refresh_token)` | Token 刷新（一次性使用） |
| `logout(refresh_token)` | 登出（吊销 Token） |
| `logout_all(user_id)` | 登出所有设备 |
| `forgot_password(username)` | 发起找回密码 |
| `reset_password(code, new_password)` | 重置密码 |

### 4. UserService 用户服务

**文件**: `app/services/user_service.py`

| 方法 | 说明 |
|-----|------|
| `get_profile(user_id)` | 获取用户资料（含粉丝数/关注数） |
| `update_profile(user, update_data)` | 更新用户资料 |
| `get_follow_counts(user_id)` | 获取粉丝数和关注数 |
| `toggle_follow(current_user_id, target_user_id)` | 切换关注状态 |
| `get_follow_status(current_user_id, target_user_id)` | 获取关注关系 |
| `get_followers(user_id, skip, limit)` | 获取粉丝列表 |
| `get_following(user_id, skip, limit)` | 获取关注列表 |
| `get_friends(user_id, skip, limit)` | 获取互相关注好友 |

### 5. PostService 帖子服务

**文件**: `app/services/post_service.py`

| 方法 | 说明 |
|-----|------|
| `create_post(post_data, author)` | 创建帖子（自动设置审核状态） |
| `get_post_with_details(post_id, current_user)` | 获取帖子详情 |
| `update_post(post, update_data, user)` | 更新帖子 |
| `delete_post(post, user)` | 删除帖子 |
| `list_posts(page, page_size, author_id, current_user)` | 帖子列表 |
| `create_comment(post_id, comment_data, author)` | 创建评论 |
| `toggle_like(post_id, user_id)` | 切换点赞 |
| `toggle_collection(post_id, user_id)` | 切换收藏 |
| `upload_images(post_id, files, user)` | 上传图片 |
| `delete_image(image, user)` | 删除图片 |

### 6. MessageService 私信服务

**文件**: `app/services/message_service.py`

| 方法 | 说明 |
|-----|------|
| `get_or_create_conversation(current_user_id, target_user_id)` | 获取或创建会话 |
| `list_conversations(user_id)` | 会话列表 |
| `send_message(conversation_id, sender_id, content)` | 发送消息 |
| `list_messages(conversation_id, user_id, page, page_size)` | 消息列表 |
| `mark_all_as_read(conversation_id, user_id)` | 标记已读 |
| `get_total_unread(user_id)` | 未读总数 |

### 7. 路由层重构

所有路由文件已重构，仅保留 HTTP 处理逻辑，业务逻辑委托给 Service：

| 路由文件 | 变更 |
|---------|------|
| `auth_router.py` | 调用 `AuthService` |
| `follow_router.py` | 调用 `UserService` |
| `message_router.py` | 调用 `MessageService` |
| `post_router.py` | 保持原样（待后续重构） |

**重构前**：
```python
@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # 业务逻辑直接写在路由中
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(...)
    user = User(username=user_data.username, ...)
    db.add(user)
    db.commit()
    return user
```

**重构后**：
```python
@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        return service.register(user_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### 8. 版本号更新

**文件**: `app/main.py`

- 版本号: `1.0.11` → `1.0.12`

---

## 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Router 层（表现层）                        │
│  - 处理 HTTP 请求/响应                                        │
│  - 参数校验（Pydantic）                                       │
│  - 异常转换（ValueError → HTTPException）                     │
│  - 调用 Service 层                                           │
├─────────────────────────────────────────────────────────────┤
│                    Service 层（业务逻辑层）                    │
│  - 核心业务规则                                               │
│  - 数据校验与处理                                             │
│  - 事务管理                                                   │
│  - 调用 Model/Repository                                     │
├─────────────────────────────────────────────────────────────┤
│                    Model 层（数据访问层）                      │
│  - SQLAlchemy ORM 模型                                       │
│  - 数据库表定义                                               │
│  - 关系映射                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 与 v1.0.11 的对比

| 特性 | v1.0.11 | v1.0.12 |
|-----|---------|---------|
| 架构层次 | Router 直接操作 Model | Router → Service → Model |
| 业务逻辑位置 | 耦合在路由函数中 | 抽离到 Service 类 |
| 代码复用 | 重复代码较多 | BaseService 提供通用方法 |
| 可测试性 | 需要模拟 HTTP 请求 | 可直接测试 Service 方法 |
| 可维护性 | 修改需改多处 | 单一职责，易于维护 |
| 新增文件 | 无 | 5 个 Service 文件 |
| 代码行数 | ~ | +600 行（Service 层） |

---

## 使用示例

### 在路由中使用 Service

```python
from app.services.user_service import UserService

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_profile(user_id)
```

### 单元测试 Service

```python
def test_user_service_register():
    db = SessionLocal()
    service = UserService(db)

    user = service.register(UserCreate(
        username="test",
        password="password123"
    ))

    assert user.username == "test"
    assert user.id is not None
```

---

## 后续优化建议

1. **PostRouter 重构**：`post_router.py` 尚未重构，建议后续迁移到 `PostService`
2. **FeedRouter 重构**：`feed_router.py` 可抽取 `FeedService`
3. **TagRouter 重构**：`tag_router.py` 可抽取 `TagService`
4. **Repository 层**：可进一步引入 Repository 模式，将数据访问逻辑完全分离

---

## 版本信息

- **版本号**: 1.0.12
- **发布日期**: 2026-05-12
- **主要功能**: 引入 Service 层，实现分层架构
