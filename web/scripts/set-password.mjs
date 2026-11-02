// Sets a new random password for one login and prints it once.
//   node scripts/set-password.mjs <login>
import { randomBytes, scryptSync } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl, describeDatabase } from './_db-env.mjs';

// Same format as src/lib/password.ts
function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return ['scrypt', 16384, 8, 1, salt.toString('base64'), derived.toString('base64')].join('$');
}

const login = (process.argv[2] || '').trim().toLowerCase();
if (!login) {
  console.error('Foydalanish: npm run db:set-password -- <login>');
  process.exit(1);
}

async function main() {
  const url = resolveDatabaseUrl();
  const sql = neon(url);
  const password = randomBytes(12).toString('base64url');
  const rows = await sql`UPDATE users SET password_hash = ${hashPassword(password)} WHERE LOWER(login) = ${login} RETURNING user_id`;
  if (rows.length === 0) {
    console.error(`"${login}" topilmadi (${describeDatabase(url)}).`);
    process.exit(1);
  }
  await sql`DELETE FROM auth_sessions WHERE user_id = ${rows[0].user_id}`;
  console.log(`Baza: ${describeDatabase(url)}\nLogin: ${login}\nYangi parol: ${password}`);
}

main().catch(err => {
  console.error('XATOLIK:', err.message);
  process.exit(1);
});
