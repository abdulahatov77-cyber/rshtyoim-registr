// ==================== LOGIN PAGE — Modern Medical UI ====================
const LoginPage = {
  _mode: 'login',

  render() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <!-- Dekorativ fon elementlari -->
        <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]"></div>
        
        <div class="w-full max-w-[460px] relative z-10">
          <div class="bg-white rounded-[32px] shadow-2xl shadow-blue-900/10 border border-slate-100 overflow-hidden animate-fadein">
            <div class="p-10">
              <!-- Logo qismi -->
              <div class="flex items-center gap-4 mb-10">
                <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <i data-lucide="activity" class="w-7 h-7"></i>
                </div>
                <div>
                  <h1 class="text-xl font-black text-slate-800 leading-none">INFARKT & INSULT</h1>
                  <p class="text-[10px] font-bold text-blue-600 uppercase tracking-tighter mt-1">Reyestri platformasi</p>
                </div>
              </div>

              <!-- Sarlavha -->
              <div class="mb-8">
                <h2 id="login-section-title" class="text-2xl font-black text-slate-800 tracking-tight mb-2">Xush kelibsiz</h2>
                <p id="login-section-sub" class="text-sm font-medium text-slate-500">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
              </div>

              <!-- LOGIN FORM -->
              <form id="login-form" onsubmit="LoginPage.handleLogin(event)" class="space-y-5">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email manzil</label>
                  <div class="relative group">
                    <i data-lucide="mail" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="email" id="login-email" placeholder="shifokor@klinika.uz" autocomplete="email" required
                      class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parol</label>
                  <div class="relative group">
                    <i data-lucide="lock" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" required
                      class="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                    <button type="button" onclick="LoginPage.togglePwd('login-password','eye-login')"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors" id="eye-login">
                      <i data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                  </div>
                </div>

                <div id="login-error" class="hidden p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3"></div>

                <button type="submit" id="login-btn"
                  class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">
                  Kirish
                </button>
              </form>

              <!-- REGISTER FORM -->
              <form id="register-form" onsubmit="LoginPage.handleRegister(event)" class="hidden space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">To'liq ism</label>
                  <input type="text" id="reg-name" placeholder="F.I.Sh" required
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Viloyat</label>
                  <select id="reg-viloyat" required
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white outline-none cursor-pointer">
                    <option value="">Tanlang...</option>
                    ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}">${v}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                  <input type="email" id="reg-email" placeholder="email@klinika.uz" required
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white outline-none transition-all">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parol</label>
                  <input type="password" id="reg-password" placeholder="Parol kiriting" required minlength="6"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white outline-none transition-all">
                </div>
                <div id="reg-error" class="hidden p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold"></div>
                <div id="reg-success" class="hidden p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-xs font-bold"></div>
                <button type="submit" id="register-btn"
                  class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-200 transition-all">
                  Ro'yxatdan o'tish
                </button>
              </form>

              <!-- Footer link -->
              <div class="mt-8 pt-8 border-t border-slate-50 text-center">
                <p id="login-footer-text" class="text-sm font-bold text-slate-400">
                  Hisobingiz yo'qmi? <a href="#" onclick="LoginPage.switchMode('register');return false" class="text-blue-600 hover:text-blue-700 ml-1">Ro'yxatdan o'tish</a>
                </p>
              </div>
            </div>
          </div>
          
          <div class="mt-8 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi</p>
          </div>
        </div>
      </div>
    `;
    initIcons();
  },

  switchMode(mode) {
    LoginPage._mode = mode;
    const lf = document.getElementById('login-form');
    const rf = document.getElementById('register-form');
    const title = document.getElementById('login-section-title');
    const sub = document.getElementById('login-section-sub');
    const footer = document.getElementById('login-footer-text');

    if (mode === 'login') {
      lf.classList.remove('hidden'); rf.classList.add('hidden');
      if (title) title.textContent = 'Xush kelibsiz';
      if (sub) sub.textContent = "Tizimga kirish uchun ma'lumotlaringizni kiriting";
      if (footer) footer.innerHTML = 'Hisobingiz yo\'qmi? <a href="#" onclick="LoginPage.switchMode(\'register\');return false" class="text-blue-600 hover:text-blue-700 ml-1">Ro\'yxatdan o\'tish</a>';
    } else {
      lf.classList.add('hidden'); rf.classList.remove('hidden');
      if (title) title.textContent = "Ro'yxatdan o'tish";
      if (sub) sub.textContent = "Yangi hisob yaratish uchun ma'lumotlarni to'ldiring";
      if (footer) footer.innerHTML = 'Hisobingiz bormi? <a href="#" onclick="LoginPage.switchMode(\'login\');return false" class="text-blue-600 hover:text-blue-700 ml-1">Tizimga kirish</a>';
    }
    initIcons();
  },

  togglePwd(inputId, eyeId) {
    const inp = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    eye.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>`;
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
      errEl.textContent = msg;
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
    const btn       = document.getElementById('register-btn');
    const errEl     = document.getElementById('reg-error');
    const succEl    = document.getElementById('reg-success');
    
    errEl.classList.add('hidden'); succEl.classList.add('hidden');
    
    if (password.length < 6) { 
      errEl.textContent = 'Parol kamida 6 belgi bo\'lishi kerak'; 
      errEl.classList.remove('hidden'); return; 
    }
    
    setLoading(btn, true, 'Kutilmoqda...');
    try {
      await Auth.signUp(email, password, { full_name: name, viloyat: viloyat, role: 'user' });
      succEl.innerHTML = '<b>Muvaffaqiyatli!</b> Emailingizni tasdiqlang va tizimga kiring.';
      succEl.classList.remove('hidden');
      setLoading(btn, false);
      setTimeout(() => LoginPage.switchMode('login'), 3000);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  }
};
