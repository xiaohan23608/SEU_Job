const mysql = require('mysql2/promise');

async function addAttachmentColumn() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'seu_job',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const connection = await pool.getConnection();
        console.log('数据库连接成功');

        // 检查 attachment 字段是否已存在
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM jobs LIKE 'attachment'"
        );

        if (columns.length === 0) {
            // 添加 attachment 字段
            await connection.execute(
                'ALTER TABLE jobs ADD COLUMN attachment VARCHAR(500) DEFAULT NULL AFTER contact_image'
            );
            console.log('attachment 字段添加成功');
        } else {
            console.log('attachment 字段已存在');
        }

        connection.release();
        await pool.end();
        console.log('迁移完成');
    } catch (error) {
        console.error('迁移失败:', error.message);
        process.exit(1);
    }
}

addAttachmentColumn();