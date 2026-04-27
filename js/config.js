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

  MUASSASALAR: {
    "Andijon": [
      "RSHTYOIM Andijon filiali","Andijon Emergency Department","Baliqchi Emergency Department",
      "Buloqboshi Emergency Department","Bo'ston Emergency Department","Izboskan Emergency Department",
      "Jalaquduq Emergency Department","Marhamat Emergency Department","Oltinko'l Emergency Department",
      "Paxtaobod Emergency Department","Ulug'nor Emergency Department","Xonobod Emergency Department",
      "Xo'jaobod Emergency Department","Qorasuv Emergency Department","Qo'rg'ontepa politravma markazi",
      "Shahrixon politravma markazi","Asaka politravma markazi"
    ],
    "Buxoro": [
      "RSHTYOIM Buxoro filiali","Buxoro Emergency Department","Olot Emergency Department",
      "Jondor Emergency Department","Qorovulbozor Emergency Department","Kogon Emergency Department",
      "G'ijduvon Emergency Department","Shofirkon Emergency Department","Peshku Emergency Department",
      "Qorako'l politravma markazi","Vobkent politravma markazi","Romitan politravma markazi"
    ],
    "Jizzax": [
      "RSHTYOIM Jizzax filiali","Arnasoy Emergency Department","Baxmal Emergency Department",
      "Zarbdor Emergency Department","Zafarobod Emergency Department","Mirzacho'l Emergency Department",
      "Paxtakor Emergency Department","Forish Emergency Department","Yangiobod Emergency Department",
      "Sh. Rashidov Emergency Department","Gallaorol politravma markazi","Do'stlik politravma markazi",
      "Zomin politravma markazi"
    ],
    "Qashqadaryo": [
      "RSHTYOIM Qashqadaryo filiali","Koson Emergency Department","Qamashi Emergency Department",
      "Kitob Emergency Department","Chiroqchi Emergency Department","Yakkabog'-1 Emergency Department",
      "Yakkabog'-2 Emergency Department","Mirishkor-1 Emergency Department","Mirishkor-2 Emergency Department",
      "Muborak Emergency Department","Nishon Emergency Department","Qarshi Emergency Department",
      "Shahrisabz Emergency Department","Dehqonobod Emergency Department","Kasbi politravma markazi",
      "Shahrisabz politravma markazi","G'uzor politravma markazi"
    ],
    "Navoiy": [
      "RSHTYOIM Navoiy filiali","Konimex Emergency Department","Karmana Emergency Department",
      "Navbahor Emergency Department","Nurota Emergency Department","Tomdi Emergency Department",
      "Uchquduq Emergency Department","Ko'kdala politravma markazi","Zarafshon politravma markazi",
      "Qiziltepa politravma markazi","Xatirchi politravma markazi"
    ],
    "Namangan": [
      "RSHTYOIM Namangan filiali","Namangan Emergency Department","Chust Emergency Department",
      "Norin Emergency Department","Chortoq Emergency Department","To'raqo'rg'on Emergency Department",
      "Kosonsoy Emergency Department","Uychi Emergency Department","Mingbuloq Emergency Department",
      "Pop politravma markazi","Uchqo'rg'on politravma markazi","Yangiqo'rg'on politravma markazi"
    ],
    "Samarqand": [
      "RSHTYOIM Samarqand filiali","Oqdaryo Emergency Department","Jomboy Emergency Department",
      "Kattaqo'rg'on Emergency Department","Qo'shrabot Emergency Department","Narpay Emergency Department",
      "Nurobod Emergency Department","Payariq Emergency Department","Pastdarg'om Emergency Department",
      "Samarqand Emergency Department","Toyloq Emergency Department","Chelak Emergency Department",
      "Bulung'ur politravma markazi","Urgut politravma markazi","Ishtixon politravma markazi",
      "Paxtachi politravma markazi","Kattaqo'rg'on politravma markazi"
    ],
    "Surxondaryo": [
      "RSHTYOIM Surxondaryo filiali","Angor Emergency Department","Oltinsoy Emergency Department",
      "Boysun Emergency Department","Bandixon Emergency Department","Jarqo'rg'on Emergency Department",
      "Qiziriq Emergency Department","Muzrabot Emergency Department","Termiz Emergency Department",
      "Uzun Emergency Department","Sho'rchi Emergency Department","Denov politravma markazi",
      "Qumqo'rg'on politravma markazi","Sariosiyo politravma markazi","Sherobod politravma markazi"
    ],
    "Sirdaryo": [
      "RSHTYOIM Sirdaryo filiali","Yangiyer Emergency Department","Boyovut Emergency Department",
      "Guliston Emergency Department","Sardoba Emergency Department","Sayxunobod Emergency Department",
      "Shirin Emergency Department","Xovos Emergency Department","Sirdaryo Emergency Department",
      "Oq Oltin Emergency Department"
    ],
    "Toshkent vil.": [
      "RSHTYOIM Toshkent viloyat filiali","Bekobod Emergency Department","Bo'ka Emergency Department",
      "Zangiota Emergency Department","Qibray Emergency Department","Quyichirchiq Emergency Department",
      "Nurafshon Emergency Department","Oqqo'rg'on Emergency Department","Olmaliq Emergency Department",
      "Ohangaron shahar Emergency Department","Ohangaron tuman Emergency Department",
      "Parkent Emergency Department","Piskent Emergency Department","Toshkent Emergency Department",
      "Chirchiq Emergency Department","Yuqorichirchiq Emergency Department",
      "Yangiyo'l shahar Emergency Department","Yangiyo'l tuman Emergency Department",
      "Angren Emergency Department","Bekobod tuman Emergency Department",
      "Bo'stonliq Emergency Department","Chinoz Emergency Department"
    ],
    "Farg'ona": [
      "RSHTYOIM Farg'ona filiali","Marg'ilon Emergency Department","Quvasoy Emergency Department",
      "Oltiariq Emergency Department","Quva Emergency Department","Farg'ona Emergency Department",
      "Qo'shtepa Emergency Department","Toshloq Emergency Department","Rishton Emergency Department",
      "Buvayda Emergency Department","Uchko'prik Emergency Department","Dang'ara Emergency Department",
      "Furqat Emergency Department","O'zbekiston Emergency Department","Beshariq Emergency Department",
      "So'x Emergency Department","Qo'qon politravma markazi","Bog'dod politravma markazi",
      "Yozyovon politravma markazi","Quva politravma markazi"
    ],
    "Xorazm": [
      "RSHTYOIM Xorazm filiali","Tuproqqal'a Emergency Department","Bog'ot Emergency Department",
      "Qo'shko'pir Emergency Department","Urganch Emergency Department","Xonqa Emergency Department",
      "Xiva Emergency Department","Shovot Emergency Department","Yangiariq Emergency Department",
      "Yangibozor Emergency Department","Gurlan politravma markazi","Xazorasp politravma markazi",
      "Xiva politravma markazi"
    ],
    "Qoraqalpog'iston Respublikasi": [
      "RSHTYOIM Qoraqalpog'iston filiali","Amudaryo Emergency Department","Beruniy Emergency Department",
      "Bo'zatov Emergency Department","Kegeyli Emergency Department","Qanliko'l Emergency Department",
      "Qorao'zak Emergency Department","Mo'ynoq Emergency Department","Nukus Emergency Department",
      "Taxiatosh Emergency Department","Taxtako'pir Emergency Department","Shumanay Emergency Department",
      "Ellikqal'a Emergency Department","Xo'jayli Emergency Department","Chimboy Emergency Department",
      "Qo'ng'irot Emergency Department","To'rtko'l Emergency Department",
      "Qo'ng'irot politravma markazi","Chimboy politravma markazi","To'rtko'l politravma markazi"
    ],
    "Toshkent sh.": [
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
