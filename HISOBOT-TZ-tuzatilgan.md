# TEXNIK TOPSHIRIQ — Kengaytirilgan hisobot moduli
## rshtyoim-registr platformasi (Supabase + vanilla JS)

**Maqsad:** platformadan viloyat → muassasa kesimida to'liq hisobot olish. Uch xil ko'rinish: (1) asosiy hisobot jadvali, (2) marshrut matritsasi, (3) klinik kaskad (voronka). Natija ekranda ko'rinadi va 10 varaqli Excel faylga eksport qilinadi.

**Etalon fayl:** `Insult-Infarkt-hisobot-jadvali.xlsx` — varaqlar tuzilishi, ustun nomlari va tartibi shu fayldan AYNAN olinadi.

> **Bu — 2026-08-07 da tuzatilgan variant.** Asl TZ dagi yettita joy haqiqiy sxemaga to'g'ri kelmasdi va ish o'rtasida to'xtardi. Tuzatishlar sabab bilan birga o'z joyida `⚠️ TUZATILDI` belgisi ostida yozilgan.

---

## 0-QADAM (MAJBURIY) — sxemani tekshirish

Kod yozishdan OLDIN quyidagi so'rovni bajarib, natijani ko'rsat.

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('infarkt_qabul','insult_qabul',
                     'infarkt_chiqarish','insult_chiqarish',
                     'dinamika_muolajalar','muassasalar')
order by table_name, ordinal_position;
```

Lug'at maydonlarining haqiqiy qiymatlari:

```sql
select 'infarkt.muolaja_turi' src, muolaja_turi val, count(*) from infarkt_qabul group by 1,2
union all select 'insult.muolaja_turi', muolaja_turi, count(*) from insult_qabul group by 1,2
union all select 'dinamika.muolaja', muolaja_turi, count(*) from dinamika_muolajalar group by 1,2
union all select 'insult.mskt', mskt, count(*) from insult_qabul group by 1,2
order by 1, 3 desc;
```

### Quyidagilar 2026-08-07 da tekshirilgan — baribir qayta tasdiqla

| Mantiqiy maydon | Haqiqiy nom | Izoh |
|---|---|---|
| Chiqish holati (infarkt) | `infarkt_chiqarish.chiqish_holat` **va** `.natija` | ikkalasi ham bor, `natija` ENUM (`natija_enum`) |
| Chiqish holati (insult) | `insult_chiqarish.natija` | `chiqish_holat` **YO'Q** — loglardagi 32 ta xato shundan |
| O'lim vaqti | **yo'q** | migratsiya kerak; 5-bo'limga qara |
| Chiqish sanasi | `*_chiqarish.chiqish_sana` | |
| Yuboruvchi muassasa | `*_qabul.yuborgan_muassasa` | mavjud |
| Yo'naltirilgan muassasa | `*_qabul.otkazilgan_muassasa` | mavjud |
| Keltirilish usuli | `*_qabul.murojaat_yoli` | mavjud |
| ASPECTS | `insult_qabul.aspects_ball` | **GENERATED** ustun, `aspects` emas |
| Okklyuziya segmenti | `insult_qabul.okklyuziya_segmenti` | 31.07.2026 da qo'shilgan |
| mRS (chiqishda) | `insult_chiqarish.mrs_daraja` | **mavjud** — yangi ustun qo'shma |
| Muassasa darajasi | `muassasalar.daraja` / `.daraja_raqam` | `markaz(4)/filial(3)/politravma(2)/ttb(1)` |
| Muassasa imkoniyati | `muassasalar.mskt_bor`, `.angiografiya_bor` | 237 muassasa, viloyat to'liq |
| O'tkazish zanjiri | `transfer_log` | `kt_no, muassasa_dan, muassasa_ga, sana, vaqt` |

> ⚠️ **TUZATILDI:** asl TZ da `marshrut_muassasa` jadvali va uning `bosqich_matn` ustuni ishlatilgan edi. **Bunday jadval bazada yo'q.** Uning o'rnini `muassasalar` jadvali va `daraja` ustuni bosadi.

**Muhim:** hech qanday maydon nomini taxmin qilib yozma. Yo'q maydonni "bor" deb hisoblab kod yozish taqiqlanadi — yo'q bo'lsa 5-bo'limdagi migratsiyaga qo'sh.

---

## 1. SANASH QOIDALARI (biznes-mantiq)

### 1.1 Umumiy
- **Davr filtri** — `qabul_vaqt` bo'yicha, UTC+5 da: `qabul_vaqt >= p_from and qabul_vaqt < p_to + interval '1 day'`. `qabul_vaqt` ni indeks ishlashi uchun XOM holda filtrla; `(qabul_vaqt at time zone ...)::date` ko'rinishida YOZMA.
- **Bemor birligi** — barcha ustunlarda AMALIYOT SONI emas, BEMORLAR SONI sanaladi. Bir bemorga ikki stent qo'yilgan bo'lsa ham u 1 ta.
- **Nozologiya** — normallashtirilgan 3 qiymat: infarkt `STEMI / NSTEMI / AMI`, insult `Ishemik / Gemorragik / TIA`. Boshqa qiymat chiqsa — `Noma'lum` guruhiga tashla va logga yoz, jimgina yashirma.
- **Muolajalar** — bemorning BARCHA muolajalari hisobga olinadi: `*_qabul.muolaja_turi` + `*_qabul.dinamika_muolaja_turi` + `dinamika_muolajalar` dagi barcha yozuvlar + vaqt maydonlari (`pci_vaqt`, `tlt_vaqt`, `trombolizis_vaqti`, `trombektomiya_vaqti`).

