-- bemor_chiqarish: boshqa muassasaga o'tkazishda sabab (p_chiqarish->>'otkazish_sababi')
-- qabul jadvalidagi otkazish_sababi ustuniga ham yoziladi. Funksiya imzosi o'zgarmagan.
-- O'tkazish bo'lmasa yoki sabab berilmasa — mavjud qiymat saqlanadi.
-- 2026-10-05 da bazaga qo'llangan (jonli funksiya ustida aniq almashtirish).
DO $do$
DECLARE d text; n text;
  o1 text := 'SET status = $1, otkazilgan_muassasa = $2';
  n1 text := $q$SET status = $1, otkazilgan_muassasa = $2,
             otkazish_sababi = CASE WHEN $1 = ''otkazildi'' AND nullif($4, '''') IS NOT NULL THEN $4 ELSE otkazish_sababi END$q$;
  o2 text := 'USING p_status, p_otkazilgan_muassasa, v_id;';
  n2 text := $q$USING p_status, p_otkazilgan_muassasa, v_id, p_chiqarish ->> 'otkazish_sababi';$q$;
BEGIN
  SELECT pg_get_functiondef('public.bemor_chiqarish(text,text,text,text,jsonb)'::regprocedure) INTO d;
  IF position('otkazish_sababi' in d) > 0 THEN RETURN; END IF;  -- allaqachon qo'llangan
  IF (length(d)-length(replace(d,o1,'')))/length(o1) <> 1 OR (length(d)-length(replace(d,o2,'')))/length(o2) <> 1 THEN
    RAISE EXCEPTION 'bemor_chiqarish: kutilgan joylar topilmadi';
  END IF;
  n := replace(replace(d, o1, n1), o2, n2);
  EXECUTE n;
END $do$;
