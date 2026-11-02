import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  apiError, clearLoginFailures, clientIp, HttpError, isLoginThrottled,
  readJsonBody, recordLoginFailure, setSessionCookie
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { login, password } = await readJsonBody(req);

    if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
      throw new HttpError(400, 'Login va parol kiritilishi shart');
    }

    const ip = clientIp(req);
    if (isLoginThrottled(login, ip)) {
      throw new HttpError(429, "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.");
    }

    const user = await db.authenticateUser(login, password);
    if (!user) {
      recordLoginFailure(login, ip);
      throw new HttpError(401, "Login yoki parol noto'g'ri");
    }
    clearLoginFailures(login, ip);

    const token = await db.createAuthSession(String(user.user_id || user.id));

    db.recordUserSession({
      user_id: user.user_id || user.id,
      user_name: user.name,
      login: user.login || '',
      role: user.role || 'manager',
      company_id: user.company_id || '',
      company_name: user.company_name || '',
      action: 'login',
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || 'Unknown'
    }).catch(e => console.warn('Failed to record login session:', e));

    const res = NextResponse.json({ success: true, user });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    return apiError(err, 'Auth login error');
  }
}
