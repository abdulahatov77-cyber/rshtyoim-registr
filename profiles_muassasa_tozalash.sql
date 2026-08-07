-- =====================================================================
-- SUPER_ADMIN VA RAHBAR PROFILLARIDAN MUASSASANI TOZALASH
-- 2026-08-07
--
-- Muammo: 2026-08-07 da profiles.muassasa ni bemor yozuvlaridan
-- to'ldirganda super_admin va rahbar hisoblariga ham muassasa yozilib
-- qolgan (ular ham bemor kiritgan/tahrirlagan bo'lgani uchun).
-- Natijada "Qabul kutilmoqda" ro'yxati ularga tasodifiy muassasa
-- bo'yicha filtrlangan holda chiqdi.
--
-- Bu rollarda ish joyi bo'lmasligi kerak — ular bemor qabul qilmaydi.
-- =====================================================================

-- Avval ko'ring: kimlarda muassasa yozilgan
select u.email, p.role, p.viloyat, p.muassasa
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('super_admin', 'rahbar')
  and coalesce(p.muassasa, '') <> ''
order by p.role, u.email;

-- Tozalash
update public.profiles
   set muassasa = null
 where role in ('super_admin', 'rahbar')
   and coalesce(muassasa, '') <> '';

-- Natija
select role, count(*) as jami,
       count(*) filter (where coalesce(muassasa,'') <> '') as muassasali
from public.profiles
group by role
order by role;
