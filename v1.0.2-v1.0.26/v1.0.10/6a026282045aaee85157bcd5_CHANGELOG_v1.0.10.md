# 版本更新日志 v1.0.10

## 概述

本版本为数据库连接添加了完整的连接池配置，解决了高并发场景下数据库连接管理的性能瓶颈问题。通过自动识别数据库类型（SQLite / MySQL / PostgreSQL），智能选择合适的连接池策略。

---

## 主要变更

### 1. 新增数据库连接池配置项

**文件**: `app/config.py`

新增 6 个环境变量配置项，均支持通过 `.env` 文件覆盖：

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| `DB_POOL_SIZE` | int | 10 | 连接池中保持的活跃连接数 |
| `DB_MAX_OVERFLOW` | int | 20 | 超出 pool_size 后可临时创建的最大连接数 |
| `DB_POOL_RECYCLE` | int | 3600 | 连接回收时间（秒），防止数据库主动断开长连接 |
| `DB_POOL_PRE_PING` | bool | True | 每次从池中取出连接前先发送 ping，自动剔除失效连接 |
| `DB_POOL_TIMEOUT` | int | 30 | 获取连接的等待超时时间（秒） |
| `DB_ECHO` | bool | False | 是否打印 SQL 语句（开发调试用） |

```python
# app/config.py 新增内容
# 数据库连接池配置
DB_POOL_SIZE: int = 10          # 连接池保持的连接数
DB_MAX_OVERFLOW: int = 20       # 超出 pool_size 后可临时创建的最大连接数
DB_POOL_RECYCLE: int = 3600     # 连接回收时间（秒）
DB_POOL_PRE_PING: bool = True   # 取出连接前先 ping 检测
DB_POOL_TIMEOUT: int = 30       # 获取连接超时时间（秒）
DB_ECHO: bool = False           # 是否打印 SQL 语句
```

### 2. 重构数据库引擎创建逻辑

**文件**: `app/database.py`（完全重写）

#### 2.1 自动识别数据库类型

根据 `DATABASE_URL` 前缀自动判断数据库类型，选择不同的连接策略：

| 数据库类型 | 连接池策略 | 说明 |
|-----------|----------|------|
| **SQLite** | `StaticPool` | 单连接共享模式，连接池参数不生效 |
| **MySQL / PostgreSQL** | `QueuePool` | 完整连接池支持，所有参数生效 |

#### 2.2 SQLite 模式

```python
# SQLite 使用 StaticPool，确保多线程共享同一连接
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=settings.DB_ECHO,
)
```

#### 2.3 MySQL/PostgreSQL 模式

```python
# 使用 QueuePool 连接池
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,         # 10 个常驻连接
    max_overflow=settings.DB_MAX_OVERFLOW,   # 最多额外 20 个临时连接
    pool_recycle=settings.DB_POOL_RECYCLE,   # 1 小时回收一次
    pool_pre_ping=settings.DB_POOL_PRE_PING, # 自动剔除失效连接
    pool_timeout=settings.DB_POOL_TIMEOUT,   # 30 秒超时
    poolclass=QueuePool,
    echo=settings.DB_ECHO,
)
```

#### 2.4 启动日志

应用启动时自动记录连接池配置信息，便于运维排查：

```
# SQLite 环境
数据库类型: SQLite（使用 StaticPool 单连接模式）

# MySQL/PostgreSQL 环境
数据库类型: 非 SQLite（使用 QueuePool 连接池） | pool_size=10 | max_overflow=20 | pool_recycle=3600s | pool_timeout=30s | pool_pre_ping=True
```

### 3. 版本号更新

**文件**: `app/main.py`

- 版本号: `1.0.9` → `1.0.10`

---

## 连接池参数详解

### pool_size（连接池大小）

- 控制连接池中**常驻**的连接数量
- 默认值 10 适用于中小规模应用
- 生产环境建议根据并发量调整：`pool_size = CPU核心数 * 2 + 磁盘数`

### max_overflow（最大溢出连接数）

- 当连接池中所有连接都被占用时，可临时创建的额外连接数
- 默认值 20，意味着系统最大可同时使用 30 个连接（10 + 20）
- 临时连接使用完毕后会自动释放回池中

### pool_recycle（连接回收时间）

- 防止数据库服务器主动断开空闲连接导致报错
- 默认 3600 秒（1 小时），应小于数据库的 `wait_timeout` 设置
- MySQL 默认 `wait_timeout` 为 8 小时，PostgreSQL 无此限制

### pool_pre_ping（连接健康检测）

- 每次从池中取出连接前先发送轻量级 ping 请求
- 自动检测并剔除已被数据库服务器断开的失效连接
- 建议生产环境**始终开启**（默认 True）

### pool_timeout（获取连接超时）

- 当连接池已满（达到 pool_size + max_overflow）时，新请求等待可用连接的超时时间
- 超时后抛出 `TimeoutError`
- 默认 30 秒

---

## 环境配置建议

### 开发环境（SQLite）

```bash
# .env
DATABASE_URL=sqlite:///./fan_community.db
DB_ECHO=True    # 开启 SQL 日志便于调试
# 其他连接池参数对 SQLite 不生效
```

### 生产环境（MySQL）

```bash
# .env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/fan_community
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=1800
DB_POOL_PRE_PING=True
DB_POOL_TIMEOUT=15
DB_ECHO=False
```

### 生产环境（PostgreSQL）

```bash
# .env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/fan_community
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
DB_POOL_PRE_PING=True
DB_POOL_TIMEOUT=15
DB_ECHO=False
```

---

## 与 v1.0.9 的对比

| 特性 | v1.0.9 | v1.0.10 |
|-----|--------|---------|
| 连接池配置 | 无，使用默认值 | 完整配置（6 个参数） |
| 数据库类型识别 | 无，硬编码 SQLite 参数 | 自动识别 SQLite / MySQL / PostgreSQL |
| 连接池策略 | 默认（无明确指定） | SQLite: StaticPool / 其他: QueuePool |
| 连接健康检测 | 无 | pool_pre_ping 自动剔除失效连接 |
| 连接回收 | 无 | pool_recycle 定期回收 |
| 获取连接超时 | 无（可能无限等待） | pool_timeout 可配置超时 |
| 启动日志 | 无 | 记录连接池配置信息 |
| SQL 调试 | 无 | DB_ECHO 可开关 |

---

## 测试验证

所有 56 个单元测试通过，数据库连接功能正常：

```bash
pytest tests/ -v
# 56 passed
```

---

## 版本信息

- **版本号**: 1.0.10
- **发布日期**: 2026-05-12
- **主要功能**: 数据库连接池配置
