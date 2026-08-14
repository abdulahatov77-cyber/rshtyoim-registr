-- =====================================================================
-- TAKRORIY / O'XSHASH MUASSASA NOMLARINI TOPISH
-- =====================================================================
-- Maqsad: bir muassasa bir necha xil yozilgan holatlarni chiqarish, so'ng
--         qaysilarini birlashtirishni qo'lda tanlash.
--
-- Nomlar bazada olti ustunda uchraydi (ikkala registrda: muassasa,
-- otkazilgan_muassasa, yuborgan_muassasa) — hammasi hisobga olinadi.
--
-- TARTIB: bo'limlarni BITTA-BITTA ishga tushiring. Supabase SQL Editor
--         faqat oxirgi so'rov natijasini ko'rsatadi.
--
-- Bu fayl hech narsani o'zgartirmaydi — faqat o'qiydi.
-- Birlashtirish uchun merge_andijon_tuman.sql dan namuna oling.
-- =====================================================================


-- ============ 0. FUZZY QIDIRUV UCHUN KENGAYTMA ============
-- Faqat bir marta kerak. 2-bo'lim shusiz ishlamaydi.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============ 1. AYNAN BIR XIL, FAQAT YOZUVI FARQLI ============
-- Apostrof turi, katta-kichik harf, ortiqcha bo'sh joy farqi.
-- Masalan: "Farg'ona ShTB" va "Farg‘ona ShTB" — bu bitta muassasa.
-- Bularni birlashtirish XAVFSIZ: ma'no bir xil.

WITH xom AS (
  SELECT muassasa            AS nom FROM public.infarkt_qabul WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.infarkt_qabul WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.infarkt_qabul WHERE yuborgan_muassasa   IS NOT NULL
  UNION ALL SELECT muassasa            FROM public.insult_qabul  WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.insult_qabul  WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.insult_qabul  WHERE yuborgan_muassasa   IS NOT NULL
),
nomlar AS (
  SELECT btrim(nom) AS nom, COUNT(*) AS soni
    FROM xom WHERE btrim(nom) <> ''
   GROUP BY 1
)
SELECT COUNT(*)   AS variantlar,
       SUM(soni)  AS jami_yozuv,
       string_agg(nom || '  [' || soni || ']', '   |   ' ORDER BY soni DESC) AS yozilishlari
  FROM nomlar
 GROUP BY lower(regexp_replace(nom, '[^[:alnum:]]', '', 'g'))
HAVING COUNT(*) > 1
 ORDER BY jami_yozuv DESC;


-- ============ 2. O'XSHASH, LEKIN BIR XIL EMAS ============
-- Masalan: "Grant kardio" / "Grand kardio klinika" / "Grant Qardio klinikasi".
-- Bularni birlashtirishdan OLDIN har birini ko'z bilan tekshiring —
-- "Andijon TTB" va "Asaka TTB" ham o'xshash chiqishi mumkin, lekin ular
-- boshqa-boshqa muassasa.
--
-- Bir necha soniya ishlashi mumkin (nomlar juftma-juft solishtiriladi).

WITH xom AS (
  SELECT muassasa            AS nom FROM public.infarkt_qabul WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.infarkt_qabul WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.infarkt_qabul WHERE yuborgan_muassasa   IS NOT NULL
  UNION ALL SELECT muassasa            FROM public.insult_qabul  WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.insult_qabul  WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.insult_qabul  WHERE yuborgan_muassasa   IS NOT NULL
),
nomlar AS (
  SELECT btrim(nom) AS nom, COUNT(*) AS soni
    FROM xom WHERE btrim(nom) <> ''
   GROUP BY 1
)
SELECT round(similarity(lower(a.nom), lower(b.nom))::numeric, 2) AS oxshashlik,
       a.nom AS nom_1, a.soni AS soni_1,
       b.nom AS nom_2, b.soni AS soni_2
  FROM nomlar a
  JOIN nomlar b
    ON a.nom < b.nom
   AND similarity(lower(a.nom), lower(b.nom)) >= 0.55
 WHERE lower(regexp_replace(a.nom, '[^[:alnum:]]', '', 'g'))
    <> lower(regexp_replace(b.nom, '[^[:alnum:]]', '', 'g'))
 ORDER BY oxshashlik DESC, (a.soni + b.soni) DESC
 LIMIT 120;


-- ============ 3. RASMIY RO'YXATDA UMUMAN YO'Q NOMLAR ============
-- Bular qo'lda yozilgan: xususiy klinika, bo'lim nomi, butun gap va h.k.
-- Ba'zilari rasmiy nomning varianti (birlashtirish kerak), ba'zilari esa
-- haqiqatan ro'yxatga qo'shilishi kerak bo'lgan muassasa.

WITH xom AS (
  SELECT muassasa            AS nom FROM public.infarkt_qabul WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.infarkt_qabul WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.infarkt_qabul WHERE yuborgan_muassasa   IS NOT NULL
  UNION ALL SELECT muassasa            FROM public.insult_qabul  WHERE muassasa IS NOT NULL
  UNION ALL SELECT otkazilgan_muassasa FROM public.insult_qabul  WHERE otkazilgan_muassasa IS NOT NULL
  UNION ALL SELECT yuborgan_muassasa   FROM public.insult_qabul  WHERE yuborgan_muassasa   IS NOT NULL
),
nomlar AS (
  SELECT btrim(nom) AS nom, COUNT(*) AS soni
    FROM xom WHERE btrim(nom) <> ''
   GROUP BY 1
)
SELECT n.nom, n.soni
  FROM nomlar n
 WHERE NOT EXISTS (
   SELECT 1 FROM public.muassasalar m
    WHERE lower(regexp_replace(m.nomi, '[^[:alnum:]]', '', 'g'))
        = lower(regexp_replace(n.nom,  '[^[:alnum:]]', '', 'g'))
 )
 ORDER BY n.soni DESC;
