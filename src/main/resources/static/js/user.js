/**
 * user.js — Trang khách hàng (user.html)
 *
 * Flow:
 *  1. Kiểm tra session → nếu đã đăng nhập thì hiển thị dashboard
 *  2. Nếu chưa → hiển thị form đăng nhập
 *  3. Sau khi đăng nhập → hiển thị thông tin user + lịch sử booking + form đặt bàn mới
 *
 * API dùng: /api/auth/login, /api/bookings/user/:id, /api/tables/available, /api/bookings (POST)
 */

import { userLogin, getUserAuth, userLogout } from './auth.js';
import { bookingApi, tableApi } from './api.js';

// ===== DOM References =====
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('userLoginForm');
const loginErrorEl = document.getElementById('loginError');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const btnLogout = document.getElementById('btnLogout');
const welcomeName = document.getElementById('welcomeName');

// ===== Khởi tạo =====
async function init() {
  const userAuth = getUserAuth();
  if (userAuth) {
    showDashboard(userAuth);
  } else {
    showLoginSection();
  }
}

function showLoginSection() {
  if (loginSection) loginSection.style.display = 'block';
  if (dashboardSection) dashboardSection.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'none';
}

async function showDashboard(user) {
  if (loginSection) loginSection.style.display = 'none';
  if (dashboardSection) dashboardSection.style.display = 'block';
  if (btnLogout) btnLogout.style.display = 'inline-flex';
  if (welcomeName) welcomeName.textContent = user.fullName || user.username;

  await Promise.all([
    loadMyBookings(user.id),
    loadAvailableTables(),
  ]);
}

// ===== Đăng nhập =====
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const usernameVal = document.getElementById('userUsername')?.value.trim() ?? '';
  const passwordVal = document.getElementById('userPassword')?.value ?? '';

  if (!usernameVal || !passwordVal) {
    showError('Vui lòng nhập đầy đủ thông tin.');
    return;
  }

  // Hiển thị trạng thái loading trên nút
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn?.innerHTML;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  }

  const result = await userLogin(usernameVal, passwordVal);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }

  if (result.success) {
    hideError();
    showDashboard(result.user);
  } else {
    showError(result.message);
  }
});

function showError(msg) {
  if (loginErrorMsg) loginErrorMsg.textContent = msg;
  if (loginErrorEl) loginErrorEl.classList.add('visible');
}

function hideError() {
  if (loginErrorEl) loginErrorEl.classList.remove('visible');
}

// ===== Đăng xuất =====
btnLogout?.addEventListener('click', () => userLogout());

// ===== Load lịch sử booking =====
async function loadMyBookings(userId) {
  const container = document.getElementById('myBookingsList');
  if (!container) return;

  container.innerHTML = renderSkeleton();

  try {
    const bookings = await bookingApi.getByUserId(userId);

    if (!bookings || bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>Bạn chưa có lịch đặt bàn nào</p>
        </div>`;
      return;
    }

    container.innerHTML = bookings
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .map(b => renderBookingCard(b))
      .join('');

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state error-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Không thể tải lịch đặt bàn: ${err.message}</p>
      </div>`;
  }
}

function renderBookingCard(b) {
  const statusMap = {
    PENDING: { label: 'Chờ xác nhận', cls: 'warning' },
    CONFIRMED: { label: 'Đã xác nhận', cls: 'success' },
    IN_PROGRESS: { label: 'Đang dùng', cls: 'info' },
    COMPLETED: { label: 'Hoàn thành', cls: 'success' },
    CANCELLED: { label: 'Đã huỷ', cls: 'danger' },
  };
  const s = statusMap[b.status] || { label: b.status, cls: 'info' };
  const start = b.startTime ? new Date(b.startTime).toLocaleString('vi-VN') : '—';
  const end = b.endTime ? new Date(b.endTime).toLocaleString('vi-VN') : '—';
  const price = b.totalPrice
    ? Number(b.totalPrice).toLocaleString('vi-VN') + 'đ'
    : '—';

  return `
    <div class="booking-card">
      <div class="booking-card-header">
        <span class="booking-table"><i class="fa-solid fa-table"></i> Bàn ${b.tableNumber || '#' + b.tableId}</span>
        <span class="badge badge-${s.cls}">${s.label}</span>
      </div>
      <div class="booking-card-body">
        <div class="booking-info-row">
          <i class="fa-solid fa-clock"></i>
          <span>${start} → ${end}</span>
        </div>
        <div class="booking-info-row">
          <i class="fa-solid fa-money-bill-wave"></i>
          <span>${price}</span>
        </div>
        ${b.notes ? `<div class="booking-info-row"><i class="fa-solid fa-note-sticky"></i><span>${b.notes}</span></div>` : ''}
      </div>
    </div>`;
}

// ===== Load bàn có sẵn + Form đặt bàn =====
async function loadAvailableTables() {
  const select = document.getElementById('bookingTableId');
  if (!select) return;

  select.innerHTML = '<option value="">Đang tải bàn...</option>';
  select.disabled = true;

  try {
    const tables = await tableApi.getAvailable();

    if (!tables || tables.length === 0) {
      select.innerHTML = '<option value="">Hiện không có bàn trống</option>';
      return;
    }

    select.innerHTML = '<option value="">— Chọn bàn —</option>' +
      tables.map(t =>
        `<option value="${t.id}">Bàn ${t.tableNumber} (${t.capacity} người) — ${t.location || ''}</option>`
      ).join('');
    select.disabled = false;

  } catch (err) {
    select.innerHTML = `<option value="">Lỗi: ${err.message}</option>`;
  }
}

// ===== Submit đặt bàn =====
const bookingForm = document.getElementById('bookingForm');
bookingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userAuth = getUserAuth();
  if (!userAuth) {
    alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    userLogout();
    return;
  }

  const tableId = document.getElementById('bookingTableId')?.value;
  const startTime = document.getElementById('bookingStart')?.value;
  const endTime = document.getElementById('bookingEnd')?.value;
  const notes = document.getElementById('bookingNotes')?.value?.trim() ?? '';

  if (!tableId || !startTime || !endTime) {
    showBookingError('Vui lòng điền đầy đủ thông tin đặt bàn.');
    return;
  }

  if (new Date(endTime) <= new Date(startTime)) {
    showBookingError('Thời gian kết thúc phải sau thời gian bắt đầu.');
    return;
  }

  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  const originalText = submitBtn?.innerHTML;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
  }

  try {
    await bookingApi.create({
      userId: userAuth.id,
      tableId: Number(tableId),
      startTime: startTime,
      endTime: endTime,
      notes: notes,
    });

    showBookingSuccess();
    bookingForm.reset();
    document.getElementById('bookingTableId').disabled = true;
    // Reload lại bàn và booking
    await Promise.all([loadMyBookings(userAuth.id), loadAvailableTables()]);

  } catch (err) {
    showBookingError('Đặt bàn thất bại: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
});

function showBookingError(msg) {
  const el = document.getElementById('bookingError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  document.getElementById('bookingSuccess')?.style && (document.getElementById('bookingSuccess').style.display = 'none');
}

function showBookingSuccess() {
  const el = document.getElementById('bookingSuccess');
  if (el) el.style.display = 'block';
  document.getElementById('bookingError')?.style && (document.getElementById('bookingError').style.display = 'none');
  setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}

function renderSkeleton() {
  return Array(3).fill(0).map(() => `
    <div class="booking-card skeleton">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line narrow"></div>
    </div>`).join('');
}

// ===== Khởi động =====
init();
