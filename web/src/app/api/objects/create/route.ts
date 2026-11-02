import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId, userActorId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const TEXT_FIELDS = [
  'customer', 'designer', 'builder', 'floors', 'apartment_count', 'deadline', 'phone', 'sales_office',
  'manager_name', 'manager_phone', 'telegram', 'instagram', 'notes', 'last_visit', 'visited_by', 'visit_lat_lng'
];

function parseCoordinate(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const num = parseFloat(String(value));
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new HttpError(400, "Koordinatalar noto'g'ri kiritilgan");
  }
  return num;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    const name = String(body.tjm_name || body.object_name || '').trim();
    if (!name) throw new HttpError(400, 'Obyekt yoki TJM nomi kiritilishi shart');

    const companyId = resolveCompanyId(user, body.company_id);
    const isUysot = (await db.getCompanyDataSource(companyId)) === 'uysot';

    const status = String(body.status || 'Qurilish jarayonida');
    const lowerStatus = status.toLowerCase();
    let statusId = 1;
    if (lowerStatus.includes('topshirilgan')) statusId = 4;
    else if (lowerStatus.includes("to'xtatilgan") || lowerStatus.includes('muzlatilgan')) statusId = 3;

    const record: Record<string, any> = {
      // Always generated here so a request can never overwrite an existing object.
      source_id: `B2B_${Date.now()}_${randomBytes(3).toString('hex')}`,
      object_name: name,
      tjm_name: name,
      region_soato: String(body.region_soato || (isUysot ? '1726' : '1718')),
      region_name: String(body.region_name || (isUysot ? 'Toshkent shahri' : 'Samarqand')),
      district_soato: String(body.district_soato || (isUysot ? '' : '1718401')),
      district_name: String(body.district_name || (isUysot ? 'Toshkent' : 'Samarqand shahri')),
      address: String(body.address || (isUysot ? 'Toshkent' : 'Samarqand')).trim(),
      latitude: parseCoordinate(body.latitude, isUysot ? 41.2995 : 39.6542, -90, 90),
      longitude: parseCoordinate(body.longitude, isUysot ? 69.2401 : 66.9597, -180, 180),
      status,
      status_id: statusId,
      sphere_id: '57',
      difficulty: String(body.difficulty || 'II-toifa').trim(),
      block_count: String(body.block_count || '1').trim(),
      priority: String(body.priority || "O'rta").trim(),
      created_at: new Date().toISOString().split('T')[0],
      task_id: '',
      passport_url: '',
      source_url: '',
      is_custom: true,
      is_uysot: isUysot
    };
    for (const field of TEXT_FIELDS) {
      record[field] = body[field] ? String(body[field]).trim() : '';
    }

    await db.createCompanyCustomTJM(companyId, userActorId(user), record.source_id, record);

    await db.logActivity({
      action: 'CREATE',
      source_id: record.source_id,
      object_name: name,
      user: `${user.name} (${companyId})`,
      details: { object_name: name, address: record.address, district_soato: record.district_soato },
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: 'Obyekt saqlandi', data: record });
  } catch (err) {
    return apiError(err, 'Create route error');
  }
}
