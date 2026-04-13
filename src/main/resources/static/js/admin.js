import { apiRequest } from './api.js';

// Auth check — chỉ ADMIN mới được vào
const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
if (currentUser.role !== 'ADMIN' || !currentUser.token) {
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

document.getElementById('adminName').textContent = currentUser.username || currentUser.name || 'Admin';

// Navigation
document.querySelectorAll('.menu-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;
    showSection(sectionId);
  });
});

function showSection(sectionId) {
  // Update nav items
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

  // Show section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${sectionId}`)?.classList.add('active');

  const titles = {
    dashboard: 'Tổng quan hệ thống',
    customers: 'Quản lý Khách hàng',
    checkin: 'Check-in & Check-out',
    services: 'Quản lý Dịch vụ (Đồ ăn/Nước)',
    packages: 'Cấu hình Gói giờ',
    orders: 'Quản lý Yêu cầu (Orders)',
    reports: 'Báo cáo Doanh thu & Giao dịch'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'Quản trị';

  // Load data
  if (sectionId === 'dashboard') loadDashboard();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'checkin') loadCheckinSection();
  if (sectionId === 'services') loadServices();
  if (sectionId === 'packages') loadPackages();
  if (sectionId === 'orders') loadOrders();
  if (sectionId === 'reports') loadReports();
}

// Global caching mappings
let allCustomersMap = {};
let allCustomersCache = [];
let customerSearchQuery = '';
let currentCustomerPage = 1;
const CUSTOMERS_PAGE_SIZE = 10;
let reportDailyCache = [];
let currentReportDailyPage = 1;
let currentReportDetailPage = 1;
let currentReportSelectedDate = null;
const REPORT_DAILY_PAGE_SIZE = 10;
const REPORT_DETAIL_PAGE_SIZE = 8;
let allServicesMap = {};
let allPackagesMap = {};
let allOrdersCache = [];
let currentOrderFilter = 'ALL';
let currentOrderPage = 1;
const ORDERS_PAGE_SIZE = 8;
let currentOrderModalId = null;

// ===== UTILITIES =====
function formatCurrency(amount) {
  if (amount == null) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function customerDisplayName(customerLike) {
  const name = customerLike?.name || customerLike?.customerName || 'N/A';
  const isVip = Boolean(customerLike?.isVipByPurchasedHours || customerLike?.isVipByHours);
  return isVip
    ? `${name} <i class="fa-solid fa-star vip-star" title="Khách VIP"></i>`
    : name;
}

function trans(text) {
  const dict = {
    'ACTIVE': 'Hoạt động',
    'UNACTIVE': 'Bị khóa',
    'INACTIVE': 'Bị khóa',
    'IN_SESSION': 'Đang trong phiên',
    'OUT_OF_HOURS': 'Hết giờ',
    'ONGOING': 'Đang dùng',
    'COMPLETED': 'Đã xong',
    'PENDING': 'Chờ duyệt',
    'APPROVED': 'Đã duyệt',
    'PAID': 'Đã thanh toán',
    'CANCELLED': 'Đã hủy',
    'SERVICE': 'Dịch vụ',
    'PACKAGE': 'Gói giờ',
    'OTHER': 'Khác',
    'DRINK': 'Đồ uống',
    'FOOD': 'Đồ ăn',
    'CASH': 'Tiền mặt',
    'BANK': 'Chuyển khoản',
    'MOMO': 'Momo',
    'LEGACY': 'Hồ sơ cũ'
  };
  return dict[text] || text;
}


// Modals
window.closeModal = function (modalId) {
  document.getElementById(modalId).classList.remove('show');
  document.getElementById(modalId).classList.add('hidden');
};

window.openModal = function (modalId) {
  document.getElementById(modalId).classList.remove('hidden');
  document.getElementById(modalId).classList.add('show');
};

let actionModalHandler = null;
let actionModalBound = false;

function initActionModal() {
  if (actionModalBound) return;

  const overlay = document.getElementById('actionModalOverlay');
  const confirmBtn = document.getElementById('actionModalConfirmBtn');
  if (!overlay || !confirmBtn) return;

  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'actionModalOverlay') closeActionModal();
  });

  confirmBtn.addEventListener('click', async () => {
    if (!actionModalHandler) {
      closeActionModal();
      return;
    }

    const currentLabel = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    try {
      await actionModalHandler();
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = currentLabel;
    }
  });

  actionModalBound = true;
}

