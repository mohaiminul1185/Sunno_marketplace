import React, { useState } from 'react';
import { ActiveTab, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { BRAND_LOGO } from '../data/mockData';

interface AdminLoginViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ setActiveTab }) => {
  const {
    login,
    loginWithGoogle,
    resetPassword,
    linkEmailPasswordCredential,
    role,
    userProfile,
    showToast,
  } = useAuth();
  const [email, setEmail] = useState('himel1176cse.uits@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Post-Google login credential linking step
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [authenticatedEmail, setAuthenticatedEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkConfirmPassword, setLinkConfirmPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomainHost(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      const currentUser = auth.currentUser;
      const hasPassword = Boolean(currentUser?.providerData?.some((p) => p.providerId === 'password'));

      if (!hasPassword) {
        setAuthenticatedEmail(currentUser?.email || email);
        setShowLinkPrompt(true);
      } else {
        window.location.hash = '#admin';
        setActiveTab('admin');
      }
    } catch (err: any) {
      console.warn('Admin Google login error:', err);
      const isDomainError =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('unauthorized domain');

      if (isDomainError) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setUnauthorizedDomainHost(host);
        setError(
          `Domain (${host}) is not in Firebase Authorized Domains. Please use Email & Password below, or add this domain in Firebase Console.`
        );
      } else {
        setError(err?.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLinkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    if (linkPassword.length < 6) {
      setLinkError('Password must contain at least 6 characters.');
      return;
    }
    if (linkPassword !== linkConfirmPassword) {
      setLinkError('Passwords do not match. Please verify your new password.');
      return;
    }

    setIsLinking(true);
    try {
      const res = await linkEmailPasswordCredential(linkPassword);
      showToast(res.message || 'Password linked! You can now sign in with Email & Password on any device.', 'success');
      window.location.hash = '#admin';
      setActiveTab('admin');
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to link password credential. You can still proceed to Admin Console.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSkipLinking = () => {
    window.location.hash = '#admin';
    setActiveTab('admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    try {
      const profile = await login(cleanEmail, password);
      const targetRole = profile?.role;
      const isKnownStaffEmail =
        cleanEmail === 'himel1176cse.uits@gmail.com' ||
        cleanEmail === 'admin@sunno.eco' ||
        cleanEmail === 'mohaiminul1185@gmail.com' ||
        cleanEmail === 'mdshantogazi2005@gmail.com';
      const isAuthorized =
        isKnownStaffEmail ||
        targetRole === 'admin' ||
        targetRole === 'super_admin' ||
        targetRole === 'moderator' ||
        (profile?.permissions && profile.permissions.length > 0);

      if (isAuthorized) {
        window.location.hash = '#admin';
        setActiveTab('admin');
      } else {
        setError('This account does not have platform administrative or staff privileges.');
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (
        err?.code === 'auth/multi-factor-auth-required' ||
        errMsg.toLowerCase().includes('two-factor') ||
        errMsg.toLowerCase().includes('multi-factor') ||
        errMsg.toLowerCase().includes('2-step')
      ) {
        setError(
          'Two-factor authentication (2FA) is enforced on this Firebase Admin account. Please click "Sign In with Staff Google Account" below to authenticate securely.'
        );
      } else {
        setError(errMsg || 'Authentication failed. Please verify credentials with your Firebase administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdminPassword = async () => {
    if (!email) {
      setError('Please enter your administrator email first.');
      return;
    }
    setError(null);
    setIsResetting(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setTimeout(() => setResetSent(false), 8000);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07170d] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1b6d24]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Marketplace */}
      <button
        onClick={() => {
          window.location.hash = '#home';
          setActiveTab('home');
        }}
        className="absolute top-6 left-6 text-xs text-[#a0f399] hover:text-white flex items-center gap-1.5 transition-colors font-medium"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Return to Public Marketplace
      </button>

      <div className="max-w-md w-full bg-[#0d2216] border border-[#1e442c] rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#143321] border border-[#235334] mb-4 shadow-inner">
            <img src={BRAND_LOGO} alt="SUNNO Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white tracking-tight">
            SUNNO Admin Console
          </h1>
          <p className="text-xs text-[#8ca893] mt-1">
            Platform Moderation, Eco Verification & Multi-District Management
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/80 border border-red-800/80 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-red-400">warning</span>
            <span>{error}</span>
          </div>
        )}

        {unauthorizedDomainHost && (
          <div className="mb-6 p-4 bg-amber-950/90 border border-amber-600/80 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5">
                domain_disabled
              </span>
              <div className="space-y-2 w-full">
                <p className="font-bold text-amber-200">Firebase Unauthorized Domain</p>
                <p className="text-amber-300/90 leading-relaxed">
                  অন্য ডিভাইসে Google Sign-In চালু করতে Firebase Console-এ এই ডোমেইনটি যোগ করতে হবে:
                </p>
                <div className="flex items-center gap-2 bg-[#08180d] p-2 rounded-xl border border-amber-800/60 font-mono text-[11px] text-white">
                  <span className="truncate flex-1">{unauthorizedDomainHost}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unauthorizedDomainHost);
                      setCopiedHost(true);
                      setTimeout(() => setCopiedHost(false), 3000);
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[10px] shrink-0 transition-colors"
                  >
                    {copiedHost ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>
                <div className="text-[11px] text-amber-300/80 space-y-1">
                  <p className="font-semibold text-amber-200">Firebase Console এ যেভাবে যোগ করবেন:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-stone-300">
                    <li>Firebase Console → <strong>Authentication</strong> এ যান</li>
                    <li><strong>Settings</strong> ট্যাবে ক্লিক করে <strong>Authorized domains</strong> এ যান</li>
                    <li><strong>Add domain</strong> বাটনে ক্লিক করে কপি করা ডোমেইনটি পেস্ট করুন</li>
                  </ol>
                </div>
                <div className="pt-2 border-t border-amber-800/50 flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] text-emerald-300 font-semibold">
                    💡 কোনো কনসোল সেটিংস ছাড়াই এখনই নিচের Email & Password ফর্ম দিয়ে প্রবেশ করুন:
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {resetSent && (
          <div className="mb-6 p-3.5 bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            <span>A password reset link has been dispatched to {email}. Please check your inbox.</span>
          </div>
        )}

        {showLinkPrompt ? (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-950/80 border border-emerald-600/80 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                <span>Google Sign-In Verified</span>
              </div>
              <p className="text-emerald-200/90 text-[11px]">
                Signed in as <strong className="text-white font-mono">{authenticatedEmail}</strong>.
              </p>
              <p className="text-emerald-300/80 text-[11px] leading-relaxed">
                Set an access password below so you can sign in directly with <strong>Email & Password</strong> on any device or browser without Google.
              </p>
            </div>

            {linkError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-red-400">error</span>
                <span>{linkError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteLinkPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#b5cdbc] mb-1.5 uppercase tracking-wider">
                  New Access Password (min 6 characters)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#6b8c73]">
                    lock
                  </span>
                  <input
                    type={showLinkPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full bg-[#143321] border border-[#235334] focus:border-[#a0f399] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-[#52705a] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkPassword(!showLinkPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b8c73] hover:text-[#a0f399]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showLinkPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5cdbc] mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#6b8c73]">
                    lock_reset
                  </span>
                  <input
                    type={showLinkPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={linkConfirmPassword}
                    onChange={(e) => setLinkConfirmPassword(e.target.value)}
                    placeholder="Confirm secure password"
                    className="w-full bg-[#143321] border border-[#235334] focus:border-[#a0f399] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-[#52705a] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLinking}
                  className="w-full py-3.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isLinking ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      Set Password & Enter Admin Console
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkipLinking}
                  disabled={isLinking}
                  className="w-full py-2.5 bg-transparent hover:bg-white/5 text-[#a0f399] font-semibold text-xs rounded-xl transition-all"
                >
                  Skip for Now & Enter Admin Console →
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#b5cdbc] mb-1.5 uppercase tracking-wider">
                Administrator Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#6b8c73]">
                  badge
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sunno.eco"
                  className="w-full bg-[#143321] border border-[#235334] focus:border-[#a0f399] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-[#52705a] outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#b5cdbc] uppercase tracking-wider">
                  Security Key / Password
                </label>
                <button
                  type="button"
                  onClick={handleResetAdminPassword}
                  disabled={isResetting}
                  className="text-[11px] text-[#a0f399] hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                >
                  {isResetting ? 'Sending link...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#6b8c73]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#143321] border border-[#235334] focus:border-[#a0f399] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-[#52705a] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b8c73] hover:text-[#a0f399] transition-colors"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">security</span>
                    Authenticate & Launch Admin Console
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-[#143321] hover:bg-[#1c452d] text-white border border-[#2d603f] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Staff Google Account</span>
              </button>
            </div>
          </form>
        )}


        {/* Security Notice */}
        <div className="mt-6 text-center text-[10px] text-[#5e7d66] flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[12px]">verified_user</span>
          <span>Protected with TLS 1.3 & Firestore Security Audit Logging</span>
        </div>
      </div>
    </div>
  );
};
