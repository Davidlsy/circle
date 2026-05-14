# 版本更新日志 v1.0.18

## 概述

本版本引入了存储抽象层（Storage Backend），将图片存储逻辑从业务代码中解耦，支持本地文件系统、阿里云 OSS、AWS S3 三种存储后端，通过环境变量一键切换，无需修改业务代码。

---

## 主要变更

### 1. 新增存储抽象层目录结构

```
app/
├── storage/
│   ├── __init__.py      # 入口文件
│   ├── base.py          # StorageBackend 抽象基类
│   ├── local.py         # 本地文件系统存储
│   ├── oss.py           # 阿里云 OSS 存储
│   ├── s3.py            # AWS S3 / 兼容 S3 存储
│   └── factory.py       # 存储后端工厂（单例）
```

### 2. StorageBackend 抽象基类

**文件**: `app/storage/base.py`

定义统一的文件存储接口，所有后端必须实现：

| 方法 | 说明 |
|-----|------|
| `save(content, filename, content_type)` | 保存文件，返回访问 URL |
| `delete(url)` | 删除文件 |
| `exists(url)` | 检查文件是否存在 |
| `get_url(filename)` | 获取文件访问 URL |

### 3. 三种存储后端

#### LocalStorage（本地文件系统）

- **适用场景**：开发环境、单机部署
- **存储路径**：`UPLOAD_DIR`（默认 `uploads/`）
- **访问 URL**：`/uploads/{uuid}.{ext}`
- **依赖**：无额外依赖
- **特点**：通过 FastAPI StaticFiles 提供访问

#### OSSStorage（阿里云 OSS）

- **适用场景**：国内生产环境
- **存储路径**：`uploads/{uuid}.{ext}`
- **访问 URL**：CDN 域名或 OSS 域名
- **依赖**：`pip install oss2`
- **特点**：支持 CDN 加速域名

#### S3Storage（AWS S3 / 兼容 S3 协议）

- **适用场景**：海外生产环境、兼容 MinIO 等
- **存储路径**：`uploads/{uuid}.{ext}`
- **访问 URL**：CDN 域名或 S3 域名
- **依赖**：`pip install boto3`
- **特点**：兼容所有 S3 协议的对象存储

### 4. 新增配置项

**文件**: `app/config.py`

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `STORAGE_BACKEND` | `local` | 存储后端类型（local/oss/s3） |
| `OSS_ACCESS_KEY_ID` | `""` | OSS Access Key ID |
| `OSS_ACCESS_KEY_SECRET` | `""` | OSS Access Key Secret |
| `OSS_ENDPOINT` | `oss-cn-hangzhou.aliyuncs.com` | OSS 端点 |
| `OSS_BUCKET_NAME` | `""` | OSS Bucket 名称 |
| `OSS_CDN_DOMAIN` | `""` | OSS CDN 加速域名（可选） |
| `S3_ACCESS_KEY_ID` | `""` | S3 Access Key ID |
| `S3_SECRET_ACCESS_KEY` | `""` | S3 Secret Access Key |
| `S3_ENDPOINT_URL` | `https://s3.amazonaws.com` | S3 端点 URL |
| `S3_BUCKET_NAME` | `""` | S3 Bucket 名称 |
| `S3_REGION` | `us-east-1` | S3 区域 |
| `S3_CDN_DOMAIN` | `""` | S3 CDN 加速域名（可选） |

### 5. 工厂模式（单例）

**文件**: `app/storage/factory.py`

```python
from app.storage import get_storage

# 自动根据 STORAGE_BACKEND 配置创建对应实例（单例）
storage = get_storage()

# 统一接口调用
url = storage.save(content, "photo.jpg", "image/jpeg")
storage.delete(url)
```

### 6. 重构 post_router.py

| 变更点 | 重构前 | 重构后 |
|-------|-------|-------|
| 保存图片 | 直接操作本地文件系统 | `storage.save()` |
| 删除图片 | `os.remove()` | `storage.delete()` |
| 构建 URL | `_build_image_url()` | `storage.save()` 返回 URL |
| 回滚逻辑 | 手动 `os.remove()` | `storage.delete()` |

**重构前**:
```python
def _save_image_file(file):
    ensure_upload_dir()
    content = validate_image_file(file)
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)
    return unique_name, size
```

**重构后**:
```python
def _save_image_file(file):
    content = validate_image_file(file)
    size = len(content)
    url = storage.save(content, file.filename or "image.jpg", content_type=file.content_type)
    return url, size
```

### 7. 环境变量切换示例

```bash
# 开发环境（默认，本地存储）
STORAGE_BACKEND=local

# 生产环境 - 阿里云 OSS
STORAGE_BACKEND=oss
OSS_ACCESS_KEY_ID=LTAI5t...
OSS_ACCESS_KEY_SECRET=xxxxx
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=my-bucket
OSS_CDN_DOMAIN=https://cdn.example.com

# 生产环境 - AWS S3
STORAGE_BACKEND=s3
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_ENDPOINT_URL=https://s3.amazonaws.com
S3_BUCKET_NAME=my-bucket
S3_REGION=us-east-1
S3_CDN_DOMAIN=https://cdn.example.com
```

### 8. 扩展新存储后端

如需添加新的存储后端（如七牛云、腾讯云 COS），只需：

1. 在 `app/storage/` 下新建文件（如 `qiniu.py`）
2. 继承 `StorageBackend` 基类，实现 4 个方法
3. 在 `factory.py` 中注册

```python
# app/storage/qiniu.py
from app.storage.base import StorageBackend

class QiniuStorage(StorageBackend):
    def save(self, content, filename, content_type=None):
        # 七牛云上传逻辑
        ...
    def delete(self, url):
        ...
    def exists(self, url):
        ...
    def get_url(self, filename):
        ...
```

```python
# app/storage/factory.py 中添加
elif backend == "qiniu":
    from app.storage.qiniu import QiniuStorage
    return QiniuStorage()
```

---

## 版本信息

- **版本号**: 1.0.18
- **发布日期**: 2026-05-13
- **主要功能**: 引入存储抽象层，支持本地/OSS/S3 切换
- **新增文件**: 6 个 (`app/storage/`)
- **修改文件**: 3 个 (`config.py`, `post_router.py`, `main.py`)
- **新增配置项**: 12 个
