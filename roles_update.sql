-- ============================================================
-- ROL TIZIMINI YANGILASH: super_admin | admin | user
-- Supabase SQL Editor da ishga tushiring
-- ============================================================

-- 1. role CHECK constraint ni yangilash
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'user'));

-- 2. fio ustunini qo'shish (agar yo'q bo'lsa)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fio TEXT;

-- 3. abdulahatov77@gmail.com ni super_admin qilish
UPDATE profiles
  SET role = 'super_admin'
  WHERE email = 'abdulahatov77@gmail.com';

-- 4. Trigger funksiyasini yangilash
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, viloyat)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.email = 'abdulahatov77@gmail.com' THEN 'super_admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    NEW.raw_user_meta_data->>'viloyat'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROL HUQUQLARI JADVALI (ma'lumot uchun):
-- super_admin : barcha viloyat, barcha imkoniyat (o'chirish, tahrirlash, rol berish)
-- admin       : o'z viloyati, tahrirlash huquqi bor, boshqa user larni boshqara olmaydi
-- user        : o'z viloyati, faqat ko'rish va qo'shish, tahrirlash yo'q
-- ============================================================
