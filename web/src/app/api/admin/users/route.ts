import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, clearUserCache, clientIp, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['manager', 'company_admin', 'superadmin'];
const MIN_PASSWORD_LENGTH = 8;

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [users, companies] = await Promise.all([db.getUsers(), db.getCompanies()]);

    const compMap = new Map<string, string>();
    companies.forEach(c => compMap.set(c.company_id, c.company_name));

    const enriched = users.map(u => ({
      ...u,
      company_name: compMap.get(u.company_id) || u.company_id
    }));

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return apiError(err, 'Admin users GET error');
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadmin(req);
    const { company_id, name, login, password, role } = await readJsonBody(req);

    if (![company_id, name, login, password].every(v => typeof v === 'string' && v.trim())) {
      throw new HttpError(400, "Barcha maydonlar (Kompaniya, Ism, Login, Parol) to'ldirilishi shart");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
    }
    const cleanRole = role ? String(role).trim() : 'manager';
    if (!ALLOWED_ROLES.includes(cleanRole)) {
      throw new HttpError(400, "Rol noto'g'ri");
    }
    const companies = await db.getCompanies();
    const company = companies.find(c => c.company_id === company_id.trim());
    if (!company && company_id.trim() !== 'system') {
      throw new HttpError(400, 'Kompaniya topilmadi');
    }

    const created = await db.createUser({
      company_id: company_id.trim(),
      name: name.trim(),
      login: login.trim(),
      password,
      role: cleanRole
    });

    db.recordUserSession({
      user_id: created.user_id,
      user_name: created.name,
      login: created.login,
      role: created.role,
      company_id: created.company_id,
      company_name: company?.company_name || created.company_id,
      action: 'register',
      ip_address: clientIp(req),
      user_agent: req.headers.get('user-agent') || 'Admin Dashboard'
    }).catch(e => console.warn('Failed to record session:', e));

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return apiError(err, 'Admin users POST error');
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperadmin(req);
    const { userId, name, login, phone, password } = await readJsonBody(req);

    if (typeof userId !== 'string' || !userId.trim()) {
      throw new HttpError(400, 'User ID kiritilishi shart');
    }
    if (password && String(password).length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
    }

    const updated = await db.updateUser(userId, { name, login, phone, password });
    if (!updated) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    clearUserCache();
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return apiError(err, 'Admin users PATCH error');
  }
}
