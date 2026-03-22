// ===== SERVICES MODULE =====

import { getServices, createService, updateService, deleteService, generateId } from './data.js';
import { formatCurrency } from './utils.js';
import { showToast } from './toast.js';

export function initServices() {
  void renderServices();
  bindEvents();
}

async function renderServices(filter = 'all') {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

  let services = await getServices();
  if (filter !== 'all') services = services.filter(s => s.category === filter);

  if (services.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-concierge-bell"></i><p>Chưa có dịch vụ nào</p></div>`;
    return;
  }

  grid.innerHTML = services.map(s => {
    const catIcon = s.category === 'drink' ? 'fa-mug-saucer' : s.category === 'food' ? 'fa-burger' : 'fa-star';
    const catLabel = s.category === 'drink' ? 'Đồ uống' : s.category === 'food' ? 'Đồ ăn' : 'Khác';
    const catClass = s.category === 'drink' ? 'badge-drink' : s.category === 'food' ? 'badge-food' : 'badge-info';
    return `
      <div class="service-card ${s.available ? '' : 'service-unavailable'}">
        <div class="service-card-icon"><i class="fa-solid ${catIcon}"></i></div>
        <div class="service-card-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <h4 style="font-size:15px;font-weight:600">${s.name}</h4>
            <span class="badge ${catClass}">${catLabel}</span>
          </div>
          ${s.description ? `<p class="text-sm text-muted" style="margin-top:4px">${s.description}</p>` : ''}
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:17px;font-weight:700;color:var(--primary-color)">${formatCurrency(s.price)} <span class="text-sm text-muted font-400">/${s.unit}</span></span>
            <span class="badge ${s.available ? 'badge-active' : 'badge-inactive'}">${s.available ? 'Có sẵn' : 'Hết hàng'}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="action-btn" onclick="editService('${s.id}')"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button class="action-btn ${s.available ? '' : 'fill'}" onclick="toggleService('${s.id}')">
              <i class="fa-solid fa-toggle-${s.available ? 'on' : 'off'}"></i> ${s.available ? 'Ẩn' : 'Hiện'}
            </button>
            <button class="action-btn danger" onclick="deleteServiceItem('${s.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const allServices = await getServices();
  const countEl = document.getElementById('serviceCount');
  if (countEl) countEl.textContent = `${allServices.length} dịch vụ`;
}

function bindEvents() {
  document.getElementById('btnAddService')?.addEventListener('click', () => void openModal(null));
  document.getElementById('serviceModalClose')?.addEventListener('click', closeModal);
  document.getElementById('serviceModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('serviceForm')?.addEventListener('submit', (e) => void handleSubmit(e));
  document.getElementById('serviceModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'serviceModalOverlay') closeModal();
  });

  document.querySelectorAll('.service-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.service-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      void renderServices(btn.dataset['filter'] ?? 'all');
    });
  });
}

async function openModal(serviceId) {
  console.log('Opening service modal for:', serviceId);
  const overlay = document.getElementById('serviceModalOverlay');
  const title = document.getElementById('serviceModalTitle');
  const form = document.getElementById('serviceForm');
  console.log('Elements:', { overlay: !!overlay, title: !!title, form: !!form });
  if (!overlay || !form) {
    console.error('Modal elements not found!');
    return;
  }
  form.reset();
  const hiddenId = document.getElementById('serviceEditId');
  if (hiddenId) hiddenId.value = serviceId ?? '';

  if (serviceId) {
    const services = await getServices();
    const s = services.find(s => s.id === serviceId);
    if (!s) return;
    if (title) title.textContent = 'Chỉnh sửa dịch vụ';
    setValue('serviceName', s.name);
    setValue('servicePrice', String(s.price));
    setValue('serviceUnit', s.unit);
    setValue('serviceCategory', s.category);
    setValue('serviceDescription', s.description ?? '');
    document.getElementById('serviceAvailable').checked = s.available;
  } else {
    if (title) title.textContent = 'Thêm dịch vụ mới';
    document.getElementById('serviceAvailable').checked = true;
  }
  overlay.classList.remove('hidden');
  console.log('Modal should be visible now');
}

function closeModal() {
  document.getElementById('serviceModalOverlay')?.classList.add('hidden');
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('serviceEditId')?.value;
  const name = getValue('serviceName');
  const price = parseInt(getValue('servicePrice'));
  const unit = getValue('serviceUnit') || 'cái';
  const category = getValue('serviceCategory');
  const description = getValue('serviceDescription');
  const available = document.getElementById('serviceAvailable')?.checked ?? true;

  if (!name || isNaN(price) || price <= 0) {
    showToast('Vui lòng nhập đầy đủ thông tin hợp lệ.', 'error');
    return;
  }

  if (id) {
    await updateService(id, { name, price, unit, category, description, available });
    showToast('Cập nhật dịch vụ thành công!', 'success');
  } else {
    await createService({ id: generateId('sv'), name, price, unit, category, description, available });
    showToast('Thêm dịch vụ thành công!', 'success');
  }
  closeModal();
  void renderServices();
}

window.editService = (id) => void openModal(id);

window.toggleService = (id) => {
  void (async () => {
    const services = await getServices();
    const s = services.find(s => s.id === id);
    if (!s) return;
    await updateService(id, { available: !s.available });
    void renderServices();
  })();
};

window.deleteServiceItem = (id) => {
  if (!confirm('Xác nhận xóa dịch vụ này?')) return;
  void (async () => {
    await deleteService(id);
    void renderServices();
    showToast('Đã xóa dịch vụ.', 'warning');
  })();
};

function getValue(id) {
  return document.getElementById(id)?.value.trim() ?? '';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
