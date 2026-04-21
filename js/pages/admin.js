// ==================== ADMIN PANEL ====================
const AdminPage = {
  _profiles: [],
  _search: '',
  _filterRole: '',

  async render() {
    const isAdmin = await Profile.isAdmin();
    if (!isAdmin) {
      document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a">
          <div style="text-align:center">
            <div style="font-size:64px;margin-bottom:16px">🚫</div>
            <h2 style="color:#f87171;font-size:22px;font-weight:700;margin-bottom:8px">Ruxsat yo'q</h2>
            <p style="color:#64748b;margin:8px 0 24px">Bu sahifa faqat adminlar uchun</p>
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
    const adminCnt = all.filter(p => p.role === 'admin').length;
    const userCnt  = all.filter(p => p.role === 'user').length;
    // Viloyatlar statistikasi
    const vilMap   = {};
    all.forEach(p => { if (p.viloyat) vilMap[p.viloyat] = (vilMap[p.viloyat]||0) + 1; });
    const topVil   = Object.entries(vilMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    inner.innerHTML = `
      <div class="animate-fadein">

        <!-- Stats -->
        <div class="stat-grid" style="margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa">${icon('users',24)}</div>
            <div><div class="stat-value">${all.length}</div><div class="stat-label">Jami foydalanuvchilar</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#c4b5fd">${icon('shield',24)}</div>
            <div><div class="stat-value">${adminCnt}</div><div class="stat-label">Adminlar</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('user-check',24)}</div>
            <div><div class="stat-value">${userCnt}</div><div class="stat-label">Oddiy foydalanuvchilar</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('map-pin',24)}</div>
            <div><div class="stat-value">${Object.keys(vilMap).length}</div><div class="stat-label">Faol viloyatlar</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr auto;gap:20px;margin-bottom:20px;align-items:start">

          <!-- Main Table Card -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">${icon('users',16)} Foydalanuvchilar ro'yxati</span>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="admin-search" type="text" placeholder="Qidirish..." value="${AdminPage._search}"
                  oninput="AdminPage._search=this.value;AdminPage._renderTable()"
                  class="form-input" style="width:180px;padding:6px 12px;font-size:12px"/>
                <select id="admin-role-filter" onchange="AdminPage._filterRole=this.value;AdminPage._renderTable()"
                  class="form-input" style="width:110px;padding:6px 10px;font-size:12px">
                  <option value="" ${!AdminPage._filterRole?'selected':''}>Barcha rol</option>
                  <option value="admin" ${AdminPage._filterRole==='admin'?'selected':''}>Admin</option>
                  <option value="user" ${AdminPage._filterRole==='user'?'selected':''}>User</option>
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
              <span class="card-title">${icon('map',14)} Viloyatlar</span>
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
            <th>Ism</th>
            <th>Rol</th>
            <th>Viloyat</th>
            <th>Ro'yxat sanasi</th>
            <th style="min-width:280px">Amallar</th>
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
    const roleBadge = p.role === 'admin'
      ? `<span class="badge badge-purple">${icon('shield',12)} Admin</span>`
      : `<span class="badge badge-blue">${icon('user',12)} User</span>`;

    const viloyatOptions = ['', ...APP_CONFIG.VILOYATLAR]
      .map(v => `<option value="${v}" ${p.viloyat===v?'selected':''}>${v||'— Tanlang —'}</option>`).join('');

    const isAdminEmail = (p.email||'').toLowerCase() === 'abdulahatov77@gmail.com';

    return `<tr>
      <td style="color:#64748b;font-size:11px">${num}</td>
      <td style="font-weight:600;font-size:12px">
        ${p.email||'—'}
        ${isAdminEmail ? '<span style="font-size:10px;background:rgba(139,92,246,0.15);color:#c4b5fd;padding:1px 6px;border-radius:10px;margin-left:4px">Super Admin</span>' : ''}
      </td>
      <td style="font-size:12px;color:#94a3b8">${p.full_name||'—'}</td>
      <td>${roleBadge}</td>
      <td style="font-size:12px">${p.viloyat||'<span style="color:#64748b">Belgilanmagan</span>'}</td>
      <td style="font-size:11px;color:#64748b">${p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <select id="role-${p.id}" onchange="AdminPage.changeRole('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer"
            ${isAdminEmail ? 'disabled title="Super admin roli o\'zgartirilmaydi"' : ''}>
            <option value="user" ${p.role==='user'?'selected':''}>👤 User</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>🛡 Admin</option>
          </select>
          <select id="vil-${p.id}" onchange="AdminPage.changeViloyat('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer">
            ${viloyatOptions}
          </select>
          <button onclick="AdminPage.deleteUser('${p.id}','${(p.email||'').replace(/'/g,"\\'")}','${(p.role||'')}')"
            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:5px 8px;color:#f87171;font-size:11px;cursor:pointer"
            title="Foydalanuvchini o'chirish"
            ${isAdminEmail ? 'disabled' : ''}>
            ${icon('trash-2',13)}
          </button>
        </div>
      </td>
    </tr>`;
  },

  async changeRole(userId, role) {
    try {
      await Profile.setRole(userId, role);
      showToast(`✅ Rol o'zgartirildi: ${role}`, 'success');
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
    if (role === 'admin') {
      showToast('⚠️ Admin foydalanuvchini o\'chirish mumkin emas', 'warning');
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
