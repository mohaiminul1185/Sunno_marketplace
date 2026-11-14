import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    authModalNotice,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginWithFacebook,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'seller'>('customer');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code.includes('user-not-found') || code.includes('invalid-credential')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code.includes('wrong-password')) {
      return 'Incorrect password. Please try again or reset your password.';
    }
    if (code.includes('email-already-in-use')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code.includes('weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'Sign-in window was closed before completing authentication.';
    }
    if (code.includes('operation-not-allowed')) {
      return 'This sign-in method is not enabled yet in Firebase Console.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else if (authModalMode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        await registerWithEmail(email.trim(), password, fullName.trim(), selectedRole);
      } else if (authModalMode === 'forgot_password') {
        if (!email.trim()) {
          throw new Error('Please enter your registered email address.');
        }
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMessage('Password reset link sent! Please check your email inbox.');
      }
    } catch (err: any) {
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithFacebook();
      }
    } catch (err: any) {
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-[430px] bg-white rounded-[28px] shadow-[0_25px_70px_-15px_rgba(0,44,17,0.35)] border border-stone-200/80 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#002c11] via-[#1b6d24] to-[#30e872]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close modal"
          className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-stone-100/90 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="px-8 pt-7 pb-4 text-center bg-gradient-to-b from-[#f2faf3] via-[#f9fcfa] to-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#002c11] shadow-lg shadow-[#002c11]/20 mb-3.5">
            <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
              <circle cx="18" cy="18" r="13" stroke="#a0f399" strokeWidth="2.4" strokeDasharray="62 12" />
              <path
                d="M12.5 21.5C12.5 15.5 17.5 11.5 23.5 11.5C23.5 17.5 19.5 22.5 13.5 22.5"
                stroke="#30e872"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M11.5 24.5L17.5 18.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="text-[11px] font-black tracking-[0.22em] uppercase text-[#1b6d24]">
            SUNNO ECO-MARKETPLACE
          </div>

          <h2 className="text-[22px] font-black text-[#002c11] tracking-tight mt-1">
            {authModalMode === 'login' && 'Welcome Back'}
            {authModalMode === 'signup' && 'Create Your Account'}
            {authModalMode === 'forgot_password' && 'Reset Password'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {authModalMode === 'login' && 'Sign in with your Email or Social Account'}
            {authModalMode === 'signup' && 'Join Bangladesh’s 100% verified sustainable marketplace'}
            {authModalMode === 'forgot_password' && 'Enter your email address to receive a recovery link'}
          </p>
        </div>

        <div className="px-7 pb-7">
          {authModalNotice && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{authModalNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {authModalMode === 'signup' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl mb-4 border border-stone-200/60">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRole === 'customer'
                    ? 'bg-white text-[#002c11] shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Shop as Customer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('seller')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRole === 'seller'
                    ? 'bg-white text-[#002c11] shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sell as Artisan
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Mohaiminul Islam"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-[#1b6d24] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-[#1b6d24] focus:bg-white transition-all"
                />
              </div>
            </div>

            {authModalMode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    Password
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('forgot_password')}
                      className="text-[11px] font-bold text-[#1b6d24] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-[#1b6d24] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#002c11]/20 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {authModalMode === 'login' && 'Sign In'}
                    {authModalMode === 'signup' && 'Create Account'}
                    {authModalMode === 'forgot_password' && 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {authModalMode !== 'forgot_password' && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-3 text-stone-400 font-bold tracking-widest">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSocialLogin('google')}
                  className="py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50/90 rounded-xl text-xs font-bold text-stone-700 flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.02v3.14C3.05 21.2 7.24 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.02C.37 7.47 0 8.92 0 10.48s.37 3.01 1.02 4.3l4.01-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.02 6.82l4.01 3.14c.98-2.94 3.73-5.21 6.97-5.21Z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSocialLogin('facebook')}
                  className="py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50/90 rounded-xl text-xs font-bold text-stone-700 flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col items-center gap-2.5">
            <div className="text-xs text-stone-600">
              {authModalMode === 'login' ? (
                <>
                  New to SUNNO?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('signup')}
                    className="font-bold text-[#1b6d24] hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('login')}
                    className="font-bold text-[#1b6d24] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1b6d24]" />
              <span>Protected by SUNNO 256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
