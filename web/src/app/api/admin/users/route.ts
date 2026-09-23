import { NextResponse } from 'next/server';
import { getUsersFromSheet, createUserInSheet, getCompaniesFromSheet, recordUserSessionInSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [users, companies] = await Promise.all([
      getUsersFromSheet(),
      getCompaniesFromSheet()
    ]);

    const compMap = new Map<string, string>();
    companies.forEach(c => compMap.set(c.company_id, c.company_name));

    const enriched = users.map(u => ({
      ...u,
      company_name: compMap.get(u.company_id) || u.company_id
    }));

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: any) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_id, name, login, password, role } = body;

    if (!company_id || !name || !login || !password) {
      return NextResponse.json(
        { success: false, error: 'Barcha maydonlar (Kompaniya, Ism, Login, Parol) to\'ldirilishi shart' },
        { status: 400 }
      );
    }

    // Check if login already exists
    const existing = await getUsersFromSheet();
    if (existing.some(u => u.login.toLowerCase() === login.trim().toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Bunday login allaqachon mavjud. Boshqa login tanlang.' },
        { status: 400 }
      );
    }

    const created = await createUserInSheet({
      company_id: company_id.trim(),
      name: name.trim(),
      login: login.trim(),
      password: password.trim(),
      role: role ? role.trim() : 'manager'
    });

    // Record user registration session in background
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Admin Dashboard';
    recordUserSessionInSheet({
      user_id: created.user_id,
      user_name: created.name,
      login: created.login,
      role: created.role,
      company_id: created.company_id,
      action: 'register',
      ip_address: ip,
      user_agent: userAgent
    }).catch(e => console.warn('Failed to record user registration audit log:', e));

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    console.error('Admin users POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
