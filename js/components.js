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
    // Check admin role from Profile cache (populated before renderLayout is called)
    const currentUserId = App._user?.id || user?.id;
    const cachedProfile = currentUserId ? Profile._cache[currentUserId] : null;
    const isAdmin = cachedProfile?.role === 'admin' || cachedProfile?.role === 'super_admin';
    const isSuperAdmin = cachedProfile?.role === 'super_admin';
    const displayName = cachedProfile?.fio || cachedProfile?.full_name || email;
    const initials = displayName ? displayName.charAt(0).toUpperCase() : 'U';
    const roleLabel = isSuperAdmin ? 'Super Administrator'
                    : isAdmin     ? 'Viloyat Admin'
                    :               'Shifokor';

    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', section: 'Asosiy' },
      { id: 'bemorlar', label: 'Bemorlar', icon: 'users' },
      { id: 'infarkt-yangi', label: 'Yangi Infarkt', icon: 'heart-pulse' },
      { id: 'insult-yangi', label: 'Yangi Insult', icon: 'brain-circuit' },

      { id: 'infarkt-reyestri', label: 'Infarkt reyestri', icon: 'heart', section: 'Reyestrlar' },
      { id: 'insult-reyestri', label: 'Insult reyestri', icon: 'brain' },

      { id: 'hisobot', label: 'Hisobotlar', icon: 'file-text', section: 'Tahlil va Hisobot' },

      { id: 'admin', label: 'Foydalanuvchilar', icon: 'user-cog', section: 'Tizim', superOnly: true },
      { id: 'settings', label: 'Sozlamalar', icon: 'settings' }
    ];

    let menuHtml = '';
    let currentSection = '';

    menuItems.forEach(item => {
      // superOnly: faqat super_admin ko'ra oladi
      if (item.superOnly && !isSuperAdmin) return;
      // adminOnly: admin va super_admin ko'ra oladi (hozir ishlatilmayapti, kelajak uchun)
      if (item.adminOnly && !isAdmin) return;

      if (item.section && item.section !== currentSection) {
        menuHtml += `<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6 mt-6 mb-2">${item.section}</p>`;
        currentSection = item.section;
      }
      
      const isActive = activePage === item.id;
      const activeCls = isActive ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50';

      menuHtml += `
        <a class="flex items-center gap-3 px-6 py-3 font-medium transition-all cursor-pointer ${activeCls}" onclick="Router.go('${item.id}'); closeSidebar()">
          <span class="${isActive ? 'text-blue-600' : 'text-slate-400'}">${icon(item.icon, 20)}</span>
          <span class="text-sm">${item.label}</span>
        </a>
      `;
    });

    return `
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen overflow-hidden fixed lg:relative z-50 transition-transform -translate-x-full lg:translate-x-0" id="sidebar">
        <div class="p-6 flex items-center gap-3 shrink-0">
          <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            ${icon('activity', 24)}
          </div>
          <div>
            <div class="text-sm font-black text-slate-800 leading-none">INFARKT & INSULT</div>
            <div class="text-[10px] font-bold text-blue-600 tracking-tighter mt-1 uppercase">Reyestri platformasi</div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto custom-scrollbar">
          ${menuHtml}
        </nav>

        <div class="p-4 border-t border-slate-100 shrink-0">
          <div class="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                 style="background: ${isSuperAdmin ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : isAdmin ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : '#2563eb'}">${initials}</div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-slate-800 truncate">${displayName}</p>
              <p class="text-[10px] font-medium text-slate-500 uppercase">${roleLabel}</p>
            </div>
            <button class="text-slate-400 hover:text-red-500 transition-colors" onclick="App.logout()">
              ${icon('log-out', 16)}
            </button>
          </div>
        </div>
      </aside>
      <div class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden hidden" id="sidebar-overlay" onclick="closeSidebar()"></div>`;
  },

  // ── Topbar ──
  renderTopbar(_title, _subtitle, user) {
    const currentUserId = App._user?.id || user?.id;
    const cachedProfile = currentUserId ? Profile._cache[currentUserId] : null;
    const initials = (cachedProfile?.fio || cachedProfile?.full_name || user?.email || 'U').charAt(0).toUpperCase();
    return `
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-30">
        <div class="flex items-center gap-6 flex-1">
          <button class="lg:hidden text-slate-500 hover:text-slate-900" onclick="openSidebar()">
            ${icon('menu', 24)}
          </button>
          
          <div class="relative w-full max-w-md hidden md:block">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="topbar-search" placeholder="Qidirish: ID, F.I.Sh, telefon... (Enter)"
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              onkeydown="if(event.key==='Enter'){const v=this.value.trim();if(v){Router.go('bemorlar',{search:v});this.value='';}}">
          </div>

        </div>

        <div class="flex items-center gap-4">
          <div class="hidden sm:flex flex-col items-end mr-2">
            <span id="top-clock" class="text-sm font-black text-slate-800 tracking-wider">--:--:--</span>
            <span class="text-[9px] font-bold text-blue-600 uppercase">Real-time monitoring</span>
          </div>

          <div class="relative" id="notif-wrapper">
            <button class="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors" onclick="Notifications.toggle()" aria-label="Bildirishnomalar">
              ${icon('bell', 20)}
              <span id="notif-badge" class="hidden absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">0</span>
            </button>
            <div id="notif-dropdown" class="hidden absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div class="p-5 text-center text-slate-400">
                <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            </div>
          </div>
          
          <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer" onclick="Router.go('settings')" title="Sozlamalar">
            ${initials}
          </div>
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
      <div class="flex h-screen bg-[#F8FAFC] overflow-hidden">
        ${this.renderSidebar(pageName, user)}
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          ${this.renderTopbar(title, subtitle, user)}
          <main class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-8">
            <div class="mb-8">
               <h1 class="text-2xl font-black text-slate-800 leading-none mb-2">${title}</h1>
               <p class="text-sm font-medium text-slate-500">${subtitle || 'Tizim ko\'rsatkichlari'}</p>
            </div>
            ${innerHTML}
          </main>
        </div>
      </div>
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
    Notifications.load();
    Notifications._updateBadge(); // yangi DOM da badge ni yangilash
  },

  // ── Step Progress ──
  renderSteps(steps, currentIdx) {
    let html = '<div class="progress-container"><div class="progress-bar" style="width: ' + ((currentIdx + 1) / steps.length * 100) + '%"></div></div>';
    html += '<div class="flex items-center justify-between mb-4 sm:mb-8">';
    steps.forEach((st, i) => {
      const isDone = i < currentIdx;
      const isActive = i === currentIdx;
      let clr = 'text-gray-400';
      if (isActive) clr = 'text-blue-600 font-bold';
      if (isDone) clr = 'text-green-600';
      html += `
        <div class="flex flex-col items-center flex-1">
          <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 mb-1 sm:mb-2 transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 sm:ring-4 ring-blue-100' : isDone ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-300'}">
            ${isDone ? icon('check', 14) : (i + 1)}
          </div>
          <span class="text-[10px] sm:text-xs text-center ${clr} leading-tight">${st}</span>
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
    const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil) || '—';
    const stBadge = Utils.statusBadge(p.status);
    const jins = p.jins || p.jinsi || '—';

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
        <td>${age} yosh · ${jins}</td>
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

