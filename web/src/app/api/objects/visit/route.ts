import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, visited_by, lat_lng } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id is required' }, { status: 400 });
    }

    const now = new Date();
    const formattedDate = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)} (${visited_by || 'Field Sales'})`;

    const visitData = {
      last_visit: formattedDate,
      visited_by: visited_by || 'Field Sales',
      visit_lat_lng: lat_lng || ''
    };

    // 1. Immediately update local JSON file cache
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const rowIdx = json.rows.findIndex((r: any) => String(r.source_id).trim() === String(source_id).trim());
      if (rowIdx !== -1) {
        json.rows[rowIdx] = { ...json.rows[rowIdx], ...visitData };
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
      }
    }

    // 2. Spawn python sync_manager with UTF-8 encoding environment
    const scraperDir = path.resolve(process.cwd(), '..', 'scraper');
    await new Promise<void>((resolve, reject) => {
      const py = spawn('python', ['sync_manager.py', 'update', String(source_id)], {
        cwd: scraperDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let errOutput = '';
      py.stderr.on('data', (d) => { errOutput += d.toString(); });
      py.on('error', (err) => reject(err));

      py.stdin.write(JSON.stringify(visitData));
      py.stdin.end();

      py.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Python process exited with code ${code}: ${errOutput}`));
      });
    });

    return NextResponse.json({ success: true, message: 'Saqlandi', visit: visitData });
  } catch (err: any) {
    console.error('Visit route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
