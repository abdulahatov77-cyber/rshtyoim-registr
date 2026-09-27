const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/medical-glossary.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/locales.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/calculator-locales.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/form-locales.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/cdss-locales.js'), 'utf8'), context);

const catalog = context.window.I18N_CATALOG;
const glossary = context.window.MEDICAL_GLOSSARY;

test('language switch saves a wizard draft before rerendering the same step', () => {
  for (const [route, pageName] of [['insult-yangi', 'InsultYangiPage'], ['infarkt-yangi', 'InfarktYangiPage']]) {
    const actions = [];
    const runtime = {
      window: { I18N_CATALOG: catalog, dispatchEvent() {} },
      document: { documentElement: { dataset: {} }, getElementById: id => id === 'step-body' ? {} : null },
      localStorage: { getItem: () => null, setItem() {} }, CustomEvent: function () {}
    };
    runtime[pageName] = {
      saveCurrentStep: () => actions.push('save'),
      render: options => actions.push(`render:${options.preserveDraft}`)
    };
    vm.createContext(runtime);
    vm.runInContext(`const Router = { _current: '${route}', _params: {}, routes: { '${route}'() {} }, go() { throw Error('draft routed as a new form'); } };`, runtime);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), runtime);
    runtime.window.I18n.setLanguage('ru');
    assert.deepEqual(actions, ['save', 'render:true']);
  }
});

test('both wizard renderers preserve record number, step and calculator state during language switch', async () => {
  for (const [file, name, wrap] of [['insult-yangi', 'InsultYangiPage', 'insult-form-wrap'], ['infarkt-yangi', 'InfarktYangiPage', 'infarkt-form-wrap']]) {
    const elements = { app: { innerHTML: '' }, [wrap]: {} };
    let generated = 0;
    const runtime = {
      Auth: { getUser: async () => ({}) }, Profile: { getCurrent: async () => ({ role: 'super_admin' }) },
      Utils: { generateKtNo: () => `NEW-${++generated}`, formatDateInput: () => '2026-09-24T10:00' },
      Components: { renderLayout: () => '<main></main>', startClock() {} },
      document: { getElementById: id => elements[id] }, t: () => '', Router: { go() {} }
    };
    vm.createContext(runtime);
    vm.runInContext(fs.readFileSync(path.join(root, `js/pages/${file}.js`), 'utf8') + `\nthis.page = ${name};`, runtime);
    const page = runtime.page;
    page._step = 3;
    const draft = page._data = { kt_no: 'ORIGINAL-001', fio: 'Synthetic Test', aha_bali: 4, nihss_qabul: 7, gcs_bali: 13, aspects_c: true, muolaja_turi: 'TEST' };
    page._manba = null;
    page._qabulManbasi = async () => { throw Error('referral reloaded during language switch'); };
    page.renderStep = () => { assert.equal(page._step, 3); assert.strictEqual(page._data, draft); };
    await page.render({ preserveDraft: true });
    assert.strictEqual(page._data, draft);
    assert.equal(page._data.kt_no, 'ORIGINAL-001');
    assert.equal(page._data.aha_bali, 4);
    assert.equal(page._data.aspects_c, true);
    assert.equal(generated, 0);
  }
});

test('language switch rerenders a lexical Router instead of retaining old translated markup', () => {
  const runtime = { window: { dispatchEvent() {} }, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: { dataset: {} } }, CustomEvent: function () {} };
  vm.createContext(runtime);
  vm.runInContext("const Router = { _current: 'dashboard', _params: {}, routes: { dashboard() {} }, go(route) { this.lastRoute = route; } };", runtime);
  runtime.window.I18N_CATALOG = catalog;
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), runtime);
  runtime.window.I18n.setLanguage('ru');
  assert.equal(vm.runInContext('Router.lastRoute', runtime), 'dashboard');
  assert.equal(runtime.window.I18n.language, 'ru');
});

test('dashboard recent rows render localized copy without shadowing the translator', () => {
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    const runtime = {
      t: (key, params) => catalog[lang][key].replace(/\{(\w+)\}/g, (_, key) => params?.[key] ?? ''),
      I18n: { translateText: text => text }, esc: text => String(text), icon: () => '',
      Utils: { calculateAge: () => 50, formatDate: () => '', formatDateTime: () => '', statusBadge: () => '' }
    };
    vm.createContext(runtime);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/pages/dashboard.js'), 'utf8') + '\nthis.page = DashboardPage;', runtime);
    const html = runtime.page._renderRecentRows([{ kt_no: 'TEST', infarkt_turi: 'NSTEMI', _type: 'infarkt' }]);
    assert.ok(html.includes(catalog[lang]['infarct.nstemi']));
    assert.ok(html.includes(runtime.t('dashboard.ageYears', { age: 50 })));
  }
});

test('dashboard risk-factor donut translates only displayed labels and preserves counts', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/dashboard.js'), 'utf8');
  const factors = ['Arterial gipertenziya', 'Qandli diabet', 'Chekish', 'Dislipidemiya',
    'Semizlik (BMI ≥30)', 'Oilaviy YIK', "Oldin o'tkazilgan MI", 'COVID-19', 'Spirtli ichimlik'];
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    let chartConfig;
    function Chart(_ctx, config) { chartConfig = config; }
    Chart.getChart = () => null;
    const runtime = {
      Chart,
      document: { getElementById: () => ({ getContext: () => ({}) }) },
      t: key => catalog[lang][key],
      I18n: { translateText: label => {
        const key = Object.keys(catalog.uz).find(key => catalog.uz[key] === label);
        return key ? catalog[lang][key] : label;
      } }
    };
    vm.createContext(runtime);
    vm.runInContext(source + '\nthis.page = DashboardPage;', runtime);
    const data = factors.map((label, index) => [label, index + 1]);
    runtime.page._drawDonut('riskInfarktChart', 'riskInfarktLegend', data, '#ef4444', 100);
    assert.equal(chartConfig.data.labels[0], catalog[lang]['risk.hypertension']);
    assert.equal(chartConfig.data.labels[1], catalog[lang]['risk.diabetes']);
    assert.equal(chartConfig.data.labels[8], catalog[lang]['risk.other']);
    assert.equal(chartConfig.data.datasets[0].data.reduce((sum, value) => sum + value, 0), 45);
    assert.equal(data[0][0], 'Arterial gipertenziya');
    assert.equal(data[0][1], 1);
  }
});

