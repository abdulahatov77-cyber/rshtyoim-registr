// ==================== ROUTER ====================
const Router = {
  _current: null,
  _params: {},

  routes: {
    'login':         () => LoginPage.render(),
    'dashboard':     () => DashboardPage.render(),
    'infarkt-yangi': () => InfarktYangiPage.render(),
    'insult-yangi':  () => InsultYangiPage.render(),
    'bemor-karta':   () => BemorKartaPage.render(Router._params),
    'bemorlar':      () => BemorlarPage.render(),
    'hisobot':       () => HisobotPage.render(),
    'admin':         () => AdminPage.render(),
  },

  async go(route, params = {}) {
    // Cleanup previous page
    if (Router._current && Router._current !== route) {
      Realtime.unsubscribeAll();
    }

    Router._current = route;
    Router._params = params;

    const app = document.getElementById('app');
    app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a">
      <div style="text-align:center">
        <div style="width:36px;height:36px;border:3px solid #1e293b;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px"></div>
        <p style="color:#64748b;font-size:13px">Yuklanmoqda...</p>
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
      app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a">
        <div style="text-align:center;padding:32px">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <h2 style="font-size:18px;font-weight:700;color:#f87171;margin-bottom:8px">Sahifani yuklashda xato</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px">${err.message}</p>
          <button class="btn btn-primary" onclick="Router.go('dashboard')">Dashboard ga qaytish</button>
        </div>
      </div>`;
    }
  }
};
