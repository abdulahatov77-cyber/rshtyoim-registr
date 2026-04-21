-- ============================================================
-- PROFILES jadvali — foydalanuvchi rollari (v2)
-- Supabase SQL Editor ga to'liq joylashtiring va Run bosing
-- ============================================================

-- ============================================================
-- 1. PROFILES jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  viloyat    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eski policylarni o'chirish
DROP POLICY IF EXISTS "profile_select_own"   ON profiles;
DROP POLICY IF EXISTS "profile_select_admin" ON profiles;
DROP POLICY IF EXISTS "profile_update_own"   ON profiles;
DROP POLICY IF EXISTS "profile_update_admin" ON profiles;
DROP POLICY IF EXISTS "profile_insert"       ON profiles;

-- Har kim o'z profilini ko'radi
CREATE POLICY "profile_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin barcha profillarni ko'radi
CREATE POLICY "profile_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- O'z profilini yangilash
CREATE POLICY "profile_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Admin barcha profillarni boshqaradi
CREATE POLICY "profile_update_admin" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Insert (ro'yxatdan o'tganda)
CREATE POLICY "profile_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. TRIGGER: yangi foydalanuvchi yaratilganda profil avtomatik
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, viloyat)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.email = 'abdulaxatov77@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    COALESCE(NEW.raw_user_meta_data->>'viloyat', NULL)
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email      = EXCLUDED.email,
      full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
      viloyat    = COALESCE(EXCLUDED.viloyat, profiles.viloyat),
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 4. Admin foydalanuvchisini admin qilish
--    (abdulaxatov77@gmail.com ni topib admin qiladi)
-- ============================================================
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'abdulaxatov77@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO profiles (id, email, role)
    VALUES (v_uid, 'abdulaxatov77@gmail.com', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
    RAISE NOTICE 'Admin tayinlandi: %', v_uid;
  ELSE
    RAISE NOTICE 'abdulaxatov77@gmail.com topilmadi — tizimga kirganida admin boʻladi';
  END IF;
END $$;

-- ============================================================
-- 5. infarkt_qabul — viloyat bo'yicha RLS
-- ============================================================
DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
DROP POLICY IF EXISTS "infarkt_insert" ON infarkt_qabul;
DROP POLICY IF EXISTS "infarkt_update" ON infarkt_qabul;

-- SELECT: admin hammani, user faqat o'z viloyatini ko'radi
CREATE POLICY "infarkt_select" ON infarkt_qabul
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

-- INSERT: user faqat o'z viloyatiga kiritadi
CREATE POLICY "infarkt_insert" ON infarkt_qabul
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

-- UPDATE: admin yoki o'z viloyati
CREATE POLICY "infarkt_update" ON infarkt_qabul
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 6. insult_qabul — viloyat bo'yicha RLS
-- ============================================================
DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
DROP POLICY IF EXISTS "insult_insert" ON insult_qabul;
DROP POLICY IF EXISTS "insult_update" ON insult_qabul;

CREATE POLICY "insult_select" ON insult_qabul
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "insult_insert" ON insult_qabul
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "insult_update" ON insult_qabul
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 7. insult_chiqarish va infarkt_chiqarish — RLS
-- ============================================================
DROP POLICY IF EXISTS "i_chiq_select" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_insert" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_update" ON insult_chiqarish;

CREATE POLICY "i_chiq_select" ON insult_chiqarish
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "i_chiq_insert" ON insult_chiqarish
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "i_chiq_update" ON insult_chiqarish
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "inf_chiq_select" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_insert" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_update" ON infarkt_chiqarish;

CREATE POLICY "inf_chiq_select" ON infarkt_chiqarish
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inf_chiq_insert" ON infarkt_chiqarish
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inf_chiq_update" ON infarkt_chiqarish
  FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- 8. davolash va holat_baxolash — RLS
-- ============================================================
DROP POLICY IF EXISTS "dav_select" ON davolash;
DROP POLICY IF EXISTS "dav_insert" ON davolash;
DROP POLICY IF EXISTS "dav_update" ON davolash;
CREATE POLICY "dav_select" ON davolash FOR SELECT TO authenticated USING (true);
CREATE POLICY "dav_insert" ON davolash FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dav_update" ON davolash FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "holat_select" ON holat_baxolash;
DROP POLICY IF EXISTS "holat_insert" ON holat_baxolash;
DROP POLICY IF EXISTS "holat_update" ON holat_baxolash;
CREATE POLICY "holat_select" ON holat_baxolash FOR SELECT TO authenticated USING (true);
CREATE POLICY "holat_insert" ON holat_baxolash FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "holat_update" ON holat_baxolash FOR UPDATE TO authenticated USING (true);
