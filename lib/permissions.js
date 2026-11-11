// Danh mục quyền theo chức năng và các vai trò mẫu.
const PERMISSIONS = [
  { key: 'leads.view', label: 'Xem yêu cầu tư vấn (Leads)', group: 'Khách hàng' },
  { key: 'leads.manage', label: 'Cập nhật trạng thái / xóa Leads', group: 'Khách hàng' },
  { key: 'content.menu', label: 'Menu & nhãn Hot', group: 'Nội dung website' },
  { key: 'content.services', label: 'Gói dịch vụ', group: 'Nội dung website' },
  { key: 'content.projects', label: 'Dự án tiêu biểu', group: 'Nội dung website' },
  { key: 'content.pricing', label: 'Bảng giá & gói giải pháp', group: 'Nội dung website' },
  { key: 'content.blog', label: 'Tin tức & bài viết công nghệ', group: 'Nội dung website' },
  { key: 'content.faqs', label: 'Hỏi đáp & Câu hỏi thường gặp', group: 'Nội dung website' },
  { key: 'content.testimonials', label: 'Ý kiến & Đánh giá khách hàng', group: 'Nội dung website' },
  { key: 'content.socials', label: 'Kênh mạng xã hội (Zalo, Facebook...)', group: 'Nội dung website' },
  { key: 'content.settings', label: 'Thương hiệu, Hotline & thông báo', group: 'Nội dung website' },
  { key: 'users.manage', label: 'Quản lý người dùng & phân quyền', group: 'Hệ thống' },
];

const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key);
const CONTENT_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p.startsWith('content.'));

const ROLES = [
  { key: 'superadmin', label: 'Quản trị viên cấp cao', permissions: ALL_PERMISSIONS },
  { key: 'sales', label: 'Nhân viên kinh doanh', permissions: ['leads.view', 'leads.manage'] },
  { key: 'editor', label: 'Biên tập nội dung', permissions: CONTENT_PERMISSIONS },
  { key: 'viewer', label: 'Chỉ xem Leads', permissions: ['leads.view'] },
  { key: 'custom', label: 'Tùy chỉnh', permissions: [] },
];

const ROLE_KEYS = ROLES.map((r) => r.key);

function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === 'superadmin') return [...ALL_PERMISSIONS];
  return (user.permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
}

module.exports = { PERMISSIONS, ALL_PERMISSIONS, ROLES, ROLE_KEYS, effectivePermissions };

