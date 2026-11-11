// Lớp lưu trữ dữ liệu đa nền tảng cho TechPA (Local File, Vercel Serverless, Upstash Redis)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PREFIX = process.env.STORE_PREFIX || 'techpa:';
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const mode = REDIS_URL && REDIS_TOKEN ? 'redis' : (process.env.VERCEL ? 'memory' : 'file');

// Bộ nhớ đệm in-memory giữ trạng thái trong cùng lifecycle container
const memCache = new Map();

class StoreError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const READONLY_MESSAGE =
  'Dữ liệu đang được lưu tạm trên Vercel serverless. ' +
  'Để lưu vĩnh viễn không mất sau khi khởi động lại, vui lòng kết nối Upstash Redis từ Vercel Dashboard (xem DEPLOY_GUIDE.md).';

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new StoreError('Lỗi kết nối cơ sở dữ liệu Upstash: ' + (body.error || `HTTP ${res.status}`), 502);
  }
  return body.result;
}

function readFile(name) {
  try {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[Store] Could not read file ${name}.json:`, err.message);
  }
  return undefined;
}

async function get(name, fallback = null) {
  // Ưu tiên đọc từ memCache nếu đã ghi trong phiên này
  if (memCache.has(name)) {
    return memCache.get(name);
  }

  if (mode === 'redis') {
    try {
      const raw = await redis(['GET', PREFIX + name]);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        memCache.set(name, parsed);
        return parsed;
      }
    } catch (err) {
      console.error('[Store Redis GET Error]:', err.message);
    }
    // Lần đầu khởi tạo từ file seed
    const seed = readFile(name);
    const value = seed !== undefined ? seed : fallback;
    if (value !== null) {
      // Tự động seed lên Redis để các lần sau đọc nhanh
      try {
        await redis(['SET', PREFIX + name, JSON.stringify(value)]);
      } catch (e) {}
    }
    memCache.set(name, value);
    return value;
  }

  const value = readFile(name);
  const result = value !== undefined ? value : fallback;
  memCache.set(name, result);
  return result;
}

async function set(name, value) {
  memCache.set(name, value);

  if (mode === 'redis') {
    await redis(['SET', PREFIX + name, JSON.stringify(value)]);
    return { persisted: true, mode: 'redis' };
  }

  if (mode === 'memory' || process.env.VERCEL) {
    // Trên Vercel không có quyền ghi đĩa file cục bộ
    return { persisted: false, mode: 'memory', warning: READONLY_MESSAGE };
  }

  // Chạy local: ghi an toàn vào file JSON
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${name}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return { persisted: true, mode: 'file' };
  } catch (err) {
    console.error(`[Store write error ${name}]:`, err.message);
    return { persisted: false, mode: 'memory', error: err.message };
  }
}

function getStorageStatus() {
  return {
    mode,
    redisConfigured: Boolean(REDIS_URL && REDIS_TOKEN),
    isVercel: Boolean(process.env.VERCEL),
    notice: mode === 'memory' ? READONLY_MESSAGE : null
  };
}

module.exports = { get, set, mode, StoreError, READONLY_MESSAGE, DATA_DIR, getStorageStatus };
