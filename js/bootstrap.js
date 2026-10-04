(async function bootstrap() {
  const LOCALE_SCRIPTS = [
    'js/medical-glossary.js?v=1',
    'js/locales.js?v=20260926-i18n-r72',
    'js/calculator-locales.js?v=2',
    'js/form-locales.js?v=20260927-perf-r2',
    'js/cdss-locales.js?v=20261004-gcs9',
    'js/i18n.js?v=20260927-perf-r1'
  ];
  // Preserve the proven core execution order. Page modules are loaded by Router.
  const CORE_SCRIPTS = [
    'js/config.js?v=81',
    'js/supabase.js?v=20261004-gcs9',
    'js/utils.js?v=84',
    'js/components.js?v=81',
    'js/router.js?v=20261004-gcs9',
    'js/pages/login.js?v=20260926-i18n-r72',
    'js/app.js?v=71'
  ];
  try {
    // Core files start downloading now; they execute only after I18n.init().
    CORE_SCRIPTS.forEach(AssetLoader.preload);

    // Vendor libraries and localization download in parallel.
    await Promise.all([
      AssetLoader.scriptFallback([
        'https://cdn.jsdelivr.net/npm/lucide@1.48.0/dist/umd/lucide.min.js',
        'https://unpkg.com/lucide@1.48.0/dist/umd/lucide.min.js'
      ], 'lucide'),
      AssetLoader.scriptFallback([
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
        'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
      ], 'supabase'),
      AssetLoader.scriptsInOrder(LOCALE_SCRIPTS)
    ]);
    // Load presentation-only localization before any UI module is evaluated.
    I18n.init();

    await AssetLoader.scriptsInOrder(CORE_SCRIPTS);
  } catch (err) {
    console.error('Bootstrap error:', err);
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;color:#b91c1c"><div><h2 style="font-weight:800;margin-bottom:8px">Tizimni yuklab bo'lmadi</h2><p>${String(err.message || err)}</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer">Qayta urinish</button></div></div>`;
  }
})();
