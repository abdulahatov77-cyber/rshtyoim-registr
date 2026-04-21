// ==================== HISOBOT SAHIFASI ====================
const HisobotPage = {
  _charts: {},

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'hisobot', 'Hisobotlar', 'Statistik tahlil va hisobotlar',
      `<div id="hisobot-inner" class="animate-fadein"></div>`, user
    );
    Components.startClock();
    HisobotPage.renderUI();
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
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
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
          <div class="flex gap-3">
            <button class="btn btn-primary flex-1 shadow-md hover:shadow-lg flex items-center justify-center gap-2 rounded-xl" onclick="HisobotPage.loadReport()">
              ${icon('bar-chart-2', 18)} Ko'rish
            </button>
            <button class="btn btn-success shadow-md hover:shadow-lg flex items-center justify-center px-4 rounded-xl" onclick="HisobotPage.exportReport()" title="Eksport">
              ${icon('download', 18)}
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
      
      const [infs, ins] = await Promise.all([
        DB.infarktList(filters),
        DB.insultList(filters)
      ]);
      HisobotPage._lastData = { infs, ins, from, to };
      HisobotPage.renderReport(infs, ins, from, to);
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

  renderReport(infs, ins, from, to) {
    const el = document.getElementById('h-results');
    // counts
    const stemi = infs.filter(p=>p.infarkt_turi?.includes('STEMI')).length;
    const nstemi = infs.filter(p=>p.infarkt_turi?.includes('NSTEMI')).length;
    const pci = infs.filter(p=>p.muolaja_turi?.includes('PCI')||p.muolaja_turi?.includes('stentlash')).length;
    const tlt_inf = infs.filter(p=>p.muolaja_turi?.includes('TLT')||p.muolaja_turi?.includes('trombolitik')).length;
    const killip34 = infs.filter(p=>p.killip?.includes('III')||p.killip?.includes('IV')).length;
    const ishemik = ins.filter(p=>p.insult_turi?.includes('Ishemik')).length;
    const gemorragik = ins.filter(p=>p.insult_turi?.includes('Gemorragik')).length;
    const tia = ins.filter(p=>p.insult_turi?.includes('TIA')).length;
    const nihss15 = ins.filter(p=>p.nihss_qabul>=15).length;
    const vafot_inf = infs.filter(p=>p.status==='vafot').length;
    const vafot_ins = ins.filter(p=>p.status==='vafot').length;

    const statRow = (label, val, iconName, colorClass) =>
      `<div class="h-row">
        <span class="h-label flex items-center gap-2">${icon(iconName, 16)} ${label}</span>
        <span class="h-val ${colorClass} bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">${val}</span>
      </div>`;

    if (!el) return;
    el.innerHTML = `
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
      </div>

      <!-- Detail Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <!-- Infarkt Detail -->
        <div class="h-card !p-0 overflow-hidden">
          <div class="bg-red-50 p-5 border-b border-red-100">
            <h3 class="h-title !mb-0 text-red-900">${icon('activity', 24)} Infarkt tahlili (${infs.length} ta)</h3>
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
          <div class="bg-purple-50 p-5 border-b border-purple-100">
            <h3 class="h-title !mb-0 text-purple-900">${icon('brain', 24)} Insult tahlili (${ins.length} ta)</h3>
          </div>
          <div class="p-2">
            ${statRow('Ishemik insult', ishemik, 'circle-dot', 'text-blue-700')}
            ${statRow('Gemorragik insult', gemorragik, 'droplet', 'text-red-700')}
            ${statRow('TIA', tia, 'zap', 'text-amber-600')}
            ${statRow('NIHSS ≥ 15 (og\'ir)', nihss15, 'alert-octagon', 'text-red-600')}
            ${statRow('Vafot', vafot_ins, 'heart-crack', 'text-slate-700')}
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
            labels:['Ishemik','Gemorragik','TIA','Aniqlanmagan'],
            datasets:[{
              data:[ishemik, gemorragik, tia, Math.max(0, ins.length-ishemik-gemorragik-tia)],
              backgroundColor:['#3b82f6','#ef4444','#f59e0b','#94a3b8'],
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
