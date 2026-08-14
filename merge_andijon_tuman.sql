-- =====================================================================
-- "Андижон туман" -> "Andijon TTB" GA BIRLASHTIRISH VA NOMNI O'CHIRISH
-- =====================================================================
-- Vazifa: kirill harflarida yozilgan "Андижон туман" nomidagi barcha
--         ma'lumotni "Andijon TTB" ga ko'chirish, so'ng eski nomni
--         ro'yxatlardan butunlay olib tashlash.
--
-- "Andijon TTB" — config.js dagi rasmiy ro'yxatda bor (etalon nom).
--
-- TARTIB — QAT'IY:
--   1) 1-BO'LIMni ishga tushiring va natijani KO'RING.
--      U aynan nima o'zgarishini ko'rsatadi. Ro'yxatda kutilmagan nom
--      bo'lsa — TO'XTANG va ayting.
--   2) Natija to'g'ri bo'lsa — 2-BO'LIMni ishga tushiring (ko'chirish).
--   3) So'ng 3-BO'LIM (nomni o'chirish).
--   4) Oxirida 4-BO'LIM (tekshiruv).
--
-- ORQAGA QAYTARIB BO'LMAYDI: 2-bo'limdan keyin eski nom qaytmaydi.
-- Kerak bo'lsa oldin Supabase'da zaxira (backup) oling.
-- =====================================================================


-- ============ 1. OLDINDAN KO'RISH — AVVAL SHUNI ISHGA TUSHIRING ============
-- Qaysi jadvalda, qaysi ustunda, qanday nom, nechta yozuv?

