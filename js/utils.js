// ==================== UTILITIES ====================

// Date/time formatting
const Utils = {
  formatDate(dt, opts = {}) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    const defaults = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return d.toLocaleDateString('uz-Cyrl-UZ', { ...defaults, ...opts });
  },

  formatDateTime(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    return d.toLocaleString('uz-Cyrl-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDateInput(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 16);
  },

  calculateAge(val) {
    if (!val) return null;
    const s = val.toString();
    if (s.includes('-')) {
      const b = new Date(s);
      if (isNaN(b)) return null;
      const now = new Date();
      let age = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
      return age;
    }
    const yr = parseInt(s.slice(0, 4));
    if (isNaN(yr)) return null;
    return new Date().getFullYear() - yr;
  },

  relativeTime(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Hozirgina';
    if (mins < 60) return `${mins} daq. avval`;
    if (hrs < 24) return `${hrs} soat avval`;
    if (days < 7) return `${days} kun avval`;
    return Utils.formatDate(dt);
  },

  // Validate required fields
  validate(data, required) {
    const errors = {};
    required.forEach(field => {
      const val = data[field];
      if (val === undefined || val === null || val === '' ||
        (Array.isArray(val) && val.length === 0)) {
        errors[field] = 'Majburiy maydon';
      }
    });
    return errors;
  },

  // Generate KT No suggestion
  generateKtNo() {
    const now = new Date();
    const y = now.getFullYear().toString().slice(2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `KT-${y}${m}${d}-${rand}`;
  },

  // Status badge HTML
  statusBadge(status) {
    const map = {
      active: ['badge-green', '🟢 Aktiv'],
      chiqarildi: ['badge-blue', '🔵 Chiqarildi'],
      vafot: ['badge-red', '🔴 Vafot'],
      otkazildi: ['badge-orange', '🟠 O\'tkazildi']
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  // Type badge
  typeBadge(type) {
    if (type === 'infarkt') return `<span class="badge badge-red">🫀 Infarkt</span>`;
    return `<span class="badge badge-purple">🧠 Insult</span>`;
  },

  // Truncate text
  truncate(str, len = 30) {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  },

  // Debounce
  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Export to CSV
  exportCSV(data, filename = 'bemorlar.csv') {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => {
      const v = r[h];
      if (Array.isArray(v)) return `"${v.join('; ')}"`;
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
      return v ?? '';
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  // Set element HTML safely
  setHTML(el, html) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = html;
  },

  // Query selector helpers
  qs(sel, ctx = document) { return ctx.querySelector(sel); },
  qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },

  // Show/hide
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = '';
  },
  hide(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = 'none';
  }
};

// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==================== MODAL ====================
function showModal({ title, body, footer, id = 'modal-main', size = 'md' }) {
  closeModal();
  const container = document.getElementById('modal-container');
  const maxW = size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';
  container.innerHTML = `
    <div class="modal-backdrop" id="${id}-backdrop" onclick="if(event.target===this)closeModal()">
      <div class="modal-box ${maxW.replace('max-w-', 'max-w-').replace('3xl','2xl')}" style="max-width:${size==='lg'?'720px':size==='sm'?'380px':'520px'}">
        <div class="modal-header">
          <h3 class="text-base font-bold text-slate-800">${title}</h3>
          <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 text-lg font-bold">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>
  `;
}

function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}

// ==================== LOADING STATE ====================
function setLoading(btnEl, loading, text = 'Saqlanmoqda...') {
  if (!btnEl) return;
  if (loading) {
    btnEl.dataset.origText = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="spinner" style="width:14px;height:14px;margin-right:6px;display:inline-block;vertical-align:middle;"></span>${text}`;
    btnEl.disabled = true;
  } else {
    btnEl.innerHTML = btnEl.dataset.origText || 'Saqlash';
    btnEl.disabled = false;
  }
}
