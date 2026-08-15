(async function bootstrap() {
  try {
    // Independent vendor libraries download in parallel.
    await Promise.all([
      AssetLoader.scriptFallback([
        'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
        'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js'
      ], 'lucide'),
      AssetLoader.scriptFallback([
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
        'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
      ], 'supabase')
    ]);

    // Preserve the proven core execution order. Page modules are loaded by Router.
    for (const src of [
      'js/config.js?v=81',
      'js/supabase.js?v=165',
      'js/utils.js?v=83',
      'js/components.js?v=79',
      'js/router.js?v=75',
      'js/pages/login.js?v=67',
      'js/app.js?v=70'
    ]) await AssetLoader.script(src);
  } catch (err) {
    console.error('Bootstrap error:', err);
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;color:#b91c1c"><div><h2 style="font-weight:800;margin-bottom:8px">Tizimni yuklab bo'lmadi</h2><p>${String(err.message || err)}</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer">Qayta urinish</button></div></div>`;
  }
})();
