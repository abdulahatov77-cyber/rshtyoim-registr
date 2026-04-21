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
    const age = Utils.calculateAge(p.tugilgan_yil);
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
        ${['Umumiy', 'Holat baholash', 'Davolash', 'Shift topshirish', 'Chiqarish'].map((t, i) => `
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
    for (let i=0; i<5; i++) {
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
    else if (idx===3) BemorKartaPage.renderShift(cont);
    else if (idx===4) BemorKartaPage.renderChiqarish(cont, p, type);
    
    initIcons();
  },

  renderUmumiy(el, p, type) {
    const row = (label, val) => `
      <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <span class="text-sm text-gray-500">${label}</span>
        <span class="text-sm font-semibold text-gray-900 text-right max-w-[60%]">${val||'—'}</span>
      </div>`;
      
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card !mb-0">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('user', 18)} Shaxsiy ma'lumotlar</h3></div>
          <div class="card-body p-5">
            ${row('Tug\'ilgan yili', p.tugilgan_yil)}
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
            ${row('Simptomlar boshlanishi', p.simptom_vaqt)}
            ${type==='infarkt'?`
              ${row('Infarkt turi', p.infarkt_turi)}
              ${row('Killip', p.killip)}
              ${row('Troponin', p.troponin)}
            `:`
              ${row('Insult turi', p.insult_turi)}
              ${row('NIHSS', p.nihss_qabul!=null?p.nihss_qabul+' ball':null)}
              ${row('GCS', p.gcs_qabul!=null?p.gcs_qabul+' ball':null)}
            `}
            ${row('Asosiy muolaja', p.muolaja_turi)}
          </div>
        </div>
        <div class="card !mb-0 lg:col-span-2">
          <div class="card-header bg-gray-50 border-b border-gray-100 !mb-0"><h3 class="card-title text-gray-900 flex items-center gap-2">${icon('alert-triangle', 18)} Xavf omillari va Asoratlar</h3></div>
          <div class="card-body p-5">
            <div class="mb-4">
              <span class="text-sm text-gray-500 block mb-2">Qayd etilgan xavf omillari:</span>
              <div class="flex flex-wrap gap-2">
                ${Array.isArray(p.xavf_omil) && p.xavf_omil.length > 0 
                  ? p.xavf_omil.map(o => `<span class="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">${o}</span>`).join('') 
                  : '<span class="text-sm text-gray-400">Hech qanday xavf omili kiritilmagan</span>'}
              </div>
            </div>
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
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Yangi baholash qo\\'shish', body:'Hozircha faqat ko\\'rish rejimi ishlab turibdi'})">
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
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Dori buyurish', body:'Hozircha faqat ko\\'rish rejimi ishlab turibdi'})">
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

  renderShift(el) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header border-b border-gray-100 flex justify-between items-center bg-gray-50 p-5 !mb-0">
          <h3 class="card-title flex items-center gap-2 text-gray-900">${icon('users', 18)} Navbatchi shifokorlar jurnali</h3>
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showModal({title:'Navbatchilik yozuvi', body:'Hozircha faqat ko\\'rish rejimi ishlab turibdi'})">
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
    
    el.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <div class="card border-t-4 border-t-gray-500">
          <div class="card-header bg-gray-50 border-b border-gray-100 p-5 !mb-0">
            <h3 class="card-title text-gray-900 flex items-center gap-2">${icon('log-out', 18)} Bemorni chiqarish</h3>
          </div>
          <div class="card-body p-6">
            <div class="form-group">
              <label class="form-label required">Chiqarish turi</label>
              <select id="ch-status" class="form-select border-gray-300 focus:border-blue-500" onchange="document.getElementById('ch-vafot-div').style.display=this.value==='vafot'?'block':'none'">
                <option value="chiqarildi">Uyga javob berildi</option>
                <option value="otkazildi">Boshqa muassasaga o'tkazildi</option>
                <option value="vafot">Vafot etdi</option>
              </select>
            </div>
            <div class="form-group hidden" id="ch-vafot-div">
              <label class="form-label text-red-600">O'lim sababi</label>
              <input type="text" id="ch-vafot-sababi" class="form-input border-red-300 focus:border-red-500" placeholder="Masalan: Asoratlar, kardiogen shok..."/>
            </div>
            <div class="form-group mt-4">
              <label class="form-label">Xulosa epikrizi</label>
              <textarea id="ch-xulosa" class="form-textarea" rows="4" placeholder="Chiqarish xulosasini kiriting..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Chiqish sanasi</label>
              <input type="date" id="ch-date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/>
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
    this.switchTab(4); // Switch to "Chiqarish" tab
  },

  async chiqarishSave() {
    const status = document.getElementById('ch-status')?.value;
    const xulosa = document.getElementById('ch-xulosa')?.value;
    const vafot_sabab = document.getElementById('ch-vafot-sababi')?.value;
    
    if (!status) return showToast('Holatni tanlang', 'warning');
    if (status === 'vafot' && !vafot_sabab) return showToast('O\'lim sababini kiriting', 'warning');
    
    if (!confirm('Rostdan ham bemorni shifoxonadan chiqarmoqchimisiz?')) return;
    
    const btn = document.getElementById('btn-chiqarish');
    setLoading(btn, true);
    try {
      const kt_no = BemorKartaPage._patient.kt_no;
      const type = BemorKartaPage._type;
      
      if (type === 'infarkt') {
        await DB.infarktUpdate(kt_no, { status: status });
        await DB.infarktChiqarish({
          kt_no: kt_no,
          chiqish_sana: document.getElementById('ch-date')?.value || new Date().toISOString().split('T')[0],
          chiqish_holat: status,
          yakuniy_diagnoz: xulosa,
          olim_sababi: vafot_sabab || null
        });
      } else {
        await DB.insultUpdate(kt_no, { status: status });
        await DB.insultChiqarish({
          kt_no: kt_no,
          chiqish_sana: document.getElementById('ch-date')?.value || new Date().toISOString().split('T')[0],
          natija: status,
          boshqa_shifo: vafot_sabab ? "O'lim sababi: " + vafot_sabab + ". Xulosa: " + xulosa : xulosa
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
