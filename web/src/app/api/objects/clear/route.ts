import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    if (!body.source_id) throw new HttpError(400, 'source_id talab qilinadi');

    const sourceId = String(body.source_id);
    const companyId = resolveCompanyId(user, body.company_id);

    // Only this company's CRM columns are cleared; source data stays untouched.
    await db.clearCompanyData(companyId, sourceId);

    await db.logActivity({
      action: 'CLEAR',
      source_id: sourceId,
      user: `${user.name} (${companyId})`,
      details: `Kompaniya [${companyId}] uchun B2B ma'lumotlari tozalandi`,
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: "Obyekt B2B ma'lumotlari tozalandi" });
  } catch (err) {
    return apiError(err, 'API /api/objects/clear error');
  }
}
