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

    const scriptPath = path.resolve(process.cwd(), '..', 'scraper', 'weekly_sync.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Launch weekly_sync in background
    const child = spawn(pythonCmd, [scriptPath, '--workers', '4'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return NextResponse.json({
      success: true,
      message: "Haftalik O'zbekiston bo'ylab yangilanish fonda ishga tushirildi (Weekly sync started in background)"
    });
  } catch (err: any) {
    console.error('Weekly sync route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
