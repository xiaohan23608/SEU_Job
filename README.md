# 东南大学计软智学院招聘信息系统（SEU Job）

面向东南大学学生的招聘信息展示网站，以卡片形式聚合展示企业招聘信息。

## 功能特性

- 🔐 密码登录访问控制
- 📋 卡片形式展示招聘信息
- 🔍 搜索和筛选功能
- 📝 详情页支持文本/图片/链接三种内容类型
- 👨‍💼 管理员后台（增删改查、上下架）

## 技术栈

- 前端：HTML + CSS + JavaScript（原生）
- 后端：Node.js + Express
- 数据库：MySQL 8.0
- 模板引擎：EJS

## 快速开始

### 环境要求

- Node.js >= 16
- MySQL >= 8.0

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd SEU_Job
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

4. 初始化数据库
```bash
mysql -u root -p < docs/database_init.sql
```

5. 导入初始数据（可选）
```bash
python data/import_to_mysql.py
```

6. 创建管理员账号
```bash
node server/init-admin.js
```

7. 启动服务
```bash
npm start
# 或开发模式
npm run dev
```

8. 访问网站
```
http://localhost:3000
```

## 账号信息

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 访客 | - | seucsjob |
| 管理员 | admin | admin123 |

> ⚠️ 请首次登录后修改默认密码！

## 项目结构

```
SEU_Job/
├── server/              # 后端代码
│   ├── app.js          # 应用入口
│   ├── db.js           # 数据库连接
│   ├── init-admin.js   # 管理员初始化
│   ├── routes/         # 路由模块
│   └── middleware/     # 中间件
├── views/              # EJS 模板
├── public/             # 静态资源
│   ├── css/
│   └── js/
├── docs/               # 项目文档
├── data/               # 数据文件
├── .env                # 环境变量
└── package.json
```

## 访问地址

| 环境 | 地址 |
|------|------|
| 登录页 | http://localhost:3000/login |
| 主页 | http://localhost:3000/ |
| 管理页 | http://localhost:3000/admin |

## License

ISC
