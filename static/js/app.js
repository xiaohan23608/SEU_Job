// 全局变量
let currentPage = 1;
const pageSize = 20;
let filteredJobs = [...JOBS_DATA];

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    setupRouter();
    setupSearch();
    handleRoute();
});

// 路由设置
function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
}

// 处理路由
function handleRoute() {
    const hash = window.location.hash || '#/';
    const pageHome = document.getElementById('page-home');
    const pageDetail = document.getElementById('page-detail');

    if (hash.startsWith('#/detail/')) {
        const id = parseInt(hash.split('/')[2]);
        showDetail(id);
        pageHome.style.display = 'none';
        pageDetail.style.display = 'block';
    } else {
        pageHome.style.display = 'block';
        pageDetail.style.display = 'none';
        renderCards();
    }
}

// 搜索设置
function setupSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');

    btn.addEventListener('click', () => {
        const keyword = input.value.trim().toLowerCase();
        if (keyword) {
            filteredJobs = JOBS_DATA.filter(job =>
                (job.title && job.title.toLowerCase().includes(keyword)) ||
                (job.company && job.company.toLowerCase().includes(keyword)) ||
                (job.summary && job.summary.toLowerCase().includes(keyword))
            );
        } else {
            filteredJobs = [...JOBS_DATA];
        }
        currentPage = 1;
        renderCards();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btn.click();
    });
}

// 渲染卡片
function renderCards() {
    const grid = document.getElementById('cardGrid');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageJobs = filteredJobs.slice(start, end);

    if (pageJobs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>暂无招聘信息</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    grid.innerHTML = pageJobs.map(job => `
        <div class="card" onclick="location.hash='#/detail/${job.id}'">
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(job.title)}</h3>
                ${job.company ? `<p class="card-company">🏢 ${escapeHtml(job.company)}</p>` : ''}
                ${job.summary ? `<p class="card-summary">${escapeHtml(job.summary)}</p>` : ''}
                <div class="card-footer">
                    <div class="card-indicators">${getContentIndicators(job)}</div>
                    ${job.original_time ? `<span class="card-time">${formatDate(job.original_time)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    renderPagination();
}

// 渲染分页
function renderPagination() {
    const total = Math.ceil(filteredJobs.length / pageSize);
    const container = document.getElementById('pagination');

    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">上一页</button>`;

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<button disabled>...</button>';
        }
    }

    html += `<button ${currentPage >= total ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">下一页</button>`;
    container.innerHTML = html;
}

// 跳转页面
function goToPage(page) {
    currentPage = page;
    renderCards();
    window.scrollTo(0, 0);
}

// 显示详情
function showDetail(id) {
    const job = JOBS_DATA.find(j => j.id === id);
    if (!job) {
        document.getElementById('detailContent').innerHTML = '<div class="empty-state"><p>招聘信息不存在</p></div>';
        return;
    }

    const container = document.getElementById('detailContent');
    container.innerHTML = `
        <h1>${escapeHtml(job.title)}</h1>
        <div class="detail-meta">
            ${job.company ? `<span>🏢 ${escapeHtml(job.company)}</span>` : ''}
            ${job.sender_name ? `<span>👤 ${escapeHtml(job.sender_name)}</span>` : ''}
            ${job.original_time ? `<span>📅 ${formatDate(job.original_time)}</span>` : ''}
        </div>
        <div class="detail-content">
            ${job.content_text ? `<div class="detail-content-text" id="contentText">${escapeHtml(job.content_text)}</div>` : ''}
            ${renderDetailImages(job.content_image)}
            ${job.content_link ? `<div class="detail-content-link"><p>推送链接：</p><a href="${escapeHtml(job.content_link)}" target="_blank" rel="noopener noreferrer">点击查看</a></div>` : ''}
            ${job.hr_contact ? `<div class="detail-hr-contact"><p>📞 HR联系方式：${escapeHtml(job.hr_contact)}</p></div>` : ''}
            ${job.contact_image ? `<div class="detail-content-image"><img src="${escapeHtml(fixImagePath(job.contact_image))}" alt="投递联系图片"></div>` : ''}
            ${job.attachment ? `<div class="detail-attachment"><p>📎 附件下载：</p><a href="${escapeHtml(fixImagePath(job.attachment))}" target="_blank" class="btn btn-primary">📄 下载附件</a></div>` : ''}
        </div>
        ${job.tags ? `<div class="detail-tags">${job.tags.split(',').map(tag => `<span class="tag">${escapeHtml(tag.trim())}</span>`).join('')}</div>` : ''}
    `;

    // 将文本中的URL转换为可点击链接
    setTimeout(() => {
        const contentText = document.getElementById('contentText');
        if (contentText) {
            const urlRegex = /(https?:\/\/[^\s<]+[^.,;:!?\s<])/g;
            contentText.innerHTML = contentText.innerHTML.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        }
    }, 0);
}

// 获取内容标识
function getContentIndicators(job) {
    const indicators = [];
    if (job.content_text) indicators.push('📝');
    if (job.content_image) indicators.push('🖼️');
    if (job.content_link) indicators.push('🔗');
    if (job.hr_contact) indicators.push('📞');
    if (job.contact_image) indicators.push('📩');
    if (job.attachment) indicators.push('📎');
    return indicators.join(' ');
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// 修复图片路径（处理 GitHub Pages 基础路径）
function fixImagePath(url) {
    if (!url) return '';
    // 外部链接直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // 本地上传路径：转换为相对路径
    if (url.startsWith('/uploads/')) {
        return new URL(url.substring(1), document.baseURI).href;
    }
    return url;
}

// 文章页面地址不能作为图片加载
function isImageUrl(url) {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    return /\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(url);
}

// 解析多图字段（兼容旧数据单URL和新JSON数组）
function parseImageUrls(contentImage) {
    if (!contentImage) return [];
    try {
        const parsed = JSON.parse(contentImage);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {}
    return [contentImage];
}

// 渲染详情页多图
function renderDetailImages(contentImage) {
    const images = parseImageUrls(contentImage).filter(url => isImageUrl(url));
    if (images.length === 0) return '';
    if (images.length === 1) {
        return `<div class="detail-content-image"><img src="${escapeHtml(fixImagePath(images[0]))}" alt="招聘图片"></div>`;
    }
    return `<div class="detail-images-grid">${images.map(url =>
        `<div class="detail-content-image"><img src="${escapeHtml(fixImagePath(url))}" alt="招聘图片"></div>`
    ).join('')}</div>`;
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
