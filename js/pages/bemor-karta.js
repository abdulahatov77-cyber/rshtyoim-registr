// ==================== BEMOR KARTA ====================
const BemorKartaPage = {
  _activeTab: 0,
  _patient: null,
  _type: null,
  _navList: [],
  _navIndex: -1,

  async render(params) {
    const { kt_no, type } = params || {};
    if (!kt_no || !type) { Router.go('bemorlar'); return; }
    // Clean up previous keyboard listener from any prior karta render
    if (BemorKartaPage._keyHandler) {
      document.removeEventListener('keydown', BemorKartaPage._keyHandler);
      BemorKartaPage._keyHandler = null;
    }
    BemorKartaPage._type = type;
    BemorKartaPage._activeTab = 0;

    // Smart nav list preservation:
    // If this patient is already in our current navList (prev/next navigation within karta),
    // just update the index — don't blow away the list.
    // Only rebuild when arriving fresh from bemorlar or dashboard.
    const existingIdx = BemorKartaPage._navList.findIndex(
      p => String(p.kt_no) === String(kt_no) && p._type === type
    );
    if (existingIdx >= 0) {
      // We are navigating within an existing list — preserve it
      BemorKartaPage._navIndex = existingIdx;
    } else {
      // Fresh entry — rebuild from BemorlarPage cache
      const freshList = (window.BemorlarPage?._allData) || [];
      BemorKartaPage._navList = freshList;
      BemorKartaPage._navIndex = freshList.findIndex(
        p => String(p.kt_no) === String(kt_no) && p._type === type
      );
    }

    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'bemorlar', 'Bemor kartasi', `K/T No: ${kt_no}`,
      `<div id="karta-inner" class="animate-fadein"><div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></div>`,
      user
    );
    Components.startClock();
    try {
      const profile = await Profile.getCurrent();
      BemorKartaPage._profile = profile;
      const patient = type === 'infarkt' ? await DB.infarktByKtNo(kt_no) : await DB.insultByKtNo(kt_no);
      // O'tkazilgan sana — avval chiqarish jadvalidan, bo'lmasa dinamika jadvalidan
      try {
        const tbl = type === 'infarkt' ? 'infarkt_chiqarish' : 'insult_chiqarish';
        const { data: chiq } = await getSupabase().from(tbl).select('chiqish_sana,chiqish_holat,natija').eq('kt_no', kt_no).order('chiqish_sana', { ascending: false }).limit(1);
        if (chiq && chiq.length > 0) {
          patient._chiqarish = chiq[0];
        } else if (patient.otkazilgan_muassasa) {
          // Dinamika jadvalidan o'tkazilgan yozuvni topamiz
          const { data: din } = await getSupabase()
            .from('dinamika_muolajalar')
            .select('created_at,muolaja_turi')
            .eq('kt_no', kt_no)
            .ilike('muolaja_turi', "%o'tkazildi%")
            .order('created_at', { ascending: false })
            .limit(1);
          if (din && din.length > 0) {
            patient._chiqarish = { chiqish_sana: din[0].created_at };
          } else if (patient.updated_at) {
            patient._chiqarish = { chiqish_sana: patient.updated_at };
          }
        }
      } catch(e) { /* ignore */ }
      BemorKartaPage._patient = patient;
      BemorKartaPage.renderContent(patient, type);

      // If we still have no nav context (arrived from dashboard/direct link),
      // load the full patient list in background and update the nav bar once ready.
      if (BemorKartaPage._navIndex < 0) {
        BemorKartaPage._loadNavAndUpdate(kt_no, type);
      }
    } catch(err) {
      const inner = document.getElementById('karta-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="card p-12 text-center max-w-lg mx-auto mt-10">
            <div class="text-red-500 mb-4">${icon('alert-circle', 48, 'mx-auto')}</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Xatolik yuz berdi</h3>
            <p class="text-gray-500 mb-6">${err.message}</p>
            <button class="btn btn-primary" onclick="Router.go('bemorlar')">Orqaga qaytish</button>
          </div>`;
        initIcons();
      }
    }
  },

  // Fetch full patient list in background (used when arriving from dashboard/direct link)
  async _loadNavAndUpdate(kt_no, type) {
    try {
      const profile = BemorKartaPage._profile;
      const viloyatFilter = profile?.role === 'super_admin' ? undefined : (profile?.viloyat || undefined);
      const fObj = { pageSize: 200, viloyat: viloyatFilter };
      const [infRes, insRes] = await Promise.all([
        DB.infarktList(fObj),
        DB.insultList(fObj)
      ]);
      const combined = [
        ...(infRes.data || []).map(p => ({ ...p, _type: 'infarkt' })),
        ...(insRes.data || []).map(p => ({ ...p, _type: 'insult' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      BemorKartaPage._navList = combined;
      BemorKartaPage._navIndex = combined.findIndex(
        p => p.kt_no === kt_no && p._type === type
      );
      // Update just the nav bar in the DOM (no full re-render)
      BemorKartaPage._updateNavBar();
    } catch(e) {
      console.warn('Nav list background load failed:', e.message);
    }
  },

  // Update only the navigation bar portion of the DOM
  _updateNavBar() {
    const navEl = document.getElementById('karta-nav-bar');
    if (!navEl) return;
    const navList = BemorKartaPage._navList;
    const navIdx  = BemorKartaPage._navIndex;
    const hasPrev = navIdx > 0;
    const hasNext = navIdx >= 0 && navIdx < navList.length - 1;
    navEl.innerHTML = BemorKartaPage._renderNavButtons(navList, navIdx, hasPrev, hasNext);
    initIcons();
  },

  // Render the prev/next nav buttons HTML
  _renderNavButtons(navList, navIdx, hasPrev, hasNext) {
    if (navList.length === 0) {
      // Still loading
      return `<div class="flex items-center gap-2 text-slate-400 text-xs">
        <div class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        Ro'yxat yuklanmoqda...
      </div>`;
    }
    return `
      <div class="flex items-center gap-1.5">
        <button
          class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 shadow-sm ${hasPrev ? 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'}" 
          ${hasPrev ? 'onclick="BemorKartaPage.navPrev()"' : 'disabled'}>
          ${icon('chevron-left', 18)} Avvalgi
        </button>

        <span class="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 shadow-sm min-w-[60px] text-center">
          ${navIdx >= 0 ? `${navIdx + 1} / ${navList.length}` : `— / ${navList.length}`}
        </span>

        <button
          class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 shadow-sm ${hasNext ? 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'}"
          ${hasNext ? 'onclick="BemorKartaPage.navNext()"' : 'disabled'}>
          Keyingi ${icon('chevron-right', 18)}
        </button>
      </div>`;
  },

  renderContent(p, type) {
    const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil);
    const inner = document.getElementById('karta-inner');
    if (!inner) return;

    const bgGradient = type === 'infarkt' ? 'from-red-600 to-red-800' : 'from-purple-600 to-purple-800';
    const initial = p.fio ? p.fio.charAt(0).toUpperCase() : '?';
    const canEdit = BemorKartaPage._profile?.role === 'admin' || BemorKartaPage._profile?.role === 'super_admin';
    const isSuperAdmin = BemorKartaPage._profile?.role === 'super_admin';

    const navList = BemorKartaPage._navList;
    const navIdx  = BemorKartaPage._navIndex;
    const hasPrev = navIdx > 0;
    const hasNext = navIdx >= 0 && navIdx < navList.length - 1;

    inner.innerHTML = `
      <!-- Nav bar -->
      <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <button class="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all" onclick="Router.go('bemorlar')">
          ${icon('arrow-left', 16)} Bemorlar ro'yxati
        </button>

        <div id="karta-nav-bar" class="flex items-center gap-1.5">
          ${BemorKartaPage._renderNavButtons(navList, navIdx, hasPrev, hasNext)}
        </div>
      </div>

      <!-- Header Banner -->
      <div class="bg-gradient-to-r ${bgGradient} rounded-2xl p-6 sm:p-8 mb-6 text-white shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30 shadow-inner backdrop-blur-sm">
              ${initial}
            </div>
            <div>
              <div class="flex items-center gap-3 mb-1 flex-wrap">
                <h2 class="text-2xl font-bold m-0">${p.fio||'Ism kiritilmagan'}</h2>
                ${p.status==='active'
                  ? '<span class="bg-green-500/20 text-green-100 border border-green-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">AKTIV</span>'
                  : p.status==='chiqarildi'
                  ? '<span class="bg-blue-500/20 text-blue-100 border border-blue-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">CHIQARILGAN</span>'
                  : p.status==='otkazildi'
                  ? '<span class="bg-orange-500/30 text-orange-100 border border-orange-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">O\'TKAZILGAN</span>'
                  : '<span class="bg-gray-500/50 text-gray-100 border border-gray-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">VAFOT</span>'}
              </div>
              <p class="text-white/80 text-sm font-medium mb-1">
                K/T: <span class="font-bold text-white">${p.kt_no}</span> &nbsp;&bull;&nbsp; ${age?age+' yosh':'Yoshi nom\'alum'} &nbsp;&bull;&nbsp; ${p.viloyat||'Viloyat noma\'lum'}
              </p>
              <p class="text-white/60 text-xs flex items-center gap-1 mt-2">
                ${icon('clock', 12)} Qabul qilingan: ${Utils.formatDateTime(p.qabul_vaqt)}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            ${canEdit ? `
              <button class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2" onclick="BemorKartaPage.editPatient()">
                ${icon('edit-3', 16)} Tahrirlash
              </button>` : ''}
            ${p.status==='active'?`
              <button class="px-5 py-2 bg-white text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2" onclick="BemorKartaPage.chiqarishModal()">
                ${icon('log-out', 16)} Chiqarish
              </button>
            `:''}
            ${isSuperAdmin ? `
              <button class="px-4 py-2 bg-red-600/90 text-white hover:bg-red-600 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2" onclick="BemorKartaPage.deletePatient()">
                ${icon('trash-2', 16)} O'chirish
              </button>
            `:''}
          </div>
        </div>
      </div>

      <!-- Status-muolaja nomuvofiqlik ogohlantirishi -->
      ${(p.status === 'vafot' && p.muolaja_turi?.includes("o'tkazildi")) || (p.status === 'otkazildi' && p.muolaja_turi?.toLowerCase().includes('vafot')) ? `
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:12px 16px;margin-bottom:16px;color:#92400e;display:flex;gap:10px;align-items:center">
        <span style="font-size:20px">⚠️</span>
        <span><b>Diqqat:</b> Bemor holati (<b>${p.status === 'vafot' ? 'Vafot' : "O'tkazildi"}</b>) va muolaja (<b>${esc(p.muolaja_turi||'')}</b>) mos kelmaydi — Tahrirlash orqali to'g'irlang</span>
      </div>` : ''}

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
        ${['Umumiy', 'Davolash', 'Holat', 'Multimedia', 'Navbatchi', 'Chiqarish', 'Kuzatuv'].map((t, i) => `
          <button onclick="BemorKartaPage.switchTab(${i})" id="tab-btn-${i}" class="px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${BemorKartaPage._activeTab === i ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}">
            ${t}
          </button>
        `).join('')}
      </div>

      <!-- Tab Contents -->
      <div id="tab-content" class="min-h-[400px]"></div>
    `;
    BemorKartaPage.loadTab(0);
    initIcons();
    BemorKartaPage._bindKeyNav();
  },

  _bindKeyNav() {
    // Remove any previous listener to avoid duplicates
    if (BemorKartaPage._keyHandler) {
      document.removeEventListener('keydown', BemorKartaPage._keyHandler);
    }
    BemorKartaPage._keyHandler = (e) => {
      // Only fire when no input/textarea/select is focused
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft')  BemorKartaPage.navPrev();
      if (e.key === 'ArrowRight') BemorKartaPage.navNext();
    };
    document.addEventListener('keydown', BemorKartaPage._keyHandler);
  },

  switchTab(idx) {
    // Update buttons
    for (let i=0; i<7; i++) {
      const btn = document.getElementById(`tab-btn-${i}`);
      if (btn) {
        if (i === idx) {
          btn.className = 'px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap bg-blue-600 text-white shadow-md';
        } else {
          btn.className = 'px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap bg-white text-gray-600 hover:bg-gray-100 border border-gray-200';
        }
      }
    }
    BemorKartaPage._activeTab = idx;
    BemorKartaPage.loadTab(idx);
  },

  loadTab(idx) {
    const cont = document.getElementById('tab-content');
    if (!cont) return;
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    
    // Add fade out/in effect
    cont.classList.remove('animate-fadein');
    void cont.offsetWidth; // trigger reflow
    cont.classList.add('animate-fadein');

    if      (idx===0) BemorKartaPage.renderUmumiy(cont, p, type);
    else if (idx===1) BemorKartaPage.renderDavolash(cont, p, type);
    else if (idx===2) BemorKartaPage.renderHolat(cont, p, type);
    else if (idx===3) BemorKartaPage.renderMultimedia(cont, p, type);
    else if (idx===4) BemorKartaPage.renderShift(cont, p, type);
    else if (idx===5) BemorKartaPage.renderChiqarish(cont, p, type);
    else if (idx===6) BemorKartaPage.renderKuzatuv(cont, p, type);
    
    initIcons();
  },

  renderUmumiy(el, p, type) {
    const row = (label, val) => `
      <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <span class="text-sm text-gray-500">${label}</span>
        <span class="text-sm font-semibold text-gray-900 text-right max-w-[60%]">${val||'—'}</span>
      </div>`;
      
    // Tug'ilgan sanasini to'g'ri o'qish
    const tugilgan = p.tugilgan_sana || p.tugilgan_yil || '';
    const tugilganDisplay = tugilgan
      ? (tugilgan.includes('-') && tugilgan.length >= 10
          ? new Date(tugilgan).toLocaleDateString('uz-UZ', {day:'2-digit',month:'2-digit',year:'numeric'})
          : tugilgan)
      : null;

    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card !mb-0">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('user', 18)} Shaxsiy ma'lumotlar</h3></div>
          <div class="card-body p-5">
            ${row('Tug\'ilgan sanasi', tugilganDisplay)}
            ${row('Jinsi', p.jins)}
            ${row('Viloyat', p.viloyat)}
            ${row('Muassasa', p.muassasa)}
            ${row('Murojaat yo\'li', p.murojaat_yoli)}
            ${row('Yuborgan muassasa', p.yuborgan_muassasa)}
          </div>
        </div>
        <div class="card !mb-0">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('activity', 18)} Klinik holat (Qabul)</h3></div>
          <div class="card-body p-5">
            ${row('Qon bosimi', p.qon_bosimi)}
            ${type==='infarkt'?`
              ${row('Infarkt turi', (() => { const t = p.infarkt_turi; if (!t) return null; if (t === 'STEMI' || t.toUpperCase() === 'STEMI') return "O'KS ST elevatsiya bilan (STEMI)"; if (t === 'NSTEMI' || t.toUpperCase() === 'NSTEMI') return "O'KS ST elevatsiyasiz (NSTEMI)"; if (t.includes("O'tkir miokard infarkti")) return "O'tkir miokard infarkti (AMI)"; return t; })())}
              ${row('Killip klassifikatsiyasi', p.killip)}
              ${row('Troponin', p.troponin)}
              ${row('KFK-MB', p.kkfmb)}
              ${row('EKG vaqti', p.ekg_vaqti)}
              ${row('Puls', p.puls || null)}
              ${row('AHA bali', p.aha_bali ? p.aha_bali + ' ball' : null)}
            `: `
              ${row('Insult turi', p.insult_turi)}
              ${row('NIHSS (qabul)', p.nihss_qabul!=null ? p.nihss_qabul+' ball' : null)}
              ${row('GCS (Glazgo)', p.gcs_bali!=null ? p.gcs_bali+' ball' : null)}
              ${row('AHA bali', p.aha_bali!=null ? p.aha_bali+' ball' : null)}
              ${row('MSKT o\'tkazilganmi?', p.mskt)}
            `}
            ${row('Asosiy muolaja', p.muolaja_turi)}
            ${p.otkazilgan_muassasa ? row('O\'tkazilgan muassasa', p.otkazilgan_muassasa) : ''}
          </div>
        </div>
        <div class="card !mb-0">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('clock', 18)} Vaqt ko'rsatkichlari</h3></div>
          <div class="card-body p-5">
            ${type==='infarkt' ? row('Kasallik turi', p.birlamchi_yoki_takroriy) : ''}
            ${row('Simptomlar boshlanishi', p.simptom_vaqt)}
            ${row('Shifoxonaga keldi', Utils.formatDateTime(p.qabul_vaqt))}
            ${type==='infarkt' ? `
              ${row('Birinchi murojaat', Utils.formatDateTime(p.birinchi_murojaat_vaqti))}
              ${row('Tez yordam yetib keldi', Utils.formatDateTime(p.tez_yordam_kelgan_vaqt))}
            ` : ''}
            ${p.reabilitatsiya_boshlangan_vaqt ? row('Reabilitatsiya boshlandi', Utils.formatDateTime(p.reabilitatsiya_boshlangan_vaqt)) : ''}
          </div>
        </div>
        <div class="card !mb-0 lg:col-span-2">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('alert-triangle', 18)} Xavf omillari</h3></div>
          <div class="card-body p-5">
            <div class="mb-4">
              <span class="text-sm text-gray-500 block mb-2">Qayd etilgan xavf omillari:</span>
              <div class="flex flex-wrap gap-2">
                ${(() => {
                  let xavfRaw = p.xavf_omil || p.xavf_omillari;
                  let xavf = [];
                  if (Array.isArray(xavfRaw)) {
                    xavf = xavfRaw;
                  } else if (typeof xavfRaw === 'string') {
                    if (xavfRaw.startsWith('[')) {
                      try { xavf = JSON.parse(xavfRaw); } 
                      catch(e) { xavf = xavfRaw.split(',').map(s=>s.trim()); }
                    } else if (xavfRaw.startsWith('{')) {
                      // Postgres array syntax support e.g. "{item1, item2}"
                      xavf = xavfRaw.replace(/^{|}$/g, '').split(',').map(s=>s.trim());
                    } else {
                      xavf = xavfRaw.split(',').map(s=>s.trim()).filter(Boolean);
                    }
                  }
                  
                  return xavf.length > 0
                    ? xavf.map(o => `<span class="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">${o}</span>`).join('')
                    : '<span class="text-sm text-gray-400">Hech qanday xavf omili kiritilmagan</span>';
                })()}
              </div>
            </div>
            
            ${p.otkazilgan_muassasa ? `
            <div class="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
              <h4 class="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">${icon('git-branch', 18)} Bemor xarakati (Flow)</h4>
              <div class="relative pl-6 border-l-2 border-blue-200 space-y-6">
                <div class="relative">
                  <div class="absolute -left-[31px] top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                  <div class="font-bold text-gray-900 text-sm">Qabul qilindi</div>
                  <div class="text-xs text-gray-500">${p.muassasa} (${Utils.formatDateTime(p.qabul_vaqt)})</div>
                </div>
                <div class="relative">
                  <div class="absolute -left-[31px] top-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-sm"></div>
                  <div class="font-bold text-gray-900 text-sm">Yo'naltirildi</div>
                  <div class="text-xs text-gray-500">${p.otkazilgan_muassasa}${p._chiqarish?.chiqish_sana ? ` (${Utils.formatDateTime(p._chiqarish.chiqish_sana)})` : ''}</div>
                </div>
              </div>
            </div>
            ` : ''}

            ${p.asoratlar ? `
            <div class="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <span class="text-sm text-red-800 font-bold block mb-1 flex items-center gap-2">${icon('alert-circle', 16)} Kuzatilgan asoratlar:</span>
              <span class="text-sm text-red-700">${Array.isArray(p.asoratlar) ? p.asoratlar.join(', ') : p.asoratlar}</span>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async renderHolat(el, p, type) {
    const HOLATLAR = ['Yaxshi', 'Qoniqarli', "Og'ir", "Juda og'ir", 'Kritik'];
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card sticky top-6 border-t-4 border-t-blue-500">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('plus-circle', 18)} Yangi o'lchov</h3>
            </div>
            <div class="card-body p-5">
              <div class="form-group">
                <label class="form-label required">Bemor holati</label>
                <select id="holat-holat" class="form-select">
                  <option value="">Tanlang...</option>
                  ${HOLATLAR.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="form-group">
                  <label class="form-label">Qon bosimi</label>
                  <input id="holat-qb" class="form-input font-mono" placeholder="120/80"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Puls</label>
                  <input id="holat-puls" type="number" class="form-input" placeholder="72"/>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Harorat (°C)</label>
                <input id="holat-temp" type="number" step="0.1" class="form-input" placeholder="36.6"/>
              </div>
              <div class="form-group">
                <label class="form-label">Izoh</label>
                <textarea id="holat-izoh" class="form-textarea" rows="2" placeholder="Qo'shimcha kuzatuvlar..."></textarea>
              </div>
              <button class="btn btn-primary w-full mt-2 flex items-center justify-center gap-2" id="btn-holat-save" onclick="BemorKartaPage.saveHolat()">
                ${icon('save', 18)} Saqlash
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-2">
          <div class="card">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('activity', 18)} Holat dinamikasi tarixi</h3>
            </div>
            <div class="card-body p-0" id="holat-history">
              <div class="flex justify-center py-8"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
            </div>
          </div>
        </div>
      </div>`;
    try {
      const records = await DB.getHolatDinamikasi(p.kt_no);
      const el2 = document.getElementById('holat-history');
      if (!el2) return;
      if (records.length === 0) {
        el2.innerHTML = `<div class="py-10 text-center text-gray-400">${icon('inbox', 32, 'mx-auto mb-2')}<p class="text-sm mt-2">Hali o'lchov kiritilmagan</p></div>`;
        initIcons(); return;
      }
      const holatColor = { 'Yaxshi':'text-green-600 bg-green-50 border-green-200', 'Qoniqarli':'text-blue-600 bg-blue-50 border-blue-200', "Og'ir":'text-orange-600 bg-orange-50 border-orange-200', "Juda og'ir":'text-red-600 bg-red-50 border-red-200', 'Kritik':'text-red-800 bg-red-100 border-red-300' };
      el2.innerHTML = `<table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">Vaqt</th>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">Holat</th>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">QB</th>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">Puls</th>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">Harorat</th>
            <th class="p-3 text-left text-xs font-bold text-gray-500 uppercase">Shifokor</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="p-3 text-xs text-gray-500 whitespace-nowrap">${Utils.formatDateTime(r.created_at)}</td>
              <td class="p-3"><span class="px-2 py-0.5 rounded-lg border text-xs font-bold ${holatColor[r.holat]||'text-gray-600 bg-gray-50 border-gray-200'}">${r.holat||'—'}</span></td>
              <td class="p-3 font-mono text-xs">${r.qon_bosimi||'—'}</td>
              <td class="p-3 text-xs">${r.puls ? r.puls+' ur/min' : '—'}</td>
              <td class="p-3 text-xs">${r.temperatura ? r.temperatura+'°C' : '—'}</td>
              <td class="p-3 text-xs text-gray-500">${r.shifokor_fio||'—'}</td>
            </tr>
            ${r.izoh ? `<tr class="border-b border-gray-50 bg-gray-50/50"><td colspan="6" class="px-3 pb-2 text-xs text-gray-500 italic">"${r.izoh}"</td></tr>` : ''}
          `).join('')}
        </tbody>
      </table>`;
      initIcons();
    } catch(err) {
      const el2 = document.getElementById('holat-history');
      if (el2) el2.innerHTML = `<div class="p-6 text-center text-red-500">Xatolik: ${err.message}</div>`;
    }
  },

  async saveHolat() {
    const holat = document.getElementById('holat-holat')?.value;
    if (!holat) { showToast('Bemor holatini tanlang', 'warning'); return; }
    const btn = document.getElementById('btn-holat-save');
    setLoading(btn, true);
    try {
      const profile = await Profile.getCurrent();
      await DB.addHolatDinamikasi({
        kt_no: BemorKartaPage._patient.kt_no,
        registr_turi: BemorKartaPage._type,
        holat,
        qon_bosimi: document.getElementById('holat-qb')?.value || null,
        puls: document.getElementById('holat-puls')?.value ? parseInt(document.getElementById('holat-puls').value) : null,
        temperatura: document.getElementById('holat-temp')?.value ? parseFloat(document.getElementById('holat-temp').value) : null,
        izoh: document.getElementById('holat-izoh')?.value || null,
        shifokor_fio: profile?.fio || 'Dr. Navbatchi'
      });
      showToast('O\'lchov saqlandi', 'success');
      BemorKartaPage.loadTab(2);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  async renderDavolash(el, p, type) {
    const muolajaList = type === 'infarkt'
      ? APP_CONFIG.DINAMIKA_MUOLAJALAR
      : APP_CONFIG.DINAMIKA_MUOLAJALAR_INSULT;
    const activeClass = type === 'infarkt'
      ? 'border-red-500 bg-red-50 text-red-700'
      : 'border-purple-500 bg-purple-50 text-purple-700';
    const dotClass = type === 'infarkt'
      ? 'bg-red-500 border-red-500'
      : 'bg-purple-500 border-purple-500';
    const borderColor = type === 'infarkt' ? 'border-t-red-500' : 'border-t-purple-500';

    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card sticky top-6 border-t-4 ${borderColor}">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('plus-circle', 18)} Yangi muolaja qo'shish</h3>
            </div>
            <div class="card-body p-5">
              <div class="grid grid-cols-1 gap-2 mb-4" id="din-muolaja-list">
                ${muolajaList.map(item => `
                  <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all border-gray-200 hover:bg-gray-50 text-gray-600">
                    <input type="radio" name="din-muolaja" value="${item}" class="hidden">
                    <div class="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 border-gray-300 bg-white"></div>
                    <span class="text-sm">${item}</span>
                  </label>`).join('')}
              </div>
              <div id="din-otkazish-div" class="form-group mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl" style="display:none">
                <label class="form-label required text-orange-900">Qaysi muassasaga o'tkaziladi?</label>
                <select id="din-otkazilgan-muassasa" class="form-select mt-1">
                  <option value="">Muassasani tanlang...</option>
                  ${Object.values(APP_CONFIG.MUASSASALAR).flat().sort().map(m=>`<option value="${m}">${m}</option>`).join('')}
                </select>
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Qo'shimcha izoh</label>
                <textarea id="din-izoh" class="form-textarea" rows="2" placeholder="Ixtiyoriy..."></textarea>
              </div>
              <button class="btn btn-primary w-full mt-4 flex items-center justify-center gap-2" id="btn-davolash-save" onclick="BemorKartaPage.saveDavolash()">
                ${icon('save', 18)} Saqlash
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-2">
          <div class="card">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('history', 18)} Muolajalar tarixi</h3>
            </div>
            <div class="card-body p-5 bg-gray-50/50 min-h-[300px]" id="din-history">
              <div class="flex justify-center py-8"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
            </div>
          </div>
        </div>
      </div>`;

    // Radio vizual
    el.querySelectorAll('input[name="din-muolaja"]').forEach(input => {
      input.addEventListener('change', () => {
        el.querySelectorAll('input[name="din-muolaja"]').forEach(r => {
          const lbl = r.closest('label');
          lbl.className = 'flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all border-gray-200 hover:bg-gray-50 text-gray-600';
          lbl.querySelector('div').className = 'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 border-gray-300 bg-white';
          lbl.querySelector('div').innerHTML = '';
        });
        const lbl = input.closest('label');
        lbl.className = `flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${activeClass} font-medium shadow-sm`;
        const dot = lbl.querySelector('div');
        dot.className = `w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${dotClass} text-white`;
        dot.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';

        const isOtk = input.value.includes("Boshqa muassasaga o'tkazildi");
        const otkazDiv = document.getElementById('din-otkazish-div');
        if (otkazDiv) otkazDiv.style.display = isOtk ? 'block' : 'none';
        const saveBtn = document.getElementById('btn-davolash-save');
        if (saveBtn) {
          saveBtn.className = `${isOtk ? 'btn btn-warning' : 'btn btn-primary'} w-full mt-4 flex items-center justify-center gap-2`;
          saveBtn.innerHTML = `${icon(isOtk ? 'log-out' : 'save', 18)} ${isOtk ? 'Chiqarish' : 'Saqlash'}`;
          initIcons();
        }
      });
    });

    // Tarixni yuklash
    try {
      const records = await DB.getDinamikaMuolajalar(p.kt_no);
      const histEl = document.getElementById('din-history');
      if (!histEl) return;
      if (records.length === 0) {
        histEl.innerHTML = `<div class="text-center py-10 text-gray-400">${icon('inbox', 32, 'mx-auto mb-2')} <p class="text-sm">Hali muolaja yozilmagan</p></div>`;
        initIcons();
        return;
      }
      // Qabul muolajasini birinchi yozuv sifatida ko'rsatish
      const initial = p.muolaja_turi ? `
        <div class="flex gap-4 mb-4">
          <div class="flex flex-col items-center">
            <div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
            <div class="w-0.5 bg-gray-200 flex-1 mt-1"></div>
          </div>
          <div class="pb-4 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-blue-600 uppercase">Qabul muolajasi</span>
              <span class="text-xs text-gray-400">${Utils.formatDateTime(p.qabul_vaqt)}</span>
            </div>
            <p class="text-sm font-semibold text-gray-800">${p.muolaja_turi}</p>
          </div>
        </div>` : '';
      histEl.innerHTML = initial + records.map((r, i) => `
        <div class="flex gap-4 ${i < records.length - 1 ? 'mb-4' : ''}">
          <div class="flex flex-col items-center">
            <div class="w-9 h-9 rounded-full ${type==='infarkt'?'bg-red-500':'bg-purple-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${i + 2}</div>
            ${i < records.length - 1 ? '<div class="w-0.5 bg-gray-200 flex-1 mt-1"></div>' : ''}
          </div>
          <div class="pb-4 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold ${type==='infarkt'?'text-red-600':'text-purple-600'} uppercase">Dinamik muolaja</span>
              <span class="text-xs text-gray-400">${Utils.formatDateTime(r.created_at)}</span>
            </div>
            <p class="text-sm font-semibold text-gray-800">${r.muolaja_turi}</p>
            ${r.izoh ? `<p class="text-xs text-gray-500 mt-1 italic">"${r.izoh}"</p>` : ''}
            <p class="text-xs text-gray-400 mt-1">— Dr. ${r.shifokor_fio || 'Noma\'lum'}</p>
          </div>
        </div>`).join('');
      initIcons();
    } catch(err) {
      const histEl = document.getElementById('din-history');
      if (histEl) histEl.innerHTML = `<div class="p-6 text-center text-red-500">Xatolik: ${err.message}</div>`;
    }
  },

  async saveDavolash() {
    const selected = document.querySelector('input[name="din-muolaja"]:checked')?.value;
    if (!selected) { showToast('Muolaja turini tanlang', 'warning'); return; }
    const isOtk = selected.includes("Boshqa muassasaga o'tkazildi");
    const otkazilganMuassasa = document.getElementById('din-otkazilgan-muassasa')?.value || '';
    if (isOtk && !otkazilganMuassasa) { showToast('Muassasa nomini tanlang', 'warning'); return; }
    const izoh = document.getElementById('din-izoh')?.value || '';
    const btn = document.getElementById('btn-davolash-save');
    setLoading(btn, true);
    try {
      const p = BemorKartaPage._patient;
      const profile = await Profile.getCurrent();
      const finalIzoh = isOtk
        ? `O'tkazilgan: ${otkazilganMuassasa}${izoh ? ' | ' + izoh : ''}`
        : (izoh || null);
      await DB.addDinamikaMuolaja({
        kt_no: p.kt_no,
        registr_turi: BemorKartaPage._type,
        muolaja_turi: selected,
        izoh: finalIzoh,
        shifokor_fio: profile?.fio || 'Dr. Navbatchi'
      });
      if (isOtk) {
        if (BemorKartaPage._type === 'infarkt') await DB.infarktUpdate(p.kt_no, { status: 'otkazildi' });
        else await DB.insultUpdate(p.kt_no, { status: 'otkazildi' });
        BemorKartaPage._patient.status = 'otkazildi';
        showToast(`✅ Bemor ${otkazilganMuassasa}ga o'tkazildi`, 'success');
        setTimeout(() => Router.go('bemorlar'), 1500);
      } else {
        showToast('Muolaja saqlandi', 'success');
        BemorKartaPage.loadTab(1);
      }
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  async renderKuzatuv(el, p, type) {
    el.innerHTML = `<div class="flex justify-center p-10"><div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>`;
    
    try {
      const records = await DB.getKuzatuv(p.kt_no);
      
      let recordsHtml = records.length === 0 
        ? `<div class="text-center py-10 text-gray-400">Kuzatuv yozuvlari mavjud emas</div>`
        : records.map(r => `
            <div class="p-4 border border-gray-100 rounded-xl mb-3 bg-white hover:shadow-sm transition-shadow">
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">${r.kuzatuv_davri}</span>
                <span class="text-xs text-gray-400">${Utils.formatDateTime(r.created_at)}</span>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-2 h-2 rounded-full ${r.holati==='Vafot etdi'?'bg-red-500':'bg-green-500'}"></div>
                <span class="font-bold text-gray-800">${r.holati}</span>
                ${r.qayta_xuruj ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">QAYTA XURUJ!</span>' : ''}
              </div>
              ${r.nogironlik_guruhi ? `<div class="text-xs text-gray-600 mb-1"><b>Nogironlik:</b> ${r.nogironlik_guruhi}</div>` : ''}
              ${r.izoh ? `<p class="text-sm text-gray-600 mt-2 italic">"${r.izoh}"</p>` : ''}
              <div class="text-xs text-gray-400 mt-2 text-right">— Dr. ${r.shifokor_fio||'Noma\'lum'}</div>
            </div>
          `).join('');

      el.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1">
            <div class="card sticky top-6">
              <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
                <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('plus-circle', 18)} Yangi kuzatuv</h3>
              </div>
              <div class="card-body p-5">
                <div class="form-group">
                  <label class="form-label">Kuzatuv davri</label>
                  <select id="k-davri" class="form-select">
                    ${APP_CONFIG.KUZATUV_DAVRLARI.map(d=>`<option value="${d}">${d}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Bemor holati</label>
                  <select id="k-holati" class="form-select">
                    ${APP_CONFIG.KUZATUV_HOLATLARI.map(h=>`<option value="${h}">${h}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group flex items-center gap-2 py-2">
                  <input type="checkbox" id="k-xuruj" class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500">
                  <label for="k-xuruj" class="text-sm font-medium text-gray-700">Qayta xuruj (insult/infarkt)</label>
                </div>
                <div class="form-group">
                  <label class="form-label">Nogironlik guruhi</label>
                  <select id="k-nogironlik" class="form-select">
                    <option value="">Yo'q / Ma'lum emas</option>
                    <option value="1-guruh">1-guruh</option>
                    <option value="2-guruh">2-guruh</option>
                    <option value="3-guruh">3-guruh</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Qo'shimcha izoh</label>
                  <textarea id="k-izoh" class="form-textarea" rows="3" placeholder="Batafsil..."></textarea>
                </div>
                <button class="btn btn-primary w-full mt-4 flex items-center justify-center gap-2" id="save-kuzatuv-btn" onclick="BemorKartaPage.saveKuzatuv()">
                  ${icon('save', 18)} Saqlash
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <div class="card">
              <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
                <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('history', 18)} Kuzatuvlar tarixi</h3>
              </div>
              <div class="card-body p-5 bg-gray-50/50 min-h-[300px]">
                ${recordsHtml}
              </div>
            </div>
          </div>
        </div>
      `;
      initIcons();
    } catch(err) {
      el.innerHTML = `<div class="p-10 text-center text-red-500">Xatolik: ${err.message}</div>`;
    }
  },

  async saveKuzatuv() {
    const btn = document.getElementById('save-kuzatuv-btn');
    const data = {
      registr_turi: BemorKartaPage._type,
      kt_no: BemorKartaPage._patient.kt_no,
      kuzatuv_davri: document.getElementById('k-davri').value,
      holati: document.getElementById('k-holati').value,
      qayta_xuruj: document.getElementById('k-xuruj').checked,
      nogironlik_guruhi: document.getElementById('k-nogironlik').value,
      izoh: document.getElementById('k-izoh').value,
      shifokor_fio: (await Profile.getCurrent())?.fio || 'Dr. Navbatchi'
    };

    setLoading(btn, true);
    try {
      await DB.addKuzatuv(data);
      showToast('Kuzatuv saqlandi', 'success');
      BemorKartaPage.loadTab(6); // Reload tab
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  async renderShift(el, p, type) {
    const HOLATLAR = ['Barqaror', 'Yaxshilangan', 'Yomonlashgan', 'Kritik'];
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card sticky top-6 border-t-4 border-t-indigo-500">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('users', 18)} Navbat topshirish</h3>
            </div>
            <div class="card-body p-5">
              <div class="form-group">
                <label class="form-label required">Bemor holati baholash</label>
                <select id="shift-holat" class="form-select">
                  <option value="">Tanlang...</option>
                  ${HOLATLAR.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Keyingi navbat shifokor</label>
                <input id="shift-keyingi" class="form-input" placeholder="F.I.Sh..."/>
              </div>
              <div class="form-group">
                <label class="form-label">Topshirish qo'shimchasi / Ko'rsatmalar</label>
                <textarea id="shift-izoh" class="form-textarea" rows="4" placeholder="Navbat davomida nima bo'ldi, keyingi shifokorga ko'rsatmalar..."></textarea>
              </div>
              <button class="btn btn-primary w-full mt-2 flex items-center justify-center gap-2" id="btn-shift-save" onclick="BemorKartaPage.saveShift()">
                ${icon('save', 18)} Navbatni topshirish
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-2">
          <div class="card">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('history', 18)} Navbat jurnali</h3>
            </div>
            <div class="card-body p-5 bg-gray-50/50 min-h-[300px]" id="shift-history">
              <div class="flex justify-center py-8"><div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            </div>
          </div>
        </div>
      </div>`;
    try {
      const records = await DB.getNavbatchiJurnal(p.kt_no);
      const el2 = document.getElementById('shift-history');
      if (!el2) return;
      if (records.length === 0) {
        el2.innerHTML = `<div class="py-10 text-center text-gray-400">${icon('book-open', 32, 'mx-auto mb-2')}<p class="text-sm mt-2">Hali navbat yozuvi yo'q</p></div>`;
        initIcons(); return;
      }
      const hColor = { 'Barqaror':'text-green-700 bg-green-50 border-green-200', 'Yaxshilangan':'text-blue-700 bg-blue-50 border-blue-200', 'Yomonlashgan':'text-orange-700 bg-orange-50 border-orange-200', 'Kritik':'text-red-700 bg-red-50 border-red-200' };
      el2.innerHTML = records.map(r => `
        <div class="p-4 border border-gray-100 rounded-xl mb-3 bg-white hover:shadow-sm transition-shadow">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg border text-xs font-bold ${hColor[r.holat_baholash]||'text-gray-600 bg-gray-50 border-gray-200'}">${r.holat_baholash||'—'}</span>
              ${r.keyingi_shifokor ? `<span class="text-xs text-indigo-600 font-medium">${icon('arrow-right', 12)} ${r.keyingi_shifokor}</span>` : ''}
            </div>
            <span class="text-xs text-gray-400">${Utils.formatDateTime(r.created_at)}</span>
          </div>
          ${r.izoh ? `<p class="text-sm text-gray-700 mt-2">${r.izoh}</p>` : ''}
          <div class="text-xs text-gray-400 mt-2 text-right">— Dr. ${r.shifokor_fio||'Noma\'lum'}</div>
        </div>`).join('');
      initIcons();
    } catch(err) {
      const el2 = document.getElementById('shift-history');
      if (el2) el2.innerHTML = `<div class="p-6 text-center text-red-500">Xatolik: ${err.message}</div>`;
    }
  },

  async saveShift() {
    const holat = document.getElementById('shift-holat')?.value;
    if (!holat) { showToast('Bemor holat baholashni tanlang', 'warning'); return; }
    const btn = document.getElementById('btn-shift-save');
    setLoading(btn, true);
    try {
      const profile = await Profile.getCurrent();
      await DB.addNavbatchiJurnal({
        kt_no: BemorKartaPage._patient.kt_no,
        registr_turi: BemorKartaPage._type,
        holat_baholash: holat,
        keyingi_shifokor: document.getElementById('shift-keyingi')?.value || null,
        izoh: document.getElementById('shift-izoh')?.value || null,
        shifokor_fio: profile?.fio || 'Dr. Navbatchi'
      });
      showToast('Navbat muvaffaqiyatli topshirildi', 'success');
      BemorKartaPage.loadTab(4);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  renderMultimedia(el, p, type) {
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card sticky top-6">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('upload-cloud', 18)} Fayl yuklash</h3>
            </div>
            <div class="card-body p-5">
              <div class="form-group">
                <label class="form-label">Hujjat turi</label>
                <select id="mm-type" class="form-select">
                  <option value="KT Natijasi">KT / MRT Natijasi</option>
                  <option value="EKG">EKG tasviri</option>
                  <option value="Tahlil">Tahlil natijalari</option>
                  <option value="Boshqa">Boshqa hujjat</option>
                </select>
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Izoh</label>
                <input type="text" id="mm-izoh" class="form-input" placeholder="Qisqacha izoh..."/>
              </div>
              <div class="form-group mt-4">
                <label class="block w-full text-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all">
                  <input type="file" id="mm-file" class="hidden" onchange="document.getElementById('mm-filename').textContent = this.files[0] ? this.files[0].name : 'Fayl tanlanmadi'">
                  ${icon('image', 32, 'mx-auto text-gray-400 mb-2')}
                  <span class="text-sm font-bold text-gray-600 block">Faylni tanlang yoki shu yerga tashlang</span>
                  <span id="mm-filename" class="text-xs text-gray-400 mt-1 block">Fayl tanlanmadi</span>
                </label>
              </div>
              <button class="btn btn-primary w-full mt-4 flex items-center justify-center gap-2" onclick="BemorKartaPage.uploadMultimedia()">
                ${icon('upload', 18)} Yuklash
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-2">
          <div class="card">
            <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0 flex justify-between items-center">
              <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('folder-open', 18)} Bemor fayllari</h3>
            </div>
            <div class="card-body p-5 min-h-[300px]">
              <div class="text-center py-16 text-gray-400" id="mm-list">
                ${icon('images', 48, 'mx-auto text-gray-200 mb-3')}
                Yuklangan fayllar hozircha yo'q. (Supabase Storage funksiyasi qo'shildi!)
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    BemorKartaPage.loadMultimedia();
  },

  async loadMultimedia() {
    // Kelajakda Supabase Storage dan o'qiladi
    const el = document.getElementById('mm-list');
    if (!el) return;
    try {
      const { data, error } = await getSupabase().from('bemor_fayllari').select('*').eq('kt_no', BemorKartaPage._patient.kt_no);
      if (error || !data || data.length === 0) {
        return; // Default bo'sh holat qoladi
      }
      
      el.innerHTML = '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">' + data.map(f => `
        <div class="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group">
          <div class="h-32 bg-gray-100 relative">
            <img src="${f.url}" class="w-full h-full object-cover" onerror="this.src=''; this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-400\\'>${icon('file-text', 32)}</div>'">
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <a href="${f.url}" target="_blank" class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 hover:scale-110 transition-transform">${icon('eye', 16)}</a>
              <button onclick="BemorKartaPage.deleteMultimedia('${f.id}', '${f.path}')" class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">${icon('trash-2', 16)}</button>
            </div>
          </div>
          <div class="p-3">
            <span class="text-[10px] font-bold text-blue-600 uppercase block mb-1">${f.tur}</span>
            <p class="text-xs font-medium text-gray-800 line-clamp-2" title="${f.nomi}">${f.nomi}</p>
            ${f.izoh ? `<p class="text-[10px] text-gray-500 mt-1 line-clamp-1">${f.izoh}</p>` : ''}
          </div>
        </div>
      `).join('') + '</div>';
      initIcons();
    } catch(err) {
      console.warn("Multimedia load error", err);
    }
  },

  async uploadMultimedia() {
    const fileInput = document.getElementById('mm-file');
    const type = document.getElementById('mm-type').value;
    const izoh = document.getElementById('mm-izoh').value;
    const file = fileInput.files[0];
    
    if (!file) {
      showToast('Fayl tanlang!', 'warning');
      return;
    }
    
    const kt_no = BemorKartaPage._patient.kt_no;
    const ext = file.name.split('.').pop();
    const filePath = kt_no + '/' + Date.now() + '.' + ext;
    
    showToast('Fayl yuklanmoqda...', 'info', 2000);
    try {
      const sb = getSupabase();
      
      // 1. Upload to Storage
      const { data: uploadData, error: uploadErr } = await sb.storage
        .from('multimedia')
        .upload(filePath, file);
        
      if (uploadErr) throw uploadErr;
      
      // 2. Get Public URL
      const { data: { publicUrl } } = sb.storage
        .from('multimedia')
        .getPublicUrl(filePath);
        
      // 3. Save to database
      const { error: dbErr } = await sb.from('bemor_fayllari').insert({
        kt_no: kt_no,
        registr_turi: BemorKartaPage._type,
        tur: type,
        nomi: file.name,
        izoh: izoh,
        path: filePath,
        url: publicUrl
      });
      
      if (dbErr) throw dbErr;
      
      showToast('Fayl muvaffaqiyatli yuklandi!', 'success');
      fileInput.value = '';
      document.getElementById('mm-filename').textContent = 'Fayl tanlanmadi';
      document.getElementById('mm-izoh').value = '';
      
      BemorKartaPage.loadMultimedia();
      
    } catch(err) {
      showToast('Fayl yuklashda xatolik: ' + err.message, 'error');
    }
  },

  async deleteMultimedia(id, path) {
    if(!confirm("Ushbu faylni rostdan ham o'chirmoqchimisiz?")) return;
    try {
      const sb = getSupabase();
      await sb.storage.from('multimedia').remove([path]);
      await sb.from('bemor_fayllari').delete().eq('id', id);
      showToast("Fayl o'chirildi", 'success');
      BemorKartaPage.loadMultimedia();
    } catch(err) {
      showToast("Xatolik: " + err.message, 'error');
    }
  },

  renderChiqarish(el, p, type) {
    if (p.status !== 'active') {
      const statusLabels = {
        chiqarildi: { icon: 'log-out', color: 'blue',   label: 'Bemor chiqarilgan',              desc: 'Bemor shifoxonadan muvaffaqiyatli chiqarilgan.' },
        otkazildi:  { icon: 'share-2', color: 'orange', label: "Bemor boshqa muassasaga o'tkazilgan", desc: "Bemor boshqa tibbiyot muassasasiga o'tkazilgan." },
        vafot:      { icon: 'x-circle', color: 'red',   label: 'Bemor vafot etgan',              desc: 'Bemor vafot etgan. Qayta chiqarish mumkin emas.' },
      };
      const s = statusLabels[p.status] || { icon: 'info', color: 'gray', label: p.status, desc: '' };
      el.innerHTML = `
        <div class="card p-10 text-center">
          <div class="w-16 h-16 rounded-full bg-${s.color}-100 text-${s.color}-500 flex items-center justify-center mx-auto mb-4">
            ${icon(s.icon, 32)}
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">${s.label}</h3>
          <p class="text-gray-500">${s.desc}</p>
        </div>
      `;
      return;
    }

    const borderColor = type === 'insult' ? 'border-t-purple-500' : 'border-t-red-500';
    const radioColor  = type === 'insult' ? 'text-purple-600' : 'text-red-600';
    const hoverColor  = type === 'insult' ? 'hover:border-purple-400 hover:bg-purple-50' : 'hover:border-red-300 hover:bg-red-50';

    const mrsBlock = type === 'insult' ? `
      <div class="form-group mt-4">
        <label class="form-label required">NIHSS ball chiqarishda</label>
        <div class="flex gap-2 items-center">
          <input type="number" id="ch-nihss" min="0" max="42" class="form-input w-full" placeholder="0 dan 42 gacha"/>
          <button type="button" class="flex-shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-blue-200 flex items-center gap-1" onclick="Calculators.openNIHSS('ch-nihss')">🧮 Hisoblash</button>
        </div>
      </div>
      <div class="form-group mt-4">
        <label class="form-label required">Insultdan keyingi nogironlik darajasini baholash shkalasi (mRS darajalari)</label>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${APP_CONFIG.MRS_DARAJALAR.map(item => `
            <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${hoverColor} transition-colors">
              <input type="radio" name="ch-mrs" value="${item}" class="w-4 h-4 ${radioColor}">
              <span class="text-sm text-gray-700">${item}</span>
            </label>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="form-group mt-4">
        <label class="form-label required">Asoratlar</label>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${APP_CONFIG.CHIQARISH_ASORATLAR.map(item => `
            <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" name="ch-asorat" value="${item}" class="w-4 h-4 text-blue-600 rounded">
              <span class="text-sm text-gray-700">${item}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    el.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <div class="card border-t-4 ${borderColor}">
          <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
            <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('log-out', 18)} Bemorni chiqarish</h3>
          </div>
          <div class="card-body p-6">

            <div class="form-group">
              <label class="form-label required">Chiqarilgan sana</label>
              <div class="grid grid-cols-2 gap-3">
                <input type="date" id="ch-sana" class="form-input" value="${new Date().toISOString().split('T')[0]}"/>
                <input type="time" id="ch-vaqt" class="form-input" value="${new Date().toTimeString().slice(0,5)}"/>
              </div>
            </div>

            ${mrsBlock}

            <div class="form-group mt-4">
              <label class="form-label required">Natija</label>
              <div class="grid grid-cols-1 gap-2 mt-2">
                ${APP_CONFIG.CHIQARISH_NATIJALARI.map(item => `
                  <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${hoverColor} transition-all">
                    <input type="radio" name="ch-natija" value="${item}" class="w-4 h-4 ${radioColor} ch-natija-radio">
                    <span class="text-sm font-medium text-gray-700">${item}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div id="ch-boshqa-div" class="form-group mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl" style="display:none">
              <label class="form-label required text-blue-900">Qaysi muassasaga o'tkazildi?</label>
              <select id="ch-boshqa-shifoxona" class="form-select mt-1" onchange="BemorKartaPage.onMuassasaSelect(this)">
                <option value="">— Muassasani tanlang —</option>
                ${Object.entries(APP_CONFIG.MUASSASALAR).map(([vil, list]) =>
                  `<optgroup label="${vil}">${list.map(m => `<option value="${m}">${m}</option>`).join('')}</optgroup>`
                ).join('')}
                <option value="__boshqa__">Boshqa (qo'lda kiritish)...</option>
              </select>
              <input type="text" id="ch-boshqa-qolda" class="form-input mt-2" placeholder="Muassasa nomini kiriting..." style="display:none"/>
            </div>

            <div id="ch-reabil-div" class="form-group mt-4" style="display:none">
              <label class="form-label required">Reabilitatsiya markazi nomi</label>
              <input type="text" id="ch-reabil-markaz" class="form-input" placeholder="Markaz nomini kiriting"/>
            </div>

            <div class="mt-6 flex justify-end">
              <button class="btn btn-primary px-8" id="btn-chiqarish" onclick="BemorKartaPage.chiqarishSave()">Saqlash va Chiqarish</button>
            </div>
          </div>
        </div>
      </div>
    `;
    initIcons();
    BemorKartaPage.initChiqarishRadio();
  },

  chiqarishModal() {
    this.switchTab(5);
  },

  onNatijaChange(natija) {
    const boshqaDiv = document.getElementById('ch-boshqa-div');
    const reabilDiv = document.getElementById('ch-reabil-div');
    if (boshqaDiv) boshqaDiv.style.display = natija === "Boshqa shifoxonaga o'tkazildi" ? '' : 'none';
    if (reabilDiv) reabilDiv.style.display = natija === 'Reabilitatsiyaga yuborildi' ? '' : 'none';
  },

  initChiqarishRadio() {
    document.querySelectorAll('.ch-natija-radio').forEach(radio => {
      radio.addEventListener('change', function() {
        BemorKartaPage.onNatijaChange(this.value);
      });
    });
  },

  onMuassasaSelect(sel) {
    const qolda = document.getElementById('ch-boshqa-qolda');
    if (!qolda) return;
    if (sel.value === '__boshqa__') {
      qolda.style.display = '';
      qolda.focus();
    } else {
      qolda.style.display = 'none';
      qolda.value = '';
    }
  },

  getChiqarishMuassasa() {
    const sel = document.getElementById('ch-boshqa-shifoxona');
    if (!sel) return '';
    if (sel.value === '__boshqa__') {
      return document.getElementById('ch-boshqa-qolda')?.value?.trim() || '';
    }
    return sel.value;
  },

  editPatient() {
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    const isInf = type === 'infarkt';
    const viloyatlar = Object.keys(APP_CONFIG.MUASSASALAR);
    const muassasalar = APP_CONFIG.MUASSASALAR[p.viloyat] || [];

    // Status-muolaja nomuvofiqlik tekshiruvi
    const mismatch = (p.status === 'vafot' && p.muolaja_turi?.toLowerCase().includes('o\'tkazildi')) ||
                     (p.status === 'otkazildi' && p.muolaja_turi?.toLowerCase().includes('vafot'));
    const mismatchWarn = mismatch ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;margin-bottom:12px;color:#92400e;font-size:13px;display:flex;gap:8px;align-items:center">
      <span style="font-size:18px">⚠️</span>
      <span><b>Diqqat:</b> Status va muolaja mos kelmaydi — iltimos to'g'rilang</span>
    </div>` : '';

    showModal({
      title: 'Bemor ma\'lumotlarini tahrirlash',
      size: 'lg',
      body: `
        ${mismatchWarn}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group col-span-2">
            <label class="form-label required">F.I.O</label>
            <input id="edit-fio" class="form-input" value="${esc(p.fio||'')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Kasalxonaga yotgan sana/vaqt</label>
            <input id="edit-qabul-vaqt" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.qabul_vaqt)||''}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Tug'ilgan sanasi</label>
            <input id="edit-tugilgan" type="date" class="form-input" value="${p.tugilgan_sana||p.tugilgan_yil||''}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Jinsi</label>
            <select id="edit-jins" class="form-select">
              <option value="Erkak" ${p.jins==='Erkak'?'selected':''}>Erkak</option>
              <option value="Ayol" ${p.jins==='Ayol'?'selected':''}>Ayol</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Viloyat</label>
            <select id="edit-viloyat" class="form-select" onchange="BemorKartaPage._updateMuassasaOptions()">
              ${viloyatlar.map(v => `<option value="${v}" ${p.viloyat===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Muassasa</label>
            <select id="edit-muassasa" class="form-select">
              ${muassasalar.map(m => `<option value="${esc(m)}" ${p.muassasa===m?'selected':''}>${esc(m)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Murojaat yo'li</label>
            <select id="edit-murojaat" class="form-select">
              ${APP_CONFIG.MUROJAAT_YOLLARI.map(m => `<option value="${m}" ${p.murojaat_yoli===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Holat (status)</label>
            <select id="edit-status" class="form-select">
              <option value="active" ${p.status==='active'?'selected':''}>Aktiv (davolanmoqda)</option>
              <option value="chiqarildi" ${p.status==='chiqarildi'?'selected':''}>Chiqarildi</option>
              <option value="otkazildi" ${p.status==='otkazildi'?'selected':''}>O'tkazildi</option>
              <option value="vafot" ${p.status==='vafot'?'selected':''}>Vafot</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Qon bosimi</label>
            <input id="edit-qb" class="form-input font-mono" value="${p.qon_bosimi||''}" placeholder="120/80"/>
          </div>
          <div class="form-group">
            <label class="form-label">Puls</label>
            <input id="edit-puls" type="number" class="form-input" value="${p.puls||''}" min="20" max="300" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/>
          </div>
          <div class="form-group">
            <label class="form-label">AHA bali</label>
            <input id="edit-aha" type="number" class="form-input" value="${p.aha_bali??''}" min="0"/>
          </div>
          <div class="form-group">
            <label class="form-label">Simptom vaqti</label>
            <select id="edit-simptom" class="form-select">
              ${(isInf ? APP_CONFIG.SIMPTOM_VAQTLAR : APP_CONFIG.SIMPTOM_VAQTLAR_INSULT).map(s => `<option value="${s}" ${p.simptom_vaqt===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${isInf ? 'Infarkt turi' : 'Insult turi'}</label>
            <select id="edit-turi" class="form-select">
              ${(isInf ? APP_CONFIG.INFARKT_TURLARI : APP_CONFIG.INSULT_TURLARI).map(t => `<option value="${t}" ${(isInf?p.infarkt_turi:p.insult_turi)===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Muolaja turi</label>
            <select id="edit-muolaja" class="form-select">
              ${(isInf ? APP_CONFIG.INFARKT_MUOLAJALARI : APP_CONFIG.INSULT_MUOLAJALARI).map(m => `<option value="${m}" ${p.muolaja_turi===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          ${isInf ? `
          <div class="form-group">
            <label class="form-label">Killip klassifikatsiyasi</label>
            <select id="edit-killip" class="form-select">
              ${APP_CONFIG.KILLIP_KLASSLAR.map(k => `<option value="${k}" ${p.killip===k?'selected':''}>${k}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Troponin</label>
            <input id="edit-troponin" class="form-input" value="${p.troponin||''}" placeholder="O'lchanmagan"/>
          </div>
          <div class="form-group">
            <label class="form-label">KFK-MB</label>
            <input id="edit-kkfmb" class="form-input" value="${p.kkfmb||''}" placeholder="O'lchanmagan"/>
          </div>
          <div class="form-group">
            <label class="form-label">EKG vaqti</label>
            <input id="edit-ekg-vaqti" type="time" class="form-input" value="${p.ekg_vaqti||''}"/>
          </div>
          ${(()=>{
            const mt = (p.muolaja_turi||'').toLowerCase();
            const showTlt = mt.includes('tlt') || mt.includes('trombolitik');
            const showPci = mt.includes('pci') || mt.includes('stentlash') || mt.includes('kag') || mt.includes('tlbap') || mt.includes('ballon') || mt.includes('angioplastika');
            return `
          ${showTlt ? `<div class="form-group">
            <label class="form-label">TLT vaqti</label>
            <input id="edit-tlt-vaqt" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.tlt_vaqt)||''}"/>
          </div>` : ''}
          ${showPci ? `<div class="form-group">
            <label class="form-label">PCI/Groin vaqti</label>
            <input id="edit-pci-vaqt" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.pci_vaqt)||''}"/>
          </div>` : ''}`;
          })()}
          ` : `
          <div class="form-group">
            <label class="form-label">NIHSS (qabul)</label>
            <input id="edit-nihss" type="number" class="form-input" value="${p.nihss_qabul||''}" min="0" max="42"/>
          </div>
          <div class="form-group">
            <label class="form-label">GCS bali</label>
            <input id="edit-gcs" type="number" class="form-input" value="${p.gcs_bali||p.gcs_qabul||''}" min="3" max="15"/>
          </div>
          ${(()=>{
            const mt = (p.muolaja_turi||'').toLowerCase();
            const showKt = p.mskt === "Ha – o'tkazildi" || mt.includes('mskt') || mt.includes('angiografiya');
            const showTlt = mt.includes('trombolizis') || mt.includes('tlt') || mt.includes('trombolitik');
            const showTromb = mt.includes('trombektomiya') || mt.includes('tromboekstraksiya') || mt.includes('tromboaspiratsiya') || mt.includes('kombinatsiyalangan');
            return `
          ${showKt ? `<div class="form-group">
            <label class="form-label">KT/MSKT vaqti</label>
            <input id="edit-kt-vaqti" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.kt_vaqti)||''}"/>
          </div>` : ''}
          ${showTlt ? `<div class="form-group">
            <label class="form-label">Trombolizis vaqti</label>
            <input id="edit-trombolizis-vaqti" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.trombolizis_vaqti)||''}"/>
          </div>` : ''}
          ${showTromb ? `<div class="form-group">
            <label class="form-label">Trombektomiya vaqti</label>
            <input id="edit-trombektomiya-vaqti" type="datetime-local" class="form-input" value="${Utils.formatDateInput(p.trombektomiya_vaqti)||''}"/>
          </div>` : ''}`;
          })()}
          `}
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="closeModal()">Bekor qilish</button>
        <button class="btn btn-primary" id="btn-edit-save" onclick="BemorKartaPage.saveEdit()">
          ${icon('save', 16)} Saqlash
        </button>`
    });
    initIcons();
  },

  _updateMuassasaOptions() {
    const vil = document.getElementById('edit-viloyat')?.value;
    const sel = document.getElementById('edit-muassasa');
    if (!vil || !sel) return;
    const list = APP_CONFIG.MUASSASALAR[vil] || [];
    sel.innerHTML = list.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  },

  async saveEdit() {
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    const isInf = type === 'infarkt';
    const fio = document.getElementById('edit-fio')?.value?.trim();
    if (!fio) { showToast('F.I.O ni kiriting', 'warning'); return; }
    const g = id => document.getElementById(id);
    const now = new Date();
    const qabulVaqtRaw = g('edit-qabul-vaqt')?.value;
    const qv = qabulVaqtRaw ? new Date(qabulVaqtRaw + ':00+05:00') : null;
    // Qabul vaqti validatsiyasi
    if (qv && qv > now) {
      g('edit-qabul-vaqt')?.classList.add('border-red-500');
      showToast('⚠️ Qabul vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
      return;
    }
    // Vaqt mezonlari validatsiyasi (faqat DOM da mavjud inputlarni tekshirish)
    const vaqtFields = (isInf
      ? [['edit-tlt-vaqt','TLT vaqti'],['edit-pci-vaqt','PCI vaqti']]
      : [['edit-kt-vaqti','KT/MSKT vaqti'],['edit-trombolizis-vaqti','Trombolizis vaqti'],['edit-trombektomiya-vaqti','Trombektomiya vaqti']]
    ).filter(([fId]) => !!g(fId));
    for (const [fieldId, label] of vaqtFields) {
      const raw = g(fieldId)?.value;
      if (!raw) continue;
      const vt = new Date(raw + ':00+05:00');
      if (vt > now) {
        g(fieldId)?.classList.add('border-red-500');
        showToast(`⚠️ ${label} kelajakda bo'lishi mumkin emas!`, 'error', 5000);
        return;
      }
      if (qv && vt < qv) {
        g(fieldId)?.classList.add('border-red-500');
        showToast(`⚠️ ${label} bemor qabul vaqtidan oldin bo'lishi mumkin emas!`, 'error', 5000);
        return;
      }
    }
    const btn = document.getElementById('btn-edit-save');
    setLoading(btn, true);
    const qabulVaqt = qv ? qv.toISOString() : null;
    const updates = {
      fio,
      jins:          g('edit-jins')?.value || null,
      viloyat:       g('edit-viloyat')?.value || null,
      muassasa:      g('edit-muassasa')?.value || null,
      murojaat_yoli: g('edit-murojaat')?.value || null,
      status:        g('edit-status')?.value || null,
      tugilgan_sana: g('edit-tugilgan')?.value || null,
      tugilgan_yil:  g('edit-tugilgan')?.value || null,
      qabul_vaqt:    qabulVaqt,
      qon_bosimi:    g('edit-qb')?.value || null,
      aha_bali:      g('edit-aha')?.value !== '' ? parseInt(g('edit-aha').value) : null,
      simptom_vaqt:  g('edit-simptom')?.value || null,
      muolaja_turi:  g('edit-muolaja')?.value || null,
    };
    const toUTC = raw => raw ? new Date(raw + ':00+05:00').toISOString() : null;
    if (isInf) {
      updates.puls         = g('edit-puls')?.value ? parseInt(g('edit-puls').value) : null;
      updates.infarkt_turi = g('edit-turi')?.value || null;
      updates.killip       = g('edit-killip')?.value || null;
      updates.troponin     = g('edit-troponin')?.value || null;
      updates.kkfmb        = g('edit-kkfmb')?.value || null;
      updates.ekg_vaqti    = g('edit-ekg-vaqti')?.value || null;
      updates.tlt_vaqt     = toUTC(g('edit-tlt-vaqt')?.value);
      updates.pci_vaqt     = toUTC(g('edit-pci-vaqt')?.value);
    } else {
      updates.insult_turi       = g('edit-turi')?.value || null;
      updates.nihss_qabul       = g('edit-nihss')?.value ? parseInt(g('edit-nihss').value) : null;
      updates.gcs_bali          = g('edit-gcs')?.value ? parseInt(g('edit-gcs').value) : null;
      updates.kt_vaqti          = toUTC(g('edit-kt-vaqti')?.value);
      updates.trombolizis_vaqti = toUTC(g('edit-trombolizis-vaqti')?.value);
      updates.trombektomiya_vaqti = toUTC(g('edit-trombektomiya-vaqti')?.value);
    }
    try {
      const result = isInf
        ? await DB.infarktUpdate(p.kt_no, updates)
        : await DB.insultUpdate(p.kt_no, updates);
      BemorKartaPage._patient = { ...p, ...result };
      closeModal();
      showToast('Ma\'lumotlar yangilandi', 'success');
      BemorKartaPage.renderContent(BemorKartaPage._patient, type);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  async deletePatient() {
    if (BemorKartaPage._profile?.role !== 'super_admin') {
      showToast("Faqat Super Administrator o'chirish huquqiga ega", 'error');
      return;
    }
    if (!confirm("Rostdan ham ushbu bemor ma'lumotlarini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!")) return;
    try {
      const sb = getSupabase();
      const kt = BemorKartaPage._patient.kt_no;
      if (BemorKartaPage._type === 'infarkt') {
        // Child jadvallarni avval o'chirish (FK constraint)
        await sb.from('infarkt_chiqarish').delete().eq('kt_no', kt);
        await sb.from('infarkt_holat').delete().eq('kt_no', kt);
        await sb.from('infarkt_davolash').delete().eq('kt_no', kt);
        await sb.from('infarkt_kuzatuv').delete().eq('kt_no', kt);
        const { error } = await sb.from('infarkt_qabul').delete().eq('kt_no', kt);
        if (error) throw error;
      } else {
        // Child jadvallarni avval o'chirish (FK constraint)
        await sb.from('insult_chiqarish').delete().eq('kt_no', kt);
        await sb.from('insult_holat').delete().eq('kt_no', kt);
        await sb.from('insult_davolash').delete().eq('kt_no', kt);
        await sb.from('insult_kuzatuv').delete().eq('kt_no', kt);
        const { error } = await sb.from('insult_qabul').delete().eq('kt_no', kt);
        if (error) throw error;
      }
      showToast("Bemor muvaffaqiyatli o'chirildi", 'success');
      // Keshlarni tozalash — hisobot va bemorlar ro'yxati yangilansin
      if (window.HisobotPage) { HisobotPage._lastData = null; HisobotPage._lastListType = null; }
      BemorKartaPage._navList = [];
      BemorKartaPage._navIndex = -1;
      setTimeout(() => Router.go('bemorlar'), 1500);
    } catch(err) {
      showToast("O'chirishda xatolik: " + err.message, 'error');
    }
  },

  navPrev() {
    const idx = BemorKartaPage._navIndex - 1;
    if (idx < 0) return;
    const p = BemorKartaPage._navList[idx];
    // Update router params silently, then render directly (no full page reload)
    Router._current = 'bemor-karta';
    Router._params = { kt_no: p.kt_no, type: p._type };
    BemorKartaPage.render({ kt_no: p.kt_no, type: p._type });
  },

  navNext() {
    const idx = BemorKartaPage._navIndex + 1;
    if (idx >= BemorKartaPage._navList.length) return;
    const p = BemorKartaPage._navList[idx];
    // Update router params silently, then render directly (no full page reload)
    Router._current = 'bemor-karta';
    Router._params = { kt_no: p.kt_no, type: p._type };
    BemorKartaPage.render({ kt_no: p.kt_no, type: p._type });
  },

  async chiqarishSave() {
    const sana = document.getElementById('ch-sana')?.value;
    const vaqt = document.getElementById('ch-vaqt')?.value;
    const natija = document.querySelector('input[name="ch-natija"]:checked')?.value;
    const type = BemorKartaPage._type;

    // Insult uchun NIHSS va mRS
    const nihssChiqarish = document.getElementById('ch-nihss')?.value || null;
    const mrsDaraja = document.querySelector('input[name="ch-mrs"]:checked')?.value || null;

    // Infarkt uchun asoratlar
    const asoratlar = Array.from(document.querySelectorAll('input[name="ch-asorat"]:checked')).map(e => e.value);

    const boshqaShifoxona = BemorKartaPage.getChiqarishMuassasa();
    const reabilMarkaz   = document.getElementById('ch-reabil-markaz')?.value   || '';

    if (!sana) return showToast('Chiqarilgan sanani kiriting', 'warning');
    if (!vaqt) return showToast('Chiqarilgan vaqtni kiriting', 'warning');
    if (!natija) return showToast('Natijani tanlang', 'warning');
    if (type === 'infarkt' && asoratlar.length === 0) return showToast('Asoratlarni belgilang', 'warning');
    if (type === 'insult' && !nihssChiqarish) return showToast('NIHSS ballini kiriting', 'warning');
    if (type === 'insult' && !mrsDaraja) return showToast('mRS darajasini tanlang', 'warning');
    if (natija === "Boshqa shifoxonaga o'tkazildi" && !boshqaShifoxona.trim()) return showToast('Boshqa shifoxona nomini kiriting', 'warning');
    if (natija === 'Reabilitatsiyaga yuborildi' && !reabilMarkaz.trim()) return showToast('Reabilitatsiya markazi nomini kiriting', 'warning');

    if (!confirm('Rostdan ham bemorni shifoxonadan chiqarmoqchimisiz?')) return;

    const btn = document.getElementById('btn-chiqarish');
    setLoading(btn, true);

    let status = 'chiqarildi';
    if (natija === 'Vafot etdi') status = 'vafot';
    else if (natija === "Boshqa shifoxonaga o'tkazildi") status = 'otkazildi';

    try {
      const kt_no = BemorKartaPage._patient.kt_no;
      const chiqish_sana = `${sana}T${vaqt || '00:00'}`;

      const otkazilganMuassasa = natija === "Boshqa shifoxonaga o'tkazildi" ? boshqaShifoxona : null;

      if (type === 'infarkt') {
        await DB.infarktUpdate(kt_no, { status, otkazilgan_muassasa: otkazilganMuassasa });
        await DB.infarktChiqarish({
          kt_no, chiqish_sana,
          chiqish_holat: natija,
          asoratlar: asoratlar,
          boshqa_shifoxona: boshqaShifoxona,
          reabil_markaz: reabilMarkaz,
          olim_sababi: natija === 'Vafot etdi' ? 'Vafot etdi' : null
        });
      } else {
        await DB.insultUpdate(kt_no, { status, otkazilgan_muassasa: otkazilganMuassasa });
        await DB.insultChiqarish({
          kt_no, chiqish_sana,
          natija,
          nihss_chiqarish: nihssChiqarish,
          mrs_daraja: mrsDaraja,
          boshqa_shifoxona: boshqaShifoxona,
          reabil_markaz: reabilMarkaz
        });
      }

      showToast('Bemor muvaffaqiyatli chiqarildi', 'success');
      setTimeout(() => Router.go('bemorlar'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
