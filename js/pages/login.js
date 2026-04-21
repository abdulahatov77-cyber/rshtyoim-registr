// ==================== LOGIN PAGE ====================
const LoginPage = {
  _mode: 'login',

  render() {
    document.getElementById('app').innerHTML = `
      <div id="login-page">
        <div class="login-card animate-fadein">

          <!-- Logo -->
          <div style="text-align:center;margin-bottom:28px">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#1d4ed8,#0ea5e9);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px;box-shadow:0 8px 24px rgba(29,78,216,0.4)">🏥</div>
            <h1 style="font-size:22px;font-weight:900;color:#f1f5f9;letter-spacing:-0.5px">RSHTYOIM</h1>
            <p style="color:#64748b;font-size:13px;margin-top:4px;line-height:1.5">Infarkt va Insult<br>Bemorlari Registr Platformasi</p>
          </div>

          <!-- Tabs -->
          <div style="display:flex;background:#0f172a;border-radius:12px;padding:4px;margin-bottom:24px;gap:4px">
            <button id="tab-login" onclick="LoginPage.switchMode('login')"
              style="flex:1;padding:10px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,0.4);font-family:inherit;transition:all 0.2s">
              🔐 Kirish
            </button>
            <button id="tab-register" onclick="LoginPage.switchMode('register')"
              style="flex:1;padding:10px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:#64748b;font-family:inherit;transition:all 0.2s">
              📝 Ro'yxatdan o'tish
            </button>
          </div>

          <!-- LOGIN -->
          <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Elektron pochta</label>
              <input type="email" id="login-email" class="form-input" placeholder="shifokor@rshtyoim.uz" autocomplete="email" required />
            </div>
            <div class="form-group">
              <label class="form-label">Parol</label>
              <div style="position:relative">
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" autocomplete="current-password" required style="padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('login-password','eye-login')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#64748b;display:flex"
                  id="eye-login">${icon('eye',18)}</button>
              </div>
            </div>
            <div id="login-error" class="hidden" style="margin-bottom:12px;padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:10px;color:#f87171;font-size:13px"></div>
            <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:4px">
              ${icon('log-in',18)} Tizimga kirish
            </button>
          </form>

          <!-- REGISTER -->
          <form id="register-form" onsubmit="LoginPage.handleRegister(event)" style="display:none">
            <div class="form-group">
              <label class="form-label">To'liq ism (ixtiyoriy)</label>
              <input type="text" id="reg-name" class="form-input" placeholder="Familiya Ism Otasining ismi"/>
            </div>
            <div class="form-group">
              <label class="form-label">Viloyat</label>
              <select id="reg-viloyat" class="form-select" required>
                <option value="">— Viloyatni tanlang —</option>
                ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Elektron pochta</label>
              <input type="email" id="reg-email" class="form-input" placeholder="shifokor@rshtyoim.uz" autocomplete="email" required />
            </div>
            <div class="form-group">
              <label class="form-label">Parol (kamida 6 belgi)</label>
              <div style="position:relative">
                <input type="password" id="reg-password" class="form-input" placeholder="••••••••" autocomplete="new-password" required minlength="6" style="padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('reg-password','eye-reg')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#64748b;display:flex" id="eye-reg">${icon('eye',18)}</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Parolni tasdiqlang</label>
              <input type="password" id="reg-password2" class="form-input" placeholder="••••••••" autocomplete="new-password" required minlength="6"/>
            </div>
            <div id="reg-error" class="hidden" style="margin-bottom:12px;padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:10px;color:#f87171;font-size:13px"></div>
            <div id="reg-success" class="hidden" style="margin-bottom:12px;padding:10px 14px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:10px;color:#34d399;font-size:13px"></div>
            <button type="submit" id="register-btn" class="btn btn-success btn-full btn-lg" style="margin-top:4px">
              ${icon('user-plus',18)} Ro'yxatdan o'tish
            </button>
          </form>

          <!-- Footer -->
          <div style="margin-top:20px;padding:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:10px;text-align:center">
            <p style="font-size:12px;color:#60a5fa;font-weight:500">💡 Supabase Auth orqali himoyalangan</p>
            <p style="font-size:11px;color:#334155;margin-top:4px">RSHTYOIM · Muallif: A.M.Xamidovich</p>
          </div>
        </div>
      </div>`;
    initIcons();
  },

  switchMode(mode) {
    LoginPage._mode = mode;
    const lf = document.getElementById('login-form');
    const rf = document.getElementById('register-form');
    const tl = document.getElementById('tab-login');
    const tr = document.getElementById('tab-register');
    if (mode === 'login') {
      lf.style.display = 'block'; rf.style.display = 'none';
      tl.style.background = 'linear-gradient(135deg,#2563eb,#1d4ed8)'; tl.style.color = '#fff'; tl.style.boxShadow = '0 2px 8px rgba(37,99,235,0.4)';
      tr.style.background = 'transparent'; tr.style.color = '#64748b'; tr.style.boxShadow = 'none';
    } else {
      lf.style.display = 'none'; rf.style.display = 'block';
      tr.style.background = 'linear-gradient(135deg,#059669,#047857)'; tr.style.color = '#fff'; tr.style.boxShadow = '0 2px 8px rgba(5,150,105,0.4)';
      tl.style.background = 'transparent'; tl.style.color = '#64748b'; tl.style.boxShadow = 'none';
    }
  },

  togglePwd(inputId, eyeId) {
    const inp = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    eye.innerHTML = icon(isPass ? 'eye-off' : 'eye', 18);
    initIcons();
  },

  async handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errEl    = document.getElementById('login-error');
    errEl.classList.add('hidden');
    setLoading(btn, true, 'Kirilmoqda...');
    try {
      await Auth.signIn(email, password);
      showToast('✅ Muvaffaqiyatli kirdingiz!', 'success');
      Router.go('dashboard');
    } catch (err) {
      const msg = err.message === 'Invalid login credentials' ? 'Email yoki parol noto\'g\'ri' : err.message;
      errEl.textContent = '❌ ' + msg;
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name      = document.getElementById('reg-name').value.trim();
    const viloyat   = document.getElementById('reg-viloyat').value;
    const email     = document.getElementById('reg-email').value.trim();
    const password  = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const btn       = document.getElementById('register-btn');
    const errEl     = document.getElementById('reg-error');
    const succEl    = document.getElementById('reg-success');
    errEl.classList.add('hidden'); succEl.classList.add('hidden');
    if (!viloyat) { errEl.textContent = '❌ Viloyatni tanlang'; errEl.classList.remove('hidden'); return; }
    if (password !== password2) { errEl.textContent = '❌ Parollar mos kelmayapti'; errEl.classList.remove('hidden'); return; }
    if (password.length < 6) { errEl.textContent = '❌ Parol kamida 6 belgi bo\'lishi kerak'; errEl.classList.remove('hidden'); return; }
    setLoading(btn, true, 'Ro\'yxatdan o\'tilmoqda...');
    try {
      await Auth.signUp(email, password, { full_name: name, viloyat: viloyat, role: 'user' });
      succEl.innerHTML = '✅ <b>Muvaffaqiyatli ro\'yxatdan o\'tdingiz!</b> Email tasdiqlang va kiring.';
      succEl.classList.remove('hidden');
      setLoading(btn, false);
      setTimeout(() => LoginPage.switchMode('login'), 3000);
    } catch (err) {
      const msg = err.message === 'User already registered' ? 'Bu email allaqachon ro\'yxatdan o\'tgan' : err.message;
      errEl.textContent = '❌ ' + msg;
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  }
};
