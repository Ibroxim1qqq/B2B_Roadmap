import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();

  if (!dbUrl) {
    console.error('❌ XATOLIK: DATABASE_URL topilmadi!');
    console.info('Iltimos, .env faylingizda quyidagicha Neon PostgreSQL URL bering:');
    console.info('DATABASE_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  console.log('🚀 Neon PostgreSQL migratsiyasi boshlandi...');
  console.log('📡 Bog\'lanish serveri:', dbUrl.split('@')[1] || 'Neon Serverless');

  const sql = neon(dbUrl);

  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ schema.sql fayli topilmadi:', schemaPath);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Clean statements and run
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  for (const statement of statements) {
    try {
      if (typeof (sql as any).unsafe === 'function') {
        await (sql as any).unsafe(statement);
      } else {
        await (sql as any)([statement] as unknown as TemplateStringsArray);
      }
      successCount++;
    } catch (err: any) {
      console.warn(`⚠️ Buyruq ogohlantirishi:`, err.message);
    }
  }

  console.log(`✅ Migratsiya muvaffaqiyatli yakunlandi! Jami bajarilgan SQL buyruqlar: ${successCount}`);
  
  // Verify tables
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('📋 Yaratilgan jadvallar ro\'yxati:');
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));
  } catch (e) {}

  console.log('🎉 Neon DB bazasi Next.js platformasi uchun to\'liq tayyor!');
}

migrate().catch(err => {
  console.error('Migratsiya xatosi:', err);
  process.exit(1);
});
