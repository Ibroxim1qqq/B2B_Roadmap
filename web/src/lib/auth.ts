import { UserProfile } from './types';
import { rememberCompanyDataSource } from './company';

const STORAGE_KEY = 'b2b_samarkand_current_user';

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** A display cache of the signed-in profile. Access is decided by the server session, never by this value. */
export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && 'password' in user) {
      // Older versions stored the password here.
      delete user.password;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    rememberCompanyDataSource(user?.company_id, user?.data_source);
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  rememberCompanyDataSource(user.company_id, user.data_source);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set user in localStorage:', e);
  }
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user in localStorage:', e);
  }
}

export function logout(): void {
  clearStoredUser();
  if (typeof window !== 'undefined') {
    fetch('/api/auth/logout', { method: 'POST' }).catch(err => console.warn('Logout request failed:', err));
  }
}
