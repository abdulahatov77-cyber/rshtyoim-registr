// ==================== HISOBOT SAHIFASI ====================

const MUOLAJA_STD = [
  { pattern: /konservativ|bajarilmadi/i, std: "Medikamentoz davo" },
  { pattern: /gemorragik insult bo.yicha jarrohlik|neyrojarrohlik.*gemorragik|jarrohlik.*gemorragik|neyrojarrohlik amaliyoti/i, std: "Gemorragik insult bo'yicha jarrohlik amaliyoti" },
  { pattern: /комбинир|kombinatsiy.*tromboaspirats.*tromboekstr|tromboaspirats.*tromboekstr/i, std: "Kombinatsiyalangan muolaja (tromboaspiratsiya + tromboekstraksiya)" },
  { pattern: /цаг\s*\+\s*тл[тт]|цаг\s*\+\s*тромболиз/i, std: "Serebral angiografiya + TLT (trombolizis)" },
  { pattern: /цаг\s*\+\s*стент/i, std: "Serebral angiografiya + stentlash" },
  { pattern: /цаг\s*\+\s*тромбоаспир/i, std: "Serebral angiografiya + tromboaspiratsiya" },
  { pattern: /цаг\s*\+\s*тромбоэкстр/i, std: "Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)" },
  { pattern: /цаг\s*\+\s*тлбап/i, std: "Serebral angiografiya + TLBAP" },
  { pattern: /serebral angiografiya\s*\+\s*t(lt|rombolit)/i, std: "Serebral angiografiya + TLT (trombolizis)" },
  { pattern: /serebral angiografiya\s*\+\s*tromboekstr/i, std: "Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)" },
  { pattern: /serebral angiografiya\s*\+\s*stent/i, std: "Serebral angiografiya + stentlash" },
  { pattern: /faqat\s*(цаг|serebral)|^цаг$/i, std: "Faqat serebral angiografiya (ЦАГ)" },
  { pattern: /boshqa muassasaga o.tkazildi/i, std: "Boshqa muassasaga o'tkazildi (endovaskulyar muolaja uchun)" },
  { pattern: /o.tkazilmadi/i, std: "Medikamentoz davo" },
  { pattern: /mskt\s*angiograf/i, std: "MSKT angiografiya" },
  { pattern: /\bmskt\b/i, std: "MSKT" },
  { pattern: /koronarangiograf|\bkag\b/i, std: "Koronarangiografiya (KAG)" },
  { pattern: /medikamentoz/i, std: "Medikamentoz davo" },
];

const stdMuolaja = (raw) => {
  const s = (raw || '').trim();
  for (const { pattern, std } of MUOLAJA_STD) {
    if (pattern.test(s)) return std;
  }
  return s;
};

const normMuolajaCounts = (arr) => {
  const map = {};
  arr.forEach(p => {
    if (!p.muolaja_turi) return;
    const std = stdMuolaja(p.muolaja_turi);
    map[std] = (map[std] || 0) + 1;
  });
  return map;
};

