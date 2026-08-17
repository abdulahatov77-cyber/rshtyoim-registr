-- =====================================================================
-- SHIFOKOR ROLIGA YOZUVNI O'ZGARTIRISH RUXSATINI QAYTARISH
-- =====================================================================
-- MUAMMO:
--   infarkt_update_hardened / insult_update_hardened siyosatlari
--   qabul_can_update(viloyat) funksiyasiga tayanadi. Funksiyada:
--       super_admin -> true
--       admin       -> viloyat mos bo'lsa true
--       else        -> FALSE
--   "else" ga role = 'user' bo'lgan BARCHA SHIFOKORLAR tushadi. Natijada
--   shifokor bemorni chiqara olmaydi, o'tkaza olmaydi, tahrirlay olmaydi.
--   Dasturda esa tushunarsiz xato chiqadi:
--       "Cannot coerce the result to a single JSON object"
--   (RLS qatorni yangilamaydi -> bo'sh natija -> PostgREST xatosi)
--
-- YECHIM:
--   Shifokor ham o'z VILOYATI yozuvlarini o'zgartira oladi — bu
--   qattiqlashtirishdan oldingi holat edi va ish jarayoni shunga qurilgan.
--   Viloyat izolyatsiyasi saqlanadi: boshqa viloyat yozuviga tegolmaydi.
--
--   Yo'l-yo'lakay bitta teshik yopiladi: hozirgi funksiya rahbarga ham
--   ruxsat beradi (rahbar profilida role = 'super_admin'), holbuki rahbar
--   faqat ko'rish uchun. Endi u baza darajasida ham bloklanadi.
--
-- TARTIB: butun faylni Supabase SQL Editor da bir marta ishga tushiring
-- =====================================================================


-- ============ 1. FUNKSIYANI QAYTA YOZAMIZ ============
-- Siyosatlarga TEGILMAYDI — ular shu funksiyani chaqiradi, xolos.

CREATE OR REPLACE FUNCTION public.qabul_can_update(p_viloyat text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    -- Rahbar — faqat ko'rish. Profilida role = 'super_admin' bo'lgani uchun
    -- bu tekshiruv super_admin dan OLDIN turishi shart.
    WHEN (SELECT to_jsonb(p) ->> 'real_role'
            FROM public.profiles p WHERE p.id = auth.uid()) = 'rahbar' THEN false
    WHEN public.auth_role() = 'super_admin' THEN true
    -- Viloyat admini va shifokor — faqat o'z viloyati
    WHEN public.auth_role() IN ('admin', 'user') THEN
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    ELSE false
  END;
$function$;


-- ============ 2. TEKSHIRUV ============

-- 2.1) Shu funksiyaga tayanadigan barcha siyosatlar.
--      Bir nechta jadvalda ishlatilgan bo'lsa, hammasi birdan tuzaladi.
SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE qual LIKE '%qabul_can_update%' OR with_check LIKE '%qabul_can_update%'
 ORDER BY tablename, cmd;

-- 2.2) Shunga o'xshash boshqa cheklovchi funksiyalar bormi?
--      Agar qabul_can_insert / qabul_can_delete ham bo'lsa — ularni ham
--      ko'rib chiqish kerak (ehtimol ularda ham shifokor unutilgan).
SELECT p.proname AS funksiya
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname LIKE '%can\_%'
 ORDER BY 1;

-- 2.3) Yordamchi funksiyalar joyidami?
SELECT to_regprocedure('public.auth_role()')    AS auth_role,
       to_regprocedure('public.auth_viloyat()') AS auth_viloyat;


-- =====================================================================
-- ORTGA QAYTARISH (kerak bo'lsa) — qattiqlashtirilgan holatga qaytadi
-- =====================================================================
-- CREATE OR REPLACE FUNCTION public.qabul_can_update(p_viloyat text)
-- RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
-- AS $function$
--   SELECT CASE
--     WHEN auth.uid() IS NULL THEN false
--     WHEN public.auth_role() = 'super_admin' THEN true
--     WHEN public.auth_role() = 'admin' THEN
--       lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
--     ELSE false
--   END;
-- $function$;
-- =====================================================================
