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
        <div id="qb-filter" class="card mb-4" style="display:none">
          <div class="flex flex-wrap items-end gap-3">
            <div class="relative flex-1" style="min-width:240px">
              <label class="form-label !mb-1">Qidirish</label>
              <input id="qb-q" class="form-input pl-9 w-full" autocomplete="off"
                     placeholder="F.I.O yoki K/T raqami..."/>
              <span class="absolute left-3 text-gray-400" style="top:34px">${icon('search', 16)}</span>
            </div>
            <div style="min-width:200px">
              <label class="form-label !mb-1">Qabul qiluvchi viloyat</label>
              <select id="qb-viloyat" class="form-select w-full"></select>
            </div>
            <div style="min-width:240px">
              <label class="form-label !mb-1">Qabul qiluvchi muassasa</label>
              <select id="qb-muassasa" class="form-select w-full"></select>
            </div>
            <button id="qb-tozala" class="btn btn-secondary flex items-center gap-2">
              ${icon('x', 15)} Tozalash
            </button>
          </div>
          <div id="qb-filter-info" class="text-xs text-slate-500 mt-2"></div>
        </div>
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
      QabulPage._f = { q: '', viloyat: '', muassasa: '' };
      QabulPage._filtrniQur();
      QabulPage._draw();
    } catch (e) {
      QabulPage._xabar('error', 'Ma\'lumot yuklanmadi', e.message);
    }
  },

  // Manzil muassasasi qaysi viloyatda — APP_CONFIG dagi ro'yxatdan aniqlanadi
  _manzilViloyat(nom) {
    if (!QabulPage._vilMap) {
      const kalit = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]/gi, '');
      QabulPage._vilMap = new Map();
      Object.keys(APP_CONFIG.MUASSASALAR || {}).forEach(v => {
        (APP_CONFIG.MUASSASALAR[v] || []).forEach(m => QabulPage._vilMap.set(kalit(m), v));
      });
      QabulPage._vilKalit = kalit;
    }
    return QabulPage._vilMap.get(QabulPage._vilKalit(nom)) || '';
  },

  // Filtr paneli — faqat bir marta quriladi, keyin ro'yxatning o'zi yangilanadi
  _filtrniQur() {
    const panel = document.getElementById('qb-filter');
    if (!panel) return;
    // Bitta muassasaga biriktirilgan shifokorga filtr kerak emas
    const manzillar = [...new Set(QabulPage._rows.map(r => r.otkazilgan_muassasa).filter(Boolean))];
    if (manzillar.length < 2 && QabulPage._rows.length < 15) return;
    panel.style.display = '';

    const vilSel = document.getElementById('qb-viloyat');
    const viloyatlar = [...new Set(QabulPage._rows
      .map(r => QabulPage._manzilViloyat(r.otkazilgan_muassasa)).filter(Boolean))].sort();
    vilSel.innerHTML = `<option value="">— Barcha viloyatlar —</option>` +
      viloyatlar.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

    const yangila = () => {
      QabulPage._f = {
        q: document.getElementById('qb-q')?.value || '',
        viloyat: vilSel.value || '',
        muassasa: document.getElementById('qb-muassasa')?.value || ''
      };
      QabulPage._draw();
    };
    const muassasaniQur = () => {
      const sel = document.getElementById('qb-muassasa');
      const tanlangan = sel.value;
      const vil = vilSel.value;
      const son = {};
      QabulPage._rows.forEach(r => {
        const m = r.otkazilgan_muassasa;
        if (!m) return;
        if (vil && QabulPage._manzilViloyat(m) !== vil) return;
        son[m] = (son[m] || 0) + 1;
      });
      const nomlar = Object.keys(son).sort();
      sel.innerHTML = `<option value="">— Barcha muassasalar —</option>` +
        nomlar.map(m => `<option value="${esc(m)}">${esc(m)} (${son[m]})</option>`).join('');
      sel.value = nomlar.includes(tanlangan) ? tanlangan : '';
    };
    muassasaniQur();

    document.getElementById('qb-q').oninput = Utils.debounce(yangila, 250);
    vilSel.onchange = () => { muassasaniQur(); yangila(); };
    document.getElementById('qb-muassasa').onchange = yangila;
    document.getElementById('qb-tozala').onclick = () => {
      document.getElementById('qb-q').value = '';
      vilSel.value = '';
      muassasaniQur();
      yangila();
    };
    initIcons();
  },

  _filtrla(rows) {
    const f = QabulPage._f || {};
    const q = (f.q || '').toLowerCase().trim();
    return rows.filter(r => {
      if (f.viloyat && QabulPage._manzilViloyat(r.otkazilgan_muassasa) !== f.viloyat) return false;
      if (f.muassasa && r.otkazilgan_muassasa !== f.muassasa) return false;
      if (q) {
        const matn = `${r.fio || ''} ${r.kt_no || ''} ${r.muassasa || ''} ${r.otkazilgan_muassasa || ''}`;
        if (!matn.toLowerCase().includes(q)) return false;
      }
      return true;
    });
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
    // Kartochkalar indeksi qabulQil(i) uchun kerak — to'liq ro'yxat bo'yicha,
    // filtrdan qat'i nazar
    QabulPage._rows.forEach((r, i) => { r._i = i; });
    const jami = QabulPage._rows.length;
    const rows = QabulPage._filtrla(QabulPage._rows);

    const info = document.getElementById('qb-filter-info');
    if (info) info.innerHTML = rows.length === jami
      ? `Jami <b>${jami}</b> ta yozuv`
      : `<b>${rows.length}</b> ta ko'rsatilmoqda · jami ${jami} ta`;

    if (!jami) {
      QabulPage._xabar('info', 'Kutilayotgan bemor yo\'q',
        'Sizning muassasangizga yuborilgan, hali qabul qilinmagan bemor topilmadi.');
      return;
    }
    if (!rows.length) {
      QabulPage._xabar('info', 'Topilmadi',
        'Qidiruv yoki filtr shartiga mos bemor yo\'q. "Tozalash" ni bosing.');
      return;
    }
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
    // Necha kundan beri kutilmoqda. Ikki kundan oshsa — bemor kelmagan
    // bo'lishi mumkin, yozuvni yopish tugmasi chiqadi.
    const kutganKun = Math.floor((Date.now() - new Date(r.qabul_vaqt).getTime()) / 864e5);
    const kechikkan = kutganKun >= 2;
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
              <div class="text-base font-bold text-gray-900 truncate">${esc(r.fio || "—")}</div>
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
              ${kechikkan ? `
              <button onclick="QabulPage.kelmadiModal(${i})"
                      title="Bemor yetib kelmagan bo'lsa — yozuvni ro'yxatdan yopish"
                      style="border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;
                             border-radius:8px;padding:5px 9px;font-size:11px;font-weight:700;
                             cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap">
                ${icon('user-x', 13)} Bemor kelmadi
              </button>` : ''}
            </div>`}
          </div>
          ${kechikkan ? `
          <div class="mb-3 text-[11px] font-semibold ${kutganKun >= 5 ? 'text-red-600' : 'text-amber-600'}">
            ${icon('clock', 12)} ${kutganKun} kundan beri kutilmoqda
          </div>` : ''}
          ${r._mavjud ? `
          <div class="mb-3 p-2.5 rounded-lg"
               style="background:${r._mavjud.aniq ? '#f0fdf4' : '#fffbeb'};
                      border:1px solid ${r._mavjud.aniq ? '#bbf7d0' : '#fde68a'}">
            <div class="text-[11px] ${r._mavjud.aniq ? 'text-green-800' : 'text-amber-800'}">
              Muassasangizda o'xshash karta bor:
              <b>${esc(r._mavjud.fio || '—')}</b> ·
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
            ${qator('F.I.O', esc(r.fio || "—"), esc(m.fio || '—'))}
            ${qator("Tug'ilgan", esc(r.tugilgan_sana || r.tugilgan_yil || '—'), esc(m.tug || '—'))}
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

  // Bemor yetib kelmagan — yozuvni yopish
  kelmadiModal(i) {
    const r = QabulPage._rows[i];
    if (!r) return;
    const kun = Math.floor((Date.now() - new Date(r.qabul_vaqt).getTime()) / 864e5);
    showModal({
      title: `${icon('user-x', 18)} Bemor kelmadi`,
      body: `
        <div class="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div class="font-bold text-slate-800">${esc(r.fio || '—')}</div>
          <div class="text-xs text-slate-500 mt-0.5">
            ${esc(r.muassasa || '—')} dan · ${esc(Utils.formatDateTime(r.qabul_vaqt))}
            · <b>${kun} kundan beri</b>
          </div>
        </div>
        <label class="form-label">Nima uchun kelmadi?</label>
        <select id="qb-kelmadi-sabab" class="form-select w-full">
          <option value="boshqa_joyga">Boshqa muassasaga ketgan</option>
          <option value="rad_etdi">Bemor yoki qarindoshlari rad etgan</option>
          <option value="nomalum">Sababi noma'lum</option>
        </select>
        <p class="text-xs text-slate-500 mt-3">
          Yozuv ro'yxatdan olib tashlanadi. Bemor ma'lumotlari va yuboruvchi
          muassasadagi kartasi o'z holicha qoladi — faqat shu eslatma yopiladi.
        </p>`,
      footer: `
        <button class="btn btn-secondary" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="QabulPage.kelmadiTasdiq(${i})">
          ${icon('check', 14)} Tasdiqlash
        </button>`
    });
    initIcons();
  },

  async kelmadiTasdiq(i) {
    const r = QabulPage._rows[i];
    if (!r) return;
    const sabab = document.getElementById('qb-kelmadi-sabab')?.value || 'nomalum';
    closeModal();
    try {
      await DB.qabulTasdiqla({
        manba_kt_no: r.kt_no,
        registr_turi: r._turi,
        qabul_muassasa: r.otkazilgan_muassasa,
        sabab: 'kelmadi:' + sabab
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
