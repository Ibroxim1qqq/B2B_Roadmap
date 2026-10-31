import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret') || req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'b2b_weekly_secret_2026';

    // Allow if secret matches, or in local development
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && secret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Ruxsat berilmadi (Unauthorized)' }, { status: 401 });
    }

    // Primary sync script: scripts/sync-dshk-to-neon.mjs (Neon DB direct)
    // Legacy fallback reference: scraper/weekly_sync.py
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'sync-dshk-to-neon.mjs');

    // Launch DSHK sync to Neon in background
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return NextResponse.json({
      success: true,
      message: "Haftalik O'zbekiston bo'ylab DSHK yangilanishi Neon DB ga fonda ishga tushirildi (Weekly DSHK sync to Neon started in background)"
    });
  } catch (err: any) {
    console.error('Weekly sync route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
