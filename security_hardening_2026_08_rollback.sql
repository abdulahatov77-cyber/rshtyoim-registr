-- security_hardening_2026_08.sql branch/stagingda muammo chiqarganda ishlatiladi.
-- 2026-08-15 audit paytidagi asosiy policy va multimedia holatini qaytaradi.

begin;

drop policy if exists infarkt_select_hardened on public.infarkt_qabul;
drop policy if exists infarkt_insert_hardened on public.infarkt_qabul;
drop policy if exists infarkt_update_hardened on public.infarkt_qabul;
drop policy if exists infarkt_delete_hardened on public.infarkt_qabul;
create policy infarkt_select_v2 on public.infarkt_qabul for select to authenticated
using (public.get_user_role() in ('super_admin', 'admin') or viloyat = public.get_user_viloyat() or created_by = auth.uid());
create policy infarkt_yonaltirilgan_select on public.infarkt_qabul for select to authenticated
using (
  status = 'otkazildi'
  and otkazilgan_muassasa is not null
  and btrim(otkazilgan_muassasa) <> ''
  and lower(btrim(otkazilgan_muassasa)) = any (public.auth_qabul_manzillari())
);
create policy infarkt_insert on public.infarkt_qabul for insert to authenticated with check (true);
create policy infarkt_qabul_insert on public.infarkt_qabul for insert to authenticated with check (true);
create policy infarkt_qabul_update on public.infarkt_qabul for update to authenticated
using (public.get_user_role() = 'admin' or created_by = auth.uid() or (public.get_user_role() = 'viloyat_admin' and viloyat = public.get_user_viloyat()));
create policy infarkt_update on public.infarkt_qabul for update to authenticated
using (viloyat = public.get_user_viloyat() or public.get_user_role() = 'super_admin');
create policy infarkt_delete on public.infarkt_qabul for delete to authenticated
using (public.get_user_role() = 'super_admin');

drop policy if exists insult_select_hardened on public.insult_qabul;
drop policy if exists insult_insert_hardened on public.insult_qabul;
drop policy if exists insult_update_hardened on public.insult_qabul;
drop policy if exists insult_delete_hardened on public.insult_qabul;
create policy insult_select_v2 on public.insult_qabul for select to authenticated
using (public.get_user_role() in ('super_admin', 'admin') or viloyat = public.get_user_viloyat() or created_by = auth.uid());
create policy insult_yonaltirilgan_select on public.insult_qabul for select to authenticated
using (
  status = 'otkazildi'
  and otkazilgan_muassasa is not null
  and btrim(otkazilgan_muassasa) <> ''
  and lower(btrim(otkazilgan_muassasa)) = any (public.auth_qabul_manzillari())
);
create policy insult_insert on public.insult_qabul for insert to authenticated with check (true);
create policy insult_qabul_insert on public.insult_qabul for insert to authenticated with check (true);
create policy insult_qabul_update on public.insult_qabul for update to authenticated
using (public.get_user_role() = 'admin' or created_by = auth.uid() or (public.get_user_role() = 'viloyat_admin' and viloyat = public.get_user_viloyat()));
create policy insult_update on public.insult_qabul for update to authenticated
using (viloyat = public.get_user_viloyat() or public.get_user_role() = 'super_admin');
create policy insult_delete on public.insult_qabul for delete to authenticated
using (public.get_user_role() = 'super_admin');

drop policy if exists profiles_select_hardened on public.profiles;
drop policy if exists profiles_insert_hardened on public.profiles;
drop policy if exists profiles_update_hardened on public.profiles;
create policy profiles_select_v2 on public.profiles for select to authenticated using (true);
create policy profile_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_insert on public.profiles for insert to public with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and coalesce(role, 'operator') = public.get_user_role()
  and coalesce(viloyat, '') = coalesce(public.get_user_viloyat(), '')
  and (
    coalesce(public.get_user_muassasa(), '') = ''
    or coalesce(muassasa, '') = coalesce(public.get_user_muassasa(), '')
  )
);
create policy profiles_update_superadmin on public.profiles for update to authenticated
using (public.get_user_role() = 'super_admin') with check (public.get_user_role() = 'super_admin');

drop policy if exists files_select_hardened on public.bemor_fayllari;
drop policy if exists files_insert_hardened on public.bemor_fayllari;
drop policy if exists files_delete_hardened on public.bemor_fayllari;
create policy files_select on public.bemor_fayllari for select to authenticated using (true);
create policy files_insert on public.bemor_fayllari for insert to authenticated with check (true);
create policy files_delete on public.bemor_fayllari for delete to authenticated using (true);

drop policy if exists transfer_select_hardened on public.transfer_log;
drop policy if exists transfer_insert_hardened on public.transfer_log;
drop policy if exists transfer_update_hardened on public.transfer_log;
drop policy if exists transfer_delete_hardened on public.transfer_log;
create policy "Authenticated read transfer_log" on public.transfer_log for select to public
using (auth.role() = 'authenticated');
create policy "Authenticated insert transfer_log" on public.transfer_log for insert to public
with check (auth.role() = 'authenticated');
create policy "Authenticated update transfer_log" on public.transfer_log for update to public
using (auth.role() = 'authenticated');

drop policy if exists "Authorized read multimedia" on storage.objects;
drop policy if exists "Authorized upload multimedia" on storage.objects;
drop policy if exists "Authorized delete multimedia" on storage.objects;
update storage.buckets set public = true where id = 'multimedia';
create policy "Public read multimedia" on storage.objects for select to public using (bucket_id = 'multimedia');
create policy "Authenticated upload multimedia" on storage.objects for insert to authenticated with check (bucket_id = 'multimedia');
create policy "Authenticated delete multimedia" on storage.objects for delete to authenticated using (bucket_id = 'multimedia');

alter view if exists public.v_marshrut set (security_invoker = false);

commit;
