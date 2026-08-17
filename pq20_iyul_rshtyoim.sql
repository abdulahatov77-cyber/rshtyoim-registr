-- =====================================================================
-- ПҚ-20 OYLIK SHAKL — 2026 yil IYUL
-- Muassasa: Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi (Toshkent sh.)
-- =====================================================================
-- MOSLIK:
--   ЎМИ  -> infarkt_qabul  (STEMI, NSTEMI, AMI)
--   ЎЦВК -> insult_qabul   (ishemik, gemorragik, TIA)
--
-- AMI MASALASI HAL QILINMAGAN:
--   1-so'rov ЎМИ ni ikki xil sanaydi — "jami" (STEMI+NSTEMI+AMI) va
--   "faqat STEMI+NSTEMI". Qaysi biri rasmiy shaklga yozilishini o'zingiz
--   tanlaysiz. Farqi katta: AMI iyul oyida sezilarli ulushni tashkil qiladi.
--
-- VAQT ME'YORLARI — TAXMIN, TASDIQLASH KERAK:
--   Shaklda "30-35 дақиқа", "35-90 дақиқа" va h.k. deb yozilgan, lekin
--   nimadan nimagacha ekani ko'rsatilmagan. Quyidagicha olindi:
--     ЎМИ  30-35 daq  -> qabul -> EKG
--     ЎМИ  35-90 daq  -> qabul -> TLT yoki PCI
--     ЎЦВК 20-60 daq  -> qabul -> KT
--     ЎЦВК 60-105 daq -> qabul -> trombolizis yoki trombektomiya
--   Ta'rif boshqacha bo'lsa ayting — so'rov osongina moslanadi.
--
-- REGISTRDA YO'Q (shaklda bo'sh qoladi):
--   ПИНФЛ, 066-х shakl, МКБ kodi, klinik protokol/marshrut raqami,
--   103 chaqirilgan vaqt, dori vositalari va narxlari, moliyalashtirish,
--   narkotik vositalar.
-- =====================================================================

-- Davr va muassasa — kerak bo'lsa shu ikki qatorni o'zgartiring
-- 2026-07-01 00:00 dan 2026-08-01 00:00 gacha (Toshkent vaqti)


-- ============ 1-SO'ROV: ЖАДВАЛ №1 (jamlanma) ============

