# Hướng Dẫn Deploy Website TechPA Lên Vercel & Cloudflare

Website **TechPA** đã được cấu hình sẵn sàng để bạn có thể đưa lên internet miễn phí bằng **Vercel** hoặc **Cloudflare Pages**.

---

## 🚀 CÁCH 1: DEPLOY LÊN VERCEL (Khuyên dùng nhất - Chỉ 1 phút)

File cấu hình serverless [`vercel.json`](file:///c:/Users/IT/Documents/Project/outputs/english/neotech-theme-web/vercel.json) và [`api/index.js`](file:///c:/Users/IT/Documents/Project/outputs/english/neotech-theme-web/api/index.js) đã được tạo sẵn trong dự án.

### Bước làm:
1. Đẩy thư mục `neotech-theme-web` lên tài khoản GitHub của bạn (hoặc cài đặt `npm i -g vercel`).
2. Mở trình duyệt vào [https://vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
3. Chọn **"Add New Project"** ➔ Chọn repository chứa `neotech-theme-web`.
4. Tại phần **Root Directory**, chọn thư mục `neotech-theme-web` (nếu để ở thư mục con).
5. Bấm **Deploy**.
6. Sau khoảng 30 giây, Vercel sẽ cấp cho bạn đường link tên miền miễn phí dạng:  
   👉 `https://techpa-solutions.vercel.app`

---

## ⚡ CÁCH 2: DEPLOY LÊN CLOUDFLARE PAGES (Tốc độ CDN cực nhanh)

Website TechPA có mã nguồn giao diện HTML/CSS/JS thuần nhẹ nhàng trong thư mục `public/`.

### Bước làm:
1. Đăng nhập vào [https://dash.cloudflare.com](https://dash.cloudflare.com).
2. Vào mục **Workers & Pages** ➔ Chọn **Create application** ➔ Tab **Pages** ➔ **Connect to Git**.
3. Cấu hình build:
   - **Framework preset:** `None`
   - **Build command:** (để trống)
   - **Build output directory:** `public` (hoặc `neotech-theme-web/public`)
4. Bấm **Save and Deploy**.
5. Bạn sẽ nhận được đường link miễn phí dạng:  
   👉 `https://techpa.pages.dev`