function openActionModal({ title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', hideCancel = false, confirmClass = 'btn-primary', onConfirm = null }) {
  initActionModal();
  const overlay = document.getElementById('actionModalOverlay');
  const titleEl = document.getElementById('actionModalTitle');
  const messageEl = document.getElementById('actionModalMessage');
  const confirmBtn = document.getElementById('actionModalConfirmBtn');
  const cancelBtn = document.getElementById('actionModalCancelBtn');
  if (!overlay || !titleEl || !messageEl || !confirmBtn || !cancelBtn) return;

  titleEl.textContent = title || 'Xác nhận thao tác';
  messageEl.textContent = message || '';
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  confirmBtn.className = confirmClass;
  cancelBtn.style.display = hideCancel ? 'none' : 'inline-flex';

  actionModalHandler = typeof onConfirm === 'function' ? onConfirm : null;
  overlay.classList.remove('hidden');
  overlay.classList.add('show');
}

function showInfoModal(title, message) {
  openActionModal({
    title,
    message,
    confirmText: 'Đóng',
    hideCancel: true,
    onConfirm: () => closeActionModal()
  });
}

window.closeActionModal = function () {
  actionModalHandler = null;
  const overlay = document.getElementById('actionModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  overlay.classList.add('hidden');
};

window.logout = function () {
  localStorage.removeItem('user');
  window.location.href = '/login.html';
};


// ===== DASHBOARD =====
window.loadDashboard = async function () {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [sessions, customers, requests, payments, reportData] = await Promise.all([
      apiRequest('/sessions'),
      apiRequest('/customers'),
      apiRequest('/requests'),
      apiRequest('/payments'),
      apiRequest(`/reports/transactions?month=${encodeURIComponent(currentMonth)}`)
    ]);

    customers.forEach(c => allCustomersMap[c.usersId] = c);

    // Stats calculation
    const activeSessions = sessions.filter(s => s.status === 'ONGOING');
    const pendingOrders = requests.filter(r => r.status === 'PENDING');

    document.getElementById('statCheckin').textContent = activeSessions.length;
    document.getElementById('statTotalUsers').textContent = customers.length;

    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.createdAt?.startsWith(today));
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    document.getElementById('statRevenue').textContent = formatCurrency(todayRevenue);

    const todayRequests = requests.filter(r => r.createdAt?.startsWith(today));
    document.getElementById('statServices').textContent = todayRequests.length;

    const vipMonthCount = (reportData?.leaderboard?.month?.items || []).filter((i) => i.isVipByHours).length;
    const vipAllTimeCount = (reportData?.leaderboard?.allTime?.items || []).filter((i) => i.isVipByHours).length;
    document.getElementById('statVipMonth').textContent = vipMonthCount;
    document.getElementById('statVipAllTime').textContent = vipAllTimeCount;
    document.getElementById('statVipThresholdLabel').textContent = 'VIP nội bộ theo giờ đã nạp';

    document.getElementById('activeSessionCount').textContent = activeSessions.length;

    // update Nav badge
    const badge = document.getElementById('pendingOrderCount');
    if (badge) {
      badge.textContent = pendingOrders.length;
      badge.style.display = pendingOrders.length > 0 ? 'inline-block' : 'none';
    }

    // List Active Sessions in Dashboard bottom
    const activeContainer = document.getElementById('activeSessionListDashboard');
    if (activeSessions.length === 0) {
      activeContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-laptop"></i><p>Không có khách tại quán</p></div>`;
    } else {
      activeContainer.innerHTML = activeSessions.map(s => {
        const c = allCustomersMap[s.usersId] || {};
        return `
          <div class="session-item" style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <div style="display:flex; align-items: center; gap: 12px;">
              <div class="avatar avatar-sm"><i class="fa-solid fa-user"></i></div>
              <div>
                <div style="font-weight:600; font-size:14px; color:var(--text-main)">${customerDisplayName(c.name ? c : { customerName: s.customerName })} - ${c.phone || ''}</div>
                <div style="font-size:12px; color:var(--text-muted)">Giờ vào: ${formatDateTime(s.checkIn)}</div>
              </div>
            </div>
            <button class="btn-danger btn-sm" onclick="doCheckOut(${s.sessionsId})">Rời quán (Checkout)</button>
          </div>
        `}).join('');
    }

    // List pending Orders in dashboard
    const pendingContainer = document.getElementById('dashboardCustomerTbody');
    if (pendingOrders.length === 0) {
      pendingContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bell"></i><p>Không có yêu cầu chờ xử lý</p></div>`;
    } else {
      pendingContainer.innerHTML = `
        <table style="width:100%; font-size:14px;">
          ${pendingOrders.map(r => `
            <tr>
              <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><strong>${customerDisplayName(allCustomersMap[r.usersId] || { customerName: r.customerName })}</strong></td>
              <td style="padding:10px; border-bottom:1px solid #f1f5f9; color:#f59e0b;">${r.serviceName || r.packageName || 'Yêu cầu'} x ${r.quantity}</td>
              <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:right;">
                <button class="btn-primary btn-sm" onclick="approveOrder(${r.serviceRequestsId})">Duyệt</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    renderRevenueLeaderboard('dashboardRankMonthTbody', reportData?.leaderboard?.month?.items || [], 5, { onlyVip: true });
    renderRevenueLeaderboard('dashboardRankAllTimeTbody', reportData?.leaderboard?.allTime?.items || [], 5, { onlyVip: true });

  } catch (error) {
    console.error('Dashboard error:', error);
  }
};

// ===== CHECK-IN / CHECK-OUT SECTION =====
window.loadCheckinSection = async function () {
  const container = document.getElementById('activeSessionsContainer');
  container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải...</p></div>`;

  try {
    const sessions = await apiRequest('/sessions');
    const customers = await apiRequest('/customers');
    customers.forEach(c => allCustomersMap[c.usersId] = c);

    const activeSessions = sessions.filter(s => s.status === 'ONGOING');
    if (activeSessions.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-laptop"></i><p>Không có phiên nào đang hoạt động</p></div>`;
    } else {
      container.innerHTML = activeSessions.map(s => {
        const c = allCustomersMap[s.usersId] || {};
        return `
          <div class="session-row">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="avatar"><i class="fa-solid fa-user"></i></div>
              <div>
                <strong style="color:var(--text-main); font-size:14px;">${customerDisplayName(c.name ? c : { customerName: s.customerName })}</strong>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${c.phone || ''}</div>
              </div>
            </div>
            <div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Đang Check-in</div>
              <div style="font-weight:600; font-size:13px;">${formatDateTime(s.checkIn)}</div>
            </div>
            <div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Giờ còn lại</div>
              <div style="font-weight:700; color:var(--info-color);">${c.remainingHours || 0}h</div>
            </div>
            <div>
              <button class="btn-danger" style="padding: 8px 16px;" onclick="doCheckOut(${s.sessionsId})">
                <i class="fa-solid fa-sign-out-alt"></i> Rời quán
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
};

document.getElementById('btnSearchCheckin').addEventListener('click', async () => {
  const keyword = document.getElementById('checkinPhone').value.trim();
  const resContainer = document.getElementById('checkinResult');

  if (!keyword) {
    showInfoModal('Thiếu thông tin', 'Vui lòng nhập tên hoặc số điện thoại để tìm khách check-in.');
    return;
  }
  resContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

  try {
    const customers = await apiRequest('/customers');
    const normalizedKeyword = normalizeText(keyword);
    const numericKeyword = normalizePhone(keyword);
    const isNumericOnly = /^\d+$/.test(keyword);

    const matched = customers.filter((c) => {
      const customerName = normalizeText(c.name);
      const customerPhone = normalizePhone(c.phone);

      if (isNumericOnly) {
        return customerPhone.startsWith(numericKeyword);
      }

      return customerName.includes(normalizedKeyword)
        || (numericKeyword ? customerPhone.includes(numericKeyword) : false);
    });

    if (matched.length > 0) {
      resContainer.innerHTML = matched.map((found) => `
        <div style="background:var(--white); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div>
            <h4 style="font-size:16px; margin-bottom:4px;">${customerDisplayName(found)}</h4>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">SĐT: ${found.phone}</div>
            <span class="badge badge-info">Giờ còn lại: ${found.remainingHours}h</span>
          </div>
          <button class="btn-primary" onclick="doCheckIn(${found.usersId})"><i class="fa-solid fa-sign-in-alt"></i> CHECK-IN NGAY</button>
        </div>
      `).join('');
    } else {
      resContainer.innerHTML = `
        <div class="empty-state" style="padding:20px">
          <i class="fa-solid fa-user-xmark" style="color:#ef4444; margin-bottom:10px;"></i>
          <p style="color:#dc2626; font-weight:600;">Không tìm thấy khách hàng phù hợp</p>
          <p style="font-size:13px; color:#666; margin-top:5px;">Vui lòng thêm tài khoản bên phần Quản lý Khách hàng nếu khách chưa có.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
});

window.doCheckIn = async function (usersId) {
  openActionModal({
    title: 'Xác nhận Check-in',
    message: 'Bạn muốn check-in khách hàng này ngay bây giờ?',
    confirmText: 'Check-in',
    confirmClass: 'btn-primary',
    onConfirm: async () => {
      try {
        await apiRequest('/sessions/checkin', {
          method: 'POST',
          body: JSON.stringify({ usersId: parseInt(usersId) })
        });
        closeActionModal();
        document.getElementById('checkinPhone').value = '';
        document.getElementById('checkinResult').innerHTML = `<div class="empty-state"><p>Đã check-in thành công. Tìm KH khác.</p></div>`;
        loadCheckinSection();
        loadDashboard();
        showInfoModal('Check-in thành công', 'Khách hàng đã được check-in và bắt đầu phiên làm việc.');
      } catch (err) {
        closeActionModal();
        showInfoModal('Check-in thất bại', 'Khách hàng có thể đang check-in rồi hoặc không đủ giờ còn lại.');
      }
    }
  });
}

window.doCheckOut = async function (sessionId) {
  openActionModal({
    title: 'Xác nhận Check-out',
    message: 'Bạn muốn check-out khách hàng này khỏi phiên hiện tại?',
    confirmText: 'Check-out',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiRequest(`/sessions/${sessionId}/checkout`, { method: 'PUT' });
        closeActionModal();
        if (document.getElementById('section-checkin').classList.contains('active')) loadCheckinSection();
        loadDashboard();
        showInfoModal('Check-out thành công', 'Khách hàng đã được check-out khỏi hệ thống.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Check-out thất bại', 'Không thể check-out: ' + e.message);
      }
    }
  });
}


