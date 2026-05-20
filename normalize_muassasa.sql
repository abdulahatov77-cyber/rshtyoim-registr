-- ================================================================
-- MUASSASA NOMLARINI NORMALIZATSIYA QILISH
-- Barcha ikki jadvalda (infarkt_qabul va insult_qabul) ishlatiladi
-- ================================================================

-- ── ANDIJON VILOYATI ─────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Andijon filiali'
WHERE viloyat = 'Andijon viloyati' AND muassasa != 'RSHTYOIM Andijon filiali'
  AND (muassasa ILIKE '%РШТЕИМ%АФ%' OR muassasa ILIKE '%РШТЁИМ%АФ%'
    OR muassasa ILIKE '%РШТЕИМ%АФ%' OR muassasa ILIKE '%РШТЕИАФ%'
    OR muassasa ILIKE '%РШТЁИМАФ%' OR muassasa = 'РШТЕИМ'
    OR muassasa ILIKE '%RSHTYOIM%AF%' OR muassasa = 'RSHTYOIMAF'
    OR muassasa ILIKE '%Respublika shoshilinch%Andijon%'
    OR muassasa ILIKE '%Рштеим аф%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Andijon filiali'
WHERE viloyat = 'Andijon viloyati' AND muassasa != 'RSHTYOIM Andijon filiali'
  AND (muassasa ILIKE '%РШТЕИМ%АФ%' OR muassasa ILIKE '%РШТЁИМ%АФ%'
    OR muassasa ILIKE '%РШТЕИМ%АФ%' OR muassasa ILIKE '%РШТЕИАФ%'
    OR muassasa ILIKE '%РШТЁИМАФ%' OR muassasa = 'РШТЕИМ'
    OR muassasa ILIKE '%RSHTYOIM%AF%' OR muassasa = 'RSHTYOIMAF'
    OR muassasa ILIKE '%Respublika shoshilinch%Andijon%'
    OR muassasa ILIKE '%Рштеим аф%');

-- Asaka politravma (bir xil muassasa turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Asaka politravma markazi'
WHERE viloyat = 'Andijon viloyati' AND muassasa != 'Asaka politravma markazi'
  AND (muassasa ILIKE '%Асака%шикастлан%' OR muassasa ILIKE '%Асака%кушма%'
    OR muassasa ILIKE '%Асака%қўшма%' OR muassasa ILIKE '%Asaka%qoshma%'
    OR muassasa ILIKE '%Asaka tuman%qon tomir%' OR muassasa ILIKE '%Asaka%TQSH%');

UPDATE insult_qabul SET muassasa = 'Asaka politravma markazi'
WHERE viloyat = 'Andijon viloyati' AND muassasa != 'Asaka politravma markazi'
  AND (muassasa ILIKE '%Асака%шикастлан%' OR muassasa ILIKE '%Асака%кушма%'
    OR muassasa ILIKE '%Асака%қўшма%' OR muassasa ILIKE '%Asaka%qoshma%'
    OR muassasa ILIKE '%Asaka tuman%qon tomir%' OR muassasa ILIKE '%Asaka%TQSH%');

-- Xonobod ShTB
UPDATE infarkt_qabul SET muassasa = 'Xonobod ShTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa ILIKE '%Хонобод%';
UPDATE insult_qabul SET muassasa = 'Xonobod ShTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa ILIKE '%Хонобод%';

-- Ulug'nor TTB
UPDATE infarkt_qabul SET muassasa = 'Ulug''nor TTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa ILIKE '%Улуғнор%';
UPDATE insult_qabul SET muassasa = 'Ulug''nor TTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa ILIKE '%Улуғнор%';

-- Oltinko'l TTB (apostrof varianti)
UPDATE infarkt_qabul SET muassasa = 'Oltinko''l TTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa = 'Oltinkoʻl TTB';
UPDATE insult_qabul SET muassasa = 'Oltinko''l TTB'
WHERE viloyat = 'Andijon viloyati' AND muassasa = 'Oltinkoʻl TTB';

-- ── BUXORO VILOYATI ──────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Buxoro filiali'
WHERE viloyat = 'Buxoro viloyati' AND muassasa != 'RSHTYOIM Buxoro filiali'
  AND (muassasa ILIKE '%РШТЁИМ%БФ%' OR muassasa ILIKE '%РШТЁИМБФ%'
    OR muassasa ILIKE '%РШТЁИМ%Бухоро%' OR muassasa ILIKE '%РШТЕИМ%БФ%'
    OR muassasa ILIKE '%РШТЕИМБФ%' OR muassasa ILIKE '%БФ%РШТЕИМ%'
    OR muassasa ILIKE '%RSHTYOIM%BF%' OR muassasa ILIKE '%RSHTYoIM%BF%'
    OR muassasa ILIKE '%RSHTYOIM%Buxoro%' OR muassasa ILIKE '%Республика шошилинч%Бухоро%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Buxoro filiali'
WHERE viloyat = 'Buxoro viloyati' AND muassasa != 'RSHTYOIM Buxoro filiali'
  AND (muassasa ILIKE '%РШТЁИМ%БФ%' OR muassasa ILIKE '%РШТЁИМБФ%'
    OR muassasa ILIKE '%РШТЁИМ%Бухоро%' OR muassasa ILIKE '%РШТЕИМ%БФ%'
    OR muassasa ILIKE '%РШТЕИМБФ%' OR muassasa ILIKE '%БФ%РШТЕИМ%'
    OR muassasa ILIKE '%RSHTYOIM%BF%' OR muassasa ILIKE '%RSHTYoIM%BF%'
    OR muassasa ILIKE '%RSHTYOIM%Buxoro%' OR muassasa ILIKE '%Республика шошилинч%Бухоро%');

-- G'ijduvon TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'G''ijduvon TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Гиждувон%';
UPDATE insult_qabul SET muassasa = 'G''ijduvon TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Гиждувон%';

-- Olot TTB (kirill va qo'shimcha)
UPDATE infarkt_qabul SET muassasa = 'Olot TTB'
WHERE viloyat = 'Buxoro viloyati'
  AND (muassasa ILIKE '%Олот ТТБ%' OR muassasa = '. Olot tuman tibbiyot birlashmasi');
UPDATE insult_qabul SET muassasa = 'Olot TTB'
WHERE viloyat = 'Buxoro viloyati'
  AND (muassasa ILIKE '%Олот ТТБ%' OR muassasa = '. Olot tuman tibbiyot birlashmasi');

-- Romitan TTB → Romitan politravma markazi
UPDATE infarkt_qabul SET muassasa = 'Romitan politravma markazi'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Ромитан%';
UPDATE insult_qabul SET muassasa = 'Romitan politravma markazi'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Ромитан%';

-- Shofirkon TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Shofirkon TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Шофиркон%';
UPDATE insult_qabul SET muassasa = 'Shofirkon TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Шофиркон%';

-- Peshku TTB (kichik harf)
UPDATE infarkt_qabul SET muassasa = 'Peshku TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa = 'Peshku ttb';
UPDATE insult_qabul SET muassasa = 'Peshku TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa = 'Peshku ttb';

-- Qorako'l politravma (kirill)
UPDATE infarkt_qabul SET muassasa = 'Qorako''l politravma markazi'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Коракул%';
UPDATE insult_qabul SET muassasa = 'Qorako''l politravma markazi'
WHERE viloyat = 'Buxoro viloyati' AND muassasa ILIKE '%Коракул%';

-- Jondor TTB (tuman tibbiyot birlashmasi varianti)
UPDATE infarkt_qabul SET muassasa = 'Jondor TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa = 'Jondor tuman tibbiyot birlashmasi';
UPDATE insult_qabul SET muassasa = 'Jondor TTB'
WHERE viloyat = 'Buxoro viloyati' AND muassasa = 'Jondor tuman tibbiyot birlashmasi';

-- ── FARG'ONA VILOYATI ────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Farg''ona filiali'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'RSHTYOIM Farg''ona filiali'
  AND (muassasa ILIKE '%RSHTYOIM%FF%' OR muassasa = 'RSHTYOIMFF'
    OR muassasa = 'RSHTYoIMFF' OR muassasa ILIKE '%RSHTYoIM%FF%'
    OR muassasa ILIKE '%RShTYoIM%Farg%ona%' OR muassasa = 'RShTYoIM Farg''ona filiali');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Farg''ona filiali'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'RSHTYOIM Farg''ona filiali'
  AND (muassasa ILIKE '%RSHTYOIM%FF%' OR muassasa = 'RSHTYOIMFF'
    OR muassasa = 'RSHTYoIMFF' OR muassasa ILIKE '%RSHTYoIM%FF%'
    OR muassasa ILIKE '%RShTYoIM%Farg%ona%' OR muassasa = 'RShTYoIM Farg''ona filiali');

-- Marg'ilon ShTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Marg''ilon ShTB'
WHERE viloyat = 'Farg''ona viloyati' AND (muassasa ILIKE '%Марғилон%' OR muassasa ILIKE '%Мағилон%');
UPDATE insult_qabul SET muassasa = 'Marg''ilon ShTB'
WHERE viloyat = 'Farg''ona viloyati' AND (muassasa ILIKE '%Марғилон%' OR muassasa ILIKE '%Мағилон%');

-- Qo'qon politravma (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Qo''qon politravma markazi'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Qo''qon politravma markazi'
  AND (muassasa ILIKE '%Qu%on%shoshilinch%' OR muassasa ILIKE '%Q%oqon%shifohona%'
    OR muassasa ILIKE '%Qo%qon%shahar%' OR muassasa ILIKE '%Quqon%sh%');

UPDATE insult_qabul SET muassasa = 'Qo''qon politravma markazi'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Qo''qon politravma markazi'
  AND (muassasa ILIKE '%Qu%on%shoshilinch%' OR muassasa ILIKE '%Q%oqon%shifohona%'
    OR muassasa ILIKE '%Qo%qon%shahar%' OR muassasa ILIKE '%Quqon%sh%');

-- Oltiariq TTB (Emergency Department varianti)
UPDATE infarkt_qabul SET muassasa = 'Oltiariq TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Oltiariq TTB'
  AND (muassasa ILIKE '%Oltiariq%EMERGENCY%' OR muassasa ILIKE '%OLTIARIK%KABUI%'
    OR muassasa ILIKE '%Oltiariq%QABUL%');
UPDATE insult_qabul SET muassasa = 'Oltiariq TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Oltiariq TTB'
  AND (muassasa ILIKE '%Oltiariq%EMERGENCY%' OR muassasa ILIKE '%OLTIARIK%KABUI%'
    OR muassasa ILIKE '%Oltiariq%QABUL%');

-- Furqat TTB (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Furqat TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Furqat TTB'
  AND (muassasa ILIKE '%Furqat tuman%' OR muassasa ILIKE '%FURQAT TTB%');
UPDATE insult_qabul SET muassasa = 'Furqat TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa != 'Furqat TTB'
  AND (muassasa ILIKE '%Furqat tuman%' OR muassasa ILIKE '%FURQAT TTB%');

-- Buvayda TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Buvayda TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Бувайда%';
UPDATE insult_qabul SET muassasa = 'Buvayda TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Бувайда%';

-- Bog'dod politravma
UPDATE infarkt_qabul SET muassasa = 'Bog''dod politravma markazi'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Bog%dod tuman%TTB%';
UPDATE insult_qabul SET muassasa = 'Bog''dod politravma markazi'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Bog%dod tuman%TTB%';

-- Quva TTB (Emergency Department varianti)
UPDATE infarkt_qabul SET muassasa = 'Quva TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Quva%EMERGENCY%';
UPDATE insult_qabul SET muassasa = 'Quva TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Quva%EMERGENCY%';

-- Beshariq TTB
UPDATE infarkt_qabul SET muassasa = 'Beshariq TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Beshariq tuman%';
UPDATE insult_qabul SET muassasa = 'Beshariq TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%Beshariq tuman%';

-- O'zbekiston TTB (Emergency Department varianti)
UPDATE infarkt_qabul SET muassasa = 'O''zbekiston TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%O%zbekiston tuman%';
UPDATE insult_qabul SET muassasa = 'O''zbekiston TTB'
WHERE viloyat = 'Farg''ona viloyati' AND muassasa ILIKE '%O%zbekiston tuman%';

-- ── JIZZAX VILOYATI ──────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Jizzax filiali'
WHERE viloyat = 'Jizzax viloyati' AND muassasa != 'RSHTYOIM Jizzax filiali'
  AND (muassasa ILIKE '%RShTYoIM%JF%' OR muassasa = 'RSHTYoIMJF'
    OR muassasa = 'RSHTYOIM' OR muassasa = 'RSHTYoIM'
    OR muassasa ILIKE '%Respublika shoshilinch%Jizzax%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Jizzax filiali'
WHERE viloyat = 'Jizzax viloyati' AND muassasa != 'RSHTYOIM Jizzax filiali'
  AND (muassasa ILIKE '%RShTYoIM%JF%' OR muassasa = 'RSHTYoIMJF'
    OR muassasa = 'RSHTYOIM' OR muassasa = 'RSHTYoIM'
    OR muassasa ILIKE '%Respublika shoshilinch%Jizzax%');

-- ── NAMANGAN VILOYATI ────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Namangan filiali'
WHERE viloyat = 'Namangan viloyati' AND muassasa != 'RSHTYOIM Namangan filiali'
  AND (muassasa ILIKE '%РШТЁИМ%НФ%' OR muassasa ILIKE '%РШТЁИМНФ%'
    OR muassasa ILIKE '%RShTYoIM%Namangan%' OR muassasa = 'RShTYoIM Namangan filiali'
    OR muassasa = 'RShTYoIMNF' OR muassasa = 'RSHTYOIMNF'
    OR muassasa ILIKE '%Respublika shoshilinch%Namangan%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Namangan filiali'
WHERE viloyat = 'Namangan viloyati' AND muassasa != 'RSHTYOIM Namangan filiali'
  AND (muassasa ILIKE '%РШТЁИМ%НФ%' OR muassasa ILIKE '%РШТЁИМНФ%'
    OR muassasa ILIKE '%RShTYoIM%Namangan%' OR muassasa = 'RShTYoIM Namangan filiali'
    OR muassasa = 'RShTYoIMNF' OR muassasa = 'RSHTYOIMNF'
    OR muassasa ILIKE '%Respublika shoshilinch%Namangan%');

-- Chust TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Chust TTB'
WHERE viloyat = 'Namangan viloyati' AND (muassasa ILIKE '%Чуст%ТТБ%' OR muassasa ILIKE '%Чуст%ттб%');
UPDATE insult_qabul SET muassasa = 'Chust TTB'
WHERE viloyat = 'Namangan viloyati' AND (muassasa ILIKE '%Чуст%ТТБ%' OR muassasa ILIKE '%Чуст%ттб%');

-- Uchqo'rg'on (kirill)
UPDATE infarkt_qabul SET muassasa = 'Uchqo''rg''on politravma markazi'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Учқўрғон%';
UPDATE insult_qabul SET muassasa = 'Uchqo''rg''on politravma markazi'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Учқўрғон%';

-- Namangan TTB turli yozuv
UPDATE infarkt_qabul SET muassasa = 'Namangan ShTB'
WHERE viloyat = 'Namangan viloyati' AND muassasa != 'Namangan ShTB'
  AND (muassasa ILIKE '%Namangan tuman tibbiyot%' OR muassasa ILIKE '%Namangan tibbiyot birlashmasi%'
    OR muassasa ILIKE '%Namangan tuman Shoshilinch%');
UPDATE insult_qabul SET muassasa = 'Namangan ShTB'
WHERE viloyat = 'Namangan viloyati' AND muassasa != 'Namangan ShTB'
  AND (muassasa ILIKE '%Namangan tuman tibbiyot%' OR muassasa ILIKE '%Namangan tibbiyot birlashmasi%'
    OR muassasa ILIKE '%Namangan tuman Shoshilinch%');

-- Norin TTB (Emergency Department)
UPDATE infarkt_qabul SET muassasa = 'Norin TTB'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Norin%EMERGENCY%';
UPDATE insult_qabul SET muassasa = 'Norin TTB'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Norin%EMERGENCY%';

-- Yangiqo'rg'on
UPDATE infarkt_qabul SET muassasa = 'Yangiqo''rg''on politravma markazi'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Yangiq%rg%on%TQSH%';
UPDATE insult_qabul SET muassasa = 'Yangiqo''rg''on politravma markazi'
WHERE viloyat = 'Namangan viloyati' AND muassasa ILIKE '%Yangiq%rg%on%TQSH%';

-- ── NAVOIY VILOYATI ──────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Navoiy filiali'
WHERE viloyat = 'Navoiy viloyati' AND muassasa != 'RSHTYOIM Navoiy filiali'
  AND (muassasa ILIKE '%РШТЕИМНВФ%' OR muassasa ILIKE '%RSHTYoIM%NF%'
    OR muassasa = 'RShTYIM Navoiy filiali' OR muassasa = 'RSHTYOIMNF'
    OR muassasa ILIKE '%RSHTYOIM%Navoi%' OR muassasa = 'RSHTYoIM'
    OR muassasa ILIKE '%Рштеим%' OR muassasa = 'RSHTYoIM NF'
    OR muassasa ILIKE '%RSHTYoIM%Navoi%Viloyat%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Navoiy filiali'
WHERE viloyat = 'Navoiy viloyati' AND muassasa != 'RSHTYOIM Navoiy filiali'
  AND (muassasa ILIKE '%РШТЕИМНВФ%' OR muassasa ILIKE '%RSHTYoIM%NF%'
    OR muassasa = 'RShTYIM Navoiy filiali' OR muassasa = 'RSHTYOIMNF'
    OR muassasa ILIKE '%RSHTYOIM%Navoi%' OR muassasa = 'RSHTYoIM'
    OR muassasa ILIKE '%Рштеим%' OR muassasa = 'RSHTYoIM NF'
    OR muassasa ILIKE '%RSHTYoIM%Navoi%Viloyat%');

-- Qiziltepa (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Qiziltepa politravma markazi'
WHERE viloyat = 'Navoiy viloyati' AND muassasa != 'Qiziltepa politravma markazi'
  AND (muassasa ILIKE '%Кизилтепа%' OR muassasa ILIKE '%Qiziltepa ShT%');
UPDATE insult_qabul SET muassasa = 'Qiziltepa politravma markazi'
WHERE viloyat = 'Navoiy viloyati' AND muassasa != 'Qiziltepa politravma markazi'
  AND (muassasa ILIKE '%Кизилтепа%' OR muassasa ILIKE '%Qiziltepa ShT%');

-- ── QASHQADARYO VILOYATI ─────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Qashqadaryo filiali'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa != 'RSHTYOIM Qashqadaryo filiali'
  AND (muassasa ILIKE '%РШТЁИМ%ҚФ%' OR muassasa ILIKE '%РШТЁИМ%КФ%'
    OR muassasa ILIKE '%РШТЁИМКФ%' OR muassasa ILIKE '%РШТЁИМ%К/Ф%'
    OR muassasa ILIKE '%РШТЕИМ%КФ%' OR muassasa ILIKE '%РИКИАТМ%ҚФ%'
    OR muassasa ILIKE '%РШТЁИМ%Кашкадарё%'
    OR muassasa = 'RSHTTYIMQF' OR muassasa = 'RSHTTYOIMQF'
    OR muassasa = 'RsHTTYOIMQF' OR muassasa = 'RSHTYoIM'
    OR muassasa = 'RShTYoIM' OR muassasa ILIKE '%RSHTYOIM%QF%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Qashqadaryo filiali'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa != 'RSHTYOIM Qashqadaryo filiali'
  AND (muassasa ILIKE '%РШТЁИМ%ҚФ%' OR muassasa ILIKE '%РШТЁИМ%КФ%'
    OR muassasa ILIKE '%РШТЁИМКФ%' OR muassasa ILIKE '%РШТЁИМ%К/Ф%'
    OR muassasa ILIKE '%РШТЕИМ%КФ%' OR muassasa ILIKE '%РИКИАТМ%ҚФ%'
    OR muassasa ILIKE '%РШТЁИМ%Кашкадарё%'
    OR muassasa = 'RSHTTYIMQF' OR muassasa = 'RSHTTYOIMQF'
    OR muassasa = 'RsHTTYOIMQF' OR muassasa = 'RSHTYoIM'
    OR muassasa = 'RShTYoIM' OR muassasa ILIKE '%RSHTYOIM%QF%');

-- G'uzor politravma (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'G''uzor politravma markazi'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa != 'G''uzor politravma markazi'
  AND (muassasa ILIKE '%uzor%TQSH%' OR muassasa ILIKE '%GuzoR%TQSH%');
UPDATE insult_qabul SET muassasa = 'G''uzor politravma markazi'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa != 'G''uzor politravma markazi'
  AND (muassasa ILIKE '%uzor%TQSH%' OR muassasa ILIKE '%GuzoR%TQSH%');

-- Chiroqchi TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Chiroqchi TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Чирокчи%';
UPDATE insult_qabul SET muassasa = 'Chiroqchi TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Чирокчи%';

-- Kasbi TTB (biriktirilgan yozuv)
UPDATE infarkt_qabul SET muassasa = 'Kasbi TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa = 'KasbiTTB';
UPDATE insult_qabul SET muassasa = 'Kasbi TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa = 'KasbiTTB';

-- Koson TTB (biriktirilgan)
UPDATE infarkt_qabul SET muassasa = 'Koson TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa = 'KosonTTB';
UPDATE insult_qabul SET muassasa = 'Koson TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa = 'KosonTTB';

-- Mirishkor IKB
UPDATE infarkt_qabul SET muassasa = 'Mirishkor-1 TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Миришкор%ИКБ%';
UPDATE insult_qabul SET muassasa = 'Mirishkor-1 TTB'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Миришкор%ИКБ%';

-- Shahrisabz (kirill)
UPDATE infarkt_qabul SET muassasa = 'Shahrisabz politravma markazi'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Шахрисабз%';
UPDATE insult_qabul SET muassasa = 'Shahrisabz politravma markazi'
WHERE viloyat = 'Qashqadaryo viloyati' AND muassasa ILIKE '%Шахрисабз%';

-- ── QORAQALPOG'ISTON ─────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Qoraqalpog''iston filiali'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa != 'RSHTYOIM Qoraqalpog''iston filiali'
  AND (muassasa ILIKE '%ККФ%РНЦЭМП%' OR muassasa ILIKE '%КФ%РНЦЭМП%'
    OR muassasa ILIKE '%РНЦЭМП%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Qoraqalpog''iston filiali'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa != 'RSHTYOIM Qoraqalpog''iston filiali'
  AND (muassasa ILIKE '%ККФ%РНЦЭМП%' OR muassasa ILIKE '%КФ%РНЦЭМП%'
    OR muassasa ILIKE '%РНЦЭМП%');

-- Beruniy TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Beruniy TTB'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa ILIKE '%Беруний%';
UPDATE insult_qabul SET muassasa = 'Beruniy TTB'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa ILIKE '%Беруний%';

-- Qorao'zak TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Qorao''zak TTB'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa ILIKE '%Кораузак%';
UPDATE insult_qabul SET muassasa = 'Qorao''zak TTB'
WHERE viloyat = 'Qoraqalpog''iston Respublikasi' AND muassasa ILIKE '%Кораузак%';

-- ── SAMARQAND VILOYATI ───────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Samarqand filiali'
WHERE viloyat = 'Samarqand viloyati' AND muassasa != 'RSHTYOIM Samarqand filiali'
  AND (muassasa ILIKE '%RShTYoIM%SF%' OR muassasa ILIKE '%РШТЁИМ%СФ%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Samarqand filiali'
WHERE viloyat = 'Samarqand viloyati' AND muassasa != 'RSHTYOIM Samarqand filiali'
  AND (muassasa ILIKE '%RShTYoIM%SF%' OR muassasa ILIKE '%РШТЁИМ%СФ%');

-- Ishtixon politravma (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Ishtixon politravma markazi'
WHERE viloyat = 'Samarqand viloyati' AND muassasa != 'Ishtixon politravma markazi'
  AND (muassasa ILIKE '%Ishtixon%SSB%' OR muassasa ILIKE '%Ishtixon tuman%qo%shma%');
UPDATE insult_qabul SET muassasa = 'Ishtixon politravma markazi'
WHERE viloyat = 'Samarqand viloyati' AND muassasa != 'Ishtixon politravma markazi'
  AND (muassasa ILIKE '%Ishtixon%SSB%' OR muassasa ILIKE '%Ishtixon tuman%qo%shma%');

-- Jomboy TTB/SSB
UPDATE infarkt_qabul SET muassasa = 'Jomboy TTB'
WHERE viloyat = 'Samarqand viloyati' AND muassasa = 'Jomboy SSB';
UPDATE insult_qabul SET muassasa = 'Jomboy TTB'
WHERE viloyat = 'Samarqand viloyati' AND muassasa = 'Jomboy SSB';

-- Oqdaryo TTB
UPDATE infarkt_qabul SET muassasa = 'Oqdaryo TTB'
WHERE viloyat = 'Samarqand viloyati' AND muassasa ILIKE '%Oqdaryo tuman%';
UPDATE insult_qabul SET muassasa = 'Oqdaryo TTB'
WHERE viloyat = 'Samarqand viloyati' AND muassasa ILIKE '%Oqdaryo tuman%';

-- Bulung'ur SSB/politravma
UPDATE infarkt_qabul SET muassasa = 'Bulung''ur politravma markazi'
WHERE viloyat = 'Samarqand viloyati' AND muassasa ILIKE '%Bulungʻur%SSB%';
UPDATE insult_qabul SET muassasa = 'Bulung''ur politravma markazi'
WHERE viloyat = 'Samarqand viloyati' AND muassasa ILIKE '%Bulungʻur%SSB%';

-- Payariq TTB
UPDATE infarkt_qabul SET muassasa = 'Payariq TTB'
WHERE viloyat = 'Samarqand viloyati'
  AND (muassasa ILIKE '%Payariq tuman%' OR muassasa ILIKE '%Payariq tumani%');
UPDATE insult_qabul SET muassasa = 'Payariq TTB'
WHERE viloyat = 'Samarqand viloyati'
  AND (muassasa ILIKE '%Payariq tuman%' OR muassasa ILIKE '%Payariq tumani%');

-- ── SIRDARYO VILOYATI ────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Sirdaryo filiali'
WHERE viloyat = 'Sirdaryo viloyati' AND muassasa != 'RSHTYOIM Sirdaryo filiali'
  AND (muassasa ILIKE '%RShTYoIM%SF%' OR muassasa ILIKE '%Respublika shoshilinch%Sirdaryo%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Sirdaryo filiali'
WHERE viloyat = 'Sirdaryo viloyati' AND muassasa != 'RSHTYOIM Sirdaryo filiali'
  AND (muassasa ILIKE '%RShTYoIM%SF%' OR muassasa ILIKE '%Respublika shoshilinch%Sirdaryo%');

-- Sirdaryo tuman
UPDATE infarkt_qabul SET muassasa = 'Sirdaryo politravma markazi'
WHERE viloyat = 'Sirdaryo viloyati' AND muassasa ILIKE '%Sirdaryo tuman%';
UPDATE insult_qabul SET muassasa = 'Sirdaryo politravma markazi'
WHERE viloyat = 'Sirdaryo viloyati' AND muassasa ILIKE '%Sirdaryo tuman%';

-- ── SURXONDARYO VILOYATI ─────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Surxondaryo filiali'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa != 'RSHTYOIM Surxondaryo filiali'
  AND (muassasa = 'RSHTYOIMSF' OR muassasa ILIKE '%RSHTYOIM%Сурхондарё%'
    OR muassasa ILIKE '%RSHTYOIM%·%Сурхондарё%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Surxondaryo filiali'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa != 'RSHTYOIM Surxondaryo filiali'
  AND (muassasa = 'RSHTYOIMSF' OR muassasa ILIKE '%RSHTYOIM%Сурхондарё%'
    OR muassasa ILIKE '%RSHTYOIM%·%Сурхондарё%');

-- Jarqo'rg'on TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Jarqo''rg''on TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa ILIKE '%ЖАРКЎРГОН%';
UPDATE insult_qabul SET muassasa = 'Jarqo''rg''on TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa ILIKE '%ЖАРКЎРГОН%';

-- ЖТТБ → Jarqo'rg'on TTB
UPDATE infarkt_qabul SET muassasa = 'Jarqo''rg''on TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa = 'ЖТТБ';
UPDATE insult_qabul SET muassasa = 'Jarqo''rg''on TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa = 'ЖТТБ';

-- Denov SSB → Denov politravma
UPDATE infarkt_qabul SET muassasa = 'Denov politravma markazi'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa ILIKE '%Denov%ssb%';
UPDATE insult_qabul SET muassasa = 'Denov politravma markazi'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa ILIKE '%Denov%ssb%';

-- Uzun TTB (katta harf)
UPDATE infarkt_qabul SET muassasa = 'Uzun TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa = 'UZUN TTB';
UPDATE insult_qabul SET muassasa = 'Uzun TTB'
WHERE viloyat = 'Surxondaryo viloyati' AND muassasa = 'UZUN TTB';

-- ── TOSHKENT SHAHRI ──────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
WHERE viloyat = 'Toshkent shahri' AND muassasa != 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
  AND (muassasa ILIKE '%Respublika shoshilinch tibbiy yordam ilmiy mark%'
    OR muassasa = 'RSHTYoIM' OR muassasa = 'RSHTYOIM' OR muassasa = 'RShTYOIM');

UPDATE insult_qabul SET muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
WHERE viloyat = 'Toshkent shahri' AND muassasa != 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
  AND (muassasa ILIKE '%Respublika shoshilinch tibbiy yordam ilmiy mark%'
    OR muassasa = 'RSHTYoIM' OR muassasa = 'RSHTYOIM' OR muassasa = 'RShTYOIM');

-- 1-ShKSH (turli yozuv)
UPDATE infarkt_qabul SET muassasa = '1-sonli Shahar Klinik Shifoxonasi'
WHERE viloyat = 'Toshkent shahri' AND muassasa != '1-sonli Shahar Klinik Shifoxonasi'
  AND (muassasa = '1ShKSH' OR muassasa = '1-ShKSH' OR muassasa = '1-SHKSH'
    OR muassasa ILIKE '%Ibn Sino%1%ShKSh%' OR muassasa = '1 шкш');
UPDATE insult_qabul SET muassasa = '1-sonli Shahar Klinik Shifoxonasi'
WHERE viloyat = 'Toshkent shahri' AND muassasa != '1-sonli Shahar Klinik Shifoxonasi'
  AND (muassasa = '1ShKSH' OR muassasa = '1-ShKSH' OR muassasa = '1-SHKSH'
    OR muassasa ILIKE '%Ibn Sino%1%ShKSh%' OR muassasa = '1 шкш');

-- 4-ShKSH
UPDATE infarkt_qabul SET muassasa = '4-sonli Shahar Klinik Shifoxonasi'
WHERE viloyat = 'Toshkent shahri' AND muassasa ILIKE '%4%shksh%';
UPDATE insult_qabul SET muassasa = '4-sonli Shahar Klinik Shifoxonasi'
WHERE viloyat = 'Toshkent shahri' AND muassasa ILIKE '%4%shksh%';

-- ── TOSHKENT VILOYATI ────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Toshkent viloyat filiali'
WHERE viloyat = 'Toshkent viloyati' AND muassasa != 'RSHTYOIM Toshkent viloyat filiali'
  AND (muassasa ILIKE '%RSHTYOIM%TVF%' OR muassasa = 'RSHTYoIM'
    OR muassasa = 'RShTYoIM' OR muassasa = 'RSHTYOIM');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Toshkent viloyat filiali'
WHERE viloyat = 'Toshkent viloyati' AND muassasa != 'RSHTYOIM Toshkent viloyat filiali'
  AND (muassasa ILIKE '%RSHTYOIM%TVF%' OR muassasa = 'RSHTYoIM'
    OR muassasa = 'RShTYoIM' OR muassasa = 'RSHTYOIM');

-- Oqqo'rg'on TTB (kirill + reanimatsiya)
UPDATE infarkt_qabul SET muassasa = 'Oqqo''rg''on TTB'
WHERE viloyat = 'Toshkent viloyati'
  AND (muassasa ILIKE '%Оққорғон%' OR muassasa ILIKE '%Oqqo%rg%on%Reanim%');
UPDATE insult_qabul SET muassasa = 'Oqqo''rg''on TTB'
WHERE viloyat = 'Toshkent viloyati'
  AND (muassasa ILIKE '%Оққорғон%' OR muassasa ILIKE '%Oqqo%rg%on%Reanim%');

-- Bo'stonliq TTB (turli yozuv)
UPDATE infarkt_qabul SET muassasa = 'Bo''stonliq politravma markazi'
WHERE viloyat = 'Toshkent viloyati' AND muassasa != 'Bo''stonliq politravma markazi'
  AND (muassasa ILIKE '%Bo%stonliq tuman%' OR muassasa ILIKE '%Бустонлик%'
    OR muassasa ILIKE '%БОСТАНЛЫК%');
UPDATE insult_qabul SET muassasa = 'Bo''stonliq politravma markazi'
WHERE viloyat = 'Toshkent viloyati' AND muassasa != 'Bo''stonliq politravma markazi'
  AND (muassasa ILIKE '%Bo%stonliq tuman%' OR muassasa ILIKE '%Бустонлик%'
    OR muassasa ILIKE '%БОСТАНЛЫК%');

-- Qibray TTB
UPDATE infarkt_qabul SET muassasa = 'Qibray TTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Qibray Tuman%';
UPDATE insult_qabul SET muassasa = 'Qibray TTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Qibray Tuman%';

-- Olmaliq ShTB
UPDATE infarkt_qabul SET muassasa = 'Olmaliq ShTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Olmaliq markaziy%';
UPDATE insult_qabul SET muassasa = 'Olmaliq ShTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Olmaliq markaziy%';

-- Parkent TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Parkent TTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Паркент%';
UPDATE insult_qabul SET muassasa = 'Parkent TTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Паркент%';

-- Yangiyo'l TTB (kirill)
UPDATE infarkt_qabul SET muassasa = 'Yangiyo''l ShTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Янгийул%';
UPDATE insult_qabul SET muassasa = 'Yangiyo''l ShTB'
WHERE viloyat = 'Toshkent viloyati' AND muassasa ILIKE '%Янгийул%';

-- ── XORAZM VILOYATI ──────────────────────────────────────────
UPDATE infarkt_qabul SET muassasa = 'RSHTYOIM Xorazm filiali'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'RSHTYOIM Xorazm filiali'
  AND (muassasa = 'RShTYIMXF' OR muassasa ILIKE '%РШТЕИМ%'
    OR muassasa ILIKE '%RSHTYOIM%X%f%' OR muassasa ILIKE '%RSHTYOM%XORAZM%'
    OR muassasa ILIKE '%RShTYoIM%Xorazm%');

UPDATE insult_qabul SET muassasa = 'RSHTYOIM Xorazm filiali'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'RSHTYOIM Xorazm filiali'
  AND (muassasa = 'RShTYIMXF' OR muassasa ILIKE '%РШТЕИМ%'
    OR muassasa ILIKE '%RSHTYOIM%X%f%' OR muassasa ILIKE '%RSHTYOM%XORAZM%'
    OR muassasa ILIKE '%RShTYoIM%Xorazm%');

-- Gurlan TTB/politravma
UPDATE infarkt_qabul SET muassasa = 'Gurlan politravma markazi'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'Gurlan politravma markazi'
  AND (muassasa ILIKE '%Гурлан%' OR muassasa = 'Gurlan TTB');
UPDATE insult_qabul SET muassasa = 'Gurlan politravma markazi'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'Gurlan politravma markazi'
  AND (muassasa ILIKE '%Гурлан%' OR muassasa = 'Gurlan TTB');

-- Xiva tuman tibbiyot birlashmasi → Xiva ShTB
UPDATE infarkt_qabul SET muassasa = 'Xiva ShTB'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'Xiva ShTB'
  AND muassasa ILIKE '%Xiva%tuman%';
UPDATE insult_qabul SET muassasa = 'Xiva ShTB'
WHERE viloyat = 'Xorazm viloyati' AND muassasa != 'Xiva ShTB'
  AND muassasa ILIKE '%Xiva%tuman%';
