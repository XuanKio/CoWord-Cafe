# DOC GIAI PHAU HE THONG COWORDPTIT

Tai lieu nay mo ta he thong theo dung code hien tai trong repo, theo 4 lop:

1. FE entrypoint nao dang chay that
2. API nao duoc goi, request/response ra sao
3. Backend xu ly qua controller -> service -> repository -> entity nhu the nao
4. Bang/field CSDL nao bi doc, ghi, cong, tru trong tung nghiep vu

Tai lieu nay duoc viet theo "don vi doc code" thuc te: field, method, block nghiep vu, va luong request end-to-end. Voi file rat lon nhu `admin.js`, tai lieu map theo function + line start de ban mo file va doc nhanh dung cho.

## 1. Snapshot kien truc

- Backend: Spring Boot MVC + Spring Security + Spring Data JPA + MySQL
- Frontend: static HTML/CSS/JS, khong dung React/Vue
- Auth: JWT, luu token trong `localStorage`
- Kieu response backend: `ApiResponse<T>` co `success`, `message`, `data`
- Kieu tieu thu phia FE: `api.js` tu dong unwrap `data`, nen da so code FE nhan truc tiep object/list, khong phai wrapper

## 2. File nao dang chay that, file nao la nhanh cu

### 2.1 Ba entrypoint FE dang duoc HTML import

- `src/main/resources/static/login.html:235` -> import `src/main/resources/static/js/login-page.js`
- `src/main/resources/static/admin.html:685` -> import `src/main/resources/static/js/admin.js`
- `src/main/resources/static/user.html:113` -> import `src/main/resources/static/js/user-page.js`

### 2.2 Cac file JS co trong repo nhung KHONG duoc HTML hien tai import

Nhung file sau co ve la nhanh cu/ban prototype, khong nam trong luong dang chay thuc te cua `login.html`, `admin.html`, `user.html`:

- `app.js`
- `auth.js`
- `dashboard.js`
- `checkin.js`
- `customers.js`
- `services.js`
- `packages.js`
- `orders.js`
- `reports.js`
- `router.js`
- `data.js`
- `api-client.js`
- `login.js`
- `user.js`

Khi doc code de hieu san pham dang chay, uu tien 3 file:

- `login-page.js`
- `admin.js`
- `user-page.js`

Va lop API chung:

- `api.js`

## 3. Thu tu khoi dong he thong

### 3.1 Spring Boot start

File:

- `src/main/java/org/example/cowordptit/CoWordPtitApplication.java`

Vai tro:

- `@SpringBootApplication` bat auto configuration
- `@EnableScheduling` bat scheduler cho auto check-out

### 3.2 Nap cau hinh

File:

- `src/main/resources/application.properties`

Y nghia tung nhom dong:

- `server.port=8080`: app chay cong 8080
- `spring.datasource.*`: ket noi MySQL DB `coworking_cafe`
- `spring.jpa.hibernate.ddl-auto=update`: Hibernate tu dong dong bo schema theo entity
- `spring.jpa.properties.hibernate.globally_quoted_identifiers=true`: bat backtick cho bang/cot tranh reserved keyword nhu `Sessions`, `Transactions`
- `app.vip.purchased-hours-threshold=60`: nguong gio nap de danh dau VIP theo gio

Luu y:

- Comment trong `setup_database.sql` noi ve `ddl-auto=create`, nhung file `application.properties` hien tai dang la `update`. Doc code nen tin file properties hien tai.

### 3.3 Seed data luc khoi dong

File:

- `src/main/java/org/example/cowordptit/config/DataInitializer.java:16`

Neu DB rong:

- Tao 1 admin mac dinh
- Tao 4 customer
- Tao 3 package
- Tao 5 menu item

Ham ho tro:

- `makeCustomer(...)` tai `DataInitializer.java:78`
- `makePackage(...)` tai `DataInitializer.java:88`
- `makeService(...)` tai `DataInitializer.java:97`

## 4. Luong route tong quat cua web

### 4.1 Route view

File:

- `src/main/java/org/example/cowordptit/controller/ViewController.java`

Map:

- `GET /` -> forward sang `/login`
- `GET /login` -> tra `login.html`
- `GET /admin` -> tra `admin.html`
- `GET /user` -> tra `user.html`

Luu y:

- FE nhieu cho redirect sang `/login.html`, `/admin.html`, `/user.html`
- Ca 2 kieu `/login` va `/login.html` deu co the dung duoc, vi mot ben la controller, mot ben la static resource

### 4.2 Request lifecycle chung

Luot di du lieu cho da so tinh nang:

1. User thao tac UI trong `*.html`
2. File JS trang (`login-page.js`, `admin.js`, `user-page.js`) goi `apiRequest()` trong `api.js`
3. `api.js` tu dong:
   - doc `localStorage.user.token`
   - them header `Authorization: Bearer ...`
   - them `Content-Type: application/json` neu body la JSON
   - parse `ApiResponse`
   - neu 401/403 thi xoa auth va redirect login
4. Controller nhan request DTO/body/query
5. Service xu ly nghiep vu
6. Repository doc/ghi entity
7. JPA map entity <-> bang MySQL
8. Service map entity ra `Map<String, Object>`
9. Controller boc lai thanh `ApiResponse.success(...)`
10. `api.js` boc ra `payload.data`
11. JS trang dung object/list do de render HTML

## 5. Bao mat, auth, va quyen truy cap

### 5.1 Cau hinh security

File:

- `src/main/java/org/example/cowordptit/config/SecurityConfig.java:28`

Nhung gi file nay lam:

- Tat CSRF
- Dat `SessionCreationPolicy.STATELESS`
- Cho phep public:
  - `/`, `/login`, `/admin`, `/user`, `/*.html`
  - `/css/**`, `/js/**`, ...
  - `OPTIONS /**`
  - `/api/auth/**`
  - `GET /api`, `GET /api/health`
- Role `USER` hoac `ADMIN` deu duoc:
  - `GET /api/customers/*`
  - `POST /api/requests`
  - `GET /api/requests/customer/**`
  - `GET /api/requests/search`
  - `GET /api/sessions/customer/**`
  - `GET /api/packages/**`
  - `GET /api/menu/**`
- Chi `ADMIN` duoc:
  - CRUD customer full
  - CRUD menu/package
  - check-in/check-out
  - xem toan bo requests/payments/reports
  - approve/cancel request

### 5.2 JWT pipeline

Files:

- `src/main/java/org/example/cowordptit/security/JwtUtil.java:18`
- `src/main/java/org/example/cowordptit/security/JwtFilter.java`

Trinh tu:

1. Login thanh cong
2. `JwtUtil.generateToken(username, role)` tao JWT co:
   - `sub`
   - claim `role`
   - han 24h
