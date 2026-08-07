-- =====================================================================
-- TUZATISH 2: operator does not exist: text - timestamp with time zone
-- 2026-08-07
--
-- Sabab: infarkt_qabul da vaqt maydonlari IKKI nusxada saqlanadi:
--   pci_vaqt      text   (ISO matn — ilova shu ustunga yozadi)
--   pci_vaqt_ts   timestamptz
--   tlt_vaqt      text
--   tlt_vaqt_ts   timestamptz
-- Men matnli variantini timestamp deb hisoblab ayirma olganman.
--
-- Yechim: xavfsiz o'girish funksiyasi + ikkala ustunni coalesce bilan olish
-- (qaysi biri to'ldirilganidan qat'i nazar ishlaydi).
--
-- Insult tomonida muammo yo'q — kt_vaqti, trombolizis_vaqti,
-- trombektomiya_vaqti hammasi timestamptz.
--
-- Ikkita funksiya qayta yaratiladi: get_hisobot_infarkt va get_hisobot_kaskad.
-- =====================================================================

-- ============ 0. XAVFSIZ TIMESTAMP O'GIRISH ============
-- ISO matnni timestamptz ga o'giradi. Format mos kelmasa NULL qaytaradi —
-- ::timestamptz to'g'ridan-to'g'ri ishlatilsa buzuq qiymatda xato beradi.
create or replace function public.hisobot_ts(p_txt text)
returns timestamptz
language sql immutable as $$
  select case when p_txt ~ '^\d{4}-\d{2}-\d{2}' then p_txt::timestamptz else null end;
$$;

grant execute on function public.hisobot_ts(text) to authenticated;


-- ============ 1. get_hisobot_infarkt ============
drop function if exists public.get_hisobot_infarkt(date, date, text);

