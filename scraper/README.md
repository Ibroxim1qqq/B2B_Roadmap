# B2B Samarqand Construction Map - Data Collector

Ushbu dastur O'zbekiston Respublikasi Qurilish Vazirligi (DSHK) tizimidan Samarqand viloyatidagi qurilish obyektlari ma'lumotlarini yig'ib, Google Sheets ga yozadi.

## Setup (O'rnatish)

### 1. Google Cloud Project va Service Account yaratish

1. [Google Cloud Console](https://console.cloud.google.com/) ga kiring.
2. Yangi loyiha (Project) yarating.
3. **APIs & Services > Library** bo'limidan "Google Sheets API" va "Google Drive API" ni yoqing.
4. **APIs & Services > Credentials** bo'limiga o'ting.
5. **Create Credentials > Service Account** ni tanlang.
6. Service Account ga nom bering (masalan: `scraper-bot`) va yarating.
7. Yaratilgan Service Account ning ustiga bosing, **Keys** tabiga o'ting.
8. **Add Key > Create new key** qiling. JSON formatni tanlang va yuklab oling.
9. Yuklab olingan faylni `credentials.json` nomi bilan ushbu loyiha (`scraper`) papkasiga saqlang.

### 2. Google Sheet ga ruxsat berish

1. Yangi Google Sheet yarating yoki boridan foydalaning.
2. Yuqori o'ng burchakdagi **Share (Поделиться)** tugmasini bosing.
3. Yaratgan Service Account imail'ingizni (masalan: `scraper-bot@your-project-id.iam.gserviceaccount.com`) kiritib, **Editor** huquqini bering.
4. URL dagi Sheet ID ni nusxalab oling: `https://docs.google.com/spreadsheets/d/<SHEET_ID_SHU_YERDA>/edit`

### 3. Dasturni ishga tushirish

Terminalda `scraper` papkasiga kiring:
```bash
cd "d:\b2b Samarqand\scraper"
```

Kutubxonalarni o'rnating:
```bash
pip install -r requirements.txt
```

`.env.example` faylidan `.env` nusxasini yarating va o'zgartiring:
```bash
copy .env.example .env
```
`.env` faylini ochib, o'zingizning `GOOGLE_SHEETS_ID` laringizni yozing.

## Foydalanish (Command examples)

Faqat API dan ma'lumot olishni sinab ko'rish (Sheet'ga yozmaydi):
```bash
python collector.py --dry-run --verbose
```

Faqat dastlabki 5 ta obyektni olish (Tezkor sinov uchun):
```bash
python collector.py --limit 5
```

Terminalga JSON formatida chiqarish:
```bash
python collector.py --limit 2 --json
```

Asosiy ishga tushirish (Hamma ma'lumotlarni yig'ib Sheet'ga yozadi):
```bash
python collector.py
```
