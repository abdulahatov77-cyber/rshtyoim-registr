// ==================== BEMOR KARTA ====================
const BemorKartaPage = {
  _activeTab: 0,
  _patient: null,
  _type: null,

  async render(params) {
    const { kt_no, type } = params || {};
    if (!kt_no || !type) { Router.go('bemorlar'); return; }
    BemorKartaPage._type = type;
    BemorKartaPage._activeTab = 0;
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'bemorlar', 'Bemor kartasi', `K/T No: ${kt_no}`,
      `<div id="karta-inner" class="animate-fadein"><div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></div>`,
      user
    );
    Components.startClock();
    try {
      const patient = type === 'infarkt' ? await DB.infarktByKtNo(kt_no) : await DB.insultByKtNo(kt_no);
      BemorKartaPage._patient = patient;
      BemorKartaPage.renderContent(patient, type);
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

  renderContent(p, type) {
    const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil);
    const inner = document.getElementById('karta-inner');
    if (!inner) return;

    const bgGradient = type === 'infarkt' ? 'from-red-600 to-red-800' : 'from-purple-600 to-purple-800';
    const initial = p.fio ? p.fio.charAt(0).toUpperCase() : '?';

    inner.innerHTML = `
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
                ${p.status==='active' ? '<span class="bg-green-500/20 text-green-100 border border-green-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">AKTIV</span>' 
                  : p.status==='chiqarildi' ? '<span class="bg-blue-500/20 text-blue-100 border border-blue-400/50 px-2 py-0.5 rounded text-xs font-bold tracking-wide">CHIQARILGAN</span>'
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
          <div class="flex items-center gap-3">
            <button class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2" onclick="Router.go('bemorlar')">
              ${icon('arrow-left', 16)} Orqaga
            </button>
            ${p.status==='active'?`
              <button class="px-5 py-2 bg-white text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2" onclick="BemorKartaPage.chiqarishModal()">
                ${icon('log-out', 16)} Chiqarish
              </button>
            `:''}
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
        ${['Umumiy', 'Holat baholash', 'Davolash', 'Kuzatuv', 'Shift topshirish', 'Chiqarish'].map((t, i) => `
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
  },

  switchTab(idx) {
    // Update buttons
    for (let i=0; i<6; i++) {
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

    if (idx===0) BemorKartaPage.renderUmumiy(cont, p, type);
    else if (idx===1) BemorKartaPage.renderHolat(cont, p, type);
    else if (idx===2) BemorKartaPage.renderDavolash(cont, p, type);
    else if (idx===3) BemorKartaPage.renderKuzatuv(cont, p, type);
    else if (idx===4) BemorKartaPage.renderShift(cont);
    else if (idx===5) BemorKartaPage.renderChiqarish(cont, p, type);
    
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
              ${row('Infarkt turi', p.infarkt_turi)}
              ${row('Killip klassifikatsiyasi', p.killip)}
              ${row('Troponin', p.troponin)}
              ${row('KFK-MB', p.kkfmb)}
              ${row('EKG vaqti', p.ekg_vaqti)}
              ${row('Puls', p.puls ? p.puls + ' ur/min' : null)}
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
                  const xavf = Array.isArray(p.xavf_omil) ? p.xavf_omil 
                    : Array.isArray(p.xavf_omillari) ? p.xavf_omillari : [];
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
                  <div class="text-xs text-gray-500">${p.otkazilgan_muassasa}</div>
                </div>
              </div>
            </div>
            ` : ''}

            ${p.asoratlar ? `
            <div class="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <span class="text-sm text-red-800 font-bold block mb-1 flex items-center gap-2">${icon('alert-circle', 16)} Kuzatilgan asoratlar:</span>
              <span class="text-sm text-red-700">${p.asoratlar}</span>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  renderHolat(el, p, type) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header border-b border-gray-100 flex justify-between items-center bg-gray-50 p-5 !mb-0">
          <h3 class="card-title flex items-center gap-2 text-gray-900">${icon('clipboard-list', 18)} Holat dinamikasi</h3>
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Yangi baholash', body:'Hozircha faqat korish rejimi'})">
            ${icon('plus', 16)} Yangi qo'shish
          </button>
        </div>
        <div class="card-body p-8 text-center text-gray-500">
          <div class="mb-4">${icon('activity', 48, 'mx-auto text-gray-300')}</div>
          Hozircha dinamik yozuvlar kiritilmagan
        </div>
      </div>
    `;
  },

  renderDavolash(el, p, type) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header border-b border-gray-100 flex justify-between items-center bg-gray-50 p-5 !mb-0">
          <h3 class="card-title flex items-center gap-2 text-gray-900">${icon('pill', 18)} Davolash varaqasi</h3>
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Dori buyurish', body:'Hozircha faqat korish rejimi'})">
            ${icon('plus', 16)} Dori qo'shish
          </button>
        </div>
        <div class="card-body p-8 text-center text-gray-500">
          <div class="mb-4">${icon('file-text', 48, 'mx-auto text-gray-300')}</div>
          Hozircha dorilar buyurilmagan
        </div>
      </div>
    `;
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
      BemorKartaPage.loadTab(3); // Reload tab
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  },

  renderShift(el) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header border-b border-gray-100 flex justify-between items-center bg-gray-50 p-5 !mb-0">
          <h3 class="card-title flex items-center gap-2 text-gray-900">${icon('users', 18)} Navbatchi shifokorlar jurnali</h3>
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Navbatchilik yozuvi', body:'Hozircha faqat korish rejimi'})">
            ${icon('plus', 16)} Yozuv kiritish
          </button>
        </div>
        <div class="card-body p-8 text-center text-gray-500">
          <div class="mb-4">${icon('clock', 48, 'mx-auto text-gray-300')}</div>
          Hozircha topshirish yozuvlari mavjud emas
        </div>
      </div>
    `;
  },

  renderChiqarish(el, p, type) {
    if (p.status !== 'active') {
      el.innerHTML = `
        <div class="card p-10 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4">
            ${icon('info', 32)}
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Bemor chiqarilgan yoki vafot etgan</h3>
          <p class="text-gray-500">Ushbu bemorni qayta chiqarish mumkin emas. Joriy holati: <b>${p.status}</b></p>
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
        <input type="number" id="ch-nihss" min="0" max="42" class="form-input" placeholder="0 dan 42 gacha"/>
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
                    <input type="radio" name="ch-natija" value="${item}" class="w-4 h-4 ${radioColor}" onchange="BemorKartaPage.onNatijaChange('${item}')">
                    <span class="text-sm font-medium text-gray-700">${item}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div id="ch-boshqa-div" class="form-group mt-4" style="display:none">
              <label class="form-label required">Boshqa shifoxona nomi</label>
              <input type="text" id="ch-boshqa-shifoxona" class="form-input" placeholder="Shifoxona nomini kiriting"/>
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
  },

  chiqarishModal() {
    this.switchTab(5); // Switch to "Chiqarish" tab
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

    const boshqaShifoxona = document.getElementById('ch-boshqa-shifoxona')?.value || '';
    const reabilMarkaz   = document.getElementById('ch-reabil-markaz')?.value   || '';

    if (!sana) return showToast('Chiqarilgan sanani kiriting', 'warning');
    if (!natija) return showToast('Natijani tanlang', 'warning');
    if (type === 'infarkt' && asoratlar.length === 0) return showToast('Asoratlarni belgilang', 'warning');
    if (type === 'insult' && !mrsDaraja) return showToast('mRS darajasini tanlang', 'warning');

    if (!confirm('Rostdan ham bemorni shifoxonadan chiqarmoqchimisiz?')) return;

    const btn = document.getElementById('btn-chiqarish');
    setLoading(btn, true);

    let status = 'chiqarildi';
    if (natija === 'Vafot etdi') status = 'vafot';
    else if (natija === "Boshqa shifoxonaga o'tkazildi") status = 'otkazildi';

    try {
      const kt_no = BemorKartaPage._patient.kt_no;
      const chiqish_sana = `${sana}T${vaqt || '00:00'}`;

      if (type === 'infarkt') {
        await DB.infarktUpdate(kt_no, { status });
        await DB.infarktChiqarish({
          kt_no, chiqish_sana,
          chiqish_holat: natija,
          asoratlar: asoratlar.join(', '),
          boshqa_shifoxona: boshqaShifoxona,
          reabil_markaz: reabilMarkaz,
          olim_sababi: natija === 'Vafot etdi' ? 'Vafot etdi' : null
        });
      } else {
        await DB.insultUpdate(kt_no, { status });
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
