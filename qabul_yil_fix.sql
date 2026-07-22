-- ============================================================
-- QABUL YILI XATO BEMORLARNI TUZATISH (2026-07-22)
--
-- 7 bemorda qabul yili 2025 deb yozilgan, aslida 2026
-- (chiqish sanasi qabuldan ~1 yil keyin bo'lgani shundan).
-- Yil +1 qilinadi, kun/soat o'zgarmaydi.
--
-- RISH-6849 (Isom Iddinov) — qabul 1939-10-20 (tug'ilgan sana
-- kirib qolgan!) — bu AVTOMATIK TUZATILMAYDI, pastdagi 3-bo'lim
-- ma'lumotiga qarab bemor kartasidan qo'lda to'g'rilang.
--
-- TARTIB: 1 (preview) -> 2 (tuzatish) -> 3 (RISH-6849 ma'lumoti)
-- Bundan keyin fix_chiqish_sana.sql 2-3 bo'limlarini QAYTA
-- ishga tushiring (bu bemorlarning chiqish sanasi qayta
-- hisoblanishi uchun), so'ng backfill_dinamika_vaqti.sql 2-5, 6.
-- ============================================================

-- ============================================================
-- 1) PREVIEW (yozmaydi)
-- ============================================================
SELECT 'infarkt' AS turi, kt_no, fio,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS eski_qabul,
       (qabul_vaqt + interval '1 year') AT TIME ZONE 'Asia/Tashkent' AS yangi_qabul
FROM infarkt_qabul
WHERE kt_no IN ('7758', '12625', '9966', '4516')
  AND qabul_vaqt < '2026-01-01'
UNION ALL
SELECT 'insult', kt_no, fio,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent',
       (qabul_vaqt + interval '1 year') AT TIME ZONE 'Asia/Tashkent'
FROM insult_qabul
WHERE kt_no IN ('KT-260722-6545 1152', 'KT-12221-1282', 'KT-15712/1296')
  AND qabul_vaqt < '2026-01-01'
ORDER BY 1, 2;

-- ============================================================
-- 2) TUZATISH — yil +1
-- ============================================================
UPDATE infarkt_qabul
SET qabul_vaqt = qabul_vaqt + interval '1 year'
WHERE kt_no IN ('7758', '12625', '9966', '4516')
  AND qabul_vaqt < '2026-01-01';

UPDATE insult_qabul
SET qabul_vaqt = qabul_vaqt + interval '1 year'
WHERE kt_no IN ('KT-260722-6545 1152', 'KT-12221-1282', 'KT-15712/1296')
  AND qabul_vaqt < '2026-01-01';

-- ============================================================
-- 3) RISH-6849 — qo'lda tuzatish uchun ma'lumot
--    (yozuv qachon kiritilgan, tug'ilgan sana, chiqish sanasi —
--    shularga qarab haqiqiy qabul sanasini kartadan to'g'rilang)
-- ============================================================
SELECT q.kt_no, q.fio,
       q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent'  AS notogri_qabul,
       q.tugilgan_sana,
       q.created_at AT TIME ZONE 'Asia/Tashkent'  AS yozuv_kiritilgan,
       c.chiqish_sana::date                        AS chiqish_sana
FROM insult_qabul q
LEFT JOIN insult_chiqarish c ON c.kt_no = q.kt_no
WHERE q.kt_no = 'RISH-6849';

-- ============================================================
-- 4) RISH-6849 TUZATISH — qabul 20.10, chiqish 26.10, yil 1939
--    bo'lib ketgan (6 kunlik yotish davri saqlangan).
--    Oktabr 2026 hali kelmagani uchun haqiqiy yil = 2025.
--    (Iloji bo'lsa Rishton filialidan tasdiqlatib oling.)
-- ============================================================
UPDATE insult_qabul
SET qabul_vaqt = '2025-10-20 10:55:00+05'
WHERE kt_no = 'RISH-6849' AND qabul_vaqt < '2000-01-01';

UPDATE insult_chiqarish
SET chiqish_sana = '2025-10-26'
WHERE kt_no = 'RISH-6849' AND chiqish_sana < '2000-01-01';
