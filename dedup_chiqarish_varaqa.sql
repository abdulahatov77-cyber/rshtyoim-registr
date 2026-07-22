-- ============================================================
-- TAKRORIY CHIQARISH VARAQALARINI TOZALASH (2026-07-22, v2)
--
-- Qoida: har bemorda BITTA varaqa qoladi — eng ko'p maydoni
-- to'ldirilgani; teng bo'lsa eng oxirgi saqlangani.
--
-- v2 HIMOYA — quyidagilar AVTOMATIK O'CHIRILMAYDI (qo'lda hal):
--   A) bitta kt_no ostida bir nechta bemor (qabul yozuvi) bo'lsa —
--      varaqalar har xil bemorniki bo'lishi mumkin!
--   B) guruhda "Vafot etdi" bilan boshqa natija to'qnashsa —
--      vafot kritik ma'lumot, filial bilan aniqlashtirish kerak
--      (masalan: 1464, KT-13973, KT-282)
--
-- TARTIB: 1,2 (ogohlantirish ro'yxatlari) -> 3,4 (preview) ->
--         5,6 (o'chirish) -> 7 (tekshiruv) -> A/B holatlar qo'lda
--         hal bo'lgach 8 (unikal indeks himoyasi)
-- ============================================================

-- ============================================================
-- 1) [A] BITTA KT_NO OSTIDA BIR NECHTA BEMOR — QO'LDA HAL QILING
--    (kt_dublikat_fix.sql uslubida kt_no ajratish kerak)
-- ============================================================
SELECT 'insult' AS turi, q.kt_no, count(*) AS bemor_soni,
       array_agg(q.fio) AS bemorlar
FROM insult_qabul q GROUP BY q.kt_no HAVING count(*) > 1
UNION ALL
SELECT 'infarkt', q.kt_no, count(*), array_agg(q.fio)
FROM infarkt_qabul q GROUP BY q.kt_no HAVING count(*) > 1
ORDER BY 1, 2;

-- ============================================================
-- 2) [B] VAFOT-ZIDDIYATLI GURUHLAR — QO'LDA HAL QILING
--    (bemor rostdan vafot etganmi — filialdan aniqlashtiring,
--    keyin noto'g'ri varaqani bemor kartasidan o'chiring)
-- ============================================================
SELECT 'insult' AS turi, c.kt_no, c.chiqish_sana::date AS chiqish,
       c.natija, c.created_at AT TIME ZONE 'Asia/Tashkent' AS toldirilgan
FROM insult_chiqarish c
WHERE c.kt_no IN (
  SELECT kt_no FROM insult_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE natija = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE natija IS DISTINCT FROM 'Vafot etdi') > 0
)
UNION ALL
SELECT 'infarkt', c.kt_no, c.chiqish_sana::date,
       c.chiqish_holat, c.created_at AT TIME ZONE 'Asia/Tashkent'
FROM infarkt_chiqarish c
WHERE c.kt_no IN (
  SELECT kt_no FROM infarkt_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE chiqish_holat = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE chiqish_holat IS DISTINCT FROM 'Vafot etdi') > 0
)
ORDER BY 1, 2, 5;

-- ============================================================
-- 3) PREVIEW — INFARKT (A va B holatlar chiqarib tashlangan)
-- ============================================================
WITH istisno AS (
  SELECT kt_no FROM infarkt_qabul GROUP BY kt_no HAVING count(*) > 1
  UNION
  SELECT kt_no FROM infarkt_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE chiqish_holat = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE chiqish_holat IS DISTINCT FROM 'Vafot etdi') > 0
),
ranked AS (
  SELECT id, kt_no, created_at, chiqish_sana::date AS chiqish_sana,
         chiqish_holat, statsionarda_kun,
         row_number() OVER (
           PARTITION BY kt_no
           ORDER BY ((chiqish_holat IS NOT NULL)::int
                   + (statsionarda_kun IS NOT NULL)::int
                   + (yakuniy_diagnoz IS NOT NULL)::int
                   + (tavsiyalar IS NOT NULL)::int
                   + (olim_sababi IS NOT NULL)::int) DESC,
             created_at DESC
         ) AS rn
  FROM infarkt_chiqarish
  WHERE kt_no IN (SELECT kt_no FROM infarkt_chiqarish GROUP BY kt_no HAVING count(*) > 1)
    AND kt_no NOT IN (SELECT kt_no FROM istisno)
)
SELECT kt_no, chiqish_sana, chiqish_holat, statsionarda_kun,
       created_at AT TIME ZONE 'Asia/Tashkent' AS toldirilgan_vaqt,
       CASE WHEN rn = 1 THEN '✅ saqlanadi' ELSE '❌ o''chiriladi' END AS saqlanadi
FROM ranked
ORDER BY kt_no, rn;

