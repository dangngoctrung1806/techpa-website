const express = require('express');
const crypto = require('crypto');
const store = require('../lib/store');
const { hashPassword, verifyPassword, signToken, verifyToken, parseCookies } = require('../lib/auth');
const { PERMISSIONS, ALL_PERMISSIONS, ROLES, ROLE_KEYS, effectivePermissions } = require('../lib/permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'techpa-secret-key-2026-secure-auth';

const app = express();
app.use(express.json());

// Auth & Permissions Middleware
function requireAuth(permissionKey) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const cookieHeader = req.headers.cookie || '';
      let token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        const cookies = parseCookies(cookieHeader);
        token = cookies.techpa_token || '';
      }

      if (!token) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập quản trị viên để tiếp tục.' });
      }

      const decoded = verifyToken(token, JWT_SECRET);
      if (!decoded || !decoded.sub) {
        return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
      }

      const users = await store.get('users', []);
      const user = users.find((u) => u.id === decoded.sub || u.username === decoded.username);
      if (!user) {
        return res.status(401).json({ error: 'Tài khoản người dùng không tồn tại.' });
      }

      if (user.active === false) {
        return res.status(403).json({ error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên cấp cao.' });
      }

      const permissions = effectivePermissions(user);
      req.user = user;
      req.permissions = permissions;

      if (permissionKey && !permissions.includes(permissionKey)) {
        return res.status(403).json({
          error: `Bạn không có quyền thực hiện chức năng này (${permissionKey}).`
        });
      }

      next();
    } catch (err) {
      console.error('[Auth Middleware Error]:', err);
      res.status(500).json({ error: 'Lỗi xác thực hệ thống: ' + err.message });
    }
  };
}

// Router chính cho tất cả API
const router = express.Router();

// ---------------- 1. PUBLIC APIS ----------------

// GET /content: Lấy toàn bộ nội dung website (đa ngôn ngữ vi, en)
router.get('/content', async (req, res) => {
  try {
    const data = await store.get('content');
    if (data && data.vi && data.en) {
      if (data.vi.brand && data.en.brand) {
        if (data.vi.brand.address && (!data.en.brand.address || data.en.brand.address.includes('District 1'))) {
          data.en.brand.address = data.vi.brand.address;
        }
        if (data.vi.brand.hotline) data.en.brand.hotline = data.vi.brand.hotline;
        if (data.vi.brand.email) data.en.brand.email = data.vi.brand.email;
        if (data.vi.brand.workingHours && (!data.en.brand.workingHours || data.en.brand.workingHours.includes('Mon - Sat'))) {
          data.en.brand.workingHours = data.vi.brand.workingHours;
        }
      }

      // Đảm bảo cấu trúc menu tiếng Anh có mục Pricing & Blog và khớp 1:1 với tiếng Việt
      if (data.vi.nav) {
        if (!data.vi.nav.some((i) => i.link === '#blog')) {
          data.vi.nav.splice(5, 0, { label: 'Tin tức', link: '#blog' });
        }
      }
      if (!data.en.nav || !data.en.nav.some((i) => i.link === '#blog')) {
        data.en.nav = [
          { label: 'Home', link: '#hero' },
          { label: 'About Us', link: '#about' },
          { label: 'IT Services', link: '#services', badge: 'Hot', badgeColor: 'red' },
          { label: 'Projects', link: '#projects' },
          { label: 'Pricing', link: '#pricing' },
          { label: 'News', link: '#blog' },
          { label: 'FAQ', link: '#faqs' },
          { label: 'Contact', link: '#contact' }
        ];
      }

      // Đảm bảo pricing và blog có dữ liệu mẫu nếu chưa có
      const fs = require('fs');
      const path = require('path');
      let needPersist = false;
      if (!data.vi.pricing || !data.vi.blog || !data.en.pricing || !data.en.blog) {
        try {
          const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'content.json'), 'utf8'));
          if (!data.vi.pricing && seed.vi.pricing) { data.vi.pricing = seed.vi.pricing; needPersist = true; }
          if (!data.vi.blog && seed.vi.blog) { data.vi.blog = seed.vi.blog; needPersist = true; }
          if (!data.en.pricing && seed.en.pricing) { data.en.pricing = seed.en.pricing; needPersist = true; }
          if (!data.en.blog && seed.en.blog) { data.en.blog = seed.en.blog; needPersist = true; }
        } catch (e) {}
      }

      // Đảm bảo faqs và testimonials đều có id
      ['vi', 'en'].forEach((lang) => {
        if (data[lang] && Array.isArray(data[lang].faqs)) {
          data[lang].faqs.forEach((f, i) => {
            if (!f.id) { f.id = 'faq-' + (i + 1); needPersist = true; }
          });
        }
        if (data[lang] && Array.isArray(data[lang].testimonials)) {
          data[lang].testimonials.forEach((t, i) => {
            if (!t.id) { t.id = 'testi-' + (i + 1); needPersist = true; }
          });
        }
      });

      if (needPersist) {
        await store.set('content', data).catch(() => {});
      }
    }
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: 'Lỗi nạp dữ liệu: ' + err.message });
  }
});

