-- 30 kundan ortiq "faol" (active) turgan bemorlar — dashboard eslatmasi va Bemorlar filtri uchun.
-- SECURITY INVOKER: RLS amal qiladi (user — o'z muassasasi, admin — viloyati). 2026-10-14 da qo'llangan.
CREATE OR REPLACE FUNCTION public.uzoq_faol_bemorlar_idlari(p_muassasa text DEFAULT NULL, p_kun int DEFAULT 30)
RETURNS TABLE(tur text, id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'infarkt'::text, q.id FROM infarkt_qabul q
   WHERE q.status = 'active' AND q.qabul_vaqt < now() - make_interval(days => p_kun)
     AND (p_muassasa IS NULL OR q.muassasa = p_muassasa)
  UNION ALL
  SELECT 'insult'::text, q.id FROM insult_qabul q
   WHERE q.status = 'active' AND q.qabul_vaqt < now() - make_interval(days => p_kun)
     AND (p_muassasa IS NULL OR q.muassasa = p_muassasa);
$$;
REVOKE ALL ON FUNCTION public.uzoq_faol_bemorlar_idlari(text, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.uzoq_faol_bemorlar_idlari(text, int) TO authenticated;
