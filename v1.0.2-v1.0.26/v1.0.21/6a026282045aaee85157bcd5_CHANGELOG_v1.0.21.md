# FanCommunity 后端 v1.0.21 更新日志

## 版本信息
- **版本号**: v1.0.21
- **更新日期**: 2026-05-13
- **更新类型**: 功能增强

## 更新概述
本次更新引入了 **Redis 缓存层**，对帖子详情、帖子列表、评论列表、用户资料、粉丝/关注列表等热点数据接口进行缓存加速。采用 **抽象后端 + 自动降级** 架构：优先使用 Redis，连接失败时自动降级为内存缓存，保证服务可用性。

---

## 详细修改内容

### 1. 新增缓存模块 (`app/cache/`)

#### 1.1 缓存抽象基类 (`app/cache/base.py`)

定义统一的缓存操作接口：

```python
class CacheBackend(ABC):
    def get(self, key: str) -> Optional[Any]: ...
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool: ...
    def delete(self, key: str) -> bool: ...
    def delete_pattern(self, pattern: str) -> int: ...
    def exists(self, key: str) -> bool: ...
    def clear(self) -> bool: ...
    def ping(self) -> bool: ...
    def close(self) -> None: ...
```

#### 1.2 Redis 缓存后端 (`app/cache/redis_backend.py`)

- 使用 `redis-py` 连接 Redis 服务
- 支持 JSON 序列化/反序列化
- 连接超时保护（5 秒）
- 连接池管理（最大 20 连接）
- 键前缀隔离（`fc:` 前缀）
- 异常捕获与日志记录

#### 1.3 内存缓存后端 (`app/cache/memory_backend.py`)

- Redis 不可用时的自动降级方案
- 线程安全（`threading.Lock`）
- 支持 TTL 过期自动清理
- 通配符批量删除

#### 1.4 缓存工厂 (`app/cache/factory.py`)

- `get_cache()` 单例工厂函数
- 优先 Redis → 自动降级内存缓存
- `CacheKeys` 缓存键命名规范常量类

### 2. 缓存键命名规范

| 缓存键格式 | 说明 | TTL |
|-----------|------|-----|
| `post:detail:{post_id}` | 帖子详情 | 120 秒 |
| `post:list:{page}:{page_size}:{author_id}` | 帖子列表 | 60 秒 |
| `post:comments:{post_id}` | 帖子评论列表 | 60 秒 |
| `post:images:{post_id}` | 帖子图片列表 | 120 秒 |
| `user:profile:{user_id}` | 用户资料 | 60 秒 |
| `user:counts:{user_id}` | 用户关注/粉丝数 | 60 秒 |
| `user:followers:{user_id}:{page}:{page_size}` | 粉丝列表 | 60 秒 |
| `user:following:{user_id}:{page}:{page_size}` | 关注列表 | 60 秒 |

### 3. 帖子模块缓存集成 (`app/routers/post_router.py`)

**缓存读取**（GET 请求）:
- `GET /posts/` — 帖子列表（仅未登录用户缓存公开数据）
- `GET /posts/{id}` — 帖子详情（仅 approved 帖子缓存公开版本）
- `GET /posts/{id}/comments` — 评论列表
- `GET /posts/{id}/images` — 图片列表

**缓存失效**（写操作触发）:
- 创建帖子 → 清除 `post:list:*`
- 更新/删除帖子 → 清除帖子详情 + 评论 + 图片 + 列表
- 新增/删除评论 → 清除帖子详情 + 评论 + 列表
- 点赞/收藏变更 → 清除帖子详情 + 列表
- 上传/删除图片 → 清除帖子图片 + 详情 + 列表

```python
def _invalidate_post_cache(post_id: int):
    """失效帖子相关的所有缓存"""
    cache.delete(CacheKeys.post_detail(post_id))
    cache.delete(CacheKeys.post_comments(post_id))
    cache.delete(CacheKeys.post_images(post_id))
    cache.delete_pattern("post:list:*")
```

### 4. 关注模块缓存集成 (`app/routers/follow_router.py`)

**缓存读取**:
- `GET /users/{id}` — 用户公开资料
- `GET /users/{id}/followers` — 粉丝列表
- `GET /users/{id}/following` — 关注列表

**缓存失效**:
- 更新个人资料 → 清除用户资料缓存
- 关注/取关 → 清除双方的用户资料 + 粉丝列表 + 关注列表

