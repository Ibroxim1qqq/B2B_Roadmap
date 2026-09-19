import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id is required' }, { status: 400 });
    }

    // 1. Immediately update local JSON file cache
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const rowIdx = json.rows.findIndex((r: any) => String(r.source_id).trim() === String(source_id).trim());
      if (rowIdx !== -1) {
        const clearedFields = {
          tjm_name: '',
          phone: '',
          sales_office: '',
          manager_name: '',
          manager_phone: '',
          telegram: '',
          instagram: '',
          notes: '',
          priority: '',
          last_visit: '',
          visited_by: '',
          visit_lat_lng: ''
        };
        json.rows[rowIdx] = { ...json.rows[rowIdx], ...clearedFields };
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
      }
    }

    const scraperDir = path.resolve(process.cwd(), '..', 'scraper');
    await new Promise<void>((resolve, reject) => {
      const py = spawn('python', ['sync_manager.py', 'clear', String(source_id)], {
        cwd: scraperDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let errOutput = '';
      py.stderr.on('data', (d) => { errOutput += d.toString(); });
      py.on('error', (err) => reject(err));

      py.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Python process exited with code ${code}: ${errOutput}`));
      });
    });

    return NextResponse.json({ success: true, message: "O'chirildi" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
