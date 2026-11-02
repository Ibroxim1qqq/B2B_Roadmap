import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  apiError, clearUserCache, HttpError, readJsonBody, requireUser, setSessionCookie, userActorId
} from '@/lib/serverAuth';
import { getInitials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_AVATAR_LENGTH = 400 * 1024;

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    const updates: Record<string, string> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
      updates.avatar_initials = getInitials(updates.name);
    }
    if (typeof body.login === 'string' && body.login.trim()) updates.login = body.login.trim();
    if (typeof body.phone === 'string') updates.phone = body.phone.trim();

    if (typeof body.avatar_url === 'string') {
      if (body.avatar_url && !/^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/i.test(body.avatar_url)) {
        throw new HttpError(400, "Rasm formati noto'g'ri");
      }
      if (body.avatar_url.length > MAX_AVATAR_LENGTH) {
        throw new HttpError(400, 'Rasm hajmi 300KB dan oshmasligi kerak');
      }
      updates.avatar_url = body.avatar_url;
    }

    const changingPassword = typeof body.password === 'string' && body.password.length > 0;
    if (changingPassword) {
      if (body.password.length < 8) throw new HttpError(400, "Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
      if (!(await db.checkUserPassword(userActorId(user), String(body.current_password || '')))) {
        throw new HttpError(403, "Joriy parol noto'g'ri");
      }
      updates.password = body.password;
    }

    const updated = await db.updateUser(userActorId(user), updates);
    if (!updated) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    clearUserCache();

    const res = NextResponse.json({
      success: true,
      user: {
        ...user,
        name: updated.name,
        login: updated.login,
        phone: updated.phone || '',
        avatar_url: updated.avatar_url || '',
        avatarInitials: updated.avatar_initials || user.avatarInitials
      }
    });
    // A password change ends every session of this user, so this device gets a fresh one.
    if (changingPassword) setSessionCookie(res, await db.createAuthSession(userActorId(user)));
    return res;
  } catch (err) {
    return apiError(err, 'Auth profile error');
  }
}
