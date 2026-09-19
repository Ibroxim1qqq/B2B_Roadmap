import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    const scraperDir = path.resolve(process.cwd(), '..', 'scraper');
    await new Promise<void>((resolve, reject) => {
      const py = spawn('python', ['sync_manager.py', 'export'], { cwd: scraperDir });
      py.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Python process exited with code ${code}`));
      });
    });

    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);

    return NextResponse.json({ success: true, count: json.rows.length, data: json.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
