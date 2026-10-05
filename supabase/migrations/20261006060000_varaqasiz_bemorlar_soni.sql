-- Dashboard eslatmasi uchun (2026-10-06, bazaga qo'llangan): chiqarilgan, lekin chiqarish varaqasi
-- yo'q bemorlar soni. SECURITY INVOKER — RLS qoidalari amal qiladi (user: o'z muassasasi, admin: viloyati).
CREATE OR REPLACE FUNCTION public.varaqasiz_bemorlar_soni(p_muassasa text DEFAULT NULL)
RETURNS TABLE(infarkt bigint, insult bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM infarkt_qabul q WHERE q.status='chiqarildi' AND (p_muassasa IS NULL OR q.muassasa=p_muassasa)
       AND NOT EXISTS (SELECT 1 FROM infarkt_chiqarish c WHERE c.infarkt_qabul_id=q.id)),
    (SELECT count(*) FROM insult_qabul q WHERE q.status='chiqarildi' AND (p_muassasa IS NULL OR q.muassasa=p_muassasa)
       AND NOT EXISTS (SELECT 1 FROM insult_chiqarish c WHERE c.insult_qabul_id=q.id));
$$;
GRANT EXECUTE ON FUNCTION public.varaqasiz_bemorlar_soni(text) TO authenticated;
