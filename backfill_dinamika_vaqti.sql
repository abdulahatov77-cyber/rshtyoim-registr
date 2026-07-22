-- ============================================================
-- RETRO KIRITILGAN BEMORLARDA VAQTNI TUZATISH (2026-07-22, v2)
--
-- Muammo: eski sana bilan kiritilgan bemorlarning dinamika
-- muolajalari, holat o'lchovlari, navbatchi yozuvlari va transfer
-- yozuvlari kiritilgan kun vaqti bilan saqlanib qolgan.
--
-- Tuzatish qoidasi:
--   * Yangi vaqt = chiqish_sana kuni (dinamika 10:00, holat 09:00,
--     navbatchi 08:00, Toshkent). Bir bemorda bir nechta yozuv
--     bo'lsa, tartib saqlanishi uchun 30 daqiqadan qo'shiladi.
--   * MUHIM (v2): agar chiqish_sana ham shubhali bo'lsa
--     (qabuldan 30 kundan ko'p keyin — demak chiqarish varaqasi ham
--     kech to'ldirilgan) — unga bog'lanmaymiz, qabul_vaqt + 1 kun
--     ishlatiladi.
--
-- Shart (xavfsizlik): faqat yozuv vaqti qabul vaqtidan 30 kundan
-- ko'proq keyin bo'lgan (aniq retro) yozuvlar tuzatiladi.
--
-- ISHGA TUSHIRISH: Supabase Dashboard -> SQL Editor
-- Tartib: 1 (preview) -> 2,3,4,5 -> 6 (tekshiruv) -> 7 (chiqish
-- sanasi shubhali varaqalar ro'yxati — qo'lda ko'rib chiqish uchun)
-- ============================================================

-- ============================================================
-- 1) PREVIEW — nima o'zgarishini oldindan ko'rish (hech narsa yozmaydi)
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt, 'insult' AS turi FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt, 'infarkt' FROM infarkt_qabul
),
chiq AS (
  SELECT kt_no, max(chiqish_sana::date) AS chiqish_sana FROM insult_chiqarish GROUP BY kt_no
  UNION ALL
  SELECT kt_no, max(chiqish_sana::date) FROM infarkt_chiqarish GROUP BY kt_no
)
SELECT d.kt_no, b.turi, d.muolaja_turi,
       d.created_at AT TIME ZONE 'Asia/Tashkent'  AS hozirgi_notogri_vaqt,
       b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent'  AS qabul_vaqti,
       c.chiqish_sana                              AS chiqish_sanasi,
       COALESCE(
         CASE WHEN c.chiqish_sana <= (b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
              THEN (c.chiqish_sana + time '10:00') AT TIME ZONE 'Asia/Tashkent' END,
         b.qabul_vaqt + interval '1 day'
       ) AT TIME ZONE 'Asia/Tashkent'              AS yangi_vaqt
FROM dinamika_muolajalar d
JOIN bemor b ON b.kt_no = d.kt_no AND b.turi = d.registr_turi
LEFT JOIN chiq c ON c.kt_no = d.kt_no
WHERE d.created_at > b.qabul_vaqt + interval '30 days'
ORDER BY d.kt_no;

-- ============================================================
-- 2) DINAMIKA MUOLAJALARNI TUZATISH
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt, 'insult' AS turi FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt, 'infarkt' FROM infarkt_qabul
),
chiq AS (
  SELECT kt_no, max(chiqish_sana::date) AS chiqish_sana FROM insult_chiqarish GROUP BY kt_no
  UNION ALL
  SELECT kt_no, max(chiqish_sana::date) FROM infarkt_chiqarish GROUP BY kt_no
),
t AS (
  SELECT d.id,
         b.qabul_vaqt,
         c.chiqish_sana,
         row_number() OVER (PARTITION BY d.kt_no ORDER BY d.created_at) AS rn
  FROM dinamika_muolajalar d
  JOIN bemor b ON b.kt_no = d.kt_no AND b.turi = d.registr_turi
  LEFT JOIN chiq c ON c.kt_no = d.kt_no
  WHERE d.created_at > b.qabul_vaqt + interval '30 days'
)
UPDATE dinamika_muolajalar d
SET created_at = COALESCE(
      CASE WHEN t.chiqish_sana <= (t.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
           THEN (t.chiqish_sana + time '10:00') AT TIME ZONE 'Asia/Tashkent' END,
      t.qabul_vaqt + interval '1 day'
    ) + (t.rn - 1) * interval '30 minutes'
FROM t
WHERE d.id = t.id;

-- ============================================================
-- 3) TRANSFER_LOG (bemor harakati) SANASINI TUZATISH
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt FROM infarkt_qabul
),
chiq AS (
  SELECT kt_no, max(chiqish_sana::date) AS chiqish_sana FROM insult_chiqarish GROUP BY kt_no
  UNION ALL
  SELECT kt_no, max(chiqish_sana::date) FROM infarkt_chiqarish GROUP BY kt_no
)
UPDATE transfer_log tl
SET sana = COALESCE(
      CASE WHEN c.chiqish_sana <= (b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
           THEN c.chiqish_sana END,
      (b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 1)
FROM bemor b
LEFT JOIN chiq c ON c.kt_no = b.kt_no
WHERE tl.kt_no = b.kt_no
  AND tl.sana::date > ((b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30);

-- ============================================================
-- 4) HOLAT DINAMIKASI (qon bosimi, puls, harorat) VAQTINI TUZATISH
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt, 'insult' AS turi FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt, 'infarkt' FROM infarkt_qabul
),
chiq AS (
  SELECT kt_no, max(chiqish_sana::date) AS chiqish_sana FROM insult_chiqarish GROUP BY kt_no
  UNION ALL
  SELECT kt_no, max(chiqish_sana::date) FROM infarkt_chiqarish GROUP BY kt_no
),
t AS (
  SELECT h.id,
         b.qabul_vaqt,
         c.chiqish_sana,
         row_number() OVER (PARTITION BY h.kt_no ORDER BY h.created_at) AS rn
  FROM holat_dinamikasi h
  JOIN bemor b ON b.kt_no = h.kt_no AND b.turi = h.registr_turi
  LEFT JOIN chiq c ON c.kt_no = h.kt_no
  WHERE h.created_at > b.qabul_vaqt + interval '30 days'
)
UPDATE holat_dinamikasi h
SET created_at = COALESCE(
      CASE WHEN t.chiqish_sana <= (t.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
           THEN (t.chiqish_sana + time '09:00') AT TIME ZONE 'Asia/Tashkent' END,
      t.qabul_vaqt + interval '1 day'
    ) + (t.rn - 1) * interval '30 minutes'
FROM t
WHERE h.id = t.id;

-- ============================================================
-- 5) NAVBATCHI JURNALI VAQTINI TUZATISH
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt, 'insult' AS turi FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt, 'infarkt' FROM infarkt_qabul
),
chiq AS (
  SELECT kt_no, max(chiqish_sana::date) AS chiqish_sana FROM insult_chiqarish GROUP BY kt_no
  UNION ALL
  SELECT kt_no, max(chiqish_sana::date) FROM infarkt_chiqarish GROUP BY kt_no
),
t AS (
  SELECT n.id,
         b.qabul_vaqt,
         c.chiqish_sana,
         row_number() OVER (PARTITION BY n.kt_no ORDER BY n.created_at) AS rn
  FROM navbatchi_jurnal n
  JOIN bemor b ON b.kt_no = n.kt_no AND b.turi = n.registr_turi
  LEFT JOIN chiq c ON c.kt_no = n.kt_no
  WHERE n.created_at > b.qabul_vaqt + interval '30 days'
)
UPDATE navbatchi_jurnal n
SET created_at = COALESCE(
      CASE WHEN t.chiqish_sana <= (t.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
           THEN (t.chiqish_sana + time '08:00') AT TIME ZONE 'Asia/Tashkent' END,
      t.qabul_vaqt + interval '1 day'
    ) + (t.rn - 1) * interval '30 minutes'
FROM t
WHERE n.id = t.id;

-- ============================================================
-- ESLATMA: kuzatuv (30 kun / 3 oy / 6 oy / 1 yil follow-up) va
-- bemor_fayllari ATAYIN tuzatilmaydi — ularda yozuv vaqti
-- qabuldan ancha keyin bo'lishi tabiiy.
-- ============================================================

-- ============================================================
-- 6) NATIJANI TEKSHIRISH — retro muammo qolmaganini ko'rish
--    (0 qator qaytishi kerak)
-- ============================================================
WITH bemor AS (
  SELECT kt_no, qabul_vaqt, 'insult' AS turi FROM insult_qabul
  UNION ALL
  SELECT kt_no, qabul_vaqt, 'infarkt' FROM infarkt_qabul
)
SELECT x.jadval, x.kt_no,
       x.created_at AT TIME ZONE 'Asia/Tashkent' AS vaqt,
       b.qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS qabul