3. FE luu vao `localStorage.user.token`
4. Moi request sau do di qua `JwtFilter.doFilterInternal(...)`
5. Filter:
   - doc header `Authorization`
   - tach token sau chuoi `Bearer `
   - validate token
   - lay `username`, `role`
   - dat `SecurityContextHolder` voi authority `ROLE_ADMIN` hoac `ROLE_USER`

### 5.3 Luu auth phia FE

File:

- `src/main/resources/static/js/login-page.js`

Admin session luu:

```json
{
  "adminId": 1,
  "username": "admin",
  "phone": "0900000000",
  "role": "ADMIN",
  "token": "..."
}
```

User session luu:

```json
{
  "usersId": 1,
  "name": "Nguyen Minh Anh",
  "phone": "0911111111",
  "remainingHours": 5.0,
  "status": "ACTIVE",
  "role": "USER",
  "token": "..."
}
```

Ngoai ra:

- `sessionStorage.cwc_admin` luu object admin
- `sessionStorage.cwc_user` luu object customer

Nhung 2 key sessionStorage nay hien tai khong phai trung tam luong chay, logic FE chu yeu dua vao `localStorage.user`.

### 5.4 Cac diem can rat chu y

- `AuthService.java:29` va `AuthService.java:50` so sanh password bang `password.equals(...)`, nghia la plain text
- `SecurityConfig.java:77` tao `BCryptPasswordEncoder`, nhung he thong dang khong dung no trong login/create/update
- `JwtUtil.java` hard-code secret key
- `application.properties` de credential DB truc tiep trong repo
- `CorsConfig.java:15` cho phep origin pattern `*`
- Quyen `USER` duoc `GET /api/customers/{id}`, `GET /api/sessions/customer/{id}`, `GET /api/requests/customer/{id}` ma khong co check "id co phai cua chinh user khong"

Noi cach khac: FE hien tai chi goi du lieu cua chinh user, nhung backend chua khoa theo ownership.

## 6. Mo hinh CSDL va entity

### 6.1 So do quan he

- `Admin` doc lap
- `Users` 1 - n `Sessions`
- `Users` 1 - n `Service_requests`
- `Sessions` 1 - n `Service_requests` (nullable)
- `Services` 1 - n `Service_requests` (nullable)
- `Packages` 1 - n `Service_requests` (nullable)
- `Service_requests` 1 - n `Transactions`

### 6.2 Bang `Admin`

Entity:

- `src/main/java/org/example/cowordptit/entity/Admin.java`

Field map:

- `adminId` -> cot `admin_id`, luon mac dinh = 1
- `username`
- `phone`
- `passwordHash` -> cot `password_hash`

Repository:

- `AdminRepository.findByUsername(String username)`

Ai doc/ghi:

- Ghi luc seed trong `DataInitializer`
- Doc luc admin login trong `AuthService.adminLogin`

Tra du lieu cho FE:

- `AuthService.adminLogin` tra object `admin` gom `adminId`, `username`, `phone`, `role`

### 6.3 Bang `Users`

Entity:

- `src/main/java/org/example/cowordptit/entity/Customer.java`

Field map:

- `usersId` -> PK `users_id`
- `name`
- `phone`
- `passwordHash` -> `password_hash`
- `remainingHours` -> `remaining_hours`
- `status`
- `createdAt` -> `created_at`

Enum:

- `ACTIVE`
- `UNACTIVE`
- `INACTIVE`
- `IN_SESSION`
- `OUT_OF_HOURS`

Nhung code hien tai that su dung:

- Chu yeu chi `ACTIVE`, `UNACTIVE`, `INACTIVE`
- `IN_SESSION` va `OUT_OF_HOURS` co trong enum/FE label, nhung service hien tai khong chu dong persist 2 trang thai nay vao DB

Repository:

- `CustomerRepository.findByPhone`
- `CustomerRepository.existsByPhone`

Map response cho FE:

`CustomerService.toMap(...)` tai `CustomerService.java:117` tra:

```json
{
  "usersId": 1,
  "name": "Nguyen Minh Anh",
  "phone": "0911111111",
  "remainingHours": 4.25,
  "totalHoursUsed": 10.75,
  "totalPurchasedHours": 15.00,
  "isVipByHours": false,
  "isVipByPurchasedHours": false,
  "status": "ACTIVE",
  "createdAt": "2026-04-23T..."
}
```

Diem rat quan trong:

- `remainingHours` FE nhan khong hoan toan la gia tri raw trong DB
- Neu customer dang co session `ONGOING`, `CustomerService.toMap` se tinh `effective remainingHours = remaining raw - gio dang dung realtime`
- Nghia la UI co the thay so gio dang giam theo thoi gian, du DB chua bi tru cho den luc checkout

### 6.4 Bang `Sessions`

Entity:

- `src/main/java/org/example/cowordptit/entity/CafeSession.java`

Field map:

- `sessionsId`
- `customer` -> FK `users_id`
- `checkIn` -> `check_in`
- `checkOut` -> `check_out`
- `hoursUsed` -> `hours_used`
- `status`

Enum:

- `ONGOING`
- `COMPLETED`

Repository:

- `findByCustomer_UsersId`
- `findByCustomer_UsersIdAndStatus`
- `findByStatus`

Map response cho FE:

`CafeSessionService.toMap(...)` tai `CafeSessionService.java:108` tra:

```json
{
  "sessionsId": 10,
  "usersId": 1,
  "customerName": "Nguyen Minh Anh",
  "customerPhone": "0911111111",
  "checkIn": "2026-04-23T08:30:00",
  "checkOut": null,
  "hoursUsed": 0,
  "status": "ONGOING"
}
```

### 6.5 Bang `Services`

Entity:

- `src/main/java/org/example/cowordptit/entity/MenuIItem.java`

Field:

- `servicesId`
- `name`
- `type`
- `price`
- `status`

Enum:

- `ServiceType`: `FOOD`, `DRINK`
- `ServiceStatus`: `AVAILABLE`, `OUT_OF_STOCK`

Repository:

- `findByStatus`
- `findByType`

Map response:

```json
{
  "servicesId": 2,
  "name": "Ca phe sua",
  "type": "DRINK",
  "price": 30000,
  "status": "AVAILABLE"
}
```

Luu y:

- Backend co ho tro status
- UI admin hien tai khong cho sua status
- UI user hien tai goi `/api/menu` chu khong goi `/api/menu/available`

### 6.6 Bang `Packages`

Entity:

- `src/main/java/org/example/cowordptit/entity/TimePackage.java`

Field:

- `packagesId`
- `name`
- `hoursAmount`
- `price`
- `status`

Enum:

- `AVAILABLE`
- `DISABLED`

Map response:

```json
{
  "packagesId": 1,
  "name": "Goi 5 gio",
  "hoursAmount": 5,
  "price": 50000,
  "status": "AVAILABLE"
}
```

Luu y:

