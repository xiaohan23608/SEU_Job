// 全局变量
let currentPage = 1;
let editingId = null;
let imageList = []; // 图片URL数组

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
    setupContactImageUpload();
    document.getElementById('addImageBtn').addEventListener('click', () => addImageField(''));
});

// 设置事件监听
function setupEventListeners() {
    // 新增按钮
    document.getElementById('addBtn').addEventListener('click', () => {
        editingId = null;
        document.getElementById('modalTitle').textContent = '新增招聘信息';
        document.getElementById('jobForm').reset();
        document.getElementById('jobId').value = '';
        imageList = [];
        renderImageFields();
        document.getElementById('contactImagePreview').innerHTML = '';
        showModal();
    });

    // 关闭模态框
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('cancelBtn').addEventListener('click', hideModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) hideModal();
    });

    // 表单提交
    document.getElementById('jobForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveJob();
    });

    // 登出按钮
    document.getElementById('logoutBtn').addEventListener('click', async () => {
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

// 加载招聘信息
async function loadJobs() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            active: false
        });

        const res = await fetch(`/api/jobs?${params}`);
        const data = await res.json();

        if (data.success) {
            renderTable(data.data.jobs);
            renderPagination(data.data.pagination);
        }
    } catch (err) {
        console.error('加载失败:', err);
    }
}

// 渲染表格
function renderTable(jobs) {
    const tbody = document.getElementById('jobTableBody');

    if (jobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = jobs.map(job => `
        <tr>
            <td>${escapeHtml(job.title)}</td>
            <td>${escapeHtml(job.company || '-')}</td>
            <td>${getContentIndicators(job)}</td>
            <td>
                <span class="status-badge ${job.is_active ? 'status-active' : 'status-inactive'}">
                    ${job.is_active ? '上架' : '下架'}
                </span>
            </td>
            <td>${job.original_time ? new Date(job.original_time).toLocaleDateString('zh-CN') : '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="editJob(${job.id})">编辑</button>
                    <button class="action-btn" onclick="toggleJob(${job.id}, this)">
                        ${job.is_active ? '下架' : '上架'}
                    </button>
                    <button class="action-btn action-btn-danger" onclick="deleteJob(${job.id})">删除</button>
                </div>
            </td>
        </tr>
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
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">上一页</button>`;

    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<button disabled>...</button>';
        }
    }

    html += `<button ${page >= pages ? 'disabled' : ''} onclick="goToPage(${page + 1})">下一页</button>`;
    container.innerHTML = html;
}

// 跳转页面
function goToPage(page) {
    currentPage = page;
    loadJobs();
}

// 显示模态框
function showModal() {
    document.getElementById('modalOverlay').classList.add('active');
}

// 隐藏模态框
function hideModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// 获取内容标识
function getContentIndicators(job) {
    const indicators = [];
    if (job.content_text) indicators.push('📝');
    if (job.content_image) indicators.push('🖼️');
    if (job.content_link) indicators.push('🔗');
    if (job.hr_contact) indicators.push('📞');
    if (job.contact_image) indicators.push('📩');
    return indicators.join(' ') || '-';
}

// 解析图片字段（兼容旧数据单URL和新JSON数组）
function parseImages(contentImage) {
    if (!contentImage) return [];
    try {
        const parsed = JSON.parse(contentImage);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {}
    // 旧数据：单个URL字符串
    return [contentImage];
}

// 渲染图片字段列表
function renderImageFields() {
    const container = document.getElementById('imageList');
    if (imageList.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:13px;">暂无图片</p>';
        return;
    }
    container.innerHTML = imageList.map((url, index) => `
        <div class="image-item" data-index="${index}">
            <div class="image-item-preview">
                ${url ? `<img src="${escapeHtml(url)}" onerror="this.style.display='none'">` : '<span style="color:#999;">无预览</span>'}
            </div>
            <div class="image-item-controls">
                <input type="text" class="image-url-input" value="${escapeHtml(url || '')}" placeholder="输入图片URL" onchange="updateImageUrl(${index}, this.value)">
                <input type="file" class="image-file-input" accept="image/*" style="display:none;" onchange="uploadImageForIndex(${index}, this)">
                <button type="button" class="btn btn-small" onclick="this.previousElementSibling.click()">选择</button>
                <button type="button" class="btn btn-small" onclick="triggerUpload(${index})">上传</button>
                <button type="button" class="btn btn-small btn-danger" onclick="removeImageField(${index})">删除</button>
            </div>
        </div>
    `).join('');
}

// 添加图片字段
function addImageField(url) {
    imageList.push(url || '');
    renderImageFields();
}

// 删除图片字段
function removeImageField(index) {
    imageList.splice(index, 1);
    renderImageFields();
}

// 更新图片URL
function updateImageUrl(index, url) {
    imageList[index] = url;
    // 更新预览
    const item = document.querySelector(`.image-item[data-index="${index}"] .image-item-preview`);
    if (item) {
        item.innerHTML = url ? `<img src="${escapeHtml(url)}" onerror="this.style.display='none'">` : '<span style="color:#999;">无预览</span>';
    }
}

// 触发指定图片的上传
function triggerUpload(index) {
    const fileInput = document.querySelectorAll('.image-file-input')[index];
    if (fileInput) fileInput.click();
}

// 上传指定索引的图片
async function uploadImageForIndex(index, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            imageList[index] = data.url;
            renderImageFields();
            alert('上传成功！');
        } else {
            alert(data.message || '上传失败');
        }
    } catch (err) {
        alert('上传失败：' + err.message);
    }
}

