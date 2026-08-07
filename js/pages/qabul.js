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
    const muassasa = profile?.muassasa || '';

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

    if (!muassasa) {
      QabulPage._xabar('info', 'Profilingizda muassasa ko\'rsatilmagan',
        'Bu ro\'yxat foydalanuvchining muassasasi bo\'yicha shakllanadi. Sozlamalarda muassasangizni belgilang.');
      return;
    }
    try {
      QabulPage._rows = await DB.kutilayotganBemorlar(muassasa);
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

    el.innerHTML = `
      <div class="card mb-4 !py-3 flex items-center gap-3 bg-blue-50 border-blue-200">
        ${icon('info', 18)}
        <span class="text-sm text-blue-900">
          <b>${rows.length} ta bemor</b> muassasangizga yuborilgan.
          "Qabul qilish" bosilganda kelish vaqti so'raladi va forma bemorning
          shaxsiy ma'lumotlari bilan to'ldirilgan holda ochiladi.
        </span>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        ${rows.map((r, i) => QabulPage._card(r, i)).join('')}
      </div>`;
    initIcons();
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
            <button class="btn btn-primary !py-2 !px-3 flex items-center gap-1 shrink-0"
                    onclick="QabulPage.qabulQil(${i})">
              ${icon('log-in', 14)} Qabul qilish
            </button>
          </div>

          <div class="border-t border-dashed border-gray-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-xs">
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