### 1.2 Infarkt
- **TLT** — trombolizis qilingan VA keyin PCI qilinmagan bemor.
- **Qutqaruvchi PCI** — trombolizis qilingan VA keyin PCI/stent qilingan bemor. Stentlash ustuniga QAYTA sanalmaydi.
- **Faqat medikamentoz** — hech qanday invaziv aralashuv (KAG, TLBAP, stent, AKSH) va TLT bo'lmagan bemor.
- **Reperfuziya jami** = stentlash + TLT + qutqaruvchi PCI. **KAG diagnostik tekshiruv, reperfuziya emas.**

### 1.3 Insult
- **MSKT va MSKT-angiografiya — TEKSHIRUV**, "amaliyot o'tkazilgan" ga KIRMAYDI.
- **Reperfuziya jami** = TLT + trombektomiya + bridging (ikkalasi). Uchtasi o'zaro istisno ustun.
- **Ishemikda reperfuziya %** — maxraj JAMI emas, faqat **ishemik** bemorlar.

### 1.4 Chiqish
- Besh holat + o'lim, yig'indisi qabul soniga teng: `sog'aygan + yaxshilanish + o'zgarishsiz + boshqa muassasaga o'tkazilgan + o'lim = JAMI`.
- O'lim ikkiga bo'linadi: `olim_vaqti - qabul_vaqt <= 24 soat` va `> 24 soat`.
  > ⚠️ **TUZATILDI:** `olim_vaqti` ustuni hozir yo'q va migratsiyadan keyin ham **18 000 ta mavjud yozuvda bo'sh** qoladi. Ya'ni bu ko'rsatkich **retrospektiv ishlamaydi** — faqat migratsiyadan keyingi yozuvlar uchun. Ekranda va Excelda "faqat DD.MM.YYYY dan keyingi yozuvlar" degan izoh chiqarilsin, aks holda hisobot noto'g'ri talqin qilinadi.
- Chiqish yozuvi yo'q bemor (hali statsionarda) alohida `ochiq_holat` maydonida qaytariladi.

---

## 2. RPC 1-2 — asosiy hisobot jadvali

Ikki alohida funksiya.

