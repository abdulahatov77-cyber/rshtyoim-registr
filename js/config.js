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
    "Andijon viloyati",
    "Buxoro viloyati",
    "Jizzax viloyati",
    "Qashqadaryo viloyati",
    "Navoiy viloyati",
    "Namangan viloyati",
    "Samarqand viloyati",
    "Surxondaryo viloyati",
    "Sirdaryo viloyati",
    "Toshkent viloyati",
    "Farg'ona viloyati",
    "Xorazm viloyati",
    "Qoraqalpog'iston Respublikasi",
    "Toshkent shahri"
  ],

  MUASSASALAR: {
    "Andijon viloyati": [
      "RSHTYOIM Andijon filiali", "Andijon ShTB", "Baliqchi TTB",
      "Buloqboshi TTB", "Bo'ston TTB", "Izboskan TTB",
      "Jalaquduq TTB", "Marhamat TTB", "Oltinko'l TTB",
      "Paxtaobod TTB", "Ulug'nor TTB", "Xonobod ShTB",
      "Xo'jaobod TTB", "Qorasuv ShTB", "Qo'rg'ontepa politravma markazi",
      "Shahrixon politravma markazi", "Asaka politravma markazi"
    ],
    "Buxoro viloyati": [
      "RSHTYOIM Buxoro filiali", "Buxoro TTB", "Olot TTB",
      "Jondor TTB", "Qorovulbozor TTB", "Kogon ShTB",
      "G'ijduvon TTB", "Shofirkon TTB", "Peshku TTB",
      "Qorako'l politravma markazi", "Vobkent politravma markazi", "Romitan politravma markazi"
    ],
    "Jizzax viloyati": [
      "RSHTYOIM Jizzax filiali", "Arnasoy TTB", "Baxmal TTB",
      "Zarbdor TTB", "Zafarobod TTB", "Mirzacho'l TTB",
      "Paxtakor TTB", "Forish TTB", "Yangiobod TTB",
      "Sh. Rashidov TTB", "Gallaorol politravma markazi", "Do'stlik politravma markazi",
      "Zomin politravma markazi"
    ],
    "Qashqadaryo viloyati": [
      "RSHTYOIM Qashqadaryo filiali", "Qarshi ShTB", "Qarshi TTB", "Koson TTB",
      "Qamashi TTB", "Kitob TTB", "Chiroqchi TTB",
      "Yakkabog'-1 TTB", "Yakkabog'-2 TTB", "Mirishkor-1 TTB",
      "Mirishkor-2 TTB", "Muborak TTB", "Nishon TTB",
      "Shahrisabz ShTB", "Dehqonobod TTB", "Kasbi politravma markazi",
      "Shahrisabz politravma markazi", "G'uzor politravma markazi",
      "Ko'kdala politravma markazi"
    ],
    "Navoiy viloyati": [
      "RSHTYOIM Navoiy filiali", "Konimex TTB", "Karmana TTB",
      "Navbahor TTB", "Nurota TTB", "Tomdi TTB",
      "Uchquduq TTB", "Zarafshon politravma markazi", "Qiziltepa politravma markazi",
      "Xatirchi politravma markazi"
    ],
    "Namangan viloyati": [
      "RSHTYOIM Namangan filiali", "Namangan ShTB", "Namangan TTB", "Chust TTB",
      "Norin TTB", "Chortoq TTB", "To’raqo’rg’on TTB",
      "Kosonsoy TTB", "Uychi TTB", "Mingbuloq TTB",
      "Pop politravma markazi", "Uchqo’rg’on politravma markazi", "Yangiqo’rg’on politravma markazi"
    ],
    "Samarqand viloyati": [
      "RSHTYOIM Samarqand filiali", "Oqdaryo TTB", "Jomboy TTB",
      "Qo'shrabot TTB", "Narpay TTB",
      "Nurobod TTB", "Payariq TTB", "Pastdarg'om TTB",
      "Samarqand TTB", "Toyloq TTB", "Chelak TTB",
      "Bulung'ur politravma markazi", "Urgut politravma markazi", "Ishtixon politravma markazi",
      "Paxtachi politravma markazi", "Kattaqo'rg'on politravma markazi",
      "Kattaqo'rg'on TTB"
    ],
    "Surxondaryo viloyati": [
      "RSHTYOIM Surxondaryo filiali", "Termiz ShTB", "Angor TTB",
      "Oltinsoy TTB", "Boysun TTB", "Bandixon TTB",
      "Jarqo'rg'on TTB", "Qiziriq TTB", "Muzrabot TTB",
      "Uzun TTB", "Sho'rchi TTB", "Denov politravma markazi",
      "Qumqo'rg'on politravma markazi", "Sariosiyo politravma markazi", "Sherobod politravma markazi"
    ],
    "Sirdaryo viloyati": [
      "RSHTYOIM Sirdaryo filiali", "Yangiyer ShTB", "Boyovut TTB",
      "Sardoba TTB", "Sayxunobod TTB",
      "Shirin ShTB", "Xovos TTB", "Sirdaryo politravma markazi",
      "Oq Oltin politravma markazi"
    ],
    "Toshkent viloyati": [
      "RSHTYOIM Toshkent viloyat filiali", "Bo'ka TTB", "Zangiota TTB",
      "Qibray TTB", "Quyichirchiq TTB", "Nurafshon ShTB",
      "Oqqo'rg'on TTB", "Olmaliq ShTB", "Ohangaron ShTB",
      "Ohangaron TTB", "Parkent TTB", "Piskent TTB",
      "Toshkent TTB", "Chirchiq ShTB", "Yuqorichirchiq TTB",
      "Yangiyo'l ShTB", "Yangiyo'l TTB", "Angren politravma markazi",
      "Bekobod politravma markazi", "Bo'stonliq politravma markazi", "Chinoz politravma markazi"
    ],
    "Farg'ona viloyati": [
      "RSHTYOIM Farg'ona filiali", "Marg'ilon ShTB", "Quvasoy ShTB",
      "Oltiariq TTB", "Farg'ona TTB",
      "Qo'shtepa TTB", "Toshloq TTB", "Rishton TTB",
      "Buvayda TTB", "Uchko'prik TTB", "Dang'ara TTB",
      "Furqat TTB", "O'zbekiston TTB", "Beshariq TTB",
      "So'x TTB", "Qo'qon politravma markazi", "Bog'dod politravma markazi",
      "Yozyovon politravma markazi", "Quva politravma markazi"
    ],
    "Xorazm viloyati": [
      "RSHTYOIM Xorazm filiali", "Urganch ShTB", "Urganch TTB", "Tuproqqal'a TTB", "Tuproqqa'la TTB",
      "Bog'ot TTB", "Qo'shko'pir TTB", "Xonqa TTB",
      "Xiva ShTB", "Shovot TTB", "Yangiariq TTB",
      "Yangibozor TTB", "Gurlan politravma markazi", "Xazorasp politravma markazi",
      "Xiva politravma markazi"
    ],
    "Qoraqalpog'iston Respublikasi": [
      "RSHTYOIM Qoraqalpog'iston filiali", "Nukus TTB",
      "Amudaryo TTB", "Beruniy TTB", "Bo'zatov TTB", "Kegeyli TTB",
      "Qanliko'l TTB", "Qorao'zak TTB", "Mo'ynoq TTB",
      "Taxiatosh TTB", "Taxtako'pir TTB", "Shumanay TTB",
      "Ellikqal'a TTB", "Xo'jayli TTB", "Qo'ng'irot politravma markazi",
      "Chimboy politravma markazi", "To'rtko'l politravma markazi"
    ],
    "Toshkent shahri": [
      "Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi",
      "1-sonli Respublika Klinik Shifoxonasi",
      "Shahar Tez Tibbiy Yordam Klinik Shifoxonasi",
      "1-sonli Shahar Klinik Shifoxonasi",
      "4-sonli Shahar Klinik Shifoxonasi",
      "7-sonli Shahar Klinik Shifoxonasi",
      "TDTU 1-sonli klinikasi",
      "TDTU 2-sonli klinikasi",
      "TDTU 3-sonli klinikasi"
    ]
  },

  // 18+ aholi soni (2026 yil 1 may, ming kishi → kishiga aylantirilib saqlangan)
  AHOLI_18PLUS: {
    "Andijon viloyati":            2407000,
    "Buxoro viloyati":             1443000,
    "Jizzax viloyati":             1070000,
    "Qashqadaryo viloyati":        2540000,
    "Navoiy viloyati":              760000,
    "Namangan viloyati":           2181000,
    "Samarqand viloyati":          2993000,
    "Surxondaryo viloyati":        2058000,
    "Sirdaryo viloyati":            647000,
    "Toshkent viloyati":           2160000,
    "Farg'ona viloyati":           2887000,
    "Xorazm viloyati":             1413000,
    "Qoraqalpog'iston Respublikasi": 1410000,
    "Toshkent shahri":             2172000
  },

  // 30+ aholi soni (jami aholi × 45%)
  AHOLI_30PLUS: {
    "Andijon viloyati":            1590255,
    "Buxoro viloyati":              950490,
    "Jizzax viloyati":              707940,
    "Qashqadaryo viloyati":        1679310,
    "Navoiy viloyati":              501750,
    "Namangan viloyati":           1441215,
    "Samarqand viloyati":          1978560,
    "Surxondaryo viloyati":        1361205,
    "Sirdaryo viloyati":            427320,
    "Toshkent viloyati":           1428570,
    "Farg'ona viloyati":           1907730,
    "Xorazm viloyati":              933750,
    "Qoraqalpog'iston Respublikasi": 925965,
    "Toshkent shahri":             1438155
  },

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

  SIMPTOM_VAQTLAR_INSULT: [
    "0-4 soat ichida",
    "4-6 soat ichida",
    "6-24 soat ichida",
    "24 soatdan ortiq",
    "Uyquda boshlangan"
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
    "Yurak aritmiyasi",
    "Yurak ishemik kasalligi",
    "Avvalgi insult / TIA",
    "Chekish",
    "Spirtli ichimlik",
    "Semizlik",
    "Dislipidemiya",
    "Irsiy moyillik (qarindoshlarda insult)",
    "COVID-19 o'tkazgan"
  ],

  YUTISH_TESTI_OPTIONS: [
    "O'tdi (norma)",
    "O'tmadi (disfagiya)",
    "Bajarilmadi"
  ],

  INFARKT_TURLARI: [
    "O'KS ST elevatsiya bilan (STEMI)",
    "O'KS ST elevatsiyasiz (NSTEMI)",
    "O'tkir miokard infarkti (AMI)"
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
    "To'liq okklyuziya",
    "Operativ davo (AKSH) tavsiya etildi"
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

  DINAMIKA_MUOLAJALAR_INSULT: [
    "MSKT angiografiya",
    "Faqat serebral angiografiya",
    "Serebral angiografiya + trombolitik terapiya (TLT, trombolizis)",
    "Serebral angiografiya + tromboaspiratsiya",
    "Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)",
    "Serebral angiografiya + stentlash",
    "Serebral angiografiya + transluminal ballon angioplastika (TLBAP)",
    "Kombinatsiyalangan muolaja: tromboaspiratsiya + tromboekstraksiya",
    "Gemorragik insult bo'yicha jarrohlik amaliyoti",
    "Boshqa muassasaga o'tkazildi \u2013 angiografiya va endovaskulyar muolaja uchun"
  ],

  INSULT_TURLARI: [
    "Ishemik insult",
    "Gemorragik insult",
    "TIA (Tranzitor ishemik ataka)"
  ],

  INSULT_MUOLAJALARI: [
    "Medikamentoz (konservativ) davo",
    "MSKT angiografiya",
    "Faqat serebral angiografiya",
    "Serebral angiografiya + Trombolitik terapiya (TLT, trombolizis)",
    "Serebral angiografiya + tromboaspiratsiya",
    "Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)",
    "Serebral angiografiya + stentlash",
    "Serebral angiografiya + transluminal ballon angioplastika (TLBAP)",
    "Kombinatsiyalangan muolaja: tromboaspiratsiya + tromboekstraksiya",
    "Gemorragik insult bo'yicha jarrohlik amaliyoti",
    "Boshqa muassasaga o'tkazildi — angiografiya va endovaskulyar muolaja uchun"
  ],

  MRS_DARAJALAR: [
    "0 – simptom yo'q",
    "1 – yengil simptom, lekin kundalik ishlarni qila oladi",
    "2 – yengil nogironlik, ba'zi ishlar qiyin",
    "3 – o'rtacha nogironlik, yordam kerak",
    "4 – og'ir nogironlik, mustaqil yura olmaydi",
    "5 – juda og'ir nogironlik, doimiy parvarish kerak",
    "6 – vafot"
  ],

  INSULT_NATIJALARI: [
    "Tuzaldi",
    "Reabilitatsiyaga yuborildi",
    "Boshqa shifoxonaga o'tkazildi",
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
