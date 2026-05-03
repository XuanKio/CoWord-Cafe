// Login page entry point

import { login, loginUserWithPassword, getAuthUser, getUserAuth } from './auth.js';

initLoginPage();

function initLoginPage() {
  const authUser = getAuthUser();
  const userAuth = getUserAuth();

  if (authUser) {
    window.location.href = '/app/admin/dashboard';
    return;
  }
  if (userAuth) {
    const target = userAuth.usersId ? `/app/users/${userAuth.usersId}` : '/app/me';
    window.location.href = target;
    return;
  }

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername')?.value.trim() ?? '';
      const password = document.getElementById('loginPassword')?.value ?? '';

      if (!username || !password) {
        showError('Vui lòng nhập đầy đủ thông tin.');
        return;
      }

      // Try admin login first
      const adminResult = await login(username, password);
      if (adminResult?.success) {
        window.location.href = '/app/admin/dashboard';
        return;
      }

      // Try user login
      const userResult = await loginUserWithPassword(username, password);
      if (userResult.success) {
        const userId = userResult.user?.usersId;
        window.location.href = userId ? `/app/users/${userId}` : '/app/me';
      } else {
        showError(userResult.message || adminResult?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
        document.getElementById('loginPassword').value = '';
      }
    });
  }

  function showError(msg) {
    const errorBox = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMsg');
    if (errorBox && errorMsg) {
      errorMsg.textContent = msg;
      errorBox.style.display = 'block';
    }
  }
}
