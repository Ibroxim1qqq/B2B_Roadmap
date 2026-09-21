import { UserProfile } from './types';

const STORAGE_KEY = 'b2b_samarkand_current_user';

export const DEFAULT_TEAM_MEMBERS: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Ibroxim Toirov',
    role: 'Field Sales',
    phone: '+998 90 123 45 67',
    avatarInitials: 'IT',
    company_id: 'comp_default',
    company_name: 'Asosiy Kompaniya'
  },
  {
    id: 'user_2',
    name: 'Anvar Aliyev',
    role: 'B2B Savdo Menejeri',
    phone: '+998 91 234 56 78',
    avatarInitials: 'AA',
    company_id: 'comp_default',
    company_name: 'Asosiy Kompaniya'
  },
  {
    id: 'user_3',
    name: 'Dilshod Karimov',
    role: "Sotuv Bo'limi Boshlig'i",
    phone: '+998 93 345 67 89',
    avatarInitials: 'DK',
    company_id: 'comp_default',
    company_name: 'Asosiy Kompaniya'
  },
  {
    id: 'user_4',
    name: 'Sherzod Rustamov',
    role: 'Hududiy Vakil (Kattaqo\'rg\'on)',
    phone: '+998 97 456 78 90',
    avatarInitials: 'SR',
    company_id: 'comp_default',
    company_name: 'Asosiy Kompaniya'
  }
];


export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set user in localStorage:', e);
  }
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to logout:', e);
  }
}

export function createCustomUser(name: string, role = 'Menejer', phone = '', companyId = 'comp_default'): UserProfile {
  const cleanName = name.trim();
  return {
    id: `user_${Date.now()}`,
    name: cleanName,
    role: role.trim() || 'Menejer',
    phone: phone.trim(),
    avatarInitials: getInitials(cleanName),
    company_id: companyId,
    company_name: 'Asosiy Kompaniya'
  };
}


export const SEED_CREDENTIALS: { login: string; password: string; user: UserProfile }[] = [
  {
    login: 'admin',
    password: 'admin123',
    user: {
      id: 'user_admin',
      user_id: 'user_admin',
      name: 'Super Administrator',
      role: 'superadmin',
      company_id: 'system',
      company_name: 'Tizim Boshqaruvi',
      login: 'admin',
      phone: '+998 90 000 00 01',
      avatarInitials: 'SA'
    }
  },
  {
    login: 'ibroxim',
    password: 'ibroxim2026',
    user: {
      id: 'user_ibroxim',
      user_id: 'user_ibroxim',
      name: 'Ibroxim Toirov',
      role: 'company_admin',
      company_id: 'comp_default',
      company_name: 'Asosiy Kompaniya',
      login: 'ibroxim',
      phone: '+998 90 123 45 67',
      avatarInitials: 'IT'
    }
  },
  {
    login: 'menejer1',
    password: '123456',
    user: {
      id: 'user_mgr1',
      user_id: 'user_mgr1',
      name: 'Alisher Karimov',
      role: 'manager',
      company_id: 'comp_default',
      company_name: 'Asosiy Kompaniya',
      login: 'menejer1',
      phone: '+998 91 234 56 78',
      avatarInitials: 'AK'
    }
  },
  {
    login: 'tashkent_mgr',
    password: '123456',
    user: {
      id: 'user_tashkent_1',
      user_id: 'user_tashkent_1',
      name: 'Rustam Rahimov',
      role: 'manager',
      company_id: 'comp_tashkent',
      company_name: 'Toshkent Stroy Invest',
      login: 'tashkent_mgr',
      phone: '+998 97 999 88 77',
      avatarInitials: 'RR'
    }
  }
];

/** Validate login credentials. Returns a UserProfile on success, null on failure. */
export function validateCredentials(login: string, password: string): UserProfile | null {
  const match = SEED_CREDENTIALS.find(
    (c) => c.login.toLowerCase() === login.trim().toLowerCase() && c.password === password
  );
  return match ? match.user : null;
}

