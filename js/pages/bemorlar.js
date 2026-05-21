// ==================== BEMORLAR RO'YXATI ====================
const BemorlarPage = {
  _filters: { type: 'all', status: '', viloyat: '', search: '', date: '', dateTo: '', missingTime: false },
  _currentPage: 1,
  _perPage: 20,
  _selected: new Set(),

  async render() {
    const user = await Auth.getUser();
    BemorlarPage._profile = await Profile.getCurrent();
    
    document.getElementById('app').innerHTML = Components.renderLayout(
      'bemorlar', 'Bemorlar ro\'yxati', 'Barcha registr bemorlari',
      `<div id="bemorlar-inner" class="animate-fadein"></div>`, user
    );
    Components.startClock();
    
    if (BemorlarPage._profile?.role !== 'super_admin') {
      BemorlarPage._filters.viloyat = BemorlarPage._profile?.viloyat || '';
    }

    if (Router._params.type) BemorlarPage._filters.type = Router._params.type;
    if (Router._params.viloyat) BemorlarPage._filters.viloyat = Router._params.viloyat;
    if (Router._params.muassasa) BemorlarPage._filters.search = Router._params.muassasa;
    if (Router._params.search) BemorlarPage._filters.search = Router._params.search;
    if (Router._params.status) BemorlarPage._filters.status = Router._params.status;
    
    BemorlarPage.renderFilters();
    await BemorlarPage.loadData();
    Realtime.subscribeBemorlar(async () => {
      if (!document.getElementById('bemorlar-inner')) return;
      await BemorlarPage.loadData();
    });
  },

  renderFilters() {
    const f = BemorlarPage._filters;
    const inner = document.getElementById('bemorlar-inner');
    if (!inner) return;
    
    inner.innerHTML = `
      <!-- Back button -->
      <div class="mb-4 flex items-center gap-3">
        <button class="btn btn-secondary flex items-center gap-2" onclick="Router.back()">
          ${icon('arrow-left', 16)} Orqaga
        </button>
        <span class="text-gray-400 text-sm">Bemorlar ro'yxati</span>
      </div>

      <!-- Filter Card -->
      <div class="card mb-6 border-t-4 border-t-blue-500">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
          ${BemorlarPage._profile?.role === 'super_admin' ? `
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
            <label class="form-label">${icon('calendar', 14)} Sana (gacha)</label>
            <input type="date" id="f-date-to" class="form-input" onchange="BemorlarPage.applyFilter()" value="${f.dateTo}"/>
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
        <div class="flex flex-wrap gap-3 items-center justify-between border-t border-gray-100 pt-4 mt-2">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" id="f-missing-time" onchange="BemorlarPage.applyFilter()"
              ${f.missingTime ? 'checked' : ''}
              style="width:16px;height:16px;accent-color:#dc2626;cursor:pointer"/>
            <span class="text-sm font-semibold text-red-600">⏱ Vaqt mezonlari kiritilmagan</span>
          </label>
          <div class="flex gap-3">
            <button class="btn btn-secondary flex items-center gap-2" onclick="BemorlarPage.resetFilters()">
              ${icon('refresh-cw', 16)} Tozalash
            </button>
            <button class="btn flex items-center gap-2" style="background:#f59e0b;color:#fff;border:none" onclick="BemorlarPage.openBulkTimeModal()">
              ${icon('clock', 16)} Vaqt to'ldirish
            </button>
            <button class="btn btn-primary flex items-center gap-2" onclick="BemorlarPage.exportData()">
              ${icon('download', 16)} Export CSV
            </button>
          </div>
        </div>
      </div>

      <!-- Table area -->
      <div class="card !p-0 overflow-hidden">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900" id="bl-count">Yuklanmoqda...</span>
          <div class="flex gap-3 items-center">
            ${BemorlarPage._profile?.role === 'super_admin' ? `
            <button id="bl-delete-btn" class="btn flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors" style="display:none" onclick="BemorlarPage.deleteSelected()">
              ${icon('trash-2', 16)} <span id="bl-delete-count">O'chirish</span>
            </button>` : ''}
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
    if (BemorlarPage._profile?.role === 'super_admin') {
      BemorlarPage._filters.viloyat = document.getElementById('f-viloyat')?.value || '';
    } else {
      BemorlarPage._filters.viloyat = BemorlarPage._profile?.viloyat || '';
    }
    BemorlarPage._filters.date = document.getElementById('f-date')?.value || '';
    BemorlarPage._filters.dateTo = document.getElementById('f-date-to')?.value || '';
    BemorlarPage._filters.search = document.getElementById('f-search')?.value || '';
    BemorlarPage._filters.missingTime = document.getElementById('f-missing-time')?.checked || false;
    BemorlarPage._currentPage = 1;
    BemorlarPage.loadData();
  },

  resetFilters() {
    BemorlarPage._filters = {
      type: 'all', status: '', search: '', date: '', dateTo: '', missingTime: false,
      viloyat: BemorlarPage._profile?.role === 'super_admin' ? '' : (BemorlarPage._profile?.viloyat || '')
    };
    BemorlarPage._currentPage = 1;
    Router._params = {}; // Clear router params after reset
    BemorlarPage.renderFilters();
    BemorlarPage.loadData();
  },

  async loadData() {
    const f = BemorlarPage._filters;
    const page = (BemorlarPage._currentPage || 1) - 1;
    const pageSize = BemorlarPage._perPage || 50;
    const fObj = {
      status:   f.status   || undefined,
      viloyat:  f.viloyat  || undefined,
      search:   f.search   || undefined,
      page, pageSize
    };
    if (f.date)   fObj.from = f.date   + 'T00:00:00';
    if (f.dateTo) fObj.to   = f.dateTo + 'T23:59:59';
    else if (f.date) fObj.to = f.date  + 'T23:59:59';
    try {
      let combined = [];
      let totalCount = 0;
      const fetches = [];
      const fetchObj = f.missingTime ? { ...fObj, allCols: true } : fObj;
      if (f.type !== 'insult') fetches.push(DB.infarktList(fetchObj).then(r => ({ rows: r.data.map(x=>({...x,_type:'infarkt'})), count: r.count })));
      if (f.type !== 'infarkt') fetches.push(DB.insultList(fetchObj).then(r => ({ rows: r.data.map(x=>({...x,_type:'insult'})), count: r.count })));
      const results = await Promise.all(fetches);
      results.forEach(r => { combined.push(...r.rows); totalCount += r.count; });
      combined.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

      // Vaqt kiritilmagan filtr (client-side)
      if (f.missingTime) {
        combined = combined.filter(p => {
          if (p._type === 'infarkt') {
            const needsTLT = p.muolaja_turi?.includes('TLT') || p.muolaja_turi?.toLowerCase().includes('trombolitik');
            const needsPCI = p.muolaja_turi?.includes('PCI') || p.muolaja_turi?.includes('stentlash') || p.muolaja_turi?.includes('TLBAP');
            return !p.ekg_vaqti || (needsTLT && !p.tlt_vaqt) || (needsPCI && !p.pci_vaqt);
          } else {
            const needsTLT = p.muolaja_turi?.toLowerCase().includes('trombolizis') || p.muolaja_turi?.toLowerCase().includes('tlt');
            const needsTromb = p.muolaja_turi?.toLowerCase().includes('trombektomiya') || p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya');
            const needsCT = p.mskt === 'Ha – o\'tkazildi';
            return (needsTLT && !p.trombolizis_vaqti) || (needsTromb && !p.trombektomiya_vaqti) || (needsCT && !p.kt_vaqti);
          }
        });
        totalCount = combined.length;
      }

      BemorlarPage._allData = combined;
      BemorlarPage._totalCount = totalCount;
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
    const total = BemorlarPage._totalCount || data.length;
    const countEl = document.getElementById('bl-count');
    if (countEl) countEl.innerHTML = `${icon('users', 18)} Jami: ~${total} ta bemor`;

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

    const isSuperAdmin = BemorlarPage._profile?.role === 'super_admin';
    BemorlarPage._selected.clear();
    wrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            ${isSuperAdmin ? `<th style="width:3%"><input type="checkbox" id="bl-select-all" style="width:16px;height:16px;cursor:pointer" onclick="BemorlarPage.toggleAll(this.checked)"/></th>` : ''}
            <th style="width:11%">Tur</th>
            <th style="width:11%">K/T No</th>
            <th style="width:23%">Bemor F.I.O</th>
            <th style="width:10%">Yosh / Jins</th>
            <th style="width:14%">Viloyat</th>
            <th style="width:13%">Qabul vaqti</th>
            <th style="width:10%">Holat</th>
            <th style="width:2%"></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => {
            const isInf = p._type === 'infarkt';
            const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil) || '—';
            const key = p.kt_no + ':' + p._type;
            return `
              <tr class="group bl-row" data-kt="${esc(p.kt_no)}" data-type="${esc(p._type)}" style="cursor:pointer">
                ${isSuperAdmin ? `
                <td onclick="event.stopPropagation()">
                  <input type="checkbox" class="bl-cb" data-key="${esc(key)}" style="width:16px;height:16px;cursor:pointer"
                    onchange="BemorlarPage.toggleRow(this)"/>
                </td>` : ''}
                <td>
                  <span class="badge ${isInf ? 'badge-red' : 'badge-purple'} flex items-center gap-1.5 w-fit">
                    ${icon(isInf ? 'heart' : 'brain', 14)} ${isInf ? 'Infarkt' : 'Insult'}
                  </span>
                </td>
                <td class="font-mono text-xs text-gray-500">${esc(p.kt_no)}</td>
                <td><div class="font-semibold text-gray-900">${esc(p.fio) || '—'}</div></td>
                <td>${esc(age)} yosh · ${esc(p.jins || p.jinsi) || '—'}</td>
                <td><div class="flex items-center gap-1.5 text-gray-600">${icon('map-pin', 14)} ${esc(p.viloyat) || '—'}</div></td>
                <td>
                  <div class="flex flex-col">
                    <span class="text-gray-900">${Utils.formatDate(p.qabul_vaqt)}</span>
                    <span class="text-xs text-gray-500">${Utils.formatDateTime(p.qabul_vaqt).split(', ')[1] || ''}</span>
                  </div>
                </td>
                <td>
                  <div class="flex flex-col gap-1">
                    ${Utils.statusBadge(p.status)}
                    ${p.status === 'otkazildi' && p.otkazilgan_muassasa ? `<span class="text-xs text-orange-600 font-medium truncate max-w-[140px]" title="${esc(p.otkazilgan_muassasa)}">→ ${esc(p.otkazilgan_muassasa)}</span>` : ''}
                  </div>
                </td>
                <td class="text-right text-gray-400">${icon('chevron-right', 20)}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    // Server-side pagination controls
    const cur = BemorlarPage._currentPage || 1;
    const perPage = BemorlarPage._perPage;
    const hasPrev = cur > 1;
    const hasNext = (cur * perPage) < total;
    const pag = document.getElementById('bl-pagination');
    if (pag) {
      if (total > perPage) {
        const from = (cur - 1) * perPage + 1;
        const to   = Math.min(cur * perPage, total);
        pag.innerHTML = `
          <div class="text-sm text-gray-500">
            <span class="font-bold text-gray-900">${from}–${to}</span> / jami <span class="font-bold text-gray-900">${total}</span> ta bemor
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-secondary !px-2 !py-1 ${!hasPrev ? 'opacity-50 cursor-not-allowed' : ''}"
              onclick="if(BemorlarPage._currentPage>1){BemorlarPage._currentPage--;BemorlarPage.loadData();}" ${!hasPrev ? 'disabled' : ''}>
              ${icon('chevron-left', 18)}
            </button>
            <span class="px-4 py-1 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded">${cur}</span>
            <button class="btn btn-secondary !px-2 !py-1 ${!hasNext ? 'opacity-50 cursor-not-allowed' : ''}"
              onclick="if(${hasNext}){BemorlarPage._currentPage++;BemorlarPage.loadData();}" ${!hasNext ? 'disabled' : ''}>
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

    // tr click — data-atribut orqali xavfsiz navigatsiya
    document.querySelectorAll('.bl-row').forEach(tr => {
      tr.addEventListener('click', function(e) {
        if (e.target.closest('.bl-cb') || e.target.type === 'checkbox') return;
        Router.go('bemor-karta', { kt_no: this.dataset.kt, type: this.dataset.type });
      });
    });
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
  },

  _updateDeleteBtn() {
    const btn = document.getElementById('bl-delete-btn');
    const lbl = document.getElementById('bl-delete-count');
    if (!btn) return;
    const n = BemorlarPage._selected.size;
    btn.style.display = n > 0 ? '' : 'none';
    if (lbl) lbl.textContent = `${n} ta o'chirish`;
  },

  toggleRow(cb) {
    const key = cb.dataset.key;
    if (cb.checked) BemorlarPage._selected.add(key);
    else BemorlarPage._selected.delete(key);
    const all = document.querySelectorAll('.bl-cb');
    const allChecked = [...all].every(c => c.checked);
    const selectAll = document.getElementById('bl-select-all');
    if (selectAll) selectAll.checked = allChecked;
    BemorlarPage._updateDeleteBtn();
  },

  toggleAll(checked) {
    document.querySelectorAll('.bl-cb').forEach(cb => {
      cb.checked = checked;
      const key = cb.dataset.key;
      if (checked) BemorlarPage._selected.add(key);
      else BemorlarPage._selected.delete(key);
    });
    BemorlarPage._updateDeleteBtn();
  },

  async openBulkTimeModal() {
    showModal({
      title: `${icon('clock',18)} Vaqt mezonlarini to'ldirish`,
      size: 'xl',
      body: `<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Yopish</button>`
    });

    // Vaqt kiritilmagan barcha bemorlarni yuklash
    const fetchAll = async (table, cols) => {
      let all = [], offset = 0;
      const sb = getSupabase();
      const p = BemorlarPage._profile;
      while (true) {
        let q = sb.from(table).select(cols).range(offset, offset + 999);
        if (p?.role !== 'super_admin' && p?.viloyat) q = q.eq('viloyat', p.viloyat);
        const { data, error } = await q;
        if (error || !data || !data.length) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    };

    const [infRows, insRows] = await Promise.all([
      fetchAll('infarkt_qabul', 'kt_no,fio,muolaja_turi,qabul_vaqt,ekg_vaqti,tlt_vaqt,pci_vaqt,viloyat'),
      fetchAll('insult_qabul', 'kt_no,fio,muolaja_turi,mskt,qabul_vaqt,kt_vaqti,trombolizis_vaqti,trombektomiya_vaqti,viloyat')
    ]);

    // Filtrlash: faqat vaqt kiritilmaganlar
    const missing = [];
    infRows.forEach(p => {
      const mt = (p.muolaja_turi||'').toLowerCase();
      const needsTLT = mt.includes('tlt') || mt.includes('trombolitik');
      const needsPCI = mt.includes('pci') || mt.includes('stentlash') || mt.includes('kag') || mt.includes('tlbap');
      const fields = [];
      if (!p.ekg_vaqti) fields.push({ id:'ekg_vaqti', label:'EKG vaqti', type:'time', val:'' });
      if (needsTLT && !p.tlt_vaqt) fields.push({ id:'tlt_vaqt', label:'TLT vaqti', type:'datetime-local', val:'' });
      if (needsPCI && !p.pci_vaqt) fields.push({ id:'pci_vaqt', label:'PCI/Groin vaqti', type:'datetime-local', val:'' });
      if (fields.length) missing.push({ ...p, _type:'infarkt', _fields: fields });
    });
    insRows.forEach(p => {
      const mt = (p.muolaja_turi||'').toLowerCase();
      const isMskt = p.mskt === "Ha – o'tkazildi";
      const needsTLT = mt.includes('trombolizis') || mt.includes('tlt');
      const needsTromb = mt.includes('trombektomiya') || mt.includes('tromboekstraksiya') || mt.includes('tromboaspiratsiya') || mt.includes('kombinatsiya');
      const fields = [];
      if (isMskt && !p.kt_vaqti) fields.push({ id:'kt_vaqti', label:'KT/MSKT vaqti', type:'datetime-local', val:'' });
      if (needsTLT && !p.trombolizis_vaqti) fields.push({ id:'trombolizis_vaqti', label:'Trombolizis vaqti', type:'datetime-local', val:'' });
      if (needsTromb && !p.trombektomiya_vaqti) fields.push({ id:'trombektomiya_vaqti', label:'Trombektomiya vaqti', type:'datetime-local', val:'' });
      if (fields.length) missing.push({ ...p, _type:'insult', _fields: fields });
    });

    BemorlarPage._bulkList = missing;

    const modalBody = document.querySelector('#modal-container .modal-body, #modal-container [class*="modal"]');
    const bodyEl = document.querySelector('#modal-container .overflow-y-auto') || document.querySelector('#modal-container .modal-body');

    if (!missing.length) {
      if (bodyEl) bodyEl.innerHTML = `<div class="py-12 text-center text-green-600 font-semibold">${icon('check-circle',32,'mx-auto mb-3')} Barcha vaqt mezonlari to'ldirilgan!</div>`;
      initIcons();
      return;
    }

    const rows = missing.map((p, i) => {
      const isInf = p._type === 'infarkt';
      const badge = isInf
        ? `<span class="badge badge-red text-xs">Infarkt</span>`
        : `<span class="badge badge-purple text-xs">Insult</span>`;
      const fieldHtml = p._fields.map(f => `
        <div class="flex items-center gap-2 mt-1">
          <label class="text-xs text-gray-500 w-32 shrink-0">${f.label}</label>
          <input type="${f.type}" class="form-input !py-1 !text-sm flex-1"
            id="bulk-${i}-${f.id}" placeholder="${f.label}"/>
        </div>`).join('');
      return `
        <div class="border border-gray-200 rounded-lg p-3 mb-2" id="bulk-row-${i}">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              ${badge}
              <span class="font-semibold text-sm text-gray-900">${esc(p.fio||'—')}</span>
              <span class="text-xs text-gray-400 font-mono">${esc(p.kt_no)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">${Utils.formatDateTime(p.qabul_vaqt)}</span>
              <button class="btn btn-primary !py-1 !px-3 !text-xs" onclick="BemorlarPage.saveBulkRow(${i})">
                ${icon('save',13)} Saqlash
              </button>
            </div>
          </div>
          <div class="text-xs text-gray-500 mb-1">${esc(p.muolaja_turi||'—')}</div>
          ${fieldHtml}
        </div>`;
    }).join('');

    if (bodyEl) bodyEl.innerHTML = `
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-3 py-1">
          ${icon('alert-triangle',14)} ${missing.length} ta bemorda vaqt kiritilmagan
        </span>
        <button class="btn btn-primary flex items-center gap-2 !text-sm" onclick="BemorlarPage.saveAllBulk()">
          ${icon('save',15)} Hammasini saqlash
        </button>
      </div>
      <div id="bulk-list">${rows}</div>`;
    initIcons();
  },

  async saveBulkRow(i) {
    const p = BemorlarPage._bulkList[i];
    if (!p) return;
    const updates = {};
    const toUTC = raw => raw ? new Date(raw + ':00+05:00').toISOString() : null;
    p._fields.forEach(f => {
      const el = document.getElementById(`bulk-${i}-${f.id}`);
      if (!el || !el.value) return;
      updates[f.id] = f.type === 'time' ? el.value : toUTC(el.value);
    });
    if (!Object.keys(updates).length) { showToast('Vaqt kiritilmagan', 'warning'); return; }
    const btn = event.target.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = '...'; }
    try {
      const sb = getSupabase();
      const table = p._type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
      const { error } = await sb.from(table).update(updates).eq('kt_no', p.kt_no);
      if (error) throw error;
      const row = document.getElementById(`bulk-row-${i}`);
      if (row) row.innerHTML = `<div class="flex items-center gap-2 py-1 text-green-600 text-sm">${icon('check-circle',16)} <b>${esc(p.fio)}</b> — saqlandi</div>`;
      initIcons();
    } catch(err) {
      showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = `${icon('save',13)} Saqlash`; }
    }
  },

  async saveAllBulk() {
    const list = BemorlarPage._bulkList;
    if (!list?.length) return;
    const btn = event.target.closest('button');
    if (btn) { btn.disabled = true; btn.textContent = 'Saqlanmoqda...'; }
    let saved = 0, skipped = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const updates = {};
      const toUTC = raw => raw ? new Date(raw + ':00+05:00').toISOString() : null;
      p._fields.forEach(f => {
        const el = document.getElementById(`bulk-${i}-${f.id}`);
        if (!el || !el.value) return;
        updates[f.id] = f.type === 'time' ? el.value : toUTC(el.value);
      });
      if (!Object.keys(updates).length) { skipped++; continue; }
      try {
        const sb = getSupabase();
        const table = p._type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
        const { error } = await sb.from(table).update(updates).eq('kt_no', p.kt_no);
        if (!error) {
          saved++;
          const row = document.getElementById(`bulk-row-${i}`);
          if (row) row.innerHTML = `<div class="flex items-center gap-2 py-1 text-green-600 text-sm">${icon('check-circle',16)} <b>${esc(p.fio)}</b> — saqlandi</div>`;
        }
      } catch(e) { skipped++; }
    }
    initIcons();
    if (btn) { btn.disabled = false; btn.textContent = 'Hammasini saqlash'; }
    showToast(`${saved} ta saqlandi${skipped ? `, ${skipped} ta o'tkazildi` : ''}`, saved > 0 ? 'success' : 'warning');
  },

  async deleteSelected() {
    const n = BemorlarPage._selected.size;
    if (!n) return;
    if (!confirm(`Tanlangan ${n} ta bemorni o'chirishni tasdiqlaysizmi?\nBu amalni qaytarib bo'lmaydi!`)) return;
    const btn = document.getElementById('bl-delete-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'O\'chirilmoqda...'; }
    const sb = getSupabase();
    const errors = [];
    for (const key of BemorlarPage._selected) {
      const [kt_no, type] = key.split(':');
      const table = type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
      const { error } = await sb.from(table).delete().eq('kt_no', kt_no);
      if (error) errors.push(kt_no);
    }
    if (errors.length) showToast(`${errors.length} ta o'chirishda xatolik`, 'error');
    else showToast(`${n} ta bemor o'chirildi`, 'success');
    BemorlarPage._selected.clear();
    await BemorlarPage.loadData();
  }
};
