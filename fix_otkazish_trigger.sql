-- =====================================================================
-- SHOSHILINCH TUZATISH (2026-07-28)
-- Xato: record "new" has no field "otkazish_sababi"
--
-- Sabab: muassasa imkoniyati triggerida NEW.otkazish_sababi to'g'ridan-to'g'ri
-- o'qilgan. Bu ustun faqat infarkt_qabul da bor; insult_qabul da yo'q.
-- PL/pgSQL da CASE sharti ustun mavjudligini to'smaydi — ifoda baribir
-- baholanadi va xato beradi. Natijada insult bemorlarini chiqarish bloklangan.
--
-- Yechim: ustunga to_jsonb(NEW) orqali murojaat (jadvalda yo'q bo'lsa NULL).
-- ISHGA TUSHIRISH: Supabase SQL Editor — butun faylni bitta Run bilan.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trg_otkazish_imkoniyat_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_mskt  boolean;
  v_angio boolean;
  v_sabab text;
  j       jsonb := to_jsonb(NEW);
BEGIN
  IF NEW.otkazilgan_muassasa IS NULL OR NEW.otkazilgan_muassasa = '' THEN
    RETURN NEW;
  END IF;
  -- Faqat otkazilgan_muassasa YANGI qiymat olganda tekshiramiz
  IF TG_OP = 'UPDATE' AND NEW.otkazilgan_muassasa IS NOT DISTINCT FROM OLD.otkazilgan_muassasa THEN
    RETURN NEW;
  END IF;

  SELECT mskt_bor, angiografiya_bor INTO v_mskt, v_angio
  FROM public.muassasalar WHERE nomi = NEW.otkazilgan_muassasa;

  IF NOT FOUND THEN
    RETURN NEW; -- ro'yxatda yo'q muassasa — bloklamaymiz
  END IF;

  -- MUHIM: ustun jadvalda bo'lmasligi mumkin — jsonb orqali xavfsiz o'qiymiz
  v_sabab := coalesce(j->>'otkazish_sababi', j->>'muolaja_turi', '');

  IF v_sabab ILIKE '%MSKT%' AND coalesce(v_mskt, false) = false THEN
    RAISE EXCEPTION 'Tanlangan muassasada MSKT mavjud emas: %', NEW.otkazilgan_muassasa;
  END IF;

  IF (v_sabab ILIKE '%angiograf%' OR v_sabab ILIKE '%KAG%' OR v_sabab ILIKE '%endovaskul%')
     AND coalesce(v_angio, false) = false THEN
    RAISE EXCEPTION 'Tanlangan muassasada angiografiya mavjud emas: %', NEW.otkazilgan_muassasa;
  END IF;

  RETURN NEW;
END $fn$;

-- Tekshirish: triggerlar joyidami
SELECT tgrelid::regclass AS jadval, tgname
FROM pg_trigger
WHERE tgname = 'otkazish_imkoniyat_check' AND NOT tgisinternal;
