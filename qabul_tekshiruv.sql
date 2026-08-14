-- =====================================================================
-- "QABUL KUTILMOQDA" RO'YXATI SIFATINI TEKSHIRISH
-- =====================================================================
-- Savol: ro'yxatda turgan bemorlarning qanchasi aslida o'sha muassasaga
--        allaqachon kiritilgan (ya'ni ro'yxatda behuda turibdi)?
--
-- Dastur bemorni ro'yxatdan chiqarish uchun qabul qiluvchi muassasada
-- shu odamga (F.I.O + tug'ilgan yil) yangi karta ochilganini qidiradi.
-- Agar qabul qiluvchi shifokor F.I.O ni boshqacha yozgan bo'lsa, dastur
-- moslikni topolmaydi va bemor ro'yxatda qolib ketadi.
--
-- Bu so'rov shundaylarni ajratib beradi.
--
-- USTUNLAR:
--   jami_yuborilgan     — 30 kunda shu muassasaga yo'naltirilgan
--   qabul_qilingan      — karta ochilgan, dastur ham ko'rgan (ro'yxatda yo'q)
--   shubhali_kutilmoqda — o'sha yili tug'ilgan, familiyasi o'xshash bemor
--                         kiritilgan, lekin F.I.O aynan mos emas.
--                         KO'PCHILIGI — ro'yxatda behuda turganlar.
--   haqiqiy_kutilmoqda  — hech qanday karta topilmadi, rostdan kutilmoqda
-- =====================================================================

WITH kutilayotgan AS (
  SELECT 'infarkt'::text AS turi, kt_no, fio, tugilgan_yil, viloyat,
         muassasa, otkazilgan_muassasa, qabul_vaqt
    FROM infarkt_qabul
   WHERE status = 'otkazildi'
     AND otkazilgan_muassasa IS NOT NULL AND btrim(otkazilgan_muassasa) <> ''
     AND qabul_vaqt >= now() - interval '30 days'
  UNION ALL
  SELECT 'insult', kt_no, fio, tugilgan_yil, viloyat,
         muassasa, otkazilgan_muassasa, qabul_vaqt
    FROM insult_qabul
   WHERE status = 'otkazildi'
     AND otkazilgan_muassasa IS NOT NULL AND btrim(otkazilgan_muassasa) <> ''
     AND qabul_vaqt >= now() - interval '30 days'
),
-- Qabul qiluvchi tomonning kartalari shu yerdan qidiriladi
kartalar AS (
  SELECT fio, tugilgan_yil, muassasa, qabul_vaqt FROM infarkt_qabul
   WHERE qabul_vaqt >= now() - interval '60 days'
  UNION ALL
  SELECT fio, tugilgan_yil, muassasa, qabul_vaqt FROM insult_qabul
   WHERE qabul_vaqt >= now() - interval '60 days'
),
-- Solishtirish kalitlari: katta-kichik harf, apostrof, bo'sh joy farqi yo'qoladi
k AS (
  SELECT *,
         lower(regexp_replace(coalesce(fio,''), '[^[:alnum:]]', '', 'g'))               AS fiok,
         left(coalesce(tugilgan_yil::text,''), 4)                                       AS yil,
         lower(regexp_replace(coalesce(otkazilgan_muassasa,''), '[^[:alnum:]]', '', 'g')) AS manzilk
    FROM kutilayotgan
),
c AS (
  SELECT *,
         lower(regexp_replace(coalesce(fio,''), '[^[:alnum:]]', '', 'g'))        AS fiok,
         left(coalesce(tugilgan_yil::text,''), 4)                                AS yil,
         lower(regexp_replace(coalesce(muassasa,''), '[^[:alnum:]]', '', 'g'))    AS muassasak
    FROM kartalar
),
belgilangan AS (
  SELECT k.*,
    EXISTS (
      SELECT 1 FROM c
       WHERE c.muassasak = k.manzilk
         AND c.fiok = k.fiok AND c.fiok <> ''
         AND c.yil  = k.yil  AND c.yil  <> ''
         AND c.qabul_vaqt >= k.qabul_vaqt
    ) AS aniq,
    EXISTS (
      SELECT 1 FROM c
       WHERE c.muassasak = k.manzilk
         AND c.yil = k.yil AND c.yil <> ''
         AND c.fiok <> k.fiok
         AND length(k.fiok) >= 4
         AND left(c.fiok, 4) = left(k.fiok, 4)
         AND c.qabul_vaqt >= k.qabul_vaqt
    ) AS taxminiy
  FROM k
)
SELECT otkazilgan_muassasa                                       AS qabul_qiluvchi,
       COUNT(*)                                                  AS jami_yuborilgan,
       COUNT(*) FILTER (WHERE aniq)                              AS qabul_qilingan,
       COUNT(*) FILTER (WHERE NOT aniq AND taxminiy)             AS shubhali_kutilmoqda,
       COUNT(*) FILTER (WHERE NOT aniq AND NOT taxminiy)         AS haqiqiy_kutilmoqda
  FROM belgilangan
 GROUP BY 1
HAVING COUNT(*) FILTER (WHERE NOT aniq) > 0
 ORDER BY shubhali_kutilmoqda DESC, haqiqiy_kutilmoqda DESC;


-- =====================================================================
-- SHUBHALILARNING RO'YXATI — qaysi bemor, qanday yozilgan
-- Yuqoridagi so'rovda shubhali chiqsa, kimligini shu ko'rsatadi.
-- =====================================================================
-- WITH ... (yuqoridagi CTE larni nusxalang) ...
-- SELECT b.turi, b.kt_no, b.fio AS yuborilgan_fio, b.tugilgan_yil,
--        b.muassasa AS yuborgan, b.otkazilgan_muassasa AS qabul_qiluvchi,
--        (SELECT string_agg(DISTINCT c.fio, ' | ') FROM c
--          WHERE c.muassasak = b.manzilk AND c.yil = b.yil
--            AND left(c.fiok,4) = left(b.fiok,4)
--            AND c.qabul_vaqt >= b.qabul_vaqt) AS qabul_joydagi_fio
--   FROM belgilangan b
--  WHERE NOT b.aniq AND b.taxminiy
--  ORDER BY b.qabul_vaqt DESC;
-- =====================================================================
