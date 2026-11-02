# UYSOT B2B

Next.js ilova Render'da ishlaydi, barcha ma'lumot Neon PostgreSQL'da saqlanadi.

## Ma'lumot qayerda saqlanadi

- Barcha doimiy ma'lumot faqat Neon'da. Render diski har deployda tozalanadi, shuning uchun unga hech narsa yozilmaydi.
- Deploy bazaga tegmaydi. Migratsiyalar faqat qo'shadi va ilova yangi versiyada birinchi so'rovda ularni bir marta bajaradi.
- Bazaga yozish xato bersa, API xato qaytaradi: ilova "saqlandi" deb yolg'on aytmaydi.
- Production'da `DATABASE_URL` bo'lmasa, ilova 503 qaytaradi. Xotiradagi zaxira faqat lokal rivojlantirish va testlar uchun.
- `npm test` har doim xotirada ishlaydi va haqiqiy bazaga ulanmaydi.

## Environment

Render dashboard'da qo'ying (`render.yaml`da secret saqlanmaydi):

| O'zgaruvchi | Vazifasi |
|---|---|
| `DATABASE_URL` | Neon ulanish manzili (majburiy) |
| `CRON_SECRET` | Tashqaridan sync chaqirish kaliti (ixtiyoriy) |
| `GEMINI_API_KEY`, `GROQ_API_KEY` | AI yordamchi (ixtiyoriy) |

GitHub Actions haftalik sinxronizatsiyasi uchun repo secret: `DATABASE_URL`.

## Buyruqlar

Hammasi `web/` papkasidan ishlaydi va `DATABASE_URL` yoki `web/.env.local`dan foydalanadi.

| Buyruq | Vazifasi |
|---|---|
| `npm run db:backup` | Bazaning JSON zaxirasi (`web/db-backups/`, git'ga kirmaydi) |
| `npm run db:migrate` | Migratsiyani qo'lda bajarish |
| `npm run db:set-password -- <login>` | Foydalanuvchiga yangi tasodifiy parol |
| `npm run db:import-domtut` | UYSOT obyektlari va kontaktlarini JSON'dan bazaga yozish |
| `npm run db:sync-dshk` | DSHK obyektlarini yangilash (`-- --dry-run` bilan faqat ko'rsatadi) |
| `npm run db:sync-domtut` | Domtut'ni skanerlab bazaga yozish (Python kerak) |
| `npm run db:cleanup-test-data` | Eski test yozuvlarini ko'rsatadi; `-- --apply` bilan zaxira olib o'chiradi |
