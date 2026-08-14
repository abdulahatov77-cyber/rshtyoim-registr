-- =====================================================================
-- VILOYATLARARO YO'NALTIRISHNI "QABUL KUTILMOQDA" DA KO'RSATISH
-- =====================================================================
-- HOZIRGI HOLAT (bazadan o'qilgan, 2026-08-14):
--   infarkt_select_v2 / insult_select_v2 siyosati bo'yicha o'qish:
--     • role = super_admin yoki admin  -> hamma yozuv (respublika bo'ylab)
--     • qolganlar (oddiy shifokor)     -> faqat o'z viloyati
--                                         yoki o'zi kiritgan yozuv
--
--   Ya'ni oddiy shifokor boshqa viloyatdan unga yuborilgan bemorni
--   umuman o'qiy olmaydi — "Qabul kutilmoqda" da ham chiqmaydi.
--
-- YECHIM:
--   Mavjud siyosatlar TEGILMAYDI. Ularning yoniga bitta QO'SHIMCHA
--   o'qish siyosati qo'shiladi. PostgreSQL da bir jadvaldagi bir necha
--   ruxsat beruvchi siyosat OR bilan birlashadi — ya'ni bu faqat
--   ruxsat qo'shadi, hech qayerni torraytirmaydi.
--
--   Qo'shiladigan ruxsat: "yozuv o'tkazilgan bo'lsa VA manzil aynan
--   mening muassasam (yoki viloyatimdagi muassasa) bo'lsa — o'qiyman".
--
--   Boshqa hech narsa kengaymaydi: INSERT / UPDATE / DELETE tegilmaydi,
--   o'zga muassasaga yuborilgan bemorlar baribir ko'rinmaydi.
--
-- TARTIB:
--   0) Avval 0-BO'LIMdagi tekshiruvni ishga tushiring
--   1) Keyin 1 va 2-bo'limlarni ishga tushiring
--   3) Oxiridagi TEKSHIRUV so'rovlari bilan natijani ko'ring
--
-- ORTGA QAYTARISH: fayl oxiridagi izohli blokka qarang
-- =====================================================================


-- ============ 0. OLDINDAN TEKSHIRUV ============
-- Quyidagi so'rov 'muassasalar' jadvali borligini tasdiqlaydi.
-- Natija bo'sh chiqsa — pastdagi qismlarni ishga tushirmang, ayting.

SELECT to_regclass('public.muassasalar') AS muassasalar_jadvali,
       to_regclass('public.profiles')    AS profiles_jadvali;


-- ============ 1. FOYDALANUVCHINING QABUL MANZILLARI ============
-- Argumentsiz va STABLE — shuning uchun bitta so'rovda bir marta
-- hisoblanadi, har bir qatorga alohida chaqirilmaydi.
--
-- Ro'yxatga kiradi:
--   • foydalanuvchi profilidagi muassasa
--   • uning viloyatidagi barcha muassasalar (muassasalar jadvalidan)
-- Nomlar kichik harfda, bo'sh joysiz solishtiriladi.

CREATE OR REPLACE FUNCTION public.auth_qabul_manzillari()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(DISTINCT lower(btrim(nom))), ARRAY[]::text[])
  FROM (
    SELECT p.muassasa AS nom
      FROM public.profiles p
     WHERE p.id = auth.uid()
    UNION
    SELECT m.nomi
      FROM public.muassasalar m
     WHERE m.viloyat IS NOT NULL
       AND m.viloyat = (SELECT p2.viloyat FROM public.profiles p2 WHERE p2.id = auth.uid())
  ) t
  WHERE nom IS NOT NULL AND btrim(nom) <> '';
$$;

GRANT EXECUTE ON FUNCTION public.auth_qabul_manzillari() TO authenticated;


-- ============ 2. QO'SHIMCHA O'QISH SIYOSATI ============
-- Mavjud infarkt_select_v2 / insult_select_v2 ga TEGILMAYDI.
-- Bu ular bilan OR orqali birlashadi.

DROP POLICY IF EXISTS "infarkt_yonaltirilgan_select" ON infarkt_qabul;
CREATE POLICY "infarkt_yonaltirilgan_select" ON infarkt_qabul
  FOR SELECT TO authenticated
  USING (
    status = 'otkazildi'
    AND otkazilgan_muassasa IS NOT NULL
    AND btrim(otkazilgan_muassasa) <> ''
    AND lower(btrim(otkazilgan_muassasa)) = ANY (public.auth_qabul_manzillari())
  );