create function public.get_hisobot_infarkt(
  p_from date,
  p_to   date,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  stemi int, nstemi int, ami int, jami int,
  kelish_103 int, kelish_mustaqil int, kelish_muassasadan int, kelish_poliklinika int,
  ekg int, exokg int, kag int, tlbap int, stent int, aksh int,
  tlt int, qutqaruvchi_pci int, medikamentoz int,
  reperfuziya int, reperfuziya_foiz numeric,
  d2e_10 int, d2b_90 int, d2n_30 int,
  yub_bosqich int, yub_filial int, yub_bosh int, yub_royxatdan_tashqari int,
  sogaygan int, yaxshilanish int, ozgarishsiz int, otkazilgan int,
  olim_24 int, olim_24plus int, olim_jami int, letallik_foiz numeric,
  ochiq_holat int, nazorat text
)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn as (
    select d.kt_no as kt, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'infarkt'
    group by d.kt_no
  ),
  chiq as (
    select distinct on (c.kt_no)
           c.kt_no as kt,
           coalesce(c.natija::text, c.chiqish_holat) as nat,
           c.chiqish_sana as chiq_vaqt
    from public.infarkt_chiqarish c
    order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  b as (
    select q.viloyat as vil, q.muassasa as mua, q.infarkt_turi as turi,
           q.murojaat_yoli as murojaat, q.qabul_vaqt as qv,
           q.ekg_vaqti_ts as ekg_ts,
           coalesce(q.pci_vaqt_ts, public.hisobot_ts(q.pci_vaqt)) as pci_ts,
           coalesce(q.tlt_vaqt_ts, public.hisobot_ts(q.tlt_vaqt)) as tlt_ts,
           q.otkazilgan_muassasa as manzil,
           lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                 coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                 coalesce(dn.m,'')) as mm,
           c.nat, c.chiq_vaqt
    from public.infarkt_qabul q
    left join dyn  dn on dn.kt = q.kt_no
    left join chiq c  on c.kt  = q.kt_no
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
  ),
  f as (
    select b.*,
           mg.id as manzil_id, mg.daraja as manzil_daraja, mg.nomi as manzil_nomi,
           public.hisobot_natija_guruh(b.nat)          as ng,
           (b.mm ~ 'kag|koronar angiografiya')         as f_kag,
           (b.mm ~ 'exokg|эхокг')                      as f_exokg,
           (b.mm ~ 'stent' or b.pci_ts is not null)    as f_stent,
           (b.mm ~ 'tlbap|ballon angioplastika')       as f_tlbap,
           (b.mm ~ 'aksh|shuntlash')                   as f_aksh,
           (b.tlt_ts is not null or b.mm ~ '\mtlt\M|trombolit') as f_tlt
    from b
    left join public.muassasalar mg on mg.nomi = b.manzil
  ),
  g as (
    select f.*,
           (f.f_tlt and not f.f_stent)                          as g_tlt,
           (f.f_tlt and f.f_stent)                              as g_qutq,
           (not f.f_kag and not f.f_stent and not f.f_tlbap
              and not f.f_aksh and not f.f_tlt)                 as g_medik,
           case
             when coalesce(f.manzil,'') = ''            then null
             when f.manzil_id is null                   then 'royxatdan_tashqari'
             when f.manzil_daraja = 'markaz'            then 'bosh'
             when f.manzil_nomi ilike '%kardiolog%'     then 'filial'
             when f.manzil_daraja = 'filial'            then 'filial'
             else 'bosqich'
           end as yub
    from f
  )
  select
    g.vil, g.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*) filter (where g.turi ilike '%stemi%'
                       and g.turi not ilike '%nstemi%'
                       and g.turi not ilike '%elevatsiyasiz%')::int,
    count(*) filter (where g.turi ilike '%nstemi%'
                        or g.turi ilike '%elevatsiyasiz%')::int,
    count(*) filter (where g.turi ilike '%miokard%')::int,
    count(*)::int,
    count(*) filter (where g.murojaat ilike '%tez tibbiy%')::int,
    count(*) filter (where g.murojaat ilike '%o''z murojaat%')::int,
    count(*) filter (where g.murojaat ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.murojaat ilike '%poliklinika%')::int,
    count(*) filter (where g.ekg_ts is not null)::int,
    count(*) filter (where g.f_exokg)::int,
    count(*) filter (where g.f_kag)::int,
    count(*) filter (where g.f_tlbap)::int,
    count(*) filter (where g.f_stent)::int,
    count(*) filter (where g.f_aksh)::int,
    count(*) filter (where g.g_tlt)::int,
    count(*) filter (where g.g_qutq)::int,
    count(*) filter (where g.g_medik)::int,
    count(*) filter (where g.f_stent or g.g_tlt or g.g_qutq)::int,
    round(100.0 * count(*) filter (where g.f_stent or g.g_tlt or g.g_qutq)
          / nullif(count(*), 0), 1),
    count(*) filter (where g.ekg_ts - g.qv <= interval '10 minutes')::int,
    count(*) filter (where g.pci_ts - g.qv <= interval '90 minutes')::int,
    count(*) filter (where g.tlt_ts - g.qv <= interval '30 minutes')::int,
    count(*) filter (where g.yub = 'bosqich')::int,
    count(*) filter (where g.yub = 'filial')::int,
    count(*) filter (where g.yub = 'bosh')::int,
    count(*) filter (where g.yub = 'royxatdan_tashqari')::int,
    count(*) filter (where g.ng = 'sogaygan')::int,
    count(*) filter (where g.ng = 'yaxshilanish')::int,
    count(*) filter (where g.ng = 'ozgarishsiz')::int,
    count(*) filter (where g.ng = 'otkazilgan')::int,
    count(*) filter (where g.ng = 'olim' and g.chiq_vaqt - g.qv <= interval '24 hours')::int,
    count(*) filter (where g.ng = 'olim'
                       and (g.chiq_vaqt is null or g.chiq_vaqt - g.qv > interval '24 hours'))::int,
    count(*) filter (where g.ng = 'olim')::int,
    round(100.0 * count(*) filter (where g.ng = 'olim') / nullif(count(*), 0), 1),
    count(*) filter (where g.ng is null)::int,
    case when count(*) filter (where g.ng = 'boshqa') = 0 then 'OK' else '⚠' end
  from g
  left join public.muassasalar m on m.nomi = g.mua
  group by g.vil, g.mua, m.mskt_bor, m.angiografiya_bor
  order by g.vil, g.mua;