FROM (
  SELECT 'dinamika_muolajalar' AS jadval, kt_no, registr_turi, created_at FROM dinamika_muolajalar
  UNION ALL
  SELECT 'holat_dinamikasi', kt_no, registr_turi, created_at FROM holat_dinamikasi
  UNION ALL
  SELECT 'navbatchi_jurnal', kt_no, registr_turi, created_at FROM navbatchi_jurnal
) x
JOIN bemor b ON b.kt_no = x.kt_no AND b.turi = x.registr_turi
WHERE x.created_at > b.qabul_vaqt + interval '30 days';

-- ============================================================
-- 7) CHIQISH SANASI SHUBHALI VARAQALAR — QO'LDA KO'RIB CHIQING
--    (chiqish_sana qabuldan 30 kundan ko'p keyin — ehtimol varaqa
--    kech to'ldirilib, chiqish sanasi noto'g'ri qo'yilgan.
--    Bularni bemor kartasi -> Chiqarish oynasidan to'g'rilang.)
-- ============================================================
SELECT 'insult' AS turi, c.kt_no, q.fio,
       q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS qabul,
       c.chiqish_sana::date AS chiqish_sana
FROM insult_chiqarish c
JOIN insult_qabul q ON q.kt_no = c.kt_no
WHERE c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
UNION ALL
SELECT 'infarkt', c.kt_no, q.fio,
       q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent',
       c.chiqish_sana::date
FROM infarkt_chiqarish c
JOIN infarkt_qabul q ON q.kt_no = c.kt_no
WHERE c.chiqish_sana::date > (q.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date + 30
ORDER BY 1, 2;
