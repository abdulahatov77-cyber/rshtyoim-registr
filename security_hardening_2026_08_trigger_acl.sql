-- Trigger funksiyalar REST RPC sifatida authenticated roliga ochiq bo'lmasin.
-- Ular trigger orqali jadval egasi huquqida ishlashda davom etadi.

begin;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_dinamika_muolaja() from public, anon, authenticated;
revoke execute on function public.notify_dinamika_telegram() from public, anon, authenticated;
revoke execute on function public.notify_telegram_dinamika() from public, anon, authenticated;
revoke execute on function public.notify_telegram_new_patient() from public, anon, authenticated;
revoke execute on function public.trg_otkazish_imkoniyat_check() from public, anon, authenticated;

-- Mutable search_path ogohlantirishini trigger tanalarini buzmasdan yopamiz.
alter function public.notify_dinamika_muolaja() set search_path = public, pg_temp;
alter function public.notify_dinamika_telegram() set search_path = public, pg_temp;
alter function public.notify_telegram_dinamika() set search_path = public, pg_temp;
alter function public.notify_telegram_new_patient() set search_path = public, pg_temp;

commit;
