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
      'bemorlar', '📋 Bemor kartasi', `K/T No: ${kt_no}`,
      `<div id="karta-inner"><div class="flex justify-center py-20"><div class="spinner" style="width:36px;height:36px"></div></div></div>`,
      user
    );
    Components.startClock();
    try {
      const patient = type === 'infarkt' ? await DB.infarktByKtNo(kt_no) : await DB.insultByKtNo(kt_no);
      BemorKartaPage._patient = patient;
      BemorKartaPage.renderContent(patient, type);
    } catch(err) {
      document.getElementById('karta-inner').innerHTML = `<div class="card p-8 text-center"><p class="text-red-500">${err.message}</p><button class="btn btn-primary mt-4" onclick="Router.go('bemorlar')">Orqaga</button></div>`;
    }
  },

  renderContent(p, type) {
    const age = Utils.calculateAge(p.tugilgan_yil);
    const inner = document.getElementById('karta-inner');
    inner.innerHTML = `
      <!-- Header -->
      <div class="card mb-4" style="background:linear-gradient(135deg,${type==='infarkt'?'#1e3a8a,#1d4ed8':'#4c1d95,#6d28d9'});color:#fff">
        <div class="card-body">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <div style="width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">
              ${type==='infarkt'?'🫀':'🧠'}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 style="font-size:20px;font-weight:800">${p.fio||'—'}</h2>
                ${Utils.statusBadge(p.status)}
              </div>
              <p style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px">
                ${age?age+' yosh':''} · ${p.jins||''} · K/T: <b>${p.kt_no}</b> · ${p.viloyat||''}
              </p>
              <p style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:2px">
                Qabul: ${Utils.formatDateTime(p.qabul_vaqt)} · ${type==='infarkt'?(p.infarkt_turi||''):(p.insult_turi||'')}
              </p>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3)" onclick="Router.go('bemorlar')">← Orqaga</button>
              ${p.status==='active'?`<button class="btn btn-sm" style="background:#ef4444;color:#fff" onclick="BemorKartaPage.chiqarishModal()">📤 Chiqarish</button>`:''}
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="card">
        <div class="card-body" style="padding-bottom:0">
          ${Components.renderTabs(['📋 Umumiy','📊 Holat baholash','💊 Davolash','📝 Shift topshirish','📤 Chiqarish'],0,'BemorKartaPage.switchTab')}
        </div>
      </div>
    `;
    BemorKartaPage.loadTab(0);
  },

  switchTab(idx) {
    document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
    document.querySelectorAll('.tab-content').forEach((c,i)=>c.classList.toggle('active',i===idx));
    BemorKartaPage._activeTab = idx;
    BemorKartaPage.loadTab(idx);
  },

  loadTab(idx) {
    const tabEl = document.getElementById(`tab-${idx}`);
    if (!tabEl) return;
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    if (idx===0) BemorKartaPage.renderUmumiy(tabEl, p, type);
    else if (idx===1) BemorKartaPage.renderHolat(tabEl, p, type);
    else if (idx===2) BemorKartaPage.renderDavolash(tabEl, p, type);
    else if (idx===3) BemorKartaPage.renderShift(tabEl);
    else if (idx===4) BemorKartaPage.renderChiqarish(tabEl, p, type);
  },

  renderUmumiy(el, p, type) {
    const row = (label, val) => `<div class="flex gap-2 py-2 border-b border-slate-50"><span class="text-xs text-slate-400 w-40 flex-shrink-0">${label}</span><span class="text-sm font-medium text-slate-700">${val||'—'}</span></div>`;
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <div class="card-header"><span class="card-title">👤 Shaxsiy ma'lumotlar</span></div>
          <div class="card-body">
            ${row('F.I.O',p.fio)}
            ${row('Tug\'ilgan yili',p.tugilgan_yil)}
            ${row('Yoshi',Utils.calculateAge(p.tugilgan_yil)?Utils.calculateAge(p.tugilgan_yil)+' yosh':null)}
            ${row('Jinsi',p.jins)}
            ${row('Viloyat',p.viloyat)}
            ${row('Muassasa',p.muassasa)}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏥 Qabul ma'lumotlari</span></div>
          <div class="card-body">
            ${row('K/T No',p.kt_no)}
            ${row('Qabul vaqti',Utils.formatDateTime(p.qabul_vaqt))}
            ${row('Murojaat yo\'li',p.murojaat_yoli)}
            ${row('Yuborgan muassasa',p.yuborgan_muassasa)}
            ${row('Simptom vaqti',p.simptom_vaqt)}
            ${row('Qon bosimi',p.qon_bosimi)}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🩺 Klinik ma'lumotlar</span></div>
          <div class="card-body">
            ${type==='infarkt'?`
              ${row('Infarkt turi',p.infarkt_turi)}
              ${row('Killip klassi',p.killip)}
              ${row('Troponin',p.troponin)}
              ${row('KFK-MB',p.kkfmb)}
              ${row('EKG',Array.isArray(p.ekg_natija)?p.ekg_natija.join('; '):p.ekg_natija)}
              ${row('Shifokor',p.shifokor_fio)}
            `:``}
            ${type==='insult'?`
              ${row('Insult turi',p.insult_turi)}
              ${row('NIHSS (qabul)',p.nihss_qabul!=null?p.nihss_qabul+' ball':null)}
              ${row('GCS (qabul)',p.gcs_qabul!=null?p.gcs_qabul+' ball':null)}
              ${row('MSKT',p.mskt)}
            `:``}
            ${row('Muolaja turi',p.muolaja_turi)}
            ${row('Xavf omillari',Array.isArray(p.xavf_omil)?p.xavf_omil.join('; '):p.xavf_omil)}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📅 Holat</span></div>
          <div class="card-body">
            ${row('Joriy holat',Utils.statusBadge(p.status))}
            ${row('Qabul sanasi',Utils.formatDate(p.created_at))}
          </div>
        </div>
      </div>`;
  },

  async renderHolat(el, p, type) {
    el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner" style="width:28px;height:28px"></div></div>`;
    const list = await DB.holatBaholashList(type, p.kt_no);
    el.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-slate-700">Holat baholashlar tarixi</h3>
        <button class="btn btn-primary btn-sm" onclick="BemorKartaPage.holatModal()">+ Yangi baholash</button>
      </div>
      ${list.length===0?`<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">Hali baholash yo'q</div></div>`:`
      <div class="card overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Vaqt</th><th>Qon bosimi</th><th>Yurak urish</th><th>SpO2</th><th>Temp</th>
          ${type==='insult'?'<th>NIHSS</th><th>GCS</th>':'<th>Killip</th>'}<th>Izoh</th></tr></thead>
          <tbody>
            ${list.map(h=>`<tr>
              <td class="text-xs">${Utils.formatDateTime(h.vaqt)}</td>
              <td>${h.qon_bosimi||'—'}</td>
              <td>${h.yurak_urish??'—'}</td>
              <td>${h.spo2!=null?h.spo2+'%':'—'}</td>
              <td>${h.temperatura!=null?h.temperatura+'°':'—'}</td>
              ${type==='insult'?`<td>${h.nihss_ball??'—'}</td><td>${h.gcs_ball??'—'}</td>`:`<td>${h.killip_klass||'—'}</td>`}
              <td class="text-xs">${Utils.truncate(h.izoh,30)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  holatModal() {
    const type = BemorKartaPage._type;
    showModal({
      title: '📊 Yangi holat baholash',
      body: `
        <div class="grid grid-cols-2 gap-3">
          ${Components.field('hb-qon_bosimi','Qon bosimi',`<input id="hb-qon_bosimi" class="form-input" placeholder="120/80"/>`)}
          ${Components.field('hb-yurak','Yurak urish (urish/min)',`<input id="hb-yurak" type="number" class="form-input" placeholder="72"/>`)}
          ${Components.field('hb-spo2','SpO2 (%)',`<input id="hb-spo2" type="number" class="form-input" placeholder="98" min="0" max="100"/>`)}
          ${Components.field('hb-temp','Temperatura (°C)',`<input id="hb-temp" type="number" class="form-input" placeholder="36.6" step="0.1"/>`)}
          ${type==='insult'?`
            ${Components.field('hb-nihss','NIHSS bali',`<input id="hb-nihss" type="number" class="form-input" placeholder="0-42" min="0" max="42"/>`)}
            ${Components.field('hb-gcs','GCS bali',`<input id="hb-gcs" type="number" class="form-input" placeholder="3-15" min="3" max="15"/>`)}
          `:``}
          ${type==='infarkt'?`
            <div class="col-span-2">${Components.field('hb-killip','Killip klassi',`<select id="hb-killip" class="form-select">${Components.selectOptions(APP_CONFIG.KILLIP_KLASSLAR,'')}</select>`)}</div>
          `:``}
        </div>
        ${Components.field('hb-izoh','Izoh',`<textarea id="hb-izoh" class="form-textarea" placeholder="Qo'shimcha ma'lumot..."></textarea>`)}
        ${Components.field('hb-shifokor','Shifokor',`<input id="hb-shifokor" class="form-input" placeholder="Shifokor F.I.O"/>`)}
      `,
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Bekor qilish</button>
               <button class="btn btn-primary" onclick="BemorKartaPage.saveHolat()">💾 Saqlash</button>`
    });
  },

  async saveHolat() {
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    try {
      await DB.holatBaholashQosh({
        registr_turi: type, kt_no: p.kt_no,
        qon_bosimi: document.getElementById('hb-qon_bosimi')?.value,
        yurak_urish: parseInt(document.getElementById('hb-yurak')?.value)||null,
        spo2: parseInt(document.getElementById('hb-spo2')?.value)||null,
        temperatura: parseFloat(document.getElementById('hb-temp')?.value)||null,
        nihss_ball: parseInt(document.getElementById('hb-nihss')?.value)||null,
        gcs_ball: parseInt(document.getElementById('hb-gcs')?.value)||null,
        killip_klass: document.getElementById('hb-killip')?.value||null,
        izoh: document.getElementById('hb-izoh')?.value,
        shifokor: document.getElementById('hb-shifokor')?.value
      });
      closeModal();
      showToast('✅ Holat baholash saqlandi', 'success');
      const tabEl = document.getElementById('tab-1');
      if (tabEl) await BemorKartaPage.renderHolat(tabEl, p, type);
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  async renderDavolash(el, p, type) {
    el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner" style="width:28px;height:28px"></div></div>`;
    const list = await DB.davolashList(type, p.kt_no);
    const aktiv = list.filter(d=>d.status==='active');
    const toxtat = list.filter(d=>d.status!=='active');
    el.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-slate-700">Dori-darmonlar</h3>
        <button class="btn btn-primary btn-sm" onclick="BemorKartaPage.doriModal()">+ Dori qo'shish</button>
      </div>
      <h4 class="text-sm font-bold text-green-700 mb-2">✅ Aktiv dorilar (${aktiv.length})</h4>
      ${aktiv.length===0?`<div class="empty-state py-6"><div class="empty-state-icon">💊</div><div class="empty-state-title">Aktiv dori yo'q</div></div>`:`
      <div class="card mb-4 overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Dori nomi</th><th>Doza</th><th>Yo'lak</th><th>Chastota</th><th>Boshlanish</th><th>Amallar</th></tr></thead>
          <tbody>
            ${aktiv.map(d=>`<tr>
              <td class="font-semibold">${d.dori_nomi}</td>
              <td>${d.doza||'—'}</td><td>${d.yolak||'—'}</td><td>${d.chastota||'—'}</td>
              <td class="text-xs">${Utils.formatDate(d.boshlanish_vaqt)}</td>
              <td>
                <button class="btn btn-ghost btn-sm text-red-500" onclick="BemorKartaPage.toxtatDori('${d.id}')">To'xtatish</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
      ${toxtat.length>0?`
        <h4 class="text-sm font-bold text-slate-400 mb-2 mt-4">⏹️ To'xtatilgan dorilar (${toxtat.length})</h4>
        <div class="card overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Dori nomi</th><th>Doza</th><th>Izoh</th></tr></thead>
            <tbody>${toxtat.map(d=>`<tr style="opacity:0.6"><td>${d.dori_nomi}</td><td>${d.doza||'—'}</td><td class="text-xs">${d.izoh||'—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>`:''}`;
  },

  doriModal() {
    showModal({
      title: '💊 Dori qo\'shish',
      body: `
        <div class="grid grid-cols-2 gap-3">
          ${Components.field('dr-nomi','Dori nomi',`<input id="dr-nomi" class="form-input" placeholder="Aspirin"/>`,true)}
          ${Components.field('dr-doza','Doza',`<input id="dr-doza" class="form-input" placeholder="100 mg"/>`)}
          ${Components.field('dr-yolak','Yo\'lak',`<input id="dr-yolak" class="form-input" placeholder="Og'iz orqali"/>`)}
          ${Components.field('dr-chastota','Chastota',`<input id="dr-chastota" class="form-input" placeholder="Kuniga 1 mahal"/>`)}
        </div>
        ${Components.field('dr-izoh','Izoh',`<textarea id="dr-izoh" class="form-textarea" placeholder="Qo'shimcha..."></textarea>`)}
        ${Components.field('dr-shifokor','Shifokor',`<input id="dr-shifokor" class="form-input" placeholder="Shifokor F.I.O"/>`)}
      `,
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Bekor qilish</button>
               <button class="btn btn-primary" onclick="BemorKartaPage.saveDori()">💾 Saqlash</button>`
    });
  },

  async saveDori() {
    const nomi = document.getElementById('dr-nomi')?.value?.trim();
    if (!nomi) { showToast('Dori nomini kiriting', 'error'); return; }
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    try {
      await DB.davolashQosh({
        registr_turi: type, kt_no: p.kt_no, dori_nomi: nomi,
        doza: document.getElementById('dr-doza')?.value,
        yolak: document.getElementById('dr-yolak')?.value,
        chastota: document.getElementById('dr-chastota')?.value,
        izoh: document.getElementById('dr-izoh')?.value,
        shifokor: document.getElementById('dr-shifokor')?.value,
        status: 'active'
      });
      closeModal();
      showToast('✅ Dori qo\'shildi', 'success');
      const tabEl = document.getElementById('tab-2');
      if (tabEl) await BemorKartaPage.renderDavolash(tabEl, p, type);
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  async toxtatDori(id) {
    if (!confirm('Bu dorini to\'xtatmoqchimisiz?')) return;
    try {
      await DB.davolashUpdate(id, { status: 'stopped' });
      showToast('Dori to\'xtatildi', 'info');
      const tabEl = document.getElementById('tab-2');
      if (tabEl) await BemorKartaPage.renderDavolash(tabEl, BemorKartaPage._patient, BemorKartaPage._type);
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  renderShift(el) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">📝 Shift topshirish yozuvi</span></div>
        <div class="card-body">
          <textarea id="shift-text" class="form-textarea" rows="8" placeholder="Shift topshirish ma'lumotlari, bemor holati, muhim o'zgarishlar..."></textarea>
          <button class="btn btn-primary mt-3" onclick="BemorKartaPage.saveShift()">💾 Saqlash</button>
        </div>
      </div>`;
  },

  saveShift() { showToast('Shift ma\'lumoti saqlandi', 'success'); },

  renderChiqarish(el, p, type) {
    if (p.status !== 'active') {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Bemor allaqachon chiqarilgan</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="max-w-xl mx-auto card">
        <div class="card-header"><span class="card-title">📤 Bemorni chiqarish</span></div>
        <div class="card-body">
          ${Components.field('ch-sana','Chiqarilgan sana',`<input id="ch-sana" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/>`,true)}
          ${type==='insult'?`
            ${Components.field('ch-nihss','NIHSS bali chiqarishda',`<input id="ch-nihss" type="number" class="form-input" placeholder="0-42" min="0" max="42"/>`)}
            ${Components.field('ch-mrs','mRS darajasi',`<select id="ch-mrs" class="form-select">${Components.selectOptions(APP_CONFIG.MRS_DARAJALAR,'')}</select>`)}
            ${Components.field('ch-natija','Natija',`<select id="ch-natija" class="form-select">${Components.selectOptions(APP_CONFIG.INSULT_NATIJALARI,'')}</select>`,true)}
            ${Components.field('ch-boshqa','Boshqa shifoxona nomi',`<input id="ch-boshqa" class="form-input" placeholder="Agar o'tkazilsa"/>`)}
            ${Components.field('ch-reab','Reabilitatsiya markazi',`<input id="ch-reab" class="form-input" placeholder="Markaz nomi"/>`)}
          `:``}
          ${type==='infarkt'?`
            ${Components.field('ch-holat','Chiqish holati',`<select id="ch-holat" class="form-select">${Components.selectOptions(APP_CONFIG.INFARKT_CHIQISH_HOLATLARI,'')}</select>`,true)}
            ${Components.field('ch-diagnoz','Yakuniy diagnoz',`<textarea id="ch-diagnoz" class="form-textarea" placeholder="Yakuniy klinik diagnoz..."></textarea>`)}
            ${Components.field('ch-tavsiya','Tavsiyalar',`<textarea id="ch-tavsiya" class="form-textarea" placeholder="Shifokor tavsiyalari..."></textarea>`)}
          `:``}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="BemorKartaPage.switchTab(0)">Bekor qilish</button>
          <button class="btn btn-danger" onclick="BemorKartaPage.chiqarish()">📤 Chiqarildi deb belgilash</button>
        </div>
      </div>`;
  },

  async chiqarish() {
    const p = BemorKartaPage._patient;
    const type = BemorKartaPage._type;
    const sana = document.getElementById('ch-sana')?.value;
    if (!sana) { showToast('Chiqish sanasini kiriting', 'error'); return; }
    try {
      if (type === 'insult') {
        await DB.insultChiqarish({
          kt_no: p.kt_no, viloyat: p.viloyat,
          kelgan_sana: p.qabul_vaqt?.split('T')[0],
          chiqish_sana: sana,
          nihss_chiqish: parseInt(document.getElementById('ch-nihss')?.value)||null,
          mrs_daraja: document.getElementById('ch-mrs')?.value,
          natija: document.getElementById('ch-natija')?.value,
          boshqa_shifo: document.getElementById('ch-boshqa')?.value,
          reab_markazi: document.getElementById('ch-reab')?.value
        });
        await DB.insultUpdate(p.kt_no, { status: document.getElementById('ch-natija')?.value?.includes('Vafot')?'vafot':'chiqarildi' });
      } else {
        await DB.infarktChiqarish({
          kt_no: p.kt_no,
          chiqish_sana: sana,
          chiqish_holat: document.getElementById('ch-holat')?.value,
          yakuniy_diagnoz: document.getElementById('ch-diagnoz')?.value,
          tavsiyalar: document.getElementById('ch-tavsiya')?.value
        });
        const holat = document.getElementById('ch-holat')?.value;
        await DB.infarktUpdate(p.kt_no, { status: holat?.includes('Vafot')?'vafot':'chiqarildi' });
      }
      showToast('✅ Bemor chiqarildi', 'success');
      Router.go('bemorlar');
    } catch(err) { showToast('❌ ' + err.message, 'error'); }
  },

  chiqarishModal() { BemorKartaPage.switchTab(4); }
};
