// ==================== BEMORLAR RO'YXATI ====================
const BemorlarPage = {
  _filters: { type: 'all', status: '', viloyat: '', search: '' },

  async render() {
    const user = await Auth.getUser();
    BemorlarPage._profile = await Profile.getCurrent();
    
    document.getElementById('app').innerHTML = Components.renderLayout(
      'bemorlar', '👥 Bemorlar ro\'yxati', 'Barcha registr bemorlari',
      `<div id="bemorlar-inner"></div>`, user
    );
    Components.startClock();
    
    if (BemorlarPage._profile?.role !== 'admin') {
      BemorlarPage._filters.viloyat = BemorlarPage._profile?.viloyat || '';
    }
    
    BemorlarPage.renderFilters();
    await BemorlarPage.loadData();
  },

  renderFilters() {
    const f = BemorlarPage._filters;
    const inner = document.getElementById('bemorlar-inner');
    if (!inner) return;
    inner.innerHTML = `
      <!-- Filter Card -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label class="form-label">Registr turi</label>
              <select id="f-type" class="form-select" onchange="BemorlarPage.applyFilter()">
                <option value="all">Barchasi</option>
                <option value="infarkt" ${f.type==='infarkt'?'selected':''}>🫀 Infarkt</option>
                <option value="insult" ${f.type==='insult'?'selected':''}>🧠 Insult</option>
              </select>
            </div>
            <div>
              <label class="form-label">Holat</label>
              <select id="f-status" class="form-select" onchange="BemorlarPage.applyFilter()">
                <option value="">Barchasi</option>
                <option value="active">✅ Aktiv</option>
                <option value="chiqarildi">📤 Chiqarildi</option>
                <option value="vafot">☠️ Vafot</option>
              </select>
            </div>
            ${BemorlarPage._profile?.role === 'admin' ? `
            <div>
              <label class="form-label">Viloyat</label>
              <select id="f-viloyat" class="form-select" onchange="BemorlarPage.applyFilter()">
                <option value="">Barchasi</option>
                ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${f.viloyat===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            ` : ''}
            <div>
              <label class="form-label">Qidiruv</label>
              <input id="f-search" class="form-input" placeholder="F.I.O yoki K/T No..."
                oninput="BemorlarPage.searchDebounced()" value="${f.search}"/>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="btn btn-ghost btn-sm" onclick="BemorlarPage.resetFilters()">🔄 Tozalash</button>
            <button class="btn btn-success btn-sm" onclick="BemorlarPage.exportData()">📥 Excel/CSV</button>
          </div>
        </div>
      </div>
      <!-- Table area -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" id="bl-count">Yuklanmoqda...</span>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="Router.go('infarkt-yangi')">🫀 Infarkt</button>
            <button class="btn btn-sm" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff" onclick="Router.go('insult-yangi')">🧠 Insult</button>
          </div>
        </div>
        <div class="overflow-x-auto" id="bl-table-wrap">
          <div class="flex justify-center py-12"><div class="spinner" style="width:28px;height:28px"></div></div>
        </div>
      </div>
    `;
    BemorlarPage.searchDebounced = Utils.debounce(BemorlarPage.applyFilter, 500);
  },

  applyFilter() {
    BemorlarPage._filters.type = document.getElementById('f-type')?.value || 'all';
    BemorlarPage._filters.status = document.getElementById('f-status')?.value || '';
    if (BemorlarPage._profile?.role === 'admin') {
      BemorlarPage._filters.viloyat = document.getElementById('f-viloyat')?.value || '';
    } else {
      BemorlarPage._filters.viloyat = BemorlarPage._profile?.viloyat || '';
    }
    BemorlarPage._filters.search = document.getElementById('f-search')?.value || '';
    BemorlarPage.loadData();
  },

  resetFilters() {
    BemorlarPage._filters = { type: 'all', status: '', search: '', viloyat: BemorlarPage._profile?.role === 'admin' ? '' : (BemorlarPage._profile?.viloyat || '') };
    BemorlarPage.renderFilters();
    BemorlarPage.loadData();
  },

  async loadData() {
    const f = BemorlarPage._filters;
    const fObj = { status: f.status||undefined, viloyat: f.viloyat||undefined, search: f.search||undefined };
    try {
      let combined = [];
      if (f.type !== 'insult') {
        const infs = await DB.infarktList(fObj);
        combined.push(...infs.map(r=>({...r,_type:'infarkt'})));
      }
      if (f.type !== 'infarkt') {
        const ins = await DB.insultList(fObj);
        combined.push(...ins.map(r=>({...r,_type:'insult'})));
      }
      combined.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      BemorlarPage._allData = combined;
      BemorlarPage.renderTable(combined);
    } catch(err) {
      const wrap = document.getElementById('bl-table-wrap');
      if (wrap) {
        wrap.innerHTML = `<div class="p-8 text-center text-red-500">${err.message}</div>`;
      }
    }
  },

  renderTable(data) {
    const countEl = document.getElementById('bl-count');
    if (countEl) countEl.textContent = `Jami: ${data.length} ta bemor`;
    const wrap = document.getElementById('bl-table-wrap');
    if (!wrap) return;
    if (data.length === 0) {
      wrap.innerHTML = `<div class="empty-state py-12"><div class="empty-state-icon">📭</div><div class="empty-state-title">Bemor topilmadi</div><div class="empty-state-text">Filtrlarni o'zgartiring</div></div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>Turi</th><th>K/T No</th><th>Bemor F.I.O</th><th>Yosh·Jins</th><th>Viloyat</th><th>Qabul vaqti</th><th>Holat</th><th></th></tr>
        </thead>
        <tbody>${data.map(p=>Components.patientRow(p, p._type)).join('')}</tbody>
      </table>`;
  },

  exportData() {
    if (!BemorlarPage._allData?.length) { showToast('Eksport uchun ma\'lumot yo\'q', 'warning'); return; }
    Utils.exportCSV(BemorlarPage._allData.map(p=>({
      Turi: p._type, 'K/T No': p.kt_no, 'F.I.O': p.fio,
      Viloyat: p.viloyat, Muassasa: p.muassasa,
      'Qabul vaqti': Utils.formatDateTime(p.qabul_vaqt),
      Holat: p.status, Jins: p.jins, 'Tug\'ilgan yili': p.tugilgan_yil
    })), 'bemorlar.csv');
    showToast('✅ Eksport boshlandi', 'success');
  }
};
