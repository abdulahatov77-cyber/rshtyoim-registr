// Scenario-based presentation audit. Read-only: no patient or database writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalogContext = { window: {} };
vm.createContext(catalogContext);
for (const file of ['locales.js', 'calculator-locales.js', 'form-locales.js', 'cdss-locales.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), catalogContext);
}
const catalog = catalogContext.window.I18N_CATALOG;
const normalize = value => String(value).replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [normalize(value), key]));
const source = fs.readFileSync(path.join(root, 'js/cdss.js'), 'utf8');
const cases = [
  ['stroke-incomplete-clinical-step', 'insult', { nihss: 0, boshlanish_daqiqa: 120 }],
  ['stroke-basic', 'insult', { insult_turi: 'Ishemik insult', gcs: 15, nihss: 1, aspects: 10, boshlanish_daqiqa: 360, mskt: "Yo'q", vazn: 70 }],
  ['stroke-thrombolysis', 'insult', { insult_turi: 'Ishemik insult', gcs: 15, nihss: 8, aspects: 9, boshlanish_daqiqa: 120, mskt: "Ha – o'tkazildi", glukoza: 6, vazn: 70, kta: true, lvo: true }],
  ['stroke-late-thrombectomy', 'insult', { insult_turi: 'Ishemik insult', gcs: 12, nihss: 16, aspects: 7, boshlanish_daqiqa: 800, mskt: "Ha – o'tkazildi", glukoza: 6, vazn: 80, kta: true, lvo: true }],
  ['stroke-hemorrhagic', 'insult', { insult_turi: 'Gemorragik insult', gcs: 7, nihss: 20, aspects: 5, boshlanish_daqiqa: 90, mskt: "Ha – o'tkazildi", glukoza: 9, sbp: 190 }],
  ['stroke-tia', 'insult', { insult_turi: 'TIA', gcs: 15, nihss: 0, boshlanish_daqiqa: 80, mskt: "Ha – o'tkazildi", glukoza: 5 }],
  ['infarct-stemi', 'infarkt', { infarkt_turi: 'STEMI', boshlanish_daqiqa: 120, killip: 2, grace: 145, sbp: 110, pci_imkoniyat_daqiqa: 60, vazn: 75 }],
  ['infarct-thrombolysis', 'infarkt', { infarkt_turi: 'STEMI', boshlanish_daqiqa: 120, killip: 1, grace: 95, sbp: 110, pci_imkoniyat_daqiqa: 180, vazn: 75 }],
  ['infarct-nstemi', 'infarkt', { infarkt_turi: 'NSTEMI', boshlanish_daqiqa: 800, killip: 3, grace: 155, sbp: 85, troponin_musbat: true }]
];
const visibleStrings = result => [
  ...result.ballar.flatMap(ball => [ball.nom, ball.qiymat, ball.izoh]),
  ...result.xulosa,
  ...result.tavsiya.map(item => item.matn),
  ...result.ogohlantirish,
  ...result.parvarish,
  ...result.profilaktika,
  ...Object.values(result.tosiq).flat(),
  ...result.muddat.map(item => item.nom),
  result.marshrut?.matn,
  result.doza?.alteplaza?.izoh,
  result.doza?.tenekteplaza?.izoh
].filter(Boolean);
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const missing = new Map();
for (const lang of ['ru', 'en', 'kk']) {
  const i18n = {
    language: lang,
    t: (key, params = {}) => catalog[lang][key]?.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? ''),
    translateText: value => {
      const key = sourceIndex.get(normalize(value));
      return key ? catalog[lang][key] : value;
    }
  };
  const runtime = { window: { I18n: i18n } };
  vm.createContext(runtime);
  vm.runInContext(source, runtime);
  for (const [name, type, data] of cases) {
    const result = runtime.window.CDSS[type](data);
    const html = runtime.window.CDSSUI.baholashHTML(result);
    for (const raw of visibleStrings(result)) {
      if (['GCS', 'NIHSS', 'ASPECTS', 'MSKT', 'Killip', 'GRACE', 'Door-to-EKG'].includes(raw)) continue;
      if (lang === 'kk' && /^\d+(?:[.,]\d+)? ball$/.test(raw)) continue; // "ball" is the same term in KK
      const key = sourceIndex.get(normalize(raw));
      if (key && catalog[lang][key] === raw) continue; // valid shared term
      if (html.includes(escape(raw))) {
        const entry = missing.get(raw) || { source: raw, scenarios: new Set(), languages: new Set() };
        entry.scenarios.add(name); entry.languages.add(lang); missing.set(raw, entry);
      }
    }
  }
}
const findings = [...missing.values()].map(item => ({ source: item.source, scenarios: [...item.scenarios], languages: [...item.languages] }));
console.log(JSON.stringify({ scenarios: cases.length, untranslated: findings.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
