-- Sensitive jadvallarda faqat frontendga zarur DML huquqlari qolsin.
-- TRUNCATE/TRIGGER/REFERENCES va anon DML RLS'ga tayanmasdan yopiladi.

begin;

revoke all on table
  public.infarkt_qabul,
  public.insult_qabul,
  public.profiles,
  public.bemor_fayllari,
  public.transfer_log
from anon;

revoke truncate, references, trigger on table
  public.infarkt_qabul,
  public.insult_qabul,
  public.profiles,
  public.bemor_fayllari,
  public.transfer_log
from authenticated;

revoke all on table public.infarkt_qabul, public.insult_qabul from authenticated;
grant select, insert, update, delete on table
  public.infarkt_qabul, public.insult_qabul
to authenticated;

revoke all on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

revoke all on table public.bemor_fayllari from authenticated;
grant select, insert, delete on table public.bemor_fayllari to authenticated;

revoke all on table public.transfer_log from authenticated;
grant select, insert, update, delete on table public.transfer_log to authenticated;

-- Muassasalar jadvalini faqat super-admin tekshiruvli RPC'lar o'zgartiradi.
revoke all on table public.muassasalar from anon, authenticated;
grant select on table public.muassasalar to authenticated;
drop policy if exists muassasalar_insert on public.muassasalar;
drop policy if exists muassasalar_select on public.muassasalar;
create policy muassasalar_select_hardened on public.muassasalar
for select to authenticated using (true);

-- Override ro'yxati login oldidan dropdown konfiguratsiyasi uchun o'qiladi,
-- lekin o'zgartirish faqat super_admin uchun.
revoke all on table public.muassasa_overrides from anon, authenticated;
grant select on table public.muassasa_overrides to anon, authenticated;
grant insert, update, delete on table public.muassasa_overrides to authenticated;

drop policy if exists "All can read" on public.muassasa_overrides;
drop policy if exists "Super admin can manage" on public.muassasa_overrides;
create policy muassasa_overrides_select_hardened on public.muassasa_overrides
for select to anon, authenticated using (true);
create policy muassasa_overrides_insert_hardened on public.muassasa_overrides
for insert to authenticated with check (public.auth_role() = 'super_admin');
create policy muassasa_overrides_update_hardened on public.muassasa_overrides
for update to authenticated
using (public.auth_role() = 'super_admin')
with check (public.auth_role() = 'super_admin');
create policy muassasa_overrides_delete_hardened on public.muassasa_overrides
for delete to authenticated using (public.auth_role() = 'super_admin');

commit;