// 编辑招聘信息
async function editJob(id) {
    try {
        const res = await fetch(`/api/jobs/${id}`);
        const data = await res.json();

        if (data.success) {
            const job = data.data;
            editingId = id;
            document.getElementById('modalTitle').textContent = '编辑招聘信息';
            document.getElementById('jobId').value = job.id;
            document.getElementById('formTitle').value = job.title;
            document.getElementById('formCompany').value = job.company || '';
            document.getElementById('formSummary').value = job.summary || '';
            document.getElementById('formText').value = job.content_text || '';
            document.getElementById('formLink').value = job.content_link || '';
            document.getElementById('formTags').value = job.tags || '';
            document.getElementById('formHrContact').value = job.hr_contact || '';
            document.getElementById('formContactImage').value = job.contact_image || '';

            // 解析多图
            imageList = parseImages(job.content_image);
            renderImageFields();

            // 投递联系图片预览
            const contactPreview = document.getElementById('contactImagePreview');
            contactPreview.innerHTML = job.contact_image ? `<img src="${escapeHtml(job.contact_image)}" style="max-width:200px;max-height:150px;border-radius:4px;" onerror="this.style.display='none'">` : '';

            showModal();
        }
    } catch (err) {
        console.error('获取详情失败:', err);
    }
}

// 保存招聘信息
async function saveJob() {
    // 同步图片列表中输入框的最新值
    document.querySelectorAll('.image-url-input').forEach((input, i) => {
        imageList[i] = input.value;
    });

    // 过滤空值
    const images = imageList.filter(url => url && url.trim());

    const jobData = {
        title: document.getElementById('formTitle').value,
        company: document.getElementById('formCompany').value,
        summary: document.getElementById('formSummary').value,
        content_text: document.getElementById('formText').value || null,
        content_image: images.length > 0 ? JSON.stringify(images) : null,
        content_link: document.getElementById('formLink').value || null,
        tags: document.getElementById('formTags').value || null,
        hr_contact: document.getElementById('formHrContact').value || null,
        contact_image: document.getElementById('formContactImage').value || null
    };

    try {
        const url = editingId ? `/api/jobs/${editingId}` : '/api/jobs';
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });

        const data = await res.json();

        if (data.success) {
            hideModal();
            loadJobs();
            alert(editingId ? '更新成功' : '创建成功');
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('保存失败:', err);
        alert('保存失败，请重试');
    }
}

// 切换上下架状态
async function toggleJob(id, btn) {
    if (btn.disabled) return;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '处理中...';
    btn.style.opacity = '0.6';

    try {
        const res = await fetch(`/api/jobs/${id}/toggle`, { method: 'PATCH' });
        const data = await res.json();

        if (data.success) {
            loadJobs();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('切换失败:', err);
        alert('操作失败，请重试');
    } finally {
        // 恢复按钮（loadJobs 会重新渲染表格，但失败时需要手动恢复）
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = '';
    }
}

// 删除招聘信息
async function deleteJob(id) {
    if (!confirm('确定要删除这条招聘信息吗？')) return;

    try {
        const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            loadJobs();
            alert('删除成功');
        } else {
            alert(data.message || '删除失败');
        }
    } catch (err) {
        console.error('删除失败:', err);
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 设置投递联系图片上传
function setupContactImageUpload() {
    const fileInput = document.getElementById('contactImageFile');
    const uploadBtn = document.getElementById('uploadContactImageBtn');
    const contactImageInput = document.getElementById('formContactImage');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('contactImagePreview').innerHTML =
                    `<img src="${e.target.result}" style="max-width:200px;max-height:150px;border-radius:4px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('请先选择文件');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                contactImageInput.value = data.url;
                document.getElementById('contactImagePreview').innerHTML =
                    `<img src="${data.url}" style="max-width:200px;max-height:150px;border-radius:4px;">`;
                fileInput.value = '';
                alert('上传成功！');
            } else {
                alert(data.message || '上传失败');
            }
        } catch (err) {
            alert('上传失败：' + err.message);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '上传';
        }
    });

    contactImageInput.addEventListener('input', () => {
        const url = contactImageInput.value;
        if (url) {
            document.getElementById('contactImagePreview').innerHTML =
                `<img src="${url}" style="max-width:200px;max-height:150px;border-radius:4px;" onerror="this.style.display='none'">`;
        } else {
            document.getElementById('contactImagePreview').innerHTML = '';
        }
    });
}
