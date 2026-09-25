import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getUysotObjectsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const objects = await getUysotObjectsFromSheet();
    const localJsonPath = path.join(process.cwd(), 'src', 'lib', 'uysot-domtut-data.json');
    let lastUpdated = '';
    if (fs.existsSync(localJsonPath)) {
      const stats = fs.statSync(localJsonPath);
      lastUpdated = stats.mtime.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    }

    const districts = Array.from(new Set(objects.map(o => o.district).filter(Boolean)));

    return NextResponse.json({
      success: true,
      count: objects.length,
      last_updated: lastUpdated,
      districts_count: districts.length,
      districts
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 80;

    const scraperDir = path.resolve(process.cwd(), '..', 'scraper');
    const scriptPath = path.join(scraperDir, 'domtut_collector.py');

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { success: false, error: 'domtut_collector.py skripti topilmadi' },
        { status: 404 }
      );
    }

    // Launch python collector in background
    const child = spawn('python', [scriptPath, '--limit', String(limit)], {
      cwd: scraperDir,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: `Domtut (Toshkent) skaneri muvaffaqiyatli ishga tushirildi (${limit} ta obyekt fonda yangilanadi).`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('API /api/admin/sync-domtut error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Skanerni ishga tushirib bo\'lmadi' },
      { status: 500 }
    );
  }
}