- Giong menu, UI hien tai khong quan ly status
- UI user hien tai goi `/api/packages` chu khong goi `/api/packages/available`

### 6.7 Bang `Service_requests`

Entity:

- `src/main/java/org/example/cowordptit/entity/ServiceRequest.java`

Field:

- `serviceRequestsId`
- `customer` -> FK `users_id`
- `session` -> FK `sessions_id`, nullable
- `service` -> FK `services_id`, nullable
- `timePackage` -> FK `packages_id`, nullable
- `quantity`
- `totalPrice`
- `status`
- `createdAt`

Enum:

- `PENDING`
- `APPROVED`
- `PAID`
- `CANCELLED`

Repository:

- `findByCustomer_UsersId`
- `findByStatus`
- `findByCustomer_UsersIdAndStatus`

Map response:

```json
{
  "serviceRequestsId": 99,
  "usersId": 1,
  "customerName": "Nguyen Minh Anh",
  "customerPhone": "0911111111",
  "sessionsId": 10,
  "servicesId": 2,
  "serviceName": "Ca phe sua",
  "serviceType": "DRINK",
  "packagesId": null,
  "packageName": null,
  "packageHoursAmount": null,
  "quantity": 2,
  "totalPrice": 60000,
  "status": "PENDING",
  "createdAt": "2026-04-23T09:00:00"
}
```

Rule nghiep vu quan trong:

- Chi can co `usersId`
- Co the co `sessionsId` hoac khong
- Neu `servicesId != null` thi xem la order mon
- Neu `packagesId != null` thi xem la mua goi

Luu y ky thuat rat quan trong:

- Backend chi check "neu co servicesId thi tao service request", `else if` moi sang package
- Nghia la neu client gui ca `servicesId` va `packagesId`, backend se uu tien `servicesId`, package bi bo qua
- Backend khong enforce "service request phai co session dang mo" cho order mon. Viec bat buoc check-in hien tai chu yeu bi chan o FE

### 6.8 Bang `Transactions`

Entity:

- `src/main/java/org/example/cowordptit/entity/PaymentRecord.java`

Field:

- `transactionsId`
- `serviceRequest` -> FK `service_requests_id`
- `amount`
- `paymentMethod`
- `createdAt`

Enum:

- `CASH`
- `BANK`
- `MOMO`

Map response:

```json
{
  "transactionsId": 12,
  "serviceRequestsId": 99,
  "amount": 60000,
  "paymentMethod": "CASH",
  "createdAt": "2026-04-23T09:05:00"
}
```

Luu y:

- Model hien tai cho phep moi `ServiceRequest` co nhieu `PaymentRecord`
- FE admin hien tai chi tao 1 payment/mac dinh `CASH` ngay sau approve
- Neu code khac tao nhieu payment cho cung request, bao cao se tinh nhieu giao dich

## 7. DTO va hop dong request/response

### 7.1 DTO request

Map DTO -> field:

- `AdminLoginRequest`: `username`, `password`
- `UserLoginRequest`: `phone`, `password`
- `CreateCustomerRequestDto`: `name`, `phone`, `password`
- `UpdateCustomerRequestDto`: `name`, `phone`, `password`, `status`, `remainingHours`
- `AddHoursRequestDto`: `hours`, `note`
- `CheckInRequest`: `usersId`
- `MenuRequestDto`: `name`, `type`, `status`, `price`
- `PackageRequestDto`: `name`, `status`, `hoursAmount`, `price`
- `CreateServiceRequestDto`: `usersId`, `sessionsId`, `servicesId`, `packagesId`, `quantity`
- `PaymentRequestDto`: `serviceRequestsId`, `amount`, `paymentMethod`

### 7.2 Wrapper response backend

File:

- `src/main/java/org/example/cowordptit/dto/response/ApiResponse.java`

Form:

```json
{
  "success": true,
  "message": "Tao thanh cong",
  "data": { "...": "..." }
}
```

Nhung FE nhan thuc te:

- `api.js:30` se unwrap ra `payload.data`
- Nghia la trong `admin.js` / `user-page.js`, bien `customers`, `sessions`, `report` la du lieu that trong `data`

## 8. Ban do file backend

### 8.1 Cau hinh va bao mat

- `CoWordPtitApplication.java`: diem vao app
- `SecurityConfig.java`: matrix phan quyen endpoint
- `JwtFilter.java`: doc Bearer token va set authentication
- `JwtUtil.java`: tao/validate JWT
- `CorsConfig.java`: CORS cho `/api/**`
- `DataInitializer.java`: seed du lieu mau

### 8.2 Controllers

- `AuthController.java`
- `CustomerController.java`
- `CafeSessionController.java`
- `MenuController.java`
- `PackageController.java`
- `ServiceRequestController.java`
- `PaymentController.java`
- `ReportController.java`
- `HomeController.java`
- `ViewController.java`
- `ApiExceptionHandler.java`

### 8.3 Services

- `AuthService.java`
- `CustomerService.java`
- `CafeSessionService.java`
- `MenuService.java`
- `PackageService.java`
- `ServiceRequestService.java`
- `PaymentService.java`
- `ReportService.java`
- `SessionMonitorService.java`

### 8.4 Repositories

- `AdminRepository`
- `CustomerRepository`
- `CafeSessionRepository`
- `CafeServiceRepository`
- `PackageRepository`
- `ServiceRequestRepository`
- `PaymentRepository`

## 9. Ban do file frontend dang chay

### 9.1 `api.js`

File:

- `src/main/resources/static/js/api.js`

Muc dich:

- Lop adapter chung cho toan bo FE
- Dinh nghia `apiRequest(...)`
- Export cac namespace:
  - `authApi`
  - `customerApi`
  - `packageApi`
  - `menuApi`
  - `sessionApi`
  - `serviceRequestApi`
  - `paymentApi`
  - `serviceOrderApi`
  - `packageSaleApi`
  - `reportApi`

Trong he thong dang chay thuc te:

- `login-page.js` dung `authApi`
- `user-page.js` dung `customerApi`, `menuApi`, `packageApi`, `serviceRequestApi`, `sessionApi`
- `admin.js` goi truc tiep `apiRequest(...)`

### 9.2 `login-page.js`

File:

- `src/main/resources/static/js/login-page.js`

Map function:

- `getUser()` line 6: doc `localStorage.user`
- `clearAuth()` line 14: xoa localStorage/sessionStorage
- `redirectIfLoggedIn()` line 20: neu da dang nhap thi nhay thang sang admin/user page
- `setLoading()` line 36: doi nut login sang loading
- `showError()` line 46: hien box loi
- `saveAdminSession()` line 60: luu session admin
- `saveUserSession()` line 73: luu session user
- `handleLogin()` line 88: thu admin login truoc, neu 401 moi fallback sang user login
- `init()` line 126: bind submit form

### 9.3 `admin.js`

File:

- `src/main/resources/static/js/admin.js`