> ⚠️ **TUZATILDI — eng muhim o'zgarish.** Asl TZ da `SECURITY INVOKER` talab qilingan edi ("RLS ishlashi uchun"), 6-bo'limda esa 300 ms. **Bu ikkisi bir vaqtda mumkin emas.**
>
> 2026-08-07 da tekshirildi: `get_pq20_hisobot` aynan shu sababdan `canceling statement due to statement timeout` berdi. `infarkt_qabul` + `insult_qabul` ~20 000 qator; `authenticated` roli uchun har qatorga RLS sharti qo'llanadi va Supabase chegarasi ~8 soniya. `get_marshrut_*` da ham xuddi shunday bo'ldi. Ikkalasi ham `security definer` ga o'tkazilib hal qilindi.
>
> **Shuning uchun:** barcha yangi RPC — `SECURITY DEFINER` + `SET search_path = public`, kirish nazorati esa funksiya ICHIDA ochiq tekshiriladi. Himoya yo'qolmaydi, faqat joyi ko'chadi. Tayyor namunalar: `pq20_security_definer.sql`, `marshrut_rpc.sql`.

Har bir funksiya shu blok bilan boshlanadi:

```sql
declare
  v_role text;
  v_vil  text;
begin
  select p.role, p.viloyat into v_role, v_vil
    from public.profiles p where p.id = auth.uid();
  if v_role is null then
    raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi';
  end if;
  -- super_admin, admin, rahbar — barcha viloyatlar; qolganlar faqat o'zinikini
  if v_role not in ('super_admin', 'admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;
  return query
  ...
end
```

> ⚠️ **TUZATILDI:** asl TZ 8-bo'limda "rahbar respublika bo'yicha hammasini ko'radi" deyilgan. Lekin `infarkt_select_v2` RLS siyosatida `rahbar` **yo'q** — u yerda faqat `super_admin` va `admin` bor. Respublika ko'rinishi hozir faqat frontendda taqlid qilinadi (`supabase.js` da `Profile.get()` rahbar rolini `super_admin` ga o'giradi). `invoker` bo'lsa rahbar hisobotda deyarli hech narsa ko'rmaydi. Yuqoridagi ochiq tekshiruvda bu muammo yo'q.

```sql
create or replace function public.get_hisobot_infarkt(
  p_from date,
  p_to   date,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, daraja text,
  stemi int, nstemi int, ami int, jami int,
  kelish_103 int, kelish_mustaqil int, kelish_muassasadan int, kelish_poliklinika int,
  ekg int, exokg int, kag int, tlbap int, stent int, aksh int,
  tlt int, qutqaruvchi_pci int, medikamentoz int,
  d2e_10 int, d2b_90 int, d2n_30 int,
  yub_1bosqich int, yub_filial int, yub_bosh int, yub_royxatdan_tashqari int,
  sogaygan int, yaxshilanish int, ozgarishsiz int, otkazilgan int,
  olim_24 int, olim_24plus int, ochiq_holat int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with dyn as (
    -- ⚠️ TUZATILDI: dinamika oldindan yig'iladi. Asl TZ da har qatorga
    -- `exists (select ... from dinamika_muolajalar)` yozilgan edi — bu
    -- 20 000 qatorda sekin. get_pq20_hisobot dagi naqsh ishlatiladi.
    select d.kt_no, lower(string_agg(coalesce(d.muolaja_turi,''), ' | ')) as m
    from public.dinamika_muolajalar d
    where lower(coalesce(d.registr_turi,'')) = 'infarkt'
    group by d.kt_no
  ),
  p as (
    select q.*,
           lower(coalesce(q.muolaja_turi,'') || ' | ' ||
                 coalesce(q.dinamika_muolaja_turi,'') || ' | ' ||
                 coalesce(dn.m,'')) as mm
    from public.infarkt_qabul q
    left join dyn dn on dn.kt_no = q.kt_no
    where q.qabul_vaqt >= p_from
      and q.qabul_vaqt <  (p_to + 1)
      and (p_viloyat is null or q.viloyat = p_viloyat)
  ),
  f as (
    select p.*,
           (p.mm ~ 'kag|koronar angiografiya')                     as f_kag,
           (p.mm ~ 'stent' or p.pci_vaqt is not null)              as f_pci,
           (p.tlt_vaqt is not null or p.mm ~ 'tlt|trombolit')      as f_tlt
    from p
  )
  select
    f.viloyat,
    f.muassasa,
    coalesce(m.daraja, '-')                                          as daraja,
    count(*) filter (where f.infarkt_turi = 'STEMI')::int            as stemi,
    count(*) filter (where f.infarkt_turi = 'NSTEMI')::int           as nstemi,
    count(*) filter (where f.infarkt_turi = 'AMI')::int              as ami,
    count(*)::int                                                    as jami,
    -- ... (qolgan ustunlar shu uslubda)
    count(*) filter (where f.f_tlt and not f.f_pci)::int             as tlt,
    count(*) filter (where f.f_tlt and f.f_pci)::int                 as qutqaruvchi_pci,
    count(*) filter (where not f.f_kag and not f.f_pci
                       and not f.f_tlt)::int                         as medikamentoz,
    count(*) filter (where f.ekg_vaqti_ts - f.qabul_vaqt
                           <= interval '10 minutes')::int            as d2e_10,
    count(*) filter (where f.pci_vaqt - f.qabul_vaqt
                           <= interval '90 minutes')::int            as d2b_90
    -- ...
  from f
  left join public.muassasalar m on m.nomi = f.muassasa
  group by f.viloyat, f.muassasa, m.daraja
  order by f.viloyat, f.muassasa;
end $$;

grant execute on function public.get_hisobot_infarkt(date, date, text) to authenticated;
```

