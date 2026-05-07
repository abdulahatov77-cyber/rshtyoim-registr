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
    const stemi = infs.filter(p=>p.infarkt_turi?.includes('STEMI')).length;
    const nstemi = infs.filter(p=>p.infarkt_turi?.includes('NSTEMI')).length;
    const pci = infs.filter(p=>p.muolaja_turi?.includes('PCI')||p.muolaja_turi?.includes('stentlash')).length;
    const tlt_inf = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.includes('trombolitik')).length;
    const killip34 = infs.filter(p=>p.killip?.includes('III')||p.killip?.includes('IV')).length;
    const ishemik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')).length;
    const gemorragik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')).length;
    const tia = ins.filter(p=>p.insult_turi?.toLowerCase().includes('tia')).length;
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

    const statRow = (label, val, iconName, colorClass) =>
      `<div class="h-row">
        <span class="h-label flex items-center gap-2">${icon(iconName, 16)} ${label}</span>
        <span class="h-val ${colorClass} bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">${val}</span>
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
            ${statRow('STEMI', stemi, 'activity', 'text-red-700')}
            ${statRow('NSTEMI', nstemi, 'pulse', 'text-orange-600')}
            ${statRow('PCI / Stentlash', pci, 'syringe', 'text-blue-700')}
            ${statRow('Trombolitik terapiya (TLT)', tlt_inf, 'droplets', 'text-purple-700')}
            ${statRow('Killip III-IV (kritik)', killip34, 'alert-circle', 'text-red-600')}
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
            ${statRow('Ishemik insult', ishemik, 'circle-dot', 'text-blue-700')}
            ${statRow('Gemorragik insult', gemorragik, 'droplet', 'text-red-700')}
            ${statRow('TIA', tia, 'zap', 'text-amber-600')}
            ${statRow('NIHSS ≥ 15 (og\'ir)', nihss15, 'alert-octagon', 'text-red-600')}
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
          <h3 class="h-title">${icon('pie-chart', 20)} Infarkt muolajalar</h3>
          <div style="height:250px; position:relative;">
            <canvas id="h-inf-chart"></canvas>
          </div>
        </div>
        <div class="h-card">
          <h3 class="h-title">${icon('pie-chart', 20)} Insult turlari</h3>
          <div style="height:250px; position:relative;">
            <canvas id="h-ins-chart"></canvas>
          </div>
        </div>
      </div>

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
      // Muolaja chart
      const muolajaCounts = {};
      infs.forEach(p => { if(p.muolaja_turi) muolajaCounts[p.muolaja_turi] = (muolajaCounts[p.muolaja_turi]||0)+1; });
      const mLabels = Object.keys(muolajaCounts).map(k=>k.slice(0,20));
      const mVals = Object.values(muolajaCounts);
      const ctx1 = document.getElementById('h-inf-chart')?.getContext('2d');
      if (ctx1 && mLabels.length) {
        new Chart(ctx1, { 
          type:'bar', 
          data:{
            labels: mLabels,
            datasets:[{
              data: mVals,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              hoverBackgroundColor: 'rgba(37, 99, 235, 1)',
              borderRadius: 6
            }]
          }, 
          options: {
            plugins:{ legend:{display:false} },
            scales: {
              x:{ grid:{display:false}, ticks:{font:{size:11, family:'Inter'}, color:'#1e3a8a'} },
              y:{ border:{display:false}, grid:{color:'#f1f5f9'}, beginAtZero:true, ticks:{stepSize:1, font:{size:11, family:'Inter'}, color:'#64748b'} }
            },
            responsive:true, maintainAspectRatio:false
          }
        });
      }

      // Insult pie
      const ctx2 = document.getElementById('h-ins-chart')?.getContext('2d');
      if (ctx2) {
        new Chart(ctx2, { 
          type:'doughnut', 
          data:{
            labels:['Ishemik','Gemorragik','TIA'],
            datasets:[{
              data:[ishemik, gemorragik, tia],
              backgroundColor:['#3b82f6','#ef4444','#f59e0b'],
              borderWidth: 3, borderColor: '#ffffff', hoverOffset: 6
            }]
          }, 
          options: {
            plugins: { 
              legend: { position:'right', labels:{ font:{size:12, family:'Inter'}, color:'#1e3a8a', padding: 20 } } 
            },
            responsive:true, maintainAspectRatio:false, cutout: '65%'
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
    const stemi = infs.filter(p=>p.infarkt_turi?.includes('STEMI')).length;
    const nstemi = infs.filter(p=>p.infarkt_turi?.includes('NSTEMI')).length;
    const pci = infs.filter(p=>p.muolaja_turi?.includes('PCI')||p.muolaja_turi?.includes('stentlash')).length;
    const tlt_inf = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.includes('trombolitik')).length;
    const killip34 = infs.filter(p=>p.killip?.includes('III')||p.killip?.includes('IV')).length;
    const ishemik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('ishemik')).length;
    const gemorragik = ins.filter(p=>p.insult_turi?.toLowerCase().includes('gemorragik')).length;
    const tia = ins.filter(p=>p.insult_turi?.toLowerCase().includes('tia')).length;
    const nihss15 = ins.filter(p=>p.nihss_qabul>=15).length;
    const vafot_inf = infs.filter(p=>p.status==='vafot').length;
    const vafot_ins = ins.filter(p=>p.status==='vafot').length;

    const row = (label, val) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155">${label}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;text-align:right">${val}</td></tr>`;
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
      ${row('STEMI', stemi)}
      ${row('NSTEMI', nstemi)}
      ${row('PCI / Stentlash', pci)}
      ${row('Trombolitik terapiya (TLT)', tlt_inf)}
      ${row('Killip III–IV (kritik)', killip34)}
      ${row('Vafot', vafot_inf)}
    </table>
  </div>
  <div class="card">
    <div class="card-head purple">Insult tahlili (${ins.length} ta)</div>
    <table>
      ${row('Ishemik insult', ishemik)}
      ${row('Gemorragik insult', gemorragik)}
      ${row('TIA', tia)}
      ${row('NIHSS ≥ 15 (og\'ir)', nihss15)}
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
