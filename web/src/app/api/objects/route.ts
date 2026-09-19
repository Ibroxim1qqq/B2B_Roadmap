import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'Data not found' }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json({ success: true, count: json.rows.length, data: json.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
