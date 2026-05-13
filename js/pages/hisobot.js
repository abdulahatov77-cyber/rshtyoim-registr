// ==================== HISOBOT SAHIFASI ====================
const HisobotPage = {
  _charts: {},
  _lastData: null,
  _lastListType: null,
  _savedFilters: null,

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'hisobot', 'Hisobotlar', 'Statistik tahlil va hisobotlar',
      `<div id="hisobot-inner" class="animate-fadein"></div>`, user
    );
    Components.startClock();
    HisobotPage.renderUI();

    // Oldingi hisobot holatini tiklash
    if (HisobotPage._lastData) {
      const f = HisobotPage._savedFilters || {};
      if (f.from)    { const el = document.getElementById('h-from');    if (el) el.value = f.from; }
      if (f.to)      { const el = document.getElementById('h-to');      if (el) el.value = f.to; }
      if (f.ageFrom) { const el = document.getElementById('h-age-from'); if (el) el.value = f.ageFrom; }
      if (f.ageTo)   { const el = document.getElementById('h-age-to');   if (el) el.value = f.ageTo; }
      const { infs, ins, kuzatuv, from, to, ageLabel } = HisobotPage._lastData;
      HisobotPage.renderReport(infs, ins, kuzatuv, from, to, ageLabel);
      if (HisobotPage._lastListType) {
        setTimeout(() => HisobotPage.showPatientList(HisobotPage._lastListType), 150);
      }
    }
  },

  renderUI() {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now()-30*864e5).toISOString().split('T')[0];
    const inner = document.getElementById('hisobot-inner');
    if (!inner) return;
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
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label class="form-label !text-blue-900 font-semibold mb-1 block">Davr turi</label>
            <select id="h-period" class="form-select bg-slate-50 text-blue-900 border-blue-200 focus:border-blue-500 font-medium" onchange="HisobotPage.onPeriodChange()">
              <option value="custom">Maxsus sana</option>
              <option value="today">Bugun</option>
              <option value="week">So'nggi 7 kun</option>
              <option value="month" selected>So'nggi 30 kun</option>
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
          <div class="flex gap-2">
            <button class="btn btn-primary flex-1 shadow-md hover:shadow-lg flex items-center justify-center gap-2 rounded-xl" onclick="HisobotPage.loadReport()">
              ${icon('bar-chart-2', 18)} Ko'rish
            </button>
            <button class="btn btn-success shadow-md hover:shadow-lg flex items-center justify-center px-3 rounded-xl" onclick="HisobotPage.exportReport()" title="Eksport">
              ${icon('download', 18)}
            </button>
            <button class="btn btn-secondary shadow-md hover:shadow-lg flex items-center justify-center px-3 rounded-xl" onclick="HisobotPage.printReport()" title="Chop etish">
              ${icon('printer', 18)}
            </button>
          </div>
        </div>
      </div>

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

  onPeriodChange() {
    const val = document.getElementById('h-period')?.value;
    const today = new Date();
    let from = new Date();
    if (val==='today') { from = today; }
    else if (val==='week') { from.setDate(today.getDate()-7); }
    else if (val==='month') { from.setDate(today.getDate()-30); }
    else if (val==='year') { from.setFullYear(today.getFullYear()-1); }
    else return;
    document.getElementById('h-from').value = from.toISOString().split('T')[0];
    document.getElementById('h-to').value = today.toISOString().split('T')[0];
  },

  async loadReport() {
    const from = document.getElementById('h-from')?.value;
    const to = document.getElementById('h-to')?.value;
    if (!from||!to) { showToast('Sana oralig\'ini tanlang','warning'); return; }
    HisobotPage._lastListType = null;
    HisobotPage._savedFilters = {
      from, to,
      ageFrom: document.getElementById('h-age-from')?.value || '',
      ageTo:   document.getElementById('h-age-to')?.value   || ''
    };
    const el = document.getElementById('h-results');
    if (!el) return;
    
    el.innerHTML = `
      <div class="h-card flex flex-col items-center justify-center py-16">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-blue-900 font-semibold">Hisobot tayyorlanmoqda...</p>
      </div>`;
      
    try {
      const profile = await Profile.getCurrent();
      const filters = { from: from+'T00:00:00', to: to+'T23:59:59' };
      if (profile?.role !== 'admin' && profile?.viloyat) {
        filters.viloyat = profile.viloyat;
      }
      
      const ageFrom = parseInt(document.getElementById('h-age-from')?.value) || 0;
      const ageTo   = parseInt(document.getElementById('h-age-to')?.value)   || 120;
      const byAge = arr => arr.filter(p => {
        const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil);
        if (age === null || age === undefined || isNaN(age)) return true;
        return age >= ageFrom && age <= ageTo;
      });

      const [infRes, insRes, kuzatuvRes] = await Promise.all([
        DB.infarktList({ ...filters, allCols: true }),
        DB.insultList({ ...filters, allCols: true }),
        getSupabase().from('kuzatuv').select('*').gte('created_at', filters.from).lte('created_at', filters.to).range(0, 9999)
      ]);
      const infs = byAge(infRes.data || infRes);
      const ins  = byAge(insRes.data || insRes);
      const kuzatuvAll = kuzatuvRes.data || [];

      // Filter kuzatuv by region (since table lacks viloyat field)
      const validKtNos = new Set([...infs.map(p => p.kt_no), ...ins.map(p => p.kt_no)]);
      const kuzatuv = kuzatuvAll.filter(k => validKtNos.has(k.kt_no));

      const ageLabel = (ageFrom > 0 || ageTo < 120) ? ` · Yosh: ${ageFrom}–${ageTo}` : '';
      HisobotPage._lastData = { infs, ins, kuzatuv, from, to, ageLabel };
      HisobotPage.renderReport(infs, ins, kuzatuv, from, to, ageLabel);
    } catch(err) {
      if (el) el.innerHTML = `
        <div class="h-card text-center text-red-600 py-12">
          <div class="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">${icon('alert-triangle', 32)}</div>
          <h3 class="text-xl font-bold mb-2">Xatolik yuz berdi</h3>
          <p>${err.message}</p>
        </div>`;
      initIcons();
    }
  },

  renderReport(infs, ins, kuzatuv, from, to, ageLabel = '') {
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
    const ishemik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')).length;
    const ishemikDavol = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')&&p.status==='chiqarildi').length;
    const ishemikVafot = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')&&p.status==='vafot').length;
    const gemorragik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')).length;
    const gemorragikDavol = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')&&p.status==='chiqarildi').length;
    const gemorragikVafot = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')&&p.status==='vafot').length;
    const tia = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')).length;
    const tiaDavol = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')&&p.status==='chiqarildi').length;
    const tiaVafot = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')&&p.status==='vafot').length;
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

    // Timing metrics
    const calcAvgTime = (items, startField, endField) => {
      const diffs = items.map(p => {
        if (!p[startField] || !p[endField]) return null;
        const d1 = new Date(p[startField]);
        const d2 = new Date(p[endField]);
        if (isNaN(d1) || isNaN(d2)) return null;
        return (d2 - d1) / 60000; // minutes
      }).filter(d => d !== null && d > 0);
      if (diffs.length === 0) return 0;
      return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    };

    const avgDoorToCT = calcAvgTime(ins, 'qabul_vaqt', 'created_at'); // Simplification: using created_at as proxy for early processing if explicit field not used
    const avgDoorToTLT = calcAvgTime(ins.filter(p=>p.trombolizis_vaqti), 'qabul_vaqt', 'trombolizis_vaqti');
    const avgDoorToPCI = calcAvgTime(infs.filter(p=>p.pci_vaqt), 'qabul_vaqt', 'pci_vaqt');

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
          <div class="bg-blue-900 p-5 border-b border-blue-800">
            <h3 class="h-title !mb-0 text-white">${icon('clock', 24)} Vaqt tahlili (Average Time Metrics)</h3>
          </div>
          <div class="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div class="text-xs font-bold text-slate-500 uppercase mb-1">Door-to-TLT (Insult)</div>
              <div class="text-2xl font-black text-blue-700">${avgDoorToTLT || '—'} <span class="text-xs font-normal">min</span></div>
              <div class="text-[10px] text-slate-400 mt-1">Maqsad: < 60 min</div>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div class="text-xs font-bold text-slate-500 uppercase mb-1">Door-to-PCI (Infarkt)</div>
              <div class="text-2xl font-black text-red-700">${avgDoorToPCI || '—'} <span class="text-xs font-normal">min</span></div>
              <div class="text-[10px] text-slate-400 mt-1">Maqsad: < 90 min</div>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div class="text-xs font-bold text-slate-500 uppercase mb-1">Door-to-CT (Insult)</div>
              <div class="text-2xl font-black text-purple-700">${avgDoorToCT || '—'} <span class="text-xs font-normal">min</span></div>
              <div class="text-[10px] text-slate-400 mt-1">Maqsad: < 25 min</div>
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

      <!-- Boshqa muassasaga o'tkazilgan bemorlar -->
      ${(() => {
        const otkazilgan = [...infs.filter(p => p.otkazilgan_muassasa), ...ins.filter(p => p.otkazilgan_muassasa)]
          .sort((a,b) => new Date(b.qabul_vaqt) - new Date(a.qabul_vaqt));
        if (!otkazilgan.length) return '';
        return `
        <div class="h-card !p-0 overflow-hidden mt-6">
          <div class="bg-orange-50 p-5 border-b border-orange-100 flex items-center justify-between">
            <h3 class="h-title !mb-0 text-orange-900">${icon('log-out', 20)} Boshqa muassasaga o'tkazilgan bemorlar (${otkazilgan.length} ta)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th class="p-3 text-left border-b border-slate-100">K/T No</th>
                  <th class="p-3 text-left border-b border-slate-100">F.I.Sh</th>
                  <th class="p-3 text-left border-b border-slate-100">Turi</th>
                  <th class="p-3 text-left border-b border-slate-100">Qabul vaqti</th>
                  <th class="p-3 text-left border-b border-slate-100">O'tkazilgan muassasa</th>
                  <th class="p-3 text-left border-b border-slate-100">Viloyat</th>
                </tr>
              </thead>
              <tbody>
                ${otkazilgan.map((p, i) => {
                  const isInf = !!p.infarkt_turi;
                  return `<tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-orange-50 transition-colors">
                    <td class="p-3 font-mono text-xs text-slate-500">${esc(p.kt_no)}</td>
                    <td class="p-3 font-semibold text-slate-800">${esc(p.fio||'—')}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${isInf?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}">${isInf?'Infarkt':'Insult'}</span></td>
                    <td class="p-3 text-slate-600">${Utils.formatDate(p.qabul_vaqt)}</td>
                    <td class="p-3 font-semibold text-orange-700">${esc(p.otkazilgan_muassasa||'—')}</td>
                    <td class="p-3 text-slate-600">${esc(p.viloyat||'—')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      })()}

      <!-- Shifokorlar bo'yicha statistika -->
      ${(() => {
        const shifokorMap = {};
        [...infs, ...ins].forEach(p => {
          const sh = p.shifokor_fio?.trim();
          if (!sh) return;
          if (!shifokorMap[sh]) shifokorMap[sh] = { fio: sh, infarkt: 0, insult: 0, vafot: 0, chiqarildi: 0 };
          if (p.infarkt_turi) shifokorMap[sh].infarkt++;
          else shifokorMap[sh].insult++;
          if (p.status === 'vafot') shifokorMap[sh].vafot++;
          if (p.status === 'chiqarildi') shifokorMap[sh].chiqarildi++;
        });
        const shifokorlar = Object.values(shifokorMap).sort((a,b) => (b.infarkt+b.insult) - (a.infarkt+a.insult));
        if (!shifokorlar.length) return '';
        return `
        <div class="h-card !p-0 overflow-hidden mt-6">
          <div class="bg-teal-50 p-5 border-b border-teal-100 flex items-center justify-between">
            <h3 class="h-title !mb-0 text-teal-900">${icon('stethoscope', 20)} Shifokorlar bo'yicha statistika (${shifokorlar.length} ta)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th class="p-3 text-left border-b border-slate-100">#</th>
                  <th class="p-3 text-left border-b border-slate-100">Shifokor F.I.Sh</th>
                  <th class="p-3 text-center border-b border-slate-100">Infarkt</th>
                  <th class="p-3 text-center border-b border-slate-100">Insult</th>
                  <th class="p-3 text-center border-b border-slate-100">Jami</th>
                  <th class="p-3 text-center border-b border-slate-100">Davolandi</th>
                  <th class="p-3 text-center border-b border-slate-100">Vafot</th>
                </tr>
              </thead>
              <tbody>
                ${shifokorlar.map((s, i) => `
                  <tr class="${i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-teal-50 transition-colors">
                    <td class="p-3 text-slate-400 font-bold">${i+1}</td>
                    <td class="p-3 font-semibold text-slate-800">${esc(s.fio)}</td>
                    <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">${s.infarkt}</span></td>
                    <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">${s.insult}</span></td>
                    <td class="p-3 text-center font-black text-slate-800">${s.infarkt+s.insult}</td>
                    <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">${s.chiqarildi}</span></td>
                    <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${s.vafot>0?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'}">${s.vafot}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      })()}

      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-semibold text-blue-900 text-center shadow-sm flex items-center justify-center gap-2">
        ${icon('calendar', 18)}
        Hisobot davri: <span class="bg-white px-2 py-1 rounded border border-blue-200">${from}</span> dan
        <span class="bg-white px-2 py-1 rounded border border-blue-200">${to}</span> gacha ·
        Jami: <span class="text-blue-600">${infs.length+ins.length}</span> ta bemor
      </div>
    `;

    initIcons();

    // Make charts render in next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Infarkt muolajalar — xuddi avvalgidek, muolaja_turi dan dinamik
      const infMuolajaCounts = {};
      infs.forEach(p => { if (p.muolaja_turi) infMuolajaCounts[p.muolaja_turi] = (infMuolajaCounts[p.muolaja_turi] || 0) + 1; });
      const infMLabels = Object.keys(infMuolajaCounts);
      const infMVals = Object.values(infMuolajaCounts);
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

      // Insult muolajalar — xuddi shu usulda, muolaja_turi dan dinamik
      const insMuolajaCounts = {};
      ins.forEach(p => { if (p.muolaja_turi) insMuolajaCounts[p.muolaja_turi] = (insMuolajaCounts[p.muolaja_turi] || 0) + 1; });
      const insMLabels = Object.keys(insMuolajaCounts);
      const insMVals = Object.values(insMuolajaCounts);
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
    const ishemik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')).length;
    const ishemikDavol = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')&&p.status==='chiqarildi').length;
    const ishemikVafot = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')&&p.status==='vafot').length;
    const gemorragik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')).length;
    const gemorragikDavol = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')&&p.status==='chiqarildi').length;
    const gemorragikVafot = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')&&p.status==='vafot').length;
    const tia = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')).length;
    const tiaDavol = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')&&p.status==='chiqarildi').length;
    const tiaVafot = ins.filter(p=>p.insult_turi?.toUpperCase().includes('TIA')&&p.status==='vafot').length;
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