// ===== CUSTOMERS SECTION =====
window.loadCustomers = async function () {
  try {
    const customers = await apiRequest('/customers');
    allCustomersCache = customers || [];
    allCustomersMap = {};
    customers.forEach(c => allCustomersMap[c.usersId] = c);

    renderCustomersTable();
  } catch (err) { console.error(err); }
};

function renderCustomersTable() {
  const tbody = document.getElementById('customerTbody');
  const countEl = document.getElementById('customerCount');
  const paginationEl = document.getElementById('customerPagination');
  if (!tbody || !countEl || !paginationEl) return;

  const query = customerSearchQuery.trim();
  const normalizedQuery = normalizeText(query);
  const numericQuery = normalizePhone(query);
  const isNumericOnly = /^\d+$/.test(query);

  const filtered = allCustomersCache.filter(c => {
    if (!query) return true;

    const name = normalizeText(c.name);
    const phone = normalizePhone(c.phone);

    if (isNumericOnly) {
      return phone.startsWith(numericQuery);
    }

    return name.includes(normalizedQuery)
      || (numericQuery ? phone.includes(numericQuery) : false);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / CUSTOMERS_PAGE_SIZE));
  currentCustomerPage = Math.min(currentCustomerPage, totalPages);
  currentCustomerPage = Math.max(1, currentCustomerPage);

  const start = (currentCustomerPage - 1) * CUSTOMERS_PAGE_SIZE;
  const pagedCustomers = filtered.slice(start, start + CUSTOMERS_PAGE_SIZE);

  countEl.textContent = query
    ? `(${filtered.length}/${allCustomersCache.length})`
    : `(${allCustomersCache.length})`;

  if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">Chưa có khách.</td></tr>`;
      paginationEl.innerHTML = '';
      return;
  }

  tbody.innerHTML = pagedCustomers.map(c => `
      <tr>
        <td>#${c.usersId}</td>
        <td>
          <div style="font-weight:600; color:var(--text-main)">${customerDisplayName(c)}</div>
        </td>
        <td style="color:var(--text-muted)">${c.phone}</td>
        <td><span class="badge ${c.remainingHours > 0 ? 'badge-success' : 'badge-danger'}">${c.remainingHours}h</span></td>
        <td><span style="font-size:12px">${formatDate(c.createdAt)}</span></td>
        <td><span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${trans(c.status || 'ACTIVE')}</span></td>
        <td style="text-align:center;">
          <button class="btn-primary btn-sm" onclick="openAddHoursModal(${c.usersId})" title="Nạp giờ"><i class="fa-solid fa-plus-circle"></i> Nạp</button>
          <button class="btn-secondary btn-sm" onclick="openCustomerModal(${c.usersId})" title="Sửa"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger btn-sm" onclick="deleteCustomer(${c.usersId})" title="Xoá"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

  renderCustomerPagination(totalPages);
}

function renderCustomerPagination(totalPages) {
  const paginationEl = document.getElementById('customerPagination');
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`
      <button class="orders-page-btn ${page === currentCustomerPage ? 'active' : ''}" onclick="gotoCustomerPage(${page})">${page}</button>
    `);
  }

  paginationEl.innerHTML = `
    <button class="orders-page-btn" onclick="gotoCustomerPage(${currentCustomerPage - 1})" ${currentCustomerPage === 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pages.join('')}
    <button class="orders-page-btn" onclick="gotoCustomerPage(${currentCustomerPage + 1})" ${currentCustomerPage === totalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

window.gotoCustomerPage = function (page) {
  currentCustomerPage = page;
  renderCustomersTable();
};

window.openAddHoursModal = function (id) {
  const c = allCustomersMap[id];
  document.getElementById('addHoursCustomerId').value = id;
  document.getElementById('addHoursCustomerName').textContent = c.name;
  document.getElementById('addHoursValue').value = '';
  openModal('addHoursModalOverlay');
};

window.submitAddHours = async function () {
  const id = document.getElementById('addHoursCustomerId').value;
  const hours = parseFloat(document.getElementById('addHoursValue').value);
  if (!hours || hours <= 0) {
    showInfoModal('Dữ liệu không hợp lệ', 'Vui lòng nhập số giờ hợp lệ lớn hơn 0.');
    return;
  }

  openActionModal({
    title: 'Xác nhận nạp giờ',
    message: `Bạn muốn nạp ${hours} giờ cho khách hàng này?`,
    confirmText: 'Nạp giờ',
    onConfirm: async () => {
      try {
        await apiRequest(`/customers/${id}/add-hours`, {
          method: 'PATCH',
          body: JSON.stringify({ hours: hours, note: 'Nạp thủ công' })
        });
        closeModal('addHoursModalOverlay');
        closeActionModal();
        await loadCustomers();
        await loadDashboard();
        showInfoModal('Nạp giờ thành công', 'Số giờ đã được cộng vào tài khoản khách hàng.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Nạp giờ thất bại', e.message || 'Có lỗi xảy ra khi nạp giờ.');
      }
    }
  });
};

window.openCustomerModal = function (id = null) {
  const modalTitle = document.getElementById('customerModalTitle');
  const statusGroup = document.getElementById('customerStatusGroup');
  if (id) {
    const c = allCustomersMap[id];
    document.getElementById('customerEditId').value = id;
    document.getElementById('customerName').value = c.name;
    document.getElementById('customerPhone').value = c.phone;
    document.getElementById('customerPassword').value = '';
    document.getElementById('customerPassword').placeholder = 'Bỏ trống nếu không muốn đổi';

    // Hiện ô sửa trạng thái
    if (statusGroup) statusGroup.style.display = 'block';
    document.getElementById('customerStatus').value = (c.status === 'UNACTIVE' || c.status === 'INACTIVE') ? 'UNACTIVE' : 'ACTIVE';

    modalTitle.textContent = 'Chỉnh sửa Khách Hàng';
  } else {
    document.getElementById('customerEditId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerPassword').value = '123456';
    document.getElementById('customerPassword').placeholder = '123456';

    // Ẩn ô sửa trạng thái khi tạo mới
    if (statusGroup) statusGroup.style.display = 'none';

    modalTitle.textContent = 'Thêm Khách Hàng Mới';
  }
  openModal('customerModalOverlay');
}

window.deleteCustomer = async function (id) {
  openActionModal({
    title: 'Xóa khách hàng',
    message: 'Bạn chắc chắn muốn xóa khách hàng này? Thao tác này không thể hoàn tác.',
    confirmText: 'Xóa',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiRequest(`/customers/${id}`, { method: 'DELETE' });
        closeActionModal();
        await loadCustomers();
        await loadDashboard();
        showInfoModal('Đã xóa khách hàng', 'Dữ liệu khách hàng đã được xóa khỏi hệ thống.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Xóa thất bại', e.message || 'Không thể xóa khách hàng.');
      }
    }
  });
}