WITH inf AS (
  SELECT * FROM public.infarkt_qabul
   WHERE muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
     AND qabul_vaqt >= '2026-07-01 00:00+05' AND qabul_vaqt < '2026-08-01 00:00+05'
),
ins AS (
  SELECT * FROM public.insult_qabul
   WHERE muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
     AND qabul_vaqt >= '2026-07-01 00:00+05' AND qabul_vaqt < '2026-08-01 00:00+05'
),
-- daqiqalardagi oraliqlar
inf_m AS (
  SELECT *,
    EXTRACT(epoch FROM (ekg_vaqti_ts - qabul_vaqt)) / 60 AS daq_ekg,
    EXTRACT(epoch FROM (coalesce(pci_vaqt, tlt_vaqt) - qabul_vaqt)) / 60 AS daq_reperf
  FROM inf
),
ins_m AS (
  SELECT *,
    EXTRACT(epoch FROM (kt_vaqti - qabul_vaqt)) / 60 AS daq_kt,
    EXTRACT(epoch FROM (coalesce(trombolizis_vaqti, trombektomiya_vaqti) - qabul_vaqt)) / 60 AS daq_reperf
  FROM ins
)
SELECT
  1                                                            AS "№",
  'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'         AS "Муассаса номи",
  (SELECT COUNT(*) FROM inf) + (SELECT COUNT(*) FROM ins)       AS "Жами шошилинч мурожаат",
  (SELECT COUNT(*) FROM inf)                                    AS "ЎМИ (жами, AMI билан)",
  (SELECT COUNT(*) FROM inf
     WHERE upper(coalesce(infarkt_turi,'')) LIKE '%STEMI%')     AS "ЎМИ (фақат STEMI+NSTEMI)",
  (SELECT COUNT(*) FROM ins)                                    AS "ЎЦВК",
  (SELECT COUNT(*) FROM inf_m WHERE daq_ekg    BETWEEN 30 AND 35)  AS "ЎМИ 30-35 дақиқа",
  (SELECT COUNT(*) FROM inf_m WHERE daq_reperf BETWEEN 35 AND 90)  AS "ЎМИ 35-90 дақиқа",
  (SELECT COUNT(*) FROM ins_m WHERE daq_kt     BETWEEN 20 AND 60)  AS "ЎЦВК 20-60 дақиқа",
  (SELECT COUNT(*) FROM ins_m WHERE daq_reperf BETWEEN 60 AND 105) AS "ЎЦВК 60-105 дақиқа",
  (SELECT COUNT(*) FROM inf WHERE tlt_vaqt IS NOT NULL)
  + (SELECT COUNT(*) FROM ins WHERE trombolizis_vaqti IS NOT NULL) AS "Тромб эритувчи (абсолют сони)",
  NULL::numeric                                                 AS "Тромб эритувчи (суммаси) — маълумот йўқ",
  (SELECT COUNT(*) FROM inf WHERE pci_vaqt IS NOT NULL
      OR coalesce(muolaja_turi,'') ILIKE '%KAG%'
      OR coalesce(muolaja_turi,'') ILIKE '%ангиограф%'
      OR coalesce(muolaja_turi,'') ILIKE '%angiograf%')
  + (SELECT COUNT(*) FROM ins WHERE coalesce(mskt_angiografiya,'') <> ''
      OR coalesce(muolaja_turi,'') ILIKE '%angiograf%')          AS "Ангиография",
  (SELECT COUNT(*) FROM ins WHERE coalesce(mskt,'') ILIKE '%ha%' OR coalesce(mskt,'') ILIKE '%ҳа%'
      OR coalesce(muolaja_turi,'') ILIKE '%MSKT%')
  + (SELECT COUNT(*) FROM inf WHERE coalesce(muolaja_turi,'') ILIKE '%MSKT%') AS "МСКТ (МРТ)",
  NULL::bigint                                                  AS "Наркотик (абсолют) — маълумот йўқ",
  NULL::numeric                                                 AS "Наркотик (сумма) — маълумот йўқ",
  (SELECT COUNT(*) FROM inf WHERE coalesce(otkazilgan_muassasa,'') <> '')  AS "Ўтказилган ЎМИ",
  (SELECT COUNT(*) FROM ins WHERE coalesce(otkazilgan_muassasa,'') <> '')  AS "Ўтказилган ЎЦВК",
  (SELECT COUNT(*) FROM inf i JOIN public.infarkt_chiqarish c ON c.kt_no = i.kt_no
     WHERE i.status = 'vafot'
       AND EXTRACT(epoch FROM (c.chiqish_sana - i.qabul_vaqt))/3600 BETWEEN 6 AND 12)
  + (SELECT COUNT(*) FROM ins s JOIN public.insult_chiqarish c ON c.kt_no = s.kt_no
     WHERE s.status = 'vafot'
       AND EXTRACT(epoch FROM (c.chiqish_sana - s.qabul_vaqt))/3600 BETWEEN 6 AND 12) AS "Ўлим 6-12 соат",
  (SELECT COUNT(*) FROM inf i JOIN public.infarkt_chiqarish c ON c.kt_no = i.kt_no
     WHERE i.status = 'vafot'
       AND EXTRACT(epoch FROM (c.chiqish_sana - i.qabul_vaqt))/3600 > 12
       AND EXTRACT(epoch FROM (c.chiqish_sana - i.qabul_vaqt))/3600 <= 24)
  + (SELECT COUNT(*) FROM ins s JOIN public.insult_chiqarish c ON c.kt_no = s.kt_no
     WHERE s.status = 'vafot'
       AND EXTRACT(epoch FROM (c.chiqish_sana - s.qabul_vaqt))/3600 > 12
       AND EXTRACT(epoch FROM (c.chiqish_sana - s.qabul_vaqt))/3600 <= 24) AS "Ўлим 12-24 соат",
  (SELECT COUNT(*) FROM inf WHERE status = 'vafot')
  + (SELECT COUNT(*) FROM ins WHERE status = 'vafot')            AS "Жами ўлим (назорат учун)";


