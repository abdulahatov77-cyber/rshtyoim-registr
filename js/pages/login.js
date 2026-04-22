// ==================== LOGIN PAGE — Lovable Style ====================
const LoginPage = {
  _mode: 'login',

  render() {
    document.getElementById('app').innerHTML = `
      <div id="login-page">
        <div class="login-card animate-fadein">

          <!-- Logo & Branding -->
          <div style="text-align:center;margin-bottom:32px">
            <div style="width:60px;height:60px;background:linear-gradient(135deg,#2563EB,#6366F1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 24px rgba(37,99,235,0.25)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#0F172A;letter-spacing:-0.5px">RSHTYOIM</h1>
            <p style="color:#64748B;font-size:14px;margin-top:6px;line-height:1.5">Infarkt & Insult Registr</p>
          </div>

          <!-- Section Title -->
          <div style="margin-bottom:24px">
            <h2 id="login-section-title" style="font-size:20px;font-weight:700;color:#0F172A;margin-bottom:4px">Tizimga kirish</h2>
            <p id="login-section-sub" style="font-size:14px;color:#94A3B8">Hisobingizga kirish uchun ma'lumotlaringizni kiriting</p>
          </div>

          <!-- Tabs -->
          <div style="display:flex;background:#F1F5F9;border-radius:12px;padding:4px;margin-bottom:28px;gap:4px">
            <button id="tab-login" onclick="LoginPage.switchMode('login')"
              style="flex:1;padding:10px;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;background:#2563EB;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,0.3);font-family:inherit;transition:all 0.2s">
              Kirish
            </button>
            <button id="tab-register" onclick="LoginPage.switchMode('register')"
              style="flex:1;padding:10px;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;background:transparent;color:#64748B;font-family:inherit;transition:all 0.2s">
              Ro'yxatdan o'tish
            </button>
          </div>

          <!-- LOGIN FORM -->
          <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Email manzil</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('mail',18)}</span>
                <input type="email" id="login-email" class="form-input" placeholder="dr.ismi@klinika.uz" autocomplete="email" required style="padding-left:42px"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Parol</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('lock',18)}</span>
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" autocomplete="current-password" required style="padding-left:42px;padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('login-password','eye-login')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;display:flex;padding:4px;border-radius:4px;transition:color 0.2s"
                  id="eye-login">${icon('eye',18)}</button>
              </div>
            </div>
            <div id="login-error" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#DC2626;font-size:14px;display:flex;align-items:center;gap:8px"></div>
            <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:4px;height:48px;font-size:15px;font-weight:700;border-radius:12px">
              Kirish
            </button>
          </form>

          <!-- REGISTER FORM -->
          <form id="register-form" onsubmit="LoginPage.handleRegister(event)" style="display:none">
            <div class="form-group">
              <label class="form-label">To'liq ism</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('user',18)}</span>
                <input type="text" id="reg-name" class="form-input" placeholder="Familiya Ism Otasining ismi" style="padding-left:42px"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Viloyat</label>
              <select id="reg-viloyat" class="form-select" required>
                <option value="">Viloyatni tanlang...</option>
                ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Email manzil</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('mail',18)}</span>
                <input type="email" id="reg-email" class="form-input" placeholder="dr.ismi@klinika.uz" autocomplete="email" required style="padding-left:42px"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Parol (kamida 6 belgi)</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('lock',18)}</span>
                <input type="password" id="reg-password" class="form-input" placeholder="••••••••" autocomplete="new-password" required minlength="6" style="padding-left:42px;padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('reg-password','eye-reg')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;display:flex;padding:4px"
                  id="eye-reg">${icon('eye',18)}</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Parolni tasdiqlang</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('shield-check',18)}</span>
                <input type="password" id="reg-password2" class="form-input" placeholder="••••••••" autocomplete="new-password" required minlength="6" style="padding-left:42px"/>
              </div>
            </div>
            <div id="reg-error" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#DC2626;font-size:14px"></div>
            <div id="reg-success" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;color:#059669;font-size:14px"></div>
            <button type="submit" id="register-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:4px;height:48px;font-size:15px;font-weight:700;border-radius:12px;background:#10B981">
              Ro'yxatdan o'tish
            </button>
          </form>

          <!-- Footer -->
          <div style="margin-top:28px;text-align:center">
            <p id="login-footer-text" style="font-size:13px;color:#94A3B8">
              Hisobingiz yo'qmi? <a href="#" onclick="LoginPage.switchMode('register');return false" style="color:#2563EB;font-weight:600">Ro'yxatdan o'tish</a>
            </p>
          </div>

          <div style="margin-top:20px;padding-top:20px;border-top:1px solid #E2E8F0;text-align:center">
            <p style="font-size:11px;color:#CBD5E1">RSHTYOIM © 2026 · Muallif: A.M.Xamidovich</p>
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
    const title = document.getElementById('login-section-title');
    const sub = document.getElementById('login-section-sub');
    const footer = document.getElementById('login-footer-text');

    if (mode === 'login') {
      lf.style.display = 'block'; rf.style.display = 'none';
      tl.style.background = '#2563EB'; tl.style.color = '#fff'; tl.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
      tr.style.background = 'transparent'; tr.style.color = '#64748B'; tr.style.boxShadow = 'none';
      if (title) { title.textContent = 'Tizimga kirish'; }
      if (sub) { sub.textContent = "Hisobingizga kirish uchun ma'lumotlaringizni kiriting"; }
      if (footer) { footer.innerHTML = 'Hisobingiz yo\'qmi? <a href="#" onclick="LoginPage.switchMode(\'register\');return false" style="color:#2563EB;font-weight:600">Ro\'yxatdan o\'tish</a>'; }
    } else {
      lf.style.display = 'none'; rf.style.display = 'block';
      tr.style.background = '#10B981'; tr.style.color = '#fff'; tr.style.boxShadow = '0 2px 8px rgba(16,185,129,0.3)';
      tl.style.background = 'transparent'; tl.style.color = '#64748B'; tl.style.boxShadow = 'none';
      if (title) { title.textContent = "Ro'yxatdan o'tish"; }
      if (sub) { sub.textContent = "Yangi hisob yaratish uchun ma'lumotlarni to'ldiring"; }
      if (footer) { footer.innerHTML = 'Hisobingiz bormi? <a href="#" onclick="LoginPage.switchMode(\'login\');return false" style="color:#2563EB;font-weight:600">Tizimga kirish</a>'; }
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
      showToast('Muvaffaqiyatli kirdingiz!', 'success');
      Router.go('dashboard');
    } catch (err) {
      const msg = err.message === 'Invalid login credentials' ? 'Email yoki parol noto\'g\'ri' : err.message;
      errEl.innerHTML = '${icon("alert-circle",18)} ' + msg;
      errEl.classList.remove('hidden');
      errEl.style.display = 'flex';
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
    if (!viloyat) { errEl.textContent = 'Viloyatni tanlang'; errEl.classList.remove('hidden'); errEl.style.display = 'block'; return; }
    if (password !== password2) { errEl.textContent = 'Parollar mos kelmayapti'; errEl.classList.remove('hidden'); errEl.style.display = 'block'; return; }
    if (password.length < 6) { errEl.textContent = 'Parol kamida 6 belgi bo\'lishi kerak'; errEl.classList.remove('hidden'); errEl.style.display = 'block'; return; }
    setLoading(btn, true, 'Ro\'yxatdan o\'tilmoqda...');
    try {
      await Auth.signUp(email, password, { full_name: name, viloyat: viloyat, role: 'user' });
      succEl.innerHTML = '<b>Muvaffaqiyatli!</b> Email tasdiqlang va kiring.';
      succEl.classList.remove('hidden');
      succEl.style.display = 'block';
      setLoading(btn, false);
      setTimeout(() => LoginPage.switchMode('login'), 3000);
    } catch (err) {
      const msg = err.message === 'User already registered' ? 'Bu email allaqachon ro\'yxatdan o\'tgan' : err.message;
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      errEl.style.display = 'block';
      setLoading(btn, false);
    }
  }
};
