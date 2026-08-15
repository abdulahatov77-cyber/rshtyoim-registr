# RSHTYOIM security hardening rollout

Bu o'zgarish production bazaga to'g'ridan-to'g'ri qo'llanmaydi. Avval Supabase
development branch yoki alohida staging loyiha kerak.

## Deploy tartibi

1. Production database backup oling.
2. Development branch yarating.
3. Quyidagi migratsiyalarni tartib bilan branchda qo'llang:
   `security_hardening_2026_08.sql`,
   `security_hardening_2026_08_trigger_acl.sql`,
   `security_hardening_2026_08_report_scope.sql`,
   `security_hardening_2026_08_table_acl.sql`,
   `security_hardening_2026_08_rls_performance.sql`,
   `security_hardening_2026_08_function_search_path.sql`,
   `security_hardening_2026_08_lookup_invoker.sql`,
   `security_hardening_2026_08_account_approval.sql`,
   `security_hardening_2026_08_telegram_vault.sql`.
4. Shu commitdagi frontendni branch/staging URL bilan ishga tushiring.
5. `security_hardening_2026_08_tests.sql` katalog tekshiruvlarini bajaring.
6. Quyidagi rol testlarini real test akkauntlari bilan bajaring.
7. Supabase Security va Performance Advisors'ni qayta ishlating.
8. Faqat barcha testlar o'tgach productionga DB migration va frontendni birga chiqaring.
9. Muammo chiqsa frontendni qaytaring va `security_hardening_2026_08_rollback.sql`
   ni faqat tekshirilgan branch/staging natijasiga mos bo'lsa ishlating.

## Rol testlari

### Anon

- Dashboard va bemor jadvallarini o'qiy olmaydi.
- Hech bir public `SECURITY DEFINER` RPC'ini chaqira olmaydi.
- `multimedia` faylining eski public URL'i ishlamaydi.

### User (shifokor)

- O'z viloyati va o'z muassasasidagi bemorlarni ko'radi.
- Boshqa muassasa yoki boshqa viloyat bemorini ko'rmaydi.
- Yangi qabulni faqat o'z viloyati/muassasasiga yaratadi.
- Bemor yozuvining viloyati yoki muassasasini yangilay olmaydi.
- Vakolatli bemor faylini yuklaydi, ko'radi va signed URL 1 soat ishlaydi.

### Admin (viloyat admin)

- Faqat o'z viloyatidagi barcha muassasalarni ko'radi.
- O'z viloyatida qabul yaratadi va tahrirlaydi.
- Boshqa viloyat yozuvini ko'rmaydi yoki o'zgartirmaydi.
- Bemorning viloyatini boshqa viloyatga ko'chira olmaydi.

### Rahbar

- Respublika bo'yicha ko'rish ishlaydi.
- Insert, update va delete bloklanadi.

### Super admin

- Barcha viloyatlarni ko'radi va boshqaradi.
- Foydalanuvchi rollarini o'zgartiradi.
- `admin_delete_user` ichki super-admin tekshiruvi ishlaydi.

## Hali alohida qaror talab qiladigan masalalar

- Saytda self-registration ochiq. Foydalanuvchi ro'yxatdan o'tishda viloyat va
  muassasani o'zi tanlaydi. Tibbiy tizim uchun invite-only yoki admin approval
  oqimi tavsiya qilinadi.
- Legacy `bemor-fayllar` bucket ham public, lekin hozirgi frontend uni
  ishlatmaydi. Ichidagi fayllar aniqlanmasdan uni yopish production oqimini
  buzishi mumkin; alohida inventory va migration kerak.
- Telegram trigger funksiyalarining legacy tanalarida bot token va server kaliti
  hardcoded. Ularning `anon/authenticated` EXECUTE huquqi test migratsiyasida
  yopildi. `security_hardening_2026_08_telegram_vault.sql` source'dagi secretlarni
  olib tashlaydi, ammo production rolloutdan OLDIN eski bot tokenlari va server
  kalitini aylantirish, yangi server kalitini Vercel env hamda Supabase Vault'da
  `telegram_server_key` nomi bilan bir xil saqlash zarur.

## 2026-08-15 test branch natijasi

- Branch: `security-hardening-2026-08` (`wmbmxrwuvewkvdlcxjyw`), health
  `ACTIVE_HEALTHY`; production data ko'chirilmagan.
- To'qqizta hardening migratsiyasi branchda muvaffaqiyatli qo'llandi
  (`remote_schema` bilan branch tarixida jami 10 ta yozuv).
- Security Advisor: 98 ta topilma (1 ERROR) dan 35 ta topilma
  (0 ERROR, 26 WARN, 9 INFO) ga tushdi.
- Performance Advisor: asosiy WARN soni 27 dan 18 ga tushdi;
  multiple permissive policy 5 tadan 0 ga tushdi.
- `anon/PUBLIC` uchun executable `SECURITY DEFINER` funksiyalar: 0.
- Trigger-only funksiyalarning `anon/authenticated` EXECUTE huquqi: 0;
  7 ta trigger binding saqlangan.
- 10 ta hisobot RPC'da `admin` milliy bypassdan chiqarildi;
  `admin = o'z viloyati`, `super_admin/rahbar = respublika`.
- Signup metadata orqali `super_admin` olish yopildi. Yangi profil serverda
  `pending` yaratiladi; super-admin uni `user` roliga o'tkazmaguncha bemor RLS
  va SECURITY DEFINER hisobot RPC'lari kirishni rad etadi.
- Telegram test branchida uchta faol notify funksiya Vault'dagi
  `telegram_server_key`dan o'qiydi; source'da bot token/server key qolmadi,
  5 ta trigger binding saqlandi. Branchdagi secret faqat xavfsiz dummy qiymat.
- Lokal `/api/telegram` faqat server secret yoki tasdiqlangan
  `admin/rahbar/super_admin` chaqiruvini qabul qiladi; CORS/origin va 4096 belgi
  limiti test qilindi. `tests/telegram-api.test.js`: 5/5 test o'tdi.
- Sintetik `user`, `admin`, `super_admin` rol testlari o'tdi va fixture'lar
  testdan so'ng to'liq o'chirildi.
- Branchda bo'sh `multimedia` test fixture yaratildi: `public=false`, authorized
  storage policy 3 ta, public-read policy 0 ta. Real fayl upload/signed URL oqimi
  uchun production bemor ma'lumotlarisiz faqat strukturaviy test bajarildi.

## Production oldidan majburiy tashqi qadamlar

1. Telegram bot tokenlarini Telegram/BotFather orqali aylantiring.
2. Yangi `TELEGRAM_SERVER_KEY`ni Vercel env'da va Supabase Vault'da
   `telegram_server_key` nomi bilan bir xil qiymatda yarating.
3. Production backup oling va migratsiyalarni aynan yuqoridagi tartibda qo'llang.
4. DB hamda frontendni bir release oynasida chiqaring; rollback faylini tayyor
   tuting.
5. Deploydan keyin user/admin/super_admin, signup-pending va signed URL smoke
   testlarini productionga zarar bermaydigan test yozuvlari bilan takrorlang.
