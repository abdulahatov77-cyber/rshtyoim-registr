-- =====================================================================
-- MUASSASA REGISTRDA QATNASHADIMI — "QABUL KUTILMOQDA" NI TOZALASH
-- =====================================================================
-- MUAMMO:
--   30 kunlik tekshiruvda 504 yo'naltirishdan 430 tasining qabul qiluvchi
--   joyda hech qanday izi yo'q. Sabab — manzil sifatida ko'rsatilgan
--   muassasalarning bir qismi registrga umuman bemor kiritmaydi
--   (kardiologiya markazlari tarmog'i, ba'zi ShTB lar, xususiy klinikalar).
--
--   Bunday bemorlar "Qabul kutilmoqda" ro'yxatidan HECH QACHON tushmaydi —
--   ularni tushiradigan tomon tizimda yo'q. Ro'yxat shovqin bilan to'ladi.
--
-- YECHIM:
--   muassasalar jadvaliga "registrga bemor kiritadi" belgisi qo'shiladi.
--   Kiritmaydigan muassasaga yuborilgan bemorlar ro'yxatning asosiy
--   qismida emas, alohida "kuzatuv uchun" bo'limida ko'rsatiladi.
--
--   Belgi dastlab ma'lumotdan avtomatik to'ldiriladi, keyin super_admin
--   "Muassasa imkoniyati" sahifasida qo'lda tuzatib boradi.
--
-- TARTIB: butun faylni Supabase SQL Editor da bir marta ishga tushiring
-- =====================================================================


-- ============ 1. USTUN ============

ALTER TABLE public.muassasalar
  ADD COLUMN IF NOT EXISTS registrga_kiritadi boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.muassasalar.registrga_kiritadi IS
  'Muassasa registrga o''zi bemor kiritadimi. false bo''lsa — unga yo''naltirilgan '
  'bemorlar "Qabul kutilmoqda" da alohida kuzatuv bo''limida ko''rsatiladi.';


-- ============ 2. DASTLABKI AVTOMATIK TO'LDIRISH ============
-- Oxirgi 90 kunda o'z nomi bilan bitta ham bemor kiritmagan muassasa —
-- registrda qatnashmaydi deb belgilanadi. Nomlar katta-kichik harf,
-- apostrof va bo'sh joy farqisiz solishtiriladi.

WITH kirituvchi AS (
  SELECT DISTINCT lower(regexp_replace(muassasa, '[^[:alnum:]]', '', 'g')) AS k
    FROM (
      SELECT muassasa FROM infarkt_qabul WHERE qabul_vaqt >= now() - interval '90 days'
      UNION ALL
      SELECT muassasa FROM insult_qabul  WHERE qabul_vaqt >= now() - interval '90 days'
    ) t
   WHERE muassasa IS NOT NULL AND btrim(muassasa) <> ''
)
UPDATE public.muassasalar m
   SET registrga_kiritadi = EXISTS (
     SELECT 1 FROM kirituvchi k
      WHERE k.k = lower(regexp_replace(m.nomi, '[^[:alnum:]]', '', 'g'))
   );


-- ============ 3. RPC: ro'yxatga yangi ustun qo'shildi ============
-- Qaytish turi o'zgargani uchun drop + create kerak.

DROP FUNCTION IF EXISTS public.get_muassasalar_filtered(text, text);