// POST /contact: Khách gửi form yêu cầu tư vấn
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'Vui lòng điền họ tên và email.' });
    }

    const code = 'TPA-' + Math.floor(100000 + Math.random() * 900000);
    const leads = (await store.get('leads', [])) || [];
    const newLead = {
      code,
      name,
      email,
      phone: phone || '',
      service: service || 'Tư vấn chung',
      message: message || '',
      date: new Date().toISOString(),
      status: 'Chờ xử lý'
    };

    leads.unshift(newLead);
    await store.set('leads', leads);

    console.log(`[LEAD RECEIVED] ${code} | ${name} | ${service}`);
    res.json({
      success: true,
      code,
      message: 'Cảm ơn quý khách đã gửi thông tin. Đội ngũ chuyên gia TechPA sẽ liên hệ tư vấn trong vòng 15 phút!'
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi yêu cầu tư vấn: ' + err.message });
  }
});

// ---------------- 2. ADMIN AUTHENTICATION ----------------

// POST /admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const users = (await store.get('users', [])) || [];
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    if (user.active === false) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const token = signToken(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 ngày
      },
      JWT_SECRET
    );

    // Thiết lập cookie techpa_token (hỗ trợ cả Bearer header và cookie)
    res.setHeader(
      'Set-Cookie',
      `techpa_token=${token}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax; HttpOnly`
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: effectivePermissions(user)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xử lý đăng nhập: ' + err.message });
  }
});

// POST /admin/logout
router.post('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'techpa_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly');
  res.json({ success: true, message: 'Đã đăng xuất' });
});

// GET /admin/me: Lấy thông tin tài khoản hiện tại và quyền hạn
router.get('/admin/me', requireAuth(), (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      permissions: req.permissions
    },
    storage: store.getStorageStatus()
  });
});

// GET /admin/roles-permissions: Metadata danh sách vai trò và quyền hạn
router.get('/admin/roles-permissions', requireAuth('users.manage'), (req, res) => {
  res.json({
    permissions: PERMISSIONS,
    roles: ROLES
  });
});

// ---------------- 3. USER MANAGEMENT & RBAC (users.manage) ----------------

// GET /admin/users: Danh sách người dùng
router.get('/admin/users', requireAuth('users.manage'), async (req, res) => {
  try {
    const users = (await store.get('users', [])) || [];
    const sanitized = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName || u.username,
      email: u.email || '',
      role: u.role || 'custom',
      permissions: effectivePermissions(u),
      active: u.active !== false,
      createdAt: u.createdAt || null
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách người dùng: ' + err.message });
  }
});

// POST /admin/users: Tạo người dùng mới
router.post('/admin/users', requireAuth('users.manage'), async (req, res) => {
  try {
    const { username, fullName, email, password, role, permissions, active } = req.body || {};

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập tối thiểu 3 ký tự.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự.' });
    }
    if (!role || !ROLE_KEYS.includes(role)) {
      return res.status(400).json({ error: 'Vai trò người dùng không hợp lệ.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const users = (await store.get('users', [])) || [];

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: `Tên đăng nhập "${cleanUsername}" đã tồn tại.` });
    }

    const roleDef = ROLES.find((r) => r.key === role);
    let assignedPermissions = [];
    if (role === 'superadmin') {
      assignedPermissions = [...ALL_PERMISSIONS];
    } else if (role === 'custom') {
      assignedPermissions = Array.isArray(permissions)
        ? permissions.filter((p) => ALL_PERMISSIONS.includes(p))
        : [];
    } else if (roleDef) {
      assignedPermissions = [...roleDef.permissions];
    }

    const newUser = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      username: cleanUsername,
      fullName: (fullName || cleanUsername).trim(),
      email: (email || '').trim(),
      passwordHash: hashPassword(password),
      role,
      permissions: assignedPermissions,
      active: active !== false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await store.set('users', users);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        permissions: effectivePermissions(newUser),
        active: newUser.active,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo người dùng: ' + err.message });
  }
});

