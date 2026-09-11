# 附件上传功能说明

## 功能概述

新增了附件上传功能，支持上传 PDF 和 Word 文档（.pdf、.doc、.docx）。

## 数据库迁移

在使用附件功能之前，需要先运行数据库迁移脚本来添加 `attachment` 字段：

```bash
node add-attachment-column.js
```

## 功能特性

### 后端 API

1. **文档上传 API** (`POST /api/upload-document`)
   - 支持格式：PDF、DOC、DOCX
   - 最大文件大小：20MB
   - 需要管理员权限

2. **招聘信息 API 更新**
   - `POST /api/jobs` - 新增时支持 `attachment` 字段
   - `PUT /api/jobs/:id` - 编辑时支持 `attachment` 字段

### 前端功能

1. **管理后台** (`/admin`)
   - 在招聘信息表单中添加了附件上传区域
   - 支持选择本地文件上传
   - 显示上传状态（待上传/已上传）
   - 支持删除已上传的附件

2. **详情页** (`/detail/:id`)
   - 显示附件下载按钮
   - 支持在新窗口打开附件

3. **卡片列表**
   - 显示附件标识（📎）

## 文件修改清单

### 后端
- `server/routes/api.js` - 添加文档上传 API，更新招聘信息 CRUD

### 前端
- `views/admin.ejs` - 添加附件上传表单
- `public/js/admin.js` - 添加附件上传逻辑
- `public/css/style.css` - 添加附件样式
- `views/detail.ejs` - 添加附件下载显示
- `static/js/app.js` - 添加附件显示逻辑

### 数据库
- `add-attachment-column.js` - 数据库迁移脚本

## 使用说明

1. 运行数据库迁移脚本
2. 重启服务器
3. 在管理后台编辑招聘信息时，点击"+ 添加附件"按钮
4. 选择 PDF 或 Word 文件
5. 点击"上传"按钮
6. 保存招聘信息

## 注意事项

- 附件文件大小限制为 20MB
- 仅支持 PDF、DOC、DOCX 格式
- 附件存储在 `public/uploads/` 目录
- 附件 URL 会自动导出到 `data/jobs.json` 和 `static/js/data.js`