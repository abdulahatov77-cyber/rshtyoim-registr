-- ============================================================
-- NOTO'G'RI CHIQISH SANALARINI TUZATISH (2026-07-22)
--
-- Muammo: chiqarish varaqalari kech (ommaviy) to'ldirilganda
-- chiqish_sana sifatida to'ldirilgan kun yozilib qolgan —
-- natijada chiqish sanasi qabuldan 1-3 oy keyin, ba'zilarida
-- hatto kelajakda.
--
-- Tuzatish qoidasi (taxminiy, chunki haqiqiy sana yo'q):
--   * infarkt: chiqish = qabul + statsionarda_kun (agar varaqada
--     yotgan kunlar soni yozilgan bo'lsa, 1-60 oralig'ida) —
--     bu haqiqiy ma'lumot!
--   * aks holda: chiqish = qabul + o'rtacha yotish muddati
--     (to'g'ri to'ldirilgan varaqalardan avtomatik hisoblanadi,
--     topilmasa 10 kun).
--
-- Shubhali deb hisoblanadi:
--   chiqish qabuldan 30 kundan ko'p keyin, YOKI kelajakda,
--   YOKI qabuldan oldin.
--
-- MUHIM TARTIB:
--   1) Shu skript (chiqish sanalari tuzatiladi)
--   2) Keyin backfill_dinamika_vaqti.sql 2-5 bo'limlari
--      (muolaja/holat/navbatchi vaqtlari chiqishga bog'lanadi)
--   3) backfill_dinamika_vaqti.sql 6-bo'lim tekshiruvi
-- ============================================================

-- ============================================================
-- 1) PREVIEW — INFARKT (hech narsa yozmaydi)
-- ============================================================
WITH med AS (
  SELECT round(percentile_cont(0.5) WITHIN GROUP (
           ORDER BY c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
         ))::int AS kun
  FROM infarkt_chiqarish c
  JOIN infarkt_qabul q ON q.kt_no = c.kt_no
  WHERE c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date BETWEEN 1 AND 30
)
SELECT c.kt_no, q.fio,
       (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date AS qabul_sana,
       c.chiqish_sana::date                              AS eski_chiqish,
       c.statsionarda_kun,
       (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
         + COALESCE(CASE WHEN c.statsionarda_kun BETWEEN 1 AND 60 THEN c.statsionarda_kun END,
                    m.kun, 10)                           AS yangi_chiqish
FROM infarkt_chiqarish c
JOIN infarkt_qabul q ON q.kt_no = c.kt_no
CROSS JOIN med m
WHERE c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
   OR c.chiqish_sana::date > current_date
   OR c.chiqish_sana::date < (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
ORDER BY c.kt_no;

-- ============================================================
-- 2) INFARKT CHIQISH SANALARINI TUZATISH
-- ============================================================
WITH med AS (
  SELECT round(percentile_cont(0.5) WITHIN GROUP (
           ORDER BY c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
         ))::int AS kun
  FROM infarkt_chiqarish c
  JOIN infarkt_qabul q ON q.kt_no = c.kt_no
  WHERE c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date BETWEEN 1 AND 30
)
UPDATE infarkt_chiqarish c
SET chiqish_sana = (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
                   + COALESCE(CASE WHEN c.statsionarda_kun BETWEEN 1 AND 60 THEN c.statsionarda_kun END,
                              m.kun, 10)
FROM infarkt_qabul q, med m
WHERE q.kt_no = c.kt_no
  AND (c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
       OR c.chiqish_sana::date > current_date
       OR c.chiqish_sana::date < (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date);

-- ============================================================
-- 3) INSULT CHIQISH SANALARINI TUZATISH
--    (insult varaqasida yotgan kunlar soni yo'q — o'rtacha muddat)
-- ============================================================
WITH med AS (
  SELECT round(percentile_cont(0.5) WITHIN GROUP (
           ORDER BY c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
         ))::int AS kun
  FROM insult_chiqarish c
  JOIN insult_qabul q ON q.kt_no = c.kt_no
  WHERE c.chiqish_sana::date - (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date BETWEEN 1 AND 30
)
UPDATE insult_chiqarish c
SET chiqish_sana = (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + COALESCE(m.kun, 10)
FROM insult_qabul q, med m
WHERE q.kt_no = c.kt_no
  AND (c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
       OR c.chiqish_sana::date > current_date
       OR c.chiqish_sana::date < (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date);

-- ============================================================
-- 4) TEKSHIRUV — shubhali chiqish sanasi qolmaganini ko'rish
--    (0 qator qaytishi kerak)
-- ============================================================
SELECT 'insult' AS turi, c.kt_no,
       (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date AS qabul,
       c.chiqish_sana::date AS chiqish
FROM insult_chiqarish c JOIN insult_qabul q ON q.kt_no = c.kt_no
WHERE c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
   OR c.chiqish_sana::date > current_date
   OR c.chiqish_sana::date < (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
UNION ALL
SELECT 'infarkt', c.kt_no,
       (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date,
       c.chiqish_sana::date
FROM infarkt_chiqarish c JOIN infarkt_qabul q ON q.kt_no = c.kt_no
WHERE c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
   OR c.chiqish_sana::date > current_date
   OR c.chiqish_sana::date < (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date;

-- ============================================================
-- 5) QABUL YILI SHUBHALI BEMORLAR — QO'LDA TEKSHIRING
--    (qabul 2025 va undan oldin — ehtimol yil xato kiritilgan,
--    masalan 2025-01-25 aslida 2026-01-25 bo'lishi kerak)
-- ============================================================
SELECT 'insult' AS turi, kt_no, fio,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS qabul
FROM insult_qabul WHERE qabul_vaqt < '2026-01-01'
UNION ALL
SELECT 'infarkt', kt_no, fio,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent'
FROM infarkt_qabul WHERE qabul_vaqt < '2026-01-01'
ORDER BY 1, 4;

-- ============================================================
-- 6) TAKRORIY CHIQARISH VARAQALARI — QO'LDA KO'RIB CHIQING
--    (bitta bemorda 2 ta varaqa: masalan 3247, 4057, 4640, 6777)
-- ============================================================
SELECT 'insult' AS turi, kt_no, count(*) AS varaqa_soni,
       array_agg(chiqish_sana::date ORDER BY chiqish_sana) AS sanalar
FROM insult_chiqarish GROUP BY kt_no HAVING count(*) > 1
UNION ALL
SELECT 'infarkt', kt_no, count(*),
       array_agg(chiqish_sana::date ORDER BY chiqish_sana)
FROM infarkt_chiqarish GROUP BY kt_no HAVING count(*) > 1
ORDER BY 1, 2;
