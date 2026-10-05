-- Ma'lumot tuzatish (2026-10-05, bazaga qo'llangan): qabul holati chiqarish varaqasiga zid
-- bo'lgan 17 bemorning holati varaqadagi natija bo'yicha tuzatildi (foydalanuvchi qarori:
-- chiqarish varaqasi — asosiy manba). Mantiq bemor_chiqarish RPC bilan bir xil:
-- o'tkazilmagan bo'lsa otkazilgan_muassasa tozalanadi.
--
-- Eski -> yangi holat (qaytarish kerak bo'lsa):
-- infarkt 3247                    Shomuratov Murodbek        chiqarildi -> otkazildi (Шох Мед клиникаси)
-- infarkt KOSO-10208              Tursunov Ibroxim           otkazildi(Kosonsoy TTB) -> chiqarildi
-- infarkt RSH-NAVO-260630-670190  Erniezov Murod             vafot -> chiqarildi
-- infarkt RSH-NAVO-260727-850374  Razakova Saida             vafot -> chiqarildi
-- infarkt URGA-7255               Sabirova Gavxarjon         vafot -> chiqarildi
-- insult  4138                    Toshtemiroa Xasanboj       otkazildi(Farg'ona viloyat ko'p tarmoqli tibbiyot markazi) -> chiqarildi
-- insult  5269                    Nazirov Xabiljon           otkazildi(Farg'ona TTB) -> chiqarildi
-- insult  5528                    Shokirov Iskandar          otkazildi(Oltiariq TTB) -> chiqarildi
-- insult  ISHT-14759              Primov Baxtiyor            chiqarildi -> vafot
-- insult  KT-13973                Xamidova Shirmonxon        otkazildi(Namangan ShTB) -> vafot
-- insult  RSH-JIZZ-260812-893899  Kurbonova Xolbuvi          chiqarildi -> vafot
-- insult  RSH-NAVO-1281/152       Qodirov Axmat              vafot -> chiqarildi
-- insult  RSH-NAVO-13490/1430     Mazitova Gulnisa           chiqarildi -> vafot
-- insult  RSH-NAVO-3703           Ruzikulov Furkat           chiqarildi -> vafot
-- insult  RSH-NAVO-5197           Elmuratov Artur            chiqarildi -> vafot
-- insult  RSH-QASH-260729-17951   Dusmuratova Raxima         chiqarildi -> vafot
-- insult  ULUG-KT-282             Akbarov Asror              vafot -> chiqarildi
with z as (
 select 'infarkt' t, q.id, coalesce(nullif(c.chiqish_holat,''), c.natija::text) nat, nullif(btrim(c.boshqa_shifoxona),'') bsh, q.status, q.otkazilgan_muassasa om
 from public.infarkt_qabul q join public.infarkt_chiqarish c on c.infarkt_qabul_id=q.id
 union all
 select 'insult', q.id, c.natija, nullif(btrim(c.boshqa_shifoxona),''), q.status, q.otkazilgan_muassasa
 from public.insult_qabul q join public.insult_chiqarish c on c.insult_qabul_id=q.id),
y as (select *, case when lower(nat)='vafot etdi' then 'vafot'
                     when lower(translate(nat,'‘’ʻʼ',repeat(chr(39),4)))='boshqa shifoxonaga o''tkazildi' then 'otkazildi'
                     else 'chiqarildi' end yangi
      from z where nullif(nat,'') is not null),
f as (select * from y where status <> yangi),
u1 as (update public.infarkt_qabul q set status=f.yangi,
         otkazilgan_muassasa = case when f.yangi='otkazildi' then coalesce(nullif(f.om,''), f.bsh) else null end
       from f where f.t='infarkt' and q.id=f.id returning q.id)
update public.insult_qabul q set status=f.yangi,
  otkazilgan_muassasa = case when f.yangi='otkazildi' then coalesce(nullif(f.om,''), f.bsh) else null end
from f where f.t='insult' and q.id=f.id;
