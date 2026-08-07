# Hisobot jadvali strukturasi — sxemaga solishtirilgan izohlar
### 2026-08-07 · `Hisobot-jadvali-STRUKTURA.md` ga qo'shimcha

Etalon struktura fayli o'z holicha to'g'ri. Quyida uni **haqiqiy bazaga** bog'lashda chiqadigan nomuvofiqliklar. Antigravity 0-qadamda shularga duch keladi — oldindan hal qilinsa vaqt tejaladi.

---

## 1. 🔴 ENG MUHIMI — chiqish natijalari mos kelmaydi

Etalonda beshta ustun: `Sog'aygan · Yaxshilanish bilan · O'zgarishsiz · Boshqa muassasaga o'tkazilgan · O'lim`, va Nazorat ularning yig'indisi `JAMI bemor` ga teng bo'lishini talab qiladi.

Bazadagi haqiqiy qiymatlar (`insult_chiqarish.natija`, 2026-08-07):

| Qiymat | Soni | Etalondagi joyi |
|---|---|---|
| Tuzaldi | 4899 | → Sog'aygan |
| **Reabilitatsiyaga yuborildi** | **3339** | **joyi YO'Q** |
| Boshqa shifoxonaga o'tkazildi | 2544 | → Boshqa muassasaga o'tkazilgan |
| Vafot etdi | 842 | → O'lim |
| O'zgarishsiz | 736 | → O'zgarishsiz |
| (bo'sh) | 1 | — |

Ikkita muammo:

**a)** `Yaxshilanish bilan` ustuniga bazada **hech qanday qiymat mos kelmaydi** — u doim 0 bo'ladi.

**b)** `Reabilitatsiyaga yuborildi` — 3339 ta yozuv, ya'ni insultning **27%** i — beshta ustunning hech biriga tushmaydi. Natijada **Nazorat ustuni 70 qatorning hammasida `⚠` beradi**, chunki yig'indi hech qachon jamiga teng bo'lmaydi.

**Qaror kerak (klinik, men hal qila olmayman):**
1. `Reabilitatsiyaga yuborildi` → `Yaxshilanish bilan` ustuniga qo'shilsinmi? (raqam jihatidan to'g'ri chiqadi, lekin ma'nosi boshqa)
2. Yoki etalonga oltinchi ustun — `Reabilitatsiyaga yuborilgan` — qo'shilsinmi?
3. Yoki `natija` lug'ati o'zgartirilib, eski 3339 ta yozuv qayta tasniflansinmi?

`infarkt_chiqarish` da holat boshqacha bo'lishi mumkin — u yerda `chiqish_holat` **va** `natija` (ENUM) ikkalasi ham bor. 0-qadamda ikkalasining qiymatlarini ham sanab chiqish shart:

```sql
select 'infarkt.chiqish_holat' src, chiqish_holat::text val, count(*)
from infarkt_chiqarish group by 1,2
union all
select 'infarkt.natija', natija::text, count(*) from infarkt_chiqarish group by 1,2
union all
select 'insult.natija', natija::text, count(*) from insult_chiqarish group by 1,2
order by 1, 3 desc;
```

---

## 2. `Bosqich (1 / 2 / -)` — yangi ustun kerak emas

10-LUG'AT da manba `marshrut_muassasa.insult_bosqich / infarkt_royxat` deb ko'rsatilgan. Bunday jadval yo'q.

Lekin ta'rifning o'zi (`1 = MSKT bor; 2 = MSKT + angiograf`) **mavjud ustunlardan to'g'ridan-to'g'ri chiqadi**:

```sql
case
  when m.angiografiya_bor then '2'
  when m.mskt_bor         then '1'
  else '-'
end as bosqich
```

`muassasalar` jadvalida 237 ta muassasa, `mskt_bor` 71 tada, `angiografiya_bor` 35 tada, viloyat hammasida to'ldirilgan. Migratsiya shart emas.

Yonida `daraja` ustuni ham bor (`markaz(4)/filial(3)/politravma(2)/ttb(1)`) — u boshqa narsa, marshrut yo'nalishini (yuqoriga/pastga) aniqlash uchun.

---

## 3. Maydon nomlari — 10-LUG'AT dagi manbalar

| 10-LUG'AT da yozilgan | Haqiqiy nom |
|---|---|
| `keltirilish_usuli` | `murojaat_yoli` |
| `yuboruvchi_muassasa` | `yuborgan_muassasa` |
| `yonaltirilgan_muassasa` | `otkazilgan_muassasa` |
| `insult_qabul.aspects` | `insult_qabul.aspects_ball` (**GENERATED**) |
| `*_chiqarish.chiqish_holati` | infarkt: `chiqish_holat` · insult: `natija` |
| `olim_vaqti` | **mavjud emas** — migratsiya kerak |
| `marshrut_muassasa.*` | `muassasalar.*` |

