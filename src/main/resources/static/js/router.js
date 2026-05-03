// ===== ROUTER (PATH-BASED) =====

const callbacks = {};
const ADMIN_BASE_PATH = '/app/admin';
const validSections = ['dashboard', 'customers', 'checkin', 'orders', 'services', 'packages', 'reports'];

export function onSection(id, cb) {
  callbacks[id] = cb;
}

function resolveSectionFromPath(pathname) {
  if (!pathname.startsWith(ADMIN_BASE_PATH)) return 'dashboard';
  const suffix = pathname.slice(ADMIN_BASE_PATH.length).replace(/^\/+/, '');
  return validSections.includes(suffix) ? suffix : 'dashboard';
}

function updatePath(id, replace = false) {
  const nextPath = `${ADMIN_BASE_PATH}/${id}`;
  if (window.location.pathname === nextPath) return;
  if (replace) history.replaceState(null, '', nextPath);
  else history.pushState(null, '', nextPath);
}

export function navigate(id, options = {}) {
  const { updateUrl = true, replaceUrl = false } = options;
  const section = validSections.includes(id) ? id : 'dashboard';

  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show target section
  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.add('active');

  // Update sidebar active state
  document.querySelectorAll('.menu-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset['section'] === section);
  });

  // Update page title
  const titles = {
    dashboard: 'Tong quan he thong',
    customers: 'Quan ly khach hang',
    checkin: 'Check-in / Check-out',
    orders: 'Quan ly yeu cau dich vu',
    services: 'Quan ly dich vu',
    packages: 'Quan ly goi gio',
    reports: 'Bao cao doanh thu',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[section];

  if (updateUrl) updatePath(section, replaceUrl);

  // Run section callback
  const cb = callbacks[section];
  if (cb) cb();
}

export function initRouter() {
  const initial = resolveSectionFromPath(window.location.pathname);
  navigate(initial, { updateUrl: true, replaceUrl: true });
  window.addEventListener('popstate', () => {
    const fromPath = resolveSectionFromPath(window.location.pathname);
    navigate(fromPath, { updateUrl: false });
  });
}
