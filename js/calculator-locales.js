// Reviewed clinical scale copy. This extends the existing catalog only; scores and formulas live elsewhere.
(function () {
  const q = {
    uz: {
      '1a':['1A. Ong darajasi','Hushida, faol','Uyquchan, yengil turtkiga uyg‘onadi','Stupor, faqat kuchli og‘riqqa javob beradi','Koma, hech qanday javob yo‘q'],
      '1b':['1B. Savollarga javob (joriy oy va yoshini so‘rash)','Ikkalasiga ham to‘g‘ri javob','Bittasiga to‘g‘ri javob','Ikkalasiga ham noto‘g‘ri javob'],
      '1c':['1C. Buyruqlarni bajarish (ko‘zni yumish/ochish, qo‘lni qisish)','Ikkala buyruqni ham to‘g‘ri bajaradi','Bitta buyruqni to‘g‘ri bajaradi','Buyruqlarni bajara olmaydi'],
      '2':['2. Nigoh harakati','Normal','Qisman nigoh parezi','Majburiy nigoh yoki to‘liq nigoh parezi'],
      '3':['3. Ko‘rish maydoni','Ko‘rish maydoni normal','Qisman gemianopsiya','To‘liq gemianopsiya','Ikki tomonlama ko‘rlik'],
      '4':['4. Yuz mushaklari parezi','Normal, simmetrik harakat','Yengil falajlik','Qisman falajlik','Bir yoki ikki tomonlama to‘liq falajlik'],
      '5a':['5A. Chap qo‘l motor funksiyasi (10 soniya)','Qo‘l 10 soniya ushlab turiladi','Qo‘l pastlaydi, lekin to‘shakka tegmaydi','Tortishish kuchiga qarshi harakat qila olmaydi','Tortishish kuchi bartaraf etilganda harakat bor','Harakat yo‘q'],
      '5b':['5B. O‘ng qo‘l motor funksiyasi (10 soniya)','Qo‘l 10 soniya ushlab turiladi','Qo‘l pastlaydi, lekin to‘shakka tegmaydi','Tortishish kuchiga qarshi harakat qila olmaydi','Tortishish kuchi bartaraf etilganda harakat bor','Harakat yo‘q'],
      '6a':['6A. Chap oyoq motor funksiyasi (5 soniya)','Oyoq 5 soniya ushlab turiladi','Oyoq pastlaydi, lekin to‘shakka tegmaydi','Tortishish kuchiga qarshi harakat qila olmaydi','Tortishish kuchi bartaraf etilganda harakat bor','Harakat yo‘q'],
      '6b':['6B. O‘ng oyoq motor funksiyasi (5 soniya)','Oyoq 5 soniya ushlab turiladi','Oyoq pastlaydi, lekin to‘shakka tegmaydi','Tortishish kuchiga qarshi harakat qila olmaydi','Tortishish kuchi bartaraf etilganda harakat bor','Harakat yo‘q'],
      '7':['7. Qo‘l-oyoq ataksiyasi','Ataksiya yo‘q','Bir qo‘l yoki oyoqda mavjud','Ikki qo‘l yoki oyoqda mavjud'],
      '8':['8. Sezgi','Normal','Yengil yoki o‘rtacha sezgi yo‘qolishi','Og‘ir yoki to‘liq sezgi yo‘qolishi'],
      '9':['9. Eng yaxshi nutq','Afaziya yo‘q','Yengil yoki o‘rtacha afaziya','Og‘ir afaziya','Mutizm yoki global afaziya'],
      '10':['10. Dizartriya','Normal artikulyatsiya','Yengil yoki o‘rtacha dizartriya','Og‘ir dizartriya yoki anartriya'],
      '11':['11. Ekstinksiya va e’tiborsizlik','Buzilish yo‘q','Bitta sensor modalitetda e’tiborsizlik','Chuqur gemie’tiborsizlik yoki bir nechta modalitetda ekstinksiya']
    },
    ru: {
      '1a':['1A. Уровень сознания','В сознании, активен','Сонливость; пробуждается при лёгкой стимуляции','Ступор; реагирует только на сильную болевую стимуляцию','Кома; реакции отсутствуют'],
      '1b':['1B. Ответы на вопросы (текущий месяц и возраст)','Правильно отвечает на оба вопроса','Правильно отвечает на один вопрос','Не отвечает правильно ни на один вопрос'],
      '1c':['1C. Выполнение команд (закрыть/открыть глаза, сжать кисть)','Правильно выполняет обе команды','Правильно выполняет одну команду','Не выполняет ни одной команды'],
      '2':['2. Движения глаз','Норма','Частичный парез взора','Фиксированная девиация или полный парез взора'],
      '3':['3. Поля зрения','Поля зрения сохранены','Частичная гемианопсия','Полная гемианопсия','Двусторонняя слепота'],
      '4':['4. Парез лицевой мускулатуры','Нормальные симметричные движения','Лёгкий парез','Частичный парез','Полный односторонний или двусторонний паралич'],
      '5a':['5A. Двигательная функция левой руки (10 секунд)','Удерживает руку 10 секунд','Рука опускается, но не касается опоры','Не преодолевает силу тяжести','Движение возможно без преодоления силы тяжести','Движения отсутствуют'],
      '5b':['5B. Двигательная функция правой руки (10 секунд)','Удерживает руку 10 секунд','Рука опускается, но не касается опоры','Не преодолевает силу тяжести','Движение возможно без преодоления силы тяжести','Движения отсутствуют'],
      '6a':['6A. Двигательная функция левой ноги (5 секунд)','Удерживает ногу 5 секунд','Нога опускается, но не касается опоры','Не преодолевает силу тяжести','Движение возможно без преодоления силы тяжести','Движения отсутствуют'],
      '6b':['6B. Двигательная функция правой ноги (5 секунд)','Удерживает ногу 5 секунд','Нога опускается, но не касается опоры','Не преодолевает силу тяжести','Движение возможно без преодоления силы тяжести','Движения отсутствуют'],
      '7':['7. Атаксия конечностей','Атаксии нет','Атаксия в одной конечности','Атаксия в двух конечностях'],
      '8':['8. Чувствительность','Норма','Лёгкое или умеренное снижение чувствительности','Тяжёлое или полное выпадение чувствительности'],
      '9':['9. Речь','Афазии нет','Лёгкая или умеренная афазия','Тяжёлая афазия','Мутизм или глобальная афазия'],
      '10':['10. Дизартрия','Нормальная артикуляция','Лёгкая или умеренная дизартрия','Тяжёлая дизартрия или анартрия'],
      '11':['11. Угасание и невнимание','Нарушений нет','Невнимание в одной сенсорной модальности','Глубокое геминевнимание или угасание в нескольких модальностях']
    },
    en: {
      '1a':['1A. Level of consciousness','Alert; keenly responsive','Not alert; arousable by minor stimulation','Not alert; requires repeated or painful stimulation','Responds only with reflex motor or autonomic effects'],
      '1b':['1B. LOC questions (current month and age)','Answers both questions correctly','Answers one question correctly','Answers neither question correctly'],
      '1c':['1C. LOC commands (open/close eyes, grip and release hand)','Performs both tasks correctly','Performs one task correctly','Performs neither task correctly'],
      '2':['2. Best gaze','Normal','Partial gaze palsy','Forced deviation or total gaze paresis'],
      '3':['3. Visual fields','No visual loss','Partial hemianopia','Complete hemianopia','Bilateral hemianopia'],
      '4':['4. Facial palsy','Normal symmetrical movements','Minor paralysis','Partial paralysis','Complete unilateral or bilateral paralysis'],
      '5a':['5A. Motor arm — left (10 seconds)','No drift for 10 seconds','Drift; does not hit the bed','Some effort against gravity','No effort against gravity','No movement'],
      '5b':['5B. Motor arm — right (10 seconds)','No drift for 10 seconds','Drift; does not hit the bed','Some effort against gravity','No effort against gravity','No movement'],
      '6a':['6A. Motor leg — left (5 seconds)','No drift for 5 seconds','Drift; does not hit the bed','Some effort against gravity','No effort against gravity','No movement'],
      '6b':['6B. Motor leg — right (5 seconds)','No drift for 5 seconds','Drift; does not hit the bed','Some effort against gravity','No effort against gravity','No movement'],
      '7':['7. Limb ataxia','Absent','Present in one limb','Present in two limbs'],
      '8':['8. Sensory','Normal','Mild-to-moderate sensory loss','Severe or total sensory loss'],
      '9':['9. Best language','No aphasia','Mild-to-moderate aphasia','Severe aphasia','Mute or global aphasia'],
      '10':['10. Dysarthria','Normal articulation','Mild-to-moderate dysarthria','Severe dysarthria or anarthria'],
      '11':['11. Extinction and inattention','No abnormality','Inattention in one sensory modality','Profound hemi-inattention or extinction in more than one modality']
    },
    kk: {
      '1a':['1A. Sana dárejesi','Esinde, belsendi','Uyqıshıl; jeńil stimulyaciyada oyanadı','Stupor; tek kúshli awırıw stimulyaciyasına juwap beredi','Koma; juwap joq'],
      '1b':['1B. Sorawlarǵa juwap (házirgi ay hám jas)','Eki sorawǵa da durıs juwap beredi','Bir sorawǵa durıs juwap beredi','Eki sorawǵa da durıs juwap bermeydi'],
      '1c':['1C. Buyrıqlardı orınlaw (kózdi jumıw/ashıw, qoldı qısıw)','Eki buyrıqtı da durıs orınlaydı','Bir buyrıqtı durıs orınlaydı','Buyrıqlardı orınlamaydı'],
      '2':['2. Kóz qarası háreketi','Normal','Qarastıń bólek parezi','Májbúriy qaras yamasa tolıq parez'],
      '3':['3. Kóriw maydanı','Kóriw maydanı normal','Bólek gemianopsiya','Tolıq gemianopsiya','Eki tárepleme soqırlıq'],
      '4':['4. Bet bulshıq etleri parezi','Normal, simmetriyalı háreket','Jeńil parez','Bólek parez','Bir yamasa eki tárepleme tolıq paralich'],
      '5a':['5A. Shep qol motor funkciyası (10 sekund)','Qol 10 sekund uslap turıladı','Qol tómenleydi, biraq tósekke tiymeydi','Awırlıq kúshine qarsı háreket ete almaydı','Awırlıq kúshi joqta háreket bar','Háreket joq'],
      '5b':['5B. Oń qol motor funkciyası (10 sekund)','Qol 10 sekund uslap turıladı','Qol tómenleydi, biraq tósekke tiymeydi','Awırlıq kúshine qarsı háreket ete almaydı','Awırlıq kúshi joqta háreket bar','Háreket joq'],
      '6a':['6A. Shep ayaq motor funkciyası (5 sekund)','Ayaq 5 sekund uslap turıladı','Ayaq tómenleydi, biraq tósekke tiymeydi','Awırlıq kúshine qarsı háreket ete almaydı','Awırlıq kúshi joqta háreket bar','Háreket joq'],
      '6b':['6B. Oń ayaq motor funkciyası (5 sekund)','Ayaq 5 sekund uslap turıladı','Ayaq tómenleydi, biraq tósekke tiymeydi','Awırlıq kúshine qarsı háreket ete almaydı','Awırlıq kúshi joqta háreket bar','Háreket joq'],
      '7':['7. Qol-ayaq ataksiyası','Ataksiya joq','Bir qol yamasa ayaqta bar','Eki qol yamasa ayaqta bar'],
      '8':['8. Sezgi','Normal','Jeńil yamasa ortasha sezgi joǵalıwı','Awır yamasa tolıq sezgi joǵalıwı'],
      '9':['9. Eń jaqsı sóylew','Afaziya joq','Jeńil yamasa ortasha afaziya','Awır afaziya','Mutizm yamasa global afaziya'],
      '10':['10. Dizartriya','Normal artikulyaciya','Jeńil yamasa ortasha dizartriya','Awır dizartriya yamasa anartriya'],
      '11':['11. Ekstinkciya hám itibar buzılıwı','Buzılıw joq','Bir sensor modalitetinde itibar buzılıwı','Tereń gemiitibarsızlıq yamasa birneshe modalitette ekstinkciya']
    }
  };

  const gcs = {
    uz: {
      eye:['1. Ko‘zlarni ochish','O‘z-o‘zidan','Ovozga','Og‘riqqa','Javob yo‘q'],
      verbal:['2. Nutq reaksiyasi','Orientatsiyalangan','Chalkash nutq','Nomaqbul so‘zlar','Tushunarsiz tovushlar','Javob yo‘q'],
      motor:['3. Harakat reaksiyasi','Buyruqlarni bajaradi','Og‘riqni lokalizatsiya qiladi','Og‘riqdan tortib oladi','Patologik bukilish','Patologik yozilish','Javob yo‘q']
    },
    ru: {
      eye:['1. Открывание глаз','Спонтанно','На обращённую речь','На боль','Реакции нет'],
      verbal:['2. Речевая реакция','Ориентирован','Спутанная речь','Неуместные слова','Нечленораздельные звуки','Реакции нет'],
      motor:['3. Двигательная реакция','Выполняет команды','Локализует боль','Отдёргивает конечность','Патологическое сгибание','Патологическое разгибание','Реакции нет']
    },
    en: {
      eye:['1. Eye opening','Spontaneous','To speech','To pain','No response'],
      verbal:['2. Verbal response','Oriented','Confused conversation','Inappropriate words','Incomprehensible sounds','No response'],
      motor:['3. Motor response','Obeys commands','Localises pain','Withdraws from pain','Abnormal flexion','Extension','No response']
    },
    kk: {
      eye:['1. Kózdi ashıw','Óz-ózinen','Dawısqa','Awırıwǵa','Juwap joq'],
      verbal:['2. Sóylew reakciyası','Orientaciyası saqlanǵan','Shatastırılǵan sóylew','Orınsız sózler','Túsiniksiz dawıslar','Juwap joq'],
      motor:['3. Háreket reakciyası','Buyrıqlardı orınlaydı','Awırıwdı lokalizaciyalaydı','Awırıwdan tartıp aladı','Patologiyalıq búgiliw','Patologiyalıq jazılıw','Juwap joq']
    }
  };

  for (const locale of ['uz','ru','en','kk']) {
    for (const [item, copy] of Object.entries(q[locale])) {
      I18N_CATALOG[locale][`nihss.${item}.title`] = copy[0];
      copy.slice(1).forEach((text, score) => { I18N_CATALOG[locale][`nihss.${item}.score${score}`] = text; });
    }
    for (const [component, copy] of Object.entries(gcs[locale])) {
      I18N_CATALOG[locale][`gcs.${component}.title`] = copy[0];
      const scores = component === 'eye' ? [4,3,2,1] : component === 'verbal' ? [5,4,3,2,1] : [6,5,4,3,2,1];
      copy.slice(1).forEach((text, index) => { I18N_CATALOG[locale][`gcs.${component}.score${scores[index]}`] = text; });
    }
  }

  Object.assign(I18N_CATALOG.uz, {'nihss.title':'NIHSS kalkulyatori','gcs.title':'Glazgo koma shkalasi (GCS)','calc.saveResult':'Natijani saqlash'});
  Object.assign(I18N_CATALOG.ru, {'nihss.title':'Шкала NIHSS','gcs.title':'Шкала комы Глазго (GCS)','calc.saveResult':'Сохранить результат'});
  Object.assign(I18N_CATALOG.en, {'nihss.title':'NIHSS calculator','gcs.title':'Glasgow Coma Scale (GCS)','calc.saveResult':'Save result'});
  Object.assign(I18N_CATALOG.kk, {'nihss.title':'NIHSS kalkulyatorı','gcs.title':'Glazgo koma shkalası (GCS)','calc.saveResult':'Nátiyjeni saqlaw'});

  Object.assign(I18N_CATALOG.uz, {
    'calc.points':'{count} ball','calc.example':'Masalan: {value}','risk.low':'Past xavf','risk.medium':'O‘rta xavf','risk.high':'Yuqori xavf',
    'grace.title':'GRACE skori kalkulyatori (NSTEMI)','grace.description':'GRACE 2.0 — NSTEMI bemorlarda gospital ichidagi o‘lim xavfini baholash shkalasi','grace.result':'GRACE skori natijasi','grace.hospitalMortality':'Gospital o‘lim xavfi: {percent}','grace.age':'Yosh (yil)','grace.heartRate':'Puls (zarbalar/min)','grace.sbp':'Sistolik arterial bosim (mmHg)','grace.creatinine':'Qon zardobidagi kreatinin (mg/dL)','grace.killip':'Killip klassifikatsiyasi','grace.arrest':'Yurak to‘xtashi kuzatilganmi?','grace.arrestHelp':'Qabul paytida yoki undan oldin yurak to‘xtashi','grace.stDeviation':'ST segmenti deviatsiyasi','grace.stDeviationHelp':'ECG da ST ko‘tarilishi yoki pasayishi','grace.markers':'Kardiomarkerlar ko‘tarilgan','grace.markersHelp':'Troponin yoki KFK-MB yuqori','grace.fillRequired':'Barcha majburiy maydonlarni to‘ldiring','grace.fillRequiredDetailed':'Barcha majburiy maydonlarni (yosh, puls, arterial bosim, kreatinin) to‘ldiring!','grace.recommendation.low':'Konservativ yondashuv mumkin','grace.recommendation.medium':'Erta invaziv strategiya — 72 soat ichida','grace.recommendation.high':'Erta invaziv strategiya — 24 soat ichida (og‘ir holatda < 2 soat)',
    'killip.class1':'Killip I (belgilar yo‘q)','killip.class2':'Killip II (yengil yurak yetishmovchiligi)','killip.class3':'Killip III (o‘pka shishi)','killip.class4':'Killip IV (kardiogen shok)'
  });
  Object.assign(I18N_CATALOG.ru, {
    'calc.points':'{count} баллов','calc.example':'Например: {value}','risk.low':'Низкий риск','risk.medium':'Средний риск','risk.high':'Высокий риск',
    'grace.title':'Калькулятор шкалы GRACE (NSTEMI)','grace.description':'GRACE 2.0 — оценка риска внутрибольничной смерти у пациентов с NSTEMI','grace.result':'Результат по шкале GRACE','grace.hospitalMortality':'Риск внутрибольничной смерти: {percent}','grace.age':'Возраст (лет)','grace.heartRate':'Пульс (уд/мин)','grace.sbp':'Систолическое артериальное давление (mmHg)','grace.creatinine':'Креатинин сыворотки (mg/dL)','grace.killip':'Классификация Killip','grace.arrest':'Была остановка сердца?','grace.arrestHelp':'Остановка сердца при поступлении или до него','grace.stDeviation':'Отклонение сегмента ST','grace.stDeviationHelp':'Подъём или депрессия ST на ECG','grace.markers':'Повышены кардиомаркеры','grace.markersHelp':'Повышен тропонин или КФК-МВ','grace.fillRequired':'Заполните все обязательные поля','grace.fillRequiredDetailed':'Заполните обязательные поля: возраст, пульс, артериальное давление и креатинин!','grace.recommendation.low':'Возможно консервативное ведение','grace.recommendation.medium':'Ранняя инвазивная стратегия в течение 72 часов','grace.recommendation.high':'Ранняя инвазивная стратегия в течение 24 часов (при нестабильности — < 2 часов)',
    'killip.class1':'Killip I (признаков недостаточности нет)','killip.class2':'Killip II (лёгкая сердечная недостаточность)','killip.class3':'Killip III (отёк лёгких)','killip.class4':'Killip IV (кардиогенный шок)'
  });
  Object.assign(I18N_CATALOG.en, {
    'calc.points':'{count} points','calc.example':'Example: {value}','risk.low':'Low risk','risk.medium':'Intermediate risk','risk.high':'High risk',
    'grace.title':'GRACE score calculator (NSTEMI)','grace.description':'GRACE 2.0 — in-hospital mortality risk assessment for patients with NSTEMI','grace.result':'GRACE score result','grace.hospitalMortality':'In-hospital mortality risk: {percent}','grace.age':'Age (years)','grace.heartRate':'Heart rate (bpm)','grace.sbp':'Systolic blood pressure (mmHg)','grace.creatinine':'Serum creatinine (mg/dL)','grace.killip':'Killip classification','grace.arrest':'Cardiac arrest?','grace.arrestHelp':'Cardiac arrest at or before admission','grace.stDeviation':'ST-segment deviation','grace.stDeviationHelp':'ST elevation or depression on ECG','grace.markers':'Elevated cardiac markers','grace.markersHelp':'Elevated troponin or CK-MB','grace.fillRequired':'Complete all required fields','grace.fillRequiredDetailed':'Complete the required age, heart rate, blood pressure and creatinine fields!','grace.recommendation.low':'Conservative management may be considered','grace.recommendation.medium':'Early invasive strategy within 72 hours','grace.recommendation.high':'Early invasive strategy within 24 hours (< 2 hours if unstable)',
    'killip.class1':'Killip I (no signs of heart failure)','killip.class2':'Killip II (mild heart failure)','killip.class3':'Killip III (pulmonary oedema)','killip.class4':'Killip IV (cardiogenic shock)'
  });
  Object.assign(I18N_CATALOG.kk, {
    'calc.points':'{count} ball','calc.example':'Mısalı: {value}','risk.low':'Tómen qáwip','risk.medium':'Ortasha qáwip','risk.high':'Joqarı qáwip',
    'grace.title':'GRACE skorı kalkulyatorı (NSTEMI)','grace.description':'GRACE 2.0 — NSTEMI nawqaslarında gospital ishindegi ólim qáwpin bahalaw shkalası','grace.result':'GRACE skorı nátiyjesi','grace.hospitalMortality':'Gospital ólim qáwpi: {percent}','grace.age':'Jas (jıl)','grace.heartRate':'Puls (soǵıw/min)','grace.sbp':'Sistolikalıq arterial basım (mmHg)','grace.creatinine':'Qan zardabındaǵı kreatinin (mg/dL)','grace.killip':'Killip klassifikaciyası','grace.arrest':'Júrek toqtawı baqlanǵan ba?','grace.arrestHelp':'Qabıllaw waqtında yamasa onnan aldın júrek toqtawı','grace.stDeviation':'ST segmenti deviaciyası','grace.stDeviationHelp':'ECG da ST kóteriliwi yamasa tómenlewi','grace.markers':'Kardiomarkerler joqarılaǵan','grace.markersHelp':'Troponin yamasa KFK-MB joqarı','grace.fillRequired':'Barlıq májbúriy maydanlardı toldırıń','grace.fillRequiredDetailed':'Jas, puls, arterial basım hám kreatinin maydanların toldırıń!','grace.recommendation.low':'Konservativ jantasıw múmkin','grace.recommendation.medium':'72 saat ishinde erte invaziv strategiya','grace.recommendation.high':'24 saat ishinde erte invaziv strategiya (awır jaǵdayda < 2 saat)',
    'killip.class1':'Killip I (belgiler joq)','killip.class2':'Killip II (jeńil júrek jetispewshiligi)','killip.class3':'Killip III (ókpe isiwi)','killip.class4':'Killip IV (kardiogen shok)'
  });
})();
