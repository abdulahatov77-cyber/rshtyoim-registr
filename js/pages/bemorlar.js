// ==================== BEMORLAR RO'YXATI ====================
const BemorlarPage = {
  _filters: { type: 'all', status: '', viloyat: '', search: '', date: '' },
  _currentPage: 1,
  _perPage: 20,

  async render() {
    const user = await Auth.getUser();
    BemorlarPage._profile = await Profile.getCurrent();
    
    document.getElementById('app').innerHTML = Components.renderLayout(
      'bemorlar', 'Bemorlar ro\'yxati', 'Barcha registr bemorlari',
      `<div id="bemorlar-inner" class="animate-fadein"></div>`, user
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
      <div class="card mb-6 border-t-4 border-t-blue-500">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label class="form-label">${icon('filter', 14)} Registr turi</label>
            <select id="f-type" class="form-select" onchange="BemorlarPage.applyFilter()">
              <option value="all">Barchasi</option>
              <option value="infarkt" ${f.type==='infarkt'?'selected':''}>Infarkt</option>
              <option value="insult" ${f.type==='insult'?'selected':''}>Insult</option>
            </select>
          </div>
          <div>
            <label class="form-label">${icon('activity', 14)} Holat</label>
            <select id="f-status" class="form-select" onchange="BemorlarPage.applyFilter()">
              <option value="">Barchasi</option>
              <option value="active">Aktiv</option>
              <option value="chiqarildi">Chiqarildi</option>
              <option value="vafot">Vafot</option>
            </select>
          </div>
          ${BemorlarPage._profile?.role === 'admin' ? `
          <div>
            <label class="form-label">${icon('map-pin', 14)} Viloyat</label>
            <select id="f-viloyat" class="form-select" onchange="BemorlarPage.applyFilter()">
              <option value="">Barchasi</option>
              ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${f.viloyat===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          ` : ''}
          <div>
            <label class="form-label">${icon('calendar', 14)} Sana (dan)</label>
            <input type="date" id="f-date" class="form-input" onchange="BemorlarPage.applyFilter()" value="${f.date}"/>
          </div>
          <div>
            <label class="form-label">${icon('search', 14)} Qidiruv</label>
            <div class="relative">
              <input id="f-search" class="form-input pl-9" placeholder="F.I.O yoki K/T No..."
                oninput="BemorlarPage.searchDebounced()" value="${f.search}"/>
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">${icon('search', 16)}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-2">
          <button class="btn btn-secondary flex items-center gap-2" onclick="BemorlarPage.resetFilters()">
            ${icon('refresh-cw', 16)} Tozalash
          </button>
          <button class="btn btn-primary flex items-center gap-2" onclick="BemorlarPage.exportData()">
            ${icon('download', 16)} Export CSV
          </button>
        </div>
      </div>

      <!-- Table area -->
      <div class="card !p-0 overflow-hidden">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900" id="bl-count">Yuklanmoqda...</span>
          <div class="flex gap-3">
            <button class="btn btn-infarkt flex items-center gap-2" onclick="Router.go('infarkt-yangi')">
              ${icon('heart', 16)} Yangi Infarkt
            </button>
            <button class="btn btn-insult flex items-center gap-2" onclick="Router.go('insult-yangi')">
              ${icon('brain', 16)} Yangi Insult
            </button>
          </div>
        </div>
        <div class="overflow-x-auto" id="bl-table-wrap">
          <div class="flex justify-center py-16">
            <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <!-- Pagination -->
        <div id="bl-pagination" class="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between"></div>
      </div>
    `;
    BemorlarPage.searchDebounced = Utils.debounce(BemorlarPage.applyFilter, 500);
    initIcons();
  },

  applyFilter() {
    BemorlarPage._filters.type = document.getElementById('f-type')?.value || 'all';
    BemorlarPage._filters.status = document.getElementById('f-status')?.value || '';
    if (BemorlarPage._profile?.role === 'admin') {
      BemorlarPage._filters.viloyat = document.getElementById('f-viloyat')?.value || '';
    } else {
      BemorlarPage._filters.viloyat = BemorlarPage._profile?.viloyat || '';
    }
    BemorlarPage._filters.date = document.getElementById('f-date')?.value || '';
    BemorlarPage._filters.search = document.getElementById('f-search')?.value || '';
    BemorlarPage._currentPage = 1;
    BemorlarPage.loadData();
  },

  resetFilters() {
    BemorlarPage._filters = { 
      type: 'all', status: '', search: '', date: '',
      viloyat: BemorlarPage._profile?.role === 'admin' ? '' : (BemorlarPage._profile?.viloyat || '') 
    };
    BemorlarPage._currentPage = 1;
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
      
      // Additional client side date filtering if provided
      if (f.date) {
        combined = combined.filter(p => p.qabul_vaqt && p.qabul_vaqt.startsWith(f.date));
      }

      combined.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      BemorlarPage._allData = combined;
      BemorlarPage.renderTable();
    } catch(err) {
      const wrap = document.getElementById('bl-table-wrap');
      if (wrap) {
        wrap.innerHTML = `
          <div class="py-16 text-center">
            <div class="text-red-500 mb-3">${icon('alert-circle', 40, 'mx-auto')}</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Xatolik yuz berdi</h3>
            <p class="text-gray-500">${err.message}</p>
          </div>`;
        initIcons();
      }
    }
  },

  renderTable() {
    const data = BemorlarPage._allData || [];
    const countEl = document.getElementById('bl-count');
    if (countEl) countEl.innerHTML = `${icon('users', 18)} Jami: ${data.length} ta bemor`;

    const wrap = document.getElementById('bl-table-wrap');
    if (!wrap) return;

    if (data.length === 0) {
      wrap.innerHTML = `
        <div class="py-16 text-center bg-white">
          <div class="text-gray-300 mb-4">${icon('inbox', 48, 'mx-auto')}</div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">Bemor topilmadi</h3>
          <p class="text-gray-500 text-sm">Tanlangan filtrlar bo'yicha ma'lumot yo'q</p>
        </div>`;
      document.getElementById('bl-pagination').innerHTML = '';
      initIcons();
      return;
    }

    // Pagination logic
    const total = data.length;
    const totalPages = Math.ceil(total / BemorlarPage._perPage);
    if (BemorlarPage._currentPage > totalPages) BemorlarPage._currentPage = totalPages;
    const start = (BemorlarPage._currentPage - 1) * BemorlarPage._perPage;
    const pagedData = data.slice(start, start + BemorlarPage._perPage);

    wrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:12%">Tur</th>
            <th style="width:12%">K/T No</th>
            <th style="width:25%">Bemor F.I.O</th>
            <th style="width:10%">Yosh / Jins</th>
            <th style="width:15%">Viloyat</th>
            <th style="width:14%">Qabul vaqti</th>
            <th style="width:10%">Holat</th>
            <th style="width:2%"></th>
          </tr>
        </thead>
        <tbody>${pagedData.map(p=>Components.patientRow(p, p._type)).join('')}</tbody>
      </table>`;

    // Render Pagination Controls
    const pag = document.getElementById('bl-pagination');
    if (pag) {
      if (totalPages > 1) {
        pag.innerHTML = `
          <div class="text-sm text-gray-500">
            Ko'rsatilmoqda <span class="font-bold text-gray-900">${start+1}</span> - <span class="font-bold text-gray-900">${Math.min(start+BemorlarPage._perPage, total)}</span> / jami <span class="font-bold text-gray-900">${total}</span> ta
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-secondary !px-2 !py-1 ${BemorlarPage._currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" 
              onclick="if(BemorlarPage._currentPage>1){BemorlarPage._currentPage--; BemorlarPage.renderTable();}" ${BemorlarPage._currentPage === 1 ? 'disabled' : ''}>
              ${icon('chevron-left', 18)}
            </button>
            <span class="px-4 py-1 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded">
              ${BemorlarPage._currentPage} / ${totalPages}
            </span>
            <button class="btn btn-secondary !px-2 !py-1 ${BemorlarPage._currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" 
              onclick="if(BemorlarPage._currentPage<${totalPages}){BemorlarPage._currentPage++; BemorlarPage.renderTable();}" ${BemorlarPage._currentPage === totalPages ? 'disabled' : ''}>
              ${icon('chevron-right', 18)}
            </button>
          </div>
        `;
      } else {
        pag.innerHTML = `
          <div class="text-sm text-gray-500 w-full text-center">
            Barcha <span class="font-bold text-gray-900">${total}</span> ta bemor ko'rsatilmoqda
          </div>`;
      }
    }
    initIcons();
  },

  exportData() {
    if (!BemorlarPage._allData?.length) { showToast('Eksport uchun ma\'lumot yo\'q', 'warning'); return; }
    Utils.exportCSV(BemorlarPage._allData.map(p=>({
      Turi: p._type, 'K/T No': p.kt_no, 'F.I.O': p.fio,
      Viloyat: p.viloyat, Muassasa: p.muassasa,
      'Qabul vaqti': Utils.formatDateTime(p.qabul_vaqt),
      Holat: p.status, Jins: p.jins, 'Tug\'ilgan yili': p.tugilgan_yil
    })), 'bemorlar_royxati.csv');
    showToast('Eksport boshlandi', 'success');
  }
};
