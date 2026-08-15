-- Public funksiyalarning caller/session search_path'iga bog'lanishini yopish.
-- Funksiya tanasi o'zgarmaydi; public/extension obyektlari aniq yo'lda qidiriladi.

begin;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proowner = current_user::regrole
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format(
      'alter function %s set search_path = public, extensions, pg_temp',
      fn.signature
    );
  end loop;
end;
$$;

commit;