test('new-patient field labels have exact translations in every locale', () => {
  const normalize = value => value.replace(/\\'/g, "'").replace(/[‘’ʻʼ`]/g, "'").trim();
  const known = new Set(Object.values(catalog.uz).map(normalize));
  for (const file of ['insult-yangi', 'infarkt-yangi']) {
    const source = fs.readFileSync(path.join(root, `js/pages/${file}.js`), 'utf8');
    for (const match of source.matchAll(/this\.field\('[^']+','((?:\\.|[^'\\])*)'/g)) {
      assert.ok(known.has(normalize(match[1])), `${file}: ${match[1]}`);
    }
  }
});

test('symptom-hour display is localized without changing persisted values', () => {
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    for (const [file, name, over] of [['insult-yangi', 'InsultYangiPage', '24 soatdan ortiq'], ['infarkt-yangi', 'InfarktYangiPage', "24 soatdan ko'p"]]) {
      const elements = { simptom_vaqt_label: {}, simptom_vaqt: {} };
      const runtime = { document: { getElementById: id => elements[id] }, t: (key, params) => catalog[lang][key].replace(/\{(\w+)\}/g, (_, key) => params?.[key] ?? '') };
      vm.createContext(runtime);
      vm.runInContext(fs.readFileSync(path.join(root, `js/pages/${file}.js`), 'utf8') + `\nthis.page = ${name};`, runtime);
      runtime.page._data = {};
      runtime.page.cdssYangilash = () => {};
      runtime.page.onSimptomSoat('6');
      assert.equal(elements.simptom_vaqt.value, '6 soat');
      assert.equal(elements.simptom_vaqt_label.textContent, runtime.t('form.hoursCount', { count: 6 }));
      runtime.page.onSimptomSoat('25');
      assert.equal(elements.simptom_vaqt.value, over);
      assert.equal(elements.simptom_vaqt_label.textContent, catalog[lang]['form.over24Hours']);
      runtime.page.onSimptomSoat('0');
      assert.equal(elements.simptom_vaqt.value, '');
      assert.equal(elements.simptom_vaqt_label.textContent, catalog[lang]['form.invalidZeroHours']);
    }
  }
});

test('clinical option labels translate while persisted enum values remain Uzbek', () => {
  for (const lang of ['ru', 'en', 'kk']) {
    for (const [file, name] of [['insult-yangi', 'InsultYangiPage'], ['infarkt-yangi', 'InfarktYangiPage']]) {
      const runtime = {
        icon: () => '',
        t: key => catalog[lang][key],
        I18n: { translateText: source => {
          const key = Object.keys(catalog.uz).find(k => catalog.uz[k] === source);
          return key ? catalog[lang][key] : source;
        } }
      };
      vm.createContext(runtime);
      vm.runInContext(fs.readFileSync(path.join(root, `js/pages/${file}.js`), 'utf8') + `\nthis.page = ${name};`, runtime);
      const options = runtime.page.selectOptions(["O'z murojaati bilan"], "O'z murojaati bilan");
      assert.ok(options.includes('value="O\'z murojaati bilan" selected'));
      assert.ok(options.includes(catalog[lang]['option.selfReferral']));
      const checkbox = runtime.page.checkboxGroup('xavf_omillari', ['Arterial gipertenziya'], ['Arterial gipertenziya']);
      assert.ok(checkbox.includes('value="Arterial gipertenziya"'));
      assert.ok(checkbox.includes(catalog[lang]['risk.hypertension']));
    }
  }
});

test('every AHA question and answer has four-language display copy without changing score values', () => {
  const source = fs.readFileSync(path.join(root, 'js/calculators.js'), 'utf8');
  const aha = source.split('openAHA(targetInputId) {')[1].split('// ==================== GRACE SCORE')[0];
  const normalize = value => value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
  const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [normalize(value), key]));
  const strings = [
    ...[...aha.matchAll(/title: "([^"]+)"/g)].map(match => match[1]),
    ...[...aha.matchAll(/text:"([^"]+)"/g)].map(match => match[1])
  ];
  assert.equal(strings.filter(value => /^\d+\./.test(value)).length, 10);
  for (const value of strings) {
    const key = sourceIndex.get(normalize(value));
    assert.ok(key, `AHA translation missing: ${value}`);
    for (const lang of ['ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.match(aha, /value="\$\{opt\.val\}"/);
});

test('AHA risk band labels localize without changing score thresholds', () => {
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    let score = 0;
    const totalEl = {};
    const runtime = {
      t: key => catalog[lang][key],
      document: {
        querySelectorAll: () => [{ value: String(score) }],
        getElementById: () => totalEl
      }
    };
    vm.createContext(runtime);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/calculators.js'), 'utf8') + '\nthis.calc = Calculators;', runtime);
    for (const [value, band] of [[6, 'low'], [7, 'medium'], [13, 'medium'], [14, 'high']]) {
      score = value;
      runtime.calc.updateTotal('aha-radio');
      assert.ok(totalEl.innerHTML.includes(`${value} (${catalog[lang][`risk.${band}`]})`));
    }
  }
});

test('GCS, NIHSS and ASPECTS recommendation variants have localized display copy', () => {
  for (const lang of ['ru', 'en', 'kk']) {
    const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [value.replace(/[‘’ʻʼ`]/g, "'"), key]));
    const i18n = {
      translateText: value => {
        const key = sourceIndex.get(String(value).replace(/[‘’ʻʼ`]/g, "'"));
        return key ? catalog[lang][key] : value;
      },
      t: (key, params = {}) => catalog[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
    };
    const runtime = { I18n: i18n, t: i18n.t };
    vm.createContext(runtime);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/calculators.js'), 'utf8') + '\nthis.calc = Calculators;', runtime);
    const c = runtime.calc;
    const cases = [
      ...[3, 10, 15].map(score => [c.gcsTavsiya(score), score, 'Glazgo (GCS)']),
      ...[0, 2, 10, 18, 25].flatMap(score => ['Ishemik insult', 'Gemorragik insult'].map(type => [c.nihssTavsiya(score, type), score, 'NIHSS'])),
      [c.taktikaTavsiya(4, '', 'Ishemik insult', 'Ha'), '', 'Davolash taktikasi'],
      ...['M1', 'M3', ''].map(segment => [c.taktikaTavsiya(8, segment, 'Ishemik insult', 'Ha'), '', 'Davolash taktikasi'])
    ];
    for (const [recommendation, score, title] of cases) {
      const html = c.tavsiyaHtml(recommendation, score, title);
      assert.ok(html && !html.includes(recommendation.matn), `${lang}: untranslated recommendation ${recommendation.matn}`);
      assert.ok(!html.includes('Davolash taktikasi'), `${lang}: untranslated recommendation heading`);
    }
  }
});

test('stroke and infarction treatment choices have translated labels with unchanged stored values', () => {
  const configRuntime = {};
  vm.createContext(configRuntime);
  const config = vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8') + '\nAPP_CONFIG', configRuntime);
  const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [String(value).replace(/[‘’ʻʼ`]/g, "'"), key]));
  for (const source of [...config.INSULT_MUOLAJALARI, ...config.INFARKT_MUOLAJALARI]) {
    const key = sourceIndex.get(source.replace(/[‘’ʻʼ`]/g, "'"));
    assert.ok(key, `missing treatment label: ${source}`);
    assert.equal(catalog.uz[key], source, 'persisted enum remains Uzbek');
    for (const lang of ['ru', 'en', 'kk']) {
      assert.ok(catalog[lang][key], `${lang}: ${source}`);
      if (catalog[lang][key] === source) assert.ok(lang === 'kk' && /^(KAG|TLT)/.test(source), `${lang}: ${source}`);
    }
  }
});

test('infarction diagnosis, Killip, ECG and angiography options have four-language display entries', () => {
  const configRuntime = {};
  vm.createContext(configRuntime);
  const config = vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8') + '\nAPP_CONFIG', configRuntime);
  const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [String(value).replace(/[‘’ʻʼ`]/g, "'"), key]));
  for (const group of ['INFARKT_TURLARI', 'KILLIP_KLASSLAR', 'EKG_NATIJALARI', 'ANGIO_NATIJALARI']) {
    for (const source of config[group]) {
      const key = sourceIndex.get(source.replace(/[‘’ʻʼ`]/g, "'"));
      assert.ok(key, `${group}: ${source}`);
      for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${group}: ${source}`);
    }
  }
});

test('stroke CT helper and extended-report controls have translated display copy', () => {
  for (const key of ['treatment.doorToCtHelp', 'report.dateFrom', 'report.dateTo', 'report.therapeuticWindow', 'report.infarctionType', 'report.cascade']) {
    assert.ok(catalog.uz[key], `missing Uzbek source for ${key}`);
    for (const lang of ['ru', 'en', 'kk']) {
      assert.ok(catalog[lang][key], `${lang}: ${key}`);
      if (key !== 'report.cascade' || lang !== 'kk') {
        assert.notEqual(catalog[lang][key], catalog.uz[key], `${lang}: untranslated ${key}`);
      }
    }
  }
});

test('patient list and card navigation use four-language display keys', () => {
  const listSource = fs.readFileSync(path.join(root, 'js/pages/bemorlar.js'), 'utf8');
  const cardSource = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  const privacySource = fs.readFileSync(path.join(root, 'js/pd-mask.js'), 'utf8');
  for (const key of ['patients.registryType', 'patients.searchLabel', 'patients.fillTime', 'patients.showName', 'patients.hideName', 'patients.autoHide', 'patients.protectedData', 'card.previous', 'card.next', 'card.dischargeAction', 'card.tabOverview', 'card.tabTreatment', 'card.tabCondition', 'card.tabMedia', 'card.tabHandover', 'card.tabDischarge', 'card.tabFollowup', 'card.tabMovement']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  for (const key of ['patients.registryType', 'patients.searchLabel', 'patients.fillTime']) assert.ok(listSource.includes(`t('${key}')`), key);
  for (const key of ['patients.showName', 'patients.hideName']) assert.ok(privacySource.includes(`t('${key}')`), key);
  assert.ok(cardSource.includes("t('card.previous')"));
  assert.ok(cardSource.includes('card.tabOverview'));
});

test('patient-card treatment tab translates headings and display labels without changing stored options', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.addTreatment', 'card.treatmentHistory', 'treatment.transferAngioStroke']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes("t('card.addTreatment')"));
  assert.ok(source.includes("t('card.treatmentHistory')"));
  assert.ok(source.includes('value="${item}"'));
  assert.ok(source.includes('I18n.translateText(item)'));
});

test('patient-card overview translates visible labels without translating patient values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.overviewClinical', 'card.overviewTimes', 'card.overviewBodyWeight',
    'card.overviewHeight', 'card.overviewCitizenship', 'card.overviewAddress', 'card.overviewMsct',
    'card.overviewPrimaryTreatment', 'card.overviewDiseaseType', 'card.overviewSymptomOnset',
    'card.overviewArrival', 'card.overviewAmbulanceArrival', 'card.overviewCtPerformed']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes('I18n.translateText(label)'));
  assert.ok(source.includes('>${val||\'—\'}</span>'));
  assert.ok(source.includes("t('card.overviewClinical')"));
  assert.ok(source.includes("t('card.overviewTimes')"));
});

test('patient-card handover localizes display copy while preserving assessment values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.handoverHeading', 'card.handoverHistory', 'card.handoverAction',
    'card.handoverStable', 'card.handoverImproved', 'card.handoverWorsened', 'card.handoverCritical',
    'card.noHandover']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`'${key}'`), key);
  }
  assert.ok(source.includes('value="${h}"'));
  assert.ok(source.includes('I18n.translateText(r.holat_baholash'));
});

test('patient-card discharge localizes mRS and outcome labels without changing radio values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.dischargeHeading', ...Array.from({ length: 7 }, (_, i) => `card.mrs${i}`),
    'card.outcomeRecovered', 'card.outcomeUnchanged', 'card.outcomeRehabilitation',
    'card.outcomeTransferred', 'card.outcomeDied']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes('name="ch-mrs" value="${item}"'));
  assert.ok(source.includes('name="ch-natija" value="${item}"'));
  assert.ok(source.includes('I18n.translateText(item)'));
  assert.ok(source.includes("t('card.dischargeHeading')"));
});

test('patient-card follow-up localizes entry labels while preserving select values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.noFollowup', 'card.newFollowup', 'card.followupHistory',
    'card.followup30Days', 'card.followup3Months', 'card.followup6Months', 'card.followup1Year',
    'card.followupStable', 'card.followupReadmitted', 'card.followupRecurrence']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes('value="${d}">${I18n.translateText(d)}'));
  assert.ok(source.includes('value="${h}">${I18n.translateText(h)}'));
  assert.ok(source.includes("t('card.newFollowup')"));
  assert.ok(source.includes("t('card.followupHistory')"));
});

test('patient-card treatment history translates display copy without changing stored values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.noProcedures', 'card.admissionTreatment', 'card.followupTreatment']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}')`), key);
  }
  assert.ok(source.includes('esc(I18n.translateText(p.muolaja_turi))'));
  assert.ok(source.includes('esc(I18n.translateText(r.muolaja_turi))'));
  assert.ok(source.includes('BemorKartaPage._dinRecords = records'));
});