SELECT 'infarkt_qabul' AS jadval, 'muassasa' AS ustun, muassasa AS nom, COUNT(*) AS soni
  FROM public.infarkt_qabul WHERE lower(btrim(muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'infarkt_qabul', 'otkazilgan_muassasa', otkazilgan_muassasa, COUNT(*)
  FROM public.infarkt_qabul WHERE lower(btrim(otkazilgan_muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'infarkt_qabul', 'yuborgan_muassasa', yuborgan_muassasa, COUNT(*)
  FROM public.infarkt_qabul WHERE lower(btrim(yuborgan_muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'insult_qabul', 'muassasa', muassasa, COUNT(*)
  FROM public.insult_qabul WHERE lower(btrim(muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'insult_qabul', 'otkazilgan_muassasa', otkazilgan_muassasa, COUNT(*)
  FROM public.insult_qabul WHERE lower(btrim(otkazilgan_muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'insult_qabul', 'yuborgan_muassasa', yuborgan_muassasa, COUNT(*)
  FROM public.insult_qabul WHERE lower(btrim(yuborgan_muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'transfer_log', 'muassasa_dan', muassasa_dan, COUNT(*)
  FROM public.transfer_log WHERE lower(btrim(muassasa_dan)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'transfer_log', 'muassasa_ga', muassasa_ga, COUNT(*)
  FROM public.transfer_log WHERE lower(btrim(muassasa_ga)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'profiles', 'muassasa', muassasa, COUNT(*)
  FROM public.profiles WHERE lower(btrim(muassasa)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'muassasalar', 'nomi', nomi, COUNT(*)
  FROM public.muassasalar WHERE lower(btrim(nomi)) LIKE 'андижон туман%' GROUP BY 1,2,3
UNION ALL
SELECT 'muassasa_overrides', 'nomi', nomi, COUNT(*)
  FROM public.muassasa_overrides WHERE lower(btrim(nomi)) LIKE 'андижон туман%' GROUP BY 1,2,3
ORDER BY 1, 2;


-- ============ 2. KO'CHIRISH ============
-- Butun blokni bitta Run bilan ishga tushiring.
-- Chiqarish jadvallari (boshqa_shifoxona, reabil_markaz) bazada bo'lsa —
-- ular ham qamrab olinadi, bo'lmasa jimgina o'tkazib yuboriladi.

DO $$
DECLARE
  v_manba  text := 'андижон туман%';
  v_maqsad text := 'Andijon TTB';
  r    record;
  n    integer;
  jami integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('infarkt_qabul',     'muassasa'),
      ('infarkt_qabul',     'otkazilgan_muassasa'),
      ('infarkt_qabul',     'yuborgan_muassasa'),
      ('insult_qabul',      'muassasa'),
      ('insult_qabul',      'otkazilgan_muassasa'),
      ('insult_qabul',      'yuborgan_muassasa'),
      ('infarkt_chiqarish', 'boshqa_shifoxona'),
      ('infarkt_chiqarish', 'reabil_markaz'),
      ('insult_chiqarish',  'boshqa_shifoxona'),
      ('insult_chiqarish',  'reabil_markaz'),
      ('transfer_log',      'muassasa_dan'),
      ('transfer_log',      'muassasa_ga'),
      ('profiles',          'muassasa')
    ) AS t(jadval, ustun)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = r.jadval AND column_name = r.ustun
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = $1 WHERE lower(btrim(%I)) LIKE $2',
        r.jadval, r.ustun, r.ustun
      ) USING v_maqsad, v_manba;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN
        RAISE NOTICE '% . % -> % ta yozuv', r.jadval, r.ustun, n;
        jami := jami + n;
      END IF;
    END IF;
  END LOOP;
  RAISE NOTICE 'JAMI % ta yozuv "Andijon TTB" ga ko''chirildi', jami;
END $$;


-- ============ 3. ESKI NOMNI O'CHIRISH ============

-- 3.1) Imkoniyat belgilari yo'qolmasin — "Andijon TTB" ga ko'chiramiz
UPDATE public.muassasalar m
   SET mskt_bor         = m.mskt_bor OR v.mskt_bor,
       angiografiya_bor = m.angiografiya_bor OR v.angiografiya_bor,
       imkoniyat_updated_at = now()
  FROM public.muassasalar v
 WHERE m.nomi = 'Andijon TTB'
   AND lower(btrim(v.nomi)) LIKE 'андижон туман%'
   AND (v.mskt_bor OR v.angiografiya_bor);

-- 3.2) Muassasalar jadvalidan o'chirish
DELETE FROM public.muassasalar
 WHERE lower(btrim(nomi)) LIKE 'андижон туман%';

-- 3.3) Admin paneldagi qo'shimcha ro'yxatdan o'chirish
--      (formalardagi ochiluvchi ro'yxat shu jadvaldan quriladi)
DELETE FROM public.muassasa_overrides
 WHERE lower(btrim(nomi)) LIKE 'андижон туман%';


-- ============ 4. TEKSHIRUV ============

-- 4.1) Eski nomdan biror joyda asar qoldimi? Natija BO'SH bo'lishi kerak.
SELECT 'infarkt_qabul.muassasa' AS joy, COUNT(*) AS qoldiq
  FROM public.infarkt_qabul WHERE lower(btrim(muassasa)) LIKE 'андижон туман%'
UNION ALL SELECT 'insult_qabul.muassasa', COUNT(*)
  FROM public.insult_qabul WHERE lower(btrim(muassasa)) LIKE 'андижон туман%'
UNION ALL SELECT 'infarkt_qabul.otkazilgan', COUNT(*)
  FROM public.infarkt_qabul WHERE lower(btrim(otkazilgan_muassasa)) LIKE 'андижон туман%'
UNION ALL SELECT 'insult_qabul.otkazilgan', COUNT(*)
  FROM public.insult_qabul WHERE lower(btrim(otkazilgan_muassasa)) LIKE 'андижон туман%'
UNION ALL SELECT 'transfer_log', COUNT(*)
  FROM public.transfer_log
 WHERE lower(btrim(muassasa_dan)) LIKE 'андижон туман%'
    OR lower(btrim(muassasa_ga))  LIKE 'андижон туман%'
UNION ALL SELECT 'profiles', COUNT(*)
  FROM public.profiles WHERE lower(btrim(muassasa)) LIKE 'андижон туман%'
UNION ALL SELECT 'muassasalar', COUNT(*)
  FROM public.muassasalar WHERE lower(btrim(nomi)) LIKE 'андижон туман%'
UNION ALL SELECT 'muassasa_overrides', COUNT(*)
  FROM public.muassasa_overrides WHERE lower(btrim(nomi)) LIKE 'андижон туман%';

-- 4.2) "Andijon TTB" endi nechta bemorga ega?
SELECT 'infarkt' AS registr, COUNT(*) AS bemorlar
  FROM public.infarkt_qabul WHERE muassasa = 'Andijon TTB'
UNION ALL
SELECT 'insult', COUNT(*)
  FROM public.insult_qabul WHERE muassasa = 'Andijon TTB';
