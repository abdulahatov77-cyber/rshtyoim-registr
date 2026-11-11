-- Insult: tasvir (MSKT/MRT) va insult turining tasdiqlanganligi (2026-11-11, bazaga qo'llangan).
-- Formada "MSKT yoki MRT o'tkazilganmi?" savoli insult turidan OLDIN so'raladi. Mavjud `mskt` ustuni
-- o'zgarmaydi ("Ha – o'tkazildi" / "Yo'q – boshqa sabab" — endi "neyrovizualizatsiya o'tkazilganmi" ma'nosida),
-- shuning uchun unga bog'liq hisobotlar, Telegram va klinik maslahatchi avvalgidek ishlaydi.
--   tasvir_turi        — 'MSKT' | 'MRT' (tasvir o'tkazilgan bo'lsa)
--   tasvir_yoq_sababi  — tasvir o'tkazilmagan sababi
--   tur_tasdiqlangan   — hisoblanadigan ustun: tasvir o'tkazilgan bo'lsa true, aks holda insult turi klinik taxmin
-- Eski yozuvlar: MSKT qilinganlarga tasvir_turi = 'MSKT'. insult_turi qiymatlari o'zgartirilmagan.
-- Yangi tur qiymati "Aniqlanmagan (tasvirsiz)" faqat tasvir o'tkazilmaganda tanlanadi.
-- Sinov: yangi qiymatlar bilan Bosh sahifa solishtirish tekshiruvlari 5 kesimda — xato 0 (rollback).
ALTER TABLE public.insult_qabul ADD COLUMN IF NOT EXISTS tasvir_turi text;
ALTER TABLE public.insult_qabul ADD COLUMN IF NOT EXISTS tasvir_yoq_sababi text;
ALTER TABLE public.insult_qabul ADD COLUMN IF NOT EXISTS tur_tasdiqlangan boolean GENERATED ALWAYS AS (coalesce(lower(btrim(mskt)) LIKE 'ha%', false)) STORED;
ALTER TABLE public.insult_qabul DROP CONSTRAINT IF EXISTS insult_qabul_tasvir_turi_check;
ALTER TABLE public.insult_qabul ADD CONSTRAINT insult_qabul_tasvir_turi_check CHECK (tasvir_turi IS NULL OR tasvir_turi IN ('MSKT','MRT'));
UPDATE public.insult_qabul SET tasvir_turi = 'MSKT' WHERE lower(btrim(mskt)) LIKE 'ha%' AND tasvir_turi IS NULL;

-- Hisobot: insult turi bo'yicha tasdiqlangan / taxminiy soni va tasvir o'tkazilmagan sabablar.
-- Ruxsat boshqa hisobotlar bilan bir xil: super_admin/rahbar — hammasi, admin — viloyati, user — muassasasi.
CREATE OR REPLACE FUNCTION public.get_hisobot_tur_tasdiq(p_from date, p_to date, p_viloyat text DEFAULT NULL, p_muassasa text DEFAULT NULL)
RETURNS TABLE(insult_turi text, tasdiqlangan int, taxminiy int, mskt int, mrt int, sabab jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_role text; v_vil text; v_mua text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('user', 'admin', 'rahbar', 'super_admin') then
    raise exception 'Ruxsat yo''q: akkaunt tasdiqlanmagan';
  end if;
  if v_role not in ('super_admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;
  if v_role = 'user' then
    select coalesce(nullif(btrim(p.muassasa), ''), '__yoq__') into v_mua from public.profiles p where p.id = auth.uid();
    p_muassasa := v_mua;
  end if;
  return query
  with f as (
    select coalesce(nullif(btrim(q.insult_turi), ''), 'Qayd etilmagan') t, q.tur_tasdiqlangan ok, q.tasvir_turi tt,
           coalesce(nullif(btrim(q.tasvir_yoq_sababi), ''), 'Sabab yozilmagan') s
    from public.insult_qabul q
    where (q.qabul_vaqt at time zone 'Asia/Tashkent')::date between p_from and p_to
      and (p_viloyat is null or q.viloyat = p_viloyat)
      and (p_muassasa is null or lower(btrim(coalesce(q.muassasa,''))) = lower(btrim(p_muassasa)))),
  s as (select t, jsonb_object_agg(s, n) j from (select t, s, count(*) n from f where not ok group by t, s) z group by t)
  select f.t, (count(*) filter (where f.ok))::int, (count(*) filter (where not f.ok))::int,
         (count(*) filter (where f.ok and f.tt is distinct from 'MRT'))::int, (count(*) filter (where f.ok and f.tt = 'MRT'))::int,
         coalesce((select s.j from s where s.t = f.t), '{}'::jsonb)
  from f group by f.t order by count(*) desc;
end $function$;
REVOKE ALL ON FUNCTION public.get_hisobot_tur_tasdiq(date, date, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hisobot_tur_tasdiq(date, date, text, text) TO authenticated;
