/**
 * user-page.js — Trang khách hàng (user.html)
 * Form đặt hàng duy nhất: gộp gói giờ + đồ ăn/uống vào 1 yêu cầu/nhóm yêu cầu
 */

import { customerApi, menuApi, packageApi, serviceRequestApi, sessionApi } from './api.js';
const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
const pathMatch = window.location.pathname.match(/^\/app\/users\/(\d+)$/);
const targetUserId = pathMatch ? Number(pathMatch[1]) : Number(currentUser.usersId);

// ===== DOM =====
const welcomeName = document.getElementById('welcomeName');
const dashboardSection = document.getElementById('dashboardSection');
const btnLogout = document.getElementById('btnLogout');
const PAGE_SIZE = {
  sessions: 5,
  items: 8,
};

let currentTab = 'sessions';
let sessionsCache = [];
let currentSessionPage = 1;
let currentPackagePage = 1;
let currentDrinkPage = 1;
let currentFoodPage = 1;

// ===== Khởi tạo =====
function init() {
  if (dashboardSection) dashboardSection.style.display = 'block';
  if (btnLogout) btnLogout.style.display = 'inline-flex';
  if (welcomeName) welcomeName.textContent = currentUser.name || 'Khách';

  bindMainTabs();
  loadMyInfo();
  loadMySessions();
  loadOrderPanel();
}

// ===== Đăng xuất =====
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  });
}

