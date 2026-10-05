import { neon } from '../node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';
import path from 'path';

function getUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }
  return 'postgresql://neondb_owner:npg_cEL2WJZwG7Ps@ep-calm-cloud-b4ltc7bt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
}

const url = getUrl();

async function main() {
  console.log('🚀 Connecting to Neon PostgreSQL...');
  const sql = neon(url);

  const [totalObj] = await sql`SELECT count(*)::int as count FROM objects`;
  const [samarqandObj] = await sql`SELECT count(*)::int as count FROM objects WHERE is_uysot = false`;
  const [uysotObj] = await sql`SELECT count(*)::int as count FROM objects WHERE is_uysot = true`;
  const [users] = await sql`SELECT count(*)::int as count FROM users`;
  const [companies] = await sql`SELECT count(*)::int as count FROM companies`;

  console.log('🏆 NEON POSTGRESQL STATUS:');
  console.log(`- Total Objects:     ${totalObj.count}`);
  console.log(`- Samarqand Objects: ${samarqandObj.count}`);
  console.log(`- UYSOT Domtut:      ${uysotObj.count}`);
  console.log(`- Users:             ${users.count}`);
  console.log(`- Companies:         ${companies.count}`);
}

main().catch(console.error);
