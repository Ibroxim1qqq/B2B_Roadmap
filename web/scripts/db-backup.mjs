// Read-only JSON snapshot of every public table: npm run db:backup
// The output contains personal data and credentials, so web/db-backups/ is git-ignored.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl, describeDatabase, WEB_ROOT } from './_db-env.mjs';

export async function backupDatabase(url, label = 'backup') {
  const sql = neon(url);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`;
  const dump = { taken_at: new Date().toISOString(), database: describeDatabase(url), tables: {} };
  for (const { table_name: name } of tables) {
    dump.tables[name] = await sql.query(`SELECT * FROM "${name}"`);
    console.log(`  ${name}: ${dump.tables[name].length} qator`);
  }
  const dir = path.join(WEB_ROOT, 'db-backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${label}_${dump.taken_at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(dump));
  return file;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const url = resolveDatabaseUrl();
  console.log(`Zaxira olinmoqda: ${describeDatabase(url)}`);
  backupDatabase(url).then(file => console.log(`Tayyor: ${file}`)).catch(err => {
    console.error('Zaxira xatosi:', err.message);
    process.exit(1);
  });
}
