import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { apiError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const objects = await db.getObjects('uysot', true);
    const districts = Array.from(new Set(objects.map(o => o.district_name || o.district).filter(Boolean)));
    const updatedAt = objects.reduce<number>((latest, o) => {
      const at = o.updated_at ? new Date(o.updated_at).getTime() : 0;
      return at > latest ? at : latest;
    }, 0);

    return NextResponse.json({
      success: true,
      count: objects.length,
      last_updated: updatedAt ? new Date(updatedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '',
      districts_count: districts.length,
      districts
    });
  } catch (err) {
    return apiError(err, 'API /api/admin/sync-domtut GET error');
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadmin(req);
    const body = await readJsonBody(req).catch(() => ({}));
    const parsedLimit = parseInt(String(body.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 1000) : 80;

    const runnerPath = path.resolve(process.cwd(), 'scripts', 'run-domtut-sync.mjs');
    const collectorPath = path.resolve(process.cwd(), '..', 'scraper', 'domtut_collector.py');

    // Render's web service may not ship the Python scraper; the scheduled GitHub Actions job covers that case.
    if (!fs.existsSync(/*turbopackIgnore: true*/ runnerPath) || !fs.existsSync(/*turbopackIgnore: true*/ collectorPath)) {
      return NextResponse.json(
        { success: false, error: "Domtut skaneri bu serverda mavjud emas. GitHub Actions'dagi haftalik sinxronizatsiyadan foydalaning." },
        { status: 503 }
      );
    }

    const child = spawn(process.execPath, [runnerPath, '--limit', String(limit)], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore'
    });
    child.on('error', err => console.error('Domtut sync failed to start:', err));
    child.unref();

    return NextResponse.json({
      success: true,
      message: `Domtut (Toshkent) skaneri ishga tushirildi (${limit} ta obyekt fonda yangilanadi).`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return apiError(err, 'API /api/admin/sync-domtut error');
  }
}
