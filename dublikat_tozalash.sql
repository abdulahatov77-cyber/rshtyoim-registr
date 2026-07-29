-- =====================================================================
-- DUBLIKAT YOZUVLARNI TOZALASH (2026-07-29)
-- 37 ta takroriy bemor yozuvi va ularning yetim qolgan bog'liq
-- ma'lumotlari o'chiriladi.
--
-- ⚠️ AVVAL SUPABASE → DATABASE → BACKUPS DA ZAXIRA BORLIGINI TEKSHIRING!
--    O'chirilgan ma'lumotni qaytarib bo'lmaydi.
--
-- TARTIB:
--   1) PREVIEW  — nima o'chirilishini ko'rish (hech narsa o'zgarmaydi)
--   2) O'CHIRISH — 37 yozuv (muassasa bilan birga aniqlanadi)
--   3) YETIMLARNI TOZALASH — egasiz qolgan muolaja/varaqa/harakat yozuvlari
--   4) TUZATISHLAR — saqlangan yozuvlardagi noto'g'ri K/T va F.I.O
--   5) TEKSHIRUV
--
-- ESLATMA: quyidagi 6 bemor bu ro'yxatga KIRMAYDI — ularda status yoki
-- registr ziddiyati bor, filialdan aniqlangach alohida hal qilinadi:
--   Kuchkorova Norchuchuk, Xusanov Davron (Qashqadaryo),
--   Muxiddinov Kamoliddin (RSHM), Sobirova Muborak (Xorazm),
--   Dauletova Zoya (Nukus), Kim Yeva (Bekobod)
-- =====================================================================

