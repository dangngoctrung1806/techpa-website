const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3200;

const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
const LEADS_FILE = path.join(__dirname, 'data', 'leads.json');

// Khởi tạo phiên đăng nhập (Tokens in-memory)
const activeAdminTokens = new Set();

// Thông tin tài khoản quản trị viên (có thể cấu hình đổi qua ENV hoặc file)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'techpa2026';

// Initialize leads storage file if not exists
if (!fs.existsSync(LEADS_FILE)) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify([
    {
      code: 'TPA-882910',
      name: 'Nguyễn Văn Hùng',
      email: 'hung.nguyen@vinasolutions.com',
      phone: '0908 123 456',
      service: 'Cloud Computing & Migration',
      message: 'Cần dịch chuyển 12 máy chủ ảo hóa on-premise lên AWS',
      date: new Date().toISOString(),
      status: 'Đã liên hệ'
    },
    {
      code: 'TPA-391024',
      name: 'Lê Thu Trang',
      email: 'trang.le@megatech.vn',
      phone: '0912 345 678',
      service: 'Cyber Security & Zero-Trust',
      message: 'Tư vấn giải pháp SOC 24/7 và kiểm thử Pentest định kỳ',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'Chờ xử lý'
    }
  ], null, 2), 'utf8');
}

function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware xác thực bảo mật Admin API
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập quản trị viên để thực hiện thao tác này.' });
  }
  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public API
app.get('/api/content', (req, res) => {
  const data = readData(CONTENT_FILE);
  res.json(data);
});

// Client Contact / Lead Submission
app.post('/api/contact', (req, res) => {
  const { name, email, phone, service, message } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Vui lòng điền họ tên và email.' });
  }

  const code = 'TPA-' + Math.floor(100000 + Math.random() * 900000);
  const leads = readData(LEADS_FILE) || [];
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
  writeData(LEADS_FILE, leads);

  console.log(`[TECHPA LEAD RECEIVED] ${code} | ${name} | ${service}`);

  res.json({
    success: true,
    code,
    message: 'Cảm ơn quý khách đã gửi thông tin. Đội ngũ chuyên gia TechPA sẽ liên hệ tư vấn trong vòng 15 phút!'
  });
});

// ---------------- ADMIN AUTHENTICATION ----------------

// API Đăng nhập Admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);
    console.log(`[ADMIN LOGIN SUCCESS] User: ${username} at ${new Date().toISOString()}`);
    return res.json({ success: true, token });
  }

  console.warn(`[ADMIN LOGIN FAILED] Attempt with user: ${username}`);
  return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
});

// API Đăng xuất Admin
app.post('/api/admin/logout', requireAdminAuth, (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '').trim();
  activeAdminTokens.delete(token);
  res.json({ success: true });
});

// ---------------- SECURED ADMIN API ENDPOINTS ----------------

// Get all leads (Protected)
app.get('/api/admin/leads', requireAdminAuth, (req, res) => {
  const leads = readData(LEADS_FILE) || [];
  res.json(leads);
});

// Toggle Lead status (Protected)
app.post('/api/admin/leads/:code/status', requireAdminAuth, (req, res) => {
  const { code } = req.params;
  const leads = readData(LEADS_FILE) || [];
  const lead = leads.find(l => l.code === code);
  if (!lead) return res.status(404).json({ error: 'Lead không tồn tại' });

  lead.status = lead.status === 'Đã liên hệ' ? 'Chờ xử lý' : 'Đã liên hệ';
  writeData(LEADS_FILE, leads);
  res.json({ success: true, status: lead.status });
});

// Update Menu & Badges (Protected)
app.post('/api/admin/menu', requireAdminAuth, (req, res) => {
  const { nav } = req.body || {};
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.nav = nav;
  writeData(CONTENT_FILE, content);
  res.json({ success: true, nav: content.nav });
});

// Update Social Channels (Protected)
app.post('/api/admin/socials', requireAdminAuth, (req, res) => {
  const { socials } = req.body || {};
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.socials = { ...content.socials, ...socials };
  writeData(CONTENT_FILE, content);
  res.json({ success: true, socials: content.socials });
});

// Update Brand Settings (Protected)
app.post('/api/admin/settings', requireAdminAuth, (req, res) => {
  const { brand } = req.body || {};
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.brand = { ...content.brand, ...brand };
  writeData(CONTENT_FILE, content);
  res.json({ success: true, brand: content.brand });
});

// Add new service (Protected)
app.post('/api/admin/services', requireAdminAuth, (req, res) => {
  const newService = req.body;
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.services = content.services || [];
  content.services.unshift(newService);
  writeData(CONTENT_FILE, content);
  res.json({ success: true, services: content.services });
});

// Delete service (Protected)
app.delete('/api/admin/services/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.services = (content.services || []).filter(s => s.id !== id);
  writeData(CONTENT_FILE, content);
  res.json({ success: true });
});

// Add new project (Protected)
app.post('/api/admin/projects', requireAdminAuth, (req, res) => {
  const newProject = req.body;
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.projects = content.projects || [];
  content.projects.unshift(newProject);
  writeData(CONTENT_FILE, content);
  res.json({ success: true, projects: content.projects });
});

// Delete project (Protected)
app.delete('/api/admin/projects/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const content = readData(CONTENT_FILE);
  if (!content) return res.status(500).json({ error: 'Lỗi đọc file dữ liệu' });

  content.projects = (content.projects || []).filter(p => p.id !== id);
  writeData(CONTENT_FILE, content);
  res.json({ success: true });
});

// Admin Route redirect
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`TechPA Website is running at: http://localhost:${PORT}`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin (Login required)`);
});
