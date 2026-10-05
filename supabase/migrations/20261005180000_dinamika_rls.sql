-- dinamika_muolajalar RLS: yozuv faqat foydalanuvchi o'sha bemorni (qabul yozuvini)
-- ko'ra olsa ko'rinadi/o'zgaradi. Qabul jadvallarining RLS qoidalari meros bo'ladi:
-- user — o'z muassasasi (+ unga o'tkazilganlar), admin — viloyati, rahbar/super_admin — hammasi.
-- Rahbar faqat ko'radi. Avval: admin butun respublikani ko'rardi, user — butun viloyatni,
-- INSERT esa hech qanday tekshiruvsiz (WITH CHECK true) edi.
-- 2026-10-05 da bazaga qo'llangan va rollar nomidan sinab ko'rilgan:
--   super_admin/rahbar 603, Andijon admini 201 (5 muassasa), user 188 (2 muassasa);
--   user begona viloyat bemoriga va rahbar yozuv qo'shishi rad etiladi.
-- Eski siyosatlar (dm_insert, dm_select_v3, dm_delete_v3) MCP orqali DROP qilib bo'lmagani
-- uchun USING/WITH CHECK (false) bilan o'chirib qo'yilgan — xohlasangiz DROP qiling.

CREATE OR REPLACE FUNCTION public.dinamika_bemor_korinadi(p_qabul_id uuid, p_kt_no text, p_turi text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT CASE
    WHEN p_qabul_id IS NOT NULL THEN
      EXISTS (SELECT 1 FROM public.infarkt_qabul q WHERE q.id = p_qabul_id AND p_turi = 'infarkt')
      OR EXISTS (SELECT 1 FROM public.insult_qabul q WHERE q.id = p_qabul_id AND p_turi = 'insult')
    ELSE
      EXISTS (SELECT 1 FROM public.infarkt_qabul q WHERE q.kt_no = p_kt_no AND p_turi = 'infarkt')
      OR EXISTS (SELECT 1 FROM public.insult_qabul q WHERE q.kt_no = p_kt_no AND p_turi = 'insult')
  END;
$$;
GRANT EXECUTE ON FUNCTION public.dinamika_bemor_korinadi(uuid, text, text) TO authenticated;

CREATE POLICY dm_select_v4 ON public.dinamika_muolajalar FOR SELECT TO authenticated
  USING (public.dinamika_bemor_korinadi(qabul_id, kt_no, registr_turi));
CREATE POLICY dm_insert_v4 ON public.dinamika_muolajalar FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.auth_role()) <> 'rahbar' AND public.dinamika_bemor_korinadi(qabul_id, kt_no, registr_turi));
CREATE POLICY dm_update_v4 ON public.dinamika_muolajalar FOR UPDATE TO authenticated
  USING ((SELECT public.auth_role()) <> 'rahbar' AND public.dinamika_bemor_korinadi(qabul_id, kt_no, registr_turi))
  WITH CHECK ((SELECT public.auth_role()) <> 'rahbar' AND public.dinamika_bemor_korinadi(qabul_id, kt_no, registr_turi));
CREATE POLICY dm_delete_v4 ON public.dinamika_muolajalar FOR DELETE TO authenticated
  USING ((SELECT public.auth_role()) <> 'rahbar' AND public.dinamika_bemor_korinadi(qabul_id, kt_no, registr_turi));

ALTER POLICY dm_insert ON public.dinamika_muolajalar WITH CHECK (false);
ALTER POLICY dm_select_v3 ON public.dinamika_muolajalar USING (false);
ALTER POLICY dm_delete_v3 ON public.dinamika_muolajalar USING (false);