window.saveCustomer = async function () {
  const id = document.getElementById('customerEditId').value;
  const name = document.getElementById('customerName').value;
  const phone = document.getElementById('customerPhone').value;
  const pw = document.getElementById('customerPassword').value;
  const status = document.getElementById('customerStatus').value;

  if (!name || !phone) {
    showInfoModal('Thiếu thông tin', 'Vui lòng nhập đầy đủ họ tên và số điện thoại.');
    return;
  }
  if (!id && !pw) {
    showInfoModal('Thiếu mật khẩu', 'Tài khoản mới cần có mật khẩu khởi tạo.');
    return;
  }

  const isEdit = Boolean(id);
  openActionModal({
    title: isEdit ? 'Lưu thay đổi khách hàng' : 'Tạo khách hàng mới',
    message: isEdit ? 'Xác nhận cập nhật thông tin khách hàng này?' : 'Xác nhận tạo tài khoản khách hàng mới?',
    confirmText: isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản',
    onConfirm: async () => {
      try {
        if (id) {
          await apiRequest(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, phone, password: pw, status: status })
          });
        } else {
          await apiRequest('/customers', {
            method: 'POST',
            body: JSON.stringify({ name, phone, password: pw })
          });
        }
        closeModal('customerModalOverlay');
        closeActionModal();
        await loadCustomers();
        await loadDashboard();
        showInfoModal('Lưu thành công', 'Thông tin khách hàng đã được cập nhật.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Lưu thất bại', e.message || 'Có lỗi xảy ra khi lưu khách hàng.');
      }
    }
  });
}

// Hàm tìm kiếm khách hàng bằng input
window.filterCustomerList = function () {
  customerSearchQuery = document.getElementById('searchInputCustomer').value || '';
  currentCustomerPage = 1;
  renderCustomersTable();
}

// ===== SERVICES SECTION =====
window.loadServices = async function () {
  try {
    const menu = await apiRequest('/menu');
    const grid = document.getElementById('servicesGrid');
    document.getElementById('serviceCount').textContent = `${menu.length} món`;

    menu.forEach(m => allServicesMap[m.servicesId] = m);

    if (menu.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Chưa cấu hình dịch vụ</p></div>`;
      return;
    }

    grid.innerHTML = menu.map(m => {
      const isFood = m.type === 'FOOD';
      const icon = isFood ? 'fa-burger' : 'fa-mug-saucer';
      return `
        <div class="service-card">
          <div class="service-card-icon">
            <i class="fa-solid ${icon}" style="color:white; font-size:36px;"></i>
          </div>
          <div class="service-card-body">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <h4 style="font-size:15px; margin-bottom:4px; font-weight:700;">${m.name}</h4>
                <span class="badge badge-info">${trans(m.type)}</span>
              </div>
              <div style="font-weight:800; color:var(--danger-color); font-size:15px;">${formatCurrency(m.price)}</div>
            </div>
            
            <div style="margin-top:auto; display:flex; gap:8px;">
              <button class="btn-secondary btn-sm" style="flex:1" onclick="openServiceModal(${m.servicesId})"><i class="fa-solid fa-pen"></i> Sửa</button>
              <button class="btn-danger btn-sm" onclick="deleteService(${m.servicesId})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) { console.error(err); }
};

window.openServiceModal = function (id = null) {
  const modalTitle = document.getElementById('serviceModalTitle');
  if (id) {
    const s = allServicesMap[id];
    document.getElementById('serviceEditId').value = id;
    document.getElementById('serviceName').value = s.name;
    document.getElementById('serviceType').value = s.type;
    document.getElementById('servicePrice').value = s.price;
    modalTitle.textContent = 'Chỉnh sửa Dịch vụ / Món';
  } else {
    document.getElementById('serviceEditId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceType').value = 'DRINK';
    document.getElementById('servicePrice').value = '';
    modalTitle.textContent = 'Thêm Dịch vụ / Món mới';
  }
  openModal('serviceModalOverlay');
}

window.deleteService = async function (id) {
  openActionModal({
    title: 'Xóa dịch vụ',
    message: 'Bạn chắc chắn muốn xóa dịch vụ/món này khỏi hệ thống?',
    confirmText: 'Xóa',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiRequest(`/menu/${id}`, { method: 'DELETE' });
        closeActionModal();
        await loadServices();
        showInfoModal('Đã xóa dịch vụ', 'Dịch vụ đã được xóa thành công.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Xóa thất bại', e.message || 'Không thể xóa dịch vụ này.');
      }
    }
  });
}

window.saveService = async function () {
  const id = document.getElementById('serviceEditId').value;
  const name = document.getElementById('serviceName').value;
  const type = document.getElementById('serviceType').value;
  const price = document.getElementById('servicePrice').value;
  if (!name || !price) {
    showInfoModal('Thiếu thông tin', 'Vui lòng nhập đầy đủ tên dịch vụ và giá.');
    return;
  }

  const isEdit = Boolean(id);
  openActionModal({
    title: isEdit ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ mới',
    message: isEdit ? 'Xác nhận lưu thay đổi cho dịch vụ này?' : 'Xác nhận thêm dịch vụ mới vào menu?',
    confirmText: isEdit ? 'Lưu thay đổi' : 'Thêm dịch vụ',
    onConfirm: async () => {
      try {
        if (id) {
          await apiRequest(`/menu/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, type, price: parseFloat(price) })
          });
        } else {
          await apiRequest('/menu', {
            method: 'POST',
            body: JSON.stringify({ name, type, price: parseFloat(price), status: 'AVAILABLE' })
          });
        }
        closeModal('serviceModalOverlay');
        closeActionModal();
        await loadServices();
        showInfoModal('Lưu thành công', 'Thông tin dịch vụ đã được cập nhật.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Lưu thất bại', e.message || 'Không thể lưu dịch vụ.');
      }
    }
  });
}

// ===== PACKAGES SECTION =====
window.loadPackages = async function () {
  try {
    const packages = await apiRequest('/packages');
    const grid = document.getElementById('packagesGrid');

    packages.forEach(p => allPackagesMap[p.packagesId] = p);

    if (packages.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Chưa cấu hình gói</p></div>`;
      return;
    }

    grid.innerHTML = packages.map(p => {
      return `
        <div class="package-card">
          <h4 style="font-size:16px; font-weight:700; color:var(--primary-color);">${p.name}</h4>
          <div style="margin: 10px 0; font-size:24px; font-weight:800; color:#b45309;">${formatCurrency(p.price)}</div>
          <div style="display:flex; align-items:center; gap:6px; color:var(--text-muted); font-size:13px; margin-bottom:14px;">
            <i class="fa-solid fa-clock" style="color:#3b82f6;"></i> Nhận được: <strong style="color:var(--text-main)">${p.hoursAmount}h</strong>
          </div>
          <div style="margin-top:auto; display:flex; gap:8px;">
            <button class="btn-secondary btn-sm" style="flex:1" onclick="openPackageModal(${p.packagesId})"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button class="btn-danger btn-sm" onclick="deletePackage(${p.packagesId})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) { console.error(err); }
};

window.openPackageModal = function (id = null) {
  const modalTitle = document.getElementById('packageModalTitle');
  if (id) {
    const p = allPackagesMap[id];
    document.getElementById('packageEditId').value = id;
    document.getElementById('packageName').value = p.name;
    document.getElementById('packageHours').value = p.hoursAmount;
    document.getElementById('packagePrice').value = p.price;
    modalTitle.textContent = 'Chỉnh sửa Gói Giờ';
  } else {
    document.getElementById('packageEditId').value = '';
    document.getElementById('packageName').value = '';
    document.getElementById('packageHours').value = '';
    document.getElementById('packagePrice').value = '';
    modalTitle.textContent = 'Thêm Gói Giờ Mới';
  }
  openModal('packageModalOverlay');
}

window.deletePackage = async function (id) {
  openActionModal({
    title: 'Xóa gói giờ',
    message: 'Bạn chắc chắn muốn xóa gói giờ này khỏi hệ thống?',
    confirmText: 'Xóa',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiRequest(`/packages/${id}`, { method: 'DELETE' });
        closeActionModal();
        await loadPackages();
        showInfoModal('Đã xóa gói giờ', 'Gói giờ đã được xóa thành công.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Xóa thất bại', e.message || 'Không thể xóa gói giờ.');
      }
    }
  });
}

window.savePackage = async function () {
  const id = document.getElementById('packageEditId').value;
  const name = document.getElementById('packageName').value;
  const hours = document.getElementById('packageHours').value;
  const price = document.getElementById('packagePrice').value;
  if (!name || !hours || !price) {
    showInfoModal('Thiếu thông tin', 'Vui lòng nhập đủ tên, số giờ và giá của gói giờ.');
    return;
  }

  const isEdit = Boolean(id);
  openActionModal({
    title: isEdit ? 'Cập nhật gói giờ' : 'Tạo gói giờ mới',
    message: isEdit ? 'Xác nhận lưu thay đổi cho gói giờ này?' : 'Xác nhận thêm gói giờ mới?',
    confirmText: isEdit ? 'Lưu thay đổi' : 'Thêm gói giờ',
    onConfirm: async () => {
      try {
        if (id) {
          await apiRequest(`/packages/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, hoursAmount: parseFloat(hours), price: parseFloat(price) })
          });
        } else {
          await apiRequest('/packages', {
            method: 'POST',
            body: JSON.stringify({ name, hoursAmount: parseFloat(hours), price: parseFloat(price), status: 'AVAILABLE' })
          });
        }
        closeModal('packageModalOverlay');
        closeActionModal();
        await loadPackages();
        showInfoModal('Lưu thành công', 'Thông tin gói giờ đã được cập nhật.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Lưu thất bại', e.message || 'Không thể lưu gói giờ.');
      }
    }
  });
}

