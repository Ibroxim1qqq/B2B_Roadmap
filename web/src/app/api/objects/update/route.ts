import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId, userActorId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const MAX_FIELD_LENGTH = 10000;
const MAX_FIELDS = 100;
const FIELD_KEY = /^[a-z0-9_]{1,100}$/;

function sanitizeFields(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'source_id va data talab qilinadi');
  }
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length > MAX_FIELDS) throw new HttpError(400, "Maydonlar soni juda ko'p");
  const clean: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!FIELD_KEY.test(key) || value === null || value === undefined) continue;
    const text = String(value);
    if (text.length > MAX_FIELD_LENGTH) throw new HttpError(400, `"${key}" maydoni juda uzun`);
    clean[key] = text;
  }
  return clean;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    if (!body.source_id) throw new HttpError(400, 'source_id va data talab qilinadi');

    const data = sanitizeFields(body.data);
    const sourceId = String(body.source_id);
    const companyId = resolveCompanyId(user, body.company_id);

    if (!(await db.getObjectById(sourceId, companyId))) {
      throw new HttpError(404, 'Obyekt topilmadi');
    }

    await db.updateCompanyData(companyId, userActorId(user), sourceId, data);

    await db.logActivity({
      action: 'UPDATE',
      source_id: sourceId,
      object_name: data.tjm_name || '',
      user: `${user.name} (${companyId})`,
      details: data,
      status: 'SUCCESS'
    });

    return NextResponse.json({
      success: true,
      message: "Ma'lumotlar muvaffaqiyatli saqlandi",
      data: { source_id: sourceId, ...data }
    });
  } catch (err) {
    return apiError(err, 'API /api/objects/update error');
  }
}
