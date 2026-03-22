// ===== ORDERS MODULE =====

import { getServiceOrders, updateServiceOrderStatus } from './data.js';
import { formatCurrency, formatDateTime, generateAvatar } from './utils.js';
import { showToast } from './toast.js';

let activeTab = 'pending';
let selectedOrderId = null;

export function initOrders() {
  void renderTabs();
  void renderOrders();
  bindEvents();
  void updatePendingBadge();
}

// ─── Bind events ─────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('orderDetailClose')?.addEventListener('click', closeDetailModal);
  document.getElementById('orderDetailOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderDetailOverlay') closeDetailModal();
  });
  document.getElementById('rejectConfirmBtn')?.addEventListener('click', () => {
    if (selectedOrderId) void doReject(selectedOrderId);
  });
  document.getElementById('rejectCancelBtn')?.addEventListener('click', () => {
    document.getElementById('rejectConfirmBox').style.display = 'none';
  });
}

// ─── Render tabs with counts ──────────────────────────────────────────────────
async function renderTabs() {
  const orders = await getServiceOrders();
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    serving: orders.filter(o => o.status === 'serving').length,
    paid: orders.filter(o => o.status === 'paid').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  };

  const tabs = [
    { key: 'all',      label: 'Tất cả',       icon: 'fa-list' },
    { key: 'pending',  label: 'Chờ xử lý',    icon: 'fa-clock',         badgeClass: 'badge-warning' },
    { key: 'serving',  label: 'Đang phục vụ', icon: 'fa-concierge-bell', badgeClass: 'badge-info' },
    { key: 'paid',     label: 'Đã thanh toán',icon: 'fa-check-circle',  badgeClass: 'badge-success' },
    { key: 'rejected', label: 'Đã từ chối',   icon: 'fa-ban',           badgeClass: 'badge-danger' },
  ];

  const container = document.getElementById('ordersTabBar');
  if (!container) return;

  container.innerHTML = tabs.map(t => `
    <button class="orders-tab-btn${activeTab === t.key ? ' active' : ''}" data-tab="${t.key}">
      <i class="fa-solid ${t.icon}"></i>
      ${t.label}
      ${counts[t.key] > 0 ? `<span class="orders-tab-count ${t.badgeClass || ''}">${counts[t.key]}</span>` : ''}
    </button>
  `).join('');

  container.querySelectorAll('.orders-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) {
        activeTab = tab;
        container.querySelectorAll('.orders-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        void renderOrders();
        void renderTabs();
      }
    });
  });
}

// ─── Render order cards ───────────────────────────────────────────────────────
async function renderOrders() {
  const grid = document.getElementById('ordersGrid');
  const countEl = document.getElementById('orderCount');
  if (!grid) return;

  grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

  const orders = await getServiceOrders();
  const filtered = activeTab === 'all' ? [...orders] : orders.filter(o => o.status === activeTab);
  filtered.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());

  if (countEl) countEl.textContent = `${filtered.length} yêu cầu`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="orders-empty">
        <i class="fa-solid fa-bell-slash"></i>
        <p>${activeTab === 'pending' ? 'Không có yêu cầu nào đang chờ' : 'Không có yêu cầu nào'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(o => renderOrderCard(o)).join('');
}