```python
def _invalidate_user_cache(user_id: int):
    """失效用户相关的所有缓存"""
    cache.delete(CacheKeys.user_profile(user_id))
    cache.delete(CacheKeys.user_counts(user_id))
    cache.delete_pattern(f"user:followers:{user_id}:*")
    cache.delete_pattern(f"user:following:{user_id}:*")
```

### 5. 配置项新增 (`app/config.py`)

```python
# ─── Redis 缓存配置 ───
REDIS_URL: str = ""              # Redis 连接地址，如 redis://localhost:6379/0
CACHE_KEY_PREFIX: str = "fc:"     # 缓存键前缀
CACHE_DEFAULT_TTL: int = 300      # 默认缓存过期时间（秒），5 分钟
```

### 6. 依赖新增 (`requirements.txt`)

```
redis==5.0.0
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────┐
│                    路由层 (Router)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │post_router│  │follow_router│  │feed_router│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │                  │
│       └──────────────┼──────────────┘                  │
│                      ▼                                 │
│              ┌──────────────┐                          │
│              │  CacheKeys   │  缓存键命名规范          │
│              └──────┬───────┘                          │
│                     ▼                                  │
│              ┌──────────────┐                          │
│              │  get_cache() │  工厂函数（单例）        │
│              └──────┬───────┘                          │
│                     ▼                                  │
│       ┌─────────────┴─────────────┐                   │
│       ▼                           ▼                    │
│ ┌─────────────┐          ┌──────────────┐            │
│ │ RedisCache  │  降级 →   │ MemoryCache  │            │
│ │ (生产推荐)  │          │ (开发/兜底)   │            │
│ └─────────────┘          └──────────────┘            │
└─────────────────────────────────────────────────────┘
```

---

## 环境配置

### 开发环境（无需 Redis）
```env
# .env 文件留空即可，自动使用内存缓存
REDIS_URL=
```

### 生产环境（推荐 Redis）
```env
REDIS_URL=redis://localhost:6379/0
CACHE_KEY_PREFIX=fc:
CACHE_DEFAULT_TTL=300
```

### Redis 集群/哨兵
```env
REDIS_URL=redis://:password@redis-master:6379/0
```

---

## 缓存策略说明

### 1. 缓存读取原则
- **仅缓存公开数据**: 未登录用户访问的帖子列表/详情/评论
- **已登录用户不缓存**: 因为 `is_liked`、`is_collected` 等字段与用户相关
- **TTL 分级**: 热数据（详情 120s）> 列表数据（60s）

### 2. 缓存失效策略
- **精确失效**: 数据变更时删除对应键
- **通配符失效**: 使用 `delete_pattern("post:list:*")` 批量清除
- **双向失效**: 关注操作清除双方缓存

### 3. 降级保障
- Redis 连接失败 → 自动降级为内存缓存
- 缓存读写异常 → 静默失败，直接查询数据库
- 不会因缓存故障导致服务不可用

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `app/cache/__init__.py` | 新增 | 缓存模块入口 |
| `app/cache/base.py` | 新增 | 缓存抽象基类 |
| `app/cache/redis_backend.py` | 新增 | Redis 缓存后端 |
| `app/cache/memory_backend.py` | 新增 | 内存缓存后端（降级） |
| `app/cache/factory.py` | 新增 | 缓存工厂 + CacheKeys |
| `app/routers/post_router.py` | 修改 | 集成帖子/评论/图片缓存 |
| `app/routers/follow_router.py` | 修改 | 集成用户资料/关注列表缓存 |
| `app/config.py` | 修改 | 新增 Redis 缓存配置项 |
| `app/main.py` | 修改 | 版本号更新为 1.0.21 |
| `requirements.txt` | 修改 | 添加 redis==5.0.0 |

---

## 后续优化建议

1. **缓存预热**: 服务启动时预加载热门帖子到缓存
2. **分布式锁**: 使用 Redis SETNX 实现缓存击穿保护
3. **布隆过滤器**: 防止缓存穿透（查询不存在的数据）
4. **缓存监控**: 添加命中率、内存使用等监控指标
5. **多级缓存**: L1 本地缓存 + L2 Redis 缓存
6. **异步刷新**: 后台任务定期刷新热点数据

---

**版本**: v1.0.21  
**更新者**: Code Assistant  
**更新时间**: 2026-05-13
