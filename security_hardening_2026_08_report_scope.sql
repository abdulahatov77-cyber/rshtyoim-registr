-- SECURITY DEFINER hisobot RPC'larida viloyat admini milliy filtrni chetlab
-- o'ta olmasin. Faqat super_admin va rahbar respublika kesimini ko'ra oladi.
-- Source drift bo'lsa migratsiya xatolik bilan to'xtaydi va qisman qo'llanmaydi.

begin;

do $$
declare
  fn record;
  old_ddl text;
  new_ddl text;
  match_count integer;
  role_pattern constant text :=
    'not\s+in\s*\(\s*''super_admin''\s*,\s*''admin''\s*,\s*''rahbar''\s*\)';
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
    from regexp_matches(old_ddl, role_pattern, 'gi');

    if match_count <> 1 then
      raise exception
        'Kutilmagan RPC source drift: %, role sharti % marta topildi',
        fn.signature, match_count;
    end if;

    new_ddl := regexp_replace(
      old_ddl,
      role_pattern,
      'not in (''super_admin'', ''rahbar'')',
      'gi'
    );
    execute new_ddl;
  end loop;
end;
$$;

commit;
