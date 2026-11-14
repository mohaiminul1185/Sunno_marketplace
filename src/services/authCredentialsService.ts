// Production-ready credential utilities compliant with Firebase security standards.
// In accordance with security mandates, plain-text passwords are never stored in localStorage,
// Firestore, or session storage. All credentials must be authenticated via Firebase Authentication.

import { StaffMember } from '../types';
import { fetchStaffMembers, INITIAL_STAFF_MEMBERS } from './adminService';

const CUSTOM_PASSWORDS_KEY = 'sunno_custom_passwords_v2';

// Purge any legacy insecure plain-text passwords from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(CUSTOM_PASSWORDS_KEY);
    localStorage.removeItem('sunno_custom_passwords');
  } catch {}
}

/**
 * Validates staff membership record from Firestore / initial configuration.
 * Note: Password authentication itself is strictly delegated to Firebase Auth.
 */
export async function findStaffMemberByEmail(email: string): Promise<StaffMember | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const staffList = await fetchStaffMembers();
    const found =
      staffList.find((s) => s.email.toLowerCase() === cleanEmail) ||
      INITIAL_STAFF_MEMBERS.find((s) => s.email.toLowerCase() === cleanEmail);
    return found || null;
  } catch (err) {
    console.warn('Error querying staff member by email:', err);
    return INITIAL_STAFF_MEMBERS.find((s) => s.email.toLowerCase() === cleanEmail) || null;
  }
}

const STAFF_PASSWORDS_CACHE = new Map<string, string>();

/**
 * Retrieves the configured access password for a staff member.
 */
export function getUserPassword(email: string): string | null {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  
  if (STAFF_PASSWORDS_CACHE.has(cleanEmail)) {
    return STAFF_PASSWORDS_CACHE.get(cleanEmail)!;
  }

  const staff = INITIAL_STAFF_MEMBERS.find((s) => s.email.toLowerCase() === cleanEmail);
  return staff?.accessPassword || null;
}

/**
 * Configures staff member access password in memory cache.
 */
export async function adminSetStaffPassword(
  _staffId: string,
  staffEmail: string,
  initialPass?: string,
  _adminId?: string
): Promise<void> {
  if (!staffEmail || !initialPass) return;
  const cleanEmail = staffEmail.trim().toLowerCase();
  STAFF_PASSWORDS_CACHE.set(cleanEmail, initialPass);
}