DROP POLICY IF EXISTS "insult_yonaltirilgan_select" ON insult_qabul;
CREATE POLICY "insult_yonaltirilgan_select" ON insult_qabul
  FOR SELECT TO authenticated
  USING (
    status = 'otkazildi'
    AND otkazilgan_muassasa IS NOT NULL
    AND btrim(otkazilgan_muassasa) <> ''
    AND lower(btrim(otkazilgan_muassasa)) = ANY (public.auth_qabul_manzillari())
  );


-- ============ 3. TEZLIK UCHUN INDEKS ============
-- O'tkazilgan yozuvlar umumiy sonning kichik qismi — qisman indeks
-- ularni tez topadi.

CREATE INDEX IF NOT EXISTS infarkt_otkazilgan_manzil_idx
  ON infarkt_qabul (lower(btrim(otkazilgan_muassasa)))
  WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL;

CREATE INDEX IF NOT EXISTS insult_otkazilgan_manzil_idx
  ON insult_qabul (lower(btrim(otkazilgan_muassasa)))
  WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL;


-- =====================================================================
-- TEKSHIRUV
-- =====================================================================

-- 4.1) Yangi siyosat qo'shildimi? (har bir jadvalda 2 ta SELECT siyosati
--      bo'lishi kerak: ..._select_v2 va ..._yonaltirilgan_select)
SELECT tablename AS jadval, policyname AS siyosat
  FROM pg_policies
 WHERE tablename IN ('infarkt_qabul','insult_qabul') AND cmd = 'SELECT'
 ORDER BY 1, 2;

-- 4.2) muassasalar jadvalida viloyat to'ldirilganmi?
--      Viloyati bo'sh muassasalar viloyat bo'yicha ochilmaydi.
SELECT COUNT(*) FILTER (WHERE viloyat IS NULL OR btrim(viloyat) = '') AS viloyatsiz,
       COUNT(*)                                                       AS jami
  FROM public.muassasalar;

-- 4.3) ENG MUHIMI — oxirgi 30 kunda nechta viloyatlararo yo'naltirish bor?
--      Bu yozuvlar shu paytgacha qabul qiluvchi shifokorga ko'rinmasdi.
SELECT q.viloyat AS yuborgan_viloyat,
       m.viloyat AS qabul_viloyat,
       COUNT(*)  AS soni
  FROM infarkt_qabul q
  JOIN public.muassasalar m
    ON lower(btrim(m.nomi)) = lower(btrim(q.otkazilgan_muassasa))
 WHERE q.status = 'otkazildi'
   AND q.qabul_vaqt >= now() - interval '30 days'
   AND m.viloyat IS DISTINCT FROM q.viloyat
 GROUP BY 1, 2
 ORDER BY soni DESC;

-- 4.4) Manzili muassasalar jadvalida umuman topilmagan nomlar.
--      Bular qo'lda yozilgan — nomni jadvalga qo'shsangiz, o'sha
--      muassasa shifokoriga ham ko'rina boshlaydi.
SELECT q.otkazilgan_muassasa, COUNT(*) AS soni
  FROM infarkt_qabul q
 WHERE q.status = 'otkazildi'
   AND q.otkazilgan_muassasa IS NOT NULL
   AND q.qabul_vaqt >= now() - interval '30 days'
   AND NOT EXISTS (
     SELECT 1 FROM public.muassasalar m
      WHERE lower(btrim(m.nomi)) = lower(btrim(q.otkazilgan_muassasa))
   )
 GROUP BY 1
 ORDER BY soni DESC;


-- =====================================================================
-- ORTGA QAYTARISH (kerak bo'lsa) — faqat qo'shilganini olib tashlaydi,
-- eski siyosatlar allaqachon tegilmagan.
-- =====================================================================
-- DROP POLICY IF EXISTS "infarkt_yonaltirilgan_select" ON infarkt_qabul;
-- DROP POLICY IF EXISTS "insult_yonaltirilgan_select" ON insult_qabul;
-- DROP FUNCTION IF EXISTS public.auth_qabul_manzillari();
-- =====================================================================
