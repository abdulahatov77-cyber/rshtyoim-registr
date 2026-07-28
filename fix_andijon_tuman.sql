-- =====================================================================
-- "Андижон туман" (kirillcha) → "Andijon TTB" (2026-07-28)
-- 2 bemor: Inomov Solijon, Osmonova Laylixon Ergashevna (Andijon viloyati)
-- "Andijon TTB" yangi muassasa sifatida ro'yxatga qo'shiladi.
-- ISHGA TUSHIRISH: Supabase SQL Editor — butun faylni bitta Run bilan.
-- =====================================================================

-- 1) Yangi muassasani imkoniyat jadvaliga qo'shamiz (galochkalar bo'sh —
--    MSKT/angiografiya bo'lsa "Muassasa imkoniyati" sahifasidan belgilaysiz)
insert into public.muassasalar (nomi, viloyat)
values ('Andijon TTB', 'Andijon viloyati')
on conflict (nomi) do nothing;

-- 2) Bemor yozuvlarini to'g'irlaymiz (kirillcha nom + oxiridagi bo'shliq)
update public.insult_qabul
set muassasa = 'Andijon TTB'
where btrim(muassasa) = 'Андижон туман';

update public.infarkt_qabul
set muassasa = 'Andijon TTB'
where btrim(muassasa) = 'Андижон туман';

update public.insult_qabul
set otkazilgan_muassasa = 'Andijon TTB'
where btrim(otkazilgan_muassasa) = 'Андижон туман';

update public.infarkt_qabul
set otkazilgan_muassasa = 'Andijon TTB'
where btrim(otkazilgan_muassasa) = 'Андижон туман';

update public.transfer_log
set muassasa_dan = 'Andijon TTB'
where btrim(muassasa_dan) = 'Андижон туман';

update public.transfer_log
set muassasa_ga = 'Andijon TTB'
where btrim(muassasa_ga) = 'Андижон туман';

-- 3) Tekshiruv — 2 bemor yangi nom bilan
select kt_no, fio, viloyat, muassasa, status
from public.insult_qabul where muassasa = 'Andijon TTB'
union all
select kt_no, fio, viloyat, muassasa, status
from public.infarkt_qabul where muassasa = 'Andijon TTB';

-- 4) Kirillcha nom qolmaganini tasdiqlash (0 qator kutiladi)
select 'insult' as turi, kt_no, muassasa from public.insult_qabul where muassasa ilike '%Андижон%'
union all
select 'infarkt', kt_no, muassasa from public.infarkt_qabul where muassasa ilike '%Андижон%';
