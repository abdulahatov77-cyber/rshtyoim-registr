-- ============================================================
-- Doimiy yashash MANZILINI (viloyat + tuman) orqaga to'ldirish
-- ============================================================
-- QOIDA:
--   Viloyat:
--     - Boshqa muassasadan o'tkazilgan  -> yuborgan muassasa viloyati
--     - Qolganlar                       -> davolangan muassasa viloyati
--   Tuman:
--     - Faqat O'Z viloyatida davolangan (yashash_viloyat = viloyat) bemorga,
--       o'z muassasasi qaysi tumanda bo'lsa o'sha. Boshqa viloyatdan
--       o'tkazilganlar uchun tuman BO'SH qoladi (yuborgan muassasa erkin matn).
--     - Muassasa viloyat markazida yoki Toshkent klinikasi bo'lsa -> bo'sh.
--   Aniqlanmaganlar hamma joyda BO'SH qoladi, taxmin yozilmaydi.
--
-- ⚠️ SANA SHARTI YO'Q. Himoyani yashash_viloyat / yashash_tuman IS NULL
--    sharti bajaradi — qiymati bor katakka (shifokor qo'lda kiritgan haqiqiy
--    manzil) HECH QACHON yozilmaydi. Kechadan (2026-07-15) manzil majburiy,
--    demak bo'sh kataklar faqat eski / import qilingan yozuvlarda qoladi.
--
-- Supabase SQL Editor da bosqichma-bosqich ishga tushiring.
-- ============================================================

