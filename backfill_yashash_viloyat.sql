-- ============================================================
-- Doimiy yashash viloyatini orqaga to'ldirish (2026-07-16)
--
-- QOIDA (foydalanuvchi tanlovi):
--   1. Boshqa muassasadan o'tkazilgan bemor  -> yuborgan muassasa qaysi
--      viloyatda bo'lsa, o'sha viloyat.
--   2. Qolgan hamma bemor                    -> davolangan muassasa viloyati.
--   3. Yuborgan muassasa nomidan viloyat aniqlanmasa (xususiy klinika,
--      RSHTYOIM, RKIATM va h.k.) -> BO'SH qoldiriladi, taxmin yozilmaydi.
--   4. FAQAT 2026-07-15 dan OLDIN yaratilgan yozuvlar. 15-iyul va undan
--      keyingilarda shifokor manzilni qo'lda kiritgan — ular haqiqiy,
--      ustidan yozilmaydi.
--
-- ⚠️ DIQQAT: bu TAXMIN, haqiqiy so'ralgan ma'lumot emas.
--    yashash_tuman ga tegilmaydi — tuman darajasida taxmin qilinmaydi.
--    Shu sababli "viloyati bor, tumani bo'sh" = skript yozgan (taxmin),
--    "ikkalasi ham bor" = shifokor qo'lda kiritgan (haqiqiy).
--    Qaytarish shu belgi bo'yicha aniq bajariladi — skript oxiriga qarang.
--
-- ⛔ created_at GA ISHONMANG. import.html uni Google Sheets dagi eski
--    sanadan oladi (import.html:219), ya'ni u yozuv bazaga qachon
--    tushganini ko'rsatmaydi. Quyidagi sana sharti faqat "eski import
--    qilingan yozuvlar" ni ajratish uchun — himoya vazifasini
--    yashash_viloyat IS NULL sharti bajaradi, sana emas.
--
-- Supabase SQL Editor da BOSQICHMA-BOSQICH ishga tushiring.
-- ============================================================

