// 全局变量
let currentPage = 1;
let editingId = null;
let imageList = []; // 图片URL数组
let pendingFiles = []; // 待上传的文件对象数组（与imageList同索引）

// 清空所有待上传文件的本地预览URL，防止内存泄漏
function clearPendingFiles() {
    for (const p of pendingFiles) {
        if (p?.objectUrl) URL.revokeObjectURL(p.objectUrl);
    }
    pendingFiles = [];
}

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
    setupContactImageUpload();
    setupAttachmentUpload();
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
        clearPendingFiles();
        imageList = [];
        renderImageFields();
        clearContactImage();
        clearAttachment();
        showModal();
    });

    // 关闭模态框
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('cancelBtn').addEventListener('click', hideModal);

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
    if (job.attachment) indicators.push('📎');
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
    container.innerHTML = imageList.map((url, index) => {
        const hasPending = !!pendingFiles[index];
        const preview = hasPending
            ? `<img src="${pendingFiles[index].objectUrl}" class="pending-preview">`
            : (url ? `<img src="${escapeHtml(url)}" onerror="this.style.display='none'">` : '<span style="color:#999;">无预览</span>');
        const statusTag = hasPending
            ? '<span class="status-tag pending">待上传</span>'
            : (url ? '<span class="status-tag uploaded">已上传</span>' : '');
        return `
        <div class="image-item" data-index="${index}">
            <div class="image-item-preview">${preview}</div>
            <div class="image-item-controls">
                <input type="text" class="image-url-input" value="${escapeHtml(url || '')}" placeholder="输入图片URL" onchange="updateImageUrl(${index}, this.value)">
                <input type="file" class="image-file-input" accept="image/*" style="display:none;" onchange="selectFileForIndex(${index}, this)">
                <button type="button" class="btn btn-small" onclick="this.previousElementSibling.click()">选择</button>
                <button type="button" class="btn btn-small btn-primary" onclick="uploadForIndex(${index})" ${!hasPending ? 'disabled style="opacity:0.5"' : ''}>上传</button>
                ${statusTag}
                <button type="button" class="btn btn-small btn-danger" onclick="removeImageField(${index})">删除</button>
            </div>
        </div>`;
    }).join('');
}

// 添加图片字段
function addImageField(url) {
    imageList.push(url || '');
    pendingFiles.push(null);
    renderImageFields();
}

// 删除图片字段
function removeImageField(index) {
    // 释放 objectUrl 防止内存泄漏
    if (pendingFiles[index]?.objectUrl) {
        URL.revokeObjectURL(pendingFiles[index].objectUrl);
    }
    imageList.splice(index, 1);
    pendingFiles.splice(index, 1);
    renderImageFields();
}

// 更新图片URL
function updateImageUrl(index, url) {
    imageList[index] = url;
    // 选择URL输入时清除待上传文件
    if (url && pendingFiles[index]) {
        URL.revokeObjectURL(pendingFiles[index].objectUrl);
        pendingFiles[index] = null;
    }
    renderImageFields();
}

// 选择文件（仅预览，不上传）
function selectFileForIndex(index, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    // 释放旧的 objectUrl
    if (pendingFiles[index]?.objectUrl) {
        URL.revokeObjectURL(pendingFiles[index].objectUrl);
    }

    // 存储文件和本地预览URL
    pendingFiles[index] = {
        file: file,
        objectUrl: URL.createObjectURL(file)
    };
    // 清空手动输入的URL，以待上传文件为准
    imageList[index] = '';
    renderImageFields();
}

