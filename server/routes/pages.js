const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

// 管理员登录页
router.get('/login', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.render('login', { error: null });
});

// 主页（公开访问）
router.get('/', (req, res) => {
    res.render('index', { isAdmin: req.session.isAdmin || false });
});

// 详情页（公开访问）
router.get('/job/:id', async (req, res) => {
    const { pool } = require('../db');
    try {
        const [rows] = await pool.execute('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).send('招聘信息不存在');
        }
        res.render('detail', { job: rows[0], isAdmin: req.session.isAdmin || false });
    } catch (error) {
        console.error('查询失败:', error);
        res.status(500).send('服务器错误');
    }
});

// 管理页（需要管理员权限）
router.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.render('admin-login', { error: null });
    }
    res.render('admin', { isAdmin: true });
});

module.exports = router;