// ===== ORDERS (REQUESTS) SECTION =====
window.loadOrders = async function () {
  try {
    const requests = await apiRequest('/requests');
    allOrdersCache = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    bindOrderModalEvents();
    renderOrderCounters();
    renderOrdersByState();

  } catch (err) { console.error(err); }
};

window.filterOrderList = function (status, btnElement) {
  document.querySelectorAll('.orders-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  currentOrderFilter = status;
  currentOrderPage = 1;
  renderOrdersByState();
}

window.goToOrderPage = function (page) {
  const filtered = getFilteredOrders();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  currentOrderPage = safePage;
  renderOrdersByState();
}

function renderOrderCounters() {
  const pendingCount = allOrdersCache.filter(r => r.status === 'PENDING').length;
  const paidCount = allOrdersCache.filter(r => r.status === 'PAID' || r.status === 'APPROVED').length;
  const cancelledCount = allOrdersCache.filter(r => r.status === 'CANCELLED').length;

  document.getElementById('orderCountAll').innerText = allOrdersCache.length;
  document.getElementById('orderCountPending').innerText = pendingCount;
  document.getElementById('orderCountPaid').innerText = paidCount;
  document.getElementById('orderCountCancel').innerText = cancelledCount;
}

function getFilteredOrders() {
  if (currentOrderFilter === 'ALL') return allOrdersCache;
  if (currentOrderFilter === 'PENDING') return allOrdersCache.filter(r => r.status === 'PENDING');
  if (currentOrderFilter === 'PAID') return allOrdersCache.filter(r => r.status === 'PAID' || r.status === 'APPROVED');
  if (currentOrderFilter === 'CANCELLED') return allOrdersCache.filter(r => r.status === 'CANCELLED');
  return allOrdersCache;
}

function renderOrdersByState() {
  const grid = document.getElementById('ordersGrid');
  const paging = document.getElementById('ordersPagination');
  const countEl = document.getElementById('orderCount');
  if (!grid) return;

  const filtered = getFilteredOrders();

  if (filtered.length === 0) {
    if (countEl) countEl.textContent = 'Không có yêu cầu nào phù hợp bộ lọc.';
    grid.innerHTML = `<div class="orders-empty"><i class="fa-solid fa-bell-slash"></i><p>Chưa có yêu cầu nào trên hệ thống.</p></div>`;
    if (paging) paging.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  currentOrderPage = Math.min(currentOrderPage, totalPages);
  const start = (currentOrderPage - 1) * ORDERS_PAGE_SIZE;
  const end = start + ORDERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, end);

  if (countEl) {
    countEl.textContent = `Hiển thị ${start + 1}-${Math.min(end, filtered.length)} / ${filtered.length} yêu cầu`;
  }

  grid.innerHTML = pageItems.map(renderOrderCard).join('');
  renderOrderPagination(totalPages);
}

function renderOrderCard(r) {
  let cardClass = '';
  if (r.status === 'PENDING') cardClass = 'order-card--pending';
  else if (r.status === 'APPROVED' || r.status === 'PAID') cardClass = 'order-card--paid';
  else cardClass = 'order-card--rejected';

  const icon = r.serviceName ? 'fa-mug-hot' : 'fa-ticket';
  const name = r.serviceName || r.packageName || 'Yêu cầu';
  const statusClass = r.status === 'PENDING' ? 'badge-warning' : (r.status === 'APPROVED' || r.status === 'PAID' ? 'badge-success' : 'badge-danger');

  return `
    <div class="order-card ${cardClass}" data-status="${r.status}" onclick="openOrderDetailModal(${r.serviceRequestsId})" style="flex-direction:row; align-items:center; padding:12px 16px; flex-wrap:wrap; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:200px;">
        <div class="order-card__avatar" style="margin:0;"><i class="fa-solid fa-user"></i></div>
        <div>
          <div class="order-card__name">${customerDisplayName(allCustomersMap[r.usersId] || { customerName: r.customerName })}</div>
          <div class="order-card__time" style="margin-top:2px"><i class="fa-regular fa-clock"></i> ${formatDateTime(r.createdAt)}</div>
        </div>
      </div>

      <div style="flex:1.5; display:flex; align-items:center; gap:12px; min-width:250px;">
        <div style="width:36px; height:36px; border-radius:8px; background:var(--bg-color); display:flex; align-items:center; justify-content:center; color:var(--accent-color); font-size:16px;">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div>
          <div style="font-weight:600; font-size:14px; color:var(--text-main);">${name} <span style="font-weight:500; color:var(--text-muted);">x${r.quantity}</span></div>
          <div style="font-weight:700; color:var(--accent-color); font-size:14px; margin-top:2px;">${formatCurrency(r.totalPrice)}</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
        <span class="badge ${statusClass}">${trans(r.status)}</span>
        <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openOrderDetailModal(${r.serviceRequestsId})">
          <i class="fa-solid fa-up-right-from-square"></i> Chi tiết
        </button>
      </div>
    </div>
  `;
}

function renderOrderPagination(totalPages) {
  const paging = document.getElementById('ordersPagination');
  if (!paging) return;

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentOrderPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pageButtons = [];
  for (let p = startPage; p <= endPage; p += 1) {
    pageButtons.push(`<button class="orders-page-btn ${p === currentOrderPage ? 'active' : ''}" onclick="goToOrderPage(${p})">${p}</button>`);
  }

  paging.innerHTML = `
    <span style="font-size:12px;color:var(--text-muted);margin-right:6px">Trang ${currentOrderPage}/${totalPages}</span>
    <button class="orders-page-btn" ${currentOrderPage === 1 ? 'disabled' : ''} onclick="goToOrderPage(${currentOrderPage - 1})">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pageButtons.join('')}
    <button class="orders-page-btn" ${currentOrderPage === totalPages ? 'disabled' : ''} onclick="goToOrderPage(${currentOrderPage + 1})">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

window.openOrderDetailModal = function (id) {
  const order = allOrdersCache.find(r => r.serviceRequestsId === id);
  if (!order) return;
  currentOrderModalId = id;

  const overlay = document.getElementById('orderDetailModalOverlay');
  const body = document.getElementById('orderDetailModalBody');
  const footer = document.getElementById('orderDetailModalFooter');
  if (!overlay || !body || !footer) return;

  const typeLabel = order.serviceName ? 'Dịch vụ' : 'Gói giờ';
  const serviceLabel = order.serviceName || order.packageName || 'Yêu cầu';

  body.innerHTML = `
    <div class="order-detail-row"><div class="order-detail-label">Khách hàng</div><div class="order-detail-value">${customerDisplayName(allCustomersMap[order.usersId] || { customerName: order.customerName })}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Thời gian gửi</div><div class="order-detail-value">${formatDateTime(order.createdAt)}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Loại yêu cầu</div><div class="order-detail-value">${typeLabel}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Nội dung</div><div class="order-detail-value">${serviceLabel}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Số lượng</div><div class="order-detail-value">x${order.quantity || 1}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Tổng tiền</div><div class="order-detail-value" style="color:var(--accent-color)">${formatCurrency(order.totalPrice)}</div></div>
    <div class="order-detail-row"><div class="order-detail-label">Trạng thái</div><div class="order-detail-value"><span class="badge ${order.status === 'PENDING' ? 'badge-warning' : (order.status === 'APPROVED' || order.status === 'PAID' ? 'badge-success' : 'badge-danger')}">${trans(order.status)}</span></div></div>
    ${order.note ? `<div class="order-detail-row"><div class="order-detail-label">Ghi chú</div><div class="order-detail-value">${order.note}</div></div>` : ''}
  `;

  if (order.status === 'PENDING') {
    footer.style.display = 'flex';
    footer.innerHTML = `
      <button type="button" class="btn-danger" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca" onclick="cancelOrder(${order.serviceRequestsId})"><i class="fa-solid fa-xmark"></i> Từ chối</button>
      <button type="button" class="btn-primary" onclick="approveOrder(${order.serviceRequestsId})"><i class="fa-solid fa-check"></i> Duyệt yêu cầu</button>
    `;
  } else {
    footer.style.display = 'none';
    footer.innerHTML = '';
  }

  overlay.classList.remove('hidden');
};

window.closeOrderDetailModal = function () {
  currentOrderModalId = null;
  document.getElementById('orderDetailModalOverlay')?.classList.add('hidden');
}

function bindOrderModalEvents() {
  const overlay = document.getElementById('orderDetailModalOverlay');
  if (!overlay || overlay.dataset.bound === '1') return;

  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'orderDetailModalOverlay') closeOrderDetailModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeOrderDetailModal();
  });

  overlay.dataset.bound = '1';
}

window.approveOrder = async function (id) {
  openActionModal({
    title: 'Duyệt yêu cầu',
    message: 'Xác nhận duyệt yêu cầu này và ghi nhận giao dịch thanh toán?',
    confirmText: 'Duyệt yêu cầu',
    onConfirm: async () => {
      try {
        const resp = await apiRequest(`/requests/${id}/approve`, { method: 'PATCH' });

        if (resp && resp.totalPrice > 0) {
          await apiRequest('/payments', {
            method: 'POST',
            body: JSON.stringify({
              serviceRequestsId: id,
              amount: resp.totalPrice,
              paymentMethod: 'CASH'
            })
          });
        }

        closeOrderDetailModal();
        closeActionModal();
        await loadOrders();
        await loadDashboard();
        if (document.getElementById('section-reports')?.classList.contains('active')) await loadReports();
        showInfoModal('Duyệt thành công', 'Yêu cầu đã được duyệt và cập nhật trạng thái.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Duyệt thất bại', e.message || 'Không thể duyệt yêu cầu.');
      }
    }
  });
}

window.cancelOrder = async function (id) {
  openActionModal({
    title: 'Từ chối yêu cầu',
    message: 'Bạn chắc chắn muốn từ chối/hủy yêu cầu này?',
    confirmText: 'Từ chối',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiRequest(`/requests/${id}/cancel`, { method: 'PATCH' });
        closeOrderDetailModal();
        closeActionModal();
        await loadOrders();
        await loadDashboard();
        showInfoModal('Đã từ chối yêu cầu', 'Yêu cầu đã được chuyển sang trạng thái hủy.');
      } catch (e) {
        closeActionModal();
        showInfoModal('Từ chối thất bại', e.message || 'Không thể từ chối yêu cầu.');
      }
    }
  });
}

// ===== REPORTS SECTION =====
window.loadReports = async function () {
  try {
    const monthFilter = document.getElementById('reportMonthFilter');
    const monthLabel = document.getElementById('reportMonthLabel');
    const viewModeSelect = document.getElementById('reportViewMode');
    const dateFilter = document.getElementById('reportDateFilter');

    if (monthFilter && !monthFilter.dataset.bound) {
      monthFilter.addEventListener('change', () => loadReports());
      monthFilter.dataset.bound = '1';
    }

    if (viewModeSelect && !viewModeSelect.dataset.bound) {
      viewModeSelect.addEventListener('change', () => loadReports());
      viewModeSelect.dataset.bound = '1';
    }

    if (dateFilter && !dateFilter.dataset.bound) {
      dateFilter.addEventListener('change', () => loadReports());
      dateFilter.dataset.bound = '1';
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthFilter && !monthFilter.value) monthFilter.value = currentMonth;
    if (viewModeSelect && !viewModeSelect.value) viewModeSelect.value = 'MONTH';
    if (dateFilter && !dateFilter.value) dateFilter.value = now.toISOString().split('T')[0];

    const selectedMonth = monthFilter?.value || currentMonth;
    const viewMode = viewModeSelect?.value || 'MONTH';
    let selectedDate = dateFilter?.value || now.toISOString().split('T')[0];

    const [year, month] = selectedMonth.split('-').map((v) => Number(v));
    const firstDay = `${selectedMonth}-01`;
    const lastDay = `${selectedMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    if (dateFilter) {
      dateFilter.disabled = viewMode !== 'DAY';
      dateFilter.min = firstDay;
      dateFilter.max = lastDay;
      if (selectedDate < firstDay || selectedDate > lastDay) {
        selectedDate = firstDay;
        dateFilter.value = firstDay;
      }
    }

    const report = await apiRequest(`/reports/transactions?month=${encodeURIComponent(selectedMonth)}`);

    if (monthLabel) {
      monthLabel.textContent = viewMode === 'DAY'
        ? `Đang xem ngày ${formatDate(selectedDate)} trong tháng ${month}/${year}`
        : `Đang xem toàn bộ tháng ${month}/${year}`;
    }

    const vipByHoursMap = new Map((report?.leaderboard?.allTime?.items || []).map((item) => [item.usersId, Boolean(item.isVipByHours)]));

    const summary = report?.summary || {};
    const dailyRows = (report?.daily || []).map((day) => ({
      ...day,
      totalRevenue: Number(day.totalRevenue) || 0,
      transactionCount: Number(day.transactionCount) || 0,
      serviceRevenue: Number(day.serviceRevenue) || 0,
      packageRevenue: Number(day.packageRevenue) || 0,
      topItems: Array.isArray(day.topItems) ? day.topItems : [],
      transactions: Array.isArray(day.transactions)
        ? day.transactions.map((txn) => ({
          ...txn,
          amount: Number(txn.amount) || 0,
          quantity: Number(txn.quantity) || 1,
          isVipByHours: Boolean(vipByHoursMap.get(txn.usersId))
        }))
        : []
    }));

    document.getElementById('reportTotalRevenue').textContent = formatCurrency(Number(summary.totalRevenue) || 0);
    document.getElementById('reportTotalTransactions').textContent = Number(summary.totalTransactions) || 0;
    document.getElementById('reportActiveDays').textContent = Number(summary.activeDays) || 0;
    const vipMonthEl = document.getElementById('reportVipMonthCount');
    const vipAllEl = document.getElementById('reportVipAllTimeCount');
    if (vipMonthEl) vipMonthEl.textContent = (report?.leaderboard?.month?.items || []).filter((i) => i.isVipByHours).length;
    if (vipAllEl) vipAllEl.textContent = (report?.leaderboard?.allTime?.items || []).filter((i) => i.isVipByHours).length;

    reportDailyCache = dailyRows;
    currentReportDailyPage = 1;
    currentReportDetailPage = 1;
    currentReportSelectedDate = dailyRows[0]?.date || null;

    renderReportDailyTable();
    renderReportDetailByDate(currentReportSelectedDate);
    renderRevenuePie(report?.transactions || [], { viewMode, selectedDate });
    renderRevenueLeaderboard('reportVipMonthTbody', report?.leaderboard?.month?.items || [], 10, { onlyVip: true });
    renderRevenueLeaderboard('reportVipAllTimeTbody', report?.leaderboard?.allTime?.items || [], 10, { onlyVip: true });

    const monthTitle = document.getElementById('reportVipMonthTitle');
    if (monthTitle) monthTitle.textContent = `BXH doanh thu tháng ${month}/${year}`;
    const allTimeTitle = document.getElementById('reportVipAllTimeTitle');
    if (allTimeTitle) allTimeTitle.textContent = 'BXH doanh thu tích lũy';

  } catch (err) { console.error(err); }
};

function renderRevenuePie(transactions, options) {
  const viewMode = options?.viewMode || 'MONTH';
  const selectedDate = options?.selectedDate;
  const mainPie = document.getElementById('reportPieMain');
  const mainLegend = document.getElementById('reportPieMainLegend');
  const tooltip = document.getElementById('reportPieTooltip');
  const panelTitle = document.getElementById('reportDetailPanelTitle');
  const panelHint = document.getElementById('reportDetailPanelHint');
  const panelBody = document.getElementById('reportDetailPanelBody');
  if (!mainPie || !mainLegend || !tooltip || !panelTitle || !panelHint || !panelBody) return;

  const scoped = (Array.isArray(transactions) ? transactions : []).filter((txn) => {
    if (viewMode !== 'DAY') return true;
    return String(txn.date || '').startsWith(selectedDate);
  });

  const serviceTxns = scoped.filter((t) => t.itemType === 'SERVICE');
  const packageTxns = scoped.filter((t) => t.itemType === 'PACKAGE');
  const totals = {
    service: serviceTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    package: packageTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  };
  const total = totals.service + totals.package;

  const serviceItems = aggregateItems(serviceTxns, 'serviceCategory');
  const packageItems = aggregateItems(packageTxns, null);

  if (total <= 0) {
    mainPie.style.background = '#e2e8f0';
    mainLegend.innerHTML = '<span class="report-legend-item">Không có dữ liệu</span>';
    panelTitle.textContent = 'Chi tiết thành phần doanh thu';
    panelHint.textContent = 'Không có dữ liệu cho bộ lọc hiện tại.';
    panelBody.innerHTML = '';
    tooltip.style.display = 'none';
    mainPie.onmousemove = null;
    mainPie.onmouseleave = null;
    return;
  }

  const servicePct = Math.round((totals.service / total) * 100);
  mainPie.style.background = `conic-gradient(#16a34a 0 ${servicePct}%, #f59e0b ${servicePct}% 100%)`;
  mainPie.style.cursor = 'default';

  const serviceQty = serviceItems.reduce((sum, item) => sum + item.quantity, 0);
  const packageQty = packageItems.reduce((sum, item) => sum + item.quantity, 0);
  mainLegend.innerHTML = `
    <span class="report-legend-item"><span class="report-legend-dot" style="background:#16a34a"></span>Dịch vụ: ${formatCurrency(totals.service)} (${serviceQty})</span>
    <span class="report-legend-item"><span class="report-legend-dot" style="background:#f59e0b"></span>Gói nạp: ${formatCurrency(totals.package)} (${packageQty})</span>
  `;

  panelTitle.textContent = 'Chi tiết thành phần doanh thu';
  panelHint.textContent = 'Di chuột vào từng mảng màu để xem chi tiết dịch vụ/gói nạp.';
  panelBody.innerHTML = '';

  const showDetail = (segment) => {
    const data = segment === 'SERVICE'
      ? { title: 'Chi tiết Dịch vụ', items: serviceItems, total: totals.service }
      : { title: 'Chi tiết Gói nạp', items: packageItems, total: totals.package };

    panelTitle.textContent = data.title;
    panelHint.textContent = `Tổng doanh thu: ${formatCurrency(data.total)} - Tổng số lượng: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}`;

    panelBody.innerHTML = data.items.length === 0
      ? '<div class="text-muted">Không có dữ liệu chi tiết.</div>'
      : data.items.map((item) => `
        <div class="report-detail-item">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.quantity} lượt</span>
          <span>${formatCurrency(item.revenue)}</span>
        </div>
      `).join('');

    tooltip.innerHTML = `
      <div class="report-pie-tooltip-title">${data.title}</div>
      ${data.items.slice(0, 8).map((item) => `
        <div class="report-pie-tooltip-row">
          <span>${escapeHtml(item.name)} x${item.quantity}</span>
          <span>${formatCurrency(item.revenue)}</span>
        </div>
      `).join('')}
    `;
  };

  showDetail('SERVICE');

  mainPie.onmousemove = (event) => {
    const rect = mainPie.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const outerRadius = rect.width / 2;
    const innerRadius = 52;

    if (distance < innerRadius || distance > outerRadius) {
      tooltip.style.display = 'none';
      return;
    }

    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;
    const serviceDeg = (servicePct / 100) * 360;
    const segment = angle <= serviceDeg ? 'SERVICE' : 'PACKAGE';
    showDetail(segment);

    const parentRect = mainPie.parentElement.getBoundingClientRect();
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX - parentRect.left + 12}px`;
    tooltip.style.top = `${event.clientY - parentRect.top + 12}px`;
  };

  mainPie.onmouseleave = () => {
    tooltip.style.display = 'none';
  };
}

function aggregateItems(transactions, categoryKey) {
  const map = new Map();
  (transactions || []).forEach((txn) => {
    const category = categoryKey ? (txn[categoryKey] || 'OTHER') : '';
    const key = `${txn.itemName || 'N/A'}::${category}`;
    const current = map.get(key) || {
      name: txn.itemName || 'N/A',
      quantity: 0,
      revenue: 0
    };
    current.quantity += Number(txn.quantity) || 0;
    current.revenue += Number(txn.amount) || 0;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRevenueLeaderboard(tbodyId, items, maxRows = 10, options = {}) {
  const tbody = typeof tbodyId === 'string' ? document.getElementById(tbodyId) : tbodyId;
  if (!tbody) return;

  const sourceRows = Array.isArray(items) ? items : [];
  const filteredRows = options.onlyVip
    ? sourceRows.filter((item) => Boolean(item.isVipByPurchasedHours || item.isVipByHours))
    : sourceRows;
  const rows = filteredRows.slice(0, maxRows);
  if (rows.length === 0) {
    tbody.innerHTML = options.onlyVip
      ? '<tr><td colspan="4" style="text-align:center;padding:20px;">Chưa có khách đạt VIP.</td></tr>'
      : '<tr><td colspan="4" style="text-align:center;padding:20px;">Chưa có dữ liệu xếp hạng.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((item, idx) => {
    const rank = Number(item.rank) || (idx + 1);
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    return `
      <tr>
        <td><span class="rank-chip ${rankClass}">#${rank}</span></td>
        <td>${customerDisplayName(item)}</td>
        <td style="font-weight:700;color:#16a34a;">${formatCurrency(Number(item.revenue) || 0)}</td>
        <td>${Number(item.totalPurchasedHours ?? item.totalHoursUsed ?? 0).toFixed(2)}h</td>
      </tr>
    `;
  }).join('');
}

function renderReportDailyTable() {
  const tbody = document.getElementById('reportTbody');
  const paginationEl = document.getElementById('reportDailyPagination');
  if (!tbody) return;

  const dailyRows = reportDailyCache;
  if (dailyRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Không có doanh thu trong tháng đã chọn.</td></tr>`;
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / REPORT_DAILY_PAGE_SIZE));
  currentReportDailyPage = Math.max(1, Math.min(currentReportDailyPage, totalPages));
  const start = (currentReportDailyPage - 1) * REPORT_DAILY_PAGE_SIZE;
  const pagedRows = dailyRows.slice(start, start + REPORT_DAILY_PAGE_SIZE);

  if (!currentReportSelectedDate || !pagedRows.some((d) => d.date === currentReportSelectedDate)) {
    currentReportSelectedDate = pagedRows[0]?.date || null;
  }

  tbody.innerHTML = pagedRows.map((day) => {
    const topItems = (day.topItems || [])
      .map((it) => `${it.name} x${it.qty}`)
      .join(' • ');

    return `
      <tr class="report-day-row ${day.date === currentReportSelectedDate ? 'is-selected' : ''}" data-day="${day.date}">
        <td style="font-weight:600">${formatDate(day.date)}</td>
        <td style="font-weight:800;color:#16a34a;">${formatCurrency(day.totalRevenue)}</td>
        <td>${day.transactionCount}</td>
        <td>${formatCurrency(day.serviceRevenue)}</td>
        <td>${formatCurrency(day.packageRevenue)}</td>
        <td><span class="report-inline-list">${topItems || 'Không có chi tiết'}</span></td>
      </tr>
    `;
  }).join('');

  const rowByDate = new Map(dailyRows.map((d) => [d.date, d]));
  tbody.querySelectorAll('.report-day-row').forEach((row) => {
    row.addEventListener('click', () => {
      currentReportSelectedDate = row.dataset.day;
      currentReportDetailPage = 1;
      renderReportDailyTable();
      renderReportDetail(rowByDate.get(row.dataset.day));
    });
  });

  renderReportDailyPagination(totalPages);
}

