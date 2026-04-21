-- ============================================================
-- PROFILES jadvali — foydalanuvchi rollari
-- Supabase SQL Editor ga alohida qo'shing
-- ============================================================

-- Profiles jadvali
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  viloyat    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- Admin barcha profillarni yangilaydi
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
-- TRIGGER: yangi foydalanuvchi yaratilganda profil avtomatik
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
    NEW.raw_user_meta_data->>'viloyat'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Admin foydalanuvchisini admin qilish
-- (abdulaxatov77@gmail.com ni topib admin qiladi)
-- ============================================================
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'abdulaxatov77@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO profiles (id, email, role)
    VALUES (v_uid, 'abdulaxatov77@gmail.com', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
    RAISE NOTICE 'Admin tayinlandi: %', v_uid;
  ELSE
    RAISE NOTICE 'abdulaxatov77@gmail.com topilmadi — tizimga kirganida admin bo''ladi';
  END IF;
END $$;

-- ============================================================
-- infarkt_qabul va insult_qabul ga RLS — viloyat bo'yicha
-- ============================================================

-- Infarkt: admin hammani ko'radi, user faqat o'z viloyatini
DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
CREATE POLICY "infarkt_select" ON infarkt_qabul
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

-- Infarkt insert: user o'z viloyatiga kiritadi
DROP POLICY IF EXISTS "infarkt_insert" ON infarkt_qabul;
CREATE POLICY "infarkt_insert" ON infarkt_qabul
  FOR INSERT TO authenticated
  WITH CHECK (
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insult: xuddi shunday
DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
CREATE POLICY "insult_select" ON insult_qabul
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insult_insert" ON insult_qabul;
CREATE POLICY "insult_insert" ON insult_qabul
  FOR INSERT TO authenticated
  WITH CHECK (
    viloyat = (SELECT viloyat FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
