// TechPA Admin Portal Script - Hoàn Chỉnh Toàn Diện (Có Auth Guard & Socials Config)

// 1. AUTH GUARD: Kiểm tra token trước khi tải trang
const adminToken = localStorage.getItem('techpa_admin_token');
if (!adminToken) {
  window.location.href = '/login.html';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (localStorage.getItem('techpa_admin_token') || '')
  };
}

// Logout Handler
document.getElementById('btnLogout')?.addEventListener('click', () => {
  localStorage.removeItem('techpa_admin_token');
  window.location.href = '/login.html';
});

let currentData = null;
let currentLeads = [];

const TAB_TITLES = {
  overview: { title: 'Dashboard Thống Kê', sub: 'Hệ thống quản trị nội dung & khách hàng tiềm năng TechPA' },
  leads: { title: 'Quản Lý Yêu Cầu Tư Vấn (Leads)', sub: 'Danh sách khách hàng tiềm năng gửi từ website' },
  menu: { title: 'Cấu Hình Menu & Nhãn Nổi Bật', sub: 'Tùy chỉnh tên menu và nhãn Hot / New / Pro' },
  services: { title: 'Quản Trị Dịch Vụ Công Nghệ', sub: 'Thêm, sửa, xóa các gói giải pháp số' },
  projects: { title: 'Quản Trị Dự Án Tiêu Biểu', sub: 'Các câu chuyện thành công và case studies' },
  socials: { title: 'Cấu Hình Kênh Mạng Xã Hội', sub: 'Đường dẫn Zalo, Facebook, LinkedIn, YouTube' },
  settings: { title: 'Cấu Hình Hệ Thống & Hotline', sub: 'Thông tin thương hiệu TechPA và banner ưu đãi' }
};

// Switch Tab
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.side-link').forEach(el => el.classList.remove('active'));

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add('active');

  const activeLink = document.querySelector(`.side-link[data-tab="${tabId}"]`);
  if (activeLink) activeLink.classList.add('active');

  const info = TAB_TITLES[tabId] || TAB_TITLES.overview;
  document.getElementById('pageTitle').textContent = info.title;
  document.getElementById('pageSub').textContent = info.sub;
}

// Bind navigation clicks
document.querySelectorAll('.side-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    switchTab(tab);
  });
});

