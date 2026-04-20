// ==================== APP INITIALIZATION ====================
const App = {
  _user: null,

  async init() {
    try {
      const session = await Auth.getSession();
      if (session) {
        App._user = session.user;
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
      await Auth.signOut();
      showToast('Tizimdan chiqdingiz', 'info');
      Router.go('login');
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  },

  switchTab(idx) {
    // Generic tab switcher called from Components.renderTabs
    document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
    document.querySelectorAll('.tab-content').forEach((c,i)=>c.classList.toggle('active',i===idx));
  }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
