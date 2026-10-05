-- Dinamik muolaja aniq qabul yozuviga bog'lanadi: K/T raqami turli muassasalarda
-- takrorlanadi (insult 68, infarkt 19 ta raqam), kt_no bo'yicha bog'lash noaniq edi.
-- 2026-10-05 da bazaga qo'llangan (apply_migration: dinamika_qabul_id).
ALTER TABLE public.dinamika_muolajalar ADD COLUMN IF NOT EXISTS qabul_id uuid;
CREATE INDEX IF NOT EXISTS idx_dinamika_qabul_id ON public.dinamika_muolajalar (qabul_id);

-- Backfill: K/T raqami yagona bo'lsa — o'sha qabul; takrorlangan bo'lsa — vaqt oynasiga
-- (qabul -1 kun .. chiqarish +2 kun) faqat bitta qabul tushsa. Aks holda NULL qoladi.
-- Natija: 604 yozuvdan 602 tasi bog'landi.
WITH q AS (
  SELECT 'infarkt'::text t, i.id, i.kt_no, i.qabul_vaqt,
         (SELECT max(c.chiqish_sana) FROM public.infarkt_chiqarish c WHERE c.infarkt_qabul_id = i.id) cs
    FROM public.infarkt_qabul i
  UNION ALL
  SELECT 'insult', n.id, n.kt_no, n.qabul_vaqt,
         (SELECT max(c.chiqish_sana) FROM public.insult_chiqarish c WHERE c.insult_qabul_id = n.id)
    FROM public.insult_qabul n
), cand AS (
  SELECT d.id did,
         (array_agg(q.id))[1] only_id, count(*) n_all,
         count(*) FILTER (WHERE d.created_at >= q.qabul_vaqt - interval '1 day'
                            AND (q.cs IS NULL OR d.created_at <= q.cs + interval '2 days')) n_win,
         (array_agg(q.id) FILTER (WHERE d.created_at >= q.qabul_vaqt - interval '1 day'
                            AND (q.cs IS NULL OR d.created_at <= q.cs + interval '2 days')))[1] win_id
    FROM public.dinamika_muolajalar d
    JOIN q ON q.t = d.registr_turi AND q.kt_no = d.kt_no
   WHERE d.qabul_id IS NULL
   GROUP BY d.id
)
UPDATE public.dinamika_muolajalar d
   SET qabul_id = CASE WHEN c.n_all = 1 THEN c.only_id WHEN c.n_win = 1 THEN c.win_id END
  FROM cand c
 WHERE d.id = c.did AND (c.n_all = 1 OR c.n_win = 1);

-- Telegram "DINAMIKA YANGILANDI": bemor qabul_id bo'yicha topiladi (bo'lmasa kt_no);
-- shu bilan GCS chegarasi ham ≤9 ga moslandi (yangi qabul xabari bilan bir xil).
DO $do$
DECLARE d text;
  o1 text := 'FROM infarkt_qabul q WHERE q.kt_no = NEW.kt_no LIMIT 1;';
  o2 text := 'FROM insult_qabul q WHERE q.kt_no = NEW.kt_no LIMIT 1;';
  w  text := 'WHERE (NEW.qabul_id IS NOT NULL AND q.id = NEW.qabul_id) OR (NEW.qabul_id IS NULL AND q.kt_no = NEW.kt_no) ORDER BY q.created_at DESC NULLS LAST LIMIT 1;';
BEGIN
  SELECT pg_get_functiondef('public.notify_telegram_dinamika'::regproc) INTO d;
  IF position('NEW.qabul_id' in d) > 0 THEN RETURN; END IF;
  IF position(o1 in d)=0 OR position(o2 in d)=0 THEN RAISE EXCEPTION 'notify_telegram_dinamika: joy topilmadi'; END IF;
  d := replace(d, o1, 'FROM infarkt_qabul q ' || w);
  d := replace(d, o2, 'FROM insult_qabul q ' || w);
  d := replace(d, 'BETWEEN 3 AND 8', 'BETWEEN 3 AND 9');
  d := replace(d, 'BETWEEN 9 AND 12', 'BETWEEN 10 AND 12');
  EXECUTE d;
END $do$;

-- Davolash oqimi: dinamik yozuv qabul_id bo'yicha bog'lanadi; "noaniq" faqat K/T
-- takrorlangan VA bog'lanmagan dinamik yozuv bo'lsa (insult: 147 -> 8).
DO $do$
DECLARE d text; i int;
  r text[][] := ARRAY[
   ARRAY['case when a.key_count>1 and dy.event_count>0 then array[''__ambiguous__'']::text[]', 'case when a.key_count>1 and dy.unlinked_count>0 then array[''__ambiguous__'']::text[]', '1'],
   ARRAY['case when a.key_count>1 then null else dy.route end as dynamic_route', 'case when a.key_count>1 and dy.unlinked_count>0 then null else dy.route end as dynamic_route', '1'],
   ARRAY['case when a.key_count=1 then coalesce(dy.routes,array[]::text[]) else array[]::text[] end as routing_events', 'case when a.key_count=1 or dy.unlinked_count=0 then coalesce(dy.routes,array[]::text[]) else array[]::text[] end as routing_events', '1'],
   ARRAY['(a.key_count>1)::int as ambiguous', '(a.key_count>1 and dy.unlinked_count>0)::int as ambiguous', '1'],
   ARRAY['select count(*) as event_count,', 'select count(*) as event_count, count(*) filter(where d.qabul_id is null) as unlinked_count,', '1'],
   ARRAY['filter(where a.key_count=1 and d.created_at is not null', 'filter(where (d.qabul_id=a.id or a.key_count=1) and d.created_at is not null', '2'],
   ARRAY['from public.dinamika_muolajalar d where d.kt_no=a.kt_no and d.registr_turi=p_disease', 'from public.dinamika_muolajalar d where d.registr_turi=p_disease and (d.qabul_id=a.id or (d.qabul_id is null and d.kt_no=a.kt_no))', '1']];
BEGIN
  SELECT pg_get_functiondef('public.get_treatment_flow'::regproc) INTO d;
  IF position('unlinked_count' in d) > 0 THEN RETURN; END IF;
  FOR i IN 1..array_length(r,1) LOOP
    IF (length(d)-length(replace(d,r[i][1],'')))/length(r[i][1]) <> r[i][3]::int THEN
      RAISE EXCEPTION 'get_treatment_flow: topilmadi (%)', i;
    END IF;
    d := replace(d, r[i][1], r[i][2]);
  END LOOP;
  EXECUTE d;
END $do$;
