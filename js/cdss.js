/* =====================================================================
   cdss.js  —  Klinik Qarorlarni Qo'llab-quvvatlash moduli (CDSS)
   RSHTYOIM insult / infarkt reestri uchun.  Versiya: 1.0.0
   Bog'liqlik yo'q (vanilla JS).  index.html ga:
       <script src="js/cdss.js?v=1"></script>
   Ikki global obyekt beradi:  CDSS (mantiq)  va  CDSSUI (chizish)
   ---------------------------------------------------------------------
   MUHIM: tavsiyalar MASLAHAT xarakterida. Qarorni shifokor qabul qiladi.
   Har bir tavsiya va shifokorning javobi bazaga yoziladi (audit).
   ===================================================================== */
(function (global) {
  'use strict';

  var VERSIYA = '1.6.0';

  /* ---------- 1. Og'irlik darajalari ---------- */
  var B = {
    yengil: { key: 'yengil', emoji: '🟢', matn: 'Yengil',  rang: '#15803d', rank: 1 },
    orta:   { key: 'orta',   emoji: '🟡', matn: "O'rtacha", rang: '#a16207', rank: 2 },
    ogir:   { key: 'ogir',   emoji: '🟠', matn: "Og'ir",   rang: '#c2410c', rank: 3 },
    kritik: { key: 'kritik', emoji: '🔴', matn: 'Kritik',  rang: '#b91c1c', rank: 4 }
  };
  function eng(a, b) { if (!a) return b; if (!b) return a; return a.rank >= b.rank ? a : b; }

  /* ---------- 2. Yordamchilar ---------- */
  function n(v) {
    if (v === null || v === undefined || v === '') return null;
    var x = parseFloat(String(v).replace(',', '.'));
    return isNaN(x) ? null : x;
  }
  function bor(v) { return v !== null && v !== undefined && v !== ''; }
  /** Boshlanish vaqtidan hozirgacha (yoki qabul vaqtigacha) daqiqa */
  function daqiqa(boshlanish, qabul) {
    if (!boshlanish) return null;
    var t1 = new Date(boshlanish).getTime();
    if (isNaN(t1)) return null;
    var t2 = qabul ? new Date(qabul).getTime() : Date.now();
    if (isNaN(t2)) t2 = Date.now();
    var d = Math.round((t2 - t1) / 60000);
    return d < 0 ? null : d;
  }
  function soat(d) { return d === null ? null : Math.round(d / 6) / 10; }
  function boshi(s, p) {
    return String(s || '').trim().toLowerCase().indexOf(String(p).toLowerCase()) === 0;
  }

  /* ---------- 3. Trombolizga qarshi ko'rsatmalar ro'yxati (UI shu ro'yxatdan galochka chizadi) ---------- */
  var TLT_KONTR = [
    { key: 'ich_qon',      matn: 'MSKT da intrakranial qon quyilish' },
    { key: 'anamnez_ich',  matn: 'Anamnezda intrakranial qon quyilish' },
    { key: 'insult_3oy',   matn: "So'nggi 3 oyda insult yoki bosh miya jarohati" },
    { key: 'operatsiya_14',matn: "So'nggi 14 kunda katta operatsiya / jarohat" },
    { key: 'oshqozon_21',  matn: "So'nggi 21 kunda oshqozon-ichak qon ketishi" },
    { key: 'punksiya_7',   matn: "So'nggi 7 kunda arterial punksiya (siqilmaydigan joy)" },
    { key: 'trombotsit',   matn: 'Trombotsit < 100 000/mm³' },
    { key: 'inr',          matn: 'INR > 1,7 yoki geparin/DOAK (<48 soat)' },
    { key: 'aortadiss',    matn: 'Aorta dissekatsiyasi shubhasi' },
    { key: 'endokardit',   matn: 'Infeksion endokardit' },
    { key: 'neoplazma',    matn: 'Intrakranial neoplazma / AVM / anevrizma' }
  ];


  /* ---------- 3b. Insult taqlidchilari (mimics) ----------
     Reperfuziyani boshlashdan oldin istisno qilinishi shart.        */
  function taqlidchi(d, r) {
    var gl = n(d.glukoza);
    if (gl === null) {
      r.ogohlantirish.push('Glukoza o\'lchanmagan — tromboliz oldidan MAJBURIY (gipoglikemiya insultni taqlid qiladi).');
      r.kodlar.push('GLUKOZA_KERAK');
    } else if (gl < 3.9) {
      r.ogohlantirish.push('Glukoza ' + gl + ' mmol/l — gipoglikemiya. Avval korreksiya qilib, neyrologik holatni qayta baholang.');
      r.kodlar.push('TAQLIDCHI_EHTIMOLI');
    }
    if (d.tutqanoq) { r.ogohlantirish.push('Tutqanoq xuruji qayd etilgan — postiktal holat (Todd falaji) istisno qilinishi kerak.'); r.kodlar.push('TAQLIDCHI_EHTIMOLI'); }
    if (d.sepsis || n(d.harorat) >= 38.5) r.ogohlantirish.push('Isitma/infeksiya — metabolik entsefalopatiya istisno qilinsin.');
  }

  /* ---------- 3c. Asosiy parvarish (barcha muassasalarda bajarilishi mumkin) ----------
     Respublikada reperfuziya 1% — o'limni kamaytiradigan asosiy zaxira shu ro'yxatda. */
  function parvarishInsult(d, r, ishemik, gemorragik, tlt) {
    var P = r.parvarish;
    P.push('Disfagiya skriningi — og\'iz orqali ovqat/dori berishdan OLDIN (aspiratsion pnevmoniya profilaktikasi)');
    P.push('Boshni 30° ko\'tarish; SpO₂ ≥94% saqlash (kislorod faqat gipoksiyada)');
    P.push('Glukozani 7,8–10 mmol/l oralig\'ida saqlash');
    P.push('Haroratni <37,5 °C saqlash, isitma sababini aniqlash');
    P.push('Yotoq yaralari profilaktikasi va erta mobilizatsiya (holat barqarorlashgach 24–48 soat ichida)');
    if (ishemik) {
      P.push(tlt ? 'Aspirin — trombolizdan 24 soat keyin (nazorat MSKT dan so\'ng)'
                 : 'Aspirin 160–300 mg — 24–48 soat ichida');
      P.push('Yuqori dozali statin');
      P.push('Chuqur vena trombozi profilaktikasi (pnevmatik kompressiya; past molekulyar geparin 24 soatdan keyin)');
      P.push('EKG / Holter — atrial fibrillyatsiyani izlash (ikkilamchi profilaktika taktikasini belgilaydi)');
    }
    if (gemorragik) {
      P.push('Antikoagulyant profilaktikasi 48 soatdan oldin BOSHLANMAYDI (pnevmatik kompressiya)');
      P.push('Nazorat MSKT — 6 va 24 soatdan keyin (gematoma o\'sishi)');
    }
    P.push('Ikkilamchi profilaktika va reabilitatsiya rejasi chiqarish varaqasida ko\'rsatiladi');
  }

  function parvarishInfarkt(d, r) {
    var P = r.parvarish;
    P.push('Uzluksiz EKG monitoring va defibrillyator yonida turishi');
    P.push('SpO₂ ≥90% saqlash (kislorod faqat gipoksiyada)');
    P.push('Og\'riqni bartaraf etish; nitrat (SBP >90 va o\'ng qorincha infarkti bo\'lmasa)');
    P.push('Ekstremal glikemiyani korreksiya qilish');
    P.push('Chiqishdan oldin: EXOKG (chap qorincha funksiyasi), lipid profili, reabilitatsiya rejasi');
  }

  /* ---------- 3d. Vaqt me'yorlari (eshikdan) ---------- */
  function muddatlar(d, r, nozologiya) {
    var meyor = nozologiya === 'insult'
      ? [ { nom: 'Eshik → MSKT', maqsad: 20 },
          { nom: 'Eshik → tromboliz (igna)', maqsad: 60, kod: 'TLT_MOS' },
          { nom: 'Eshik → punksiya (trombektomiya)', maqsad: 90, kod: 'TROMBEKTOMIYA_MOS' } ]
      : [ { nom: 'Eshik → EKG', maqsad: 10 },
          { nom: 'Eshik → tromboliz (igna)', maqsad: 30, kod: 'TLT_MOS' },
          { nom: 'Eshik → ballon (PCI)', maqsad: 90, kod: 'PCI_MOS' } ];
    var otgan = d.qabul_vaqt ? daqiqa(d.qabul_vaqt, null) : null;
    if (otgan !== null && otgan > 1440) otgan = null;   // retrospektiv kiritish — sanoq ko'rsatilmaydi
    meyor.forEach(function (m) {
      if (m.kod && r.kodlar.indexOf(m.kod) === -1) return;
      var qatn = { nom: m.nom, maqsad: m.maqsad, qolgan: otgan === null ? null : m.maqsad - otgan };
      qatn.holat = qatn.qolgan === null ? 'nomalum' : qatn.qolgan >= 0 ? 'ulguriladi' : 'kechikdi';
      r.muddat.push(qatn);
    });
  }

  /* ---------- 3e. Trombolitik dozasi ---------- */
  function dozaHisobla(d) {
    var v = n(d.vazn);
    if (v === null || v < 20 || v > 250) return null;
    var alt = Math.min(0.9 * v, 90), bolus = Math.round(alt * 0.1 * 10) / 10;
    var tnk = Math.min(0.25 * v, 25);
    return {
      vazn: v,
      alteplaza: { jami: Math.round(alt * 10) / 10, bolus: bolus,
                   infuziya: Math.round((alt - bolus) * 10) / 10, izoh: '0,9 mg/kg; 10% bolus 1 daqiqada, qolgani 60 daqiqa infuziya; maks 90 mg' },
      tenekteplaza: { jami: Math.round(tnk * 10) / 10, izoh: '0,25 mg/kg bir martalik bolus 5–10 sekundda; maks 25 mg' }
    };
  }


  /* ---------- 3f. Xavf omillari -> ikkilamchi profilaktika ----------
     Xavf omillari o'tkir davolash taktikasini o'zgartirmaydi, lekin
     ikkilamchi profilaktikani va chiqarish varaqasini belgilaydi.       */
  var XAVF_OMIL = [
    { key: 'af',          matn: 'Atrial fibrillyatsiya' },
    { key: 'gipertoniya', matn: 'Arterial gipertenziya' },
    { key: 'diabet',      matn: 'Qandli diabet' },
    { key: 'dislipidemiya', matn: 'Dislipidemiya' },
    { key: 'chekish',     matn: 'Chekish' },
    { key: 'oldingi_insult', matn: 'Anamnezda insult / TIA' },
    { key: 'karotid',     matn: 'Karotid stenoz' },
    { key: 'yurak_ish',   matn: 'YuIK / o\'tkazilgan infarkt' },
    { key: 'semizlik',    matn: 'Semizlik' },
    { key: 'buyrak',      matn: 'Surunkali buyrak kasalligi' },
    { key: 'alkogol',     matn: 'Alkogol iste\'moli' },
    { key: 'oila_anamnez', matn: 'Oilaviy anamnez' }
  ];

  function profilaktika(d, r, ishemik, gemorragik) {
    var x = d.xavf_omillari;
    // massiv ham, obyekt ham qabul qilinadi
    var bor_ = function (k) {
      if (!x) return false;
      return Array.isArray(x) ? x.indexOf(k) > -1 : !!x[k];
    };
    if (!x) return;   // xavf omillari belgilanmagan — profilaktika bo'limi chiqmaydi
    var P = r.profilaktika;
    if (bor_('af')) {
      P.push(ishemik
        ? 'Atrial fibrillyatsiya — antikoagulyant (DOAK). Boshlash vaqti infarkt hajmiga qarab: kichik o\'choqda 3–5 kun, kattada 10–14 kun'
        : 'Atrial fibrillyatsiya — gemorragiyadan keyin antikoagulyantni qayta boshlash masalasi konsilium orqali hal qilinadi');
      P.push('CHA₂DS₂-VASc va HAS-BLED hisoblanishi va tarixda qayd etilishi');
    }
    if (bor_('gipertoniya') || n(d.sbp) >= 140)
      P.push('Arterial bosim maqsadi <130/80 mm sim. ust. (o\'tkir davrdan keyin, bosqichma-bosqich)');
    if (bor_('diabet')) P.push('HbA₁c <7% maqsadi; endokrinolog konsultatsiyasi');
    if (bor_('dislipidemiya') || ishemik) P.push('Yuqori dozali statin; LDL maqsadi <1,8 mmol/l');
    if (bor_('chekish')) P.push('Chekishni to\'xtatish bo\'yicha maslahat va yordam (nikotin o\'rnini bosuvchi terapiya)');
    if (bor_('karotid')) P.push('Karotid stenoz — endarterektomiya yoki stentlash masalasini 2 hafta ichida baholash');
    if (bor_('oldingi_insult')) P.push('Takroriy insult — profilaktika sxemasini qayta ko\'rib chiqish (ilgari qabul qilgan dorilarga sodiqligini tekshirish)');
    if (bor_('yurak_ish')) P.push('Kardiolog konsultatsiyasi; EXOKG');
    if (bor_('buyrak')) P.push('Buyrak funksiyasiga qarab doza korreksiyasi (kreatinin klirensi)');
    if (bor_('semizlik') || bor_('alkogol')) P.push('Turmush tarzini o\'zgartirish bo\'yicha maslahat');
    if (P.length) P.push('Barcha punktlar chiqarish varaqasida (epikriz) yozilishi va poliklinikaga uzatilishi shart');
  }


  /* ---------- 3g. GCS x NIHSS kombinatsiyasi ----------
     Ikki shkala har xil narsani o'lchaydi: GCS — ong va nafas yo'llari,
     NIHSS — o'choqli defitsit. Ularning MOS KELMASLIGI klinik ma'lumot beradi. */
  function gcsNihss(gcs, nihss, r, ishemik, gemorragik) {
    var faqatIntub = ishemik && gcs !== null && gcs <= 8 && nihss !== null && nihss >= 20;
    if (gcs === null || nihss === null) return;

    // 1) Ichki ziddiyat: koma NIHSS ning ong punktlari orqali avtomatik ball beradi
    //    (1a=3, 1b=2, 1c=2) — ya'ni GCS ≤8 da NIHSS <7 bo'lishi mumkin emas.
    var kutilgan = gcs <= 8 ? 7 : gcs <= 12 ? 4 : gcs <= 14 ? 1 : 0;
    if (nihss < kutilgan) {
      r.kodlar.push('MALUMOT_ZIDDIYATI');
      r.ogohlantirish.push('GCS ' + gcs + ' va NIHSS ' + nihss + ' o\'zaro mos emas: ong buzilganda NIHSS ning 1a–1c punktlari o\'zi kamida '
        + kutilgan + ' ball beradi. Ballardan biri xato qo\'yilgan — qayta baholang.');
      return;   // ziddiyatli ma'lumot ustiga klinik izoh qurilmaydi
    }

    // 2) Diskordans: ong chuqur buzilgan, ammo o'choqli defitsit kam
    if (gcs <= 12 && nihss < 15) {
      r.kodlar.push('DISKORDANS');
      r.xulosa.push('Ong buzilishi o\'choqli defitsitga nomutanosib darajada chuqur.');
      r.ogohlantirish.push('Bu yarim shar insultiga xos emas. Istisno qiling: bazilyar okklyuziya, ikki tomonlama talamus infarkti, nokonvulsiv epileptik status, metabolik/toksik sabab, gidrotsefaliya.');
      if (ishemik && !faqatIntub) r.tavsiya.push({ matn: 'KT angiografiya (orqa havza bilan) va zarurat bo\'lsa EEG — diskordans sababini aniqlash', muhim: true });
    }

    // 3) Ong saqlangan, defitsit og'ir — dominant yarim shar
    if (gcs >= 14 && nihss >= 16) {
      r.xulosa.push('Ong saqlangan holda og\'ir o\'choqli defitsit — yirik yarim shar infarkti, dominant yarim shar ehtimoli yuqori.');
      r.tavsiya.push({ matn: 'Ong dinamikasini har 2–4 soatda baholash; pasayish bo\'lsa zudlik bilan takroriy MSKT (malign shish)', muhim: false });
    }

    // 4) Ikkalasi ham og'ir
    if (gcs <= 8 && nihss >= 20) {
      r.xulosa.push('Ham ong, ham o\'choqli defitsit kritik darajada — yirik infarkt, dislokatsiya yoki bazilyar okklyuziya.');
    }
  }

  /* ================= 4. INSULT ================= */
  /**
   * @param {Object} d
   *   insult_turi   : "Ishemik insult" | "Gemorragik insult" | "TIA"
   *   gcs, nihss, aspects             : son
   *   boshlanish_vaqt, qabul_vaqt     : ISO sana yoki null
   *   boshlanish_daqiqa               : (ixtiyoriy) to'g'ridan-to'g'ri daqiqa
   *   mskt          : "Ha – o'tkazildi" | "Yo'q – ..."
   *   kta           : bool  (KT/MR angiografiya bajarilganmi)
   *   lvo           : bool  (angiografiyada yirik tomir okklyuziyasi tasdiqlangan)
   *   sbp, dbp, glukoza, yosh
   *   kontr         : {key: true} — TLT_KONTR kalitlari
   *   uygonish      : bool  (uyqudan uyg'onib qolgan — vaqt noaniq)
   */
  function insult(d) {
    d = d || {};
    var r = yangiNatija('insult');
    var turi = String(d.insult_turi || '');
    var gcs = n(d.gcs), nihss = n(d.nihss), aspects = n(d.aspects);
    var dq = bor(d.boshlanish_daqiqa) ? n(d.boshlanish_daqiqa)
                                      : daqiqa(d.boshlanish_vaqt, d.qabul_vaqt);
    var sh = soat(dq);
    var mskt = boshi(d.mskt, 'ha');
    var ishemik = boshi(turi, 'ishemik') || boshi(turi, 'noma');
    var gemorragik = boshi(turi, 'gemorragik') || boshi(turi, 'subaraxnoidal');
    var tia = boshi(turi, 'tia');

    /* --- ballar bloki --- */
    var gcsB = null;
    if (gcs !== null) {
      gcsB = gcs >= 15 ? B.yengil : gcs >= 13 ? B.orta : gcs >= 9 ? B.ogir : B.kritik;
      r.ballar.push({ nom: 'GCS', qiymat: gcs + ' ball', izoh:
        gcs >= 15 ? 'Ong saqlangan' : gcs >= 13 ? "Yengil ong buzilishi"
        : gcs >= 9 ? "O'rtacha ong buzilishi" : 'Chuqur ong buzilishi', band: gcsB });
    }
    if (nihss === null && (gcs === null || gcs > 8))
      r.ogohlantirish.push('NIHSS qo\'yilmagan — reperfuziyaga nomzodlikni aniqlash mumkin emas.');
    if (nihss !== null && chuqurOngOldindan(d))
      r.ogohlantirish.push('Bemor intubatsiya/sedatsiyada bo\'lsa NIHSS ishonchli emas — sedatsiyagacha bo\'lgan ball qayd etilsin.');
    var nihB = null;
    if (nihss !== null) {
      nihB = nihss <= 4 ? B.yengil : nihss <= 15 ? B.orta : nihss <= 20 ? B.ogir : B.kritik;
      r.ballar.push({ nom: 'NIHSS', qiymat: nihss + ' ball', izoh:
        nihss <= 4 ? 'Yengil neyrologik defitsit' : nihss <= 15 ? "O'rtacha og'irlik"
        : nihss <= 20 ? "Og'ir insult" : "Juda og'ir insult", band: nihB });
    }
    if (aspects !== null) {
      r.ballar.push({ nom: 'ASPECTS', qiymat: aspects + ' ball', izoh:
        aspects >= 8 ? 'Ishemik o\'zak kichik' : aspects >= 6 ? 'Trombektomiya uchun maqbul'
        : 'Katta ishemik o\'zak — trombektomiya samarasi past',
        band: aspects >= 6 ? B.yengil : B.ogir });
    }
    if (dq !== null) {
      r.ballar.push({ nom: 'Boshlanish vaqti', qiymat: sh + ' soat', izoh:
        dq <= 270 ? 'Tromboliz oynasi ichida' : dq <= 360 ? 'Trombektomiya oynasi ichida'
        : dq <= 1440 ? 'Kech oyna (6–24 s) — perfuziya bo\'yicha tanlash'
        : 'Reperfuziya oynasidan tashqarida',
        band: dq <= 270 ? B.yengil : dq <= 1440 ? B.orta : B.ogir });
    } else if (d.uygonish) {
      r.kodlar.push('MR_TANLASH');
      r.ogohlantirish.push('Uyg\'onish insulti — boshlanish vaqti noma\'lum. Oxirgi sog\'lom ko\'rilgan vaqtdan hisoblanmaydi: tanlash MR (DWI/FLAIR nomuvofiqligi) yoki perfuziya bo\'yicha amalga oshiriladi.');
      r.tavsiya.push({ matn: 'MR (DWI/FLAIR) yoki KT-perfuziya — uyg\'onish insultida reperfuziyaga nomzodlikni aniqlash uchun', muhim: true });
    } else {
      r.ogohlantirish.push('Insult boshlangan vaqt kiritilmagan — reperfuziyani baholash mumkin emas. Bu maydonsiz tizim tromboliz va trombektomiya bo\'yicha xulosa chiqara olmaydi.');
      r.kodlar.push('VAQT_KERAK');
    }
    r.ballar.push({ nom: 'MSKT', qiymat: mskt ? '✔ Bajarilgan' : '✖ Bajarilmagan', izoh: '',
                    band: mskt ? B.yengil : B.ogir });

    /* --- og'irlik --- */
    r.daraja = eng(eng(gcsB, nihB), gemorragik ? B.orta : null) || B.orta;

    /* --- xulosa --- */
    var nom = tia ? 'TIA' : gemorragik ? 'Gemorragik insult'
              : ishemik ? 'Ishemik insult' : 'Insult';
    r.xulosa.push(r.daraja.matn.toLowerCase() === 'kritik'
      ? 'Kritik holat. ' + nom + '.'
      : r.daraja.matn + ' ' + nom.toLowerCase() + '.');

    gcsNihss(gcs, nihss, r, ishemik, gemorragik);

    /* --- Ong chuqur buzilgan: nafas yo'llari -> KEYIN vizualizatsiya --- */
    var chuqurOng = gcs !== null && gcs <= 8;
    // Ishemik insultda GCS ≤8 va NIHSS ≥20 bo'lsa — birinchi va yagona
    // shoshilinch ko'rsatma intubatsiya; angiografiya bu blokda ko'rsatilmaydi.
    var faqatIntubatsiya = ishemik && chuqurOng && nihss !== null && nihss >= 20;
    if (chuqurOng) {
      r.kodlar.push('INTUBATSIYA');
      r.tavsiya.push({ matn: 'Endotraxeal intubatsiya — GCS ≤8, nafas yo\'llari himoyalanmagan', muhim: true });
      if ((ishemik || !turi) && !faqatIntubatsiya) {
        r.kodlar.push('BAZILYAR_SHUBHA');
        r.xulosa.push('Chuqur ong buzilishi ishemik insultda bazilyar arteriya okklyuziyasidan shubhalanishga asos beradi.');
        r.tavsiya.push({ matn: 'KT angiografiya MAJBURIY — orqa havza (bazilyar arteriya) ni albatta qamrab olsin. Bazilyar okklyuziyada trombektomiya 24 soatgacha samarali', muhim: true });
      }
    }

    /* --- LVO ehtimoli --- */
    var lvoEhtimol = ishemik && ((nihss !== null && nihss >= 6) || chuqurOng);
    if (d.lvo) { r.kodlar.push('LVO_TASDIQ'); r.xulosa.push('Yirik tomir okklyuziyasi tasdiqlangan.'); }
    else if (lvoEhtimol) {
      r.kodlar.push('LVO_EHTIMOLI');
      r.xulosa.push('NIHSS ≥6 — yirik tomir okklyuziyasi ehtimoli yuqori.');
    }

    /* --- MSKT: birinchi majburiy qadam --- */
    if (!mskt) {
      r.tavsiya.push({ matn: 'Zudlik bilan boshsuyagi MSKT (eshikdan 20 daqiqa ichida)', muhim: true });
      r.kodlar.push('MSKT_KERAK');
      r.xulosa.push('Neyrovizualizatsiyasiz insult turini ajratish va davolashni boshlash mumkin emas.');
    }

    /* --- Ishemik insult --- */
    if (ishemik) {
      var t = tltBaho(d, dq, nihss, mskt);
      r.tlt = t;
      if (t.ogohlantirish) r.ogohlantirish.push(t.ogohlantirish);
      if (t.mos) {
        r.kodlar.push('TLT_MOS');
        r.tavsiya.push({ matn: 'IV tromboliz (alteplaza/tenekteplaza) — eshikdan 60 daqiqa ichida', muhim: true });
        r.sabab.tlt = t.sabab;
      } else if (t.sabab.length) {
        r.kodlar.push('TLT_MOS_EMAS');
        r.tosiq.tlt = t.tosiq;
      }

      var tr = trombektomiyaBaho(d, dq, nihss, aspects, mskt);
      r.trombektomiya = tr;
      if (tr.mos) {
        r.kodlar.push('TROMBEKTOMIYA_MOS');
        if (tr.kech && !d.perfuziya_mos) {
          r.kodlar.push('PERFUZIYA_KERAK');
          r.tavsiya.push({ matn: tr.kech_turi === 'dawn'
            ? 'KT-perfuziya yoki MR-DWI — 16–24 soatlik oynada trombektomiya faqat klinik holat va ishemik o\'zak hajmi nomuvofiqligi (DAWN) tasdiqlansa'
            : 'KT-perfuziya yoki MR — 6–16 soatlik oynada trombektomiya faqat perfuziya nomuvofiqligi (DEFUSE-3) tasdiqlansa', muhim: true });
        }
        r.tavsiya.push({ matn: tr.katta_ozak
          ? 'Mexanik trombektomiyani baholang — katta ishemik o\'zak (ASPECTS 3–5), foyda kamroq va qon quyilish xavfi yuqori; qaror faqat kompleks insult markazida'
          : 'Mexanik trombektomiyani baholang (endovaskulyar jamoa)', muhim: true });
        r.sabab.trombektomiya = tr.sabab;
      } else if (tr.tosiq.length) {
        r.tosiq.trombektomiya = tr.tosiq;
      }

      if (nihss !== null && nihss < 6 && !d.kta && !d.lvo) {
        r.ogohlantirish.push('NIHSS < 6 yirik tomir okklyuziyasini ISTISNO QILMAYDI: o\'ng yarim shar va orqa havza insultlari shkalada past ball oladi. Klinik shubha bo\'lsa KT angiografiya qiling.');
      }
      if ((lvoEhtimol || d.lvo) && !d.kta && !faqatIntubatsiya) {
        r.tavsiya.push({ matn: 'KT/MR angiografiya (yirik tomir okklyuziyasini aniqlash)', muhim: true });
        r.kodlar.push('KTA_KERAK');
      }
      if (chuqurOng && !d.kta && !faqatIntubatsiya) r.kodlar.push('KTA_SHOSHILINCH');
      if (aspects === null && (lvoEhtimol || d.lvo)) {
        r.ogohlantirish.push('ASPECTS balli kiritilmagan — trombektomiyaga nomzodlikni aniqlash mumkin emas.');
      }
      if (!t.mos && !tr.mos && mskt) {
        r.tavsiya.push({ matn: 'Konservativ davolash: antitrombotik terapiya, ikkilamchi profilaktika', muhim: false });
        r.kodlar.push('KONSERVATIV');
      }
    }

    /* --- Gemorragik --- */
    if (gemorragik) {
      r.kodlar.push('GEMORRAGIK');
      r.tavsiya.push({ matn: 'Antikoagulyantni bekor qilish va effektni qaytarish', muhim: true });
      r.tavsiya.push({ matn: 'Arterial bosimni nazorat qilish (SBP 130–140 mm sim. ust.)', muhim: true });
      r.tavsiya.push({ matn: 'Neyroxirurg konsultatsiyasi', muhim: true });
      if (boshi(turi, 'subaraxnoidal'))
        r.tavsiya.push({ matn: 'KT angiografiya — anevrizma izlash; nimodipin; anevrizmani 24–72 soatda yopish', muhim: true });
      r.tavsiya.push({ matn: 'Gematoma hajmi va qorincha ichiga yorib o\'tishini baholash (gidrotsefaliyada tashqi drenaj)', muhim: false });
      r.tavsiya.push({ matn: 'Klinik tutqanoqda antikonvulsant (profilaktik berilmaydi)', muhim: false });
      r.tosiq.tlt = ['Gemorragik insultda tromboliz mutlaqo taqiqlanadi'];
    }

    /* --- TIA --- */
    if (tia) {
      r.kodlar.push('TIA');
      r.tavsiya.push({ matn: 'Ikki xil antiagregant (21 kun) + statin', muhim: true });
      r.tavsiya.push({ matn: 'Bo\'yin tomirlari duplex/KTA — karotid stenozini baholash', muhim: true });
      r.tavsiya.push({ matn: 'EKG / Holter — atrial fibrillyatsiya izlash', muhim: false });
      r.tavsiya.push({ matn: 'Kamida 24 soat statsionar kuzatuv', muhim: false });
    }

    /* --- Kuzatuv darajasi --- */
    var icu = (gcs !== null && gcs <= 8) || (nihss !== null && nihss >= 16)
              || gemorragik || r.kodlar.indexOf('TLT_MOS') > -1
              || r.kodlar.indexOf('TROMBEKTOMIYA_MOS') > -1;
    r.tavsiya.push({ matn: icu ? 'Reanimatsiya / insult blokida kuzatuv (ICU)'
                                : 'Insult blokida kuzatuv', muhim: icu });
    if (icu) r.kodlar.push('ICU');

    /* --- Taqlidchilar, fiziologiya, parvarish, muddatlar --- */
    if (ishemik || !turi) taqlidchi(d, r);
    fiziologiya(d, r, ishemik);
    parvarishInsult(d, r, ishemik, gemorragik, r.kodlar.indexOf('TLT_MOS') > -1);
    profilaktika(d, r, ishemik, gemorragik);
    marshrut(d, r);
    muddatlar(d, r, 'insult');
    if (r.kodlar.indexOf('TLT_MOS') > -1) {
      r.doza = dozaHisobla(d);
      if (!r.doza) r.ogohlantirish.push('Bemor vazni kiritilmagan — trombolitik dozasini hisoblash mumkin emas.');
    }
    /* --- Malign shish xavfi --- */
    if (ishemik && nihss !== null && nihss >= 16 && (n(d.yosh) === null || n(d.yosh) <= 60)) {
      r.ogohlantirish.push('Malign miya shishi xavfi yuqori (NIHSS ≥16). 24–48 soatda holat yomonlashsa dekompressiv kraniektomiya masalasini neyroxirurg bilan muhokama qiling.');
      r.kodlar.push('MALIGN_SHISH_XAVFI');
    }
    return r;
  }

  function chuqurOngOldindan(d) { return !!d.sedatsiya || !!d.intubatsiya; }

  function tltBaho(d, dq, nihss, mskt) {
    var o = { mos: false, sabab: [], tosiq: [], ogohlantirish: null };
    if (!mskt) { o.tosiq.push('MSKT bajarilmagan'); return o; }
    if (dq === null) { o.tosiq.push('Boshlanish vaqti noma\'lum'); return o; }
    if (dq > 270) { o.tosiq.push('4,5 soatlik oyna o\'tgan (' + soat(dq) + ' soat)'); }
    else o.sabab.push('Boshlanishdan ' + soat(dq) + ' soat (< 4,5 soat)');
    if (nihss !== null && nihss !== undefined) {
      // NIHSS <4 — mutlaq to'siq EMAS. Qaror ball emas, defitsitning
      // nogironlantiruvchiligiga qarab qabul qilinadi (izolyatsiyalangan afaziya,
      // gemianopsiya, kasb uchun hal qiluvchi qo'l zaifligi va h.k.).
      if (nihss < 4) {
        if (d.nogironlantiruvchi) o.sabab.push('NIHSS ' + nihss + ', ammo defitsit nogironlantiruvchi deb baholandi');
        else o.tosiq.push('NIHSS ' + nihss + ' — defitsit nogironlantiruvchi deb belgilanmagan (shifokor baholashi kerak)');
      } else o.sabab.push('NIHSS ' + nihss);
      // NIHSS >25 — faqat 3–4,5 soatlik oynada istisno (ECASS III mezoni).
      // 0–3 soat ichida og'irlik o'zi to'siq emas.
      if (nihss > 25) {
        if (dq !== null && dq > 180) o.tosiq.push('NIHSS ' + nihss + ' > 25 — 3–4,5 soatlik oynada istisno');
        else o.ogohlantirish = 'NIHSS ' + nihss + ' — qon quyilish xavfi yuqori, lekin 3 soat ichida og\'irlik o\'zi to\'siq emas';
      }
    }
    var sbp = n(d.sbp), dbp = n(d.dbp), gl = n(d.glukoza);
    if (sbp !== null && sbp >= 185) o.tosiq.push('SBP ' + sbp + ' ≥ 185 — avval bosimni tushiring');
    if (dbp !== null && dbp >= 110) o.tosiq.push('DBP ' + dbp + ' ≥ 110 — avval bosimni tushiring');
    if (gl !== null && (gl < 2.8 || gl > 22.2)) o.tosiq.push('Glukoza ' + gl + ' mmol/l — chegaradan tashqarida');
    var k = d.kontr || {};
    TLT_KONTR.forEach(function (x) { if (k[x.key]) o.tosiq.push(x.matn); });
    if (d.uygonish && dq === null) o.tosiq.push('Uyqudan uyg\'onib qolgan — vaqt noaniq, MR bo\'yicha tanlash kerak');
    o.mos = o.tosiq.length === 0 && dq <= 270;
    return o;
  }

  function trombektomiyaBaho(d, dq, nihss, aspects, mskt) {
    var o = { mos: false, sabab: [], tosiq: [], kech: false, katta_ozak: false };
    if (!mskt) { o.tosiq.push('MSKT bajarilmagan'); return o; }
    if (dq === null) { o.tosiq.push('Boshlanish vaqti noma\'lum'); return o; }
    if (dq > 1440) { o.tosiq.push('24 soatlik oyna o\'tgan'); return o; }
    // Vaqt oynasi NIHSS talabini o'zgartiradi
    var kechTur = null;                       // null | 'defuse' (6-16 s) | 'dawn' (16-24 s)
    if (dq > 960)      { o.kech = true; kechTur = 'dawn';   o.sabab.push('Kech oyna ' + soat(dq) + ' soat (16–24) — DAWN mezonlari'); }
    else if (dq > 360) { o.kech = true; kechTur = 'defuse'; o.sabab.push('Kech oyna ' + soat(dq) + ' soat (6–16) — DEFUSE-3 mezonlari'); }
    else o.sabab.push('Boshlanishdan ' + soat(dq) + ' soat (erta oyna)');
    o.kech_turi = kechTur;

    var nihssKerak = kechTur === 'dawn' ? 10 : 6;
    if (nihss === null) o.tosiq.push('NIHSS kiritilmagan');
    else if (nihss < nihssKerak) {
      o.tosiq.push('NIHSS ' + nihss + ' < ' + nihssKerak
        + (kechTur === 'dawn' ? ' — 16–24 soatlik oynada DAWN mezoni NIHSS ≥10 talab qiladi' : ''));
    } else o.sabab.push('NIHSS ' + nihss + ' (≥' + nihssKerak + ')');
    if (aspects === null) o.tosiq.push('ASPECTS kiritilmagan');
    else if (aspects < 3) o.tosiq.push('ASPECTS ' + aspects + ' < 3 — o\'zak juda katta');
    else if (aspects < 6) { o.katta_ozak = true; o.sabab.push('ASPECTS ' + aspects + ' (3–5, katta o\'zak — shartli)'); }
    else o.sabab.push('ASPECTS ' + aspects + ' (≥6)');
    if (d.kontr && d.kontr.ich_qon) o.tosiq.push('Intrakranial qon quyilish');
    o.mos = o.tosiq.length === 0;
    return o;
  }

  function fiziologiya(d, r, ishemik) {
    var sbp = n(d.sbp), gl = n(d.glukoza), sat = n(d.saturatsiya), temp = n(d.harorat);
    if (sbp !== null && ishemik && sbp > 220)
      r.ogohlantirish.push('SBP ' + sbp + ' — ehtiyotkorlik bilan 15% ga tushirish.');
    if (gl !== null && gl < 3.9) r.ogohlantirish.push('Gipoglikemiya — insultni taqlid qilishi mumkin, avval korreksiya.');
    if (gl !== null && gl > 10) r.ogohlantirish.push('Giperglikemiya — natijani yomonlashtiradi, korreksiya qiling.');
    if (sat !== null && sat < 94) r.ogohlantirish.push('SpO₂ < 94% — kislorod.');
    if (temp !== null && temp >= 37.5) r.ogohlantirish.push('Isitma — sababini aniqlang, antipiretik.');
  }

  /* ---------- KT-angiografiyaga haqiqiy to'siqlar ----------
     GCS pastligi TO'SIQ EMAS. Faqat quyidagilar cheklaydi.          */
  var KTA_TOSIQ = [
    'Kontrast moddaga og\'ir allergik reaksiya anamnezi',
    'Gemodinamikani barqarorlashtirib bo\'lmayotgan holat (reanimatsiya davom etmoqda)',
    'Monitoring bilan ta\'minlangan transport yoki hamroh shifokor yo\'q (tashkiliy cheklov)'
  ];

  /* ---------- Marshrut (imkoniyatlarga qarab) ---------- */
  function marshrut(d, r) {
    var im = d.muassasa_imkoniyat;
    if (!im) return;              // imkoniyat ma'lumoti yo'q — xulosa chiqarilmaydi
    var k = r.kodlar;
    var kerak = [];
    if (k.indexOf('MSKT_KERAK') > -1 && !im.mskt) kerak.push('MSKT');
    if (k.indexOf('KTA_KERAK') > -1 && !im.angiografiya) kerak.push('KT angiografiya');
    if (k.indexOf('TROMBEKTOMIYA_MOS') > -1 && !im.trombektomiya) kerak.push('Trombektomiya');
    if (k.indexOf('STENT_MOS') > -1 && !im.angiografiya) kerak.push('KAG / stentlash');
    if (k.indexOf('GEMORRAGIK') > -1 && !im.neyroxirurgiya) kerak.push('Neyroxirurgiya');
    if (k.indexOf('ICU') > -1 && im.icu === false) kerak.push('ICU');
    if (kerak.length) {
      r.marshrut = { kerak: kerak, matn: 'Bu muassasada mavjud emas: ' + kerak.join(', ')
        + '. Imkoniyati bor markazga yo\'naltirish kerak.' };
      r.tavsiya.push({ matn: 'Yo\'naltirish: ' + kerak.join(', ') + ' imkoniyati bor markazga', muhim: true });
      r.kodlar.push('YONALTIRISH');
    }
  }

  /* ================= 5. INFARKT ================= */
  /**
   * @param {Object} d
   *   infarkt_turi : "STEMI" | "NSTEMI" | "AMI"
   *   boshlanish_vaqt / boshlanish_daqiqa, qabul_vaqt, ekg_vaqti
   *   killip (1..4), sbp, puls, grace (son), kreatinin, troponin_musbat (bool)
   *   pci_imkoniyat_daqiqa : eng yaqin PCI markazga transport daqiqasi
   *   juda_yuqori_xavf : {shok, refrakter, aritmiya, mexanik, oy} — NSTEMI uchun
   *   kontr : TLT_KONTR kalitlari (TLT uchun)
   */
  function infarkt(d) {
    d = d || {};
    var r = yangiNatija('infarkt');
    var turi = String(d.infarkt_turi || '').toUpperCase();
    var stemi = turi.indexOf('STEMI') === 0;           // "STEMI"
    var nstemi = turi.indexOf('NSTEMI') > -1;
    var dq = bor(d.boshlanish_daqiqa) ? n(d.boshlanish_daqiqa)
                                      : daqiqa(d.boshlanish_vaqt, d.qabul_vaqt);
    var killip = n(d.killip), grace = n(d.grace), sbp = n(d.sbp);

    if (dq !== null) r.ballar.push({ nom: 'Og\'riq boshlanishi', qiymat: soat(dq) + ' soat', izoh:
      dq <= 720 ? 'Reperfuziya oynasi ichida' : 'Oynadan tashqarida', band: dq <= 720 ? B.yengil : B.ogir });
    if (killip !== null) r.ballar.push({ nom: 'Killip', qiymat: killip + '-sinf', izoh:
      killip === 1 ? 'Yurak yetishmovchiligi yo\'q' : killip === 2 ? 'Xirillashlar / III ton'
      : killip === 3 ? 'O\'pka shishi' : 'Kardiogen shok',
      band: killip === 1 ? B.yengil : killip === 2 ? B.orta : killip === 3 ? B.ogir : B.kritik });
    if (grace !== null) r.ballar.push({ nom: 'GRACE', qiymat: grace + ' ball', izoh:
      grace > 140 ? 'Yuqori xavf' : grace >= 109 ? 'O\'rta xavf' : 'Past xavf',
      band: grace > 140 ? B.ogir : grace >= 109 ? B.orta : B.yengil });
    var ekgDq = daqiqa(d.qabul_vaqt, d.ekg_vaqti);
    if (ekgDq !== null) r.ballar.push({ nom: 'Door-to-EKG', qiymat: ekgDq + ' daqiqa', izoh:
      ekgDq <= 10 ? 'Me\'yorda' : 'Kechikish (me\'yor ≤10 daqiqa)',
      band: ekgDq <= 10 ? B.yengil : B.orta });

    r.daraja = killip !== null && killip >= 4 ? B.kritik
             : killip === 3 ? B.ogir
             : stemi ? B.ogir
             : grace !== null && grace > 140 ? B.ogir
             : B.orta;
    r.xulosa.push(r.daraja.matn + ' ' + (stemi ? 'STEMI' : nstemi ? 'NSTEMI' : 'o\'tkir koronar sindrom') + '.');

    if (ekgDq === null && !bor(d.ekg_vaqti))
      r.tavsiya.push({ matn: 'EKG — eshikdan 10 daqiqa ichida', muhim: true });

    if (stemi) {
      r.kodlar.push('STEMI');
      var transport = n(d.pci_imkoniyat_daqiqa);
      var pciMumkin = transport !== null && transport <= 120;
      if (dq !== null && dq > 720 && (killip === null || killip < 3)) {
        r.xulosa.push('12 soatdan ko\'p o\'tgan — davom etuvchi ishemiya belgilari bo\'lmasa shoshilinch reperfuziya shart emas.');
        r.tavsiya.push({ matn: 'Koronar angiografiya (24–72 soat ichida, rejali)', muhim: false });
      } else if (pciMumkin || transport === null) {
        r.kodlar.push('PCI_MOS', 'STENT_MOS');
        r.tavsiya.push({ matn: 'Birlamchi PCI (KAG + stentlash) — eshikdan 60–90 daqiqa ichida', muhim: true });
        r.sabab.pci = ['STEMI', dq !== null ? soat(dq) + ' soat' : '', transport !== null ? 'transport ' + transport + ' daqiqa' : ''].filter(Boolean);
      } else {
        var t = tltBaho(d, dq, null, true);  // NIHSS shartlari infarktga tegishli emas
        if (t.tosiq.length === 0) {
          r.kodlar.push('TLT_MOS', 'STENT_MOS');
          r.tavsiya.push({ matn: 'IV tromboliz — eshikdan 30 daqiqa ichida (PCI markaziga transport >120 daqiqa)', muhim: true });
          r.tavsiya.push({ matn: 'Trombolizdan so\'ng 2–24 soat ichida KAG uchun yo\'naltirish', muhim: true });
        } else {
          r.kodlar.push('TLT_MOS_EMAS', 'STENT_MOS');
          r.tosiq.tlt = t.tosiq;
          r.tavsiya.push({ matn: 'Tromboliz mumkin emas — zudlik bilan PCI markaziga yo\'naltirish', muhim: true });
        }
      }
    } else if (nstemi || turi) {
      r.kodlar.push(nstemi ? 'NSTEMI' : 'OKS');
      var y = d.juda_yuqori_xavf || {};
      var judaYuqori = y.shok || y.refrakter || y.aritmiya || y.mexanik || y.oy;
      if (judaYuqori) {
        r.kodlar.push('INVAZIV_SHOSHILINCH', 'STENT_MOS');
        r.tavsiya.push({ matn: 'Zudlik bilan invaziv strategiya (KAG < 2 soat)', muhim: true });
      } else if (grace !== null && grace > 140 || d.troponin_musbat) {
        r.kodlar.push('INVAZIV_ERTA', 'STENT_MOS');
        r.tavsiya.push({ matn: 'Erta invaziv strategiya (KAG < 24 soat)', muhim: true });
        r.sabab.pci = [grace !== null ? 'GRACE ' + grace : '', d.troponin_musbat ? 'troponin musbat' : ''].filter(Boolean);
      } else if (grace !== null && grace >= 109) {
        r.kodlar.push('INVAZIV_KECH');
        r.tavsiya.push({ matn: 'Invaziv strategiya (KAG < 72 soat)', muhim: false });
      } else {
        r.tavsiya.push({ matn: 'Neinvaziv baholash (yuklamali sinov / KT-koronarografiya)', muhim: false });
        r.kodlar.push('KONSERVATIV');
      }
      if (grace === null) r.ogohlantirish.push('GRACE balli hisoblanmagan — strategiyani tanlash uchun kerak.');
    }

    r.tavsiya.push({ matn: 'Ikki xil antiagregant + antikoagulyant (protokol bo\'yicha)', muhim: true });
    r.tavsiya.push({ matn: 'Yuqori dozali statin, beta-blokator, AKF ingibitori (qarshi ko\'rsatma bo\'lmasa)', muhim: false });
    var icu2 = (killip !== null && killip >= 3) || stemi || (sbp !== null && sbp < 90);
    r.tavsiya.push({ matn: icu2 ? 'Kardioreanimatsiya (ICU)' : 'Kardiologiya bo\'limida monitoring', muhim: icu2 });
    if (icu2) r.kodlar.push('ICU');
    if (sbp !== null && sbp < 90) r.ogohlantirish.push('SBP < 90 — kardiogen shok, inotrop qo\'llash / IABP muhokamasi.');
    parvarishInfarkt(d, r);
    profilaktika(d, r, false, false);
    marshrut(d, r);
    muddatlar(d, r, 'infarkt');
    if (r.kodlar.indexOf('TLT_MOS') > -1) r.doza = dozaHisobla(d);
    return r;
  }

  /* ---------- 6. Natija qolipi ---------- */
  function yangiNatija(nozologiya) {
    return {
      versiya: VERSIYA, nozologiya: nozologiya, vaqt: new Date().toISOString(),
      daraja: B.orta, ballar: [], xulosa: [], tavsiya: [], ogohlantirish: [],
      parvarish: [], profilaktika: [], muddat: [], doza: null,
      kodlar: [], sabab: {}, tosiq: {}, marshrut: null, tlt: null, trombektomiya: null
    };
  }

  /* ---------- 7. Shifokor tanlovini tekshirish (eng muhim funksiya) ----------
     Nomzod bo'lgan, lekin aralashuv qilinmagan holatlarda sabab so'raladi.
     Shu mexanizm reperfuziya nima uchun 1% ekanini o'lchab beradi.        */
  var SABAB_ROYXATI = [
    'Vaqt oynasi o\'tgan',
    'Qarshi ko\'rsatma bor',
    'Bemor / qarindoshlar rad etdi',
    'Preparat yo\'q',
    'Angiografiya zali / jamoa mavjud emas',
    'Transport imkoniyati yo\'q',
    'Boshqa markazga yo\'naltirildi',
    'Boshqa sabab'
  ];
  function tekshir(natija, tanlangan) {
    var t = String(tanlangan || '').toLowerCase();
    var k = natija.kodlar || [];
    var x = [];
    function bor_(s) { return t.indexOf(s) > -1; }
    if (k.indexOf('TLT_MOS') > -1 && !bor_('tromboliz'))
      x.push({ kod: 'TLT_MOS', savol: 'Bemor trombolizga mos edi. Nima uchun bajarilmadi?' });
    if (k.indexOf('TROMBEKTOMIYA_MOS') > -1 && !bor_('trombektomiya'))
      x.push({ kod: 'TROMBEKTOMIYA_MOS', savol: 'Bemor trombektomiyaga mos edi. Nima uchun bajarilmadi?' });
    if ((k.indexOf('PCI_MOS') > -1 || k.indexOf('INVAZIV_SHOSHILINCH') > -1 || k.indexOf('INVAZIV_ERTA') > -1)
        && !bor_('stent') && !bor_('kag') && !bor_('pci') && !bor_('angiograf'))
      x.push({ kod: 'PCI_MOS', savol: 'Bemor koronar angiografiyaga mos edi. Nima uchun bajarilmadi?' });
    if (k.indexOf('MSKT_KERAK') > -1)
      x.push({ kod: 'MSKT_KERAK', savol: 'MSKT bajarilmagan. Sababi?' });
    return x;
  }

  /* ---------- 8. Bazaga yozish uchun qisqartma ---------- */
  function saqlashUchun(natija, tanlangan, javoblar) {
    return {
      cdss_versiya: natija.versiya,
      cdss_vaqt: natija.vaqt,
      cdss_daraja: natija.daraja.key,
      cdss_kodlar: natija.kodlar,
      cdss_xulosa: natija.xulosa.join(' '),
      cdss_tavsiya: natija.tavsiya.map(function (x) { return x.matn; }),
      cdss_profilaktika: natija.profilaktika,
      cdss_tanlangan_muolaja: tanlangan || null,
      cdss_rad_sabablari: javoblar || null
    };
  }

  global.CDSS = {
    VERSIYA: VERSIYA, DARAJA: B, TLT_KONTR: TLT_KONTR, KTA_TOSIQ: KTA_TOSIQ, XAVF_OMIL: XAVF_OMIL, SABAB_ROYXATI: SABAB_ROYXATI,
    insult: insult, infarkt: infarkt, tekshir: tekshir, saqlashUchun: saqlashUchun,
    _yordamchi: { n: n, daqiqa: daqiqa, soat: soat }
  };
})(typeof window !== 'undefined' ? window : globalThis);


