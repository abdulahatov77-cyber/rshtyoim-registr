// ==================== INFARKT YANGI BEMOR SAHIFASI ====================
const InfarktYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Klinik holat', 'Xavf omillari', 'Diagnoz', 'Qo\'shimcha'],

  async render() {
    const user = await Auth.getUser();
    InfarktYangiPage._step = 0;
    InfarktYangiPage._data = {
      kt_no: Utils.generateKtNo(),
      qabul_vaqt: Utils.formatDateInput(new Date())
    };

    document.getElementById('app').innerHTML = Components.renderLayout(
      'infarkt-yangi', '🫀 Yangi Infarkt Bemori', 'Bemor qabul qilish formasi',
      `<div id="infarkt-form-wrap"></div>`, user
    );
    Components.startClock();
    InfarktYangiPage.renderStep();
  },

  renderStep() {
    const step = InfarktYangiPage._step;
    const wrap = document.getElementById('infarkt-form-wrap');
    wrap.innerHTML = `
      <div class="max-w-3xl mx-auto animate-fadein">
        <!-- Progress -->
        ${Components.stepProgress(InfarktYangiPage.STEPS, step)}

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${['🏥 Bo\'lim 1: Muassasa va bemor ma\'lumotlari',
                '🩺 Bo\'lim 2: Klinik holat',
                '⚠️ Bo\'lim 3: Xavf omillari',
                '💊 Bo\'lim 4: Diagnoz va davolash',
                '📝 Bo\'lim 5: Qo\'shimcha ma\'lumotlar'][step]}</div>
              <div class="text-xs text-slate-400 mt-1">${step+1} / ${InfarktYangiPage.STEPS.length} bo'lim</div>
            </div>
          </div>
          <div class="card-body" id="step-body">
            ${InfarktYangiPage['renderStep' + step]()}
          </div>
          <div class="modal-footer justify-between">
            <button class="btn btn-ghost" onclick="InfarktYangiPage.prevStep()" ${step===0?'disabled':''}>← Orqaga</button>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InfarktYangiPage.STEPS.length-1
                ? `<button class="btn btn-primary" onclick="InfarktYangiPage.nextStep()">Keyingi →</button>`
                : `<button class="btn btn-success btn-lg" id="save-btn" onclick="InfarktYangiPage.save()">💾 Saqlash</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderStep0() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${Components.field('viloyat','Viloyat',`<select id="viloyat" class="form-select"><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${Components.field('muassasa','Muassasa to\'liq nomi',`<input id="muassasa" class="form-input" value="${d.muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        ${Components.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input" value="${d.kt_no||''}" placeholder="KT-YYYYMMDD-0000"/>`,true,'Avtomatik yaratiladi, o\'zgartirishingiz mumkin')}
        ${Components.field('qabul_vaqt','Qabul qilgan sana va vaqt',`<input id="qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        ${Components.field('murojaat_yoli','Murojaat yo\'li',`<select id="murojaat_yoli" class="form-select">
          ${Components.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        ${Components.field('yuborgan_muassasa','Yuborgan muassasa nomi',`<input id="yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Agar boshqa muassasadan bo'lsa"/>`)}
        ${Components.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
        ${Components.field('tugilgan_yil','Tug\'ilgan yili',`<input id="tugilgan_yil" class="form-input" value="${d.tugilgan_yil||''}" placeholder="1975" type="text" maxlength="4"/>`,true)}
        ${Components.field('jins','Jinsi',`<div class="radio-group mt-1">
          <label class="radio-item ${d.jins==='Erkak'?'selected':''}"><input type="radio" name="jins" value="Erkak" ${d.jins==='Erkak'?'checked':''} onchange="Components.toggleRadio(this)"> 👨 Erkak</label>
          <label class="radio-item ${d.jins==='Ayol'?'selected':''}"><input type="radio" name="jins" value="Ayol" ${d.jins==='Ayol'?'checked':''} onchange="Components.toggleRadio(this)"> 👩 Ayol</label>
        </div>`,true)}
      </div>
    `;
  },

  renderStep1() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${Components.field('simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="simptom_vaqt" class="form-select">
          ${Components.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR, d.simptom_vaqt||'')}</select>`,true)}
        ${Components.field('asosiy_simptom','Asosiy simptom',`<input id="asosiy_simptom" class="form-input" value="${d.asosiy_simptom||''}" placeholder="Ko'krak og'rig'i, nafas qisilishi..."/>`)}
        ${Components.field('qon_bosimi','Qon bosimi (qabul paytida)',`<input id="qon_bosimi" class="form-input" value="${d.qon_bosimi||''}" placeholder="140/90 mmHg"/>`,true)}
      </div>
      ${Components.field('ekg_natija','EKG natijasi (bir nechta tanlov mumkin)',
        Components.checkboxGroup('ekg_natija', APP_CONFIG.EKG_NATIJALARI, d.ekg_natija||[]))}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-2">
        ${Components.field('troponin','Troponin natijasi',`<select id="troponin" class="form-select">
          ${Components.selectOptions(['Yuqori','Normal','O\'lchilmagan'], d.troponin||'')}</select>`)}
        ${Components.field('kkfmb','KFK-MB natijasi',`<select id="kkfmb" class="form-select">
          ${Components.selectOptions(['Yuqori','Normal','O\'lchilmagan'], d.kkfmb||'')}</select>`)}
      </div>
    `;
  },

  renderStep2() {
    const d = InfarktYangiPage._data;
    return `
      ${Components.field('xavf_omil','Xavf omillari (bir nechta tanlash mumkin)',
        Components.checkboxGroup('xavf_omil', APP_CONFIG.XAVF_OMILLAR_INFARKT, d.xavf_omil||[]),true)}
    `;
  },

  renderStep3() {
    const d = InfarktYangiPage._data;
    return `
      ${Components.field('infarkt_turi','Infarkt turi',`<select id="infarkt_turi" class="form-select">
        ${Components.selectOptions(APP_CONFIG.INFARKT_TURLARI, d.infarkt_turi||'')}</select>`,true)}
      ${Components.field('killip','Killip klassifikatsiyasi',`<select id="killip" class="form-select">
        ${Components.selectOptions(APP_CONFIG.KILLIP_KLASSLAR, d.killip||'')}</select>`,true)}
      ${Components.field('muolaja_turi','Bajarilgan muolaja turi',`<select id="muolaja_turi" class="form-select">
        ${Components.selectOptions(APP_CONFIG.INFARKT_MUOLAJALARI, d.muolaja_turi||'')}</select>`,true)}
      ${Components.field('angio_natija','Diagnostik KAG natijasi',`<textarea id="angio_natija" class="form-textarea" placeholder="Angiografiya natijasi...">${d.angio_natija||''}</textarea>`)}
      ${Components.field('otkazilgan_muassasa','O\'tkazilgan muassasa nomi',`<input id="otkazilgan_muassasa" class="form-input" value="${d.otkazilgan_muassasa||''}" placeholder="Agar o'tkazilgan bo'lsa"/>`)}
    `;
  },

  renderStep4() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${Components.field('shifokor_fio','Formani to\'ldirgan shifokor F.I.O',`<input id="shifokor_fio" class="form-input" value="${d.shifokor_fio||''}" placeholder="F.I.O"/>`)}
        ${Components.field('aha_bali','AHA savolnomasi bali',`<input id="aha_bali" type="number" class="form-input" value="${d.aha_bali||''}" min="0" max="100" placeholder="0"/>`)}
      </div>
      <!-- Preview -->
      <div class="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p class="text-xs font-bold text-blue-700 mb-2">📋 QABUL MA'LUMOTLARI XULOSASI</p>
        <div class="grid grid-cols-2 gap-2 text-xs text-slate-600" id="preview-area">
          <div><b>Viloyat:</b> ${InfarktYangiPage._data.viloyat||'—'}</div>
          <div><b>K/T No:</b> ${InfarktYangiPage._data.kt_no||'—'}</div>
          <div><b>Bemor:</b> ${InfarktYangiPage._data.fio||'—'}</div>
          <div><b>Turi:</b> ${InfarktYangiPage._data.infarkt_turi||'—'}</div>
          <div><b>Killip:</b> ${InfarktYangiPage._data.killip||'—'}</div>
          <div><b>Muolaja:</b> ${InfarktYangiPage._data.muolaja_turi||'—'}</div>
        </div>
      </div>
    `;
  },

  collectStep(step) {
    const d = InfarktYangiPage._data;
    if (step === 0) {
      d.viloyat = document.getElementById('viloyat')?.value;
      d.muassasa = document.getElementById('muassasa')?.value;
      d.kt_no = document.getElementById('kt_no')?.value;
      d.qabul_vaqt = document.getElementById('qabul_vaqt')?.value;
      d.murojaat_yoli = document.getElementById('murojaat_yoli')?.value;
      d.yuborgan_muassasa = document.getElementById('yuborgan_muassasa')?.value;
      d.fio = document.getElementById('fio')?.value;
      d.tugilgan_yil = document.getElementById('tugilgan_yil')?.value;
      d.jins = Components.getRadio('jins');
    } else if (step === 1) {
      d.simptom_vaqt = document.getElementById('simptom_vaqt')?.value;
      d.asosiy_simptom = document.getElementById('asosiy_simptom')?.value;
      d.qon_bosimi = document.getElementById('qon_bosimi')?.value;
      d.ekg_natija = Components.getChecked('ekg_natija');
      d.troponin = document.getElementById('troponin')?.value;
      d.kkfmb = document.getElementById('kkfmb')?.value;
    } else if (step === 2) {
      d.xavf_omil = Components.getChecked('xavf_omil');
    } else if (step === 3) {
      d.infarkt_turi = document.getElementById('infarkt_turi')?.value;
      d.killip = document.getElementById('killip')?.value;
      d.muolaja_turi = document.getElementById('muolaja_turi')?.value;
      d.angio_natija = document.getElementById('angio_natija')?.value;
      d.otkazilgan_muassasa = document.getElementById('otkazilgan_muassasa')?.value;
    } else if (step === 4) {
      d.shifokor_fio = document.getElementById('shifokor_fio')?.value;
      d.aha_bali = parseInt(document.getElementById('aha_bali')?.value) || null;
    }
  },

  validateStep(step) {
    const d = InfarktYangiPage._data;
    Components.clearErrors();
    const errs = {};
    if (step === 0) {
      if (!d.viloyat) errs.viloyat = 'Viloyatni tanlang';
      if (!d.muassasa) errs.muassasa = 'Muassasa nomini kiriting';
      if (!d.kt_no) errs.kt_no = 'K/T raqamini kiriting';
      if (!d.qabul_vaqt) errs.qabul_vaqt = 'Qabul vaqtini kiriting';
      if (!d.fio) errs.fio = 'Bemor F.I.O ni kiriting';
      if (!d.tugilgan_yil) errs.tugilgan_yil = 'Tug\'ilgan yilni kiriting';
      if (!d.jins) errs.jins = 'Jinsni tanlang';
      if (!d.murojaat_yoli) errs.murojaat_yoli = 'Murojaat yo\'lini tanlang';
    } else if (step === 1) {
      if (!d.simptom_vaqt) errs.simptom_vaqt = 'Simptom vaqtini tanlang';
      if (!d.qon_bosimi) errs.qon_bosimi = 'Qon bosimini kiriting';
    } else if (step === 3) {
      if (!d.infarkt_turi) errs.infarkt_turi = 'Infarkt turini tanlang';
      if (!d.killip) errs.killip = 'Killip klassini tanlang';
      if (!d.muolaja_turi) errs.muolaja_turi = 'Muolaja turini tanlang';
    }
    Object.entries(errs).forEach(([k, v]) => Components.setError(k, v));
    return Object.keys(errs).length === 0;
  },

  nextStep() {
    InfarktYangiPage.collectStep(InfarktYangiPage._step);
    if (!InfarktYangiPage.validateStep(InfarktYangiPage._step)) {
      showToast('Majburiy maydonlarni to\'ldiring', 'error'); return;
    }
    InfarktYangiPage._step++;
    InfarktYangiPage.renderStep();
    window.scrollTo(0, 0);
  },

  prevStep() {
    InfarktYangiPage.collectStep(InfarktYangiPage._step);
    if (InfarktYangiPage._step > 0) { InfarktYangiPage._step--; InfarktYangiPage.renderStep(); window.scrollTo(0,0); }
  },

  async save() {
    InfarktYangiPage.collectStep(4);
    const d = InfarktYangiPage._data;
    const btn = document.getElementById('save-btn');
    setLoading(btn, true, 'Saqlanmoqda...');
    try {
      const result = await DB.infarktQabul({
        viloyat: d.viloyat, muassasa: d.muassasa, kt_no: d.kt_no,
        qabul_vaqt: d.qabul_vaqt, murojaat_yoli: d.murojaat_yoli,
        yuborgan_muassasa: d.yuborgan_muassasa, fio: d.fio,
        tugilgan_yil: d.tugilgan_yil, jins: d.jins,
        simptom_vaqt: d.simptom_vaqt, asosiy_simptom: d.asosiy_simptom,
        qon_bosimi: d.qon_bosimi, ekg_natija: d.ekg_natija,
        troponin: d.troponin, kkfmb: d.kkfmb, xavf_omil: d.xavf_omil,
        infarkt_turi: d.infarkt_turi, killip: d.killip,
        muolaja_turi: d.muolaja_turi, angio_natija: d.angio_natija,
        otkazilgan_muassasa: d.otkazilgan_muassasa,
        shifokor_fio: d.shifokor_fio, aha_bali: d.aha_bali,
        status: 'active'
      });
      await Telegram.notify(result, 'infarkt');
      showToast('✅ Bemor muvaffaqiyatli saqlandi!', 'success');
      Router.go('bemor-karta', { kt_no: result.kt_no, type: 'infarkt' });
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
      setLoading(btn, false);
    }
  }
};
