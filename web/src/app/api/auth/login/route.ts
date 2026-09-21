import { NextResponse } from 'next/server';
import { authenticateUserInSheet } from '@/lib/googleSheets';

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