Map function chinh:

- line 20: `showSection(sectionId)` - chuyen section va trigger load data
- line 230: `loadDashboard()`
- line 325: `loadCheckinSection()`
- line 424: `doCheckIn(usersId)`
- line 450: `doCheckOut(sessionId)`
- line 473: `loadCustomers()`
- line 484: `renderCustomersTable()`
- line 579: `openAddHoursModal(id)`
- line 587: `submitAddHours()`
- line 618: `openCustomerModal(id)`
- line 649: `deleteCustomer(id)`
- line 670: `saveCustomer()`
- line 725: `loadServices()`
- line 766: `openServiceModal(id)`
- line 785: `deleteService(id)`
- line 805: `saveService()`
- line 846: `loadPackages()`
- line 876: `openPackageModal(id)`
- line 895: `deletePackage(id)`
- line 915: `savePackage()`
- line 956: `loadOrders()`
- line 967: `filterOrderList(status, btnElement)`
- line 1031: `renderOrderCard(r)`
- line 1099: `openOrderDetailModal(id)`
- line 1157: `approveOrder(id)`
- line 1203: `cancelOrder(id)`
- line 1238: `loadReports()`
- line 1338: `renderRevenuePie(...)`
- line 1480: `renderRevenueLeaderboard(...)`
- line 1510: `renderReportDailyTable()`
- line 1561: `renderReportDetail(day)`

### 9.4 `user-page.js`

File:

- `src/main/resources/static/js/user-page.js`

Map function:

- line 26: `init()` - auth guard + load 3 khoi du lieu
- line 51: `loadMyInfo()`
- line 70: `renderUserInfo(data)`
- line 104: `loadMySessions()`
- line 119: `renderSessionList()`
- line 139: `renderSessionCard(s)`
- line 169: `loadOrderPanel()`
- line 199: `bindMainTabs()`
- line 211: `switchMainTab(tab)`
- line 251: `renderPackagesList()`
- line 277: `renderServiceList(type)`
- line 380: `changeQty(key, delta)`
- line 388: `updateOrderSummary()`
- line 413: `submitOrder()`

## 10. Luong chi tiet theo tinh nang

## 10.1 Luong dang nhap admin

FE:

1. User mo `/login` hoac `/login.html`
2. `login.html` load form va import `login-page.js`
3. `login-page.js:init()` bind submit
4. Khi submit:
   - `handleLogin()` line 88 doc `username`, `password`
   - goi `authApi.adminLogin(username, password)`
   - `authApi.adminLogin` map sang `POST /api/auth/admin`

Backend:

1. `AuthController.adminLogin(...)` tai `AuthController.java:29`
2. goi `AuthService.adminLogin(...)` tai `AuthService.java:29`
3. `AdminRepository.findByUsername(username)`
4. so sanh password bang plain text
5. `JwtUtil.generateToken(admin.getUsername(), "ADMIN")`
6. tra:

```json
{
  "token": "...",
  "admin": {
    "adminId": 1,
    "username": "admin",
    "phone": "0900000000",
    "role": "ADMIN"
  }
}
```

FE sau response:

1. `api.js` unwrap `data`
2. `saveAdminSession(data)` luu `localStorage.user`
3. redirect sang `/admin.html`

## 10.2 Luong dang nhap user

FE:

1. `handleLogin()` thu admin login truoc
2. Neu admin tra 401, code moi fallback sang `authApi.userLogin(username, password)`
3. Chu y o FE:
   - o form dang nhap chi co 1 field `username`
   - khi dang nhap user, field nay duoc dung lam `phone`

Backend:

1. `AuthController.userLogin(...)` tai `AuthController.java:36`
2. `AuthService.userLogin(...)` tai `AuthService.java:50`
3. `CustomerRepository.findByPhone(phone)`
4. check password plain text
5. lay `status` va `remainingHours`
6. tu choi neu:
   - `status` la `UNACTIVE` hoac `INACTIVE`
   - `remainingHours <= 0`
7. tao JWT role `USER`
8. tra:

```json
{
  "token": "...",
  "customer": {
    "usersId": 1,
    "name": "Nguyen Minh Anh",
    "phone": "0911111111",
    "remainingHours": 5.00,
    "status": "ACTIVE",
    "role": "USER"
  }
}
```

FE sau response:

1. `saveUserSession(data)` luu `localStorage.user`
2. redirect sang `/user.html`

## 10.3 Luong dashboard admin

FE:

`admin.js:230 loadDashboard()` goi song song:

- `GET /api/sessions`
- `GET /api/customers`
- `GET /api/requests`
- `GET /api/payments`
- `GET /api/reports/transactions?month=YYYY-MM`

Sau do FE tu tinh:

- `statCheckin`: dem session `ONGOING`
- `statTotalUsers`: tong customer
- `statRevenue`: tong payment hom nay
- `statServices`: tong request hom nay
- `statVipMonth` va `statVipAllTime`: dem `leaderboard.*.items` co `isVipByHours`
- list khach dang o quan
- list request `PENDING`

DB duoc doc:

- Bang `Sessions`
- Bang `Users`
- Bang `Service_requests`
- Bang `Transactions`

Luu y:

- Dashboard khong goi endpoint `/api/reports`
- Dashboard chi dung `/api/reports/transactions`

## 10.4 Luong quan ly customer

### Doc danh sach customer

FE:

- `admin.js:473 loadCustomers()` -> `GET /api/customers`

Backend:

- `CustomerController.getAll()` -> `CustomerService.getAll()` -> `customerRepository.findAll()`
- Moi customer duoc map boi `CustomerService.toMap(...)`

### Tao customer

FE:

- `admin.js:670 saveCustomer()`
- Neu khong co `id`:

```json
POST /api/customers
{
  "name": "...",
  "phone": "...",
  "password": "123456"
}
```

Backend:

1. `CustomerController.create(...)`
2. `CustomerService.create(...)`
3. `existsByPhone(phone)` de tranh trung
4. Tao `Customer` moi:
   - `remainingHours = 0`
   - `status = ACTIVE`
   - `createdAt = now`
5. `customerRepository.save(customer)`

DB write:

- insert 1 dong vao `Users`

### Sua customer

FE:

- `admin.js:670 saveCustomer()`
- Neu co `id`:

```json
PUT /api/customers/{id}
{
  "name": "...",
  "phone": "...",
  "password": "... hoac rong",
  "status": "ACTIVE|UNACTIVE"
}
```

Backend:

1. `CustomerController.update(...)`
2. `CustomerService.update(...)`
3. Cap nhat field neu body khong null
4. Neu `status = INACTIVE` thi normalize thanh `UNACTIVE`
5. Neu `password` rong thi khong doi

DB write:

- update dong `Users`

Luu y:

- Service khong check duplicate phone khi update
- Loi unique neu trung phone se do DB/JPA nem ra

