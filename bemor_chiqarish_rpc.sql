-- =====================================================================
-- SHIFOKORGA FAQAT CHIQARISH RUXSATI (tahrirlash emas)
-- =====================================================================
-- HOLAT:
--   infarkt_update_hardened / insult_update_hardened siyosatlari
--   qabul_can_update(viloyat) ga tayanadi. Unda role='user' (shifokor)
--   "else false" ga tushadi — bu ATAYLAB shunday: shifokor bemor
--   yozuvini tahrirlay olmasligi kerak.
--
--   Lekin shu bilan birga BEMORNI CHIQARISH ham bloklanib qolgan, chunki
--   chiqarish status va otkazilgan_muassasa ustunlarini yangilaydi.
--   Shifokorga tushunarsiz xato chiqadi:
--       "Cannot coerce the result to a single JSON object"
--
-- YECHIM:
--   Siyosat O'ZGARMAYDI — shifokor jadvalni to'g'ridan-to'g'ri
--   o'zgartira olmaydi, ya'ni tahrirlash yopiq qoladi.
--   Uning o'rniga alohida SECURITY DEFINER funksiya beriladi: u FAQAT
--   ikkita ustunni (status, otkazilgan_muassasa) yangilaydi va chiqarish
--   varaqasini yozadi. Boshqa hech qanday maydonga tegmaydi.
--
--   Ya'ni shifokor "chiqarish" amalini bajara oladi, "tahrirlash" ni emas.
--
-- TARTIB: butun faylni Supabase SQL Editor da bir marta ishga tushiring
-- =====================================================================

CREATE OR REPLACE FUNCTION public.bemor_chiqarish(
  p_turi                 text,     -- 'infarkt' | 'insult'
  p_kt_no                text,
  p_status               text,     -- 'chiqarildi' | 'vafot' | 'otkazildi'
  p_otkazilgan_muassasa  text DEFAULT NULL,
  p_chiqarish            jsonb DEFAULT NULL   -- null bo'lsa varaqa yozilmaydi
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_rol      text;
  v_viloyat  text;
  v_rahbar   boolean;
  v_qabul    text;    -- infarkt_qabul | insult_qabul
  v_chiq     text;    -- infarkt_chiqarish | insult_chiqarish
  v_id       uuid;    -- infarkt_qabul.id / insult_qabul.id — UUID, bigint EMAS
  v_row_vil  text;
  v_payload  jsonb;
  v_cols     text;
  v_natija   jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tizimga kirilmagan';
  END IF;

  IF p_turi NOT IN ('infarkt', 'insult') THEN
    RAISE EXCEPTION 'Registr turi noto''g''ri: %', p_turi;
  END IF;

  -- Faqat chiqarishga tegishli holatlar. Boshqa qiymat berilsa — rad etamiz,
  -- aks holda bu funksiya orqali status ni ixtiyoriy o'zgartirish mumkin bo'lardi.
  IF p_status NOT IN ('chiqarildi', 'vafot', 'otkazildi') THEN
    RAISE EXCEPTION 'Holat noto''g''ri: %', p_status;
  END IF;

  SELECT p.role, p.viloyat, coalesce(to_jsonb(p) ->> 'real_role', '') = 'rahbar'
    INTO v_rol, v_viloyat, v_rahbar
    FROM public.profiles p WHERE p.id = auth.uid();

  IF v_rahbar THEN
    RAISE EXCEPTION 'Rahbar rolida ma''lumot o''zgartirilmaydi';
  END IF;

  v_qabul := p_turi || '_qabul';
  v_chiq  := p_turi || '_chiqarish';

  -- Bemorni topamiz. super_admin dan boshqasi faqat o'z viloyatida.
  -- kt_no noyob emas — eng oxirgi yozuv olinadi.
  EXECUTE format(
    'SELECT id, viloyat FROM public.%I
      WHERE kt_no = $1 AND ($2 = ''super_admin'' OR viloyat = $3)
      ORDER BY created_at DESC NULLS LAST LIMIT 1', v_qabul)
    INTO v_id, v_row_vil
    USING p_kt_no, coalesce(v_rol, ''), coalesce(v_viloyat, '');

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Bemor topilmadi yoki sizning viloyatingizga tegishli emas: %', p_kt_no;
  END IF;

  -- FAQAT shu ikkita ustun yangilanadi
  EXECUTE format(
    'UPDATE public.%I SET status = $1, otkazilgan_muassasa = $2
      WHERE id = $3 RETURNING to_jsonb(%I.*)', v_qabul, v_qabul)
    INTO v_natija
    USING p_status, p_otkazilgan_muassasa, v_id;

  -- Chiqarish varaqasi (ixtiyoriy). Bitta bemorda bitta varaqa.
  IF p_chiqarish IS NOT NULL AND p_chiqarish <> '{}'::jsonb THEN
    v_payload := p_chiqarish || jsonb_build_object('kt_no', p_kt_no);

    EXECUTE format('DELETE FROM public.%I WHERE kt_no = $1', v_chiq) USING p_kt_no;

    -- Faqat jadvalda haqiqatan mavjud ustunlarni yozamiz (id dan tashqari)
    SELECT string_agg(quote_ident(c.column_name), ', ')
      INTO v_cols
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = v_chiq
       AND c.column_name <> 'id'
       AND v_payload ? c.column_name;

    IF v_cols IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(null::public.%I, $1)',
        v_chiq, v_cols, v_cols, v_chiq) USING v_payload;
    END IF;
  END IF;

  RETURN v_natija;
END $fn$;

REVOKE ALL ON FUNCTION public.bemor_chiqarish(text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.bemor_chiqarish(text, text, text, text, jsonb) TO authenticated;


-- ============ TEKSHIRUV ============
SELECT to_regprocedure('public.bemor_chiqarish(text,text,text,text,jsonb)') AS funksiya;