const HisobotPage = {
  _charts: {},
  _lastData: null,
  _lastListType: null,
  _savedFilters: null,

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'hisobot', 'Hisobotlar', 'Statistik tahlil va hisobotlar',
      `<div id="hisobot-inner" class="animate-fadein"></div>`, user
    );
    Components.startClock();
    HisobotPage.renderUI(profile);

    // Oldingi hisobot holatini tiklash
    if (HisobotPage._lastData) {
      const f = HisobotPage._savedFilters || {};
      if (f.from)    { const el = document.getElementById('h-from');    if (el) el.value = f.from; }
      if (f.to)      { const el = document.getElementById('h-to');      if (el) el.value = f.to; }
      if (f.ageFrom) { const el = document.getElementById('h-age-from'); if (el) el.value = f.ageFrom; }
      if (f.ageTo)   { const el = document.getElementById('h-age-to');   if (el) el.value = f.ageTo; }
      const { infs, ins, kuzatuv, from, to, ageLabel, locationLabel } = HisobotPage._lastData;
      HisobotPage.renderReport(infs, ins, kuzatuv, from, to, ageLabel, locationLabel || '');
      if (HisobotPage._lastListType) {
        setTimeout(() => HisobotPage.showPatientList(HisobotPage._lastListType), 150);
      }
    }
  },

  renderUI(user) {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now()-30*864e5).toISOString().split('T')[0];
    const inner = document.getElementById('hisobot-inner');
    if (!inner) return;
    const isSuperAdmin = user?.role === 'super_admin';
    const isViloyatAdmin = user?.role === 'admin';
    const isShifokor = user?.role === 'user';
    const myViloyat = user?.viloyat || '';
    // Viloyat admini va shifokor uchun viloyat filtri qullangan
    HisobotPage._myViloyat = myViloyat;
    HisobotPage._isSuperAdmin = isSuperAdmin;
    inner.innerHTML = `
      <style>
        .h-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
          border: 1px solid rgba(226,232,240,0.8);
          margin-bottom: 20px;
        }
        .h-stat {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s;
        }
        .h-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .h-stat-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        .h-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px;
          border-bottom: 1px dashed #cbd5e1;
          transition: background 0.1s;
        }
        .h-row:hover { background: #f1f5f9; border-radius: 8px; }
        .h-row:last-child { border-bottom: none; }
        .h-label { color: #1e3a8a; font-weight: 600; font-size: 14px; }
        .h-val { font-weight: 800; font-size: 15px; }
        .h-title { color: #1e3a8a; font-weight: 800; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        
        .dark-blue-text { color: #1e3a8a; }
      </style>

      <!-- Filter -->
      <div class="h-card">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end mb-4">
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">Davr turi</label>
            <select id="h-period" class="form-select bg-slate-50 text-blue-900 border-blue-200 focus:border-blue-500 font-medium" onchange="HisobotPage.onPeriodChange()">
              <option value="custom">Maxsus sana</option>
              <option value="today">Bugun</option>
              <option value="week">So'nggi 7 kun</option>
              <option value="month" selected>So'nggi 30 kun</option>
              <option value="3month">So'nggi 3 oy</option>
              <option value="6month">So'nggi 6 oy</option>
              <option value="year">So'nggi 1 yil</option>
            </select>
          </div>
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">Dan</label>
            <input id="h-from" type="date" class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium" value="${monthAgo}"/>
          </div>
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">Gacha</label>
            <input id="h-to" type="date" class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium" value="${today}"/>
          </div>
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">${icon('user', 14)} Yosh (dan)</label>
            <input id="h-age-from" type="number" min="0" max="120" placeholder="0"
              class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium"/>
          </div>
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">${icon('user', 14)} Yosh (gacha)</label>
            <input id="h-age-to" type="number" min="0" max="120" placeholder="120"
              class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium"/>
          </div>
        </div>
        <!-- Viloyat va Muassasa filtri -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-4">
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">${icon('map-pin', 14)} Viloyat</label>
            ${isSuperAdmin ? `
            <select id="h-viloyat" class="form-select bg-slate-50 text-blue-900 border-blue-200 font-medium" onchange="HisobotPage.onHViloyatChange(this.value)">
              <option value="">— Barcha viloyatlar —</option>
              ${Object.keys(APP_CONFIG.MUASSASALAR).map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>` : `
            <input id="h-viloyat" type="hidden" value="${myViloyat}"/>
            <div class="form-input bg-slate-100 text-blue-900 border-blue-200 font-semibold cursor-not-allowed opacity-80">${myViloyat || '—'} <span style="font-size:11px;color:#64748b">(qullangan)</span></div>`}
          </div>
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">${icon('building-2', 14)} Muassasa (ixtiyoriy)</label>
            <select id="h-muassasa" class="form-select bg-slate-50 text-blue-900 border-blue-200 font-medium">
              <option value="">— Barcha muassasalar —</option>
              ${(!isSuperAdmin && myViloyat) ? (APP_CONFIG.MUASSASALAR[myViloyat]||[]).map(m=>`<option value="${m}">${m}</option>`).join('') : ''}
            </select>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-primary shadow-md hover:shadow-lg flex items-center justify-center gap-2 px-5 rounded-xl" onclick="HisobotPage.loadReport()">
            ${icon('bar-chart-2', 18)} Ko'rish
          </button>
          <button class="btn btn-success shadow-md hover:shadow-lg flex items-center justify-center gap-2 px-4 rounded-xl" onclick="HisobotPage.exportReport()" title="Eksport (CSV)">
            ${icon('download', 16)} Eksport
          </button>
          <button class="btn btn-secondary shadow-md hover:shadow-lg flex items-center justify-center gap-2 px-4 rounded-xl" onclick="HisobotPage.printReport()" title="Chop etish">
            ${icon('printer', 16)} Chop etish
          </button>
          ${user?.role === 'super_admin' ? `
          <button class="shadow-md hover:shadow-lg flex items-center justify-center gap-2 px-4 rounded-xl font-bold text-white text-sm" style="background:#2481cc;padding-top:8px;padding-bottom:8px" onclick="HisobotPage.sendTelegramReport()" title="Tanlangan davr hisobotini Telegramga yuborish">
            ${icon('send', 16)} Telegram hisobot
          </button>` : ''}
        </div>
      </div>

      ${isSuperAdmin ? `
      <div class="h-card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <h3 class="h-title !mb-1">${icon('table', 18)} Viloyatlar kesimida hisobot</h3>
            <p class="text-sm text-slate-500">Har bir viloyat bo'yicha STEMI/NSTEMI, Ishemik/Gemorragik/TIA va marshrutizatsiya statistikasi</p>
          </div>
          <div class="flex items-center gap-2">
            <input id="vh-from" type="date" class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium" value="${new Date(Date.now()-90*864e5).toISOString().split('T')[0]}"/>
            <span class="text-slate-400">—</span>
            <input id="vh-to" type="date" class="form-input bg-slate-50 text-blue-900 border-blue-200 font-medium" value="${today}"/>
            <button class="btn btn-primary shadow-md hover:shadow-lg flex items-center gap-2 px-4 rounded-xl" onclick="HisobotPage.loadViloyatReport()">
              ${icon('bar-chart-2', 16)} Shakllantirish
            </button>
            <button id="vh-export-btn" class="btn btn-success shadow-md hover:shadow-lg flex items-center gap-2 px-4 rounded-xl" onclick="HisobotPage.exportViloyatReport()" disabled style="opacity:0.5">
              ${icon('download', 16)} Excel
            </button>
          </div>
        </div>
        <div id="vh-results"></div>
        <div id="vh-route-results" class="mt-6"></div>
      </div>` : ''}

      <div id="h-results">
        <div class="h-card text-center py-20 flex flex-col items-center justify-center">
          <div class="text-blue-200 mb-4 animate-pulse">${icon('pie-chart', 64)}</div>
          <h3 class="text-2xl font-bold text-blue-900 mb-2">Hisobotni shakllantirish</h3>
          <p class="text-slate-500">Davrni tanlang va "Ko'rish" tugmasini bosing</p>
        </div>
      </div>
    `;
    initIcons();
  },

  async loadViloyatReport() {
    const from = document.getElementById('vh-from')?.value;
    const to   = document.getElementById('vh-to')?.value;
    if (!from || !to) { showToast('Sana oralig\'ini tanlang', 'warning'); return; }
    const el = document.getElementById('vh-results');
    if (!el) return;
    el.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-blue-900 font-semibold text-sm">Yuklanmoqda...</p>
      </div>`;
    const exportBtn = document.getElementById('vh-export-btn');
    if (exportBtn) { exportBtn.disabled = true; exportBtn.style.opacity = '0.5'; }

    try {
      const fromUTC = new Date(from + 'T00:00:00+05:00').toISOString();
      const toUTC   = new Date(to   + 'T23:59:59+05:00').toISOString();
      const [infResult, insResult] = await Promise.allSettled([
        DB.infarktList({ from: fromUTC, to: toUTC, allCols: true }),
        DB.insultList({ from: fromUTC, to: toUTC, allCols: true })
      ]);
      if (infResult.status === 'rejected') throw new Error('Infarkt ma\'lumotlari yuklanmadi: ' + infResult.reason?.message);
      if (insResult.status === 'rejected') throw new Error('Insult ma\'lumotlari yuklanmadi: ' + insResult.reason?.message);

      const infs = infResult.value?.data || [];
      const ins  = insResult.value?.data || [];

      // Mutually exclusive va to'liq qamrovli — har bir bemor aniq bitta toifaga tushadi, "aniqlanmagan" qolmaydi
      const isSTEMI = p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI');
      const isNSTEMI = p => p.infarkt_turi?.toUpperCase().includes('NSTEMI');
      // Qolgan barcha infarkt yozuvlari (bo'sh yoki noaniq matn) AMI hisoblanadi
      const isAMI = p => !isSTEMI(p) && !isNSTEMI(p);
      const isGemorragik = p => /^gemorragik insult$/i.test((p.insult_turi||'').trim());
      const isTIA        = p => /^tia\b/i.test((p.insult_turi||'').trim());
      // Qolgan barcha insult yozuvlari (bo'sh yoki noaniq matn) Ishemik hisoblanadi
      const isIshemik = p => !isGemorragik(p) && !isTIA(p);

      // STEMI uchun 120 daqiqa (Door-to-Balloon) me'yori: qabul_vaqt -> pci_vaqt farqi
      const pciMinutes = p => {
        if (!p.qabul_vaqt || !p.pci_vaqt) return null;
        const d1 = new Date(p.qabul_vaqt);
        const d2 = new Date(p.pci_vaqt);
        if (isNaN(d1) || isNaN(d2)) return null;
        const diff = (d2 - d1) / 60000;
        return (diff > 0 && diff < 1440) ? diff : null;
      };

      const viloyatlar = APP_CONFIG.VILOYATLAR;
      const rows = viloyatlar.map(vil => {
        const vInfs = infs.filter(p => p.viloyat === vil);
        const vIns  = ins.filter(p => p.viloyat === vil);
        const vStemi = vInfs.filter(isSTEMI);
        const stemiPciFilled = vStemi.filter(p => pciMinutes(p) !== null);
        const stemiUnder120 = stemiPciFilled.filter(p => pciMinutes(p) <= 120);
        return {
          viloyat: vil,
          stemi: vStemi.length,
          nstemi: vInfs.filter(isNSTEMI).length,
          ami: vInfs.filter(isAMI).length,
          jamiInfarkt: vInfs.length,
          ishemik: vIns.filter(isIshemik).length,
          gemorragik: vIns.filter(isGemorragik).length,
          tia: vIns.filter(isTIA).length,
          jamiInsult: vIns.length,
          otkazilganInf: vInfs.filter(p => p.otkazilgan_muassasa).length,
          otkazilganIns: vIns.filter(p => p.otkazilgan_muassasa).length,
          stemi120n: stemiUnder120.length,
          stemi120total: stemiPciFilled.length
        };
      });

      const totals = rows.reduce((acc, r) => {
        for (const k of ['stemi','nstemi','ami','jamiInfarkt','ishemik','gemorragik','tia','jamiInsult','otkazilganInf','otkazilganIns','stemi120n','stemi120total']) {
          acc[k] = (acc[k]||0) + r[k];
        }
        return acc;
      }, {});

      // Marshrutizatsiya zanjiri: bir xil bemor (FIO+tug'ilgan yil) bir nechta muassasada
      // qayd etilgan bo'lsa — TTB -> Politravma -> Angiograf markaz kabi zanjir hisoblanadi
      const routeKey = p => {
        const fio = Utils.normalizeFio((p.fio||'').trim()).toLowerCase().replace(/\s+/g,' ');
        const yil = String(p.tugilgan_yil||'').slice(0,4);
        if (!fio || fio.length < 3 || !yil) return null;
        return `${fio}|${yil}`;
      };
      const allPatients = [
        ...infs.map(p => ({ ...p, _turi: 'infarkt' })),
        ...ins.map(p => ({ ...p, _turi: 'insult' }))
      ];
      const routeGroups = {};
      allPatients.forEach(p => {
        const key = routeKey(p);
        if (!key) return;
        (routeGroups[key] = routeGroups[key] || []).push(p);
      });
      const chains = Object.values(routeGroups)
        .filter(g => g.length > 1)
        .map(g => g.sort((a,b) => new Date(a.qabul_vaqt) - new Date(b.qabul_vaqt)))
        .filter(g => {
          // Faqat turli muassasalardagi yozuvlar — bitta muassasada qayta kiritilgan xato emas
          const muassasalar = new Set(g.map(p => p.muassasa));
          return muassasalar.size > 1;
        });
      const chainStats = chains.map(g => {
        const first = g[0], last = g[g.length-1];
        const totalMin = (new Date(last.qabul_vaqt) - new Date(first.qabul_vaqt)) / 60000;
        return {
          fio: first.fio,
          viloyat: first.viloyat,
          bosqichlar: g.map(p => p.muassasa),
          son: g.length,
          totalMin: totalMin > 0 && totalMin < 2880 ? Math.round(totalMin) : null
        };
      });
      const chainsByViloyat = {};
      chainStats.forEach(c => {
        (chainsByViloyat[c.viloyat] = chainsByViloyat[c.viloyat] || []).push(c);
      });

      HisobotPage._lastChainData = chainStats;

      HisobotPage._lastViloyatData = { rows, totals, from, to };

      el.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr style="background:#1e3a8a">
                <th class="p-2.5 text-left text-white font-bold rounded-tl-lg">Viloyat</th>
                <th class="p-2.5 text-center text-white font-bold">STEMI</th>
                <th class="p-2.5 text-center text-white font-bold">NSTEMI</th>
                <th class="p-2.5 text-center text-white font-bold">AMI</th>
                <th class="p-2.5 text-center text-white font-bold" style="background:#1d4ed8">Jami infarkt</th>
                <th class="p-2.5 text-center text-white font-bold">Ishemik</th>
                <th class="p-2.5 text-center text-white font-bold">Gemorragik</th>
                <th class="p-2.5 text-center text-white font-bold">TIA</th>
                <th class="p-2.5 text-center text-white font-bold" style="background:#1d4ed8">Jami insult</th>
                <th class="p-2.5 text-center text-white font-bold">O'tkazilgan (inf.)</th>
                <th class="p-2.5 text-center text-white font-bold">O'tkazilgan (ins.)</th>
                <th class="p-2.5 text-center text-white font-bold rounded-tr-lg" style="background:#16a34a" title="STEMI bemorlardan necha foizi qabuldan PCI gacha 120 daqiqa ichida yetkazilgan">STEMI ≤120 daq (D2B)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r,i) => `
                <tr style="background:${i%2===0?'#f8fafc':'#ffffff'}" class="hover:bg-blue-50 transition-colors">
                  <td class="p-2.5 font-semibold text-slate-800 border-b border-slate-200">${r.viloyat}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.stemi}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.nstemi}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.ami}</td>
                  <td class="p-2.5 text-center font-bold text-blue-700 border-b border-slate-200">${r.jamiInfarkt}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.ishemik}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.gemorragik}</td>
                  <td class="p-2.5 text-center text-slate-700 border-b border-slate-200">${r.tia}</td>
                  <td class="p-2.5 text-center font-bold text-blue-700 border-b border-slate-200">${r.jamiInsult}</td>
                  <td class="p-2.5 text-center text-orange-600 font-semibold border-b border-slate-200">${r.otkazilganInf}</td>
                  <td class="p-2.5 text-center text-orange-600 font-semibold border-b border-slate-200">${r.otkazilganIns}</td>
                  <td class="p-2.5 text-center font-semibold border-b border-slate-200" style="color:${r.stemi120total===0?'#94a3b8':(r.stemi120n/r.stemi120total>=0.8?'#16a34a':'#dc2626')}">${r.stemi120total>0 ? `${r.stemi120n}/${r.stemi120total} (${Math.round(r.stemi120n/r.stemi120total*100)}%)` : '—'}</td>
                </tr>`).join('')}
              <tr style="background:#dbeafe">
                <td class="p-2.5 font-bold text-blue-900">JAMI</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.stemi}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.nstemi}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.ami}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.jamiInfarkt}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.ishemik}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.gemorragik}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.tia}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.jamiInsult}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.otkazilganInf}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.otkazilganIns}</td>
                <td class="p-2.5 text-center font-bold text-blue-900">${totals.stemi120total>0 ? `${totals.stemi120n}/${totals.stemi120total} (${Math.round(totals.stemi120n/totals.stemi120total*100)}%)` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>`;

      const routeEl = document.getElementById('vh-route-results');
      if (routeEl) {
        const viloyatlarBoFlows = Object.keys(chainsByViloyat).sort();
        if (viloyatlarBoFlows.length === 0) {
          routeEl.innerHTML = `
            <div class="h-card">
              <h3 class="h-title">${icon('route', 18)} Marshrutizatsiya zanjirlari (TTB → Politravma → Angiograf markaz)</h3>
              <p class="text-sm text-slate-500 py-4 text-center">Tanlangan davrda bir nechta muassasadan o'tgan bemor topilmadi</p>
            </div>`;
        } else {
          routeEl.innerHTML = `
            <div class="h-card">
              <h3 class="h-title">${icon('route', 18)} Marshrutizatsiya zanjirlari (TTB → Politravma → Angiograf markaz)</h3>
              <p class="text-sm text-slate-500 mb-3">Bir xil bemor (F.I.O + tug'ilgan yil) bo'yicha bir nechta muassasada qayd etilgan yozuvlar — birinchi qabuldan oxirgi qabulgacha o'tgan vaqt bilan</p>
              ${viloyatlarBoFlows.map(vil => `
                <div class="mb-4">
                  <div class="font-bold text-blue-900 text-sm mb-2">${vil} — ${chainsByViloyat[vil].length} ta zanjir</div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                      <thead>
                        <tr style="background:#f1f5f9">
                          <th class="p-2 text-left font-bold text-slate-600">F.I.O</th>
                          <th class="p-2 text-left font-bold text-slate-600">Bosqichlar</th>
                          <th class="p-2 text-center font-bold text-slate-600">Soni</th>
                          <th class="p-2 text-center font-bold text-slate-600">Jami vaqt</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${chainsByViloyat[vil].map(c => `
                          <tr class="border-b border-slate-100">
                            <td class="p-2 font-semibold text-slate-800">${esc(c.fio)}</td>
                            <td class="p-2 text-slate-600 text-xs">${c.bosqichlar.map(esc).join(' → ')}</td>
                            <td class="p-2 text-center font-bold text-blue-700">${c.son}</td>
                            <td class="p-2 text-center ${c.totalMin && c.totalMin <= 120 ? 'text-green-600' : 'text-orange-600'} font-semibold">${c.totalMin !== null ? c.totalMin + ' daq' : '—'}</td>
                          </tr>`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>`).join('')}
            </div>`;
        }
        initIcons();
      }

      if (exportBtn) { exportBtn.disabled = false; exportBtn.style.opacity = ''; }
    } catch (err) {
      el.innerHTML = `<div class="text-center text-red-600 py-8">${err.message || 'Xatolik yuz berdi'}</div>`;
    }
  },

  exportViloyatReport() {
    const d = HisobotPage._lastViloyatData;
    if (!d) { showToast('Avval hisobotni shakllantiring', 'warning'); return; }
    const data = d.rows.map(r => ({
      'Viloyat': r.viloyat,
      'STEMI': r.stemi,
      'NSTEMI': r.nstemi,
      'AMI': r.ami,
      'Jami infarkt': r.jamiInfarkt,
      'Ishemik insult': r.ishemik,
      'Gemorragik insult': r.gemorragik,
      'TIA': r.tia,
      'Jami insult': r.jamiInsult,
      "O'tkazilgan (infarkt)": r.otkazilganInf,
      "O'tkazilgan (insult)": r.otkazilganIns,
      "STEMI ≤120 daq (D2B)": r.stemi120total>0 ? `${r.stemi120n}/${r.stemi120total} (${Math.round(r.stemi120n/r.stemi120total*100)}%)` : '—'
    }));
    data.push({
      'Viloyat': 'JAMI',
      'STEMI': d.totals.stemi,
      'NSTEMI': d.totals.nstemi,
      'AMI': d.totals.ami,
      'Jami infarkt': d.totals.jamiInfarkt,
      'Ishemik insult': d.totals.ishemik,
      'Gemorragik insult': d.totals.gemorragik,
      'TIA': d.totals.tia,
      'Jami insult': d.totals.jamiInsult,
      "O'tkazilgan (infarkt)": d.totals.otkazilganInf,
      "O'tkazilgan (insult)": d.totals.otkazilganIns,
      "STEMI ≤120 daq (D2B)": d.totals.stemi120total>0 ? `${d.totals.stemi120n}/${d.totals.stemi120total} (${Math.round(d.totals.stemi120n/d.totals.stemi120total*100)}%)` : '—'
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Viloyatlar hisoboti');
    XLSX.writeFile(wb, `viloyatlar_hisobot_${d.from}_${d.to}.xlsx`);
    showToast('✅ Excel fayl yuklab olindi', 'success');
  },

  onPeriodChange() {
    const val = document.getElementById('h-period')?.value;
    const today = new Date();
    let from = new Date();
    if      (val==='today')  { /* from = today */ }
    else if (val==='week')   { from.setDate(today.getDate()-7); }
    else if (val==='month')  { from.setDate(today.getDate()-30); }
    else if (val==='3month') { from.setMonth(today.getMonth()-3); }
    else if (val==='6month') { from.setMonth(today.getMonth()-6); }
    else if (val==='year')   { from.setFullYear(today.getFullYear()-1); }
    else return;
    document.getElementById('h-from').value = from.toISOString().split('T')[0];
    document.getElementById('h-to').value = today.toISOString().split('T')[0];
  },

  onHViloyatChange(viloyat) {
    const sel = document.getElementById('h-muassasa');
    if (!sel) return;
    const muassasalar = APP_CONFIG.MUASSASALAR[viloyat] || [];
    sel.innerHTML = `<option value="">— Barcha muassasalar —</option>` +
      muassasalar.map(m => `<option value="${m}">${m}</option>`).join('');
  },

  async loadReport() {
    const from = document.getElementById('h-from')?.value;
    const to = document.getElementById('h-to')?.value;
    if (!from||!to) { showToast('Sana oralig\'ini tanlang','warning'); return; }
    // Viloyat admin o'z viloyatini majburiy ko'rsin
    if (!HisobotPage._isSuperAdmin && HisobotPage._myViloyat) {
      const vilEl = document.getElementById('h-viloyat');
      if (vilEl && vilEl.tagName === 'SELECT') vilEl.value = HisobotPage._myViloyat;
    }
    // Clear stale data so Telegram button won't send previous period's report
    HisobotPage._lastData = null;
    // Disable Telegram button while loading
    const tgBtn = document.querySelector('[onclick="HisobotPage.sendTelegramReport()"]');
    if (tgBtn) { tgBtn.disabled = true; tgBtn.style.opacity = '0.5'; tgBtn.style.cursor = 'not-allowed'; }
    HisobotPage._lastListType = null;
    HisobotPage._savedFilters = {
      from, to,
      ageFrom:   document.getElementById('h-age-from')?.value  || '',
      ageTo:     document.getElementById('h-age-to')?.value    || '',
      viloyat:   document.getElementById('h-viloyat')?.value   || '',
      muassasa:  document.getElementById('h-muassasa')?.value  || ''
    };
    const el = document.getElementById('h-results');
    if (!el) return;
    
    el.innerHTML = `
      <div class="h-card flex flex-col items-center justify-center py-16">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-blue-900 font-semibold">Hisobot tayyorlanmoqda...</p>
      </div>`;
      
    const reEnableTg = () => {
      const btn = document.querySelector('[onclick="HisobotPage.sendTelegramReport()"]');
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
    };
    const showErr = (msg) => {
      const elNow = document.getElementById('h-results');
      if (elNow) elNow.innerHTML = `
        <div class="h-card text-center text-red-600 py-12">
          <div class="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h3 class="text-xl font-bold mb-2">Xatolik yuz berdi</h3>
          <p class="text-sm text-red-500 max-w-md mx-auto">${msg}</p>
          <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold" onclick="HisobotPage.loadReport()">Qayta urinish</button>
        </div>`;
    };

    try {
      const profile = await Profile.getCurrent();
      const fromUTC = new Date(from + 'T00:00:00+05:00').toISOString();
      const toUTC   = new Date(to   + 'T23:59:59+05:00').toISOString();
      const filters = { from: fromUTC, to: toUTC };
      // Viloyat filtri: admin uchun majburiy, boshqalar uchun ixtiyoriy
      const selViloyat  = document.getElementById('h-viloyat')?.value  || '';
      const selMuassasa = document.getElementById('h-muassasa')?.value || '';
      if (profile?.role === 'admin' && profile?.viloyat && !selViloyat) {
        filters.viloyat = profile.viloyat;
      } else if (selViloyat) {
        filters.viloyat = selViloyat;
      }
      if (selMuassasa) filters.muassasa = selMuassasa;

      const ageFrom = parseInt(document.getElementById('h-age-from')?.value) || 0;
      const ageTo   = parseInt(document.getElementById('h-age-to')?.value)   || 120;
      const byAge = arr => arr.filter(p => {
        const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil);
        if (age === null || age === undefined || isNaN(age)) return true;
        return age >= ageFrom && age <= ageTo;
      });

      const [infResult, insResult, kuzatuvResult] = await Promise.allSettled([
        DB.infarktList({ ...filters, allCols: true }),
        DB.insultList({ ...filters, allCols: true }),
        getSupabase().from('kuzatuv').select('*').gte('created_at', filters.from).lte('created_at', filters.to).range(0, 9999)
      ]);

      if (infResult.status === 'rejected') throw new Error('Infarkt ma\'lumotlari yuklanmadi: ' + infResult.reason?.message);
      if (insResult.status === 'rejected') throw new Error('Insult ma\'lumotlari yuklanmadi: ' + insResult.reason?.message);

      const infs = byAge((infResult.value?.data) || []);
      const ins  = byAge((insResult.value?.data) || []);
      const kuzatuvAll = kuzatuvResult.status === 'fulfilled' ? (kuzatuvResult.value?.data || []) : [];

      const validKtNos = new Set([...infs.map(p => p.kt_no), ...ins.map(p => p.kt_no)]);
      const kuzatuv = kuzatuvAll.filter(k => validKtNos.has(k.kt_no));

      const ageLabel = (ageFrom > 0 || ageTo < 120) ? ` · Yosh: ${ageFrom}–${ageTo}` : '';
      const locationLabel = selMuassasa ? ` · ${selMuassasa}` : selViloyat ? ` · ${selViloyat}` : '';
      HisobotPage._lastData = { infs, ins, kuzatuv, from, to, ageLabel, locationLabel };
      reEnableTg();
      HisobotPage.renderReport(infs, ins, kuzatuv, from, to, ageLabel, locationLabel);
    } catch(err) {
      reEnableTg();
      showErr(err.message || 'Noma\'lum xatolik');
    }
  },

  renderReport(infs, ins, kuzatuv, from, to, ageLabel = '', locationLabel = '') {
    const el = document.getElementById('h-results');
    // counts
    const stemi = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
    const stemiDavol = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='chiqarildi').length;
    const stemiVafot = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='vafot').length;
    const nstemi = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
    const nstemiDavol = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='chiqarildi').length;
    const nstemiVafot = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='vafot').length;
    const ami = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')).length;
    const amiDavol = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')&&p.status==='chiqarildi').length;
    const amiVafot = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')&&p.status==='vafot').length;
    const koronar = infs.filter(p=>p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya')).length;
    const koronarDavol = infs.filter(p=>(p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya'))&&p.status==='chiqarildi').length;
    const koronarVafot = infs.filter(p=>(p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya'))&&p.status==='vafot').length;
    const tlt_inf = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik')).length;
    const tltDavol = infs.filter(p=>(p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik'))&&p.status==='chiqarildi').length;
    const tltVafot = infs.filter(p=>(p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik'))&&p.status==='vafot').length;
    const medInf = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')).length;
    const medInfDavol = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')&&p.status==='chiqarildi').length;
    const medInfVafot = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')&&p.status==='vafot').length;
    const killip34 = infs.filter(p=>p.killip?.includes('III')||p.killip?.includes('IV')).length;
    const isIshemik    = p => /^ishemik insult$/i.test((p.insult_turi||'').trim());
    const isGemorragik = p => /^gemorragik insult$/i.test((p.insult_turi||'').trim());
    const isTIA        = p => /^tia\b/i.test((p.insult_turi||'').trim());
    const ishemik = ins.filter(isIshemik).length;
    const ishemikDavol = ins.filter(p=>isIshemik(p)&&p.status==='chiqarildi').length;
    const ishemikVafot = ins.filter(p=>isIshemik(p)&&p.status==='vafot').length;
    const gemorragik = ins.filter(isGemorragik).length;
    const gemorragikDavol = ins.filter(p=>isGemorragik(p)&&p.status==='chiqarildi').length;
    const gemorragikVafot = ins.filter(p=>isGemorragik(p)&&p.status==='vafot').length;
    const tia = ins.filter(isTIA).length;
    const tiaDavol = ins.filter(p=>isTIA(p)&&p.status==='chiqarildi').length;
    const tiaVafot = ins.filter(p=>isTIA(p)&&p.status==='vafot').length;
    const mskt = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')).length;
    const msktDavol = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')&&p.status==='chiqarildi').length;
    const msktVafot = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')&&p.status==='vafot').length;
    const trombektomiya = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')).length;
    const trombektomiyaDavol = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya'))&&p.status==='chiqarildi').length;
    const trombektomiyaVafot = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya'))&&p.status==='vafot').length;
    const medIns = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ')).length;
    const medInsDavol = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ'))&&p.status==='chiqarildi').length;
    const medInsVafot = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ'))&&p.status==='vafot').length;
    const nihss15 = ins.filter(p=>p.nihss_qabul>=15).length;
    const vafot_inf = infs.filter(p=>p.status==='vafot').length;
    const vafot_ins = ins.filter(p=>p.status==='vafot').length;

    // Timing metrics — timestamptz vs timestamptz
    // Median va IQR hisoblash (skewed ED times uchun median to'g'riroq)
    const calcMedianStats = (diffs) => {
      if (diffs.length === 0) return null;
      const sorted = [...diffs].sort((a, b) => a - b);
      const n = sorted.length;
      const median = n % 2 === 0
        ? Math.round((sorted[n/2-1] + sorted[n/2]) / 2)
        : Math.round(sorted[Math.floor(n/2)]);
      const q1 = Math.round(sorted[Math.floor(n * 0.25)]);
      const q3 = Math.round(sorted[Math.floor(n * 0.75)]);
      return { median, q1, q3, n };
    };

    const calcTimeStats = (items, startField, endField) => {
      const diffs = items.map(p => {
        if (!p[startField] || !p[endField]) return null;
        const d1 = new Date(p[startField]);
        const d2 = new Date(p[endField]);
        if (isNaN(d1) || isNaN(d2)) return null;
        return (d2 - d1) / 60000;
      }).filter(d => d !== null && d > 0 && d < 1440);
      return calcMedianStats(diffs);
    };

    // ekg_vaqti — time type ("HH:MM"), qabul_vaqt — timestamptz
    const calcTimeStatsMixed = (items, tsField, timeField) => {
      const diffs = items.map(p => {
        if (!p[tsField] || !p[timeField]) return null;
        const d1 = new Date(p[tsField]);
        if (isNaN(d1)) return null;
        const dateStr = d1.toISOString().split('T')[0];
        const d2 = new Date(dateStr + 'T' + p[timeField] + (p[timeField].length === 5 ? ':00Z' : 'Z'));
        if (isNaN(d2)) return null;
        let diff = (d2 - d1) / 60000;
        if (diff < 0) diff += 24 * 60;
        if (diff <= 0 || diff > 480) return null;
        return diff;
      }).filter(d => d !== null);
      return calcMedianStats(diffs);
    };

    // Vaqt mezonlari (stats: { median, q1, q3, n } yoki null)
    const statsEKG          = calcTimeStatsMixed(infs.filter(p=>p.ekg_vaqti), 'qabul_vaqt', 'ekg_vaqti');
    const statsTLT_ins      = calcTimeStats(ins.filter(p=>p.trombolizis_vaqti), 'qabul_vaqt', 'trombolizis_vaqti');
    const statsTLT_inf      = calcTimeStats(infs.filter(p=>p.tlt_vaqt), 'qabul_vaqt', 'tlt_vaqt');
    const statsPCI          = calcTimeStats(infs.filter(p=>p.pci_vaqt), 'qabul_vaqt', 'pci_vaqt');
    const statsTrombektomiya= calcTimeStats(ins.filter(p=>p.trombektomiya_vaqti), 'qabul_vaqt', 'trombektomiya_vaqti');
    const statsCT           = calcTimeStats(ins.filter(p=>p.kt_vaqti), 'qabul_vaqt', 'kt_vaqti');

    // n — muolaja tanlangan bemorlar (vaqt to'ldirilishi kerak bo'lganlar)
    const nEKG_total      = infs.length;
    const nEKG_filled     = infs.filter(p=>p.ekg_vaqti).length;
    const nTLT_inf_total  = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.includes('trombolitik')).length;
    const nTLT_inf_filled = infs.filter(p=>p.tlt_vaqt).length;
    const nPCI_total      = infs.filter(p=>p.muolaja_turi?.includes('PCI')||p.muolaja_turi?.includes('stentlash')||p.muolaja_turi?.includes('TLBAP')).length;
    const nPCI_filled     = infs.filter(p=>p.pci_vaqt).length;
    const nTLT_ins_total  = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('trombolizis')||p.muolaja_turi?.toLowerCase().includes('tlt')).length;
    const nTLT_ins_filled = ins.filter(p=>p.trombolizis_vaqti).length;
    const nTromb_total    = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('trombektomiya')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')).length;
    const nTromb_filled   = ins.filter(p=>p.trombektomiya_vaqti).length;
    const nCT_total       = ins.filter(p=>p.mskt==='Ha – o\'tkazildi').length;
    const nCT_filled      = ins.filter(p=>p.kt_vaqti).length;

    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;

    // Readmission (30 days)
    const readm30 = (kuzatuv || []).filter(k => k.kuzatuv_davri==='30 kunlik' && (k.holati?.includes('Qayta') || k.qayta_xuruj)).length;

    const statRow = (label, val, iconName, colorClass, davol = null, vafot = null) =>
      `<div class="h-row">
        <span class="h-label flex items-center gap-2">${icon(iconName, 16)} ${label}</span>
        <span class="flex items-center gap-2 ml-auto">
          ${davol !== null ? `<span class="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-2 py-0.5">${icon('check-circle',12)} ${davol} davolandi</span>` : ''}
          ${vafot !== null ? `<span class="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">${icon('x-circle',12)} ${vafot} vafot</span>` : ''}
          <span class="h-val ${colorClass} bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">${val}</span>
        </span>
      </div>`;

    if (!el) return;
    el.innerHTML = `
      <div class="h-card !py-3 !px-5 mb-4 flex items-center gap-3 bg-blue-50 border-blue-200">
        ${icon('calendar', 16)}
        <span class="text-sm font-bold text-blue-900">${from} — ${to}${ageLabel}</span>
        <span class="ml-auto text-xs text-slate-500 font-semibold">Infarkt: ${infs.length} · Insult: ${ins.length} · Jami: ${infs.length + ins.length}</span>
      </div>
      <!-- Summary Blocks -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="h-stat group">
          <div class="h-stat-icon bg-red-100 text-red-600 group-hover:scale-110 transition-transform">${icon('activity', 28)}</div>
          <div>
            <div class="text-3xl font-black text-blue-900">${infs.length}</div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide">Jami infarkt</div>
          </div>
        </div>
        <div class="h-stat group">
          <div class="h-stat-icon bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">${icon('brain', 28)}</div>
          <div>
            <div class="text-3xl font-black text-blue-900">${ins.length}</div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide">Jami insult</div>
          </div>
        </div>
        <div class="h-stat group">
          <div class="h-stat-icon bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">${icon('alert-triangle', 28)}</div>
          <div>
            <div class="text-3xl font-black text-blue-900">${killip34+nihss15}</div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide">Kritik holatlar</div>
          </div>
        </div>
        <div class="h-stat group">
          <div class="h-stat-icon bg-slate-200 text-slate-700 group-hover:scale-110 transition-transform">${icon('heart-crack', 28)}</div>
          <div>
            <div class="text-3xl font-black text-blue-900">${vafot_inf+vafot_ins}</div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide">Vafot holatlari</div>
          </div>
        </div>
        <div class="h-stat group">
          <div class="h-stat-icon bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">${icon('repeat', 28)}</div>
          <div>
            <div class="text-3xl font-black text-blue-900">${readm30}</div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide">Qayta yotqizildi</div>
          </div>
        </div>
      </div>

      <!-- Detail Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <!-- Infarkt Detail -->
        <div class="h-card !p-0 overflow-hidden">
          <div class="bg-red-50 p-5 border-b border-red-100 flex items-center justify-between">
            <h3 class="h-title !mb-0 text-red-900">${icon('activity', 24)} Infarkt tahlili (${infs.length} ta)</h3>
            <button class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm" onclick="HisobotPage.showPatientList('infarkt')">
              ${icon('list', 14)} Ro'yxatni ko'rish
            </button>
          </div>
          <div class="p-2">
            ${statRow('STEMI', stemi, 'activity', 'text-red-700', stemiDavol, stemiVafot)}
            ${statRow('NSTEMI', nstemi, 'pulse', 'text-orange-600', nstemiDavol, nstemiVafot)}
            ${statRow("O'tkir miokard infarkti (AMI)", ami, 'heart', 'text-rose-700', amiDavol, amiVafot)}
            ${statRow('Koronarangiografiya', koronar, 'syringe', 'text-blue-700', koronarDavol, koronarVafot)}
            ${statRow('Trombolitik terapiya (TLT)', tlt_inf, 'droplets', 'text-purple-700', tltDavol, tltVafot)}
            ${statRow('Medikamentoz davo', medInf, 'pill', 'text-teal-700', medInfDavol, medInfVafot)}
            ${statRow('Vafot', vafot_inf, 'heart-crack', 'text-slate-700')}
          </div>
        </div>

        <!-- Insult Detail -->
        <div class="h-card !p-0 overflow-hidden">
          <div class="bg-purple-50 p-5 border-b border-purple-100 flex items-center justify-between">
            <h3 class="h-title !mb-0 text-purple-900">${icon('brain', 24)} Insult tahlili (${ins.length} ta)</h3>
            <button class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm" onclick="HisobotPage.showPatientList('insult')">
              ${icon('list', 14)} Ro'yxatni ko'rish
            </button>
          </div>
          <div class="p-2">
            ${statRow('Ishemik insult', ishemik, 'circle-dot', 'text-blue-700', ishemikDavol, ishemikVafot)}
            ${statRow('Gemorragik insult', gemorragik, 'droplet', 'text-red-700', gemorragikDavol, gemorragikVafot)}
            ${statRow('Tranzitor ishemik ataka (TIA)', tia, 'zap', 'text-amber-600', tiaDavol, tiaVafot)}
            ${statRow('MSKT bosh miya', mskt, 'scan', 'text-indigo-700', msktDavol, msktVafot)}
            ${statRow('Trombektomiya', trombektomiya, 'scissors', 'text-pink-700', trombektomiyaDavol, trombektomiyaVafot)}
            ${statRow('Medikamentoz davo', medIns, 'pill', 'text-teal-700', medInsDavol, medInsVafot)}
            ${statRow('Vafot', vafot_ins, 'heart-crack', 'text-slate-700')}
          </div>
        </div>
        <!-- Timing Analytics -->
        <div class="h-card !p-0 overflow-hidden lg:col-span-2">
          <div class="p-5" style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <h3 style="color:#ffffff;font-weight:800;font-size:18px;margin:0;display:flex;align-items:center;gap:8px">${icon('clock', 20)} Vaqt mezonlari — Median ko'rsatkichlar</h3>
                <p style="color:#bfdbfe;font-size:12px;margin-top:4px">"Vaqt = miokard yoki miya". Har daqiqa muhim qoidasi!</p>
              </div>
              <div style="color:#93c5fd;font-size:11px;text-align:right;white-space:nowrap">
                <div style="font-weight:700">Yangilangan</div>
                <div>${nowStr}</div>
                <div style="margin-top:2px">${from} — ${to}</div>
              </div>
            </div>
          </div>
          <div class="p-4">
            <!-- Vaqt kiritilganlik darajasi -->
            <div class="mb-5" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;padding:14px">
              <div style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
                📋 Vaqt mezonlari to'ldirilganlik darajasi
              </div>
              ${(() => {
                const pctBar = (filled, total) => {
                  if (total === 0) return '<span style="color:#94a3b8;font-size:10px">—</span>';
                  const p = Math.round((filled/total)*100);
                  const clr = p>=80?'#16a34a':p>=50?'#d97706':'#dc2626';
                  return `<div style="display:flex;align-items:center;gap:6px">
                    <div style="flex:1;background:#e2e8f0;border-radius:99px;height:7px;overflow:hidden">
                      <div style="height:100%;width:${p}%;background:${clr};border-radius:99px"></div>
                    </div>
                    <span style="font-size:10px;font-weight:700;color:${clr};min-width:32px">${filled}/${total}</span>
                    <span style="font-size:10px;color:#64748b">(${p}%)</span>
                  </div>`;
                };
                const rows = [
                  ['♥ Infarkt — EKG vaqti',       nEKG_filled,     nEKG_total],
                  ['♥ Infarkt — TLT vaqti',        nTLT_inf_filled, nTLT_inf_total],
                  ['♥ Infarkt — PCI/Groin vaqti',  nPCI_filled,     nPCI_total],
                  ['◎ Insult — KT/MSKT vaqti',     nCT_filled,      nCT_total],
                  ['◎ Insult — Trombolizis vaqti',  nTLT_ins_filled, nTLT_ins_total],
                  ['◎ Insult — Trombektomiya vaqti',nTromb_filled,   nTromb_total],
                ];
                return `<table style="width:100%;border-collapse:collapse;font-size:11px">
                  <thead><tr style="background:#e2e8f0">
                    <th style="padding:6px 10px;text-align:left;font-weight:700;color:#475569;border-radius:6px 0 0 0">Mezon</th>
                    <th style="padding:6px 10px;text-align:center;font-weight:700;color:#475569">To'ldirilgan</th>
                    <th style="padding:6px 10px;text-align:left;font-weight:700;color:#475569;border-radius:0 6px 0 0">Daraja</th>
                  </tr></thead>
                  <tbody>
                    ${rows.map(([label, filled, total], i) => `
                      <tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #f1f5f9">
                        <td style="padding:7px 10px;font-weight:600;color:#334155">${label}</td>
                        <td style="padding:7px 10px;text-align:center;color:#64748b">${filled} / ${total}</td>
                        <td style="padding:7px 10px">${pctBar(filled, total)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>`;
              })()}
            </div>
            <!-- Infarkt mezonlari -->
            <div class="mb-4">
              <div style="font-size:11px;font-weight:900;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;align-items:center;gap:4px">
                ♥ Infarkt vaqt mezonlari
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                ${[
                  ['Door-to-EKG', statsEKG, 10, nEKG_total],
                  ['Door-to-TLT', statsTLT_inf, 60, nTLT_inf_total],
                  ['Door-to-PCI (Groin)', statsPCI, 90, nPCI_total],
                ].map(([label, stats, target, nTotal]) => {
                  if (!stats) {
                    const badge = nTotal === 0
                      ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#f1f5f9;color:#94a3b8">N/A</span>`
                      : `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fef3c7;color:#92400e">MA'LUMOT YETARLI EMAS</span>`;
                    return `<div style="padding:12px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;text-align:center">
                      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">${label}</div>
                      <div style="font-size:22px;font-weight:900;color:#cbd5e1;margin:4px 0">—</div>
                      <div style="margin:6px 0">${badge}</div>
                      ${nTotal > 0 ? `<div style="font-size:10px;color:#94a3b8">Muolaja: ${nTotal} ta · vaqt kiritilmagan</div>` : `<div style="font-size:10px;color:#94a3b8">Bu muolaja bajarilmagan</div>`}
                    </div>`;
                  }
                  const pct = Math.min(100, Math.round((stats.median / target) * 100));
                  const ok = stats.median <= target;
                  const clr = ok ? '#16a34a' : (stats.median <= target * 1.5 ? '#d97706' : '#dc2626');
                  const bgClr = ok ? '#f0fdf4' : (stats.median <= target * 1.5 ? '#fffbeb' : '#fef2f2');
                  const borderClr = ok ? '#bbf7d0' : (stats.median <= target * 1.5 ? '#fde68a' : '#fecaca');
                  const badge = ok
                    ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d">✓ MAQSADDA</span>`
                    : `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fee2e2;color:#b91c1c">✗ KRITIK</span>`;
                  const barFill = ok ? '#22c55e' : (stats.median <= target * 1.5 ? '#f59e0b' : '#ef4444');
                  return `<div style="padding:12px;background:${bgClr};border-radius:14px;border:1px solid ${borderClr};text-align:center">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px">${label}</div>
                    <div style="font-size:24px;font-weight:900;color:${clr};line-height:1.1">${stats.median}<span style="font-size:11px;font-weight:500;color:#94a3b8"> min</span></div>
                    <div style="font-size:10px;color:#94a3b8;margin:2px 0">IQR: ${stats.q1}–${stats.q3} min · n=${stats.n}</div>
                    <div style="margin:6px 0;background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:${barFill};border-radius:99px;transition:width 0.5s"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                      ${badge}
                      <span style="font-size:10px;color:#94a3b8">Maqsad ≤${target} min</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
            <!-- Insult mezonlari -->
            <div>
              <div style="font-size:11px;font-weight:900;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;align-items:center;gap:4px">
                ◎ Insult vaqt mezonlari
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                ${[
                  ['Door-to-needle (TLT)', statsTLT_ins, 60, nTLT_ins_total],
                  ['Door-to-groin (Trombektomiya)', statsTrombektomiya, 90, nTromb_total],
                  ['Door-to-CT', statsCT, 25, nCT_total],
                ].map(([label, stats, target, nTotal]) => {
                  if (!stats) {
                    const badge = nTotal === 0
                      ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#f1f5f9;color:#94a3b8">N/A</span>`
                      : `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fef3c7;color:#92400e">MA'LUMOT YETARLI EMAS</span>`;
                    return `<div style="padding:12px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;text-align:center">
                      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">${label}</div>
                      <div style="font-size:22px;font-weight:900;color:#cbd5e1;margin:4px 0">—</div>
                      <div style="margin:6px 0">${badge}</div>
                      ${nTotal > 0 ? `<div style="font-size:10px;color:#94a3b8">Muolaja: ${nTotal} ta · vaqt kiritilmagan</div>` : `<div style="font-size:10px;color:#94a3b8">Bu muolaja bajarilmagan</div>`}
                    </div>`;
                  }
                  const pct = Math.min(100, Math.round((stats.median / target) * 100));
                  const ok = stats.median <= target;
                  const clr = ok ? '#16a34a' : (stats.median <= target * 1.5 ? '#d97706' : '#dc2626');
                  const bgClr = ok ? '#f0fdf4' : (stats.median <= target * 1.5 ? '#fffbeb' : '#fef2f2');
                  const borderClr = ok ? '#bbf7d0' : (stats.median <= target * 1.5 ? '#fde68a' : '#fecaca');
                  const badge = ok
                    ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d">✓ MAQSADDA</span>`
                    : `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fee2e2;color:#b91c1c">✗ KRITIK</span>`;
                  const barFill = ok ? '#22c55e' : (stats.median <= target * 1.5 ? '#f59e0b' : '#ef4444');
                  return `<div style="padding:12px;background:${bgClr};border-radius:14px;border:1px solid ${borderClr};text-align:center">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px">${label}</div>
                    <div style="font-size:24px;font-weight:900;color:${clr};line-height:1.1">${stats.median}<span style="font-size:11px;font-weight:500;color:#94a3b8"> min</span></div>
                    <div style="font-size:10px;color:#94a3b8;margin:2px 0">IQR: ${stats.q1}–${stats.q3} min · n=${stats.n}</div>
                    <div style="margin:6px 0;background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:${barFill};border-radius:99px;transition:width 0.5s"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                      ${badge}
                      <span style="font-size:10px;color:#94a3b8">Maqsad ≤${target} min</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="h-card">
          <h3 class="h-title">${icon('bar-chart-2', 20)} Infarkt muolajalar</h3>
          <div style="height:250px; position:relative;">
            <canvas id="h-inf-chart"></canvas>
          </div>
        </div>
        <div class="h-card">
          <h3 class="h-title">${icon('bar-chart-2', 20)} Insult muolajalar</h3>
          <div style="height:250px; position:relative;">
            <canvas id="h-ins-chart"></canvas>
          </div>
        </div>
      </div>

      ${(() => {
        // Har bir bemor uchun to'g'ri turi belgilash yordamchisi
        const turi = (p, isInf) => isInf ? 'Infarkt' : 'Insult';
        const turiBadge = (isInf) => `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${isInf?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}">${isInf?'Infarkt':'Insult'}</span>`;

        // 1. Boshqa muassasadan KELGAN bemorlar
        const kelganInf = infs.filter(p => p.yuborgan_muassasa).map(p => ({...p, _isInf: true}));
        const kelganIns = ins.filter(p => p.yuborgan_muassasa).map(p => ({...p, _isInf: false}));
        const kelgan = [...kelganInf, ...kelganIns].sort((a,b) => new Date(b.qabul_vaqt) - new Date(a.qabul_vaqt));

        const kelganMap = {};
        kelgan.forEach(p => {
          const m = p.yuborgan_muassasa;
          if (!kelganMap[m]) kelganMap[m] = { nomi: m, infarkt: 0, insult: 0 };
          p._isInf ? kelganMap[m].infarkt++ : kelganMap[m].insult++;
        });
        const kelganMuassasalar = Object.values(kelganMap).sort((a,b) => (b.infarkt+b.insult)-(a.infarkt+a.insult));

        // 2. Boshqa muassasaga O'TKAZILGAN bemorlar
        const otkazilganInf = infs.filter(p => p.otkazilgan_muassasa).map(p => ({...p, _isInf: true}));
        const otkazilganIns = ins.filter(p => p.otkazilgan_muassasa).map(p => ({...p, _isInf: false}));
        const otkazilgan = [...otkazilganInf, ...otkazilganIns].sort((a,b) => new Date(b.qabul_vaqt) - new Date(a.qabul_vaqt));

        const otkazilganMap = {};
        otkazilgan.forEach(p => {
          const m = p.otkazilgan_muassasa;
          if (!otkazilganMap[m]) otkazilganMap[m] = { nomi: m, infarkt: 0, insult: 0 };
          p._isInf ? otkazilganMap[m].infarkt++ : otkazilganMap[m].insult++;
        });
        const otkazilganMuassasalar = Object.values(otkazilganMap).sort((a,b) => (b.infarkt+b.insult)-(a.infarkt+a.insult));

        // 3. Shifokorlar — katta-kichik harf va qo'shimcha bo'shliqlarni normallashtirish
        const normFio = s => s?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
        const shifokorMap = {};
        const addShifokor = (p, isInf) => {
          const raw = p.shifokor_fio?.trim();
          if (!raw) return;
          const key = normFio(raw);
          if (!shifokorMap[key]) shifokorMap[key] = { fio: raw, viloyat: p.viloyat||'', infarkt: 0, insult: 0, vafot: 0, chiqarildi: 0, bemorlar: [] };
          isInf ? shifokorMap[key].infarkt++ : shifokorMap[key].insult++;
          if (p.status === 'vafot') shifokorMap[key].vafot++;
          if (p.status === 'chiqarildi') shifokorMap[key].chiqarildi++;
          shifokorMap[key].bemorlar.push({ ...p, _isInf: isInf });
        };
        infs.forEach(p => addShifokor(p, true));
        ins.forEach(p => addShifokor(p, false));
        HisobotPage._shifokorData = shifokorMap;
        const shifokorlar = Object.values(shifokorMap).sort((a,b) => (b.infarkt+b.insult)-(a.infarkt+a.insult));

        const tableHead = (cols) => `<thead><tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">${cols.map(c=>`<th class="p-3 text-${c.align||'left'} border-b border-slate-100">${c.label}</th>`).join('')}</tr></thead>`;
        const badge = (val, color) => `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${color}">${val}</span>`;

        return `
        <!-- Boshqa muassasadan KELGAN bemorlar -->
        ${kelgan.length ? `
        <div class="h-card !p-0 overflow-hidden mt-6">
          <div class="bg-green-50 p-5 border-b border-green-100">
            <h3 class="h-title !mb-0 text-green-900">${icon('arrow-down-to-line', 20)} Boshqa muassasadan kelgan bemorlar — ${kelgan.length} ta</h3>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2">
            <div class="border-r border-slate-100">
              <div class="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">Yuborgan muassasa</div>
              <table class="w-full text-sm">
                ${tableHead([{label:'Muassasa'},{label:'Infarkt',align:'center'},{label:'Insult',align:'center'},{label:'Jami',align:'center'}])}
                <tbody>${kelganMuassasalar.map((m,i)=>`
                  <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-green-50">
                    <td class="p-3 font-semibold text-slate-700">${esc(m.nomi)}</td>
                    <td class="p-3 text-center">${badge(m.infarkt,'bg-red-100 text-red-700')}</td>
                    <td class="p-3 text-center">${badge(m.insult,'bg-purple-100 text-purple-700')}</td>
                    <td class="p-3 text-center font-black">${m.infarkt+m.insult}</td>
                  </tr>`).join('')}</tbody>
              </table>
            </div>
            <div>
              <div class="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">Bemorlar ro'yxati</div>
              <div style="max-height:320px;overflow-y:auto">
                <table class="w-full text-sm">
                  ${tableHead([{label:'F.I.Sh'},{label:'Turi'},{label:'Qabul'},{label:'Yuborgan muassasa'}])}
                  <tbody>${kelgan.map((p,i)=>`
                    <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-green-50">
                      <td class="p-3 font-semibold text-slate-800">${esc(p.fio||'—')}</td>
                      <td class="p-3">${turiBadge(p._isInf)}</td>
                      <td class="p-3 text-slate-500 text-xs">${Utils.formatDate(p.qabul_vaqt)}</td>
                      <td class="p-3 text-green-700 font-medium text-xs">${esc(p.yuborgan_muassasa||'—')}</td>
                    </tr>`).join('')}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>` : ''}

        <!-- Boshqa muassasaga O'TKAZILGAN bemorlar -->
        ${otkazilgan.length ? `
        <div class="h-card !p-0 overflow-hidden mt-6">
          <div class="bg-orange-50 p-5 border-b border-orange-100">
            <h3 class="h-title !mb-0 text-orange-900">${icon('arrow-up-from-line', 20)} Boshqa muassasaga o'tkazilgan bemorlar — ${otkazilgan.length} ta</h3>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2">
            <div class="border-r border-slate-100">
              <div class="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">O'tkazilgan muassasa</div>
              <table class="w-full text-sm">
                ${tableHead([{label:'Muassasa'},{label:'Infarkt',align:'center'},{label:'Insult',align:'center'},{label:'Jami',align:'center'}])}
                <tbody>${otkazilganMuassasalar.map((m,i)=>`
                  <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-orange-50">
                    <td class="p-3 font-semibold text-slate-700">${esc(m.nomi)}</td>
                    <td class="p-3 text-center">${badge(m.infarkt,'bg-red-100 text-red-700')}</td>
                    <td class="p-3 text-center">${badge(m.insult,'bg-purple-100 text-purple-700')}</td>
                    <td class="p-3 text-center font-black">${m.infarkt+m.insult}</td>
                  </tr>`).join('')}</tbody>
              </table>
            </div>
            <div>
              <div class="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">Bemorlar ro'yxati</div>
              <div style="max-height:320px;overflow-y:auto">
                <table class="w-full text-sm">
                  ${tableHead([{label:'F.I.Sh'},{label:'Turi'},{label:'Qabul'},{label:'O\'tkazilgan muassasa'}])}
                  <tbody>${otkazilgan.map((p,i)=>`
                    <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-orange-50">
                      <td class="p-3 font-semibold text-slate-800">${esc(p.fio||'—')}</td>
                      <td class="p-3">${turiBadge(p._isInf)}</td>
                      <td class="p-3 text-slate-500 text-xs">${Utils.formatDate(p.qabul_vaqt)}</td>
                      <td class="p-3 text-orange-700 font-semibold text-xs">${esc(p.otkazilgan_muassasa||'—')}</td>
                    </tr>`).join('')}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>` : ''}

        <!-- Shifokorlar bo'yicha statistika -->
        ${shifokorlar.length ? `
        <div class="h-card !p-0 overflow-hidden mt-6">
          <div class="bg-teal-50 p-5 border-b border-teal-100">
            <h3 class="h-title !mb-0 text-teal-900">${icon('stethoscope', 20)} Shifokorlar bo'yicha — ${shifokorlar.length} ta</h3>
            <p class="text-xs text-teal-600 mt-1">Raqam ustiga bosing — o'sha shifokor kiritgan bemorlar ro'yxatini ko'rish uchun</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              ${tableHead([{label:'#'},{label:'Viloyat'},{label:'Shifokor F.I.Sh'},{label:'Infarkt',align:'center'},{label:'Insult',align:'center'},{label:'Jami',align:'center'},{label:'Davolandi',align:'center'},{label:'Vafot',align:'center'}])}
              <tbody>${shifokorlar.map((s,i)=>`
                <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-teal-50">
                  <td class="p-3 text-slate-400 font-bold text-center">${i+1}</td>
                  <td class="p-3 text-slate-500 text-xs">${esc(s.viloyat||'—')}</td>
                  <td class="p-3 font-semibold text-slate-800">${esc(s.fio)}</td>
                  <td class="p-3 text-center">
                    ${s.infarkt > 0
                      ? `<button class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer transition-colors" onclick="HisobotPage.showShifokorBemorlar('${esc(s.fio).replace(/'/g,"\\'")}','infarkt')">${s.infarkt}</button>`
                      : badge(0,'bg-slate-100 text-slate-400')}
                  </td>
                  <td class="p-3 text-center">
                    ${s.insult > 0
                      ? `<button class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer transition-colors" onclick="HisobotPage.showShifokorBemorlar('${esc(s.fio).replace(/'/g,"\\'")}','insult')">${s.insult}</button>`
                      : badge(0,'bg-slate-100 text-slate-400')}
                  </td>
                  <td class="p-3 text-center">
                    <button class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 cursor-pointer transition-colors" onclick="HisobotPage.showShifokorBemorlar('${esc(s.fio).replace(/'/g,"\\'")}','jami')">${s.infarkt+s.insult}</button>
                  </td>
                  <td class="p-3 text-center">${badge(s.chiqarildi,'bg-green-100 text-green-700')}</td>
                  <td class="p-3 text-center">${badge(s.vafot, s.vafot>0?'bg-red-100 text-red-700':'bg-slate-100 text-slate-400')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}`;
      })()}

      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-semibold text-blue-900 text-center shadow-sm flex items-center justify-center gap-2 flex-wrap">
        ${icon('calendar', 18)}
        Hisobot davri: <span class="bg-white px-2 py-1 rounded border border-blue-200">${from}</span> dan
        <span class="bg-white px-2 py-1 rounded border border-blue-200">${to}</span> gacha ·
        Jami: <span class="text-blue-600">${infs.length+ins.length}</span> ta bemor
        ${locationLabel ? `· <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300">${icon('building-2',14)} ${locationLabel.replace(' · ','')}</span>` : ''}
        ${ageLabel ? `· <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">${ageLabel.replace(' · ','')}</span>` : ''}
      </div>
    `;

    initIcons();

    // Make charts render in next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Infarkt muolajalar — normalized via MUOLAJA_STD
      const infMCounts = normMuolajaCounts(infs);
      const infMLabels = Object.keys(infMCounts);
      const infMVals = Object.values(infMCounts);
      const ctx1 = document.getElementById('h-inf-chart')?.getContext('2d');
      if (ctx1 && infMLabels.length) {
        new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: infMLabels.map(k => k.slice(0, 20)),
            datasets: [{
              data: infMVals,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              hoverBackgroundColor: 'rgba(37, 99, 235, 1)',
              borderRadius: 6
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#1e3a8a' } },
              y: { border: { display: false }, grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11, family: 'Inter' }, color: '#64748b' } }
            },
            responsive: true, maintainAspectRatio: false
          }
        });
      }

      // Insult muolajalar — normalized via MUOLAJA_STD
      const insMCounts = normMuolajaCounts(ins);
      const insMLabels = Object.keys(insMCounts);
      const insMVals = Object.values(insMCounts);
      const ctx2 = document.getElementById('h-ins-chart')?.getContext('2d');
      if (ctx2 && insMLabels.length) {
        new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: insMLabels.map(k => k.slice(0, 20)),
            datasets: [{
              data: insMVals,
              backgroundColor: 'rgba(139, 92, 246, 0.8)',
              hoverBackgroundColor: 'rgba(109, 40, 217, 1)',
              borderRadius: 6
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#6d28d9' } },
              y: { border: { display: false }, grid: { color: '#f5f3ff' }, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11, family: 'Inter' }, color: '#64748b' } }
            },
            responsive: true, maintainAspectRatio: false
          }
        });
      }
    });
  },

  showPatientList(type) {
    const d = HisobotPage._lastData;
    if (!d) return;
    HisobotPage._lastListType = type;
    const patients = type === 'infarkt' ? d.infs : d.ins;

    // Bemor-karta navigatsiyasini hisobot ro'yxati bilan to'ldirish
    if (window.BemorKartaPage) {
      BemorKartaPage._navList = patients.map(p => ({ ...p, _type: type }));
      BemorKartaPage._navIndex = -1;
    }
    const color = type === 'infarkt' ? '#dc2626' : '#7c3aed';
    const title = type === 'infarkt' ? 'Infarkt' : 'Insult';

    const rows = patients.map(p => {
      const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil) || '—';
      const statusColors = { active: '#16a34a', vafot: '#dc2626', chiqarildi: '#2563eb', otkazildi: '#d97706' };
      const sc = statusColors[p.status] || '#64748b';
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="document.getElementById('h-modal')?.remove();Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${type}'})"  >
        <td style="padding:10px 14px;font-family:monospace;font-size:12px;color:#64748b">${p.kt_no}</td>
        <td style="padding:10px 14px;font-weight:700;color:#0f172a">${p.fio || '—'}</td>
        <td style="padding:10px 14px;color:#475569">${age} yosh · ${p.jins || '—'}</td>
        <td style="padding:10px 14px;color:#475569;font-size:12px">${p.viloyat || '—'}</td>
        <td style="padding:10px 14px;font-size:12px;color:#475569">${Utils.formatDate(p.qabul_vaqt)}</td>
        <td style="padding:10px 14px"><span style="background:${sc}20;color:${sc};font-size:11px;font-weight:800;padding:3px 10px;border-radius:8px;text-transform:uppercase">${p.status || '—'}</span></td>
      </tr>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'h-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:24px;width:100%;max-width:900px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3)">
        <div style="background:${color};padding:20px 24px;display:flex;align-items:center;justify-content:space-between">
          <div style="color:#fff">
            <div style="font-size:18px;font-weight:900">${title} bemorlari ro'yxati</div>
            <div style="font-size:12px;opacity:0.8;margin-top:2px">${d.from} — ${d.to}${d.ageLabel || ''} · Jami: ${patients.length} ta</div>
          </div>
          <button onclick="HisobotPage._lastListType=null;document.getElementById('h-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="overflow-x:auto;max-height:60vh;overflow-y:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead style="position:sticky;top:0;background:#f8fafc">
              <tr style="border-bottom:2px solid #e2e8f0">
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">K/T No</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">F.I.O</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">Yosh / Jins</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">Viloyat</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">Qabul</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800">Holat</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8">Bemor topilmadi</td></tr>'}</tbody>
          </table>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#64748b">Qatorga bosing — bemor kartasini ochish</span>
          <button onclick="HisobotPage._lastListType=null;document.getElementById('h-modal').remove()" style="padding:8px 20px;background:#e2e8f0;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Yopish</button>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) { HisobotPage._lastListType = null; modal.remove(); } });
    document.body.appendChild(modal);
  },

  showShifokorBemorlar(fio, turi) {
    const normFio = s => s?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
    const key = normFio(fio);
    const sh = HisobotPage._shifokorData?.[key];
    if (!sh) return;

    let bemorlar = sh.bemorlar;
    if (turi === 'infarkt') bemorlar = bemorlar.filter(p => p._isInf);
    else if (turi === 'insult') bemorlar = bemorlar.filter(p => !p._isInf);

    const title = turi === 'jami' ? 'Jami bemorlar' : turi === 'infarkt' ? 'Infarkt bemorlari' : 'Insult bemorlari';
    const color = turi === 'infarkt' ? 'text-red-700' : turi === 'insult' ? 'text-purple-700' : 'text-teal-700';

    const rows = bemorlar.map((p, i) => {
      const tashxis = p._isInf
        ? (p.infarkt_turi || '—')
        : (p.insult_turi || '—');
      const muolaja = p.muolaja_turi || '—';
      const status = p.status === 'active' ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Aktiv</span>`
        : p.status === 'vafot' ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Vafot</span>`
        : p.status === 'chiqarildi' ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Davolandi</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">${esc(p.status||'—')}</span>`;
      return `<tr class="${i%2===0?'bg-white':'bg-slate-50'}">
        <td class="p-3 text-slate-400 text-xs">${i+1}</td>
        <td class="p-3 font-mono text-xs text-slate-400">${esc(p.kt_no||'')}</td>
        <td class="p-3 font-semibold text-slate-800">${esc(p.fio||'—')}</td>
        <td class="p-3 text-xs text-slate-600">${esc(tashxis)}</td>
        <td class="p-3 text-xs text-slate-600">${esc(muolaja)}</td>
        <td class="p-3 text-xs text-slate-500">${Utils.formatDate(p.qabul_vaqt)}</td>
        <td class="p-3">${status}</td>
      </tr>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div class="bg-teal-50 p-5 border-b border-teal-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('stethoscope',20)} ${esc(sh.fio)}</h3>
            <p class="text-xs text-slate-500 mt-0.5">${esc(sh.viloyat)} · <span class="${color} font-semibold">${title} — ${bemorlar.length} ta</span></p>
          </div>
          <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-teal-100 rounded-xl transition-colors">${icon('x',20)}</button>
        </div>
        <div class="overflow-auto flex-1">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-50 z-10">
              <tr class="text-[11px] font-bold text-slate-500 uppercase">
                <th class="p-3 text-left border-b border-slate-100">#</th>
                <th class="p-3 text-left border-b border-slate-100">K/T No</th>
                <th class="p-3 text-left border-b border-slate-100">F.I.Sh</th>
                <th class="p-3 text-left border-b border-slate-100">Tashxis</th>
                <th class="p-3 text-left border-b border-slate-100">Muolaja</th>
                <th class="p-3 text-left border-b border-slate-100">Qabul</th>
                <th class="p-3 text-left border-b border-slate-100">Holat</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7" class="p-8 text-center text-slate-400">Ma\'lumot topilmadi</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    initIcons();
  },

  printReport() {
    const d = HisobotPage._lastData;
    if (!d) { showToast('Avval hisobot yuklab oling','warning'); return; }
    const { infs, ins, from, to } = d;
    const stemi = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
    const stemiDavol = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='chiqarildi').length;
    const stemiVafot = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('STEMI')&&!p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='vafot').length;
    const nstemi = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
    const nstemiDavol = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='chiqarildi').length;
    const nstemiVafot = infs.filter(p=>p.infarkt_turi?.toUpperCase().includes('NSTEMI')&&p.status==='vafot').length;
    const ami = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')).length;
    const amiDavol = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')&&p.status==='chiqarildi').length;
    const amiVafot = infs.filter(p=>p.infarkt_turi?.toLowerCase().includes('miokard')&&p.status==='vafot').length;
    const koronar = infs.filter(p=>p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya')).length;
    const koronarDavol = infs.filter(p=>(p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya'))&&p.status==='chiqarildi').length;
    const koronarVafot = infs.filter(p=>(p.muolaja_turi?.includes('KAG')||p.muolaja_turi?.toLowerCase().includes('koronarangiografiya'))&&p.status==='vafot').length;
    const tlt_inf = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik')).length;
    const tltDavol = infs.filter(p=>(p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik'))&&p.status==='chiqarildi').length;
    const tltVafot = infs.filter(p=>(p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.toLowerCase().includes('trombolitik'))&&p.status==='vafot').length;
    const medInf = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')).length;
    const medInfDavol = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')&&p.status==='chiqarildi').length;
    const medInfVafot = infs.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')&&p.status==='vafot').length;
    const killip34 = infs.filter(p=>p.killip?.includes('III')||p.killip?.includes('IV')).length;
    const isIshemik    = p => /^ishemik insult$/i.test((p.insult_turi||'').trim());
    const isGemorragik = p => /^gemorragik insult$/i.test((p.insult_turi||'').trim());
    const isTIA        = p => /^tia\b/i.test((p.insult_turi||'').trim());
    const ishemik = ins.filter(isIshemik).length;
    const ishemikDavol = ins.filter(p=>isIshemik(p)&&p.status==='chiqarildi').length;
    const ishemikVafot = ins.filter(p=>isIshemik(p)&&p.status==='vafot').length;
    const gemorragik = ins.filter(isGemorragik).length;
    const gemorragikDavol = ins.filter(p=>isGemorragik(p)&&p.status==='chiqarildi').length;
    const gemorragikVafot = ins.filter(p=>isGemorragik(p)&&p.status==='vafot').length;
    const tia = ins.filter(isTIA).length;
    const tiaDavol = ins.filter(p=>isTIA(p)&&p.status==='chiqarildi').length;
    const tiaVafot = ins.filter(p=>isTIA(p)&&p.status==='vafot').length;
    const mskt = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')).length;
    const msktDavol = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')&&p.status==='chiqarildi').length;
    const msktVafot = ins.filter(p=>p.muolaja_turi?.toUpperCase().includes('MSKT')&&p.status==='vafot').length;
    const trombektomiya = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')).length;
    const trombektomiyaDavol = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya'))&&p.status==='chiqarildi').length;
    const trombektomiyaVafot = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('trombektom')||p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya'))&&p.status==='vafot').length;
    const medIns = ins.filter(p=>p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ')).length;
    const medInsDavol = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ'))&&p.status==='chiqarildi').length;
    const medInsVafot = ins.filter(p=>(p.muolaja_turi?.toLowerCase().includes('medikamentoz')||p.muolaja_turi?.toLowerCase().includes('konservativ'))&&p.status==='vafot').length;
    const nihss15 = ins.filter(p=>p.nihss_qabul>=15).length;
    const vafot_inf = infs.filter(p=>p.status==='vafot').length;
    const vafot_ins = ins.filter(p=>p.status==='vafot').length;

    const row = (label, val, davol = null, vafot = null) => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155">${label}</td>
      ${davol !== null ? `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#16a34a;font-size:11px">${davol} davolandi</td>` : '<td></td>'}
      ${vafot !== null ? `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-size:11px">${vafot} vafot</td>` : '<td></td>'}
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;text-align:right">${val}</td>
    </tr>`;
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Hisobot ${from} – ${to}</title>
<style>
  body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
  h1{font-size:20px;font-weight:800;margin-bottom:4px;color:#1e3a8a}
  .sub{font-size:13px;color:#64748b;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .card{border:1px solid #cbd5e1;border-radius:10px;overflow:hidden}
  .card-head{background:#f1f5f9;padding:10px 14px;font-weight:700;font-size:14px;color:#1e3a8a;border-bottom:1px solid #e2e8f0}
  .card-head.red{background:#fef2f2;color:#991b1b}
  .card-head.purple{background:#faf5ff;color:#6b21a8}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}
  .stat{border:1px solid #e2e8f0;border-radius:10px;padding:12px 18px;text-align:center;min-width:120px}
  .stat-num{font-size:26px;font-weight:900;color:#1e3a8a}
  .stat-lbl{font-size:11px;color:#64748b;margin-top:2px}
  .footer{margin-top:20px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{body{margin:10px}}
</style></head><body>
<h1>Statistik Hisobot</h1>
<div class="sub">Davr: ${from} dan ${to} gacha &nbsp;|&nbsp; Jami: ${infs.length+ins.length} ta bemor</div>
<div class="summary">
  <div class="stat"><div class="stat-num">${infs.length}</div><div class="stat-lbl">Infarkt</div></div>
  <div class="stat"><div class="stat-num">${ins.length}</div><div class="stat-lbl">Insult</div></div>
  <div class="stat"><div class="stat-num">${killip34+nihss15}</div><div class="stat-lbl">Kritik holatlar</div></div>
  <div class="stat"><div class="stat-num">${vafot_inf+vafot_ins}</div><div class="stat-lbl">Vafot</div></div>
</div>
<div class="grid">
  <div class="card">
    <div class="card-head red">Infarkt tahlili (${infs.length} ta)</div>
    <table>
      ${row('STEMI', stemi, stemiDavol, stemiVafot)}
      ${row('NSTEMI', nstemi, nstemiDavol, nstemiVafot)}
      ${row("O'tkir miokard infarkti (AMI)", ami, amiDavol, amiVafot)}
      ${row('Koronarangiografiya', koronar, koronarDavol, koronarVafot)}
      ${row('Trombolitik terapiya (TLT)', tlt_inf, tltDavol, tltVafot)}
      ${row('Medikamentoz davo', medInf, medInfDavol, medInfVafot)}
      ${row('Vafot', vafot_inf)}
    </table>
  </div>
  <div class="card">
    <div class="card-head purple">Insult tahlili (${ins.length} ta)</div>
    <table>
      ${row('Ishemik insult', ishemik, ishemikDavol, ishemikVafot)}
      ${row('Gemorragik insult', gemorragik, gemorragikDavol, gemorragikVafot)}
      ${row('Tranzitor ishemik ataka (TIA)', tia, tiaDavol, tiaVafot)}
      ${row('MSKT bosh miya', mskt, msktDavol, msktVafot)}
      ${row('Trombektomiya', trombektomiya, trombektomiyaDavol, trombektomiyaVafot)}
      ${row('Medikamentoz davo', medIns, medInsDavol, medInsVafot)}
      ${row('Vafot', vafot_ins)}
    </table>
  </div>
</div>
<div class="footer">Hisobot sanasi: ${new Date().toLocaleString('uz-UZ')}</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`);
    w.document.close();
  },

  async sendTelegramReport() {
    const d = HisobotPage._lastData;
    if (!d) { showToast('Avval hisobotni yuklab oling (Ko\'rish tugmasini bosing)', 'warning'); return; }

    const { infs, ins, from, to } = d;

    // from/to — "YYYY-MM-DD" formatida oddiy sana satri (_lastData dan)
    const fmtDate = (dateStr) => {
      // "2026-04-26" → "26.04.2026"
      const parts = dateStr.split('T')[0].split('-');
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    };
    const startLabel = fmtDate(from);
    const endLabel   = fmtDate(to);
    const periodLabel = startLabel === endLabel ? startLabel : `${startLabel} — ${endLabel}`;

    showToast('📊 Hisobot tayyorlanmoqda...', 'info', 3000);

    try {
      const sb = getSupabase();

      // Hozir shifoxonada (status = active, barcha vaqt)
      const [infActive, insActive] = await Promise.all([
        sb.from('infarkt_qabul').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('insult_qabul').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);
      const infActiveCount = infActive.count ?? 0;
      const insActiveCount = insActive.count ?? 0;

      // Infarkt hisobot
      const infChiqarildi = infs.filter(p => p.status === 'chiqarildi').length;
      const infOtkazildi  = infs.filter(p => p.status === 'otkazildi').length;
      const infVafot      = infs.filter(p => p.status === 'vafot').length;
      const stemi  = infs.filter(p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
      const nstemi = infs.filter(p => p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length;
      const ami    = infs.filter(p => p.infarkt_turi?.toLowerCase().includes('miokard')).length;
      const infViloyat = {};
      infs.forEach(p => { if (p.viloyat) infViloyat[p.viloyat] = (infViloyat[p.viloyat]||0)+1; });
      const infMuolajaNorm = normMuolajaCounts(infs);

      // Insult hisobot
      const insChiqarildi = ins.filter(p => p.status === 'chiqarildi').length;
      const insOtkazildi  = ins.filter(p => p.status === 'otkazildi').length;
      const insVafot      = ins.filter(p => p.status === 'vafot').length;
      const ishemik   = ins.filter(p => /^ishemik insult$/i.test((p.insult_turi||'').trim())).length;
      const gemorragik= ins.filter(p => /^gemorragik insult$/i.test((p.insult_turi||'').trim())).length;
      const tia       = ins.filter(p => /^tia\b/i.test((p.insult_turi||'').trim())).length;
      const insViloyat = {};
      ins.forEach(p => { if (p.viloyat) insViloyat[p.viloyat] = (insViloyat[p.viloyat]||0)+1; });
      const insMuolajaNorm = normMuolajaCounts(ins);

      const vilStr = (obj) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  • ${k}: ${v} ta`).join('\n') || '  —';
      const muolajaStr = (normObj) => Object.entries(normObj).sort((a,b)=>b[1]-a[1]).map(([label,count])=>`  • ${label}: ${count} ta`).join('\n') || '  —';

      const infMsg = `🫀 INFARKT HISOBOT
━━━━━━━━━━━━━━━━━━━━━━
📅 Davr: ${periodLabel}
━━━━━━━━━━━━━━━━━━━━━━
👥 Jami yangi qabul: ${infs.length} ta
🟢 Davolanib chiqarildi: ${infChiqarildi} ta
🔄 Boshqa muassasaga o'tkazildi: ${infOtkazildi} ta
⚫ Vafot etdi: ${infVafot} ta
🏥 Hozir shifoxonada: ${infActiveCount} ta
━━━━━━━━━━━━━━━━━━━━━━
📊 Tashxis turi:
  • STEMI: ${stemi} ta
  • NSTEMI: ${nstemi} ta
  • O'tkir miokard infarkti (AMI): ${ami} ta
━━━━━━━━━━━━━━━━━━━━━━
🗺 Viloyatlar kesimida:
${vilStr(infViloyat)}
━━━━━━━━━━━━━━━━━━━━━━
💊 Davolash turlari:
${muolajaStr(infMuolajaNorm)}
━━━━━━━━━━━━━━━━━━━━━━`;

      const insMsg = `🧠 INSULT HISOBOT
━━━━━━━━━━━━━━━━━━━━━━
📅 Davr: ${periodLabel}
━━━━━━━━━━━━━━━━━━━━━━
👥 Jami yangi qabul: ${ins.length} ta
🟢 Davolanib chiqarildi: ${insChiqarildi} ta
🔄 Boshqa muassasaga o'tkazildi: ${insOtkazildi} ta
⚫ Vafot etdi: ${insVafot} ta
🏥 Hozir shifoxonada: ${insActiveCount} ta
━━━━━━━━━━━━━━━━━━━━━━
📊 Tashxis turi:
  • Ishemik insult: ${ishemik} ta
  • Gemorragik insult: ${gemorragik} ta
  • TIA (Tranzitor ishemik ataka): ${tia} ta
━━━━━━━━━━━━━━━━━━━━━━
🗺 Viloyatlar kesimida:
${vilStr(insViloyat)}
━━━━━━━━━━━━━━━━━━━━━━
💊 Davolash turlari:
${muolajaStr(insMuolajaNorm)}
━━━━━━━━━━━━━━━━━━━━━━`;

      const send = async (token, chatId, text) => {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: parseInt(chatId), text, parse_mode: 'HTML' })
        });
        return res.json();
      };

      const [r1, r2] = await Promise.all([
        send(APP_CONFIG.TELEGRAM_INFARKT_TOKEN, APP_CONFIG.TELEGRAM_INFARKT_CHAT, infMsg),
        send(APP_CONFIG.TELEGRAM_INSULT_TOKEN,  APP_CONFIG.TELEGRAM_INSULT_CHAT,  insMsg)
      ]);

      if (r1.ok && r2.ok) {
        showToast('✅ Hisobot Telegramga yuborildi!', 'success', 5000);
      } else {
        showToast('⚠️ Telegram xato: ' + (r1.description || r2.description || 'Noma\'lum'), 'error', 6000);
      }
    } catch(err) {
      showToast('❌ Xato: ' + err.message, 'error');
    }
  },

  exportReport() {
    const d = HisobotPage._lastData;
    if (!d) { showToast('Avval hisobot yuklab oling','warning'); return; }
    const all = [
      ...d.infs.map(p=>({...p,_turi:'infarkt'})),
      ...d.ins.map(p=>({...p,_turi:'insult'}))
    ];
    Utils.exportCSV(all.map(p=>({
      Turi: p._turi, 'K/T No': p.kt_no, 'F.I.O': p.fio,
      Viloyat: p.viloyat, 'Qabul vaqti': Utils.formatDateTime(p.qabul_vaqt),
      Holat: p.status, 'Kasallik turi': p.infarkt_turi||p.insult_turi||'',
      Muolaja: p.muolaja_turi||''
    })), `hisobot_${d.from}_${d.to}.csv`);
    showToast('✅ Eksport boshlandi','success');
  }
};
