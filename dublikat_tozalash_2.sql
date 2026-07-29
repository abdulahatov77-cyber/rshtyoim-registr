-- =====================================================================
-- DUBLIKAT TOZALASH — 2-BOSQICH TUZATISHLARI (2026-07-29)
--
-- 1-bosqichda 37 tadan 21 tasi o'chdi. Ikki muammo:
--   A) 16 ta yozuv topilmadi — K/T raqamidagi bo'shliq oddiy probel emas
--      (NBSP va shunga o'xshash belgilar), shuning uchun aynan moslik ishlamadi.
--   B) 4-bo'limdagi K/T o'zgartirish bog'liq yozuvlarni yetim qoldirdi
--      (bemor raqami o'zgardi, muolaja/varaqa eski raqamda qoldi).
--
-- TARTIB: 1 (yetimlarni tiklash) -> 2 (qolgan 16 tani topish) ->
--         3 (zaxira) -> 4 (o'chirish) -> 5 (tekshiruv)
-- =====================================================================

-- ============ 1) YETIM YOZUVLARNI EGASIGA QAYTARISH ============
-- 1a. Qaysi raqamlar yetim qolgan — ko'rish
select 'dinamika_muolajalar' as jadval, kt_no, count(*) as soni
from public.dinamika_muolajalar d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)
group by 1,2
union all
select 'insult_chiqarish', kt_no, count(*)
from public.insult_chiqarish d
where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no)
group by 1,2
union all
select 'infarkt_chiqarish', kt_no, count(*)
from public.infarkt_chiqarish d
where not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)
group by 1,2
union all
select 'transfer_log', kt_no, count(*)
from public.transfer_log d
where not exists (select 1 from public.insult_qabul  q where q.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)
group by 1,2;

-- 1b. Nomi o'zgargan bemorlarning yozuvlarini yangi raqamga ko'chirish
--     (Odilova Gulnora: 'XOVO- Odilova Gulnora' -> '2048')
update public.insult_chiqarish set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora';
update public.dinamika_muolajalar set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora';
update public.holat_dinamikasi set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora';
update public.navbatchi_jurnal set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora';
update public.transfer_log set kt_no = '2048'
where kt_no = 'XOVO- Odilova Gulnora';

-- 1c. Bo'shliqli raqamlar trim qilingan bemorlarning yozuvlarini ko'chirish:
--     yetim yozuvning raqami bo'shliqsiz ko'rinishda mavjud bemorga mos kelsa —
--     o'sha bemorga biriktiramiz.
update public.insult_chiqarish d set kt_no = q.kt_no
from public.insult_qabul q
where not exists (select 1 from public.insult_qabul z where z.kt_no = d.kt_no)
  and regexp_replace(d.kt_no, '\s', '', 'g') = regexp_replace(q.kt_no, '\s', '', 'g');

update public.infarkt_chiqarish d set kt_no = q.kt_no
from public.infarkt_qabul q
where not exists (select 1 from public.infarkt_qabul z where z.kt_no = d.kt_no)
  and regexp_replace(d.kt_no, '\s', '', 'g') = regexp_replace(q.kt_no, '\s', '', 'g');

update public.dinamika_muolajalar d set kt_no = q.kt_no
from (select kt_no from public.insult_qabul union all select kt_no from public.infarkt_qabul) q
where not exists (select 1 from public.insult_qabul  z where z.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul z where z.kt_no = d.kt_no)
  and regexp_replace(d.kt_no, '\s', '', 'g') = regexp_replace(q.kt_no, '\s', '', 'g');

update public.transfer_log d set kt_no = q.kt_no
from (select kt_no from public.insult_qabul union all select kt_no from public.infarkt_qabul) q
where not exists (select 1 from public.insult_qabul  z where z.kt_no = d.kt_no)
  and not exists (select 1 from public.infarkt_qabul z where z.kt_no = d.kt_no)
  and regexp_replace(d.kt_no, '\s', '', 'g') = regexp_replace(q.kt_no, '\s', '', 'g');

-- ============ 2) QOLGAN 16 TA DUBLIKATNI TOPISH ============
-- Bo'shliq turiga befarq (barcha bo'shliq belgilarini olib tashlab) solishtiramiz
create or replace view public.v_qolgan_dublikat as
select o.kt_no as royxatdagi, o.muassasa,
       q.turi, q.id, q.kt_no as haqiqiy_kt, q.fio, q.status
from public.v_ochiriladigan o
join (
  select 'insult' as turi, id, kt_no, fio, muassasa, status from public.insult_qabul
  union all
  select 'infarkt', id, kt_no, fio, muassasa, status from public.infarkt_qabul
) q
  on q.muassasa = o.muassasa
 and regexp_replace(q.kt_no, '\s', '', 'g') = regexp_replace(o.kt_no, '\s', '', 'g');

-- 2a. Ko'rish — 16 qator kutiladi
select * from public.v_qolgan_dublikat order by muassasa, fio;

-- ============ 3) ZAXIRA (o'chirishdan oldin) ============
create table if not exists public.bkp2_insult_20260729 as
select q.* from public.insult_qabul q
where q.id in (select id from public.v_qolgan_dublikat where turi = 'insult');

create table if not exists public.bkp2_infarkt_20260729 as
select q.* from public.infarkt_qabul q
where q.id in (select id from public.v_qolgan_dublikat where turi = 'infarkt');

create table if not exists public.bkp2_bogliq_20260729 as
select 'dinamika_muolajalar' as jadval, to_jsonb(d) as qator from public.dinamika_muolajalar d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat)
union all
select 'insult_chiqarish', to_jsonb(d) from public.insult_chiqarish d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat)
union all
select 'infarkt_chiqarish', to_jsonb(d) from public.infarkt_chiqarish d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat)
union all
select 'transfer_log', to_jsonb(d) from public.transfer_log d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat)
union all
select 'holat_dinamikasi', to_jsonb(d) from public.holat_dinamikasi d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat)
union all
select 'navbatchi_jurnal', to_jsonb(d) from public.navbatchi_jurnal d
  where d.kt_no in (select haqiqiy_kt from public.v_qolgan_dublikat);

select (select count(*) from public.bkp2_insult_20260729)  as zaxira_insult,
       (select count(*) from public.bkp2_infarkt_20260729) as zaxira_infarkt;
-- Yig'indisi 16 bo'lishi kerak.

-- ============ 4) O'CHIRISH ============
delete from public.insult_qabul
where id in (select id from public.v_qolgan_dublikat where turi = 'insult');

delete from public.infarkt_qabul
where id in (select id from public.v_qolgan_dublikat where turi = 'infarkt');

-- Yetim qolgan bog'liq yozuvlarni tozalash
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

-- ============ 5) YAKUNIY TEKSHIRUV ============
select
  (select count(*) from public.v_qolgan_dublikat)                     as qolgan_dublikat,
  (select count(*) from public.dinamika_muolajalar d
     where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no)
       and not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)) as yetim_dinamika,
  (select count(*) from public.insult_chiqarish d
     where not exists (select 1 from public.insult_qabul q where q.kt_no = d.kt_no))  as yetim_varaqa_ins,
  (select count(*) from public.infarkt_chiqarish d
     where not exists (select 1 from public.infarkt_qabul q where q.kt_no = d.kt_no)) as yetim_varaqa_inf,
  (select count(*) from public.insult_qabul)  as jami_insult,
  (select count(*) from public.infarkt_qabul) as jami_infarkt;
-- Barcha "qolgan/yetim" ustunlari 0 bo'lishi kerak.
