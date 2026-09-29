"""geoBoundaries tuman nomlari -> o'zbekcha rasmiy nom (lotin alifbosi)."""

TUMAN_NOMLARI = {
    # Toshkent shahri
    'Bektemir': 'Bektemir', 'Sergeli': 'Sergeli', 'Chilanzar': 'Chilonzor', 'Uchtepa': 'Uchtepa',
    'Yakkasaray': 'Yakkasaroy', 'Almazar': 'Olmazor', 'Shaykhantokhur': 'Shayxontohur',
    'Yunusabad': 'Yunusobod', 'Yashnobod': 'Yashnobod', 'Mirabad': 'Mirobod', 'Mirzo Ulugbek': "Mirzo Ulug'bek",
    'Yangihayot': 'Yangihayot',
    # Namangan
    'Pap': 'Pop', 'Mingbulak': 'Mingbuloq', 'Narin': 'Norin', 'Chust': 'Chust', 'Namangan': 'Namangan',
    'Turakurgan': "To'raqo'rg'on", 'Yangikurgan': "Yangiqo'rg'on", 'Kasansay': 'Kosonsoy',
    'Namangan city': 'Namangan shahri', 'Uychi': 'Uychi', 'Chartak': 'Chortoq', 'Uchkurgan': "Uchqo'rg'on",
    # Toshkent viloyati
    'Bekabad': 'Bekobod', 'Bekabad city': 'Bekobod shahri', 'Urtachirchik': "O'rtachirchiq",
    'Kuyichirchik': 'Quyichirchiq', 'Chinaz': 'Chinoz', 'Akhangaran': 'Ohangaron', 'Buka': "Bo'ka",
    'Akkurgan': "Oqqo'rg'on", 'Pskent': 'Piskent', 'Almalik city': 'Olmaliq shahri',
    'Akhangaran city': 'Ohangaron shahri', 'Yangiyul': "Yangiyo'l", 'Yangiyul city': "Yangiyo'l shahri",
    'Zangiata': 'Zangiota', 'Tashkent': 'Toshkent tumani', 'Yukarichirchik': 'Yuqorichirchiq',
    'Parkent': 'Parkent', 'Angren city': 'Angren shahri', 'Kibray': 'Qibray', 'Bostanlik': "Bo'stonliq",
    'Chirchik city': 'Chirchiq shahri', 'Nurafshon city': 'Nurafshon shahri',
    # Farg'ona
    'Bagdad': "Bag'dod", 'Uzbekistan': "O'zbekiston", 'Besharik': 'Beshariq', 'Sokh': "So'x",
    'Fergana': "Farg'ona", 'Rishtan': 'Rishton', 'Altiarik': 'Oltiariq', 'Uchkuprik': "Uchko'prik",
    'Kuvasay city': 'Quvasoy shahri', 'Fergana city': "Farg'ona shahri", 'Kokand city': "Qo'qon shahri",
    'Furkat': 'Furqat', 'Kushtepa': "Qo'shtepa", 'Buvayda': 'Buvayda', 'Dangara': "Dang'ara",
    'Yazyavan': 'Yozyovon', 'Kuva': 'Quva', 'Tashlak': 'Toshloq', 'Margilan city': "Marg'ilon shahri",
    # Andijon
    'Andijan': 'Andijon', 'Ulugnar': 'Ulug\'nor', 'Khadjaabad': "Xo'jaobod", 'Markhamat': 'Marhamat',
    'Asaka': 'Asaka', 'Shakhrixan': 'Shahrixon', 'Boz': "Bo'z", 'Djalalkuduk': 'Jalaquduq',
    'Bulakbashi': 'Buloqboshi', 'Kurgantepa': "Qo'rg'ontepa", 'Balikchi': 'Baliqchi',
    'Khanabad city': 'Xonobod shahri', 'Altinkul': "Oltinko'l", 'Andijan city': 'Andijon shahri',
    'Izboskan': 'Izboskan', 'Paxtaabad': 'Paxtaobod',
    # Sirdaryo
    'Sardoba': 'Sardoba', 'Khavas': 'Xovos', 'Mirzaabad': 'Mirzaobod', 'Bayaut': 'Boyovut',
    'Yangiyer city': 'Yangiyer shahri', 'Gulistan city': 'Guliston shahri', 'Saykhunabad': 'Sayxunobod',
    'Gulistan': 'Guliston', 'Akaltin': 'Oqoltin', 'Sirdarya': 'Sirdaryo', 'Shirin city': 'Shirin shahri',
    # Jizzax
    'Farish': 'Forish', 'Gallyaaral': "G'allaorol", 'Yangiabad': 'Yangiobod', 'Dzhizak city': 'Jizzax shahri',
    'Bakhmal': 'Baxmal', 'Sharof Rashidov': 'Sharof Rashidov', 'Zafarabad': 'Zafarobod', 'Zarbdar': 'Zarbdor',
    'Zaamin': 'Zomin', 'Paxtakor': 'Paxtakor', 'Dustlik': "Do'stlik", 'Mirzachul': "Mirzacho'l",
    'Arnasay': 'Arnasoy',
    # Navoiy
    'Nurata': 'Nurota', 'Navoi city': 'Navoiy shahri', 'Kiziltepa': 'Qiziltepa', 'Karmana': 'Karmana',
    'Navbakhor': 'Navbahor', 'Khatirchi': 'Xatirchi', 'Uchkuduk': 'Uchquduq', 'Kanimekh': 'Konimex',
    'Tamdi': 'Tomdi', 'Zarafshan city': 'Zarafshon shahri',
    # Samarqand
    'Nurabad': 'Nurobod', 'Pakhtachi': 'Paxtachi', 'Pastdargom': "Pastdarg'om", 'Ishtikhan': 'Ishtixon',
    'Narpay': 'Narpay', 'Kattakurgan': "Kattaqo'rg'on", 'Kattakurgan city': "Kattaqo'rg'on shahri",
    'Koshrabad': "Qo'shrabot", 'Samarkand city': 'Samarqand shahri', 'Urgut': 'Urgut', 'Samarkand': 'Samarqand',
    'Taylak': 'Tayloq', 'Dzhambay': 'Jomboy', 'Payarik': 'Payariq', 'Akdarya': 'Oqdaryo', 'Bulungur': "Bulung'ur",
    # Qashqadaryo
    'Kasbi': 'Kasbi', 'Mirishkar': 'Mirishkor', 'Nishan': 'Nishon', 'Mubarek': 'Muborak', 'Kitab': 'Kitob',
    'Kamashi': 'Qamashi', 'Karshi': 'Qarshi', 'Guzar': "G'uzor", 'Dehkanabad': 'Dehqonobod', 'Kasan': 'Koson',
    'Karshi city': 'Qarshi shahri', 'Chirakchi': 'Chiroqchi', 'Yakkabag': "Yakkabog'", 'Shakhrisabz': 'Shahrisabz',
    'Shakhrisabz city': 'Shahrisabz shahri',
    # Surxondaryo
    'Termez': 'Termiz', 'Baysun': 'Boysun', 'Muzrabad': 'Muzrabot', 'Sherabad': 'Sherobod', 'Angor': 'Angor',
    'Sariasiya': 'Sariosiyo', 'Dzharkurgan': "Jarqo'rg'on", 'Termez city': 'Termiz shahri', 'Kizirik': 'Qiziriq',
    'Shurchi': "Sho'rchi", 'Kumkurgan': "Qumqo'rg'on", 'Uzun': 'Uzun', 'Altinsay': 'Oltinsoy', 'Denau': 'Denov',
    # Buxoro
    'Jondor': 'Jondor', 'Bukhara': 'Buxoro', 'Alat': 'Olot', 'Karakul': "Qorako'l", 'Karaulbazar': 'Qorovulbozor',
    'Shafirkan': 'Shofirkon', 'Ramitan': 'Romitan', 'Peshku': 'Peshku', 'Kagan': 'Kogon',
    'Kagan city': 'Kogon shahri', 'Bukhara city': 'Buxoro shahri', 'Gijduvan': "G'ijduvon", 'Vabkent': 'Vobkent',
    # Xorazm
    'Khiva': 'Xiva', 'Shavat': 'Shovot', 'Koshkupir': "Qo'shko'pir", 'Gurlen': 'Gurlan', 'Khazarasp': 'Hazorasp',
    'Khanka': 'Xonqa', 'Yangiarik': 'Yangiariq', 'Bagat': "Bog'ot", 'Urgench': 'Urganch',
    'Yangibazar': 'Yangibozor', 'Urgench city': 'Urganch shahri', 'Khiva city': 'Xiva shahri',
    # Qoraqalpog'iston
    'Karauzyak': "Qorao'zak", 'Kungrad': "Qo'ng'irot", 'Amudarya': 'Amudaryo', 'Chimbay': 'Chimboy',
    'Kanlikul': "Qanliko'l", 'Shumanay': "Shumanay", 'Khojeyli': "Xo'jayli", 'Kegeyli': 'Kegeyli',
    'Muynak': "Mo'ynoq", 'Nukus': 'Nukus', 'Takhtakupir': "Taxtako'pir", 'Nukus city': 'Nukus shahri',
    'Turtkul': "To'rtko'l", 'Ellikkala': "Ellikqal'a", 'Beruniy': 'Beruniy',
}


def uz_nom(nom):
    key = nom.replace('а', 'a')  # manbada ba'zi nomlarda kirill "а" bor
    return TUMAN_NOMLARI.get(key, key)