---

## 4. `QAYERDAN KELGAN` — to'rt ustun mos keladi

`APP_CONFIG.MUROJAAT_YOLLARI` da aynan to'rtta qiymat bor va etalondagi ustunlarga bir-biriga mos tushadi:

| Etalon ustuni | `murojaat_yoli` qiymati |
|---|---|
| 103 tez yordam | `Tez tibbiy yordam bilan` |
| Mustaqil murojaat | `O'z murojaati bilan` |
| Boshqa muassasadan | `Boshqa muassasadan` |
| Poliklinika / OShP | `Poliklinika yo'llanmasi bilan` |

Bu yerda muammo yo'q. Faqat `murojaat_yoli` bo'sh bo'lgan yozuvlar bo'lsa, ular hech qaysi ustunga tushmaydi va Nazorat buziladi — 0-qadamda bo'sh qiymatlar sonini ham sanab chiqing.

---

## 5. Tashxis qiymatlari — normallashtirish kerak

Bazada `infarkt_turi` to'liq matn bilan saqlanadi, etalonda esa qisqartma kutiladi:

| Etalon | Bazadagi qiymat |
|---|---|
| STEMI | `O'KS ST elevatsiya bilan (STEMI)` |
| NSTEMI | `O'KS ST elevatsiyasiz (NSTEMI)` |
| AMI | `O'tkir miokard infarkti (AMI)` |

Insultda: `Ishemik insult`, `Gemorragik insult`, `TIA (Tranzitor ishemik ataka)`.

TZ 2-bo'limidagi namunada `where p.infarkt_turi = 'STEMI'` deb yozilgan — **bu hech narsa topmaydi**. `get_pq20_hisobot` dagi naqsh ishlatilsin:

```sql
case
  when infarkt_turi ilike '%nstemi%' or infarkt_turi ilike '%elevatsiyasiz%'    then 'NSTEMI'
  when infarkt_turi ilike '%stemi%'  or infarkt_turi ilike '%elevatsiya bilan%' then 'STEMI'
  when infarkt_turi ilike '%miokard%'                                           then 'AMI'
  else 'BOSHQA'
end
```

**Diqqat:** 10-LUG'AT da "Beqaror stenokardiya (UA) NSTEMI ga qo'shilgan" deyilgan. Bu tashxis 2026-07 da ro'yxatdan olib tashlangan — eski yozuvlarda qolgan bo'lsa, yuqoridagi `case` uni `BOSHQA` ga tashlaydi. 0-qadamda tekshirilsin.

---

## 6. `O'lim <=24 / >24 soat` — retrospektiv ishlamaydi

`olim_vaqti` ustuni yo'q. Qo'shilganidan keyin ham **~18 000 ta mavjud yozuvda bo'sh** qoladi.

Ya'ni bu ikki ustun faqat migratsiyadan keyingi yozuvlar uchun to'ladi. Eski davr tanlanganda ikkalasi 0 bo'ladi, `O'LIM JAMI` esa (formula bo'yicha ularning yig'indisi) ham 0 chiqadi — holbuki `Vafot etdi` 842 ta.

**Yechim:** `O'LIM JAMI` ni `AI+AJ` formulasidan emas, `natija = 'Vafot etdi'` sanog'idan olish; `<=24` / `>24` ustunlari esa `olim_vaqti` bor yozuvlar uchun to'ldirilib, qolgani `aniqlanmagan` guruhiga tushsin. Aks holda letallik ko'rsatkichi noto'g'ri chiqadi.

---

## 7. Mayda

- **`mRS 0-2`** — manba bor: `insult_chiqarish.mrs_daraja`. Yangi ustun qo'shish shart emas.
- **`NIHSS baholangan`** — `insult_qabul.nihss_qabul is not null`.
- **`KT/MSKT angiografiya`** — `insult_qabul.mskt_angiografiya = 'Ha'`.
- **`MSKT qilingan`** — `insult_qabul.mskt` da to'rt xil matn bor (qisqa va uzun tire bilan). `mskt ~* '^\s*ha'` ishlatilsin, `= 'Ha'` emas.
- **`Ro'yxatdan tashqari`** — `otkazilgan_muassasa` qiymati `muassasalar.nomi` da topilmasa. Alohida ustun kerak emas, `left join ... where m.id is null` yetadi.
- **6-VILOYATLARARO matritsasi** — `*_chiqarish` da `viloyat` faqat insultda bor, infarktda yo'q. Manzil viloyatini `muassasalar` jadvalidan olish kerak (`join on nomi = otkazilgan_muassasa`).
