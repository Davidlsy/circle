# 版本更新日志 v1.0.13

## 概述

本版本解决了代码重复问题，将多处定义的 `_get_counts`、`_is_following`、`_build_post_detail` 等辅助函数提取到公共模块 `app/utils/` 中。这消除了代码重复，提高了代码的可维护性和可复用性。

---

## 主要变更

### 1. 新增工具模块目录结构

```
app/
├── utils/
│   ├── __init__.py          # 工具模块入口，导出所有工具函数
│   ├── query_helpers.py     # 数据库查询辅助函数
│   └── validators.py        # 数据验证和权限检查函数
```

### 2. query_helpers.py - 查询辅助函数

**文件**: `app/utils/query_helpers.py`

| 函数 | 说明 | 原重复位置 |
|-----|------|-----------|
| `get_post_counts(db, post_id)` | 获取帖子评论/点赞/收藏数 | post_router, feed_router |
| `get_post_images(db, post_id)` | 获取帖子图片列表 | post_router, feed_router |
| `get_post_tags(db, post_id)` | 获取帖子标签列表 | post_router, tag_router |
| `build_post_detail(db, post, user_id)` | 构建 PostDetail 对象 | post_router, feed_router, tag_router |
| `get_user_follow_counts(db, user_id)` | 获取用户粉丝/关注数 | follow_router |
| `is_following(db, follower_id, following_id)` | 检查是否关注 | follow_router |
| `is_liked(db, post_id, user_id)` | 检查是否点赞 | post_router, feed_router |
| `is_collected(db, post_id, user_id)` | 检查是否收藏 | post_router, feed_router |
| `delete_post_images_files(db, post_id, upload_dir)` | 删除帖子图片文件 | post_router |

**使用示例**:
```python
from app.utils import build_post_detail, get_post_counts

# 构建帖子详情
post_detail = build_post_detail(db, post, current_user_id)

# 获取帖子统计
comment_count, like_count, collection_count = get_post_counts(db, post_id)
```

### 3. validators.py - 验证工具函数

**文件**: `app/utils/validators.py`

| 函数 | 说明 | 原重复位置 |
|-----|------|-----------|
| `validate_image_file(file)` | 验证图片类型和大小 | post_router |
| `validate_post_exists(db, post_id)` | 验证帖子存在 | post_router, feed_router, tag_router |
| `validate_user_exists(db, user_id)` | 验证用户存在 | follow_router |
| `validate_is_author_or_admin(post, user, action)` | 验证作者或管理员权限 | post_router |
| `validate_is_comment_author_or_admin(comment, user, action)` | 验证评论作者或管理员权限 | post_router |
| `ensure_upload_dir()` | 确保上传目录存在 | post_router |

**使用示例**:
```python
from app.utils import validate_post_exists, validate_is_author_or_admin

# 验证帖子存在
post = validate_post_exists(db, post_id)

# 验证权限
validate_is_author_or_admin(post, current_user, "修改")
```

### 4. 重构的路由文件

| 路由文件 | 变更内容 |
|---------|---------|
| `post_router.py` | 使用 `build_post_detail`、`validate_post_exists`、`validate_is_author_or_admin`、`get_post_counts`、`delete_post_images_files`、`validate_image_file`、`ensure_upload_dir` |
| `feed_router.py` | 使用 `build_post_detail`，删除本地 `_build_post_detail` 函数 |
| `tag_router.py` | 使用 `build_post_detail`、`get_post_tags` |

### 5. 代码重复消除对比

**重构前** (post_router.py):
```python
def _get_post_images(post_id: int, db: Session) -> List[PostImagePublic]:
    images = db.query(PostImage).filter(
        PostImage.post_id == post_id
    ).order_by(PostImage.order, PostImage.created_at).all()
    return [PostImagePublic.model_validate(img) for img in images]

# 同样的函数在 feed_router.py 中也有定义
def _get_post_images(post_id: int, db: Session) -> List[PostImagePublic]: ...
```

**重构后**:
```python
# 统一使用公共工具函数
from app.utils import get_post_images

images = get_post_images(db, post_id)
```

### 6. 重复代码统计

| 函数/代码块 | 重构前重复次数 | 重构后位置 |
|------------|---------------|-----------|
| `_get_post_images` | 2 处 | `app/utils/query_helpers.py` |
| `_get_post_tags` | 2 处 | `app/utils/query_helpers.py` |
| `_build_post_detail` | 3 处 | `app/utils/query_helpers.py` |
| 评论/点赞/收藏数查询 | 4 处 | `app/utils/query_helpers.py` |
| 帖子存在验证 | 3 处 | `app/utils/validators.py` |
| 图片文件验证 | 2 处 | `app/utils/validators.py` |
| 作者权限验证 | 3 处 | `app/utils/validators.py` |

**总计消除重复代码约 150 行**

---

## 架构改进

```
改进前：
┌─────────────────────────────────────────────────────────────┐
│                    Router 层                                 │
│  - HTTP 处理                                                 │
│  - 业务逻辑                                                  │
│  - 数据库查询（重复代码）                                     │
│  - 数据验证（重复代码）                                       │
└─────────────────────────────────────────────────────────────┘

改进后：
┌─────────────────────────────────────────────────────────────┐
│                    Router 层                                 │
│  - HTTP 处理                                                 │
│  - 调用 Service 层（业务逻辑）                                │
│  - 调用 utils 层（公共工具）                                  │
├─────────────────────────────────────────────────────────────┤
│                    Utils 层（新增）                          │
│  - query_helpers: 数据库查询封装                              │
│  - validators: 数据验证封装                                   │
├─────────────────────────────────────────────────────────────┤
│                    Service 层                                │
│  - 核心业务逻辑                                              │
├─────────────────────────────────────────────────────────────┤
│                    Model 层                                  │
│  - 数据库模型                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用指南

### 在路由中使用工具函数

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils import build_post_detail, validate_post_exists

router = APIRouter()

@router.get("/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    # 验证帖子存在，不存在自动抛出 404
    post = validate_post_exists(db, post_id)
    
    # 使用公共工具构建详情
    return build_post_detail(db, post, current_user_id=None)
```

### 在 Service 中使用工具函数

```python
from app.utils import get_user_follow_counts

class UserService:
    def get_profile(self, user_id: int):
        user = self.get_by_id(user_id)
        follower_count, following_count = get_user_follow_counts(self.db, user_id)
        return UserProfile(..., follower_count=follower_count, ...)
```

---

## 后续优化建议

1. **audit_router.py 重构**：审核路由中可能也有重复的查询逻辑，建议检查并提取
2. **更多验证器**：可以添加 `validate_tag_exists`、`validate_comment_exists` 等
3. **缓存装饰器**：在 query_helpers 中添加缓存装饰器，优化热点数据查询
4. **批量查询优化**：添加批量查询辅助函数，减少 N+1 查询问题

---

## 版本信息

- **版本号**: 1.0.13
- **发布日期**: 2026-05-13
- **主要功能**: 提取公共工具模块，消除代码重复
- **新增文件**: 3 个 (`app/utils/__init__.py`, `query_helpers.py`, `validators.py`)
- **修改文件**: 5 个 (`main.py`, `post_router.py`, `feed_router.py`, `tag_router.py`)
- **删除重复代码**: 约 150 行
