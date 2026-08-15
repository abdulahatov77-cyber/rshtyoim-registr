-- Self-registration privilege escalation'ni yopish va yangi akkauntlarni
-- super-admin tasdig'igacha bemor ma'lumotlaridan ajratish.

begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pending', 'user', 'admin', 'rahbar', 'super_admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, viloyat, muassasa)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'pending',
    new.raw_user_meta_data->>'viloyat',
    nullif(btrim(coalesce(new.raw_user_meta_data->>'muassasa', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Faqat aniq tasdiqlangan user roli muassasa doirasida o'qiydi.
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
    when public.auth_role() = 'user' then
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
      and (
        p_user_id = auth.uid()
        or lower(btrim(coalesce(p_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
        or lower(btrim(coalesce(p_otkazilgan_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
      )
    else false
  end;
$$;

-- SECURITY DEFINER hisobot RPC'lari pending/nomalum profil rollarini rad etadi.
do $$
declare
  fn record;
  old_ddl text;
  new_ddl text;
  match_count integer;
  null_check_pattern constant text :=
    'if\s+v_role\s+is\s+null\s+then.*?end\s+if;';
begin
  for fn in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any (array[
        'get_hisobot_infarkt', 'get_hisobot_insult',
        'get_hisobot_marshrut_muassasa', 'get_hisobot_marshrut_matritsa',
        'get_hisobot_oyna', 'get_hisobot_kaskad',
        'get_marshrut_xulosa', 'get_marshrut_matritsa',
        'get_marshrut_audit', 'get_pq20_hisobot'
      ])
  loop
    old_ddl := pg_get_functiondef(fn.oid);
    select count(*) into match_count
    from regexp_matches(old_ddl, null_check_pattern, 'gis');

    if match_count <> 1 then
      raise exception
        'Kutilmagan RPC source drift: %, auth sharti % marta topildi',
        fn.signature, match_count;
    end if;

    new_ddl := regexp_replace(
      old_ddl,
      null_check_pattern,
      E'\\&\n  if v_role not in (''user'', ''admin'', ''rahbar'', ''super_admin'') then\n    raise exception ''Ruxsat yo''''q: akkaunt tasdiqlanmagan'';\n  end if;',
      'gis'
    );
    execute new_ddl;
  end loop;
end;
$$;

commit;
