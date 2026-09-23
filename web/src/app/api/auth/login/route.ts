import { NextResponse } from 'next/server';
import { authenticateUserInSheet, recordUserSessionInSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: 'Login va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    const user = await authenticateUserInSheet(login, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    // Extract client IP and device info
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Record login session in background without blocking response
    recordUserSessionInSheet({
      user_id: user.user_id || user.id,
      user_name: user.name,
      login: user.login,
      role: user.role,
      company_id: user.company_id,
      company_name: user.company_name,
      action: 'login',
      ip_address: ip,
      user_agent: userAgent
    }).catch(e => console.warn('Failed to record login session:', e));

    return NextResponse.json({
      success: true,
      user
    });
  } catch (err: any) {
    console.error('Auth login error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 }
    );
  }
}