-- =====================================================================
-- 2-SO'ROV: ЖАДВАЛ №2 (беморлар рўйхати)
-- Alohida ishga tushiring — SQL Editor faqat oxirgi natijani ko'rsatadi.
-- Natijani Export -> CSV qilib, shakldagi ustunlarga ko'chirasiz.
-- =====================================================================

WITH hammasi AS (
  SELECT
    'ЎМИ'::text                       AS registr,
    q.qabul_vaqt,
    q.fio, q.tugilgan_sana, q.tugilgan_yil, q.jins,
    q.yashash_viloyat, q.yashash_tuman,
    q.infarkt_turi                    AS tashxis,
    q.simptom_vaqt,
    q.tez_yordam_kelgan_vaqt,
    q.ekg_vaqti_ts                    AS diagnostika_vaqti,
    'ЭКГ'::text                       AS diagnostika_turi,
    coalesce(q.pci_vaqt, q.tlt_vaqt)  AS reperfuziya_vaqti,
    q.otkazilgan_muassasa, q.muassasa, q.muolaja_turi
  FROM public.infarkt_qabul q
  WHERE q.muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
    AND q.qabul_vaqt >= '2026-07-01 00:00+05' AND q.qabul_vaqt < '2026-08-01 00:00+05'
  UNION ALL
  SELECT
    'ЎЦВК', q.qabul_vaqt,
    q.fio, q.tugilgan_sana, q.tugilgan_yil, q.jins,
    q.yashash_viloyat, q.yashash_tuman,
    q.insult_turi,
    q.simptom_vaqt,
    q.tez_yordam_kelgan_vaqt,
    q.kt_vaqti,
    'КТ/МСКТ',
    coalesce(q.trombolizis_vaqti, q.trombektomiya_vaqti),
    q.otkazilgan_muassasa, q.muassasa, q.muolaja_turi
  FROM public.insult_qabul q
  WHERE q.muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'
    AND q.qabul_vaqt >= '2026-07-01 00:00+05' AND q.qabul_vaqt < '2026-08-01 00:00+05'
)
SELECT
  row_number() OVER (ORDER BY qabul_vaqt)                       AS "№",
  fio                                                           AS "ФИО",
  ''                                                            AS "ПИНФЛ",
  coalesce(to_char(tugilgan_sana, 'DD.MM.YYYY'), tugilgan_yil::text) AS "туғилган сана",
  jins                                                          AS "жинси",
  btrim(coalesce(yashash_viloyat,'') || ', ' || coalesce(yashash_tuman,''), ', ') AS "яшаш манзили",
  ''                                                            AS "066-х рақами",
  ''                                                            AS "066-х сана",
  tashxis                                                       AS "Асосий ташхис",
  'шошилинч'                                                    AS "тиббий хизмат тури",
  ''                                                            AS "клиник протокол номи",
  ''                                                            AS "клиник маршрут рақами",
  simptom_vaqt                                                  AS "симптом бошланган вақт",
  ''                                                            AS "103 чақирилган вақт",
  to_char(tez_yordam_kelgan_vaqt AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') AS "103 келган вақт",
  to_char(qabul_vaqt            AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') AS "қабул қилинган вақт",
  btrim(diagnostika_turi || ' ' ||
        coalesce(to_char(diagnostika_vaqti AT TIME ZONE 'Asia/Tashkent', 'HH24:MI'), '')) AS "диагностика тури ва вақти",
  to_char(reperfuziya_vaqti     AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') AS "тромболизис/интервенция",
  to_char(qabul_vaqt            AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') AS "шифохонага ётқизилган вақт",
  coalesce(otkazilgan_muassasa, '')                             AS "Йўналтирилган муассаса",
  muassasa                                                      AS "Якуний тиббий муассаса",
  '' AS "дори номи", '' AS "миқдори", '' AS "харид нархи", '' AS "жами",
  '' AS "МТ", '' AS "бюджет", '' AS "бошқа манба",
  '' AS "хизмат номи", '' AS "ҳажми", '' AS "базавий нарх", '' AS "сумма",
  coalesce(muolaja_turi, '')                                    AS "ИЗОҲ",
  registr                                                       AS "_регистр"
FROM hammasi
ORDER BY qabul_vaqt;
