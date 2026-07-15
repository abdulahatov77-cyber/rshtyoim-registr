// ==================== BEMOR HARAKATI SAHIFASI ====================
const HarakatPage = {
  _data: [],
  _filter: 'barchasi', // 'barchasi' | 'infarkt' | 'insult'
  _search: '',
  _viloyat: '',        // '' = barcha viloyat
  _from: '',           // sana dan (YYYY-MM-DD)
  _to: '',             // sana gacha

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
      // Barcha yozuvlarni 1000-qatorlik batch loop bilan olamiz (cheksiz)
      const fetchAllTransfers = async (table, cols) => {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await getSupabase()
            .from(table).select(cols)
            .not('otkazilgan_muassasa', 'is', null)
            .neq('otkazilgan_muassasa', '')
            .order('qabul_vaqt', { ascending: false })
            .range(from, from + 999);
          if (error || !data || !data.length) break;
          all = all.concat(data);
          if (data.length < 1000) break;
          from += 1000;
        }
        return all;
      };
      const [infData, insData, logRes] = await Promise.all([
        fetchAllTransfers('infarkt_qabul', 'kt_no,fio,muassasa,viloyat,otkazilgan_muassasa,otkazish_sababi,qabul_vaqt,muolaja_turi,infarkt_turi'),
        fetchAllTransfers('insult_qabul', 'kt_no,fio,muassasa,viloyat,otkazilgan_muassasa,qabul_vaqt,muolaja_turi,mskt,mskt_angiografiya'),
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
        ...(infData || []).map(p => ({ ...p, _type: 'infarkt' })),
        ...(insData || []).map(p => ({ ...p, _type: 'insult' }))
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

  // Muassasa bosqichи (marshrut darajasi): 1=TTB, 2=Politravma, 3=Angio/RSHTYOIM
  _muassasaLevel(m) {
    const s = (m || '').toLowerCase();
    if (s.includes('rshtyoim') || s.includes('angiografiya') || s.includes('angio markaz') ||
        s.includes('endovaskulyar') || s.includes('kardiologiya markaz') || s.includes('respublika shoshilinch')) return 3;
    if (s.includes('politravma')) return 2;
    return 1; // TTB, ShTB va boshqalar
  },

  _getFiltered() {
    let list = HarakatPage._data;
    if (HarakatPage._filter !== 'barchasi') {
      list = list.filter(d => d.bemor_turi === HarakatPage._filter);
    }
    // Viloyat filtri
    if (HarakatPage._viloyat) {
      list = list.filter(d => d.patient?.viloyat === HarakatPage._viloyat);
    }
    // Davr filtri (qabul_vaqt bo'yicha, UZT sana)
    const toUztDay = iso => iso ? new Date(new Date(iso).getTime()+5*3600000).toISOString().slice(0,10) : '';
    if (HarakatPage._from) {
      list = list.filter(d => toUztDay(d.patient?.qabul_vaqt) >= HarakatPage._from);
    }
    if (HarakatPage._to) {
      list = list.filter(d => toUztDay(d.patient?.qabul_vaqt) <= HarakatPage._to);
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

  // Marshrut statistikasi — FAQAT yuqorига (marshrutизация) harakat.
  // Pastга (RSHTYOIM → TTB — stabillashuvдан keyingi o'tkazish) hisoblanmaydi.
  _routeStats() {
    const list = HarakatPage._getFiltered();
    const routes = {};   // "A → B" : soni
    const fromCount = {}; // "A" (qayerdan): soni
    const toCount = {};   // "B" (qayerga): soni
    let downCount = 0;    // pastга (oddiy o'tkazish) soni
    list.forEach(d => {
      const chain = d.fullChain.filter(Boolean);
      for (let i = 0; i < chain.length - 1; i++) {
        const from = chain[i], to = chain[i+1];
        if (!from || !to || from === to) continue;
        // Faqat bosqich OSHган (yuqorига) harakat marshrutизация hisoblanadi
        if (HarakatPage._muassasaLevel(to) <= HarakatPage._muassasaLevel(from)) { downCount++; continue; }
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
      topTo: sortDesc(toCount).slice(0, 8),
      downCount
    };
  },

  // Marshrut nazorati: klinik qoidага mos kelmagan holatlar
  _routeAudit() {
    const issues = [];
    let needed = 0, correct = 0;

    HarakatPage._getFiltered().forEach(d => {
      const p = d.patient;
      const chain = d.fullChain.filter(Boolean);
      const chainStr = chain.join(' → ');
      const topLevel = Math.max(...chain.map(m => HarakatPage._muassasaLevel(m)), 1);
      const muolaja = (p.muolaja_turi || '').toLowerCase();
      let requiresRouting = false, reason = '', needLevel = 3;

      if (d.bemor_turi === 'insult') {
        const isMsktTransfer = muolaja.includes('otkazildi') && muolaja.includes('mskt');
        const isAngioTransfer = muolaja.includes('otkazildi') && (muolaja.includes('angiografiya') || muolaja.includes('endovaskulyar'));
        if (p.mskt_angiografiya === 'Ha' || isAngioTransfer) {
          // Angiografiyaga korsatma / angiografiya uchun otkazilgan - angiografiya markaziga (3-bosqich)
          requiresRouting = true; needLevel = 3;
          reason = 'Angiografiyaga korsatma bor - angiografiya markaziga otkazilishi kerak edi';
        } else if (isMsktTransfer) {
          // MSKT uchun o'tkazilgan - kamida Politravmaga (2-bosqich) borishi kerak
          requiresRouting = true; needLevel = 2;
          reason = 'MSKT uchun otkazilgan - Politravma markaziga yetishi kerak edi';
        }
      } else if (d.bemor_turi === 'infarkt') {
        const isSTEMI = (p.infarkt_turi || '').toUpperCase().includes('STEMI') && !(p.infarkt_turi || '').toUpperCase().includes('NSTEMI');
        const isKagTransfer = muolaja.includes('otkazildi') && (muolaja.includes('kag') || muolaja.includes('angiografiya'));
        if (isSTEMI || isKagTransfer) {
          requiresRouting = true; needLevel = 3;
          reason = isSTEMI ? 'STEMI - angiografiya markaziga otkazilishi kerak edi'
                           : 'KAG uchun otkazilgan - angiografiya markaziga yetishi kerak edi';
        }
      }
      if (requiresRouting) {
        needed++;
        if (topLevel >= needLevel) correct++;
        else issues.push({ ...d, issue: reason, chainStr });
      }
    });
    return { needed, correct, issues, pct: needed ? Math.round(correct / needed * 100) : null };
  },

  _OLD_routeAudit_unused() {
    const issues = []; let needed=0, correct=0;
    const isAngioCenter = m => HarakatPage._muassasaLevel(m) === 3;
    const isPolitravma = m => (m||'').toLowerCase().includes('politravma');
    HarakatPage._getFiltered().forEach(d => {
      const p = d.patient;
      const chain = d.fullChain.filter(Boolean);
      const chainStr = chain.join(' → ');
      const lastStop = chain.slice(-1)[0] || '';
      const add = (issue) => issues.push({ ...d, issue, chainStr });
      if (d.bemor_turi === 'insult') {
        // TO'G'RI marshrut: TTB → Politravma (MSKT) → [ko'rsатма bo'lsa] Angiografiya markazi
        // MUAMMO: MSKT angiografiyaда ko'rsатма bor, lekin angiografiya markazига YETIB bormagan
        if (p.mskt_angiografiya === 'Ha' && !isAngioCenter(lastStop)) {
          add('Angiografiyaга ko\'rsatма bor — angiografiya markazига o\'tkazilishi kerak edi');
        }
        // MUAMMO: Politravmага bormasдан to'g'ridan-to'g'ri angiografiya markazига (MSKT o'tkazilmagan bo'lsa)
        // (MSKT Politravmада qilinadi — agar u o'tkazib yuborilса)
      }

      if (d.bemor_turi === 'infarkt') {
        // TO'G'RI marshrut (STEMI): TTB → to'g'ridan-to'g'ri Angiografiya markazi
        const isSTEMI = (p.infarkt_turi || '').toUpperCase().includes('STEMI') && !(p.infarkt_turi || '').toUpperCase().includes('NSTEMI');
        // MUAMMO: STEMI bemor angiografiya markazига yetib bormagan
        if (isSTEMI && !isAngioCenter(lastStop)) {
          add('STEMI — angiografiya markazига o\'tkazilishi kerak edi');
        }
        // MUAMMO: STEMI Politravmага yuborilган (ortiqcha bosqich — vaqt yo'qotiladi)
        if (isSTEMI && chain.some(isPolitravma)) {
          add('STEMI Politravmага yuborilган — to\'g\'ridan-to\'g\'ri angiografiyага borishi kerak edi');
        }
      }

      // UMUMIY MUAMMO: bir xil muassасага o'tkazish
      for (let i = 0; i < chain.length - 1; i++) {
        if (chain[i] === chain[i+1]) { add('Bir xil muassасага o\'tkazilgan'); break; }
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
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">
        ℹ️ Faqat <b>marshrutизация</b> (pastдан yuqорига: TTB → Politravma → Angiografiya) ko'rsatilган. Yuqоридан pastга o'tkazish (stabillashuvдан keyin) hisobga olinmaydi${rs.downCount ? ` — <b>${rs.downCount}</b> ta shunday o'tkazish chiqarib tashlanди` : ''}.
      </div>
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:20px" class="route-stats-grid">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px">
          <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px">
            ${icon('git-branch',16)} Eng ko'p marshrutlar (yuqорига)
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

    // ===== Marshrut nazorati (foiz ko'rsatkич + muammoli holatlar) =====
    const audit = HarakatPage._routeAudit();
    const auditIssues = audit.issues;
    // Foiz ko'rsatkич kartasi
    const pctColor = audit.pct === null ? '#94a3b8' : audit.pct >= 80 ? '#16a34a' : audit.pct >= 50 ? '#d97706' : '#dc2626';
    const auditSummaryHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#0f172a">${audit.needed}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Marshrутизацияга muhtoj</div>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#16a34a">${audit.correct}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">To'g'ri marshrut</div>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center;border-color:${pctColor}33">
          <div style="font-size:28px;font-weight:800;color:${pctColor}">${audit.pct === null ? '—' : audit.pct + '%'}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">To'g'rilik darajasi</div>
        </div>
      </div>`;
    const auditHtml = auditSummaryHtml + (auditIssues.length === 0
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
           <div style="width:32px;height:32px;border-radius:8px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('check',18)}</div>
           <div><div style="font-size:13px;font-weight:700;color:#16a34a">Barcha marshrутизация to'g'ri</div>
           <div style="font-size:12px;color:#64748b">Muhtoj bemorlar angiografiya markazига yetган</div></div>
         </div>`
      : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px 18px;margin-bottom:20px">
           <div style="font-size:13px;font-weight:800;color:#d97706;margin-bottom:12px;display:flex;align-items:center;gap:8px">
             ${icon('alert-triangle',16)} Noto'g'ri marshrut — ${auditIssues.length} ta bemor angiografiya markazига yetmagan
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
         </div>`);

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

        <!-- Davr + viloyat filtri -->
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Davr:</span>
          <input type="date" value="${HarakatPage._from}" onchange="HarakatPage._setPeriod('from',this.value)"
            style="border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:12px;outline:none">
          <span style="color:#94a3b8">—</span>
          <input type="date" value="${HarakatPage._to}" onchange="HarakatPage._setPeriod('to',this.value)"
            style="border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:12px;outline:none">
          <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-left:8px">Viloyat:</span>
          <select onchange="HarakatPage._setViloyat(this.value)" style="border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:12px;outline:none;min-width:160px">
            <option value="">— Barcha viloyat —</option>
            ${(APP_CONFIG.VILOYATLAR||[]).map(v => `<option value="${esc(v)}" ${HarakatPage._viloyat===v?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
          ${(HarakatPage._from||HarakatPage._to||HarakatPage._viloyat) ? `<button onclick="HarakatPage._clearFilters()" style="margin-left:auto;padding:6px 12px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Tozalash</button>` : ''}
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
  },

  _setViloyat(v) {
    HarakatPage._viloyat = v;
    HarakatPage._render();
  },

  _setPeriod(which, v) {
    if (which === 'from') HarakatPage._from = v;
    else HarakatPage._to = v;
    HarakatPage._render();
  },

  _clearFilters() {
    HarakatPage._from = ''; HarakatPage._to = ''; HarakatPage._viloyat = '';
    HarakatPage._render();
  }
};