// Load Content & Leads
async function loadAdminData() {
  try {
    const [resContent, resLeads] = await Promise.all([
      fetch('/api/content'),
      fetch('/api/admin/leads', { headers: authHeaders() })
    ]);

    if (resLeads.status === 401) {
      localStorage.removeItem('techpa_admin_token');
      window.location.href = '/login.html';
      return;
    }

    currentData = await resContent.json();
    currentLeads = await resLeads.json();

    renderDashboard();
    renderLeads();
    renderMenuConfig();
    renderServicesList();
    renderProjectsList();
    populateSocials();
    populateSettings();
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

// Dashboard statistics
function renderDashboard() {
  const totalLeads = currentLeads.length;
  document.getElementById('dashTotalLeads').textContent = totalLeads;
  document.getElementById('leadsBadge').textContent = totalLeads;
  document.getElementById('dashTotalServices').textContent = currentData.services?.length || 0;
  document.getElementById('dashTotalProjects').textContent = currentData.projects?.length || 0;

  // Recent leads table (5 newest)
  const recentLeadsTable = document.getElementById('recentLeadsTable');
  if (currentLeads.length === 0) {
    recentLeadsTable.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có yêu cầu tư vấn nào. Hãy gửi thử form tại trang chủ!</td></tr>';
  } else {
    recentLeadsTable.innerHTML = currentLeads.slice(0, 5).map(l => `
      <tr>
        <td><span class="code-badge">${l.code || 'TPA-NEW'}</span></td>
        <td><strong>${escapeHtml(l.name)}</strong></td>
        <td>${escapeHtml(l.phone)}<br><small style="color:#64748b">${escapeHtml(l.email)}</small></td>
        <td><span style="color:#b45309;font-weight:700">${escapeHtml(l.service)}</span></td>
        <td>${new Date(l.date).toLocaleString('vi-VN')}</td>
        <td><span class="status-pill ${l.status === 'Đã liên hệ' ? 'done' : 'new'}">${l.status || 'Chờ xử lý'}</span></td>
      </tr>
    `).join('');
  }
}

// Render full leads list
function renderLeads() {
  const table = document.getElementById('allLeadsTable');
  if (currentLeads.length === 0) {
    table.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có yêu cầu tư vấn nào được ghi nhận.</td></tr>';
    return;
  }

  table.innerHTML = currentLeads.map((l) => `
    <tr>
      <td><span class="code-badge">${l.code || 'TPA-NEW'}</span></td>
      <td><strong>${escapeHtml(l.name)}</strong></td>
      <td>${escapeHtml(l.email)}</td>
      <td>${escapeHtml(l.phone)}</td>
      <td><span style="color:#b45309;font-weight:700">${escapeHtml(l.service)}</span></td>
      <td>${escapeHtml(l.message || 'Không có')}</td>
      <td>${new Date(l.date).toLocaleString('vi-VN')}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toggleLeadStatus('${l.code}')">
          ${l.status === 'Đã liên hệ' ? 'Đổi: Chờ xử lý' : 'Đổi: Đã liên hệ'}
        </button>
      </td>
    </tr>
  `).join('');
}

// Toggle lead status
async function toggleLeadStatus(code) {
  try {
    const res = await fetch(`/api/admin/leads/${code}/status`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (res.ok) {
      loadAdminData();
    }
  } catch (err) {
    alert('Không thể đổi trạng thái lead');
  }
}

// Render Menu Configuration (Nhãn Hot / New)
function renderMenuConfig() {
  const table = document.getElementById('menuConfigTable');
  if (!table || !currentData.nav) return;

  table.innerHTML = currentData.nav.map((item, index) => `
    <tr data-menu-index="${index}">
      <td>
        <input type="text" class="menu-label-input" value="${escapeHtml(item.label)}" style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;">
      </td>
      <td>
        <span style="font-family:monospace;color:#64748b;">${escapeHtml(item.link)}</span>
      </td>
      <td>
        <input type="text" class="menu-badge-input" value="${escapeHtml(item.badge || '')}" placeholder="Để trống nếu tắt" style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;">
      </td>
      <td>
        <select class="menu-color-select" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;">
          <option value="red" ${item.badgeColor === 'red' || !item.badgeColor ? 'selected' : ''}>Đỏ nổi bật (Hot)</option>
          <option value="gold" ${item.badgeColor === 'gold' ? 'selected' : ''}>Vàng kim (New/Gold)</option>
          <option value="green" ${item.badgeColor === 'green' ? 'selected' : ''}>Xanh lá (Free/Pro)</option>
        </select>
      </td>
      <td>
        <span style="font-weight:600;font-size:14px;">
          ${escapeHtml(item.label)}
          ${item.badge ? `<span class="nav-badge ${item.badgeColor || ''}" style="position:static;margin-left:6px;display:inline-block;">${escapeHtml(item.badge)}</span>` : ''}
        </span>
      </td>
    </tr>
  `).join('');
}

// Save Menu Configuration
document.getElementById('btnSaveMenu')?.addEventListener('click', async () => {
  const rows = document.querySelectorAll('#menuConfigTable tr');
  const updatedNav = [];
  const indicator = document.getElementById('menuSaveIndicator');

  rows.forEach((row, i) => {
    const label = row.querySelector('.menu-label-input').value.trim();
    const badge = row.querySelector('.menu-badge-input').value.trim();
    const badgeColor = row.querySelector('.menu-color-select').value;
    const orig = currentData.nav[i] || {};

    updatedNav.push({
      ...orig,
      label: label || orig.label,
      badge: badge || '',
      badgeColor
    });
  });

  indicator.textContent = 'Đang lưu cấu hình menu...';

  try {
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ nav: updatedNav })
    });
    if (res.ok) {
      indicator.textContent = '✓ Đã cập nhật menu & nhãn thành công!';
      setTimeout(() => indicator.textContent = '', 3000);
      loadAdminData();
    }
  } catch (err) {
    indicator.textContent = 'Lỗi lưu menu!';
  }
});

// Render Services
function renderServicesList() {
  const list = document.getElementById('adminServicesList');
  list.innerHTML = currentData.services.map(s => `
    <div class="service-admin-item">
      <div>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.shortDesc)}</p>
        <small style="color:#b45309;font-weight:700">${s.features.map(f => escapeHtml(f)).join(' • ')}</small>
      </div>
      <div>
        <button class="btn btn-outline btn-sm" onclick="deleteService('${s.id}')" style="color:#ef4444;border-color:#fca5a5">Xóa</button>
      </div>
    </div>
  `).join('');
}

// Render Projects
function renderProjectsList() {
  const list = document.getElementById('adminProjectsList');
  list.innerHTML = currentData.projects.map(p => `
    <div class="service-admin-item">
      <div style="display:flex;gap:14px;align-items:center;">
        <img src="${p.image}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;">
        <div>
          <h4>${escapeHtml(p.title)}</h4>
          <p>Khách hàng: <strong>${escapeHtml(p.client)}</strong> | Danh mục: <span style="color:#b45309;font-weight:600">${escapeHtml(p.category)}</span></p>
        </div>
      </div>
      <div>
        <button class="btn btn-outline btn-sm" onclick="deleteProject('${p.id}')" style="color:#ef4444;border-color:#fca5a5">Xóa</button>
      </div>
    </div>
  `).join('');
}

