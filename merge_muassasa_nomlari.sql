-- =====================================================================
-- MUASSASA NOMLARINI BIRLASHTIRISH (2026-07-28)
--
-- Muammo: bir muassasa turlicha yozilgan — "Tuproqqa'la TTB" / "Tuproqqala TTB",
-- "RSHTYoIM" / "RSHTYOIM ... filiali", kirillcha "Андижон туман" va h.k.
-- Natijada Admin panelda "Viloyatga mos kelmaydi" chiqadi, hisobotlar bo'linadi.
--
-- Yechim: `muassasalar` jadvalidagi nom ETALON hisoblanadi. Boshqa yozuvlar
-- normalizatsiya (kichik harf, apostrof/tirnoq olib tashlash, ortiqcha bo'shliq)
-- orqali etalonga moslanadi va barcha bemor yozuvlari shu nom bilan saqlanadi.
--
-- TARTIB: 1 (funksiya) -> 2 (preview) -> 3 (birlashtirish) -> 4 (qolganlar ro'yxati)
-- 4-bo'limda chiqqanlar (kirillcha va boshqa mos kelmaydiganlar) qo'lda hal qilinadi.
-- =====================================================================

-- ============ 1. NORMALIZATSIYA FUNKSIYASI ============
create or replace function public.norm_nom(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
           lower(translate(coalesce(t, ''), e'\'`´ʻʼ‘’"', '')),
           '\s+', ' ', 'g'));
$$;

-- ============ 2. PREVIEW — qaysi nom qaysi etalonga birlashtiriladi ============
with hammasi as (
  select viloyat, muassasa from public.infarkt_qabul where muassasa is not null
  union all
  select viloyat, muassasa from public.insult_qabul  where muassasa is not null
),
notoliq as (   -- etalon ro'yxatda AYNAN mos kelmaydigan nomlar
  select h.viloyat, h.muassasa, count(*) as bemor_soni
  from hammasi h
  where not exists (select 1 from public.muassasalar m where m.nomi = h.muassasa)
  group by 1, 2
),
moslik as (    -- normalizatsiya orqali topilgan etalon
  select n.*, (
    select m.nomi from public.muassasalar m
    where public.norm_nom(m.nomi) = public.norm_nom(n.muassasa)
    order by m.nomi limit 1
  ) as etalon
  from notoliq n
)
select viloyat, muassasa as hozirgi_nom, etalon as yangi_nom, bemor_soni,
       case when etalon is null then '❌ moslik topilmadi — qo''lda' else '✅ birlashtiriladi' end as holat
from moslik
order by (etalon is null) desc, bemor_soni desc;

-- ============ 3. BIRLASHTIRISH — butun blokni bitta Run bilan ============
-- Bemor yozuvlari (muassasa)
update public.infarkt_qabul q
set muassasa = m.nomi
from public.muassasalar m
where q.muassasa is not null and q.muassasa <> m.nomi
  and public.norm_nom(q.muassasa) = public.norm_nom(m.nomi);

update public.insult_qabul q
set muassasa = m.nomi
from public.muassasalar m
where q.muassasa is not null and q.muassasa <> m.nomi
  and public.norm_nom(q.muassasa) = public.norm_nom(m.nomi);

-- O'tkazilgan muassasa
update public.infarkt_qabul q
set otkazilgan_muassasa = m.nomi
from public.muassasalar m
where q.otkazilgan_muassasa is not null and q.otkazilgan_muassasa <> m.nomi
  and public.norm_nom(q.otkazilgan_muassasa) = public.norm_nom(m.nomi);

update public.insult_qabul q
set otkazilgan_muassasa = m.nomi
from public.muassasalar m
where q.otkazilgan_muassasa is not null and q.otkazilgan_muassasa <> m.nomi
  and public.norm_nom(q.otkazilgan_muassasa) = public.norm_nom(m.nomi);

-- Bemor harakati (transfer_log)
update public.transfer_log t
set muassasa_dan = m.nomi
from public.muassasalar m
where t.muassasa_dan is not null and t.muassasa_dan <> m.nomi
  and public.norm_nom(t.muassasa_dan) = public.norm_nom(m.nomi);

update public.transfer_log t
set muassasa_ga = m.nomi
from public.muassasalar m
where t.muassasa_ga is not null and t.muassasa_ga <> m.nomi
  and public.norm_nom(t.muassasa_ga) = public.norm_nom(m.nomi);

-- ============ 4. QOLGANLAR — qo'lda birlashtirish uchun ro'yxat ============
-- Bu nomlar etalonga mos kelmadi (kirillcha, qisqartma, xato yozilgan va h.k.).
-- Har biri uchun to'g'ri nomni ayting — men aniq UPDATE yozib beraman.
with hammasi as (
  select viloyat, muassasa from public.infarkt_qabul where muassasa is not null
  union all
  select viloyat, muassasa from public.insult_qabul  where muassasa is not null
)
select h.viloyat, h.muassasa as nom, count(*) as bemor_soni
from hammasi h
where not exists (select 1 from public.muassasalar m where m.nomi = h.muassasa)
group by 1, 2
order by 3 desc;
