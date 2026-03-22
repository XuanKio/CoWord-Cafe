// ===== DASHBOARD =====

import { getCustomers, getSessions, getServiceOrders, getPackageSales } from './data.js';
import { formatCurrency, formatTime, isSameDay, formatDateTime, generateAvatar } from './utils.js';

export function initDashboard() {
  void renderStats();
  void renderRecentCustomers();
  void renderActiveSessions();
}

async function renderStats() {
  const today = new Date();
  const [customers, sessions, serviceOrders, packageSales] = await Promise.all([
    getCustomers(),
    getSessions(),
    getServiceOrders(),
    getPackageSales(),
  ]);

  const activeCheckin = customers.filter(c => c.status === 'checkin').length;
  const todaySessions = sessions.filter(s => isSameDay(s.checkIn, today)).length;

  const todaySessionRevenue = sessions
    .filter(s => s.status === 'completed' && s.checkOut && isSameDay(s.checkOut, today))
    .reduce((sum, s) => sum + s.totalCost, 0);
  const todayServiceRevenue = serviceOrders
    .filter(o => isSameDay(o.orderedAt, today))
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const todayPackageRevenue = packageSales
    .filter(p => isSameDay(p.soldAt, today))
    .reduce((sum, p) => sum + p.pricePaid, 0);
  const todayRevenue = todaySessionRevenue + todayServiceRevenue + todayPackageRevenue;
  const todayServiceCount = serviceOrders.filter(o => isSameDay(o.orderedAt, today)).length;

  setCard('statCheckin', String(activeCheckin));
  setCard('statSessions', String(todaySessions));
  setCard('statRevenue', formatCurrency(todayRevenue));
  setCard('statServices', String(todayServiceCount));
}

function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function renderRecentCustomers() {
  const customers = await getCustomers();
  const recent = [...customers]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const tbody = document.getElementById('dashboardCustomerTbody');
  if (!tbody) return;

  tbody.innerHTML = recent.map(c => {
    const statusLabel = c.status === 'checkin' ? '<span class="badge badge-active">Đang ở quán</span>'
      : c.remainingMinutes <= 0 ? '<span class="badge badge-inactive">Hết giờ</span>'
      : '<span class="badge badge-info">Có giờ</span>';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar">${generateAvatar(c.name)}</div>
            <strong>${c.name}</strong>
          </div>
        </td>
        <td>${c.phone}</td>
        <td>${formatTime(c.remainingMinutes)}</td>
        <td>${statusLabel}</td>
      </tr>
    `;
  }).join('');
}

async function renderActiveSessions() {
  const sessions = (await getSessions()).filter(s => s.status === 'active');
  const el = document.getElementById('activeSessionCount');
  if (el) el.textContent = String(sessions.length);

  const list = document.getElementById('activeSessionList');
  if (!list) return;

  if (sessions.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-laptop"></i><p>Không có phiên nào đang hoạt động</p></div>`;
    return;
  }

  list.innerHTML = sessions.map(s => `
    <div class="session-item">
      <div class="session-avatar">${generateAvatar(s.customerName)}</div>
      <div class="session-info">
        <strong>${s.customerName}</strong>
        <span class="text-muted text-sm">${s.customerPhone}</span>
      </div>
      <div style="text-align:right">
        <div class="badge badge-active">Đang online</div>
        <div class="text-sm text-muted" style="margin-top:3px">Vào: ${formatDateTime(s.checkIn)}</div>
      </div>
    </div>
  `).join('');
}
