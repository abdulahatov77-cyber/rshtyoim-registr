-- auth.uid() ni init-plan orqali bir marta hisoblash: RLS mantiqi o'zgarmaydi.

begin;

drop policy if exists profiles_select_hardened on public.profiles;
drop policy if exists profiles_insert_hardened on public.profiles;
drop policy if exists profiles_update_hardened on public.profiles;

create policy profiles_select_hardened on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.auth_role() = 'super_admin');

create policy profiles_insert_hardened on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_hardened on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.auth_role() = 'super_admin')
with check (
  public.auth_role() = 'super_admin'
  or (
    id = (select auth.uid())
    and role = public.auth_role()
    and lower(btrim(coalesce(viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    and lower(btrim(coalesce(muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
  )
);

commit;