function renderReportDetail(day) {
  const title = document.getElementById('reportDetailTitle');
  const tbody = document.getElementById('reportDetailTbody');
  const paginationEl = document.getElementById('reportDetailPagination');
  if (!tbody || !title) return;

  if (!day) {
    title.textContent = 'Chi tiết giao dịch theo ngày';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Không có dữ liệu.</td></tr>`;
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  title.textContent = `Chi tiết ngày ${formatDate(day.date)} - ${formatCurrency(day.totalRevenue)}`;

  const txns = [...day.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPages = Math.max(1, Math.ceil(txns.length / REPORT_DETAIL_PAGE_SIZE));
  currentReportDetailPage = Math.max(1, Math.min(currentReportDetailPage, totalPages));
  const start = (currentReportDetailPage - 1) * REPORT_DETAIL_PAGE_SIZE;
  const pagedTxns = txns.slice(start, start + REPORT_DETAIL_PAGE_SIZE);

  if (pagedTxns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Không có giao dịch trong ngày này.</td></tr>`;
    renderReportDetailPagination(totalPages);
    return;
  }

  tbody.innerHTML = pagedTxns.map((txn) => `
    <tr>
      <td>${formatDateTime(txn.date)}</td>
      <td>${customerDisplayName(txn)}</td>
      <td>${txn.itemName} x${txn.quantity}</td>
      <td><span class="badge ${txn.itemType === 'PACKAGE' ? 'badge-warning' : (txn.itemType === 'SERVICE' ? 'badge-info' : 'badge-danger')}">${trans(txn.itemType)}</span></td>
      <td><span class="badge ${txn.method === 'LEGACY' ? 'badge-warning' : 'badge-info'}">${trans(txn.method)}</span></td>
      <td style="font-weight:700;color:#16a34a;">${formatCurrency(txn.amount)}</td>
    </tr>
  `).join('');

  renderReportDetailPagination(totalPages);
}

