// Applies the additive schema migration. The app also does this by itself on its first request after a deploy.
import { resolveDatabaseUrl, describeDatabase } from './_db-env.mjs';
import { ensureDatabaseSchema } from '../src/lib/db.ts';

process.env.DATABASE_URL = resolveDatabaseUrl();
console.log(`Baza: ${describeDatabase(process.env.DATABASE_URL)}`);

ensureDatabaseSchema()
  .then(() => console.log('Migratsiya tayyor.'))
  .catch(err => {
    console.error('Migratsiya xatosi:', err.message);
    process.exit(1);
  });
