# CoWorking Cafe - Hệ thống Quản lý Quán Cafe Học tập

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-FE%20Development-orange)

Hệ thống quản lý quán cafe theo mô hình tính giờ, hỗ trợ check-in/check-out và quản lý dịch vụ.

## 🚀 Tính năng chính

- **Quản lý khách hàng** - Tạo tài khoản, theo dõi giờ sử dụng
- **Check-in/Check-out** - Quét SĐT để bắt đầu/kết thúc phiên học
- **Quản lý dịch vụ** - Đồ ăn, nước uống, gọi món
- **Gói giờ** - Mua gói giờ học với giá ưu đãi
- **Báo cáo doanh thu** - Thống kê theo ngày/tháng

## 🛠 Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js + TypeScript (sắp tới) |
| Database | MySQL (sắp tới) |

## 📁 Cấu trúc thư mục

```
├── src/
│   ├── templates/          # HTML templates
│   │   ├── login.html      # Trang đăng nhập
│   │   └── admin.html      # Dashboard admin
│   ├── styles/             # CSS files (sắp tới)
│   ├── scripts/            # JS files (sắp tới)
│   └── index.ts            # Entry point
├── dist/                   # Build output
├── package.json
└── tsconfig.json
```

## 🎨 Design System

### Màu sắc
- **Primary**: `#4A3022` (Nâu cafe đậm)
- **Accent**: `#D4A373` (Caramel)
- **Background**: `#F9F6F0` (Trắng kem)
- **Sidebar**: `#2E1E16` (Nâu đen)

### Font
- **Inter** - Google Fonts

## 🚦 Bắt đầu phát triển

### Yêu cầu
- Node.js >= 18
- npm hoặc yarn

### Cài đặt
```bash
# Clone repository
git clone git@github.com:XuanKio/CoWord-Cafe.git
cd CoWord-Cafe

# Cài dependencies
npm install

# Build TypeScript
npm run build
```

### Chạy development
```bash
# Mở file HTML trực tiếp
# Hoặc dùng Live Server
npx live-server src/templates/
```

## 📋 TODO - Frontend Phase

### Phase 1: Cấu trúc cơ bản
- [ ] Tách CSS ra file riêng (`src/styles/`)
- [ ] Tách JS ra file riêng (`src/scripts/`)
- [ ] Tạo component reusable (sidebar, card, table)
- [ ] Thiết lập folder structure chuẩn

### Phase 2: Trang Admin
- [ ] Trang Dashboard (đã có template)
- [ ] Trang Quản lý khách hàng
- [ ] Trang Check-in/Check-out
- [ ] Trang Quản lý dịch vụ
- [ ] Trang Quản lý gói giờ
- [ ] Trang Báo cáo doanh thu

### Phase 3: Trang User
- [ ] Trang đăng nhập User
- [ ] Trang xem giờ còn lại
- [ ] Trang gọi dịch vụ

### Phase 4: Tích hợp API
- [ ] Setup fetch/axios
- [ ] Kết nối backend
- [ ] Xử lý authentication
- [ ] Real-time updates (WebSocket)

## 📝 API Endpoints (dự kiến)

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/users
POST   /api/users
GET    /api/users/:id
POST   /api/sessions/checkin
POST   /api/sessions/checkout
GET    /api/services
POST   /api/services
GET    /api/packages
GET    /api/reports/revenue
```

## 👥 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m 'Add feature'`
4. Push lên branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

## 📄 License

MIT License

---

**Author:** Xuân Ca Ca  
**Repository:** https://github.com/XuanKio/CoWord-Cafe
