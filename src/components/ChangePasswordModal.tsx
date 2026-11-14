import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  targetEmail?: string;
  targetName?: string;
  onPasswordChanged?: (email: string, newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  targetEmail,
  targetName,
  onPasswordChanged,
}) => {
  const {
    isChangePasswordOpen,
    setIsChangePasswordOpen,
    changePassword,
    adminSetUserPassword,
    hasPasswordCredential,
    hasGoogleCredential,
    linkEmailPasswordCredential,
    currentUser,
    userProfile,
    showToast,
  } = useAuth();

  const isControlled = propIsOpen !== undefined;
  const showModal = isControlled ? propIsOpen : isChangePasswordOpen;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeEmail = targetEmail || currentUser?.email || userProfile?.email || '';
  const isAdminSettingForOther = Boolean(targetEmail && targetEmail !== currentUser?.email);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    if (isControlled && propOnClose) {
      propOnClose();
    } else {
      setIsChangePasswordOpen(false);
    }
  };

  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 4);
  };

  const strengthScore = calculateStrength(newPassword);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = 'Sunno@';
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNew(true);
    setShowConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your new password.');
      return;
    }

    if (!isAdminSettingForOther && hasPasswordCredential && !currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdminSettingForOther && targetEmail) {
        await adminSetUserPassword(targetEmail, newPassword);
        if (onPasswordChanged) onPasswordChanged(targetEmail, newPassword);
        showToast(`Official Firebase password reset link sent to ${targetEmail}`, 'success');
      } else if (!hasPasswordCredential) {
        // Link Email & Password credential to the current Google account
        const linkRes = await linkEmailPasswordCredential(newPassword);
        if (onPasswordChanged) onPasswordChanged(activeEmail, newPassword);
        showToast(linkRes.message || 'Email & Password credential linked successfully!', 'success');
      } else {
        // Update existing password
        await changePassword(currentPassword, newPassword);
        if (onPasswordChanged) onPasswordChanged(activeEmail, newPassword);
        showToast('Password updated successfully! Both Google and Password logins remain active.', 'success');
      }
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <div
      id="change-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="change-password-modal-dialog"
        className="relative w-full max-w-md bg-[#fbf9f8] rounded-3xl shadow-2xl border border-[#c1c9be]/30 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#002c11] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <span className="material-symbols-outlined text-2xl">key</span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isAdminSettingForOther
                  ? 'Set User Access Password'
                  : !hasPasswordCredential
                  ? 'Link Email & Password Sign-In'
                  : 'Change Password'}
              </h3>
              <p className="text-xs text-white/70 font-mono mt-0.5 truncate max-w-[240px]">
                {targetName ? `${targetName} (${activeEmail})` : activeEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-600 flex-shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {isAdminSettingForOther && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700 flex-shrink-0 mt-0.5">
                admin_panel_settings
              </span>
              <div>
                <span className="font-semibold block">Administrative Password Reset</span>
                <span>
                  This triggers an official Firebase password reset email to {targetEmail}.
                </span>
              </div>
            </div>
          )}

          {!isAdminSettingForOther && !hasPasswordCredential && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-700 flex-shrink-0 mt-0.5">
                link
              </span>
              <div>
                <span className="font-semibold block">Link Direct Email & Password Sign-In</span>
                <span>
                  Set an access password below. This preserves your existing account UID, roles, and data while enabling direct login with Email & Password on any browser or device.
                </span>
              </div>
            </div>
          )}

          {/* Current Password - Only required if user has an existing password */}
          {!isAdminSettingForOther && hasPasswordCredential && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#717970] mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#c1c9be]/50 rounded-xl text-sm text-[#191c1a] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717970] hover:text-[#191c1a]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showCurrent ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#717970]">
                New Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-semibold text-[#1b6d24] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">autorenew</span>
                Generate Strong
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#c1c9be]/50 rounded-xl text-sm text-[#191c1a] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717970] hover:text-[#191c1a]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Password strength bar */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthScore <= 1
                        ? 'w-1/4 bg-red-500'
                        : strengthScore === 2
                        ? 'w-2/4 bg-amber-500'
                        : strengthScore === 3
                        ? 'w-3/4 bg-emerald-500'
                        : 'w-full bg-emerald-600'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#717970]">
                  <span>
                    Strength:{' '}
                    <strong
                      className={
                        strengthScore <= 1
                          ? 'text-red-600'
                          : strengthScore === 2
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }
                    >
                      {strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : strengthScore === 3 ? 'Good' : 'Strong'}
                    </strong>
                  </span>
                  <span>Min. 6 chars</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#717970] mb-1.5">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-sm text-[#191c1a] focus:outline-none font-mono ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400'
                    : 'border-[#c1c9be]/50 focus:ring-2 focus:ring-[#1b6d24]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717970] hover:text-[#191c1a]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-600 mt-1">Passwords do not match.</p>
            )}
            {confirmPassword && confirmPassword === newPassword && (
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Passwords match
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#c1c9be]/20">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold text-[#717970] hover:bg-[#f0eded] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (newPassword.length > 0 && newPassword !== confirmPassword)}
              className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  {isAdminSettingForOther ? 'Save Access Password' : 'Save New Password'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