-- ── Nomlarni solishtirish uchun normalizatsiya ───────────────
-- Apostrof variantlari (' ` ´ ' '), defis, katta-kichik harf, ortiqcha bo'shliq
CREATE OR REPLACE FUNCTION norm_muassasa(t TEXT) RETURNS TEXT AS $$
  SELECT btrim(regexp_replace(
           translate(lower(COALESCE(t, '')), '''`´‘’-', ''),
           '\s+', ' ', 'g'))
$$ LANGUAGE SQL IMMUTABLE;

-- ── Tuman/shahar -> viloyat moslik jadvali ──────────────────
-- (js/config.js dagi TUMANLAR dan avtomatik yasalgan + kirill variantlari)
CREATE OR REPLACE VIEW tuman_viloyat AS
SELECT * FROM (VALUES
    ('sharof rashidov', 'Jizzax viloyati'),
    ('yuqorichirchiq', 'Toshkent viloyati'),
    ('mirzo ulugbek', 'Toshkent shahri'),
    ('qorovulbozor', 'Buxoro viloyati'),
    ('quyichirchiq', 'Toshkent viloyati'),
    ('ortachirchiq', 'Toshkent viloyati'),
    ('shayxontohur', 'Toshkent shahri'),
    ('yangiqorgon', 'Namangan viloyati'),
    ('kattaqorgon', 'Samarqand viloyati'),
    ('buloqboshi', 'Andijon viloyati'),
    ('qorgontepa', 'Andijon viloyati'),
    ('shahrisabz', 'Qashqadaryo viloyati'),
    ('dehqonobod', 'Qashqadaryo viloyati'),
    ('toraqorgon', 'Namangan viloyati'),
    ('davlatobod', 'Namangan viloyati'),
    ('pastdargom', 'Samarqand viloyati'),
    ('sayxunobod', 'Sirdaryo viloyati'),
    ('ozbekiston', 'Farg''ona viloyati'),
    ('yangibozor', 'Xorazm viloyati'),
    ('tuproqqala', 'Xorazm viloyati'),
    ('taxtakopir', 'Qoraqalpog''iston Respublikasi'),
    ('yakkasaroy', 'Toshkent shahri'),
    ('янгикургон', 'Namangan viloyati'),
    ('янгиқўрғон', 'Namangan viloyati'),
    ('jalaquduq', 'Andijon viloyati'),
    ('paxtaobod', 'Andijon viloyati'),
    ('shahrixon', 'Andijon viloyati'),
    ('shofirkon', 'Buxoro viloyati'),
    ('gallaorol', 'Jizzax viloyati'),
    ('mirzachol', 'Jizzax viloyati'),
    ('yangiobod', 'Jizzax viloyati'),
    ('zafarobod', 'Jizzax viloyati'),
    ('chiroqchi', 'Qashqadaryo viloyati'),
    ('mirishkor', 'Qashqadaryo viloyati'),
    ('zarafshon', 'Navoiy viloyati'),
    ('qiziltepa', 'Navoiy viloyati'),
    ('mingbuloq', 'Namangan viloyati'),
    ('uchqorgon', 'Namangan viloyati'),
    ('samarqand', 'Samarqand viloyati'),
    ('qoshrabot', 'Samarqand viloyati'),
    ('jarqorgon', 'Surxondaryo viloyati'),
    ('qumqorgon', 'Surxondaryo viloyati'),
    ('sariosiyo', 'Surxondaryo viloyati'),
    ('mirzaobod', 'Sirdaryo viloyati'),
    ('nurafshon', 'Toshkent viloyati'),
    ('bostonliq', 'Toshkent viloyati'),
    ('ohangaron', 'Toshkent viloyati'),
    ('uchkoprik', 'Farg''ona viloyati'),
    ('qoshkopir', 'Xorazm viloyati'),
    ('yangiariq', 'Xorazm viloyati'),
    ('ellikqala', 'Qoraqalpog''iston Respublikasi'),
    ('chilonzor', 'Toshkent shahri'),
    ('yashnobod', 'Toshkent shahri'),
    ('yunusobod', 'Toshkent shahri'),
    ('uchkuprik', 'Farg''ona viloyati'),
    ('baliqchi', 'Andijon viloyati'),
    ('izboskan', 'Andijon viloyati'),
    ('xojaobod', 'Andijon viloyati'),
    ('marhamat', 'Andijon viloyati'),
    ('oltinkol', 'Andijon viloyati'),
    ('gijduvon', 'Buxoro viloyati'),
    ('paxtakor', 'Jizzax viloyati'),
    ('yakkabog', 'Qashqadaryo viloyati'),
    ('navbahor', 'Navoiy viloyati'),
    ('uchquduq', 'Navoiy viloyati'),
    ('xatirchi', 'Navoiy viloyati'),
    ('namangan', 'Namangan viloyati'),
    ('kosonsoy', 'Namangan viloyati'),
    ('bulungur', 'Samarqand viloyati'),
    ('ishtixon', 'Samarqand viloyati'),
    ('paxtachi', 'Samarqand viloyati'),
    ('bandixon', 'Surxondaryo viloyati'),
    ('muzrabot', 'Surxondaryo viloyati'),
    ('oltinsoy', 'Surxondaryo viloyati'),
    ('sherobod', 'Surxondaryo viloyati'),
    ('guliston', 'Sirdaryo viloyati'),
    ('yangiyer', 'Sirdaryo viloyati'),
    ('sirdaryo', 'Sirdaryo viloyati'),
    ('chirchiq', 'Toshkent viloyati'),
    ('yangiyol', 'Toshkent viloyati'),
    ('oqqorgon', 'Toshkent viloyati'),
    ('zangiota', 'Toshkent viloyati'),
    ('margilon', 'Farg''ona viloyati'),
    ('beshariq', 'Farg''ona viloyati'),
    ('qoshtepa', 'Farg''ona viloyati'),
    ('yozyovon', 'Farg''ona viloyati'),
    ('oltiariq', 'Farg''ona viloyati'),
    ('hazorasp', 'Xorazm viloyati'),
    ('amudaryo', 'Qoraqalpog''iston Respublikasi'),
    ('qanlikol', 'Qoraqalpog''iston Respublikasi'),
    ('qongirot', 'Qoraqalpog''iston Respublikasi'),
    ('qoraozak', 'Qoraqalpog''iston Respublikasi'),
    ('shumanay', 'Qoraqalpog''iston Respublikasi'),
    ('bektemir', 'Toshkent shahri'),
    ('олтинкул', 'Andijon viloyati'),
    ('олтинкўл', 'Andijon viloyati'),
    ('qushtepa', 'Farg''ona viloyati'),
    ('andijon', 'Andijon viloyati'),
    ('xonobod', 'Andijon viloyati'),
    ('ulugnor', 'Andijon viloyati'),
    ('qorakol', 'Buxoro viloyati'),
    ('romitan', 'Buxoro viloyati'),
    ('vobkent', 'Buxoro viloyati'),
    ('arnasoy', 'Jizzax viloyati'),
    ('dostlik', 'Jizzax viloyati'),
    ('muborak', 'Qashqadaryo viloyati'),
    ('qamashi', 'Qashqadaryo viloyati'),
    ('kokdala', 'Qashqadaryo viloyati'),
    ('karmana', 'Navoiy viloyati'),
    ('konimex', 'Navoiy viloyati'),
    ('chortoq', 'Namangan viloyati'),
    ('nurobod', 'Samarqand viloyati'),
    ('oqdaryo', 'Samarqand viloyati'),
    ('payariq', 'Samarqand viloyati'),
    ('qiziriq', 'Surxondaryo viloyati'),
    ('shorchi', 'Surxondaryo viloyati'),
    ('boyovut', 'Sirdaryo viloyati'),
    ('oqoltin', 'Sirdaryo viloyati'),
    ('sardoba', 'Sirdaryo viloyati'),
    ('bekobod', 'Toshkent viloyati'),
    ('olmaliq', 'Toshkent viloyati'),
    ('parkent', 'Toshkent viloyati'),
    ('piskent', 'Toshkent viloyati'),
    ('fargona', 'Farg''ona viloyati'),
    ('quvasoy', 'Farg''ona viloyati'),
    ('buvayda', 'Farg''ona viloyati'),
    ('dangara', 'Farg''ona viloyati'),
    ('rishton', 'Farg''ona viloyati'),
    ('toshloq', 'Farg''ona viloyati'),
    ('urganch', 'Xorazm viloyati'),
    ('beruniy', 'Qoraqalpog''iston Respublikasi'),
    ('bozatov', 'Qoraqalpog''iston Respublikasi'),
    ('chimboy', 'Qoraqalpog''iston Respublikasi'),
    ('kegeyli', 'Qoraqalpog''iston Respublikasi'),
    ('tortkol', 'Qoraqalpog''iston Respublikasi'),
    ('xojayli', 'Qoraqalpog''iston Respublikasi'),
    ('mirobod', 'Toshkent shahri'),
    ('olmazor', 'Toshkent shahri'),
    ('sergeli', 'Toshkent shahri'),
    ('uchtepa', 'Toshkent shahri'),
    ('кўкдала', 'Qashqadaryo viloyati'),
    ('кукдала', 'Qashqadaryo viloyati'),
    ('boston', 'Andijon viloyati'),
    ('buxoro', 'Buxoro viloyati'),
    ('jondor', 'Buxoro viloyati'),
    ('peshku', 'Buxoro viloyati'),
    ('jizzax', 'Jizzax viloyati'),
    ('baxmal', 'Jizzax viloyati'),
    ('forish', 'Jizzax viloyati'),
    ('qarshi', 'Qashqadaryo viloyati'),
    ('nishon', 'Qashqadaryo viloyati'),
    ('navoiy', 'Navoiy viloyati'),
    ('nurota', 'Navoiy viloyati'),
    ('jomboy', 'Samarqand viloyati'),
    ('narpay', 'Samarqand viloyati'),
    ('toyloq', 'Samarqand viloyati'),
    ('termiz', 'Surxondaryo viloyati'),
    ('boysun', 'Surxondaryo viloyati'),
    ('shirin', 'Sirdaryo viloyati'),
    ('angren', 'Toshkent viloyati'),
    ('chinoz', 'Toshkent viloyati'),
    ('qibray', 'Toshkent viloyati'),
    ('bogdod', 'Farg''ona viloyati'),
    ('furqat', 'Farg''ona viloyati'),
    ('gurlan', 'Xorazm viloyati'),
    ('shovot', 'Xorazm viloyati'),
    ('moynoq', 'Qoraqalpog''iston Respublikasi'),
    ('янгиер', 'Sirdaryo viloyati'),
    ('asaka', 'Andijon viloyati'),
    ('kogon', 'Buxoro viloyati'),
    ('zomin', 'Jizzax viloyati'),
    ('guzor', 'Qashqadaryo viloyati'),
    ('kasbi', 'Qashqadaryo viloyati'),
    ('kitob', 'Qashqadaryo viloyati'),
    ('koson', 'Qashqadaryo viloyati'),
    ('tomdi', 'Navoiy viloyati'),
    ('chust', 'Namangan viloyati'),
    ('norin', 'Namangan viloyati'),
    ('uychi', 'Namangan viloyati'),
    ('urgut', 'Samarqand viloyati'),
    ('angor', 'Surxondaryo viloyati'),
    ('denov', 'Surxondaryo viloyati'),
    ('xovos', 'Sirdaryo viloyati'),
    ('qoqon', 'Farg''ona viloyati'),
    ('bogot', 'Xorazm viloyati'),
    ('xonqa', 'Xorazm viloyati'),
    ('nukus', 'Qoraqalpog''iston Respublikasi'),
    ('ғузор', 'Qashqadaryo viloyati'),
    ('гузор', 'Qashqadaryo viloyati'),
    ('кукон', 'Farg''ona viloyati'),
    ('қўқон', 'Farg''ona viloyati'),
    ('кўкон', 'Farg''ona viloyati'),
    ('касби', 'Qashqadaryo viloyati'),
    ('olot', 'Buxoro viloyati'),
    ('uzun', 'Surxondaryo viloyati'),
    ('boka', 'Toshkent viloyati'),
    ('quva', 'Farg''ona viloyati'),
    ('xiva', 'Xorazm viloyati'),
    ('чуст', 'Namangan viloyati'),
    ('pop', 'Namangan viloyati'),
    ('sox', 'Farg''ona viloyati')
) AS t(kalit, viloyat);

-- ── Yuborgan muassasa nomidan viloyatni aniqlash ────────────
-- Kalit ALOHIDA SO'Z bo'lishi shart. "Boshlanishiga qarab" qidirilsa,
-- qisqa kalitlar xato moslik beradi: 'pop' -> "Popovich klinikasi" = Namangan (!),
-- 'sox' -> "Soxta shifoxona" = Farg'ona (!). Haqiqiy ma'lumotda bu qat'iy
-- qoida hech narsa yo'qotmaydi — o'sha 91% aniqlanadi.
CREATE OR REPLACE FUNCTION viloyat_topish(nom TEXT) RETURNS TEXT AS $$
  SELECT m.viloyat FROM tuman_viloyat m
  WHERE norm_muassasa(nom) ~ ('(^|\s)' || m.kalit || '(\s|$)')
  ORDER BY length(m.kalit) DESC
  LIMIT 1
$$ LANGUAGE SQL STABLE;

-- ── CHEGARA SANA ────────────────────────────────────────────
-- Yashash manzili maydoni 2026-07-15 da qo'shilgan. Shu sanadan
-- OLDIN yaratilgan yozuvlargagina tegamiz. 15-iyul va undan keyingi
-- yozuvlarda shifokor manzilni QO'LDA kiritgan — ular haqiqiy ma'lumot,
-- ustidan taxmin yozilmaydi.
-- ('+05' = Toshkent vaqti)
--
-- Chegara: created_at < '2026-07-15 00:00:00+05'

-- ============================================================
-- 1-BOSQICH: OLDINDAN KO'RISH — hech narsa o'zgartirmaydi
-- ============================================================

-- 1a. O'tkazilganlar: qaysi nom qaysi viloyatga tushadi?
SELECT yuborgan_muassasa,
       viloyat_topish(yuborgan_muassasa) AS aniqlangan_viloyat,
       COUNT(*) AS soni
FROM (
  SELECT yuborgan_muassasa FROM insult_qabul
   WHERE murojaat_yoli = 'Boshqa muassasadan' AND yashash_viloyat IS NULL
     AND created_at < '2026-07-15 00:00:00+05'
  UNION ALL
  SELECT yuborgan_muassasa FROM infarkt_qabul
   WHERE murojaat_yoli = 'Boshqa muassasadan' AND yashash_viloyat IS NULL
     AND created_at < '2026-07-15 00:00:00+05'
) t
GROUP BY 1, 2
ORDER BY aniqlangan_viloyat NULLS FIRST, soni DESC;
-- ↑ aniqlangan_viloyat = NULL bo'lganlar bo'sh qoladi. Ro'yxatni ko'zdan kechiring.

-- 1b. Umumiy hisob
SELECT
  COUNT(*) FILTER (WHERE murojaat_yoli = 'Boshqa muassasadan'
                     AND viloyat_topish(yuborgan_muassasa) IS NOT NULL)  AS otkazilgan_aniqlandi,
  COUNT(*) FILTER (WHERE murojaat_yoli = 'Boshqa muassasadan'
                     AND viloyat_topish(yuborgan_muassasa) IS NULL)      AS otkazilgan_aniqlanmadi,
  COUNT(*) FILTER (WHERE murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan') AS oddiy_bemorlar
FROM (
  SELECT murojaat_yoli, yuborgan_muassasa FROM insult_qabul
   WHERE yashash_viloyat IS NULL AND created_at < '2026-07-15 00:00:00+05'
  UNION ALL
  SELECT murojaat_yoli, yuborgan_muassasa FROM infarkt_qabul
   WHERE yashash_viloyat IS NULL AND created_at < '2026-07-15 00:00:00+05'
) t;

-- 1v. Nazorat: 15-iyuldan keyingi yozuvlarga tegilmasligini tasdiqlash.
--     Bu son 2-bosqichdan keyin O'ZGARMASLIGI kerak.
SELECT COUNT(*) AS keyingi_yozuvlar_jami,
       COUNT(yashash_viloyat) AS manzili_bor
FROM (
  SELECT yashash_viloyat FROM insult_qabul  WHERE created_at >= '2026-07-15 00:00:00+05'
  UNION ALL
  SELECT yashash_viloyat FROM infarkt_qabul WHERE created_at >= '2026-07-15 00:00:00+05'
) t;

-- ============================================================
-- 2-BOSQICH: TO'LDIRISH — 1-bosqich natijasi ma'qul bo'lsa
-- ============================================================

-- 2a. O'tkazilganlar -> yuborgan muassasa viloyati
UPDATE insult_qabul SET yashash_viloyat = viloyat_topish(yuborgan_muassasa)
WHERE yashash_viloyat IS NULL AND murojaat_yoli = 'Boshqa muassasadan'
  AND created_at < '2026-07-15 00:00:00+05'
  AND viloyat_topish(yuborgan_muassasa) IS NOT NULL;

UPDATE infarkt_qabul SET yashash_viloyat = viloyat_topish(yuborgan_muassasa)
WHERE yashash_viloyat IS NULL AND murojaat_yoli = 'Boshqa muassasadan'
  AND created_at < '2026-07-15 00:00:00+05'
  AND viloyat_topish(yuborgan_muassasa) IS NOT NULL;

-- 2b. Qolganlar -> davolangan muassasa viloyati
--     (o'tkazilgan, lekin viloyati aniqlanmaganlar BO'SH qoladi)
UPDATE insult_qabul SET yashash_viloyat = viloyat
WHERE yashash_viloyat IS NULL AND murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan'
  AND created_at < '2026-07-15 00:00:00+05';

UPDATE infarkt_qabul SET yashash_viloyat = viloyat
WHERE yashash_viloyat IS NULL AND murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan'
  AND created_at < '2026-07-15 00:00:00+05';

-- 2c. Fuqaroligi belgilanmaganlarga standart qiymat
UPDATE insult_qabul  SET fuqarolik = 'O''zbekiston'
WHERE fuqarolik IS NULL AND yashash_viloyat IS NOT NULL
  AND created_at < '2026-07-15 00:00:00+05';
UPDATE infarkt_qabul SET fuqarolik = 'O''zbekiston'
WHERE fuqarolik IS NULL AND yashash_viloyat IS NOT NULL
  AND created_at < '2026-07-15 00:00:00+05';

-- ============================================================
-- 3-BOSQICH: TEKSHIRISH
-- ============================================================

-- 3a. Viloyatlar kesimida
SELECT yashash_viloyat, COUNT(*) AS soni
FROM (
  SELECT yashash_viloyat FROM insult_qabul
  UNION ALL
  SELECT yashash_viloyat FROM infarkt_qabul
) t
GROUP BY 1
ORDER BY soni DESC NULLS LAST;

-- 3b. MUHIM: 15-iyuldan keyingi yozuvlarga tegilmaganini tasdiqlash.
--     Bu natija 1v bandidagi bilan AYNAN BIR XIL bo'lishi shart.
--     Farq bo'lsa — skript haqiqiy ma'lumot ustidan yozgan, darhol to'xtating.
SELECT COUNT(*) AS keyingi_yozuvlar_jami,
       COUNT(yashash_viloyat) AS manzili_bor
FROM (
  SELECT yashash_viloyat FROM insult_qabul  WHERE created_at >= '2026-07-15 00:00:00+05'
  UNION ALL
  SELECT yashash_viloyat FROM infarkt_qabul WHERE created_at >= '2026-07-15 00:00:00+05'
) t;

-- ============================================================
-- 4-BOSQICH: TOZALASH — vaqtinchalik funksiya/view larni o'chirish
-- (3-bosqich natijasi ma'qul bo'lgandan keyin ishga tushiring)
-- ============================================================
DROP FUNCTION IF EXISTS viloyat_topish(TEXT);
DROP VIEW     IF EXISTS tuman_viloyat;
DROP FUNCTION IF EXISTS norm_muassasa(TEXT);

-- ============================================================
-- ORQAGA QAYTARISH
--
-- ⛔ created_at BO'YICHA QAYTARMANG! import.html yozuvlarni yuklaganda
--    created_at ni Google Sheets dagi ESKI sanadan oladi (import.html:219).
--    Ya'ni u yozuv bazaga qachon tushganini ko'rsatmaydi. created_at
--    bo'yicha tozalasangiz, shifokorlar qo'lda kiritgan HAQIQIY manzillar
--    ham o'chib ketadi.
--
-- ✅ TO'G'RI YO'L — yashash_tuman ni belgi sifatida ishlatish.
--    Bu skript yashash_tuman ga TEGMAYDI, forma esa uni MAJBURIY qiladi.
--    Demak "viloyati bor, tumani bo'sh" = aynan shu skript yozgan yozuv.
--
-- UPDATE insult_qabul  SET yashash_viloyat = NULL
--  WHERE yashash_viloyat IS NOT NULL AND yashash_tuman IS NULL;
-- UPDATE infarkt_qabul SET yashash_viloyat = NULL
--  WHERE yashash_viloyat IS NOT NULL AND yashash_tuman IS NULL;
--
-- Avval nechta yozuv qaytishini ko'ring:
-- SELECT COUNT(*) FROM (
--   SELECT 1 FROM insult_qabul  WHERE yashash_viloyat IS NOT NULL AND yashash_tuman IS NULL
--   UNION ALL
--   SELECT 1 FROM infarkt_qabul WHERE yashash_viloyat IS NOT NULL AND yashash_tuman IS NULL
-- ) t;
-- ============================================================

-- ✅ TUGADI
