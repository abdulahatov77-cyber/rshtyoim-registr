-- Ichki auth tekshiruvisiz bo'lgan read-only lookup RPC'lar caller RLS'i bilan ishlasin.

begin;

alter function public.get_muassasalar_filtered(text, text) security invoker;
alter function public.get_muassasa_ishlatilgan(text) security invoker;

commit;
