// ===== APP ENTRY POINT =====

import { initData } from './data.js';
import { requireAuth, getAuthUser, logout, setAdminPassword, login } from './auth.js';
import { navigate, onSection, initRouter } from './router.js';
import { initDashboard } from './dashboard.js';
import { initCustomers, initAddHoursModal, initResetPasswordModal } from './customers.js';
import { initCheckin } from './checkin.js';
import { initServices } from './services.js';
import { initPackages } from './packages.js';
import { initReports } from './reports.js';
import { initOrders } from './orders.js';
import { showToast } from './toast.js';

// Init data (seed if first run)
initData();

// Guard: require login
requireAuth();

// Set admin name in topbar
const authUser = getAuthUser();
const adminNameEl = document.getElementById('adminName');
if (adminNameEl && authUser) adminNameEl.textContent = authUser.displayName;

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Bạn có chắc muốn đăng xuất?')) logout();
});

// Register section callbacks (lazy init - run once when section first opened)
const initialized = new Set();

function lazyInit(sectionId, fn) {
  onSection(sectionId, () => {
    if (!initialized.has(sectionId)) {
      fn();
      initialized.add(sectionId);
    } else {
      // Re-render on each visit for live data
      fn();
    }
  });
}

lazyInit('dashboard', initDashboard);
lazyInit('customers', initCustomers);
lazyInit('checkin', initCheckin);
lazyInit('orders', initOrders);
lazyInit('services', initServices);
lazyInit('packages', initPackages);
lazyInit('reports', initReports);

// Sidebar navigation
document.querySelectorAll('.menu-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset['section'];
    if (section) navigate(section);
  });
});

// Add hours modal (customers section)
initAddHoursModal();
initResetPasswordModal();

// Admin change password
initAdminChangePassword();

// Init router (reads hash and navigates)
initRouter();

function initAdminChangePassword() {
  const btn = document.getElementById('btnChangeAdminPassword');
  const overlay = document.getElementById('adminChangePasswordOverlay');
  const closeBtn = document.getElementById('adminChangePasswordClose');
  const cancelBtn = document.getElementById('adminChangePasswordCancel');
  const form = document.getElementById('adminChangePasswordForm');
  const errorEl = document.getElementById('adminPasswordError');

  btn?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
    if (errorEl) errorEl.style.display = 'none';
    form?.reset();
  });

  closeBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));
  cancelBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));
  overlay?.addEventListener('click', (e) => {
    if (e.target.id === 'adminChangePasswordOverlay') {
      overlay.classList.add('hidden');
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentPass = document.getElementById('adminCurrentPassword')?.value;
    const newPass = document.getElementById('adminNewPassword')?.value;
    const confirmPass = document.getElementById('adminConfirmPassword')?.value;

    if (!currentPass || !newPass || !confirmPass) {
      if (errorEl) {
        errorEl.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        errorEl.style.display = 'block';
      }
      return;
    }

    // Verify current password
    if (!login('admin', currentPass)) {
      if (errorEl) {
        errorEl.textContent = 'Mật khẩu hiện tại không đúng.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (newPass.length < 4) {
      if (errorEl) {
        errorEl.textContent = 'Mật khẩu mới phải có ít nhất 4 ký tự.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (errorEl) {
        errorEl.textContent = 'Xác nhận mật khẩu không khớp.';
        errorEl.style.display = 'block';
      }
      return;
    }

    setAdminPassword(newPass);
    showToast('Đổi mật khẩu thành công!', 'success');
    overlay?.classList.add('hidden');
    form.reset();
  });
}
