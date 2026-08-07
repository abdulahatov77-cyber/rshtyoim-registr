-- =====================================================================
-- handle_new_user() — ro'yxatdan o'tishda muassasa ham ko'chirilsin
-- 2026-08-07
--
-- Hozirgi trigger metadata'dan faqat full_name, role va viloyat ni oladi.
-- Ro'yxatdan o'tish formasiga muassasa qo'shilgani uchun uni ham
-- ko'chiramiz — shunda profil darhol to'liq yaratiladi va ilovadagi
-- "birinchi kirishda ko'chirish" zaxira mexanizmi ishga tushmaydi.
--
-- Qolgan mantiq o'zgarmadi (ON CONFLICT DO NOTHING, abdulahatov77 uchun
-- maxsus rol shartini ham asl holicha qoldirdim).
--
-- Qo'shimcha: SECURITY DEFINER funksiyaga `set search_path = public`
-- qo'shildi — usiz funksiya chaqiruvchining search_path'iga bog'liq
-- bo'ladi va bu xavfsizlik nuqsoni hisoblanadi.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, email, full_name, role, viloyat, muassasa)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.email = 'abdulahatov77@gmail.com' then 'admin'
      else coalesce(new.raw_user_meta_data->>'role', 'user')
    end,
    new.raw_user_meta_data->>'viloyat',
    nullif(btrim(coalesce(new.raw_user_meta_data->>'muassasa', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- ============ TEKSHIRUV ============
select p.proname,
       p.prosecdef as security_definer,
       p.proconfig as sozlamalar
from pg_trigger t
join pg_proc  p on p.oid = t.tgfoid
join pg_class c on c.oid = t.tgrelid
where c.relname = 'users' and not t.tgisinternal;
