📘 README_FE.md
Co-Working Cafe Management System – Frontend
1️⃣ Giới thiệu dự án

Hệ thống Co-Working Cafe Management System là hệ thống web quản lý quán cafe học tập theo mô hình tính giờ bằng tài khoản.

Hệ thống cho phép:

Quản lý khách hàng bằng số điện thoại

Theo dõi số giờ còn lại

Check-in / Check-out

Quản lý dịch vụ (đồ ăn, nước uống)

Quản lý gói giờ

Thống kê doanh thu

Hệ thống có 2 vai trò chính:

👨‍💼 Admin (quản lý / nhân viên)

👤 Khách hàng (User)

2️⃣ Công nghệ Frontend

HTML / CSS (hoặc React nếu mở rộng)

Thiết kế hiện đại, tối giản

Responsive cơ bản

Giao diện quản trị dạng Dashboard

3️⃣ Nguyên tắc thiết kế UI
🎨 Phong cách

Tông màu: Nâu cafe / Be / Trắng

Thiết kế tối giản

Card bo góc mềm

Shadow nhẹ

Giao diện rõ ràng, dễ nhìn

🧩 UX yêu cầu

Không rối

Phân tách rõ Sidebar và Main

Dễ thao tác cho nhân viên

Thông tin quan trọng phải nổi bật (giờ còn lại, doanh thu, trạng thái)

4️⃣ Cấu trúc Trang (Frontend Pages)
🔐 1. Trang Đăng Nhập
Dùng cho:

Admin

User

Thành phần:

Input SĐT / Username

Input mật khẩu

Nút đăng nhập

Hiển thị lỗi nếu sai

🎛 2. Trang Admin Dashboard
Bố cục:

Sidebar (bên trái):

Tổng quan

Quản lý khách hàng

Check-in / Check-out

Quản lý dịch vụ

Quản lý gói giờ

Báo cáo doanh thu

Đăng xuất

Main content:

Card thống kê nhanh

Bảng danh sách khách

📊 Card thống kê gồm:

Khách đang hoạt động

Phiên hôm nay

Doanh thu hôm nay

Số dịch vụ đã bán

👥 3. Trang Quản lý Khách hàng

Chức năng:

Hiển thị danh sách khách

Tìm kiếm theo tên / SĐT

Tạo khách mới

Xem chi tiết khách

Nạp giờ cho khách

Bảng gồm:

Tên

SĐT

Giờ còn lại

Trạng thái

Hành động

⏱ 4. Trang Check-in / Check-out

Chức năng:

Nhập SĐT khách

Hiển thị giờ còn lại

Nút Check-in

Nút Check-out

Hiển thị thời gian đã dùng

Tính tiền

🍹 5. Trang Quản lý Dịch vụ

Hiển thị:

Tên dịch vụ

Loại (Đồ ăn / Nước uống)

Giá

Trạng thái

Chức năng:

Thêm dịch vụ

Sửa

Tắt/mở bán

⏳ 6. Trang Quản lý Gói giờ

Hiển thị:

Tên gói

Số giờ

Giá

Trạng thái

Chức năng:

Thêm gói mới

Sửa gói

Ngừng bán

💰 7. Trang Báo cáo Doanh thu

Hiển thị:

Doanh thu hôm nay

Doanh thu theo ngày

Doanh thu theo tháng

Biểu đồ (nếu có)

5️⃣ Mapping với CSDL (Để AI hiểu logic)
Bảng chính:

Admin
User
Sessions
Services
Packages
Service_requests
Transactions

Ví dụ mapping UI → CSDL
UI	Bảng
Đăng nhập Admin	Admin
Danh sách khách	User
Check-in	Sessions
Nạp giờ	Transactions + Packages
Gọi dịch vụ	Service_requests
Doanh thu	Transactions
6️⃣ Luồng chính của hệ thống
Luồng khách:

Admin tạo tài khoản User

User đến quán

Admin Check-in (tạo Session)

User gọi dịch vụ (Service_requests)

Check-out → tính tiền

Trừ giờ còn lại

7️⃣ Component gợi ý (Nếu dùng React)

Sidebar

Topbar

Card thống kê

Bảng dữ liệu (Table component)

Modal popup

Form component

Toast thông báo

8️⃣ Mục tiêu UI

Frontend phải:

Dễ mở rộng

Dễ tích hợp API backend

Không hardcode dữ liệu thật

Sẵn sàng chuyển sang React nếu cần