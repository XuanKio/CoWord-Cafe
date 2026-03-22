// ===== REPORTS MODULE =====

import { getReports } from './data.js';
import { formatCurrency, formatDate } from './utils.js';

export function initReports() {
  void renderReports();
  bindEvents();
  // expose for HTML onclick
  window.initReportsSection = () => void renderReports();
}

function bindEvents() {
  const monthFilter = document.getElementById('reportMonthFilter');
  monthFilter?.addEventListener('change', () => void renderReports(monthFilter.value));
}

async function renderReports(monthFilter) {
  let reports = await getReports();

  if (monthFilter) {
    reports = reports.filter(r => r.date.startsWith(monthFilter));
  }

  reports = reports.sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  const totalSession = reports.reduce((s, r) => s + r.sessionRevenue, 0);
  const totalService = reports.reduce((s, r) => s + r.serviceRevenue, 0);
  const totalPackage = reports.reduce((s, r) => s + r.packageRevenue, 0);
  const totalRevenue = totalSession + totalService + totalPackage;
  const totalSessions = reports.reduce((s, r) => s + r.sessionCount, 0);
  const totalOrders = reports.reduce((s, r) => s + r.serviceOrderCount, 0);
  const totalNewCustomers = reports.reduce((s, r) => s + r.newCustomers, 0);

  // Summary cards
  setEl('reportTotalRevenue', formatCurrency(totalRevenue));
  setEl('reportTotalSessions', String(totalSessions));
  setEl('reportTotalOrders', String(totalOrders));
  setEl('reportNewCustomers', String(totalNewCustomers));

  // Table
  const tbody = document.getElementById('reportTbody');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">Không có dữ liệu</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => {
    const total = r.sessionRevenue + r.serviceRevenue + r.packageRevenue;
    const date = new Date(r.date + 'T00:00:00');
    return `
      <tr>
        <td style="font-weight:500">${formatDate(date)}</td>
        <td>${r.sessionCount}</td>
        <td>${formatCurrency(r.sessionRevenue)}</td>
        <td>${r.serviceOrderCount}</td>
        <td>${formatCurrency(r.serviceRevenue)}</td>
        <td>${formatCurrency(r.packageRevenue)}</td>
        <td style="font-weight:700;color:var(--primary-color)">${formatCurrency(total)}</td>
      </tr>
    `;
  }).join('');

  // Total row
  tbody.innerHTML += `
    <tr style="background:var(--bg-color);font-weight:600">
      <td>TỔNG CỘNG</td>
      <td>${totalSessions}</td>
      <td>${formatCurrency(totalSession)}</td>
      <td>${totalOrders}</td>
      <td>${formatCurrency(totalService)}</td>
      <td>${formatCurrency(totalPackage)}</td>
      <td style="color:var(--primary-color)">${formatCurrency(totalRevenue)}</td>
    </tr>
  `;

  // Revenue chart (simple bar chart using CSS)
  renderBarChart(reports);
}

function renderBarChart(reports) {
  const chartContainer = document.getElementById('revenueChart');
  if (!chartContainer || reports.length === 0) return;

  const maxRevenue = Math.max(...reports.map(r => r.sessionRevenue + r.serviceRevenue + r.packageRevenue));

  chartContainer.innerHTML = reports.map(r => {
    const total = r.sessionRevenue + r.serviceRevenue + r.packageRevenue;
    const heightPct = maxRevenue > 0 ? Math.round((total / maxRevenue) * 100) : 0;
    const date = new Date(r.date + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0');
    return `
      <div class="chart-bar-group" title="${formatDate(date)}: ${formatCurrency(total)}">
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${heightPct}%"></div>
        </div>
        <div class="chart-label">${day}</div>
      </div>
    `;
  }).join('');
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
