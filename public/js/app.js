// 全局变量
let currentPage = 1;
let currentKeyword = '';

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    // 搜索按钮
    document.getElementById('searchBtn').addEventListener('click', () => {
        currentKeyword = document.getElementById('searchInput').value;
        currentPage = 1;
        loadJobs();
    });

    // 回车搜索
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentKeyword = e.target.value;
            currentPage = 1;
            loadJobs();
        }
    });

    // 登出按钮（仅管理员可见）
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/logout', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    window.location.href = '/login';
                }
            } catch (err) {
                console.error('登出失败:', err);
            }
        });
    }
}

// 加载招聘信息
async function loadJobs() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            active: true
        });

        if (currentKeyword) params.append('keyword', currentKeyword);

        const res = await fetch(`/api/jobs?${params}`);
        const data = await res.json();

        if (data.success) {
            renderCards(data.data.jobs);
            renderPagination(data.data.pagination);
        }
    } catch (err) {
        console.error('加载失败:', err);
    }
}

// 渲染卡片
function renderCards(jobs) {
    const grid = document.getElementById('cardGrid');

    if (jobs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>暂无招聘信息</p></div>';
        return;
    }

    grid.innerHTML = jobs.map(job => `
        <div class="card" onclick="window.location.href='/job/${job.id}'">
            <div class="card-header">
                <span class="card-indicators">${getContentIndicators(job)}</span>
            </div>
            <div class="card-title">${escapeHtml(job.title)}</div>
            ${job.company ? `<div class="card-company">${escapeHtml(job.company)}</div>` : ''}
            <div class="card-summary">${escapeHtml(job.summary || '')}</div>
            <div class="card-footer">
                <span>${job.original_time ? new Date(job.original_time).toLocaleDateString('zh-CN') : ''}</span>
            </div>
        </div>
    `).join('');
}

// 渲染分页
function renderPagination(pagination) {
    const { page, pages } = pagination;
    const container = document.getElementById('pagination');

    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // 上一页
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">上一页</button>`;

    // 页码
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<button disabled>...</button>';
        }
    }

    // 下一页
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="goToPage(${page + 1})">下一页</button>`;

    container.innerHTML = html;
}

// 跳转页面
function goToPage(page) {
    currentPage = page;
    loadJobs();
    window.scrollTo(0, 0);
}

// 获取内容标识
function getContentIndicators(job) {
    const indicators = [];
    if (job.content_text) indicators.push('📝');
    if (job.content_image) indicators.push('🖼️');
    if (job.content_link) indicators.push('🔗');
    if (job.hr_contact) indicators.push('📞');
    if (job.contact_image) indicators.push('📩');
    return indicators.join(' ');
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