test('patient-card condition tab translates display labels but preserves stored condition values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.newMeasurement', 'card.conditionHistory', 'card.conditionGood',
    'card.conditionSatisfactory', 'card.noMeasurements']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes('value="${esc(h)}">${esc(I18n.translateText(h))}'));
  assert.ok(source.includes('esc(I18n.translateText(r.holat))'));
  assert.ok(source.includes("t('card.newMeasurement')"));
  assert.ok(source.includes("t('card.conditionHistory')"));
});

test('patient-card media and discharge conditional copy use display-only localization', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['file.uploadHeading', 'file.uploadAction', 'file.patientFiles', 'file.patientFile',
    'file.dropHint', 'file.empty', 'card.dischargedTitle', 'card.transferredTitle',
    'card.deceasedTitle', 'card.retrospectiveDischarge', 'card.complicationArrhythmia',
    'card.complicationShock', 'card.complicationEdema', 'card.complicationReinfarction',
    'card.complicationThromboembolism', 'card.complicationNone']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes("t('file.patientFiles')"));
  assert.ok(source.includes("t('card.retrospectiveDischarge'"));
  assert.ok(source.includes('value="${item}"'));
  assert.ok(source.includes('value="${esc(m)}"'));
  assert.ok(source.includes('label="${esc(I18n.translateText(vil))}"'));
});

