// ==================== LOGIN PAGE ====================
const LoginPage = {
  render() {
    document.getElementById('app').innerHTML = `
      <div id="login-page">
        <div class="login-card animate-fadein">
          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-blue-200">
              🏥
            </div>
            <h1 class="text-2xl font-black text-slate-800 leading-tight">RSHTYOIM</h1>
            <p class="text-slate-500 text-sm mt-1 leading-snug">Infarkt va Insult<br>Bemorlari Registr Platformasi</p>
          </div>

          <!-- Form -->
          <form id="login-form" onsubmit="LoginPage.handleSubmit(event)">
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
                <button type="button" onclick="LoginPage.togglePassword()"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8"
                  id="pwd-eye">👁️</button>
              </div>
            </div>

            <div id="login-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"></div>

            <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg mt-2">
              🔐 Tizimga kirish
            </button>
          </form>

          <!-- Demo hint -->
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

  togglePassword() {
    const inp = document.getElementById('login-password');
    const eye = document.getElementById('pwd-eye');
    if (inp.type === 'password') {
      inp.type = 'text'; eye.textContent = '🙈';
    } else {
      inp.type = 'password'; eye.textContent = '👁️';
    }
  },

  async handleSubmit(e) {
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
      errEl.textContent = '❌ ' + (err.message === 'Invalid login credentials'
        ? 'Email yoki parol noto\'g\'ri'
        : err.message);
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  }
};
