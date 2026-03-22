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
