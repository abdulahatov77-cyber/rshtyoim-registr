// ==================== LOGIN PAGE — Lovable Split-Screen ====================
const LoginPage = {
  _mode: 'login',

  render() {
    document.getElementById('app').innerHTML = `
      <div id="login-page" style="display:flex;min-height:100vh;position:absolute;top:0;left:0;width:100%;z-index:9999">
        
        <!-- CHAP TOMON: Branding -->
        <div style="flex:1;background:linear-gradient(135deg,#0F172A 0%,#1E293B 50%,#334155 100%);display:flex;flex-direction:column;justify-content:space-between;padding:48px;color:#fff;position:relative;overflow:hidden" class="login-left">
          
          <!-- Dekorativ elementlar -->
          <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(37,99,235,0.15) 0%,transparent 70%);border-radius:50%"></div>
          <div style="position:absolute;bottom:-150px;left:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%);border-radius:50%"></div>
          
          <!-- Logo -->
          <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#3B82F6,#6366F1);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(59,130,246,0.3)">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;letter-spacing:0.5px">RSHTYOIM</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.6);font-weight:500">Infarkt & Insult Registr</div>
            </div>
          </div>

          <!-- Markaziy matn -->
          <div style="position:relative;z-index:1;max-width:480px">
            <h1 style="font-size:36px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;margin-bottom:20px;color:#fff">
              O'zbekiston Respublikasi yurak-qon tomir kasalliklari registri
            </h1>
            <p style="font-size:16px;color:rgba(255,255,255,0.65);line-height:1.7">
              Infarkt va insult bemorlarini ro'yxatga olish, monitoring qilish va statistik tahlil qilish uchun yagona milliy platforma.
            </p>

            <!-- Statistika kartochkalar -->
            <div style="display:flex;gap:16px;margin-top:40px">
              <div style="background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px 24px;flex:1">
                <div style="font-size:28px;font-weight:800;color:#fff">14</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;margin-top:2px">Viloyatlar</div>
              </div>
              <div style="background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px 24px;flex:1">
                <div style="font-size:28px;font-weight:800;color:#fff">24/7</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;margin-top:2px">Monitoring</div>
              </div>
              <div style="background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px 24px;flex:1">
                <div style="font-size:28px;font-weight:800;color:#fff">100%</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;margin-top:2px">Xavfsiz</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="position:relative;z-index:1">
            <p style="font-size:13px;color:rgba(255,255,255,0.35)">© 2026 Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi</p>
          </div>
        </div>

        <!-- O'NG TOMON: Login forma -->
        <div style="width:520px;min-width:420px;display:flex;align-items:center;justify-content:center;background:#fff;padding:48px" class="login-right">
          <div style="width:100%;max-width:400px" class="animate-fadein">

            <!-- Sarlavha -->
            <div style="margin-bottom:32px">
              <h2 id="login-section-title" style="font-size:26px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;margin-bottom:6px">Tizimga kirish</h2>
              <p id="login-section-sub" style="font-size:15px;color:#94A3B8;line-height:1.5">Hisobingizga kirish uchun ma'lumotlaringizni kiriting</p>
            </div>

            <!-- LOGIN FORM -->
            <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
              <div style="margin-bottom:20px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Email manzil</label>
                <div style="position:relative">
                  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('mail',18)}</span>
                  <input type="email" id="login-email" placeholder="dr.ismi@klinika.uz" autocomplete="email" required
                    style="width:100%;padding:12px 16px 12px 44px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                    onfocus="this.style.borderColor='#2563EB';this.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';this.style.background='#fff'"
                    onblur="this.style.borderColor='#E2E8F0';this.style.boxShadow='none';this.style.background='#F8FAFC'" />
                </div>
              </div>
              <div style="margin-bottom:24px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Parol</label>
                <div style="position:relative">
                  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('lock',18)}</span>
                  <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" required
                    style="width:100%;padding:12px 48px 12px 44px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                    onfocus="this.style.borderColor='#2563EB';this.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';this.style.background='#fff'"
                    onblur="this.style.borderColor='#E2E8F0';this.style.boxShadow='none';this.style.background='#F8FAFC'" />
                  <button type="button" onclick="LoginPage.togglePwd('login-password','eye-login')"
                    style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;display:flex;padding:2px"
                    id="eye-login">${icon('eye',18)}</button>
                </div>
              </div>
              <div id="login-error" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#DC2626;font-size:14px;display:flex;align-items:center;gap:8px"></div>
              <button type="submit" id="login-btn"
                style="width:100%;padding:14px;background:#2563EB;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;box-shadow:0 2px 8px rgba(37,99,235,0.3)"
                onmouseover="this.style.background='#1D4ED8';this.style.boxShadow='0 4px 16px rgba(37,99,235,0.4)'"
                onmouseout="this.style.background='#2563EB';this.style.boxShadow='0 2px 8px rgba(37,99,235,0.3)'">
                Kirish
              </button>
            </form>

            <!-- REGISTER FORM -->
            <form id="register-form" onsubmit="LoginPage.handleRegister(event)" style="display:none">
              <div style="margin-bottom:16px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">To'liq ism</label>
                <div style="position:relative">
                  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('user',18)}</span>
                  <input type="text" id="reg-name" placeholder="Familiya Ism"
                    style="width:100%;padding:12px 16px 12px 44px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                    onfocus="this.style.borderColor='#2563EB';this.style.background='#fff'"
                    onblur="this.style.borderColor='#E2E8F0';this.style.background='#F8FAFC'" />
                </div>
              </div>
              <div style="margin-bottom:16px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Viloyat</label>
                <select id="reg-viloyat" required
                  style="width:100%;padding:12px 16px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;cursor:pointer">
                  <option value="">Viloyatni tanlang...</option>
                  ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}">${v}</option>`).join('')}
                </select>
              </div>
              <div style="margin-bottom:16px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Email manzil</label>
                <div style="position:relative">
                  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('mail',18)}</span>
                  <input type="email" id="reg-email" placeholder="dr.ismi@klinika.uz" autocomplete="email" required
                    style="width:100%;padding:12px 16px 12px 44px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                    onfocus="this.style.borderColor='#2563EB';this.style.background='#fff'"
                    onblur="this.style.borderColor='#E2E8F0';this.style.background='#F8FAFC'" />
                </div>
              </div>
              <div style="margin-bottom:16px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Parol (kamida 6 belgi)</label>
                <div style="position:relative">
                  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94A3B8;display:flex">${icon('lock',18)}</span>
                  <input type="password" id="reg-password" placeholder="••••••••" autocomplete="new-password" required minlength="6"
                    style="width:100%;padding:12px 48px 12px 44px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                    onfocus="this.style.borderColor='#2563EB';this.style.background='#fff'"
                    onblur="this.style.borderColor='#E2E8F0';this.style.background='#F8FAFC'" />
                  <button type="button" onclick="LoginPage.togglePwd('reg-password','eye-reg')"
                    style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;display:flex"
                    id="eye-reg">${icon('eye',18)}</button>
                </div>
              </div>
              <div style="margin-bottom:20px">
                <label style="display:block;font-size:14px;font-weight:600;color:#0F172A;margin-bottom:8px">Parolni tasdiqlang</label>
                <input type="password" id="reg-password2" placeholder="••••••••" autocomplete="new-password" required minlength="6"
                  style="width:100%;padding:12px 16px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#0F172A;background:#F8FAFC;font-family:inherit;outline:none;transition:all 0.2s"
                  onfocus="this.style.borderColor='#2563EB';this.style.background='#fff'"
                  onblur="this.style.borderColor='#E2E8F0';this.style.background='#F8FAFC'" />
              </div>
              <div id="reg-error" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#DC2626;font-size:14px"></div>
              <div id="reg-success" class="hidden" style="margin-bottom:16px;padding:12px 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;color:#059669;font-size:14px"></div>
              <button type="submit" id="register-btn"
                style="width:100%;padding:14px;background:#10B981;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;box-shadow:0 2px 8px rgba(16,185,129,0.3)"
                onmouseover="this.style.background='#059669'"
                onmouseout="this.style.background='#10B981'">
                Ro'yxatdan o'tish
              </button>
            </form>

            <!-- Footer link -->
            <div style="margin-top:28px;text-align:center">
              <p id="login-footer-text" style="font-size:14px;color:#94A3B8">
                Hisobingiz yo'qmi? <a href="#" onclick="LoginPage.switchMode('register');return false" style="color:#2563EB;font-weight:600;text-decoration:none">Ro'yxatdan o'tish</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>
        @media (max-width: 900px) {
          #login-page { flex-direction: column !important; }
          .login-left { min-height: 280px !important; padding: 32px !important; }
          .login-left h1 { font-size: 24px !important; }
          .login-right { width: 100% !important; min-width: auto !important; padding: 32px !important; }
        }
      </style>`;
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
      lf.style.display = 'block'; rf.style.display = 'none';
      if (title) title.textContent = 'Tizimga kirish';
      if (sub) sub.textContent = "Hisobingizga kirish uchun ma'lumotlaringizni kiriting";
      if (footer) footer.innerHTML = 'Hisobingiz yo\'qmi? <a href="#" onclick="LoginPage.switchMode(\'register\');return false" style="color:#2563EB;font-weight:600;text-decoration:none">Ro\'yxatdan o\'tish</a>';
    } else {
      lf.style.display = 'none'; rf.style.display = 'block';
      if (title) title.textContent = "Ro'yxatdan o'tish";
      if (sub) sub.textContent = "Yangi hisob yaratish uchun ma'lumotlarni to'ldiring";
      if (footer) footer.innerHTML = 'Hisobingiz bormi? <a href="#" onclick="LoginPage.switchMode(\'login\');return false" style="color:#2563EB;font-weight:600;text-decoration:none">Tizimga kirish</a>';
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
    btn.disabled = true;
    btn.textContent = 'Kirilmoqda...';
    try {
      await Auth.signIn(email, password);
      showToast('Muvaffaqiyatli kirdingiz!', 'success');
      Router.go('dashboard');
    } catch (err) {
      const msg = err.message === 'Invalid login credentials' ? 'Email yoki parol noto\'g\'ri' : err.message;
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      errEl.style.display = 'flex';
      btn.disabled = false;
      btn.textContent = 'Kirish';
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
    btn.disabled = true;
    btn.textContent = 'Kutilmoqda...';
    try {
      await Auth.signUp(email, password, { full_name: name, viloyat: viloyat, role: 'user' });
      succEl.innerHTML = '<b>Muvaffaqiyatli!</b> Email tasdiqlang va kiring.';
      succEl.classList.remove('hidden');
      succEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = "Ro'yxatdan o'tish";
      setTimeout(() => LoginPage.switchMode('login'), 3000);
    } catch (err) {
      const msg = err.message === 'User already registered' ? 'Bu email allaqachon ro\'yxatdan o\'tgan' : err.message;
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = "Ro'yxatdan o'tish";
    }
  }
};
