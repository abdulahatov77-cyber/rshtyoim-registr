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
      // infarkt_qabul va insult_qabul dan otkazilgan_muassasa bo'sh bo'lmaganlar
      const [infRes, insRes, logRes] = await Promise.all([
        getSupabase()
          .from('infarkt_qabul')
          .select('kt_no,fio,muassasa,viloyat,otkazilgan_muassasa,otkazish_sababi,qabul_vaqt,muolaja_turi')
          .not('otkazilgan_muassasa', 'is', null)
          .neq('otkazilgan_muassasa', '')
          .order('qabul_vaqt', { ascending: false })
          .range(0, 4999),
        getSupabase()
          .from('insult_qabul')
          .select('kt_no,fio,muassasa,viloyat,otkazilgan_muassasa,qabul_vaqt,muolaja_turi,mskt,mskt_angiografiya')
          .not('otkazilgan_muassasa', 'is', null)
          .neq('otkazilgan_muassasa', '')
          .order('qabul_vaqt', { ascending: false })
          .range(0, 4999),
        getSupabase()
          .from('transfer_log')
          .select('*')
          .order('sana', { ascending: true })
      ]);

      // transfer_log ni kt_no bo'yicha map
      const logMap = {};
      (logRes.data || []).forEach(row => {
        if (!logMap[row.kt_no]) logMap[row.kt_no] = [];
        logMap[row.kt_no].push(row);
      });

      // infarkt + insult bemorlarini birlashtirish
      const combined = [
        ...(infRes.data || []).map(p => ({ ...p, _type: 'infarkt' })),
        ...(insRes.data || []).map(p => ({ ...p, _type: 'insult' }))
      ];

      HarakatPage._data = combined.map(p => {
        const logs = logMap[p.kt_no] || [];
        // Zanjir: dastlabki muassasa → otkazilgan_muassasa (+ transfer_log da qo'shimcha)
        const extraMuassasalar = logs.map(r => r.muassasa_ga);
        // oxirgi nuqta: transfer_log da borsa — oxirgisi, bo'lmasa otkazilgan_muassasa
        const lastMuassasa = extraMuassasalar.length
          ? extraMuassasalar[extraMuassasalar.length - 1]
          : p.otkazilgan_muassasa;
        const lastSana = logs.length
          ? logs[logs.length - 1].sana
          : p.qabul_vaqt?.split('T')[0];

        // To'liq zanjir: dastlabki muassasa + transfer_log + oxirgi muassasa
        // transfer_log bo'lmasa: [muassasa → otkazilgan_muassasa]
        // transfer_log borsa:    [muassasa → log[0].muassasa_ga → ... → log[n].muassasa_ga]
        let fullChain;
        if (extraMuassasalar.length) {
          fullChain = [p.muassasa, ...extraMuassasalar];
        } else {
          fullChain = [p.muassasa, p.otkazilgan_muassasa];
        }

        return {
          kt_no: p.kt_no,
          bemor_turi: p._type,
          patient: p,
          fullChain,
          lastSana,
          stopsCount: fullChain.length
        };
      }).sort((a, b) => (b.lastSana || '').localeCompare(a.lastSana || ''));

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
        d.fullChain.some(m => (m||'').toLowerCase().includes(q))
      );
    }
    return list;
  },

  // Marshrut statistikasi: "A → B" yo'nalishlari nechа marta uchragani
  _routeStats() {
    const list = HarakatPage._getFiltered();
    const routes = {};   // "A → B" : soni
    const fromCount = {}; // "A" (qayerdan): soni
    const toCount = {};   // "B" (qayerga): soni
    list.forEach(d => {
      const chain = d.fullChain.filter(Boolean);
      for (let i = 0; i < chain.length - 1; i++) {
        const from = chain[i], to = chain[i+1];
        if (!from || !to || from === to) continue;
        const key = `${from} → ${to}`;
        routes[key] = (routes[key] || 0) + 1;
        fromCount[from] = (fromCount[from] || 0) + 1;
        toCount[to] = (toCount[to] || 0) + 1;
      }
    });
    const sortDesc = obj => Object.entries(obj).sort((a,b) => b[1]-a[1]);
    return {
      routes: sortDesc(routes),
      topFrom: sortDesc(fromCount).slice(0, 8),
      topTo: sortDesc(toCount).slice(0, 8)
    };
  },

  // Marshrut nazorati: klinik qoidага mos kelmagan holatlar
  _routeAudit() {
    const issues = [];
    const isAngioCenter = m => {
      const s = (m || '').toLowerCase();
      return s.includes('rshtyoim') || s.includes('angiografiya') || s.includes('angio markaz') || s.includes('endovaskulyar');
    };
    HarakatPage._getFiltered().forEach(d => {
      const p = d.patient;
      const chainStr = d.fullChain.filter(Boolean).join(' → ');
      const lastStop = d.fullChain.filter(Boolean).slice(-1)[0] || '';
      // QOIDA 1 (insult): MSKT angiografiyaда ko'rsатма bor, lekin angiografiya markazига o'tkazilmagan
      if (d.bemor_turi === 'insult' && p.mskt_angiografiya === 'Ha' && !isAngioCenter(lastStop)) {
        issues.push({ ...d, issue: 'MSKT angiografiya ko\'rsatма bor, lekin angiografiya markazига o\'tkazilmagan', chainStr });
      }
      // QOIDA 2: o'tkazish sababi ko'rsatilmagan (infarkt)
      if (d.bemor_turi === 'infarkt' && (!p.otkazish_sababi || !p.otkazish_sababi.trim())) {
        issues.push({ ...d, issue: 'O\'tkazish sababi ko\'rsatilmagan', chainStr });
      }
      // QOIDA 3: bir xil muassasага o'tkazish (marshrut xatosi)
      const chain = d.fullChain.filter(Boolean);
      for (let i = 0; i < chain.length - 1; i++) {
        if (chain[i] === chain[i+1]) {
          issues.push({ ...d, issue: 'Bir xil muassasага o\'tkazilgan', chainStr });
          break;
        }
      }
    });
    return issues;
  },

  _render() {
    const list = HarakatPage._getFiltered();
    const total = HarakatPage._data.length;
    const infCount = HarakatPage._data.filter(d => d.bemor_turi === 'infarkt').length;
    const insCount = HarakatPage._data.filter(d => d.bemor_turi === 'insult').length;

    const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Tashkent' }) : '—';

    // ===== Marshrut statistikasi =====
    const rs = HarakatPage._routeStats();
    const maxRoute = rs.routes.length ? rs.routes[0][1] : 1;
    const routesHtml = rs.routes.length === 0
      ? `<div style="color:#94a3b8;font-size:13px;padding:16px;text-align:center">Marshrut ma'lumoti yo'q</div>`
      : rs.routes.slice(0, 12).map(([route, cnt]) => {
          const pct = Math.round(cnt / maxRoute * 100);
          const [from, to] = route.split(' → ');
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:3px">
              <span style="font-size:12px;color:#334155;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${esc(from)} <span style="color:#94a3b8">→</span> <span style="font-weight:700">${esc(to)}</span>
              </span>
              <span style="font-size:12px;font-weight:800;color:#2563eb;flex-shrink:0">${cnt}</span>
            </div>
            <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#2563eb);border-radius:3px"></div>
            </div>
          </div>`;
        }).join('');

    const chipList = (arr, color) => arr.length === 0
      ? `<span style="color:#94a3b8;font-size:12px">—</span>`
      : arr.map(([nom, cnt]) => `
          <div style="display:flex;justify-content:space-between;gap:8px;padding:6px 10px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;margin-bottom:5px">
            <span style="font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nom)}</span>
            <span style="font-size:12px;font-weight:800;color:${color};flex-shrink:0">${cnt}</span>
          </div>`).join('');

    const statsBlockHtml = `
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:20px" class="route-stats-grid">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px">
          <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px">
            ${icon('git-branch',16)} Eng ko'p marshrutlar (qayerdan → qayerga)
          </div>
          ${routesHtml}
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
            <div style="font-size:12px;font-weight:800;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.03em">📤 Ko'p yuborgan</div>
            ${chipList(rs.topFrom, '#ea580c')}
          </div>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
            <div style="font-size:12px;font-weight:800;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.03em">📥 Ko'p qabul qilgan</div>
            ${chipList(rs.topTo, '#16a34a')}
          </div>
        </div>
      </div>
      <style>@media(max-width:720px){.route-stats-grid{grid-template-columns:1fr !important}}</style>`;

    // ===== Marshrut nazorati (muammoli holatlar) =====
    const auditIssues = HarakatPage._routeAudit();
    const auditHtml = auditIssues.length === 0
      ? `<div style="background:var(--ok-soft,#f0fdf4);border:1px solid #bbf7d0;border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
           <div style="width:32px;height:32px;border-radius:8px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('check',18)}</div>
           <div><div style="font-size:13px;font-weight:700;color:#16a34a">Marshrut muammosi topilmadi</div>
           <div style="font-size:12px;color:#64748b">Barcha o'tkazishlar klinik qoidага mos</div></div>
         </div>`
      : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px 18px;margin-bottom:20px">
           <div style="font-size:13px;font-weight:800;color:#d97706;margin-bottom:12px;display:flex;align-items:center;gap:8px">
             ${icon('alert-triangle',16)} Marshrut nazorati — ${auditIssues.length} ta e'tibor talab qiladigan holat
           </div>
           ${auditIssues.slice(0, 20).map(iss => `
             <div onclick="Router.go('bemor-karta',{kt_no:'${esc(String(iss.kt_no||'')).replace(/'/g,'&#39;')}',type:'${esc(String(iss.bemor_turi||''))}'})"
               style="background:white;border:1px solid #fde68a;border-radius:10px;padding:11px 14px;margin-bottom:8px;cursor:pointer">
               <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
                 <div style="min-width:0;flex:1">
                   <div style="font-size:13px;font-weight:700;color:#334155">${esc(iss.patient?.fio || '—')} <span style="font-size:11px;color:#94a3b8;font-family:monospace">${esc(iss.kt_no)}</span></div>
                   <div style="font-size:12px;color:#64748b;margin-top:2px">${esc(iss.chainStr)}</div>
                 </div>
                 <div style="font-size:11px;font-weight:700;color:#d97706;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:3px 8px;align-self:flex-start;max-width:280px">⚠️ ${esc(iss.issue)}</div>
               </div>
             </div>`).join('')}
           ${auditIssues.length > 20 ? `<div style="font-size:12px;color:#94a3b8;text-align:center;padding-top:6px">va yana ${auditIssues.length - 20} ta...</div>` : ''}
         </div>`;

    const rows = list.length === 0
      ? `<div style="text-align:center;padding:60px;color:#94a3b8">
           <div style="font-size:48px;margin-bottom:12px">🔍</div>
           <p style="font-size:15px;font-weight:600">Ko'p muassasaga o'tgan bemor topilmadi</p>
         </div>`
      : list.map(d => {
          const p = d.patient;
          const isInf = d.bemor_turi === 'infarkt';
          const chainHtml = d.fullChain.map((m, i) => `
            <span style="font-size:11px;color:#334155;font-weight:${i===d.fullChain.length-1?'700':'500'}">${esc(m||'—')}</span>
            ${i < d.fullChain.length-1 ? '<span style="color:#94a3b8;margin:0 4px">→</span>' : ''}
          `).join('');

          return `
            <div onclick="Router.go('bemor-karta',{kt_no:'${esc(String(d.kt_no||'')).replace(/'/g,'&#39;')}',type:'${esc(String(d.bemor_turi||''))}'})"
              style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;cursor:pointer;transition:box-shadow 0.15s;margin-bottom:10px"
              onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'"
              onmouseout="this.style.boxShadow='none'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                    <span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:20px;
                      background:${isInf?'rgba(239,68,68,0.1)':'rgba(59,130,246,0.1)'};
                      color:${isInf?'#dc2626':'#2563eb'}">
                      ${isInf?'❤️ Infarkt':'🧠 Insult'}
                    </span>
                    <span style="font-size:12px;font-weight:700;color:#64748b">${d.kt_no}</span>
                    <span style="font-size:11px;background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:20px;font-weight:700">
                      ${d.stopsCount + 1} muassasa
                    </span>
                  </div>
                  <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">${esc(p?.fio||'—')}</div>
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px">
                    ${chainHtml}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">So'nggi harakat</div>
                  <div style="font-size:13px;font-weight:700;color:#334155">${fmtDate(d.lastSana)}</div>
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

        <!-- Marshrut nazorati -->
        ${auditHtml}

        <!-- Marshrut statistikasi -->
        ${statsBlockHtml}

        <!-- Bemorlar ro'yxati sarlavhasi -->
        <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          ${icon('users',16)} O'tkazilgan bemorlar (${list.length})
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