### Xoa customer

FE:

- `admin.js:649 deleteCustomer(id)` -> `DELETE /api/customers/{id}`

Backend:

- `CustomerService.delete(id)` kiem tra ton tai roi `deleteById`

DB write:

- delete dong `Users`

Can than:

- Neu DB dang co FK den session/request cua customer, hanh vi thuc te tuy vao schema generated va rang buoc FK

### Nap gio nhanh

FE:

- `admin.js:587 submitAddHours()`

Request:

```json
PATCH /api/customers/{id}/add-hours
{
  "hours": 5,
  "note": "Nap thu cong"
}
```

Backend:

1. `CustomerController.addHours(...)`
2. `CustomerService.addHours(...)`
3. Validate `hours > 0`
4. `customer.remainingHours = customer.remainingHours + hours`

DB write:

- update cot `Users.remaining_hours`

## 10.5 Luong check-in

### Tim khach de check-in

FE:

- `admin.js` bind nut `btnSearchCheckin` tai line 371
- FE goi `GET /api/customers`
- Sau do loc client-side theo:
  - ten bo dau
  - phone chi giu so
- Khong co endpoint search rieng cho check-in

### Thuc hien check-in

FE:

- `admin.js:424 doCheckIn(usersId)`
- request:

```json
POST /api/sessions/checkin
{
  "usersId": 1
}
```

Backend:

1. `CafeSessionController.checkIn(...)`
2. `CafeSessionService.checkIn(usersId)` tai line 46
3. Tim customer theo id
4. Chan neu:
   - customer khong ton tai
   - status bi khoa
   - `remainingHours <= 0`
   - da co session `ONGOING`
5. Tao `CafeSession` moi:
   - `customer = customer`
   - `checkIn = now`
   - `status = ONGOING`
6. save session

DB write:

- insert 1 dong vao `Sessions`

DB khong doi ngay:

- `Users.remaining_hours` chua bi tru luc check-in

## 10.6 Luong check-out

FE:

- `admin.js:450 doCheckOut(sessionId)`
- request:

```http
PUT /api/sessions/{sessionId}/checkout
```

Backend:

1. `CafeSessionController.checkOut(...)`
2. `CafeSessionService.checkOut(sessionId)` tai line 77
3. Tim session
4. Chan neu session da `COMPLETED`
5. Lay `now`
6. Set:
   - `checkOut = now`
   - `status = COMPLETED`
7. Tinh:
   - `minutes = Duration.between(checkIn, now).toMinutes()`
   - `hoursUsed = minutes / 60`, lam tron 2 so
8. Tru vao `customer.remainingHours`
9. Neu am thi cap ve 0
10. save customer
11. save session

DB write:

- update `Sessions.check_out`
- update `Sessions.hours_used`
- update `Sessions.status`
- update `Users.remaining_hours`

## 10.7 Auto check-out nen

File:

- `src/main/java/org/example/cowordptit/service/SessionMonitorService.java:30`

Cach chay:

- `@Scheduled(fixedRate = 60000)` -> moi 60 giay

Logic:

1. Lay tat ca session `ONGOING`
2. Tinh `hoursUsed` tu `checkIn -> now`
3. Tinh `remaining = customer.remainingHours - hoursUsed`
4. Neu `remaining <= 0`:
   - set `checkOut = now`
   - set `status = COMPLETED`
   - set `hoursUsed = customer.remainingHours`
   - set `customer.remainingHours = 0`
   - save customer va session

Y nghia:

- Session auto checkout khi user da dung het gio dang co

Luu y nghiep vu:

- O auto checkout, `session.hoursUsed` duoc set bang so gio con lai cua user truoc khi ve 0, khong phai dung bang tong thoi gian elapsed neu user ngoi qua han
- Nghia la he thong "cap tran" gio su dung bang gio con lai duoc phep

## 10.8 Luong user xem thong tin ca nhan

FE:

- `user-page.js:51 loadMyInfo()`
- goi `GET /api/customers/{usersId}`

Backend:

- `CustomerController.getById`
- `CustomerService.getById`
- `CustomerService.toMap`

FE render:

- `name`
- `phone`
- `remainingHours`
- `status`

Luu y:

- Sau khi nhan response, FE update lai `localStorage.user.remainingHours` va `status`

## 10.9 Luong user xem lich su phien

FE:

- `user-page.js:104 loadMySessions()`
- request `GET /api/sessions/customer/{usersId}`

Backend:

- `CafeSessionController.getByCustomer`
- `CafeSessionService.getSessionsByCustomer`
- `CafeSessionRepository.findByCustomer_UsersId`

FE:

- sort giam dan theo `checkIn`
- phan trang client-side

## 10.10 Luong user nap goi

### FE tai panel order

File:

- `user-page.js:169 loadOrderPanel()`

Trinh tu:

1. Goi `GET /api/sessions/customer/{usersId}` de tim session `ONGOING`
2. Lay `activeSessionId` tu session ongoing dau tien
3. Goi song song:
   - `GET /api/packages`
   - `GET /api/menu`
4. Cache vao:
   - `allPackages`
   - `allServices`

### User chon goi

- `renderPackagesList()` tao key cart kieu `pkg_<packagesId>`
- `changeQty(key, delta)` tang/giam quantity trong object `cart`
- `updateOrderSummary()` cong tong so luong va tong tien

### User gui yeu cau

FE:

- `user-page.js:413 submitOrder()`
- Vong lap qua tung item trong `cart`
- Neu la package:

```json
POST /api/requests
{
  "usersId": 1,
  "packagesId": 2,
  "quantity": 1
}
```

Rat quan trong:

- Du comment dau file noi "gop goi gio + do an/uong vao 1 yeu cau/nhom yeu cau"
- Nhung code thuc te khong tao 1 request gom nhieu item
- Moi item trong cart se sinh ra 1 `ServiceRequest` rieng

Backend:

1. `ServiceRequestController.create(...)`
2. `ServiceRequestService.create(...)` tai line 130
3. Tim customer
4. Tao `ServiceRequest`:
   - `customer`
   - `quantity`
   - `createdAt = now`
   - `status = PENDING`
5. Vi co `packagesId`, service tim `TimePackage`
6. set `timePackage`
7. `totalPrice = package.price * quantity`
8. save request

DB write:

- insert 1 dong vao `Service_requests`

Khi nay DB CHUA doi:

- `Users.remaining_hours` chua cong
- `Transactions` chua co dong nao

## 10.11 Luong user goi do an/uong

FE:

- `user-page.js:277 renderServiceList(type)` chi hien menu neu `activeSessionId` ton tai
- Neu khong co session ongoing, FE hien thong bao "can check-in de goi do an/uong"

Request tao order mon:

```json
POST /api/requests
{
  "usersId": 1,
  "sessionsId": 10,
  "servicesId": 2,
  "quantity": 2
}
```

Backend:

