// TechPA Admin Portal - Quản Trị Hệ Thống & Phân Quyền Đa Cấp (RBAC)

let currentUser = null;
let currentData = null; // { vi: {...}, en: {...} }
let currentContent = null; // currentData.vi
let currentLeads = [];
let currentUsers = [];
let availablePermissions = [];
let availableRoles = [];

function getToken() {
  return localStorage.getItem('techpa_admin_token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// ---------------- 1. AUTH GUARD & INITIALIZATION ----------------

async function checkAuthAndInit() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await fetch('/api/admin/me', { headers: authHeaders() });
    if (!res.ok) {
      localStorage.removeItem('techpa_admin_token');
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    currentUser = data.user;
    updateTopbar(currentUser, data.storage);
    applyPermissionGuards(currentUser);

    // Load static roles & permissions catalog if user can manage users
    if (hasPermission('users.manage')) {
      try {
        const rpRes = await fetch('/api/admin/roles-permissions', { headers: authHeaders() });
        if (rpRes.ok) {
          const rpData = await rpRes.json();
          availablePermissions = rpData.permissions || [];
          availableRoles = rpData.roles || [];
          renderPermissionsCheckboxes();
        }
      } catch (e) {
        console.warn('Could not load roles-permissions metadata:', e);
      }
    }

    // Load core admin data
    await loadAdminData();
  } catch (err) {
    console.error('Lỗi xác thực:', err);
    localStorage.removeItem('techpa_admin_token');
    window.location.href = '/login.html';
  }
}

function hasPermission(perm) {
  if (!currentUser) return false;
  if (currentUser.role === 'superadmin') return true;
  if (currentUser.role === 'editor' && perm.startsWith('content.')) return true;
  return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(perm);
}

function updateTopbar(user, storage) {
  const nameEl = document.getElementById('topbarUsername');
  const roleEl = document.getElementById('topbarRole');
  const storageEl = document.getElementById('storageStatusBadge');

  if (nameEl) nameEl.textContent = user.fullName || user.username;
  if (roleEl) {
    roleEl.textContent = (user.role || 'user').toUpperCase();
    roleEl.className = `role-pill ${user.role || 'viewer'}`;
  }

  if (storageEl && storage) {
    if (storage.mode === 'redis') {
      storageEl.innerHTML = '<span>☁️ Upstash Redis (Lưu vĩnh viễn)</span>';
      storageEl.className = 'storage-pill redis';
    } else if (storage.mode === 'memory') {
      storageEl.innerHTML = '<span title="Đang lưu trong bộ nhớ tạm trên Vercel. Hãy liên kết Upstash để lưu vĩnh viễn">⚠️ Bộ nhớ tạm</span>';
      storageEl.className = 'storage-pill memory';
    } else {
      storageEl.innerHTML = '<span>💾 Local Storage (File)</span>';
      storageEl.className = 'storage-pill';
    }
  }
}

// Ẩn các menu và tính năng mà user không có quyền truy cập
function applyPermissionGuards(user) {
  const perms = user.permissions || [];
  const isSuper = user.role === 'superadmin';

  document.querySelectorAll('[data-perm]').forEach((el) => {
    const required = el.dataset.perm;
    if (isSuper || perms.includes(required)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Ẩn các tiêu đề nhóm nếu tất cả mục con bị ẩn
  document.querySelectorAll('.nav-group-title[data-perm-group]').forEach((title) => {
    const group = title.dataset.permGroup;
    let hasVisible = false;
    if (group === 'leads' && (isSuper || perms.includes('leads.view'))) hasVisible = true;
    if (group === 'content' && (isSuper || perms.some((p) => p.startsWith('content.')))) hasVisible = true;
    if (group === 'system' && (isSuper || perms.includes('users.manage'))) hasVisible = true;
    title.style.display = hasVisible ? '' : 'none';
  });

  // Nếu user không có quyền xem leads, ẩn thẻ leads trên dashboard
  const dashLeadsCard = document.getElementById('dashLeadsCard');
  if (dashLeadsCard) {
    dashLeadsCard.style.display = isSuper || perms.includes('leads.view') ? '' : 'none';
  }
}

// ---------------- 2. TAB NAVIGATION ----------------

const TAB_TITLES = {
  overview: { title: 'Dashboard Thống Kê', sub: 'Hệ thống quản lý nội dung & khách hàng tiềm năng TechPA' },
  leads: { title: 'Quản Lý Yêu Cầu Tư Vấn (Leads)', sub: 'Danh sách khách hàng tiềm năng gửi từ website' },
  menu: { title: 'Cấu Hình Menu & Nhãn Nổi Bật', sub: 'Tùy chỉnh tên menu và nhãn Hot / New / Pro' },
  services: { title: 'Quản Trị Dịch Vụ Công Nghệ', sub: 'Thêm, sửa, xóa các gói giải pháp số' },
  projects: { title: 'Quản Trị Dự Án Tiêu Biểu', sub: 'Các câu chuyện thành công và case studies' },
  pricing: { title: 'Quản Trị Bảng Giá & Chi Phí', sub: 'Thêm, sửa, xóa các gói giải pháp và bảng giá công nghệ' },
  blog: { title: 'Quản Trị Tin Tức & Bài Viết', sub: 'Đăng tải các bài viết chuyên sâu về Cloud, Cyber Security, ERP và AI' },
  socials: { title: 'Cấu Hình Kênh Mạng Xã Hội', sub: 'Đường dẫn Zalo, Facebook, LinkedIn, YouTube' },
  settings: { title: 'Cấu Hình Hệ Thống & Hotline', sub: 'Thông tin thương hiệu TechPA và banner ưu đãi' },
  users: { title: 'Quản Lý Tài Khoản & Phân Quyền', sub: 'Quản lý thành viên, vai trò (Roles) và quyền theo module' }
};

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.side-link').forEach((el) => el.classList.remove('active'));

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add('active');

  const activeLink = document.querySelector(`.side-link[data-tab="${tabId}"]`);
  if (activeLink) activeLink.classList.add('active');

  const info = TAB_TITLES[tabId] || TAB_TITLES.overview;
  const pTitle = document.getElementById('pageTitle');
  const pSub = document.getElementById('pageSub');
  if (pTitle) pTitle.textContent = info.title;
  if (pSub) pSub.textContent = info.sub;

  if (tabId === 'users' && hasPermission('users.manage')) {
    loadUsers();
  }
}

document.querySelectorAll('.side-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    switchTab(tab);
  });
});

