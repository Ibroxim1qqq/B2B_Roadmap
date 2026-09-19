import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, data } = body;

    if (!source_id || !data) {
      return NextResponse.json({ success: false, error: 'source_id and data are required' }, { status: 400 });
    }

    // 1. Immediately update local JSON file cache
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const rowIdx = json.rows.findIndex((r: any) => String(r.source_id).trim() === String(source_id).trim());
      if (rowIdx !== -1) {
        json.rows[rowIdx] = { ...json.rows[rowIdx], ...data };
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

      py.stdin.write(JSON.stringify(data));
      py.stdin.end();

      py.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Python process exited with code ${code}: ${errOutput}`));
      });
    });

    return NextResponse.json({ success: true, message: 'Saqlandi' });
  } catch (err: any) {
    console.error('Update route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