test('synthetic discharge statuses and retrospective complication choices render in each non-Uzbek locale', () => {
  const bySource = new Map(Object.entries(catalog.uz).map(([key, value]) => [value, key]));
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
  for (const lang of ['ru', 'en', 'kk']) {
    const runtime = {
      t: (key, params) => String(catalog[lang][key] || '').replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? ''),
      I18n: { translateText: value => catalog[lang][bySource.get(value)] || value, facilityName: value => value },
      esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      icon: () => '', initIcons: () => {}, document: { querySelectorAll: () => [] }
    };
    vm.createContext(runtime);
    vm.runInContext(config + '\n' + source + '\nthis.card = BemorKartaPage;', runtime);
    for (const [status, titleKey] of [['chiqarildi', 'card.dischargedTitle'], ['otkazildi', 'card.transferredTitle'], ['vafot', 'card.deceasedTitle']]) {
      const el = { innerHTML: '' };
      runtime.card.renderChiqarish(el, { status, _chiqarish: { chiqish_sana: '2026-09-25' } }, 'insult');
      assert.ok(el.innerHTML.includes(catalog[lang][titleKey]), `${lang}: ${status}`);
    }
    const retro = { innerHTML: '' };
    runtime.card.renderChiqarish(retro, { status: 'vafot' }, 'infarkt');
    assert.ok(retro.innerHTML.includes(catalog[lang]['card.saveDischarge']));
    assert.ok(retro.innerHTML.includes(catalog[lang]['card.transferredTo']));
    assert.ok(retro.innerHTML.includes(catalog[lang]['card.rehabCentre']));
    assert.ok(retro.innerHTML.includes(catalog[lang]['card.complicationShock']));
    assert.ok(retro.innerHTML.includes('value="Kardiogen shok"'));
  }
});

test('populated condition and follow-up histories translate stored enums only for display', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const expression of [
    'I18n.translateText(r.holat)', 'I18n.translateText(r.kuzatuv_davri)',
    'I18n.translateText(r.holati)', 'I18n.translateText(r.nogironlik_guruhi)',
    "t('card.recurrence')", "t('card.disability')", "t('card.dateTime')",
    "t('card.doctorName')", 'esc(r.izoh)'
  ]) assert.ok(source.includes(expression), expression);
  for (const lang of ['ru', 'en', 'kk']) {
    for (const key of ['card.followup30Days', 'card.followupStable', 'card.recurrence',
      'card.disability', 'card.conditionGood', 'disability.group1']) {
      assert.ok(catalog[lang][key], `${lang}: ${key}`);
    }
  }
});

test('dashboard translates every full region name for display while retaining filter identifiers', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/dashboard.js'), 'utf8');
  const configSource = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
  const runtime = {};
  vm.createContext(runtime);
  vm.runInContext(configSource + '\nthis.regions = APP_CONFIG.VILOYATLAR;', runtime);
  const regions = Array.from(runtime.regions);
  assert.equal(regions.length, 14);
  const i18nRuntime = { window: { I18N_CATALOG: catalog }, localStorage: { getItem: () => null } };
  vm.createContext(i18nRuntime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), i18nRuntime);
  for (const [key, value] of Object.entries(catalog.uz)) {
    const normalized = value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
    if (normalized && !i18nRuntime.window.I18n._sourceIndex.has(normalized)) {
      i18nRuntime.window.I18n._sourceIndex.set(normalized, key);
    }
  }
  for (const language of ['ru', 'en', 'kk']) {
    for (const region of regions) {
      const label = i18nRuntime.window.I18n.translateText(region, language);
      assert.notEqual(label, region, `${language}: ${region}`);
    }
  }
  assert.ok(source.includes('DashboardPage.setViewViloyat(\'${safeV}\')'));
  assert.ok(source.includes('const label = I18n.translateText(v)'));
  assert.ok(source.includes('isSuperAdminView ? I18n.translateText(v.name) : I18n.facilityName(v.name)'));
  assert.ok((source.match(/min-h-\[44px\] sm:min-h-0/g) || []).length >= 3);
});

