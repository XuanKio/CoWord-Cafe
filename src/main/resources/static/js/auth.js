/**
 * auth.js — Quản lý xác thực
 *   Admin: đăng nhập bằng username + password → /api/auth/admin
 *   User:  đăng nhập bằng phone + password   → /api/auth/user
 */

import { authApi, customerApi } from './api.js';

const ADMIN_KEY = 'cwc_admin';
const USER_KEY = 'cwc_user';

// ===== ADMIN =====
export async function adminLogin(username, password) {
  try {
    const data = await authApi.adminLogin(username, password);
    const userData = { ...data.admin, token: data.token, role: 'ADMIN' };
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    return { success: true, admin: data.admin };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể kết nối máy chủ.' };
  }
}

export function getAdminAuth() {
  try { return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || 'null'); }
  catch { return null; }
}

export function adminLogout() {
  localStorage.removeItem('user');
  sessionStorage.removeItem(ADMIN_KEY);
  window.location.href = '/login';
}

// ===== USER (CUSTOMER) =====
export async function userLogin(phone, password) {
  try {
    const data = await authApi.userLogin(phone, password);
    const userData = { ...data.customer, token: data.token, role: 'USER' };
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.customer));
    return { success: true, customer: data.customer, user: data.customer };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể kết nối máy chủ.' };
  }
}

export function getUserAuth() {
  try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}

export function userLogout() {
  localStorage.removeItem('user');
  sessionStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}

// ===== ALIASES FOR BACKWARD COMPATIBILITY =====
export { adminLogin as login };
export { getAdminAuth as getAuthUser };
export { adminLogout as logout };
export { userLogin as loginUserWithPassword };

export async function changeUserPassword(userId, newPassword) {
  try {
    await customerApi.update(userId, { password: newPassword });
    return true;
  } catch {
    return false;
  }
}

// ===== REQUIRE AUTH GUARD =====
export function requireAuth() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.token) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

// ===== SET ADMIN PASSWORD (placeholder) =====
export function setAdminPassword(currentPass, newPass) {
  // This is a placeholder - implement if needed
  console.log('setAdminPassword called', currentPass, newPass);
  return true;
}
