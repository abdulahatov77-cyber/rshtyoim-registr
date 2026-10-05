-- Hisobot funksiyalari (SECURITY DEFINER): oddiy foydalanuvchi (role = 'user')
-- faqat o'z muassasasini ko'radi. Avval butun viloyatni ko'rardi.
-- admin / rahbar / super_admin uchun o'zgarish yo'q.
--  * get_hisobot_infarkt / _insult / _kaskad / _oyna / _marshrut_muassasa /
--    _marshrut_matritsa: qabul.muassasa = foydalanuvchi muassasasi
--  * get_marshrut_audit / _matritsa / _xulosa: muassasa_dan YOKI muassasa_ga
--  * get_pq20_hisobot: p_muassasa majburan foydalanuvchi muassasasiga almashtiriladi
-- Muassasasi belgilanmagan foydalanuvchi bo'sh natija oladi ('__yoq__').
-- 2026-10-05 da bazaga qo'llangan va user/admin nomidan sinab ko'rilgan.
DO $do$
DECLARE
  d text; nm text; fid regprocedure; cnt int; need int; bl text;
  blk  text := E'\n  -- Oddiy foydalanuvchi (user) faqat o''z muassasasini ko''radi.\n  if v_role = ''user'' then\n    select coalesce(nullif(btrim(p.muassasa), ''''), ''__yoq__'') into v_mua\n      from public.profiles p where p.id = auth.uid();\n  end if;';
  blkpq text := E'\n  -- Oddiy foydalanuvchi (user) faqat o''z muassasasini ko''radi.\n  if v_role = ''user'' then\n    select coalesce(nullif(btrim(p.muassasa), ''''), ''__yoq__'') into v_mua\n      from public.profiles p where p.id = auth.uid();\n    p_muassasa := v_mua;\n  end if;';
  qold text := 'and (p_viloyat is null or q.viloyat = p_viloyat)';
  qnew text := E'and (p_viloyat is null or q.viloyat = p_viloyat)\n      and (v_mua is null or lower(btrim(coalesce(q.muassasa,''''))) = lower(v_mua))';
  sold text := 'and (p_viloyat is null or src.vil = p_viloyat)';
  snew text := E'and (p_viloyat is null or src.vil = p_viloyat)\n      and (v_mua is null or lower(btrim(coalesce(src.mua,''''))) = lower(v_mua))';
  mold text := '(p_viloyat is null or m.viloyat = p_viloyat)';
  mnew text := E'(p_viloyat is null or m.viloyat = p_viloyat)\n    and (v_mua is null or lower(btrim(coalesce(m.muassasa_dan,''''))) = lower(v_mua) or lower(btrim(coalesce(m.muassasa_ga,''''))) = lower(v_mua))';
  cold text := 'select viloyat, otkazilgan_muassasa, qabul_vaqt';
  vold text := 'and (v_filtr is null or q.viloyat = v_filtr)';
BEGIN
  FOR nm IN SELECT unnest(ARRAY['get_hisobot_infarkt','get_hisobot_insult','get_hisobot_kaskad','get_hisobot_marshrut_matritsa','get_hisobot_marshrut_muassasa','get_hisobot_oyna','get_marshrut_audit','get_marshrut_matritsa','get_marshrut_xulosa','get_pq20_hisobot']) LOOP
    SELECT p.oid::regprocedure INTO fid FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname=nm AND p.prosecdef;
    d := pg_get_functiondef(fid);
    IF position('v_mua' in d) > 0 THEN CONTINUE; END IF;  -- allaqachon qo'llangan
    d := regexp_replace(d, 'v_vil(\s+)text;', 'v_vil\1text; v_mua text;');
    cnt := length(d);
    IF nm = 'get_pq20_hisobot' THEN bl := blkpq; ELSE bl := blk; END IF;
    d := regexp_replace(d, '(raise exception ''Ruxsat yo''''q: akkaunt tasdiqlanmagan'';\r?\n\s*end if;)', '\1' || bl);
    IF length(d) = cnt THEN RAISE EXCEPTION '% : blok joyi topilmadi', nm; END IF;
    IF nm IN ('get_hisobot_infarkt','get_hisobot_insult','get_hisobot_kaskad') THEN
      need := 1; IF nm = 'get_hisobot_kaskad' THEN need := 2; END IF;
      IF (length(d)-length(replace(d,qold,'')))/length(qold) <> need THEN RAISE EXCEPTION '% q filtr', nm; END IF;
      d := replace(d, qold, qnew);
    ELSIF nm IN ('get_hisobot_marshrut_muassasa','get_hisobot_oyna') THEN
      IF (length(d)-length(replace(d,sold,'')))/length(sold) <> 1 THEN RAISE EXCEPTION '% src filtr', nm; END IF;
      d := replace(d, sold, snew);
    ELSIF nm IN ('get_marshrut_audit','get_marshrut_matritsa','get_marshrut_xulosa') THEN
      IF (length(d)-length(replace(d,mold,'')))/length(mold) <> 1 THEN RAISE EXCEPTION '% m filtr', nm; END IF;
      d := replace(d, mold, mnew);
    ELSIF nm = 'get_hisobot_marshrut_matritsa' THEN
      IF (length(d)-length(replace(d,cold,'')))/length(cold) <> 2 OR position(vold in d) = 0 THEN RAISE EXCEPTION '% cols', nm; END IF;
      d := replace(d, cold, 'select viloyat, muassasa, otkazilgan_muassasa, qabul_vaqt');
      d := replace(d, vold, vold || E'\n      and (v_mua is null or lower(btrim(coalesce(q.muassasa,''''))) = lower(v_mua))');
    END IF;
    EXECUTE d;
  END LOOP;
END $do$;
