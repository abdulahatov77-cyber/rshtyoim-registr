-- ============================================================
-- RSHTYOIM Registr — RLS XAVFSIZLIK (2026-07-14)
-- Server tomonda viloyat/rol himoyasini yoqadi.
--
-- ⚠️ MUHIM: Bu faylni Supabase SQL Editor'да ishga tushiring.
-- Ishga tushirgandan SO'NG DARHOL sinang:
--   1. super_admin bilan kiring — HAMMA viloyat ko'rinishi kerak
--   2. oddiy admin/user bilan kiring — FAQAT o'z viloyati ko'rinishi kerak
-- Agar biror narsa buzilsa — pastdagi "ORQAGA QAYTARISH" blokini ishga tushiring.
-- ============================================================


-- ============================================================
-- QADAM 0: OLDINDAN TEKSHIRISH (avval SHUNI ishga tushiring!)
-- Quyidagilarni tekshiring — RLS yoqishдан oldin muammo bo'lmasligi uchun.
-- ============================================================

-- 0a. Viloyati YO'Q admin/user profillar (RLS dan keyin ular hech nima ko'rmaydi!)
--     Natija bo'sh bo'lishi kerak. Agar qator chiqsa — o'sha foydalanuvchilarga
--     viloyat tayinlang (Foydalanuvchilar sahifasi orqali) yoki super_admin qiling.
--   SELECT id, email, role, viloyat FROM profiles
--     WHERE role <> 'super_admin' AND (viloyat IS NULL OR viloyat = '');

-- 0b. Viloyati YO'Q bemor yozuvlari (RLS dan keyin faqat super_admin ko'radi)
--     Ko'p bo'lsa — avval ularга viloyat to'ldiring.
--   SELECT COUNT(*) FROM infarkt_qabul WHERE viloyat IS NULL OR viloyat = '';
--   SELECT COUNT(*) FROM insult_qabul  WHERE viloyat IS NULL OR viloyat = '';

-- Yuqoridagi 3 so'rovni ishga tushirib, natijani ko'ring.
-- Muammo bo'lmasa — pastдagi QADAM 1 dan davom eting.


-- ============================================================
-- QADAM 1: Yordamchi funksiyalar (recursion'siz profil o'qish)
-- SECURITY DEFINER — profiles RLS ni chetlab o'tadi, cheksiz
-- rekursiya bo'lmaydi. search_path qattiq belgilangan (xavfsizlik).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_viloyat()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT viloyat FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.auth_role()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_viloyat() TO authenticated;


-- ============================================================
-- QADAM 2: infarkt_qabul — viloyat izolyatsiyasi
-- ============================================================

-- O'qish: super_admin hammasini, boshqalar faqat o'z viloyatini
DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
CREATE POLICY "infarkt_select" ON infarkt_qabul
  FOR SELECT TO authenticated
  USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

-- Qo'shish: faqat o'z viloyatiga (super_admin har qanday viloyatga)
DROP POLICY IF EXISTS "infarkt_insert" ON infarkt_qabul;
CREATE POLICY "infarkt_insert" ON infarkt_qabul
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

-- Tahrirlash: o'z viloyati doirasida (super_admin har qanday)
DROP POLICY IF EXISTS "infarkt_update" ON infarkt_qabul;
CREATE POLICY "infarkt_update" ON infarkt_qabul
  FOR UPDATE TO authenticated
  USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

-- O'chirish: faqat super_admin
DROP POLICY IF EXISTS "infarkt_delete" ON infarkt_qabul;
CREATE POLICY "infarkt_delete" ON infarkt_qabul
  FOR DELETE TO authenticated
  USING (auth_role() = 'super_admin');


-- ============================================================
-- QADAM 3: insult_qabul — viloyat izolyatsiyasi
-- ============================================================

DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
CREATE POLICY "insult_select" ON insult_qabul
  FOR SELECT TO authenticated
  USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

DROP POLICY IF EXISTS "insult_insert" ON insult_qabul;
CREATE POLICY "insult_insert" ON insult_qabul
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

DROP POLICY IF EXISTS "insult_update" ON insult_qabul;
CREATE POLICY "insult_update" ON insult_qabul
  FOR UPDATE TO authenticated
  USING (auth_role() = 'super_admin' OR viloyat = auth_viloyat());

DROP POLICY IF EXISTS "insult_delete" ON insult_qabul;
CREATE POLICY "insult_delete" ON insult_qabul
  FOR DELETE TO authenticated
  USING (auth_role() = 'super_admin');


-- ============================================================
-- QADAM 4: profiles — rol ko'tarishning oldini olish
-- ============================================================

-- Har kim o'z profilini, super_admin barchani o'qiy oladi
DROP POLICY IF EXISTS "profile_select_all" ON profiles;
DROP POLICY IF EXISTS "profile_select" ON profiles;
CREATE POLICY "profile_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR auth_role() = 'super_admin');

-- Yangilash: o'z profilini yoki super_admin barchani
DROP POLICY IF EXISTS "profile_update_all" ON profiles;
DROP POLICY IF EXISTS "profile_update" ON profiles;
CREATE POLICY "profile_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_role() = 'super_admin');

-- Trigger: oddiy foydalanuvchi o'z role/viloyat ustunini o'zgartira olmaydi
-- (faqat super_admin o'zgartira oladi). fio/full_name ni o'zgartira oladi.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth_role() IS DISTINCT FROM 'super_admin' THEN
    NEW.role    := OLD.role;
    NEW.viloyat := OLD.viloyat;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();


-- ============================================================
-- QADAM 5: Ro'yxatdan o'tishda rol ko'tarishning oldini olish
-- handle_new_user endi metadata dan role OLMAYDI — doim 'user'
-- (super_admin email dan tashqari)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, viloyat)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.email = 'abdulahatov77@gmail.com' THEN 'super_admin'
      ELSE 'user'  -- metadata dan OLINMAYDI (xavfsizlik)
    END,
    NEW.raw_user_meta_data->>'viloyat'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ============================================================
-- ✅ TUGADI. Endi sinang (yuqoridagi eslatmaga qarang).
-- ============================================================


-- ============================================================
-- ⛔ ORQAGA QAYTARISH (agar biror narsa buzilsa — SHUNI ishga tushiring)
-- Bu barcha RLS ni yana ochib qo'yadi (avvalgi holat).
-- Pastdagi kommentni olib, ishga tushiring:
-- ============================================================
/*
DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
CREATE POLICY "infarkt_select" ON infarkt_qabul FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "infarkt_insert" ON infarkt_qabul;
CREATE POLICY "infarkt_insert" ON infarkt_qabul FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "infarkt_update" ON infarkt_qabul;
CREATE POLICY "infarkt_update" ON infarkt_qabul FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "infarkt_delete" ON infarkt_qabul;
CREATE POLICY "infarkt_delete" ON infarkt_qabul FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
CREATE POLICY "insult_select" ON insult_qabul FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insult_insert" ON insult_qabul;
CREATE POLICY "insult_insert" ON insult_qabul FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insult_update" ON insult_qabul;
CREATE POLICY "insult_update" ON insult_qabul FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "insult_delete" ON insult_qabul;
CREATE POLICY "insult_delete" ON insult_qabul FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "profile_select" ON profiles;
CREATE POLICY "profile_select_all" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profile_update" ON profiles;
CREATE POLICY "profile_update_all" ON profiles FOR UPDATE TO authenticated USING (true);
DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
*/
