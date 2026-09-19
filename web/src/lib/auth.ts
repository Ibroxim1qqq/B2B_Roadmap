import { UserProfile } from './types';

const STORAGE_KEY = 'b2b_samarkand_current_user';

export const DEFAULT_TEAM_MEMBERS: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Ibroxim Toirov',
    role: 'Field Sales',
    phone: '+998 90 123 45 67',
    avatarInitials: 'IT'
  },
  {
    id: 'user_2',
    name: 'Anvar Aliyev',
    role: 'B2B Savdo Menejeri',
    phone: '+998 91 234 56 78',
    avatarInitials: 'AA'
  },
  {
    id: 'user_3',
    name: 'Dilshod Karimov',
    role: "Sotuv Bo'limi Boshlig'i",
    phone: '+998 93 345 67 89',
    avatarInitials: 'DK'
  },
  {
    id: 'user_4',
    name: 'Sherzod Rustamov',
    role: 'Hududiy Vakil (Kattaqo\'rg\'on)',
    phone: '+998 97 456 78 90',
    avatarInitials: 'SR'
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

export function createCustomUser(name: string, role = 'Menejer', phone = ''): UserProfile {
  const cleanName = name.trim();
  return {
    id: `user_${Date.now()}`,
    name: cleanName,
    role: role.trim() || 'Menejer',
    phone: phone.trim(),
    avatarInitials: getInitials(cleanName)
  };
}

/** Validate login credentials. Returns a UserProfile on success, null on failure. */
export function validateCredentials(login: string, password: string): UserProfile | null {
  // Default credentials
  const VALID_CREDENTIALS: { login: string; password: string; user: UserProfile }[] = [
    {
      login: 'b2b',
      password: 'b2b',
      user: {
        id: 'admin_1',
        name: 'B2B Admin',
        role: 'Administrator',
        phone: '',
        avatarInitials: 'BA'
      }
    }
  ];

  const match = VALID_CREDENTIALS.find(
    (c) => c.login === login.trim() && c.password === password
  );
  return match ? match.user : null;
}
