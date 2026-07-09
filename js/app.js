// ==================== APP INITIALIZATION ====================
const App = {
  _user: null,
  _profile: null,

  async init() {
    // Load muassasa overrides before routing so all dropdowns have correct data
    try {
      const overrides = await MuassasaDB.getOverrides();
      if (overrides.length) MuassasaDB.applyToConfig(overrides);
    } catch(e) { /* muassasa_overrides table may not exist yet */ }

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
        Profile.getCurrent().then(p => { App._profile = p; }).catch(()=>{});
        Router.go('dashboard');
      } else {
        Router.go('login');
      }
    } catch (err) {
      console.error('App init error:', err);
      Router.go('login');
    }

    // Auth state listener
    Auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        App._user = session.user;
        Profile.getCurrent().then(p => { App._profile = p; }).catch(()=>{});
        if (Router._current === 'login') Router.go('dashboard');
      } else if (event === 'SIGNED_OUT') {
        App._user = null;
        Router.go('login');
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

// Start app
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
  App.init();
});