// 上传指定索引的图片
async function uploadForIndex(index) {
    const pending = pendingFiles[index];
    if (!pending) {
        alert('请先选择要上传的图片');
        return;
    }

    const btn = document.querySelectorAll('.image-item')[index]?.querySelector('.btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '上传中...'; }

    const formData = new FormData();
    formData.append('image', pending.file);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            imageList[index] = data.url;
            URL.revokeObjectURL(pending.objectUrl);
            pendingFiles[index] = null;
            renderImageFields();
        } else {
            alert(data.message || '上传失败');
        }
    } catch (err) {
        alert('上传失败：' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '上传'; }
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
            clearPendingFiles();
            imageList = parseImages(job.content_image);
            pendingFiles = new Array(imageList.length).fill(null);
            renderImageFields();

            // 投递联系图片预览
            if (job.contact_image) {
                document.getElementById('contactImageItem').style.display = 'flex';
                document.getElementById('addContactImageBtn').style.display = 'none';
                document.getElementById('contactImagePreview').innerHTML = `<img src="${escapeHtml(job.contact_image)}" onerror="this.style.display='none'">`;
                document.getElementById('contactImageStatus').textContent = '已上传';
                document.getElementById('contactImageStatus').className = 'status-tag uploaded';
            } else {
                document.getElementById('contactImageItem').style.display = 'none';
                document.getElementById('addContactImageBtn').style.display = 'inline-flex';
                document.getElementById('contactImagePreview').innerHTML = '';
                document.getElementById('contactImageStatus').textContent = '';
                document.getElementById('contactImageStatus').className = 'status-tag';
            }

            // 附件预览
            if (job.attachment) {
                document.getElementById('attachmentItem').style.display = 'flex';
                document.getElementById('addAttachmentBtn').style.display = 'none';
                document.getElementById('formAttachment').value = job.attachment;
                // 从URL中提取文件名
                const filename = job.attachment.split('/').pop();
                document.getElementById('attachmentLink').href = job.attachment;
                document.getElementById('attachmentLink').textContent = filename || '查看附件';
                document.getElementById('attachmentStatus').textContent = '已上传';
                document.getElementById('attachmentStatus').className = 'status-tag uploaded';
            } else {
                document.getElementById('attachmentItem').style.display = 'none';
                document.getElementById('addAttachmentBtn').style.display = 'inline-flex';
                document.getElementById('formAttachment').value = '';
                document.getElementById('attachmentLink').href = '#';
                document.getElementById('attachmentLink').textContent = '查看附件';
                document.getElementById('attachmentStatus').textContent = '';
                document.getElementById('attachmentStatus').className = 'status-tag';
            }

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

    // 自动上传所有待上传的图片
    for (let i = 0; i < pendingFiles.length; i++) {
        if (pendingFiles[i]) {
            const formData = new FormData();
            formData.append('image', pendingFiles[i].file);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    imageList[i] = data.url;
                    URL.revokeObjectURL(pendingFiles[i].objectUrl);
                    pendingFiles[i] = null;
                } else {
                    alert(`第${i + 1}张图片上传失败: ${data.message || '未知错误'}`);
                    return;
                }
            } catch (err) {
                alert(`第${i + 1}张图片上传失败: ${err.message}`);
                return;
            }
        }
    }

    // 自动上传投递联系图片
    if (contactImagePending) {
        const formData = new FormData();
        formData.append('image', contactImagePending.file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                document.getElementById('formContactImage').value = data.url;
                URL.revokeObjectURL(contactImagePending.objectUrl);
                contactImagePending = null;
            } else {
                alert(`投递联系图片上传失败: ${data.message || '未知错误'}`);
                return;
            }
        } catch (err) {
            alert(`投递联系图片上传失败: ${err.message}`);
            return;
        }
    }

    // 自动上传附件
    if (attachmentPending) {
        const formData = new FormData();
        formData.append('document', attachmentPending.file);
        try {
            const res = await fetch('/api/upload-document', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                document.getElementById('formAttachment').value = data.url;
                attachmentPending = null;
            } else {
                alert(`附件上传失败: ${data.message || '未知错误'}`);
                return;
            }
        } catch (err) {
            alert(`附件上传失败: ${err.message}`);
            return;
        }
    }

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
        contact_image: document.getElementById('formContactImage').value || null,
        attachment: document.getElementById('formAttachment').value || null
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

// 投递联系图片相关变量
let contactImagePending = null; // 待上传的文件对象

// 附件相关变量
let attachmentPending = null; // 待上传的文件对象

// 添加投递联系图片
function addContactImage() {
    document.getElementById('contactImageItem').style.display = 'flex';
    document.getElementById('addContactImageBtn').style.display = 'none';
}

// 清除投递联系图片
function clearContactImage() {
    if (contactImagePending?.objectUrl) {
        URL.revokeObjectURL(contactImagePending.objectUrl);
    }
    contactImagePending = null;
    document.getElementById('formContactImage').value = '';
    document.getElementById('contactImageFile').value = '';
    document.getElementById('contactImagePreview').innerHTML = '';
    document.getElementById('contactImageStatus').textContent = '';
    document.getElementById('contactImageStatus').className = 'status-tag';
    document.getElementById('uploadContactImageBtn').disabled = true;
    document.getElementById('uploadContactImageBtn').style.opacity = '0.5';
    document.getElementById('contactImageItem').style.display = 'none';
    document.getElementById('addContactImageBtn').style.display = 'inline-flex';
}

