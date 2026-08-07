-- =====================================================================
-- KENGAYTIRILGAN HISOBOT MODULI — RPC'lar
-- 2026-08-07
--
-- Etalon: Hisobot-jadvali-STRUKTURA.md (10 varaq)
-- Beshta funksiya:
--   get_hisobot_infarkt            -> 1-INFARKT varag'i
--   get_hisobot_insult             -> 2-INSULT varag'i
--   get_hisobot_marshrut_muassasa  -> 4- va 5-MARSHRUT varaqlari
--   get_hisobot_marshrut_matritsa  -> 6-VILOYATLARARO varag'i
--   get_hisobot_kaskad             -> 7- va 8-KASKAD varaqlari
--   (3-XULOSA va 9-KASKAD-XULOSA — yuqoridagilardan jamlanadi, alohida RPC kerak emas)
--
-- QABUL QILINGAN QARORLAR (o'zgartirish oson, har biri bitta joyda):
--
-- 1) CHIQISH NATIJALARI. Bazada 5 xil qiymat bor, etalonda ham 5 ustun,
--    lekin ular bir-biriga mos emas:
--      Tuzaldi                      -> Sog'aygan
--      Reabilitatsiyaga yuborildi   -> Yaxshilanish bilan   ⚠️ QAROR
--      O'zgarishsiz                 -> O'zgarishsiz
--      Boshqa shifoxonaga o'tkazildi-> Boshqa muassasaga o'tkazilgan
--      Vafot etdi                   -> O'lim
--    "Reabilitatsiyaga yuborildi" (insultda 3339 ta) etalonda o'z ustuniga
--    ega emas. Bemor tirik chiqqan va reabilitatsiyaga yuborilgan — beshta
--    ustundan shunga eng yaqin. Shu tanlov Nazorat balansini ham to'g'ri
--    chiqaradi. O'zgartirish kerak bo'lsa — `natija_guruh()` funksiyasida.
--
-- 2) O'LIM VAQTI. `olim_vaqti` ustuni bazada yo'q va qo'shilsa ham 18 000 ta
--    eski yozuvda bo'sh qolardi. Shuning uchun vafot etgan bemorda
--    `chiqish_sana` o'lim vaqti sifatida ishlatiladi — chiqarish varaqasi
--    aynan o'sha kuni to'ldiriladi. Migratsiya kerak emas, retrospektiv
--    ma'lumot ham ishlaydi.
--
-- 3) BOSQICH (1/2/-). Alohida ustun kerak emas, `muassasalar` dan chiqadi:
--    angiografiya bor -> '2', faqat MSKT -> '1', aks holda '-'.
--
-- 4) SECURITY DEFINER + funksiya ichida ochiq rol tekshiruvi. Sabab:
--    invoker bilan 20 000 qatorga RLS qo'llanadi va 8 soniyalik chegaradan
--    oshadi (2026-08-07 da get_pq20_hisobot da aynan shu bo'lgan).
-- =====================================================================

-- ============ 0. YORDAMCHI FUNKSIYALAR ============

-- Chiqish natijasini etalon guruhiga o'giradi
create or replace function public.hisobot_natija_guruh(p_natija text)
returns text
language sql immutable as $$
  select case
    when p_natija is null or btrim(p_natija) = ''         then null
    when p_natija ilike '%vafot%' or p_natija ilike '%o''lim%' then 'olim'
    when p_natija ilike '%tuzal%' or p_natija ilike '%sog%'    then 'sogaygan'
    when p_natija ilike '%reabilitatsiya%'                     then 'yaxshilanish'
    when p_natija ilike '%yaxshilan%'                          then 'yaxshilanish'
    when p_natija ilike '%o''zgarishsiz%' or p_natija ilike '%ozgarishsiz%' then 'ozgarishsiz'
    when p_natija ilike '%o''tkazil%' or p_natija ilike '%otkazil%'
      or p_natija ilike '%shifoxona%'                          then 'otkazilgan'
    else 'boshqa'
  end;
$$;

-- Simptom boshlanishidan o'tgan vaqt (soat). Ikki xil format qo'llab-quvvatlanadi:
--   "0–3 soat ichida" / "6-12 soat ichida"  -> yuqori chegara (3, 12)
--   "3 soat" (insult yangi forma)           -> 3
--   "24 soatdan ortiq/ko'p"                 -> 999
--   "Noma'lum" / "Uyquda boshlangan"        -> null
create or replace function public.hisobot_oyna_soat(p_txt text)
returns int
language sql immutable as $$
  select case
    when p_txt is null                             then null
    when p_txt ~* '24 soatdan'                     then 999
    when p_txt ~ '[–—-]\s*\d+'                     then (substring(p_txt from '[–—-]\s*(\d+)'))::int
    when p_txt ~ '^\s*\d+\s*soat'                  then (substring(p_txt from '^\s*(\d+)'))::int
    else null
  end;
$$;

-- Muassasa bosqichi (SSV buyrug'i №136): 2 = MSKT + angiograf, 1 = MSKT, '-' = ro'yxatda yo'q
create or replace function public.hisobot_bosqich(p_mskt boolean, p_angio boolean)
returns text
language sql immutable as $$
  select case when p_angio then '2' when p_mskt then '1' else '-' end;
$$;

grant execute on function public.hisobot_natija_guruh(text) to authenticated;
grant execute on function public.hisobot_oyna_soat(text)   to authenticated;
grant execute on function public.hisobot_bosqich(boolean, boolean) to authenticated;


-- ============ 1. 1-INFARKT VARAG'I ============
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
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn as (
    select d.kt_no, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'infarkt'
    group by d.kt_no
  ),
  chiq as (
    -- Bir bemorda bir nechta varaqa bo'lsa oxirgisi olinadi
    select distinct on (c.kt_no)
           c.kt_no, coalesce(c.natija::text, c.chiqish_holat) as natija, c.chiqish_sana
    from public.infarkt_chiqarish c
    order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  b as (
    select q.kt_no, q.viloyat, q.muassasa, q.infarkt_turi, q.murojaat_yoli,
           q.qabul_vaqt, q.ekg_vaqti_ts, q.pci_vaqt, q.tlt_vaqt,
           q.otkazilgan_muassasa,
           lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                 coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                 coalesce(dn.m,'')) as mm,
           c.natija, c.chiqish_sana
    from public.infarkt_qabul q
    left join dyn  dn on dn.kt_no = q.kt_no
    left join chiq c  on c.kt_no  = q.kt_no
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
  ),
  f as (
    select b.*,
           mg.id                                        as manzil_id,
           mg.daraja                                    as manzil_daraja,
           mg.nomi                                      as manzil_nomi,
           public.hisobot_natija_guruh(b.natija)        as ng,
           (b.mm ~ 'kag|koronar angiografiya')          as f_kag,
           (b.mm ~ 'exokg|эхокг|exo-kg')                as f_exokg,
           (b.mm ~ 'stent' or b.pci_vaqt is not null)   as f_stent,
           (b.mm ~ 'tlbap|ballon angioplastika')        as f_tlbap,
           (b.mm ~ 'aksh|shuntlash')                    as f_aksh,
           (b.tlt_vaqt is not null or b.mm ~ '\mtlt\M|trombolit') as f_tlt
    from b
    left join public.muassasalar mg on mg.nomi = b.otkazilgan_muassasa
  ),
  g as (
    select f.*,
           (f.f_tlt and not f.f_stent)                          as g_tlt,
           (f.f_tlt and f.f_stent)                              as g_qutq,
           (not f.f_kag and not f.f_stent and not f.f_tlbap
              and not f.f_aksh and not f.f_tlt)                 as g_medik,
           case
             when coalesce(f.otkazilgan_muassasa,'') = '' then null
             when f.manzil_id is null                     then 'royxatdan_tashqari'
             when f.manzil_daraja = 'markaz'              then 'bosh'
             when f.manzil_nomi ilike '%kardiolog%'       then 'filial'
             when f.manzil_daraja = 'filial'              then 'filial'
             else 'bosqich'
           end as yub
    from f
  )
  select
    g.viloyat,
    g.muassasa,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*) filter (where g.infarkt_turi ilike '%stemi%'
                       and g.infarkt_turi not ilike '%nstemi%'
                       and g.infarkt_turi not ilike '%elevatsiyasiz%')::int,
    count(*) filter (where g.infarkt_turi ilike '%nstemi%'
                        or g.infarkt_turi ilike '%elevatsiyasiz%')::int,
    count(*) filter (where g.infarkt_turi ilike '%miokard%')::int,
    count(*)::int,
    count(*) filter (where g.murojaat_yoli ilike '%tez tibbiy%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%o''z murojaat%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%poliklinika%')::int,
    count(*) filter (where g.ekg_vaqti_ts is not null)::int,
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
    count(*) filter (where g.ekg_vaqti_ts - g.qabul_vaqt <= interval '10 minutes')::int,
    count(*) filter (where g.pci_vaqt    - g.qabul_vaqt <= interval '90 minutes')::int,
    count(*) filter (where g.tlt_vaqt    - g.qabul_vaqt <= interval '30 minutes')::int,
    count(*) filter (where g.yub = 'bosqich')::int,
    count(*) filter (where g.yub = 'filial')::int,
    count(*) filter (where g.yub = 'bosh')::int,
    count(*) filter (where g.yub = 'royxatdan_tashqari')::int,
    count(*) filter (where g.ng = 'sogaygan')::int,
    count(*) filter (where g.ng = 'yaxshilanish')::int,
    count(*) filter (where g.ng = 'ozgarishsiz')::int,
    count(*) filter (where g.ng = 'otkazilgan')::int,
    count(*) filter (where g.ng = 'olim'
                       and g.chiqish_sana - g.qabul_vaqt <= interval '24 hours')::int,
    count(*) filter (where g.ng = 'olim'
                       and (g.chiqish_sana is null
                            or g.chiqish_sana - g.qabul_vaqt > interval '24 hours'))::int,
    count(*) filter (where g.ng = 'olim')::int,
    round(100.0 * count(*) filter (where g.ng = 'olim') / nullif(count(*), 0), 1),
    count(*) filter (where g.ng is null)::int,
    case when count(*) = count(*) filter (where g.ng is not null and g.ng <> 'boshqa')
                        + count(*) filter (where g.ng is null)
                        + count(*) filter (where g.ng = 'boshqa')
         then 'OK' else '⚠' end
  from g
  left join public.muassasalar m on m.nomi = g.muassasa
  group by g.viloyat, g.muassasa, m.mskt_bor, m.angiografiya_bor
  order by g.viloyat, g.muassasa;
end $$;

grant execute on function public.get_hisobot_infarkt(date, date, text) to authenticated;


-- ============ 2. 2-INSULT VARAG'I ============
drop function if exists public.get_hisobot_insult(date, date, text);

create function public.get_hisobot_insult(
  p_from date,
  p_to   date,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  ishemik int, gemorragik int, tia int, jami int,
  kelish_103 int, kelish_mustaqil int, kelish_muassasadan int, kelish_poliklinika int,
  mskt int, kta int, aspects int, nihss int,
  tlt int, trombektomiya int, bridging int,
  gematoma int, dekompressiv int, aneurizma int, medikamentoz int,
  reperfuziya int, reperfuziya_foiz numeric, mskt_qamrov_foiz numeric,
  d2ct_20 int, d2n_60 int, d2p_120 int,
  yub_bosqich int, yub_filial int, yub_bosh int, yub_royxatdan_tashqari int,
  sogaygan int, yaxshilanish int, ozgarishsiz int, otkazilgan int,
  olim_24 int, olim_24plus int, olim_jami int, letallik_foiz numeric,
  mrs_0_2 int, ochiq_holat int, nazorat text
)
language plpgsql stable security definer
set search_path = public
as $$
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn as (
    select d.kt_no, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'insult'
    group by d.kt_no
  ),
  chiq as (
    select distinct on (c.kt_no)
           c.kt_no, c.natija::text as natija, c.chiqish_sana, c.mrs_daraja
    from public.insult_chiqarish c
    order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  b as (
    select q.kt_no, q.viloyat, q.muassasa, q.insult_turi, q.murojaat_yoli,
           q.qabul_vaqt, q.kt_vaqti, q.trombolizis_vaqti, q.trombektomiya_vaqti,
           q.mskt, q.mskt_angiografiya, q.aspects_ball, q.nihss_qabul,
           q.otkazilgan_muassasa,
           lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                 coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                 coalesce(dn.m,'')) as mm,
           c.natija, c.chiqish_sana, c.mrs_daraja
    from public.insult_qabul q
    left join dyn  dn on dn.kt_no = q.kt_no
    left join chiq c  on c.kt_no  = q.kt_no
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
  ),
  f as (
    select b.*,
           mg.id as manzil_id, mg.daraja as manzil_daraja, mg.nomi as manzil_nomi,
           public.hisobot_natija_guruh(b.natija) as ng,
           (b.mskt ~* '^\s*ha')                                as f_mskt,
           (b.mskt_angiografiya ~* '^ha')                      as f_kta,
           (b.trombolizis_vaqti is not null
              or b.mm ~ '\mtlt\M|trombolit')                   as f_tlt,
           (b.trombektomiya_vaqti is not null
              or b.mm ~ 'trombektomiya|tromboekstr|tromboaspir') as f_te,
           (b.mm ~ 'gematoma')                                 as f_gem,
           (b.mm ~ 'dekompressiv|trepanatsiya|freza')          as f_dek,
           (b.mm ~ 'anevrizma|aneurizma|klipirov|embolizatsiya') as f_anev
    from b
    left join public.muassasalar mg on mg.nomi = b.otkazilgan_muassasa
  ),
  g as (
    select f.*,
           (f.f_tlt and not f.f_te)                            as g_tlt,
           (f.f_te  and not f.f_tlt)                           as g_te,
           (f.f_tlt and f.f_te)                                as g_bridge,
           (not f.f_tlt and not f.f_te and not f.f_gem
              and not f.f_dek and not f.f_anev)                as g_medik,
           case
             when coalesce(f.otkazilgan_muassasa,'') = '' then null
             when f.manzil_id is null                     then 'royxatdan_tashqari'
             when f.manzil_daraja = 'markaz'              then 'bosh'
             when f.manzil_nomi ilike '%kardiolog%'       then 'filial'
             when f.manzil_daraja = 'filial'              then 'filial'
             else 'bosqich'
           end as yub
    from f
  )
  select
    g.viloyat,
    g.muassasa,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*) filter (where g.insult_turi ilike '%ishemik%')::int,
    count(*) filter (where g.insult_turi ilike '%gemorragik%'
                        or g.insult_turi ilike '%subaraxnoidal%')::int,
    count(*) filter (where g.insult_turi ilike '%tia%'
                        or g.insult_turi ilike '%tranzitor%')::int,
    count(*)::int,
    count(*) filter (where g.murojaat_yoli ilike '%tez tibbiy%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%o''z murojaat%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.murojaat_yoli ilike '%poliklinika%')::int,
    count(*) filter (where g.f_mskt)::int,
    count(*) filter (where g.f_kta)::int,
    count(*) filter (where g.aspects_ball is not null)::int,
    count(*) filter (where g.nihss_qabul is not null)::int,
    count(*) filter (where g.g_tlt)::int,
    count(*) filter (where g.g_te)::int,
    count(*) filter (where g.g_bridge)::int,
    count(*) filter (where g.f_gem)::int,
    count(*) filter (where g.f_dek)::int,
    count(*) filter (where g.f_anev)::int,
    count(*) filter (where g.g_medik)::int,
    count(*) filter (where g.f_tlt or g.f_te)::int,
    round(100.0 * count(*) filter (where g.f_tlt or g.f_te)
          / nullif(count(*) filter (where g.insult_turi ilike '%ishemik%'), 0), 1),
    round(100.0 * count(*) filter (where g.f_mskt) / nullif(count(*), 0), 1),
    count(*) filter (where g.kt_vaqti           - g.qabul_vaqt <= interval '20 minutes')::int,
    count(*) filter (where g.trombolizis_vaqti  - g.qabul_vaqt <= interval '60 minutes')::int,
    count(*) filter (where g.trombektomiya_vaqti- g.qabul_vaqt <= interval '120 minutes')::int,
    count(*) filter (where g.yub = 'bosqich')::int,
    count(*) filter (where g.yub = 'filial')::int,
    count(*) filter (where g.yub = 'bosh')::int,
    count(*) filter (where g.yub = 'royxatdan_tashqari')::int,
    count(*) filter (where g.ng = 'sogaygan')::int,
    count(*) filter (where g.ng = 'yaxshilanish')::int,
    count(*) filter (where g.ng = 'ozgarishsiz')::int,
    count(*) filter (where g.ng = 'otkazilgan')::int,
    count(*) filter (where g.ng = 'olim'
                       and g.chiqish_sana - g.qabul_vaqt <= interval '24 hours')::int,
    count(*) filter (where g.ng = 'olim'
                       and (g.chiqish_sana is null
                            or g.chiqish_sana - g.qabul_vaqt > interval '24 hours'))::int,
    count(*) filter (where g.ng = 'olim')::int,
    round(100.0 * count(*) filter (where g.ng = 'olim') / nullif(count(*), 0), 1),
    count(*) filter (where g.mrs_daraja is not null and g.mrs_daraja::text ~ '^[0-2]')::int,
    count(*) filter (where g.ng is null)::int,
    case when count(*) filter (where g.ng = 'boshqa') = 0 then 'OK' else '⚠' end
  from g
  left join public.muassasalar m on m.nomi = g.muassasa
  group by g.viloyat, g.muassasa, m.mskt_bor, m.angiografiya_bor
  order by g.viloyat, g.muassasa;
end $$;

grant execute on function public.get_hisobot_insult(date, date, text) to authenticated;


-- ============ 3. 4-/5-MARSHRUT VARAQLARI ============
drop function if exists public.get_hisobot_marshrut_muassasa(date, date, text, text);

create function public.get_hisobot_marshrut_muassasa(
  p_from date, p_to date,
  p_kasallik text,                 -- 'infarkt' | 'insult'
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text, jami int,
  oz_hududidan int, boshqadan_qabul int,
  ozida_davolangan int, yub_1bosqich int, yub_filial int, yub_kardio int,
  yub_bosh int, yub_boshqa_viloyat int, yub_royxatdan_tashqari int,
  jami_yuborilgan int, yuborish_foiz numeric,
  fokus_bemor int, fokus_yetkazilgan int, yetkazish_foiz numeric,
  nazorat text
)
language plpgsql stable security definer
set search_path = public
as $$
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with b as (
    select q.viloyat, q.muassasa, q.murojaat_yoli, q.otkazilgan_muassasa,
           q.turi_matn, q.fokus
    from (
      select viloyat, muassasa, murojaat_yoli, otkazilgan_muassasa,
             infarkt_turi as turi_matn,
             (infarkt_turi ilike '%stemi%' and infarkt_turi not ilike '%nstemi%'
              and infarkt_turi not ilike '%elevatsiyasiz%') as fokus,
             qabul_vaqt
      from public.infarkt_qabul
      where p_kasallik = 'infarkt'
      union all
      select viloyat, muassasa, murojaat_yoli, otkazilgan_muassasa,
             insult_turi,
             (insult_turi ilike '%ishemik%'),
             qabul_vaqt
      from public.insult_qabul
      where p_kasallik = 'insult'
    ) q
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
  ),
  g as (
    select b.*,
           case
             when coalesce(b.otkazilgan_muassasa,'') = ''      then 'ozida'
             when mg.id is null                                then 'royxatdan_tashqari'
             when mg.nomi ilike '%kardiolog%'                  then 'kardio'
             when mg.daraja = 'markaz'                         then 'bosh'
             when mg.daraja = 'filial'                         then 'filial'
             when mg.viloyat is distinct from b.viloyat        then 'boshqa_viloyat'
             else 'bosqich1'
           end as yub,
           coalesce(mg.angiografiya_bor, false) as manzilda_angio
    from b
    left join public.muassasalar mg on mg.nomi = b.otkazilgan_muassasa
  )
  select
    g.viloyat, g.muassasa,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*)::int,
    count(*) filter (where g.murojaat_yoli not ilike '%boshqa muassasa%'
                        or g.murojaat_yoli is null)::int,
    count(*) filter (where g.murojaat_yoli ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.yub = 'ozida')::int,
    count(*) filter (where g.yub = 'bosqich1')::int,
    count(*) filter (where g.yub = 'filial')::int,
    count(*) filter (where g.yub = 'kardio')::int,
    count(*) filter (where g.yub = 'bosh')::int,
    count(*) filter (where g.yub = 'boshqa_viloyat')::int,
    count(*) filter (where g.yub = 'royxatdan_tashqari')::int,
    count(*) filter (where g.yub <> 'ozida')::int,
    round(100.0 * count(*) filter (where g.yub <> 'ozida') / nullif(count(*), 0), 1),
    count(*) filter (where g.fokus)::int,
    count(*) filter (where g.fokus and g.manzilda_angio)::int,
    round(100.0 * count(*) filter (where g.fokus and g.manzilda_angio)
          / nullif(count(*) filter (where g.fokus), 0), 1),
    case when count(*) = count(*) filter (where g.yub = 'ozida')
                       + count(*) filter (where g.yub <> 'ozida')
         then 'OK' else '⚠' end
  from g
  left join public.muassasalar m on m.nomi = g.muassasa
  group by g.viloyat, g.muassasa, m.mskt_bor, m.angiografiya_bor
  order by g.viloyat, g.muassasa;
