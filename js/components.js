// ==================== LUCIDE ICON HELPER ====================
function icon(name, size = 18, cls = '') {
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
  el.innerHTML = `${icon(icons[type]||'info',16)} <span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function showModal({ title, body, footer }) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="btn btn-ghost btn-sm" onclick="closeModal()" style="padding:4px 8px;font-size:18px">×</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>`;
  initIcons();
}
function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}

function setLoading(btn, loading, text = '') {
  if (!btn) return;
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${text}`;
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
  renderSidebar(activePage, user, isAdmin = false) {
    const email = user?.email || '';
    const initials = email.slice(0, 2).toUpperCase();
    const navItems = [
      { page: 'dashboard',    icon: 'layout-dashboard', label: 'Dashboard' },
      { page: 'bemorlar',     icon: 'users',            label: 'Bemorlar ro\'yxati' },
      { page: 'infarkt-yangi',icon: 'heart-pulse',      label: 'Yangi infarkt' },
      { page: 'insult-yangi', icon: 'brain',            label: 'Yangi insult' },
      { page: 'hisobot',      icon: 'bar-chart-2',      label: 'Hisobotlar' },
    ];

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">🏥</div>
          <div>
            <div class="sidebar-logo-text">RSHTYOIM</div>
            <div class="sidebar-logo-sub">Tibbiy registr</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section">Asosiy</div>
          ${navItems.slice(0,2).map(n => `
            <a class="nav-item ${activePage===n.page?'active':''}" onclick="Router.go('${n.page}'); closeSidebar()">
              ${icon(n.icon, 17, 'nav-icon')} ${n.label}
            </a>`).join('')}

          <div class="sidebar-section" style="margin-top:8px">Qabul qilish</div>
          ${navItems.slice(2,4).map(n => `
            <a class="nav-item ${activePage===n.page?'active':''}" onclick="Router.go('${n.page}'); closeSidebar()">
              ${icon(n.icon, 17, 'nav-icon')} ${n.label}
            </a>`).join('')}

          <div class="sidebar-section" style="margin-top:8px">Tahlil</div>
          <a class="nav-item ${activePage==='hisobot'?'active':''}" onclick="Router.go('hisobot'); closeSidebar()">
            ${icon('bar-chart-2', 17, 'nav-icon')} Hisobotlar
          </a>

          ${isAdmin ? `
          <div class="sidebar-section" style="margin-top:8px">Boshqaruv</div>
          <a class="nav-item ${activePage==='admin'?'active':''}" onclick="Router.go('admin'); closeSidebar()"
            style="${activePage==='admin'?'':''}background:${activePage==='admin'?'':'rgba(139,92,246,0.1)'};border-color:${activePage==='admin'?'':'rgba(139,92,246,0.2)'};color:${activePage==='admin'?'':'#c4b5fd'}">
            ${icon('shield', 17, 'nav-icon')} Admin Panel
          </a>` : ''}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${initials}</div>
            <div style="flex:1;overflow:hidden">
              <div class="sidebar-user-name truncate">${email}</div>
              <div class="sidebar-user-role">${isAdmin ? '👑 Admin' : 'Shifokor'}</div>
            </div>
            <button class="topbar-btn" onclick="App.logout()" title="Chiqish" style="width:30px;height:30px;border-radius:8px">
              ${icon('log-out', 15)}
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
        <div style="display:flex;align-items:center;gap:14px">
          <button class="mobile-menu-btn" onclick="openSidebar()">
            ${icon('menu', 20)}
          </button>
          <div>
            <div class="topbar-title">${title}</div>
            ${subtitle ? `<div class="topbar-sub">${subtitle}</div>` : ''}
          </div>
        </div>
        <div class="topbar-right">
          <div class="topbar-clock" id="topbar-clock">--:--</div>
          <button class="topbar-btn" onclick="Router.go('dashboard')" title="Bosh sahifa">
            ${icon('home', 16)}
          </button>
        </div>
      </header>`;
  },

  // ── Full layout ──
  async renderLayout(activePage, title, subtitle, content, user) {
    const isAdmin = await Profile.isAdmin();
    return `
      <div class="app-layout">
        ${Components.renderSidebar(activePage, user, isAdmin)}
        <div class="main-content">
          ${Components.renderTopbar(title, subtitle)}
          <div class="page-body">${content}</div>
        </div>
      </div>`;
  },

  // ── Clock ──
  startClock() {
    if (this._clockInterval) clearInterval(this._clockInterval);
    const update = () => {
      const el = document.getElementById('topbar-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('uz-UZ', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    };
    update();
    this._clockInterval = setInterval(update, 1000);
    initIcons();
  },

  stopClock() {
    if (this._clockInterval) { clearInterval(this._clockInterval); this._clockInterval = null; }
  },

  // ── Step progress ──
  stepProgress(steps, current) {
    return `
      <div style="display:flex;align-items:flex-start;margin-bottom:24px;overflow-x:auto;padding-bottom:4px">
        ${steps.map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:60px">
            <div style="display:flex;align-items:center;width:100%">
              ${i > 0 ? `<div style="flex:1;height:2px;background:${i<=current?'#10b981':'rgba(99,118,158,0.2)'}"></div>` : ''}
              <div class="step-circle ${i<current?'done':i===current?'active':''}" style="flex-shrink:0">
                ${i < current ? icon('check', 14) : i + 1}
              </div>
              ${i < steps.length-1 ? `<div style="flex:1;height:2px;background:${i<current?'#10b981':'rgba(99,118,158,0.2)'}"></div>` : ''}
            </div>
            <div class="step-label" style="color:${i===current?'#93c5fd':i<current?'#34d399':'#64748b'}">${s}</div>
          </div>`).join('')}
      </div>`;
  },

  // ── Tabs ──
  renderTabs(labels, activeIdx, switchFn) {
    return `
      <div class="tabs-container">
        ${labels.map((l, i) => `
          <button class="tab-btn ${i===activeIdx?'active':''}" id="tab-btn-${i}" onclick="${switchFn}(${i})">${l}</button>
        `).join('')}
      </div>
      ${labels.map((_, i) => `<div class="tab-content ${i===activeIdx?'active':''}" id="tab-${i}"></div>`).join('')}`;
  },

  // ── Form field ──
  field(id, label, inputHtml, required = false, hint = '') {
    return `
      <div class="form-group">
        <label class="form-label ${required?'required':''}" for="${id}">${label}</label>
        ${inputHtml}
        ${hint ? `<div class="form-hint">${hint}</div>` : ''}
        <div class="form-error hidden" id="err-${id}"></div>
      </div>`;
  },

  // ── Select options ──
  selectOptions(arr, selected = '') {
    return `<option value="">Tanlang...</option>` +
      arr.map(v => `<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('');
  },

  // ── Checkbox group ──
  checkboxGroup(name, options, selected = []) {
    return `<div class="checkbox-grid">${options.map(opt => `
      <label class="checkbox-item ${selected.includes(opt)?'selected':''}" onclick="Components.toggleCheckbox(this)">
        <input type="checkbox" name="${name}" value="${opt}" ${selected.includes(opt)?'checked':''} style="display:none">
        <div class="checkbox-box">${selected.includes(opt)?'✓':''}</div>
        <span style="font-size:12px">${opt}</span>
      </label>`).join('')}</div>`;
  },

  toggleCheckbox(label) {
    label.classList.toggle('selected');
    const box = label.querySelector('.checkbox-box');
    const inp = label.querySelector('input');
    inp.checked = !inp.checked;
    box.textContent = inp.checked ? '✓' : '';
  },

  getChecked(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
  },

  toggleRadio(input) {
    document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
      r.closest('.radio-item')?.classList.toggle('selected', r === input);
    });
  },

  getRadio(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  },

  // ── Patient row ──
  patientRow(p, type) {
    const age = p.tugilgan_yil ? new Date().getFullYear() - parseInt(p.tugilgan_yil.toString().slice(0,4)) : '?';
    const statusMap = {
      active:      '<span class="badge badge-green">● Aktiv</span>',
      chiqarildi:  '<span class="badge badge-blue">✓ Chiqarildi</span>',
      vafot:       '<span class="badge badge-red">✕ Vafot</span>'
    };
    const typeIcon = type === 'infarkt'
      ? `<span class="badge badge-red">🫀 Infarkt</span>`
      : `<span class="badge badge-purple">🧠 Insult</span>`;

    return `<tr onclick="Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${type}'})">
      <td>${typeIcon}</td>
      <td><code style="background:rgba(59,130,246,0.1);padding:2px 8px;border-radius:6px;font-size:12px;color:#93c5fd">${p.kt_no}</code></td>
      <td style="font-weight:600;color:#f1f5f9">${p.fio||'—'}</td>
      <td>${age} · ${p.jins||'—'}</td>
      <td>${p.viloyat||'—'}</td>
      <td style="font-size:12px;color:#64748b">${Utils.formatDateTime(p.qabul_vaqt)}</td>
      <td>${statusMap[p.status]||'<span class="badge badge-gray">—</span>'}</td>
      <td><button class="btn btn-ghost btn-sm">${icon('chevron-right',15)}</button></td>
    </tr>`;
  },

  clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => { el.textContent=''; el.classList.add('hidden'); });
  },

  setError(id, msg) {
    const el = document.getElementById(`err-${id}`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }
};

// ── Mobile sidebar ──
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}
