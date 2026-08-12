-- =====================================================================
-- MUASSASA QO'SHISH / O'CHIRISH — 2026-08-12
--
-- "Muassasa imkoniyati" sahifasidan yangi muassasa qo'shish va keraksizini
-- o'chirish. Faqat super_admin.
--
-- MUHIM — bu loyihada muassasa ro'yxati IKKI joyda yashaydi:
--   1) public.muassasalar          — imkoniyat/daraja jadvali, hisobot RPC'lari
--                                    shu jadvalga nomi bo'yicha join qiladi
--   2) APP_CONFIG.MUASSASALAR      — statik JS config, ro'yxatdan o'tish va
--      + public.muassasa_overrides   bemor formalaridagi ochiluvchi ro'yxat
--
-- Shuning uchun QO'SHISH ikkalasiga ham yozadi, O'CHIRISH ikkalasidan ham
-- oladi. Faqat bittasiga yozilsa — muassasa formada ko'rinib, hisobotda
-- yo'qoladi (yoki aksincha).
--
-- O'CHIRISH XAVFSIZLIGI: bemor yozuvlari muassasaga NOMI bo'yicha bog'langan
-- (FK yo'q). Yozuvi bor muassasa o'chirilsa, bemorlar "bosqichsiz" qolib
-- hisobotlar buziladi. Shuning uchun:
--   • yozuvi/foydalanuvchisi bo'lgan muassasani O'CHIRIB BO'LMAYDI
--   • uning o'rniga YASHIRISH bor — yangi formalarda chiqmaydi, lekin
--     tarixiy ma'lumot va hisobotlar butun qoladi
-- =====================================================================


-- ============ 1. MUASSASA ISHLATILGANMI ============
-- O'chirishdan oldin tekshirish uchun. Interfeys shu sonlarni ko'rsatadi.
create or replace function public.get_muassasa_ishlatilgan(p_nomi text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'infarkt',    (select count(*) from public.infarkt_qabul where muassasa = p_nomi),
    'insult',     (select count(*) from public.insult_qabul  where muassasa = p_nomi),
    'otkazilgan', (select count(*) from public.infarkt_qabul where otkazilgan_muassasa = p_nomi)
                + (select count(*) from public.insult_qabul  where otkazilgan_muassasa = p_nomi),
    'profil',     (select count(*) from public.profiles      where muassasa = p_nomi)
  );
$$;

grant execute on function public.get_muassasa_ishlatilgan(text) to authenticated;


-- ============ 2. QO'SHISH ============
-- Ikkala manbaga ham yozadi: muassasalar + muassasa_overrides('add').
-- Nomi bo'sh joylardan tozalanadi — "Andijon TTB " va "Andijon TTB" ikki
-- xil yozuv bo'lib qolmasligi uchun.
create or replace function public.muassasa_qosh(
  p_nomi    text,
  p_viloyat text,
  p_daraja  text    default null,
  p_mskt    boolean default false,
  p_angio   boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nomi text := btrim(coalesce(p_nomi, ''));
  v_vil  text := btrim(coalesce(p_viloyat, ''));
  v_id   bigint;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'super_admin' then
    raise exception 'Ruxsat yo''q: faqat super_admin muassasa qo''sha oladi';
  end if;

  if v_nomi = '' then raise exception 'Muassasa nomi bo''sh bo''lishi mumkin emas'; end if;
  if v_vil  = '' then raise exception 'Viloyat tanlanmagan'; end if;

  -- Registrga kiritilgan katta-kichik harf farqi bilan takror kelmasin
  if exists (select 1 from public.muassasalar where lower(nomi) = lower(v_nomi)) then
    raise exception 'Bunday muassasa allaqachon mavjud: %', v_nomi;
  end if;

  insert into public.muassasalar (nomi, viloyat, daraja, mskt_bor, angiografiya_bor, imkoniyat_updated_at)
  values (v_nomi, v_vil, nullif(p_daraja, ''), coalesce(p_mskt, false), coalesce(p_angio, false), now())
  returning id into v_id;

  -- Formalardagi ochiluvchi ro'yxatga ham tushsin
  delete from public.muassasa_overrides
   where lower(nomi) = lower(v_nomi) and action = 'remove';

  if not exists (select 1 from public.muassasa_overrides
                  where lower(nomi) = lower(v_nomi) and action = 'add') then
    insert into public.muassasa_overrides (viloyat, nomi, action) values (v_vil, v_nomi, 'add');
  end if;

  return v_id;
end $$;

grant execute on function public.muassasa_qosh(text, text, text, boolean, boolean) to authenticated;


-- ============ 3. O'CHIRISH ============
-- Faqat hech qayerda ishlatilmagan muassasa o'chiriladi.
create or replace function public.muassasa_ochir(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nomi text;
  v_vil  text;
  v_inf  bigint; v_ins bigint; v_otk bigint; v_prof bigint;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'super_admin' then
    raise exception 'Ruxsat yo''q: faqat super_admin muassasa o''chira oladi';
  end if;

  select nomi, viloyat into v_nomi, v_vil from public.muassasalar where id = p_id;
  if v_nomi is null then raise exception 'Muassasa topilmadi (id=%)', p_id; end if;

  select count(*) into v_inf  from public.infarkt_qabul where muassasa = v_nomi;
  select count(*) into v_ins  from public.insult_qabul  where muassasa = v_nomi;
  select count(*) into v_prof from public.profiles      where muassasa = v_nomi;
  select (select count(*) from public.infarkt_qabul where otkazilgan_muassasa = v_nomi)
       + (select count(*) from public.insult_qabul  where otkazilgan_muassasa = v_nomi)
    into v_otk;

  if v_inf + v_ins + v_otk + v_prof > 0 then
    raise exception 'O''chirib bo''lmaydi — "%" ishlatilgan: % infarkt, % insult, % o''tkazish, % foydalanuvchi. Buning o''rniga YASHIRING: hisobotlar butun qoladi, yangi formalarda chiqmaydi.',
      v_nomi, v_inf, v_ins, v_otk, v_prof;
  end if;

  delete from public.muassasalar where id = p_id;

  -- Statik config'da bo'lsa ham formada chiqmasin
  delete from public.muassasa_overrides where lower(nomi) = lower(v_nomi) and action = 'add';
  if not exists (select 1 from public.muassasa_overrides
                  where lower(nomi) = lower(v_nomi) and action = 'remove') then
    insert into public.muassasa_overrides (viloyat, nomi, action) values (v_vil, v_nomi, 'remove');
  end if;

  return v_nomi;
end $$;

grant execute on function public.muassasa_ochir(bigint) to authenticated;


-- ============ 4. YASHIRISH / QAYTARISH ============
-- Yozuvi bor muassasani "iste'moldan chiqarish". muassasalar jadvalidagi
-- qator TEGILMAYDI — hisobot join'lari va bosqich hisobi ishlayveradi.
-- Faqat formalardagi ochiluvchi ro'yxatdan olinadi.
create or replace function public.muassasa_yashir(p_id bigint, p_yashir boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nomi text;
  v_vil  text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'super_admin' then
    raise exception 'Ruxsat yo''q: faqat super_admin o''zgartira oladi';
  end if;

  select nomi, viloyat into v_nomi, v_vil from public.muassasalar where id = p_id;
  if v_nomi is null then raise exception 'Muassasa topilmadi (id=%)', p_id; end if;

  if p_yashir then
    delete from public.muassasa_overrides where lower(nomi) = lower(v_nomi) and action = 'add';
    if not exists (select 1 from public.muassasa_overrides
                    where lower(nomi) = lower(v_nomi) and action = 'remove') then
      insert into public.muassasa_overrides (viloyat, nomi, action) values (v_vil, v_nomi, 'remove');
    end if;
  else
    delete from public.muassasa_overrides where lower(nomi) = lower(v_nomi) and action = 'remove';
    if not exists (select 1 from public.muassasa_overrides
                    where lower(nomi) = lower(v_nomi) and action = 'add') then
      insert into public.muassasa_overrides (viloyat, nomi, action) values (v_vil, v_nomi, 'add');
    end if;
  end if;

  return v_nomi;
end $$;

grant execute on function public.muassasa_yashir(bigint, boolean) to authenticated;


-- ============ 5. POSTGREST KESHINI YANGILASH ============
-- Yangi funksiya darhol RPC orqali chaqirilishi uchun. Busiz brauzerda
-- "Could not find the function ... in the schema cache" xatosi chiqishi mumkin.
notify pgrst, 'reload schema';


-- ============ 6. TEKSHIRUV ============
select p.proname as funksiya,
       p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as argumentlar
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('muassasa_qosh', 'muassasa_ochir', 'muassasa_yashir', 'get_muassasa_ishlatilgan')
order by p.proname;