end $$;

grant execute on function public.get_hisobot_marshrut_muassasa(date, date, text, text) to authenticated;


-- ============ 4. 6-VILOYATLARARO MATRITSA ============
drop function if exists public.get_hisobot_marshrut_matritsa(date, date, text);

create function public.get_hisobot_marshrut_matritsa(
  p_from date, p_to date,
  p_kasallik text
)
returns table (
  yuboruvchi_viloyat text, qabul_viloyat text, bemor_soni int
)
language plpgsql stable security definer
set search_path = public
as $$
declare v_role text; v_vil text; v_filtr text := null;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    v_filtr := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with b as (
    select q.viloyat, q.otkazilgan_muassasa
    from (
      select viloyat, otkazilgan_muassasa, qabul_vaqt
      from public.infarkt_qabul where p_kasallik = 'infarkt'
      union all
      select viloyat, otkazilgan_muassasa, qabul_vaqt
      from public.insult_qabul  where p_kasallik = 'insult'
    ) q
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (v_filtr is null or q.viloyat = v_filtr)
  )
  select b.viloyat,
         case
           when coalesce(b.otkazilgan_muassasa,'') = '' then b.viloyat   -- diagonal
           when mg.viloyat is null then 'Boshqa / noma''lum'
           else mg.viloyat
         end,
         count(*)::int
  from b
  left join public.muassasalar mg on mg.nomi = b.otkazilgan_muassasa
  where b.viloyat is not null
  group by 1, 2
  order by 1, 2;