CREATE OR REPLACE FUNCTION norm_muassasa(t TEXT) RETURNS TEXT AS $BODY$
  SELECT btrim(regexp_replace(
           translate(lower(COALESCE(t, '')), '''`´‘’-', ''), '\s+', ' ', 'g'))
$BODY$ LANGUAGE SQL IMMUTABLE;

-- Tuman/shahar o'zagi -> viloyat (yuborgan muassasa nomidan viloyat aniqlash)
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

CREATE OR REPLACE FUNCTION viloyat_topish(nom TEXT) RETURNS TEXT AS $BODY$
  SELECT m.viloyat FROM tuman_viloyat m
  WHERE norm_muassasa(nom) ~ ('(^|\s)' || m.kalit || '(\s|$)')
  ORDER BY length(m.kalit) DESC LIMIT 1
$BODY$ LANGUAGE SQL STABLE;

-- Muassasa (normalizatsiya qilingan nom) + viloyat -> aniq tuman/shahar
CREATE OR REPLACE VIEW muassasa_tuman AS
SELECT * FROM (VALUES
    ('rshtyoim andijon filiali', 'Andijon viloyati', 'Andijon shahri'),
    ('andijon shtb', 'Andijon viloyati', 'Andijon shahri'),
    ('baliqchi ttb', 'Andijon viloyati', 'Baliqchi tumani'),
    ('buloqboshi ttb', 'Andijon viloyati', 'Buloqboshi tumani'),
    ('boston ttb', 'Andijon viloyati', 'Bo''ston tumani'),
    ('izboskan ttb', 'Andijon viloyati', 'Izboskan tumani'),
    ('jalaquduq ttb', 'Andijon viloyati', 'Jalaquduq tumani'),
    ('marhamat ttb', 'Andijon viloyati', 'Marhamat tumani'),
    ('oltinkol ttb', 'Andijon viloyati', 'Oltinko''l tumani'),
    ('paxtaobod ttb', 'Andijon viloyati', 'Paxtaobod tumani'),
    ('ulugnor ttb', 'Andijon viloyati', 'Ulug''nor tumani'),
    ('xonobod shtb', 'Andijon viloyati', 'Xonobod shahri'),
    ('xojaobod ttb', 'Andijon viloyati', 'Xo''jaobod tumani'),
    ('qorgontepa politravma markazi', 'Andijon viloyati', 'Qo''rg''ontepa tumani'),
    ('shahrixon politravma markazi', 'Andijon viloyati', 'Shahrixon tumani'),
    ('asaka politravma markazi', 'Andijon viloyati', 'Asaka tumani'),
    ('rshtyoim buxoro filiali', 'Buxoro viloyati', 'Buxoro shahri'),
    ('buxoro ttb', 'Buxoro viloyati', 'Buxoro tumani'),
    ('olot ttb', 'Buxoro viloyati', 'Olot tumani'),
    ('jondor ttb', 'Buxoro viloyati', 'Jondor tumani'),
    ('qorovulbozor ttb', 'Buxoro viloyati', 'Qorovulbozor tumani'),
    ('kogon shtb', 'Buxoro viloyati', 'Kogon shahri'),
    ('gijduvon ttb', 'Buxoro viloyati', 'G''ijduvon tumani'),
    ('shofirkon ttb', 'Buxoro viloyati', 'Shofirkon tumani'),
    ('peshku ttb', 'Buxoro viloyati', 'Peshku tumani'),
    ('qorakol politravma markazi', 'Buxoro viloyati', 'Qorako''l tumani'),
    ('vobkent politravma markazi', 'Buxoro viloyati', 'Vobkent tumani'),
    ('romitan politravma markazi', 'Buxoro viloyati', 'Romitan tumani'),
    ('rshtyoim jizzax filiali', 'Jizzax viloyati', 'Jizzax shahri'),
    ('arnasoy ttb', 'Jizzax viloyati', 'Arnasoy tumani'),
    ('baxmal ttb', 'Jizzax viloyati', 'Baxmal tumani'),
    ('zafarobod ttb', 'Jizzax viloyati', 'Zafarobod tumani'),
    ('mirzachol ttb', 'Jizzax viloyati', 'Mirzacho''l tumani'),
    ('paxtakor ttb', 'Jizzax viloyati', 'Paxtakor tumani'),
    ('forish ttb', 'Jizzax viloyati', 'Forish tumani'),
    ('yangiobod ttb', 'Jizzax viloyati', 'Yangiobod tumani'),
    ('sh. rashidov ttb', 'Jizzax viloyati', 'Sharof Rashidov tumani'),
    ('gallaorol politravma markazi', 'Jizzax viloyati', 'G''allaorol tumani'),
    ('dostlik politravma markazi', 'Jizzax viloyati', 'Do''stlik tumani'),
    ('zomin politravma markazi', 'Jizzax viloyati', 'Zomin tumani'),
    ('rshtyoim qashqadaryo filiali', 'Qashqadaryo viloyati', 'Qarshi shahri'),
    ('qarshi shtb', 'Qashqadaryo viloyati', 'Qarshi shahri'),
    ('qarshi ttb', 'Qashqadaryo viloyati', 'Qarshi tumani'),
    ('koson ttb', 'Qashqadaryo viloyati', 'Koson tumani'),
    ('qamashi ttb', 'Qashqadaryo viloyati', 'Qamashi tumani'),
    ('kitob ttb', 'Qashqadaryo viloyati', 'Kitob tumani'),
    ('chiroqchi ttb', 'Qashqadaryo viloyati', 'Chiroqchi tumani'),
    ('yakkabog1 ttb', 'Qashqadaryo viloyati', 'Yakkabog'' tumani'),
    ('yakkabog2 ttb', 'Qashqadaryo viloyati', 'Yakkabog'' tumani'),
    ('mirishkor1 ttb', 'Qashqadaryo viloyati', 'Mirishkor tumani'),
    ('mirishkor2 ttb', 'Qashqadaryo viloyati', 'Mirishkor tumani'),
    ('muborak ttb', 'Qashqadaryo viloyati', 'Muborak tumani'),
    ('nishon ttb', 'Qashqadaryo viloyati', 'Nishon tumani'),
    ('shahrisabz shtb', 'Qashqadaryo viloyati', 'Shahrisabz shahri'),
    ('dehqonobod ttb', 'Qashqadaryo viloyati', 'Dehqonobod tumani'),
    ('kasbi politravma markazi', 'Qashqadaryo viloyati', 'Kasbi tumani'),
    ('guzor politravma markazi', 'Qashqadaryo viloyati', 'G''uzor tumani'),
    ('kokdala politravma markazi', 'Qashqadaryo viloyati', 'Ko''kdala tumani'),
    ('rshtyoim navoiy filiali', 'Navoiy viloyati', 'Navoiy shahri'),
    ('konimex ttb', 'Navoiy viloyati', 'Konimex tumani'),
    ('karmana ttb', 'Navoiy viloyati', 'Karmana tumani'),
    ('navbahor ttb', 'Navoiy viloyati', 'Navbahor tumani'),
    ('nurota ttb', 'Navoiy viloyati', 'Nurota tumani'),
    ('tomdi ttb', 'Navoiy viloyati', 'Tomdi tumani'),
    ('uchquduq ttb', 'Navoiy viloyati', 'Uchquduq tumani'),
    ('zarafshon politravma markazi', 'Navoiy viloyati', 'Zarafshon shahri'),
    ('qiziltepa politravma markazi', 'Navoiy viloyati', 'Qiziltepa tumani'),
    ('xatirchi politravma markazi', 'Navoiy viloyati', 'Xatirchi tumani'),
    ('rshtyoim namangan filiali', 'Namangan viloyati', 'Namangan shahri'),
    ('namangan shtb', 'Namangan viloyati', 'Namangan shahri'),
    ('namangan ttb', 'Namangan viloyati', 'Namangan tumani'),
    ('chust ttb', 'Namangan viloyati', 'Chust tumani'),
    ('norin ttb', 'Namangan viloyati', 'Norin tumani'),
    ('chortoq ttb', 'Namangan viloyati', 'Chortoq tumani'),
    ('toraqorgon ttb', 'Namangan viloyati', 'To''raqo''rg''on tumani'),
    ('kosonsoy ttb', 'Namangan viloyati', 'Kosonsoy tumani'),
    ('uychi ttb', 'Namangan viloyati', 'Uychi tumani'),
    ('mingbuloq ttb', 'Namangan viloyati', 'Mingbuloq tumani'),
    ('pop politravma markazi', 'Namangan viloyati', 'Pop tumani'),
    ('uchqorgon politravma markazi', 'Namangan viloyati', 'Uchqo''rg''on tumani'),
    ('yangiqorgon politravma markazi', 'Namangan viloyati', 'Yangiqo''rg''on tumani'),
    ('rshtyoim samarqand filiali', 'Samarqand viloyati', 'Samarqand shahri'),
    ('oqdaryo ttb', 'Samarqand viloyati', 'Oqdaryo tumani'),
    ('jomboy ttb', 'Samarqand viloyati', 'Jomboy tumani'),
    ('qoshrabot ttb', 'Samarqand viloyati', 'Qo''shrabot tumani'),
    ('narpay ttb', 'Samarqand viloyati', 'Narpay tumani'),
    ('nurobod ttb', 'Samarqand viloyati', 'Nurobod tumani'),
    ('payariq ttb', 'Samarqand viloyati', 'Payariq tumani'),
    ('pastdargom ttb', 'Samarqand viloyati', 'Pastdarg''om tumani'),
    ('samarqand ttb', 'Samarqand viloyati', 'Samarqand tumani'),
    ('toyloq ttb', 'Samarqand viloyati', 'Toyloq tumani'),
    ('bulungur politravma markazi', 'Samarqand viloyati', 'Bulung''ur tumani'),
    ('urgut politravma markazi', 'Samarqand viloyati', 'Urgut tumani'),
    ('ishtixon politravma markazi', 'Samarqand viloyati', 'Ishtixon tumani'),
    ('paxtachi politravma markazi', 'Samarqand viloyati', 'Paxtachi tumani'),
    ('kattaqorgon ttb', 'Samarqand viloyati', 'Kattaqo''rg''on tumani'),
    ('rshtyoim surxondaryo filiali', 'Surxondaryo viloyati', 'Termiz shahri'),
    ('termiz shtb', 'Surxondaryo viloyati', 'Termiz shahri'),
    ('angor ttb', 'Surxondaryo viloyati', 'Angor tumani'),
    ('oltinsoy ttb', 'Surxondaryo viloyati', 'Oltinsoy tumani'),
    ('boysun ttb', 'Surxondaryo viloyati', 'Boysun tumani'),
    ('bandixon ttb', 'Surxondaryo viloyati', 'Bandixon tumani'),
    ('jarqorgon ttb', 'Surxondaryo viloyati', 'Jarqo''rg''on tumani'),
    ('qiziriq ttb', 'Surxondaryo viloyati', 'Qiziriq tumani'),
    ('muzrabot ttb', 'Surxondaryo viloyati', 'Muzrabot tumani'),
    ('uzun ttb', 'Surxondaryo viloyati', 'Uzun tumani'),
    ('shorchi ttb', 'Surxondaryo viloyati', 'Sho''rchi tumani'),
    ('denov politravma markazi', 'Surxondaryo viloyati', 'Denov tumani'),
    ('qumqorgon politravma markazi', 'Surxondaryo viloyati', 'Qumqo''rg''on tumani'),
    ('sariosiyo politravma markazi', 'Surxondaryo viloyati', 'Sariosiyo tumani'),
    ('sherobod politravma markazi', 'Surxondaryo viloyati', 'Sherobod tumani'),
    ('rshtyoim sirdaryo filiali', 'Sirdaryo viloyati', 'Sirdaryo tumani'),
    ('yangiyer shtb', 'Sirdaryo viloyati', 'Yangiyer shahri'),
    ('boyovut ttb', 'Sirdaryo viloyati', 'Boyovut tumani'),
    ('sardoba ttb', 'Sirdaryo viloyati', 'Sardoba tumani'),
    ('sayxunobod ttb', 'Sirdaryo viloyati', 'Sayxunobod tumani'),
    ('mirzaobod ttb', 'Sirdaryo viloyati', 'Mirzaobod tumani'),
    ('shirin shtb', 'Sirdaryo viloyati', 'Shirin shahri'),
    ('xovos ttb', 'Sirdaryo viloyati', 'Xovos tumani'),
    ('sirdaryo politravma markazi', 'Sirdaryo viloyati', 'Sirdaryo tumani'),
    ('oq oltin politravma markazi', 'Sirdaryo viloyati', 'Oqoltin tumani'),
    ('boka ttb', 'Toshkent viloyati', 'Bo''ka tumani'),
    ('zangiota ttb', 'Toshkent viloyati', 'Zangiota tumani'),
    ('qibray ttb', 'Toshkent viloyati', 'Qibray tumani'),
    ('quyichirchiq ttb', 'Toshkent viloyati', 'Quyichirchiq tumani'),
    ('nurafshon shtb', 'Toshkent viloyati', 'Nurafshon shahri'),
    ('oqqorgon ttb', 'Toshkent viloyati', 'Oqqo''rg''on tumani'),
    ('olmaliq shtb', 'Toshkent viloyati', 'Olmaliq shahri'),
    ('ohangaron shtb', 'Toshkent viloyati', 'Ohangaron tumani'),
    ('ohangaron ttb', 'Toshkent viloyati', 'Ohangaron tumani'),
    ('parkent ttb', 'Toshkent viloyati', 'Parkent tumani'),
    ('piskent ttb', 'Toshkent viloyati', 'Piskent tumani'),
    ('chirchiq shtb', 'Toshkent viloyati', 'Chirchiq shahri'),
    ('yuqorichirchiq ttb', 'Toshkent viloyati', 'Yuqorichirchiq tumani'),
    ('yangiyol shtb', 'Toshkent viloyati', 'Yangiyo''l shahri'),
    ('yangiyol ttb', 'Toshkent viloyati', 'Yangiyo''l tumani'),
    ('angren politravma markazi', 'Toshkent viloyati', 'Angren shahri'),
    ('bostonliq politravma markazi', 'Toshkent viloyati', 'Bo''stonliq tumani'),
    ('chinoz politravma markazi', 'Toshkent viloyati', 'Chinoz tumani'),
    ('rshtyoim fargona filiali', 'Farg''ona viloyati', 'Farg''ona shahri'),
    ('margilon shtb', 'Farg''ona viloyati', 'Marg''ilon shahri'),
    ('quvasoy shtb', 'Farg''ona viloyati', 'Quvasoy shahri'),
    ('oltiariq ttb', 'Farg''ona viloyati', 'Oltiariq tumani'),
    ('fargona ttb', 'Farg''ona viloyati', 'Farg''ona tumani'),
    ('qoshtepa ttb', 'Farg''ona viloyati', 'Qo''shtepa tumani'),
    ('toshloq ttb', 'Farg''ona viloyati', 'Toshloq tumani'),
    ('rishton ttb', 'Farg''ona viloyati', 'Rishton tumani'),
    ('buvayda ttb', 'Farg''ona viloyati', 'Buvayda tumani'),
    ('uchkoprik ttb', 'Farg''ona viloyati', 'Uchko''prik tumani'),
    ('dangara ttb', 'Farg''ona viloyati', 'Dang''ara tumani'),
    ('furqat ttb', 'Farg''ona viloyati', 'Furqat tumani'),
    ('ozbekiston ttb', 'Farg''ona viloyati', 'O''zbekiston tumani'),
    ('beshariq ttb', 'Farg''ona viloyati', 'Beshariq tumani'),
    ('sox ttb', 'Farg''ona viloyati', 'So''x tumani'),
    ('qoqon politravma markazi', 'Farg''ona viloyati', 'Qo''qon shahri'),
    ('bogdod politravma markazi', 'Farg''ona viloyati', 'Bog''dod tumani'),
    ('yozyovon politravma markazi', 'Farg''ona viloyati', 'Yozyovon tumani'),
    ('quva politravma markazi', 'Farg''ona viloyati', 'Quva tumani'),
    ('rshtyoim xorazm filiali', 'Xorazm viloyati', 'Urganch shahri'),
    ('urganch ttb', 'Xorazm viloyati', 'Urganch tumani'),
    ('tuproqqala ttb', 'Xorazm viloyati', 'Tuproqqal''a tumani'),
    ('bogot ttb', 'Xorazm viloyati', 'Bog''ot tumani'),
    ('qoshkopir ttb', 'Xorazm viloyati', 'Qo''shko''pir tumani'),
    ('xonqa ttb', 'Xorazm viloyati', 'Xonqa tumani'),
    ('xiva ttb', 'Xorazm viloyati', 'Xiva tumani'),
    ('shovot ttb', 'Xorazm viloyati', 'Shovot tumani'),
    ('yangiariq ttb', 'Xorazm viloyati', 'Yangiariq tumani'),
    ('yangibozor ttb', 'Xorazm viloyati', 'Yangibozor tumani'),
    ('gurlan politravma markazi', 'Xorazm viloyati', 'Gurlan tumani'),
    ('xazorasp politravma markazi', 'Xorazm viloyati', 'Hazorasp tumani'),
    ('rshtyoim qoraqalpogiston filiali', 'Qoraqalpog''iston Respublikasi', 'Nukus shahri'),
    ('nukus ttb', 'Qoraqalpog''iston Respublikasi', 'Nukus tumani'),
    ('amudaryo ttb', 'Qoraqalpog''iston Respublikasi', 'Amudaryo tumani'),
    ('beruniy ttb', 'Qoraqalpog''iston Respublikasi', 'Beruniy tumani'),
    ('bozatov ttb', 'Qoraqalpog''iston Respublikasi', 'Bo''zatov tumani'),
    ('kegeyli ttb', 'Qoraqalpog''iston Respublikasi', 'Kegeyli tumani'),
    ('qanlikol ttb', 'Qoraqalpog''iston Respublikasi', 'Qanliko''l tumani'),
    ('qoraozak ttb', 'Qoraqalpog''iston Respublikasi', 'Qorao''zak tumani'),
    ('moynoq ttb', 'Qoraqalpog''iston Respublikasi', 'Mo''ynoq tumani'),
    ('taxtakopir ttb', 'Qoraqalpog''iston Respublikasi', 'Taxtako''pir tumani'),
    ('shumanay ttb', 'Qoraqalpog''iston Respublikasi', 'Shumanay tumani'),
    ('ellikqala ttb', 'Qoraqalpog''iston Respublikasi', 'Ellikqal''a tumani'),
    ('xojayli ttb', 'Qoraqalpog''iston Respublikasi', 'Xo''jayli tumani'),
    ('qongirot politravma markazi', 'Qoraqalpog''iston Respublikasi', 'Qo''ng''irot tumani'),
    ('chimboy politravma markazi', 'Qoraqalpog''iston Respublikasi', 'Chimboy tumani'),
    ('tortkol politravma markazi', 'Qoraqalpog''iston Respublikasi', 'To''rtko''l tumani')
) AS t(nmuassasa, viloyat, tuman);

-- ============================================================
-- 1-BOSQICH: OLDINDAN KO'RISH (hech narsa o'zgartirmaydi)
-- ============================================================
SELECT
  COUNT(*)                                                    AS manzilsiz_jami,
  COUNT(*) FILTER (WHERE murojaat_yoli = 'Boshqa muassasadan'
                     AND viloyat_topish(yuborgan_muassasa) IS NOT NULL) AS otkazilgan_aniqlanadi,
  COUNT(*) FILTER (WHERE murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan') AS oddiy_bemor
FROM (
  SELECT murojaat_yoli, yuborgan_muassasa FROM insult_qabul  WHERE yashash_viloyat IS NULL
  UNION ALL
  SELECT murojaat_yoli, yuborgan_muassasa FROM infarkt_qabul WHERE yashash_viloyat IS NULL
) t;

-- 1b. Tuman qamrovi: bazadagi qaysi muassasa nomlari moslik jadvalida
--     TOPILADI (tuman yoziladi) yoki TOPILMAYDI (tuman bo'sh qoladi).
--     Agar tanish muassasa "topilmadi" da chiqsa — nomi config bilan
--     mos emas, menga ayting, moslik jadvaliga qo'shaman.
SELECT
  CASE WHEN mt.tuman IS NULL THEN 'TOPILMADI (tuman bo''sh)' ELSE 'topildi -> ' || mt.tuman END AS holat,
  b.muassasa, COUNT(*) AS bemorlar
FROM (
  SELECT muassasa, viloyat FROM insult_qabul  WHERE yashash_tuman IS NULL
  UNION ALL
  SELECT muassasa, viloyat FROM infarkt_qabul WHERE yashash_tuman IS NULL
) b
LEFT JOIN muassasa_tuman mt
  ON mt.viloyat = b.viloyat AND mt.nmuassasa = norm_muassasa(b.muassasa)
GROUP BY 1, 2
ORDER BY holat, bemorlar DESC;   -- 'TOPILMADI' harfi 'topildi' dan oldin keladi

-- ============================================================
-- 2-BOSQICH: VILOYATNI TO'LDIRISH  (sana sharti YO'Q)
-- ============================================================
-- 2a. O'tkazilganlar -> yuborgan muassasa viloyati
UPDATE insult_qabul SET yashash_viloyat = viloyat_topish(yuborgan_muassasa)
WHERE yashash_viloyat IS NULL AND murojaat_yoli = 'Boshqa muassasadan'
  AND viloyat_topish(yuborgan_muassasa) IS NOT NULL;
UPDATE infarkt_qabul SET yashash_viloyat = viloyat_topish(yuborgan_muassasa)
WHERE yashash_viloyat IS NULL AND murojaat_yoli = 'Boshqa muassasadan'
  AND viloyat_topish(yuborgan_muassasa) IS NOT NULL;

-- 2b. Qolganlar -> davolangan muassasa viloyati
UPDATE insult_qabul SET yashash_viloyat = viloyat
WHERE yashash_viloyat IS NULL AND murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan';
UPDATE infarkt_qabul SET yashash_viloyat = viloyat
WHERE yashash_viloyat IS NULL AND murojaat_yoli IS DISTINCT FROM 'Boshqa muassasadan';

-- ============================================================
-- 3-BOSQICH: TUMANNI TO'LDIRISH
-- Faqat o'z viloyatida davolanganlarga (yashash_viloyat = viloyat).
-- ============================================================
UPDATE insult_qabul q SET yashash_tuman = mt.tuman
FROM muassasa_tuman mt
WHERE q.yashash_tuman IS NULL AND q.yashash_viloyat = q.viloyat
  AND mt.viloyat = q.viloyat AND mt.nmuassasa = norm_muassasa(q.muassasa);
UPDATE infarkt_qabul q SET yashash_tuman = mt.tuman
FROM muassasa_tuman mt
WHERE q.yashash_tuman IS NULL AND q.yashash_viloyat = q.viloyat
  AND mt.viloyat = q.viloyat AND mt.nmuassasa = norm_muassasa(q.muassasa);

-- ============================================================
-- 4-BOSQICH: fuqarolik standart qiymat
-- ============================================================
UPDATE insult_qabul  SET fuqarolik = 'O''zbekiston'
WHERE fuqarolik IS NULL AND yashash_viloyat IS NOT NULL;
UPDATE infarkt_qabul SET fuqarolik = 'O''zbekiston'
WHERE fuqarolik IS NULL AND yashash_viloyat IS NOT NULL;

-- ============================================================
-- 5-BOSQICH: TEKSHIRISH
-- ============================================================
SELECT
  COUNT(*)                          AS jami,
  COUNT(yashash_viloyat)            AS viloyati_bor,
  COUNT(yashash_tuman)              AS tumani_bor,
  COUNT(*) - COUNT(yashash_viloyat) AS hali_bosh
FROM (
  SELECT yashash_viloyat, yashash_tuman FROM insult_qabul
  UNION ALL
  SELECT yashash_viloyat, yashash_tuman FROM infarkt_qabul
) t;

-- ============================================================
-- 6-BOSQICH: TOZALASH (5-bosqich natijasi ma'qul bo'lgach)
-- ============================================================
DROP FUNCTION IF EXISTS viloyat_topish(TEXT);
DROP VIEW     IF EXISTS muassasa_tuman;
DROP VIEW     IF EXISTS tuman_viloyat;
DROP FUNCTION IF EXISTS norm_muassasa(TEXT);

-- ============================================================
-- ORQAGA QAYTARISH — bu skript FAQAT bo'sh (IS NULL) kataklarni to'ldirdi,
-- shuning uchun ishonchli belgi yo'q. Agar kerak bo'lsa, avval nimani
-- to'ldirganini ko'rish uchun 1-bosqich sonini yozib qo'ying.
-- ============================================================

-- ✅ TUGADI