- Van di qua `ServiceRequestService.create(...)`
- Vi co `servicesId`, service:
  - tim `MenuIItem`
  - set `service`
  - `totalPrice = service.price * quantity`

DB write:

- insert 1 dong vao `Service_requests`

Luu y quan trong:

- Backend khong bat buoc `sessionsId` phai co khi order mon
- Quy tac "phai check-in moi order mon" hien tai la FE rule, khong phai backend rule

## 10.12 Luong admin xem va duyet request

### Tai danh sach request

FE:

- `admin.js:956 loadOrders()`
- request `GET /api/requests`
- FE sort giam dan theo `createdAt`
- FE filter client-side theo:
  - ALL
  - PENDING
  - PAID
  - CANCELLED

Luu y:

- Tab "PAID" trong FE thuc te gom ca `APPROVED` va `PAID`
- FE khong goi `/api/requests/pending`, du backend co endpoint nay

### Chi tiet request

FE:

- `admin.js:1099 openOrderDetailModal(id)`
- doc request trong `allOrdersCache`
- render:
  - customer
  - thoi gian gui
  - loai request
  - noi dung
  - so luong
  - tong tien
  - status

### Duyet request

FE:

- `admin.js:1157 approveOrder(id)`

Trinh tu FE:

1. `PATCH /api/requests/{id}/approve`
2. Neu response co `totalPrice > 0` thi goi tiep:

```json
POST /api/payments
{
  "serviceRequestsId": 99,
  "amount": 60000,
  "paymentMethod": "CASH"
}
```

Nghia la:

- Trong UI admin hien tai, approve = approve + auto tao payment cash ngay sau do
- Ve mat backend, approve va payment la 2 buoc tach roi

Backend approve:

1. `ServiceRequestController.approve`
2. `ServiceRequestService.approve(requestId)` tai line 168
3. Chan neu request khong o `PENDING`
4. Set `status = APPROVED`
5. Neu request la package:
   - `addHours = timePackage.hoursAmount * quantity`
   - cong vao `customer.remainingHours`
   - save customer
6. save request

DB write luc approve:

- update `Service_requests.status = APPROVED`
- neu la package thi update `Users.remaining_hours`

Backend create payment:

1. `PaymentController.create`
2. `PaymentService.create(...)` tai line 39
3. Tim service request
4. parse `paymentMethod`
5. Tao `PaymentRecord`
6. Set `serviceRequest.status = PAID`
7. save request
8. save payment

DB write luc payment:

- update `Service_requests.status = PAID`
- insert 1 dong vao `Transactions`

### Huy request

FE:

- `admin.js:1203 cancelOrder(id)` -> `PATCH /api/requests/{id}/cancel`

Backend:

- `ServiceRequestService.cancel(...)` tai line 192
- set `status = CANCELLED`

DB write:

- update `Service_requests.status = CANCELLED`

## 10.13 Luong reports

Current FE dung duy nhat endpoint:

- `GET /api/reports/transactions?month=YYYY-MM`

File backend:

- `ReportController.getTransactionReport(...)`
- `ReportService.getTransactionReport(...)` tai line 123

### Report backend tra ve nhung gi

Object report gom:

- `period`
- `summary`
- `serviceTrend`
- `vip`
- `leaderboard`
- `daily`
- `transactions`

### Cac ham quan trong cua `ReportService`

- `getReports(...)` line 54:
  - daily summary session revenue + service revenue + package revenue + new customer
  - endpoint nay hien tai FE admin khong dung
- `getTransactionReport(...)` line 123:
  - build bao cao giao dich theo thang/khoang ngay
- `buildCustomerVipMetrics(...)` line 237:
  - tinh `remainingHours`, `totalUsedHours`, `totalPurchasedHours`, `isVip`
- `buildLeaderboard(...)` line 284:
  - xep hang doanh thu theo customer
- `buildVipSummary(...)` line 378:
  - tong hop khach VIP theo nguong doanh thu
- `buildTransactions(...)` line 432:
  - tron payment that + request "legacy"
- `toTransactionMap(...)` line 507:
  - chuyen moi giao dich ve shape chung cho FE

### Cac nguon doanh thu trong report

1. Payment that:
   - doc tu bang `Transactions`
   - tao row id dang `P#<transactionsId>`
2. Legacy transaction:
   - doc tu bang `Service_requests`
   - chi lay request `APPROVED`/`PAID` ma chua co payment record
   - tao row id dang `R#<serviceRequestsId>`

Y nghia:

- Bao cao van tinh duoc cac request cu chua co `Transactions`
- FE co the thay `method = LEGACY`

### FE render report nhu the nao

File:

- `admin.js:1238 loadReports()`

Trinh tu:

1. Lay month tu input `reportMonthFilter`
2. Goi `/api/reports/transactions?month=...`
3. Build `vipByHoursMap` tu `leaderboard.allTime.items`
4. Chuan hoa `dailyRows`
5. Gan:
   - card tong doanh thu
   - tong giao dich
   - so ngay co doanh thu
   - VIP thang
   - VIP all time
6. `renderReportDailyTable()`
7. `renderReportDetailByDate(...)`
8. `renderRevenuePie(report.transactions, { viewMode, selectedDate })`
9. `renderRevenueLeaderboard(...)` cho 2 bang ranking

Luu y:

- FE hien tai khong dung `report.serviceTrend`, du backend co tra ve
- FE tu tinh pie chart truc tiep tu `report.transactions`

### Session revenue trong report

Can tach 2 endpoint:

- `/api/reports`:
  - co tinh `sessionRevenue = hoursUsed * 18000`
  - co `serviceRevenue`, `packageRevenue`, `newCustomers`
- `/api/reports/transactions`:
  - tap trung vao giao dich payment/request
  - dashboard va report screen hien tai dang dung endpoint nay

## 11. Bang mapping FE <-> BE <-> DB theo object

### 11.1 Customer object

FE dung:

- `admin.js`:
  - table customer
  - check-in search
  - dashboard active session lookup theo `allCustomersMap`
- `user-page.js`:
  - panel thong tin ca nhan

Field FE quan tam:

- `usersId`
- `name`
- `phone`
- `remainingHours`
- `status`
- `createdAt`
- `isVipByHours`
- `isVipByPurchasedHours`

Backend tao field nay o:

- `CustomerService.toMap(...)`

DB nguon:

- `Users.users_id`
- `Users.name`
- `Users.phone`
- `Users.remaining_hours`
- `Users.status`
- `Users.created_at`
- cong them gia tri tinh toan tu `Sessions`

### 11.2 Session object

FE dung:

- dashboard active sessions
- section check-in
- user lich su phien
- user xac dinh `activeSessionId`

Field:

- `sessionsId`
- `usersId`
- `customerName`
- `customerPhone`
- `checkIn`
- `checkOut`
- `hoursUsed`
- `status`

