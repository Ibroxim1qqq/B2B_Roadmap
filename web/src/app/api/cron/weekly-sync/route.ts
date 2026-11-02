import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { timingSafeEqual } from 'node:crypto';
import path from 'path';
import { apiError, getSessionUser, HttpError } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

let syncRunning = false;

function secretMatches(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    if (!secretMatches(req.headers.get('x-cron-secret'))) {
      const user = await getSessionUser(req);
      if (user?.role !== 'superadmin') throw new HttpError(401, 'Ruxsat berilmadi');
    }
    if (syncRunning) throw new HttpError(409, 'Sinxronizatsiya allaqachon ishlayapti');

    const scriptPath = path.resolve(process.cwd(), 'scripts', 'sync-dshk-to-neon.mjs');
    syncRunning = true;
    const child = spawn(process.execPath, [scriptPath], { cwd: process.cwd(), stdio: 'ignore' });
    child.on('error', err => {
      syncRunning = false;
      console.error('Weekly sync failed to start:', err);
    });
    child.on('exit', code => {
      syncRunning = false;
      if (code !== 0) console.error(`Weekly sync exited with code ${code}`);
    });

    return NextResponse.json({
      success: true,
      message: "Haftalik O'zbekiston bo'ylab DSHK yangilanishi fonda ishga tushirildi"
    });
  } catch (err) {
    return apiError(err, 'Weekly sync route error');
  }
}
