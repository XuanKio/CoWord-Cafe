const API_BASE = '/api';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function clearAuth() {
  localStorage.removeItem('user');
  sessionStorage.removeItem('cwc_admin');
  sessionStorage.removeItem('cwc_user');
}

function redirectToLogin() {
  if (window.location.pathname !== '/login' && window.location.pathname !== '/login.html') {
    window.location.href = '/login';
  }
}

function shouldSetJsonContentType(body, headers) {
  if (!body) return false;
  if (body instanceof FormData) return false;
  const key = Object.keys(headers).find((h) => h.toLowerCase() === 'content-type');
  return !key;
}

export async function apiRequest(endpoint, options = {}) {
  const user = getStoredUser();
  const token = user.token;

  const headers = {
    ...(options.headers || {})
  };

  if (shouldSetJsonContentType(options.body, headers)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;

    try {
      const err = await response.json();
      errMsg = err.message || err.error || errMsg;
    } catch {
      const text = await response.text();
      if (text) errMsg = text;
    }

    if (response.status === 401 || response.status === 403) {
      clearAuth();
      redirectToLogin();
    }

    const error = new Error(errMsg);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// ===== AUTH =====
export const authApi = {
  /** Admin đăng nhập: { username, password } */
  adminLogin: (username, password) =>
    apiRequest('/auth/admin', { method: 'POST', body: JSON.stringify({ username, password }) }),

  /** Khách hàng đăng nhập: { phone, password } */
  userLogin: (phone, password) =>
    apiRequest('/auth/user', { method: 'POST', body: JSON.stringify({ phone, password }) }),
};

// ===== CUSTOMERS =====
export const customerApi = {
  getAll: () => apiRequest('/customers'),
  getById: (id) => apiRequest(`/customers/${id}`),
  create: (data) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addHours: (id, hours, note = '') => apiRequest(`/customers/${id}/add-hours`, {
    method: 'PATCH',
    body: JSON.stringify({ hours, note })
  }),
  delete: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
};

// ===== PACKAGES (Gói giờ) =====
export const packageApi = {
  getAll: () => apiRequest('/packages'),
  getAvailable: () => apiRequest('/packages/available'),
  getById: (id) => apiRequest(`/packages/${id}`),
  create: (data) => apiRequest('/packages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/packages/${id}`, { method: 'DELETE' }),
};

// ===== MENU (Đồ ăn / nước uống) =====
export const menuApi = {
  getAll: () => apiRequest('/menu'),
  getAvailable: () => apiRequest('/menu/available'),
  getById: (id) => apiRequest(`/menu/${id}`),
  create: (data) => apiRequest('/menu', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/menu/${id}`, { method: 'DELETE' }),
};

// ===== SESSIONS (Phiên ngồi) =====
export const sessionApi = {
  getAll: () => apiRequest('/sessions'),
  getActive: () => apiRequest('/sessions/active'),
  getByCustomer: (customerId) => apiRequest(`/sessions/customer/${customerId}`),
  create: (data) => apiRequest('/sessions/checkin', { method: 'POST', body: JSON.stringify(data) }),
  update: (sessionId) => apiRequest(`/sessions/${sessionId}/checkout`, { method: 'PUT' }),
  checkIn: (usersId) =>
    apiRequest('/sessions/checkin', { method: 'POST', body: JSON.stringify({ usersId }) }),
  checkOut: (sessionId) => apiRequest(`/sessions/${sessionId}/checkout`, { method: 'PUT' }),
};

// ===== SERVICE REQUESTS (Yêu cầu dịch vụ / gói giờ) =====
export const serviceRequestApi = {
  getAll: () => apiRequest('/requests'),
  getPending: () => apiRequest('/requests/pending'),
  getByCustomer: (customerId) => apiRequest(`/requests/customer/${customerId}`),
  create: (data) => apiRequest('/requests', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id) => apiRequest(`/requests/${id}/approve`, { method: 'PATCH' }),
  cancel: (id) => apiRequest(`/requests/${id}/cancel`, { method: 'PATCH' }),
};

// ===== PAYMENTS (Thanh toán) =====
export const paymentApi = {
  getAll: () => apiRequest('/payments'),
  getByRequest: (requestId) => apiRequest(`/payments/request/${requestId}`),
  create: (data) => apiRequest('/payments', { method: 'POST', body: JSON.stringify(data) }),
};

// ===== SERVICE ORDERS (map to /requests + /payments) =====
export const serviceOrderApi = {
  getAll: () => apiRequest('/requests'),
  create: (data) => apiRequest('/requests', { method: 'POST', body: JSON.stringify(data) }),
  createPackageRequest: (data) => apiRequest('/requests', {
    method: 'POST',
    body: JSON.stringify({ usersId: data.customerId, packagesId: data.packageId, quantity: data.quantity ?? 1 })
  }),
  updateStatus: async (id, status) => {
    if (status === 'serving') {
      return apiRequest(`/requests/${id}/approve`, { method: 'PATCH' });
    }

    if (status === 'rejected') {
      return apiRequest(`/requests/${id}/cancel`, { method: 'PATCH' });
    }

    if (status === 'paid') {
      const request = await apiRequest(`/requests`);
      const current = Array.isArray(request) ? request.find((r) => String(r.serviceRequestsId) === String(id)) : null;

      if (!current) throw new Error('Không tìm thấy yêu cầu dịch vụ');

      if (current.status === 'PENDING') {
        await apiRequest(`/requests/${id}/approve`, { method: 'PATCH' });
      }

      return paymentApi.create({
        serviceRequestsId: Number(id),
        amount: current.totalPrice,
        paymentMethod: 'CASH'
      });
    }

    return null;
  }
};

// ===== PACKAGE SALES (derive from paid package requests) =====
export const packageSaleApi = {
  getAll: async () => {
    const [requests, payments] = await Promise.all([
      apiRequest('/requests'),
      apiRequest('/payments')
    ]);

    const paidByRequestId = new Map(
      (payments || []).map((p) => [String(p.serviceRequestsId), p])
    );

    return (requests || [])
      .filter((r) => r.packagesId != null)
      .filter((r) => ['APPROVED', 'PAID'].includes(r.status))
      .map((r) => {
        const payment = paidByRequestId.get(String(r.serviceRequestsId));
        return {
          id: String(r.serviceRequestsId),
          customerId: String(r.usersId),
          customerName: r.customerName,
          packageId: String(r.packagesId),
          packageName: r.packageName,
          minutesBought: Number(r.quantity || 1) * (Number(r.packageHoursAmount || 0) * 60),
          pricePaid: Number(payment?.amount ?? r.totalPrice ?? 0),
          soldAt: payment?.createdAt ?? r.createdAt,
        };
      });
  },
  create: async (data) => {
    const created = await serviceOrderApi.createPackageRequest(data);
    const requestId = created?.request?.serviceRequestsId ?? created?.serviceRequestsId;
    if (!requestId) throw new Error('Không tạo được yêu cầu mua gói');

    await serviceOrderApi.updateStatus(requestId, 'serving');
    await serviceOrderApi.updateStatus(requestId, 'paid');
    return { requestId };
  }
};

// ===== REPORTS =====
export const reportApi = {
  getAll: () => apiRequest('/reports'),
  getTransactions: (month) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const query = params.toString();
    return apiRequest(`/reports/transactions${query ? `?${query}` : ''}`);
  },
};
