-- =====================================================================
-- TIZIM SOG'LIG'I — UMUMIY TEKSHIRUV (2026-07-28)
-- Hech narsa o'zgartirmaydi. Har bir so'rov 0 qator qaytarsa — muammo yo'q.
-- Butun faylni bitta Run bilan bajarsangiz, oxirgi so'rov natijasi ko'rinadi;
-- shuning uchun har birini ALOHIDA belgilab ishga tushiring.
-- =====================================================================

-- (1) Takroriy K/T raqami (bitta muassasada) — 0 kutiladi
select 'insult' as turi, muassasa, kt_no, count(*) as soni, string_agg(fio, ' | ') as bemorlar
from public.insult_qabul group by 1,2,3 having count(*) > 1
union all
select 'infarkt', muassasa, kt_no, count(*), string_agg(fio, ' | ')
from public.infarkt_qabul group by 1,2,3 having count(*) > 1;

-- (2) Etalon ro'yxatda yo'q muassasa nomlari — 0 kutiladi
with hammasi as (
  select viloyat, muassasa from public.infarkt_qabul where muassasa is not null
  union all
  select viloyat, muassasa from public.insult_qabul where muassasa is not null
)
select h.viloyat, h.muassasa, count(*) as bemor_soni
from hammasi h
where not exists (select 1 from public.muassasalar m where m.nomi = h.muassasa)
group by 1,2 order by 3 desc;

-- (3) Chiqish sanasi noto'g'ri (qabuldan oldin / kelajakda / 30 kundan ko'p keyin)
select 'insult' as turi, c.kt_no,
       (q.qabul_vaqt at time zone 'Asia/Tashkent')::date as qabul,
       c.chiqish_sana::date as chiqish
from public.insult_chiqarish c join public.insult_qabul q on q.kt_no = c.kt_no
where c.chiqish_sana::date < (q.qabul_vaqt at time zone 'Asia/Tashkent')::date
   or c.chiqish_sana::date > current_date
   or c.chiqish_sana::date > (q.qabul_vaqt at time zone 'Asia/Tashkent')::date + 30
union all
select 'infarkt', c.kt_no,
       (q.qabul_vaqt at time zone 'Asia/Tashkent')::date,
       c.chiqish_sana::date
from public.infarkt_chiqarish c join public.infarkt_qabul q on q.kt_no = c.kt_no
where c.chiqish_sana::date < (q.qabul_vaqt at time zone 'Asia/Tashkent')::date
   or c.chiqish_sana::date > current_date
   or c.chiqish_sana::date > (q.qabul_vaqt at time zone 'Asia/Tashkent')::date + 30;

-- (4) Muolaja/holat yozuvi qabul vaqtidan OLDIN yoki kelajakda
with bemor as (
  select kt_no, qabul_vaqt, 'insult' as turi from public.insult_qabul
  union all
  select kt_no, qabul_vaqt, 'infarkt' from public.infarkt_qabul
)
select x.jadval, x.kt_no,
       x.created_at at time zone 'Asia/Tashkent' as yozuv_vaqti,
       b.qabul_vaqt at time zone 'Asia/Tashkent' as qabul
from (
  select 'dinamika_muolajalar' as jadval, kt_no, registr_turi, created_at from public.dinamika_muolajalar
  union all
  select 'holat_dinamikasi', kt_no, registr_turi, created_at from public.holat_dinamikasi
) x
join bemor b on b.kt_no = x.kt_no and b.turi = x.registr_turi
where x.created_at < b.qabul_vaqt or x.created_at > now();

-- (5) Yoshi mantiqsiz bemorlar (1 dan kichik yoki 110 dan katta)
select turi, kt_no, fio, tugilgan, yosh from (
  select 'insult' as turi, kt_no, fio,
         coalesce(tugilgan_sana::text, tugilgan_yil) as tugilgan,
         date_part('year', age(qabul_vaqt, coalesce(tugilgan_sana, (left(tugilgan_yil,4) || '-01-01')::date)))::int as yosh
  from public.insult_qabul
  where coalesce(tugilgan_sana::text, tugilgan_yil) ~ '^\d{4}'
  union all
  select 'infarkt', kt_no, fio,
         coalesce(tugilgan_sana::text, tugilgan_yil),
         date_part('year', age(qabul_vaqt, coalesce(tugilgan_sana, (left(tugilgan_yil,4) || '-01-01')::date)))::int
  from public.infarkt_qabul
  where coalesce(tugilgan_sana::text, tugilgan_yil) ~ '^\d{4}'
) t
where yosh < 1 or yosh > 110
order by yosh desc;

-- (6) "Chiqarildi/vafot" statusida, lekin chiqarish varaqasi yo'q
select 'insult' as turi, q.kt_no, q.fio, q.muassasa, q.status
from public.insult_qabul q
where q.status in ('chiqarildi','vafot')
  and not exists (select 1 from public.insult_chiqarish c where c.kt_no = q.kt_no)
union all
select 'infarkt', q.kt_no, q.fio, q.muassasa, q.status
from public.infarkt_qabul q
where q.status in ('chiqarildi','vafot')
  and not exists (select 1 from public.infarkt_chiqarish c where c.kt_no = q.kt_no);

-- (7) Telegram: oxirgi so'rovlar holati (200 = yetkazilgan)
select id, status_code, left(content::text, 60) as javob
from net._http_response order by id desc limit 10;
