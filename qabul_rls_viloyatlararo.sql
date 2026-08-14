-- =====================================================================
-- VILOYATLARARO YO'NALTIRISHNI "QABUL KUTILMOQDA" DA KO'RSATISH
-- =====================================================================
-- MUAMMO:
--   rls_secure_2026_07.sql dagi siyosat bo'yicha shifokor faqat O'Z
--   VILOYATI yozuvlarini o'qiy oladi. Bemor boshqa viloyatdan yuborilsa,
--   uning yozuvi qabul qiluvchi muassasa uchun umuman ko'rinmaydi —
--   "Qabul kutilmoqda" ro'yxatida ham chiqmaydi.
--
-- YECHIM:
--   O'qish siyosatiga bitta qo'shimcha shart: agar yozuv o'tkazilgan
--   bo'lsa VA manzil sifatida aynan shu foydalanuvchining muassasasi
--   (yoki uning viloyatidagi biror muassasa) ko'rsatilgan bo'lsa —
--   yozuv o'qishga ochiladi.
--
--   Boshqa hech narsa kengaymaydi: yozish, o'zgartirish va o'chirish
--   siyosatlari tegilmaydi. Bemor faqat "menga yuborilgan" bo'lsagina
--   ko'rinadi — respublika bo'ylab hamma yozuv ochilib ketmaydi.
--
-- TARTIB:
--   1) Butun faylni Supabase SQL Editor da bir marta ishga tushiring
--   2) Oxiridagi TEKSHIRUV so'rovlari bilan natijani ko'ring
--
-- ORTGA QAYTARISH: fayl oxiridagi izohli blokka qarang
-- =====================================================================


-- ============ 1. FOYDALANUVCHINING QABUL MANZILLARI ============
-- Bitta so'rovda bir marta hisoblanadi (argumentsiz + STABLE), shuning
-- uchun har bir qatorga alohida chaqirilmaydi — sekinlashtirmaydi.
--
-- Ro'yxatga kiradi:
--   • foydalanuvchi profilidagi muassasa
--   • uning viloyatidagi barcha muassasalar (muassasalar jadvalidan)
-- Nomlar kichik harfda va bo'sh joysiz solishtiriladi.

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


-- ============ 2. O'QISH SIYOSATLARI ============
-- Faqat SELECT o'zgaradi. INSERT / UPDATE / DELETE tegilmaydi.

DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
CREATE POLICY "infarkt_select" ON infarkt_qabul
  FOR SELECT TO authenticated
  USING (
    auth_role() = 'super_admin'
    OR viloyat = auth_viloyat()
    -- Menga (yoki viloyatimdagi muassasaga) yo'naltirilgan bemor
    OR (
      status = 'otkazildi'
      AND otkazilgan_muassasa IS NOT NULL
      AND btrim(otkazilgan_muassasa) <> ''
      AND lower(btrim(otkazilgan_muassasa)) = ANY (public.auth_qabul_manzillari())
    )
  );

DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
CREATE POLICY "insult_select" ON insult_qabul
  FOR SELECT TO authenticated
  USING (
    auth_role() = 'super_admin'
    OR viloyat = auth_viloyat()
    OR (
      status = 'otkazildi'
      AND otkazilgan_muassasa IS NOT NULL
      AND btrim(otkazilgan_muassasa) <> ''
      AND lower(btrim(otkazilgan_muassasa)) = ANY (public.auth_qabul_manzillari())
    )
  );


-- ============ 3. TEZLIK UCHUN INDEKS ============
-- O'tkazilgan yozuvlar umumiy sonning kichik qismi — manzil bo'yicha
-- indeks ularni tez topadi.

CREATE INDEX IF NOT EXISTS infarkt_otkazilgan_manzil_idx
  ON infarkt_qabul (lower(btrim(otkazilgan_muassasa)))
  WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL;

CREATE INDEX IF NOT EXISTS insult_otkazilgan_manzil_idx
  ON insult_qabul (lower(btrim(otkazilgan_muassasa)))
  WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL;


-- =====================================================================
-- TEKSHIRUV
-- =====================================================================

-- 3.1) muassasalar jadvalida viloyat to'ldirilganmi?
--      viloyati bo'sh muassasalar viloyat bo'yicha ochilmaydi.
SELECT COUNT(*) FILTER (WHERE viloyat IS NULL OR btrim(viloyat) = '') AS viloyatsiz,
       COUNT(*)                                                       AS jami
  FROM public.muassasalar;

-- 3.2) Viloyatlararo yo'naltirishlar qancha? (oxirgi 30 kun)
--      Bu yozuvlar ilgari qabul qiluvchiga umuman ko'rinmasdi.
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

-- 3.3) Manzili muassasalar jadvalida umuman topilmagan yozuvlar.
--      Bular qo'lda yozilgan nomlar — nomni jadvalga qo'shsangiz,
--      o'sha muassasa shifokoriga ham ko'rina boshlaydi.
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
-- ORTGA QAYTARISH (kerak bo'lsa)
-- =====================================================================
-- DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
-- CREATE POLICY "infarkt_select" ON infarkt_qabul
--   FOR SELECT TO authenticated
--   USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());
--
-- DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
-- CREATE POLICY "insult_select" ON insult_qabul
--   FOR SELECT TO authenticated
--   USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());
--
-- DROP FUNCTION IF EXISTS public.auth_qabul_manzillari();
-- =====================================================================