end $$;

grant execute on function public.get_hisobot_marshrut_matritsa(date, date, text) to authenticated;


-- ============ 5. 7-/8-KASKAD VARAQLARI ============
-- MUHIM: har bosqich oldingisining ICHKI TO'PLAMI. Shuning uchun har
-- `filter` oldingi bosqichning shartlarini ham o'z ichiga oladi.
drop function if exists public.get_hisobot_kaskad(date, date, text, text);

create function public.get_hisobot_kaskad(
  p_from date, p_to date,
  p_kasallik text,                 -- 'infarkt' | 'insult'
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
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn as (
    select d.kt_no, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m,
           lower(coalesce(d.registr_turi,'')) as rt
    from public.dinamika_muolajalar d
    group by d.kt_no, lower(coalesce(d.registr_turi,''))
  ),
  chiq as (
    select distinct on (c.kt_no) c.kt_no, c.natija::text as natija, c.mrs_daraja
    from public.insult_chiqarish c order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  chiq_i as (
    select distinct on (c.kt_no) c.kt_no,
           coalesce(c.natija::text, c.chiqish_holat) as natija
    from public.infarkt_chiqarish c order by c.kt_no, c.chiqish_sana desc nulls last
  ),
  b as (
    -- INFARKT: b1 STEMI, b2 <=12 soat oyna, b3 EKG<=10 daq,
    --          b4 reperfuziya qarori (KAG yoki TLT), b5 bajarilgan, b6 <=90 daq
    select q.viloyat, q.muassasa,
           true                                                    as s1,
           (public.hisobot_oyna_soat(q.simptom_vaqt) <= 12)        as s2_raw,
           (q.ekg_vaqti_ts - q.qabul_vaqt <= interval '10 minutes') as s3_raw,
           (mm.mm ~ 'kag|koronar angiografiya' or q.tlt_vaqt is not null
            or mm.mm ~ '\mtlt\M|trombolit')                        as s4_raw,
           (q.pci_vaqt is not null or q.tlt_vaqt is not null
            or mm.mm ~ 'stent')                                    as s5_raw,
           (q.pci_vaqt - q.qabul_vaqt <= interval '90 minutes')     as s6_raw,
           (ci.natija ilike '%vafot%')                             as n_raw
    from public.infarkt_qabul q
    left join lateral (
      select lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                   coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                   coalesce((select m from dyn where dyn.kt_no = q.kt_no and dyn.rt = 'infarkt'),'')) as mm
    ) mm on true
    left join chiq_i ci on ci.kt_no = q.kt_no
    where p_kasallik = 'infarkt'
      and q.qabul_vaqt >= p_from and q.qabul_vaqt < (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
      and q.infarkt_turi ilike '%stemi%'
      and q.infarkt_turi not ilike '%nstemi%'
      and q.infarkt_turi not ilike '%elevatsiyasiz%'

    union all

    -- INSULT: b1 ishemik, b2 MSKT, b3 ASPECTS baholangan,
    --         b4 ko'rsatma (ASPECTS>6 va oynada), b5 bajarilgan, b6 <=60 daq
    select q.viloyat, q.muassasa,
           true,
           (q.mskt ~* '^\s*ha'),
           (q.aspects_ball is not null),
           (q.aspects_ball > 6 and public.hisobot_oyna_soat(q.simptom_vaqt) <= 24),
           (q.trombolizis_vaqti is not null or q.trombektomiya_vaqti is not null
            or mm.mm ~ '\mtlt\M|trombolit|trombektomiya|tromboekstr|tromboaspir'),
           (q.trombolizis_vaqti - q.qabul_vaqt <= interval '60 minutes'),
           (cs.mrs_daraja is not null and cs.mrs_daraja::text ~ '^[0-2]')
    from public.insult_qabul q
    left join lateral (
      select lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                   coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                   coalesce((select m from dyn where dyn.kt_no = q.kt_no and dyn.rt = 'insult'),'')) as mm
    ) mm on true
    left join chiq cs on cs.kt_no = q.kt_no
    where p_kasallik = 'insult'
      and q.qabul_vaqt >= p_from and q.qabul_vaqt < (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
      and q.insult_turi ilike '%ishemik%'
  ),
  -- Ichki to'plam: har bosqich oldingisining shartini ham o'z ichiga oladi
  s as (
    select b.*,
           coalesce(b.s2_raw,false)                                     as s2,
           coalesce(b.s2_raw,false) and coalesce(b.s3_raw,false)         as s3,
           coalesce(b.s2_raw,false) and coalesce(b.s3_raw,false)
             and coalesce(b.s4_raw,false)                               as s4,
           coalesce(b.s2_raw,false) and coalesce(b.s3_raw,false)
             and coalesce(b.s4_raw,false) and coalesce(b.s5_raw,false)   as s5,
           coalesce(b.s2_raw,false) and coalesce(b.s3_raw,false)
             and coalesce(b.s4_raw,false) and coalesce(b.s5_raw,false)
             and coalesce(b.s6_raw,false)                               as s6
    from b
  ),
  a as (
    select s.viloyat, s.muassasa,
           count(*)::int                            as b1,
           count(*) filter (where s.s2)::int        as b2,
           count(*) filter (where s.s3)::int        as b3,
           count(*) filter (where s.s4)::int        as b4,
           count(*) filter (where s.s5)::int        as b5,
           count(*) filter (where s.s6)::int        as b6,
           count(*) filter (where s.n_raw)::int     as nat
    from s group by s.viloyat, s.muassasa
  )
  select a.viloyat, a.muassasa, a.b1, a.b2, a.b3, a.b4, a.b5, a.b6,
         round(100.0*a.b2/nullif(a.b1,0),1),
         round(100.0*a.b3/nullif(a.b2,0),1),
         round(100.0*a.b4/nullif(a.b3,0),1),
         round(100.0*a.b5/nullif(a.b4,0),1),
         round(100.0*a.b6/nullif(a.b5,0),1),
         round(100.0*a.b5/nullif(a.b1,0),1),
         a.nat,
         round(100.0*a.nat/nullif(a.b1,0),1),
         (select x.nom from (values
            ('1→2', coalesce(round(100.0*a.b2/nullif(a.b1,0),1), 999)),
            ('2→3', coalesce(round(100.0*a.b3/nullif(a.b2,0),1), 999)),
            ('3→4', coalesce(round(100.0*a.b4/nullif(a.b3,0),1), 999)),
            ('4→5', coalesce(round(100.0*a.b5/nullif(a.b4,0),1), 999)),
            ('5→6', coalesce(round(100.0*a.b6/nullif(a.b5,0),1), 999))
          ) as x(nom, val) order by x.val limit 1),
         case when a.b6 <= a.b5 and a.b5 <= a.b4 and a.b4 <= a.b3
               and a.b3 <= a.b2 and a.b2 <= a.b1 then 'OK' else '⚠' end
  from a
  order by a.viloyat, a.muassasa;
end $$;

grant execute on function public.get_hisobot_kaskad(date, date, text, text) to authenticated;


-- ============ 6. TEKSHIRUV ============
-- DIQQAT: funksiyalarni bu yerdan chaqirmang — SQL Editor'da auth.uid() NULL
-- bo'ladi va "Ruxsat yo'q" xatosi butun tranzaksiyani bekor qiladi.
select p.proname as funksiya, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as argumentlar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'get_hisobot%' or p.proname like 'hisobot_%')
order by p.proname;
