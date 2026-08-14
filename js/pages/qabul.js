// ==================== QABUL KUTILMOQDA ====================
// Boshqa muassasadan shu muassasaga yuborilgan bemorlar ro'yxati.
// "Qabul qilish" bosilganda kelish vaqti so'raladi va yangi bemor formasi
// bemorning shaxsiy ma'lumotlari bilan to'ldirilgan holda ochiladi.
//
// Tashxis, ballar va tekshiruvlar KO'CHIRILMAYDI — ular qabul qiluvchi
// muassasada qaytadan baholanadi. Yuboruvchi muassasadagi ma'lumot faqat
// ma'lumot uchun ko'rsatiladi.
const QabulPage = {
  _rows: [],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    QabulPage._profile = profile;
    // Super_admin va rahbarda ish joyi bo'lmaydi — ular bemor qabul qilmaydi.
    // Ularga respublika bo'yicha kuzatuv ro'yxati ko'rsatiladi.
    const kuzatuvchi = profile?.role === 'super_admin' || profile?.real_role === 'rahbar';
    // Viloyat admini butun viloyatni boshqaradi — profilida muassasa bo'lsa ham
    // ro'yxat viloyat bo'yicha chiqadi.
    const viloyatAdmin = profile?.role === 'admin';
    const muassasa = (kuzatuvchi || viloyatAdmin) ? '' : (profile?.muassasa || '');
    const viloyat  = kuzatuvchi ? '' : (profile?.viloyat  || '');
    QabulPage._aniqMuassasa = !!muassasa;
    QabulPage._kuzatuvchi   = kuzatuvchi;

    document.getElementById('app').innerHTML = Components.renderLayout(
      'qabul', '🚑 Qabul kutilmoqda', 'Boshqa muassasadan yuborilgan bemorlar',
      `<div id="qb-inner" class="animate-fadein">
        <div id="qb-list">
          <div class="flex justify-center py-20">
            <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    initIcons();

    if (!kuzatuvchi && !muassasa && !viloyat) {
      QabulPage._xabar('info', 'Profilingizda viloyat ko\'rsatilmagan',
        'Bu ro\'yxat foydalanuvchining viloyati yoki muassasasi bo\'yicha shakllanadi. Administratorga murojaat qiling.');
      return;
    }
    try {
      QabulPage._rows = await DB.kutilayotganBemorlar(muassasa, viloyat, 30, kuzatuvchi);
      QabulPage._draw();
    } catch (e) {
      QabulPage._xabar('error', 'Ma\'lumot yuklanmadi', e.message);
    }
  },

  _xabar(turi, sarlavha, matn) {
    const el = document.getElementById('qb-list');
    if (!el) return;
    const rang = turi === 'error' ? 'text-red-500' : 'text-gray-300';
    el.innerHTML = `
      <div class="card text-center py-16">
        <div class="${rang} mb-4">${icon(turi === 'error' ? 'alert-circle' : 'inbox', 48, 'mx-auto')}</div>
        <h3 class="text-lg font-bold text-gray-900 mb-1">${esc(sarlavha)}</h3>
        <p class="text-gray-500 text-sm">${esc(matn)}</p>
      </div>`;
    initIcons();
  },

  _draw() {
    const el = document.getElementById('qb-list');
    if (!el) return;
    const rows = QabulPage._rows;
    if (!rows.length) {
      QabulPage._xabar('info', 'Kutilayotgan bemor yo\'q',
        'Sizning muassasangizga yuborilgan, hali qabul qilinmagan bemor topilmadi.');
      return;
    }

    // Kartochkalar indeksi qabulQil(i) uchun kerak — ajratishdan oldin belgilaymiz
    rows.forEach((r, i) => { r._i = i; });
    // Registrni yuritmaydigan muassasaga yuborilganlar alohida bo'limga
    const asosiy  = rows.filter(r => !r._kuzatuv);
    const kuzatuv = rows.filter(r =>  r._kuzatuv);

    if (!asosiy.length && kuzatuv.length) {
      // Asosiy ro'yxat bo'sh — kuzatuv bo'limi darhol ochiq ko'rinsin
      QabulPage._kuzatuvOchiq = true;
    }

    el.innerHTML = `
      <div class="card mb-4 !py-3 flex items-start gap-3 bg-blue-50 border-blue-200">
        ${icon('info', 18)}
        <span class="text-sm text-blue-900">
          ${QabulPage._kuzatuvchi ? `
            <b>${asosiy.length} ta bemor</b> respublika bo'yicha yuborilgan va hali qabul qilinmagan.
            <div class="mt-1 text-xs text-blue-800">
              Siz kuzatuvchi rolidasiz — bu ro'yxat nazorat uchun. Bemorni qabul qilishni
              qabul qiluvchi muassasa shifokori bajaradi.
            </div>` : `
            <b>${asosiy.length} ta bemor</b>
            ${QabulPage._aniqMuassasa ? 'muassasangizga' : 'viloyatingizdagi muassasalarga'} yuborilgan.
            "Qabul qilish" bosilganda kelish vaqti so'raladi va forma bemorning
            shaxsiy ma'lumotlari bilan to'ldirilgan holda ochiladi.
            ${QabulPage._aniqMuassasa ? '' : `
            <div class="mt-1 text-xs text-blue-800">
              ⚠️ Profilingizda muassasa ko'rsatilmagani uchun ro'yxat butun viloyat bo'yicha chiqyapti.
              Har bir kartochkada bemor <b>qaysi muassasaga</b> yuborilgani yozilgan — faqat o'zingiznikini qabul qiling.
            </div>`}`}
        </span>
      </div>
      ${asosiy.length ? `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        ${asosiy.map(r => QabulPage._card(r, r._i)).join('')}
      </div>` : `
      <div class="card text-center py-10">
        <div class="text-gray-300 mb-3">${icon('inbox', 40, 'mx-auto')}</div>
        <p class="text-gray-500 text-sm">Registrni yurituvchi muassasaga yuborilgan,
        hali qabul qilinmagan bemor yo'q.</p>
      </div>`}
      ${kuzatuv.length ? `
      <div class="card mt-6 !p-0 overflow-hidden">
        <button id="qb-kuzatuv-tugma" class="w-full text-left p-4 flex items-start gap-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                style="border:none;cursor:pointer">
          ${icon('archive', 18)}
          <span class="flex-1">
            <span class="block text-sm font-bold text-slate-700">
              ${kuzatuv.length} ta bemor — qabul qiluvchi registrni yuritmaydi
            </span>
            <span class="block text-xs text-slate-500 mt-1">
              Bu bemorlar kardiologiya markazi, xususiy klinika yoki registrga
              bemor kiritmaydigan boshqa muassasaga yo'naltirilgan. Ularni ro'yxatdan
              tushiradigan tomon tizimda yo'q, shuning uchun alohida ajratilgan.
              Ro'yxat "Muassasa imkoniyati" sahifasidagi belgiga qarab shakllanadi.
            </span>
          </span>
          <span id="qb-kuzatuv-strelka" class="text-slate-400 text-sm shrink-0">${QabulPage._kuzatuvOchiq ? '▲ yopish' : '▼ ochish'}</span>
        </button>
        <div id="qb-kuzatuv-royxat" style="display:${QabulPage._kuzatuvOchiq ? 'block' : 'none'}" class="p-4 pt-0">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            ${kuzatuv.map(r => QabulPage._card(r, r._i)).join('')}
          </div>
        </div>
      </div>` : ''}`;
    initIcons();

    const tugma = document.getElementById('qb-kuzatuv-tugma');
    if (tugma) {
      tugma.onclick = () => {
        const el = document.getElementById('qb-kuzatuv-royxat');
        const st = document.getElementById('qb-kuzatuv-strelka');
        const ochiq = el.style.display !== 'none';
        el.style.display = ochiq ? 'none' : 'block';
        QabulPage._kuzatuvOchiq = !ochiq;
        if (st) st.textContent = ochiq ? '▼ ochish' : '▲ yopish';
      };
    }
  },

  _card(r, i) {
    const isInf = r._turi === 'infarkt';
    const yosh = Utils.calculateAge(r.tugilgan_sana || r.tugilgan_yil);
    const tashxis = (isInf ? r.infarkt_turi : r.insult_turi) || '—';
    const sabab = r.otkazish_sababi
      || (r.muolaja_turi || '').split(/[—–]/).slice(1).join('—').trim()
      || '';
    return `
      <div class="card !p-0 overflow-hidden border-l-4" style="border-left-color:${isInf ? '#dc2626' : '#7c3aed'}">
        <div class="p-4">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="badge ${isInf ? 'badge-red' : 'badge-purple'}">
                  ${icon(isInf ? 'heart' : 'brain', 12)} ${isInf ? 'Infarkt' : 'Insult'}
                </span>
                <span class="text-xs text-gray-400 font-mono">${esc(r.kt_no)}</span>
              </div>
              <div class="text-base font-bold text-gray-900 truncate">${esc(PD.fio(r.fio) || '—')}</div>
              <div class="text-xs text-gray-500">
                ${esc(yosh || '—')} yosh · ${esc(r.jins || '—')}
              </div>
            </div>
            ${QabulPage._kuzatuvchi ? '' : `
            <div class="shrink-0 flex flex-col items-end gap-1.5">
              <button class="btn btn-primary !py-2 !px-3 flex items-center gap-1"
                      onclick="QabulPage.qabulQil(${i})">
                ${icon('log-in', 14)} Qabul qilish
              </button>
              ${r._mavjud ? `
              <button onclick="QabulPage.mavjudModal(${i})"
                      title="Muassasangizda shu bemorga o'xshash karta topildi — tekshiring"
                      style="border:1px solid ${r._mavjud.aniq ? '#86efac' : '#fcd34d'};
                             background:${r._mavjud.aniq ? '#f0fdf4' : '#fffbeb'};
                             color:${r._mavjud.aniq ? '#15803d' : '#b45309'};border-radius:8px;
                             padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;
                             display:flex;align-items:center;gap:5px;white-space:nowrap">
                ${icon('user-check', 13)} Bu bemor muassasada mavjud
              </button>` : ''}
            </div>`}
          </div>
          ${r._mavjud ? `
          <div class="mb-3 p-2.5 rounded-lg"
               style="background:${r._mavjud.aniq ? '#f0fdf4' : '#fffbeb'};
                      border:1px solid ${r._mavjud.aniq ? '#bbf7d0' : '#fde68a'}">
            <div class="text-[11px] ${r._mavjud.aniq ? 'text-green-800' : 'text-amber-800'}">
              Muassasangizda o'xshash karta bor:
              <b>${esc(PD.fio(r._mavjud.fio) || '—')}</b> ·
              <span class="font-mono">${esc(r._mavjud.kt_no || '—')}</span> ·
              ${esc(Utils.formatDateTime(r._mavjud.vaqt))}
            </div>
          </div>` : ''}

          <div class="border-t border-dashed border-gray-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-xs">
            <div class="sm:col-span-2 mb-1 p-2 rounded-lg bg-blue-50 border border-blue-100">
              <span class="text-gray-500">Qaysi muassasaga yuborilgan:</span>
              <span class="font-bold text-blue-900">${esc(r.otkazilgan_muassasa || '—')}</span>
            </div>
            <div><span class="text-gray-400">Yuborgan:</span>
                 <span class="font-semibold text-gray-700">${esc(r.muassasa || '—')}</span></div>
            <div><span class="text-gray-400">Yuborilgan vaqt:</span>
                 <span class="font-semibold text-gray-700">${esc(Utils.formatDateTime(r.qabul_vaqt))}</span></div>
            <div><span class="text-gray-400">Tashxisi:</span>
                 <span class="text-gray-700">${esc(tashxis)}</span></div>
            ${sabab ? `<div><span class="text-gray-400">Sababi:</span>
                 <span class="text-orange-700 font-semibold">${esc(sabab)}</span></div>` : ''}
          </div>
          <div class="mt-2 text-[11px] text-gray-400">
            Bu ma'lumot yuboruvchi muassasadan — faqat ko'rish uchun.
            Tekshiruv va ballar sizda qaytadan kiritiladi.
          </div>
        </div>
      </div>`;
  },

  // Muassasadagi o'xshash karta — solishtirish va qaror qabul qilish
  mavjudModal(i) {
    const r = QabulPage._rows[i];
    const m = r?._mavjud;
    if (!m) return;
    const qator = (nom, chap, ong) => `
      <tr>
        <td style="padding:6px 8px;color:#64748b;font-size:12px;white-space:nowrap">${nom}</td>
        <td style="padding:6px 8px;font-size:13px;font-weight:600">${chap}</td>
        <td style="padding:6px 8px;font-size:13px;font-weight:600">${ong}</td>
      </tr>`;
    showModal({
      title: `${icon('user-check', 18)} Bu o'sha bemormi?`,
      body: `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f1f5f9">
              <th></th>
              <th style="padding:6px 8px;font-size:11px;color:#475569;text-align:left">Yuborilgan</th>
              <th style="padding:6px 8px;font-size:11px;color:#475569;text-align:left">Muassasangizda</th>
            </tr>
          </thead>
          <tbody>
            ${qator('F.I.O', esc(PD.fio(r.fio) || '—'), esc(PD.fio(m.fio) || '—'))}
            ${qator("Tug'ilgan", esc(r.tugilgan_sana || r.tugilgan_yil || '—'), '—')}
            ${qator('K/T', `<span style="font-family:monospace">${esc(r.kt_no)}</span>`,
                            `<span style="font-family:monospace">${esc(m.kt_no || '—')}</span>`)}
            ${qator('Vaqti', esc(Utils.formatDateTime(r.qabul_vaqt)), esc(Utils.formatDateTime(m.vaqt)))}
          </tbody>
        </table>
        <p class="text-xs text-slate-500 mt-3">
          Ishonchingiz komil bo'lmasa — avval kartani oching va solishtiring.
          "Ha, shu bemor" bosilsa, yozuv ro'yxatdan olib tashlanadi.
        </p>`,
      footer: `
        <button class="btn btn-secondary" onclick="closeModal()">Bekor</button>
        <button class="btn btn-secondary" onclick="QabulPage.mavjudKarta(${i})">
          ${icon('external-link', 14)} Kartani ochish
        </button>
        <button class="btn btn-primary" onclick="QabulPage.mavjudTasdiq(${i})">
          ${icon('check', 14)} Ha, shu bemor
        </button>`
    });
    initIcons();
  },

  mavjudKarta(i) {
    const r = QabulPage._rows[i];
    if (!r?._mavjud?.kt_no) return;
    closeModal();
    Router.go('bemor-karta', { kt_no: r._mavjud.kt_no, type: r._mavjud.turi });
  },

  // Shifokor tasdiqladi — yozuv ro'yxatdan chiqadi
  async mavjudTasdiq(i) {
    const r = QabulPage._rows[i];
    if (!r) return;
    closeModal();
    try {
      await DB.qabulTasdiqla({
        manba_kt_no: r.kt_no,
        registr_turi: r._turi,
        qabul_muassasa: r.otkazilgan_muassasa,
        yangi_kt_no: r._mavjud?.kt_no || null,
        sabab: 'allaqachon_mavjud'
      });
      QabulPage._rows = QabulPage._rows.filter(x => x !== r);
      QabulPage._draw();
      showToast("✅ Ro'yxatdan olib tashlandi", 'success');
    } catch (e) {
      showToast('Xatolik: ' + (e.message || 'saqlanmadi') +
        "\nqabul_tasdiq.sql ishga tushirilganini tekshiring", 'error', 7000);
    }
  },

  // Kelish vaqtini so'raymiz, keyin formani to'ldirilgan holda ochamiz
  qabulQil(i) {
    const r = QabulPage._rows[i];
    if (!r) return;
    const endi = new Date(Date.now() + 5 * 3600000).toISOString();
    const yuborilgan = new Date(new Date(r.qabul_vaqt).getTime() + 5 * 3600000).toISOString();

    showModal({
      title: `${icon('log-in', 18)} Bemorni qabul qilish`,
      body: `
        <div class="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div class="font-bold text-slate-800">${esc(r.fio || '—')}</div>
          <div class="text-xs text-slate-500 mt-0.5">
            ${esc(r.muassasa || '—')} dan · ${esc(Utils.formatDateTime(r.qabul_vaqt))}
          </div>
        </div>
        <label class="form-label required">Bemor sizga qachon yetib keldi?</label>
        <div class="flex gap-2">
          <div class="flex-1">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Sana</div>
            <input id="qb-sana" type="date" class="form-input w-full"
                   min="${yuborilgan.slice(0, 10)}" max="${endi.slice(0, 10)}"
                   value="${endi.slice(0, 10)}"/>
          </div>
          <div class="flex-1">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Soat (HH:MM)</div>
            <input id="qb-soat" type="time" class="form-input w-full" value="${endi.slice(11, 16)}"/>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-2">
          Bu vaqt yangi kartaning "Qabul vaqti" si bo'ladi va marshrut hisobotida ishlatiladi.
        </p>`,
      footer: `
        <button class="btn btn-secondary" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="QabulPage._davomEt(${i})">Davom etish</button>`
    });
  },

  _davomEt(i) {
    const r = QabulPage._rows[i];
    if (!r) return;
    const sana = document.getElementById('qb-sana')?.value;
    const soat = document.getElementById('qb-soat')?.value;
    if (!sana || !soat) { showToast('Kelish sanasi va soatini kiriting', 'warning'); return; }

    const kelish = new Date(`${sana}T${soat}:00+05:00`);
    if (isNaN(kelish)) { showToast('Vaqt noto\'g\'ri', 'warning'); return; }
    if (kelish > new Date()) { showToast('Kelish vaqti kelajakda bo\'lishi mumkin emas', 'warning'); return; }
    if (kelish < new Date(r.qabul_vaqt)) {
      showToast('Kelish vaqti yuborilgan vaqtdan oldin bo\'lishi mumkin emas', 'warning');
      return;
    }

    closeModal();
    Router.go(r._turi === 'infarkt' ? 'infarkt-yangi' : 'insult-yangi', {
      qabul_kt:    r.kt_no,
      qabul_turi:  r._turi,
      kelish_vaqt: `${sana}T${soat}`
    });
  }
};