// Logout handler
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  try {
    await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() });
  } catch (e) {}
  localStorage.removeItem('techpa_admin_token');
  window.location.href = '/login.html';
});

// ---------------- 3. LOAD DATA & RENDER ----------------

async function loadAdminData() {
  try {
    const promises = [fetch('/api/content')];

    if (hasPermission('leads.view')) {
      promises.push(fetch('/api/admin/leads', { headers: authHeaders() }));
    }

    const results = await Promise.all(promises);
    const contentRes = results[0];
    const leadsRes = results[1];

    if (contentRes.ok) {
      currentData = await contentRes.json();
      currentContent = currentData.vi || currentData;
    }

    if (leadsRes && leadsRes.ok) {
      currentLeads = await leadsRes.json();
    } else {
      currentLeads = [];
    }

    renderDashboard();
    if (hasPermission('leads.view')) renderLeads();
    if (hasPermission('content.menu')) renderMenuConfig();
    if (hasPermission('content.services')) renderServicesList();
    if (hasPermission('content.projects')) renderProjectsList();
    if (hasPermission('content.pricing')) renderAdminPricing();
    if (hasPermission('content.blog')) renderAdminBlog();
    if (hasPermission('content.socials')) populateSocials();
    if (hasPermission('content.settings')) populateSettings();
  } catch (err) {
    console.error('Lỗi tải dữ liệu quản trị:', err);
  }
}

// ---------------- 4. DASHBOARD ----------------

function renderDashboard() {
  if (!currentContent) return;

  const totalLeads = currentLeads.length;
  const elTotalLeads = document.getElementById('dashTotalLeads');
  const elLeadsBadge = document.getElementById('leadsBadge');
  const elServices = document.getElementById('dashTotalServices');
  const elProjects = document.getElementById('dashTotalProjects');

  if (elTotalLeads) elTotalLeads.textContent = totalLeads;
  if (elLeadsBadge) elLeadsBadge.textContent = totalLeads;
  if (elServices) elServices.textContent = currentContent.services?.length || 0;
  if (elProjects) elProjects.textContent = currentContent.projects?.length || 0;

  const recentTable = document.getElementById('recentLeadsTable');
  if (recentTable) {
    if (currentLeads.length === 0) {
      recentTable.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có yêu cầu tư vấn nào được ghi nhận.</td></tr>';
    } else {
      recentTable.innerHTML = currentLeads.slice(0, 5).map((l) => `
        <tr>
          <td><span class="code-badge">${l.code || 'TPA-NEW'}</span></td>
          <td><strong>${escapeHtml(l.name)}</strong></td>
          <td>${escapeHtml(l.phone)}<br><small style="color:#64748b">${escapeHtml(l.email)}</small></td>
          <td><span style="color:#b45309;font-weight:700">${escapeHtml(l.service)}</span></td>
          <td>${new Date(l.date).toLocaleString('vi-VN')}</td>
          <td><span class="status-pill ${l.status === 'Đã liên hệ' ? 'done' : 'new'}">${escapeHtml(l.status || 'Chờ xử lý')}</span></td>
        </tr>
      `).join('');
    }
  }
}

