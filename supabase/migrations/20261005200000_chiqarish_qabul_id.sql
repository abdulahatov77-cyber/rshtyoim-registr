-- Chiqarish varaqasi aniq qabul yozuviga bog'lanadi (infarkt_qabul_id / insult_qabul_id).
-- Ustunlar bor edi, lekin hech qachon to'ldirilmagan — varaqa K/T raqami bo'yicha
-- bog'lanardi, K/T esa muassasalar orasida takrorlanadi.
-- 2026-10-05 da bazaga qo'llangan.

-- 1) bemor_chiqarish RPC: yangi varaqa qabul id bilan yoziladi; eski varaqani almashtirishda
--    faqat shu qabulniki (yoki K/T yagona bo'lsa, bog'lanmagan eski varaqa) o'chiriladi —
--    avval K/T bo'yicha boshqa muassasadagi bemorning varaqasi ham o'chib ketishi mumkin edi.
DO $do$
DECLARE d text;
  o  text := 'v_payload := p_chiqarish || jsonb_build_object(''kt_no'', p_kt_no);';
  n  text := 'v_payload := p_chiqarish || jsonb_build_object(''kt_no'', p_kt_no, p_turi || ''_qabul_id'', v_id);';
  o2 text := 'WHERE kt_no = $1'', v_chiq) USING p_kt_no;';
  n2 text := 'WHERE %I = $1 OR (kt_no = $2 AND %I IS NULL AND (SELECT count(*) FROM public.%I WHERE kt_no = $2) = 1)'', v_chiq, p_turi || ''_qabul_id'', p_turi || ''_qabul_id'', v_qabul) USING v_id, p_kt_no;';
BEGIN
  SELECT pg_get_functiondef('public.bemor_chiqarish(text,text,text,text,jsonb)'::regprocedure) INTO d;
  IF position('_qabul_id' in d) > 0 THEN RETURN; END IF;
  IF position(o in d)=0 OR position(o2 in d)=0 THEN RAISE EXCEPTION 'bemor_chiqarish: joy topilmadi'; END IF;
  EXECUTE replace(replace(d, o, n), o2, n2);
END $do$;

-- 2) Backfill: K/T yagona bo'lsa — o'sha qabul; takrorlangan bo'lsa — vaqt oynasiga
--    (qabul .. +120 kun) faqat bitta qabul tushsa. Bitta qabulga bir nechta varaqa tushsa —
--    eng oxirgisi (insult_chiqarish_one_per_qabul cheklovi).
--    Natija: infarkt 9 484 / 9 500, insult 18 881 / 18 916.
WITH c AS (
  SELECT ch.id cid, count(*) n_all, (array_agg(q.id))[1] only_id,
    count(*) FILTER (WHERE q.qabul_vaqt <= coalesce(ch.chiqish_sana, ch.created_at) + interval '1 day'
                       AND coalesce(ch.chiqish_sana, ch.created_at) <= q.qabul_vaqt + interval '120 days') n_win,
    (array_agg(q.id) FILTER (WHERE q.qabul_vaqt <= coalesce(ch.chiqish_sana, ch.created_at) + interval '1 day'
                       AND coalesce(ch.chiqish_sana, ch.created_at) <= q.qabul_vaqt + interval '120 days'))[1] win_id
  FROM public.infarkt_chiqarish ch JOIN public.infarkt_qabul q ON q.kt_no = ch.kt_no
  WHERE ch.infarkt_qabul_id IS NULL GROUP BY ch.id)
UPDATE public.infarkt_chiqarish ch SET infarkt_qabul_id = CASE WHEN c.n_all=1 THEN c.only_id ELSE c.win_id END
FROM c WHERE ch.id = c.cid AND (c.n_all = 1 OR c.n_win = 1);

WITH c AS (
  SELECT ch.id cid, coalesce(ch.chiqish_sana, ch.created_at) ts, ch.created_at, count(*) n_all, (array_agg(q.id))[1] only_id,
    count(*) FILTER (WHERE q.qabul_vaqt <= coalesce(ch.chiqish_sana, ch.created_at) + interval '1 day'
                       AND coalesce(ch.chiqish_sana, ch.created_at) <= q.qabul_vaqt + interval '120 days') n_win,
    (array_agg(q.id) FILTER (WHERE q.qabul_vaqt <= coalesce(ch.chiqish_sana, ch.created_at) + interval '1 day'
                       AND coalesce(ch.chiqish_sana, ch.created_at) <= q.qabul_vaqt + interval '120 days'))[1] win_id
  FROM public.insult_chiqarish ch JOIN public.insult_qabul q ON q.kt_no = ch.kt_no
  WHERE ch.insult_qabul_id IS NULL GROUP BY ch.id),