// PUT /admin/users/:id: Cập nhật thông tin/quyền/mật khẩu người dùng
router.put('/admin/users/:id', requireAuth('users.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, permissions, active } = req.body || {};

    const users = (await store.get('users', [])) || [];
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const targetUser = users[userIndex];

    // Bảo vệ: Không cho phép khóa hoặc hạ quyền tài khoản superadmin cuối cùng đang active
    const activeSuperadmins = users.filter((u) => u.role === 'superadmin' && u.active !== false);
    if (
      targetUser.role === 'superadmin' &&
      activeSuperadmins.length <= 1 &&
      activeSuperadmins[0].id === targetUser.id
    ) {
      if (active === false || (role && role !== 'superadmin')) {
        return res.status(400).json({
          error: 'Hệ thống bắt buộc phải có ít nhất một Quản trị viên cấp cao (superadmin) đang hoạt động.'
        });
      }
    }

    if (fullName) targetUser.fullName = fullName.trim();
    if (email !== undefined) targetUser.email = (email || '').trim();
    if (active !== undefined) targetUser.active = Boolean(active);

    if (role && ROLE_KEYS.includes(role)) {
      targetUser.role = role;
      const roleDef = ROLES.find((r) => r.key === role);
      if (role === 'superadmin') {
        targetUser.permissions = [...ALL_PERMISSIONS];
      } else if (role === 'custom') {
        targetUser.permissions = Array.isArray(permissions)
          ? permissions.filter((p) => ALL_PERMISSIONS.includes(p))
          : targetUser.permissions || [];
      } else if (roleDef) {
        targetUser.permissions = [...roleDef.permissions];
      }
    } else if (targetUser.role === 'custom' && Array.isArray(permissions)) {
      targetUser.permissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    }

    if (password && password.trim().length >= 6) {
      targetUser.passwordHash = hashPassword(password.trim());
    }

    users[userIndex] = targetUser;
    await store.set('users', users);

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        email: targetUser.email,
        role: targetUser.role,
        permissions: effectivePermissions(targetUser),
        active: targetUser.active,
        createdAt: targetUser.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật người dùng: ' + err.message });
  }
});

// DELETE /admin/users/:id: Xóa người dùng
router.delete('/admin/users/:id', requireAuth('users.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình.' });
    }

    const users = (await store.get('users', [])) || [];
    const target = users.find((u) => u.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    if (target.role === 'superadmin') {
      const activeSuperadmins = users.filter((u) => u.role === 'superadmin');
      if (activeSuperadmins.length <= 1) {
        return res.status(400).json({ error: 'Không thể xóa tài khoản Quản trị viên cấp cao duy nhất còn lại.' });
      }
    }

    const updated = users.filter((u) => u.id !== id);
    await store.set('users', updated);

    res.json({ success: true, message: 'Đã xóa người dùng thành công.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa người dùng: ' + err.message });
  }
});

// ---------------- 4. LEADS MANAGEMENT ----------------

// GET /admin/leads
router.get('/admin/leads', requireAuth('leads.view'), async (req, res) => {
  try {
    const leads = (await store.get('leads', [])) || [];
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đọc danh sách leads: ' + err.message });
  }
});

// POST /admin/leads/:code/status
router.post('/admin/leads/:code/status', requireAuth('leads.manage'), async (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body || {};
    const leads = (await store.get('leads', [])) || [];
    const lead = leads.find((l) => l.code === code);

    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy lead có mã: ' + code });
    }

    if (status) {
      lead.status = status;
    } else {
      lead.status = lead.status === 'Đã liên hệ' ? 'Chờ xử lý' : 'Đã liên hệ';
    }

    await store.set('leads', leads);
    res.json({ success: true, status: lead.status });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật lead: ' + err.message });
  }
});