// ===== Thông tin tài khoản =====
async function loadMyInfo() {
  if (!targetUserId) return;
  const panel = document.getElementById('userInfoPanel');

  try {
    const data = await customerApi.getById(targetUserId);
    localStorage.setItem('user', JSON.stringify({ ...currentUser, remainingHours: data.remainingHours, status: data.status }));
    renderUserInfo(data);
  } catch (e) {
    if (e.status === 404) {
      if (panel) panel.innerHTML = `<p style="color:#b91c1c">Khong tim thay user ID ${targetUserId}.</p>`;
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
    <div class="user-info-grid">
      <div class="user-info-item">
        <div class="user-info-label">Họ tên</div>
        <div class="user-info-value">${data.name}</div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label">Điện thoại</div>
        <div class="user-info-value">${data.phone}</div>
      </div>
      <div class="user-info-item user-info-hours">
        <div class="user-info-label">Giờ còn lại</div>
        <div class="user-hours-value">${Number(data.remainingHours).toFixed(2)}<span>h</span></div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label">Trạng thái</div>
        <span class="badge ${s.cls}">${s.label}</span>
      </div>
    </div>`;
}

// ===== Lịch sử phiên =====
async function loadMySessions() {
  const container = document.getElementById('myBookingsList');
  if (!container || !targetUserId) return;
  container.innerHTML = renderSkeleton();

  try {
    const sessions = await sessionApi.getByCustomer(targetUserId);
    sessionsCache = (sessions || []).sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    currentSessionPage = 1;
    renderSessionList();
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${e.message}</p></div>`;
  }
}

function renderSessionList() {
  const container = document.getElementById('myBookingsList');
  const pagination = document.getElementById('sessionsPagination');
  if (!container || !pagination) return;

  if (sessionsCache.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Bạn chưa có phiên nào</p></div>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(sessionsCache.length / PAGE_SIZE.sessions));
  currentSessionPage = Math.max(1, Math.min(currentSessionPage, totalPages));
  const start = (currentSessionPage - 1) * PAGE_SIZE.sessions;
  const pageRows = sessionsCache.slice(start, start + PAGE_SIZE.sessions);

  container.innerHTML = pageRows.map(renderSessionCard).join('');
  renderPagination(pagination, totalPages, currentSessionPage, 'gotoSessionPage');
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
const cart = {};

async function loadOrderPanel() {
  if (!targetUserId) return;

  try {
    const sessions = await sessionApi.getByCustomer(targetUserId);
    const ongoing = sessions.find((s) => s.status === 'ONGOING');
    activeSessionId = ongoing ? ongoing.sessionsId : null;

    const [packages, services] = await Promise.all([
      packageApi.getAll(),
      menuApi.getAll(),
    ]);
    allPackages = packages || [];
    allServices = services || [];

    currentPackagePage = 1;
    currentDrinkPage = 1;
    currentFoodPage = 1;

    renderCurrentTab();
    updateOrderSummary();
  } catch (e) {
    const targets = ['orderPackagesList', 'orderDrinksList', 'orderFoodsList'];
    targets.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Không thể tải: ${e.message}</p></div>`;
    });
  }
}

function bindMainTabs() {
  const tabs = document.querySelectorAll('.user-main-tab-btn[data-tab]');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      switchMainTab(tab);
    });
  });
  switchMainTab('sessions');
}

function switchMainTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.user-main-tab-btn[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const panelIds = ['sessions', 'packages', 'drinks', 'foods'];
  panelIds.forEach((panel) => {
    const el = document.getElementById(`tabPanel-${panel}`);
    if (!el) return;
    el.style.display = panel === tab ? '' : 'none';
  });

  const orderFooter = document.getElementById('orderFooter');
  if (orderFooter) {
    orderFooter.style.display = tab === 'sessions' ? 'none' : 'flex';
  }

  renderCurrentTab();
}

function renderCurrentTab() {
  if (currentTab === 'sessions') {
    renderSessionList();
    return;
  }

  if (currentTab === 'packages') {
    renderPackagesList();
    return;
  }

  if (currentTab === 'drinks') {
    renderServiceList('DRINK');
    return;
  }

  renderServiceList('FOOD');
}

function renderPackagesList() {
  const container = document.getElementById('orderPackagesList');
  const pagination = document.getElementById('packagesPagination');
  if (!container || !pagination) return;

  if (allPackages.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>Chưa có gói nạp nào.</p></div>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(allPackages.length / PAGE_SIZE.items));
  currentPackagePage = Math.max(1, Math.min(currentPackagePage, totalPages));
  const start = (currentPackagePage - 1) * PAGE_SIZE.items;
  const rows = allPackages.slice(start, start + PAGE_SIZE.items);

  container.innerHTML = rows.map((p) => renderOrderItemCard({
    key: `pkg_${p.packagesId}`,
    name: p.name,
    price: p.price,
    subtitle: `${p.hoursAmount}h`,
  })).join('');

  renderPagination(pagination, totalPages, currentPackagePage, 'gotoPackagesPage');
}

function renderServiceList(type) {
  const isDrink = type === 'DRINK';
  const container = document.getElementById(isDrink ? 'orderDrinksList' : 'orderFoodsList');
  const pagination = document.getElementById(isDrink ? 'drinksPagination' : 'foodsPagination');
  if (!container || !pagination) return;

  if (!activeSessionId) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Bạn cần check-in để gọi đồ ăn/uống.</p></div>';
    pagination.innerHTML = '';
    return;
  }

  const rows = allServices.filter((s) => s.type === type);
  if (rows.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid ${isDrink ? 'fa-mug-saucer' : 'fa-burger'}"></i><p>Chưa có ${isDrink ? 'đồ uống' : 'đồ ăn'} trong menu.</p></div>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE.items));
  if (isDrink) currentDrinkPage = Math.max(1, Math.min(currentDrinkPage, totalPages));
  else currentFoodPage = Math.max(1, Math.min(currentFoodPage, totalPages));

  const currentPage = isDrink ? currentDrinkPage : currentFoodPage;
  const start = (currentPage - 1) * PAGE_SIZE.items;
  const pageRows = rows.slice(start, start + PAGE_SIZE.items);

  container.innerHTML = pageRows.map((m) => renderOrderItemCard({
    key: `svc_${m.servicesId}`,
    name: m.name,
    price: m.price,
    subtitle: isDrink ? 'Đồ uống' : 'Đồ ăn',
  })).join('');

  renderPagination(pagination, totalPages, currentPage, isDrink ? 'gotoDrinksPage' : 'gotoFoodsPage');
}

function renderOrderItemCard({ key, name, price, subtitle }) {
  return `
    <div class="order-item-card">
      <input type="hidden" id="hiddenPrice-${key}" value="${Number(price) || 0}">
      <div class="order-item-name">${name}</div>
      <div class="order-item-price">${formatCurrency(price)}</div>
      <div class="order-item-sub">${subtitle}</div>
      ${renderQtyRow(key)}
    </div>`;
}

function renderQtyRow(key) {
  const qty = cart[key] || 0;
  return `
    <div class="qty-row">
      <button onclick="changeQty('${key}',-1)" class="qty-btn">−</button>
      <span id="qty-${key}" class="qty-value">${qty}</span>
      <button onclick="changeQty('${key}',1)" class="qty-btn">+</button>
    </div>`;
}

function renderPagination(container, totalPages, currentPage, gotoFnName) {
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`<button class="list-page-btn ${page === currentPage ? 'active' : ''}" onclick="${gotoFnName}(${page})">${page}</button>`);
  }

  container.innerHTML = `
    <button class="list-page-btn" onclick="${gotoFnName}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pages.join('')}
    <button class="list-page-btn" onclick="${gotoFnName}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

window.gotoSessionPage = function (page) {
  const totalPages = Math.max(1, Math.ceil(sessionsCache.length / PAGE_SIZE.sessions));
  currentSessionPage = Math.max(1, Math.min(page, totalPages));
  renderSessionList();
};

window.gotoPackagesPage = function (page) {
  const totalPages = Math.max(1, Math.ceil(allPackages.length / PAGE_SIZE.items));
  currentPackagePage = Math.max(1, Math.min(page, totalPages));
  renderPackagesList();
};

window.gotoDrinksPage = function (page) {
  const totalPages = Math.max(1, Math.ceil(allServices.filter((s) => s.type === 'DRINK').length / PAGE_SIZE.items));
  currentDrinkPage = Math.max(1, Math.min(page, totalPages));
  renderServiceList('DRINK');
};

window.gotoFoodsPage = function (page) {
  const totalPages = Math.max(1, Math.ceil(allServices.filter((s) => s.type === 'FOOD').length / PAGE_SIZE.items));
  currentFoodPage = Math.max(1, Math.min(page, totalPages));
  renderServiceList('FOOD');
};

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
    const hiddenPrice = Number(document.getElementById(`hiddenPrice-${key}`)?.value ?? 0);
    const body = { usersId: targetUserId, quantity };
    const safePrice = Number.isFinite(hiddenPrice) ? hiddenPrice : 0;
    body.price = safePrice;
    body.unitPrice = safePrice;
    body.hiddenPrice = safePrice;
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
