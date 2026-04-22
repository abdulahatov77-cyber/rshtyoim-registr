// ==================== LUCIDE ICON HELPER ====================
function icon(name, size = 20, cls = '') {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px" class="${cls}"></i>`;
}
function initIcons() {
  if (window.lucide) lucide.createIcons();
}

// ==================== GLOBAL HELPERS ====================
function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  const icons = { success:'check-circle', error:'x-circle', warning:'alert-triangle', info:'info' };
  el.className = `toast toast-${type}`;
  
  let color = 'var(--color-blue)';
  if (type === 'success') color = 'var(--color-green)';
  if (type === 'error') color = 'var(--color-infarkt)';
  if (type === 'warning') color = '#F59E0B';
  el.style.borderLeftColor = color;
  
  el.innerHTML = `<span style="color:${color}">${icon(icons[type]||'info', 20)}</span> <span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
  initIcons();
}

function showModal({ title, body, footer }) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <span class="text-lg font-bold text-gray-900">${title}</span>
          <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" onclick="closeModal()">
            ${icon('x', 20)}
          </button>
        </div>
        <div class="p-6">${body}</div>
        ${footer ? `<div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">${footer}</div>` : ''}
      </div>
    </div>`;
  initIcons();
}
function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}

function setLoading(btn, loading, text = '') {
  if (!btn) return;
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner inline-block mr-2 align-middle"></span> ${text}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._origText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ==================== COMPONENTS ====================
const Components = {
  _clockInterval: null,

  // ── Sidebar ──
  renderSidebar(activePage, user) {
    const email = user?.email || '';
    const initials = email.slice(0, 2).toUpperCase();
    const navItems = [
      { page: 'dashboard',    icon: 'layout-dashboard', label: 'Dashboard' },
      { page: 'bemorlar',     icon: 'users',            label: 'Bemorlar ro\'yxati' },
      { page: 'infarkt-yangi',icon: 'heart',            label: 'Yangi infarkt' },
      { page: 'insult-yangi', icon: 'brain',            label: 'Yangi insult' },
      { page: 'hisobot',      icon: 'bar-chart-3',      label: 'Hisobotlar' },
    ];

    return `
      <aside class="sidebar" id="sidebar">
        <div style="height:80px;padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03)">
          <div style="width:42px;height:42px;background:linear-gradient(135deg,#2563EB,#6366F1);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:0.3px">RSHTYOIM</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1.2px;font-weight:600">Tibbiy registr</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section">Asosiy</div>
          ${navItems.slice(0,2).map(n => `
            <a class="nav-item ${activePage===n.page?'active':''}" onclick="Router.go('${n.page}'); closeSidebar()">
              <span class="nav-icon">${icon(n.icon, 20)}</span> ${n.label}
            </a>`).join('')}

          <div class="sidebar-section mt-4">Qabul qilish</div>
          ${navItems.slice(2,4).map(n => `
            <a class="nav-item ${activePage===n.page?'active':''}" onclick="Router.go('${n.page}'); closeSidebar()">
              <span class="nav-icon">${icon(n.icon, 20)}</span> ${n.label}
            </a>`).join('')}

          <div class="sidebar-section mt-4">Tahlil</div>
          <a class="nav-item ${activePage==='hisobot'?'active':''}" onclick="Router.go('hisobot'); closeSidebar()">
            <span class="nav-icon">${icon('bar-chart-3', 20)}</span> Hisobotlar
          </a>

          <div class="sidebar-section mt-4" id="admin-nav-section" style="display:none">Admin</div>
          <a class="nav-item ${activePage==='admin'?'active':''}" id="admin-nav-item" style="display:none" onclick="Router.go('admin'); closeSidebar()">
            <span class="nav-icon">${icon('shield', 20)}</span> Admin Panel
          </a>
        </nav>

        <script>
          // Admin panelni faqat adminlar ko'radi
          Profile.isAdmin().then(isAdmin => {
            if (isAdmin) {
              const sec = document.getElementById('admin-nav-section');
              const item = document.getElementById('admin-nav-item');
              if (sec) sec.style.display = 'block';
              if (item) item.style.display = 'flex';
            }
          });
        </script>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${initials}</div>
            <div style="flex:1;overflow:hidden">
              <div class="sidebar-user-name truncate">${email}</div>
              <div class="sidebar-user-role">Shifokor</div>
            </div>
            <button class="logout-btn" onclick="App.logout()" title="Chiqish">
              ${icon('log-out', 18)}
            </button>
          </div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>`;
  },

  // ── Topbar ──
  renderTopbar(title, subtitle) {
    return `
      <header class="topbar">
        <div class="flex items-center gap-4">
          <button class="mobile-menu-btn text-gray-500 hover:text-gray-900 transition-colors" onclick="openSidebar()">
            ${icon('menu', 24)}
          </button>
          <div>
            <div class="flex items-center gap-3 mb-1">
              ${icon(this.getPageIcon(title), 24, 'text-blue-600')}
              <h1 class="page-title leading-none m-0">${title}</h1>
            </div>
            ${subtitle ? `<div class="topbar-sub">${subtitle}</div>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 flex items-center gap-2 shadow-sm">
            ${icon('clock', 16)} <span id="top-clock" class="font-semibold text-sm tracking-wide">--:--:--</span>
          </div>
          <button class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm" onclick="Router.go('dashboard')" title="Asosiy">
            ${icon('home', 20)}
          </button>
        </div>
      </header>`;
  },

  getPageIcon(title) {
    title = title.toLowerCase();
    if (title.includes('dashboard')) return 'layout-dashboard';
    if (title.includes('bemor')) return 'users';
    if (title.includes('hisobot')) return 'bar-chart-3';
    if (title.includes('infarkt')) return 'heart';
    if (title.includes('insult')) return 'brain';
    return 'activity';
  },

  // ── Layout Wrapper ──
  renderLayout(pageName, title, subtitle, innerHTML, user) {
    return `
      <div class="app-layout">
        ${this.renderSidebar(pageName, user)}
        <div class="main-content">
          ${this.renderTopbar(title, subtitle)}
          <main class="page-body">
            ${innerHTML}
          </main>
        </div>
      </div>
      <div id="toast-container" style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;pointer-events:none"></div>
      <div id="modal-container"></div>
    `;
  },

  // ── Clock ──
  startClock() {
    if (this._clockInterval) clearInterval(this._clockInterval);
    const el = document.getElementById('top-clock');
    if (!el) return;
    const update = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('uz-Cyrl-UZ', { hour12: false });
    };
    update();
    this._clockInterval = setInterval(update, 1000);
  },

  // ── Step Progress ──
  renderSteps(steps, currentIdx) {
    let html = '<div class="progress-container"><div class="progress-bar" style="width: ' + ((currentIdx + 1) / steps.length * 100) + '%"></div></div>';
    html += '<div class="flex items-center justify-between mb-8">';
    steps.forEach((st, i) => {
      const isDone = i < currentIdx;
      const isActive = i === currentIdx;
      let clr = 'text-gray-400';
      if (isActive) clr = 'text-blue-600 font-bold';
      if (isDone) clr = 'text-green-600';
      
      html += `
        <div class="flex flex-col items-center flex-1">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-4 ring-blue-100' : isDone ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-300'}">
            ${isDone ? icon('check', 18) : (i + 1)}
          </div>
          <span class="text-xs text-center ${clr}">${st}</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  // ── Patient Row ──
  patientRow(p, type) {
    const isInf = type === 'infarkt';
    const bColor = isInf ? 'badge-red' : 'badge-purple';
    const typeLabel = isInf ? 'Infarkt' : 'Insult';
    const typeIcon = isInf ? 'heart' : 'brain';
    const age = Utils.calculateAge(p.tugilgan_yil) || '—';
    const stBadge = Utils.statusBadge(p.status);

    return `
      <tr onclick="Router.go('bemor-karta', {kt_no:'${p.kt_no}', type:'${type}'})">
        <td>
          <span class="badge ${bColor} flex items-center gap-1.5 w-fit">
            ${icon(typeIcon, 14)} ${typeLabel}
          </span>
        </td>
        <td class="font-mono text-xs text-gray-500">${p.kt_no}</td>
        <td>
          <div class="font-semibold text-gray-900">${p.fio || '—'}</div>
        </td>
        <td>${age} yosh · ${p.jinsi==='erkak'?'Erkak':p.jinsi==='ayol'?'Ayol':'—'}</td>
        <td>
          <div class="flex items-center gap-1.5 text-gray-600">
            ${icon('map-pin', 14)} ${p.viloyat || '—'}
          </div>
        </td>
        <td>
          <div class="flex flex-col">
            <span class="text-gray-900">${Utils.formatDate(p.qabul_vaqt)}</span>
            <span class="text-xs text-gray-500">${Utils.formatDateTime(p.qabul_vaqt).split(', ')[1] || ''}</span>
          </div>
        </td>
        <td>${stBadge}</td>
        <td class="text-right text-gray-400">${icon('chevron-right', 20)}</td>
      </tr>
    `;
  }
};

window.openSidebar = function() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}
window.closeSidebar = function() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}