// ---------------- 5. LEADS MANAGEMENT ----------------

function renderLeads() {
  const table = document.getElementById('allLeadsTable');
  if (!table) return;

  if (currentLeads.length === 0) {
    table.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có yêu cầu tư vấn nào được ghi nhận.</td></tr>';
    return;
  }

  const canManage = hasPermission('leads.manage');

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
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="toggleLeadStatus('${l.code}')" style="margin-right:6px;">
            ${l.status === 'Đã liên hệ' ? 'Đổi: Chờ xử lý' : 'Đổi: Đã liên hệ'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="deleteLead('${l.code}')" style="color:#ef4444;border-color:#fca5a5;">
            Xóa
          </button>
        ` : `<span style="color:#64748b;font-size:12px;">Chỉ xem</span>`}
      </td>
    </tr>
  `).join('');
}

async function toggleLeadStatus(code) {
  try {
    const res = await fetch(`/api/admin/leads/${code}/status`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể đổi trạng thái lead');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

async function deleteLead(code) {
  if (!confirm(`Bạn có chắc chắn muốn xóa yêu cầu tư vấn ${code}?`)) return;
  try {
    const res = await fetch(`/api/admin/leads/${code}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa lead');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

document.getElementById('btnRefreshLeads')?.addEventListener('click', loadAdminData);

// ---------------- 6. USER MANAGEMENT & RBAC ----------------

async function loadUsers() {
  if (!hasPermission('users.manage')) return;
  const tbody = document.getElementById('usersTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Đang tải danh sách người dùng...</td></tr>';

  try {
    const res = await fetch('/api/admin/users', { headers: authHeaders() });
    if (res.ok) {
      currentUsers = await res.json();
      renderUsers();
    } else {
      const err = await res.json();
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#ef4444">${escapeHtml(err.error || 'Lỗi tải danh sách người dùng')}</td></tr>`;
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#ef4444">Lỗi kết nối máy chủ</td></tr>';
  }
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (currentUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có người dùng nào.</td></tr>';
    return;
  }

  tbody.innerHTML = currentUsers.map((u) => {
    const isSelf = currentUser && currentUser.id === u.id;
    const isSuper = u.role === 'superadmin';

    let permSummary = '';
    if (isSuper) {
      permSummary = '<span class="perm-pill" style="background:#fef3c7;color:#b45309;font-weight:700">Toàn quyền hệ thống</span>';
    } else if (!u.permissions || u.permissions.length === 0) {
      permSummary = '<span style="color:#94a3b8;font-size:12px;">Chưa cấp quyền</span>';
    } else {
      permSummary = u.permissions.map((p) => `<span class="perm-pill">${escapeHtml(p)}</span>`).join('');
    }

    return `
      <tr>
        <td>
          <strong style="color:#0f172a">${escapeHtml(u.username)}</strong>
          ${isSelf ? '<small style="display:block;color:#f59e0b;font-weight:700">(Tài khoản của bạn)</small>' : ''}
        </td>
        <td>${escapeHtml(u.fullName)}</td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>
          <span class="role-pill ${u.role}">${escapeHtml(u.role)}</span>
        </td>
        <td style="max-width:320px;">${permSummary}</td>
        <td>
          <span class="status-pill ${u.active ? 'done' : 'new'}">
            ${u.active ? 'Hoạt động' : 'Tạm khóa'}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openEditUser('${u.id}')" style="margin-right:6px;">
            Sửa
          </button>
          ${!isSelf ? `
            <button class="btn btn-outline btn-sm" onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')" style="color:#ef4444;border-color:#fca5a5;">
              Xóa
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderPermissionsCheckboxes() {
  const container = document.getElementById('permissionsCheckboxesGrid');
  if (!container || availablePermissions.length === 0) return;

  container.innerHTML = availablePermissions.map((p) => `
    <label class="perm-checkbox-item">
      <input type="checkbox" name="permissions" value="${p.key}" class="perm-chk">
      <div>
        <strong>${escapeHtml(p.label)}</strong>
        <small style="display:block;color:#64748b;font-size:11px;">${escapeHtml(p.group)} [${p.key}]</small>
      </div>
    </label>
  `).join('');
}

// Cập nhật checkbox theo vai trò được chọn
function syncRolePermissions(selectedRole, existingPerms = null) {
  const roleDef = availableRoles.find((r) => r.key === selectedRole);
  const helpText = document.getElementById('permHelpText');
  const chks = document.querySelectorAll('.perm-chk');

  if (selectedRole === 'custom') {
    if (helpText) helpText.textContent = 'Tùy chọn tích chọn các quyền cho tài khoản này';
    chks.forEach((chk) => {
      chk.disabled = false;
      if (existingPerms) {
        chk.checked = existingPerms.includes(chk.value);
      }
    });
  } else if (selectedRole === 'superadmin') {
    if (helpText) helpText.textContent = 'Quản trị viên cấp cao có toàn bộ quyền hệ thống';
    chks.forEach((chk) => {
      chk.checked = true;
      chk.disabled = true;
    });
  } else if (roleDef) {
    if (helpText) helpText.textContent = `Quyền mặc định của vai trò ${roleDef.label}`;
    chks.forEach((chk) => {
      chk.checked = roleDef.permissions.includes(chk.value);
      chk.disabled = true;
    });
  }
}

document.getElementById('userRole')?.addEventListener('change', (e) => {
  syncRolePermissions(e.target.value);
});

// Modal Add/Edit User
function openNewUser() {
  document.getElementById('userForm').reset();
  document.getElementById('userEditId').value = '';
  document.getElementById('userModalTitle').textContent = 'Thêm Người Dùng Mới';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userPassword').required = true;
  document.getElementById('userPasswordLabel').textContent = 'Mật khẩu *';
  document.getElementById('userRole').value = 'sales';
  document.getElementById('userActive').value = 'true';
  syncRolePermissions('sales');
  document.getElementById('userModal').hidden = false;
}

function openEditUser(userId) {
  const user = currentUsers.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById('userForm').reset();
  document.getElementById('userEditId').value = user.id;
  document.getElementById('userModalTitle').textContent = `Chỉnh Sửa: ${user.username}`;
  document.getElementById('userUsername').value = user.username;
  document.getElementById('userUsername').disabled = true;
  document.getElementById('userFullName').value = user.fullName || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userPassword').required = false;
  document.getElementById('userPassword').value = '';
  document.getElementById('userPasswordLabel').textContent = 'Mật khẩu (để trống nếu không đổi)';
  document.getElementById('userRole').value = user.role || 'custom';
  document.getElementById('userActive').value = user.active ? 'true' : 'false';

  syncRolePermissions(user.role || 'custom', user.permissions || []);
  document.getElementById('userModal').hidden = false;
}

document.getElementById('btnOpenNewUser')?.addEventListener('click', openNewUser);

document.getElementById('userForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = document.getElementById('userEditId').value;
  const username = document.getElementById('userUsername').value.trim();
  const fullName = document.getElementById('userFullName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const active = document.getElementById('userActive').value === 'true';

  let permissions = [];
  if (role === 'custom') {
    document.querySelectorAll('.perm-chk:checked').forEach((chk) => permissions.push(chk.value));
  }

  const btn = document.getElementById('btnSaveUser');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    let res;
    if (editId) {
      // PUT update
      const payload = { fullName, email, role, active };
      if (password) payload.password = password;
      if (role === 'custom') payload.permissions = permissions;

      res = await fetch(`/api/admin/users/${editId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      // POST create
      res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username, fullName, email, password, role, permissions, active })
      });
    }

    const data = await res.json();
    if (res.ok) {
      closeModals();
      await loadUsers();
    } else {
      alert(data.error || 'Lỗi thao tác tài khoản');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu Tài Khoản';
  }
});

async function deleteUser(id, username) {
  if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"?`)) return;
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadUsers();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa người dùng');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

// ---------------- 7. MENU & BADGES CONFIG (content.menu) ----------------

function renderMenuConfig() {
  const table = document.getElementById('menuConfigTable');
  if (!table || !currentContent || !currentContent.nav) return;

  table.innerHTML = currentContent.nav.map((item, index) => `
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

document.getElementById('btnSaveMenu')?.addEventListener('click', async () => {
  if (!hasPermission('content.menu')) return;
  const rows = document.querySelectorAll('#menuConfigTable tr');
  const updatedNav = [];
  const indicator = document.getElementById('menuSaveIndicator');

  rows.forEach((row, i) => {
    const label = row.querySelector('.menu-label-input').value.trim();
    const badge = row.querySelector('.menu-badge-input').value.trim();
    const badgeColor = row.querySelector('.menu-color-select').value;
    const orig = currentContent.nav[i] || {};

    updatedNav.push({
      ...orig,
      label: label || orig.label,
      badge: badge || '',
      badgeColor
    });
  });

  if (indicator) indicator.textContent = 'Đang lưu cấu hình menu...';

  try {
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ nav: updatedNav })
    });
    if (res.ok) {
      if (indicator) {
        indicator.textContent = '✓ Đã cập nhật menu & nhãn thành công!';
        setTimeout(() => indicator.textContent = '', 3000);
      }
      await loadAdminData();
    } else {
      const err = await res.json();
      if (indicator) indicator.textContent = 'Lỗi: ' + (err.error || 'Không thể lưu menu');
    }
  } catch (err) {
    if (indicator) indicator.textContent = 'Lỗi kết nối máy chủ!';
  }
});

// ---------------- 8. SERVICES (content.services) ----------------

function renderServicesList() {
  const list = document.getElementById('adminServicesList');
  if (!list || !currentContent || !currentContent.services) return;

  const canManage = hasPermission('content.services');

  list.innerHTML = currentContent.services.map((s) => `
    <div class="service-admin-item">
      <div>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.shortDesc)}</p>
        <small style="color:#b45309;font-weight:700">${(s.features || []).map((f) => escapeHtml(f)).join(' • ')}</small>
      </div>
      <div>
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="deleteService('${s.id}')" style="color:#ef4444;border-color:#fca5a5">Xóa</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

document.getElementById('btnOpenNewService')?.addEventListener('click', () => {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceModal').hidden = false;
});

document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.services')) return;

  const form = e.target;
  const title = form.title.value.trim();
  const shortDesc = form.shortDesc.value.trim();
  const features = form.features.value.split(',').map((x) => x.trim()).filter(Boolean);

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
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể lưu dịch vụ mới');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
});

async function deleteService(id) {
  if (!confirm('Bạn có chắc muốn xóa dịch vụ này khỏi trang chủ?')) return;
  try {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa dịch vụ');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

// ---------------- 9. PROJECTS (content.projects) ----------------

function renderProjectsList() {
  const list = document.getElementById('adminProjectsList');
  if (!list || !currentContent || !currentContent.projects) return;

  const canManage = hasPermission('content.projects');

  list.innerHTML = currentContent.projects.map((p) => `
    <div class="service-admin-item">
      <div style="display:flex;gap:14px;align-items:center;">
        <img src="${escapeHtml(p.image)}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;" onerror="this.src='/logo.png'">
        <div>
          <h4>${escapeHtml(p.title)}</h4>
          <p>Khách hàng: <strong>${escapeHtml(p.client)}</strong> | Danh mục: <span style="color:#b45309;font-weight:600">${escapeHtml(p.category)}</span></p>
        </div>
      </div>
      <div>
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="deleteProject('${p.id}')" style="color:#ef4444;border-color:#fca5a5">Xóa</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

document.getElementById('btnOpenNewProject')?.addEventListener('click', () => {
  document.getElementById('projectForm').reset();
  document.getElementById('projectModal').hidden = false;
});

document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.projects')) return;

  const form = e.target;
  const title = form.title.value.trim();
  const client = form.client.value.trim();
  const category = form.category.value.trim();
  const image = form.image.value.trim() || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';

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
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể lưu dự án mới');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
});

async function deleteProject(id) {
  if (!confirm('Bạn có chắc muốn xóa dự án này khỏi trang chủ?')) return;
  try {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa dự án');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

// ---------------- 10. SOCIALS (content.socials) ----------------

function populateSocials() {
  if (!currentContent) return;
  const s = currentContent.socials || {};
  const setZalo = document.getElementById('setZalo');
  const setFacebook = document.getElementById('setFacebook');
  const setLinkedin = document.getElementById('setLinkedin');
  const setYoutube = document.getElementById('setYoutube');

  if (setZalo) setZalo.value = s.zalo || '';
  if (setFacebook) setFacebook.value = s.facebook || '';
  if (setLinkedin) setLinkedin.value = s.linkedin || '';
  if (setYoutube) setYoutube.value = s.youtube || '';
}

document.getElementById('socialsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.socials')) return;

  const indicator = document.getElementById('socialSaveIndicator');
  const btn = document.getElementById('btnSaveSocials');

  const updatedSocials = {
    zalo: document.getElementById('setZalo').value.trim(),
    facebook: document.getElementById('setFacebook').value.trim(),
    linkedin: document.getElementById('setLinkedin').value.trim(),
    youtube: document.getElementById('setYoutube').value.trim()
  };

  if (btn) btn.disabled = true;
  if (indicator) indicator.textContent = 'Đang lưu...';

  try {
    const res = await fetch('/api/admin/socials', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ socials: updatedSocials })
    });
    if (res.ok) {
      if (indicator) {
        indicator.textContent = '✓ Đã cập nhật kênh mạng xã hội thành công!';
        setTimeout(() => indicator.textContent = '', 3000);
      }
      await loadAdminData();
    } else {
      const err = await res.json();
      if (indicator) indicator.textContent = 'Lỗi: ' + (err.error || 'Không thể lưu mạng xã hội');
    }
  } catch (err) {
    if (indicator) indicator.textContent = 'Lỗi kết nối máy chủ!';
  } finally {
    if (btn) btn.disabled = false;
  }
});

// ---------------- 11. SETTINGS & BRAND (content.settings) ----------------

function populateSettings() {
  if (!currentContent) return;
  const b = currentContent.brand || {};
  const setBrandName = document.getElementById('setBrandName');
  const setHotline = document.getElementById('setHotline');
  const setEmail = document.getElementById('setEmail');
  const setWorkingHours = document.getElementById('setWorkingHours');
  const setAddress = document.getElementById('setAddress');
  const setAnnouncement = document.getElementById('setAnnouncement');

  if (setBrandName) setBrandName.value = b.name || '';
  if (setHotline) setHotline.value = b.hotline || '';
  if (setEmail) setEmail.value = b.email || '';
  if (setWorkingHours) setWorkingHours.value = b.workingHours || '';
  if (setAddress) setAddress.value = b.address || '';
  if (setAnnouncement) setAnnouncement.value = b.announcement || '';
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.settings')) return;

  const btn = document.getElementById('btnSaveSettings');
  const indicator = document.getElementById('saveIndicator');

  const updatedBrand = {
    ...currentContent.brand,
    name: document.getElementById('setBrandName').value.trim(),
    hotline: document.getElementById('setHotline').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    workingHours: document.getElementById('setWorkingHours').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    announcement: document.getElementById('setAnnouncement').value.trim()
  };

  if (btn) btn.disabled = true;
  if (indicator) indicator.textContent = 'Đang lưu...';

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ brand: updatedBrand })
    });
    if (res.ok) {
      if (indicator) {
        indicator.textContent = '✓ Đã cập nhật thành công!';
        setTimeout(() => indicator.textContent = '', 3000);
      }
      await loadAdminData();
    } else {
      const err = await res.json();
      if (indicator) indicator.textContent = 'Lỗi: ' + (err.error || 'Không thể lưu cấu hình');
    }
  } catch (err) {
    if (indicator) indicator.textContent = 'Lỗi kết nối máy chủ!';
  } finally {
    if (btn) btn.disabled = false;
  }
});

// ---------------- 12. PRICING MANAGEMENT (content.pricing) ----------------

function renderAdminPricing() {
  const list = document.getElementById('adminPricingList');
  if (!list || !currentContent) return;

  const pricing = currentContent.pricing || [];
  const canManage = hasPermission('content.pricing');

  if (pricing.length === 0) {
    list.innerHTML = '<p style="padding:20px;color:#64748b;text-align:center;">Chưa có gói bảng giá nào. Nhấn "Thêm gói giá mới" để tạo gói đầu tiên.</p>';
    return;
  }

  list.innerHTML = pricing.map((p) => `
    <div class="service-admin-item" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #e2e8f0;">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <h4 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(p.title)}</h4>
          <span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600;">${escapeHtml(p.tag || '')}</span>
          ${p.featured ? '<span style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;">★ Nổi bật</span>' : ''}
        </div>
        <p style="margin:4px 0;color:#64748b;font-size:14px;">${escapeHtml(p.desc || '')}</p>
        <div style="font-weight:800;color:#d97706;font-size:16px;margin-top:4px;">
          ${escapeHtml(p.price)} <small style="font-weight:400;color:#64748b;font-size:13px;">${escapeHtml(p.sub || '')}</small>
        </div>
        <small style="display:block;margin-top:6px;color:#334155;font-size:12px;">
          ${(p.features || []).map((f) => '✓ ' + escapeHtml(f)).join(' • ')}
        </small>
      </div>
      <div style="display:flex;gap:8px;margin-left:16px;">
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="openEditPricing('${p.id}')">Sửa</button>
          <button class="btn btn-outline btn-sm" onclick="deletePricing('${p.id}')" style="color:#ef4444;border-color:#fca5a5;">Xóa</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function openNewPricing() {
  const form = document.getElementById('pricingForm');
  if (form) form.reset();
  const editId = document.getElementById('pricingEditId');
  if (editId) editId.value = '';
  const title = document.getElementById('modalPricingTitle');
  if (title) title.textContent = 'Thêm Gói Bảng Giá Mới';
  const featured = document.getElementById('pricingFeatured');
  if (featured) featured.value = 'false';
  const modal = document.getElementById('pricingModal');
  if (modal) modal.hidden = false;
}

function openEditPricing(id) {
  const pricing = (currentContent && currentContent.pricing) || [];
  const plan = pricing.find((p) => p.id === id);
  if (!plan) return;

  const form = document.getElementById('pricingForm');
  if (form) form.reset();
  document.getElementById('pricingEditId').value = plan.id;
  document.getElementById('modalPricingTitle').textContent = `Chỉnh Sửa Gói: ${plan.title}`;
  document.getElementById('pricingTitle').value = plan.title || '';
  document.getElementById('pricingTag').value = plan.tag || '';
  document.getElementById('pricingPrice').value = plan.price || '';
  document.getElementById('pricingSub').value = plan.sub || '';
  document.getElementById('pricingDesc').value = plan.desc || '';
  document.getElementById('pricingFeatures').value = (plan.features || []).join(', ');
  document.getElementById('pricingFeatured').value = plan.featured ? 'true' : 'false';
  document.getElementById('pricingCta').value = plan.cta || 'Chọn Gói Tư Vấn';

  document.getElementById('pricingModal').hidden = false;
}

document.getElementById('btnOpenNewPricing')?.addEventListener('click', openNewPricing);

document.getElementById('pricingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.pricing')) return;

  const editId = document.getElementById('pricingEditId').value;
  const title = document.getElementById('pricingTitle').value.trim();
  const tag = document.getElementById('pricingTag').value.trim();
  const price = document.getElementById('pricingPrice').value.trim();
  const sub = document.getElementById('pricingSub').value.trim();
  const desc = document.getElementById('pricingDesc').value.trim();
  const featuresRaw = document.getElementById('pricingFeatures').value;
  const features = featuresRaw.split(',').map((x) => x.trim()).filter(Boolean);
  const featured = document.getElementById('pricingFeatured').value === 'true';
  const cta = document.getElementById('pricingCta').value.trim() || 'Chọn Gói Tư Vấn';

  const payload = {
    title,
    tag,
    price,
    sub,
    desc,
    features: features.length ? features : ['Tư vấn chuyên sâu', 'Hỗ trợ kỹ thuật 24/7'],
    featured,
    cta
  };

  const btn = document.getElementById('btnSavePricing');
  if (btn) btn.disabled = true;

  try {
    let res;
    if (editId) {
      res = await fetch(`/api/admin/pricing/${editId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      payload.id = 'price-' + Date.now();
      res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeModals();
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể lưu gói bảng giá');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  } finally {
    if (btn) btn.disabled = false;
  }
});

async function deletePricing(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa gói bảng giá này khỏi trang chủ?')) return;
  try {
    const res = await fetch(`/api/admin/pricing/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa gói bảng giá');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  }
}

// ---------------- 13. BLOG MANAGEMENT (content.blog) ----------------

function renderAdminBlog() {
  const tbody = document.getElementById('adminBlogTableBody');
  if (!tbody || !currentContent) return;

  const blog = currentContent.blog || [];
  const canManage = hasPermission('content.blog');

  if (blog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;color:#64748b;">Chưa có bài viết nào. Nhấn "Viết bài mới" để đăng bài đầu tiên.</td></tr>';
    return;
  }

  tbody.innerHTML = blog.map((b) => `
    <tr>
      <td style="width:70px;">
        <img src="${escapeHtml(b.image || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=100&q=80')}" alt="${escapeHtml(b.title)}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;">
      </td>
      <td>
        <strong style="color:#0f172a;display:block;margin-bottom:2px;">${escapeHtml(b.title)}</strong>
        <small style="color:#64748b;font-size:12px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(b.summary || '')}</small>
      </td>
      <td>
        <span style="background:#eff6ff;color:#2563eb;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600;">
          ${escapeHtml(b.category || 'Công Nghệ')}
        </span>
      </td>
      <td>${escapeHtml(b.author || 'TechPA')}</td>
      <td style="font-size:13px;color:#64748b;">${escapeHtml(b.date || '')}</td>
      <td style="white-space:nowrap;">
        ${canManage ? `
          <button class="btn btn-outline btn-sm" onclick="openEditBlog('${b.id}')">Sửa</button>
          <button class="btn btn-outline btn-sm" onclick="deleteBlog('${b.id}')" style="color:#ef4444;border-color:#fca5a5;">Xóa</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function openNewBlog() {
  const form = document.getElementById('adminBlogForm');
  if (form) form.reset();
  const editId = document.getElementById('blogEditId');
  if (editId) editId.value = '';
  const title = document.getElementById('modalBlogAdminTitle');
  if (title) title.textContent = 'Viết Bài Tin Tức Mới';
  const author = document.getElementById('blogAuthorInput');
  if (author) author.value = 'Chuyên gia TechPA';
  const modal = document.getElementById('adminBlogModal');
  if (modal) modal.hidden = false;
}

function openEditBlog(id) {
  const blog = (currentContent && currentContent.blog) || [];
  const post = blog.find((b) => b.id === id);
  if (!post) return;

  const form = document.getElementById('adminBlogForm');
  if (form) form.reset();
  document.getElementById('blogEditId').value = post.id;
  document.getElementById('modalBlogAdminTitle').textContent = `Chỉnh Sửa: ${post.title}`;
  document.getElementById('blogTitleInput').value = post.title || '';
  document.getElementById('blogCatInput').value = post.category || '';
  document.getElementById('blogAuthorInput').value = post.author || '';
  document.getElementById('blogImageInput').value = post.image || '';
  document.getElementById('blogSummaryInput').value = post.summary || '';
  document.getElementById('blogContentInput').value = post.content || '';

  document.getElementById('adminBlogModal').hidden = false;
}

document.getElementById('btnOpenNewBlog')?.addEventListener('click', openNewBlog);

document.getElementById('adminBlogForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasPermission('content.blog')) return;

  const editId = document.getElementById('blogEditId').value;
  const title = document.getElementById('blogTitleInput').value.trim();
  const category = document.getElementById('blogCatInput').value.trim();
  const author = document.getElementById('blogAuthorInput').value.trim() || 'TechPA Expert';
  const image = document.getElementById('blogImageInput').value.trim();
  const summary = document.getElementById('blogSummaryInput').value.trim();
  const content = document.getElementById('blogContentInput').value.trim();

  const payload = {
    title,
    category,
    author,
    image,
    summary,
    content,
    readTime: '5 phút'
  };

  const btn = document.getElementById('btnSaveBlog');
  if (btn) btn.disabled = true;

  try {
    let res;
    if (editId) {
      res = await fetch(`/api/admin/blog/${editId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      payload.id = 'post-' + Date.now();
      payload.date = new Date().toLocaleDateString('vi-VN');
      res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeModals();
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể lưu bài viết');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  } finally {
    if (btn) btn.disabled = false;
  }
});

async function deleteBlog(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi chuyên mục tin tức?')) return;
  try {
    const res = await fetch(`/api/admin/blog/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      await loadAdminData();
    } else {
      const err = await res.json();
      alert(err.error || 'Không thể xóa bài viết');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  }
}

// ---------------- 14. MODAL HELPERS ----------------

function closeModals() {
  const serviceModal = document.getElementById('serviceModal');
  const projectModal = document.getElementById('projectModal');
  const userModal = document.getElementById('userModal');
  const pricingModal = document.getElementById('pricingModal');
  const blogModal = document.getElementById('adminBlogModal');

  if (serviceModal) serviceModal.hidden = true;
  if (projectModal) projectModal.hidden = true;
  if (userModal) userModal.hidden = true;
  if (pricingModal) pricingModal.hidden = true;
  if (blogModal) blogModal.hidden = true;
}

// Global modal escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
});

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', checkAuthAndInit);