Nguon:

- `CafeSessionService.toMap(...)`

### 11.3 Service item object

FE dung:

- admin service cards
- user panel do uong/do an

Field:

- `servicesId`
- `name`
- `type`
- `price`
- `status`

Nguon:

- `MenuService.toMap(...)`

### 11.4 Package object

FE dung:

- admin package cards
- user panel goi nap

Field:

- `packagesId`
- `name`
- `hoursAmount`
- `price`
- `status`

Nguon:

- `PackageService.toMap(...)`

### 11.5 Request object

FE dung:

- dashboard pending list
- orders grid
- order detail modal

Field:

- `serviceRequestsId`
- `usersId`
- `customerName`
- `customerPhone`
- `sessionsId`
- `servicesId`
- `serviceName`
- `serviceType`
- `packagesId`
- `packageName`
- `packageHoursAmount`
- `quantity`
- `totalPrice`
- `status`
- `createdAt`

Nguon:

- `ServiceRequestService.toMap(...)`

### 11.6 Payment object

FE dung:

- dashboard tinh doanh thu hom nay

Field:

- `transactionsId`
- `serviceRequestsId`
- `amount`
- `paymentMethod`
- `createdAt`

Nguon:

- `PaymentService.toMap(...)`

### 11.7 Transaction report row

FE dung:

- report bang chi tiet giao dich
- report pie chart

Field:

- `id`
- `reqId`
- `amount`
- `method`
- `date`
- `usersId`
- `customerName`
- `customerPhone`
- `itemName`
- `itemType`
- `serviceCategory`
- `quantity`

Nguon:

- `ReportService.toTransactionMap(...)`

## 12. Bang mapping endpoint -> file -> DB

| Endpoint | FE goi tu dau | Controller -> Service | Bang bi doc/ghi |
| --- | --- | --- | --- |
| `POST /api/auth/admin` | `login-page.js` | `AuthController` -> `AuthService.adminLogin` | read `Admin` |
| `POST /api/auth/user` | `login-page.js` | `AuthController` -> `AuthService.userLogin` | read `Users` |
| `GET /api/customers` | `admin.js` | `CustomerController.getAll` -> `CustomerService.getAll` | read `Users`, read `Sessions` de tinh gio thuc |
| `GET /api/customers/{id}` | `user-page.js` | `CustomerController.getById` -> `CustomerService.getById` | read `Users`, read `Sessions` |
| `POST /api/customers` | `admin.js` | `CustomerController.create` -> `CustomerService.create` | insert `Users` |
| `PUT /api/customers/{id}` | `admin.js` | `CustomerController.update` -> `CustomerService.update` | update `Users` |
| `PATCH /api/customers/{id}/add-hours` | `admin.js` | `CustomerController.addHours` -> `CustomerService.addHours` | update `Users.remaining_hours` |
| `DELETE /api/customers/{id}` | `admin.js` | `CustomerController.delete` -> `CustomerService.delete` | delete `Users` |
| `GET /api/sessions` | `admin.js` | `CafeSessionController.getAll` -> `CafeSessionService.getAllSessions` | read `Sessions` |
| `GET /api/sessions/customer/{id}` | `user-page.js` | `CafeSessionController.getByCustomer` -> `CafeSessionService.getSessionsByCustomer` | read `Sessions` |
| `POST /api/sessions/checkin` | `admin.js` | `CafeSessionController.checkIn` -> `CafeSessionService.checkIn` | read `Users`, insert `Sessions` |
| `PUT /api/sessions/{id}/checkout` | `admin.js` | `CafeSessionController.checkOut` -> `CafeSessionService.checkOut` | update `Sessions`, update `Users` |
| `GET /api/menu` | `admin.js`, `user-page.js` | `MenuController.getAll` -> `MenuService.getAll` | read `Services` |
| `POST /api/menu` | `admin.js` | `MenuController.create` -> `MenuService.create` | insert `Services` |
| `PUT /api/menu/{id}` | `admin.js` | `MenuController.update` -> `MenuService.update` | update `Services` |
| `DELETE /api/menu/{id}` | `admin.js` | `MenuController.delete` -> `MenuService.delete` | delete `Services` |
| `GET /api/packages` | `admin.js`, `user-page.js` | `PackageController.getAll` -> `PackageService.getAll` | read `Packages` |
| `POST /api/packages` | `admin.js` | `PackageController.create` -> `PackageService.create` | insert `Packages` |
| `PUT /api/packages/{id}` | `admin.js` | `PackageController.update` -> `PackageService.update` | update `Packages` |
| `DELETE /api/packages/{id}` | `admin.js` | `PackageController.delete` -> `PackageService.delete` | delete `Packages` |
| `GET /api/requests` | `admin.js` | `ServiceRequestController.getAll` -> `ServiceRequestService.getAll` | read `Service_requests` + relation |
| `POST /api/requests` | `user-page.js` | `ServiceRequestController.create` -> `ServiceRequestService.create` | insert `Service_requests` |
| `PATCH /api/requests/{id}/approve` | `admin.js` | `ServiceRequestController.approve` -> `ServiceRequestService.approve` | update `Service_requests`, co the update `Users` |
| `PATCH /api/requests/{id}/cancel` | `admin.js` | `ServiceRequestController.cancel` -> `ServiceRequestService.cancel` | update `Service_requests` |
| `GET /api/payments` | `admin.js` dashboard | `PaymentController.getAll` -> `PaymentService.getAll` | read `Transactions` |
| `POST /api/payments` | `admin.js` approve flow | `PaymentController.create` -> `PaymentService.create` | insert `Transactions`, update `Service_requests` |
| `GET /api/reports/transactions` | `admin.js` reports | `ReportController.getTransactionReport` -> `ReportService.getTransactionReport` | read `Transactions`, `Service_requests`, `Users`, `Sessions` |

## 13. Luong doc code theo feature

Neu muon doc code "doc 1 feature tu UI toi DB", di theo thu tu nay:

### Dang nhap

1. `login.html`
2. `login-page.js:88 handleLogin`
3. `api.js:95 authApi`
4. `AuthController.java:29` va `:36`
5. `AuthService.java:29` va `:50`
6. `AdminRepository.java`, `CustomerRepository.java`
7. `JwtUtil.java`
8. Quay lai `login-page.js:60` va `:73`

### Check-in / Check-out

1. `admin.html` section `section-checkin`
2. `admin.js:325 loadCheckinSection`
3. `admin.js:371` search customer
4. `admin.js:424 doCheckIn`
5. `CafeSessionController.java:47`
6. `CafeSessionService.java:46`
7. `CafeSessionRepository.java`
8. `Customer.java`, `CafeSession.java`
9. `admin.js:450 doCheckOut`
10. `CafeSessionService.java:77`
11. `SessionMonitorService.java:30`

### Customer CRUD

