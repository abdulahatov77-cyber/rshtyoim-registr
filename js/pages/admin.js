// ==================== ADMIN PANEL ====================
const AdminPage = {
  _profiles: [],
  _totalCount: null,
  _search: '',
  _filterRole: '',
  _usersPage: 1,
  _usersPerPage: 50,
  _activeTab: 'users',
  _overrides: [],
  _selViloyat: '',
  _auditData: null,
  _auditLoading: false,
  _dupData: null,
  _dupLoading: false,
  _dupMode: 'day',  // 'day' = bir kun ichida, 'all' = barcha vaqt (Kirill/Lotin)

  async render() {
    const profile = await Profile.getCurrent();
    const isSuperAdmin = profile?.role === 'super_admin';
    const isViloyatAdmin = profile?.role === 'admin';
    if (!isSuperAdmin && !isViloyatAdmin) {
      document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a">
          <div style="text-align:center">
            <div style="font-size:64px;margin-bottom:16px">🚫</div>
            <h2 style="color:#f87171;font-size:22px;font-weight:700;margin-bottom:8px">Ruxsat yo'q</h2>
            <p style="color:#64748b;margin:8px 0 24px">Bu sahifa faqat Administrator uchun</p>
            <button class="btn btn-ghost" onclick="Router.go('dashboard')">← Bosh sahifaga</button>
          </div>
        </div>`;
      return;
    }
    AdminPage._isSuperAdmin = isSuperAdmin;
    AdminPage._isViloyatAdmin = isViloyatAdmin;
    AdminPage._myViloyat = profile?.viloyat || '';

    if (!AdminPage._selViloyat) {
      AdminPage._selViloyat = Object.keys(APP_CONFIG.MUASSASALAR)[0] || '';
    }

    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'admin', '⚙️ Admin Panel', 'Tizim boshqaruvi',
      `<div id="admin-content"><div style="display:flex;align-items:center;justify-content:center;padding:60px"><div class="spinner" style="width:32px;height:32px"></div></div></div>`,
      user
    );
    Components.startClock();
    await Promise.all([AdminPage._loadProfiles(), AdminPage._loadOverrides()]);
  },

  async _loadProfiles() {
    try {
      // Parallel: ro'yxat + haqiqiy son (RLS/limit dan mustaqil)
      const [profiles, countRes] = await Promise.all([
        Profile.listAll(),
        getSupabase().from('profiles').select('id', { count: 'exact', head: true })
      ]);
      AdminPage._profiles = profiles;
      AdminPage._totalCount = countRes.count ?? profiles.length;
      AdminPage.renderContent();
    } catch (err) {
      const inner = document.getElementById('admin-content');
      if (inner) inner.innerHTML = `<div class="empty-state"><div class="empty-state-title" style="color:#f87171">❌ ${err.message}</div></div>`;
    }
  },

  async _loadOverrides() {
    try {
      AdminPage._overrides = await MuassasaDB.getOverrides();
      MuassasaDB.applyToConfig(AdminPage._overrides);
    } catch(e) { /* table not yet created */ }
  },

  renderContent() {
    const inner = document.getElementById('admin-content');
    if (!inner) return;
    const allTabs = [
      ['users', '👥 Foydalanuvchilar'],
      ['muassasalar', '🏥 Muassasalar'],
      ['aholi', '👨‍👩‍👧 Aholi soni'],
      ['audit', '🔍 Ma\'lumot sifati'],
      ['duplikat', '👥 Duplikatlar'],
      ['logs', '📋 Kirish tarixi'],
      ['xabarlar', '💬 Xabarlar']
    ];
    const visibleTabs = AdminPage._isViloyatAdmin
      ? allTabs.filter(([t]) => t === 'duplikat')
      : allTabs;
    if (AdminPage._isViloyatAdmin) AdminPage._activeTab = 'duplikat';
    inner.innerHTML = `
      <div class="animate-fadein">
        ${AdminPage._isViloyatAdmin ? `<div style="padding:10px 16px;background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.2);border-radius:12px;margin-bottom:20px;font-size:13px;color:#60a5fa;font-weight:600">
          🛡 Viloyat Admin — ${AdminPage._myViloyat || ''} viloyati duplikat boshqaruvi
        </div>` : ''}
        <div style="display:flex;gap:3px;margin-bottom:24px;background:rgba(15,23,42,0.8);border-radius:14px;padding:5px;width:fit-content;border:1px solid rgba(99,118,158,0.15)">
          ${visibleTabs.map(([t, label]) => `
            <button onclick="AdminPage.switchTab('${t}')" id="tab-btn-${t}"
              style="padding:9px 20px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.2s;display:flex;align-items:center;gap:6px;
              ${AdminPage._activeTab === t ? 'background:#1e293b;color:#e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.3)' : 'background:transparent;color:#64748b;'}">
              ${label}${t === 'xabarlar' ? ' <span id="tab-unread-badge" style="display:none;background:#ef4444;color:white;font-size:10px;font-weight:800;border-radius:999px;padding:1px 6px;line-height:16px"></span>' : ''}
            </button>`).join('')}
        </div>
        <div id="admin-tab-content"></div>
      </div>`;
    AdminPage._renderTabContent();
    initIcons();
    AdminPage._loadTabUnreadBadge();
  },

  async _loadTabUnreadBadge() {
    try {
      const { count } = await getSupabase()
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('o_qildi', false);
      const badge = document.getElementById('tab-unread-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch(e) { /* ignore */ }
  },

  switchTab(tab) {
    AdminPage._activeTab = tab;
    ['users','muassasalar','aholi','audit','duplikat','logs','xabarlar'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      if (!btn) return;
      btn.style.background = t === tab ? '#1e293b' : 'transparent';
      btn.style.color = t === tab ? '#e2e8f0' : '#64748b';
      btn.style.boxShadow = t === tab ? '0 2px 8px rgba(0,0,0,0.3)' : 'none';
    });
    AdminPage._renderTabContent();
  },

  _renderTabContent() {
    const el = document.getElementById('admin-tab-content');
    if (!el) return;
    if (AdminPage._activeTab === 'users') el.innerHTML = AdminPage._buildUsersTab();
    else if (AdminPage._activeTab === 'muassasalar') el.innerHTML = AdminPage._buildMuassasaTab();
    else if (AdminPage._activeTab === 'aholi') el.innerHTML = AdminPage._buildAholiTab();
    else if (AdminPage._activeTab === 'audit') el.innerHTML = AdminPage._buildAuditTab();
    else if (AdminPage._activeTab === 'duplikat') el.innerHTML = AdminPage._buildDupTab();
    else if (AdminPage._activeTab === 'logs') { el.innerHTML = '<div style="color:#94a3b8;padding:32px;text-align:center">Yuklanmoqda...</div>'; AdminPage._loadLogs(); }
    else if (AdminPage._activeTab === 'xabarlar') { el.innerHTML = '<div style="color:#94a3b8;padding:32px;text-align:center">Yuklanmoqda...</div>'; AdminPage._loadFeedback(); }
    initIcons();
  },

  // ==================== USERS TAB ====================

  getFiltered() {
    let list = AdminPage._profiles;
    if (AdminPage._search) {
      const q = AdminPage._search.toLowerCase();
      list = list.filter(p =>
        (p.email||'').toLowerCase().includes(q) ||
        (p.full_name||'').toLowerCase().includes(q) ||
        (p.fio||'').toLowerCase().includes(q) ||
        (p.viloyat||'').toLowerCase().includes(q)
      );
    }
    if (AdminPage._filterRole) list = list.filter(p => p.role === AdminPage._filterRole);
    return list;
  },

  _buildUsersTab() {
    const all = AdminPage._profiles;
    const filtered = AdminPage.getFiltered();
    const superCnt = all.filter(p => p.role === 'super_admin').length;
    const adminCnt = all.filter(p => p.role === 'admin').length;
    const userCnt  = all.filter(p => p.role === 'user').length;
    const vilMap = {};
    all.forEach(p => { if (p.viloyat) vilMap[p.viloyat] = (vilMap[p.viloyat]||0) + 1; });
    const topVil = Object.entries(vilMap).sort((a,b)=>b[1]-a[1]);

    // Muassasalar bo'yicha foydalanuvchilar soni
    const muassasaMap = {};
    all.forEach(p => {
      if (p.muassasa) muassasaMap[p.muassasa] = (muassasaMap[p.muassasa]||0) + 1;
    });
    const topMuassasa = Object.entries(muassasaMap).sort((a,b)=>b[1]-a[1]);

    return `
      <div class="stat-grid" style="margin-bottom:20px;grid-template-columns:repeat(4,1fr)">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa">${icon('users',24)}</div>
          <div><div class="stat-value">${AdminPage._totalCount ?? all.length}</div><div class="stat-label">Jami foydalanuvchilar</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#c4b5fd">${icon('crown',24)}</div>
          <div><div class="stat-value">${superCnt}</div><div class="stat-label">Super Adminlar</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(14,165,233,0.15);color:#38bdf8">${icon('shield',24)}</div>
          <div><div class="stat-value">${adminCnt}</div><div class="stat-label">Viloyat Adminlar</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('user-check',24)}</div>
          <div><div class="stat-value">${userCnt}</div><div class="stat-label">Shifokorlar</div></div>
        </div>
      </div>

      <div class="card mb-5">
        <div class="card-header"><span class="card-title">${icon('info',16)} Rol huquqlari</span></div>
        <div style="overflow-x:auto;padding:0 16px 16px">
          <table class="data-table" style="font-size:12px">
            <thead><tr>
              <th>Imkoniyat</th>
              <th style="text-align:center">👤 Shifokor</th>
              <th style="text-align:center">🛡 Viloyat Admin</th>
              <th style="text-align:center">👑 Super Admin</th>
            </tr></thead>
            <tbody>
              ${[
                ["Ma'lumot ko'rish (o'z viloyati)", true, true, true],
                ["Yangi bemor qo'shish", true, true, true],
                ["Bemor ma'lumotini tahrirlash", false, true, true],
                ["Bemorni o'chirish", false, false, true],
                ["Barcha viloyatlar ma'lumoti", false, false, true],
                ["Foydalanuvchilarni boshqarish", false, false, true],
                ["Muassasalar ro'yxatini boshqarish", false, false, true],
              ].map(([label, u, a, s]) => `<tr>
                <td style="color:#94a3b8">${label}</td>
                <td style="text-align:center">${u?'<span style="color:#34d399;font-size:16px">✓</span>':'<span style="color:#475569">—</span>'}</td>
                <td style="text-align:center">${a?'<span style="color:#38bdf8;font-size:16px">✓</span>':'<span style="color:#475569">—</span>'}</td>
                <td style="text-align:center">${s?'<span style="color:#c4b5fd;font-size:16px">✓</span>':'<span style="color:#475569">—</span>'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 240px;gap:20px;align-items:start">
        <div class="card" style="min-width:0;overflow:hidden">
          <div class="card-header" style="flex-wrap:wrap;gap:8px">
            <span class="card-title">${icon('users',16)} Foydalanuvchilar ro'yxati</span>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input id="admin-search" type="text" placeholder="Qidirish..." value="${AdminPage._search}"
                oninput="AdminPage._search=this.value;AdminPage._renderTable()"
                class="form-input" style="width:160px;padding:6px 12px;font-size:12px"/>
              <select id="admin-role-filter" onchange="AdminPage._filterRole=this.value;AdminPage._renderTable()"
                class="form-input" style="width:140px;padding:6px 10px;font-size:12px">
                <option value="" ${!AdminPage._filterRole?'selected':''}>Barcha rol</option>
                <option value="super_admin" ${AdminPage._filterRole==='super_admin'?'selected':''}>👑 Super Admin</option>
                <option value="admin" ${AdminPage._filterRole==='admin'?'selected':''}>🛡 Viloyat Admin</option>
                <option value="user" ${AdminPage._filterRole==='user'?'selected':''}>👤 Shifokor</option>
              </select>
              <button class="btn btn-ghost btn-sm" onclick="AdminPage._loadProfiles()">${icon('refresh-cw',14)} Yangilash</button>
            </div>
          </div>
          <div style="overflow-x:auto" id="admin-table-wrap">${AdminPage._buildTable()}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;width:260px;position:sticky;top:16px">

          <!-- Viloyatlar -->
          <div class="card">
            <div class="card-header"><span class="card-title">${icon('map',14)} Viloyatlar bo'yicha</span></div>
            <div style="padding:4px 0;max-height:35vh;overflow-y:auto">
              ${topVil.length ? topVil.map(([v,cnt]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(99,118,158,0.1)">
                  <span style="font-size:12px;color:#e2e8f0;font-weight:600;flex:1;margin-right:8px">${v}</span>
                  <span style="font-size:12px;font-weight:700;color:#60a5fa;background:rgba(59,130,246,0.12);padding:2px 8px;border-radius:20px;white-space:nowrap">${cnt}</span>
                </div>`).join('')
              : '<p style="color:#64748b;font-size:12px;text-align:center;padding:16px">Viloyatlar yo\'q</p>'}
            </div>
          </div>

          <!-- Muassasalar faolligi -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">${icon('building-2',14)} Muassasalar</span>
              <span style="font-size:11px;color:#64748b">${topMuassasa.length} ta</span>
            </div>
            <div style="padding:4px 0;max-height:35vh;overflow-y:auto">
              ${topMuassasa.length ? topMuassasa.map(([m,cnt], i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-bottom:1px solid rgba(99,118,158,0.1)">
                  <div style="flex:1;margin-right:8px;min-width:0">
                    <div style="font-size:11px;color:#e2e8f0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${m}">${i+1}. ${m}</div>
                  </div>
                  <span style="font-size:12px;font-weight:700;color:#34d399;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0">${cnt}</span>
                </div>`).join('')
              : '<p style="color:#64748b;font-size:12px;text-align:center;padding:16px">Ma\'lumot yo\'q</p>'}
            </div>
          </div>

        </div>
      </div>`;
  },

  _buildTable() {
    const filtered = AdminPage.getFiltered();
    const perPage = AdminPage._usersPerPage;
    const page = AdminPage._usersPage || 1;
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const from = (page - 1) * perPage;
    const pageList = filtered.slice(from, from + perPage);

    const paginationHtml = totalPages > 1 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid rgba(99,118,158,0.15);flex-wrap:wrap;gap:8px">
        <span style="font-size:12px;color:#64748b">
          <b style="color:#e2e8f0">${from+1}–${Math.min(from+perPage,total)}</b> / jami <b style="color:#e2e8f0">${total}</b> ta
        </span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button onclick="AdminPage._goUsersPage(1)" ${page===1?'disabled':''} style="padding:4px 10px;border-radius:7px;border:1px solid rgba(99,118,158,0.2);background:${page===1?'transparent':'rgba(37,99,235,0.15)'};color:${page===1?'#475569':'#60a5fa'};font-size:12px;cursor:${page===1?'default':'pointer'}">«</button>
          <button onclick="AdminPage._goUsersPage(${page-1})" ${page===1?'disabled':''} style="padding:4px 10px;border-radius:7px;border:1px solid rgba(99,118,158,0.2);background:${page===1?'transparent':'rgba(37,99,235,0.15)'};color:${page===1?'#475569':'#60a5fa'};font-size:12px;cursor:${page===1?'default':'pointer'}">‹</button>
          ${Array.from({length:Math.min(5,totalPages)},(_,i)=>{
            let p2 = page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
            p2 = Math.max(1,Math.min(totalPages,p2));
            return `<button onclick="AdminPage._goUsersPage(${p2})" style="padding:4px 10px;border-radius:7px;border:1px solid rgba(99,118,158,0.2);background:${p2===page?'#2563eb':'rgba(37,99,235,0.1)'};color:${p2===page?'#fff':'#94a3b8'};font-size:12px;font-weight:${p2===page?'700':'400'};cursor:pointer">${p2}</button>`;
          }).join('')}
          <button onclick="AdminPage._goUsersPage(${page+1})" ${page===totalPages?'disabled':''} style="padding:4px 10px;border-radius:7px;border:1px solid rgba(99,118,158,0.2);background:${page===totalPages?'transparent':'rgba(37,99,235,0.15)'};color:${page===totalPages?'#475569':'#60a5fa'};font-size:12px;cursor:${page===totalPages?'default':'pointer'}">›</button>
          <button onclick="AdminPage._goUsersPage(${totalPages})" ${page===totalPages?'disabled':''} style="padding:4px 10px;border-radius:7px;border:1px solid rgba(99,118,158,0.2);background:${page===totalPages?'transparent':'rgba(37,99,235,0.15)'};color:${page===totalPages?'#475569':'#60a5fa'};font-size:12px;cursor:${page===totalPages?'default':'pointer'}">»</button>
        </div>
      </div>` : '';

    return `<table class="data-table">
      <thead><tr>
        <th>#</th><th>Email</th><th>F.I.O</th><th>Rol</th>
        <th>Viloyat</th><th>Ro'yxat sanasi</th><th style="min-width:300px">Amallar</th>
      </tr></thead>
      <tbody>
        ${pageList.length
          ? pageList.map((p,i) => AdminPage.renderRow(p, from+i+1)).join('')
          : `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">${icon('inbox',24)}<br><span style="font-size:13px">Foydalanuvchilar yo'q</span></td></tr>`}
      </tbody>
    </table>${paginationHtml}`;
  },

  _renderTable() {
    AdminPage._usersPage = 1;
    const wrap = document.getElementById('admin-table-wrap');
    if (wrap) { wrap.innerHTML = AdminPage._buildTable(); initIcons(); }
  },

  _goUsersPage(page) {
    AdminPage._usersPage = page;
    const wrap = document.getElementById('admin-table-wrap');
    if (wrap) { wrap.innerHTML = AdminPage._buildTable(); initIcons(); }
  },

  renderRow(p, num) {
    const isSA = p.role === 'super_admin';
    const isMain = (p.email||'').toLowerCase() === 'abdulahatov77@gmail.com';
    const roleBadge = isSA
      ? `<span class="badge" style="background:rgba(139,92,246,0.2);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)">${icon('crown',12)} Super Admin</span>`
      : p.role === 'admin'
      ? `<span class="badge" style="background:rgba(14,165,233,0.15);color:#38bdf8;border:1px solid rgba(14,165,233,0.3)">${icon('shield',12)} Viloyat Admin</span>`
      : `<span class="badge badge-blue">${icon('user',12)} Shifokor</span>`;
    const vilOpts = ['', ...APP_CONFIG.VILOYATLAR]
      .map(v => `<option value="${v}" ${p.viloyat===v?'selected':''}>${v||'— Tanlang —'}</option>`).join('');
    return `<tr>
      <td style="color:#64748b;font-size:11px">${num}</td>
      <td style="font-weight:600;font-size:12px;color:#0f172a">${p.email||'—'}${isMain?'<span style="font-size:10px;background:rgba(139,92,246,0.15);color:#6d28d9;padding:1px 6px;border-radius:10px;margin-left:4px">Asosiy</span>':''}</td>
      <td style="font-size:12px;color:#0f172a;font-weight:600">${p.fio||p.full_name||'—'}</td>
      <td>${roleBadge}</td>
      <td style="font-size:12px;color:#1e293b;font-weight:600">${p.viloyat||'<span style="color:#94a3b8">Belgilanmagan</span>'}</td>
      <td style="font-size:11px;color:#475569">${p.created_at?new Date(p.created_at).toLocaleDateString('uz-UZ'):'—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <select id="role-${p.id}" onchange="AdminPage.changeRole('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer"
            ${isMain?'disabled':''}>
            <option value="user" ${p.role==='user'?'selected':''}>👤 Shifokor</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>🛡 Viloyat Admin</option>
            <option value="super_admin" ${p.role==='super_admin'?'selected':''}>👑 Super Admin</option>
          </select>
          <select id="vil-${p.id}" onchange="AdminPage.changeViloyat('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer"
            ${isSA?'disabled':''}>
            ${vilOpts}
          </select>
          <button onclick="AdminPage.sendPasswordReset('${(p.email||'').replace(/'/g,"\\'")}')"
            title="Parol tiklash emaili yuborish"
            style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:5px 8px;color:#60a5fa;font-size:11px;cursor:pointer">${icon('key',13)}</button>
          <button onclick="AdminPage.deleteUser('${p.id}','${(p.email||'').replace(/'/g,"\\'")}','${p.role||''}')"
            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:5px 8px;color:#f87171;font-size:11px;cursor:pointer"
            ${isMain?'disabled':''}>${icon('trash-2',13)}</button>
        </div>
      </td>
    </tr>`;
  },

  async changeRole(userId, role) {
    try {
      await Profile.setRole(userId, role);
      showToast(`✅ Rol o'zgartirildi`, 'success');
      const idx = AdminPage._profiles.findIndex(p => p.id === userId);
      if (idx !== -1) AdminPage._profiles[idx].role = role;
      AdminPage._renderTable();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  },

  async changeViloyat(userId, viloyat) {
    try {
      await Profile.setViloyat(userId, viloyat);
      showToast(`✅ Viloyat o'zgartirildi`, 'success');
      const idx = AdminPage._profiles.findIndex(p => p.id === userId);
      if (idx !== -1) AdminPage._profiles[idx].viloyat = viloyat;
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  },

  async sendPasswordReset(email) {
    if (!confirm(`"${email}" manziliga parol tiklash havolasi yuborilsinmi?`)) return;
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/'
      });
      if (error) throw error;
      showToast(`✅ Parol tiklash havolasi yuborildi: ${email}`, 'success');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  },

  async deleteUser(userId, email, role) {
    if (role === 'super_admin') { showToast("⚠️ Super Admin o'chirilmaydi", 'warning'); return; }
    if (!confirm(`"${email}" foydalanuvchisini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await Profile.deleteProfile(userId);
      showToast(`🗑 O'chirildi: ${email}`, 'success');
      AdminPage._profiles = AdminPage._profiles.filter(p => p.id !== userId);
      AdminPage._renderTabContent();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  },

  // ==================== MUASSASALAR TAB ====================

  _buildMuassasaTab() {
    const viloyatlar = Object.keys(APP_CONFIG._MUASSASALAR_BASE || APP_CONFIG.MUASSASALAR);
    const sel = AdminPage._selViloyat || viloyatlar[0] || '';
    const effective = (APP_CONFIG.MUASSASALAR)[sel] || [];

    // Overrides for selected viloyat
    const addOvs = AdminPage._overrides.filter(o => o.viloyat === sel && o.action === 'add');
    const remOvs = AdminPage._overrides.filter(o => o.viloyat === sel && o.action === 'remove');
    const removedNames = remOvs.map(o => o.nomi);
    const addedNames = addOvs.map(o => o.nomi);

    const totalOvCount = AdminPage._overrides.length;

    return `
      <div style="display:grid;grid-template-columns:240px 1fr;gap:16px;align-items:start">

        <!-- Viloyat list -->
        <div class="card" style="padding:8px">
          <div style="padding:10px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">
            Viloyat tanlang
          </div>
          ${viloyatlar.map(v => {
            const hasChanges = AdminPage._overrides.some(o => o.viloyat === v);
            return `<button onclick="AdminPage.selectViloyat(this.dataset.v)" data-v="${v.replace(/"/g,'&quot;')}"
              style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:9px 12px;border:none;border-radius:8px;cursor:pointer;text-align:left;font-size:13px;transition:background 0.15s;
              ${sel === v ? 'background:#1e293b;color:#e2e8f0;font-weight:700' : 'background:transparent;color:#94a3b8'}">
              <span>${v}</span>
              ${hasChanges ? '<span style="width:7px;height:7px;background:#f59e0b;border-radius:50%;flex-shrink:0"></span>' : ''}
            </button>`;
          }).join('')}
        </div>

        <!-- Muassasalar list -->
        <div>
          <div class="card mb-4">
            <div class="card-header" style="flex-wrap:wrap;gap:8px">
              <span class="card-title">${icon('building-2',16)} ${sel} — muassasalar ro'yxati</span>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:12px;color:#64748b">${effective.length} ta aktiv</span>
                ${removedNames.length ? `<span style="font-size:12px;color:#f87171">${removedNames.length} ta o'chirilgan</span>` : ''}
              </div>
            </div>
            <div style="padding:0 16px 8px">

              <!-- Active entries -->
              <div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px 0">
                ${effective.map(nomi => {
                  const isCustom = addedNames.includes(nomi);
                  const ovId = isCustom ? addOvs.find(o => o.nomi === nomi)?.id : null;
                  return `<div style="display:inline-flex;align-items:center;gap:6px;background:${isCustom?'rgba(16,185,129,0.1)':'rgba(30,41,59,0.8)'};border:1px solid ${isCustom?'rgba(16,185,129,0.3)':'rgba(99,118,158,0.15)'};border-radius:20px;padding:5px 10px 5px 12px">
                    <span style="font-size:13px;color:${isCustom?'#34d399':'#cbd5e1'}">${nomi}</span>
                    ${isCustom ? '<span style="font-size:10px;color:#34d399;font-weight:700">YO\'Q</span>' : ''}
                    <button onclick="AdminPage._removeMuassasaByData(this)"
                      data-v="${sel.replace(/"/g,'&quot;')}" data-n="${nomi.replace(/"/g,'&quot;')}"
                      data-custom="${isCustom?'1':'0'}" data-ov="${ovId||''}"
                      style="background:none;border:none;cursor:pointer;color:#ef4444;padding:0;display:flex;align-items:center;line-height:1"
                      title="O'chirish">✕</button>
                  </div>`;
                }).join('') || '<p style="color:#64748b;font-size:13px;padding:8px 0">Muassasalar yo\'q</p>'}
              </div>

              <!-- Removed entries (restorable) -->
              ${removedNames.length ? `
                <div style="border-top:1px solid rgba(99,118,158,0.1);padding-top:12px;margin-top:4px">
                  <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">O'chirilganlar</div>
                  <div style="display:flex;flex-wrap:wrap;gap:8px">
                    ${remOvs.map(ov => `
                      <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:20px;padding:5px 10px 5px 12px">
                        <span style="font-size:13px;color:#f87171;text-decoration:line-through">${ov.nomi}</span>
                        <button onclick="AdminPage.restoreMuassasa('${ov.id}')"
                          style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:12px;cursor:pointer;color:#34d399;padding:2px 8px;font-size:11px;font-weight:700">
                          Tiklash
                        </button>
                      </div>`).join('')}
                  </div>
                </div>` : ''}

              <!-- Add new -->
              <div style="display:flex;gap:8px;align-items:center;border-top:1px solid rgba(99,118,158,0.1);padding-top:14px;margin-top:8px">
                <input id="m-new-nomi" type="text" placeholder="Yangi muassasa nomi..."
                  class="form-input" style="flex:1;padding:8px 14px;font-size:13px"
                  onkeydown="if(event.key==='Enter')AdminPage.addMuassasa()"/>
                <button onclick="AdminPage.addMuassasa()"
                  style="padding:8px 18px;background:#2563eb;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">
                  + Qo'shish
                </button>
              </div>
            </div>
          </div>

          ${totalOvCount > 0 ? `
            <div class="card" style="border:1px solid rgba(245,158,11,0.2)">
              <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:13px;color:#f59e0b;font-weight:600">
                  ${icon('alert-circle',14)} Jami ${totalOvCount} ta o'zgarish mavjud (sariq nuqta = o'zgargan viloyat)
                </span>
              </div>
            </div>` : ''}
        </div>
      </div>`;
  },

  selectViloyat(v) {
    AdminPage._selViloyat = v;
    AdminPage._renderTabContent();
  },

  async addMuassasa() {
    const input = document.getElementById('m-new-nomi');
    const nomi = input?.value?.trim();
    if (!nomi) { showToast('Muassasa nomini kiriting', 'warning'); return; }
    const v = AdminPage._selViloyat;
    if (!v) return;
    try {
      await MuassasaDB.addOverride(v, nomi, 'add');
      AdminPage._overrides = await MuassasaDB.getOverrides();
      MuassasaDB.applyToConfig(AdminPage._overrides);
      showToast(`✅ "${nomi}" qo'shildi`, 'success');
      AdminPage._renderTabContent();
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  _removeMuassasaByData(btn) {
    const v = btn.dataset.v;
    const n = btn.dataset.n;
    const isCustom = btn.dataset.custom === '1';
    const ovId = btn.dataset.ov || null;
    AdminPage.removeMuassasa(v, n, isCustom, ovId);
  },

  async removeMuassasa(viloyat, nomi, isCustom, ovId) {
    if (!confirm(`"${nomi}" ni ro'yxatdan o'chirmoqchimisiz?`)) return;
    try {
      if (isCustom && ovId) {
        await MuassasaDB.deleteOverride(ovId);
      } else {
        await MuassasaDB.addOverride(viloyat, nomi, 'remove');
      }
      AdminPage._overrides = await MuassasaDB.getOverrides();
      MuassasaDB.applyToConfig(AdminPage._overrides);
      showToast(`✅ "${nomi}" o'chirildi`, 'success');
      AdminPage._renderTabContent();
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  async restoreMuassasa(ovId) {
    try {
      await MuassasaDB.deleteOverride(ovId);
      AdminPage._overrides = await MuassasaDB.getOverrides();
      MuassasaDB.applyToConfig(AdminPage._overrides);
      showToast('✅ Tiklandi', 'success');
      AdminPage._renderTabContent();
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  // ==================== AHOLI TAB ====================

  _buildAholiTab() {
    const aholi18 = APP_CONFIG.AHOLI_18PLUS || {};
    const aholi30 = APP_CONFIG.AHOLI_30PLUS || {};
    const viloyatlar = APP_CONFIG.VILOYATLAR || [];
    const rows = viloyatlar.map(v => {
      const v18 = aholi18[v] || 0;
      const v30 = aholi30[v] || 0;
      const key = v.replace(/[^a-zA-Z0-9]/g,'_');
      const vEsc = v.replace(/'/g,"\\'");
      return `
        <tr style="border-bottom:1px solid rgba(99,118,158,0.1)">
          <td style="padding:12px 16px;color:#e2e8f0;font-weight:600">${v}</td>
          <td style="padding:12px 16px;text-align:right">
            <input type="number" id="aholi18-${key}" value="${v18}"
              style="width:130px;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 10px;color:#a5b4fc;font-size:14px;font-weight:700;text-align:right"
              onchange="AdminPage._aholiChanged18('${vEsc}', this.value)"/>
          </td>
          <td style="padding:12px 16px;text-align:right">
            <input type="number" id="aholi30-${key}" value="${v30}"
              style="width:130px;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 10px;color:#fcd34d;font-size:14px;font-weight:700;text-align:right"
              onchange="AdminPage._aholiChanged30('${vEsc}', this.value)"/>
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="max-width:780px">
        <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:20px;border:1px solid #334155">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">👨‍👩‍👧</span>
            <h3 style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0">Viloyatlar bo'yicha aholi soni</h3>
          </div>
          <p style="color:#64748b;font-size:13px;margin:0">Bu ma'lumotlar "/ 100 000 aholi" hisobida ishlatiladi. Har yili yangilab turing.</p>
        </div>

        <div style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;margin-bottom:16px">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#1e293b">
                <th style="padding:10px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase">Viloyat</th>
                <th style="padding:10px 16px;text-align:right;color:#a5b4fc;font-size:12px;font-weight:700;text-transform:uppercase">18+ aholi soni</th>
                <th style="padding:10px 16px;text-align:right;color:#fcd34d;font-size:12px;font-weight:700;text-transform:uppercase">30+ aholi soni</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div style="display:flex;gap:12px;align-items:center">
          <button onclick="AdminPage._saveAholi()"
            style="background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
            💾 Saqlash
          </button>
          <span id="aholi-save-status" style="color:#64748b;font-size:13px"></span>
        </div>
      </div>`;
  },

  _aholiChanged18(viloyat, val) {
    if (!APP_CONFIG.AHOLI_18PLUS) APP_CONFIG.AHOLI_18PLUS = {};
    APP_CONFIG.AHOLI_18PLUS[viloyat] = parseInt(val) || 0;
  },

  _aholiChanged30(viloyat, val) {
    if (!APP_CONFIG.AHOLI_30PLUS) APP_CONFIG.AHOLI_30PLUS = {};
    APP_CONFIG.AHOLI_30PLUS[viloyat] = parseInt(val) || 0;
  },

  _saveAholi() {
    const statusEl = document.getElementById('aholi-save-status');
    const viloyatlar = APP_CONFIG.VILOYATLAR || [];
    if (!APP_CONFIG.AHOLI_18PLUS) APP_CONFIG.AHOLI_18PLUS = {};
    if (!APP_CONFIG.AHOLI_30PLUS) APP_CONFIG.AHOLI_30PLUS = {};
    viloyatlar.forEach(v => {
      const key = v.replace(/[^a-zA-Z0-9]/g, '_');
      const i18 = document.getElementById('aholi18-' + key);
      const i30 = document.getElementById('aholi30-' + key);
      if (i18) APP_CONFIG.AHOLI_18PLUS[v] = parseInt(i18.value) || 0;
      if (i30) APP_CONFIG.AHOLI_30PLUS[v] = parseInt(i30.value) || 0;
    });
    try {
      localStorage.setItem('aholi_18plus', JSON.stringify(APP_CONFIG.AHOLI_18PLUS));
      localStorage.setItem('aholi_30plus', JSON.stringify(APP_CONFIG.AHOLI_30PLUS));
      if (statusEl) statusEl.textContent = '✅ Saqlandi';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
    } catch(e) {
      if (statusEl) statusEl.textContent = '❌ Xato: ' + e.message;
    }
  },

  // ==================== AUDIT TAB ====================

  _buildAuditTab() {
    const d = AdminPage._auditData;
    const loading = AdminPage._auditLoading;

    if (loading) return `
      <div class="card" style="text-align:center;padding:60px">
        <div class="spinner" style="width:36px;height:36px;margin:0 auto 16px"></div>
        <p style="color:#64748b;font-size:14px">Barcha bemorlar tekshirilmoqda...</p>
      </div>`;

    if (!d) return `
      <div class="card" style="text-align:center;padding:60px">
        <div style="font-size:48px;margin-bottom:16px">🔍</div>
        <h3 style="color:#e2e8f0;font-size:18px;font-weight:700;margin-bottom:8px">Ma'lumot sifatini tekshirish</h3>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;max-width:440px;margin-left:auto;margin-right:auto">
          Barcha bemorlar rekordlarini ko'rib chiqib, viloyatiga mos kelmaydigan yoki bo'sh muassasa/viloyat maydonlari topiladi.
        </p>
        <button onclick="AdminPage.runAudit()"
          style="padding:12px 32px;background:#2563eb;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">
          Tekshirishni boshlash
        </button>
      </div>`;

    const total = d.length;
    const mismatch = d.filter(r => r._issue === 'mismatch');
    const empty = d.filter(r => r._issue === 'empty');
    const all = [...mismatch, ...empty];

    return `
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa">${icon('database',24)}</div>
          <div><div class="stat-value">${total}</div><div class="stat-label">Jami tekshirildi</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('alert-triangle',24)}</div>
          <div><div class="stat-value">${mismatch.length}</div><div class="stat-label">Mos kelmaydigan muassasa</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#f87171">${icon('x-circle',24)}</div>
          <div><div class="stat-value">${empty.length}</div><div class="stat-label">Bo'sh viloyat/muassasa</div></div>
        </div>
      </div>

      ${all.length === 0 ? `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:40px;margin-bottom:12px">✅</div>
          <h3 style="color:#34d399;font-size:16px;font-weight:700">Barcha rekordlar to'g'ri!</h3>
          <p style="color:#64748b;font-size:13px;margin-top:8px">Noto'g'ri muassasa/viloyat kombinatsiyasi topilmadi.</p>
          <button onclick="AdminPage._auditData=null;AdminPage._renderTabContent()"
            style="margin-top:20px;padding:8px 20px;background:rgba(99,118,158,0.15);border:1px solid rgba(99,118,158,0.2);border-radius:10px;color:#94a3b8;font-size:13px;cursor:pointer">
            Qayta tekshirish
          </button>
        </div>` : `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:8px">
            <span class="card-title">${icon('alert-triangle',16)} ${all.length} ta muammo topildi</span>
            <div style="display:flex;gap:8px">
              <button onclick="AdminPage.runAudit()" class="btn btn-ghost btn-sm">${icon('refresh-cw',14)} Yangilash</button>
              <button onclick="AdminPage._auditData=null;AdminPage._renderTabContent()"
                class="btn btn-ghost btn-sm">Yopish</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr>
                <th>Tur</th><th>K/T No</th><th>F.I.O</th>
                <th>Viloyat</th><th>Muassasa</th><th>Muammo</th><th>Amal</th>
              </tr></thead>
              <tbody>
                ${all.map(r => `<tr>
                  <td>${r._type === 'infarkt'
                    ? '<span style="background:rgba(220,38,38,0.15);color:#f87171;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">Infarkt</span>'
                    : '<span style="background:rgba(124,58,237,0.15);color:#a78bfa;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">Insult</span>'}</td>
                  <td style="font-family:monospace;font-size:12px;color:#64748b">${r.kt_no}</td>
                  <td style="font-weight:600;font-size:13px">${r.fio||'—'}</td>
                  <td style="font-size:12px;color:#94a3b8">${r.viloyat||'<span style="color:#f87171">Bo\'sh</span>'}</td>
                  <td style="font-size:12px;color:#94a3b8">${r.muassasa||'<span style="color:#f87171">Bo\'sh</span>'}</td>
                  <td>${r._issue === 'mismatch'
                    ? '<span style="color:#fbbf24;font-size:12px">Viloyatga mos kelmaydi</span>'
                    : '<span style="color:#f87171;font-size:12px">Bo\'sh maydon</span>'}</td>
                  <td style="display:flex;gap:6px;flex-wrap:wrap">
                    ${r._issue === 'mismatch' && r._suggested ? `
                    <button onclick="AdminPage.fixAuditRecord('${r.kt_no}','${r._type}','${r._suggested.replace(/'/g,"\\'")}','${(r.muassasa||'').replace(/'/g,"\\'")}')"
                      style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:5px 10px;color:#4ade80;font-size:12px;cursor:pointer;white-space:nowrap">
                      ✓ ${r._suggested}
                    </button>` : ''}
                    <button onclick="AdminPage.deleteAuditRecord('${r.kt_no}','${r._type}')"
                      style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:5px 10px;color:#f87171;font-size:12px;cursor:pointer">
                      O'chirish
                    </button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`}`;
  },

  async runAudit() {
    AdminPage._auditLoading = true;
    AdminPage._auditData = null;
    AdminPage._renderTabContent();
    try {
      const all = await MuassasaDB.fetchAllRecords();
      const norm = (s) => {
        const codes = {0x2018:1,0x2019:1,0x02BC:1,0x00B4:1,0x02B9:1,0x2032:1,0x60:1,0x27:1};
        return Array.from(s).map(c => codes[c.charCodeAt(0)] ? String.fromCharCode(0x27) : c).join("").toLowerCase().trim();
      };
      // Kirill -> Lotin transliteratsiya
      const cyrToLat = (s) => {
        const map = {
          'Қ':'Q','қ':'q',  // Қ қ
          'Ҳ':'H','ҳ':'h',  // Ҳ ҳ
          'Ғ':"G'",'ғ':"g'", // Ғ ғ
          'Ў':"O'",'ў':"o'", // Ў ў
          'Ӯ':'U','ӯ':'u',  // Ӯ ӯ
          'Ш':'Sh','ш':'sh', // Ш ш
          'Ч':'Ch','ч':'ch', // Ч ч
          'Ю':'Yu','ю':'yu', // Ю ю
          'Я':'Ya','я':'ya', // Я я
          'Ё':'Yo','ё':'yo', // Ё ё
          'Ъ':"'",'ъ':"'",  // Ъ ъ
          'А':'A','а':'a',
          'Б':'B','б':'b',
          'В':'V','в':'v',
          'Г':'G','г':'g',
          'Д':'D','д':'d',
          'Е':'E','е':'e',
          'Ж':'J','ж':'j',
          'З':'Z','з':'z',
          'И':'I','и':'i',
          'Й':'Y','й':'y',
          'К':'K','к':'k',
          'Л':'L','л':'l',
          'М':'M','м':'m',
          'Н':'N','н':'n',
          'О':'O','о':'o',
          'П':'P','п':'p',
          'Р':'R','р':'r',
          'С':'S','с':'s',
          'Т':'T','т':'t',
          'У':'U','у':'u',
          'Ф':'F','ф':'f',
          'Х':'X','х':'x',
          'Ц':'S','ц':'s',
          'Ь':"'",'ь':"'",
        };
        return Array.from(s).map(c => map[c] !== undefined ? map[c] : c).join('');
      };
      const normKey = (s) => norm(cyrToLat(s));
      // Kalit so'zlar asosida muassasa nomini moslashtirish
      // keywords: ro'yxat ichidagi BARCHA so'zlar mos kelishi shart
      const ALIAS_RULES = [
        { keywords: ['rshtyimff'], correct: "RSHTYOIM Farg'ona filiali" },
        { keywords: ['yshtb'], correct: "Yangiyer ShTB" },
        { keywords: ['dttb'], correct: "Dehqonobod TTB" },
        // Kukon/Quqon shahar shoshilinch — har qanday yozuvda
        { keywords: ['kukon', 'shoshilinch'], correct: "Qo'qon politravma markazi" },
        { keywords: ['kuqon', 'shoshilinch'], correct: "Qo'qon politravma markazi" },
        { keywords: ['quqon', 'shoshilinch'], correct: "Qo'qon politravma markazi" },
        { keywords: ['qoqon', 'shoshilinch'], correct: "Qo'qon politravma markazi" },
        { keywords: ['respublika', 'shoshilinch', 'ilmiy'], correct: "Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi", anyViloyat: true },
      ];
      // Barcha viloyatlardagi muassasalar uchun yagona ro'yxat
      const allValidMusassasalar = Object.values(APP_CONFIG.MUASSASALAR).flat();
      const aliasLookup = (s) => {
        const n = normKey(s);
        for (const rule of ALIAS_RULES) {
          if (rule.keywords.every(kw => n.includes(kw))) return rule;
        }
        return null;
      };
      const issues = [];
      const sb = getSupabase();

      // normMatch/aliasMatch topilgan yozuvlarni avtomatik tuzat
      const autoFixes = [];

      for (const r of all) {
        if (!r.viloyat || !r.muassasa) {
          issues.push({ ...r, _issue: 'empty' });
          continue;
        }
        const validList = APP_CONFIG.MUASSASALAR[r.viloyat];
        if (!validList) continue;
        const exactMatch = validList.includes(r.muassasa);
        if (exactMatch) continue;

        const normMatch = validList.find(m => norm(m) === norm(r.muassasa));
        if (normMatch) {
          autoFixes.push({ kt_no: r.kt_no, _type: r._type, correct: normMatch });
          continue;
        }

        const aliasInfo = aliasLookup(r.muassasa);
        if (aliasInfo) {
          const inCurrent = validList.includes(aliasInfo.correct);
          const inAny = aliasInfo.anyViloyat && allValidMusassasalar.includes(aliasInfo.correct);
          if (inCurrent || inAny) {
            autoFixes.push({ kt_no: r.kt_no, _type: r._type, correct: aliasInfo.correct });
            continue;
          }
        }

        if (r.muassasa !== 'Boshqa') {
          const nr = norm(r.muassasa);
          const words = nr.split(' ').filter(w => w.length > 3);
          const suggested = words.length >= 2
            ? validList.find(m => { const nm = norm(m); return words.every(w => nm.includes(w)); }) || null
            : null;
          issues.push({ ...r, _issue: 'mismatch', _suggested: suggested });
        }
      }

      // Avtomatik tuzatishlarni bajarish
      let autoFixed = 0;
      for (const fix of autoFixes) {
        const table = fix._type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
        const { error } = await sb.from(table).update({ muassasa: fix.correct }).eq('kt_no', fix.kt_no);
        if (!error) autoFixed++;
      }
      if (autoFixed > 0) showToast(`✅ ${autoFixed} ta yozuv avtomatik tuzatildi`, 'success');

      AdminPage._auditData = issues;
    } catch(err) {
      showToast('❌ Audit xatosi: ' + err.message, 'error');
      AdminPage._auditData = [];
    } finally {
      AdminPage._auditLoading = false;
      AdminPage._renderTabContent();
    }
  },

  _buildDupTab() {
    const groups = AdminPage._dupData;
    const loading = AdminPage._dupLoading;

    if (loading) return `
      <div class="card" style="text-align:center;padding:60px">
        <div class="spinner" style="width:36px;height:36px;margin:0 auto 16px"></div>
        <p style="color:#64748b;font-size:14px">Duplikat bemorlar qidirilmoqda...</p>
      </div>`;

    const modeBtn = (mode, label) => `
      <button onclick="AdminPage._dupMode='${mode}';AdminPage._dupData=null;AdminPage.runDupCheck()"
        style="padding:8px 20px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:700;
        background:${AdminPage._dupMode===mode?'#2563eb':'rgba(37,99,235,0.12)'};
        color:${AdminPage._dupMode===mode?'#fff':'#60a5fa'}">
        ${label}
      </button>`;

    if (!groups) return `
      <div class="card" style="text-align:center;padding:60px">
        <div style="font-size:48px;margin-bottom:16px">👥</div>
        <h3 style="color:#e2e8f0;font-size:18px;font-weight:700;margin-bottom:8px">Duplikat bemorlarni tekshirish</h3>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;max-width:480px;margin-left:auto;margin-right:auto">
          Bir xil F.I.O (Kirill yoki Lotin) va tug'ilgan yiliga ega bemorlar topiladi.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:24px">
          ${modeBtn('day','Bir kunda (bir muassasa)')}
          ${modeBtn('all','Barcha vaqt (Kirill+Lotin)')}
        </div>
        <button onclick="AdminPage.runDupCheck()"
          style="padding:12px 32px;background:#2563eb;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">
          Tekshirishni boshlash
        </button>
      </div>`;

    // 'all' rejimda guruhlar {records, type} formatida, 'day' da oddiy array
    const isAllMode = AdminPage._dupMode === 'all';
    const normalizedGroups = isAllMode
      ? groups
      : groups.map(g => ({ records: g, type: 'duplicate' }));

    if (normalizedGroups.length === 0) return `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">✅</div>
        <h3 style="color:#34d399;font-size:16px;font-weight:700">Duplikat topilmadi!</h3>
        <p style="color:#64748b;font-size:13px;margin-top:8px">${isAllMode?'Kirill/Lotin normalize qilingan F.I.O + tug\'ilgan yili bo\'yicha duplikat topilmadi.':'Bir xil F.I.O + tug\'ilgan yil + qabul sanasiga ega yozuvlar yo\'q.'}</p>
        <button onclick="AdminPage._dupData=null;AdminPage._renderTabContent()"
          style="margin-top:20px;padding:8px 20px;background:rgba(99,118,158,0.15);border:1px solid rgba(99,118,158,0.2);border-radius:10px;color:#94a3b8;font-size:13px;cursor:pointer">
          Qayta tekshirish
        </button>
      </div>`;

    const dupGroups = normalizedGroups.filter(g => g.type === 'duplicate');
    const qaytaGroups = normalizedGroups.filter(g => g.type === 'qayta_murojaat');
    const totalRecords = normalizedGroups.reduce((s, g) => s + g.records.length, 0);

    const myViloyat = (AdminPage._myViloyat || '').toLowerCase();
    const renderGroup = (g, gi, showDelete) => {
      const visibleRecords = AdminPage._isViloyatAdmin
        ? g.records.filter(r => (r.viloyat || '').toLowerCase() === myViloyat)
        : g.records;
      if (visibleRecords.length === 0) return '';
      return `
      <div style="border:1px solid ${g.type==='duplicate'?'rgba(239,68,68,0.25)':'rgba(99,118,158,0.2)'};border-radius:12px;overflow:hidden;margin-bottom:4px">
        <div style="background:${g.type==='duplicate'?'rgba(239,68,68,0.08)':'rgba(99,118,158,0.08)'};padding:8px 14px;font-size:12px;font-weight:700;color:${g.type==='duplicate'?'#f87171':'#94a3b8'}">
          ${gi+1}. ${g.records[0].fio || '—'} • ${g.records[0].tugilgan_yil || '—'} • ${g.type==='duplicate'?'⚠️ Duplikat':'🔄 Qayta murojaat'}
        </div>
        <table class="data-table">
          <thead><tr>
            <th>K/T No</th><th>F.I.O</th><th>Tur</th><th>Muassasa</th><th>Qabul sanasi</th>${showDelete?'<th>Amal</th>':''}
          </tr></thead>
          <tbody>
            ${visibleRecords.map(r => `<tr>
              <td style="font-family:monospace;font-size:12px;color:#64748b">${r.kt_no}</td>
              <td style="font-weight:600;font-size:13px">${r.fio||'—'}</td>
              <td style="font-size:12px;color:#94a3b8">${r._type==='infarkt'?'Infarkt':'Insult'}</td>
              <td style="font-size:12px;color:#94a3b8">${r.muassasa||'—'}</td>
              <td style="font-size:12px;color:#94a3b8">${r.qabul_vaqt ? new Date(r.qabul_vaqt).toLocaleString('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
              ${showDelete?`<td>
                <button onclick="AdminPage.deleteDupRecord('${r.kt_no}','${r._type}')"
                  style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:5px 10px;color:#f87171;font-size:12px;cursor:pointer">
                  O'chirish
                </button>
              </td>`:''}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    };

    return `
      <div class="stat-grid" style="grid-template-columns:repeat(${isAllMode?3:2},1fr);margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#f87171">${icon('alert-triangle',24)}</div>
          <div><div class="stat-value">${dupGroups.length}</div><div class="stat-label">Duplikat guruh</div></div>
        </div>
        ${isAllMode?`<div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,118,158,0.15);color:#94a3b8">${icon('refresh-cw',24)}</div>
          <div><div class="stat-value">${qaytaGroups.length}</div><div class="stat-label">Qayta murojaat</div></div>
        </div>`:''}
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('copy',24)}</div>
          <div><div class="stat-value">${totalRecords}</div><div class="stat-label">Jami yozuvlar</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:8px">
          <span class="card-title">${icon('alert-triangle',16)} ${dupGroups.length} ta duplikat${isAllMode && qaytaGroups.length ? `, ${qaytaGroups.length} ta qayta murojaat` : ''} — ${isAllMode?'Barcha vaqt (Kirill+Lotin)':'Bir kunda (bir muassasa)'}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button onclick="AdminPage._dupMode='day';AdminPage._dupData=null;AdminPage.runDupCheck()" class="btn btn-ghost btn-sm" ${AdminPage._dupMode==='day'?'style="color:#60a5fa"':''}>Bir kunda</button>
            <button onclick="AdminPage._dupMode='all';AdminPage._dupData=null;AdminPage.runDupCheck()" class="btn btn-ghost btn-sm" ${AdminPage._dupMode==='all'?'style="color:#60a5fa"':''}>Barcha vaqt</button>
            <button onclick="AdminPage.runDupCheck()" class="btn btn-ghost btn-sm">${icon('refresh-cw',14)} Yangilash</button>
            <button onclick="AdminPage._dupData=null;AdminPage._renderTabContent()" class="btn btn-ghost btn-sm">Yopish</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;padding:16px">
          ${dupGroups.length ? `<div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:8px">⚠️ DUPLIKATLAR (o'chirish tavsiya etiladi)</div>
          ${dupGroups.map((g, gi) => renderGroup(g, gi, true)).join('')}` : ''}
          ${isAllMode && qaytaGroups.length ? `<div style="font-size:12px;font-weight:700;color:#94a3b8;margin-top:16px;margin-bottom:8px">🔄 QAYTA MUROJAATLAR (o'chirish shart emas)</div>
          ${qaytaGroups.map((g, gi) => renderGroup(g, gi, false)).join('')}` : ''}
        </div>
      </div>`;
  },

  async runDupCheck() {
    AdminPage._dupLoading = true;
    AdminPage._dupData = null;
    AdminPage._renderTabContent();
    try {
      const all = await MuassasaDB.fetchAllRecords();
      AdminPage._dupData = AdminPage._dupMode === 'all'
        ? MuassasaDB.findAllDuplicates(all)
        : MuassasaDB.findDuplicates(all);
    } catch(err) {
      showToast('❌ Tekshirish xatosi: ' + err.message, 'error');
      AdminPage._dupData = [];
    } finally {
      AdminPage._dupLoading = false;
      AdminPage._renderTabContent();
    }
  },

  async deleteDupRecord(kt_no, type) {
    if (!confirm(`K/T No: ${kt_no} — bu duplikat bemor yozuvini o'chirmoqchimisiz?`)) return;
    try {
      const table = type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
      // Viloyat admin faqat o'z viloyatidagi bemorni o'chira oladi
      if (AdminPage._isViloyatAdmin && AdminPage._myViloyat) {
        const { data: rec } = await getSupabase().from(table).select('viloyat').eq('kt_no', kt_no).single();
        if (!rec || (rec.viloyat || '').toLowerCase() !== AdminPage._myViloyat.toLowerCase()) {
          showToast('❌ Siz faqat o\'z viloyatingizdagi bemorlarni o\'chira olasiz', 'error');
          return;
        }
      }
      const { error } = await getSupabase().from(table).delete().eq('kt_no', kt_no);
      if (error) throw error;
      showToast(`✅ O'chirildi: ${kt_no}`, 'success');
      if (AdminPage._dupData) {
        const isAllMode = AdminPage._dupMode === 'all';
        if (isAllMode) {
          AdminPage._dupData = AdminPage._dupData
            .map(g => ({ ...g, records: g.records.filter(r => !(String(r.kt_no) === String(kt_no) && r._type === type)) }))
            .filter(g => g.records.length > 1);
        } else {
          AdminPage._dupData = AdminPage._dupData
            .map(g => g.filter(r => !(String(r.kt_no) === String(kt_no) && r._type === type)))
            .filter(g => g.length > 1);
        }
        AdminPage._renderTabContent();
      }
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  async fixAuditRecord(kt_no, type, newMuassasa, oldMuassasa) {
    if (!confirm(`K/T No: ${kt_no}\n"${oldMuassasa}" → "${newMuassasa}"\nTuzatilsinmi?`)) return;
    try {
      const table = type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
      const { error } = await getSupabase().from(table).update({ muassasa: newMuassasa }).eq('kt_no', kt_no);
      if (error) throw error;
      showToast(`✅ Tuzatildi: ${kt_no}`, 'success');
      if (AdminPage._auditData) {
        AdminPage._auditData = AdminPage._auditData.filter(r => !(String(r.kt_no) === String(kt_no) && r._type === type));
        AdminPage._renderTabContent();
      }
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  // ==================== KIRISH TARIXI TAB ====================

  async _loadLogs() {
    try {
      const logs = await UserLog.list({ limit: 300 });
      const el = document.getElementById('admin-tab-content');
      if (el) { el.innerHTML = AdminPage._buildLogsTab(logs); initIcons(); }
    } catch(err) {
      const el = document.getElementById('admin-tab-content');
      if (el) el.innerHTML = `<div class="card" style="color:#f87171;padding:32px;text-align:center">❌ ${err.message}</div>`;
    }
  },

  _buildLogsTab(logs) {
    if (!logs.length) return `
      <div class="card" style="text-align:center;padding:60px">
        <div style="font-size:48px;margin-bottom:16px">📋</div>
        <h3 style="color:#e2e8f0;font-size:18px;font-weight:700">Kirish tarixi bo'sh</h3>
        <p style="color:#64748b;font-size:14px;margin-top:8px">Hali hech kim tizimga kirmagan</p>
      </div>`;

    const actionBadge = a => a === 'login'
      ? `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✅ Kirdi</span>`
      : `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">🚪 Chiqdi</span>`;

    const roleBadge = r => {
      if (r === 'super_admin') return `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">Super Admin</span>`;
      if (r === 'admin') return `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">Admin</span>`;
      return `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">Foydalanuvchi</span>`;
    };

    const fmtDate = dt => {
      if (!dt) return '—';
      const d = new Date(dt);
      const pad = n => String(n).padStart(2,'0');
      const tz = new Date(d.getTime() + 5*60*60*1000);
      return `${pad(tz.getUTCDate())}.${pad(tz.getUTCMonth()+1)}.${tz.getUTCFullYear()} ${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`;
    };

    // Statistika
    const total = logs.length;
    const logins = logs.filter(l => l.action === 'login').length;
    const logouts = logs.filter(l => l.action === 'logout').length;
    const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          ${[
            ['📊', 'Jami yozuvlar', total, '#3b82f6'],
            ['✅', 'Kirish', logins, '#22c55e'],
            ['🚪', 'Chiqish', logouts, '#ef4444'],
            ['👤', 'Faol foydalanuvchilar', uniqueUsers, '#8b5cf6']
          ].map(([ic,lbl,val,clr]) => `
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;text-align:center">
              <div style="font-size:24px">${ic}</div>
              <div style="font-size:22px;font-weight:800;color:${clr};margin:4px 0">${val}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600">${lbl}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center">
          <h3 style="color:#e2e8f0;font-weight:700;font-size:15px">📋 Kirish / Chiqish tarixi</h3>
          <span style="color:#64748b;font-size:12px">Oxirgi ${logs.length} ta yozuv</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#0f172a;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">
                <th style="padding:10px 16px;text-align:left;font-weight:600">Sana/Vaqt</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600">F.I.O</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600">Email</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600">Viloyat</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600">Rol</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600">Amal</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((l,i) => `
                <tr style="border-top:1px solid #1e293b;${i%2===0?'background:rgba(30,41,59,0.3)':''}">
                  <td style="padding:10px 16px;color:#94a3b8;white-space:nowrap">${fmtDate(l.created_at)}</td>
                  <td style="padding:10px 16px;color:#e2e8f0;font-weight:600">${esc(l.full_name||'—')}</td>
                  <td style="padding:10px 16px;color:#94a3b8">${esc(l.email||'—')}</td>
                  <td style="padding:10px 16px;color:#94a3b8">${esc(l.viloyat||'—')}</td>
                  <td style="padding:10px 16px">${roleBadge(l.role)}</td>
                  <td style="padding:10px 16px">${actionBadge(l.action)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ==================== XABARLAR TAB ====================
  async _loadFeedback() {
    try {
      const { data, error } = await getSupabase()
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const el = document.getElementById('admin-tab-content');
      if (el) { el.innerHTML = AdminPage._buildFeedbackTab(data || []); initIcons(); }
    } catch(err) {
      const el = document.getElementById('admin-tab-content');
      if (el) el.innerHTML = `<div class="card" style="color:#f87171;padding:32px;text-align:center">❌ ${err.message}</div>`;
    }
  },

  _buildFeedbackTab(items) {
    const fmtDate = dt => {
      if (!dt) return '—';
      const d = new Date(dt);
      const tz = new Date(d.getTime() + 5*60*60*1000);
      const pad = n => String(n).padStart(2,'0');
      return `${pad(tz.getUTCDate())}.${pad(tz.getUTCMonth()+1)}.${tz.getUTCFullYear()} ${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`;
    };
    const turBadge = t => {
      if (t === 'Muammo') return `<span style="background:#fee2e2;color:#b91c1c;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">🔴 Muammo</span>`;
      if (t === 'Taklif') return `<span style="background:#fefce8;color:#92400e;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">💡 Taklif</span>`;
      return `<span style="background:#eff6ff;color:#1e40af;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">❓ Savol</span>`;
    };
    const yangi = items.filter(i => !i.o_qildi).length;
    if (!items.length) return `
      <div class="card" style="text-align:center;padding:60px">
        <div style="font-size:48px;margin-bottom:16px">💬</div>
        <h3 style="color:#e2e8f0;font-size:18px;font-weight:700">Xabarlar yo'q</h3>
        <p style="color:#64748b;font-size:14px;margin-top:8px">Hali hech kim xabar yubormagan</p>
      </div>`;
    return `
      <div class="card" style="margin-bottom:16px;padding:16px 20px;display:flex;align-items:center;gap:16px">
        <div style="display:flex;gap:16px">
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:#3b82f6">${items.length}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">Jami</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:#f59e0b">${yangi}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">Yangi</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:#22c55e">${items.length - yangi}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">Javob berilgan</div>
          </div>
        </div>
        <button onclick="AdminPage._loadFeedback()" class="btn btn-ghost btn-sm" style="margin-left:auto">${icon('refresh-cw',14)} Yangilash</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${items.map(item => `
          <div style="background:white;border:1px solid ${!item.o_qildi ? '#fbbf24' : '#e2e8f0'};border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
            <div style="padding:16px 20px;display:flex;align-items:flex-start;gap:12px;border-bottom:1px solid #f1f5f9">
              <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:white;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${(item.sender_name||'?').charAt(0).toUpperCase()}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                  <span style="font-weight:700;font-size:14px;color:#f1f5f9">${esc(item.sender_name||'Noma\'lum')}</span>
                  ${turBadge(item.tur)}
                  ${!item.o_qildi ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">YANGI</span>` : ''}
                </div>
                <div style="font-size:11px;color:#94a3b8">${esc(item.viloyat||'—')} · ${esc(item.rol||'—')} · ${fmtDate(item.created_at)}</div>
              </div>
            </div>
            <div style="padding:16px 20px;background:#f8fafc">
              <p style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap">${esc(item.xabar||'')}</p>
            </div>
            ${item.javob ? `
              <div style="padding:14px 20px;background:#f0fdf4;border-top:1px solid #bbf7d0;display:flex;gap:10px">
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">A</div>
                <div style="flex:1">
                  <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px">Administrator javobi · ${fmtDate(item.javob_vaqt)}</div>
                  <p style="font-size:13px;color:#166534;line-height:1.5;white-space:pre-wrap">${esc(item.javob)}</p>
                </div>
              </div>` : ''}
            <div style="padding:12px 20px;border-top:1px solid #f1f5f9;display:flex;gap:8px;align-items:flex-end">
              <textarea id="javob-${item.id}" rows="2" placeholder="Javob yozing..."
                style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:13px;resize:none;outline:none;font-family:inherit">${item.javob ? esc(item.javob) : ''}</textarea>
              <button onclick="AdminPage._sendJavob('${item.id}')"
                style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px">
                ${icon('send',14)} ${item.javob ? 'Yangilash' : 'Javob berish'}
              </button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  async _sendJavob(id) {
    const textarea = document.getElementById(`javob-${id}`);
    const javob = textarea?.value?.trim();
    if (!javob) { showToast('Javob matni kiritilmagan', 'warning'); return; }
    try {
      const { error } = await getSupabase().from('feedback').update({
        javob,
        javob_vaqt: new Date().toISOString(),
        o_qildi: true
      }).eq('id', id);
      if (error) throw error;
      showToast('Javob saqlandi!', 'success');
      AdminPage._loadFeedback();
      AdminPage._loadTabUnreadBadge();
      Components._loadUnreadFeedbackBadge();
    } catch(err) { showToast('Xato: ' + err.message, 'error'); }
  },

  async deleteAuditRecord(kt_no, type) {
    if (!confirm(`K/T No: ${kt_no} — bemorni o'chirmoqchimisiz?`)) return;
    try {
      const table = type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
      const { error } = await getSupabase().from(table).delete().eq('kt_no', kt_no);
      if (error) throw error;
      showToast(`✅ O'chirildi: ${kt_no}`, 'success');
      if (AdminPage._auditData) {
        AdminPage._auditData = AdminPage._auditData.filter(r => !(String(r.kt_no) === String(kt_no) && r._type === type));
        AdminPage._renderTabContent();
      }
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  }
};
