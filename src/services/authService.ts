/**
 * SUNNO Marketplace - Production Authentication & Recovery Service
 * Strictly adheres to Firebase Authentication standards.
 * Plain-text passwords, OTPs, or reset codes are never persisted or logged.
 */

import {
  User,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  ActionCodeSettings,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const REDIRECT_AFTER_AUTH_KEY = 'sunno_redirect_after_auth';

/**
 * Validates Bangladesh mobile phone numbers (+8801[3-9]\d{8} or 01[3-9]\d{8})
 */
export function validateBangladeshPhoneNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, formatted: '', error: 'Mobile number is required.' };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
  let formatted = cleaned;

  if (formatted.startsWith('01')) {
    formatted = '+88' + formatted;
  } else if (formatted.startsWith('8801')) {
    formatted = '+' + formatted;
  } else if (!formatted.startsWith('+8801')) {
    return {
      valid: false,
      formatted: '',
      error: 'Please enter a valid Bangladesh mobile number starting with 01 or +8801 (e.g. +8801712345678).',
    };
  }

  // BD mobile regex: +8801[3-9]\d{8} (total 14 characters)
  const bdRegex = /^\+8801[3-9]\d{8}$/;
  if (!bdRegex.test(formatted)) {
    return {
      valid: false,
      formatted: '',
      error: 'Invalid Bangladesh mobile number. Operator prefix must be 013-019 followed by 8 digits.',
    };
  }

  return { valid: true, formatted };
}

/**
 * Validates password strength (minimum 6 characters, checks confirmation)
 */
export function validatePasswordSecurity(
  password: string,
  confirmPassword?: string
): { valid: boolean; error?: string; score: number } {
  if (!password) {
    return { valid: false, error: 'Password is required.', score: 0 };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.', score: 1 };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Password confirmation does not match.', score: 2 };
  }

  let score = 1;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  return { valid: true, score };
}

/**
 * Friendly auth error messages in English with Bangla context
 */
export function formatAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid Bangladesh mobile number (+8801...).';
    case 'auth/invalid-verification-code':
      return 'Invalid SMS verification code. Please check your SMS and enter the 6-digit OTP.';
    case 'auth/code-expired':
      return 'SMS verification code has expired. Please request a new OTP.';
    case 'auth/captcha-check-failed':
      return 'SMS reCAPTCHA security verification failed. Please refresh the page and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email address under a different sign-in provider.';
    case 'auth/expired-action-code':
      return 'This password reset link has expired. Please request a fresh reset link.';
    case 'auth/invalid-action-code':
      return 'This password reset link is invalid or has already been used. Please request a new link.';
    case 'auth/user-disabled':
      return 'This account has been suspended by platform administration. Contact support@sunno.eco.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Phone SMS authentication Firebase Console এ বর্তমানে enable করা নেই। অনুগ্রহ করে Email & Password অথবা Google দিয়ে Sign In করুন (অথবা Firebase Console -> Authentication -> Sign-in method এ Phone provider টি Enable করুন)।';
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      return `This domain (${currentHost}) is not authorized for Google Sign-In in Firebase Console. Please sign in with Email & Password below, or add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    case 'auth/multi-factor-auth-required':
      return 'Two-factor security authentication (2FA/MFA) is required for this Firebase account. Please sign in with Google or complete two-step verification.';
    default:
      return err?.message || 'Unable to complete authentication. Please try again.';
  }
}

/**
 * Sends a real password reset email via Firebase Authentication
 */
export async function sendRealPasswordResetEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sunno.eco';
  const actionCodeSettings: ActionCodeSettings = {
    url: `${currentOrigin}/#auth?mode=resetPassword`,
    handleCodeInApp: true,
  };

  try {
    await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
  } catch (err: any) {
    console.warn('sendPasswordResetEmail with ActionCodeSettings failed, retrying standard dispatch:', err);
    await sendPasswordResetEmail(auth, cleanEmail);
  }
}

/**
 * Checks if a specific provider (e.g. 'google.com' or 'password') is linked to the user account
 */
export function isAccountProviderLinked(user: User | null, providerId: string): boolean {
  if (!user || !user.providerData) return false;
  return user.providerData.some((p) => p.providerId === providerId);
}

