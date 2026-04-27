// ==================== CONFIG ====================
const APP_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://udayvbywwnulbxrvxknm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYXl2Ynl3d251bGJ4cnZ4a25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Njk0NTYsImV4cCI6MjA5MjI0NTQ1Nn0.9lgD_V2H2TRKgdtPD0BO1jmE71st45JsOtlCIhmtP8U',

  // Telegram — Infarkt uchun
  TELEGRAM_INFARKT_TOKEN: '8737545108:AAF9kV7MvVfD9OZBXDaLBYb1lkjWqpLVdnY',
  TELEGRAM_INFARKT_CHAT:  '-1003239299995',

  // Telegram — Insult uchun
  TELEGRAM_INSULT_TOKEN: '8737545108:AAF9kV7MvVfD9OZBXDaLBYb1lkjWqpLVdnY',
  TELEGRAM_INSULT_CHAT:  '-1003239299995',

  APP_NAME: 'RSHTYOIM Registr',
  VERSION: '1.0.0',

  // Viloyatlar ro'yxati
  VILOYATLAR: [
    "Toshkent sh.",
    "Toshkent vil.",
    "Samarqand",
    "Farg'ona",
    "Andijon",
    "Namangan",
    "Qashqadaryo",
    "Surxondaryo",
    "Jizzax",
    "Sirdaryo",
    "Navoiy",
    "Buxoro",
    "Xorazm",
    "Qoraqalpog'iston Respublikasi"
  ],

  BIRLAMCHI_TAKROIRIY: [
    "Birlamchi",
    "Takroriy"
  ],

  MUROJAAT_YOLLARI: [
    "Tez tibbiy yordam bilan",
    "O'z murojaati bilan",
    "Poliklinika yo'llanmasi bilan",
    "Boshqa muassasadan"
  ],

  SIMPTOM_VAQTLAR: [
    "0–3 soat ichida",
    "3–6 soat ichida",
    "6–12 soat ichida",
    "12–24 soat ichida",
    "24 soatdan ko'p",
    "Noma'lum"
  ],

  EKG_NATIJALARI: [
    "ST ko'tarilishi",
    "ST pasayishi",
    "Yangi chap blokada (LBBB)",
    "Patologik Q to'lqini",
    "T inversiya",
    "Taxikardiya/aritmiya",
    "AV blokada",
    "O'zgarishsiz"
  ],

  XAVF_OMILLAR_INFARKT: [
    "Arterial gipertenziya",
    "Qandli diabet",
    "Chekish",
    "Dislipidemiya",
    "Semizlik (BMI ≥30)",
    "Oilaviy YIK",
    "Oldin o'tkazilgan MI",
    "Insult/TIA anamnezi",
    "COVID-19",
    "Spirtli ichimlik",
    "Yurak aritmiyasi",
    "Xavf omili aniqlanmadi"
  ],

  ASORATLAR_INFARKT: [
    "Yurak yetishmovchiligi",
    "Aritmiya (AF, VF, VT)",
    "Kardiogen shok",
    "Yurak yorilishi",
    "Dressler sindromi",
    "Tromboemboliya",
    "Asorat yo'q"
  ],

  XAVF_OMILLAR_INSULT: [
    "Arterial gipertenziya",
    "Qandli diabet",
    "Fibrillyatsiya (AF)",
    "O'tkazilgan insult / TIA",
    "YuIK / PIKS",
    "Chekish",
    "Spirtli ichimlik",
    "Semizlik",
    "Surunkali buyrak kasalligi",
    "Xavf omili yo'q"
  ],

  YUTISH_TESTI_OPTIONS: [
    "O'tdi (norma)",
    "O'tmadi (disfagiya)",
    "Bajarilmadi"
  ],

  INFARKT_TURLARI: [
    "O'KS ST elevatsiya bilan (STEMI)",
    "O'KS ST elevatsiyasiz (NSTEMI)",
    "O'tkir miokard infarkti (AMI)",
    "Stabil bo'lmagan stenokardiya"
  ],

  KILLIP_KLASSLAR: [
    "Killip I (yo'q)",
    "Killip II (yengil)",
    "Killip III (o'pka shishi)",
    "Killip IV (kardiogen shok)"
  ],

  ANGIO_NATIJALARI: [
    "Gemodinamik ahamiyatli stenoz yo'q",
    "Chap asosiy magistral (LM) zararlanishi",
    "Ko'p tomirli diffuz zararlanishi",
    "To'liq okklyuziya"
  ],

  INFARKT_MUOLAJALARI: [
    "Faqat KAG (diagnostik koronar angiografiya)",
    "KAG + stentlash (PCI)",
    "KAG + ballon angioplastika (TLBAP)",
    "KAG + trombolitik terapiya (TLT)",
    "Faqat trombolitik terapiya (TLT)",
    "TLT + KAG + stentlash (Rescue PCI)",
    "TLT + KAG + ballon angioplastika (Rescue TLBAP)",
    "Medikamentoz davo",
    "Boshqa muassasaga o'tkazildi"
  ],

  DINAMIKA_MUOLAJALAR: [
    "Faqat KAG (diagnostik koronar angiografiya)",
    "KAG + stentlash (PCI)",
    "KAG + ballon angioplastika (TLBAP)",
    "KAG + trombolitik terapiya (TLT)",
    "Faqat trombolitik terapiya (TLT)",
    "TLT + KAG + stentlash (Rescue PCI)",
    "TLT + KAG + ballon angioplastika (Rescue TLBAP)",
    "Boshqa muassasaga o'tkazildi — angiografiya va endovaskulyar muolaja uchun"
  ],

  INSULT_TURLARI: [
    "Ishemik insult",
    "Gemorragik insult (intraserebral qon quyilish)",
    "Gemorragik insult (subaraknoid qon quyilish)",
    "TIA (o'tkinchi ishemik xuruj)",
    "Aniqlanmagan"
  ],

  INSULT_MUOLAJALARI: [
    "Faqat CAG (diagnostik)",
    "CAG + Tromboaspiratsiya",
    "CAG + Tromboekstraksiya",
    "CAG + Stentlash",
    "CAG + TLBAP",
    "CAG + TLT (trombolizis)",
    "Kombinatsiya (TrAspir + TrEkstr)",
    "O'tkazilmadi / Konservativ"
  ],

  MRS_DARAJALAR: [
    "0 — Belgi yo'q",
    "1 — Belgi bor, lekin faoliyat cheklanmagan",
    "2 — Ozgina cheklanish",
    "3 — O'rtacha cheklanish (yordamsiz yuradi)",
    "4 — Kuchli cheklanish (yordamda yuradi)",
    "5 — Og'ir nogirorlik (to'shakda)",
    "6 — Vafot"
  ],

  INSULT_NATIJALARI: [
    "Tuzalib chiqarildi",
    "Boshqa shifoxonaga o'tkazildi",
    "Reabilitatsiya markaziga o'tkazildi",
    "Bosh tortib chiqib ketdi",
    "Vafot etdi"
  ],

  INFARKT_CHIQISH_HOLATLARI: [
    "Yaxshilanib chiqarildi",
    "O'zgarishsiz chiqarildi",
    "Yomonlashib chiqarildi",
    "Vafot etdi"
  ],

  CHIQARISH_ASORATLAR: [
    "Aritmiya",
    "Kardiogen shok",
    "O'pka shishi",
    "Reinfarkt",
    "Tromboemboliyalar",
    "Asorat kuzatilmadi"
  ],

  CHIQARISH_NATIJALARI: [
    "Tuzaldi",
    "Reabilitatsiyaga yuborildi",
    "Boshqa shifoxonaga o'tkazildi",
    "Vafot etdi"
  ],

  MSKT_TANLOVLAR: [
    "Ha — o'tkazildi",
    "Yo'q — qurilma yo'q",
    "Yo'q — boshqa sabab"
  ],

  KUZATUV_DAVRLARI: [
    "30 kunlik",
    "3 oylik",
    "6 oylik",
    "1 yillik"
  ],

  KUZATUV_HOLATLARI: [
    "Yaxshi / Barqaror",
    "Qayta yotqizildi (re-hospitalization)",
    "Qayta xuruj (takroriy infarkt/insult)",
    "Vafot etdi"
  ]
};
