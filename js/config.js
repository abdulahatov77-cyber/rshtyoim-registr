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

  MUROJAAT_YOLLARI: [
    "Tez tibbiy yordam bilan",
    "O'z-o'zidan",
    "Boshqa tibbiyot muassasasidan",
    "Tez yordam vertoloti bilan"
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
    "ST ko'tarilishi (elevation)",
    "ST pasayishi (depression)",
    "Yangi chap blokada (LBBB)",
    "Patologik Q to'lqini",
    "T inversiya",
    "Taxikardiya / aritmiya",
    "AV blokada",
    "O'zgarishsiz (norma)"
  ],

  XAVF_OMILLAR_INFARKT: [
    "Arterial gipertenziya (AGT)",
    "Qandli diabet (QD)",
    "Chekish (hozirgi yoki sobiq)",
    "Giperxolesterolemiya / dislipidemiya",
    "Ortiqcha vazn (BMI ≥ 30)",
    "YuIK anamnezi — PIKS (o'tkazilgan infarkt)",
    "Insult / TIA anamnezi",
    "Yurak yetishmovchiligi anamnezi",
    "Oilaviy YuIK (birinchi darajali)",
    "Xavf omili yo'q"
  ],

  XAVF_OMILLAR_INSULT: [
    "Arterial gipertenziya",
    "Qandli diabet",
    "Fibrillyatsiya (AF)",
    "O'tkazilgan insult / TIA",
    "YuIK / PIKS",
    "Chekish",
    "Spirtli ichimlik",
    "Xavf omili yo'q"
  ],

  INFARKT_TURLARI: [
    "STEMI (ST segment ko'tarilishi bilan miokard infarkti)",
    "NSTEMI (ST segment ko'tarilmasdan miokard infarkti)",
    "O'tkir miokard infarkti"
  ],

  KILLIP_KLASSLAR: [
    "Killip I — yurak yetishmovchiligi yo'q",
    "Killip II — yurak yetishmovchiligi (nam xirildoqlar)",
    "Killip III — o'pka shishi",
    "Killip IV — kardiogen shok"
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

  MSKT_TANLOVLAR: [
    "Ha — o'tkazildi",
    "Yo'q — qurilma yo'q",
    "Yo'q — boshqa sabab"
  ]
};
