// ===== TOAST NOTIFICATION =====

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 3000) {
  const box = document.createElement('div');
  box.className = `toast ${type}`;

  const iconMap = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  box.innerHTML = `<i class="fa-solid ${iconMap[type]}" style="margin-right:8px"></i>${message}`;

  getContainer().appendChild(box);

  setTimeout(() => {
    box.style.opacity = '0';
    box.style.transform = 'translateX(100%)';
    box.style.transition = '0.3s';
    setTimeout(() => box.remove(), 300);
  }, duration);
}
