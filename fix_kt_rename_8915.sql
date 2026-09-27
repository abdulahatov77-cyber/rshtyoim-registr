-- "RSHTYoIM" → "RSHTYOIM Toshkent viloyat filiali"
update public.infarkt_qabul set muassasa = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(muassasa) = 'RSHTYoIM';

update public.insult_qabul set muassasa = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(muassasa) = 'RSHTYoIM';

update public.infarkt_qabul set otkazilgan_muassasa = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(otkazilgan_muassasa) = 'RSHTYoIM';

update public.insult_qabul set otkazilgan_muassasa = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(otkazilgan_muassasa) = 'RSHTYoIM';

update public.transfer_log set muassasa_dan = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(muassasa_dan) = 'RSHTYoIM';

update public.transfer_log set muassasa_ga = 'RSHTYOIM Toshkent viloyat filiali'
where btrim(muassasa_ga) = 'RSHTYOIM' or btrim(muassasa_ga) = 'RSHTYoIM';