-- O'chiriladigan yozuvlar ro'yxati (kt_no + muassasa juftligi bilan aniq)
create or replace view public.v_ochiriladigan as
select * from (values
  ('9597',                   'RSHTYOIM Buxoro filiali'),
  ('14 624',                 'RSHTYOIM Buxoro filiali'),
  ('14 635',                 'RSHTYOIM Buxoro filiali'),
  ('RSH-BUXO-260612-184709', 'RSHTYOIM Buxoro filiali'),
  ('RSH-BUXO-260622-787299', 'RSHTYOIM Buxoro filiali'),
  ('TOSH-4160',              'Toshloq TTB'),
  ('3087/291',               'RSHTYOIM Jizzax filiali'),
  ('4 191',                  'RSHTYOIM Jizzax filiali'),
  ('5 340',                  'RSHTYOIM Jizzax filiali'),
  ('KT-6815/586',            'RSHTYOIM Jizzax filiali'),
  ('KT-7637',                'RSHTYOIM Jizzax filiali'),
  ('6 729',                  'RSHTYOIM Namangan filiali'),
  ('RSH-NAMA-17541/1862',    'RSHTYOIM Namangan filiali'),
  ('RSH-NAMA-260706-896233', 'RSHTYOIM Namangan filiali'),
  ('4851',                   'Yangiqo''rg''on politravma markazi'),
  ('YANG-5818-337-264',      'Yangiqo''rg''on politravma markazi'),
  ('RSH-QASH-260615-977453', 'RSHTYOIM Qashqadaryo filiali'),
  ('3 460',                  'Beruniy TTB'),
  ('620',                    'RSHTYOIM Qoraqalpog''iston filiali'),
  ('1 723',                  'Guliston TTB'),
  ('RSH-SIRD-8925',          'RSHTYOIM Sirdaryo filiali'),
  ('63 596',                 'Shirin ShTB'),
  ('2 048',                  'Xovos TTB'),
  ('5 794',                  'RSHTYOIM Surxondaryo filiali'),
  ('12805',                  'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('14 183',                 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('KT-14790-1213',          'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('15 944',                 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('16040',                  'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('82 670',                 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('19 517',                 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('KT-260524-6297',         'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi'),
  ('1 963',                  'Chirchiq ShTB'),
  ('37 451 216',             'Parkent TTB'),
  ('KT-1290-572',            'Yangiyo''l TTB'),
  ('YANG-260626-585379',     'Yangiyo''l TTB'),
  -- Mamanazarov Shonazar: algoritm teng ball berdi. Kechroq kiritilgan va
  -- ismida "Xxx" to'ldirmasi bor nusxa o'chiriladi (RSH-SIRD-8561 qoladi).
  ('RSH-SIRD-260728-281320', 'RSHTYOIM Sirdaryo filiali')
) as t(kt_no, muassasa);

-- ============ 1) PREVIEW ============
select 'insult' as turi, q.kt_no, q.fio, q.muassasa, q.status,
       to_char(q.qabul_vaqt at time zone 'Asia/Tashkent','DD.MM.YYYY HH24:MI') as qabul
from public.insult_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa
union all
select 'infarkt', q.kt_no, q.fio, q.muassasa, q.status,
       to_char(q.qabul_vaqt at time zone 'Asia/Tashkent','DD.MM.YYYY HH24:MI')
from public.infarkt_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa
order by 4, 2;
-- Bu ro'yxat 37 qator bo'lishi kerak. Kam bo'lsa — nomlar mos kelmagan,
-- o'chirishni boshlamang, menga xabar bering.

-- ============ 1b) ZAXIRA NUSXA — O'CHIRISHDAN OLDIN MAJBURIY! ============
-- O'chiriladigan yozuvlar va ularning bog'liq ma'lumotlari alohida
-- jadvallarga ko'chiriladi. Xato bo'lsa shu jadvallardan qaytarish mumkin.
-- (Supabase PITR yoqilmagani uchun bu yagona aniq qaytarish yo'li.)
create table if not exists public.bkp_insult_qabul_20260729 as
select q.* from public.insult_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa;

create table if not exists public.bkp_infarkt_qabul_20260729 as
select q.* from public.infarkt_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa;

-- Bog'liq yozuvlar (o'chiriladigan kt_no lar bo'yicha)
create table if not exists public.bkp_bogliq_20260729 as
select 'dinamika_muolajalar' as jadval, to_jsonb(d) as qator from public.dinamika_muolajalar d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'holat_dinamikasi', to_jsonb(d) from public.holat_dinamikasi d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'navbatchi_jurnal', to_jsonb(d) from public.navbatchi_jurnal d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'kuzatuv', to_jsonb(d) from public.kuzatuv d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'bemor_fayllari', to_jsonb(d) from public.bemor_fayllari d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'transfer_log', to_jsonb(d) from public.transfer_log d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'insult_chiqarish', to_jsonb(d) from public.insult_chiqarish d
  where d.kt_no in (select kt_no from public.v_ochiriladigan)
union all
select 'infarkt_chiqarish', to_jsonb(d) from public.infarkt_chiqarish d
  where d.kt_no in (select kt_no from public.v_ochiriladigan);

-- Zaxira olinganini tasdiqlash (37 va bog'liq yozuvlar soni)
select (select count(*) from public.bkp_insult_qabul_20260729)  as insult_zaxira,
       (select count(*) from public.bkp_infarkt_qabul_20260729) as infarkt_zaxira,
       (select count(*) from public.bkp_bogliq_20260729)        as bogliq_zaxira;
-- insult_zaxira + infarkt_zaxira = 37 bo'lishi SHART. Aks holda davom etmang!

-- ============ 2) O'CHIRISH — butun blokni bitta Run bilan ============
delete from public.insult_qabul q
using public.v_ochiriladigan o
where q.kt_no = o.kt_no and q.muassasa = o.muassasa;

delete from public.infarkt_qabul q
using public.v_ochiriladigan o
where q.kt_no = o.kt_no and q.muassasa = o.muassasa;

-- ============ 3) YETIM QOLGAN BOG'LIQ YOZUVLARNI TOZALASH ============
-- Faqat egasi (bemor yozuvi) qolmagan qatorlar o'chiriladi —
-- shu sabab boshqa bemorlarning ma'lumotlariga tegmaydi.
delete from public.dinamika_muolajalar d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.holat_dinamikasi d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.navbatchi_jurnal d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.kuzatuv d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.bemor_fayllari d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.transfer_log d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

delete from public.insult_chiqarish d
where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no);

