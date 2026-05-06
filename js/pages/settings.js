// ==================== SOZLAMALAR SAHIFASI ====================
const SettingsPage = {

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    SettingsPage._profile = profile;
    SettingsPage._user = user;

    document.getElementById('app').innerHTML = Components.renderLayout(
      'settings', 'Sozlamalar', 'Profil va parol sozlamalari',
      `<div id="settings-inner" class="animate-fadein max-w-2xl mx-auto"></div>`,
      user
    );
    Components.startClock();
    SettingsPage.renderContent(profile, user);
  },

  renderContent(profile, user) {
    const inner = document.getElementById('settings-inner');
    if (!inner) return;

    const viloyatOptions = APP_CONFIG.VILOYATLAR.map(v =>
      `<option value="${v}" ${profile?.viloyat === v ? 'selected' : ''}>${v}</option>`
    ).join('');

    inner.innerHTML = `
      <!-- Profil ma'lumotlari -->
      <div class="card mb-6 border-t-4 border-t-blue-500">
        <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0">
          <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('user', 18)} Profil ma'lumotlari</h3>
        </div>
        <form id="profile-form" onsubmit="SettingsPage.saveProfile(event)" class="p-6 space-y-4">

          <div class="flex items-center gap-5 mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
              ${(profile?.fio || profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-bold text-gray-900">${profile?.fio || profile?.full_name || '—'}</p>
              <p class="text-sm text-gray-500">${user?.email || '—'}</p>
              <span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                ${profile?.role === 'admin' ? 'Administrator' : 'Shifokor'}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">To'liq ism (F.I.Sh)</label>
            <input type="text" id="s-fio" class="form-input"
              value="${profile?.fio || profile?.full_name || ''}"
              placeholder="Familiya Ism Sharifingiz" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email (o'zgartirib bo'lmaydi)</label>
            <input type="email" class="form-input bg-gray-50 text-gray-400 cursor-not-allowed"
              value="${user?.email || ''}" disabled />
          </div>

          <div class="form-group">
            <label class="form-label">Viloyat</label>
            <select id="s-viloyat" class="form-select" ${profile?.role === 'admin' ? '' : ''}>
              <option value="">— Tanlang —</option>
              ${viloyatOptions}
            </select>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" id="save-profile-btn" class="btn btn-primary flex items-center gap-2">
              ${icon('save', 16)} Profilni saqlash
            </button>
          </div>
        </form>
      </div>

      <!-- Parolni o'zgartirish -->
      <div class="card border-t-4 border-t-amber-400">
        <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0">
          <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('lock', 18)} Parolni o'zgartirish</h3>
        </div>
        <form id="password-form" onsubmit="SettingsPage.changePassword(event)" class="p-6 space-y-4">

          <div class="form-group">
            <label class="form-label">Yangi parol</label>
            <div class="relative group">
              <input type="password" id="s-pass1" class="form-input pr-12"
                placeholder="Kamida 6 ta belgi" minlength="6" required />
              <button type="button" onclick="SettingsPage.togglePwd('s-pass1', 'eye-1')"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors" id="eye-1">
                ${icon('eye', 18)}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Parolni tasdiqlang</label>
            <div class="relative group">
              <input type="password" id="s-pass2" class="form-input pr-12"
                placeholder="Parolni takrorlang" minlength="6" required />
              <button type="button" onclick="SettingsPage.togglePwd('s-pass2', 'eye-2')"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors" id="eye-2">
                ${icon('eye', 18)}
              </button>
            </div>
          </div>

          <div id="pwd-error" class="hidden p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium"></div>

          <div class="flex justify-end pt-2">
            <button type="submit" id="save-pwd-btn" class="btn btn-secondary flex items-center gap-2">
              ${icon('shield-check', 16)} Parolni o'zgartirish
            </button>
          </div>
        </form>
      </div>
    `;
    initIcons();
  },

  async saveProfile(e) {
    e.preventDefault();
    const fio = document.getElementById('s-fio').value.trim();
    const viloyat = document.getElementById('s-viloyat').value;
    const btn = document.getElementById('save-profile-btn');

    if (!fio) { showToast("Ism kiritilmagan", 'warning'); return; }

    setLoading(btn, true, 'Saqlanmoqda...');
    try {
      await Profile.update({ fio, full_name: fio, viloyat: viloyat || null });
      showToast('Profil muvaffaqiyatli yangilandi', 'success');
      // Cache yangilanganligi uchun sahifani qayta render qilish
      const profile = await Profile.getCurrent();
      SettingsPage._profile = profile;
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  },

  async changePassword(e) {
    e.preventDefault();
    const p1 = document.getElementById('s-pass1').value;
    const p2 = document.getElementById('s-pass2').value;
    const btn = document.getElementById('save-pwd-btn');
    const errEl = document.getElementById('pwd-error');

    errEl.classList.add('hidden');

    if (p1.length < 6) {
      errEl.textContent = 'Parol kamida 6 ta belgi bo\'lishi kerak';
      errEl.classList.remove('hidden'); return;
    }
    if (p1 !== p2) {
      errEl.textContent = 'Parollar mos kelmaydi';
      errEl.classList.remove('hidden'); return;
    }

    setLoading(btn, true, "O'zgartirilmoqda...");
    try {
      await Auth.updatePassword(p1);
      showToast('Parol muvaffaqiyatli o\'zgartirildi', 'success');
      document.getElementById('s-pass1').value = '';
      document.getElementById('s-pass2').value = '';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  },

  togglePwd(inputId, eyeId) {
    const inp = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    eye.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" style="width:18px;height:18px"></i>`;
    initIcons();
  }
};
