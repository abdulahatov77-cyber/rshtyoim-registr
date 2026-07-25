-- =====================================================================
-- XATO KT RENAME NI TIKLASH (2026-07-26, v3 — aniq nishonlangan)
--
-- Holat: "siiirl18915" raqami 2 ta bemorda:
--   A) Alimova Mavludaxon  — Sirdaryo, RSHTYOIM Sirdaryo filiali, 25.07.2026, aktiv
--   B) Kudratov Kudratillo Nematovich — Jizzax, RSHTYOIM Jizzax filiali, 22.06.2026, o'tkazilgan
-- Ikkalasi ham ilgari "8915" edi; kod xatosi tufayli birga o'zgargan.
--
-- Yechim: FAQAT Kudratovni "8915" ga qaytaramiz (Alimova siiirl18915 da qoladi,
-- uni keyin kartadan xohlagan raqamga o'zgartirasiz).
-- Bola-yozuvlar 25.07.2026 chegarasi bo'yicha ajratiladi.
--
-- v3: eski skript "Kudratov Kudratillo%" bo'yicha IKKI yozuvni ushlagan edi
--     (Jizzaxda shu bemorning 2 nusxasi bor) — endi faqat kt_no bo'yicha.
-- =====================================================================

-- ============ 1) PREVIEW ============
-- 1a. Tegiladigan yagona qator (1 ta bo'lishi kerak)
select id, kt_no, fio, viloyat, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where kt_no = 'siiirl18915' and fio ilike 'Kudratov%';

-- 1b. "8915" bo'sh ekanini tasdiqlash (0 qator kutiladi)
select id, kt_no, fio, muassasa from public.insult_qabul where kt_no = '8915';

-- 1c. Joriy raqam ostidagi bola-yozuvlar — qaysi biri kimniki
select 'dinamika_muolajalar' as jadval, created_at at time zone 'Asia/Tashkent' as vaqt, muolaja_turi as tafsilot
from public.dinamika_muolajalar where kt_no = 'siiirl18915'
union all
select 'holat_dinamikasi', created_at at time zone 'Asia/Tashkent', coalesce(holat,'')
from public.holat_dinamikasi where kt_no = 'siiirl18915'
union all
select 'navbatchi_jurnal', created_at at time zone 'Asia/Tashkent', coalesce(holat_baholash,'')
from public.navbatchi_jurnal where kt_no = 'siiirl18915'
union all
select 'insult_chiqarish', created_at at time zone 'Asia/Tashkent',
       'chiqish: ' || coalesce(chiqish_sana::date::text,'—') || ' · ' || coalesce(natija,'')
from public.insult_chiqarish where kt_no = 'siiirl18915'
union all
select 'transfer_log', sana::timestamptz, coalesce(muassasa_ga,'')
from public.transfer_log where kt_no = 'siiirl18915'
union all
select 'kuzatuv', created_at at time zone 'Asia/Tashkent', coalesce(kuzatuv_davri,'')
from public.kuzatuv where kt_no = 'siiirl18915'
union all
select 'bemor_fayllari', created_at at time zone 'Asia/Tashkent', coalesce(nomi,'')
from public.bemor_fayllari where kt_no = 'siiirl18915'
order by 2;

-- ============ 2) TIKLASH — butun blokni bitta Run bilan ============
-- 2a. FAQAT Kudratovning "siiirl18915" qatorini "8915" ga qaytaramiz
update public.insult_qabul
set kt_no = '8915'
where kt_no = 'siiirl18915'
  and fio ilike 'Kudratov%'
  and muassasa = 'RSHTYOIM Jizzax filiali';

-- 2b. Bola-yozuvlar: 25.07.2026 dan OLDINGILARI Kudratovniki
with u1 as (
  update public.dinamika_muolajalar set kt_no = '8915'
  where kt_no = 'siiirl18915' and created_at < '2026-07-25 00:00:00+05' returning 1
),
u2 as (
  update public.holat_dinamikasi set kt_no = '8915'
  where kt_no = 'siiirl18915' and created_at < '2026-07-25 00:00:00+05' returning 1
),
u3 as (
  update public.navbatchi_jurnal set kt_no = '8915'
  where kt_no = 'siiirl18915' and created_at < '2026-07-25 00:00:00+05' returning 1
),
u4 as (
  update public.kuzatuv set kt_no = '8915'
  where kt_no = 'siiirl18915' and created_at < '2026-07-25 00:00:00+05' returning 1
),
u5 as (
  update public.bemor_fayllari set kt_no = '8915'
  where kt_no = 'siiirl18915' and created_at < '2026-07-25 00:00:00+05' returning 1
),
u6 as (
  update public.insult_chiqarish set kt_no = '8915'
  where kt_no = 'siiirl18915' and chiqish_sana::date < '2026-07-25' returning 1
),
u7 as (
  update public.transfer_log set kt_no = '8915'
  where kt_no = 'siiirl18915' and sana::date < '2026-07-25' returning 1
)
select (select count(*) from u1) as dinamika_qaytdi,
       (select count(*) from u2) as holat_qaytdi,
       (select count(*) from u3) as navbatchi_qaytdi,
       (select count(*) from u4) as kuzatuv_qaytdi,
       (select count(*) from u5) as fayl_qaytdi,
       (select count(*) from u6) as chiqarish_qaytdi,
       (select count(*) from u7) as transfer_qaytdi;

-- ============ 3) TEKSHIRUV ============
select kt_no, fio, viloyat, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where kt_no in ('8915', 'siiirl18915')
order by qabul_vaqt;

-- =====================================================================
-- 4) ALOHIDA MASALA — Kudratovning IKKI NUSXASI (qo'lda hal qiling)
-- Jizzaxda bir xil bemor 2 marta kiritilgan (bir xil qabul vaqti):
--   RSH-JIZZ-260622-631164  — Kudratov Kudratillo
--   8915 (tiklangandan keyin) — Kudratov Kudratillo Nematovich
-- Qaysi biri to'liqroq ekanini ko'rib, ortiqchasini bemor kartasidan
-- o'chiring (Super admin -> O'chirish).
-- =====================================================================
select id, kt_no, fio, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul,
       created_at at time zone 'Asia/Tashkent' as kiritilgan,
       insult_turi, muolaja_turi, nihss_qabul, shifokor_fio
from public.insult_qabul
where muassasa = 'RSHTYOIM Jizzax filiali'
  and fio ilike 'Kudratov Kudratillo%'
order by created_at;
