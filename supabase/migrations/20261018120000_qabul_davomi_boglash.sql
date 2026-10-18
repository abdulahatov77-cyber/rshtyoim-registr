-- O'tkazilgan bemorlarni bog'lash (2026-10-18, bazaga qo'llangan, foydalanuvchi tanlovi "B").
-- A muassasadagi qabul yozuviga davomi_qabul_id = B muassasadagi qabul id yoziladi.
-- Juftlik manbalari:
--   'ism'    — familiya + ism + to'liq tug'ilgan sana bir xil, muassasa boshqa, B ga o'sha kuni yoki ertasi kuni kelgan;
--   'tasdiq' — qabul_tasdiq (B shifokori "Qabul qilish"/"allaqachon mavjud" orqali tasdiqlagan), kun farqidan qat'i nazar.
-- Har bir A ga bitta (eng erta) B, har bir B ga bitta (eng so'nggi) A.
-- Natija: infarkt 283, insult 59 juftlik. Hech narsa o'chirilmagan.
-- Qaytarish: UPDATE public.infarkt_qabul SET davomi_qabul_id = NULL; UPDATE public.insult_qabul SET davomi_qabul_id = NULL; DELETE FROM public.qabul_davomi;
CREATE TABLE IF NOT EXISTS public.qabul_davomi (registr_turi text NOT NULL, qabul_id uuid NOT NULL, davomi_qabul_id uuid NOT NULL, manba text, created_at timestamptz DEFAULT now(), PRIMARY KEY (registr_turi, qabul_id));
ALTER TABLE public.qabul_davomi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qabul_davomi FROM anon;
GRANT SELECT ON public.qabul_davomi TO authenticated;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qabul_davomi' AND policyname='qd_select') THEN
  CREATE POLICY qd_select ON public.qabul_davomi FOR SELECT TO authenticated USING (true); END IF; END $$;
ALTER TABLE public.infarkt_qabul ADD COLUMN IF NOT EXISTS davomi_qabul_id uuid;
ALTER TABLE public.insult_qabul  ADD COLUMN IF NOT EXISTS davomi_qabul_id uuid;

CREATE OR REPLACE FUNCTION pg_temp.nf(t text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT regexp_replace(lower(translate(coalesce(t,''),'ʻʼ‘’`''','')),'[^a-zа-яёқғҳў]','','g') $$;
CREATE TEMP TABLE _q AS
 SELECT 'infarkt' t, id, kt_no, muassasa, qabul_vaqt, pg_temp.nf(split_part(btrim(fio),' ',1)) fam, pg_temp.nf(split_part(btrim(fio),' ',2)) ism,
   CASE WHEN tugilgan_sana::text ~ '^\d{4}-\d\d-\d\d' THEN substr(tugilgan_sana::text,1,10) END ts, (qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date kun FROM public.infarkt_qabul
 UNION ALL
 SELECT 'insult', id, kt_no, muassasa, qabul_vaqt, pg_temp.nf(split_part(btrim(fio),' ',1)), pg_temp.nf(split_part(btrim(fio),' ',2)),
   CASE WHEN tugilgan_sana::text ~ '^\d{4}-\d\d-\d\d' THEN substr(tugilgan_sana::text,1,10) END, (qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date FROM public.insult_qabul;
CREATE TEMP TABLE _c AS
 SELECT a.t, a.id aid, b.id bid, 'ism' manba, a.qabul_vaqt av, b.qabul_vaqt bv
 FROM _q a JOIN _q b ON b.t=a.t AND b.fam=a.fam AND b.ism=a.ism AND b.ts=a.ts AND b.kun - a.kun IN (0,1)
   AND a.fam<>'' AND a.ism<>'' AND a.ts IS NOT NULL AND b.muassasa<>a.muassasa AND a.qabul_vaqt < b.qabul_vaqt
 UNION ALL
 SELECT b.t, a.id, b.id, 'tasdiq', a.qabul_vaqt, b.qabul_vaqt
 FROM public.qabul_tasdiq x
 JOIN _q b ON b.kt_no=x.yangi_kt_no AND b.t=x.registr_turi AND b.muassasa=x.qabul_muassasa
 JOIN LATERAL (SELECT a.* FROM _q a WHERE a.kt_no=x.manba_kt_no AND a.t=x.registr_turi AND a.muassasa<>b.muassasa
   AND a.qabul_vaqt <= b.qabul_vaqt + interval '1 day' ORDER BY a.qabul_vaqt DESC LIMIT 1) a ON true
 WHERE x.yangi_kt_no IS NOT NULL;
INSERT INTO public.qabul_davomi (registr_turi, qabul_id, davomi_qabul_id, manba)
 SELECT t, aid, bid, manba FROM (
  SELECT *, row_number() OVER (PARTITION BY t, aid ORDER BY bv) ra, row_number() OVER (PARTITION BY t, bid ORDER BY av DESC) rb
  FROM (SELECT t, aid, bid, string_agg(DISTINCT manba, '+') manba, min(av) av, min(bv) bv FROM _c GROUP BY 1,2,3) u) r
 WHERE ra=1 AND rb=1
 ON CONFLICT DO NOTHING;
UPDATE public.infarkt_qabul q SET davomi_qabul_id = d.davomi_qabul_id FROM public.qabul_davomi d WHERE d.registr_turi='infarkt' AND d.qabul_id=q.id AND q.davomi_qabul_id IS NULL;
UPDATE public.insult_qabul  q SET davomi_qabul_id = d.davomi_qabul_id FROM public.qabul_davomi d WHERE d.registr_turi='insult'  AND d.qabul_id=q.id AND q.davomi_qabul_id IS NULL;