function renderOrderCard(o) {
  const si = getStatusMeta(o.status);
  const initials = generateAvatar(o.customerName);
  const categoryIcon = getCategoryIcon(o.serviceCategory);
  const isPackage = o.serviceCategory === 'package';

  const quickActions = getQuickActions(o);

  return `
    <div class="order-card order-card--${o.status}" onclick="showOrderDetail('${o.id}')">
      <div class="order-card__header">
        <div class="order-card__avatar">${initials}</div>
        <div class="order-card__info">
          <div class="order-card__name">${o.customerName}</div>
          <div class="order-card__time"><i class="fa-regular fa-clock"></i> ${formatDateTime(new Date(o.orderedAt))}</div>
        </div>
        <span class="badge ${si.badgeClass}">${si.label}</span>
      </div>

      <div class="order-card__body">
        <div class="order-card__service">
          <span class="order-card__service-icon">${categoryIcon}</span>
          <div class="order-card__service-info">
            <div class="order-card__service-name">${o.serviceName}</div>
            <div class="order-card__service-qty">${isPackage ? '<i class="fa-solid fa-ticket" style="color:#8b5cf6;margin-right:4px"></i>Gói nạp giờ' : `SL: ${o.quantity}`}</div>
          </div>
          <div class="order-card__price">${formatCurrency(o.totalPrice)}</div>
        </div>
        ${o.note ? `<div class="order-card__note"><i class="fa-solid fa-note-sticky"></i> ${o.note}</div>` : ''}
      </div>

      ${quickActions ? `
      <div class="order-card__actions" onclick="event.stopPropagation()">
        ${quickActions}
      </div>` : ''}
    </div>
  `;
}

function getQuickActions(o) {
  const isPackage = o.serviceCategory === 'package';
  if (o.status === 'pending') {
    return `
      <button class="order-action-btn order-action-btn--serve" onclick="orderServing('${o.id}')">
        <i class="fa-solid ${isPackage ? 'fa-ticket' : 'fa-concierge-bell'}"></i> ${isPackage ? 'Duyệt & Nạp giờ' : 'Nhận phục vụ'}
      </button>
      <button class="order-action-btn order-action-btn--reject" onclick="orderReject('${o.id}')">
        <i class="fa-solid fa-xmark"></i> Từ chối
      </button>
    `;
  }
  if (o.status === 'serving') {
    if (isPackage) {
      return `
        <button class="order-action-btn order-action-btn--pay" onclick="orderPaid('${o.id}')">
          <i class="fa-solid fa-money-bill-wave"></i> Xác nhận thanh toán
        </button>
        <button class="order-action-btn order-action-btn--reject" onclick="orderReject('${o.id}')">
          <i class="fa-solid fa-ban"></i> Hủy
        </button>
      `;
    }
    return `
      <button class="order-action-btn order-action-btn--pay" onclick="orderPaid('${o.id}')">
        <i class="fa-solid fa-money-bill-wave"></i> Xác nhận thanh toán
      </button>
      <button class="order-action-btn order-action-btn--reject" onclick="orderReject('${o.id}')">
        <i class="fa-solid fa-ban"></i> Hủy
      </button>
    `;
  }
  return '';
}

// ─── Status meta ─────────────────────────────────────────────────────────────
function getStatusMeta(status) {
  switch (status) {
    case 'pending':  return { label: 'Chờ xử lý',    badgeClass: 'badge-warning',  color: '#f59e0b' };
    case 'serving':  return { label: 'Đang phục vụ', badgeClass: 'badge-info',     color: '#3b82f6' };
    case 'paid':     return { label: 'Đã thanh toán',badgeClass: 'badge-success',  color: '#22c55e' };
    case 'rejected': return { label: 'Đã từ chối',   badgeClass: 'badge-danger',   color: '#dc2626' };
    default:         return { label: 'Không xác định',badgeClass: '',              color: '#6b7280' };
  }
}

function getCategoryIcon(cat) {
  switch (cat) {
    case 'drink':   return '<i class="fa-solid fa-mug-saucer" style="color:#3b82f6"></i>';
    case 'food':    return '<i class="fa-solid fa-burger" style="color:#f97316"></i>';
    case 'package': return '<i class="fa-solid fa-ticket" style="color:#8b5cf6"></i>';
    default:        return '<i class="fa-solid fa-star" style="color:#a855f7"></i>';
  }
}

