// ==================== SHARED COMPONENTS ====================

const Components = {
  // ---- SIDEBAR ----
  renderSidebar(activeRoute, user) {
    return `
      <div id="sidebar">
        <div class="logo-section">
          <div class="logo-icon">🏥</div>
          <div class="logo-title">RSHTYOIM</div>
          <div class="logo-sub">Infarkt & Insult Registr</div>
        </div>
        <nav>
          <div class="nav-section-title">ASOSIY</div>
          <a class="nav-item ${activeRoute==='dashboard'?'active':''}" onclick="Router.go('dashboard')" href="#">
            <span class="nav-icon">📊</span> Dashboard
          </a>
          <a class="nav-item ${activeRoute==='bemorlar'?'active':''}" onclick="Router.go('bemorlar')" href="#">
            <span class="nav-icon">👥</span> Bemorlar ro'yxati
          </a>
          <div class="nav-section-title">QABUL QILISH</div>
          <a class="nav-item ${activeRoute==='infarkt-yangi'?'active':''}" onclick="Router.go('infarkt-yangi')" href="#">
            <span class="nav-icon">🫀</span> Yangi Infarkt bemori
          </a>
          <a class="nav-item ${activeRoute==='insult-yangi'?'active':''}" onclick="Router.go('insult-yangi')" href="#">
            <span class="nav-icon">🧠</span> Yangi Insult bemori
          </a>
          <div class="nav-section-title">TAHLIL</div>
          <a class="nav-item ${activeRoute==='hisobot'?'active':''}" onclick="Router.go('hisobot')" href="#">
            <span class="nav-icon">📈</span> Hisobotlar
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">👤</div>
            <div style="min-width:0;flex:1">
              <div class="user-name text-ellipsis">${user?.email?.split('@')[0] || 'Foydalanuvchi'}</div>
              <div class="user-email text-ellipsis">${user?.email || ''}</div>
            </div>
            <button onclick="App.logout()" title="Chiqish" style="color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;background:none;border:none;padding:4px;">🚪</button>
          </div>
        </div>
      </div>
      <div id="sidebar-overlay" onclick="Components.closeSidebar()"></div>
    `;
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  },

  // ---- TOPBAR ----
  renderTopbar(title, subtitle) {
    return `
      <div id="topbar">
        <div class="flex items-center gap-3">
          <button id="mobile-menu-btn" onclick="Components.openSidebar()"
            class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600">
            ☰
          </button>
          <div>
            <h1 class="text-base font-bold text-slate-800 leading-tight">${title}</h1>
            ${subtitle ? `<p class="text-xs text-slate-400">${subtitle}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span class="text-xs text-slate-400">Vaqt:</span>
            <span id="topbar-clock" class="text-xs font-semibold text-slate-700"></span>
          </div>
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Real-time faol"></div>
        </div>
      </div>
    `;
  },

  openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('show');
  },

  startClock() {
    const update = () => {
      const el = document.getElementById('topbar-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
  },

  // ---- LAYOUT WRAPPER ----
  renderLayout(activeRoute, title, subtitle, contentHtml, user) {
    return `
      ${Components.renderSidebar(activeRoute, user)}
      <div id="main-content">
        ${Components.renderTopbar(title, subtitle)}
        <div id="page-content">${contentHtml}</div>
      </div>
    `;
  },

  // ---- SELECT OPTIONS ----
  selectOptions(arr, selected = '', placeholder = 'Tanlang...') {
    const opts = arr.map(v => `<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('');
    return `<option value="">${placeholder}</option>${opts}`;
  },

  // ---- CHECKBOX GROUP ----
  checkboxGroup(name, options, selected = []) {
    return `<div class="checkbox-group" id="chk-${name}">
      ${options.map((opt, i) => `
        <label class="checkbox-item ${selected.includes(opt)?'checked':''}" id="chk-${name}-${i}">
          <input type="checkbox" name="${name}" value="${opt}" ${selected.includes(opt)?'checked':''}
            onchange="Components.toggleCheckbox(this)">
          ${opt}
        </label>
      `).join('')}
    </div>`;
  },

  toggleCheckbox(input) {
    input.closest('.checkbox-item').classList.toggle('checked', input.checked);
  },

  getChecked(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  },

  // ---- RADIO GROUP ----
  radioGroup(name, options, selected = '') {
    return `<div class="radio-group" id="rg-${name}">
      ${options.map((opt, i) => `
        <label class="radio-item ${opt===selected?'selected':''}" id="rg-${name}-${i}">
          <input type="radio" name="${name}" value="${opt}" ${opt===selected?'checked':''}
            onchange="Components.toggleRadio(this)">
          ${opt}
        </label>
      `).join('')}
    </div>`;
  },

  toggleRadio(input) {
    document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
      r.closest('.radio-item')?.classList.remove('selected');
    });
    input.closest('.radio-item')?.classList.add('selected');
  },

  getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  },

  // ---- FORM FIELD ----
  field(id, label, inputHtml, required = false, hint = '') {
    return `
      <div class="form-group">
        <label class="form-label" for="${id}">${label}${required?'<span class="required">*</span>':''}</label>
        ${inputHtml}
        ${hint ? `<div class="form-hint">${hint}</div>` : ''}
        <div class="form-error" id="${id}-error"></div>
      </div>
    `;
  },

  setError(id, msg) {
    const el = document.getElementById(`${id}-error`);
    if (el) el.textContent = msg || '';
    const inp = document.getElementById(id);
    if (inp) inp.classList.toggle('error', !!msg);
  },

  clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
    document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
  },

  // ---- PATIENT ROW ----
  patientRow(p, type) {
    const age = Utils.calculateAge(p.tugilgan_yil);
    return `
      <tr class="cursor-pointer" onclick="Router.go('bemor-karta', {kt_no:'${p.kt_no}',type:'${type}'})">
        <td>
          <div class="flex items-center gap-2">
            ${Utils.typeBadge(type)}
          </div>
        </td>
        <td class="font-semibold">${p.kt_no}</td>
        <td>${p.fio || '—'}</td>
        <td>${age ? age + ' yosh' : '—'} · ${p.jins || '—'}</td>
        <td>${p.viloyat || '—'}</td>
        <td>${Utils.formatDateTime(p.qabul_vaqt)}</td>
        <td>${Utils.statusBadge(p.status)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Router.go('bemor-karta', {kt_no:'${p.kt_no}',type:'${type}'})">
            Karta →
          </button>
        </td>
      </tr>
    `;
  },

  // ---- STEP PROGRESS ----
  stepProgress(steps, current) {
    let html = '<div class="progress-steps">';
    steps.forEach((s, i) => {
      const isDone = i < current;
      const isActive = i === current;
      html += `
        <div class="step-item">
          <div style="position:relative;display:flex;flex-direction:column;align-items:center">
            <div class="step-circle ${isDone?'done':isActive?'active':''}">
              ${isDone ? '✓' : i+1}
            </div>
            <span style="font-size:10px;color:${isActive?'#2563eb':isDone?'#16a34a':'#94a3b8'};font-weight:600;margin-top:6px;white-space:nowrap">${s}</span>
          </div>
          ${i < steps.length-1 ? `<div class="step-line ${isDone?'done':''}" style="margin-top:-14px"></div>` : ''}
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  // ---- TABS ----
  renderTabs(tabs, activeIdx = 0, onClickFn = 'App.switchTab') {
    return `
      <div class="tabs-header mb-4">
        ${tabs.map((t, i) => `
          <button class="tab-btn ${i===activeIdx?'active':''}" onclick="${onClickFn}(${i})" id="tab-btn-${i}">${t}</button>
        `).join('')}
      </div>
      ${tabs.map((t, i) => `<div class="tab-content ${i===activeIdx?'active':''}" id="tab-${i}"></div>`).join('')}
    `;
  }
};
