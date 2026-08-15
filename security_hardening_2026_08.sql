-- RSHTYOIM registri: kritik RLS, RPC va bemor fayllari xavfsizligi.
-- Avval Supabase development branch/stagingda ishga tushiring.
-- Frontenddagi js/pages/bemor-karta.js yangilanishi bilan bir deployda chiqaring.

begin;

-- Profil yordamchi funksiyalari. SECURITY DEFINER profiles RLS rekursiyasini
-- chetlab o'tadi, lekin faqat joriy auth.uid() ruxsat maydonlarini qaytaradi.
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(p.role, 'user')
  from public.profiles p where p.id = auth.uid() limit 1;
$$;

create or replace function public.auth_viloyat()
returns text language sql stable security definer set search_path = ''
as $$
  select p.viloyat
  from public.profiles p where p.id = auth.uid() limit 1;
$$;

create or replace function public.get_user_role()
returns text language sql stable security definer set search_path = ''
as $$ select public.auth_role(); $$;

create or replace function public.get_user_viloyat()
returns text language sql stable security definer set search_path = ''
as $$ select public.auth_viloyat(); $$;

create or replace function public.get_user_muassasa()
returns text language sql stable security definer set search_path = ''
as $$
  select p.muassasa
  from public.profiles p where p.id = auth.uid() limit 1;
$$;

revoke all on function public.auth_role() from public, anon;
revoke all on function public.auth_viloyat() from public, anon;
revoke all on function public.get_user_role() from public, anon;
revoke all on function public.get_user_viloyat() from public, anon;
revoke all on function public.get_user_muassasa() from public, anon;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_viloyat() to authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.get_user_viloyat() to authenticated;
grant execute on function public.get_user_muassasa() to authenticated;

