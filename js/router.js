// ==================== ROUTE-LEVEL SCRIPT LOADING ====================
const PageLoader = {
  _loaded: new Set(['login']),
  _pending: new Map(),
  _pages: {
    dashboard:            { src: 'js/pages/dashboard.js?v=20261005-karta', deps: ['pd', 'agePyramid', 'charts', 'treatmentFlow'] },
    'infarkt-yangi':      { src: 'js/pages/infarkt-yangi.js?v=20261005-kichik', deps: ['calculators'] },
    'insult-yangi':       { src: 'js/pages/insult-yangi.js?v=20261006-tekshiruv', deps: ['calculators', 'cdss'] },
    'infarkt-reyestri':   { src: 'js/pages/infarkt-reyestri.js?v=20260926-i18n-r69' },
    'insult-reyestri':    { src: 'js/pages/insult-reyestri.js?v=20260926-i18n-r72' },
    'bemor-karta':        { src: 'js/pages/bemor-karta.js?v=20261006-tekshiruv', deps: ['calculators'] },
    bemorlar:             { src: 'js/pages/bemorlar.js?v=20261005-karta', deps: ['pd'] },
    hisobot:              { src: 'js/pages/hisobot.js?v=20261005-karta' },
    admin:                { src: 'js/pages/admin.js?v=20260926-i18n-r72' },
    'muassasa-imkoniyat': { src: 'js/pages/muassasa-imkoniyat.js?v=20260926-i18n-r72' },
    settings:             { src: 'js/pages/settings.js?v=20260926-i18n-r72' },
    harakat:              { src: 'js/pages/harakat.js?v=20260927-perf-r2' },
    marshrut:             { src: 'js/pages/marshrut.js?v=20260926-i18n-r70' },
    qabul:                { src: 'js/pages/qabul.js?v=20260926-i18n-r72' },
    'keng-hisobot':       { src: 'js/pages/keng-hisobot.js?v=20260926-i18n-r72' }
  },
  _deps: {
    treatmentFlow: () => AssetLoader.script('js/treatment-flow.js?v=20261005-route'),
    pd: () => AssetLoader.script('js/pd-mask.js?v=20260924-i18n-r1'),
    cdss: () => AssetLoader.script('js/cdss.js?v=20261004-gcs9'),
    calculators: () => AssetLoader.script('js/calculators.js?v=20261004-gcs9'),
    agePyramid: () => AssetLoader.script('js/agePyramid.js?v=20261005-karta'),
    charts: () => AssetLoader.charts()
  },

  load(route) {
    if (this._loaded.has(route)) return Promise.resolve();
    if (this._pending.has(route)) return this._pending.get(route);
    const page = this._pages[route];
    if (!page) return Promise.reject(new Error(`Noma'lum sahifa: ${route}`));
    const promise = Promise.all((page.deps || []).map(dep => this._deps[dep]()))
      .then(() => AssetLoader.script(page.src))
      .then(() => { this._loaded.add(route); })
      .catch(err => {
        this._pending.delete(route);
        throw err;
      });
    this._pending.set(route, promise);
    return promise;
  }
};