test('facility names and chart months are translated only for display', () => {
  const runtime = { window: { I18N_CATALOG: catalog }, localStorage: { getItem: () => null } };
  vm.createContext(runtime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8') + '\nthis.config = APP_CONFIG;', runtime);
  const i18n = runtime.window.I18n;
  for (const [key, value] of Object.entries(catalog.uz)) {
    const normalized = value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
    if (normalized && !i18n._sourceIndex.has(normalized)) i18n._sourceIndex.set(normalized, key);
  }
  assert.equal(i18n.facilityFullName('Andijon TTB', 'ru'), 'Андижанское районное медицинское объединение');
  assert.equal(i18n.facilityName('Andijon TTB', 'en'), 'Andijon District Medical Association');
  assert.equal(i18n.facilityName('Custom patient-entered facility TTB', 'ru'), 'Custom patient-entered facility TTB');
  assert.equal(i18n.facilityFullName('Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi', 'ru'), 'Республиканский научный центр экстренной медицинской помощи');
  assert.equal(i18n.facilityFullName('RSHTYOIM Namangan filiali', 'ru'), 'Наманганский филиал Республиканского научного центра экстренной медицинской помощи');
  assert.equal(i18n.facilityFullName('RSHTYOIM Jizzax filiali', 'ru'), 'Джизакский филиал Республиканского научного центра экстренной медицинской помощи');
  assert.equal(i18n.facilityFullName('Paxtakor TTB', 'ru'), 'Пахтакорское районное медицинское объединение');
  assert.equal(i18n.facilityFullName('Arnasoy TTB', 'ru'), 'Арнасайское районное медицинское объединение');
  assert.equal(i18n.facilityFullName('Jizzax ShTB', 'ru'), 'Джизакское городское медицинское объединение');
  assert.equal(i18n.facilityFullName("Jizzax viloyat ko'p tarmoqli tibbiyot markazi", 'ru'), 'Джизакский областной многопрофильный медицинский центр');
  assert.equal(i18n.facilityFullName('Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Jizzax filiali', 'ru'), 'Джизакский филиал Республиканского специализированного научно-практического медицинского центра кардиологии');
  assert.equal(i18n.facilityFullName('Yakkasaroy TTB', 'ru'), 'Яккасарайское районное медицинское объединение');
  assert.equal(i18n.facilityFullName("Qo'qon politravma markazi", 'ru'), 'Кокандский центр политравмы');
  assert.equal(i18n.facilityFullName('Payariq TTB', 'ru'), 'Пайарыкское районное медицинское объединение');
  assert.equal(i18n.facilityFullName('Ishtixon politravma markazi', 'ru'), 'Иштыханский центр политравмы');
  assert.equal(i18n.facilityFullName('1-sonli Shahar Klinik Shifoxonasi', 'ru'), 'Городская клиническая больница № 1');
  assert.equal(i18n.facilityFullName('7-sonli Shahar Klinik Shifoxonasi', 'ru'), 'Городская клиническая больница № 7');
  assert.equal(i18n.facilityFullName('1-sonli Respublika Klinik Shifoxonasi', 'ru'), 'Республиканская клиническая больница № 1');
  assert.equal(i18n.facilityFullName('TDTU 1-sonli klinikasi', 'ru'), 'Клиника № 1 Ташкентского государственного медицинского университета');
  assert.equal(i18n.facilityFullName('Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Jizzax viloyati filiali', 'ru'), 'Джизакский филиал Республиканского специализированного научно-практического медицинского центра кардиологии');
  assert.equal(i18n.facilityFullName('Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Samarqand viloyati filiali', 'ru'), 'Самаркандский филиал Республиканского специализированного научно-практического медицинского центра кардиологии');
  const shortNames = [
    ["Qo'qon politravma markazi", 'Кокандский ЦПТ'],
    ['Pop politravma markazi', 'Папский ЦПТ'],
    ['Paxtakor TTB', 'Пахтакорское РМО'],
    ['Akademik V. Vohidov nomidagi Respublika ixtisoslashtirilgan ilmiy-amaliy xirurgiya markazi', 'РСНПМЦХ им. акад. В. Вахидова'],
    ['Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi', 'РСНПМЦ кардиологии'],
    ['Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Jizzax filiali', 'Джизакский филиал РСНПМЦ кардиологии'],
    ['Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi', 'РНЦЭМП'],
    ['RSHTYOIM Jizzax filiali', 'Джизакский филиал РНЦЭМП'],
    ['1-sonli Respublika Klinik Shifoxonasi', 'РКБ № 1'],
    ['7-sonli Shahar Klinik Shifoxonasi', 'ГКБ № 7'],
    ['Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Namangan viloyati filiali', 'Наманганский филиал РСНПМЦ кардиологии'],
    ['RSHTYOIM Namangan filiali', 'Наманганский филиал РНЦЭМП'],
    ['Namangan ShTB', 'Наманганское ГМО']
  ];
  for (const [stored, expected] of shortNames) assert.equal(i18n.facilityName(stored, 'ru'), expected);
  const screenshotNames = [
    ["Farg'ona viloyat ko'p tarmoqli tibbiyot markazi", 'Ферганский ОММЦ'],
    ["Fargʻona viloyat koʻp tarmoqli tibbiyot markazi", 'Ферганский ОММЦ'],
    ["Jizzax viloyat ko'p tarmoqli tibbiyot markazi", 'Джизакский ОММЦ'],
    ["Farg'ona-1-shahar shifoxonasi", 'Ферганская ГБ № 1'],
    ["Farg'ona jamoat salomatligi tibbiyot instituti (FJSTI) ko'p tarmoqli klinikasi", 'Клиника ФМИОЗ'],
    ['Navoiy shahar markaziy shifoxonasi', 'Навоийская ГЦБ'],
    ['Guliston TTB', 'Гулистанское РМО']
  ];
  for (const [stored, expected] of screenshotNames) assert.equal(i18n.facilityName(stored, 'ru'), expected);
  const mixedCanonical = Object.values(runtime.config.MUASSASALAR).flat().filter(name => /[A-Za-z]/.test(i18n.facilityName(name, 'ru')));
  assert.deepEqual(mixedCanonical, [], `RU canonical facility labels contain Latin: ${mixedCanonical.join(', ')}`);
  for (const language of ['ru', 'en', 'kk']) {
    const untranslated = Object.values(runtime.config.MUASSASALAR).flat().filter(name => i18n.facilityName(name, language) === name);
    assert.deepEqual(untranslated, [], `${language} canonical facilities unchanged: ${untranslated.join(', ')}`);
  }
  const genericFallback = Object.values(runtime.config.MUASSASALAR).flat().filter(name => /^(RSHTYOIM .+ filiali|.+ (?:TTB|ShTB|politravma markazi))$/.test(name) && i18n.facilityName(name, 'ru').includes(' — '));
  assert.deepEqual(genericFallback, [], `RU canonical facility labels lack grammatical form: ${genericFallback.join(', ')}`);
  const adminSource = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  assert.ok(adminSource.includes('I18n.facilityName(m.nomi)'));
  const routeSource = fs.readFileSync(path.join(root, 'js/pages/marshrut.js'), 'utf8');
  assert.ok(routeSource.includes('I18n.facilityName(r.muassasa_dan'));
  assert.ok(routeSource.includes('I18n.facilityName(r.muassasa_ga'));
  assert.equal(i18n.monthLabel('Okt 2025', 'ru'), 'окт. 2025');
  assert.equal(i18n.monthLabel('Oct 2025', 'en'), 'Oct 2025');
});

test('facility table, filters, summary and add-dialog labels use four-language display copy', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/muassasa-imkoniyat.js'), 'utf8');
  for (const key of ['capabilities.levelHeading', 'capabilities.angiography', 'capabilities.summaryBase',
    'capabilities.summaryNoRegistry', 'capabilities.summaryHidden', 'capabilities.summaryUnsaved',
    'capabilities.summaryNoLevel', 'capabilities.unsavedConfirm', 'capabilities.sqlHelp',
    'capabilities.addHelp']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`'${key}'`), key);
  }
  assert.ok(source.includes('I18n.translateText(r.viloyat'));
  assert.ok(source.includes('I18n.translateText(n)'));
  assert.ok(source.includes('value="${esc(v)}">${esc(I18n.translateText(v))}'));
  assert.ok(source.includes("region: I18n.translateText(bor.viloyat || '—')"));
  assert.ok(source.includes('data-field="daraja"'));
  assert.ok(source.includes("r.daraja === k ? 'selected'"));
});

test('facility table renders a bounded English fixture and filters by translated region without changing stored rows', () => {
  const i18nRuntime = { window: { I18N_CATALOG: catalog }, localStorage: { getItem: () => 'en' } };
  vm.createContext(i18nRuntime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), i18nRuntime);
  const i18n = i18nRuntime.window.I18n;
  for (const [key, value] of Object.entries(catalog.uz)) {
    const normalized = String(value).replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
    if (normalized && !i18n._sourceIndex.has(normalized)) i18n._sourceIndex.set(normalized, key);
  }
  const elements = {
    'mi-search': { value: '' }, 'mi-filter': { value: '' }, 'mi-daraja-filter': { value: '' },
    'mi-holat-filter': { value: '' }, 'mi-tbody': { innerHTML: '' }, 'mi-summary': { innerHTML: '' }
  };
  const runtime = {
    document: { getElementById: id => elements[id] }, I18n: i18n,
    t: (key, params) => String(catalog.en[key] || catalog.uz[key] || '').replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? ''),
    esc: value => String(value), icon: () => '', initIcons() {}
  };
  vm.createContext(runtime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/pages/muassasa-imkoniyat.js'), 'utf8') + '\nthis.page = MuassasaImkoniyatPage;', runtime);
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, nomi: `Fixture ${i + 1}`, viloyat: i < 12 ? 'Andijon viloyati' : 'Buxoro viloyati', daraja: 'ttb', mskt_bor: i < 8, angiografiya_bor: false, registrga_kiritadi: true }));
  runtime.page.rows = rows;
  runtime.page.draw();
  assert.equal((elements['mi-tbody'].innerHTML.match(/<tr /g) || []).length, 30);
  assert.ok(elements['mi-tbody'].innerHTML.includes('Andijan Region'));
  elements['mi-search'].value = 'andijan';
  assert.equal(runtime.page.filtered().length, 12);
  elements['mi-filter'].value = 'mskt';
  assert.equal(runtime.page.filtered().length, 8);
  assert.equal(rows[0].viloyat, 'Andijon viloyati');
  assert.equal(rows[0].nomi, 'Fixture 1');
});

