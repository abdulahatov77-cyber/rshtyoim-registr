// ==================== LOGIN PAGE ====================
const LoginPage = {
  _mode: 'login', // 'login' | 'register'

  render() {
    document.getElementById('app').innerHTML = `
      <div id="login-page">
        <div class="login-card animate-fadein">
          <!-- Logo -->
          <div class="text-center mb-6">
            <div class="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-blue-200">
              🏥
            </div>
            <h1 class="text-2xl font-black text-slate-800 leading-tight">RSHTYOIM</h1>
            <p class="text-slate-500 text-sm mt-1 leading-snug">Infarkt va Insult<br>Bemorlari Registr Platformasi</p>
          </div>

          <!-- Tabs -->
          <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:24px;gap:4px">
            <button id="tab-login" onclick="LoginPage.switchMode('login')"
              style="flex:1;padding:10px;border:none;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;background:#2563eb;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,0.3)">
              🔐 Kirish
            </button>
            <button id="tab-register" onclick="LoginPage.switchMode('register')"
              style="flex:1;padding:10px;border:none;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;background:transparent;color:#64748b">
              📝 Ro'yxatdan o'tish
            </button>
          </div>

          <!-- LOGIN FORM -->
          <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
            <div class="form-group">
              <label class="form-label" for="login-email">Elektron pochta</label>
              <input type="email" id="login-email" class="form-input" placeholder="shifokor@rshtyoim.uz"
                autocomplete="email" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Parol</label>
              <div style="position:relative">
                <input type="password" id="login-password" class="form-input" placeholder="••••••••"
                  autocomplete="current-password" required style="padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('login-password','eye-login')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8"
                  id="eye-login">👁️</button>
              </div>
            </div>
            <div id="login-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"></div>
            <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg mt-2">
              🔐 Tizimga kirish
            </button>
          </form>

          <!-- REGISTER FORM -->
          <form id="register-form" onsubmit="LoginPage.handleRegister(event)" style="display:none">
            <div class="form-group">
              <label class="form-label" for="reg-name">To'liq ism (ixtiyoriy)</label>
              <input type="text" id="reg-name" class="form-input" placeholder="Familiya Ism Otasining ismi"/>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Elektron pochta</label>
              <input type="email" id="reg-email" class="form-input" placeholder="shifokor@rshtyoim.uz"
                autocomplete="email" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Parol (kamida 6 belgi)</label>
              <div style="position:relative">
                <input type="password" id="reg-password" class="form-input" placeholder="••••••••"
                  autocomplete="new-password" required minlength="6" style="padding-right:44px"/>
                <button type="button" onclick="LoginPage.togglePwd('reg-password','eye-reg')"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8"
                  id="eye-reg">👁️</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password2">Parolni tasdiqlang</label>
              <input type="password" id="reg-password2" class="form-input" placeholder="••••••••"
                autocomplete="new-password" required minlength="6"/>
            </div>
            <div id="reg-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"></div>
            <div id="reg-success" class="hidden mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm"></div>
            <button type="submit" id="register-btn" class="btn btn-full btn-lg mt-2"
              style="background:linear-gradient(135deg,#059669,#047857);color:#fff;font-weight:700">
              📝 Ro'yxatdan o'tish
            </button>
          </form>

          <!-- Footer info -->
          <div class="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p class="text-xs text-blue-600 text-center font-medium">
              💡 Supabase Auth orqali autentifikatsiya
            </p>
            <p class="text-xs text-blue-400 text-center mt-1">
              Loyiha: RSHTYOIM · Muallif: A.M.Xamidovich
            </p>
          </div>
        </div>
      </div>
    `;
  },

  switchMode(mode) {
    LoginPage._mode = mode;
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');

    if (mode === 'login') {
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      tabLogin.style.background = '#2563eb';
      tabLogin.style.color = '#fff';
      tabLogin.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
      tabReg.style.background = 'transparent';
      tabReg.style.color = '#64748b';
      tabReg.style.boxShadow = 'none';
    } else {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      tabReg.style.background = '#059669';
      tabReg.style.color = '#fff';
      tabReg.style.boxShadow = '0 2px 8px rgba(5,150,105,0.3)';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = '#64748b';
      tabLogin.style.boxShadow = 'none';
    }
  },

  togglePwd(inputId, eyeId) {
    const inp = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    if (inp.type === 'password') {
      inp.type = 'text'; eye.textContent = '🙈';
    } else {
      inp.type = 'password'; eye.textContent = '👁️';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    errEl.classList.add('hidden');
    setLoading(btn, true, 'Kirilmoqda...');

    try {
      await Auth.signIn(email, password);
      showToast('Muvaffaqiyatli kirdingiz! 🎉', 'success');
      Router.go('dashboard');
    } catch (err) {
      const msg = err.message === 'Invalid login credentials'
        ? 'Email yoki parol noto\'g\'ri'
        : err.message;
      errEl.textContent = '❌ ' + msg;
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2= document.getElementById('reg-password2').value;
    const btn      = document.getElementById('register-btn');
    const errEl    = document.getElementById('reg-error');
    const succEl   = document.getElementById('reg-success');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    // Validatsiya
    if (password !== password2) {
      errEl.textContent = '❌ Parollar mos kelmayapti';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 6) {
      errEl.textContent = '❌ Parol kamida 6 belgidan iborat bo\'lishi kerak';
      errEl.classList.remove('hidden');
      return;
    }

    setLoading(btn, true, 'Ro\'yxatdan o\'tilmoqda...');

    try {
      await Auth.signUp(email, password, { full_name: name });
      succEl.innerHTML = `
        ✅ <b>Ro'yxatdan o'tdingiz!</b><br>
        <span style="font-size:12px">Email manzilingizga tasdiqlash xati yuborildi. 
        Iltimos, emailingizni tasdiqlang va tizimga kiring.</span>
      `;
      succEl.classList.remove('hidden');
      setLoading(btn, false);
      // 3 soniyadan so'ng login tabga o'tish
      setTimeout(() => LoginPage.switchMode('login'), 3000);
    } catch (err) {
      const msg = err.message === 'User already registered'
        ? 'Bu email allaqachon ro\'yxatdan o\'tgan'
        : err.message;
      errEl.textContent = '❌ ' + msg;
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  }
};