end $$;

grant execute on function public.get_hisobot_infarkt(date, date, text) to authenticated;


-- ============ 2. get_hisobot_kaskad ============
drop function if exists public.get_hisobot_kaskad(date, date, text, text);

create function public.get_hisobot_kaskad(
  p_from date, p_to date,
  p_kasallik text,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text,
  b1 int, b2 int, b3 int, b4 int, b5 int, b6 int,
  k12 numeric, k23 numeric, k34 numeric, k45 numeric, k56 numeric,
  yakuniy_foiz numeric,
  natija_son int, natija_foiz numeric,
  eng_katta_yoqotish text, nazorat text
)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn_i as (
    select d.kt_no as kt, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'infarkt' group by d.kt_no
  ),
  dyn_s as (
    select d.kt_no as kt, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'insult' group by d.kt_no
  ),
  chiq_i as (
    select distinct on (c.kt_no) c.kt_no as kt,
           coalesce(c.natija::text, c.chiqish_holat) as nat
    from public.infarkt_chiqarish c order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  chiq_s as (
    select distinct on (c.kt_no) c.kt_no as kt, c.mrs_daraja as mrs
    from public.insult_chiqarish c order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  b as (
    -- INFARKT: b1 STEMI · b2 ≤12s oyna · b3 EKG≤10daq · b4 reperf. qarori
    --          b5 bajarilgan · b6 ≤90daq
    select q.viloyat as vil, q.muassasa as mua,
           (public.hisobot_oyna_soat(q.simptom_vaqt) <= 12)                      as s2r,
           (q.ekg_vaqti_ts - q.qabul_vaqt <= interval '10 minutes')              as s3r,
           (coalesce(dn.m,'') ~ 'kag|koronar angiografiya'
            or coalesce(q.tlt_vaqt_ts, public.hisobot_ts(q.tlt_vaqt)) is not null
            or lower(coalesce(q.muolaja_turi,'')) ~ 'kag|\mtlt\M|trombolit')     as s4r,
           (coalesce(q.pci_vaqt_ts, public.hisobot_ts(q.pci_vaqt)) is not null
            or coalesce(q.tlt_vaqt_ts, public.hisobot_ts(q.tlt_vaqt)) is not null
            or lower(coalesce(q.muolaja_turi,'')) ~ 'stent')                     as s5r,
           (coalesce(q.pci_vaqt_ts, public.hisobot_ts(q.pci_vaqt)) - q.qabul_vaqt
              <= interval '90 minutes')                                          as s6r,
           (ci.nat ilike '%vafot%')                                              as nr
    from public.infarkt_qabul q
    left join dyn_i  dn on dn.kt = q.kt_no
    left join chiq_i ci on ci.kt = q.kt_no
    where p_kasallik = 'infarkt'
      and q.qabul_vaqt >= p_from and q.qabul_vaqt < (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
      and q.infarkt_turi ilike '%stemi%'
      and q.infarkt_turi not ilike '%nstemi%'
      and q.infarkt_turi not ilike '%elevatsiyasiz%'

    union all

    -- INSULT: b1 ishemik · b2 MSKT · b3 ASPECTS · b4 ko'rsatma
    --         b5 bajarilgan · b6 ≤60daq
    select q.viloyat, q.muassasa,
           (q.mskt ~* '^\s*ha'),
           (q.aspects_ball is not null),
           (q.aspects_ball > 6 and public.hisobot_oyna_soat(q.simptom_vaqt) <= 24),
           (q.trombolizis_vaqti is not null or q.trombektomiya_vaqti is not null
            or coalesce(dn.m,'') ~ 'trombektomiya|tromboekstr|tromboaspir'
            or lower(coalesce(q.muolaja_turi,'')) ~ '\mtlt\M|trombolit|trombektomiya'),
           (q.trombolizis_vaqti - q.qabul_vaqt <= interval '60 minutes'),
           (cs.mrs is not null and cs.mrs::text ~ '^[0-2]')
    from public.insult_qabul q
    left join dyn_s  dn on dn.kt = q.kt_no
    left join chiq_s cs on cs.kt = q.kt_no
    where p_kasallik = 'insult'
      and q.qabul_vaqt >= p_from and q.qabul_vaqt < (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
      and q.insult_turi ilike '%ishemik%'
  ),
  -- Ichki to'plam: har bosqich oldingisining shartini ham o'z ichiga oladi
  s as (
    select b.vil, b.mua, b.nr,
           coalesce(b.s2r,false)                                          as s2,
           coalesce(b.s2r,false) and coalesce(b.s3r,false)                as s3,
           coalesce(b.s2r,false) and coalesce(b.s3r,false)
             and coalesce(b.s4r,false)                                    as s4,
           coalesce(b.s2r,false) and coalesce(b.s3r,false)
             and coalesce(b.s4r,false) and coalesce(b.s5r,false)          as s5,
           coalesce(b.s2r,false) and coalesce(b.s3r,false)
             and coalesce(b.s4r,false) and coalesce(b.s5r,false)
             and coalesce(b.s6r,false)                                    as s6
    from b
  ),
  a as (
    select s.vil, s.mua,
           count(*)::int                        as c1,
           count(*) filter (where s.s2)::int    as c2,
           count(*) filter (where s.s3)::int    as c3,
           count(*) filter (where s.s4)::int    as c4,
           count(*) filter (where s.s5)::int    as c5,
           count(*) filter (where s.s6)::int    as c6,
           count(*) filter (where s.nr)::int    as cn
    from s group by s.vil, s.mua
  )
  select a.vil, a.mua, a.c1, a.c2, a.c3, a.c4, a.c5, a.c6,
         round(100.0*a.c2/nullif(a.c1,0),1),
         round(100.0*a.c3/nullif(a.c2,0),1),
         round(100.0*a.c4/nullif(a.c3,0),1),
         round(100.0*a.c5/nullif(a.c4,0),1),
         round(100.0*a.c6/nullif(a.c5,0),1),
         round(100.0*a.c5/nullif(a.c1,0),1),
         a.cn,
         round(100.0*a.cn/nullif(a.c1,0),1),
         (select x.nom from (values
            ('1→2', coalesce(round(100.0*a.c2/nullif(a.c1,0),1), 999)),
            ('2→3', coalesce(round(100.0*a.c3/nullif(a.c2,0),1), 999)),
            ('3→4', coalesce(round(100.0*a.c4/nullif(a.c3,0),1), 999)),
            ('4→5', coalesce(round(100.0*a.c5/nullif(a.c4,0),1), 999)),
            ('5→6', coalesce(round(100.0*a.c6/nullif(a.c5,0),1), 999))
          ) as x(nom, val) order by x.val limit 1),
         case when a.c6 <= a.c5 and a.c5 <= a.c4 and a.c4 <= a.c3
               and a.c3 <= a.c2 and a.c2 <= a.c1 then 'OK' else '⚠' end
  from a
  order by a.vil, a.mua;
end $$;

grant execute on function public.get_hisobot_kaskad(date, date, text, text) to authenticated;


-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'get_hisobot%' or p.proname = 'hisobot_ts')
order by p.proname;