test('patient-list age and sex display is translated without changing stored sex values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemorlar.js'), 'utf8');
  assert.ok(source.includes("t('dashboard.ageYears', { age })"));
  assert.ok(source.includes("I18n.translateText(p.jins || p.jinsi || '—')"));
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    assert.ok(catalog[lang]['dashboard.ageYears'].includes('{age}'));
    assert.ok(catalog[lang]['common.male']);
    assert.ok(catalog[lang]['common.female']);
  }
});

test('patient-card banner localizes age, region and admission labels without changing patient values', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.admittedLabel', 'card.ageUnknown', 'card.regionUnknown']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}')`));
  }
  assert.ok(source.includes("t('dashboard.ageYears', { age })"));
  assert.ok(source.includes('I18n.translateText(p.viloyat)'));
});

test('patient-card NSTEMI PCI window uses translated display messages without changing time thresholds', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.pciWindowTitle', 'card.highRisk', 'card.mediumRisk', 'card.pciRequiredWindow',
    'card.pciDeadline', 'card.pciHours', 'card.pciOnTime', 'card.pciLate', 'card.pciOverdue', 'card.pciRemaining']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`), key);
  }
  assert.ok(source.includes('grace > 140 ? 24 : (grace > 108 ? 72 : null)'));
});

test('patient-card GRACE and MSCT overview values have four-language display labels', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.lowRisk', 'card.scorePoints', 'card.msctDone', 'card.msctUnavailable', 'card.msctOtherReason']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes("I18n.translateText(p.mskt)"));
  assert.ok(source.includes("t('card.scorePoints', { score: gb })"));
  assert.ok(source.includes("gb > 140 ?"));
});

test('post-discharge treatment time helper localizes status without changing stored status comparisons', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.treatmentAfterDeparture', 'card.treatmentActualTime', 'status.dead', 'status.transferred', 'status.discharged']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes("t('card.treatmentAfterDeparture'"));
  assert.ok(source.includes("p.status === 'vafot'"));
  assert.ok(source.includes("p.status === 'otkazildi'"));
});

test('patient-list dynamic totals and missing-time counts use four-language messages', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemorlar.js'), 'utf8');
  for (const key of ['patients.totalApprox', 'patients.missingTimeCount']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key].includes('{count}'), `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`));
  }
});

test('patient-card banner statuses and stored discharge outcome translate only for display', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/bemor-karta.js'), 'utf8');
  for (const key of ['card.activeUpper', 'card.dischargedUpper', 'card.transferredUpper', 'card.deceasedUpper']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}')`));
  }
  assert.ok(source.includes('I18n.translateText(p._chiqarish.natija)'));
});

test('report patient drilldown localizes age, sex, region and status display', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/hisobot.js'), 'utf8');
  for (const key of ['reports.ageRange', 'reports.patientListTitle', 'reports.patientListCount']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`));
  }
  assert.ok(source.includes("I18n.translateText(p.jins || '—')"));
  assert.ok(source.includes("I18n.translateText(p.viloyat || '—')"));
  assert.ok(source.includes("chiqarildi: t('status.discharged')"));
});

test('movement routing audit translates display reasons without changing routing decisions', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/harakat.js'), 'utf8');
  for (const key of ['movement.routingAllCorrect', 'movement.routingReachedCentre', 'movement.routingIssueCount',
    'movement.routingMoreCount', 'movement.issueAngioIndicated', 'movement.issueMsctTransfer',
    'movement.issueStemiTransfer', 'movement.issueKagTransfer']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes('I18n.translateText(iss.issue)'));
  assert.ok(source.includes("if (topLevel >= needLevel) correct++"));
});

test('pending-admission cards translate age, sex and waiting days at display time', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/qabul.js'), 'utf8');
  for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang]['pending.waitingDays'].includes('{days}'));
  assert.ok(source.includes("t('dashboard.ageYears', { age: yosh || '—' })"));
  assert.ok(source.includes("I18n.translateText(r.jins || '—')"));
  assert.ok(source.includes("t('pending.waitingDays', { days: kutganKun })"));
});

test('pending-admission page and populated card translate visible copy without changing record data', async () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/qabul.js'), 'utf8');
  const record = { _turi: 'infarkt', kt_no: 'SYN-001', fio: 'Synthetic Name', jins: 'Erkak',
    tugilgan_yil: 1980, qabul_vaqt: new Date().toISOString(), muassasa: 'Original Facility',
    otkazilgan_muassasa: 'Receiving Facility', otkazish_sababi: 'KAG/angiografiya uchun',
    infarkt_turi: 'STEMI' };
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    let heading = '';
    const runtime = {
      Auth: { getUser: async () => ({}) }, Profile: { getCurrent: async () => ({ role: 'super_admin' }) },
      DB: { kutilayotganBemorlar: async () => [record] },
      Components: { renderLayout: (_route, title, subtitle) => { heading = `${title} ${subtitle}`; return ''; }, startClock() {} },
      document: { getElementById: () => ({ innerHTML: '' }) }, initIcons() {}, icon: () => '',
      Utils: { calculateAge: () => 46, formatDateTime: () => '25.09.2026 10:00' },
      esc: value => String(value),
      t: (key, params) => String(catalog[lang][key]).replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? ''),
      I18n: { translateText: value => value === 'KAG/angiografiya uchun' ? catalog[lang]['pending.angiographyReason'] : value, facilityName: value => value }
    };
    vm.createContext(runtime);
    vm.runInContext(source + '\nthis.page = QabulPage;', runtime);
    runtime.page._filtrniQur = () => {};
    runtime.page._draw = () => {};
    await runtime.page.render();
    assert.ok(heading.includes(catalog[lang]['nav.pendingAdmission']));
    assert.ok(heading.includes(catalog[lang]['pages.pendingSubtitle']));
    const card = runtime.page._card(record, 0);
    for (const key of ['pending.destinationLabel', 'pending.senderLabel', 'pending.sentTime',
      'pending.diagnosisLabel', 'pending.reasonLabel', 'pending.readOnlyReferralNotice']) {
      assert.ok(card.includes(catalog[lang][key]), `${lang}: ${key}`);
    }
    assert.ok(card.includes(catalog[lang]['pending.angiographyReason']));
    assert.equal(record.otkazish_sababi, 'KAG/angiografiya uchun');
    assert.equal(record.otkazilgan_muassasa, 'Receiving Facility');
  }
});

test('long-stay report translates dynamic summary and region display without changing counts', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/hisobot.js'), 'utf8');
  for (const key of ['reports.longStayNone', 'reports.longStaySummary', 'reports.daysCount']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`));
  }
  assert.ok(source.includes("I18n.translateText(royxat[0]?.viloyat || '')"));
  assert.ok(source.includes('guruhlar.reduce((a, g) => a + g.bemorlar.length, 0)'));
});

