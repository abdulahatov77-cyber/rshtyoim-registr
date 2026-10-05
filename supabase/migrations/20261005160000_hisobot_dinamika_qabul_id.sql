-- Hisobot funksiyalari dinamik muolajalarni K/T raqami emas, qabul_id bo'yicha
-- guruhlaydi va qabulga q.id orqali qo'shadi (K/T muassasalar orasida takrorlanadi).
-- Bog'lanmagan (qabul_id IS NULL) 2 ta eski yozuv hisobotga kirmaydi — ular noaniq edi.
-- 2026-10-05 da bazaga qo'llangan; super_admin nomidan sinab ko'rilgan.
DO $do$
DECLARE d text; nm text; fid regprocedure; i int; r text[][];
BEGIN
  FOR nm IN SELECT unnest(ARRAY['get_hisobot_infarkt','get_hisobot_insult','get_hisobot_kaskad','get_pq20_hisobot']) LOOP
    SELECT p.oid::regprocedure INTO fid FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname=nm;
    d := pg_get_functiondef(fid);
    IF position('d.qabul_id' in d) > 0 THEN CONTINUE; END IF;  -- allaqachon qo'llangan
    r := CASE nm
      WHEN 'get_hisobot_infarkt' THEN ARRAY[
        ARRAY['select d.kt_no as kt, lower(','select d.qabul_id as kt, lower(','1'],
        ARRAY['group by d.kt_no','group by d.qabul_id','1'],
        ARRAY['dn.kt = q.kt_no','dn.kt = q.id','1']]
      WHEN 'get_hisobot_insult' THEN ARRAY[
        ARRAY['select d.kt_no, lower(','select d.qabul_id as kt_no, lower(','1'],
        ARRAY['group by d.kt_no','group by d.qabul_id','1'],
        ARRAY['dn.kt_no = q.kt_no','dn.kt_no = q.id','1']]
      WHEN 'get_hisobot_kaskad' THEN ARRAY[
        ARRAY['select d.kt_no as kt, lower(','select d.qabul_id as kt, lower(','2'],
        ARRAY['group by d.kt_no','group by d.qabul_id','2'],
        ARRAY['dn.kt = q.kt_no','dn.kt = q.id','2']]
      ELSE ARRAY[
        ARRAY['SELECT d.kt_no, lower(','SELECT d.qabul_id AS kt_no, lower(','2'],
        ARRAY['GROUP BY d.kt_no','GROUP BY d.qabul_id','2'],
        ARRAY['dn.kt_no = i.kt_no','dn.kt_no = i.id','1'],
        ARRAY['dn.kt_no = n.kt_no','dn.kt_no = n.id','1']] END;
    FOR i IN 1..array_length(r,1) LOOP
      IF (length(d)-length(replace(d,r[i][1],'')))/length(r[i][1]) <> r[i][3]::int THEN
        RAISE EXCEPTION '%: "%" soni % emas', nm, r[i][1], r[i][3];
      END IF;
      d := replace(d, r[i][1], r[i][2]);
    END LOOP;
    EXECUTE d;
  END LOOP;
END $do$;
