-- Bemorga bog'liq kichik jadvallar aniq qabul yozuviga bog'lanadi (qabul_id).
-- K/T raqami muassasalar orasida takrorlanadi; bu jadvallar faqat kt_no bo'yicha bog'langan edi.
-- 2026-10-05 da bazaga qo'llangan. Natija: 943 yozuvdan 941 tasi bog'landi
-- (holat_dinamikasi 423/425, navbatchi_jurnal 49/49, kuzatuv 45/45,
--  bemor_fayllari 23/23, transfer_log 401/401; holat_baxolash va davolash bo'sh).
ALTER TABLE public.holat_dinamikasi ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.navbatchi_jurnal ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.kuzatuv          ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.transfer_log     ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.bemor_fayllari   ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.holat_baxolash   ADD COLUMN IF NOT EXISTS qabul_id uuid;
ALTER TABLE public.davolash         ADD COLUMN IF NOT EXISTS qabul_id uuid;
CREATE INDEX IF NOT EXISTS idx_holat_dinamikasi_qabul_id ON public.holat_dinamikasi (qabul_id);
CREATE INDEX IF NOT EXISTS idx_navbatchi_jurnal_qabul_id ON public.navbatchi_jurnal (qabul_id);
CREATE INDEX IF NOT EXISTS idx_kuzatuv_qabul_id          ON public.kuzatuv (qabul_id);
CREATE INDEX IF NOT EXISTS idx_transfer_log_qabul_id     ON public.transfer_log (qabul_id);
CREATE INDEX IF NOT EXISTS idx_bemor_fayllari_qabul_id   ON public.bemor_fayllari (qabul_id);
CREATE INDEX IF NOT EXISTS idx_holat_baxolash_qabul_id   ON public.holat_baxolash (qabul_id);
CREATE INDEX IF NOT EXISTS idx_davolash_qabul_id         ON public.davolash (qabul_id);

CREATE TEMP TABLE _q AS
  SELECT 'infarkt'::text t, id, kt_no, muassasa, otkazilgan_muassasa FROM public.infarkt_qabul
  UNION ALL SELECT 'insult', id, kt_no, muassasa, otkazilgan_muassasa FROM public.insult_qabul;
CREATE INDEX ON _q (kt_no);

-- registr_turi bor jadvallar: K/T shu turda yagona bo'lsa
UPDATE public.holat_dinamikasi x SET qabul_id = (SELECT q.id FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)=1;
UPDATE public.navbatchi_jurnal x SET qabul_id = (SELECT q.id FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)=1;
UPDATE public.kuzatuv x SET qabul_id = (SELECT q.id FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)=1;
UPDATE public.bemor_fayllari x SET qabul_id = (SELECT q.id FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.t=x.registr_turi AND q.kt_no=x.kt_no)=1;

-- transfer_log: bemor_turi ko'pincha yo'q — K/T ikkala jadvalda yagona bo'lsa,
-- yoki muassasa_dan/muassasa_ga mos keladigan yagona qabul bo'lsa
UPDATE public.transfer_log x SET qabul_id = (SELECT q.id FROM _q q WHERE q.kt_no=x.kt_no AND (x.bemor_turi IS NULL OR q.t=x.bemor_turi))
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.kt_no=x.kt_no AND (x.bemor_turi IS NULL OR q.t=x.bemor_turi))=1;
UPDATE public.transfer_log x SET qabul_id = (SELECT q.id FROM _q q WHERE q.kt_no=x.kt_no AND (q.muassasa=x.muassasa_dan OR q.otkazilgan_muassasa=x.muassasa_ga))
 WHERE x.qabul_id IS NULL AND (SELECT count(*) FROM _q q WHERE q.kt_no=x.kt_no AND (q.muassasa=x.muassasa_dan OR q.otkazilgan_muassasa=x.muassasa_ga))=1;
