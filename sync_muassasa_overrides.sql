-- =====================================================================
-- ADMIN QO'SHGAN MUASSASALARNI IMKONIYAT JADVALIGA SINXRONLASH (2026-07-25)
-- Admin Panel -> Muassasalar bo'limida qo'shilganlar muassasa_overrides
-- jadvalida turadi — ularni muassasalar (imkoniyat) jadvaliga ko'chiramiz.
-- =====================================================================

-- 1) Mavjud qo'shilganlarni ko'chirish
insert into public.muassasalar (nomi, viloyat)
select o.nomi, o.viloyat
from public.muassasa_overrides o
where o.action = 'add'
on conflict (nomi) do nothing;

-- 2) Kelajakda ham avtomatik tushishi uchun: frontend yangi muassasa
--    qo'shilganda muassasalar jadvaliga ham yozadi — bunga INSERT ruxsati kerak
--    (imkoniyat galochkalari baribir faqat super_admin RPC orqali o'zgaradi)
drop policy if exists "muassasalar_insert" on public.muassasalar;
create policy "muassasalar_insert" on public.muassasalar
  for insert to authenticated with check (true);

-- 3) Tekshirish — qo'shilganlar endi ro'yxatda
select viloyat, nomi, mskt_bor, angiografiya_bor
from public.muassasalar
where nomi in (select nomi from public.muassasa_overrides where action = 'add')
order by viloyat, nomi;
