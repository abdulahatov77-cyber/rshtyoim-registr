-- =====================================================================
-- XATO KT RENAME NI TIKLASH (2026-07-26, v2)
--
-- Muammo: "8915" raqami IKKI bemorda bir xil edi:
--   A) Alimova Mavludaxon  — Sirdaryo, qabul 25.07.2026, AKTIV
--   B) Kudratov Kudratillo — Jizzax,   qabul 22.06.2026, O'TKAZILDI
-- Bemor kartasidan raqam o'zgartirilganda IKKALASI ham o'zgarib ketgan
-- (kod xatosi — endi tuzatilgan).
--
-- Yechim: Kudratovni eski "8915" raqamiga qaytaramiz, bola-yozuvlarini
-- ham qaytaramiz. Ajratish mezoni: Alimova 25.07.2026 da qabul qilingan,
-- ya'ni 25.07.2026 dan OLDINGI yozuvlar — Kudratovniki.
--
-- v2: joriy (o'zgargan) raqam qanday bo'lishidan qat'i nazar ishlaydi.
-- TARTIB: 1 (preview) -> 2 (tiklash) -> 3 (tekshiruv)
-- =====================================================================

-- ============ 1) PREVIEW — hozirgi holat ============
-- 1a. Ikkala bemor va ularning joriy raqami
select id, kt_no, fio, viloyat, muassasa, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where fio ilike 'Alimova Mavludaxon%' or fio ilike 'Kudratov Kudratillo%'
   or kt_no = '8915'
order by qabul_vaqt;

-- 1b. Joriy raqam ostidagi barcha bola-yozuvlar (kimniki ekanini ko'rish uchun)
with shared as (
  select kt_no from public.insult_qabul where fio ilike 'Alimova Mavludaxon%' limit 1
)
select 'dinamika_muolajalar' as jadval, d.created_at at time zone 'Asia/Tashkent' as vaqt, d.muolaja_turi as tafsilot
from public.dinamika_muolajalar d, shared s where d.kt_no = s.kt_no
union all
select 'holat_dinamikasi', h.created_at at time zone 'Asia/Tashkent', coalesce(h.holat,'')
from public.holat_dinamikasi h, shared s where h.kt_no = s.kt_no
union all
select 'navbatchi_jurnal', n.created_at at time zone 'Asia/Tashkent', coalesce(n.holat_baholash,'')
from public.navbatchi_jurnal n, shared s where n.kt_no = s.kt_no
union all
select 'insult_chiqarish', c.created_at at time zone 'Asia/Tashkent',
       'chiqish: ' || coalesce(c.chiqish_sana::date::text,'—') || ' · ' || coalesce(c.natija,'')
from public.insult_chiqarish c, shared s where c.kt_no = s.kt_no
union all
select 'transfer_log', t.sana::timestamptz, coalesce(t.muassasa_ga,'')
from public.transfer_log t, shared s where t.kt_no = s.kt_no
union all
select 'kuzatuv', k.created_at at time zone 'Asia/Tashkent', coalesce(k.kuzatuv_davri,'')
from public.kuzatuv k, shared s where k.kt_no = s.kt_no
union all
select 'bemor_fayllari', f.created_at at time zone 'Asia/Tashkent', coalesce(f.nomi,'')
from public.bemor_fayllari f, shared s where f.kt_no = s.kt_no
order by 2;

-- ============ 2) TIKLASH — butun blokni bitta Run bilan ============
-- 2a. Kudratovni (Jizzax) eski raqamiga qaytaramiz
update public.insult_qabul
set kt_no = '8915'
where fio ilike 'Kudratov Kudratillo%'
  and viloyat = 'Jizzax viloyati';

-- 2b. Bola-yozuvlar: 25.07.2026 dan OLDINGILARI Kudratovniki
--     (endi shared kt faqat Alimovaga tegishli)
with shared as (
  select kt_no from public.insult_qabul where fio ilike 'Alimova Mavludaxon%' limit 1
),
u1 as (
  update public.dinamika_muolajalar d set kt_no = '8915'
  from shared s where d.kt_no = s.kt_no and d.created_at < '2026-07-25 00:00:00+05'
  returning 1
),
u2 as (
  update public.holat_dinamikasi h set kt_no = '8915'
  from shared s where h.kt_no = s.kt_no and h.created_at < '2026-07-25 00:00:00+05'
  returning 1
),
u3 as (
  update public.navbatchi_jurnal n set kt_no = '8915'
  from shared s where n.kt_no = s.kt_no and n.created_at < '2026-07-25 00:00:00+05'
  returning 1
),
u4 as (
  update public.kuzatuv k set kt_no = '8915'
  from shared s where k.kt_no = s.kt_no and k.created_at < '2026-07-25 00:00:00+05'
  returning 1
),
u5 as (
  update public.bemor_fayllari f set kt_no = '8915'
  from shared s where f.kt_no = s.kt_no and f.created_at < '2026-07-25 00:00:00+05'
  returning 1
),
u6 as (
  update public.insult_chiqarish c set kt_no = '8915'
  from shared s where c.kt_no = s.kt_no and c.chiqish_sana::date < '2026-07-25'
  returning 1
),
u7 as (
  update public.transfer_log t set kt_no = '8915'
  from shared s where t.kt_no = s.kt_no and t.sana::date < '2026-07-25'
  returning 1
)
select (select count(*) from u1) as dinamika_qaytdi,
       (select count(*) from u2) as holat_qaytdi,
       (select count(*) from u3) as navbatchi_qaytdi,
       (select count(*) from u4) as kuzatuv_qaytdi,
       (select count(*) from u5) as fayl_qaytdi,
       (select count(*) from u6) as chiqarish_qaytdi,
       (select count(*) from u7) as transfer_qaytdi;

-- ============ 3) TEKSHIRUV ============
-- 3a. Ikkala bemor endi turli raqamda
select kt_no, fio, viloyat, status,
       qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from public.insult_qabul
where fio ilike 'Alimova Mavludaxon%' or fio ilike 'Kudratov Kudratillo%'
order by qabul_vaqt;

-- 3b. Butun bazada takroriy kt_no qolganmi (0 qator kutiladi)
select 'insult' as turi, kt_no, count(*) as bemor_soni, string_agg(fio, ' | ') as bemorlar
from public.insult_qabul group by kt_no having count(*) > 1
union all
select 'infarkt', kt_no, count(*), string_agg(fio, ' | ')
from public.infarkt_qabul group by kt_no having count(*) > 1
order by 1, 2;