test('PQ20 report control line translates notes without changing arithmetic', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/hisobot.js'), 'utf8');
  for (const key of ['reports.pq20MissingTreatment', 'reports.pq20EndovascularOutsideForm',
    'reports.pq20TiaOutsideForm', 'reports.pq20Mismatch', 'reports.pq20Control']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`));
  }
  assert.ok(source.includes('const ok = (A + M + O + B) === N'));
});

test('admin tabs and facility entry copy use existing four-language catalogs', () => {
  const adminSource = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  const facilitySource = fs.readFileSync(path.join(root, 'js/pages/muassasa-imkoniyat.js'), 'utf8');
  for (const key of ['admin.tabUsers', 'admin.tabFacilities', 'admin.tabPopulation', 'admin.tabQuality', 'admin.tabDuplicates', 'admin.tabLogins', 'admin.tabMessages', 'facility.newInstitution', 'pages.capabilitiesSubtitle']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  for (const key of ['admin.tabUsers', 'admin.tabFacilities', 'admin.tabPopulation', 'admin.tabQuality', 'admin.tabDuplicates', 'admin.tabLogins', 'admin.tabMessages']) {
    assert.ok(adminSource.includes(`t('${key}')`), key);
  }
  assert.ok(facilitySource.includes("t('pages.capabilitiesSubtitle')"));
  assert.ok(facilitySource.includes("t('facility.newInstitution')"));
});

test('admin users summary, permission matrix and filters use four-language display copy', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  const keys = ['admin.totalUsers', 'admin.superAdmins', 'admin.regionalAdmins', 'admin.doctors',
    'admin.roleRights', 'admin.capability', 'admin.usersList', 'admin.byRegion',
    'admin.facilitiesByRegion', 'admin.allRegions', 'admin.allFacilities', 'admin.foundUsers',
    'admin.viewOwnRegion', 'admin.viewAllRegions', 'admin.manageUsers', 'admin.manageFacilities',
    'admin.action.kiritish', 'admin.action.tahrirlash', 'admin.action.chiqarish',
    'admin.action.otkazish', 'admin.action.ochirish'];
  for (const key of keys) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  for (const key of ['admin.roleRights', 'admin.usersList', 'admin.allRegions', 'admin.allFacilities', 'admin.foundUsers']) {
    assert.ok(source.includes(`t('${key}')`), key);
  }
  assert.ok(source.includes('t(AdminPage._actionKey(amal))'));
});

test('admin facilities tab localizes controls while retaining region identifiers', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  const keys = ['admin.selectRegion', 'admin.facilitiesListFor', 'admin.activeCount',
    'admin.hiddenCount', 'admin.editCapabilities', 'admin.hiddenFacilitiesHelp',
    'admin.missingFacilitiesCount', 'admin.missingFacilitiesHelp', 'admin.addAllMissing'];
  for (const key of keys) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`), key);
  }
  assert.match(source, /data-v="\$\{v\.replace/);
  assert.ok(source.includes("I18n.t('region.' + index)"));
});

test('admin population save control uses the existing four-language save key', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang]['common.save'], `${lang}: common.save`);
  assert.match(source, /onclick="AdminPage\._saveAholi\(\)"[\s\S]*?\$\{t\('common\.save'\)\}/);
});

test('admin data-quality entry copy is translated in all four catalogs', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  for (const key of ['admin.qualityCheck', 'admin.qualityHelp', 'admin.startCheck']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}')`), key);
  }
});

test('admin duplicate-check entry copy and modes are translated in all four catalogs', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  for (const key of ['admin.duplicateCheck', 'admin.duplicateHelp', 'admin.duplicateModeDay', 'admin.duplicateModeAll']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}')`), key);
  }
  assert.ok(source.includes("modeBtn('day',t('admin.duplicateModeDay'))"));
  assert.ok(source.includes("modeBtn('all',t('admin.duplicateModeAll'))"));
});

test('admin sign-in history summary copy is translated in all four catalogs', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  for (const key of ['admin.totalRecords', 'admin.signIns', 'admin.signOuts', 'admin.activeUsers', 'admin.loginHistory', 'admin.latestRecords']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
    assert.ok(source.includes(`t('${key}'`), key);
  }
});

test('admin messages reply heading and actions use context-specific translations', () => {
  const source = fs.readFileSync(path.join(root, 'js/pages/admin.js'), 'utf8');
  for (const key of ['admin.administratorReply', 'admin.updateReply', 'admin.writeReply']) {
    for (const lang of ['uz', 'ru', 'en', 'kk']) assert.ok(catalog[lang][key], `${lang}: ${key}`);
  }
  assert.ok(source.includes("t('admin.administratorReply')"));
  assert.ok(source.includes("t(item.javob ? 'admin.updateReply' : 'admin.writeReply')"));
});

test('CDSS display localizes a clinical result without changing persisted recommendations', () => {
  const sourceIndex = new Map(Object.entries(catalog.uz).map(([key, value]) => [value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim(), key]));
  const source = fs.readFileSync(path.join(root, 'js/cdss.js'), 'utf8');
  const data = { insult_turi: 'Ishemik insult', gcs: 15, nihss: 1, aspects: 10, boshlanish_daqiqa: 360, mskt: "Yo'q", vazn: 70 };
  let originalSaved;
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    const i18n = {
      language: lang,
      t: (key, params = {}) => catalog[lang][key]?.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? ''),
      translateText: text => {
        if (lang === 'uz') return text;
        const key = sourceIndex.get(String(text).replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim());
        return key ? catalog[lang][key] : text;
      }
    };
    const runtime = { window: { I18n: i18n } };
    vm.createContext(runtime);
    vm.runInContext(source, runtime);
    const result = runtime.window.CDSS.insult(data);
    const audit = runtime.window.CDSS.saqlashUchun(result, '', {});
    delete audit.cdss_vaqt;
    const saved = JSON.stringify(audit);
    if (originalSaved === undefined) originalSaved = saved;
    else assert.equal(saved, originalSaved, 'locale must not change CDSS audit data');
    const html = runtime.window.CDSSUI.baholashHTML(result);
    assert.ok(html.includes(catalog[lang]['cdss.assessment']));
    assert.ok(html.includes(catalog[lang]['cdss.coreCare']));
    assert.ok(html.includes(catalog[lang]['cdss.urgentCt']));
    assert.ok(html.includes(catalog[lang]['cdss.disclaimer'].replace('{version}', result.versiya)));
    if (lang !== 'uz') {
      for (const raw of ['Klinik baholash', 'Umumiy xulosa', 'Neyrovizualizatsiyasiz', 'Zudlik bilan boshsuyagi MSKT', 'Trombektomiya uchun']) {
        assert.ok(!html.includes(raw), `${lang}: untranslated ${raw}`);
      }
      const displayed = [
        ...result.ballar.flatMap(ball => [ball.nom, ball.qiymat, ball.izoh]),
        ...result.xulosa,
        ...result.tavsiya.map(item => item.matn),
        ...result.ogohlantirish,
        ...result.parvarish,
        ...Object.values(result.tosiq).flat(),
        ...result.muddat.map(item => item.nom)
      ];
      for (const raw of displayed) {
        if (!raw || ['GCS', 'NIHSS', 'ASPECTS', 'MSKT'].includes(raw) || (lang === 'kk' && /^\d+ ball$/.test(raw))) continue;
        assert.ok(!html.includes(raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')), `${lang}: CDSS still displays ${raw}`);
      }
    }
  }
});

