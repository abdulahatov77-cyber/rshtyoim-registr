// ==================== ADMIN PANEL ====================
const AdminPage = {
  _profiles: [],
  _search: '',
  _filterRole: '',

  async render() {
    // Faqat super_admin kirishi mumkin
    const isSuperAdmin = await Profile.isSuperAdmin();
    if (!isSuperAdmin) {
      document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a">
          <div style="text-align:center">
            <div style="font-size:64px;margin-bottom:16px">🚫</div>
            <h2 style="color:#f87171;font-size:22px;font-weight:700;margin-bottom:8px">Ruxsat yo'q</h2>
            <p style="color:#64748b;margin:8px 0 24px">Bu sahifa faqat Super Administrator uchun</p>
            <button class="btn btn-ghost" onclick="Router.go('dashboard')">← Bosh sahifaga</button>
          </div>
        </div>`;
      return;
    }

    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'admin', '⚙️ Admin Panel', 'Foydalanuvchilarni boshqarish va rol berish',
      `<div id="admin-content"><div style="display:flex;align-items:center;justify-content:center;padding:60px"><div class="spinner" style="width:32px;height:32px"></div></div></div>`,
      user
    );
    Components.startClock();
    await AdminPage.loadProfiles();
  },

  async loadProfiles() {
    try {
      AdminPage._profiles = await Profile.listAll();
      AdminPage.renderContent();
    } catch (err) {
      const inner = document.getElementById('admin-content');
      if (inner) {
        inner.innerHTML =
          `<div class="empty-state"><div class="empty-state-title" style="color:#f87171">❌ ${err.message}</div>
           <p style="color:#64748b;font-size:13px;margin-top:8px">Profillarni yuklashda xato. Admin RLS politikasini tekshiring.</p></div>`;
      }
    }
  },

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
    if (AdminPage._filterRole) {
      list = list.filter(p => p.role === AdminPage._filterRole);
    }
    return list;
  },

  renderContent() {
    const inner = document.getElementById('admin-content');
    if (!inner) return;

    const all      = AdminPage._profiles;
    const filtered = AdminPage.getFiltered();

    const superCnt  = all.filter(p => p.role === 'super_admin').length;
    const adminCnt  = all.filter(p => p.role === 'admin').length;
    const userCnt   = all.filter(p => p.role === 'user').length;
    const vilMap    = {};
    all.forEach(p => { if (p.viloyat) vilMap[p.viloyat] = (vilMap[p.viloyat]||0) + 1; });
    const topVil    = Object.entries(vilMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

    inner.innerHTML = `
      <div class="animate-fadein">

        <!-- Stats -->
        <div class="stat-grid" style="margin-bottom:20px;grid-template-columns:repeat(4,1fr)">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa">${icon('users',24)}</div>
            <div><div class="stat-value">${all.length}</div><div class="stat-label">Jami foydalanuvchilar</div></div>
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

        <!-- Rol huquqlari jadvali -->
        <div class="card mb-5">
          <div class="card-header"><span class="card-title">${icon('info',16)} Rol huquqlari</span></div>
          <div style="overflow-x:auto;padding:0 16px 16px">
            <table class="data-table" style="font-size:12px">
              <thead>
                <tr>
                  <th>Imkoniyat</th>
                  <th style="text-align:center">👤 Shifokor</th>
                  <th style="text-align:center">🛡 Viloyat Admin</th>
                  <th style="text-align:center">👑 Super Admin</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ["Ma'lumot ko'rish (o'z viloyati)", true, true, true],
                  ["Yangi bemor qo'shish", true, true, true],
                  ["Bemor ma'lumotini tahrirlash", false, true, true],
                  ["Bemorni o'chirish", false, false, true],
                  ["Barcha viloyatlar ma'lumoti", false, false, true],
                  ["Foydalanuvchilarni boshqarish", false, false, true],
                  ["Rol berish / o'zgartirish", false, false, true],
                ].map(([label, user, admin, super_admin]) => `
                  <tr>
                    <td style="color:#94a3b8">${label}</td>
                    <td style="text-align:center">${user ? '<span style="color:#34d399;font-size:16px">✓</span>' : '<span style="color:#475569">—</span>'}</td>
                    <td style="text-align:center">${admin ? '<span style="color:#38bdf8;font-size:16px">✓</span>' : '<span style="color:#475569">—</span>'}</td>
                    <td style="text-align:center">${super_admin ? '<span style="color:#c4b5fd;font-size:16px">✓</span>' : '<span style="color:#475569">—</span>'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start">

          <!-- Main Table Card -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">${icon('users',16)} Foydalanuvchilar ro'yxati</span>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="admin-search" type="text" placeholder="Qidirish..." value="${AdminPage._search}"
                  oninput="AdminPage._search=this.value;AdminPage._renderTable()"
                  class="form-input" style="width:180px;padding:6px 12px;font-size:12px"/>
                <select id="admin-role-filter" onchange="AdminPage._filterRole=this.value;AdminPage._renderTable()"
                  class="form-input" style="width:150px;padding:6px 10px;font-size:12px">
                  <option value="" ${!AdminPage._filterRole?'selected':''}>Barcha rol</option>
                  <option value="super_admin" ${AdminPage._filterRole==='super_admin'?'selected':''}>👑 Super Admin</option>
                  <option value="admin" ${AdminPage._filterRole==='admin'?'selected':''}>🛡 Viloyat Admin</option>
                  <option value="user" ${AdminPage._filterRole==='user'?'selected':''}>👤 Shifokor</option>
                </select>
                <button class="btn btn-ghost btn-sm" onclick="AdminPage.loadProfiles()">${icon('refresh-cw',14)} Yangilash</button>
              </div>
            </div>
            <div style="overflow-x:auto" id="admin-table-wrap">
              ${AdminPage._buildTable(filtered)}
            </div>
          </div>

          <!-- Sidebar: viloyat stats -->
          <div class="card" style="min-width:220px">
            <div class="card-header">
              <span class="card-title">${icon('map',14)} Viloyatlar bo'yicha</span>
            </div>
            <div style="padding:4px 0">
              ${topVil.length ? topVil.map(([v,cnt]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(99,118,158,0.1)">
                  <span style="font-size:12px;color:#cbd5e1">${v}</span>
                  <span style="font-size:12px;font-weight:700;color:#60a5fa;background:rgba(59,130,246,0.12);padding:2px 8px;border-radius:20px">${cnt}</span>
                </div>`).join('')
              : '<p style="color:#64748b;font-size:12px;text-align:center;padding:16px">Viloyatlar yo\'q</p>'}
            </div>
          </div>

        </div>
      </div>`;
    initIcons();
  },

  _buildTable(list) {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Email</th>
            <th>F.I.O</th>
            <th>Rol</th>
            <th>Viloyat</th>
            <th>Ro'yxat sanasi</th>
            <th style="min-width:300px">Amallar</th>
          </tr>
        </thead>
        <tbody>
          ${list.length
            ? list.map((p, i) => AdminPage.renderRow(p, i+1)).join('')
            : `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">
                ${icon('inbox',24)}<br><span style="font-size:13px">Foydalanuvchilar yo'q</span>
              </td></tr>`}
        </tbody>
      </table>`;
  },

  _renderTable() {
    const wrap = document.getElementById('admin-table-wrap');
    if (wrap) {
      wrap.innerHTML = AdminPage._buildTable(AdminPage.getFiltered());
      initIcons();
    }
  },

  renderRow(p, num) {
    const isSuperAdminUser = p.role === 'super_admin';
    const isAdminUser      = p.role === 'admin';
    const isMainSuperAdmin = (p.email||'').toLowerCase() === 'abdulahatov77@gmail.com';

    const roleBadge = isSuperAdminUser
      ? `<span class="badge" style="background:rgba(139,92,246,0.2);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)">${icon('crown',12)} Super Admin</span>`
      : isAdminUser
      ? `<span class="badge" style="background:rgba(14,165,233,0.15);color:#38bdf8;border:1px solid rgba(14,165,233,0.3)">${icon('shield',12)} Viloyat Admin</span>`
      : `<span class="badge badge-blue">${icon('user',12)} Shifokor</span>`;

    const viloyatOptions = ['', ...APP_CONFIG.VILOYATLAR]
      .map(v => `<option value="${v}" ${p.viloyat===v?'selected':''}>${v||'— Tanlang —'}</option>`).join('');

    const displayName = p.fio || p.full_name || '—';

    return `<tr>
      <td style="color:#64748b;font-size:11px">${num}</td>
      <td style="font-weight:600;font-size:12px">
        ${p.email||'—'}
        ${isMainSuperAdmin ? '<span style="font-size:10px;background:rgba(139,92,246,0.15);color:#c4b5fd;padding:1px 6px;border-radius:10px;margin-left:4px">Asosiy</span>' : ''}
      </td>
      <td style="font-size:12px;color:#94a3b8">${displayName}</td>
      <td>${roleBadge}</td>
      <td style="font-size:12px">${p.viloyat||'<span style="color:#64748b">Belgilanmagan</span>'}</td>
      <td style="font-size:11px;color:#64748b">${p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <select id="role-${p.id}" onchange="AdminPage.changeRole('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer"
            ${isMainSuperAdmin ? 'disabled title="Asosiy super adminning roli o\'zgartirilmaydi"' : ''}>
            <option value="user"        ${p.role==='user'?'selected':''}>👤 Shifokor</option>
            <option value="admin"       ${p.role==='admin'?'selected':''}>🛡 Viloyat Admin</option>
            <option value="super_admin" ${p.role==='super_admin'?'selected':''}>👑 Super Admin</option>
          </select>
          <select id="vil-${p.id}" onchange="AdminPage.changeViloyat('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer"
            ${isSuperAdminUser ? 'disabled title="Super admin barcha viloyatlarni ko\'radi"' : ''}>
            ${viloyatOptions}
          </select>
          <button onclick="AdminPage.deleteUser('${p.id}','${(p.email||'').replace(/'/g,"\\'")}','${(p.role||'')}')"
            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:5px 8px;color:#f87171;font-size:11px;cursor:pointer"
            title="Foydalanuvchini o'chirish"
            ${isMainSuperAdmin ? 'disabled' : ''}>
            ${icon('trash-2',13)}
          </button>
        </div>
      </td>
    </tr>`;
  },

  async changeRole(userId, role) {
    try {
      await Profile.setRole(userId, role);
      const roleLabels = { super_admin: 'Super Admin', admin: 'Viloyat Admin', user: 'Shifokor' };
      showToast(`✅ Rol o'zgartirildi: ${roleLabels[role] || role}`, 'success');
      const idx = AdminPage._profiles.findIndex(p => p.id === userId);
      if (idx !== -1) AdminPage._profiles[idx].role = role;
      AdminPage._renderTable();
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
    }
  },

  async changeViloyat(userId, viloyat) {
    try {
      await Profile.setViloyat(userId, viloyat);
      showToast(`✅ Viloyat o'zgartirildi: ${viloyat||'(tozalandi)'}`, 'success');
      const idx = AdminPage._profiles.findIndex(p => p.id === userId);
      if (idx !== -1) AdminPage._profiles[idx].viloyat = viloyat;
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
    }
  },

  async deleteUser(userId, email, role) {
    if (role === 'super_admin') {
      showToast('⚠️ Super Admin foydalanuvchini o\'chirish mumkin emas', 'warning');
      return;
    }
    if (!confirm(`"${email}" foydalanuvchisini o'chirishni tasdiqlaysizmi?\n\nBu amal qaytarilmaydi!`)) return;
    try {
      await Profile.deleteProfile(userId);
      showToast(`🗑 Foydalanuvchi o'chirildi: ${email}`, 'success');
      AdminPage._profiles = AdminPage._profiles.filter(p => p.id !== userId);
      AdminPage.renderContent();
    } catch (err) {
      showToast('❌ O\'chirishda xato: ' + err.message, 'error');
    }
  }
};
