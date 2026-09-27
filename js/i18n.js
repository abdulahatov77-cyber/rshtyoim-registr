(function () {
  'use strict';

  const SUPPORTED = ['uz', 'ru', 'en', 'kk'];
  const STORAGE_KEY = 'rshtyoim_language';
  const LOCALE_TAGS = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-GB', kk: 'kaa-Latn-UZ' };
  const SKIP_SELECTOR = '[data-i18n-skip],script,style,code,pre,textarea,[contenteditable="true"]';
  const TRANSLATED_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'data-label'];
  const originalText = new WeakMap();
  const translationCache = new Map();
  const originalAttributes = new WeakMap();
  let observer = null;
  let translating = false;

  const normalize = value => String(value == null ? '' : value)
    .replace(/[‘’ʻʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Russian adjectival forms for the institution locations in APP_CONFIG.MUASSASALAR.
  // Display only: these never replace the persisted Uzbek institution names.
  const RU_FACILITY_ADJECTIVES = {
    Andijon:'Андижанский', Baliqchi:'Балыкчинский', Buloqboshi:'Булакбашинский', "Bo'ston":'Бустанский',
    Yakkasaroy:'Яккасарайский', Chilonzor:'Чиланзарский', Sergeli:'Сергелийский',
    Izboskan:'Избосканский', Jalaquduq:'Джалакудукский', Marhamat:'Мархаматский', "Oltinko'l":'Алтынкульский',
    Paxtaobod:'Пахтаабадский', "Ulug'nor":'Улугнорский', Xonobod:'Ханабадский', "Xo'jaobod":'Ходжаабадский',
    Qorasuv:'Карасуйский', "Qo'rg'ontepa":'Кургантепинский', Shahrixon:'Шахриханский', Asaka:'Асакинский',
    Buxoro:'Бухарский', Olot:'Алатский', Jondor:'Джандарский', Qorovulbozor:'Караулбазарский',
    Kogon:'Каганский', "G'ijduvon":'Гиждуванский', Shofirkon:'Шафирканский', Peshku:'Пешкунский',
    "Qorako'l":'Каракульский', Vobkent:'Вабкентский', Romitan:'Рамитанский',
    Jizzax:'Джизакский', Arnasoy:'Арнасайский', Baxmal:'Бахмальский', Zarbdor:'Зарбдорский',
    Zafarobod:'Зафарабадский', "Mirzacho'l":'Мирзачульский', Paxtakor:'Пахтакорский', Forish:'Фаришский',
    Yangiobod:'Янгиабадский', 'Sh. Rashidov':'Шараф-Рашидовский', Gallaorol:'Галляаральский',
    "Do'stlik":'Дустликский', Zomin:'Зааминский',
    Qashqadaryo:'Кашкадарьинский', Qarshi:'Каршинский', Koson:'Касанский', Qamashi:'Камашинский',
    Kitob:'Китабский', Chiroqchi:'Чиракчинский', "Yakkabog'":'Яккабагский', Mirishkor:'Миришкорский',
    Muborak:'Мубарекский', Nishon:'Нишанский', Shahrisabz:'Шахрисабзский', Dehqonobod:'Дехканабадский',
    Kasbi:'Касбинский', "G'uzor":'Гузарский', "Ko'kdala":'Кукдалинский',
    Navoiy:'Навоийский', Konimex:'Канимехский', Karmana:'Карманинский', Navbahor:'Навбахорский',
    Nurota:'Нуратинский', Tomdi:'Тамдынский', Uchquduq:'Учкудукский', Zarafshon:'Зарафшанский',
    Qiziltepa:'Кызылтепинский', Xatirchi:'Хатырчинский',
    Namangan:'Наманганский', Chust:'Чустский', Norin:'Нарынский', Chortoq:'Чартакский',
    "To'raqo'rg'on":'Туракурганский', Kosonsoy:'Касансайский', Uychi:'Уйчинский', Mingbuloq:'Мингбулакский',
    Pop:'Папский', "Uchqo'rg'on":'Учкурганский', "Yangiqo'rg'on":'Янгикурганский',
    Samarqand:'Самаркандский', Oqdaryo:'Акдарьинский', Jomboy:'Джамбайский', "Qo'shrabot":'Кошрабадский',
    Narpay:'Нарпайский', Nurobod:'Нурабадский', Payariq:'Пайарыкский', "Pastdarg'om":'Пастдаргомский',
    Toyloq:'Тайлакский', Chelak:'Челекский', "Bulung'ur":'Булунгурский', Urgut:'Ургутский',
    Ishtixon:'Иштыханский', Paxtachi:'Пахтачинский', "Kattaqo'rg'on":'Каттакурганский',
    Surxondaryo:'Сурхандарьинский', Termiz:'Термезский', Angor:'Ангорский', Oltinsoy:'Алтынсайский',
    Boysun:'Байсунский', Bandixon:'Бандыханский', "Jarqo'rg'on":'Джаркурганский', Qiziriq:'Кызырыкский',
    Muzrabot:'Музрабадский', Uzun:'Узунский', "Sho'rchi":'Шурчинский', Denov:'Денауский',
    "Qumqo'rg'on":'Кумкурганский', Sariosiyo:'Сарыасийский', Sherobod:'Шерабадский',
    Sirdaryo:'Сырдарьинский', Guliston:'Гулистанский', Yangiyer:'Янгиерский', Boyovut:'Баяутский', Sardoba:'Сардобинский',
    Sayxunobod:'Сайхунабадский', Mirzaobod:'Мирзаабадский', Shirin:'Ширинский', Xovos:'Хавастский',
    'Oq Oltin':'Акалтынский',
    Toshkent:'Ташкентский', 'Toshkent viloyat':'Ташкентский областной', "Bo'ka":'Букинский',
    Zangiota:'Зангиатинский', Qibray:'Кибрайский', Quyichirchiq:'Куйичирчикский', Nurafshon:'Нурафшанский',
    "Oqqo'rg'on":'Аккурганский', Olmaliq:'Алмалыкский', Ohangaron:'Ахангаранский', Parkent:'Паркентский',
    Piskent:'Пскентский', Chirchiq:'Чирчикский', Yuqorichirchiq:'Юкоричирчикский', "Yangiyo'l":'Янгиюльский',
    Angren:'Ангренский', Bekobod:'Бекабадский', "Bo'stonliq":'Бостанлыкский', Chinoz:'Чиназский',
    "Farg'ona":'Ферганский', "Marg'ilon":'Маргиланский', Quvasoy:'Кувасайский', Oltiariq:'Алтыарыкский',
    "Qo'shtepa":'Куштепинский', Toshloq:'Ташлакский', Rishton:'Риштанский', Buvayda:'Бувайдинский',
    "Uchko'prik":'Учкуприкский', "Dang'ara":'Дангаринский', Furqat:'Фуркатский', "O'zbekiston":'Узбекистанский',
    Beshariq:'Бешарыкский', "So'x":'Сохский', "Qo'qon":'Кокандский', "Bog'dod":'Багдадский',
    Yozyovon:'Язъяванский', Quva:'Кувинский',
    Xorazm:'Хорезмский', Urganch:'Ургенчский', "Tuproqqal'a":'Тупроккалинский', "Bog'ot":'Багатский',
    "Qo'shko'pir":'Кошкупырский', Xonqa:'Ханкинский', Xiva:'Хивинский', Shovot:'Шаватский',
    Yangiariq:'Янгиарыкский', Yangibozor:'Янгибазарский', Gurlan:'Гурленский', Xazorasp:'Хазораспский',
    "Qoraqalpog'iston":'Каракалпакстанский', Nukus:'Нукусский', Amudaryo:'Амударьинский',
    Beruniy:'Берунийский', "Bo'zatov":'Бозатауский', Kegeyli:'Кегейлийский', "Qanliko'l":'Канлыкульский',
    "Qorao'zak":'Караузякский', "Mo'ynoq":'Муйнакский', Taxiatosh:'Тахиаташский',
    "Taxtako'pir":'Тахтакупырский', Shumanay:'Шуманайский', "Ellikqal'a":'Элликкалинский',
    "Xo'jayli":'Ходжейлийский', "Qo'ng'irot":'Кунградский', Chimboy:'Чимбайский', "To'rtko'l":'Турткульский'
  };
  const ruFacilityAdjective = place => RU_FACILITY_ADJECTIVES[normalize(place)] || '';
  const ruFacilityNeuter = adjective => adjective.replace(/ский$/, 'ское');

  const initial = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(saved) ? saved : 'uz';
    } catch (_) { return 'uz'; }
  })();

  const I18n = {
    supported: SUPPORTED,
    fallback: { kk: 'uz', ru: 'uz', en: 'uz', uz: null },
    language: initial,
    localeTags: LOCALE_TAGS,
    _sourceIndex: new Map(),

    init() {
      const uz = window.I18N_CATALOG?.uz || {};
      this._sourceIndex.clear();
      translationCache.clear();
      for (const [key, value] of Object.entries(uz)) {
        const normalized = normalize(value);
        if (normalized && !this._sourceIndex.has(normalized)) this._sourceIndex.set(normalized, key);
      }
      document.documentElement.lang = this.language;
      document.documentElement.dataset.locale = this.language;
      if (!window.__i18nNativeDialogs) {
        window.__i18nNativeDialogs = { alert: window.alert.bind(window), confirm: window.confirm.bind(window) };
        window.alert = message => window.__i18nNativeDialogs.alert(I18n.translateText(message));
        window.confirm = message => window.__i18nNativeDialogs.confirm(I18n.translateText(message));
      }
      this.observe();
      if (this.language !== 'uz') this.apply(document);
      window.dispatchEvent(new CustomEvent('i18n:ready', { detail: { language: this.language } }));
      return this;
    },

    t(key, params) {
      const source = window.I18N_CATALOG?.uz?.[key];
      let value = window.I18N_CATALOG?.[this.language]?.[key];
      // Never expose a translation key in production.
      if (value == null) value = source;
      if (value == null) return '';
      if (params) value = String(value).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
      return value;
    },

    keyForSource(source) {
      return this._sourceIndex.get(normalize(source));
    },

    translateText(source, language = this.language) {
      if (source == null || language === 'uz') return source == null ? '' : String(source);
      const raw = String(source);
      // Table renders repeat the same strings thousands of times.
      if (translationCache.language !== language) { translationCache.clear(); translationCache.language = language; }
      const cached = translationCache.get(raw);
      if (cached !== undefined) return cached;
      if (translationCache.size > 20000) translationCache.clear();
      const normalized = normalize(raw);
      const key = normalized && this._sourceIndex.get(normalized);
      // Only complete messages are safe to translate. Substring replacement
      // corrupts words and user data (for example Qabullar -> Поступлениеlar).
      // Dynamic messages must use t(key, params) at their render site.
      const result = key ? (window.I18N_CATALOG[language]?.[key] || window.I18N_CATALOG.uz[key] || raw) : raw;
      translationCache.set(raw, result);
      return result;
    },

    // Display-only: never use this result for option values, queries or writes.
    facilityName(name, language = this.language) {
      const full = this.facilityFullName(name, language);
      if (language !== 'ru') return full;
      const fixed = {
        'Республиканский специализированный научно-практический медицинский центр хирургии имени академика В. Вахидова': 'РСНПМЦХ им. акад. В. Вахидова',
        'Республиканский специализированный научно-практический медицинский центр кардиологии': 'РСНПМЦ кардиологии',
        'Республиканский научный центр экстренной медицинской помощи': 'РНЦЭМП',
        'Городская клиническая больница скорой медицинской помощи': 'ГКБСМП',
        'Национальный медицинский центр': 'Национальный медцентр'
      };
      if (fixed[full]) return fixed[full];
      return full
        .replace(/ центр политравмы$/, ' ЦПТ')
        .replace(/ районное медицинское объединение( № \d+)?$/, ' РМО$1')
        .replace(/ городское медицинское объединение( № \d+)?$/, ' ГМО$1')
        .replace(/ областной многопрофильный медицинский центр$/, ' ОММЦ')
        .replace(/^Многопрофильная клиника Ферганского медицинского института общественного здоровья$/, 'Клиника ФМИОЗ')
        .replace(/ городская больница( № \d+)?$/, ' ГБ$1')
        .replace(/ городская центральная больница$/, ' ГЦБ')
        .replace(/ филиал Республиканского специализированного научно-практического медицинского центра кардиологии$/, ' филиал РСНПМЦ кардиологии')
        .replace(/ филиал Республиканского научного центра экстренной медицинской помощи$/, ' филиал РНЦЭМП')
        .replace(/^Республиканская клиническая больница № (\d+)$/, 'РКБ № $1')
        .replace(/^Городская клиническая больница № (\d+)$/, 'ГКБ № $1')
        .replace(/^Клиника № (\d+) Ташкентского государственного медицинского университета$/, 'Клиника ТГМУ № $1');
    },

    facilityFullName(name, language = this.language) {
      const raw = String(name ?? '').trim();
      const parsed = normalize(raw);
      if (language === 'uz' || !raw) return raw;
      const exact = this.translateText(raw, language);
      if (exact !== raw) return exact;
      // These patterns denote institution names, not arbitrary patient or doctor free text.
      const russianPlaces = {
        Andijon: 'Андижан', Buxoro: 'Бухара', Jizzax: 'Джизак', Navoiy: 'Навои',
        Namangan: 'Наманган', Samarqand: 'Самарканд', Surxondaryo: 'Сурхандарья',
        Sirdaryo: 'Сырдарья', Toshkent: 'Ташкент', 'Toshkent viloyat': 'Ташкентская область',
        Xorazm: 'Хорезм', Qashqadaryo: 'Кашкадарья',
        "Farg'ona": 'Фергана', "Qoraqalpog'iston": 'Каракалпакстан',
        Payariq: 'Пайарык', Qorasuv: 'Карасу', Shovot: 'Шават', Xatirchi: 'Хатырчи',
        Zarafshon: 'Зарафшан', "Yakkabog'": 'Яккабаг', Zomin: 'Заамин',
        Ohangaron: 'Ахангаран', Ishtixon: 'Иштыхан', "Bulung'ur": 'Булунгур',
        Urgut: 'Ургут', Quva: 'Кува', "Bog'ot": 'Багат', Mirzaobod: 'Мирзаабад',
        Chirchiq: 'Чирчик', "Marg'ilon": 'Маргилан', "Qo'shko'pir": 'Кошкупыр',
        "Bo'stonliq": 'Бостанлык', Koson: 'Касан'
      };
      const toCyrillic = value => {
        const normalized = value.replace(/[‘’ʻʼ`]/g, "'");
        if (russianPlaces[normalized]) return russianPlaces[normalized];
        const digraphs = { "o'": 'о', "g'": 'г', sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ng: 'нг' };
        const letters = { a:'а', b:'б', d:'д', e:'е', f:'ф', g:'г', h:'х', i:'и', j:'дж', k:'к', l:'л', m:'м', n:'н', o:'о', p:'п', q:'к', r:'р', s:'с', t:'т', u:'у', v:'в', x:'х', y:'й', z:'з' };
        return normalized.replace(/o'|g'|sh|ch|yo|yu|ya|ng|[a-z]/gi, part => {
          const lower = part.toLowerCase();
          const mapped = digraphs[lower] || letters[lower] || part;
          return part[0] === part[0].toUpperCase() ? mapped[0].toUpperCase() + mapped.slice(1) : mapped;
        });
      };
      const placeName = place => language === 'ru' ? toCyrillic(place) : place;
      const canonical = typeof APP_CONFIG !== 'undefined' && Object.values(APP_CONFIG.MUASSASALAR || {}).some(list => list.includes(raw));
      const cardiology = parsed.match(/^Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi(?: (.+?)(?: viloyati)? filiali)?$/i);
      if (cardiology) {
        const base = {
          ru: 'Республиканский специализированный научно-практический медицинский центр кардиологии',
          en: 'Republican Specialized Scientific and Practical Medical Centre of Cardiology',
          kk: 'Respublikalıq qánigelestirilgen kardiologiya ilimiy-ámeliy medicina orayı'
        }[language];
        if (!cardiology[1]) return base || raw;
        const place = placeName(cardiology[1]);
        const adjective = ruFacilityAdjective(cardiology[1]);
        return language === 'ru' ? (adjective
          ? `${adjective} филиал Республиканского специализированного научно-практического медицинского центра кардиологии`
          : raw)
          : language === 'en' ? `${place} branch of the ${base}` : `${base} — ${place} filialı`;
      }
      if (/^Akademik V\.?\s*Vohidov nomidagi Respublika ixtisoslashtirilgan ilmiy-amaliy xirurgiya markazi$/i.test(raw)) {
        return {
          ru: 'Республиканский специализированный научно-практический медицинский центр хирургии имени академика В. Вахидова',
          en: 'Republican Specialized Scientific and Practical Medical Centre of Surgery named after Academician V. Vakhidov',
          kk: 'Akademik V. Vohidov atındaǵı Respublikalıq qánigelestirilgen xirurgiya ilimiy-ámeliy medicina orayı'
        }[language] || raw;
      }
      if (/^Milliy tibbiyot markazi$/i.test(raw)) return {
        ru: 'Национальный медицинский центр', en: 'National Medical Centre', kk: 'Milliy medicina orayı'
      }[language] || raw;
      const regionalCentre = parsed.match(/^(.+?) viloyat(?:i)? ko'p tarmoqli tibbiyot markazi$/i);
      if (regionalCentre) {
        const place = regionalCentre[1];
        const adjective = ruFacilityAdjective(place);
        if (language === 'ru' && adjective) return `${adjective} областной многопрофильный медицинский центр`;
        if (language === 'en') return `${place} Regional Multidisciplinary Medical Centre`;
        if (language === 'kk') return `${place} wálayatlıq kóp tarmaqlı medicina orayı`;
      }
      const localCityHospital = parsed.match(/^(.+?)(?:-(\d+))?-shahar shifoxonasi$/i);
      if (localCityHospital && ruFacilityAdjective(localCityHospital[1])) {
        const place = localCityHospital[1];
        const number = localCityHospital[2];
        if (language === 'ru') return `${ruFacilityAdjective(place).replace(/ский$/, 'ская')} городская больница${number ? ` № ${number}` : ''}`;
        if (language === 'en') return `${place} City Hospital${number ? ` No. ${number}` : ''}`;
        if (language === 'kk') return `${place} qala emlewxanası${number ? ` № ${number}` : ''}`;
      }
      const cityCentralHospital = parsed.match(/^(.+?) shahar markaziy shifoxonasi$/i);
      if (cityCentralHospital && ruFacilityAdjective(cityCentralHospital[1])) {
        const place = cityCentralHospital[1];
        if (language === 'ru') return `${ruFacilityAdjective(place).replace(/ский$/, 'ская')} городская центральная больница`;
        if (language === 'en') return `${place} City Central Hospital`;
        if (language === 'kk') return `${place} qala oraylıq emlewxanası`;
      }
      const instituteClinic = parsed.match(/^Farg'ona jamoat salomatligi tibbiyot instituti \(FJSTI\) ko'p tarmoqli klinikasi$/i);
      if (instituteClinic) return {
        ru: 'Многопрофильная клиника Ферганского медицинского института общественного здоровья',
        en: 'Multidisciplinary Clinic of the Fergana Medical Institute of Public Health',
        kk: 'Farg‘ona jámiyet salamatlıǵı medicina institutınıń kóp tarmaqlı klinikası'
      }[language] || raw;
      const structured = raw.match(/^(.+?) (?:TTB|ShTB|politravma markazi)$/i);
      const structuredPlace = structured?.[1]?.replace(/-\d+$/, '');
      if (!canonical && !/^RSHTYOIM .+ filiali$/.test(raw) && !ruFacilityAdjective(structuredPlace)) return raw;
      const branch = raw.match(/^RSHTYOIM (.+) filiali$/);
      if (branch) {
        const place = placeName(branch[1]);
        if (language === 'ru') {
          const adjective = ruFacilityAdjective(branch[1]);
          return adjective ? `${adjective} филиал Республиканского научного центра экстренной медицинской помощи`
            : raw;
        }
        if (language === 'en') return `${place} branch of the Republican Scientific Centre for Emergency Medical Care`;
        if (language === 'kk') return `${place} Respublikalıq tez medicinalıq járdem ilimiy orayı filialı`;
      }
      const district = raw.match(/^(.+) (TTB|ShTB)$/);
      if (district) {
        const numbered = district[1].match(/^(.*?)-(\d+)$/);
        const place = placeName(district[1]);
        const type = district[2] === 'TTB' ? 0 : 1;
        const adjective = ruFacilityAdjective(numbered ? numbered[1] : district[1]);
        const number = numbered ? ` № ${numbered[2]}` : '';
        return language === 'ru' ? (adjective
          ? `${ruFacilityNeuter(adjective)} ${type ? 'городское' : 'районное'} медицинское объединение${number}`
          : raw)
          : language === 'en' ? `${place} ${type ? 'City' : 'District'} Medical Association`
          : `${place} ${type ? 'qala' : 'rayon'} medicina birlespesi`;
      }
      const trauma = raw.match(/^(.+) politravma markazi$/i);
      if (trauma) {
        const place = placeName(trauma[1]);
        const adjective = ruFacilityAdjective(trauma[1]);
        return language === 'ru' ? (adjective ? `${adjective} центр политравмы` : raw)
          : language === 'en' ? `${place} Polytrauma Centre` : `${place} politravma orayı`;
      }
      const cityHospital = raw.match(/^(\d+)-sonli Shahar Klinik Shifoxonasi$/);
      if (cityHospital) return language === 'ru' ? `Городская клиническая больница № ${cityHospital[1]}`
        : language === 'en' ? `City Clinical Hospital No. ${cityHospital[1]}` : `${cityHospital[1]}-sanlı qala klinikalıq emlewxanası`;
      const universityClinic = raw.match(/^TDTU (\d+)-sonli klinikasi$/);
      if (universityClinic) return language === 'ru' ? `Клиника № ${universityClinic[1]} Ташкентского государственного медицинского университета`
        : language === 'en' ? `Tashkent State Medical University Clinic No. ${universityClinic[1]}`
        : `Tashkent mámleketlik medicina universitetiniń ${universityClinic[1]}-sanlı klinikası`;
      return raw;
    },

    monthLabel(label, language = this.language) {
      const match = String(label ?? '').match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!match) return label;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const aliases = { Yan: 0, Fev: 1, Mart: 2, Apr: 3, May: 4, Iyun: 5, Iyul: 6, Avg: 7, Sen: 8, Sent: 8, Okt: 9, Noy: 10, Dek: 11 };
      const index = months.indexOf(match[1]) >= 0 ? months.indexOf(match[1]) : aliases[match[1]];
      if (index == null) return label;
      return `${window.I18N_CATALOG?.[language]?.[`month.short.${index + 1}`] || match[1]} ${match[2]}`;
    },

    setLanguage(language, options = {}) {
      if (!SUPPORTED.includes(language)) language = 'uz';
      if (language === this.language && !options.force) return;
      this.language = language;
      try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
      document.documentElement.lang = language;
      document.documentElement.dataset.locale = language;
      document.title = this.t('auth.title');
      window.dispatchEvent(new CustomEvent('i18n:change', { detail: { language } }));
      // Chrome outside the re-rendered route (toasts, modals) is only
      // translated here, since the observer is idle while Uzbek is active.
      this.apply(document);
      // Router is a top-level const, not a window property in classic scripts.
      if (options.rerender !== false && typeof Router !== 'undefined' && Router._current && Router.routes?.[Router._current]) {
        const draftPages = {
          'insult-yangi': typeof InsultYangiPage !== 'undefined' ? InsultYangiPage : null,
          'infarkt-yangi': typeof InfarktYangiPage !== 'undefined' ? InfarktYangiPage : null
        };
        const draftPage = draftPages[Router._current];
        if (draftPage && document.getElementById('step-body')) {
          draftPage.saveCurrentStep();
          draftPage.render({ preserveDraft: true });
        } else {
          Router.go(Router._current, Router._params || {});
        }
      }
    },

    renderSwitcher(compact = false) {
      const label = this.t('common.language');
      const names = { uz: 'UZ', ru: 'RU', en: 'EN', kk: 'KK' };
      return `<label class="language-switcher${compact ? ' language-switcher--compact' : ''}" title="${label}">
        <span class="sr-only">${label}</span>
        <select aria-label="${label}" onchange="I18n.setLanguage(this.value)">
          ${SUPPORTED.map(code => `<option value="${code}"${code === this.language ? ' selected' : ''}>${names[code]}</option>`).join('')}
        </select>
      </label>`;
    },

    formatDate(value, options = {}) {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat(LOCALE_TAGS[this.language], options).format(date);
    },

    formatDateTime(value, options = {}) {
      return this.formatDate(value, { dateStyle: 'medium', timeStyle: 'short', ...options });
    },

    formatNumber(value, options = {}) {
      return new Intl.NumberFormat(LOCALE_TAGS[this.language], options).format(value);
    },

    plural(count, unit = 'patient') {
      const forms = {
        patient: {
          uz: ['bemor', 'bemor'], kk: ['nawqas', 'nawqas'], en: ['patient', 'patients'],
          ru: ['пациент', 'пациента', 'пациентов']
        }
      };
      const set = forms[unit] || forms.patient;
      let word;
      if (this.language === 'ru') {
        const mod10 = Math.abs(count) % 10, mod100 = Math.abs(count) % 100;
        word = mod10 === 1 && mod100 !== 11 ? set.ru[0]
          : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? set.ru[1] : set.ru[2];
      } else {
        const pair = set[this.language] || set.uz;
        word = count === 1 ? pair[0] : pair[1];
      }
      return `${this.formatNumber(count)} ${word}`;
    },

    enumLabel(value) {
      const keys = {
        ischemic:'stroke.ischemic', hemorrhagic:'stroke.hemorrhagic', tia:'stroke.tia', stemi:'infarct.stemi',
        nstemi:'infarct.nstemi', yes:'common.yes', no:'common.no', completed:'status.completed',
        pending:'status.pending', referred:'status.referred', transferred:'status.transferred', alive:'status.alive',
        dead:'status.dead', super_admin:'roles.super_admin', admin:'roles.admin', user:'roles.user'
      };
      return keys[value] ? this.t(keys[value]) : value;
    },

    friendlyError(error) {
      const message = String(error?.message || error || '');
      if (/duplicate key|unique constraint|23505/i.test(message)) return this.t('validation.duplicate');
      if (/network|fetch|connection|offline/i.test(message)) return this.t('validation.network');
      if (/jwt|token|401|session|expired/i.test(message)) return this.t('auth.sessionExpired');
      return this.t('validation.generic');
    },

    _skip(node) {
      const parent = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      return !parent || !!parent.closest(SKIP_SELECTOR);
    },

    // Callers guarantee the node is outside skipped subtrees.
    _translateTextNode(node) {
      let source = originalText.get(node);
      if (source === undefined) {
        source = node.nodeValue;
        if (!source || !source.trim()) return;
        originalText.set(node, source);
      }
      const translated = this.translateText(source);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    },

    _translateAttributes(element) {
      const explicitKey = element.getAttribute('data-i18n');
      if (explicitKey) {
        const value = this.t(explicitKey);
        if (element.textContent !== value) element.textContent = value;
      }
      let originals = originalAttributes.get(element);
      for (const attribute of TRANSLATED_ATTRIBUTES) {
        if (!element.hasAttribute(attribute)) continue;
        if (!originals) { originals = {}; originalAttributes.set(element, originals); }
        if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
        const explicitAttributeKey = element.getAttribute(`data-i18n-${attribute}`);
        const value = explicitAttributeKey ? this.t(explicitAttributeKey) : this.translateText(originals[attribute]);
        if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
      }
    },

    // One TreeWalker pass; skipped subtrees are rejected wholesale instead of
    // running closest() for every element and text node.
    apply(root = document) {
      if (translating || !root || typeof root.nodeType !== 'number') return;
      const start = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
      if (!start || this._skip(start)) return;
      translating = true;
      try {
        if (start.nodeType === Node.TEXT_NODE) { this._translateTextNode(start); return; }
        if (start.nodeType !== Node.ELEMENT_NODE) return;
        const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
          acceptNode: node => node.nodeType === Node.ELEMENT_NODE && node.matches(SKIP_SELECTOR)
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        for (let node = start; node; node = walker.nextNode()) {
          if (node.nodeType === Node.TEXT_NODE) this._translateTextNode(node);
          else this._translateAttributes(node);
        }
      } finally { translating = false; }
    },

    observe() {
      if (observer || !document.documentElement) return;
      observer = new MutationObserver(records => {
        // Uzbek is the source language: freshly rendered markup is already final.
        if (translating || this.language === 'uz') return;
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.isConnected && (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)) this.apply(node);
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    },

    localizeChartConfig(config) {
      const seen = new WeakSet();
      const visit = value => {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        for (const key of Object.keys(value)) {
          if (typeof value[key] === 'string' && ['label','text','title'].includes(key)) value[key] = this.translateText(value[key]);
          else if (Array.isArray(value[key]) && ['labels'].includes(key)) value[key] = value[key].map(item => typeof item === 'string' ? this.translateText(item) : item);
          else visit(value[key]);
        }
      };
      visit(config);
      return config;
    },

    installChartAdapter() {
      const NativeChart = window.Chart;
      if (!NativeChart || NativeChart.__i18nWrapped) return;
      const adapter = new Proxy(NativeChart, {
        construct(target, args) {
          if (args[1]) I18n.localizeChartConfig(args[1]);
          return Reflect.construct(target, args, target);
        }
      });
      Object.defineProperty(adapter, '__i18nWrapped', { value: true });
      window.Chart = adapter;
    }
  };

  window.I18n = I18n;
  window.t = (key, params) => I18n.t(key, params);
})();
