// ==================== APP INITIALIZATION ====================
const App = {
  _user: null,
  _profile: null,

  async init() {
    // Start overrides immediately, but do not serialize auth/profile behind it.
    // Authenticated routes still wait for the same data before rendering.
    const overridesReady = MuassasaDB.getOverrides()
      .then(overrides => {
        if (overrides.length) MuassasaDB.applyToConfig(overrides);
      })
      .catch(() => { /* muassasa_overrides table may not exist yet */ });

    // LocalStorage dan aholi sonini yuklash (admin panelida o'zgartirilgan bo'lsa)
    try {
      const saved18 = localStorage.getItem('aholi_18plus');
      if (saved18) APP_CONFIG.AHOLI_18PLUS = Object.assign({}, APP_CONFIG.AHOLI_18PLUS, JSON.parse(saved18));
      const saved30 = localStorage.getItem('aholi_30plus');
      if (saved30) APP_CONFIG.AHOLI_30PLUS = Object.assign({}, APP_CONFIG.AHOLI_30PLUS, JSON.parse(saved30));
    } catch(e) { /* ignore */ }

    try {
      const session = await Auth.getSession();
      if (session) {
        App._user = session.user;
        // Dashboard code/charts download while profile and overrides are resolving.
        const dashboardReady = PageLoader.load('dashboard').then(() => null).catch(err => err);
        const profile = await Profile.getCurrent();
        if (!profile || profile.role === 'pending') {
          await Auth.signOut();
          App._user = null;
          App._profile = null;
          Router.go('login');
          showToast('Akkaunt administrator tasdig\'ini kutmoqda', 'warning', 7000);
        } else {
          App._profile = profile;
          const [, dashboardError] = await Promise.all([overridesReady, dashboardReady]);
          if (dashboardError) throw dashboardError;
          Router.go('dashboard');
        }
      } else {
        Router.go('login');
      }
    } catch (err) {
      console.error('App init error:', err);
      Router.go('login');
    }

    // Auth state listener
    Auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        App._user = session.user;
        const dashboardReady = PageLoader.load('dashboard').then(() => null).catch(err => err);
        const profile = await Profile.getCurrent().catch(() => null);
        if (!profile || profile.role === 'pending') {
          await Auth.signOut().catch(() => {});
          App._user = null;
          App._profile = null;
          if (Router._current !== 'login') Router.go('login');
          showToast('Akkaunt administrator tasdig\'ini kutmoqda', 'warning', 7000);
          return;
        }
        App._profile = profile;
        if (Router._current === 'login') {
          const dashboardError = await dashboardReady;
          if (dashboardError) throw dashboardError;
          Router.go('dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        App._user = null;
        if (Router._current !== 'login') {
          showToast('Sessiya tugadi — qayta kiring', 'warning', 5000);
          Router.go('login');
        }
      }
    });
  },

  async logout() {
    if (!confirm('Tizimdan chiqmoqchimisiz?')) return;
    try {
      await UserLog.write('logout');
      await Auth.signOut();
      showToast('Tizimdan chiqdingiz', 'info');
      Router.go('login');
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  },


};

// Start app. Bootstrap may finish before or after DOMContentLoaded.
const startApp = () => {
  Router.init();
  App.init();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp, { once: true });
else startApp();