/**
 * Links an Email & Password credential to an existing Google-authenticated account.
 * Preserves the exact existing Firebase UID, role, and Firestore records.
 */
export async function linkAdminEmailPasswordCredential(
  password: string
): Promise<{ success: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated administrator found. Please authenticate with Google first.');
  }

  const val = validatePasswordSecurity(password);
  if (!val.valid) {
    throw new Error(val.error || 'Password must be at least 6 characters long.');
  }

  const credential = EmailAuthProvider.credential(user.email, password);

  try {
    const linkResult = await linkWithCredential(user, credential);
    await linkResult.user.reload();
    return {
      success: true,
      message: 'Email & Password credential linked successfully! You can now sign in using either Google or Email & Password.',
    };
  } catch (err: any) {
    console.warn('linkWithCredential error:', err);
    if (err?.code === 'auth/credential-already-in-use') {
      throw new Error(
        'This email address already has a password credential configured in Firebase. You can log in using that password or reset it via "Forgot password?".'
      );
    }
    if (err?.code === 'auth/provider-already-linked') {
      await updatePassword(user, password);
      return {
        success: true,
        message: 'Password updated successfully! Both Google and Email/Password logins are active.',
      };
    }
    if (err?.code === 'auth/requires-recent-login') {
      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, googleProvider);
      const linkResult = await linkWithCredential(user, credential);
      await linkResult.user.reload();
      return {
        success: true,
        message: 'Email & Password credential linked successfully after reauthentication!',
      };
    }
    throw new Error(formatAuthError(err));
  }
}

/**
 * Updates the password for an account that already has a password credential.
 */
export async function updateExistingPassword(
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No active user found to update password.');
  }

  const val = validatePasswordSecurity(newPassword);
  if (!val.valid) {
    throw new Error(val.error || 'Password must be at least 6 characters long.');
  }

  try {
    if (currentPassword) {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
    }
    await updatePassword(user, newPassword);
    return { success: true, message: 'Password updated successfully!' };
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, googleProvider);
      await updatePassword(user, newPassword);
      return { success: true, message: 'Password updated successfully after reauthentication!' };
    }
    throw new Error(formatAuthError(err));
  }
}

/**
 * Validates a password reset action code and retrieves the target email
 */
export async function verifyResetActionCode(actionCode: string): Promise<string> {
  if (!actionCode || !actionCode.trim()) {
    throw new Error('Missing password reset action code.');
  }
  return await verifyPasswordResetCode(auth, actionCode.trim());
}

/**
 * Confirms a new password using Firebase Authentication
 */
export async function confirmRealPasswordReset(actionCode: string, newPassword: string): Promise<void> {
  if (!actionCode || !actionCode.trim()) {
    throw new Error('Missing password reset action code.');
  }
  const val = validatePasswordSecurity(newPassword);
  if (!val.valid) {
    throw new Error(val.error);
  }
  await confirmPasswordReset(auth, actionCode.trim(), newPassword);
}

/**
 * Applies an email verification action code
 */
export async function applyEmailVerificationCode(actionCode: string): Promise<void> {
  if (!actionCode || !actionCode.trim()) {
    throw new Error('Missing verification action code.');
  }
  await applyActionCode(auth, actionCode.trim());
}

/**
 * Sends or resends verification email to the current authenticated user
 */
export async function sendUserEmailVerification(user: User): Promise<void> {
  if (!user) throw new Error('User is not authenticated.');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sunno.eco';
  const actionCodeSettings: ActionCodeSettings = {
    url: `${currentOrigin}/#auth?mode=verifyEmail`,
    handleCodeInApp: true,
  };
  await sendEmailVerification(user, actionCodeSettings);
}

/**
 * Session storage helpers for redirecting users back to requested URLs after login
 */
export function setRedirectAfterAuth(url: string): void {
  if (typeof window !== 'undefined' && url) {
    sessionStorage.setItem(REDIRECT_AFTER_AUTH_KEY, url);
  }
}

export function getRedirectAfterAuth(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(REDIRECT_AFTER_AUTH_KEY);
  }
  return null;
}

export function clearRedirectAfterAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(REDIRECT_AFTER_AUTH_KEY);
  }
}
