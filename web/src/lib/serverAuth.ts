import { NextResponse } from 'next/server';
import { db, DatabaseUnavailableError, DuplicateLoginError, hashSessionToken } from './db.ts';
import type { UserProfile } from './types.ts';

export const SESSION_COOKIE = 'b2b_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const USER_CACHE_TTL_MS = 30 * 1000;
const USER_CACHE_MAX = 500;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Spares one database round trip per API call; the short lifetime bounds how stale a role or company can be.
const userCache = new Map<string, { user: UserProfile; at: number }>();

export function clearUserCache(): void {
  userCache.clear();
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function getSessionToken(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE);
}

export async function getSessionUser(req: Request): Promise<UserProfile | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  const key = hashSessionToken(token);
  const cached = userCache.get(key);
  if (cached && Date.now() - cached.at < USER_CACHE_TTL_MS) return cached.user;
  const user = await db.getUserBySession(token);
  if (user) {
    if (userCache.size >= USER_CACHE_MAX) userCache.clear();
    userCache.set(key, { user, at: Date.now() });
  } else {
    userCache.delete(key);
  }
  return user;
}

export async function requireUser(req: Request): Promise<UserProfile> {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, 'Tizimga kirish talab qilinadi');
  return user;
}

export async function requireSuperadmin(req: Request): Promise<UserProfile> {
  const user = await requireUser(req);
  if (user.role !== 'superadmin') throw new HttpError(403, "Bu amal uchun ruxsat yo'q");
  return user;
}

/** Only a superadmin may act on another company; everyone else is pinned to their own. */
export function resolveCompanyId(user: UserProfile, requested?: string | null): string {
  if (user.role === 'superadmin') return (requested && String(requested).trim()) || user.company_id || 'system';
  return user.company_id || '';
}

export function userActorId(user: UserProfile): string {
  return String(user.user_id || user.id);
}

export async function readJsonBody(req: Request): Promise<any> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object') return body;
  } catch {
    // Falls through to the 400 below.
  }
  throw new HttpError(400, "So'rov formati noto'g'ri");
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_DB !== '1',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Maps any failure to a response without exposing internals; details stay in the server log. */
export function apiError(err: unknown, context: string): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status });
  }
  if (err instanceof DuplicateLoginError) {
    return NextResponse.json({ success: false, error: 'Bunday login allaqachon mavjud. Boshqa login tanlang.' }, { status: 409 });
  }
  console.error(`${context}:`, err);
  if (err instanceof DatabaseUnavailableError) {
    return NextResponse.json({ success: false, error: "Ma'lumotlar bazasi sozlanmagan" }, { status: 503 });
  }
  return NextResponse.json(
    { success: false, error: "Serverda xatolik yuz berdi. Ma'lumot saqlanmadi, qayta urinib ko'ring." },
    { status: 500 }
  );
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_CLIENT = 10;
const MAX_FAILURES_PER_LOGIN = 50;
const MAX_TRACKED_LOGINS = 10000;
const loginFailures = new Map<string, { count: number; firstAt: number }>();

function failureCount(key: string): number {
  const entry = loginFailures.get(key);
  if (!entry) return 0;
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return 0;
  }
  return entry.count;
}

export function isLoginThrottled(login: string, ip: string): boolean {
  const clean = login.trim().toLowerCase();
  return failureCount(`${clean}|${ip}`) >= MAX_FAILURES_PER_CLIENT || failureCount(clean) >= MAX_FAILURES_PER_LOGIN;
}

export function recordLoginFailure(login: string, ip: string): void {
  if (loginFailures.size >= MAX_TRACKED_LOGINS) loginFailures.clear();
  const clean = login.trim().toLowerCase();
  for (const key of [`${clean}|${ip}`, clean]) {
    const count = failureCount(key);
    if (count === 0) loginFailures.set(key, { count: 1, firstAt: Date.now() });
    else loginFailures.get(key)!.count = count + 1;
  }
}

export function clearLoginFailures(login: string, ip: string): void {
  const clean = login.trim().toLowerCase();
  loginFailures.delete(`${clean}|${ip}`);
}
