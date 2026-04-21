// ==================== ADMIN PANEL ====================
const AdminPage = {
  _profiles: [],

  async render() {
    const isAdmin = await Profile.isAdmin();
    if (!isAdmin) {
      document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:16px">🚫</div>
            <h2 style="color:#f87171;font-size:20px;font-weight:700">Ruxsat yo'q</h2>
            <p style="color:#64748b;margin:8px 0 20px">Bu sahifa faqat adminlar uchun</p>
            <button class="btn btn-ghost" onclick="Router.go('dashboard')">← Bosh sahifaga</button>
          </div>
        </div>`;
      return;
    }

    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'admin', '⚙️ Admin Panel', 'Foydalanuvchilarni boshqarish',
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
      document.getElementById('admin-content').innerHTML =
        `<div class="empty-state"><div class="empty-state-title" style="color:#f87171">❌ ${err.message}</div></div>`;
    }
  },

  renderContent() {
    const profiles = AdminPage._profiles;
    document.getElementById('admin-content').innerHTML = `
      <div class="animate-fadein">
        <!-- Stats -->
        <div class="stat-grid" style="margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa">${icon('users',24)}</div>
            <div><div class="stat-value">${profiles.length}</div><div class="stat-label">Jami foydalanuvchilar</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#c4b5fd">${icon('shield',24)}</div>
            <div><div class="stat-value">${profiles.filter(p=>p.role==='admin').length}</div><div class="stat-label">Adminlar</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('user-check',24)}</div>
            <div><div class="stat-value">${profiles.filter(p=>p.role==='user').length}</div><div class="stat-label">Oddiy foydalanuvchilar</div></div>
          </div>
        </div>

        <!-- Table -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${icon('users',16)} Foydalanuvchilar ro'yxati</span>
            <button class="btn btn-ghost btn-sm" onclick="AdminPage.loadProfiles()">${icon('refresh-cw',14)} Yangilash</button>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Ism</th>
                  <th>Rol</th>
                  <th>Viloyat</th>
                  <th>Ro'yxat sanasi</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                ${profiles.map(p => AdminPage.renderRow(p)).join('') || `
                  <tr><td colspan="6" style="text-align:center;padding:32px;color:#64748b">Foydalanuvchilar yo'q</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    initIcons();
  },

  renderRow(p) {
    const roleBadge = p.role === 'admin'
      ? `<span class="badge badge-purple">${icon('shield',12)} Admin</span>`
      : `<span class="badge badge-blue">${icon('user',12)} User</span>`;
    const viloyatOptions = ['', ...APP_CONFIG.VILOYATLAR]
      .map(v => `<option value="${v}" ${p.viloyat===v?'selected':''}>${v||'— Tanlang —'}</option>`).join('');

    return `<tr>
      <td style="font-weight:600;font-size:12px">${p.email||'—'}</td>
      <td style="font-size:12px;color:#94a3b8">${p.full_name||'—'}</td>
      <td>${roleBadge}</td>
      <td style="font-size:12px">${p.viloyat||'<span style="color:#64748b">Belgilanmagan</span>'}</td>
      <td style="font-size:11px;color:#64748b">${p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="role-${p.id}" onchange="AdminPage.changeRole('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer">
            <option value="user" ${p.role==='user'?'selected':''}>User</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>Admin</option>
          </select>
          <select id="vil-${p.id}" onchange="AdminPage.changeViloyat('${p.id}',this.value)"
            style="background:#0f172a;border:1px solid rgba(99,118,158,0.2);border-radius:8px;padding:5px 8px;color:#e2e8f0;font-size:12px;cursor:pointer">
            ${viloyatOptions}
          </select>
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
      // Re-render just the badges
      AdminPage.renderContent();
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
    }
  },

  async changeViloyat(userId, viloyat) {
    try {
      await Profile.setViloyat(userId, viloyat);
      showToast(`✅ Viloyat o'zgartirildi`, 'success');
      const idx = AdminPage._profiles.findIndex(p => p.id === userId);
      if (idx !== -1) AdminPage._profiles[idx].viloyat = viloyat;
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
    }
  }
};
