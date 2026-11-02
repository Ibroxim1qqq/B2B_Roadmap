import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, requireUser, resolveCompanyId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const companyId = resolveCompanyId(user, searchParams.get('company_id'));
    const dataSource = await db.getCompanyDataSource(companyId);
    const objects = await db.getObjects(companyId, dataSource === 'uysot');

    return NextResponse.json({
      success: true,
      message: "Ma'lumotlar bazasidan yangilandi",
      count: objects.length
    });
  } catch (err) {
    return apiError(err, 'API /api/objects/sync error');
  }
}
