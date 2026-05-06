// ==================== ROUTER ====================
const Router = {
  _current: null,
  _prev: null,
  _params: {},

  routes: {
    'login':            () => LoginPage.render(),
    'dashboard':        () => DashboardPage.render(),
    'infarkt-yangi':    () => InfarktYangiPage.render(),
    'insult-yangi':     () => InsultYangiPage.render(),
    'infarkt-reyestri': () => InfarktReyestriPage.render(),
    'insult-reyestri':  () => InsultReyestriPage.render(),
    'bemor-karta':      () => BemorKartaPage.render(Router._params),
    'bemorlar':         () => BemorlarPage.render(),
    'hisobot':          () => HisobotPage.render(),
    'admin':            () => AdminPage.render(),
    'settings':         () => SettingsPage.render(),
  },

  back() {
    const prev = Router._prev || 'bemorlar';
    Router.go(prev);
  },

  async go(route, params = {}) {
    // Cleanup previous page
    if (Router._current && Router._current !== route) {
      Realtime.unsubscribeAll();
      Router._prev = Router._current;
    }

    Router._current = route;
    Router._params = params;

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
      } else {
        Router.go('dashboard');
      }
    } catch (err) {
      console.error('Router error:', err);
      app.innerHTML = `<div class="flex items-center justify-center min-h-screen">
        <div class="text-center p-8">
          <div class="text-5xl mb-4">⚠️</div>
          <h2 class="text-lg font-bold text-slate-700 mb-2">Sahifani yuklashda xato</h2>
          <p class="text-slate-400 text-sm mb-4">${err.message}</p>
          <button class="btn btn-primary" onclick="Router.go('dashboard')">Dashboard ga qaytish</button>
        </div>
      </div>`;
    }
  }
};
