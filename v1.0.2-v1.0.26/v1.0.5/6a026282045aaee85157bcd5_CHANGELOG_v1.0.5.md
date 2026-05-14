# 粉丝社群平台 - 变更日志 / CHANGELOG

---

## v1.0.5 - 代码规范：修复 feed_router 内部 import

> **版本：** v1.0.5
> **日期：** 2026-05-12
> **功能：** 代码规范修复
> **问题类型：** 代码缺陷（P1）

---

## 一、问题背景

在 v1.0.4 及之前版本中，`app/routers/feed_router.py` 的 `_build_post_detail` 函数内部存在一个不符合 Python 编码规范的延迟导入：

```python
def _build_post_detail(db: Session, p: Post, current_user_id: Optional[int] = None) -> PostDetail:
    ...
    if current_user_id:
        is_liked = db.query(Like).filter(...).first() is not None
        from app.models import Collection          # ❌ 函数内部导入
        is_collected = db.query(Collection).filter(...).first() is not None
```

该写法存在以下问题：

1. **违反 PEP 8 规范**：Python 官方风格指南 PEP 8 要求所有 import 语句应放在文件顶部
2. **可读性差**：import 散落在函数内部，不易一眼看出模块的依赖关系
3. **性能开销**：每次函数调用都会执行 import 语句（虽然 Python 有模块缓存机制，但仍是不必要的开销）
4. **一致性差**：同文件中其他模型（User、Post、Comment、Like 等）都在顶部导入，Collection 是唯一的例外

---

## 二、修改内容

### `app/routers/feed_router.py`

**修改前：**
```python
# 文件顶部
from app.models import User, Post, Comment, Like, PostImage, Follow

# 函数内部（第 27 行）
def _build_post_detail(...):
    ...
    if current_user_id:
        ...
        from app.models import Collection          # ❌ 延迟导入
        is_collected = db.query(Collection).filter(...)
```

**修改后：**
```python
# 文件顶部
from app.models import User, Post, Comment, Like, Collection, PostImage, Follow  # ✅ Collection 移至顶部

# 函数内部
def _build_post_detail(...):
    ...
    if current_user_id:
        ...
        is_collected = db.query(Collection).filter(...)  # ✅ 直接使用，无需再导入
```

---

## 三、影响分析

| 影响项 | 说明 |
|--------|------|
| API 版本 | 从 1.0.4 升级到 1.0.5 |
| 功能变更 | 无，纯代码规范修复 |
| 向后兼容 | ✅ 完全兼容，无任何行为变化 |
| 性能影响 | 极微小的正面影响（消除重复的 import 查找） |

---

## 四、测试验证

1. **动态流接口正常工作**
   ```bash
   curl -X GET "http://localhost:8000/feed/?page=1&page_size=10" \
     -H "Authorization: Bearer <token>"
   # 应正常返回关注用户的帖子列表
   ```

2. **收藏状态正确返回**
   - 已收藏的帖子 `is_collected` 应为 `True`
   - 未收藏的帖子 `is_collected` 应为 `False`

3. **无导入错误**
   - 启动服务无报错
   - 访问 Swagger 文档正常

---

## 五、相关文件

| 文件 | 变更 |
|------|------|
| `app/routers/feed_router.py` | 将 `Collection` 的 import 从函数内部移至文件顶部 |
| `app/main.py` | 版本号更新为 1.0.5 |

---

---

# 历史版本

## v1.0.4 - 代码清理：移除 /auth/me 空实现

> **版本：** v1.0.4
> **日期：** 2026-05-12
> **功能：** 代码清理

### 修改内容
- 删除 `auth_router.py` 中 `/auth/me` 空实现（函数体只有 `pass`）
- 正确接口为 `follow_router.py` 中的 `GET /users/me`

---

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
- 帖子/评论默认待审核，管理员可审批
- 新增 `/admin` 路由组，9 个审核接口
- `posts`/`comments` 表新增 `status` 字段