function renderReportDailyPagination(totalPages) {
  const paginationEl = document.getElementById('reportDailyPagination');
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`<button class="orders-page-btn ${page === currentReportDailyPage ? 'active' : ''}" onclick="gotoReportDailyPage(${page})">${page}</button>`);
  }

  paginationEl.innerHTML = `
    <button class="orders-page-btn" onclick="gotoReportDailyPage(${currentReportDailyPage - 1})" ${currentReportDailyPage === 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pages.join('')}
    <button class="orders-page-btn" onclick="gotoReportDailyPage(${currentReportDailyPage + 1})" ${currentReportDailyPage === totalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

function renderReportDetailPagination(totalPages) {
  const paginationEl = document.getElementById('reportDetailPagination');
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`<button class="orders-page-btn ${page === currentReportDetailPage ? 'active' : ''}" onclick="gotoReportDetailPage(${page})">${page}</button>`);
  }

  paginationEl.innerHTML = `
    <button class="orders-page-btn" onclick="gotoReportDetailPage(${currentReportDetailPage - 1})" ${currentReportDetailPage === 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pages.join('')}
    <button class="orders-page-btn" onclick="gotoReportDetailPage(${currentReportDetailPage + 1})" ${currentReportDetailPage === totalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

function renderReportDetailByDate(date) {
  const rowByDate = new Map(reportDailyCache.map((d) => [d.date, d]));
  renderReportDetail(rowByDate.get(date));
}

window.gotoReportDailyPage = function (page) {
  const totalPages = Math.max(1, Math.ceil(reportDailyCache.length / REPORT_DAILY_PAGE_SIZE));
  currentReportDailyPage = Math.max(1, Math.min(page, totalPages));

  const start = (currentReportDailyPage - 1) * REPORT_DAILY_PAGE_SIZE;
  const pagedRows = reportDailyCache.slice(start, start + REPORT_DAILY_PAGE_SIZE);
  currentReportSelectedDate = pagedRows[0]?.date || null;
  currentReportDetailPage = 1;

  renderReportDailyTable();
  renderReportDetailByDate(currentReportSelectedDate);
};

window.gotoReportDetailPage = function (page) {
  const day = reportDailyCache.find((d) => d.date === currentReportSelectedDate);
  const txns = day?.transactions || [];
  const totalPages = Math.max(1, Math.ceil(txns.length / REPORT_DETAIL_PAGE_SIZE));
  currentReportDetailPage = Math.max(1, Math.min(page, totalPages));
  renderReportDetail(day);
};

// Initial calls
loadDashboard();