-- ============================================================
-- 4) PREVIEW — INSULT (A va B holatlar chiqarib tashlangan)
-- ============================================================
WITH istisno AS (
  SELECT kt_no FROM insult_qabul GROUP BY kt_no HAVING count(*) > 1
  UNION
  SELECT kt_no FROM insult_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE natija = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE natija IS DISTINCT FROM 'Vafot etdi') > 0
),
ranked AS (
  SELECT id, kt_no, created_at, chiqish_sana::date AS chiqish_sana,
         nihss_chiqish, mrs_daraja, natija,
         row_number() OVER (
           PARTITION BY kt_no
           ORDER BY ((nihss_chiqish IS NOT NULL)::int
                   + (mrs_daraja IS NOT NULL)::int
                   + (natija IS NOT NULL)::int
                   + (boshqa_shifo IS NOT NULL)::int
                   + (reab_markazi IS NOT NULL)::int) DESC,
             created_at DESC
         ) AS rn
  FROM insult_chiqarish
  WHERE kt_no IN (SELECT kt_no FROM insult_chiqarish GROUP BY kt_no HAVING count(*) > 1)
    AND kt_no NOT IN (SELECT kt_no FROM istisno)
)
SELECT kt_no, chiqish_sana, nihss_chiqish, mrs_daraja, natija,
       created_at AT TIME ZONE 'Asia/Tashkent' AS toldirilgan_vaqt,
       CASE WHEN rn = 1 THEN '✅ saqlanadi' ELSE '❌ o''chiriladi' END AS saqlanadi
FROM ranked
ORDER BY kt_no, rn;

-- ============================================================
-- 5) INFARKT TAKRORIYLARINI O'CHIRISH (A va B holatlarsiz)
-- ============================================================
WITH istisno AS (
  SELECT kt_no FROM infarkt_qabul GROUP BY kt_no HAVING count(*) > 1
  UNION
  SELECT kt_no FROM infarkt_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE chiqish_holat = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE chiqish_holat IS DISTINCT FROM 'Vafot etdi') > 0
),
ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY kt_no
           ORDER BY ((chiqish_holat IS NOT NULL)::int
                   + (statsionarda_kun IS NOT NULL)::int
                   + (yakuniy_diagnoz IS NOT NULL)::int
                   + (tavsiyalar IS NOT NULL)::int
                   + (olim_sababi IS NOT NULL)::int) DESC,
             created_at DESC
         ) AS rn
  FROM infarkt_chiqarish
  WHERE kt_no IN (SELECT kt_no FROM infarkt_chiqarish GROUP BY kt_no HAVING count(*) > 1)
    AND kt_no NOT IN (SELECT kt_no FROM istisno)
)
DELETE FROM infarkt_chiqarish
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ============================================================
-- 6) INSULT TAKRORIYLARINI O'CHIRISH (A va B holatlarsiz)
-- ============================================================
WITH istisno AS (
  SELECT kt_no FROM insult_qabul GROUP BY kt_no HAVING count(*) > 1
  UNION
  SELECT kt_no FROM insult_chiqarish GROUP BY kt_no
  HAVING count(*) > 1
     AND count(*) FILTER (WHERE natija = 'Vafot etdi') > 0
     AND count(*) FILTER (WHERE natija IS DISTINCT FROM 'Vafot etdi') > 0
),
ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY kt_no
           ORDER BY ((nihss_chiqish IS NOT NULL)::int
                   + (mrs_daraja IS NOT NULL)::int
                   + (natija IS NOT NULL)::int
                   + (boshqa_shifo IS NOT NULL)::int
                   + (reab_markazi IS NOT NULL)::int) DESC,
             created_at DESC
         ) AS rn
  FROM insult_chiqarish
  WHERE kt_no IN (SELECT kt_no FROM insult_chiqarish GROUP BY kt_no HAVING count(*) > 1)
    AND kt_no NOT IN (SELECT kt_no FROM istisno)
)
DELETE FROM insult_chiqarish
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ============================================================
-- 7) TEKSHIRUV — faqat A/B (qo'lda hal qilinadigan) guruhlar
--    qolishi kerak
-- ============================================================
SELECT 'insult' AS turi, kt_no, count(*) AS varaqa_soni
FROM insult_chiqarish GROUP BY kt_no HAVING count(*) > 1
UNION ALL
SELECT 'infarkt', kt_no, count(*)
FROM infarkt_chiqarish GROUP BY kt_no HAVING count(*) > 1
ORDER BY 1, 2;

-- ============================================================
-- 8) HIMOYA — unikal indeks (bitta bemarga bitta varaqa)
--    FAQAT 7-tekshiruv 0 qator qaytargandan KEYIN ishga
--    tushiring (A/B holatlar qo'lda hal bo'lgach), aks holda
--    indeks yaratilmaydi.
-- ============================================================
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_infarkt_chiqarish_ktno ON infarkt_chiqarish (kt_no);
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_insult_chiqarish_ktno  ON insult_chiqarish (kt_no);
