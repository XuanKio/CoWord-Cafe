import { authApi } from './api.js';

const ADMIN_KEY = 'cwc_admin';
const USER_KEY = 'cwc_user';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function clearAuth() {
  localStorage.removeItem('user');
  sessionStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function redirectIfLoggedIn() {
  const user = getUser();
  if (user.role === 'ADMIN' && user.token) {
    window.location.href = '/app/admin/dashboard';
    return true;
  }
  if (user.role === 'USER' && user.token) {
    const target = user.usersId ? `/app/users/${user.usersId}` : '/app/me';
    window.location.href = target;
    return true;
  }
  if ((user.role === 'ADMIN' || user.role === 'USER') && !user.token) {
    clearAuth();
  }
  return false;
}

function setLoading(loading) {
  const btn = document.getElementById('btnLogin');
  const btnText = document.getElementById('btnText');
  if (!btn || !btnText) return;
  btn.disabled = loading;
  btnText.innerHTML = loading
    ? '<span class="loading"></span> Dang dang nhap...'
    : 'Dang nhap';
}

function showError(message) {
  const errorMsg = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  if (!errorMsg || !errorText) return;
  errorText.textContent = message;
  errorMsg.classList.add('show');
}

function hideError() {
  const errorMsg = document.getElementById('errorMessage');
  if (!errorMsg) return;
  errorMsg.classList.remove('show');
}

function saveAdminSession(data) {
  const userData = {
    adminId: data.admin.adminId,
    username: data.admin.username,
    phone: data.admin.phone,
    role: 'ADMIN',
    token: data.token
  };

  localStorage.setItem('user', JSON.stringify(userData));
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
}

function saveUserSession(data) {
  const userData = {
    usersId: data.customer.usersId,
    name: data.customer.name,
    phone: data.customer.phone,
    remainingHours: data.customer.remainingHours,
    status: data.customer.status,
    role: 'USER',
    token: data.token
  };

  localStorage.setItem('user', JSON.stringify(userData));
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.customer));
}

async function handleLogin(event) {
  event.preventDefault();
  let adminErrorMessage = null;
  const username = document.getElementById('username')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';

  if (!username || !password) {
    showError('Vui long nhap day du ten dang nhap va mat khau.');
    return;
  }

  hideError();
  setLoading(true);

  try {
    try {
      const adminData = await authApi.adminLogin(username, password);
      saveAdminSession(adminData);
      window.location.href = '/app/admin/dashboard';
      return;
    } catch (adminError) {
      if (adminError?.status && adminError.status !== 401) {
        throw adminError;
      }
      adminErrorMessage = adminError?.message || null;
    }

    const userData = await authApi.userLogin(username, password);
    saveUserSession(userData);
    window.location.href = `/app/users/${userData.customer.usersId}`;
    return;
  } catch (error) {
    showError(error?.message || adminErrorMessage || 'Khong the ket noi den server. Vui long thu lai.');
  } finally {
    setLoading(false);
  }
}

function init() {
  if (redirectIfLoggedIn()) return;
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', handleLogin);
}

init();
