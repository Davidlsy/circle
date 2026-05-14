# FanCommunity 后端 v1.0.25 更新日志

## 版本信息
- **版本号**: v1.0.25
- **更新日期**: 2026-05-13
- **更新类型**: 稳定性增强

## 更新概述
本次更新修复了 **数据库连接池配置缺失** 问题。通过自动检测数据库类型，为 SQLite 和 MySQL/PostgreSQL 分别配置合适的连接池策略，防止生产环境出现连接泄漏和数据库连接耗尽。

---

## 问题说明

### 原有问题

**位置**: `app/database.py:7-10`

```python
# 旧代码：无连接池配置
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 专用
)
```

**风险**:
1. **SQLite**: `connect_args` 硬编码为 SQLite 专用参数，切换到 MySQL/PostgreSQL 时报错
2. **无连接池**: 生产环境使用 MySQL/PostgreSQL 时，每次请求创建新连接，请求结束后关闭
3. **连接泄漏**: 高并发下大量连接创建/销毁，可能导致数据库连接数耗尽
4. **空闲断开**: MySQL 默认 8 小时断开空闲连接，长时间空闲后请求报错

---

## 详细修改内容

### 1. 重构数据库连接模块 (`app/database.py`)

#### 1.1 自动检测数据库类型

```python
from sqlalchemy.pool import StaticPool, QueuePool

# 解析数据库类型
_database_url = settings.DATABASE_URL.lower()
_is_sqlite = _database_url.startswith("sqlite")
```

#### 1.2 SQLite 使用 StaticPool

```python
if _is_sqlite:
    return create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,   # 单连接，线程安全
        echo=False,
    )
```

**说明**: SQLite 是文件数据库，使用 StaticPool 维护单个共享连接，避免多线程冲突。

#### 1.3 MySQL/PostgreSQL 使用 QueuePool

```python
else:
    return create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,           # 常驻连接数
        max_overflow=settings.DB_MAX_OVERFLOW,     # 最大溢出连接数
        pool_recycle=settings.DB_POOL_RECYCLE,     # 连接回收时间
        pool_timeout=settings.DB_POOL_TIMEOUT,     # 获取连接超时
        pool_pre_ping=settings.DB_POOL_PRE_PING,   # 连接前预检测
        echo=False,
    )
```

### 2. 新增连接池配置项 (`app/config.py`)

```python
# ─── 数据库连接池配置 ───
DB_POOL_SIZE: int = 10        # 连接池大小（常驻连接数）
DB_MAX_OVERFLOW: int = 20     # 连接池最大溢出数
DB_POOL_RECYCLE: int = 3600   # 连接回收时间（秒），1 小时
DB_POOL_TIMEOUT: int = 30     # 获取连接超时时间（秒）
DB_POOL_PRE_PING: bool = True # 连接前预检测
```

### 3. 连接池参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `DB_POOL_SIZE` | 10 | 连接池中保持的常驻连接数 |
| `DB_MAX_OVERFLOW` | 20 | 允许临时创建的溢出连接数（总连接数 = pool_size + max_overflow = 30） |
| `DB_POOL_RECYCLE` | 3600 | 连接存活超过此时间后自动回收重建（防止 MySQL wait_timeout 断开） |
| `DB_POOL_TIMEOUT` | 30 | 从连接池获取连接的最大等待时间，超时抛出 `TimeoutError` |
| `DB_POOL_PRE_PING` | True | 每次从连接池取出连接时发送 `SELECT 1` 检测存活状态 |

---

## 连接池工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                    SQLAlchemy Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              QueuePool (连接池)                      │   │
│  │                                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐       ┌──────┐        │   │
│  │  │ conn │ │ conn │ │ conn │  ...  │ conn │ ×10    │   │
│  │  │  #1  │ │  #2  │ │  #3  │       │ #10  │        │   │
│  │  └──────┘ └──────┘ └──────┘       └──────┘        │   │
│  │  ←── 常驻连接 (pool_size=10) ──→                   │   │
│  │                                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐       ┌──────┐        │   │
│  │  │ conn │ │ conn │ │ conn │  ...  │ conn │ ×20    │   │
│  │  │ #11  │ │ #12  │ │ #13  │       │ #30  │        │   │
│  │  └──────┘ └──────┘ └──────┘       └──────┘        │   │
│  │  ←── 溢出连接 (max_overflow=20) ──→                 │   │
│  │    （空闲后自动回收，不常驻）                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  pool_pre_ping=True:  取出连接时先发 SELECT 1 检测         │
│  pool_recycle=3600:   连接超过 1 小时自动回收重建          │
│  pool_timeout=30:     等待连接最多 30 秒                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境配置

### 开发环境（SQLite，无需额外配置）

```env
DATABASE_URL=sqlite:///./fan_community.db
# 连接池参数对 SQLite 无效，自动使用 StaticPool
```

### 生产环境（MySQL）

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/fan_community
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
DB_POOL_TIMEOUT=30
DB_POOL_PRE_PING=true
```

### 生产环境（PostgreSQL）

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/fan_community
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
DB_POOL_TIMEOUT=30
DB_POOL_PRE_PING=true
```

---

## 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 连接管理 | 每次请求创建/销毁 | 连接池复用 |
| 最大并发连接 | 无限制（可能耗尽） | pool_size + max_overflow（默认 30） |
| 空闲连接断开 | 可能报错 | pool_pre_ping 自动检测 |
| 连接获取超时 | 无限制（可能阻塞） | 30 秒超时 |
| 数据库兼容 | 仅 SQLite | SQLite + MySQL + PostgreSQL |

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `app/database.py` | 修改 | 自动检测数据库类型，配置连接池参数 |
| `app/config.py` | 修改 | 新增 5 个数据库连接池配置项 |
| `app/main.py` | 修改 | 版本号更新为 1.0.25 |

---

## 后续优化建议

1. **连接池监控**: 添加连接池使用率监控指标
2. **动态调整**: 根据负载动态调整 pool_size
3. **读写分离**: 配置主从数据库连接池
4. **连接池预热**: 应用启动时预先创建连接

---

**版本**: v1.0.25  
**更新者**: Code Assistant  
**更新时间**: 2026-05-13
