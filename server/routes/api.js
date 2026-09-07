const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// 自动导出数据到 JSON 文件
async function exportJobsData() {
    try {
        const [rows] = await pool.execute('SELECT * FROM jobs WHERE is_active = 1 ORDER BY original_time DESC');
        const jsonStr = JSON.stringify(rows, null, 2);

        // 导出到 data/jobs.json
        fs.writeFileSync(path.join(__dirname, '../../data/jobs.json'), jsonStr);

        // 导出到 static/js/data.js
        const dataJs = 'const JOBS_DATA = ' + jsonStr + ';';
        fs.writeFileSync(path.join(__dirname, '../../static/js/data.js'), dataJs);

        // 同步 uploads 目录到 static（用于 GitHub Pages 部署）
        const uploadsSrc = path.join(__dirname, '../../public/uploads');
        const uploadsDest = path.join(__dirname, '../../static/uploads');
        if (fs.existsSync(uploadsSrc)) {
            fs.cpSync(uploadsSrc, uploadsDest, { recursive: true });
        }

        console.log('数据已自动导出');
    } catch (error) {
        console.error('自动导出失败:', error);
    }
}

// 图片上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('只允许上传图片文件（jpg/png/gif/webp）'));
    }
});

// 获取招聘信息列表
router.get('/jobs', async (req, res) => {
    const { page = 1, limit = 20, keyword, active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    // 是否只显示上架的
    if (active !== 'false') {
        where.push('is_active = ?');
        params.push(true);
    }

    // 关键词搜索
    if (keyword) {
        where.push('(title LIKE ? OR company LIKE ? OR summary LIKE ?)');
        const kw = `%${keyword}%`;
        params.push(kw, kw, kw);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    try {
        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM jobs ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // 查询数据
        const [rows] = await pool.execute(
            `SELECT * FROM jobs ${whereClause} ORDER BY original_time DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        return res.json({
            success: true,
            data: {
                jobs: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('查询失败:', error);
        return res.json({ success: false, message: '查询失败' });
    }
});

// 获取单条招聘信息
router.get('/jobs/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM jobs WHERE id = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.json({ success: false, message: '招聘信息不存在' });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('查询失败:', error);
        return res.json({ success: false, message: '查询失败' });
    }
});

// 新增招聘信息（管理员）
router.post('/jobs', requireAdmin, async (req, res) => {
    const { title, company, summary, content_text, content_image, content_link, tags, hr_contact, contact_image } = req.body;

    if (!title) {
        return res.json({ success: false, message: '标题为必填项' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO jobs (title, company, summary, content_text, content_image, content_link, tags, hr_contact, contact_image, original_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [title, company || '', summary || '', content_text || null, content_image || null, content_link || null, tags || null, hr_contact || null, contact_image || null]
        );

        await exportJobsData();
        return res.json({ success: true, message: '创建成功', data: { id: result.insertId } });
    } catch (error) {
        console.error('创建失败:', error);
        return res.json({ success: false, message: '创建失败' });
    }
});

// 编辑招聘信息（管理员）
router.put('/jobs/:id', requireAdmin, async (req, res) => {
    const { title, company, summary, content_text, content_image, content_link, tags, hr_contact, contact_image } = req.body;

    try {
        const [result] = await pool.execute(
            `UPDATE jobs SET title = ?, company = ?, summary = ?,
             content_text = ?, content_image = ?, content_link = ?, tags = ?, hr_contact = ?, contact_image = ?
             WHERE id = ?`,
            [title, company, summary, content_text, content_image, content_link, tags, hr_contact, contact_image, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: '招聘信息不存在' });
        }

        await exportJobsData();
        return res.json({ success: true, message: '更新成功' });
    } catch (error) {
        console.error('更新失败:', error);
        return res.json({ success: false, message: '更新失败' });
    }
});

// 删除招聘信息（管理员）
router.delete('/jobs/:id', requireAdmin, async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM jobs WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: '招聘信息不存在' });
        }

        await exportJobsData();
        return res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除失败:', error);
        return res.json({ success: false, message: '删除失败' });
    }
});

// 上下架切换（管理员）
router.patch('/jobs/:id/toggle', requireAdmin, async (req, res) => {
    try {
        // 原子操作：直接翻转 is_active，避免并发竞态
        const [result] = await pool.execute('UPDATE jobs SET is_active = NOT is_active WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: '招聘信息不存在' });
        }

        // 查询翻转后的状态
        const [rows] = await pool.execute('SELECT is_active FROM jobs WHERE id = ?', [req.params.id]);
        const newStatus = rows[0].is_active;

        // 异步导出，不阻塞响应
        exportJobsData().catch(err => console.error('自动导出失败:', err));
        return res.json({ success: true, message: '状态已切换', data: { is_active: newStatus } });
    } catch (error) {
        console.error('切换失败:', error);
        return res.json({ success: false, message: '切换失败' });
    }
});

// 图片上传（管理员）
router.post('/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: '请选择文件' });
    }
    res.json({
        success: true,
        message: '上传成功',
        url: '/uploads/' + req.file.filename
    });
}, (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.json({ success: false, message: '文件大小不能超过50MB' });
        }
        return res.json({ success: false, message: error.message });
    }
    if (error) {
        return res.json({ success: false, message: error.message });
    }
});

module.exports = router;
