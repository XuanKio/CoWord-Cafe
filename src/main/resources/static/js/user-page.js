/**
 * user-page.js — Trang khách hàng (user.html)
 * Form đặt hàng duy nhất: gộp gói giờ + đồ ăn/uống vào 1 yêu cầu/nhóm yêu cầu
 */

import { customerApi, menuApi, packageApi, serviceRequestApi, sessionApi } from './api.js';
const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

// ===== DOM =====
const welcomeName = document.getElementById('welcomeName');
const dashboardSection = document.getElementById('dashboardSection');
const btnLogout = document.getElementById('btnLogout');

// ===== Khởi tạo =====
function init() {
  if (!currentUser.token || currentUser.role !== 'USER') {
    window.location.href = '/login';
    return;
  }

  if (dashboardSection) dashboardSection.style.display = 'block';
  if (btnLogout) btnLogout.style.display = 'inline-flex';
  if (welcomeName) welcomeName.textContent = currentUser.name || 'Khách';

  loadMyInfo();
  loadMySessions();
  loadOrderPanel();   // gộp gói + dịch vụ
}

// ===== Đăng xuất =====
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  });
}

// ===== Thông tin tài khoản =====
async function loadMyInfo() {
  if (!currentUser.usersId) return;
  const panel = document.getElementById('userInfoPanel');

  try {
    const data = await customerApi.getById(currentUser.usersId);
    localStorage.setItem('user', JSON.stringify({ ...currentUser, remainingHours: data.remainingHours, status: data.status }));
    renderUserInfo(data);
  } catch (e) {
    if (e.status === 404) {
      if (panel) panel.innerHTML = '<p style="color:#b91c1c">Tai khoan khong tim thay. Dang dang xuat...</p>';
      setTimeout(() => { localStorage.removeItem('user'); window.location.href = '/login'; }, 2500);
      return;
    }
    console.error('Lỗi tải thông tin:', e);
    if (panel) panel.innerHTML = '<p style="color:#92400e">⚠️ Không thể tải thông tin tài khoản.</p>';
  }
}

function renderUserInfo(data) {
  const statusMap = {
    ACTIVE: { label: 'Hoạt động', cls: 'badge-success' },
    UNACTIVE: { label: 'Tài khoản bị khóa', cls: 'badge-danger' },
    INACTIVE: { label: 'Tài khoản bị khóa', cls: 'badge-danger' },
    IN_SESSION: { label: 'Đang trong phiên', cls: 'badge-info' },
    OUT_OF_HOURS: { label: 'Hết giờ', cls: 'badge-warning' },
  };
  const s = statusMap[data.status] || { label: data.status, cls: 'badge-info' };

  const panel = document.getElementById('userInfoPanel');
  if (!panel) return;
  panel.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center">
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Họ tên</div>
        <div style="font-weight:700">${data.name}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Điện thoại</div>
        <div style="font-weight:600">${data.phone}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Giờ còn lại</div>
        <div style="font-weight:800;font-size:22px;color:var(--primary-color)">${Number(data.remainingHours).toFixed(2)}<span style="font-size:14px;font-weight:400">h</span></div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Trạng thái</div>
        <span class="badge ${s.cls}">${s.label}</span>
      </div>
    </div>`;
}

// ===== Lịch sử phiên =====
async function loadMySessions() {
  const container = document.getElementById('myBookingsList');
  if (!container || !currentUser.usersId) return;
  container.innerHTML = renderSkeleton();

  try {
    const sessions = await sessionApi.getByCustomer(currentUser.usersId);

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Bạn chưa có phiên nào</p></div>';
      return;
    }
    sessions.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    container.innerHTML = sessions.map(renderSessionCard).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${e.message}</p></div>`;
  }
}

