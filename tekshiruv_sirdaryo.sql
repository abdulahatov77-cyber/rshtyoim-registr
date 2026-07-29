-- =====================================================================
-- SIRDARYO VILOYATI — BEMORLAR SONINI TEKSHIRISH (2026-07-28)
-- Hech narsa o'zgartirmaydi. Har bir so'rovni ALOHIDA belgilab Run qiling.
--
-- Maqsad: filial taqdim qilgan songa nisbatan tizimda ko'p chiqishining
-- sababini aniqlash — qayta kiritilgan (dublikat) bemorlarmi yoki
-- o'tkazish zanjiri (bir bemor ikki muassasada alohida yozuv)mi.
-- =====================================================================

-- F.I.O normalizatsiyasi (registr, apostrof turlari, ortiqcha bo'shliq)
create or replace function public.norm_fio(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
           lower(translate(coalesce(t, ''), e'\'`´ʻʼ‘’"', '')),
           '\s+', ' ', 'g'));
$$;

-- ============ (1) UMUMIY SON — muassasa va oy kesimida ============
with b as (
  select 'insult' as turi, kt_no, fio, muassasa, qabul_vaqt, status from public.insult_qabul
  where viloyat = 'Sirdaryo viloyati'
  union all
  select 'infarkt', kt_no, fio, muassasa, qabul_vaqt, status from public.infarkt_qabul
  where viloyat = 'Sirdaryo viloyati'
)
select muassasa,
       to_char(qabul_vaqt at time zone 'Asia/Tashkent', 'YYYY-MM') as oy,
       count(*) filter (where turi = 'infarkt') as infarkt,
       count(*) filter (where turi = 'insult')  as insult,
       count(*) as jami
from b
group by 1, 2
order by 1, 2;

-- ============ (2) AYNAN DUBLIKAT — bir xil F.I.O + tug'ilgan yil, BITTA muassasada ============
-- Bu eng shubhali guruh: bir bemor ikki marta kiritilgan bo'lishi mumkin.
with b as (
  select 'insult' as turi, id, kt_no, fio, muassasa, qabul_vaqt, status,
         coalesce(tugilgan_sana::text, tugilgan_yil) as tugilgan, created_at
  from public.insult_qabul where viloyat = 'Sirdaryo viloyati'
  union all
  select 'infarkt', id, kt_no, fio, muassasa, qabul_vaqt, status,
         coalesce(tugilgan_sana::text, tugilgan_yil), created_at
  from public.infarkt_qabul where viloyat = 'Sirdaryo viloyati'
)
select public.norm_fio(fio) as fio_norm, left(tugilgan, 4) as tugilgan_yil, muassasa,
       count(*) as nusxa_soni,
       string_agg(kt_no || ' [' || turi || ', ' ||
                  to_char(qabul_vaqt at time zone 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') || ', ' ||
                  status || ']', '  |  ' order by qabul_vaqt) as yozuvlar
from b
where fio is not null and left(tugilgan, 4) ~ '^\d{4}$'
group by 1, 2, 3
having count(*) > 1
order by 4 desc, 1;

-- ============ (3) O'TKAZISH ZANJIRI — bir bemor TURLI muassasalarda ============
-- Bu dublikat emas, lekin bemorni ikki marta sanashga olib keladi.
with b as (
  select 'insult' as turi, kt_no, fio, muassasa, qabul_vaqt, status,
         coalesce(tugilgan_sana::text, tugilgan_yil) as tugilgan
  from public.insult_qabul where viloyat = 'Sirdaryo viloyati'
  union all
  select 'infarkt', kt_no, fio, muassasa, qabul_vaqt, status,
         coalesce(tugilgan_sana::text, tugilgan_yil)
  from public.infarkt_qabul where viloyat = 'Sirdaryo viloyati'
)
select public.norm_fio(fio) as fio_norm, left(tugilgan, 4) as tugilgan_yil,
       count(distinct muassasa) as muassasa_soni,
       string_agg(muassasa || ' (' || to_char(qabul_vaqt at time zone 'Asia/Tashkent', 'DD.MM HH24:MI') || ')',
                  '  →  ' order by qabul_vaqt) as zanjir
from b
where fio is not null and left(tugilgan, 4) ~ '^\d{4}$'
group by 1, 2
having count(distinct muassasa) > 1
order by 3 desc, 1;

-- ============ (4) FAQAT RSHTYOIM SIRDARYO FILIALI — to'liq ro'yxat ============
-- Filial bilan solishtirish uchun (F.I.O, sana, K/T, status)
select turi, kt_no, fio, tugilgan,
       to_char(qabul_vaqt at time zone 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') as qabul,
       status,
       to_char(created_at at time zone 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') as kiritilgan
from (
  select 'insult' as turi, kt_no, fio, coalesce(tugilgan_sana::text, tugilgan_yil) as tugilgan,
         qabul_vaqt, status, created_at
  from public.insult_qabul where muassasa = 'RSHTYOIM Sirdaryo filiali'
  union all
  select 'infarkt', kt_no, fio, coalesce(tugilgan_sana::text, tugilgan_yil),
         qabul_vaqt, status, created_at
  from public.infarkt_qabul where muassasa = 'RSHTYOIM Sirdaryo filiali'
) t
order by qabul_vaqt;

-- ============ (5) BIR KUNDA IKKI MARTA KIRITILGAN (yaqin F.I.O) ============
-- Bir xil kunda, bir xil muassasada, F.I.O ning birinchi 6 harfi bir xil —
-- imlo farqi bilan qayta kiritilgan bo'lishi mumkin.
with b as (
  select 'insult' as turi, kt_no, fio, muassasa, qabul_vaqt, status
  from public.insult_qabul where viloyat = 'Sirdaryo viloyati'
  union all
  select 'infarkt', kt_no, fio, muassasa, qabul_vaqt, status
  from public.infarkt_qabul where viloyat = 'Sirdaryo viloyati'
)
select left(public.norm_fio(fio), 6) as fio_boshi,
       (qabul_vaqt at time zone 'Asia/Tashkent')::date as kun,
       muassasa, count(*) as soni,
       string_agg(fio || ' [' || kt_no || ']', '  |  ') as yozuvlar
from b
group by 1, 2, 3
having count(*) > 1
order by 4 desc, 2 desc;
