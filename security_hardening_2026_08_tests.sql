-- security_hardening_2026_08.sql dan keyingi read-only katalog tekshiruvlari.

-- Asosiy jadvallarda faqat hardened policy'lar qolishi kerak.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('infarkt_qabul', 'insult_qabul', 'profiles', 'bemor_fayllari', 'transfer_log')
order by tablename, cmd, policyname;

-- Natija bo'sh bo'lishi kerak: SECURITY DEFINER anon/PUBLIC uchun ochiq emas.
select n.nspname as schema_name, p.oid::regprocedure as function_name, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and exists (
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where a.privilege_type = 'EXECUTE'
      and a.grantee in (
        0,
        (select oid from pg_roles where rolname = 'anon')
      )
  )
order by function_name;

-- Natija security_invoker bo'lishi kerak: eski 4-text dashboard overload.
select p.oid::regprocedure as function_name,
       case when p.prosecdef then 'security_definer' else 'security_invoker' end as security_mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.oid = to_regprocedure('public.get_dashboard_stats(text,text,text,text)');

-- Natija bo'sh bo'lishi kerak: trigger-only funksiyalar REST RPC emas.
select p.oid::regprocedure as function_name, r.rolname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user', 'notify_dinamika_muolaja', 'notify_dinamika_telegram',
    'notify_telegram_dinamika', 'notify_telegram_new_patient',
    'trg_otkazish_imkoniyat_check'
  )
  and a.privilege_type = 'EXECUTE'
  and (a.grantee = 0 or r.rolname in ('anon', 'authenticated'));

-- Natija bo'sh bo'lishi kerak: viloyat admini milliy hisobot bypass ro'yxatida emas.
select p.oid::regprocedure as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_hisobot_infarkt', 'get_hisobot_insult',
    'get_hisobot_marshrut_muassasa', 'get_hisobot_marshrut_matritsa',
    'get_hisobot_oyna', 'get_hisobot_kaskad',
    'get_marshrut_xulosa', 'get_marshrut_matritsa',
    'get_marshrut_audit', 'get_pq20_hisobot'
  )
  and p.prosrc ~* 'not\s+in\s*\(\s*''super_admin''\s*,\s*''admin''\s*,\s*''rahbar''\s*\)';

-- Barchasi false bo'lishi kerak: xavfli jadval-level huquqlar olib tashlangan.
select
  has_table_privilege('anon', 'public.infarkt_qabul', 'SELECT') as anon_patient_select,
  has_table_privilege('anon', 'public.profiles', 'SELECT') as anon_profiles_select,
  has_table_privilege('authenticated', 'public.infarkt_qabul', 'TRUNCATE') as auth_patient_truncate,
  has_table_privilege('authenticated', 'public.infarkt_qabul', 'TRIGGER') as auth_patient_trigger,
  has_table_privilege('authenticated', 'public.muassasalar', 'INSERT') as auth_muassasa_insert;

-- Signup trigger metadata role'ini qabul qilmasligi va pending yaratishi kerak.
select jsonb_build_object(
  'trigger_bound', exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and t.tgenabled <> 'D'
  ),
  'forces_pending', p.prosrc like '%''pending''%',
  'copies_metadata_role', p.prosrc like '%raw_user_meta_data->>''role''%'
) as signup_hardening
from pg_proc p
where p.oid = 'public.handle_new_user()'::regprocedure;

-- Natija 10/10/0 bo'lishi kerak: barcha hisobot RPC pending rolini rad etadi.
select count(*) as report_rpc_count,
       count(*) filter (where p.prosrc like '%akkaunt tasdiqlanmagan%') as approval_check_count,
       count(*) filter (where p.prosrc ~* '''pending''') as pending_allowed_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_hisobot_infarkt', 'get_hisobot_insult',
    'get_hisobot_marshrut_muassasa', 'get_hisobot_marshrut_matritsa',
    'get_hisobot_oyna', 'get_hisobot_kaskad',
    'get_marshrut_xulosa', 'get_marshrut_matritsa',
    'get_marshrut_audit', 'get_pq20_hisobot'
  );

-- 0/0/3/true/0 bo'lishi kerak: notify source'da secret yo'q, Vault lookup bor.
with notify_functions as (
  select p.oid, p.proname, p.prosrc
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'notify_telegram_new_patient', 'notify_telegram_dinamika',
      'notify_dinamika_telegram', 'notify_dinamika_muolaja'
    )
)
select
  count(*) filter (where prosrc ~ '[0-9]{8,}:[A-Za-z0-9_-]{20,}') as bot_token_sources,
  count(*) filter (
    where prosrc ~* 'SERVER_KEY\s+constant\s+text\s*:=\s*''[^'']+'''
  ) as hardcoded_server_keys,
  count(*) filter (where prosrc like '%vault.decrypted_secrets%') as vault_lookups,
  to_regprocedure('public.notify_dinamika_muolaja()') is null as legacy_removed,
  count(*) filter (
    where has_function_privilege('anon', oid, 'EXECUTE')
       or has_function_privilege('authenticated', oid, 'EXECUTE')
  ) as browser_executable
from notify_functions;

-- multimedia public=false bo'lishi va public SELECT policy qolmasligi kerak.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'multimedia';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- v_marshrut reloptions ichida security_invoker=true bo'lishi kerak.
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'v_marshrut';

-- Keyingi bosqich: Supabase Security va Performance Advisors qayta ishlatiladi.
