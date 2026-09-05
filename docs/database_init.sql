-- 东南大学招聘信息系统 - 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS seu_job DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE seu_job;

-- 创建招聘信息表
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '招聘标题',
    company VARCHAR(100) NOT NULL DEFAULT '' COMMENT '公司名称',
    summary VARCHAR(500) NOT NULL DEFAULT '' COMMENT '卡片摘要',
    content_type ENUM('text', 'image', 'link') NULL DEFAULT NULL COMMENT '内容类型（已废弃，保留兼容）',
    content_text TEXT NULL COMMENT '文本内容',
    content_image TEXT NULL COMMENT '图片URL（支持多图，JSON数组格式）',
    hr_contact VARCHAR(500) NULL COMMENT 'HR联系方式',
    contact_image VARCHAR(500) NULL COMMENT '投递相关联系图片链接',
    content_link VARCHAR(500) NULL COMMENT '链接URL（如微信推送）',
    tags VARCHAR(200) NULL COMMENT '标签，逗号分隔',
    sender_name VARCHAR(100) NULL COMMENT '发布者姓名',
    sender_id VARCHAR(50) NULL COMMENT '发布者ID',
    original_time DATETIME NULL COMMENT '原始发布时间',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否上架',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招聘信息表';

-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '管理员账号',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员（密码需要在应用层加密）
-- INSERT INTO admins (username, password_hash) VALUES ('admin', 'hashed_password_here');
