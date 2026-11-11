const path = require('path');
const fs = require('fs');

const CONTENT_FILE = path.join(process.cwd(), 'data', 'content.json');
const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json');

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

module.exports = (req, res) => {
  const { url, method } = req;

  // GET /api/content
  if (url === '/api/content' && method === 'GET') {
    const data = readData(CONTENT_FILE);
    return res.status(200).json(data);
  }

  // POST /api/contact
  if (url === '/api/contact' && method === 'POST') {
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

    return res.status(200).json({
      success: true,
      code,
      message: 'Cảm ơn quý khách đã gửi thông tin. Đội ngũ chuyên gia TechPA sẽ liên hệ tư vấn trong vòng 15 phút!'
    });
  }

  // Default
  return res.status(200).json({ status: 'TechPA API is running' });
};