CREATE FUNCTION public.get_muassasalar_filtered(
  p_talab   text DEFAULT NULL,   -- null | 'mskt' | 'angiografiya' | 'mskt+angiografiya'
  p_viloyat text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  nomi text,
  viloyat text,
  mskt_bor boolean,
  angiografiya_bor boolean,
  daraja text,
  daraja_raqam smallint,
  registrga_kiritadi boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.nomi, m.viloyat, m.mskt_bor, m.angiografiya_bor,
         m.daraja, m.daraja_raqam, m.registrga_kiritadi
    FROM public.muassasalar m
   WHERE (p_viloyat IS NULL OR m.viloyat = p_viloyat)
     AND (
       p_talab IS NULL
       OR (p_talab = 'mskt'              AND m.mskt_bor)
       OR (p_talab = 'angiografiya'      AND m.angiografiya_bor)
       OR (p_talab = 'mskt+angiografiya' AND m.mskt_bor AND m.angiografiya_bor)
     )
   ORDER BY m.viloyat, m.nomi;
$$;

GRANT EXECUTE ON FUNCTION public.get_muassasalar_filtered(text, text) TO authenticated;


-- ============ 4. RPC: saqlashga yangi belgi qo'shildi ============
-- p_items: [{"id":12,"mskt":true,"angio":false,"daraja":"ttb","registr":true}, ...]
-- 'registr' kaliti yuborilmasa — eski qiymat saqlanadi.

CREATE OR REPLACE FUNCTION public.set_muassasa_imkoniyat(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text;
  v_count integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Ruxsat yo''q: faqat super_admin o''zgartira oladi';
  END IF;

  WITH x AS (
    SELECT (e->>'id')::bigint         AS id,
           (e->>'mskt')::boolean      AS mskt,
           (e->>'angio')::boolean     AS angio,
           nullif(e->>'daraja','')    AS daraja,
           (e->>'registr')::boolean   AS registr
      FROM jsonb_array_elements(p_items) e
  )
  UPDATE public.muassasalar m
     SET mskt_bor             = x.mskt,
         angiografiya_bor     = x.angio,
         daraja               = coalesce(x.daraja,  m.daraja),
         registrga_kiritadi   = coalesce(x.registr, m.registrga_kiritadi),
         imkoniyat_updated_at = now()
    FROM x
   WHERE m.id = x.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.set_muassasa_imkoniyat(jsonb) TO authenticated;


-- =====================================================================
-- TEKSHIRUV
-- =====================================================================

-- 5.1) Nechta muassasa qatnashmaydi deb belgilandi?
SELECT registrga_kiritadi, COUNT(*) AS soni
  FROM public.muassasalar
 GROUP BY 1
 ORDER BY 1;

-- 5.2) Qatnashmaydiganlarga oxirgi 30 kunda nechta bemor yuborilgan?
--      Shu qadar yozuv asosiy ro'yxatdan kuzatuv bo'limiga o'tadi.
WITH yonaltirilgan AS (
  SELECT otkazilgan_muassasa AS manzil FROM infarkt_qabul
   WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL
     AND qabul_vaqt >= now() - interval '30 days'
  UNION ALL
  SELECT otkazilgan_muassasa FROM insult_qabul
   WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL
     AND qabul_vaqt >= now() - interval '30 days'
)
SELECT COALESCE(m.registrga_kiritadi, false) AS qabul_qiluvchi_kiritadimi,
       COUNT(*)                              AS bemorlar
  FROM yonaltirilgan y
  LEFT JOIN public.muassasalar m
    ON lower(regexp_replace(m.nomi, '[^[:alnum:]]', '', 'g'))
     = lower(regexp_replace(y.manzil, '[^[:alnum:]]', '', 'g'))
 GROUP BY 1
 ORDER BY 1;

-- 5.3) Qatnashmaydi deb belgilangan, lekin ko'p bemor yuborilayotgan
--      muassasalar — ular bilan alohida ishlash kerak.
WITH yonaltirilgan AS (
  SELECT otkazilgan_muassasa AS manzil FROM infarkt_qabul
   WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL
     AND qabul_vaqt >= now() - interval '30 days'
  UNION ALL
  SELECT otkazilgan_muassasa FROM insult_qabul
   WHERE status = 'otkazildi' AND otkazilgan_muassasa IS NOT NULL
     AND qabul_vaqt >= now() - interval '30 days'
)
SELECT m.nomi, m.viloyat, COUNT(*) AS yuborilgan
  FROM yonaltirilgan y
  JOIN public.muassasalar m
    ON lower(regexp_replace(m.nomi, '[^[:alnum:]]', '', 'g'))
     = lower(regexp_replace(y.manzil, '[^[:alnum:]]', '', 'g'))
 WHERE m.registrga_kiritadi = false
 GROUP BY 1, 2
 ORDER BY yuborilgan DESC
 LIMIT 25;


-- =====================================================================
-- ORTGA QAYTARISH (kerak bo'lsa)
-- =====================================================================
-- ALTER TABLE public.muassasalar DROP COLUMN IF EXISTS registrga_kiritadi;
-- ...so'ng muassasa_daraja.sql dagi 3 va 4-bo'limlarni qayta ishga tushiring
-- =====================================================================