function renderSessionCard(s) {
  const statusMap = {
    ONGOING: { label: 'Đang ngồi', cls: 'badge-info' },
    COMPLETED: { label: 'Đã xong', cls: 'badge-success' },
  };
  const st = statusMap[s.status] || { label: s.status, cls: 'badge-warning' };
  const checkIn = s.checkIn ? new Date(s.checkIn).toLocaleString('vi-VN') : '—';
  const checkOut = s.checkOut ? new Date(s.checkOut).toLocaleString('vi-VN') : 'Chưa ra';
  const hours = s.hoursUsed != null ? Number(s.hoursUsed).toFixed(2) + 'h' : '—';

  return `
    <div class="booking-card">
      <div class="booking-card-header">
        <span class="booking-table"><i class="fa-solid fa-laptop"></i> Phiên #${s.sessionsId}</span>
        <span class="badge ${st.cls}">${st.label}</span>
      </div>
      <div class="booking-card-body">
        <div class="booking-info-row"><i class="fa-solid fa-arrow-right-to-bracket"></i><span>Vào: ${checkIn}</span></div>
        <div class="booking-info-row"><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Ra: ${checkOut}</span></div>
        <div class="booking-info-row"><i class="fa-solid fa-clock"></i><span>Đã dùng: ${hours}</span></div>
      </div>
    </div>`;
}

// ===== PANEL ĐẶT HÀNG CHUNG (gói + dịch vụ) =====
let allPackages = [];
let allServices = [];
let activeSessionId = null;
const cart = {};   // key: "pkg_<id>" hoặc "svc_<id>", value: số lượng