// ─── Update sidebar pending badge ────────────────────────────────────────────
export async function updatePendingBadge() {
  const orders = await getServiceOrders();
  const count = orders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('pendingOrderCount');
  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
window.showOrderDetail = (orderId) => {
  void (async () => {
    const orders = await getServiceOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    selectedOrderId = orderId;
    const si = getStatusMeta(order.status);
    const initials = generateAvatar(order.customerName);

    const content = document.getElementById('orderDetailContent');
    if (content) {
      content.innerHTML = `
        <div class="order-detail__hero">
          <div class="order-detail__avatar">${initials}</div>
          <div>
            <div class="order-detail__customer">${order.customerName}</div>
            ${order.customerPhone ? `<div class="order-detail__phone"><i class="fa-solid fa-phone"></i> ${order.customerPhone}</div>` : ''}
          </div>
          <span class="badge ${si.badgeClass}" style="margin-left:auto">${si.label}</span>
        </div>
        <div class="order-detail__grid">
          <div class="order-detail__cell">
            <div class="order-detail__cell-label">Thời gian đặt</div>
            <div class="order-detail__cell-value"><i class="fa-regular fa-clock" style="color:var(--accent-color)"></i> ${formatDateTime(new Date(order.orderedAt))}</div>
          </div>
          ${order.sessionId ? `
          <div class="order-detail__cell">
            <div class="order-detail__cell-label">Phiên làm việc</div>
            <div class="order-detail__cell-value"><i class="fa-solid fa-laptop" style="color:var(--accent-color)"></i> #${order.sessionId}</div>
          </div>` : ''}
          ${order.servedAt ? `
          <div class="order-detail__cell">
            <div class="order-detail__cell-label">Bắt đầu phục vụ</div>
            <div class="order-detail__cell-value"><i class="fa-solid fa-concierge-bell" style="color:#3b82f6"></i> ${formatDateTime(new Date(order.servedAt))}</div>
          </div>` : ''}
          ${order.paidAt ? `
          <div class="order-detail__cell">
            <div class="order-detail__cell-label">Thanh toán lúc</div>
            <div class="order-detail__cell-value"><i class="fa-solid fa-check-circle" style="color:#22c55e"></i> ${formatDateTime(new Date(order.paidAt))}</div>
          </div>` : ''}
        </div>
        <div class="order-detail__items">
          <div class="order-detail__items-header">Chi tiết đơn hàng</div>
          <div class="order-detail__item">
            <div class="order-detail__item-icon">${getCategoryIcon(order.serviceCategory)}</div>
            <div class="order-detail__item-info">
              <div class="order-detail__item-name">${order.serviceName}</div>
              <div class="order-detail__item-meta">
                ${order.unitPrice ? `Đơn giá: ${formatCurrency(order.unitPrice)}` : ''} &times; ${order.quantity}
              </div>
            </div>
            <div class="order-detail__item-total">${formatCurrency(order.totalPrice)}</div>
          </div>
          <div class="order-detail__total-row">
            <span>Tổng cộng</span>
            <span class="order-detail__grand-total">${formatCurrency(order.totalPrice)}</span>
          </div>
        </div>
        ${order.note ? `
        <div class="order-detail__note-box">
          <i class="fa-solid fa-note-sticky"></i> <strong>Ghi chú:</strong> ${order.note}
        </div>` : ''}
        <div id="rejectConfirmBox" class="order-detail__reject-confirm" style="display:none">
          <i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i>
          <span>Xác nhận từ chối yêu cầu này?</span>
          <button id="rejectConfirmBtn" class="order-action-btn order-action-btn--reject" style="padding:6px 14px">Từ chối</button>
          <button id="rejectCancelBtn" class="order-action-btn" style="padding:6px 14px">Không</button>
        </div>
      `;
    }

    const actions = document.getElementById('orderDetailActions');
    if (actions) actions.innerHTML = getModalActions(order);

    document.getElementById('rejectConfirmBtn')?.addEventListener('click', () => {
      if (selectedOrderId) void doReject(selectedOrderId);
    });
    document.getElementById('rejectCancelBtn')?.addEventListener('click', () => {
      const box = document.getElementById('rejectConfirmBox');
      if (box) box.style.display = 'none';
    });

    document.getElementById('orderDetailOverlay')?.classList.remove('hidden');
  })();
};

function getModalActions(order) {
  const isPackage = order.serviceCategory === 'package';
  if (order.status === 'pending') {
    return `
      <button class="btn-primary" style="flex:1" onclick="orderServing('${order.id}')">
        <i class="fa-solid ${isPackage ? 'fa-ticket' : 'fa-concierge-bell'}"></i> ${isPackage ? 'Duyệt & Nạp giờ' : 'Nhận phục vụ'}
      </button>
      <button style="flex:1;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;padding:10px;cursor:pointer;font-weight:600;font-size:14px" onclick="orderReject('${order.id}')">
        <i class="fa-solid fa-xmark"></i> Từ chối
      </button>
    `;
  }
  if (order.status === 'serving') {
    return `
      <button class="btn-accent" style="flex:1" onclick="orderPaid('${order.id}')">
        <i class="fa-solid fa-money-bill-wave"></i> Xác nhận thanh toán
      </button>
      <button class="btn-secondary" style="flex:1" onclick="orderReject('${order.id}')">
        <i class="fa-solid fa-ban"></i> Hủy đơn
      </button>
    `;
  }
  if (order.status === 'paid') {
    return `
      <button class="btn-secondary" style="flex:1;opacity:0.7;cursor:default" disabled>
        <i class="fa-solid fa-check-circle"></i> Đã hoàn thành
      </button>
    `;
  }
  if (order.status === 'rejected') {
    return `
      <button class="btn-secondary" style="flex:1;opacity:0.7;cursor:default" disabled>
        <i class="fa-solid fa-ban"></i> Đã từ chối
      </button>
    `;
  }
  return '';
}

function closeDetailModal() {
  document.getElementById('orderDetailOverlay')?.classList.add('hidden');
  selectedOrderId = null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────
window.orderServing = (orderId) => {
  void (async () => {
    const orders = await getServiceOrders();
    const order = orders.find(o => o.id === orderId);
    const isPackage = order?.serviceCategory === 'package';
    await updateServiceOrderStatus(orderId, 'serving', new Date());
    await refreshAll();
    if (selectedOrderId === orderId) window.showOrderDetail(orderId);
    if (isPackage) {
      showToast('Đã duyệt! Giờ đã được nạp vào tài khoản khách hàng.', 'success');
    } else {
      showToast('Đang phục vụ! Đơn hàng đang được xử lý.', 'success');
    }
  })();
};

window.orderPaid = (orderId) => {
  void (async () => {
    await updateServiceOrderStatus(orderId, 'paid', new Date());
    await refreshAll();
    if (selectedOrderId === orderId) window.showOrderDetail(orderId);
    showToast('Đã xác nhận thanh toán! Đơn hàng hoàn thành.', 'success');
  })();
};

window.orderReject = (orderId) => {
  const box = document.getElementById('rejectConfirmBox');
  if (box) {
    box.style.display = 'flex';
    selectedOrderId = orderId;
    const overlay = document.getElementById('orderDetailOverlay');
    if (overlay?.classList.contains('hidden')) window.showOrderDetail(orderId);
  } else {
    void doReject(orderId);
  }
};

window.orderRejectConfirm = (orderId) => void doReject(orderId);

async function doReject(orderId) {
  await updateServiceOrderStatus(orderId, 'rejected');
  const box = document.getElementById('rejectConfirmBox');
  if (box) box.style.display = 'none';
  await refreshAll();
  if (selectedOrderId === orderId) window.showOrderDetail(orderId);
  showToast('Đã từ chối yêu cầu.', 'warning');
}

async function refreshAll() {
  await Promise.all([renderTabs(), renderOrders(), updatePendingBadge()]);
}
