// ===== ROUTER (SPA) =====

const callbacks = {};

export function onSection(id, cb) {
  callbacks[id] = cb;
}

export function navigate(id) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show target section
  const target = document.getElementById(`section-${id}`);
  if (target) target.classList.add('active');

  // Update sidebar active state
  document.querySelectorAll('.menu-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset['section'] === id);
  });

  // Update page title
  const titles = {
    dashboard: 'Tổng quan hệ thống',
    customers: 'Quản lý khách hàng',
    checkin: 'Check-in / Check-out',
    orders: 'Quản lý yêu cầu dịch vụ',
    services: 'Quản lý dịch vụ',
    packages: 'Quản lý gói giờ',
    reports: 'Báo cáo doanh thu',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[id];

  // Update hash
  location.hash = id;

  // Run section callback
  const cb = callbacks[id];
  if (cb) cb();
}

export function initRouter() {
  // Read initial hash
  const hash = location.hash.replace('#', '');
  const validSections = ['dashboard', 'customers', 'checkin', 'orders', 'services', 'packages', 'reports'];
  const initial = validSections.includes(hash) ? hash : 'dashboard';
  navigate(initial);
}