// 设置投递联系图片上传
function setupContactImageUpload() {
    const fileInput = document.getElementById('contactImageFile');
    const uploadBtn = document.getElementById('uploadContactImageBtn');
    const contactImageInput = document.getElementById('formContactImage');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            // 释放旧的 objectUrl
            if (contactImagePending?.objectUrl) {
                URL.revokeObjectURL(contactImagePending.objectUrl);
            }

            // 存储文件和本地预览URL
            contactImagePending = {
                file: file,
                objectUrl: URL.createObjectURL(file)
            };

            document.getElementById('contactImagePreview').innerHTML =
                `<img src="${contactImagePending.objectUrl}" class="pending-preview">`;
            document.getElementById('contactImageStatus').textContent = '待上传';
            document.getElementById('contactImageStatus').className = 'status-tag pending';
            document.getElementById('uploadContactImageBtn').disabled = false;
            document.getElementById('uploadContactImageBtn').style.opacity = '1';
            // 清空手动输入的URL，以待上传文件为准
            contactImageInput.value = '';
        }
    });

    uploadBtn.addEventListener('click', async () => {
        if (!contactImagePending) {
            alert('请先选择要上传的图片');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';

        const formData = new FormData();
        formData.append('image', contactImagePending.file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                contactImageInput.value = data.url;
                URL.revokeObjectURL(contactImagePending.objectUrl);
                contactImagePending = null;
                document.getElementById('contactImagePreview').innerHTML =
                    `<img src="${data.url}">`;
                document.getElementById('contactImageStatus').textContent = '已上传';
                document.getElementById('contactImageStatus').className = 'status-tag uploaded';
                document.getElementById('uploadContactImageBtn').disabled = true;
                document.getElementById('uploadContactImageBtn').style.opacity = '0.5';
                fileInput.value = '';
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
                `<img src="${url}" onerror="this.style.display='none'">`;
            document.getElementById('contactImageStatus').textContent = '已上传';
            document.getElementById('contactImageStatus').className = 'status-tag uploaded';
            document.getElementById('contactImageItem').style.display = 'flex';
            document.getElementById('addContactImageBtn').style.display = 'none';
        } else {
            document.getElementById('contactImagePreview').innerHTML = '';
            document.getElementById('contactImageStatus').textContent = '';
            document.getElementById('contactImageStatus').className = 'status-tag';
        }
    });
}

// 添加附件
function addAttachment() {
    document.getElementById('attachmentItem').style.display = 'flex';
    document.getElementById('addAttachmentBtn').style.display = 'none';
}

// 清除附件
function clearAttachment() {
    attachmentPending = null;
    document.getElementById('formAttachment').value = '';
    document.getElementById('attachmentFile').value = '';
    document.getElementById('attachmentLink').href = '#';
    document.getElementById('attachmentLink').textContent = '查看附件';
    document.getElementById('attachmentStatus').textContent = '';
    document.getElementById('attachmentStatus').className = 'status-tag';
    document.getElementById('uploadAttachmentBtn').disabled = true;
    document.getElementById('uploadAttachmentBtn').style.opacity = '0.5';
    document.getElementById('attachmentItem').style.display = 'none';
    document.getElementById('addAttachmentBtn').style.display = 'inline-flex';
}

// 设置附件上传
function setupAttachmentUpload() {
    const fileInput = document.getElementById('attachmentFile');
    const uploadBtn = document.getElementById('uploadAttachmentBtn');
    const attachmentInput = document.getElementById('formAttachment');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            attachmentPending = { file: file };

            document.getElementById('attachmentLink').textContent = file.name;
            document.getElementById('attachmentLink').href = '#';
            document.getElementById('attachmentStatus').textContent = '待上传';
            document.getElementById('attachmentStatus').className = 'status-tag pending';
            document.getElementById('uploadAttachmentBtn').disabled = false;
            document.getElementById('uploadAttachmentBtn').style.opacity = '1';
        }
    });

    uploadBtn.addEventListener('click', async () => {
        if (!attachmentPending) {
            alert('请先选择要上传的文件');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';

        const formData = new FormData();
        formData.append('document', attachmentPending.file);

        try {
            const res = await fetch('/api/upload-document', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                attachmentInput.value = data.url;
                document.getElementById('attachmentLink').href = data.url;
                document.getElementById('attachmentLink').textContent = data.filename || '查看附件';
                document.getElementById('attachmentStatus').textContent = '已上传';
                document.getElementById('attachmentStatus').className = 'status-tag uploaded';
                document.getElementById('uploadAttachmentBtn').disabled = true;
                document.getElementById('uploadAttachmentBtn').style.opacity = '0.5';
                attachmentPending = null;
                fileInput.value = '';
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
}
