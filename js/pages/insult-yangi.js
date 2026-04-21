// ==================== INSULT YANGI BEMOR SAHIFASI ====================
const InsultYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Klinik holat', 'Xavf omillari', 'Muolaja'],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    InsultYangiPage._profile = profile;
    InsultYangiPage._step = 0;
    InsultYangiPage._data = {
      kt_no: Utils.generateKtNo(),
      qabul_vaqt: Utils.formatDateInput(new Date()),
      viloyat: profile?.role === 'admin' ? '' : (profile?.viloyat || '')
    };
    document.getElementById('app').innerHTML = Components.renderLayout(
      'insult-yangi', '🧠 Yangi Insult Bemori', 'Insult bemori qabul qilish formasi',
      `<div id="insult-form-wrap"></div>`, user
    );
    Components.startClock();
    InsultYangiPage.renderStep();
  },

  renderStep() {
    const step = InsultYangiPage._step;
    const wrap = document.getElementById('insult-form-wrap');
    wrap.innerHTML = `
      <div class="max-w-3xl mx-auto animate-fadein">
        ${Components.stepProgress(InsultYangiPage.STEPS, step)}
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${['🏥 Bo\'lim 1: Muassasa va bemor',
                '🩺 Bo\'lim 2: Klinik holat',
                '⚠️ Bo\'lim 3: Xavf omillari',
                '💊 Bo\'lim 4: Muolaja va tekshiruvlar'][step]}</div>
              <div class="text-xs text-slate-400 mt-1">${step+1} / ${InsultYangiPage.STEPS.length} bo'lim</div>
            </div>
          </div>
          <div class="card-body">
            ${InsultYangiPage['renderStep' + step]()}
          </div>
          <div class="modal-footer justify-between">
            <button class="btn btn-ghost" onclick="InsultYangiPage.prevStep()" ${step===0?'disabled':''}>← Orqaga</button>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InsultYangiPage.STEPS.length-1
                ? `<button class="btn btn-primary" onclick="InsultYangiPage.nextStep()">Keyingi →</button>`
                : `<button class="btn btn-success btn-lg" id="save-insult-btn" onclick="InsultYangiPage.save()">💾 Saqlash</button>`
              }
            </div>
          </div>
        </div>
      </div>`;
  },

  renderStep0() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${Components.field('i-viloyat','Viloyat',`<select id="i-viloyat" class="form-select" ${InsultYangiPage._profile?.role !== 'admin' ? 'disabled' : ''}>
          <option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${Components.field('i-muassasa','Muassasa to\'liq nomi',`<input id="i-muassasa" class="form-input" value="${d.muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        ${Components.field('i-kt_no','Kasallik tarixi №',`<input id="i-kt_no" class="form-input" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${Components.field('i-qabul_vaqt','Qabul qilgan sana va vaqt',`<input id="i-qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        ${Components.field('i-murojaat_yoli','Murojaat yo\'li',`<select id="i-murojaat_yoli" class="form-select">
          ${Components.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        ${Components.field('i-yuborgan_muassasa','Yuborgan muassasa',`<input id="i-yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Agar boshqa muassasadan"/>`)}
        ${Components.field('i-fio','Bemor F.I.O',`<input id="i-fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
        ${Components.field('i-tugilgan_yil','Tug\'ilgan yili',`<input id="i-tugilgan_yil" class="form-input" value="${d.tugilgan_yil||''}" placeholder="1975" maxlength="4"/>`,true)}
        ${Components.field('i-jins','Jinsi',`<div class="radio-group mt-1">
          <label class="radio-item ${d.jins==='Erkak'?'selected':''}"><input type="radio" name="i-jins" value="Erkak" ${d.jins==='Erkak'?'checked':''} onchange="Components.toggleRadio(this)"> 👨 Erkak</label>
          <label class="radio-item ${d.jins==='Ayol'?'selected':''}"><input type="radio" name="i-jins" value="Ayol" ${d.jins==='Ayol'?'checked':''} onchange="Components.toggleRadio(this)"> 👩 Ayol</label>
        </div>`,true)}
        ${Components.field('i-simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="i-simptom_vaqt" class="form-select">
          ${Components.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR, d.simptom_vaqt||'')}</select>`,true)}
      </div>`;
  },

  renderStep1() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${Components.field('nihss_qabul','NIHSS bali (qabul paytida)',`<input id="nihss_qabul" type="number" class="form-input" value="${d.nihss_qabul??''}" min="0" max="42" placeholder="0–42"/>`,true,'0 dan 42 gacha')}
        ${Components.field('gcs_qabul','Glazgo shkalasi (GCS)',`<input id="gcs_qabul" type="number" class="form-input" value="${d.gcs_qabul??''}" min="3" max="15" placeholder="3–15"/>`,true,'3 dan 15 gacha')}
        ${Components.field('i-qon_bosimi','Qon bosimi (qabul paytida)',`<input id="i-qon_bosimi" class="form-input" value="${d.qon_bosimi||''}" placeholder="160/100 mmHg"/>`,true)}
        ${Components.field('insult_turi','Insult turi',`<select id="insult_turi" class="form-select">
          ${Components.selectOptions(APP_CONFIG.INSULT_TURLARI, d.insult_turi||'')}</select>`,true)}
      </div>
      <!-- NIHSS indicator -->
      <div class="mt-2 p-3 rounded-xl text-sm" id="nihss-indicator" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534">
        ℹ️ NIHSS bali: ${d.nihss_qabul!=null?d.nihss_qabul:'Kiritilmagan'} —
        ${d.nihss_qabul>=15?'⚠️ OG\'IR HOLAT':'Normal yoki o\'rtacha'}
      </div>`;
  },

  renderStep2() {
    const d = InsultYangiPage._data;
    return `
      ${Components.field('i-xavf_omil','Xavf omillari (bir nechta tanlash mumkin)',
        Components.checkboxGroup('i-xavf_omil', APP_CONFIG.XAVF_OMILLAR_INSULT, d.xavf_omil||[]),true)}`;
  },

  renderStep3() {
    const d = InsultYangiPage._data;
    return `
      ${Components.field('mskt','MSKT o\'tkazilganmi?',`<select id="mskt" class="form-select">
        ${Components.selectOptions(APP_CONFIG.MSKT_TANLOVLAR, d.mskt||'')}</select>`,true)}
      ${Components.field('i-muolaja_turi','Muolaja turi',`<select id="i-muolaja_turi" class="form-select">
        ${Components.selectOptions(APP_CONFIG.INSULT_MUOLAJALARI, d.muolaja_turi||'')}</select>`,true)}
      <!-- Summary -->
      <div class="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
        <p class="text-xs font-bold text-purple-700 mb-2">🧠 QABUL MA'LUMOTLARI XULOSASI</p>
        <div class="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div><b>Viloyat:</b> ${d.viloyat||'—'}</div>
          <div><b>K/T No:</b> ${d.kt_no||'—'}</div>
          <div><b>Bemor:</b> ${d.fio||'—'}</div>
          <div><b>Turi:</b> ${d.insult_turi||'—'}</div>
          <div><b>NIHSS:</b> ${d.nihss_qabul??'—'} | GCS: ${d.gcs_qabul??'—'}</div>
          <div><b>Qon bosimi:</b> ${d.qon_bosimi||'—'}</div>
        </div>
      </div>`;
  },

  collectStep(step) {
    const d = InsultYangiPage._data;
    if (step === 0) {
      if (InsultYangiPage._profile?.role === 'admin') {
        d.viloyat = document.getElementById('i-viloyat')?.value;
      }
      d.muassasa = document.getElementById('i-muassasa')?.value;
      d.kt_no = document.getElementById('i-kt_no')?.value;
      d.qabul_vaqt = document.getElementById('i-qabul_vaqt')?.value;
      d.murojaat_yoli = document.getElementById('i-murojaat_yoli')?.value;
      d.yuborgan_muassasa = document.getElementById('i-yuborgan_muassasa')?.value;
      d.fio = document.getElementById('i-fio')?.value;
      d.tugilgan_yil = document.getElementById('i-tugilgan_yil')?.value;
      d.jins = Components.getRadio('i-jins');
      d.simptom_vaqt = document.getElementById('i-simptom_vaqt')?.value;
    } else if (step === 1) {
      d.nihss_qabul = parseInt(document.getElementById('nihss_qabul')?.value) || null;
      d.gcs_qabul = parseInt(document.getElementById('gcs_qabul')?.value) || null;
      d.qon_bosimi = document.getElementById('i-qon_bosimi')?.value;
      d.insult_turi = document.getElementById('insult_turi')?.value;
    } else if (step === 2) {
      d.xavf_omil = Components.getChecked('i-xavf_omil');
    } else if (step === 3) {
      d.mskt = document.getElementById('mskt')?.value;
      d.muolaja_turi = document.getElementById('i-muolaja_turi')?.value;
    }
  },

  validateStep(step) {
    const d = InsultYangiPage._data;
    Components.clearErrors();
    const errs = {};
    if (step === 0) {
      if (!d.viloyat) errs['i-viloyat'] = 'Viloyatni tanlang';
      if (!d.muassasa) errs['i-muassasa'] = 'Muassasa nomini kiriting';
      if (!d.kt_no) errs['i-kt_no'] = 'K/T raqamini kiriting';
      if (!d.qabul_vaqt) errs['i-qabul_vaqt'] = 'Qabul vaqtini kiriting';
      if (!d.fio) errs['i-fio'] = 'Bemor F.I.O ni kiriting';
      if (!d.tugilgan_yil) errs['i-tugilgan_yil'] = 'Tug\'ilgan yilni kiriting';
      if (!d.jins) errs['i-jins'] = 'Jinsni tanlang';
      if (!d.murojaat_yoli) errs['i-murojaat_yoli'] = 'Murojaat yo\'lini tanlang';
      if (!d.simptom_vaqt) errs['i-simptom_vaqt'] = 'Simptom vaqtini tanlang';
    } else if (step === 1) {
      if (d.nihss_qabul === null) errs['nihss_qabul'] = 'NIHSS balini kiriting';
      if (d.gcs_qabul === null) errs['gcs_qabul'] = 'GCS balini kiriting';
      if (!d.qon_bosimi) errs['i-qon_bosimi'] = 'Qon bosimini kiriting';
      if (!d.insult_turi) errs['insult_turi'] = 'Insult turini tanlang';
    } else if (step === 3) {
      if (!d.mskt) errs['mskt'] = 'MSKT natijasini tanlang';
      if (!d.muolaja_turi) errs['i-muolaja_turi'] = 'Muolaja turini tanlang';
    }
    Object.entries(errs).forEach(([k, v]) => Components.setError(k, v));
    return Object.keys(errs).length === 0;
  },

  nextStep() {
    InsultYangiPage.collectStep(InsultYangiPage._step);
    if (!InsultYangiPage.validateStep(InsultYangiPage._step)) {
      showToast('Majburiy maydonlarni to\'ldiring', 'error'); return;
    }
    InsultYangiPage._step++;
    InsultYangiPage.renderStep();
    window.scrollTo(0, 0);
  },

  prevStep() {
    InsultYangiPage.collectStep(InsultYangiPage._step);
    if (InsultYangiPage._step > 0) { InsultYangiPage._step--; InsultYangiPage.renderStep(); window.scrollTo(0,0); }
  },

  async save() {
    InsultYangiPage.collectStep(3);
    const d = InsultYangiPage._data;
    const btn = document.getElementById('save-insult-btn');
    setLoading(btn, true, 'Saqlanmoqda...');
    try {
      const result = await DB.insultQabul({
        viloyat: d.viloyat, muassasa: d.muassasa, kt_no: d.kt_no,
        qabul_vaqt: d.qabul_vaqt, murojaat_yoli: d.murojaat_yoli,
        yuborgan_muassasa: d.yuborgan_muassasa, fio: d.fio,
        tugilgan_yil: d.tugilgan_yil, jins: d.jins,
        simptom_vaqt: d.simptom_vaqt, nihss_qabul: d.nihss_qabul,
        gcs_qabul: d.gcs_qabul, qon_bosimi: d.qon_bosimi,
        insult_turi: d.insult_turi, xavf_omil: d.xavf_omil,
        mskt: d.mskt, muolaja_turi: d.muolaja_turi, status: 'active'
      });
      await Telegram.notify(result, 'insult');
      showToast('✅ Bemor muvaffaqiyatli saqlandi!', 'success');
      Router.go('bemor-karta', { kt_no: result.kt_no, type: 'insult' });
    } catch (err) {
      showToast('❌ Xato: ' + err.message, 'error');
      setLoading(btn, false);
    }
  }
};
