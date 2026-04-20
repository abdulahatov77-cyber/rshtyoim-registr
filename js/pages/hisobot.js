// ==================== HISOBOT SAHIFASI ====================
const HisobotPage = {
  _charts: {},

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'hisobot', '📈 Hisobotlar', 'Statistik tahlil va hisobotlar',
      `<div id="hisobot-inner"></div>`, user
    );
    Components.startClock();
    HisobotPage.renderUI();
  },

  renderUI() {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now()-30*864e5).toISOString().split('T')[0];
    document.getElementById('hisobot-inner').innerHTML = `
      <!-- Filter -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label class="form-label">Davr turi</label>
              <select id="h-period" class="form-select" onchange="HisobotPage.onPeriodChange()">
                <option value="custom">Maxsus sana</option>
                <option value="today">Bugun</option>
                <option value="week">So'nggi 7 kun</option>
                <option value="month" selected>So'nggi 30 kun</option>
                <option value="year">So'nggi 1 yil</option>
              </select>
            </div>
            <div>
              <label class="form-label">Dan</label>
              <input id="h-from" type="date" class="form-input" value="${monthAgo}"/>
            </div>
            <div>
              <label class="form-label">Gacha</label>
              <input id="h-to" type="date" class="form-input" value="${today}"/>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary flex-1" onclick="HisobotPage.loadReport()">📊 Ko'rish</button>
              <button class="btn btn-success" onclick="HisobotPage.exportReport()" title="Eksport">📥</button>
            </div>
          </div>
        </div>
      </div>

      <div id="h-results">
        <div class="empty-state py-16">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-title">Hisobotni ko'rish uchun "Ko'rish" tugmasini bosing</div>
        </div>
      </div>
    `;
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
    el.innerHTML = `<div class="flex justify-center py-12"><div class="spinner" style="width:32px;height:32px"></div></div>`;
    try {
      const filters = { from: from+'T00:00:00', to: to+'T23:59:59' };
      const [infs, ins] = await Promise.all([
        DB.infarktList(filters),
        DB.insultList(filters)
      ]);
      HisobotPage._lastData = { infs, ins, from, to };
      HisobotPage.renderReport(infs, ins, from, to);
    } catch(err) {
      el.innerHTML = `<div class="card p-8 text-center text-red-500">${err.message}</div>`;
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

    const stat = (label, val, cls='badge-blue') =>
      `<div class="flex justify-between items-center py-2 border-b border-slate-50">
        <span class="text-sm text-slate-600">${label}</span>
        <span class="badge ${cls} font-bold">${val}</span>
      </div>`;

    el.innerHTML = `
      <!-- Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="stat-card"><div class="stat-icon" style="background:#fee2e2">🫀</div><div><div class="stat-value text-red-600">${infs.length}</div><div class="stat-label">Jami infarkt</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">🧠</div><div><div class="stat-value text-purple-700">${ins.length}</div><div class="stat-label">Jami insult</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fef9c3">⚠️</div><div><div class="stat-value text-orange-600">${killip34+nihss15}</div><div class="stat-label">Kritik holatlar</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fee2e2">💔</div><div><div class="stat-value text-red-700">${vafot_inf+vafot_ins}</div><div class="stat-label">Vafot holatlari</div></div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <!-- Infarkt stats -->
        <div class="card">
          <div class="card-header"><span class="card-title">🫀 Infarkt (${infs.length} ta)</span></div>
          <div class="card-body">
            ${stat('STEMI',stemi,'badge-red')}
            ${stat('NSTEMI',nstemi,'badge-orange')}
            ${stat('PCI / Stentlash',pci,'badge-blue')}
            ${stat('Trombolitik terapiya (TLT)',tlt_inf,'badge-purple')}
            ${stat('Killip III-IV (kritik)',killip34,'badge-red')}
            ${stat('Vafot',vafot_inf,'badge-red')}
          </div>
        </div>
        <!-- Insult stats -->
        <div class="card">
          <div class="card-header"><span class="card-title">🧠 Insult (${ins.length} ta)</span></div>
          <div class="card-body">
            ${stat('Ishemik insult',ishemik,'badge-blue')}
            ${stat('Gemorragik insult',gemorragik,'badge-red')}
            ${stat('TIA',tia,'badge-yellow')}
            ${stat('NIHSS ≥ 15 (og\'ir)',nihss15,'badge-red')}
            ${stat('Vafot',vafot_ins,'badge-red')}
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <div class="card-header"><span class="card-title">🫀 Infarkt muolajalar</span></div>
          <div class="card-body"><canvas id="h-inf-chart" height="200"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🧠 Insult turlari</span></div>
          <div class="card-body"><canvas id="h-ins-chart" height="200"></canvas></div>
        </div>
      </div>

      <div class="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 text-center">
        📅 Hisobot davri: <b>${from}</b> dan <b>${to}</b> gacha · Jami: <b>${infs.length+ins.length}</b> ta bemor
      </div>
    `;

    // Muolaja chart
    const muolajaCounts = {};
    infs.forEach(p => { if(p.muolaja_turi) muolajaCounts[p.muolaja_turi] = (muolajaCounts[p.muolaja_turi]||0)+1; });
    const mLabels = Object.keys(muolajaCounts).map(k=>k.slice(0,20));
    const mVals = Object.values(muolajaCounts);
    const ctx1 = document.getElementById('h-inf-chart')?.getContext('2d');
    if (ctx1 && mLabels.length) {
      new Chart(ctx1, { type:'bar', data:{
        labels: mLabels,
        datasets:[{data:mVals,backgroundColor:'rgba(239,68,68,0.7)',borderRadius:6}]
      }, options:{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{stepSize:1}}},responsive:true}});
    }
    // Insult pie
    const ctx2 = document.getElementById('h-ins-chart')?.getContext('2d');
    if (ctx2) {
      new Chart(ctx2, { type:'doughnut', data:{
        labels:['Ishemik','Gemorragik','TIA','Aniqlanmagan'],
        datasets:[{data:[ishemik,gemorragik,tia,ins.length-ishemik-gemorragik-tia],
          backgroundColor:['#3b82f6','#ef4444','#eab308','#94a3b8'],borderWidth:0}]
      }, options:{plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},responsive:true,maintainAspectRatio:false}});
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
