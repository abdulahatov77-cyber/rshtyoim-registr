// Runtime asset loader. Core scripts keep their original execution order while
// page-only code and heavy export/chart libraries are loaded on demand.
const AssetLoader = (() => {
  const pending = new Map();

  // ordered: download in parallel with siblings but execute in insertion order.
  function script(src, globalName, { ordered = false } = {}) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    if (pending.has(src)) return pending.get(src);
    const promise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = !ordered;
      el.onload = () => {
        if (globalName && !window[globalName]) {
          reject(new Error(`${src} yuklandi, ammo ${globalName} topilmadi`));
          return;
        }
        resolve(globalName ? window[globalName] : true);
      };
      el.onerror = () => reject(new Error(`${src} yuklanmadi`));
      document.head.appendChild(el);
    });
    pending.set(src, promise);
    return promise;
  }

  async function scriptFallback(urls, globalName) {
    if (globalName && window[globalName]) return window[globalName];
    let lastError;
    for (const url of urls) {
      try { return await script(url, globalName); }
      catch (err) { lastError = err; }
    }
    throw lastError || new Error(`${globalName || 'Kutubxona'} yuklanmadi`);
  }

  function preload(src) {
    const el = document.createElement('link');
    el.rel = 'preload';
    el.as = 'script';
    el.href = src;
    document.head.appendChild(el);
  }

  // Parallel download, sequential execution, resolves after the last one ran.
  function scriptsInOrder(srcs) {
    return Promise.all(srcs.map(src => script(src, null, { ordered: true })));
  }

  return {
    script,
    preload,
    scriptsInOrder,
    scriptFallback,
    xlsx() {
      return scriptFallback([
        'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
        'https://unpkg.com/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'
      ], 'XLSX');
    },
    charts() {
      return scriptFallback([
        'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
        'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js'
      ], 'Chart').then(() => scriptFallback([
        'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
        'https://unpkg.com/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js'
      ], 'ChartDataLabels')).then(result => {
        if (window.I18n) I18n.installChartAdapter();
        return result;
      });
    }
  };
})();

window.AssetLoader = AssetLoader;
