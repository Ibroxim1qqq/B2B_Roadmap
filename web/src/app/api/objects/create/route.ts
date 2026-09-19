import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createObjectInSheet, logActivity } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.tjm_name || body.object_name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Obyekt yoki TJM nomi kiritilishi shart' }, { status: 400 });
    }

    const source_id = body.source_id || `B2B_${Date.now()}`;
    const lat = body.latitude ? String(body.latitude) : '39.6542';
    const lng = body.longitude ? String(body.longitude) : '66.9597';

    let status = body.status || 'Qurilish jarayonida';
    let status_id = '2';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('topshirilgan')) {
      status_id = '4';
    } else if (lowerStatus.includes("to'xtatilgan") || lowerStatus.includes('muzlatilgan')) {
      status_id = '3';
    }

    const newObjectRecord: Record<string, string> = {
      source_id: String(source_id),
      object_name: name,
      region_soato: '1718',
      district_soato: String(body.district_soato || '1718401'),
      address: body.address ? String(body.address).trim() : 'Samarqand',
      latitude: lat,
      longitude: lng,
      status: status,
      status_id: String(status_id),
      sphere_id: '57',
      customer: body.customer ? String(body.customer).trim() : '',
      designer: body.designer ? String(body.designer).trim() : '',
      builder: body.builder ? String(body.builder).trim() : '',
      difficulty: body.difficulty ? String(body.difficulty).trim() : 'II-toifa',
      floors: body.floors ? String(body.floors).trim() : '',
      apartment_count: body.apartment_count ? String(body.apartment_count).trim() : '',
      block_count: body.block_count ? String(body.block_count).trim() : '1',
      deadline: body.deadline ? String(body.deadline).trim() : '',
      created_at: new Date().toISOString().split('T')[0],
      task_id: '',
      passport_url: '',
      source_url: '',
      tjm_name: name,
      phone: body.phone ? String(body.phone).trim() : '',
      sales_office: body.sales_office ? String(body.sales_office).trim() : '',
      manager_name: body.manager_name ? String(body.manager_name).trim() : '',
      manager_phone: body.manager_phone ? String(body.manager_phone).trim() : '',
      telegram: body.telegram ? String(body.telegram).trim() : '',
      instagram: body.instagram ? String(body.instagram).trim() : '',
      notes: body.notes ? String(body.notes).trim() : '',
      priority: body.priority ? String(body.priority).trim() : "O'rta",
      last_visit: body.last_visit ? String(body.last_visit).trim() : '',
      visited_by: body.visited_by ? String(body.visited_by).trim() : '',
      visit_lat_lng: body.visit_lat_lng ? String(body.visit_lat_lng).trim() : ''
    };

    // 1. Immediately update in-memory cache
    dataCache.appendRow(newObjectRecord);

    // 2. Direct Google Sheets API append
    try {
      await createObjectInSheet(newObjectRecord);

      // Log to ActivityLog sheet
      await logActivity({
        action: 'CREATE',
        source_id: String(source_id),
        object_name: name,
        user: body.user || 'Menejer',
        details: { object_name: name, address: newObjectRecord.address, district_soato: newObjectRecord.district_soato },
        status: 'SUCCESS'
      });
    } catch (sheetErr: any) {
      console.error('Google Sheets create error:', sheetErr);
      await logActivity({
        action: 'CREATE',
        source_id: String(source_id),
        object_name: name,
        user: body.user || 'Menejer',
        details: `Xatolik: ${sheetErr.message}`,
        status: 'FAILED'
      });
      return NextResponse.json({ 
        success: false, 
        error: `Google Sheets xatosi: ${sheetErr.message}` 
      }, { status: 500 });
    }

    // 3. Update local backup file if writable
    try {
      const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);
        const exists = json.rows.some((r: any) => String(r.source_id).trim() === String(source_id).trim());
        if (!exists) {
          json.rows.unshift(newObjectRecord);
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      // Harmless
    }

    return NextResponse.json({
      success: true,
      message: 'Saqlandi',
      data: newObjectRecord
    });
  } catch (err: any) {
    console.error('Create route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