// Populate Socials
function populateSocials() {
  const s = currentData.socials || {};
  document.getElementById('setZalo').value = s.zalo || '';
  document.getElementById('setFacebook').value = s.facebook || '';
  document.getElementById('setLinkedin').value = s.linkedin || '';
  document.getElementById('setYoutube').value = s.youtube || '';
}

// Save Socials
document.getElementById('socialsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const indicator = document.getElementById('socialSaveIndicator');
  const btn = document.getElementById('btnSaveSocials');

  const updatedSocials = {
    zalo: document.getElementById('setZalo').value.trim(),
    facebook: document.getElementById('setFacebook').value.trim(),
    linkedin: document.getElementById('setLinkedin').value.trim(),
    youtube: document.getElementById('setYoutube').value.trim()
  };

  btn.disabled = true;
  indicator.textContent = 'Đang lưu...';

  try {
    const res = await fetch('/api/admin/socials', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ socials: updatedSocials })
    });
    if (res.ok) {
      indicator.textContent = '✓ Đã cập nhật kênh mạng xã hội thành công!';
      setTimeout(() => indicator.textContent = '', 3000);
      loadAdminData();
    }
  } catch (err) {
    indicator.textContent = 'Lỗi lưu mạng xã hội!';
  } finally {
    btn.disabled = false;
  }
});

// Settings form populate
function populateSettings() {
  const b = currentData.brand;
  document.getElementById('setBrandName').value = b.name || '';
  document.getElementById('setHotline').value = b.hotline || '';
  document.getElementById('setEmail').value = b.email || '';
  document.getElementById('setWorkingHours').value = b.workingHours || '';
  document.getElementById('setAddress').value = b.address || '';
  document.getElementById('setAnnouncement').value = b.announcement || '';
}

// Save Settings
document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveSettings');
  const indicator = document.getElementById('saveIndicator');

  const updatedBrand = {
    ...currentData.brand,
    name: document.getElementById('setBrandName').value,
    hotline: document.getElementById('setHotline').value,
    email: document.getElementById('setEmail').value,
    workingHours: document.getElementById('setWorkingHours').value,
    address: document.getElementById('setAddress').value,
    announcement: document.getElementById('setAnnouncement').value
  };

  btn.disabled = true;
  indicator.textContent = 'Đang lưu...';

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ brand: updatedBrand })
    });
    if (res.ok) {
      indicator.textContent = '✓ Đã cập nhật thành công!';
      setTimeout(() => indicator.textContent = '', 3000);
      loadAdminData();
    }
  } catch (err) {
    indicator.textContent = 'Lỗi lưu cấu hình!';
  } finally {
    btn.disabled = false;
  }
});

// Modal helpers
function closeModals() {
  document.getElementById('serviceModal').hidden = true;
  document.getElementById('projectModal').hidden = true;
}

document.getElementById('btnOpenNewService')?.addEventListener('click', () => {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceModal').hidden = false;
});

document.getElementById('btnOpenNewProject')?.addEventListener('click', () => {
  document.getElementById('projectForm').reset();
  document.getElementById('projectModal').hidden = false;
});

// Add Service Form
document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const title = form.title.value;
  const shortDesc = form.shortDesc.value;
  const features = form.features.value.split(',').map(x => x.trim()).filter(Boolean);

  const newService = {
    id: 'srv-' + Date.now(),
    icon: 'code',
    title,
    shortDesc,
    features: features.length ? features : ['Tư vấn chuyên sâu', 'Triển khai bảo hành trọn gói']
  };

  try {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newService)
    });
    if (res.ok) {
      closeModals();
      loadAdminData();
    }
  } catch (err) {
    alert('Không thể lưu dịch vụ mới');
  }
});

// Add Project Form
document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const title = form.title.value;
  const client = form.client.value;
  const category = form.category.value;
  const image = form.image.value || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';

  const newProject = {
    id: 'proj-' + Date.now(),
    title,
    client,
    category,
    image,
    tag: 'Enterprise'
  };

  try {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newProject)
    });
    if (res.ok) {
      closeModals();
      loadAdminData();
    }
  } catch (err) {
    alert('Không thể lưu dự án mới');
  }
});

async function deleteService(id) {
  if (!confirm('Bạn có chắc muốn xóa dịch vụ này khỏi trang chủ?')) return;
  try {
    const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) loadAdminData();
  } catch (err) {
    alert('Không thể xóa dịch vụ');
  }
}

async function deleteProject(id) {
  if (!confirm('Bạn có chắc muốn xóa dự án này khỏi trang chủ?')) return;
  try {
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) loadAdminData();
  } catch (err) {
    alert('Không thể xóa dự án');
  }
}

document.getElementById('btnRefreshLeads')?.addEventListener('click', loadAdminData);

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadAdminData);
