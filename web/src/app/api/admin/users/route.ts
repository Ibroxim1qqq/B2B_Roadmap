import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, clearUserCache, clientIp, HttpError, readJsonBody, requireSuperadmin, userActorId } from '@/lib/serverAuth';
import { getInitials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['manager', 'company_admin', 'superadmin'];
const MIN_PASSWORD_LENGTH = 8;

/** The system must always keep one working superadmin. */
function assertKeepsSuperadmin(users: any[], targetId: string): void {
  const others = users.filter(u => u.role === 'superadmin' && u.is_active !== false && u.user_id !== targetId);
  if (others.length === 0) throw new HttpError(409, 'Tizimda kamida bitta faol superadmin qolishi kerak');
}

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [users, companies] = await Promise.all([db.getUsers(), db.getCompanies()]);

    const compMap = new Map<string, string>();
    companies.forEach(c => compMap.set(c.company_id, c.company_name));
    compMap.set('system', 'Tizim');

    const enriched = users.map(u => ({
      ...u,
      is_active: u.is_active !== false,
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
    const { company_id, name, login, password, role, phone } = await readJsonBody(req);

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
      role: cleanRole,
      phone: typeof phone === 'string' ? phone.trim() : '',
      avatar_initials: getInitials(name)
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
    const admin = await requireSuperadmin(req);
    const { userId, name, login, phone, password, role, company_id, is_active } = await readJsonBody(req);

    if (typeof userId !== 'string' || !userId.trim()) {
      throw new HttpError(400, 'User ID kiritilishi shart');
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) throw new HttpError(400, "Ism bo'sh bo'lmasligi kerak");
    if (login !== undefined && (typeof login !== 'string' || !login.trim())) throw new HttpError(400, "Login bo'sh bo'lmasligi kerak");
    if (password && String(password).length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
    }
    if (role !== undefined && !ALLOWED_ROLES.includes(role)) throw new HttpError(400, "Rol noto'g'ri");

    if (company_id !== undefined && company_id !== 'system') {
      const companies = await db.getCompanies();
      if (!companies.some(c => c.company_id === company_id)) throw new HttpError(400, 'Kompaniya topilmadi');
    }

    const users = await db.getUsers();
    const target = users.find((u: any) => u.user_id === userId);
    if (!target) throw new HttpError(404, 'Foydalanuvchi topilmadi');

    const losesSuperadmin = target.role === 'superadmin' && ((role !== undefined && role !== 'superadmin') || is_active === false);
    if (losesSuperadmin) {
      if (userId === userActorId(admin)) throw new HttpError(409, "O'z superadmin huquqingizni o'chira olmaysiz");
      assertKeepsSuperadmin(users, userId);
    }

    const updated = await db.updateUser(userId, {
      name: name?.trim(),
      login,
      phone,
      password,
      role,
      company_id,
      is_active,
      ...(name?.trim() ? { avatar_initials: getInitials(name) } : {})
    });
    if (!updated) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    clearUserCache();

    await db.logActivity({
      action: 'ADMIN_USER_UPDATE',
      source_id: userId,
      user: admin.name,
      details: { name, login, phone, role, company_id, is_active, password_changed: Boolean(password) }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return apiError(err, 'Admin users PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const userId = new URL(req.url).searchParams.get('user_id');
    if (!userId) throw new HttpError(400, 'Foydalanuvchi tanlanmagan');
    if (userId === userActorId(admin)) throw new HttpError(409, "O'zingizni o'chira olmaysiz");

    const users = await db.getUsers();
    const target = users.find((u: any) => u.user_id === userId);
    if (!target) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    if (target.role === 'superadmin') assertKeepsSuperadmin(users, userId);

    await db.deleteUser(userId);
    clearUserCache();
    await db.logActivity({ action: 'ADMIN_USER_DELETE', source_id: userId, user: admin.name, details: { login: target.login } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin users DELETE error');
  }
}
