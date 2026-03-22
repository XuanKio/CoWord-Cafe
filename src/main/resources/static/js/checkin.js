// ===== CHECK-IN / CHECK-OUT MODULE =====

import { getCustomers, saveCustomer, getActiveSessions, createSession, updateSession, generateId } from './data.js';
import { formatTime, formatDateTime, generateAvatar, elapsedMinutes } from './utils.js';
import { showToast } from './toast.js';

let timerInterval = null;

export function initCheckin() {
  bindSearchCustomer();
  void renderActiveSessions();
  startLiveTimer();
}

function bindSearchCustomer() {
  const input = document.getElementById('checkinPhone');
  const btn = document.getElementById('btnSearchCheckin');
  btn?.addEventListener('click', () => void searchAndDisplay());
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void searchAndDisplay();
  });
}

async function searchAndDisplay() {
  const input = document.getElementById('checkinPhone');
  const phone = input?.value.trim().replace(/\D/g, '') ?? '';
  const resultArea = document.getElementById('checkinResult');
  if (!resultArea) return;

  if (!phone) {
    resultArea.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>Nhập số điện thoại để tìm kiếm</p></div>`;
    return;
  }

  resultArea.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...</div>`;

  const customers = await getCustomers();
  const customer = customers.find(c => c.phone === phone || c.phone.replace(/\D/g, '') === phone);

  if (!customer) {
    resultArea.innerHTML = `
      <div class="info-card" style="border-left-color:#ef4444;text-align:center;padding:24px">
        <i class="fa-solid fa-user-xmark" style="font-size:32px;color:#ef4444;margin-bottom:12px;display:block"></i>
        <p style="font-weight:600;color:#991b1b">Không tìm thấy khách hàng với SĐT: ${phone}</p>
        <p class="text-sm text-muted" style="margin-top:6px">Vui lòng kiểm tra lại hoặc đăng ký mới</p>
      </div>`;
    return;
  }

  const activeSessions = await getActiveSessions();
  const hasActiveSession = activeSessions.some(s => s.customerId === customer.id);
  const statusColor = customer.status === 'checkin' ? '#22c55e' : customer.remainingMinutes <= 0 ? '#ef4444' : '#3b82f6';

  resultArea.innerHTML = `
    <div class="info-card" style="border-left-color:${statusColor}">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div class="avatar avatar-lg">${generateAvatar(customer.name)}</div>
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--primary-color)">${customer.name}</div>
          <div class="text-muted text-sm">${customer.phone}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg-color);padding:12px;border-radius:8px">
          <div class="text-sm text-muted">Giờ còn lại</div>
          <div style="font-size:18px;font-weight:700;color:var(--primary-color)">${formatTime(customer.remainingMinutes)}</div>
        </div>
        <div style="background:var(--bg-color);padding:12px;border-radius:8px">
          <div class="text-sm text-muted">Tổng đã mua</div>
          <div style="font-size:18px;font-weight:700;color:var(--primary-color)">${formatTime(customer.totalMinutesBought)}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${hasActiveSession
          ? `<button class="btn-danger" onclick="doCheckout('${customer.id}')"><i class="fa-solid fa-arrow-right-from-bracket"></i> Check-out</button>`
          : customer.remainingMinutes > 0
            ? `<button class="btn-primary" onclick="doCheckin('${customer.id}')"><i class="fa-solid fa-arrow-right-to-bracket"></i> Check-in</button>`
            : `<button class="btn-primary" disabled style="opacity:0.5;cursor:not-allowed"><i class="fa-solid fa-ban"></i> Hết giờ</button>`
        }
      </div>
    </div>`;
}

window.doCheckin = (customerId) => {
  void (async () => {
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    await saveCustomer({ ...customer, status: 'checkin' });

    const newSession = {
      id: generateId('s'),
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      checkIn: new Date(),
      minutesUsed: 0,
      totalCost: 0,
      status: 'active',
    };
    await createSession(newSession);

    showToast(`${customer.name} đã check-in thành công!`, 'success');
    void searchAndDisplay();
    void renderActiveSessions();
  })();
};

window.doCheckout = (customerId) => {
  void (async () => {
    const sessions = await getActiveSessions();
    const session = sessions.find(s => s.customerId === customerId);
    if (!session) return;

    const minutesUsed = elapsedMinutes(session.checkIn);
    const costPerMinute = 300;
    const totalCost = minutesUsed * costPerMinute;

    await updateSession(session.id, {
      checkOut: new Date(),
      minutesUsed,
      totalCost,
      status: 'completed',
    });

    const customers = await getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      await saveCustomer({
        ...customer,
        remainingMinutes: Math.max(0, customer.remainingMinutes - minutesUsed),
        status: 'inactive',
      });
    }

    showToast(`Check-out thành công! Đã dùng ${minutesUsed} phút.`, 'success');
    void searchAndDisplay();
    void renderActiveSessions();
  })();
};

async function renderActiveSessions() {
  const container = document.getElementById('activeSessionsContainer');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
  const sessions = await getActiveSessions();

  if (sessions.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-laptop"></i><p>Không có phiên nào đang hoạt động</p></div>`;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="session-row" data-session-id="${s.id}" data-checkin="${s.checkIn.toISOString()}">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="avatar">${generateAvatar(s.customerName)}</div>
        <div>
          <div style="font-weight:600">${s.customerName}</div>
          <div class="text-sm text-muted">${s.customerPhone}</div>
        </div>
      </div>
      <div>
        <div class="text-sm text-muted">Check-in lúc</div>
        <div style="font-weight:500">${formatDateTime(s.checkIn)}</div>
      </div>
      <div>
        <div class="text-sm text-muted">Đã dùng</div>
        <div class="session-elapsed" style="font-weight:600;color:var(--accent-color)">Đang tính...</div>
      </div>
      <div>
        <button class="btn-danger" style="padding:8px 14px;font-size:13px" onclick="doCheckout('${s.customerId}')">
          <i class="fa-solid fa-arrow-right-from-bracket"></i> Check-out
        </button>
      </div>
    </div>
  `).join('');

  updateElapsedTimers();
}

function updateElapsedTimers() {
  document.querySelectorAll('.session-row').forEach(row => {
    const checkInStr = row.dataset['checkin'];
    if (!checkInStr) return;
    const checkIn = new Date(checkInStr);
    const elapsed = row.querySelector('.session-elapsed');
    if (elapsed) elapsed.textContent = formatTime(elapsedMinutes(checkIn));
  });
}

function startLiveTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    updateElapsedTimers();
  }, 30000);
}
