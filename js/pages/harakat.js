// ==================== BEMOR HARAKATI SAHIFASI ====================
const HarakatPage = {
  _data: [],
  _filter: 'barchasi', // 'barchasi' | 'infarkt' | 'insult'
  _search: '',

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'harakat', '🚑 Bemor harakati', 'Ko\'p muassasaga o\'tgan bemorlar',
      `<div id="harakat-content"><div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></div>`,
      user
    );
    Components.startClock();
    await HarakatPage._load();
  },

  async _load() {
    try {
      // transfer_log da 2+ yozuvi bor bemorlar (kt_no bo'yicha group)
      const { data, error } = await getSupabase()
        .from('transfer_log')
        .select('*')
        .order('sana', { ascending: true });
      if (error) throw error;

      // kt_no bo'yicha guruhlash
      const grouped = {};
      (data || []).forEach(row => {
        if (!grouped[row.kt_no]) grouped[row.kt_no] = [];
        grouped[row.kt_no].push(row);
      });

      // Faqat 2+ yozuvi borlar (ya'ni kamida 1 ta o'tkazish bo'lgan)
      HarakatPage._data = Object.entries(grouped)
        .filter(([, rows]) => rows.length >= 1)
        .map(([kt_no, rows]) => ({ kt_no, rows, bemor_turi: rows[0].bemor_turi }))
        .sort((a, b) => {
          const aLast = a.rows[a.rows.length - 1].sana || '';
          const bLast = b.rows[b.rows.length - 1].sana || '';
          return bLast.localeCompare(aLast);
        });

      // Bemor ma'lumotlarini ham yuklash (FIO uchun)
      const ktNos = HarakatPage._data.map(d => d.kt_no);
      if (ktNos.length) {
        const [infRes, insRes] = await Promise.all([
          getSupabase().from('infarkt_qabul').select('kt_no,fio,muassasa,viloyat').in('kt_no', ktNos),
          getSupabase().from('insult_qabul').select('kt_no,fio,muassasa,viloyat').in('kt_no', ktNos)
        ]);
        const patientMap = {};
        [...(infRes.data||[])].forEach(p => { patientMap[p.kt_no] = { ...p, _type: 'infarkt' }; });
        [...(insRes.data||[])].forEach(p => { patientMap[p.kt_no] = { ...p, _type: 'insult' }; });
        HarakatPage._data = HarakatPage._data.map(d => ({
          ...d,
          patient: patientMap[d.kt_no] || null,
          bemor_turi: patientMap[d.kt_no]?._type || d.bemor_turi
        }));
      }

      HarakatPage._render();
    } catch(e) {
      document.getElementById('harakat-content').innerHTML =
        `<div class="text-red-500 p-8 text-center">${e.message}</div>`;
    }
  },

  _getFiltered() {
    let list = HarakatPage._data;
    if (HarakatPage._filter !== 'barchasi') {
      list = list.filter(d => d.bemor_turi === HarakatPage._filter);
    }
    if (HarakatPage._search) {
      const q = HarakatPage._search.toLowerCase();
      list = list.filter(d =>
        d.kt_no.toLowerCase().includes(q) ||
        (d.patient?.fio||'').toLowerCase().includes(q) ||
        d.rows.some(r => (r.muassasa_ga||'').toLowerCase().includes(q))
      );
    }
    return list;
  },

  _render() {
    const list = HarakatPage._getFiltered();
    const total = HarakatPage._data.length;
    const infCount = HarakatPage._data.filter(d => d.bemor_turi === 'infarkt').length;
    const insCount = HarakatPage._data.filter(d => d.bemor_turi === 'insult').length;

    const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

    const rows = list.length === 0
      ? `<div style="text-align:center;padding:60px;color:#94a3b8">
           <div style="font-size:48px;margin-bottom:12px">🔍</div>
           <p style="font-size:15px;font-weight:600">Ko'p muassasaga o'tgan bemor topilmadi</p>
         </div>`
      : list.map(d => {
          const p = d.patient;
          const isInf = d.bemor_turi === 'infarkt';
          const rows = d.rows;
          const firstMuassasa = p?.muassasa || rows[0]?.muassasa_dan || '—';
          const lastMuassasa = rows[rows.length - 1]?.muassasa_ga || '—';
          const lastSana = rows[rows.length - 1]?.sana;
          const stopsCount = rows.length;

          // Zanjir: 1-muassasa → ... → oxirgi
          const chain = [firstMuassasa, ...rows.map(r => r.muassasa_ga)];
          const chainHtml = chain.map((m, i) => `
            <span style="font-size:11px;color:#334155;font-weight:${i===chain.length-1?'700':'500'}">${m}</span>
            ${i < chain.length-1 ? '<span style="color:#94a3b8;margin:0 4px">→</span>' : ''}
          `).join('');

          return `
            <div onclick="Router.go('bemor-karta',{kt_no:'${d.kt_no}',type:'${d.bemor_turi}'})"
              style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;cursor:pointer;transition:box-shadow 0.15s;margin-bottom:10px"
              onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'"
              onmouseout="this.style.boxShadow='none'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:20px;
                      background:${isInf?'rgba(239,68,68,0.1)':'rgba(59,130,246,0.1)'};
                      color:${isInf?'#dc2626':'#2563eb'}">
                      ${isInf?'❤️ Infarkt':'🧠 Insult'}
                    </span>
                    <span style="font-size:12px;font-weight:700;color:#64748b">${d.kt_no}</span>
                    <span style="font-size:11px;background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:20px;font-weight:700">
                      ${stopsCount + 1} muassasa
                    </span>
                  </div>
                  <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">${esc(p?.fio||'—')}</div>
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px">
                    ${chainHtml}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">So'nggi harakat</div>
                  <div style="font-size:13px;font-weight:700;color:#334155">${fmtDate(lastSana)}</div>
                  <div style="margin-top:8px;font-size:11px;color:#2563eb;font-weight:700">Kartani ochish →</div>
                </div>
              </div>
            </div>`;
        }).join('');

    document.getElementById('harakat-content').innerHTML = `
      <div class="animate-fadein">
        <!-- Statistika -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6">${icon('route',22)}</div>
            <div><div class="stat-value">${total}</div><div class="stat-label">Jami ko'p muassasali</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(239,68,68,0.1);color:#ef4444">${icon('heart',22)}</div>
            <div><div class="stat-value">${infCount}</div><div class="stat-label">Infarkt</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6">${icon('brain',22)}</div>
            <div><div class="stat-value">${insCount}</div><div class="stat-label">Insult</div></div>
          </div>
        </div>

        <!-- Filter va qidiruv -->
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
          <div style="display:flex;gap:6px">
            ${['barchasi','infarkt','insult'].map(f => `
              <button onclick="HarakatPage._setFilter('${f}')"
                style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.15s;
                background:${HarakatPage._filter===f?'#2563eb':'#f1f5f9'};color:${HarakatPage._filter===f?'white':'#64748b'}">
                ${f==='barchasi'?'Barchasi':f==='infarkt'?'❤️ Infarkt':'🧠 Insult'}
              </button>`).join('')}
          </div>
          <input type="text" placeholder="K/T No yoki F.I.O qidirish..."
            value="${HarakatPage._search}"
            oninput="HarakatPage._setSearch(this.value)"
            style="flex:1;min-width:200px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:13px;outline:none">
          <button onclick="HarakatPage._load()" style="padding:8px 14px;background:#f1f5f9;border:none;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;color:#64748b;display:flex;align-items:center;gap:6px">
            ${icon('refresh-cw',13)} Yangilash
          </button>
        </div>

        <!-- Ro'yxat -->
        <div>${rows}</div>
      </div>`;
    initIcons();
  },

  _setFilter(f) {
    HarakatPage._filter = f;
    HarakatPage._render();
  },

  _setSearch(v) {
    HarakatPage._search = v;
    HarakatPage._render();
  }
};
