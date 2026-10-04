// ==================== DASHBOARD PAGE ====================
function _dashSparkline(data, color) {
  if (!data || data.length < 2) return '';
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v,i) => `${Math.round(i*(w/(data.length-1)))},${Math.round(h - (v/max)*h)}`).join(' ');
  const last = pts.split(' ').filter(Boolean).pop()?.split(',') || ['0','0'];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><polyline points="${pts}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/></svg>`;
}

const DashboardPage = {
  _charts: {},
  _realtimeSub: null,
  _viewViloyat: undefined,
  _viewMuassasa: undefined,
  _viewDateFrom: null,
  _viewDateTo: null,
  _viewDateMode: null,
  _viewSelectedYear: null,
  _chartMode: 'abs', // 'abs' | '100k'
  _regionData: [],
  _regionProfile: null,
  _pollTimer: null,
  _loadSeq: 0, // race condition guard
  _sourceMode: 'percent',
  _sourceData: null,
  _sourceSelection: null,
  _sourceDetail: null,
  _sourceDetailSeq: 0,
  _sourceShowAll: false,

  async render() {
    if (DashboardPage._pollTimer) { clearInterval(DashboardPage._pollTimer); DashboardPage._pollTimer = null; }
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    DashboardPage._profile = profile;
    
    document.getElementById('app').innerHTML = Components.renderLayout(
      'dashboard', t('dashboard.title'), t('dashboard.subtitle'),
      `<div id="dashboard-inner" class="animate-fadein">
        <div class="flex items-center justify-center py-32">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-500 font-medium">${t('dashboard.loading')}</p>
          </div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    await DashboardPage.loadData();
    DashboardPage.muassasaBanner();
    DashboardPage.qabulBanner();
    DashboardPage.subscribeRealtime();
  },

  // Muassasa belgilanmagan bo'lsa — sozlamalarga yo'naltiruvchi eslatma.
  // Bu maydonsiz "Qabul kutilmoqda" aniq ishlamaydi.
  muassasaBanner() {
    const p = DashboardPage._profile;
    if (!p || p.role === 'super_admin' || p.role === 'rahbar') return;
    if ((p.muassasa || '').trim()) return;
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;
    const div = document.createElement('div');
    div.className = 'card mb-4 border-l-4 border-l-amber-500 bg-amber-50 border-amber-200';
    div.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="text-amber-600 shrink-0 mt-0.5">${icon('building-2', 22)}</div>
          <div class="min-w-0">
            <div class="font-bold text-amber-900">${t('dashboard.workplaceUnset')}</div>
            <div class="text-sm text-amber-800">
              ${t('dashboard.chooseWorkplaceHelp')}
            </div>
          </div>
        </div>
        <button class="btn btn-primary flex items-center gap-2 shrink-0"
                onclick="Router.go('settings')">
          ${icon('settings', 16)} ${t('dashboard.openSettings')}
        </button>
      </div>`;
    inner.prepend(div);
    initIcons();
  },

  // Boshqa muassasadan yuborilgan, hali qabul qilinmagan bemorlar bo'lsa —
  // dashboard tepasida ogohlantiruvchi kartochka chiqaramiz.
  async qabulBanner() {
    const p = DashboardPage._profile;
    // Kuzatuvchi rollar bemor qabul qilmaydi — ularga eslatma chiqmaydi
    if (p?.role === 'super_admin' || p?.real_role === 'rahbar') return;
    // Viloyat admini — butun viloyat bo'yicha, bitta muassasa bo'yicha emas
    const mua = p?.role === 'admin' ? null : p?.muassasa;
    const vil = p?.viloyat;
    if (!mua && !vil) return;
    let rows = [];
    try { rows = await DB.kutilayotganBemorlar(mua, vil); } catch (e) { return; }
    if (!rows.length) return;
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;   // sahifa almashgan

    const nomlar = rows.slice(0, 3).map(r => PD.fio(r.fio)).filter(Boolean).join(', ');
    const div = document.createElement('div');
    div.className = 'card mb-4 border-l-4 border-l-orange-500 bg-orange-50 border-orange-200';
    div.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="text-orange-600 shrink-0 mt-0.5">${icon('ambulance', 22)}</div>
          <div class="min-w-0">
            <div class="font-bold text-orange-900">
              ${t(mua ? 'dashboard.pendingForYou' : 'dashboard.pendingForRegion', { count: rows.length })}
            </div>
            <div class="text-sm text-orange-800 truncate">
              ${esc(nomlar)}${rows.length > 3 ? t('dashboard.andMore', { count: rows.length - 3 }) : ''}
            </div>
          </div>
        </div>
        <button class="btn btn-primary flex items-center gap-2 shrink-0"
                onclick="Router.go('qabul')">
          ${icon('log-in', 16)} ${t('dashboard.openList')}
        </button>
      </div>`;
    inner.prepend(div);
    initIcons();
  },

  async loadData() {
    const seq = ++DashboardPage._loadSeq;
    DashboardPage._sourceData = null;
    DashboardPage._sourceSelection = null;
    DashboardPage._sourceDetail = null;
    ++DashboardPage._sourceDetailSeq;
    const oldSources = document.getElementById('admission-sources-content');
    if (oldSources) oldSources.innerHTML = DashboardPage.renderAdmissionSources(null);
    try {
      const profile = await Profile.getCurrent();
      if (seq !== DashboardPage._loadSeq) return;
      const ov = DashboardPage._viewViloyat;
      const om = DashboardPage._viewMuassasa;
      const df = DashboardPage._viewDateFrom;
      const dt = DashboardPage._viewDateTo;
      const AGE_GROUPS = ['75+', '60-74', '45-59', '30-44', '≤29'];
      const emptyPyramid = () => { const r = {}; AGE_GROUPS.forEach(g => { r[g] = { mTotal:0, fTotal:0, mDeath:0, fDeath:0 }; }); return { groups: AGE_GROUPS, data: r }; };
      const emptyDemo = { infarkt:{male:0,female:0,ages:{}}, insult:{male:0,female:0,ages:{}} };

      // BOSQICH 2 so'rovlari ham darhol yuboriladi (bosqich 1 ni kutmaydi),
      // lekin natijasi bosqich 1 chizilgandan keyin qo'llanadi.
      const phase2Promise = Promise.allSettled([
        DB.getRecentPatients(10, ov, om),
        Promise.resolve(null),
        Promise.resolve(null),
        DB.getLongStayPatients(ov, om),
        Promise.resolve(null),
        Promise.resolve(null)
      ]);

      // BOSQICH 1: Tez yuklanadigan asosiy ma'lumotlar
      const phase1 = await Promise.allSettled([
        DB.getDashboardStats(ov, om, df, dt, true),
        DB.getTrend30(ov, om),
        DB.getTrend12Month(ov, om),
      ]);
      const val1 = (i, def) => phase1[i].status === 'fulfilled' ? phase1[i].value : def;
      if (phase1[0].status !== 'fulfilled') throw phase1[0].reason;
      const snapshot = phase1[0].value;
      const stats = snapshot.stats;
      const trend     = val1(1, { labels:[], infData:[], insData:[] });
      const trend12   = val1(2, { labels:[], infData:[], insData:[] });
      const recent    = [];
      const viloyat = om ? [] : snapshot.regions;
      DashboardPage._recentPatients = recent;
      DashboardPage._ageSex = snapshot.ageSex;

      if (seq !== DashboardPage._loadSeq) return;
      // Sahifani darhol ko'rsatamiz
      DashboardPage.renderContent(stats, trend, trend12, recent, viloyat, profile, snapshot.demographics, snapshot.risks, [], null);
      if (typeof TreatmentFlow !== 'undefined') TreatmentFlow.mount(profile, snapshot, filters => {
        DashboardPage._viewViloyat=filters.region||undefined;
        DashboardPage._viewMuassasa=filters.facility||undefined;
        DashboardPage.setDateFilter(filters.from ? `${filters.from}T00:00:00+05:00` : null,
          filters.to ? `${filters.to}T23:59:59.999999+05:00` : null,'custom');
      });
      if (window.performance?.mark) performance.mark('dashboard:usable');

      // BOSQICH 2: Og'ir ma'lumotlar (allaqachon fonda yuklanmoqda)
      const phase2 = await phase2Promise;
      if (seq !== DashboardPage._loadSeq) return;
      const val2 = (i, def) => phase2[i].status === 'fulfilled' ? phase2[i].value : def;
      const recentLoaded = val2(0, []);
      const demo = snapshot.demographics;
      const riskFactors = snapshot.risks;
      const longStay  = val2(3, []);
      const ageSex = snapshot.ageSex;
      DashboardPage._recentPatients = recentLoaded;
      DashboardPage._ageSex = ageSex;

      const recentBody = document.getElementById('recent-patients-body');
      if (recentBody) recentBody.innerHTML = DashboardPage._renderRecentRows(recentLoaded);

      // Faqat grafiklar va pastki qismlarni yangilaymiz
      DashboardPage._updateSecondaryContent(stats, demo, riskFactors, longStay, ageSex);
      const sources = document.getElementById('admission-sources-content');
      DashboardPage._sourceData = snapshot.sources;
      if (sources) sources.innerHTML = DashboardPage.renderAdmissionSources(
        snapshot.sources, false
      );

    } catch (err) {
      if (seq !== DashboardPage._loadSeq) return;
      const inner = document.getElementById('dashboard-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="card p-12 text-center max-w-lg mx-auto mt-10">
            <div class="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">${icon('alert-triangle', 40)}</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">${t('dashboard.loadError')}</h3>
            <p class="text-gray-500 text-sm mb-6">${err.message}</p>
            <button class="btn btn-primary" onclick="DashboardPage.loadData()">${t('dashboard.retry')}</button>
          </div>`;
          initIcons();
      }
    }
  },

  _updateSecondaryContent(stats, demo, riskFactors, longStay, ageSex) {
    // Risk factors donut chartlarini yangilaymiz
    if (riskFactors) {
      DashboardPage._drawDonut('riskInfarktChart', 'riskInfarktLegend', riskFactors.infarkt, '#ef4444', stats?.jamiInfarkt);
      DashboardPage._drawDonut('riskInsultChart',  'riskInsultLegend',  riskFactors.insult,  '#3b82f6', stats?.jamiInsult);
    }
    // Age-Sex pyramidlarni yangilaymiz
    if (ageSex && typeof AgePyramid !== 'undefined') {
      AgePyramid.render('pyramid-infarkt', ageSex.infarkt, 'INFARKT', '#dc2626', stats?.jamiInfarkt, 'infarkt');
      AgePyramid.render('pyramid-insult',  ageSex.insult,  'INSULT',  '#2563eb', stats?.jamiInsult, 'insult');
    }
    // 15+ kun jadvalini yangilaymiz
    DashboardPage._longStayData = longStay;
    const longStayEl = document.getElementById('longstay-body');
    if (longStayEl) {
      longStayEl.innerHTML = longStay.length === 0
        ? `<tr><td colspan="5" class="p-10 text-center text-slate-400 font-medium">${t('dashboard.longStayEmpty')}</td></tr>`
        : longStay.map((g, idx) => {
            const inf = g.bemorlar.filter(b=>b._type==='infarkt').length;
            const ins = g.bemorlar.filter(b=>b._type==='insult').length;
            const maxDays = Math.max(...g.bemorlar.map(b=>b.kunlar));
            return `<tr class="hover:bg-orange-50/30 transition-colors">
              <td class="p-4"><div class="flex items-center gap-2"><div class="w-7 h-7 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center">${icon('building-2',14)}</div><span class="font-bold text-slate-700">${esc(I18n.facilityName(g.muassasa))}</span></div></td>
              <td class="p-4"><span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-black">${I18n.plural(g.bemorlar.length)}</span></td>
              <td class="p-4"><span class="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-black">${t('dashboard.daysCount', { count: maxDays })}</span></td>
              <td class="p-4"><div class="flex gap-2">${inf>0?`<span class="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold">${t('dashboard.infarctCount', { count: inf })}</span>`:''}${ins>0?`<span class="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold">${t('dashboard.strokeCount', { count: ins })}</span>`:''}</div></td>
              <td class="p-4 text-right"><button class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick="DashboardPage.showLongStayDetail(${idx})">${t('dashboard.view')}</button></td>
            </tr>`;
          }).join('');
      // Jami sonini ham yangilaymiz
      const longStayCount = document.getElementById('longstay-count');
      if (longStayCount) longStayCount.textContent = I18n.plural(longStay.reduce((s,g)=>s+g.bemorlar.length,0));
    }
  },

  renderAdmissionSources(data, failed = false) {
    if (failed) return `<div role="alert" class="text-sm text-red-600">${t('dashboard.loadError')} <button class="underline font-semibold" onclick="DashboardPage.loadData()">${t('dashboard.retry')}</button></div>`;
    if (!data) return `<p role="status" class="text-sm text-slate-500">${t('dashboard.loading')}</p>`;
    if (!data.total) return `<p class="text-sm text-slate-500">${t('dashboard.noData')}</p>`;
    const number = n => I18n.formatNumber(n);
    const percentMode = DashboardPage._sourceMode === 'percent';
    const scale = percentMode ? 100 : Math.max(1, ...data.rows.flatMap(row => [row.infarkt, row.insult]));
    return `<div class="source-toolbar"><div class="source-switch" role="group" aria-label="${t('dashboard.sourceScale')}">${['count', 'percent'].map(mode => `<button type="button" data-source-mode="${mode}" aria-pressed="${DashboardPage._sourceMode === mode}" onclick="DashboardPage.setSourceMode('${mode}')">${t(mode === 'count' ? 'dashboard.sourceCount' : 'dashboard.sourcePercent')}</button>`).join('')}</div><p>${t(percentMode ? 'dashboard.sourceDenominator' : 'dashboard.sourceSharedScale')}</p></div>
      <div class="source-panels">${['infarkt', 'insult'].map(disease => {
        const total = data.rows.reduce((sum, row) => sum + row[disease], 0);
        return `<article class="source-panel source-${disease}"><h4><span class="source-dot" aria-hidden="true"></span>${t(disease === 'infarkt' ? 'glossary.infarction' : 'glossary.stroke')}</h4><p class="source-total"><strong>${number(total)}</strong><span>${t('dashboard.sourceRecords')}</span></p>
          ${!total ? `<p class="source-empty">${t('dashboard.noData')}</p>` : ''}
          <div class="source-bars">${data.rows.map((row, index) => {
            const count = row[disease];
            const percent = total ? count / total * 100 : 0;
            const width = (percentMode ? percent : count) / scale * 100;
            const selected = DashboardPage._sourceSelection?.disease === disease && DashboardPage._sourceSelection?.index === index;
            const label = DashboardPage.sourceLabel(row.source);
            return `<button type="button" class="source-row" data-source-row="${disease}-${index}" aria-pressed="${selected}" aria-controls="source-detail" ${!count ? 'disabled' : ''} onclick="DashboardPage.selectSource('${disease}',${index})" title="${esc(`${label}: ${number(count)} · ${I18n.formatNumber(percent, { maximumFractionDigits: 1 })}% — ${t('dashboard.sourceExplore')}`)}"><span class="source-row-top"><span>${label}</span><span class="source-values"><b>${number(count)}</b><span>${I18n.formatNumber(percent, { maximumFractionDigits: 1 })}%</span></span></span><span class="source-track" aria-hidden="true"><span style="width:${width}%"></span></span><span class="source-tip">${t('dashboard.sourceExplore')} →</span></button>`;
          }).join('')}</div><div class="source-axis" aria-hidden="true"><span>0${percentMode ? '%' : ''}</span><span>${number(scale / 2)}${percentMode ? '%' : ''}</span><span>${number(scale)}${percentMode ? '%' : ''}</span></div></article>`;
      }).join('')}</div><p class="source-hint">${t('dashboard.sourceExplore')} · ${t('dashboard.sourceDenominator')}</p><div id="source-detail" aria-live="polite">${DashboardPage.renderSourceDetail()}</div>`;
  },

  sourceLabel(source) {
    const keys = ['option.ambulance', 'option.selfReferral', 'option.polyclinicReferral', 'option.otherFacility'];
    return t(keys[APP_CONFIG.MUROJAAT_YOLLARI.indexOf(source)] || 'dashboard.admissionSourceUnknown');
  },

  renderSourceFilters(profile) {
    if (profile?.role !== 'super_admin') return '';
    const region = DashboardPage._viewViloyat;
    const facility = DashboardPage._viewMuassasa;
    const facilities = [...new Set(region ? (APP_CONFIG.MUASSASALAR[region] || []) : Object.values(APP_CONFIG.MUASSASALAR).flat())];
    if (facility && !facilities.includes(facility)) facilities.push(facility);
    const option = (value, label, active) => `<option value="${esc(value)}" ${active ? 'selected' : ''}>${esc(label)}</option>`;
    const year = new Date(Date.now() + 5 * 3600000).getUTCFullYear();
    const current = DashboardPage._viewDateFrom ? new Date(new Date(DashboardPage._viewDateFrom).getTime() + 5 * 3600000).toISOString().slice(0, DashboardPage._viewDateMode === 'month' ? 7 : 4) : '';
    const periods = [];
    for (let y = year; y >= 2024; y--) {
      periods.push(option(String(y), String(y), current === String(y)));
      for (let m = 1; m <= 12; m++) {
        const value = `${y}-${String(m).padStart(2, '0')}`;
        periods.push(option(value, `${y} · ${t(`month.full.${m}`)}`, current === value));
      }
    }
    return `<div class="source-filters"><label>${t('common.region')}<select id="source-region" onchange="DashboardPage.setViewViloyat(this.value || undefined)">${option('', t('common.all'), !region)}${APP_CONFIG.VILOYATLAR.map(v => option(v, I18n.translateText(v), region === v)).join('')}</select></label><label>${t('common.institution')}<select id="source-facility" onchange="DashboardPage.setSourceFacility(this.value)">${option('', t('common.all'), !facility)}${facilities.map(f => option(f, I18n.translateText(f), facility === f)).join('')}</select></label><label>${t('common.date')}<select id="source-period" onchange="DashboardPage.setSourcePeriod(this.value)">${option('', t('common.all'), !current)}${periods.join('')}</select></label><button type="button" onclick="DashboardPage.resetSourceFilters()">${t('common.clear')}</button></div>`;
  },

  setSourceFacility(value) {
    DashboardPage._viewMuassasa = value || undefined;
    DashboardPage.loadData();
  },

  setSourcePeriod(value) {
    if (!value) return DashboardPage.setDateFilter(null, null, null);
    if (!/^\d{4}(-\d{2})?$/.test(value)) return;
    const [year, month] = value.split('-').map(Number);
    const from = new Date(Date.UTC(year, (month || 1) - 1, 1) - 5 * 3600000).toISOString();
    const to = new Date(Date.UTC(month ? year : year + 1, month || 0, 1) - 5 * 3600000 - 1).toISOString();
    DashboardPage._viewSelectedYear = year;
    DashboardPage.setDateFilter(from, to, month ? 'month' : 'year');
  },

  resetSourceFilters() {
    DashboardPage._viewViloyat = undefined;
    DashboardPage._viewMuassasa = undefined;
    DashboardPage.setDateFilter(null, null, null);
  },

  refreshSources() {
    const el = document.getElementById('admission-sources-content');
    if (el) el.innerHTML = DashboardPage.renderAdmissionSources(DashboardPage._sourceData);
  },

  setSourceMode(mode) {
    if (!['count', 'percent'].includes(mode)) return;
    DashboardPage._sourceMode = mode;
    DashboardPage.refreshSources();
    document.querySelector(`[data-source-mode="${mode}"]`)?.focus({ preventScroll: true });
  },

  async selectSource(disease, index) {
    const row = DashboardPage._sourceData?.rows[index];
    if (!row || !['infarkt', 'insult'].includes(disease) || !row[disease]) return;
    const seq = ++DashboardPage._sourceDetailSeq;
    const loadSeq = DashboardPage._loadSeq;
    DashboardPage._sourceSelection = { disease, index, source: row.source };
    DashboardPage._sourceDetail = { loading: true };
    DashboardPage._sourceShowAll = false;
    DashboardPage.refreshSources();
    document.querySelector(`[data-source-row="${disease}-${index}"]`)?.focus({ preventScroll: true });
    try {
      const data = await DB.getAdmissionSourceRegions(disease, row.source, DashboardPage._viewViloyat, DashboardPage._viewMuassasa, DashboardPage._viewDateFrom, DashboardPage._viewDateTo);
      if (seq !== DashboardPage._sourceDetailSeq || loadSeq !== DashboardPage._loadSeq) return;
      DashboardPage._sourceDetail = data;
    } catch (error) {
      if (seq !== DashboardPage._sourceDetailSeq || loadSeq !== DashboardPage._loadSeq) return;
      DashboardPage._sourceDetail = { failed: true };
    }
    const detail = document.getElementById('source-detail');
    if (detail) detail.innerHTML = DashboardPage.renderSourceDetail();
  },

  closeSourceDetail() {
    ++DashboardPage._sourceDetailSeq;
    const selected = DashboardPage._sourceSelection;
    DashboardPage._sourceSelection = null;
    DashboardPage._sourceDetail = null;
    DashboardPage.refreshSources();
    if (selected) document.querySelector(`[data-source-row="${selected.disease}-${selected.index}"]`)?.focus({ preventScroll: true });
  },

  toggleSourceRegions() {
    DashboardPage._sourceShowAll = !DashboardPage._sourceShowAll;
    const detail = document.getElementById('source-detail');
    if (detail) detail.innerHTML = DashboardPage.renderSourceDetail();
    document.getElementById('source-regions-toggle')?.focus({ preventScroll: true });
  },

  renderSourceDetail() {
    const selected = DashboardPage._sourceSelection;
    if (!selected) return '';
    const data = DashboardPage._sourceDetail;
    const title = `${DashboardPage.sourceLabel(selected.source)} · ${t(selected.disease === 'infarkt' ? 'glossary.infarction' : 'glossary.stroke')}`;
    let body;
    if (data?.loading) body = `<p role="status" class="source-detail-message">${t('dashboard.loading')}</p>`;
    else if (data?.failed) body = `<p role="alert" class="source-detail-message">${t('dashboard.loadError')} <button type="button" class="underline" onclick="DashboardPage.selectSource('${selected.disease}',${selected.index})">${t('dashboard.retry')}</button></p>`;
    else if (!data?.total) body = `<p class="source-detail-message">${t('dashboard.noData')}</p>`;
    else {
      const rows = DashboardPage._sourceShowAll ? data.rows : data.rows.slice(0, 5);
      body = `<div class="source-table-wrap"><table class="source-table"><thead><tr><th>${t('dashboard.byRegion')}</th><th>${t('dashboard.sourceCount')}</th><th>${t('dashboard.sourceDetailShare')}</th></tr></thead><tbody>${rows.map(row => {
        const share = row.count / data.total * 100;
        return `<tr><td>${esc(row.region ? I18n.translateText(row.region) : t('dashboard.admissionSourceUnknown'))}</td><td>${I18n.formatNumber(row.count)}</td><td><div class="source-share"><span class="source-track" aria-hidden="true"><span style="width:${share}%"></span></span><span>${I18n.formatNumber(share, { maximumFractionDigits: 1 })}%</span></div></td></tr>`;
      }).join('')}</tbody></table></div><div class="source-detail-footer"><span>${t('dashboard.admissionSourceTotal', { count: I18n.formatNumber(data.total) })}</span>${data.rows.length > 5 ? `<button id="source-regions-toggle" type="button" aria-expanded="${DashboardPage._sourceShowAll}" onclick="DashboardPage.toggleSourceRegions()">${t(DashboardPage._sourceShowAll ? 'dashboard.sourceShowLess' : 'dashboard.sourceShowAll')}</button>` : ''}</div>`;
    }
    return `<section class="source-detail source-${selected.disease}" aria-label="${esc(title)}"><header><div><h4>${title}</h4><p>${t('dashboard.sourceRegionDetail')}</p></div><button type="button" class="source-close" aria-label="${t('dashboard.sourceClose')}" onclick="DashboardPage.closeSourceDetail()">×</button></header>${body}</section>`;
  },

  renderContent(stats, trend, trend12, recent, viloyat, profile, demo, riskFactors, longStay = [], genderMort = null) {
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;

    const isFiltered = profile?.role !== 'super_admin' && !!profile?.viloyat;
    const isRshtyoim = !!DashboardPage._viewMuassasa;
    const activeViloyat = DashboardPage._viewViloyat || (isFiltered ? profile?.viloyat : null);
    const distTitle = activeViloyat ? t('dashboard.facilityDistribution', { region: I18n.translateText(activeViloyat) }) : t('dashboard.regionalChart');

    // Gender Calculation
    const infM = demo.infarkt.male, infF = demo.infarkt.female, infT = (infM + infF) || 1;
    const insM = demo.insult.male, insF = demo.insult.female, insT = (insM + insF) || 1;
    
    const infMP = Math.round((infM/infT)*100), infFP = 100 - infMP;
    const insMP = Math.round((insM/insT)*100), insFP = 100 - insMP;

    // Stat Values Calculation
    const jami = stats.jami || 0;
    const jamiInfarkt = stats.jamiInfarkt || 0;
    const jamiInsult = stats.jamiInsult || 0;

    const aktivInfarkt = stats.infarktAktiv || 0;
    const aktivInsult = stats.insultAktiv || 0;

    const vafotInfarkt = stats.vafotInfarkt || 0;
    const vafotInsult = stats.vafotInsult || 0;

    const chiqarilganInfarkt = stats.chiqarilganInfarkt || 0;
    const chiqarilganInsult = stats.chiqarilganInsult || 0;
    const otkazilganInfarkt = stats.otkazilganInfarkt || 0;
    const otkazilganInsult = stats.otkazilganInsult || 0;

    const bugunInfarkt = stats.infarktBugun || 0;
    const bugunInsult = stats.insultBugun || 0;
    const bugunJami = bugunInfarkt + bugunInsult;

    // Jami 18+ va 30+ aholi (respublika yoki tanlangan viloyat)
    const aholiMap18 = APP_CONFIG.AHOLI_18PLUS || {};
    const aholiMap30 = APP_CONFIG.AHOLI_30PLUS || {};
    const viewVil = DashboardPage._viewViloyat;
    const jamiAholi18 = viewVil
      ? (aholiMap18[viewVil] || 0)
      : Object.values(aholiMap18).reduce((a, b) => a + b, 0);
    const jamiAholi30 = viewVil
      ? (aholiMap30[viewVil] || 0)
      : Object.values(aholiMap30).reduce((a, b) => a + b, 0);
    const jamiAholi = jamiAholi18; // backwards compat
    const per100k18 = jamiAholi18 > 0 ? +((jami / jamiAholi18) * 100000).toFixed(1) : null;
    const per100k30 = jamiAholi30 > 0 ? +((jami / jamiAholi30) * 100000).toFixed(1) : null;
    const per100k = per100k18;

    // O'tgan hafta vs bu hafta trend (oxirgi 30 kundan)
    const spark7 = trend ? trend.infData.slice(-7).map((v,i) => v + (trend.insData[trend.insData.length-7+i]||0)) : [];
    const thisWeek = spark7.reduce((a,b) => a+b, 0);
    const prevWeek = trend ? (trend.infData.slice(-14,-7).map((v,i) => v + (trend.insData[trend.insData.length-14+i]||0))).reduce((a,b)=>a+b,0) : 0;
    const weekDiff = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null;
    const weekTrend = weekDiff !== null ? (weekDiff > 0 ? `↑${weekDiff}%` : weekDiff < 0 ? `↓${Math.abs(weekDiff)}%` : '→0%') : null;
    const weekTrendColor = weekDiff > 0 ? 'text-red-300' : weekDiff < 0 ? 'text-emerald-300' : 'text-slate-400';

    const renderSparkline = _dashSparkline;

    const isSuperAdmin = profile?.role === 'super_admin';
    const viewViloyat = DashboardPage._viewViloyat;
    const viloyatlarList = APP_CONFIG.VILOYATLAR || [];

    inner.innerHTML = `
      ${isSuperAdmin ? `
      <!-- VILOYAT FILTER (faqat super_admin) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <div class="flex items-center gap-2 mr-2">
            <div class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">${icon('map-pin', 14)}</div>
            <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">${t('dashboard.viewMode')}</span>
          </div>
          <button onclick="DashboardPage.setViewViloyat(undefined)"
            class="px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-[11px] font-bold border transition-all ${!viewViloyat ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
            ${t('dashboard.allRegions')}
          </button>
          ${viloyatlarList.map(v => {
            const safeV = v.replace(/'/g, "\\'");
            const isActive = viewViloyat === v;
            const cls = isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
            const label = I18n.translateText(v);
            return `<button onclick="DashboardPage.setViewViloyat('${safeV}')" class="px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-[11px] font-bold border transition-all ${cls}">${esc(label)}</button>`;
          }).join('')}
          <button onclick="DashboardPage.setViewMuassasa('Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi')"
            class="px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-[11px] font-bold border transition-all ${DashboardPage._viewMuassasa === 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi' ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
            RSHTYoIM
          </button>
        </div>
        <!-- SANA FILTRI -->
        <!-- SANA FILTRI: Yillar + Oylar -->
        ${(() => {
          const now = new Date(new Date().getTime() + 5*60*60*1000);
          const curY = now.getUTCFullYear();
          const monthNames = Array.from({ length: 12 }, (_, index) => t(`month.full.${index + 1}`));
          const activeFrom = DashboardPage._viewDateFrom;
          const activeMode = DashboardPage._viewDateMode;
          const selYear = DashboardPage._viewSelectedYear;

          // Yillarni aniqlash (2024 dan hozirgi yilgacha)
          const years = [];
          for (let y = 2024; y <= curY; y++) years.push(y);

          const yearBtns = years.map(y => {
            const from = new Date(`${y}-01-01T00:00:00+05:00`).toISOString();
            const to   = new Date(`${y}-12-31T23:59:59+05:00`).toISOString();
            const isActive = (activeMode === 'year' && activeFrom === from) || (selYear === y && activeMode === 'month');
            return `<button onclick="DashboardPage.setDateFilter('${from}','${to}','year')"
              class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">${y}</button>`;
          }).join('');

          // Faqat yil tanlanganda o'sha yilning oylarini ko'rsat
          let monthRow = '';
          if (selYear) {
            const maxM = selYear === curY ? now.getUTCMonth() : 11;
            const mos = [];
            for (let m = 0; m <= maxM; m++) {
              const pad = n => String(n).padStart(2,'0');
              const from = new Date(`${selYear}-${pad(m+1)}-01T00:00:00+05:00`).toISOString();
              const lastDay = new Date(Date.UTC(selYear, m+1, 0)).getUTCDate();
              const to   = new Date(`${selYear}-${pad(m+1)}-${pad(lastDay)}T23:59:59+05:00`).toISOString();
              const isActive = activeMode === 'month' && activeFrom === from;
              mos.push(`<button onclick="DashboardPage.setDateFilter('${from}','${to}','month')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">${monthNames[m]}</button>`);
            }
            monthRow = `
              <div class="flex flex-wrap items-center gap-2 pt-2">
                <span class="text-[10px] font-bold text-slate-500 uppercase mr-1">${t('dashboard.month')}</span>
                ${mos.join('')}
              </div>`;
          }

          return `
          <div class="pt-3 border-t border-slate-100 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-2 mr-1">
                <div class="w-6 h-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">${icon('calendar', 12)}</div>
                <span class="text-[10px] font-bold text-slate-500 uppercase">${t('dashboard.year')}</span>
              </div>
              ${yearBtns}
              <button onclick="DashboardPage.setDateFilter(null,null,null)"
                class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ml-2 ${!activeFrom ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
                ${t('dashboard.allTime')}
              </button>
            </div>
            ${monthRow}
          </div>`;
        })()}
      </div>
      ` : ''}

      <!-- ROW 1: KPI CARDS (TOP 6) -->
      <div id="kpi-cards-grid" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10" style="align-items:stretch">
        ${DashboardPage.renderKpiCards(stats, trend, demo)}
      </div>

      <!-- ROW 2: DYNAMICS CHART (FULL WIDTH) -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">${t('dashboard.dailyAdmissions')}</h3>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5"><span class="w-3 h-1 bg-red-500 rounded-full"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.infarction')}</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-1 bg-blue-500 rounded-full"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.stroke')}</span></div>
          </div>
        </div>
        <div class="h-80"><canvas id="dynamicsChart"></canvas></div>
      </div>

      <!-- ROW 2b: MONTHLY TREND CHART -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">${t('dashboard.monthlyAdmissions')}</h3>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-500"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.infarction')}</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.stroke')}</span></div>
          </div>
        </div>
        <div class="h-72"><canvas id="monthlyChart"></canvas></div>
      </div>

      <!-- ROW 3: REGIONAL DISTRIBUTION CHART -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8" ${isRshtyoim ? 'style="display:none"' : ''}>
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
           <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">${distTitle}</h3>
           <div class="flex items-center gap-3">
             <div class="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold">
               <button id="toggleAbs" onclick="DashboardPage.setChartMode('abs')" class="px-3 py-1.5 bg-blue-600 text-white transition-all">${t('dashboard.absolute')}</button>
               <button id="toggle100k18" onclick="DashboardPage.setChartMode('100k18')" class="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all">/ 100 000 <span class="text-indigo-400">18+</span></button>
               <button id="toggle100k30" onclick="DashboardPage.setChartMode('100k30')" class="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all">/ 100 000 <span class="text-amber-400">30+</span></button>
             </div>
             <div class="flex gap-3">
               <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#dc2626]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.infarction')}</span></div>
               <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#2563eb]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">${t('glossary.stroke')}</span></div>
             </div>
           </div>
        </div>
        <div class="w-full" style="height:480px"><canvas id="regionChart"></canvas></div>
      </div>

      <!-- ADMISSION SOURCES: AFTER REGIONAL DISTRIBUTION -->
      <section aria-labelledby="admission-sources-title" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <h3 id="admission-sources-title" class="text-sm font-bold text-slate-800 uppercase tracking-wider">${t('dashboard.admissionSources')}</h3>
        <p class="text-xs text-slate-500 mt-2 mb-5">${t('dashboard.admissionSourceNote')}</p>
        ${DashboardPage.renderSourceFilters(profile)}
        <div id="admission-sources-content">${DashboardPage.renderAdmissionSources(null)}</div>
      </section>

      ${typeof TreatmentFlow !== 'undefined' ? TreatmentFlow.shell() : ''}

      <!-- ROW 5: AGE-SEX PYRAMID -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div id="pyramid-infarkt"></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div id="pyramid-insult"></div>
        </div>
      </div>

      <!-- ROW: RISK FACTORS DONUT CHARTS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${icon('heart', 16, 'text-red-500')} ${t('dashboard.infarctRisk')}
          </h3>
          <div style="position:relative;height:380px">
            <canvas id="riskInfarktChart"></canvas>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${icon('brain', 16, 'text-blue-500')} ${t('dashboard.strokeRisk')}
          </h3>
          <div style="position:relative;height:380px">
            <canvas id="riskInsultChart"></canvas>
          </div>
        </div>
      </div>

      <!-- ROW 4: DETAILED CLINICAL INDICATORS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Infarkt Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-red-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('heart-pulse', 20, 'text-red-500')} ${t('dashboard.infarctTreatments')}</h3>
            <span class="text-[10px] font-bold text-slate-400">${t('dashboard.treatmentMortality')}</span>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${this.renderDetailCard('STEMI', stats.stemi ?? 0, stats.stemiDavol ?? 0, stats.stemiVafot ?? 0)}
            ${this.renderDetailCard('NSTEMI', stats.nstemi ?? 0, stats.nstemiDavol ?? 0, stats.nstemiVafot ?? 0)}
            ${this.renderDetailCard("O'tkir miokard infarkti (AMI)", stats.miokard ?? 0, stats.miokardDavol ?? 0, stats.miokardVafot ?? 0)}
            ${this.renderDetailCard('Koronarangiografiya', stats.koronar ?? 0, stats.koronarDavol ?? 0, stats.koronarVafot ?? 0)}
            ${this.renderDetailCard('Trombolizis (TLT)', stats.trombolizis ?? 0, stats.trombolizisDavol ?? 0, stats.trombolizisVafot ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.medikamentoz ?? 0, stats.medikamentozDavol ?? 0, stats.medikamentozVafot ?? 0)}
          </div>
        </div>

        <!-- Stroke Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-blue-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('brain-circuit', 20, 'text-blue-500')} ${t('dashboard.strokeTreatments')}</h3>
            <span class="text-[10px] font-bold text-slate-400">${t('dashboard.treatmentMortality')}</span>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${this.renderDetailCard('Ishemik insult', stats.ishemik ?? 0, stats.ishemikDavol ?? 0, stats.ishemikVafot ?? 0)}
            ${this.renderDetailCard('Gemorragik insult', stats.gemorragik ?? 0, stats.gemorragikDavol ?? 0, stats.gemorragikVafot ?? 0)}
            ${this.renderDetailCard('Tranzitor ishemik ataka (TIA)', stats.tia ?? 0, stats.tiaDavol ?? 0, stats.tiaVafot ?? 0)}
            ${this.renderDetailCard('MSKT bosh miya', stats.mskt ?? 0, stats.msktDavol ?? 0, stats.msktVafot ?? 0)}
            ${this.renderDetailCard('Trombektomiya', stats.trombektomiya ?? 0, stats.trombektomiyaDavol ?? 0, stats.trombektomiyaVafot ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.insultMedikamentoz ?? 0, stats.insultMedikamentozDavol ?? 0, stats.insultMedikamentozVafot ?? 0)}
          </div>
        </div>
      </div>



      <!-- ROW 6: 15+ KUN DAVOLANAYOTGANLAR -->
      <div class="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-orange-50 flex items-center justify-between bg-orange-50/50">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">${icon('clock', 18)}</div>
            <div>
              <h3 class="font-bold text-slate-800">${t('dashboard.longStay')}</h3>
              <p class="text-[11px] text-slate-400 font-medium">${t('dashboard.longStaySubtitle')}</p>
            </div>
          </div>
          <span id="longstay-count" class="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-black rounded-xl border border-orange-200">${t('ui.loadingLower')}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('wizard.institution')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.patientCount')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.longestStay')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.infarctStroke')}</th>
                <th class="p-4 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody id="longstay-body" class="text-sm divide-y divide-slate-50">
              ${longStay.map((g, idx) => {
                const inf = g.bemorlar.filter(b=>b._type==='infarkt').length;
                const ins = g.bemorlar.filter(b=>b._type==='insult').length;
                const maxDays = Math.max(...g.bemorlar.map(b=>b.kunlar));
                return `
                <tr class="hover:bg-orange-50/30 transition-colors">
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center">${icon('building-2', 14)}</div>
                      <span class="font-bold text-slate-700">${esc(I18n.facilityName(g.muassasa))}</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-black">${I18n.plural(g.bemorlar.length)}</span>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-black">${t('dashboard.daysCount', { count: maxDays })}</span>
                  </td>
                  <td class="p-4">
                    <div class="flex gap-2">
                      ${inf > 0 ? `<span class="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold">${t('dashboard.infarctCount', { count: inf })}</span>` : ''}
                      ${ins > 0 ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold">${t('dashboard.strokeCount', { count: ins })}</span>` : ''}
                    </div>
                  </td>
                  <td class="p-4 text-right">
                    <button class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick="DashboardPage.showLongStayDetail(${idx})">
                      ${t('dashboard.view')}
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ROW 7: PATIENT LIST TABLE -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">${t('dashboard.recentAdmissions')}</h3>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-100 transition-all" onclick="Router.go('bemorlar')">
              ${icon('clipboard-list', 14)} ${t('dashboard.viewAll')}
            </button>
            <button class="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold text-green-700 flex items-center gap-1.5 hover:bg-green-100 transition-all" onclick="DashboardPage.exportExcel()">
              ${icon('file-down', 14)} Excel
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('ui.recordNumber')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('ui.patientName')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.diagnosis')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('ui.admissionTime')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.status')}</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">${t('dashboard.dataQualityShort')}</th>
                <th class="p-4 text-right border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody id="recent-patients-body" class="text-sm">
              ${DashboardPage._renderRecentRows(recent)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    DashboardPage._longStayData = longStay;

    // Initialize Charts
    requestAnimationFrame(() => {
      initIcons();
      setTimeout(() => {
        DashboardPage.drawNewCharts(trend, trend12, stats, viloyat, demo, profile, riskFactors);
        // Age-Sex Pyramids
        const ageSex = DashboardPage._ageSex;
        if (ageSex && typeof AgePyramid !== 'undefined') {
          AgePyramid.render('pyramid-infarkt', ageSex.infarkt, 'INFARKT', '#dc2626', stats.jamiInfarkt, 'infarkt');
          AgePyramid.render('pyramid-insult',  ageSex.insult,  'INSULT',  '#2563eb', stats.jamiInsult, 'insult');
        }
      }, 300);
    });
  },

  setViewViloyat(viloyat) {
    DashboardPage._viewViloyat = viloyat;
    DashboardPage._viewMuassasa = undefined;
    DashboardPage.loadData();
  },

  setViewMuassasa(muassasa) {
    DashboardPage._viewMuassasa = muassasa;
    DashboardPage._viewViloyat = undefined;
    DashboardPage.loadData();
  },

  setDateFilter(from, to, mode) {
    DashboardPage._viewDateFrom = from;
    DashboardPage._viewDateTo   = to;
    DashboardPage._viewDateMode = mode || null;
    if (mode === 'year' && from) {
      // from = UTC ISO, lekin UZT da yil boshidan — UTC+5 da yilni olish kerak
      DashboardPage._viewSelectedYear = new Date(new Date(from).getTime() + 5*3600000).getUTCFullYear();
    } else if (mode === 'month' && from) {
      // Oy tanlanganda _viewSelectedYear o'zgarmaydi — qaysi yil oylaridan ekanini saqlab qo'yamiz
    } else if (!from) {
      DashboardPage._viewSelectedYear = null;
    }
    DashboardPage.loadData();
  },

  setChartMode(mode) {
    DashboardPage._chartMode = mode;
    const active = 'px-3 py-1.5 bg-blue-600 text-white transition-all text-xs font-bold';
    const inactive = 'px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all text-xs font-bold';
    const btnAbs   = document.getElementById('toggleAbs');
    const btn18    = document.getElementById('toggle100k18');
    const btn30    = document.getElementById('toggle100k30');
    if (btnAbs) btnAbs.className = mode === 'abs' ? active : inactive;
    if (btn18)  btn18.className  = mode === '100k18' ? active : inactive;
    if (btn30)  btn30.className  = mode === '100k30' ? active : inactive;
    if (DashboardPage._buildRegionChart) DashboardPage._buildRegionChart(mode);
  },

  showLongStayDetail(idx) {
    const group = (DashboardPage._longStayData || [])[idx];
    if (!group) return;
    const rows = group.bemorlar.sort((a, b) => b.kunlar - a.kunlar).map(b => `
      <tr class="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onclick="closeModal(); Router.go('bemor-karta',{kt_no:'${b.kt_no}', type:'${b._type}'})">
        <td class="p-3 font-mono text-[11px] text-slate-500">${esc(b.kt_no)}</td>
        <td class="p-3 font-bold text-slate-700">${esc(b.fio || '—')}</td>
        <td class="p-3 text-slate-500 text-xs">${t('dashboard.ageYears', { age: Utils.calculateAge(b.tugilgan_yil) || '—' })}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 ${b._type==='infarkt'?'bg-red-50 text-red-600 border-red-100':'bg-blue-50 text-blue-600 border-blue-100'} text-[10px] font-bold rounded border uppercase">${b._type}</span>
        </td>
        <td class="p-3 text-xs text-slate-500">${Utils.formatDate(b.qabul_vaqt)}</td>
        <td class="p-3">
          <span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-black">${t('dashboard.daysCount', { count: b.kunlar })}</span>
        </td>
      </tr>
    `).join('');
    showModal({
      title: t('dashboard.longStayTitle', { facility: esc(I18n.facilityName(group.muassasa)) }),
      size: 'lg',
      body: `
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead><tr class="bg-slate-50">
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('ui.recordNumber')}</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('ui.fullName')}</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('dashboard.age')}</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('ui.typeLabel')}</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('ui.admissionTime')}</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">${t('ui.days')}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `
    });
    initIcons();
  },


  renderDetailCard(label, val, davol = null, vafot = null) {
    const hasSub = davol !== null && vafot !== null;
    return `
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
        <p class="text-[11px] font-bold text-slate-600 uppercase mb-2 group-hover:text-blue-600 transition-colors leading-tight">${esc(I18n.translateText(label))}</p>
        <p class="text-2xl font-black text-slate-900 mb-2">${val.toLocaleString()}</p>
        ${hasSub ? `
        <div class="flex gap-2 mt-1">
          <span class="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-2 py-0.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${t('dashboard.treatedCount', { count: I18n.formatNumber(davol) })}
          </span>
          <span class="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            ${t('dashboard.deathCount', { count: I18n.formatNumber(vafot) })}
          </span>
        </div>` : ''}
      </div>
    `;
  },


  drawNewCharts(trend, trend12, stats, viloyat, demo, profile, riskFactors) {
    // Register datalabels only in each chart's plugins array below.
    // Phase 2 can create donuts first; late global registration attaches the
    // plugin to those already-animating charts without its initialized state.

    // 1. Dynamics Chart
    const ctxD = document.getElementById('dynamicsChart')?.getContext('2d');
    if (ctxD) {
      if (DashboardPage._charts.dynamics) { DashboardPage._charts.dynamics.destroy(); delete DashboardPage._charts.dynamics; }
      DashboardPage._charts.dynamics = new Chart(ctxD, {
        type: 'line',
        data: {
          labels: trend.labels,
          datasets: [
            { label: t('glossary.infarction'), data: trend.infData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 3 },
            { label: t('glossary.stroke'),  data: trend.insData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 3 }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: window.ChartDataLabels ? {
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              align: 'top',
              anchor: 'end',
              color: ctx => ctx.datasetIndex === 0 ? '#ef4444' : '#3b82f6',
              font: { weight: 'bold', size: 11 },
              formatter: v => v > 0 ? v : ''
            } : { display: false }
          },
          scales: {
            x: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 12, weight: '600' } } },
            y: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 12, weight: '600' } }, beginAtZero: true }
          }
        }
      });
    }

    // 2. Region/Facility Distribution Chart
    const ctxR = document.getElementById('regionChart')?.getContext('2d');
    if (ctxR) {
      // super_admin bo'lmasa — muassasalar bo'yicha ko'rsatish (viloyat[] dan keladi)
      const isSuperAdminView = profile?.role === 'super_admin' && !DashboardPage._viewViloyat;

      const regionData = (isSuperAdminView
        ? // Super admin, viloyat tanlanmagan: viloyatlar bo'yicha ko'rsat
          (APP_CONFIG.VILOYATLAR || []).map(rName => {
            const found = (viloyat || []).find(v => v[0] === rName);
            return found ? { name: rName, total: found[1], inf: found[2]||0, ins: found[3]||0 } : { name: rName, total: 0, inf: 0, ins: 0 };
          }).filter(v => v.total > 0)
        : (() => {
            // Viloyat tanlangan: o'sha viloyat muassasalarini ko'rsat
            // viloyat array endi muassasa nomlarini qaytaradi (get_viloyat_stats muassasa bo'yicha)
            const selectedViloyat = DashboardPage._viewViloyat || profile?.viloyat;
            const configNames = APP_CONFIG.MUASSASALAR[selectedViloyat] || [];
            // DB dan kelgan ma'lumotlar (muassasa nomi bo'yicha)
            const fromDb = (viloyat || []).map(v => Array.isArray(v) ? { name: v[0], total: v[1], inf: v[2]||0, ins: v[3]||0 } : v);
            // Faqat shu viloyat muassasalarini filter qil
            const dbFiltered = fromDb.filter(v => configNames.includes(v.name));
            const dbNames = new Set(dbFiltered.map(v => v.name));
            const extra = configNames.filter(n => !dbNames.has(n)).map(n => ({ name: n, total: 0, inf: 0, ins: 0 }));
            return [...dbFiltered, ...extra];
          })()
      ).sort((a, b) => b.total - a.total);

      DashboardPage._regionData = regionData;
      DashboardPage._regionProfile = profile;

      const aholi18 = APP_CONFIG.AHOLI_18PLUS || {};
      const aholi30 = APP_CONFIG.AHOLI_30PLUS || {};
      const getChartData = (mode) => {
        if (mode === '100k18' || mode === '100k') {
          return regionData.map(v => {
            const pop = aholi18[v.name] || 0;
            return {
              inf: pop > 0 ? +((v.inf / pop) * 100000).toFixed(2) : 0,
              ins: pop > 0 ? +((v.ins / pop) * 100000).toFixed(2) : 0
            };
          });
        }
        if (mode === '100k30') {
          return regionData.map(v => {
            const pop = aholi30[v.name] || 0;
            return {
              inf: pop > 0 ? +((v.inf / pop) * 100000).toFixed(2) : 0,
              ins: pop > 0 ? +((v.ins / pop) * 100000).toFixed(2) : 0
            };
          });
        }
        return regionData.map(v => ({ inf: v.inf, ins: v.ins }));
      };

      const buildRegionChart = (mode) => {
        if (DashboardPage._charts.region) {
          DashboardPage._charts.region.destroy();
          delete DashboardPage._charts.region;
        }
        const d = getChartData(mode);
        const is100k = mode === '100k18' || mode === '100k' || mode === '100k30';
        const titleText = mode === '100k30' ? t('dashboard.rate30') : t('dashboard.rate18');
        DashboardPage._charts.region = new Chart(ctxR, {
          type: 'bar',
          data: {
            labels: regionData.map(v => isSuperAdminView ? I18n.translateText(v.name) : I18n.facilityName(v.name)),
            datasets: [
              { label: t('glossary.infarction'), data: d.map(v => v.inf), backgroundColor: '#dc2626', borderRadius: 4, borderSkipped: false },
              { label: t('glossary.stroke'),  data: d.map(v => v.ins), backgroundColor: '#2563eb', borderRadius: 4, borderSkipped: false }
            ]
          },
          plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
          options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 32, bottom: 10, left: 4, right: 4 } },
            plugins: {
              legend: {
                display: true, position: 'top', align: 'end',
                labels: { usePointStyle: true, pointStyle: 'rect', font: { weight: '700', size: 12 }, color: '#475569', padding: 20 }
              },
              tooltip: {
                callbacks: {
                  afterBody: (items) => {
                    if (!is100k) return [];
                    const idx = items[0]?.dataIndex;
                    const v = regionData[idx];
                    const pop = (aholi18 || {})[v?.name];
                    return pop ? [t('dashboard.population18', { count: I18n.formatNumber(pop) })] : [];
                  }
                }
              },
              datalabels: window.ChartDataLabels ? {
                anchor: 'end', align: 'top',
                display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                color: ctx => ctx.datasetIndex === 0 ? '#dc2626' : '#2563eb',
                font: { weight: 'bold', size: 11 },
                formatter: v => v > 0 ? v : ''
              } : { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 12, weight: '600' }, maxRotation: 45, minRotation: 45, autoSkip: false, color: '#475569' }
              },
              y: {
                grid: { borderDash: [5,5], color: '#e2e8f0' },
                ticks: { font: { size: 12, weight: '600' } },
                beginAtZero: true,
                title: { display: is100k, text: titleText, font: { size: 11 }, color: '#64748b' }
              }
            }
          }
        });
      };

      buildRegionChart(DashboardPage._chartMode);
      DashboardPage._buildRegionChart = buildRegionChart;
    }

    // 2b. Monthly Trend Chart
    const ctxM = document.getElementById('monthlyChart')?.getContext('2d');
    if (ctxM && trend12) {
      if (DashboardPage._charts.monthly) { DashboardPage._charts.monthly.destroy(); delete DashboardPage._charts.monthly; }
      DashboardPage._charts.monthly = new Chart(ctxM, {
        type: 'bar',
        data: {
          labels: trend12.labels.map(label => I18n.monthLabel(label)),
          datasets: [
            { label: t('glossary.infarction'), data: trend12.infData, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 5, borderSkipped: false },
            { label: t('glossary.stroke'),  data: trend12.insData, backgroundColor: 'rgba(59,130,246,0.85)', borderRadius: 5, borderSkipped: false }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 30, bottom: 4, left: 4, right: 4 } },
          plugins: {
            legend: { display: false },
            datalabels: window.ChartDataLabels ? {
              anchor: 'end', align: 'top',
              clamp: true,
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              color: ctx => ctx.datasetIndex === 0 ? '#dc2626' : '#2563eb',
              font: { weight: 'bold', size: 11 },
              formatter: v => v > 0 ? v : ''
            } : { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#475569' } },
            y: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true }
          }
        }
      });
    }

  },

  _drawDonut(canvasId, legendId, data, baseColor, patientCount) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || !data.length) return;
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    const ctx = canvas.getContext('2d');

    const COLORS = [
      '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
      '#06b6d4','#f97316','#ec4899','#94a3b8'
    ];

    // Faqat TOP 8, qolganlarini "Boshqalar" ga birlashtirish
    const TOP = 8;
    let displayData = data;
    if (data.length > TOP) {
      const top8 = data.slice(0, TOP);
      const othersSum = data.slice(TOP).reduce((s, [, v]) => s + v, 0);
      displayData = othersSum > 0 ? [...top8, [t('risk.other'), othersSum]] : top8;
    }
    data = displayData.map(([label, count]) => [I18n.translateText(label), count]);

    const total = data.reduce((s, [, v]) => s + v, 0);

    // Outside pointer labels via custom plugin
    const outsideLabelsPlugin = {
      id: 'outsideLabels_' + canvasId,
      afterDraw(chart) {
        const { ctx: c, width: canvasW, height: canvasH } = chart;
        const { top, left, width, height } = chart.chartArea;
        const cx = left + width / 2;
        const cy = top + height / 2;
        const meta = chart.getDatasetMeta(0);
        const outerR = meta.data[0]?.outerRadius || (Math.min(width, height) / 2 * 0.62);
        const lineLen = 14;
        const extLen = 8;
        const MARGIN = 4; // canvas chetidan minimal masofa
        const MAX_LABEL = 22; // maksimal harf soni

        c.save();
        c.font = '600 10.5px Inter, system-ui, sans-serif';
        c.textBaseline = 'middle';

        meta.data.forEach((arc, i) => {
          const [label, val] = data[i];
          if (val === 0) return;

          const midAngle = (arc.startAngle + arc.endAngle) / 2;
          const cos = Math.cos(midAngle);
          const sin = Math.sin(midAngle);

          const x1 = cx + cos * outerR;
          const y1 = cy + sin * outerR;
          const x2 = cx + cos * (outerR + lineLen);
          const y2 = cy + sin * (outerR + lineLen);
          const isRight = cos >= 0;
          const x3 = x2 + (isRight ? extLen : -extLen);
          const y3 = y2;

          // Matn
          const shortLabel = label.length > MAX_LABEL ? label.slice(0, MAX_LABEL) + '…' : label;
          const text = `${shortLabel}  ${val}`;

          // Matn kengligi va canvas cheklovini hisoblaymiz
          c.textAlign = isRight ? 'left' : 'right';
          const textX = x3 + (isRight ? 4 : -4);
          const textW = c.measureText(text).width;

          // Canvas chegarasidan chiqib ketmaslik uchun clipping
          const clipX = isRight ? MARGIN : MARGIN;
          const clipW = canvasW - MARGIN * 2;
          c.save();
          c.beginPath();
          c.rect(clipX, 0, clipW, canvasH);
          c.clip();

          // Leader line
          c.beginPath();
          c.moveTo(x1, y1);
          c.lineTo(x2, y2);
          c.lineTo(x3, y3);
          c.strokeStyle = COLORS[i % COLORS.length];
          c.lineWidth = 1.5;
          c.stroke();

          // Dot
          c.beginPath();
          c.arc(x2, y2, 2, 0, Math.PI * 2);
          c.fillStyle = COLORS[i % COLORS.length];
          c.fill();

          // Text
          c.fillStyle = '#1e293b';
          c.fillText(text, textX, y3);

          c.restore();
        });

        c.restore();
      }
    };

    const displayCount = (patientCount != null && patientCount > 0) ? patientCount : total;
    const centerTextPlugin = {
      id: 'centerText_' + canvasId,
      afterDraw(chart) {
        const { ctx: c, chartArea: { top, left, width, height } } = chart;
        const cx = left + width / 2;
        const cy = top + height / 2;
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#94a3b8';
        c.font = '500 11px Inter, system-ui, sans-serif';
        c.fillText(t('dashboard.totalPatients'), cx, cy - 11);
        c.fillStyle = '#0f172a';
        c.font = '700 22px Inter, system-ui, sans-serif';
        c.fillText(displayCount.toLocaleString(), cx, cy + 10);
        c.restore();
      }
    };

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(([k]) => k),
        datasets: [{
          data: data.map(([, v]) => v),
          backgroundColor: COLORS.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      plugins: [outsideLabelsPlugin, centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        layout: { padding: { top: 50, bottom: 50, left: 110, right: 110 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: item => ` ${item.label}: ${I18n.formatNumber(item.parsed)} (${((item.parsed/total)*100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  },

  async showVafotDetail() {
    showModal({ title: t('dashboard.deaths'), body: `<div class="flex justify-center py-10"><div class="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>` });
    try {
      const sb = getSupabase();
      const vil = DashboardPage._viewViloyat;
      const muassasa = DashboardPage._viewMuassasa;
      const eqV = q => muassasa ? q.eq('muassasa', muassasa) : (vil ? q.eq('viloyat', vil) : q);
      const [infRes, insRes] = await Promise.all([
        eqV(sb.from('infarkt_qabul').select('kt_no,fio,tugilgan_yil,viloyat,muassasa,qabul_vaqt,infarkt_turi').eq('status','vafot')).order('qabul_vaqt',{ascending:false}),
        eqV(sb.from('insult_qabul').select('kt_no,fio,tugilgan_yil,viloyat,muassasa,qabul_vaqt,insult_turi').eq('status','vafot')).order('qabul_vaqt',{ascending:false})
      ]);
      const all = [
        ...(infRes.data||[]).map(p=>({...p,_type:'infarkt',kasallik:p.infarkt_turi||'—'})),
        ...(insRes.data||[]).map(p=>({...p,_type:'insult',kasallik:p.insult_turi||'—'}))
      ].sort((a,b)=>new Date(b.qabul_vaqt)-new Date(a.qabul_vaqt));

      // Viloyat kesimida hisoblash
      const vilMap = {};
      all.forEach(p=>{ const v=p.viloyat||t('dashboard.unknown'); vilMap[v]=(vilMap[v]||0)+1; });
      const vilRows = Object.entries(vilMap).sort((a,b)=>b[1]-a[1])
        .map(([v,c])=>`<div class="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
          <span class="text-sm text-slate-700 font-medium">${esc(I18n.translateText(v))}</span>
          <span class="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">${I18n.formatNumber(c)}</span>
        </div>`).join('');

      const tableRows = all.map(p=>`
        <tr class="border-b border-slate-50 hover:bg-rose-50/30 cursor-pointer transition-colors" onclick="closeModal();Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${p._type}'})">
          <td class="p-2 text-xs font-mono text-slate-500">${esc(p.kt_no)}</td>
          <td class="p-2 text-sm font-semibold text-slate-800">${esc(p.fio||'—')}</td>
          <td class="p-2 text-xs">${p._type==='infarkt'?`<span class="text-red-600 font-bold">${t('glossary.infarction')}</span>`:`<span class="text-blue-600 font-bold">${t('glossary.stroke')}</span>`}</td>
          <td class="p-2 text-xs text-slate-600">${esc(I18n.translateText(p.viloyat||'—'))}</td>
          <td class="p-2 text-xs text-slate-600">${esc(I18n.facilityName(p.muassasa||'—'))}</td>
          <td class="p-2 text-xs text-slate-500">${Utils.formatDateTime(p.qabul_vaqt)}</td>
          <td class="p-2 text-xs text-slate-600">${esc(p.kasallik)}</td>
        </tr>`).join('');

      showModal({
        title: t('dashboard.deceasedTitle', { count: all.length }),
        body: `
          <div class="flex gap-4" style="min-width:min(860px,88vw)">
            <div style="width:210px;flex-shrink:0">
              <div class="font-bold text-slate-600 mb-2 text-xs uppercase tracking-wide">${t('dashboard.byRegion')}</div>
              <div class="bg-slate-50 rounded-xl p-3">${vilRows||`<p class="text-slate-400 text-sm">${t('ui.noDataShort')}</p>`}</div>
            </div>
            <div class="flex-1 overflow-auto" style="max-height:60vh">
              <table class="w-full text-left">
                <thead class="bg-rose-50 sticky top-0">
                  <tr>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('ui.recordNumber')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('ui.fullName')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('ui.typeLabel')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('dashboard.region')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('wizard.institution')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('ui.admissionTime')}</th>
                    <th class="p-2 text-xs font-bold text-slate-500">${t('ui.disease')}</th>
                  </tr>
                </thead>
                <tbody>${tableRows||`<tr><td colspan="7" class="p-4 text-center text-slate-400">${t('ui.noDataShort')}</td></tr>`}</tbody>
              </table>
            </div>
          </div>`
      });
    } catch(err) {
      showModal({ title: t('dashboard.error'), body: `<p class="text-red-500 p-4">${esc(err.message)}</p>` });
    }
  },

  exportExcel() {
    const data = DashboardPage._recentPatients;
    if (!data?.length) { showToast(t('dashboard.dataNotLoaded'), 'warning'); return; }
    Utils.exportCSV(data.map(p => ({
      [t('ui.typeLabel')]: p._type === 'infarkt' ? t('glossary.infarction') : t('glossary.stroke'),
      [t('ui.recordNumber')]: p.kt_no,
      [t('ui.fullName')]: p.fio || '—',
      [t('dashboard.region')]: I18n.translateText(p.viloyat || '—'),
      [t('wizard.institution')]: I18n.facilityName(p.muassasa || '—'),
      [t('ui.admissionTime')]: Utils.formatDateTime(p.qabul_vaqt),
      [t('dashboard.status')]: I18n.translateText(p.status || '—'),
      [t('dashboard.diseaseType')]: I18n.translateText(p.infarkt_turi || p.insult_turi || '—'),
      [t('ui.treatment')]: I18n.translateText(p.muolaja_turi || '—')
    })), `dashboard_bemorlar_${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}.csv`);
    showToast(t('dashboard.exportStarted'), 'success');
  },

  subscribeRealtime() {
    // Realtime va polling o'chirildi — resurs tejash uchun (Nano plan)
    // Ma'lumotlarni yangilash uchun sahifadagi "Yangilash" tugmasini ishlating
  },

  _renderRecentRows(patients) {
    return patients.map(p => {
      const rawDiag = p._type==='infarkt' ? (p.infarkt_turi || 'Miokard Infarkti') : (p.insult_turi || 'Ishemik Insult');
      const diagnosis = rawDiag.toUpperCase();
      let fDiag = I18n.translateText(rawDiag);
      if (diagnosis.includes('NSTEMI')) fDiag = t('infarct.nstemi');
      else if (diagnosis.includes('STEMI')) fDiag = t('infarct.stemi');
      else if (diagnosis.includes('MIOKARD INFARKTI') || diagnosis.includes('AMI')) fDiag = t('clinical.amiLabel');
      else if (diagnosis.includes('TIA') || diagnosis.includes('TRANZITOR')) fDiag = t('clinical.tiaLabel');
      else if (diagnosis.includes('GEMORRAGIK')) fDiag = t('stroke.hemorrhagic');
      else if (diagnosis.includes('ISHEMIK')) fDiag = t('stroke.ischemic');
      return `
      <tr class="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors" onclick="Router.go('bemor-karta',{kt_no:'${esc(p.kt_no)}', type:'${esc(p._type)}'})">
        <td class="p-4 text-slate-500 font-mono text-[11px]">${p.kt_no}</td>
        <td class="p-4">
          <div class="font-bold text-slate-800">${p.fio || '—'}</div>
          <div class="text-[10px] text-slate-400 font-medium uppercase mt-0.5">${t('dashboard.ageYears', { age: Utils.calculateAge(p.tugilgan_yil) || '—' })} · ${(p.jins||p.jinsi)==='Erkak'?'E':'A'}</div>
        </td>
        <td class="p-4">
          <span class="px-2 py-0.5 ${p._type==='infarkt' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'} text-[10px] font-bold rounded border uppercase">
            ${fDiag}
          </span>
        </td>
        <td class="p-4">
          <div class="text-slate-700 font-medium">${Utils.formatDate(p.qabul_vaqt)}</div>
          <div class="text-[10px] text-slate-400 font-bold">${Utils.formatDateTime(p.qabul_vaqt).split(', ')[1] || ''}</div>
        </td>
        <td class="p-4">${Utils.statusBadge(p.status)}</td>
        <td class="p-4">
          <span class="text-[10px] font-bold text-slate-300">—</span>
        </td>
        <td class="p-4 text-right text-slate-300">${icon('chevron-right', 20)}</td>
      </tr>`;
    }).join('');
  },

  renderKpiCards(stats, trend, demo) {
    // Stat Values Calculation
    const jami = stats.jami || 0;
    const jamiInfarkt = stats.jamiInfarkt || 0;
    const jamiInsult = stats.jamiInsult || 0;

    const aktivInfarkt = stats.infarktAktiv || 0;
    const aktivInsult = stats.insultAktiv || 0;

    const vafotInfarkt = stats.vafotInfarkt || 0;
    const vafotInsult = stats.vafotInsult || 0;

    const chiqarilganInfarkt = stats.chiqarilganInfarkt || 0;
    const chiqarilganInsult = stats.chiqarilganInsult || 0;
    const otkazilganInfarkt = stats.otkazilganInfarkt || 0;
    const otkazilganInsult = stats.otkazilganInsult || 0;

    const bugunInfarkt = stats.infarktBugun || 0;
    const bugunInsult = stats.insultBugun || 0;
    const bugunJami = bugunInfarkt + bugunInsult;

    // Aholi hisoblash
    const aholiMap18 = APP_CONFIG.AHOLI_18PLUS || {};
    const aholiMap30 = APP_CONFIG.AHOLI_30PLUS || {};
    const viewVil = DashboardPage._viewViloyat;
    const jamiAholi18 = viewVil
      ? (aholiMap18[viewVil] || 0)
      : Object.values(aholiMap18).reduce((a, b) => a + b, 0);
    const jamiAholi30 = viewVil
      ? (aholiMap30[viewVil] || 0)
      : Object.values(aholiMap30).reduce((a, b) => a + b, 0);
    const per100k18 = jamiAholi18 > 0 ? +((jami / jamiAholi18) * 100000).toFixed(1) : null;
    const per100k30 = jamiAholi30 > 0 ? +((jami / jamiAholi30) * 100000).toFixed(1) : null;

    // Haftalik trend
    const spark7 = trend ? trend.infData.slice(-7).map((v,i) => v + (trend.insData[trend.insData.length-7+i]||0)) : [];
    const thisWeek = spark7.reduce((a,b) => a+b, 0);
    const prevWeek = trend ? (trend.infData.slice(-14,-7).map((v,i) => v + (trend.insData[trend.insData.length-14+i]||0))).reduce((a,b)=>a+b,0) : 0;
    const weekDiff = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null;

    const renderSparkline = _dashSparkline;

    return `
        <!-- 1. Jami Qabul Qilingan Bemorlar -->
        <div class="bg-slate-700 p-7 rounded-[32px] border border-slate-600 shadow-2xl hover:shadow-slate-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl group-hover:bg-slate-500/20 transition-all"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-slate-500/20 text-slate-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('database', 26)}</div>
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">${t('dashboard.totalBadge')}</span>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.admittedTotal')}</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${jami.toLocaleString()}</h3>
          ${weekDiff !== null ? `<div class="mt-1 relative z-10"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${weekDiff > 0 ? 'bg-red-500/20 text-red-300' : weekDiff < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}">${weekDiff > 0 ? '▲' : weekDiff < 0 ? '▼' : '→'} ${t('dashboard.weekChange', { value: Math.abs(weekDiff) })}</span></div>` : '<div class="mt-1"></div>'}
          ${jamiAholi18 > 0 ? `
          <div class="mt-2 relative z-10 flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-black text-indigo-200">${per100k18}</span>
              <span class="text-xs text-slate-400 font-semibold">${t('dashboard.populationRate')}</span>
              <span class="text-[10px] text-slate-500 ml-auto">${(jamiAholi18/1000000).toFixed(2)} mln <span class="text-indigo-400">18+</span></span>
            </div>
            ${jamiAholi30 > 0 ? `<div class="flex items-center gap-2">
              <span class="text-base font-black text-amber-300">${per100k30}</span>
              <span class="text-xs text-slate-400 font-semibold">${t('dashboard.populationRate')}</span>
              <span class="text-[10px] text-slate-500 ml-auto">${(jamiAholi30/1000000).toFixed(2)} mln <span class="text-amber-400">30+</span></span>
            </div>` : ''}
          </div>` : '<div class="mt-2"></div>'}
          <div class="mt-auto pt-3 flex gap-2 relative z-10">
            <div class="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <div class="flex items-center gap-1.5 mb-1"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[11px] font-bold text-red-300">${t('glossary.infarction')}</span></div>
              <div class="text-xl font-black text-white">${jamiInfarkt}</div>
              ${jamiAholi18 > 0 ? `<div class="text-[10px] text-red-400 font-semibold mt-0.5">${+((jamiInfarkt/jamiAholi18)*100000).toFixed(1)}/100k <span class="text-slate-500">18+</span>${jamiAholi30>0?' · '+((jamiInfarkt/jamiAholi30)*100000).toFixed(1)+'/100k <span class="text-slate-500">30+</span>':''}</div>` : ''}
            </div>
            <div class="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
              <div class="flex items-center gap-1.5 mb-1"><span class="w-2 h-2 bg-blue-400 rounded-full"></span><span class="text-[11px] font-bold text-blue-300">${t('glossary.stroke')}</span></div>
              <div class="text-xl font-black text-white">${jamiInsult}</div>
              ${jamiAholi18 > 0 ? `<div class="text-[10px] text-blue-400 font-semibold mt-0.5">${+((jamiInsult/jamiAholi18)*100000).toFixed(1)}/100k <span class="text-slate-500">18+</span>${jamiAholi30>0?' · '+((jamiInsult/jamiAholi30)*100000).toFixed(1)+'/100k <span class="text-slate-500">30+</span>':''}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- 2. Bugungi Yangi Bemorlar -->
        <div class="bg-blue-600 p-7 rounded-[32px] shadow-2xl shadow-blue-900/30 hover:shadow-blue-500/40 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -right-16 -bottom-16 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500">${icon('activity', 26)}</div>
            <span class="text-[11px] font-black text-blue-100 uppercase tracking-[0.2em]">${t('dashboard.todayBadge')}</span>
          </div>
          <p class="text-blue-100/80 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.newAdmissions')}</p>
          <h3 class="text-6xl font-black text-white tracking-tighter relative z-10">${bugunJami}</h3>
          <div class="mt-2 relative z-10 flex items-center gap-2">
            ${renderSparkline(spark7, 'rgba(255,255,255,0.8)')}
            <span class="text-[10px] text-blue-200 font-semibold">${t('dashboard.sevenDays')}</span>
          </div>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full"></span><span class="text-[12px] font-bold text-white">${t('glossary.infarction')}</span></div>
              <span class="text-base font-black text-white">${bugunInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white/50 rounded-full"></span><span class="text-[12px] font-bold text-blue-100">${t('glossary.stroke')}</span></div>
              <span class="text-base font-black text-white">${bugunInsult}</span>
            </div>
          </div>
        </div>

        <!-- 3. Jami Chiqarilgan Bemorlar -->
        <div class="bg-emerald-900 p-7 rounded-[32px] border border-emerald-800 shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('log-out', 26)}</div>
            <span class="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">${t('dashboard.dischargeBadge')}</span>
          </div>
          <p class="text-emerald-500/60 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.homeDischarge')}</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(chiqarilganInfarkt + chiqarilganInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[12px] font-bold text-emerald-100">${t('glossary.infarction')}</span></div>
              <span class="text-base font-black text-white">${chiqarilganInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-400 rounded-full"></span><span class="text-[12px] font-bold text-emerald-100">${t('glossary.stroke')}</span></div>
              <span class="text-base font-black text-white">${chiqarilganInsult}</span>
            </div>
          </div>
        </div>

        <!-- 4. Statsionarda Davolanayotganlar -->
        <div class="bg-sky-800 p-7 rounded-[32px] border border-sky-700 shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute right-0 bottom-0 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-sky-500/20 text-sky-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('bed-double', 26)}</div>
            <span class="text-[11px] font-black text-sky-300 uppercase tracking-[0.2em]">${t('dashboard.activeBadge')}</span>
          </div>
          <p class="text-sky-300/70 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.inHospital')}</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(aktivInfarkt + aktivInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-sky-700/50 rounded-xl border border-sky-600/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[12px] font-bold text-sky-100">${t('glossary.infarction')}</span></div>
              <span class="text-base font-black text-white">${aktivInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-sky-700/50 rounded-xl border border-sky-600/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-300 rounded-full"></span><span class="text-[12px] font-bold text-sky-100">${t('glossary.stroke')}</span></div>
              <span class="text-base font-black text-white">${aktivInsult}</span>
            </div>
          </div>
        </div>

        <!-- 5. Jami Vafot Etganlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col" onclick="DashboardPage.showVafotDetail()">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('user-x', 26)}</div>
            <div class="px-3 py-1 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span class="text-sm font-black text-rose-500">${jami > 0 ? ((vafotInfarkt + vafotInsult) / jami * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.deaths')}</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(vafotInfarkt + vafotInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">${t('glossary.infarction')}</span></div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-rose-400">${jamiInfarkt > 0 ? (vafotInfarkt/jamiInfarkt*100).toFixed(1) : 0}%</span>
                <span class="text-base font-black text-white">${vafotInfarkt}</span>
              </div>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">${t('glossary.stroke')}</span></div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-rose-400">${jamiInsult > 0 ? (vafotInsult/jamiInsult*100).toFixed(1) : 0}%</span>
                <span class="text-base font-black text-white">${vafotInsult}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. O'tkazilgan Bemorlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('arrow-right-circle', 26)}</div>
            <div class="px-3 py-1 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span class="text-sm font-black text-amber-500">${jami > 0 ? ((otkazilganInfarkt + otkazilganInsult) / jami * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">${t('dashboard.otherFacility')}</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(otkazilganInfarkt + otkazilganInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">${t('glossary.infarction')}</span></div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-amber-400">${jamiInfarkt > 0 ? (otkazilganInfarkt/jamiInfarkt*100).toFixed(1) : 0}%</span>
                <span class="text-base font-black text-white">${otkazilganInfarkt}</span>
              </div>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">${t('glossary.stroke')}</span></div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-amber-400">${jamiInsult > 0 ? (otkazilganInsult/jamiInsult*100).toFixed(1) : 0}%</span>
                <span class="text-base font-black text-white">${otkazilganInsult}</span>
              </div>
            </div>
          </div>
        </div>
    `;
  }
};