// ==================== ROUTER ====================
const Router = {
  _current: null,
  _prev: null,
  _params: {},
  _fromPopState: false,

  routes: {
    'login':            () => LoginPage.render(),
    'dashboard':        async () => { await PageLoader.load('dashboard'); return DashboardPage.render(); },
    'infarkt-yangi':    async () => { await PageLoader.load('infarkt-yangi'); return InfarktYangiPage.render(); },
    'insult-yangi':     async () => { await PageLoader.load('insult-yangi'); return InsultYangiPage.render(); },
    'infarkt-reyestri': async () => { await PageLoader.load('infarkt-reyestri'); return InfarktReyestriPage.render(); },
    'insult-reyestri':  async () => { await PageLoader.load('insult-reyestri'); return InsultReyestriPage.render(); },
    'bemor-karta':      async () => { await PageLoader.load('bemor-karta'); return BemorKartaPage.render(Router._params); },
    'bemorlar':         async () => { await PageLoader.load('bemorlar'); return BemorlarPage.render(); },
    'hisobot':          async () => { await PageLoader.load('hisobot'); return HisobotPage.render(); },
    'admin':            async () => { await PageLoader.load('admin'); return AdminPage.render(); },
    'muassasa-imkoniyat': async () => { await PageLoader.load('muassasa-imkoniyat'); return MuassasaImkoniyatPage.render(); },
    'settings':         async () => { await PageLoader.load('settings'); return SettingsPage.render(); },
    'harakat':          async () => { await PageLoader.load('harakat'); return HarakatPage.render(); },
    'marshrut':         async () => { await PageLoader.load('marshrut'); return MarshrutPage.render(); },
    'qabul':            async () => { await PageLoader.load('qabul'); return QabulPage.render(); },
    'keng-hisobot':     async () => { await PageLoader.load('keng-hisobot'); return KengHisobotPage.render(); },
  },

  back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      Router.go(Router._prev || 'bemorlar');
    }
  },

  async go(route, params = {}) {
    if (window.performance?.mark) performance.mark(`route:${route}:start`);
    // Cleanup previous page
    if (Router._current && Router._current !== route) {
      Realtime.unsubscribeAll();
      Router._prev = Router._current;
    }

    Router._current = route;
    Router._params = params;

    // History API — popstate dan kelgan bo'lsa yoki bir xil route bo'lsa pushState qilmaymiz
    if (!Router._fromPopState) {
      const state = { route, params };
      const url = '/' + (route === 'dashboard' ? '' : route) +
        (params.id ? '?id=' + encodeURIComponent(params.id) : '') +
        (params.kt_no ? (params.id ? '&' : '?') + 'kt=' + encodeURIComponent(params.kt_no) : '');
      const current = window.history.state;
      if (!current || current.route !== route || JSON.stringify(current.params) !== JSON.stringify(params)) {
        window.history.pushState(state, '', url);
      }
    }
    Router._fromPopState = false;

    const app = document.getElementById('app');
    app.innerHTML = `<div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-slate-400 text-sm">Yuklanmoqda...</p>
      </div>
    </div>`;

    try {
      const handler = Router.routes[route];
      if (handler) {
        await handler();
        if (window.performance?.mark) performance.mark(`route:${route}:complete`);
      } else {
        Router.go('dashboard');
      }
    } catch (err) {
      console.error('Router error:', err);
      // Eskirgan navigatsiya: foydalanuvchi sahifa yuklanib bo'lishini kutmasdan
      // boshqasiga o'tgan bo'lsa, eski sahifaning xatosi yangisini yiqitmasin.
      if (Router._current !== route) return;
      // Sessiya muddati tugagan / JWT xatosi — login sahifasiga yo'naltiramiz
      const m = (err.message || '') + ' ' + (err.code || '');
      if (/jwt|token|401|not authenticated|session|expired|refresh/i.test(m)) {
        try { await Auth.signOut(); } catch(e){}
        showToast(t('auth.sessionExpired'), 'warning', 5000);
        Router.go('login');
        return;
      }
      const safeMessage = window.I18n ? I18n.friendlyError(err) : 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
      app.innerHTML = `<div class="flex items-center justify-center min-h-screen">
        <div class="text-center p-8 max-w-2xl">
          <div class="text-5xl mb-4">⚠️</div>
          <h2 class="text-lg font-bold text-slate-700 mb-2">${t('validation.loadFailed')}</h2>
          <p class="text-slate-400 text-sm mb-4">${esc(safeMessage)}</p>
          <button class="btn btn-primary" onclick="Router.go('dashboard')">${t('validation.retry')}</button>
        </div>
      </div>`;
    }
  },

  init() {
    // Brauzer "Orqaga"/"Oldinga" tugmasi bosilganda
    window.addEventListener('popstate', async (e) => {
      const state = e.state;
      if (state?.route) {
        Router._fromPopState = true;
        await Router.go(state.route, state.params || {});
      } else {
        Router._fromPopState = true;
        await Router.go('dashboard');
      }
    });
  }
};
