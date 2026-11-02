import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl } from './_db-env.mjs';

const url = resolveDatabaseUrl();

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
