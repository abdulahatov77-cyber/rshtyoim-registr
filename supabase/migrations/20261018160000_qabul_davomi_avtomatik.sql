-- Yangi o'tkazilgan bemorlar avtomatik bog'lanadi (2026-10-18, bazaga qo'llangan).
-- B muassasada yangi qabul yozilganda yoki "Qabul qilish" tasdig'i (qabul_tasdiq) yozilganda
-- A yozuviga davomi_qabul_id qo'yiladi — 20261018120000 dagi mezonlar bilan bir xil:
--   familiya + ism + to'liq tug'ilgan sana bir xil, boshqa muassasa, B ga o'sha yoki ertasi kuni kelgan;
--   yoki qabul_tasdiq (manba_kt_no → yangi_kt_no).
-- Xato bo'lsa ham qabul saqlanadi (bog'lash jimgina o'tkazib yuboriladi).
-- Sinov: 6 ta mavjud juftlik (3 ism, 3 tasdiq) uzib, funksiya bilan qayta bog'landi — 6/6 to'g'ri (rollback).
CREATE OR REPLACE FUNCTION public.b_kun(t timestamptz) RETURNS date LANGUAGE sql IMMUTABLE AS $$ SELECT (t AT TIME ZONE 'Asia/Tashkent')::date $$;
CREATE OR REPLACE FUNCTION public.qabul_davomi_bogla(p_turi text, p_b_id uuid, p_manba_kt text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; a_id uuid; v_manba text;
  nf_sql text := $f$regexp_replace(lower(translate(coalesce(%s,''),'ʻʼ‘’`''','')),'[^a-zа-яёқғҳў]','','g')$f$;
BEGIN
  IF p_turi NOT IN ('infarkt','insult') OR p_b_id IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT id, kt_no, muassasa, qabul_vaqt, fio, CASE WHEN tugilgan_sana::text ~ ''^\d{4}-\d\d-\d\d'' THEN substr(tugilgan_sana::text,1,10) END ts FROM public.%I WHERE id = $1', p_turi || '_qabul')
    INTO b USING p_b_id;
  IF b.id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.qabul_davomi d WHERE d.registr_turi = p_turi AND d.davomi_qabul_id = b.id) THEN RETURN; END IF;

  -- 1) Shifokor tasdig'i: manba K/T
  IF p_manba_kt IS NOT NULL THEN
    EXECUTE format('SELECT a.id FROM public.%I a WHERE a.kt_no = $1 AND a.muassasa <> $2 AND a.qabul_vaqt <= $3 + interval ''1 day''
                    AND a.davomi_qabul_id IS NULL ORDER BY a.qabul_vaqt DESC LIMIT 1', p_turi || '_qabul')
      INTO a_id USING p_manba_kt, b.muassasa, b.qabul_vaqt;
    v_manba := 'tasdiq';
  END IF;
  -- 2) Ism + tug'ilgan sana + kun
  IF a_id IS NULL AND b.ts IS NOT NULL THEN
    EXECUTE format('SELECT a.id FROM public.%1$I a
       WHERE a.id <> $1 AND a.muassasa <> $2 AND a.qabul_vaqt < $3 AND a.davomi_qabul_id IS NULL
         AND (public.b_kun($3) - public.b_kun(a.qabul_vaqt)) IN (0,1)
         AND substr(a.tugilgan_sana::text,1,10) = $4
         AND %2$s = %3$s AND %4$s = %5$s AND %2$s <> '''' AND %4$s <> ''''
       ORDER BY a.qabul_vaqt DESC LIMIT 1', p_turi || '_qabul',
       format(nf_sql, 'split_part(btrim(a.fio),'' '',1)'), format(nf_sql, 'split_part(btrim($5),'' '',1)'),
       format(nf_sql, 'split_part(btrim(a.fio),'' '',2)'), format(nf_sql, 'split_part(btrim($5),'' '',2)'))
      INTO a_id USING b.id, b.muassasa, b.qabul_vaqt, b.ts, b.fio;
    v_manba := 'ism';
  END IF;
  IF a_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.qabul_davomi (registr_turi, qabul_id, davomi_qabul_id, manba) VALUES (p_turi, a_id, b.id, v_manba)
    ON CONFLICT DO NOTHING;
  EXECUTE format('UPDATE public.%I SET davomi_qabul_id = $1 WHERE id = $2 AND davomi_qabul_id IS NULL', p_turi || '_qabul') USING b.id, a_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_qabul_davomi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.qabul_davomi_bogla(TG_ARGV[0], NEW.id);
  EXCEPTION WHEN OTHERS THEN NULL;  -- bog'lash xatosi qabulni to'xtatmasin
  END;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_qabul_tasdiq_davomi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b_id uuid;
BEGIN
  IF NEW.yangi_kt_no IS NULL OR NEW.registr_turi NOT IN ('infarkt','insult') THEN RETURN NEW; END IF;
  BEGIN
    EXECUTE format('SELECT id FROM public.%I WHERE kt_no = $1 AND ($2::text IS NULL OR muassasa = $2) ORDER BY qabul_vaqt DESC LIMIT 1', NEW.registr_turi || '_qabul')
      INTO b_id USING NEW.yangi_kt_no, NEW.qabul_muassasa;
    IF b_id IS NOT NULL THEN PERFORM public.qabul_davomi_bogla(NEW.registr_turi, b_id, NEW.manba_kt_no); END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.qabul_davomi_bogla(text, uuid, text) FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_infarkt_qabul_davomi ON public.infarkt_qabul;
CREATE TRIGGER trg_infarkt_qabul_davomi AFTER INSERT ON public.infarkt_qabul FOR EACH ROW EXECUTE FUNCTION public.trg_qabul_davomi('infarkt');
DROP TRIGGER IF EXISTS trg_insult_qabul_davomi ON public.insult_qabul;
CREATE TRIGGER trg_insult_qabul_davomi AFTER INSERT ON public.insult_qabul FOR EACH ROW EXECUTE FUNCTION public.trg_qabul_davomi('insult');
DROP TRIGGER IF EXISTS trg_qabul_tasdiq_davomi ON public.qabul_tasdiq;
CREATE TRIGGER trg_qabul_tasdiq_davomi AFTER INSERT ON public.qabul_tasdiq FOR EACH ROW EXECUTE FUNCTION public.trg_qabul_tasdiq_davomi();
