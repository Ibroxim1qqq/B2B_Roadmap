import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId, userActorId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const TASHKENT_TIME = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false
});

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const sourceId = (searchParams.get('source_id') || '').trim();
    if (!sourceId) throw new HttpError(400, 'source_id talab qilinadi');
    const companyId = resolveCompanyId(user, searchParams.get('company_id'));
    const visits = await db.getObjectVisits(companyId, sourceId);
    return NextResponse.json({ success: true, count: visits.length, data: visits });
  } catch (err) {
    return apiError(err, 'API /api/objects/visit GET error');
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    if (!body.source_id) throw new HttpError(400, 'source_id talab qilinadi');

    const sourceId = String(body.source_id);
    const companyId = resolveCompanyId(user, body.company_id);
    if (!(await db.getObjectById(sourceId, companyId))) {
      throw new HttpError(404, 'Obyekt topilmadi');
    }

    const visitedBy = `${user.name} (${user.role})`;
    const latLng = typeof body.lat_lng === 'string' ? body.lat_lng.slice(0, 100) : '';
    const visitData = {
      last_visit: `${TASHKENT_TIME.format(new Date())} (${visitedBy})`,
      visited_by: visitedBy,
      visit_lat_lng: latLng
    };

    await db.updateCompanyData(companyId, userActorId(user), sourceId, visitData);
    await db.addObjectVisit({
      company_id: companyId,
      source_id: sourceId,
      user_id: userActorId(user),
      visited_by: visitedBy,
      lat_lng: latLng
    });

    await db.logActivity({
      action: 'VISIT',
      source_id: sourceId,
      user: `${visitedBy} (${companyId})`,
      details: visitData,
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: 'Tashrif muvaffaqiyatli saqlandi', data: visitData });
  } catch (err) {
    return apiError(err, 'API /api/objects/visit error');
  }
}
