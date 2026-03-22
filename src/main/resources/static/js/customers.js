// ===== CUSTOMERS MODULE =====

import { getCustomers, saveCustomer, createCustomer, deleteCustomer, generateId } from './data.js';
import { formatTime, formatDate, formatPhone, generateAvatar } from './utils.js';
import { showToast } from './toast.js';
import { changeUserPassword } from './auth.js';

let searchQuery = '';

export function initCustomers() {
  void renderTable();
  bindEvents();
}

async function renderTable() {
  const tbody = document.getElementById('customerTbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>`;

  const customers = await getCustomers();
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Không tìm thấy khách hàng nào</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const statusColor = c.status === 'checkin'
      ? '#22c55e'
      : c.remainingMinutes <= 0
        ? '#dc2626'
        : '#3b82f6';

    return `
      <tr data-customer-id="${c.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar">${generateAvatar(c.name)}</div>
            <div>
              <div style="font-weight:600">${c.name}</div>
              <div class="text-sm text-muted">${formatPhone(c.phone)}</div>
            </div>
          </div>
        </td>
        <td>${formatTime(c.remainingMinutes)}</td>
        <td>${formatDate(c.createdAt)}</td>
        <td style="text-align:center">
          <div style="width:12px;height:12px;border-radius:50%;background:${statusColor};margin:0 auto;"
            title="${c.status === 'checkin' ? 'Đang ở quán' : c.remainingMinutes <= 0 ? 'Hết giờ' : 'Còn giờ'}"></div>
        </td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
            <button class="action-btn" data-action="edit" data-id="${c.id}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn fill" data-action="add-hours" data-id="${c.id}" title="Nạp giờ"><i class="fa-solid fa-bolt"></i></button>
            <button class="action-btn" data-action="reset-password" data-id="${c.id}" title="Đổi mật khẩu"><i class="fa-solid fa-key"></i></button>
            <button class="action-btn danger" data-action="delete" data-id="${c.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const countEl = document.getElementById('customerCount');
  if (countEl) countEl.textContent = `${filtered.length} khách hàng`;
}

function bindEvents() {
  const searchInput = document.getElementById('customerSearch');
  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    void renderTable();
  });

  document.getElementById('btnAddCustomer')?.addEventListener('click', () => void openModal(null));
  document.getElementById('customerModalClose')?.addEventListener('click', closeModal);
  document.getElementById('customerModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('customerForm')?.addEventListener('submit', (e) => void handleSubmit(e));
  document.getElementById('customerModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'customerModalOverlay') closeModal();
  });

  document.getElementById('customerTbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset['id'];
    if (!id) return;
    const action = btn.dataset['action'];
    if (action === 'edit') {
      void openModal(id);
    } else if (action === 'add-hours') {
      void (async () => {
        const customers = await getCustomers();
        const c = customers.find(c => c.id === id);
        if (c) openAddHoursModal(id, c.name);
      })();
    } else if (action === 'reset-password') {
      void (async () => {
        const customers = await getCustomers();
        const c = customers.find(c => c.id === id);
        if (c) openResetPasswordModal(id, c.name);
      })();
    } else if (action === 'delete') {
      if (!confirm('Xác nhận xóa khách hàng này?')) return;
      void (async () => {
        await deleteCustomer(id);
        void renderTable();
        showToast('Đã xóa khách hàng.', 'warning');
      })();
    }
  });
}

async function openModal(customerId) {
  const overlay = document.getElementById('customerModalOverlay');
  const title = document.getElementById('customerModalTitle');
  const form = document.getElementById('customerForm');
  if (!overlay || !form) return;

  form.reset();
  clearFormErrors(form);

  const hiddenId = document.getElementById('customerEditId');
  if (hiddenId) hiddenId.value = customerId ?? '';

  if (customerId) {
    const customers = await getCustomers();
    const c = customers.find(c => c.id === customerId);
    if (!c) return;
    if (title) title.textContent = 'Chỉnh sửa khách hàng';
    setValue('customerName', c.name);
    setValue('customerPhone', c.phone);
    setValue('customerNote', c.note ?? '');
  } else {
    if (title) title.textContent = 'Thêm khách hàng mới';
  }

  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('customerModalOverlay')?.classList.add('hidden');
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('customerEditId')?.value;
  const name = getValue('customerName');
  const phone = getValue('customerPhone');
  const note = getValue('customerNote');

  let valid = true;
  if (!name) { setError('customerName', 'Vui lòng nhập họ tên'); valid = false; }
  if (!phone || !/^0\d{9}$/.test(phone.replace(/\D/g, ''))) {
    setError('customerPhone', 'Số điện thoại không hợp lệ (10 chữ số)'); valid = false;
  }
  if (!valid) return;

  const cleanPhone = phone.replace(/\D/g, '');

  if (id) {
    const customers = await getCustomers();
    const existing = customers.find(c => c.id === id);
    if (!existing) return;
    await saveCustomer({ ...existing, name, phone: cleanPhone, note });
    showToast('Cập nhật khách hàng thành công!', 'success');
  } else {
    const customers = await getCustomers();
    if (customers.some(c => c.phone === cleanPhone)) {
      setError('customerPhone', 'Số điện thoại đã tồn tại trong hệ thống');
      return;
    }
    await createCustomer({
      id: generateId('c'),
      name,
      phone: cleanPhone,
      note,
      password: '1',
      remainingMinutes: 0,
      totalMinutesBought: 0,
      status: 'inactive',
    });
    showToast('Thêm khách hàng thành công!', 'success');
  }

  closeModal();
  void renderTable();
}

// ===== Add Hours Modal =====
function openAddHoursModal(customerId, customerName) {
  const overlay = document.getElementById('addHoursOverlay');
  if (!overlay) return;
  const label = document.getElementById('addHoursCustomerName');
  if (label) label.textContent = customerName;
  const hiddenId = document.getElementById('addHoursCustomerId');
  if (hiddenId) hiddenId.value = customerId;
  document.getElementById('addHoursMinutes').value = '';
  overlay.classList.remove('hidden');
}

export function initAddHoursModal() {
  document.getElementById('addHoursClose')?.addEventListener('click', () => {
    document.getElementById('addHoursOverlay')?.classList.add('hidden');
  });
  document.getElementById('addHoursCancel')?.addEventListener('click', () => {
    document.getElementById('addHoursOverlay')?.classList.add('hidden');
  });
  document.getElementById('addHoursForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('addHoursCustomerId')?.value;
    const minutes = parseInt(document.getElementById('addHoursMinutes')?.value ?? '0');
    if (!id || isNaN(minutes) || minutes <= 0) {
      showToast('Số phút không hợp lệ.', 'error');
      return;
    }
    void (async () => {
      const customers = await getCustomers();
      const c = customers.find(c => c.id === id);
      if (!c) return;
      await saveCustomer({
        ...c,
        remainingMinutes: c.remainingMinutes + minutes,
        totalMinutesBought: c.totalMinutesBought + minutes,
      });
      void renderTable();
      showToast(`Đã nạp ${minutes} phút cho ${c.name}!`, 'success');
      document.getElementById('addHoursOverlay')?.classList.add('hidden');
    })();
  });
  document.getElementById('addHoursOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'addHoursOverlay') {
      document.getElementById('addHoursOverlay')?.classList.add('hidden');
    }
  });
}

// ===== Reset Password Modal =====
function openResetPasswordModal(customerId, customerName) {
  const overlay = document.getElementById('resetPasswordOverlay');
  if (!overlay) return;
  const label = document.getElementById('resetPasswordCustomerName');
  if (label) label.textContent = customerName;
  const hiddenId = document.getElementById('resetPasswordCustomerId');
  if (hiddenId) hiddenId.value = customerId;
  document.getElementById('resetPasswordNew').value = '';
  document.getElementById('resetPasswordConfirm').value = '';
  overlay.classList.remove('hidden');
}

export function initResetPasswordModal() {
  document.getElementById('resetPasswordClose')?.addEventListener('click', () => {
    document.getElementById('resetPasswordOverlay')?.classList.add('hidden');
  });
  document.getElementById('resetPasswordCancel')?.addEventListener('click', () => {
    document.getElementById('resetPasswordOverlay')?.classList.add('hidden');
  });
  document.getElementById('resetPasswordForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('resetPasswordCustomerId')?.value;
    const newPass = document.getElementById('resetPasswordNew')?.value;
    const confirmPass = document.getElementById('resetPasswordConfirm')?.value;

    if (!newPass || newPass.length < 4) {
      showToast('Mật khẩu phải có ít nhất 4 ký tự.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Xác nhận mật khẩu không khớp.', 'error');
      return;
    }
    void changeUserPassword(id, newPass).then(ok => {
      if (ok) {
        showToast('Đã đổi mật khẩu thành công!', 'success');
        document.getElementById('resetPasswordOverlay')?.classList.add('hidden');
      } else {
        showToast('Không tìm thấy khách hàng.', 'error');
      }
    });
  });
  document.getElementById('resetPasswordOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'resetPasswordOverlay') {
      document.getElementById('resetPasswordOverlay')?.classList.add('hidden');
    }
  });
}

// ===== Helpers =====
function getValue(id) {
  return document.getElementById(id)?.value.trim() ?? '';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setError(fieldId, msg) {
  const group = document.getElementById(fieldId)?.closest('.input-group');
  if (!group) return;
  group.classList.add('has-error');
  const errEl = group.querySelector('.error-msg');
  if (errEl) errEl.textContent = msg;
}

function clearFormErrors(form) {
  form.querySelectorAll('.input-group.has-error').forEach(g => g.classList.remove('has-error'));
}
