const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// 管理员登录
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        const admin = rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        req.session.isLoggedIn = true;
        req.session.isAdmin = true;
        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;

        return res.json({ success: true, message: '登录成功' });
    } catch (error) {
        console.error('管理员登录失败:', error);
        return res.json({ success: false, message: '登录失败，请重试' });
    }
});

// 登出
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: '登出失败' });
        }
        return res.json({ success: true, message: '已登出' });
    });
});

module.exports = router;