-- Bemor yozuvlari uchun yagona ruxsat predikatlari.
create or replace function public.qabul_can_read(
  p_viloyat text,
  p_muassasa text,
  p_user_id uuid,
  p_otkazilgan_muassasa text default null
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    when public.auth_role() in ('super_admin', 'rahbar') then true
    when public.auth_role() = 'admin' then
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    else
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
      and (
        p_user_id = auth.uid()
        or lower(btrim(coalesce(p_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
        or lower(btrim(coalesce(p_otkazilgan_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
      )
  end;
$$;

create or replace function public.qabul_can_insert(
  p_viloyat text,
  p_muassasa text,
  p_user_id uuid
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    when p_user_id is distinct from auth.uid() then false
    when public.auth_role() = 'super_admin' then true
    when public.auth_role() = 'admin' then
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    when public.auth_role() = 'user' then
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
      and lower(btrim(coalesce(p_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
    else false
  end;
$$;

create or replace function public.qabul_can_update(p_viloyat text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    when public.auth_role() = 'super_admin' then true
    when public.auth_role() = 'admin' then
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    else false
  end;
$$;

create or replace function public.can_access_ktno(
  p_kt_no text,
  p_registr_turi text default null
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    (
      (p_registr_turi is null or lower(p_registr_turi) = 'infarkt')
      and exists (
        select 1 from public.infarkt_qabul q
        where q.kt_no = p_kt_no
          and public.qabul_can_read(q.viloyat, q.muassasa, q.user_id, q.otkazilgan_muassasa)
      )
    )
    or
    (
      (p_registr_turi is null or lower(p_registr_turi) = 'insult')
      and exists (
        select 1 from public.insult_qabul q
        where q.kt_no = p_kt_no
          and public.qabul_can_read(q.viloyat, q.muassasa, q.user_id, q.otkazilgan_muassasa)
      )
    )
  );
$$;

revoke all on function public.qabul_can_read(text, text, uuid, text) from public, anon;
revoke all on function public.qabul_can_insert(text, text, uuid) from public, anon;
revoke all on function public.qabul_can_update(text) from public, anon;
revoke all on function public.can_access_ktno(text, text) from public, anon;
grant execute on function public.qabul_can_read(text, text, uuid, text) to authenticated;
grant execute on function public.qabul_can_insert(text, text, uuid) to authenticated;
grant execute on function public.qabul_can_update(text) to authenticated;
grant execute on function public.can_access_ktno(text, text) to authenticated;

-- Asosiy qabul jadvallari: takroriy permissive policy'lar o'rniga bittadan policy.
alter table public.infarkt_qabul enable row level security;
alter table public.insult_qabul enable row level security;

drop policy if exists infarkt_delete on public.infarkt_qabul;
drop policy if exists infarkt_insert on public.infarkt_qabul;
drop policy if exists infarkt_qabul_insert on public.infarkt_qabul;
drop policy if exists infarkt_select on public.infarkt_qabul;
drop policy if exists infarkt_select_v2 on public.infarkt_qabul;
drop policy if exists infarkt_yonaltirilgan_select on public.infarkt_qabul;
drop policy if exists infarkt_qabul_update on public.infarkt_qabul;
drop policy if exists infarkt_update on public.infarkt_qabul;

create policy infarkt_select_hardened on public.infarkt_qabul
for select to authenticated
using (public.qabul_can_read(viloyat, muassasa, user_id, otkazilgan_muassasa));
create policy infarkt_insert_hardened on public.infarkt_qabul
for insert to authenticated
with check (public.qabul_can_insert(viloyat, muassasa, user_id));
create policy infarkt_update_hardened on public.infarkt_qabul
for update to authenticated
using (public.qabul_can_update(viloyat))
with check (public.qabul_can_update(viloyat));
create policy infarkt_delete_hardened on public.infarkt_qabul
for delete to authenticated using (public.auth_role() = 'super_admin');

drop policy if exists insult_delete on public.insult_qabul;
drop policy if exists insult_insert on public.insult_qabul;
drop policy if exists insult_qabul_insert on public.insult_qabul;
drop policy if exists insult_select on public.insult_qabul;
drop policy if exists insult_select_v2 on public.insult_qabul;
drop policy if exists insult_yonaltirilgan_select on public.insult_qabul;
drop policy if exists insult_qabul_update on public.insult_qabul;
drop policy if exists insult_update on public.insult_qabul;

create policy insult_select_hardened on public.insult_qabul
for select to authenticated
using (public.qabul_can_read(viloyat, muassasa, user_id, otkazilgan_muassasa));
create policy insult_insert_hardened on public.insult_qabul
for insert to authenticated
with check (public.qabul_can_insert(viloyat, muassasa, user_id));
create policy insult_update_hardened on public.insult_qabul
for update to authenticated
using (public.qabul_can_update(viloyat))
with check (public.qabul_can_update(viloyat));
create policy insult_delete_hardened on public.insult_qabul
for delete to authenticated using (public.auth_role() = 'super_admin');

-- Profil: oddiy foydalanuvchi faqat o'zini, super_admin hammani ko'radi.
alter table public.profiles enable row level security;
drop policy if exists profile_insert on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profile_select on public.profiles;
drop policy if exists profile_select_all on public.profiles;
drop policy if exists profiles_select_v2 on public.profiles;
drop policy if exists profile_update on public.profiles;
drop policy if exists profile_update_all on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_superadmin on public.profiles;

create policy profiles_select_hardened on public.profiles
for select to authenticated using (id = auth.uid() or public.auth_role() = 'super_admin');
create policy profiles_insert_hardened on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy profiles_update_hardened on public.profiles
for update to authenticated
using (id = auth.uid() or public.auth_role() = 'super_admin')
with check (
  public.auth_role() = 'super_admin'
  or (
    id = auth.uid()
    and role = public.auth_role()
    and lower(btrim(coalesce(viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    and lower(btrim(coalesce(muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
  )
);

-- Bemor fayllari va transfer log faqat vakolatli bemor doirasida.
alter table public.bemor_fayllari enable row level security;
drop policy if exists files_select on public.bemor_fayllari;
drop policy if exists files_insert on public.bemor_fayllari;
drop policy if exists files_delete on public.bemor_fayllari;
drop policy if exists files_all on public.bemor_fayllari;
create policy files_select_hardened on public.bemor_fayllari
for select to authenticated using (public.can_access_ktno(kt_no, registr_turi));
create policy files_insert_hardened on public.bemor_fayllari
for insert to authenticated with check (public.can_access_ktno(kt_no, registr_turi));
create policy files_delete_hardened on public.bemor_fayllari
for delete to authenticated using (public.can_access_ktno(kt_no, registr_turi));

alter table public.transfer_log enable row level security;
drop policy if exists "Authenticated insert transfer_log" on public.transfer_log;
drop policy if exists "Authenticated read transfer_log" on public.transfer_log;
drop policy if exists "Authenticated update transfer_log" on public.transfer_log;
drop policy if exists transfer_all on public.transfer_log;
drop policy if exists transfer_select on public.transfer_log;
create policy transfer_select_hardened on public.transfer_log
for select to authenticated using (public.can_access_ktno(kt_no, bemor_turi));
create policy transfer_insert_hardened on public.transfer_log
for insert to authenticated with check (public.can_access_ktno(kt_no, bemor_turi));
create policy transfer_update_hardened on public.transfer_log
for update to authenticated
using (public.can_access_ktno(kt_no, bemor_turi))
with check (public.can_access_ktno(kt_no, bemor_turi));
create policy transfer_delete_hardened on public.transfer_log
for delete to authenticated
using (public.auth_role() in ('super_admin', 'admin') and public.can_access_ktno(kt_no, bemor_turi));

-- Multimedia bucket public URL o'rniga authenticated signed URL ishlatadi.
update storage.buckets set public = false where id = 'multimedia';
drop policy if exists "Public read multimedia" on storage.objects;
drop policy if exists "Authenticated upload multimedia" on storage.objects;
drop policy if exists "Authenticated delete multimedia" on storage.objects;

create policy "Authorized read multimedia" on storage.objects
for select to authenticated
using (
  bucket_id = 'multimedia'
  and exists (
    select 1 from public.bemor_fayllari f
    where f.path = name and public.can_access_ktno(f.kt_no, f.registr_turi)
  )
);
create policy "Authorized upload multimedia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'multimedia'
  and public.can_access_ktno((storage.foldername(name))[1], null)
);
create policy "Authorized delete multimedia" on storage.objects
for delete to authenticated
using (
  bucket_id = 'multimedia'
  and exists (
    select 1 from public.bemor_fayllari f
    where f.path = name and public.can_access_ktno(f.kt_no, f.registr_turi)
  )
);

-- SECURITY DEFINER funksiyalardan PUBLIC/anon EXECUTE olinadi.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', fn.signature);
  end loop;
end;
$$;

-- Eski 4 ta text parametrli dashboard RPC ichki auth tekshiruvisiz
-- SECURITY DEFINER bo'lgan. Uni chaqiruvchining RLS huquqlariga o'tkazamiz.
alter function public.get_dashboard_stats(text, text, text, text)
  security invoker;

-- Frontend ishlatadigan RPC'lar authenticated roliga aniq qayta beriladi.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'get_dashboard_stats', 'get_trend_30', 'get_trend_12month',
        'get_risk_factors', 'get_gender_mortality', 'get_demographics',
        'get_age_sex_pyramid', 'get_viloyat_stats',
        'get_hisobot_infarkt', 'get_hisobot_insult',
        'get_hisobot_marshrut_muassasa', 'get_hisobot_marshrut_matritsa',
        'get_hisobot_oyna', 'get_hisobot_kaskad',
        'get_muassasalar_filtered', 'get_muassasa_ishlatilgan',
        'get_marshrut_xulosa', 'get_marshrut_matritsa', 'get_marshrut_audit',
        'get_pq20_hisobot', 'muassasa_qosh', 'muassasa_ochir',
        'muassasa_yashir', 'set_muassasa_imkoniyat', 'admin_delete_user',
        'auth_role', 'auth_viloyat', 'get_user_role', 'get_user_viloyat',
        'get_user_muassasa', 'qabul_can_read', 'qabul_can_insert',
        'qabul_can_update', 'can_access_ktno'
      ])
  loop
    execute format('grant execute on function %s to authenticated', fn.signature);
  end loop;
end;
$$;

alter view if exists public.v_marshrut set (security_invoker = true);
revoke all on public.v_marshrut from public, anon;
grant select on public.v_marshrut to authenticated;

commit;
