-- 20261018140000 dagi dashboard o'zgarishi bekor qilindi (2026-10-18, bazaga qo'llangan).
-- Sabab: dashboard (get_dashboard_snapshot) jami raqamlarni davolash oqimi (get_treatment_flow),
-- murojaat manbalari va hududlar bilan solishtiradi; faqat get_dashboard_stats o'zgargani uchun
-- "Dashboard totals do not reconcile" xatosi chiqib, Bosh sahifa ochilmay qoldi.
-- get_dashboard_stats va get_viloyat_stats asl holiga qaytarildi. Bog'lanishlar (davomi_qabul_id,
-- qabul_davomi, triggerlar) va get_hisobot_yosh dagi takrorsiz hisob saqlanib qoldi.
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_dashboard_stats(text,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure);
  d := replace(d, 'COUNT(*) FILTER (WHERE NOT dup AND t = ', 'COUNT(*) FILTER (WHERE t = ');
  EXECUTE d;
  d := pg_get_functiondef('public.get_viloyat_stats(text,timestamptz,timestamptz)'::regprocedure);
  d := replace(d, ' NOT public.qabul_takror(''infarkt'', davomi_qabul_id, viloyat) AND', '');
  d := replace(d, ' NOT public.qabul_takror(''insult'', davomi_qabul_id, viloyat) AND', '');
  EXECUTE d;
END $do$;
