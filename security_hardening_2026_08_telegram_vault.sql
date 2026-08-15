-- Telegram/server secretlarini funksiya source kodidan chiqarish.
-- PRECONDITION: vault.secrets ichida `telegram_server_key` mavjud bo'lishi kerak.

begin;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'telegram_server_key'
  ) then
    raise exception 'Vault secret topilmadi: telegram_server_key';
  end if;
end;
$$;

-- Ikki faol server-notify triggerida hardcoded SERVER_KEY o'rniga Vault lookup.
do $$
declare
  fn record;
  old_ddl text;
  new_ddl text;
  match_count integer;
  key_pattern constant text :=
    'SERVER_KEY\s+constant\s+text\s*:=\s*''[^'']+'';';
begin
  for fn in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('notify_telegram_new_patient', 'notify_telegram_dinamika')
  loop
    old_ddl := pg_get_functiondef(fn.oid);
    select count(*) into match_count
    from regexp_matches(old_ddl, key_pattern, 'gi');
    if match_count <> 1 then
      raise exception 'Kutilmagan notify source drift: %, key % marta topildi',
        fn.signature, match_count;
    end if;

    new_ddl := regexp_replace(
      old_ddl,
      key_pattern,
      'SERVER_KEY text := (select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = ''telegram_server_key'');',
      'gi'
    );
    execute new_ddl;
  end loop;
end;
$$;

-- Legacy qabul UPDATE triggeri ham Vercel server endpointidan foydalanadi;
-- bot token/chat ID endi database source'ida saqlanmaydi.
create or replace function public.notify_dinamika_telegram()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  server_key text := (
    select ds.decrypted_secret
    from vault.decrypted_secrets ds
    where ds.name = 'telegram_server_key'
  );
  api_url constant text := 'https://rshtyoim-registr.vercel.app/api/telegram';
  patient_type text;
  type_label text;
  msg text;
  event_time text;
begin
  if old.dinamika_muolaja_turi is not distinct from new.dinamika_muolaja_turi then
    return new;
  end if;

  if server_key is null or btrim(server_key) = '' then
    raise exception 'Vault secret bo''sh: telegram_server_key';
  end if;

  event_time := to_char(now() at time zone 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI');
  if tg_table_name = 'infarkt_qabul' then
    patient_type := 'infarkt';
    type_label := '🫀 Infarkt';
  else
    patient_type := 'insult';
    type_label := '🧠 Insult';
  end if;

  msg := '🔄 <b>DINAMIKA YANGILANDI</b>' || chr(10)
      || '━━━━━━━━━━━━━━━━━━━━━━' || chr(10)
      || type_label || ' | <code>' || public.tg_esc(coalesce(new.kt_no, '—')) || '</code>' || chr(10)
      || '👤 ' || public.tg_esc(coalesce(new.fio, '—')) || chr(10)
      || '🏥 ' || public.tg_esc(coalesce(new.muassasa_nomi, new.muassasa, '—')) || chr(10)
      || '━━━━━━━━━━━━━━━━━━━━━━' || chr(10)
      || '💊 <b>Eski:</b> ' || public.tg_esc(coalesce(old.dinamika_muolaja_turi, '—')) || chr(10)
      || '💊 <b>Yangi:</b> ' || public.tg_esc(coalesce(new.dinamika_muolaja_turi, '—')) || chr(10)
      || '━━━━━━━━━━━━━━━━━━━━━━' || chr(10)
      || '📅 ' || event_time;

  perform net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-server-key', server_key
    ),
    body := jsonb_build_object('type', patient_type, 'text', msg)
  );
  return new;
exception when others then
  raise warning 'notify_dinamika_telegram: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_dinamika_telegram()
from public, anon, authenticated;

-- Hech bir triggerga ulanmagan eski bevosita bot funksiyasini xavfsiz olib tashlash.
do $$
declare
  fn_oid oid := to_regprocedure('public.notify_dinamika_muolaja()');
begin
  if fn_oid is not null and exists (
    select 1 from pg_trigger t where t.tgfoid = fn_oid and not t.tgisinternal
  ) then
    raise exception 'notify_dinamika_muolaja hali triggerga ulangan';
  end if;
  if fn_oid is not null then
    execute 'drop function public.notify_dinamika_muolaja()';
  end if;
end;
$$;

commit;