// DELETE /admin/leads/:code
router.delete('/admin/leads/:code', requireAuth('leads.manage'), async (req, res) => {
  try {
    const { code } = req.params;
    const leads = (await store.get('leads', [])) || [];
    const updated = leads.filter((l) => l.code !== code);
    await store.set('leads', updated);
    res.json({ success: true, message: 'Đã xóa lead thành công.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa lead: ' + err.message });
  }
});

// ---------------- 5. CMS CONTENT MANAGEMENT ----------------

// POST /admin/pricing (content.pricing)
router.post('/admin/pricing', requireAuth('content.pricing'), async (req, res) => {
  try {
    const newPlan = req.body;
    if (!newPlan || !newPlan.title || !newPlan.price) {
      return res.status(400).json({ error: 'Tên gói và mức giá không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.pricing) content.vi.pricing = [];

    newPlan.id = newPlan.id || 'price-' + Date.now();
    content.vi.pricing.push(newPlan);

    if (content.en) {
      if (!content.en.pricing) content.en.pricing = [];
      content.en.pricing.push({ ...newPlan });
    }

    await store.set('content', content);
    res.json({ success: true, pricing: content.vi.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu gói bảng giá: ' + err.message });
  }
});

// PUT /admin/pricing/:id (content.pricing)
router.put('/admin/pricing/:id', requireAuth('content.pricing'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.pricing) {
      const idx = content.vi.pricing.findIndex((p) => p.id === id);
      if (idx !== -1) {
        content.vi.pricing[idx] = { ...content.vi.pricing[idx], ...updateData };
      }
    }
    if (content.en && content.en.pricing) {
      const idx = content.en.pricing.findIndex((p) => p.id === id);
      if (idx !== -1) {
        content.en.pricing[idx] = { ...content.en.pricing[idx], ...updateData };
      }
    }

    await store.set('content', content);
    res.json({ success: true, pricing: content.vi.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật gói bảng giá: ' + err.message });
  }
});

// DELETE /admin/pricing/:id (content.pricing)
router.delete('/admin/pricing/:id', requireAuth('content.pricing'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.pricing) {
      content.vi.pricing = content.vi.pricing.filter((p) => p.id !== id);
    }
    if (content.en && content.en.pricing) {
      content.en.pricing = content.en.pricing.filter((p) => p.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa gói bảng giá: ' + err.message });
  }
});

// POST /admin/blog (content.blog)
router.post('/admin/blog', requireAuth('content.blog'), async (req, res) => {
  try {
    const newPost = req.body;
    if (!newPost || !newPost.title) {
      return res.status(400).json({ error: 'Tiêu đề bài viết không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.blog) content.vi.blog = [];

    newPost.id = newPost.id || 'post-' + Date.now();
    newPost.date = newPost.date || new Date().toLocaleDateString('vi-VN');
    content.vi.blog.unshift(newPost);

    if (content.en) {
      if (!content.en.blog) content.en.blog = [];
      content.en.blog.unshift({ ...newPost });
    }

    await store.set('content', content);
    res.json({ success: true, blog: content.vi.blog });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu bài viết mới: ' + err.message });
  }
});

// PUT /admin/blog/:id (content.blog)
router.put('/admin/blog/:id', requireAuth('content.blog'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.blog) {
      const idx = content.vi.blog.findIndex((b) => b.id === id);
      if (idx !== -1) {
        content.vi.blog[idx] = { ...content.vi.blog[idx], ...updateData };
      }
    }
    if (content.en && content.en.blog) {
      const idx = content.en.blog.findIndex((b) => b.id === id);
      if (idx !== -1) {
        content.en.blog[idx] = { ...content.en.blog[idx], ...updateData };
      }
    }

    await store.set('content', content);
    res.json({ success: true, blog: content.vi.blog });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật bài viết: ' + err.message });
  }
});

// DELETE /admin/blog/:id (content.blog)
router.delete('/admin/blog/:id', requireAuth('content.blog'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.blog) {
      content.vi.blog = content.vi.blog.filter((b) => b.id !== id);
    }
    if (content.en && content.en.blog) {
      content.en.blog = content.en.blog.filter((b) => b.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa bài viết: ' + err.message });
  }
});

// ---------------- FAQS MANAGEMENT (content.faqs) ----------------

// POST /admin/faqs
router.post('/admin/faqs', requireAuth('content.faqs'), async (req, res) => {
  try {
    const { question, answer } = req.body || {};
    if (!question || !answer) {
      return res.status(400).json({ error: 'Câu hỏi và câu trả lời không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.faqs) content.vi.faqs = [];

    const newFaq = {
      id: 'faq-' + Date.now(),
      question,
      answer
    };
    content.vi.faqs.push(newFaq);

    if (content.en) {
      if (!content.en.faqs) content.en.faqs = [];
      content.en.faqs.push({ ...newFaq });
    }

    await store.set('content', content);
    res.json({ success: true, faqs: content.vi.faqs });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu câu hỏi: ' + err.message });
  }
});

// PUT /admin/faqs/:id
router.put('/admin/faqs/:id', requireAuth('content.faqs'), async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body || {};
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.faqs) {
      const idx = content.vi.faqs.findIndex((f) => f.id === id);
      if (idx !== -1) {
        content.vi.faqs[idx] = { ...content.vi.faqs[idx], question, answer };
      }
    }
    if (content.en && content.en.faqs) {
      const idx = content.en.faqs.findIndex((f) => f.id === id);
      if (idx !== -1) {
        content.en.faqs[idx] = { ...content.en.faqs[idx], question, answer };
      }
    }

    await store.set('content', content);
    res.json({ success: true, faqs: content.vi.faqs });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật câu hỏi: ' + err.message });
  }
});

// DELETE /admin/faqs/:id
router.delete('/admin/faqs/:id', requireAuth('content.faqs'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.faqs) {
      content.vi.faqs = content.vi.faqs.filter((f) => f.id !== id);
    }
    if (content.en && content.en.faqs) {
      content.en.faqs = content.en.faqs.filter((f) => f.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa câu hỏi: ' + err.message });
  }
});

// ---------------- TESTIMONIALS MANAGEMENT (content.testimonials) ----------------

// POST /admin/testimonials
router.post('/admin/testimonials', requireAuth('content.testimonials'), async (req, res) => {
  try {
    const { name, role, avatar, comment } = req.body || {};
    if (!name || !comment) {
      return res.status(400).json({ error: 'Họ tên và ý kiến đánh giá không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.testimonials) content.vi.testimonials = [];

    const newTesti = {
      id: 'testi-' + Date.now(),
      name,
      role: role || '',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      comment
    };
    content.vi.testimonials.push(newTesti);

    if (content.en) {
      if (!content.en.testimonials) content.en.testimonials = [];
      content.en.testimonials.push({ ...newTesti });
    }

    await store.set('content', content);
    res.json({ success: true, testimonials: content.vi.testimonials });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu đánh giá khách hàng: ' + err.message });
  }
});

// PUT /admin/testimonials/:id
router.put('/admin/testimonials/:id', requireAuth('content.testimonials'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, avatar, comment } = req.body || {};
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.testimonials) {
      const idx = content.vi.testimonials.findIndex((t) => t.id === id);
      if (idx !== -1) {
        content.vi.testimonials[idx] = { ...content.vi.testimonials[idx], name, role, avatar, comment };
      }
    }
    if (content.en && content.en.testimonials) {
      const idx = content.en.testimonials.findIndex((t) => t.id === id);
      if (idx !== -1) {
        content.en.testimonials[idx] = { ...content.en.testimonials[idx], name, role, avatar, comment };
      }
    }

    await store.set('content', content);
    res.json({ success: true, testimonials: content.vi.testimonials });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật đánh giá: ' + err.message });
  }
});

// DELETE /admin/testimonials/:id
router.delete('/admin/testimonials/:id', requireAuth('content.testimonials'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.testimonials) {
      content.vi.testimonials = content.vi.testimonials.filter((t) => t.id !== id);
    }
    if (content.en && content.en.testimonials) {
      content.en.testimonials = content.en.testimonials.filter((t) => t.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa đánh giá: ' + err.message });
  }
});

// POST /admin/menu (content.menu)
router.post('/admin/menu', requireAuth('content.menu'), async (req, res) => {
  try {
    const { nav } = req.body || {};
    if (!Array.isArray(nav)) {
      return res.status(400).json({ error: 'Dữ liệu menu không hợp lệ.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    content.vi.nav = nav;

    // Đồng bộ nhãn badge sang English nav tương ứng
    if (content.en && Array.isArray(content.en.nav)) {
      nav.forEach((viItem) => {
        const enItem = content.en.nav.find((e) => e.link === viItem.link);
        if (enItem) {
          enItem.badge = viItem.badge || '';
          enItem.badgeColor = viItem.badgeColor || 'red';
        }
      });
    }

    await store.set('content', content);
    res.json({ success: true, nav: content.vi.nav });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu cấu hình menu: ' + err.message });
  }
});

// POST /admin/services (content.services)
router.post('/admin/services', requireAuth('content.services'), async (req, res) => {
  try {
    const newService = req.body;
    if (!newService || !newService.title) {
      return res.status(400).json({ error: 'Tên dịch vụ không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.services) content.vi.services = [];

    content.vi.services.unshift(newService);

    // Đồng bộ sang English nếu có
    if (content.en) {
      if (!content.en.services) content.en.services = [];
      content.en.services.unshift({ ...newService });
    }

    await store.set('content', content);
    res.json({ success: true, services: content.vi.services });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu dịch vụ mới: ' + err.message });
  }
});

// DELETE /admin/services/:id (content.services)
router.delete('/admin/services/:id', requireAuth('content.services'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.services) {
      content.vi.services = content.vi.services.filter((s) => s.id !== id);
    }
    if (content.en && content.en.services) {
      content.en.services = content.en.services.filter((s) => s.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa dịch vụ: ' + err.message });
  }
});

// POST /admin/projects (content.projects)
router.post('/admin/projects', requireAuth('content.projects'), async (req, res) => {
  try {
    const newProject = req.body;
    if (!newProject || !newProject.title) {
      return res.status(400).json({ error: 'Tên dự án không được để trống.' });
    }

    const content = (await store.get('content')) || {};
    if (!content.vi) content.vi = {};
    if (!content.vi.projects) content.vi.projects = [];

    content.vi.projects.unshift(newProject);

    if (content.en) {
      if (!content.en.projects) content.en.projects = [];
      content.en.projects.unshift({ ...newProject });
    }

    await store.set('content', content);
    res.json({ success: true, projects: content.vi.projects });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu dự án mới: ' + err.message });
  }
});

// DELETE /admin/projects/:id (content.projects)
router.delete('/admin/projects/:id', requireAuth('content.projects'), async (req, res) => {
  try {
    const { id } = req.params;
    const content = (await store.get('content')) || {};

    if (content.vi && content.vi.projects) {
      content.vi.projects = content.vi.projects.filter((p) => p.id !== id);
    }
    if (content.en && content.en.projects) {
      content.en.projects = content.en.projects.filter((p) => p.id !== id);
    }

    await store.set('content', content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa dự án: ' + err.message });
  }
});

// POST /admin/socials (content.socials)
router.post('/admin/socials', requireAuth('content.socials'), async (req, res) => {
  try {
    const { socials } = req.body || {};
    const content = (await store.get('content')) || {};

    if (!content.vi) content.vi = {};
    content.vi.socials = { ...content.vi.socials, ...socials };

    if (content.en) {
      content.en.socials = { ...content.en.socials, ...socials };
    }

    await store.set('content', content);
    res.json({ success: true, socials: content.vi.socials });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu mạng xã hội: ' + err.message });
  }
});

// POST /admin/settings (content.settings)
router.post('/admin/settings', requireAuth('content.settings'), async (req, res) => {
  try {
    const { brand } = req.body || {};
    const content = (await store.get('content')) || {};

    if (!content.vi) content.vi = {};
    content.vi.brand = { ...content.vi.brand, ...brand };

    if (content.en) {
      if (!content.en.brand) content.en.brand = {};
      // Đồng bộ thông tin liên hệ chung sang English
      if (brand.hotline) content.en.brand.hotline = brand.hotline;
      if (brand.email) content.en.brand.email = brand.email;
      if (brand.name) content.en.brand.name = brand.name;
      if (brand.address) content.en.brand.address = brand.address;
      if (brand.workingHours) content.en.brand.workingHours = brand.workingHours;
    }

    await store.set('content', content);
    res.json({ success: true, brand: content.vi.brand });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu cài đặt thương hiệu: ' + err.message });
  }
});

// Storage status check
router.get('/admin/storage-status', requireAuth(), (req, res) => {
  res.json(store.getStorageStatus());
});

// Gắn router vào cả 2 đường dẫn để tương thích Vercel rewrite và local
app.use('/api', router);
app.use(router);

// Xuất handler cho Vercel Serverless Function và local Express
module.exports = app;