delete from public.infarkt_chiqarish d
where not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no);

-- ============ 4) SAQLANGAN YOZUVLARDAGI TUZATISHLAR ============
-- Odilova Gulnora — K/T raqami o'rniga ism yozilgan edi
update public.insult_qabul
set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora' and muassasa = 'Xovos TTB';

-- Avazov Muzaffar — K/T boshida ortiqcha bo'shliqlar
update public.insult_qabul
set kt_no = '14790'
where btrim(kt_no) = '14 790'
  and muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi';

-- To'rayev Najmiddin — K/T oxirida ortiqcha bo'shliq
update public.infarkt_qabul
set kt_no = btrim(kt_no)
where kt_no <> btrim(kt_no)
  and muassasa = 'Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi';

-- ============ 5) TEKSHIRUV ============
-- 5a. O'chirilganlar qolmaganini tasdiqlash (0 qator kutiladi)
select 'insult' as turi, q.kt_no, q.muassasa
from public.insult_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa
union all
select 'infarkt', q.kt_no, q.muassasa
from public.infarkt_qabul q join public.v_ochiriladigan o
  on q.kt_no = o.kt_no and q.muassasa = o.muassasa;

-- 5b. Yetim yozuv qolmaganini tasdiqlash (0 qator kutiladi)
select 'dinamika' as jadval, count(*) from public.dinamika_muolajalar d
where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)
having count(*) > 0
union all
select 'chiqarish_insult', count(*) from public.insult_chiqarish d
where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no)
having count(*) > 0;

-- 5c. Umumiy bemorlar soni (o'chirishdan keyin)
select 'insult' as turi, count(*) from public.insult_qabul
union all
select 'infarkt', count(*) from public.infarkt_qabul;

-- =====================================================================
-- 6) QAYTARISH (agar xato bo'lsa) — zaxira jadvallardan tiklash
-- Faqat zarurat bo'lganda ishlating.
-- =====================================================================
/*
insert into public.insult_qabul  select * from public.bkp_insult_qabul_20260729
  on conflict do nothing;
insert into public.infarkt_qabul select * from public.bkp_infarkt_qabul_20260729
  on conflict do nothing;

-- Bog'liq yozuvlar jsonb dan qaytariladi
insert into public.dinamika_muolajalar
select * from jsonb_populate_recordset(null::public.dinamika_muolajalar,
  (select coalesce(jsonb_agg(qator),'[]') from public.bkp_bogliq_20260729 where jadval='dinamika_muolajalar'))
on conflict do nothing;

insert into public.insult_chiqarish
select * from jsonb_populate_recordset(null::public.insult_chiqarish,
  (select coalesce(jsonb_agg(qator),'[]') from public.bkp_bogliq_20260729 where jadval='insult_chiqarish'))
on conflict do nothing;

insert into public.infarkt_chiqarish
select * from jsonb_populate_recordset(null::public.infarkt_chiqarish,
  (select coalesce(jsonb_agg(qator),'[]') from public.bkp_bogliq_20260729 where jadval='infarkt_chiqarish'))
on conflict do nothing;

insert into public.transfer_log
select * from jsonb_populate_recordset(null::public.transfer_log,
  (select coalesce(jsonb_agg(qator),'[]') from public.bkp_bogliq_20260729 where jadval='transfer_log'))
on conflict do nothing;
*/

-- =====================================================================
-- 7) TOZALASH (hammasi to'g'ri ekaniga ishonch hosil qilgach, 1-2 haftadan keyin)
-- =====================================================================
-- drop table if exists public.bkp_insult_qabul_20260729;
-- drop table if exists public.bkp_infarkt_qabul_20260729;
-- drop table if exists public.bkp_bogliq_20260729;
-- drop view  if exists public.v_ochiriladigan;
