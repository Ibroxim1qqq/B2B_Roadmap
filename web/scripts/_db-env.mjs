import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Reads the connection string from the environment or web/.env.local. Never falls back to a built-in value. */
export function resolveDatabaseUrl() {
  const fromEnv = (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || '').trim();
  if (fromEnv) return fromEnv;
  const envPath = path.join(WEB_ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf-8').match(/^\s*DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) return match[1].trim();
  }
  console.error('XATOLIK: DATABASE_URL topilmadi (environment yoki web/.env.local).');
  process.exit(1);
}

/** Host and database name only, so logs never contain the password. */
export function describeDatabase(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return 'noma\'lum';
  }
}

export { WEB_ROOT };
