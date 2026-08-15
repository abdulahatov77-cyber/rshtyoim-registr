-- Hotfix: qabul SELECT siyosatida auth helperlarini har bir bemor qatori uchun
-- qayta chaqirmasdan, PostgreSQL InitPlan orqali so'rov boshida bir marta hisoblash.
-- Bu RLS doirasini o'zgartirmaydi; faqat mavjud qabul_can_read mantiqini inline qiladi.

begin;

drop policy if exists infarkt_select_hardened on public.infarkt_qabul;
create policy infarkt_select_hardened on public.infarkt_qabul
for select to authenticated
using (
  (select auth.uid()) is not null
  and (
    (select public.auth_role()) in ('super_admin', 'rahbar')
    or (
      (select public.auth_role()) = 'admin'
      and lower(btrim(coalesce(viloyat, ''))) =
          lower(btrim(coalesce((select public.auth_viloyat()), '')))
    )
    or (
      (select public.auth_role()) = 'user'
      and lower(btrim(coalesce(viloyat, ''))) =
          lower(btrim(coalesce((select public.auth_viloyat()), '')))
      and (
        user_id = (select auth.uid())
        or lower(btrim(coalesce(muassasa, ''))) =
           lower(btrim(coalesce((select public.get_user_muassasa()), '')))
        or lower(btrim(coalesce(otkazilgan_muassasa, ''))) =
           lower(btrim(coalesce((select public.get_user_muassasa()), '')))
      )
    )
  )
);

drop policy if exists insult_select_hardened on public.insult_qabul;
create policy insult_select_hardened on public.insult_qabul
for select to authenticated
using (
  (select auth.uid()) is not null
  and (
    (select public.auth_role()) in ('super_admin', 'rahbar')
    or (
      (select public.auth_role()) = 'admin'
      and lower(btrim(coalesce(viloyat, ''))) =
          lower(btrim(coalesce((select public.auth_viloyat()), '')))
    )
    or (
      (select public.auth_role()) = 'user'
      and lower(btrim(coalesce(viloyat, ''))) =
          lower(btrim(coalesce((select public.auth_viloyat()), '')))
      and (
        user_id = (select auth.uid())
        or lower(btrim(coalesce(muassasa, ''))) =
           lower(btrim(coalesce((select public.get_user_muassasa()), '')))
        or lower(btrim(coalesce(otkazilgan_muassasa, ''))) =
           lower(btrim(coalesce((select public.get_user_muassasa()), '')))
      )
    )
  )
);

commit;