1. `admin.html` section `section-customers`
2. `admin.js:473`, `:618`, `:670`, `:649`, `:587`
3. `CustomerController.java`
4. `CustomerService.java`
5. `CustomerRepository.java`
6. `Customer.java`

### Order package / order mon

1. `user.html`
2. `user-page.js:169 loadOrderPanel`
3. `user-page.js:251`, `:277`, `:388`, `:413`
4. `api.js:151 serviceRequestApi`
5. `ServiceRequestController.java:64`
6. `ServiceRequestService.java:130`
7. `ServiceRequest.java`
8. `admin.js:956`, `:1099`, `:1157`, `:1203`
9. `PaymentService.java:39`

### Reports

1. `admin.html` section `section-reports`
2. `admin.js:1238 loadReports`
3. `ReportController.java:34`
4. `ReportService.java:123`
5. `ReportService.java:432`
6. `admin.js:1338`, `:1510`, `:1561`

## 14. So do sequence nghiep vu quan trong

### 14.1 User mua goi gio

```text
user.html
  -> user-page.js submitOrder()
  -> POST /api/requests
  -> ServiceRequestController.create
  -> ServiceRequestService.create
  -> insert Service_requests(status=PENDING)
  -> admin.html / admin.js loadOrders()
  -> PATCH /api/requests/{id}/approve
  -> ServiceRequestService.approve
  -> update Service_requests(status=APPROVED)
  -> update Users.remaining_hours += package.hoursAmount * quantity
  -> POST /api/payments
  -> PaymentService.create
  -> insert Transactions
  -> update Service_requests(status=PAID)
```

### 14.2 User goi do an/uong

```text
admin check-in customer
  -> insert Sessions(status=ONGOING)
user-page.js loadOrderPanel()
  -> GET /api/sessions/customer/{id}
  -> activeSessionId = ongoing session
user submitOrder()
  -> POST /api/requests { servicesId, sessionsId, quantity }
  -> insert Service_requests(status=PENDING)
admin approveOrder()
  -> PATCH approve
  -> update Service_requests(status=APPROVED)
admin approveOrder() tiep
  -> POST /api/payments
  -> insert Transactions
  -> update Service_requests(status=PAID)
```

### 14.3 Chu trinh su dung gio

```text
admin check-in
  -> insert Sessions(ONGOING)
customer dang ngoi
  -> UI user thay remainingHours giam "ao" qua CustomerService.toMap
admin checkout hoac scheduler auto checkout
  -> update Sessions(COMPLETED, hours_used, check_out)
  -> update Users.remaining_hours
```

## 15. Cac diem de doc rat de nham neu khong biet truoc

1. `CustomerService.toMap(...)` co tinh toan lai `remainingHours` theo session dang mo. UI co the khac DB raw.
2. `approveOrder()` trong `admin.js` khong chi approve ma con auto tao payment `CASH`.
3. `user-page.js` ghi chu "gom yeu cau" nhung code thuc te gui moi item thanh 1 request rieng.
4. Rule "muon order mon thi phai check-in" hien tai la FE rule, backend khong khoa chat.
5. `getAvailable()` cho menu/package co ton tai nhung FE dang khong dung.
6. `status` cua menu/package co trong entity nhung UI admin hien tai gan nhu khong van hanh phan nay.
7. Tab "PAID" trong FE admin gom ca request `APPROVED` va `PAID`.
8. `/api/reports` va `/api/reports/transactions` la 2 bao cao khac nhau, dung cho muc dich khac nhau.
9. Cac file `app.js`, `dashboard.js`, `data.js`, ... de trong repo nhung khong phai luong chay hien tai.
10. Security cho role `USER` chua co ownership check cho 1 so endpoint doc theo id.

## 16. Checklist neu muon hieu "tung dong" file lon

### `admin.js`

Doc theo thu tu:

1. line 1-48: auth guard + navigation
2. line 50-69: bien cache toan trang
3. line 71-135: helper format/translate
4. line 138-221: modal chung
5. line 230-322: dashboard
6. line 325-469: check-in/check-out
7. line 473-722: customer CRUD + nap gio
8. line 725-843: menu CRUD
9. line 846-953: package CRUD
10. line 956-1235: requests/orders
11. line 1238-1676: reports
12. line 1678-1679: boot trang

### `user-page.js`

Doc theo thu tu:

1. line 1-24: init state
2. line 26-48: auth guard + boot
3. line 51-102: profile
4. line 104-162: lich su phien
5. line 164-447: panel order
6. line 447-478: helper/toast/skeleton

### `ReportService.java`

Doc theo thu tu:

1. `getReports()` line 54 - endpoint bao cao tong hop co session revenue
2. `getTransactionReport()` line 123 - endpoint report trang admin dang dung
3. `buildCustomerVipMetrics()` line 237 - cach tinh VIP theo gio
4. `buildLeaderboard()` line 284 - cach xep hang doanh thu
5. `buildVipSummary()` line 378 - VIP theo revenue threshold
6. `buildTransactions()` line 432 - nguon row giao dich
7. `toTransactionMap()` line 507 - shape du lieu tra cho FE

## 17. Van de va rui ro ky thuat nen ghi nho

### 17.1 Bao mat

- Password chua hash/verify bang encoder
- JWT secret hard-code
- DB credential hard-code
- CORS qua rong
- USER doc duoc endpoint theo id ma khong check owner

### 17.2 Nghiep vu

- Admin approve auto payment `CASH`, nghia la he thong mac dinh "duyet la thu tien ngay"
- Backend cho phep payment lap cho request
- Backend chua enforce chat "service request chi chon 1 trong service/package"
- Backend chua enforce chat "order mon phai co session dang mo"

### 17.3 Frontend

- Co nhieu file JS legacy de gay nhieu khi doc repo
- Trang user dung `/api/menu` va `/api/packages`, nen item disabled/out_of_stock van co the bi doc ra neu DB con giu

## 18. Ket luan doc nhanh

Neu chi can hieu he thong theo dung luong san pham dang chay, co the dong bo trong dau theo cau sau:

- Login tao JWT va luu vao `localStorage.user`
- Moi trang FE goi `api.js`, duoc unwrap response `data`
- Customer la trung tam cua gio con lai
- Session la noi tieu hao gio
- ServiceRequest la don vi order/goi nap
- Approve package se cong gio
- Payment se dong request thanh `PAID`
- Report trang admin doc tu `Transactions` + legacy `Service_requests`
- FE thuc te chi chay qua `login-page.js`, `admin.js`, `user-page.js`

Neu can doc tiep theo kieu "line-by-line", uu tien 5 file sau truoc:

1. `src/main/resources/static/js/api.js`
2. `src/main/resources/static/js/login-page.js`
3. `src/main/resources/static/js/user-page.js`
4. `src/main/resources/static/js/admin.js`
5. `src/main/java/org/example/cowordptit/service/ReportService.java`