test('ASPECTS renders ten regions in all locales and retains the 0–10 scoring range', () => {
  for (const lang of ['uz', 'ru', 'en', 'kk']) {
    const runtime = { t: (key, params) => catalog[lang][key].replace(/\{(\w+)\}/g, (_, key) => params?.[key] ?? '') };
    vm.createContext(runtime);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/pages/insult-yangi.js'), 'utf8') + '\nthis.page = InsultYangiPage;', runtime);
    const html = runtime.page._renderAspects({});
    assert.equal((html.match(/type="checkbox"/g) || []).length, 10);
    assert.ok(html.includes(catalog[lang]['aspects.title']));
    assert.ok(html.includes(catalog[lang]['aspects.instruction']));
    const data = {};
    assert.equal(runtime.page._calcAspects(data), 10);
    for (const [i, key] of ['c','l','ic','i','m1','m2','m3','m4','m5','m6'].entries()) {
      data[`aspects_${key}`] = true;
      assert.equal(runtime.page._calcAspects(data), 9 - i);
    }
  }
});

test('legacy text translation matches complete messages and preserves names and suffixes', () => {
  const runtime = { window: { I18N_CATALOG: catalog }, localStorage: { getItem: () => null } };
  vm.createContext(runtime);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), runtime);
  const i18n = runtime.window.I18n;
  for (const [key, value] of Object.entries(catalog.uz)) {
    const normalized = value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
    if (!i18n._sourceIndex.has(normalized)) i18n._sourceIndex.set(normalized, key);
  }
  for (const lang of ['ru', 'en', 'kk']) {
    i18n.language = lang;
    assert.equal(i18n.translateText('Yangi Qabullar'), catalog[lang]['dashboard.newAdmissions']);
    assert.equal(i18n.translateText('Qabullar'), 'Qabullar');
    assert.equal(i18n.translateText('Bemorov Qabuljon'), 'Bemorov Qabuljon');
    assert.equal(i18n.translateText("Faylni ko'rish"), catalog[lang]['file.view']);
    assert.ok(i18n.t('dashboard.treatedCount', { count: 12 }).includes('12'));
  }
});

test('all four supported locales have identical semantic key coverage', () => {
  const sourceKeys = Object.keys(catalog.uz).sort();
  assert.ok(sourceKeys.length >= 350, `expected a substantial catalog, got ${sourceKeys.length}`);
  for (const language of ['ru', 'en', 'kk']) {
    assert.deepEqual(Object.keys(catalog[language]).sort(), sourceKeys);
    assert.equal(Object.values(catalog[language]).some(value => value == null || value === ''), false);
  }
});

test('locale catalogs have no missing, extra, empty or undefined entries', () => {
  const sourceKeys = new Set(Object.keys(catalog.uz));
  for (const language of ['ru', 'en', 'kk']) {
    const keys = new Set(Object.keys(catalog[language]));
    assert.deepEqual([...sourceKeys].filter(key => !keys.has(key)), [], `${language}: missing keys`);
    assert.deepEqual([...keys].filter(key => !sourceKeys.has(key)), [], `${language}: extra keys`);
    assert.deepEqual([...keys].filter(key => catalog[language][key] == null || catalog[language][key] === ''), [], `${language}: empty translations`);
  }
});

test('every literal translation key used by frontend modules exists', () => {
  const files = [];
  const collect = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(target);
      else if (entry.name.endsWith('.js') && !['locales.js', 'calculator-locales.js', 'form-locales.js'].includes(entry.name)) files.push(target);
    }
  };
  collect(path.join(root, 'js'));
  const missing = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*['"`]([^'"`]+)['"`]/g)) {
      if (match[1] === 'region.' && source.includes("I18n.t('region.'")) continue;
      if (!match[1].includes('${') && !Object.hasOwn(catalog.uz, match[1])) missing.add(match[1]);
    }
  }
  assert.deepEqual([...missing].sort(), []);
  for (let i = 0; i < 14; i++) assert.ok(catalog.uz['region.' + i], `region.${i}`);
});

test('clinical abbreviations are preserved in every locale', () => {
  const abbreviations = ['STEMI', 'NSTEMI', 'AMI', 'PCI', 'NIHSS', 'ASPECTS', 'GCS', 'GRACE', 'AHA', 'ECG', 'MSKT', 'TIA'];
  for (const language of ['uz', 'ru', 'en', 'kk']) {
    const text = Object.values(catalog[language]).join(' ');
    for (const abbreviation of abbreviations) assert.match(text, new RegExp(`\\b${abbreviation}\\b`));
  }
});

test('medical glossary has reviewed equivalents in UZ, RU, EN and KK', () => {
  const required = ['stroke','infarction','thrombolysis','thrombectomy','reperfusion','ischemia','hemorrhage','occlusion','angiography','stenting','shock','mortality','onset','admission','referral','transfer'];
  assert.deepEqual(Object.keys(glossary), required);
  for (const term of required) {
    assert.deepEqual(Object.keys(glossary[term]).sort(), ['en','kk','ru','uz']);
    assert.ok(Object.values(glossary[term]).every(Boolean));
  }
});

test('medical glossary terminology is represented consistently in locale catalogs', () => {
  const normalized = value => String(value).toLocaleLowerCase().replace(/[’ʻʼ`]/g, "'");
  for (const language of ['uz', 'ru', 'en', 'kk']) {
    const corpus = normalized(Object.values(catalog[language]).join(' | '));
    for (const [term, localized] of Object.entries(glossary)) {
      assert.ok(corpus.includes(normalized(localized[language])), `${language}: glossary term "${term}" is absent from catalog`);
    }
  }
});

test('NIHSS and GCS use localized copy without changing score values', () => {
  const calculators = fs.readFileSync(path.join(root, 'js/calculators.js'), 'utf8');
  assert.match(calculators, /_scaleQuestion\('n1a', 'nihss\.1a', \[0,1,2,3\]\)/);
  assert.match(calculators, /_scaleQuestion\('g3', 'gcs\.motor', \[6,5,4,3,2,1\]\)/);
  assert.doesNotMatch(calculators, /Ong darajasi|Savollarga javob|Ko'zlarni ochishi|Nutq reaksiyasi/);
});

test('database enum values are not replaced in source modules', () => {
  const source = fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8');
  for (const value of ['ischemic','hemorrhagic','tia','stemi','nstemi','completed','pending','referred','transferred','alive','dead','super_admin','admin','user']) {
    assert.match(source, new RegExp(`${value}:`));
  }
});
