-- =====================================================================
-- DIAGNOSTIKA — 8915 / o'zgargan raqam holati (2026-07-26)
-- Hech narsa o'zgartirmaydi, faqat ko'rsatadi.
-- Har bir so'rovni ALOHIDA belgilab Run qiling va natijasini yuboring.
-- =====================================================================

-- (1) Kudratov va Alimova bo'yicha BARCHA yozuvlar
select id, kt_no, fio, viloyat, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul,
       created_at at time zone 'Asia/Tashkent' as kiritilgan
from public.insult_qabul
where fio ilike 'Kudratov Kudratillo%' or fio ilike 'Alimova Mavludaxon%'
order by created_at;

-- (2) "8915" raqamli barcha bemorlar (ikkala registrda)
select 'insult' as turi, id::text, kt_no, fio, viloyat, muassasa,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul where kt_no = '8915'
union all
select 'infarkt', id::text, kt_no, fio, viloyat, muassasa,
       qabul_vaqt at time zone 'Asia/Tashkent'
from public.infarkt_qabul where kt_no = '8915'
order by 1, 7;

-- (3) "8915" ni o'z ichiga olgan barcha raqamlar (sirl18915, siiirl18915 ...)
select 'insult' as turi, kt_no, fio, viloyat, muassasa,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul where kt_no like '%8915%'
union all
select 'infarkt', kt_no, fio, viloyat, muassasa,
       qabul_vaqt at time zone 'Asia/Tashkent'
from public.infarkt_qabul where kt_no like '%8915%'
order by 1, 2;

-- (4) Jadvaldagi unikal cheklovlar (kt_no qanday cheklangan)
select conname, pg_get_constraintdef(oid) as tarif
from pg_constraint
where conrelid in ('public.insult_qabul'::regclass, 'public.infarkt_qabul'::regclass)
  and contype in ('u', 'p')
order by conrelid::regclass::text, conname;