// ==================== NOTIFICATIONS ====================
const Notifications = {
  _list: [],
  _loaded: false,
  _open: false,
  _outsideHandler: null,

  async load() {
    if (this._loaded) return;
    try {
      const sb = getSupabase();
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const [{ data: infs }, { data: ins }] = await Promise.all([
        sb.from('infarkt_qabul')
          .select('kt_no, fio, viloyat, status, created_at, muassasa')
          .gte('created_at', since).order('created_at', { ascending: false }).limit(10),
        sb.from('insult_qabul')
          .select('kt_no, fio, viloyat, status, created_at, muassasa')
          .gte('created_at', since).order('created_at', { ascending: false }).limit(10)
      ]);

      const build = (p, regType) => ({
        id: `${regType}_${p.kt_no}`,
        type: p.status === 'vafot' ? 'danger' : regType,
        title: p.status === 'vafot' ? 'Vafot holati qayd etildi'
          : `Yangi ${regType === 'infarkt' ? 'Infarkt' : 'Insult'} bemori`,
        body: p.fio || 'Ism kiritilmagan',
        sub: p.viloyat || p.muassasa || '',
        time: p.created_at,
        kt_no: p.kt_no,
        ptype: regType,
        read: false
      });

      const list = [
        ...(infs || []).map(p => build(p, 'infarkt')),
        ...(ins  || []).map(p => build(p, 'insult'))
      ];
      list.sort((a, b) => new Date(b.time) - new Date(a.time));
      this._list = list.slice(0, 15);
      this._loaded = true;
      this._updateBadge();
    } catch (err) {
      console.warn('Notifications.load error:', err);
    }
  },

  toggle() {
    if (this._open) { this.close(); return; }
    this._open = true;
    const el = document.getElementById('notif-dropdown');
    if (!el) return;
    el.classList.remove('hidden');
    if (!this._loaded) {
      this.load().then(() => {
        this._list.forEach(n => n.read = true);
        this._updateBadge();
        this.renderDropdown();
      });
    } else {
      this._list.forEach(n => n.read = true);
      this._updateBadge();
      this.renderDropdown();
    }
    setTimeout(() => {
      this._outsideHandler = (e) => {
        if (!document.getElementById('notif-wrapper')?.contains(e.target)) this.close();
      };
      document.addEventListener('click', this._outsideHandler);
    }, 0);
  },

  close() {
    this._open = false;
    document.getElementById('notif-dropdown')?.classList.add('hidden');
    if (this._outsideHandler) {
      document.removeEventListener('click', this._outsideHandler);
      this._outsideHandler = null;
    }
  },

  markAllRead() {
    this._list.forEach(n => n.read = true);
    this._updateBadge();
    this.renderDropdown();
  },

  _updateBadge() {
    const unread = this._list.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.toggle('hidden', unread === 0);
  },

  renderDropdown() {
    const el = document.getElementById('notif-dropdown');
    if (!el) return;
    const unread = this._list.filter(n => !n.read).length;

    const colorMap = {
      infarkt: ['bg-red-100 text-red-600',    'heart'],
      insult:  ['bg-purple-100 text-purple-600', 'brain'],
      danger:  ['bg-red-100 text-red-700',    'alert-circle']
    };

    const items = this._list.length === 0
      ? `<div class="py-10 text-center text-slate-400">
           ${icon('bell-off', 32, 'mx-auto mb-3')}
           <p class="text-sm">So'nggi 48 soatda yangi bemor yo'q</p>
         </div>`
      : this._list.map(n => {
          const [clr, ic] = colorMap[n.type] || ['bg-blue-100 text-blue-600', 'bell'];
          return `
            <div class="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${n.read ? 'opacity-60' : ''}"
                 onclick="Notifications._goTo('${n.kt_no}','${n.ptype}')">
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${clr}">
                ${icon(ic, 16)}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-1">
                  <p class="text-xs font-bold text-slate-800 leading-tight">${n.title}</p>
                  ${!n.read ? '<span class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>' : ''}
                </div>
                <p class="text-sm text-slate-700 truncate font-medium">${n.body}</p>
                ${n.sub ? `<p class="text-xs text-slate-400 truncate">${n.sub}</p>` : ''}
                <p class="text-[10px] text-slate-400 mt-1">${Utils.relativeTime(n.time)}</p>
              </div>
            </div>`;
        }).join('');

    el.innerHTML = `
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <span class="font-bold text-slate-800 text-sm">Bildirishnomalar</span>
        ${unread > 0
          ? `<button class="text-xs text-blue-600 font-semibold hover:underline" onclick="Notifications.markAllRead()">Ko'rildi deb belgilash</button>`
          : `<span class="text-xs text-slate-400">Hammasi ko'rildi</span>`}
      </div>
      <div class="overflow-y-auto max-h-[360px] custom-scrollbar">${items}</div>
      <div class="px-4 py-3 border-t border-slate-100 text-center bg-slate-50">
        <button class="text-xs text-blue-600 font-semibold hover:underline"
          onclick="Notifications.close(); Router.go('bemorlar')">
          Barcha bemorlarni ko'rish →
        </button>
      </div>`;
    initIcons();
  },

  _goTo(kt_no, ptype) {
    this.close();
    const n = this._list.find(x => x.kt_no === kt_no);
    if (n) { n.read = true; this._updateBadge(); }
    Router.go('bemor-karta', { kt_no, type: ptype });
  }
};
