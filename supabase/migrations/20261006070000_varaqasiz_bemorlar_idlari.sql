-- Bemorlar sahifasidagi "chiqarish varaqasi to'ldirilmagan" filtri uchun (2026-10-06, bazaga qo'llangan):
-- chiqarilgan, lekin varaqasi yo'q bemorlarning id ro'yxati. SECURITY INVOKER — RLS amal qiladi.
CREATE OR REPLACE FUNCTION public.varaqasiz_bemorlar_idlari(p_muassasa text DEFAULT NULL)
RETURNS TABLE(tur text, id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'infarkt'::text, q.id FROM infarkt_qabul q WHERE q.status='chiqarildi' AND (p_muassasa IS NULL OR q.muassasa=p_muassasa)
    AND NOT EXISTS (SELECT 1 FROM infarkt_chiqarish c WHERE c.infarkt_qabul_id=q.id)
  UNION ALL
  SELECT 'insult'::text, q.id FROM insult_qabul q WHERE q.status='chiqarildi' AND (p_muassasa IS NULL OR q.muassasa=p_muassasa)
    AND NOT EXISTS (SELECT 1 FROM insult_chiqarish c WHERE c.insult_qabul_id=q.id);
$$;
GRANT EXECUTE ON FUNCTION public.varaqasiz_bemorlar_idlari(text) TO authenticated;
