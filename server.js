const express = require('express');
const path = require('path');
const apiApp = require('./api/index');

const app = express();
const PORT = process.env.PORT || 3200;

// Phục vụ tệp tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Gắn toàn bộ API endpoints (dùng chung 100% logic với Vercel Serverless)
app.use(apiApp);

// Đường dẫn tiện ích
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Chạy local server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  TechPA Website is running at: http://localhost:${PORT}`);
  console.log(`  Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`======================================================\n`);
});