t AS (SELECT cid, CASE WHEN n_all=1 THEN only_id ELSE win_id END qid, ts, created_at FROM c WHERE n_all=1 OR n_win=1),
r AS (SELECT t.*, row_number() OVER (PARTITION BY qid ORDER BY ts DESC NULLS LAST, created_at DESC, cid) rn FROM t
      WHERE NOT EXISTS (SELECT 1 FROM public.insult_chiqarish e WHERE e.insult_qabul_id = t.qid))
UPDATE public.insult_chiqarish ch SET insult_qabul_id = r.qid FROM r WHERE ch.id = r.cid AND r.rn = 1;

-- 3) Hisobotlar chiqarish natijasini qabul id bo'yicha oladi (kt_no emas).
DO $do$
DECLARE d text; nm text; i int; r text[][]; pat text := 'select\s+distinct\s+on\s+\(c\.kt_no\)\s+c\.kt_no\s+as\s+kt,';
BEGIN
  FOR nm IN SELECT unnest(ARRAY['get_hisobot_infarkt','get_hisobot_insult','get_hisobot_kaskad']) LOOP
    d := pg_get_functiondef(('public.'||nm)::regproc);
    IF d ~ 'distinct on \(c\.(infarkt|insult)_qabul_id\)' THEN CONTINUE; END IF;
    IF nm = 'get_hisobot_kaskad' THEN
      d := regexp_replace(d, pat, 'select distinct on (c.infarkt_qabul_id) c.infarkt_qabul_id as kt,');
      d := regexp_replace(d, pat, 'select distinct on (c.insult_qabul_id) c.insult_qabul_id as kt,');
      r := ARRAY[
        ARRAY['(from\s+public\.infarkt_chiqarish\s+c\s+order\s+by\s+c\.)kt_no,','\1infarkt_qabul_id,','1'],
        ARRAY['(from\s+public\.insult_chiqarish\s+c\s+order\s+by\s+c\.)kt_no,','\1insult_qabul_id,','1'],
        ARRAY['(\mci\.kt\s*=\s*q\.)kt_no\M','\1id','1'],
        ARRAY['(\mcs\.kt\s*=\s*q\.)kt_no\M','\1id','1']];
    ELSIF nm = 'get_hisobot_infarkt' THEN
      r := ARRAY[
        ARRAY['(select\s+distinct\s+on\s+\(c\.)kt_no\)','\1infarkt_qabul_id)','1'],
        ARRAY['(\s)c\.kt_no(\s+as\s+kt,)','\1c.infarkt_qabul_id\2','1'],
        ARRAY['(order\s+by\s+c\.)kt_no(,\s*c\.chiqish_sana)','\1infarkt_qabul_id\2','1'],
        ARRAY['(\mc\.kt\s*=\s*q\.)kt_no\M','\1id','1']];
    ELSE
      r := ARRAY[
        ARRAY['(select\s+distinct\s+on\s+\(c\.)kt_no\)','\1insult_qabul_id)','1'],
        ARRAY['(\s)c\.kt_no(,\s*c\.natija::text)','\1c.insult_qabul_id as kt_no\2','1'],
        ARRAY['(order\s+by\s+c\.)kt_no(,\s*c\.chiqish_sana)','\1insult_qabul_id\2','1'],
        ARRAY['(\mc\.kt_no\s*=\s*q\.)kt_no\M','\1id','1']];
    END IF;
    FOR i IN 1..array_length(r,1) LOOP
      IF regexp_count(d, r[i][1]) <> r[i][3]::int THEN RAISE EXCEPTION '%: andoza % topilmadi', nm, i; END IF;
      d := regexp_replace(d, r[i][1], r[i][2]);
    END LOOP;
    EXECUTE d;
  END LOOP;
END $do$;
