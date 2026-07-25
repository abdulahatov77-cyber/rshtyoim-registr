-- =====================================================================
-- XATO KT RENAME NI TIKLASH (2026-07-26)
--
-- Muammo: "8915" raqami IKKI bemorda bir xil edi. Bemor kartasidan
-- birinchisining (Alimova Mavludaxon, Sirdaryo, qabul 25.07.2026)
-- raqami "sirl18915" ga o'zgartirilganda, ikkinchisi ham
-- (Kudratov Kudratillo, Jizzax, qabul 22.06.2026) o'zgarib qolgan.
--
-- Yechim: Kudratovni eski "8915" raqamiga qaytaramiz va uning
-- bola-yozuvlarini (muolaja, holat, chiqarish...) ham qaytaramiz.
-- Ajratish mezoni: Alimova 25.07.2026 da qabul qilingan, ya'ni
-- 25.07.2026 dan OLDINGI yozuvlar — Kudratovniki.
--
-- TARTIB: 1 (preview) -> 2 (tiklash) -> 3 (tekshiruv)
-- =====================================================================

-- ============ 1) PREVIEW — hozirgi holat ============
-- 1a. "sirl18915" raqamli bemorlar
select id, kt_no, fio, viloyat, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where kt_no in ('sirl18915', '8915')
order by qabul_vaqt;

-- 1b. Shu raqam ostidagi barcha bola-yozuvlar (qaysi biri kimniki)
select 'dinamika_muolajalar' as jadval, id::text, created_at at time zone 'Asia/Tashkent' as vaqt,
       muolaja_turi as tafsilot
from public.dinamika_muolajalar where kt_no = 'sirl18915'
union all
select 'holat_dinamikasi', id::text, created_at at time zone 'Asia/Tashkent', coalesce(holat,'')
from public.holat_dinamikasi where kt_no = 'sirl18915'
union all
select 'navbatchi_jurnal', id::text, created_at at time zone 'Asia/Tashkent', coalesce(holat_baholash,'')
from public.navbatchi_jurnal where kt_no = 'sirl18915'
union all
select 'insult_chiqarish', id::text, created_at at time zone 'Asia/Tashkent',
       'chiqish: ' || coalesce(chiqish_sana::date::text,'—') || ' · ' || coalesce(natija,'')
from public.insult_chiqarish where kt_no = 'sirl18915'
union all
select 'transfer_log', id::text, sana::timestamptz, coalesce(muassasa_ga,'')
from public.transfer_log where kt_no = 'sirl18915'
union all
select 'kuzatuv', id::text, created_at at time zone 'Asia/Tashkent', coalesce(kuzatuv_davri,'')
from public.kuzatuv where kt_no = 'sirl18915'
union all
select 'bemor_fayllari', id::text, created_at at time zone 'Asia/Tashkent', coalesce(nomi,'')
from public.bemor_fayllari where kt_no = 'sirl18915'
order by 3;

-- ============ 2) TIKLASH ============
-- 2a. Kudratovni (Jizzax, qabul 22.06.2026) eski raqamiga qaytaramiz
update public.insult_qabul
set kt_no = '8915'
where kt_no = 'sirl18915'
  and fio ilike 'Kudratov%'
  and viloyat = 'Jizzax viloyati';

-- 2b. Bola-yozuvlar: 25.07.2026 dan OLDINGILARI Kudratovniki
update public.dinamika_muolajalar set kt_no = '8915'
where kt_no = 'sirl18915' and created_at < '2026-07-25 00:00:00+05';

update public.holat_dinamikasi set kt_no = '8915'
where kt_no = 'sirl18915' and created_at < '2026-07-25 00:00:00+05';

update public.navbatchi_jurnal set kt_no = '8915'
where kt_no = 'sirl18915' and created_at < '2026-07-25 00:00:00+05';

update public.kuzatuv set kt_no = '8915'
where kt_no = 'sirl18915' and created_at < '2026-07-25 00:00:00+05';

update public.bemor_fayllari set kt_no = '8915'
where kt_no = 'sirl18915' and created_at < '2026-07-25 00:00:00+05';

-- Chiqarish varaqasi — chiqish sanasi bo'yicha (Kudratov 29.06.2026 da chiqarilgan)
update public.insult_chiqarish set kt_no = '8915'
where kt_no = 'sirl18915' and chiqish_sana::date < '2026-07-25';

-- Transfer (harakat) — sanasi bo'yicha
update public.transfer_log set kt_no = '8915'
where kt_no = 'sirl18915' and sana::date < '2026-07-25';

-- ============ 3) TEKSHIRUV ============
-- 3a. Ikkala bemor o'z raqamida turibdimi
select kt_no, fio, viloyat, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where kt_no in ('sirl18915', '8915')
order by qabul_vaqt;

-- 3b. Har bir raqamdagi bola-yozuvlar soni
select kt_no,
  (select count(*) from public.dinamika_muolajalar d where d.kt_no = x.kt_no) as dinamika,
  (select count(*) from public.holat_dinamikasi h where h.kt_no = x.kt_no)    as holat,
  (select count(*) from public.insult_chiqarish c where c.kt_no = x.kt_no)    as chiqarish,
  (select count(*) from public.transfer_log t where t.kt_no = x.kt_no)        as transfer
from (select unnest(array['sirl18915','8915']) as kt_no) x;