/* =====================================================================
   CDSSUI — chizish qismi.  Mavjud dizaynga mos, tashqi CSS talab qilmaydi.
   ---------------------------------------------------------------------
   ⚠️ TO'LIQ EMAS: manba fayl xabar uzunligi chegarasida `davolash()`
   funksiyasining o'rtasida kesilgan. Quyida faqat to'liq yetib kelgan
   qism bor: CSS, css(), esc(), baholashHTML(), baholash().
   Yetishmayotgani: MUOLAJA / YONALTIRISH_SABAB konstantalari,
   davolash() funksiyasi va asl `global.CDSSUI = {...}` eksporti.
   Faylning qolgan qismi kelganda shu joyga qo'yiladi.
   ===================================================================== */
(function (global) {
  'use strict';
  var CDSS = global.CDSS;

  var CSS = ''
    + '.cdss{--r:10px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111827;margin:16px 0}'
    + '.cdss-card{border:1px solid #e5e7eb;border-radius:var(--r);background:#fff;overflow:hidden}'
    + '.cdss-hd{display:flex;align-items:center;gap:8px;padding:10px 14px;font-weight:600;'
    + 'font-size:13px;letter-spacing:.04em;text-transform:uppercase;background:#f9fafb;border-bottom:1px solid #e5e7eb}'
    + '.cdss-body{padding:14px}'
    + '.cdss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}'
    + '.cdss-ball{border:1px solid #e5e7eb;border-left-width:4px;border-radius:8px;padding:8px 10px;background:#fff}'
    + '.cdss-ball b{display:block;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;font-weight:600}'
    + '.cdss-ball s{display:block;text-decoration:none;font-size:18px;font-weight:700;margin:2px 0}'
    + '.cdss-ball i{font-style:normal;font-size:12px;color:#4b5563}'
    + '.cdss-xul{margin-top:14px;padding:12px 14px;border-radius:8px;border-left:4px solid;background:#f9fafb}'
    + '.cdss-xul h4{margin:0 0 6px;font-size:16px;font-weight:700}'
    + '.cdss-xul p{margin:2px 0;font-size:14px}'
    + '.cdss-list{list-style:none;margin:8px 0 0;padding:0}'
    + '.cdss-list li{padding:6px 0 6px 24px;position:relative;border-top:1px dashed #e5e7eb}'
    + '.cdss-list li:first-child{border-top:0}'
    + '.cdss-list li:before{content:"✔";position:absolute;left:0;color:#15803d;font-weight:700}'
    + '.cdss-list li.m{font-weight:600}'
    + '.cdss-warn{margin-top:10px;padding:10px 12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:13px}'
    + '.cdss-warn div{padding:2px 0}'
    + '.cdss-tosiq{margin-top:10px;padding:10px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:13px}'
    + '.cdss-tosiq b{display:block;margin-bottom:4px}'
    + '.cdss-tosiq ul{margin:0;padding-left:18px}'
    + '.cdss-doza{margin-top:10px;padding:10px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:13px}'
    + '.cdss-doza b{display:block;margin-bottom:4px}.cdss-doza i{color:#4b5563;font-size:12px;font-style:normal}'
    + '.cdss-doza div{padding:2px 0}'
    + '.cdss-muddat{margin-top:10px;padding:10px 12px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px}'
    + '.cdss-muddat b{display:block;margin-bottom:4px}.cdss-muddat table{width:100%;border-collapse:collapse}'
    + '.cdss-muddat td{padding:3px 0;border-top:1px dashed #e5e7eb}'
    + '.cdss-list.cdss-parv li:before{content:"•";color:#6b7280}'
    + '.cdss-marsh{margin-top:10px;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:13px}'
    + '.cdss-radio{display:block;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin:6px 0;cursor:pointer}'
    + '.cdss-radio:hover{background:#f9fafb}'
    + '.cdss-radio input{margin-right:8px}'
    + '.cdss-radio.sel{border-color:#2563eb;background:#eff6ff}'
    + '.cdss-sub{margin:6px 0 6px 22px;padding-left:12px;border-left:2px solid #e5e7eb}'
    + '.cdss-chk{display:inline-flex;align-items:center;gap:6px;width:calc(50% - 8px);padding:4px 0;font-size:13px}'
    + '.cdss-sel{width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font:inherit}'
    + '@media(max-width:640px){.cdss-chk{width:100%}}'
    + '@media print{.cdss-card{box-shadow:none}.cdss-radio{border:0;padding:2px 0}}';

  function css() {
    if (document.getElementById('cdss-css')) return;
    var s = document.createElement('style');
    s.id = 'cdss-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /** Klinik baholash bloki (3-bo'lim oxiriga) */
  function baholashHTML(r) {
    var h = '<div class="cdss"><div class="cdss-card">'
      + '<div class="cdss-hd">🧠 Klinik baholash</div><div class="cdss-body">';
    h += '<div class="cdss-grid">';
    r.ballar.forEach(function (b) {
      var rang = b.band ? b.band.rang : '#9ca3af';
      h += '<div class="cdss-ball" style="border-left-color:' + rang + '">'
        + '<b>' + esc(b.nom) + '</b><s style="color:' + rang + '">' + esc(b.qiymat) + '</s>'
        + (b.izoh ? '<i>' + (b.band ? b.band.emoji + ' ' : '') + esc(b.izoh) + '</i>' : '') + '</div>';
    });
    h += '</div>';
    h += '<div class="cdss-xul" style="border-left-color:' + r.daraja.rang + '">'
      + '<h4 style="color:' + r.daraja.rang + '">' + r.daraja.emoji + ' Umumiy xulosa</h4>';
    r.xulosa.forEach(function (x) { h += '<p>' + esc(x) + '</p>'; });
    h += '</div>';

    if (r.tavsiya.length) {
      h += '<div style="margin-top:14px"><div class="cdss-hd" style="border:0;background:none;padding:0 0 4px">Tavsiya</div><ul class="cdss-list">';
      r.tavsiya.forEach(function (t) { h += '<li' + (t.muhim ? ' class="m"' : '') + '>' + esc(t.matn) + '</li>'; });
      h += '</ul></div>';
    }
    ['tlt', 'trombektomiya'].forEach(function (k) {
      var t = r.tosiq[k];
      if (t && t.length) {
        h += '<div class="cdss-tosiq"><b>' + (k === 'tlt' ? 'Tromboliz' : 'Trombektomiya') + ' uchun to\'siqlar</b><ul>';
        t.forEach(function (x) { h += '<li>' + esc(x) + '</li>'; });
        h += '</ul></div>';
      }
    });
    if (r.doza) {
      h += '<div class="cdss-doza"><b>💊 Trombolitik dozasi (vazn ' + r.doza.vazn + ' kg)</b>'
        + '<div>Alteplaza — jami <b>' + r.doza.alteplaza.jami + ' mg</b>: bolus '
        + r.doza.alteplaza.bolus + ' mg, infuziya ' + r.doza.alteplaza.infuziya + ' mg. <i>'
        + esc(r.doza.alteplaza.izoh) + '</i></div>'
        + '<div>Tenekteplaza — <b>' + r.doza.tenekteplaza.jami + ' mg</b>. <i>'
        + esc(r.doza.tenekteplaza.izoh) + '</i></div>'
        + '<div style="margin-top:4px;font-size:12px;color:#6b7280">Dozani berishdan oldin mustaqil ravishda ikkinchi shifokor tekshiradi.</div></div>';
    }
    if (r.muddat && r.muddat.length) {
      h += '<div class="cdss-muddat"><b>⏱ Vaqt me\'yorlari (eshikdan)</b><table>';
      r.muddat.forEach(function (m) {
        var rang = m.holat === 'kechikdi' ? '#b91c1c' : m.holat === 'ulguriladi' ? '#15803d' : '#6b7280';
        h += '<tr><td>' + esc(m.nom) + '</td><td style="text-align:right">≤ ' + m.maqsad + ' daq</td>'
          + '<td style="text-align:right;color:' + rang + ';font-weight:600">'
          + (m.qolgan === null ? '—' : m.qolgan >= 0 ? m.qolgan + ' daq qoldi' : Math.abs(m.qolgan) + ' daq kechikdi')
          + '</td></tr>';
      });
      h += '</table></div>';
    }
    if (r.parvarish && r.parvarish.length) {
      h += '<div style="margin-top:14px"><div class="cdss-hd" style="border:0;background:none;padding:0 0 4px">'
        + 'Asosiy parvarish — barcha bemorlar uchun</div><ul class="cdss-list cdss-parv">';
      r.parvarish.forEach(function (p) { h += '<li>' + esc(p) + '</li>'; });
      h += '</ul></div>';
    }
    if (r.profilaktika && r.profilaktika.length) {
      h += '<div style="margin-top:14px"><div class="cdss-hd" style="border:0;background:none;padding:0 0 4px">'
        + 'Ikkilamchi profilaktika — xavf omillari asosida</div><ul class="cdss-list cdss-parv">';
      r.profilaktika.forEach(function (p) { h += '<li>' + esc(p) + '</li>'; });
      h += '</ul></div>';
    }
    if (r.marshrut) h += '<div class="cdss-marsh">🚑 ' + esc(r.marshrut.matn) + '</div>';
    if (r.ogohlantirish.length) {
      h += '<div class="cdss-warn">';
      r.ogohlantirish.forEach(function (x) { h += '<div>⚠️ ' + esc(x) + '</div>'; });
      h += '</div>';
    }
    h += '<div style="margin-top:12px;font-size:11px;color:#6b7280">Tavsiyalar milliy klinik protokol asosida avtomatik shakllantirildi (CDSS v'
      + esc(r.versiya) + '). Yakuniy qarorni davolovchi shifokor qabul qiladi.</div>';
    h += '</div></div></div>';
    return h;
  }

  function baholash(el, natija) {
    css();
    el = typeof el === 'string' ? document.getElementById(el) : el;
    if (!el) return;
    el.innerHTML = baholashHTML(natija);
  }

  // VAQTINCHALIK EKSPORT — asl fayldagi eksport qatori kelmagan.
  // davolash() qo'shilganda shu obyektga ham qo'shiladi.
  global.CDSSUI = { baholash: baholash, baholashHTML: baholashHTML };
})(typeof window !== 'undefined' ? window : globalThis);
