"""Har bir hudud uchun alohida xarita (marshrutsiz) yaratadi.

Xaritada faqat angiograf yoki MSKT bor, koordinatasi tasdiqlangan
muassasalar ko'rsatiladi. Fon: Yandex xaritasi (yorug').

Ishga tushirish:  python3 scripts/build-viloyat-xaritalar.py
Talab:            pip install openpyxl shapely
"""
import json
import datetime
from pathlib import Path

import openpyxl
from shapely.geometry import shape, mapping, Point

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'xaritalar' / 'data'
OUT = ROOT / 'xaritalar'

# Bazadagi hudud nomi -> (fayl nomi, geojson ADM1_EN)
# Toshkent shahri ro'yxatda birinchi: viloyat polygonidan oldin tekshiriladi.
HUDUDLAR = [
    ('Toshkent shahri', 'toshkent-shahri', 'Tashkent city'),
    ('Andijon', 'andijon', 'Andijan region'),
    ('Buxoro', 'buxoro', 'Bukhara region'),
    ("Farg'ona", 'fargona', 'Fergana region'),
    ('Jizzax', 'jizzax', 'Jizzakh region'),
    ('Namangan', 'namangan', 'Namangan region'),
    ('Navoiy', 'navoiy', 'Navoi region'),
    ('Qashqadaryo', 'qashqadaryo', 'Kashkadarya province'),
    ("Qoraqalpog'iston", 'qoraqalpogiston', 'Republic of Karakalpakstan'),
    ('Samarqand', 'samarqand', 'Samarkand region'),
    ('Sirdaryo', 'sirdaryo', 'Syrdarya region'),
    ('Surxondaryo', 'surxondaryo', 'Surkhandarya region'),
    ('Toshkent', 'toshkent-viloyati', 'Tashkent region'),
    ('Xorazm', 'xorazm', 'Khorezm region'),
]
SARLAVHA = {'Toshkent shahri': 'Toshkent shahri', "Qoraqalpog'iston": "Qoraqalpog'iston Respublikasi"}


def bor(v):
    return str(v or '').strip().lower() == 'bor'


def load_geo():
    d = json.loads((DATA / 'uzbekistan_regional.geojson').read_text(encoding='utf-8'))
    geo = {}
    for f in d['features']:
        g = shape(f['geometry']).simplify(0.003, preserve_topology=True).buffer(0)
        assert g.is_valid and not g.is_empty, f['properties']
        geo[f['properties']['ADM1_EN']] = g
    return geo


def load_rows():
    wb = openpyxl.load_workbook(DATA / 'muassasalar_bazasi_2026.xlsx', data_only=True)
    ws = wb['Respublika baza']
    head = [c.value for c in ws[1]]
    return [dict(zip(head, r)) for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]


def main():
    geo = load_geo()
    rows = load_rows()
    sana = datetime.date.today().isoformat()
    template = (ROOT / 'scripts' / 'viloyat-xarita-shablon.html').read_text(encoding='utf-8')
    hisobot, rad = [], []

    for nom, slug, en in HUDUDLAR:
        poly = geo[en]
        items = []
        for r in rows:
            if r['Viloyat'] != nom:
                continue
            ang, mskt = bor(r['Angiograf']), bor(r['MSKT'])
            if not (ang or mskt):
                continue
            if str(r['Koordinata tasdiqlangan']).strip().lower() != 'ha' or r['Latitude'] is None:
                rad.append((nom, r['Muassasa'], 'koordinata tasdiqlanmagan'))
                continue
            lat, lng = float(r['Latitude']), float(r['Longitude'])
            p = Point(lng, lat)
            # Kichik chegara xatosi uchun ~1 km bufer (soddalashtirish sababli)
            if not poly.buffer(0.01).contains(p):
                rad.append((nom, r['Muassasa'], f'viloyat chegarasidan tashqarida ({lat}, {lng})'))
                continue
            if nom == 'Toshkent' and geo['Tashkent city'].contains(p):
                rad.append((nom, r['Muassasa'], 'nuqta Toshkent shahri ichida'))
                continue
            items.append({
                'id': r['ID'], 'name': r['Muassasa'], 'muqobil_nom': r['Muqobil nom'] or '',
                'tuman': r['Tuman/Shahar'] or '', 'address': r['Manzil'] or '',
                'lat': lat, 'lng': lng, 'accuracy': r['Aniqlik'] or '',
                'angiograf': ang, 'mskt': mskt, 'bosqich': r['Bosqich'],
                'trombektomiya': bor(r['Trombektomiya']), 'embolizatsiya': bor(r['Embolizatsiya']),
                'source': r['Koordinata/uskunalar manbasi'] or '',
            })

        qoshni = [{'type': 'Feature', 'properties': {'n': k}, 'geometry': mapping(g)}
                  for k, g in geo.items() if k != en]
        html = (template
                .replace('__TITLE__', SARLAVHA.get(nom, nom + ' viloyati'))
                .replace('__VERSION__', f'{sana} · {len(items)} muassasa · {len(items)} tasdiqlangan')
                .replace('__REGION__', json.dumps(mapping(poly)))
                .replace('__OTHERS__', json.dumps({'type': 'FeatureCollection', 'features': qoshni}))
                .replace('__DATA__', json.dumps(items, ensure_ascii=False)))
        (OUT / f'{slug}-xarita.html').write_text(html, encoding='utf-8')
        (OUT / 'data' / f'{slug}-muassasalar.json').write_text(
            json.dumps(items, ensure_ascii=False, indent=1), encoding='utf-8')
        hisobot.append((nom, len(items), sum(i['angiograf'] for i in items), sum(i['mskt'] for i in items)))

    print(f"{'Hudud':<20}{'Jami':>6}{'Angio':>7}{'MSKT':>6}")
    for h in hisobot:
        print(f'{h[0]:<20}{h[1]:>6}{h[2]:>7}{h[3]:>6}')
    print('Rad etilganlar:', rad or 'yo`q')


if __name__ == '__main__':
    main()