async function loadOrderPanel() {
  const panel = document.getElementById('orderPanel');
  if (!panel || !currentUser.usersId) return;
  panel.innerHTML = '<div style="color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';

  try {
    // Lấy session đang active
    const sessions = await sessionApi.getByCustomer(currentUser.usersId);
    const ongoing = sessions.find(s => s.status === 'ONGOING');
    activeSessionId = ongoing ? ongoing.sessionsId : null;

    // Gói giờ + dịch vụ song song
    const [packages, services] = await Promise.all([
      packageApi.getAll(),
      menuApi.getAll()
    ]);
    allPackages = packages;
    allServices = services;

    renderOrderPanel(panel);
  } catch (e) {
    panel.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Không thể tải: ${e.message}</p></div>`;
  }
}

function renderOrderPanel(panel) {
  const noteHtml = activeSessionId
    ? ''
    : `<div class="alert alert-error" style="display:flex;margin-bottom:16px">
         <i class="fa-solid fa-circle-exclamation"></i>
         Bạn chưa check-in — chỉ có thể đặt gói giờ khi chưa ngồi, hoặc nhờ nhân viên check-in để gọi đồ.
       </div>`;

  // --- Gói giờ ---
  const pkgHtml = allPackages.length === 0 ? ''
    : `<div style="margin-bottom:20px">
         <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Gói giờ</div>
         <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">
           ${allPackages.map(p => `
             <div style="border:1px solid var(--border-color);border-radius:10px;padding:14px;background:var(--bg-color)">
               <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.name}</div>
               <div style="font-weight:800;color:var(--primary-color);font-size:16px;margin-bottom:2px">${formatCurrency(p.price)}</div>
               <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${p.hoursAmount}h</div>
               ${renderQtyRow('pkg_' + p.packagesId)}
             </div>
           `).join('')}
         </div>
       </div>`;

  // --- Dịch vụ (chỉ hiện khi đang trong phiên) ---
  const drinks = allServices.filter(m => m.type === 'DRINK');
  const foods = allServices.filter(m => m.type === 'FOOD');
  const svcHtml = (!activeSessionId || allServices.length === 0) ? ''
    : `<div>
         <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Đồ ăn / uống</div>
         ${drinks.length ? renderMenuGroup('fa-mug-saucer', 'Đồ uống', drinks) : ''}
         ${foods.length ? renderMenuGroup('fa-burger', 'Đồ ăn', foods) : ''}
       </div>`;

  panel.innerHTML = `
    ${noteHtml}
    ${pkgHtml}
    ${svcHtml || (activeSessionId && allServices.length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Chưa có món nào trong menu.</p>' : '')}
    <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div id="orderTotal" style="font-size:14px;color:var(--text-muted)">Chưa chọn gì</div>
      <button id="btnSubmitOrder" class="btn-primary" onclick="submitOrder()" disabled>
        <i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu
      </button>
    </div>`;
}

function renderMenuGroup(icon, label, items) {
  return `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px"><i class="fa-solid ${icon}"></i> ${label}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${items.map(m => `
          <div style="border:1px solid var(--border-color);border-radius:8px;padding:12px;background:var(--bg-color)">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${m.name}</div>
            <div style="font-weight:700;color:var(--primary-color);font-size:13px;margin-bottom:8px">${formatCurrency(m.price)}</div>
            ${renderQtyRow('svc_' + m.servicesId)}
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderQtyRow(key) {
  const qty = cart[key] || 0;
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <button onclick="changeQty('${key}',-1)" style="width:26px;height:26px;border:1px solid #ccc;border-radius:6px;background:#fff;font-size:15px;cursor:pointer;line-height:1">−</button>
      <span id="qty-${key}" style="min-width:18px;text-align:center;font-weight:700;font-size:14px">${qty}</span>
      <button onclick="changeQty('${key}',1)"  style="width:26px;height:26px;border:1px solid #ccc;border-radius:6px;background:#fff;font-size:15px;cursor:pointer;line-height:1">+</button>
    </div>`;
}

window.changeQty = function (key, delta) {
  if (!cart[key]) cart[key] = 0;
  cart[key] = Math.max(0, cart[key] + delta);
  const el = document.getElementById('qty-' + key);
  if (el) el.textContent = cart[key];
  updateOrderSummary();
};

function updateOrderSummary() {
  const btn = document.getElementById('btnSubmitOrder');
  const total = document.getElementById('orderTotal');
  let totalItems = 0, totalPrice = 0;

  for (const [key, qty] of Object.entries(cart)) {
    if (qty <= 0) continue;
    totalItems += qty;
    if (key.startsWith('pkg_')) {
      const id = parseInt(key.slice(4));
      const pkg = allPackages.find(p => p.packagesId === id);
      if (pkg) totalPrice += Number(pkg.price) * qty;
    } else {
      const id = parseInt(key.slice(4));
      const svc = allServices.find(s => s.servicesId === id);
      if (svc) totalPrice += Number(svc.price) * qty;
    }
  }

  if (total) total.textContent = totalItems > 0
    ? `${totalItems} món — ${formatCurrency(totalPrice)}`
    : 'Chưa chọn gì';
  if (btn) btn.disabled = totalItems === 0;
}

window.submitOrder = async function () {
  const items = Object.entries(cart).filter(([, qty]) => qty > 0);
  if (items.length === 0) return;

  const btn = document.getElementById('btnSubmitOrder');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }

  let ok = 0, fail = 0;
  for (const [key, quantity] of items) {
    const isPkg = key.startsWith('pkg_');
    const id = parseInt(key.slice(4));
    const body = { usersId: currentUser.usersId, quantity };
    if (isPkg) body.packagesId = id;
    else { body.servicesId = id; if (activeSessionId) body.sessionsId = activeSessionId; }

    try {
      await serviceRequestApi.create(body);
      ok++;
    } catch { fail++; }
  }

  // Reset
  for (const key of Object.keys(cart)) {
    cart[key] = 0;
    const el = document.getElementById('qty-' + key);
    if (el) el.textContent = '0';
  }
  updateOrderSummary();

  if (ok > 0) showToast(`✅ Gửi ${ok} yêu cầu thành công. Chờ nhân viên xác nhận.`, 'success');
  if (fail > 0) showToast(`❌ ${fail} yêu cầu gửi thất bại.`, 'error');
};

// ===== Utilities =====
function formatCurrency(amount) {
  if (amount == null) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function showToast(msg, type = 'info') {
  const existing = document.getElementById('userToast');
  if (existing) existing.remove();
  const colors = { success: '#166534', error: '#991b1b', warning: '#92400e', info: '#1e40af' };
  const bg = { success: '#dcfce7', error: '#fee2e2', warning: '#fef9c3', info: '#dbeafe' };
  const toast = document.createElement('div');
  toast.id = 'userToast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${bg[type]};color:${colors[type]};
    border:1px solid currentColor;
    padding:12px 18px;border-radius:10px;
    box-shadow:0 4px 16px rgba(0,0,0,0.1);
    font-size:14px;font-weight:500;max-width:360px;`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function renderSkeleton() {
  return Array(2).fill(0).map(() => `
    <div class="booking-card skeleton">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
    </div>`).join('');
}

init();
