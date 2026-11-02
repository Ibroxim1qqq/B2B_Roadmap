// Scrapes Domtut into a temporary file, then imports it into Neon.
// The app's disk is wiped on every Render deploy, so Neon is the only place the result is kept.
//   node scripts/run-domtut-sync.mjs [--limit N]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WEB_ROOT } from './_db-env.mjs';

const limitIdx = process.argv.indexOf('--limit');
const limitArgs = limitIdx !== -1 && process.argv[limitIdx + 1] ? ['--limit', process.argv[limitIdx + 1]] : [];
const output = path.join(os.tmpdir(), `domtut_${Date.now()}.json`);
const collector = path.resolve(WEB_ROOT, '..', 'scraper', 'domtut_collector.py');

function runPython(args) {
  for (const python of ['python3', 'python']) {
    const result = spawnSync(python, args, { stdio: 'inherit' });
    if (!result.error) return result.status;
  }
  throw new Error('Python topilmadi');
}

try {
  const status = runPython([collector, '--json-only', '--output', output, ...limitArgs]);
  if (status !== 0) throw new Error(`Domtut skaneri ${status} kodi bilan tugadi`);
  const imported = spawnSync(process.execPath, [path.join(WEB_ROOT, 'scripts', 'import-domtut-to-neon.mjs'), output], { stdio: 'inherit' });
  if (imported.status !== 0) throw new Error('Neon importi muvaffaqiyatsiz tugadi');
} catch (err) {
  console.error('XATOLIK:', err.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(output, { force: true });
}
