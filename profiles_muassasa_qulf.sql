-- =====================================================================
-- PROFIL QULFLARI: muassasa bir marta, viloyat umuman o'zgarmaydi
-- 2026-08-07
--
-- Talab: foydalanuvchi o'z muassasasini BIR MARTA tanlaydi, keyin uni
-- faqat Super Administrator o'zgartira oladi.
--
-- Yo'l-yo'lakay bitta xavfsizlik teshigi ham yopiladi: hozirgi
-- profiles_update_self siyosati faqat `role` ni himoya qiladi, `viloyat`
-- ni emas. RLS esa viloyat bo'yicha ishlaydi (infarkt_select_v2), ya'ni
-- shifokor o'z viloyatini almashtirib boshqa viloyat bemorlarini
-- ko'rishi mumkin edi. Endi viloyat ham qulflanadi.
--
-- Frontend cheklovi (sozlamalar sahifasi) yetarli emas — brauzer
-- konsolidan chetlab o'tish mumkin. Shuning uchun qoida shu yerda.
-- =====================================================================

-- ============ 1. YORDAMCHI FUNKSIYA ============
-- Joriy foydalanuvchining bazadagi muassasasi (eski qiymat).
-- SECURITY DEFINER — siyosat ichidan chaqirilganda rekursiya bo'lmasin.
create or replace function public.get_user_muassasa()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select muassasa from public.profiles where id = auth.uid() limit 1;
$$;

grant execute on function public.get_user_muassasa() to authenticated;

-- ============ 2. SIYOSATNI QAYTA YOZAMIZ ============
drop policy if exists profiles_update_self on public.profiles;

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Rol o'zgarmaydi
    and coalesce(role, 'operator') = public.get_user_role()
    -- Viloyat o'zgarmaydi (RLS shu maydonga tayanadi)
    and coalesce(viloyat, '') = coalesce(public.get_user_viloyat(), '')
    -- Muassasa faqat hali bo'sh bo'lganda belgilanadi. Belgilangach
    -- o'zgartirib bo'lmaydi — faqat super_admin (pastdagi ikkinchi siyosat).
    and (
      coalesce(public.get_user_muassasa(), '') = ''
      or coalesce(muassasa, '') = coalesce(public.get_user_muassasa(), '')
    )
  );

-- profiles_update_superadmin siyosati o'zgarmaydi — super_admin hammasini
-- o'zgartira oladi (admin paneli shu orqali ishlaydi).

-- ============ 3. TEKSHIRUV ============
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by cmd, policyname;