**Yuqoridagi kod — namuna, to'liq emas.** Barcha ustunlarni shu uslubda yoz. `~` shablonlarini 0-qadamda olingan HAQIQIY qiymatlar ro'yxatiga qarab tuz — lotin va kirill variantlarini, qisqa `–` va uzun `—` tirelarni, oddiy `'` va tipografik `'` apostrofni hisobga ol (bazada bir xil ma'noli qiymat 4 xil matn bilan saqlangan; `insult_qabul.mskt` da aynan shunday).

`get_hisobot_insult` — xuddi shunday, farqi:
- nozologiya: `Ishemik / Gemorragik / TIA`
- tekshiruv ustunlari: `mskt`, `mskt_angiografiya`, `aspects_ball is not null`, `nihss_qabul is not null`
- muolaja: `tlt`, `trombektomiya`, `bridging`, `gematoma_evak`, `dekompressiv`, `aneurizma`, `medikamentoz`
- vaqt: `d2ct_20`, `d2n_60`, `d2p_120`
- qo'shimcha: `mrs_0_2` (manba — `insult_chiqarish.mrs_daraja`)

---

## 3. RPC 3 — marshrut matritsasi

> ⚠️ **TUZATILDI — nom o'zgardi.** `get_marshrut_matritsa` nomi 2026-08-03 da band qilingan (imzosi: `p_bosqich, p_viloyat, p_from, p_to, p_limit`). Yangi funksiyani shu nom bilan yaratsa, ikkalasi overload bo'lib chalkashlik chiqadi. Yangi nomlar: **`get_hisobot_marshrut_matritsa`** va **`get_hisobot_marshrut_muassasa`**.

```sql
create or replace function public.get_hisobot_marshrut_matritsa(
  p_from date, p_to date,
  p_kasallik text            -- 'infarkt' | 'insult'
)
returns table (
  yuboruvchi_viloyat text, qabul_viloyat text, bemor_soni int
)
```

- Qator = bemorni yuborgan muassasaning viloyati, ustun = qabul qilgan muassasaning viloyati.
- Yo'naltirilmagan bemor uchun `qabul_viloyat = yuboruvchi_viloyat` (diagonalga tushadi).
- Yo'naltirilgan muassasa `muassasalar` da topilmasa — `qabul_viloyat = 'Boshqa / noma''lum'`.
- Bemor OXIRGI yuborilgan manzil bo'yicha BIR MARTA sanaladi.
- Manba: `otkazilgan_muassasa` va `transfer_log`. **Diqqat:** `transfer_log` 2026-08 holatiga ko'ra to'liq emas (3870 ta o'tkazishdan ~60 tasi). Asosiy manba `*_qabul.otkazilgan_muassasa` bo'lsin, `transfer_log` — aniqlashtiruvchi.

```sql
create or replace function public.get_hisobot_marshrut_muassasa(
  p_from date, p_to date, p_kasallik text, p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, daraja text, jami int,
  ozida_davolangan int, yub_1bosqich int, yub_filial int, yub_kardio int,
  yub_bosh int, yub_boshqa_viloyat int, yub_royxatdan_tashqari int,
  fokus_bemor int,          -- infarkt: STEMI ; insult: ishemik
  fokus_yetkazilgan int     -- shundan maqsadli markazga yetkazilgan
)
```

**Klinik qoida (buyruq №136, 6- va 11-bandlar):** bemor filialga faqat ikki holatda yuboriladi — (1) STEMI, KAG/stent uchun; (2) ishemik insult ASPECTS >6, trombektomiya uchun. Gemorragik yoki shakllangan o'choqli ishemik insult shu shifoxonada davolanadi va bu **kamchilik emas**. "Filialga yetgan bemor %" ni BARCHA bemorlar uchun hisoblama — faqat `fokus_bemor` maxrajida.

---

## 4. RPC 4-5 — klinik kaskad

```sql
create or replace function public.get_kaskad_infarkt(
  p_from date, p_to date, p_viloyat text default null
)
returns table (
  viloyat text, muassasa text,
  b1_stemi int,          -- STEMI bemor
  b2_oyna int,           -- <=12 soat terapevtik oynada kelgan
  b3_ekg10 int,          -- EKG <=10 daq olingan
  b4_qaror int,          -- reperfuziya qarori qabul qilingan
  b5_bajarilgan int,     -- reperfuziya BAJARILGAN
  b6_meyoriy int,        -- <=90 daq bajarilgan
  stemi_olim int
)
```

```sql
create or replace function public.get_kaskad_insult(...)
returns table (
  viloyat text, muassasa text,
  b1_ishemik int, b2_mskt int, b3_aspects int,
  b4_korsatma int,       -- ASPECTS >6 VA oynada
  b5_bajarilgan int, b6_meyoriy int,
  mrs_0_2 int
)
```

**Kaskadning asosiy qoidasi — har bosqich oldingisining ICHKI TO'PLAMI.** `b2 ⊆ b1`, `b3 ⊆ b2`, `b4 ⊆ b3`, `b5 ⊆ b4`, `b6 ⊆ b5`. Har bosqich SQL da oldingi bosqichning shartlarini ham o'z ichiga oladi — mustaqil `count(*) filter` bilan yozma.

Kaskad **barcha bemorlar uchun emas** — infarktda faqat STEMI, insultda faqat ishemik.

`stemi_olim` va `mrs_0_2` — kaskad bosqichi EMAS, alohida yakuniy baho ustuni; monotonlik tekshiruviga kirmaydi.

**Server tomonida nazorat:** har qator uchun monotonlikni tekshir; buzilgan qatorni `warning` massiviga qo'sh.

---

## 5. Migratsiya — yetishmayotgan maydonlar

```sql
-- Marshrut maydonlari (tekshirilsin — ba'zilari allaqachon bor)
alter table infarkt_qabul add column if not exists royxatdan_tashqari boolean default false;
alter table insult_qabul  add column if not exists royxatdan_tashqari boolean default false;

-- O'lim vaqti — 24 soatlik letallikni ajratish uchun
alter table infarkt_chiqarish add column if not exists olim_vaqti timestamptz;
alter table insult_chiqarish  add column if not exists olim_vaqti timestamptz;
```

> ⚠️ **TUZATILDI — quyidagilar asl TZ dan OLIB TASHLANDI:**
>
> **1. `insult_chiqarish.mrs_ball`** — u yerda allaqachon **`mrs_daraja`** bor. Yangi ustun qo'shilsa ikkita bo'sh-to'la maydon paydo bo'ladi. `mrs_daraja` dan foydalan.
>
> **2. `marshrut_muassasa.bosqich_matn`** — bunday jadval yo'q. `muassasalar.daraja` ishlatiladi (2026-08-03 da qo'shilgan).
>
> **3. `*_chiqarish` unique constraint ni `(kt_no, muassasa)` ga o'tkazish** — bu jadvallarda `muassasa` ustuni **umuman yo'q** (`insult_chiqarish` da faqat `viloyat` bor). Migratsiya bajarilmaydi.
>
> **4. Dublikat xatosi (23505) tashxisi noto'g'ri edi.** Haqiqiy sabab 2026-08-07 da topildi: `*_chiqarish` jadvallarida **DELETE siyosati yo'q** edi. Ilova varaqani saqlashda avval eskisini o'chirmoqchi bo'ladi (`supabase.js` → `chiqarishQosh`), RLS uni **jimgina** bloklaydi — xato ham qaytmaydi — keyin yangisini qo'shadi va dublikat paydo bo'ladi. `chiqarish_rls_fix.sql` bilan tuzatilgan. 51 ta xato allaqachon hal bo'lgan bo'lishi kerak — avval tekshir, keyin qo'shimcha ish qilma.

**Qoladigan alohida vazifa — `insult_chiqarish` va `infarkt_chiqarish` ustun nomlarini birxillashtirish.** Hozir mos emas (`infarkt` da `chiqish_holat`, `insult` da `natija`; bundan tashqari `boshqa_shifo` / `boshqa_shifoxona` / `boshqa_shifoxona_nomi` kabi 3 xil nusxa bor). Nomlarni tenglashtir va frontendni ham tuzat.

---

## 6. Indekslar

```sql
create index if not exists idx_infarkt_qabul_vaqt_viloyat
  on infarkt_qabul (qabul_vaqt, viloyat);
create index if not exists idx_insult_qabul_vaqt_viloyat
  on insult_qabul (qabul_vaqt, viloyat);
create index if not exists idx_dinamika_ktno
  on dinamika_muolajalar (kt_no);
```

> ⚠️ **Diqqat:** bu jadvallarda allaqachon 18 ta indeks bor (`idx_infarkt_qabul_vaqt`, `idx_infarkt_vil_vaqt`, `idx_infarkt_viloyat` va h.k.). Yangisini qo'shishdan oldin `pg_indexes` ni ko'rib chiq — takror indeks yozish tezligini sekinlashtiradi.

Har RPC uchun `explain analyze` qil. Maqsad: **300 ms dan tez**. Sekin bo'lsa `count(*) filter` larni bitta skanda birlashtir.

---

## 7. Frontend — `hisobot.js`

Mavjud `HisobotPage` obyektiga yangi karta: **"Kengaytirilgan hisobot"**. Mavjud `loadReport` / `renderReport` / `printReport` mantiqiga tegma.

- Filtr paneli: davr, viloyat (super_admin va rahbar uchun barchasi), muassasa.
- Uchta tab: **Jadval** · **Marshrut** · **Kaskad**.
- **Jadval**: ikki jadval (infarkt, insult), ustunlar Excel etalonidagi tartibda. Birinchi ustun `position: sticky`.
- **Marshrut**: yuqorida viloyatlararo matritsa (diagonal yashil fon), pastda muassasa darajasidagi taqsimot.
- **Kaskad**: gorizontal voronka, yonida bosqichlararo konversiya. Eng past o'tish qizil.
- **Eksport** — `Utils.exportXLSX` orqali 10 varaqli fayl.
- **Nazorat ustuni** — server qaytargan `warning` bo'yicha qator fonini qizil qil.

**Foiz hisoblash frontendda emas, SQL da bo'lsin.**

**Eslatma:** loyihada build jarayoni yo'q. Har o'zgartirilgan fayl uchun `index.html` dagi `?v=` raqamini **va** `APP_BUILD` ni oshirishni UNUTMA — aks holda filiallar eski keshlangan faylni oladi.

---

## 8. Rollar va xavfsizlik

> ⚠️ **TUZATILDI:** asl TZ da "barcha RPC `security invoker`" deyilgan edi. 2-bo'limdagi sababga ko'ra bu **`security definer` + funksiya ichida ochiq rol tekshiruvi** ga o'zgartirildi.

- `rahbar`: respublika bo'yicha barcha ma'lumotni ko'radi, yozmaydi — funksiya ichidagi tekshiruvda `super_admin`/`admin` bilan bir qatorda.
- `super_admin`: hammasi.
- Muassasa foydalanuvchisi: faqat o'z viloyati; `p_viloyat` parametri majburan almashtiriladi.
- Hisobotda F.I.O. va K/T raqami **ko'rsatilmaydi** — bu agregat hisobot.
- `SECURITY DEFINER` **view** yaratma (funksiya boshqa narsa). Mavjud 4 tasi Advisor'da CRITICAL — alohida vazifa. Yangi view yaratilsa `alter view ... set (security_invoker = true)` va `revoke all ... from anon` shart.

---

## 9. QABUL MEZONLARI

1. 0-qadamdagi sxema jadvali to'ldirilgan va tasdiqlangan; hech bir maydon nomi taxmin qilinmagan.
2. Beshta RPC yaratilgan, har biri `explain analyze` da 300 ms dan tez **va ilovadan chaqirilganda timeout bermaydi** (SQL Editor'dagi tezlik yetarli dalil emas — u `postgres` roli bilan ishlaydi).
3. **Nazorat 1:** `sog'aygan + yaxshilanish + o'zgarishsiz + o'tkazilgan + o'lim + ochiq_holat = jami`.
4. **Nazorat 2:** `b6 ≤ b5 ≤ b4 ≤ b3 ≤ b2 ≤ b1` — barcha qatorda.
5. **Nazorat 3:** `stent + tlt + qutqaruvchi_pci ≤ jami` va `medikamentoz + reperfuziya ≤ jami`.
6. **Nazorat 4:** respublika jamlanmasi `get_dashboard_stats` bergan bemor soni bilan ±0 mos.
7. Marshrut matritsasining qator jamlanmasi = shu viloyat bemorlari soni.
8. Excel eksporti etalon faylning tuzilishini AYNAN takrorlaydi.
9. Bo'sh davr (0 bemor) tanlanganda hech qayerda `NaN`, `Infinity` yoki `#DIV/0!` chiqmaydi.
10. Shifokor roli bilan kirilganda faqat o'z viloyati ko'rinadi — **brauzer konsolidan `p_viloyat` ga boshqa viloyat yuborib ham** tekshirilsin.
11. `rahbar` roli bilan kirilganda respublika bo'yicha hammasi ko'rinadi.

---

## 10. BAJARISH TARTIBI

Bir vaqtda bitta qadam. Har qadamdan keyin natijani ko'rsat va tasdiq ol.

1. Sxema auditi (0-qadam) — jadvalni to'ldirib tasdiqlatish.
2. Migratsiya: `olim_vaqti`, `royxatdan_tashqari` + `*_chiqarish` nomlarini birxillashtirish. **Indeks va constraint ishlarini avval `pg_indexes` / `pg_constraint` bo'yicha tekshir.**
3. `get_hisobot_infarkt` → test → `get_hisobot_insult`.
4. `get_hisobot_marshrut_muassasa` va `get_hisobot_marshrut_matritsa`.
5. `get_kaskad_infarkt` va `get_kaskad_insult` + monotonlik tekshiruvi.
6. `hisobot.js` — UI, uchta tab.
7. Excel eksport, etalon fayl bilan solishtirish.
8. Qabul mezonlarini bittalab tekshirib chiqish.

---

## 11. TEGMA

- Mavjud `get_pq20_hisobot` funksiyasini o'zgartirma — u rasmiy PQ-20 shakli uchun ishlaydi.
- Mavjud `renderReport` / `printReport` / `sendTelegramReport` mantiqiga tegma.
- `get_trend_30` va RLS siyosatlariga tegma.
- **2026-08-07 da yaratilgan `v_marshrut` view va `get_marshrut_xulosa` / `get_marshrut_matritsa` / `get_marshrut_audit` funksiyalariga tegma** — ular "Marshrut" sahifasi uchun ishlaydi va alohida hayot kechiradi.
- **`profiles` RLS siyosatlariga tegma** — 2026-08-07 da rol/viloyat/muassasa qulflari qo'yilgan (`profiles_muassasa_qulf.sql`).
- Ma'lumotni "tuzatib" yozma. Anomaliya topsang — uni `warning` da ko'rsat, bazani o'zgartirma.
