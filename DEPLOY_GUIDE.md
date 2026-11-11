# Hướng Dẫn Hệ Thống Quản Trị & Triển Khai TechPA (techpa.vn)

Website **TechPA** được tích hợp đầy đủ hệ sinh thái CMS, hệ thống tiếp nhận khách hàng tiềm năng (Leads CRM), hệ thống quản trị phân quyền đa cấp (Role-Based Access Control - RBAC) và kho lưu trữ dữ liệu đa nền tảng.

---

## 🔐 1. TÀI KHOẢN ĐĂNG NHẬP QUẢN TRỊ (ADMIN PORTAL)

Truy cập: **`https://techpa.vn/admin`** (hoặc `https://techpa.vn/login.html`)

Hệ thống đã loại bỏ hoàn toàn việc hiển thị mật khẩu trên giao diện đăng nhập để đảm bảo an toàn thông tin doanh nghiệp.

### Các tài khoản mẫu được khởi tạo sẵn:
| Tên đăng nhập | Mật khẩu mặc định | Vai trò (Role) | Chức năng được phép |
| :--- | :--- | :--- | :--- |
| **`admin`** | `techpa2026` | **Quản trị viên cấp cao (Superadmin)** | Toàn quyền: Quản lý user & phân quyền, duyệt/xóa Leads, chỉnh sửa toàn bộ CMS, cấu hình Hotline & Brand |
| **`sales`** | `techpa2026` | **Nhân viên kinh doanh (Sales)** | Quản lý Leads: Xem khách hàng mới, đổi trạng thái liên hệ, xóa yêu cầu |
| **`editor`** | `techpa2026` | **Biên tập nội dung (Editor)** | Quản trị CMS: Menu & nhãn Hot, gói Dịch vụ, Dự án, Kênh Mạng xã hội, Hotline & Banner thông báo |

> 💡 **Khuyên dùng:** Đăng nhập bằng tài khoản `admin`, vào tab **"Quản Lý User & Phân Quyền"** để đổi mật khẩu tài khoản mặc định và tạo thêm các tài khoản theo đúng phòng ban của bạn.

---

## 🛡️ 2. PHÂN QUYỀN THEO TỪNG CHỨC NĂNG (RBAC)

Quản trị viên có thể tạo tài khoản và gán quyền chi tiết theo từng module:
- **`leads.view`**: Xem danh sách khách hàng gửi form tư vấn.
- **`leads.manage`**: Cập nhật trạng thái liên hệ hoặc xóa lead.
- **`content.menu`**: Sửa danh mục menu, bật/tắt nhãn Hot, New, Pro và màu sắc.
- **`content.services`**: Thêm/xóa các gói dịch vụ công nghệ trên trang chủ.
- **`content.projects`**: Thêm/xóa các dự án tiêu biểu.
- **`content.socials`**: Cập nhật đường dẫn Zalo, Facebook, LinkedIn, YouTube.
- **`content.settings`**: Cấu hình Hotline, Email, Địa chỉ, Giờ làm việc, Announcement bar.
- **`users.manage`**: Quản lý tài khoản, thêm/sửa/xóa thành viên và phân quyền chi tiết.

Hệ thống có cơ chế bảo vệ: Không cho phép tự xóa tài khoản của chính mình và không cho phép xóa tài khoản Superadmin cuối cùng.

---

## ☁️ 3. LƯU TRỮ DỮ LIỆU BỀN VỮNG TRÊN VERCEL (UPSTASH REDIS)

Môi trường Serverless của Vercel là môi trường chỉ đọc (Read-only filesystem).
Website TechPA đã được trang bị lớp lưu trữ thông minh:
1. **Chế độ tạm thời (Memory Mode):** Ngay cả khi chưa kết nối Database, toàn bộ chức năng admin và lưu dữ liệu vẫn hoạt động bình thường trong phiên làm việc.
2. **Chế độ vĩnh viễn (Upstash Redis - Miễn phí 100% trên Vercel):**
   - Đăng nhập vào [https://vercel.com](https://vercel.com) ➔ Chọn Project `techpa-website`.
   - Vào tab **Storage** ➔ Bấm **Create Database** ➔ Chọn **KV / Upstash Redis**.
   - Bấm **Connect to Project** ➔ Chọn môi trường **Production**.
   - Vercel sẽ tự động gắn biến môi trường `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
   - Vào tab **Deployments** ➔ Bấm **Redeploy**.
   - Sau khi deploy, logo trạng thái ở góc trên trang admin sẽ hiện: **`☁️ Upstash Redis (Lưu vĩnh viễn)`**.

---

## 🌐 4. CẤU HÌNH DOMAIN TECHPA.VN

Domain `techpa.vn` đã được trỏ về Vercel:
- **A Record:** `@` trỏ về `76.76.21.21`
- **CNAME Record:** `www` trỏ về `cname.vercel-dns.com`
Vercel tự động cấp phát chứng chỉ bảo mật SSL (HTTPS) trọn đời miễn phí.
