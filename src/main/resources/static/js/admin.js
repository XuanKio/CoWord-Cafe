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
let allServicesMap = {};
let allPackagesMap = {};

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

window.logout = function () {
  localStorage.removeItem('user');
  window.location.href = '/login.html';
};


// ===== DASHBOARD =====
window.loadDashboard = async function () {
  try {
    const [sessions, customers, requests, payments] = await Promise.all([
      apiRequest('/sessions'),
      apiRequest('/customers'),
      apiRequest('/requests'),
      apiRequest('/payments')
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
                <div style="font-weight:600; font-size:14px; color:var(--text-main)">${s.customerName || c.name || 'N/A'} - ${c.phone || ''}</div>
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
              <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><strong>${r.customerName || 'N/A'}</strong></td>
              <td style="padding:10px; border-bottom:1px solid #f1f5f9; color:#f59e0b;">${r.serviceName || r.packageName || 'Yêu cầu'} x ${r.quantity}</td>
              <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:right;">
                <button class="btn-primary btn-sm" onclick="approveOrder(${r.serviceRequestsId})">Duyệt</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    }

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
                <strong style="color:var(--text-main); font-size:14px;">${s.customerName || c.name || 'N/A'}</strong>
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
  const phone = document.getElementById('checkinPhone').value.trim();
  const resContainer = document.getElementById('checkinResult');

  if (!phone) {
    alert("Vui lòng nhập SĐT !");
    return;
  }
  resContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

  try {
    const customers = await apiRequest('/customers');
    const found = customers.find(c => c.phone === phone);

    if (found) {
      resContainer.innerHTML = `
        <div style="background:var(--white); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="font-size:16px; margin-bottom:4px;">${found.name}</h4>
            <span class="badge badge-info">Giờ còn lại: ${found.remainingHours}h</span>
          </div>
          <button class="btn-primary" onclick="doCheckIn(${found.usersId})"><i class="fa-solid fa-sign-in-alt"></i> CHECK-IN NGAY</button>
        </div>
      `;
    } else {
      resContainer.innerHTML = `
        <div class="empty-state" style="padding:20px">
          <i class="fa-solid fa-user-xmark" style="color:#ef4444; margin-bottom:10px;"></i>
          <p style="color:#dc2626; font-weight:600;">Không tìm thấy khách hàng với SĐT này</p>
          <p style="font-size:13px; color:#666; margin-top:5px;">Vui lòng thêm tài khoản bên phần Quản lý Khách hàng nếu khách chưa có.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
});

window.doCheckIn = async function (usersId) {
  try {
    await apiRequest('/sessions/checkin', {
      method: 'POST',
      body: JSON.stringify({ usersId: parseInt(usersId) })
    });
    alert("Check-in thành công!");
    document.getElementById('checkinPhone').value = '';
    document.getElementById('checkinResult').innerHTML = `<div class="empty-state"><p>Đã check-in thành công. Tìm KH khác.</p></div>`;
    loadCheckinSection();
    loadDashboard();
  } catch (err) {
    alert('Lỗi Check-in: Khách hàng có thể đang checkin rồi hoặc không đủ giờ.');
  }
}

window.doCheckOut = async function (sessionId) {
  if (!confirm('Xác nhận thiết lập trạng thái Check-out cho khách này?')) return;
  try {
    await apiRequest(`/sessions/${sessionId}/checkout`, { method: 'PUT' });
    if (document.getElementById('section-checkin').classList.contains('active')) loadCheckinSection();
    loadDashboard();
  } catch (e) {
    alert('Check-out thất bại: ' + e.message);
  }
}


// ===== CUSTOMERS SECTION =====
window.loadCustomers = async function () {
  try {
    const customers = await apiRequest('/customers');
    const tbody = document.getElementById('customerTbody');
    document.getElementById('customerCount').textContent = `(${customers.length})`;

    customers.forEach(c => allCustomersMap[c.usersId] = c);

    if (customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">Chưa có khách.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>#${c.usersId}</td>
        <td>
          <div style="font-weight:600; color:var(--text-main)">${c.name}</div>
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
  } catch (err) { console.error(err); }
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
  if (!hours || hours <= 0) return alert("Vui lòng nhập số giờ hợp lệ (> 0)");

  try {
    await apiRequest(`/customers/${id}/add-hours`, {
      method: 'PATCH',
      body: JSON.stringify({ hours: hours, note: 'Nạp thủ công' })
    });
    alert("Nạp giờ thành công!");
    closeModal('addHoursModalOverlay');
    loadCustomers();
  } catch (e) {
    alert("Nạp giờ thất bại: " + e.message);
  }
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
  if (!confirm('Xác nhận xóa khách hàng này?')) return;
  try {
    await apiRequest(`/customers/${id}`, { method: 'DELETE' });
    loadCustomers();
    loadDashboard();
  } catch (e) { alert('Lỗi: ' + e.message); }
}

window.saveCustomer = async function () {
  const id = document.getElementById('customerEditId').value;
  const name = document.getElementById('customerName').value;
  const phone = document.getElementById('customerPhone').value;
  const pw = document.getElementById('customerPassword').value;
  const status = document.getElementById('customerStatus').value;

  if (!name || !phone) return alert("Vui lòng điền họ tên và số điện thoại.");
  if (!id && !pw) return alert("Tài khoản mới phải cấp mật khẩu (mặc định 123456)");

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
    alert("Lưu khách hàng thành công!");
    closeModal('customerModalOverlay');
    loadCustomers();
  } catch (e) {
    alert("Có lỗi xảy ra: " + e.message);
  }
}

// Hàm tìm kiếm khách hàng bằng input
window.filterCustomerList = function () {
  const searchTxt = (document.getElementById('searchInputCustomer').value || '').toLowerCase();
  const rows = document.querySelectorAll('#customerTbody tr');
  rows.forEach(row => {
    // skip the empty state row
    if (row.cells.length < 3) return;
    const name = row.cells[1].textContent.toLowerCase();
    const phone = row.cells[2].textContent.toLowerCase();
    if (name.includes(searchTxt) || phone.includes(searchTxt)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
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
  if (!confirm('Xác nhận xóa món này khỏi hệ thống?')) return;
  try {
    await apiRequest(`/menu/${id}`, { method: 'DELETE' });
    loadServices();
  } catch (e) { alert('Lỗi: ' + e.message); }
}

window.saveService = async function () {
  const id = document.getElementById('serviceEditId').value;
  const name = document.getElementById('serviceName').value;
  const type = document.getElementById('serviceType').value;
  const price = document.getElementById('servicePrice').value;
  if (!name || !price) return alert("Vui lòng nhập đầy đủ tên và giá");

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
    loadServices();
  } catch (e) { alert('Lỗi: ' + e.message); }
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
        <div class="package-card package-popular">
          <div class="package-badge-popular" style="background:#ef4444;"><i class="fa-solid fa-fire"></i> HOT</div>
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
  if (!confirm('Xác nhận xóa gói giờ này?')) return;
  try {
    await apiRequest(`/packages/${id}`, { method: 'DELETE' });
    loadPackages();
  } catch (e) { alert('Lỗi: ' + e.message); }
}

window.savePackage = async function () {
  const id = document.getElementById('packageEditId').value;
  const name = document.getElementById('packageName').value;
  const hours = document.getElementById('packageHours').value;
  const price = document.getElementById('packagePrice').value;
  if (!name || !hours || !price) return alert("Vui lòng nhập đủ tên, số giờ và giá");

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
    loadPackages();
  } catch (e) { alert('Lỗi: ' + e.message); }
}

// ===== ORDERS (REQUESTS) SECTION =====
window.loadOrders = async function () {
  try {
    const requests = await apiRequest('/requests');
    const grid = document.getElementById('ordersGrid');

    // Sort array descending created at
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let pendingCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;

    requests.forEach(r => {
      if (r.status === 'PENDING') pendingCount++;
      else if (r.status === 'PAID' || r.status === 'APPROVED') paidCount++;
      else if (r.status === 'CANCELLED') cancelledCount++;
    });

    document.getElementById('orderCountAll').innerText = requests.length;
    document.getElementById('orderCountPending').innerText = pendingCount;
    document.getElementById('orderCountPaid').innerText = paidCount;
    document.getElementById('orderCountCancel').innerText = cancelledCount;

    document.getElementById('orderCount').textContent = `Hiển thị lịch sử các order dịch vụ`;

    if (requests.length === 0) {
      grid.innerHTML = `<div class="orders-empty"><i class="fa-solid fa-bell-slash"></i><p>Chưa có yêu cầu nào trên hệ thống.</p></div>`;
      return;
    }

    grid.innerHTML = requests.map(r => {
      let cardClass = '';
      if (r.status === 'PENDING') cardClass = 'order-card--pending';
      else if (r.status === 'APPROVED' || r.status === 'PAID') cardClass = 'order-card--paid';
      else cardClass = 'order-card--rejected';

      const icon = r.serviceName ? 'fa-mug-hot' : 'fa-ticket';
      const name = r.serviceName || r.packageName || 'Yêu cầu';

      let statusVietnamese = trans(r.status);

      return `
        <div class="order-card ${cardClass}" data-status="${r.status}" style="flex-direction:row; align-items:center; padding:12px 16px; flex-wrap:wrap; gap:16px;">
          <!-- User info -->
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:200px;">
            <div class="order-card__avatar" style="margin:0;"><i class="fa-solid fa-user"></i></div>
            <div>
              <div class="order-card__name">${r.customerName || 'N/A'}</div>
              <div class="order-card__time" style="margin-top:2px"><i class="fa-regular fa-clock"></i> ${formatDateTime(r.createdAt)}</div>
            </div>
          </div>
          
          <!-- Service info -->
          <div style="flex:1.5; display:flex; align-items:center; gap:12px; min-width:250px;">
             <div style="width:36px; height:36px; border-radius:8px; background:var(--bg-color); display:flex; align-items:center; justify-content:center; color:var(--accent-color); font-size:16px;">
               <i class="fa-solid ${icon}"></i>
             </div>
             <div>
               <div style="font-weight:600; font-size:14px; color:var(--text-main);">${name} <span style="font-weight:500; color:var(--text-muted);">x${r.quantity}</span></div>
               <div style="font-weight:700; color:var(--accent-color); font-size:14px; margin-top:2px;">${formatCurrency(r.totalPrice)}</div>
             </div>
          </div>
          
          <!-- Status -->
          <div style="width: 120px; text-align:center;">
             <span class="badge ${r.status === 'PENDING' ? 'badge-warning' : (r.status === 'APPROVED' || r.status === 'PAID' ? 'badge-success' : 'badge-danger')}">
               ${statusVietnamese}
             </span>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:8px; justify-content:flex-end; flex:1; min-width:200px;">
            ${r.status === 'PENDING' ? `
              ${r.packageName ? `
                <button class="btn-primary btn-sm" style="padding:6px 12px; background:#16a34a; border-color:#16a34a;" onclick="approveOrder(${r.serviceRequestsId})" title="Duyệt và nạp số giờ của gói này trực tiếp"><i class="fa-solid fa-bolt"></i> Nạp giờ</button>
              ` : `
                <button class="btn-primary btn-sm" style="padding:6px 12px;" onclick="approveOrder(${r.serviceRequestsId})" title="Duyệt / Tính Tiền"><i class="fa-solid fa-check"></i> Duyệt</button>
              `}
              <button class="btn-danger btn-sm" style="padding:6px 12px; background:#fee2e2; color:#b91c1c;" onclick="cancelOrder(${r.serviceRequestsId})" title="Hủy bỏ request này"><i class="fa-solid fa-xmark"></i> Huỷ</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Activate All filter on render
    const allTabBtn = document.querySelector('.orders-tab-btn');
    if (allTabBtn) filterOrderList('ALL', allTabBtn);

  } catch (err) { console.error(err); }
};

window.filterOrderList = function (status, btnElement) {
  // update active tab styling
  document.querySelectorAll('.orders-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  // filtering logic
  const cards = document.querySelectorAll('.order-card');
  let emptyState = document.querySelector('.orders-empty');
  if (emptyState) return;

  cards.forEach(card => {
    let cardStatus = card.getAttribute('data-status');
    if (status === 'ALL') {
      card.style.display = 'flex';
    } else {
      if (status === 'PENDING' && cardStatus === 'PENDING') {
        card.style.display = 'flex';
      }
      else if (status === 'PAID' && (cardStatus === 'PAID' || cardStatus === 'APPROVED')) {
        card.style.display = 'flex';
      }
      else if (status === 'CANCELLED' && cardStatus === 'CANCELLED') {
        card.style.display = 'flex';
      }
      else {
        card.style.display = 'none';
      }
    }
  });
}

window.approveOrder = async function (id) {
  if (confirm('Xác nhận đã thanh toán? Mọi giao dịch sẽ được ghi nhận. Hệ thống đang tính toán...')) {
    try {
      const resp = await apiRequest(`/requests/${id}/approve`, { method: 'PATCH' });

      // Nếu có giá tiền > 0, tự động ghi nhận doanh thu vào bảng Payment
      if (resp && resp.request && resp.request.totalPrice > 0) {
        await apiRequest('/payments', {
          method: 'POST',
          body: JSON.stringify({
            serviceRequestsId: id,
            amount: resp.request.totalPrice,
            paymentMethod: 'CASH'
          })
        });
      }

      loadOrders();
      loadDashboard();
      if (document.getElementById('section-reports')?.classList.contains('active')) loadReports();
    } catch (e) { alert(e.message); }
  }
}

window.cancelOrder = async function (id) {
  if (confirm('Xác nhận từ chối/hủy yêu cầu? Khách hàng sẽ không bị trừ tiền.')) {
    try {
      await apiRequest(`/requests/${id}/cancel`, { method: 'PATCH' });
      loadOrders();
    } catch (e) { alert(e.message); }
  }
}

// ===== REPORTS SECTION =====
window.loadReports = async function () {
  try {
    const monthFilter = document.getElementById('reportMonthFilter');
    const monthLabel = document.getElementById('reportMonthLabel');

    if (monthFilter && !monthFilter.dataset.bound) {
      monthFilter.addEventListener('change', () => loadReports());
      monthFilter.dataset.bound = '1';
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthFilter && !monthFilter.value) monthFilter.value = currentMonth;

    const selectedMonth = monthFilter?.value || currentMonth;
    const report = await apiRequest(`/reports/transactions?month=${encodeURIComponent(selectedMonth)}`);

    if (monthLabel) {
      const [year, month] = selectedMonth.split('-');
      monthLabel.textContent = `Tháng ${month}/${year}`;
    }

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
          quantity: Number(txn.quantity) || 1
        }))
        : []
    }));

    document.getElementById('reportTotalRevenue').textContent = formatCurrency(Number(summary.totalRevenue) || 0);
    document.getElementById('reportTotalTransactions').textContent = Number(summary.totalTransactions) || 0;
    document.getElementById('reportActiveDays').textContent = Number(summary.activeDays) || 0;

    renderReportDailyTable(dailyRows);
    renderReportDetail(dailyRows[0]);

  } catch (err) { console.error(err); }
};

function renderReportDailyTable(dailyRows) {
  const tbody = document.getElementById('reportTbody');
  if (!tbody) return;

  if (dailyRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Không có doanh thu trong tháng đã chọn.</td></tr>`;
    return;
  }

  tbody.innerHTML = dailyRows.map((day, index) => {
    const topItems = (day.topItems || [])
      .map((it) => `${it.name} x${it.qty}`)
      .join(' • ');

    return `
      <tr class="report-day-row ${index === 0 ? 'is-selected' : ''}" data-day="${day.date}">
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
      tbody.querySelectorAll('.report-day-row').forEach((r) => r.classList.remove('is-selected'));
      row.classList.add('is-selected');
      renderReportDetail(rowByDate.get(row.dataset.day));
    });
  });
}

function renderReportDetail(day) {
  const title = document.getElementById('reportDetailTitle');
  const tbody = document.getElementById('reportDetailTbody');
  if (!tbody || !title) return;

  if (!day) {
    title.textContent = 'Chi tiết giao dịch theo ngày';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Không có dữ liệu.</td></tr>`;
    return;
  }

  title.textContent = `Chi tiết ngày ${formatDate(day.date)} - ${formatCurrency(day.totalRevenue)}`;

  const txns = [...day.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = txns.map((txn) => `
    <tr>
      <td>${formatDateTime(txn.date)}</td>
      <td>${txn.customerName || 'N/A'}</td>
      <td>${txn.itemName} x${txn.quantity}</td>
      <td><span class="badge ${txn.itemType === 'PACKAGE' ? 'badge-warning' : (txn.itemType === 'SERVICE' ? 'badge-info' : 'badge-danger')}">${trans(txn.itemType)}</span></td>
      <td><span class="badge ${txn.method === 'LEGACY' ? 'badge-warning' : 'badge-info'}">${trans(txn.method)}</span></td>
      <td style="font-weight:700;color:#16a34a;">${formatCurrency(txn.amount)}</td>
    </tr>
  `).join('');
}

// Initial calls
loadDashboard();
