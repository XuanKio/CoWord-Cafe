// ===== PACKAGES MODULE =====

import { getPackages, createPackage, updatePackage, deletePackage, getPackageSales, createPackageSale, getCustomers, saveCustomer, generateId } from './data.js';
import { formatCurrency, formatTime, formatDate, generateAvatar } from './utils.js';
import { showToast } from './toast.js';

export function initPackages() {
  console.log('initPackages called');
  void renderPackages();
  void renderPackageHistory();
  bindEvents();
  console.log('initPackages completed, window.editPackage:', typeof window.editPackage);
}

async function renderPackages() {
  const grid = document.getElementById('packagesGrid');
  if (!grid) return;
  grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

  const packages = await getPackages();
  grid.innerHTML = packages.map(p => `
    <div class="package-card ${p.popular ? 'package-popular' : ''}">
      ${p.popular ? '<div class="package-badge-popular"><i class="fa-solid fa-fire"></i> Phổ biến</div>' : ''}
      <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">${p.name}</h3>
      <div style="font-size:28px;font-weight:800;color:var(--primary-color);margin:10px 0">${formatCurrency(p.price)}</div>
      <div class="text-muted text-sm" style="margin-bottom:14px">${formatTime(p.totalMinutes)}</div>
      ${p.description ? `<p class="text-sm" style="margin-bottom:16px;color:var(--text-muted)">${p.description}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:auto">
        <button class="btn-primary" style="flex:1" onclick="openSellPackage('${p.id}')">
          <i class="fa-solid fa-shopping-cart"></i> Bán gói
        </button>
        <button class="action-btn" onclick="editPackage('${p.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="action-btn danger" onclick="deletePackageItem('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

async function renderPackageHistory() {
  const tbody = document.getElementById('packageHistoryTbody');
  if (!tbody) return;

  const sales = (await getPackageSales())
    .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime())
    .slice(0, 20);

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">Chưa có lịch sử bán gói</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="avatar avatar-sm">${generateAvatar(s.customerName)}</div>
          <span style="font-weight:500">${s.customerName}</span>
        </div>
      </td>
      <td>${s.packageName}</td>
      <td>${formatTime(s.minutesBought)}</td>
      <td style="font-weight:600">${formatCurrency(s.pricePaid)}</td>
      <td class="text-muted">${formatDate(s.soldAt)}</td>
    </tr>
  `).join('');
}

function bindEvents() {
  document.getElementById('btnAddPackage')?.addEventListener('click', () => void openPackageModal(null));
  document.getElementById('packageModalClose')?.addEventListener('click', closePackageModal);
  document.getElementById('packageModalCancel')?.addEventListener('click', closePackageModal);
  document.getElementById('packageForm')?.addEventListener('submit', (e) => void handlePackageSubmit(e));
  document.getElementById('packageModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'packageModalOverlay') closePackageModal();
  });
  document.getElementById('sellPackageClose')?.addEventListener('click', closeSellModal);
  document.getElementById('sellPackageCancel')?.addEventListener('click', closeSellModal);
  document.getElementById('sellPackageForm')?.addEventListener('submit', (e) => void handleSellSubmit(e));
  document.getElementById('sellPackageOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'sellPackageOverlay') closeSellModal();
  });
}

async function openPackageModal(packageId) {
  console.log('Opening package modal for:', packageId);
  const overlay = document.getElementById('packageModalOverlay');
  const title = document.getElementById('packageModalTitle');
  const form = document.getElementById('packageForm');
  console.log('Elements:', { overlay: !!overlay, title: !!title, form: !!form });
  if (!overlay || !form) {
    console.error('Modal elements not found!');
    return;
  }
  console.log('Before form.reset()');
  form.reset();
  console.log('After form.reset()');
  const hiddenId = document.getElementById('packageEditId');
  if (hiddenId) hiddenId.value = packageId ?? '';
  if (packageId) {
    console.log('Fetching package data for id:', packageId);
    const packages = await getPackages();
    console.log('Got packages:', packages.length);
    const p = packages.find(p => p.id === packageId);
    console.log('Found package:', p);
    if (!p) {
      console.error('Package not found!');
      return;
    }
    if (title) title.textContent = 'Chỉnh sửa gói giờ';
    setValue('packageName', p.name);
    setValue('packageMinutes', String(p.totalMinutes));
    setValue('packagePrice', String(p.price));
    setValue('packageDescription', p.description ?? '');
    document.getElementById('packagePopular').checked = p.popular ?? false;
  } else {
    if (title) title.textContent = 'Thêm gói giờ mới';
  }
  console.log('Before removing hidden class');
  overlay.classList.remove('hidden');
  console.log('After removing hidden class');
  console.log('Package modal should be visible now');
  console.log('Overlay classes:', overlay.className);
  console.log('Overlay display style:', window.getComputedStyle(overlay).display);
}

function closePackageModal() {
  document.getElementById('packageModalOverlay')?.classList.add('hidden');
}

async function handlePackageSubmit(e) {
  e.preventDefault();
  const id = getValue('packageEditId');
  const name = getValue('packageName');
  const totalMinutes = parseInt(getValue('packageMinutes'));
  const price = parseInt(getValue('packagePrice'));
  const description = getValue('packageDescription');
  const popular = document.getElementById('packagePopular')?.checked ?? false;

  if (!name || isNaN(totalMinutes) || isNaN(price)) {
    showToast('Vui lòng nhập đầy đủ thông tin.', 'error'); return;
  }

  if (id) {
    await updatePackage(id, { name, totalMinutes, price, description, popular });
    showToast('Cập nhật gói giờ thành công!', 'success');
  } else {
    await createPackage({ id: generateId('p'), name, totalMinutes, price, description, popular });
    showToast('Thêm gói giờ thành công!', 'success');
  }
  closePackageModal();
  void renderPackages();
}

window.openSellPackage = (packageId) => {
  void (async () => {
    const overlay = document.getElementById('sellPackageOverlay');
    if (!overlay) return;
    const packages = await getPackages();
    const p = packages.find(p => p.id === packageId);
    if (!p) return;

    setValue('sellPackageId', packageId);
    const pkgInfo = document.getElementById('sellPackageInfo');
    if (pkgInfo) pkgInfo.innerHTML = `
      <div style="background:var(--bg-color);padding:14px;border-radius:8px;margin-bottom:16px">
        <div style="font-weight:600">${p.name}</div>
        <div class="text-sm text-muted">${formatTime(p.totalMinutes)} · ${formatCurrency(p.price)}</div>
      </div>`;

    const select = document.getElementById('sellCustomerSelect');
    if (select) {
      const customers = await getCustomers();
      select.innerHTML = `<option value="">-- Chọn khách hàng --</option>` +
        customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
    }
    overlay.classList.remove('hidden');
  })();
};

function closeSellModal() {
  document.getElementById('sellPackageOverlay')?.classList.add('hidden');
}

async function handleSellSubmit(e) {
  e.preventDefault();
  const packageId = getValue('sellPackageId');
  const customerId = getValue('sellCustomerSelect');
  if (!packageId || !customerId) {
    showToast('Vui lòng chọn khách hàng.', 'error'); return;
  }

  const packages = await getPackages();
  const p = packages.find(p => p.id === packageId);
  const customers = await getCustomers();
  const customer = customers.find(c => c.id === customerId);
  if (!p || !customer) return;

  await saveCustomer({
    ...customer,
    remainingMinutes: customer.remainingMinutes + p.totalMinutes,
    totalMinutesBought: customer.totalMinutesBought + p.totalMinutes,
  });

  const newSale = {
    id: generateId('ps'),
    customerId,
    customerName: customer.name,
    packageId,
    packageName: p.name,
    minutesBought: p.totalMinutes,
    pricePaid: p.price,
    soldAt: new Date(),
  };
  await createPackageSale(newSale);

  showToast(`Đã bán ${p.name} cho ${customer.name}!`, 'success');
  closeSellModal();
  void renderPackageHistory();
}

window.editPackage = (id) => {
  console.log('editPackage called with id:', id);
  void openPackageModal(id);
};

window.deletePackageItem = (id) => {
  console.log('deletePackageItem called with id:', id);
  if (!confirm('Xác nhận xóa gói giờ này?')) return;
  void (async () => {
    await deletePackage(id);
    void renderPackages();
    showToast('Đã xóa gói giờ.', 'warning');
  })();
};

function getValue(id) {
  return document.getElementById(id)?.value.trim() ?? '';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
