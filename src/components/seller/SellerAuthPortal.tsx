import React, { useState } from 'react';
import { useAuth, validateBangladeshPhoneNumber, formatAuthError } from '../../context/AuthContext';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../../data/bangladeshDistricts';
import { SellerProfile } from '../../types';
import {
  Store,
  Mail,
  Lock,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Clock,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SellerAuthPortalProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialMode?: 'signin' | 'register';
}

export const SellerAuthPortal: React.FC<SellerAuthPortalProps> = ({
  onSuccess,
  onCancel,
  initialMode = 'register',
}) => {
  const {
    currentUser,
    userProfile,
    role,
    login,
    signup,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    resetPassword,
    registerSellerAccount,
    showToast,
  } = useAuth();

  const [activeMode, setActiveMode] = useState<'signin' | 'register'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Sign In Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Phone OTP Sign In
  const [loginPhone, setLoginPhone] = useState('+8801');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Multi-step Registration
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: Account
  const [regFullName, setRegFullName] = useState(userProfile?.fullName || userProfile?.displayName || '');
  const [regEmail, setRegEmail] = useState(userProfile?.email || '');
  const [regPhone, setRegPhone] = useState(userProfile?.phoneNumber || userProfile?.phone || '+8801');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // STEP 2: Store Information
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeDivision, setStoreDivision] = useState('Dhaka');
  const [storeDistrict, setStoreDistrict] = useState('Dhaka');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Bamboo & Cane', 'Jute & Natural Fiber']);

  // STEP 3: Seller Information
  const [businessType, setBusinessType] = useState<'artisan' | 'cooperative' | 'registered_producer'>('artisan');
  const [nidOrTradeLicense, setNidOrTradeLicense] = useState('');
  const [artisanBackground, setArtisanBackground] = useState('');
  const [ecoProductInfo, setEcoProductInfo] = useState('');

  // STEP 4: Terms Acceptance
  const [agreeSellerTerms, setAgreeSellerTerms] = useState(false);
  const [agreeMarketplacePolicy, setAgreeMarketplacePolicy] = useState(false);
  const [agreeEcoCharter, setAgreeEcoCharter] = useState(false);

  // State flags
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedPending, setSubmittedPending] = useState(false);

  // Available districts for chosen division
  const availableDistricts = ALL_64_DISTRICTS.filter((d) => d.division === storeDivision);

  const CATEGORY_OPTIONS = [
    'Bamboo & Cane',
    'Jute & Natural Fiber',
    'Terracotta & Pottery',
    'Handloom & Nakshi Kantha',
    'Natural Herbal & Wellness',
    'Recycled Craft & Decor',
    'Organic Kitchen Goods',
  ];

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // ----------------- LOGIN HANDLER -----------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (authMethod === 'email') {
        if (!loginEmail || !loginPassword) {
          throw new Error('Please enter both email and password.');
        }
        await login(loginEmail, loginPassword);
        if (onSuccess) onSuccess();
      } else {
        // Phone sign in flow
        if (!otpSent) {
          const confirmation = await sendPhoneOtp(loginPhone);
          setConfirmationResult(confirmation);
          setOtpSent(true);
        } else {
          if (!otpCode || otpCode.length < 6) {
            throw new Error('Please enter the 6-digit verification code.');
          }
          await verifyPhoneOtp(confirmationResult, otpCode, undefined, 'seller');
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await resetPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------- MULTI-STEP REGISTRATION HANDLERS -----------------
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (step === 1) {
      if (!regFullName.trim()) {
        setErrorMessage('Please enter your full legal or artisan name.');
        return;
      }
      if (!currentUser && !regEmail.trim()) {
        setErrorMessage('Please provide a valid email address.');
        return;
      }
      const phoneValidation = validateBangladeshPhoneNumber(regPhone);
      if (!phoneValidation.valid) {
        setErrorMessage(phoneValidation.error || 'Please enter a valid Bangladesh phone (+8801XXXXXXXXX).');
        return;
      }
      if (!currentUser) {
        if (!regPassword || regPassword.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          return;
        }
        if (regPassword !== regConfirmPassword) {
          setErrorMessage('Passwords do not match. Please verify.');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!storeName.trim()) {
        setErrorMessage('Please enter your store or workshop name.');
        return;
      }
      if (!storeDescription.trim()) {
        setErrorMessage('Please provide a brief description of your craft products.');
        return;
      }
      if (selectedCategories.length === 0) {
        setErrorMessage('Please select at least one primary craft category.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!nidOrTradeLicense.trim()) {
        setErrorMessage('Please enter your NID number, trade license, or artisan registration.');
        return;
      }
      if (!artisanBackground.trim()) {
        setErrorMessage('Please describe your artisan background or cooperative history.');
        return;
      }
      setStep(4);
    }
  };

  const handleFinalSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreeSellerTerms || !agreeMarketplacePolicy || !agreeEcoCharter) {
      setErrorMessage('You must accept all three seller agreements to submit your application.');
      return;
    }

    setIsLoading(true);

    try {
      const phoneFormatted = validateBangladeshPhoneNumber(regPhone).formatted || regPhone;

      // 1. If not authenticated, create user first
      if (!currentUser) {
        await signup(regEmail, regPassword, regFullName, 'seller', phoneFormatted);
      }

      // 2. Prepare seller profile payload
      const sellerProfilePayload: Partial<SellerProfile> = {
        fullName: regFullName,
        email: currentUser?.email || regEmail,
        phone: phoneFormatted,
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        division: storeDivision,
        district: storeDistrict,
        categories: selectedCategories,
        ecoProductInfo: `${artisanBackground}\n\nEco practices: ${ecoProductInfo || 'Artisan handcrafted with natural Bangladesh raw materials.'}`,
        nidOrTradeLicense: nidOrTradeLicense.trim(),
        documents: nidOrTradeLicense ? [{ name: 'NID or Trade License', url: '', type: 'nid_or_license' }] : [],
        // ALWAYS pending upon registration
        status: 'pending',
      };

      await registerSellerAccount(sellerProfilePayload);
      setSubmittedPending(true);
      showToast('Seller application submitted successfully. Your account is under review.', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit seller registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------- SUBMITTED PENDING APPLICATION CONFIRMATION SCREEN -----------------
  if (submittedPending) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xl p-8 text-center animate-fadeIn">
        <div className="w-16 h-16 bg-[#e8f5e9] text-[#1b6d24] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-[#002c11] mb-2">Seller Application Submitted Successfully</h2>
        <p className="text-sm text-[#414941] mb-6 max-w-lg mx-auto">
          Your seller account is under review. You will be notified when your account is approved.
        </p>

        <div className="bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30 p-5 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#c1c9be]/20">
            <span className="text-[#717970] font-medium">Store Name</span>
            <span className="font-bold text-[#002c11]">{storeName || 'Your Artisan Store'}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#c1c9be]/20">
            <span className="text-[#717970] font-medium">Location</span>
            <span className="font-bold text-[#002c11]">{storeDistrict}, {storeDivision}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#c1c9be]/20">
            <span className="text-[#717970] font-medium">Application Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <Clock className="w-3.5 h-3.5" /> Pending Verification
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#717970] font-medium">Expected Review Window</span>
            <span className="font-semibold text-[#1b6d24]">24 to 48 Hours</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#e8f5e9]/50 border border-[#1b6d24]/20 text-xs text-[#002c11] text-left mb-6 space-y-2">
          <h4 className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1b6d24]" />
            What SUNNO Eco-Verification Team Checks:
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-[#414941]">
            <li>Artisan identity and local rural producer origin</li>
            <li>Verification of natural, biodegradable, or upcycled materials</li>
            <li>Zero-plastic packaging commitment adherence</li>
            <li>Fair artisan wage and community pricing standards</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              if (onSuccess) onSuccess();
            }}
            className="px-6 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-full shadow-md transition-all"
          >
            Go to Seller Dashboard Preview
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-[#f5f3f3] hover:bg-[#e0dede] text-[#414941] font-bold text-xs rounded-full transition-all"
            >
              Return to Marketplace
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6">
      {/* Container Header Banner */}
      <div className="bg-linear-to-r from-[#002c11] via-[#053e1a] to-[#1b6d24] text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#a0f399] mb-3">
            <Store className="w-3.5 h-3.5" />
            SUNNO Rural Artisan &amp; Eco-Seller Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Empowering Bangladesh Craftspersons &amp; Eco-Producers
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-2">
            Sell authentic bamboo, jute, nakshi kantha, and biodegradable goods directly to conscious buyers across all 64 districts.
          </p>

          <div className="mt-4 pt-3 border-t border-emerald-400/30 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-emerald-100 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-[#a0f399]" />
              Manage your crafts, nationwide courier shipments, and finance in real time.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMessage('');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  activeMode === 'login'
                    ? 'bg-white text-[#002c11] shadow'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                Sign In to Store
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setErrorMessage('');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  activeMode === 'register'
                    ? 'bg-[#a0f399] text-[#002c11] shadow'
                    : 'bg-[#a0f399]/20 hover:bg-[#a0f399]/30 text-[#a0f399]'
                }`}
              >
                Register as Seller
              </button>
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-12 translate-y-8">
          <Store className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xl overflow-hidden">
        {/* Toggle Mode Nav */}
        <div className="grid grid-cols-2 border-b border-[#c1c9be]/40 bg-[#fbf9f8]">
          <button
            type="button"
            onClick={() => {
              setActiveMode('register');
              setErrorMessage('');
            }}
            className={`py-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'register'
                ? 'bg-white text-[#002c11] border-b-2 border-[#1b6d24] shadow-2xs'
                : 'text-[#717970] hover:text-[#002c11]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#1b6d24]" />
            Become a Seller &amp; Onboard
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('signin');
              setErrorMessage('');
            }}
            className={`py-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'signin'
                ? 'bg-white text-[#002c11] border-b-2 border-[#1b6d24] shadow-2xs'
                : 'text-[#717970] hover:text-[#002c11]'
            }`}
          >
            <Lock className="w-4 h-4" />
            Existing Seller Sign In
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* -------------------- SELLER SIGN IN MODE -------------------- */}
        {activeMode === 'signin' && (
          <div className="p-6 sm:p-8 max-w-lg mx-auto">
            {/* Auth Method Toggle */}
            <div className="flex bg-[#f5f3f3] p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMethod === 'email' ? 'bg-white text-[#002c11] shadow-2xs' : 'text-[#717970]'
                }`}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMethod === 'phone' ? 'bg-white text-[#002c11] shadow-2xs' : 'text-[#717970]'
                }`}
              >
                Bangladesh Phone (+880)
              </button>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {authMethod === 'email' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#002c11] mb-1.5">Seller Email</label>
                    <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                      <Mail className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                      <input
                        type="email"
                        required
                        placeholder="seller@yourstore.eco"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#002c11]">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-[11px] font-semibold text-[#1b6d24] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                      <Lock className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-[#717970] hover:text-[#002c11]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Bangladesh Phone OTP Auth */
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                      Bangladesh Mobile Number
                    </label>
                    <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                      <Phone className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                      <input
                        type="tel"
                        required
                        disabled={otpSent}
                        placeholder="+8801712345678"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-[#717970] mt-1">
                      Format: +8801XXXXXXXXX (e.g. Grameenphone, Robi, Banglalink, Teletalk)
                    </p>
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                        Enter 6-Digit SMS Verification Code
                      </label>
                      <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                        <Lock className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none font-mono tracking-widest"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                        }}
                        className="mt-1 text-[11px] text-[#1b6d24] hover:underline font-semibold"
                      >
                        Change phone number
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Remember Session */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#414941]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#1b6d24] rounded border-[#c1c9be] focus:ring-[#1b6d24]"
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{authMethod === 'phone' && !otpSent ? 'Send Verification OTP' : 'Sign In to Seller Portal'}</span>
                  </>
                )}
              </button>

              {/* Social Login Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#c1c9be]/40" />
                </div>
                <span className="relative bg-white px-3 text-[11px] text-[#717970] uppercase font-semibold">
                  Or continue with
                </span>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 bg-[#fbf9f8] hover:bg-[#f0eded] border border-[#c1c9be]/50 text-[#002c11] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-2xs"
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
                <span>Continue with Google</span>
              </button>

              {/* Switch to Registration */}
              <div className="pt-2 text-center">
                <p className="text-xs text-[#717970]">
                  Don't have a verified seller account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('register');
                      setErrorMessage('');
                    }}
                    className="font-bold text-[#1b6d24] hover:underline"
                  >
                    Create Seller Account
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- MULTI-STEP SELLER REGISTRATION MODE -------------------- */}
        {activeMode === 'register' && (
          <div className="p-6 sm:p-8">
            {/* Step Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[
                  { num: 1, label: 'Account' },
                  { num: 2, label: 'Store Info' },
                  { num: 3, label: 'Seller Details' },
                  { num: 4, label: 'Eco Terms' },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step === s.num
                          ? 'bg-[#002c11] text-[#a0f399] ring-4 ring-[#a0f399]/20'
                          : step > s.num
                          ? 'bg-[#1b6d24] text-white'
                          : 'bg-[#f5f3f3] text-[#717970]'
                      }`}
                    >
                      {step > s.num ? <FileCheck className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span
                      className={`text-xs font-bold hidden sm:inline ${
                        step >= s.num ? 'text-[#002c11]' : 'text-[#717970]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-[#f5f3f3] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1b6d24] h-full transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* STEP 1: Account Info */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-extrabold text-[#002c11]">Step 1: Artisan Account Setup</h3>
                  <p className="text-xs text-[#717970] mt-1">
                    Provide your primary credentials to secure your seller portal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                    Full Legal Name / Artisan Lead
                  </label>
                  <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                    <User className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anisur Rahman"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">Seller Email Address</label>
                  <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                    <Mail className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                    <input
                      type="email"
                      required
                      disabled={Boolean(currentUser?.email)}
                      placeholder="artisan@sunno.eco"
                      value={currentUser?.email || regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none disabled:opacity-75"
                    />
                  </div>
                  {currentUser && (
                    <p className="text-[11px] text-[#1b6d24] font-medium mt-1">
                      ✓ Connected to your active SUNNO identity ({currentUser.email})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                    Bangladesh Mobile Phone (+8801XXXXXXXXX)
                  </label>
                  <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                    <Phone className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                    <input
                      type="tel"
                      required
                      placeholder="+8801712345678"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-[#717970] mt-1">
                    Required for courier dispatch coordination & dispatch SMS alerts.
                  </p>
                </div>

                {!currentUser && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#002c11] mb-1.5">Password</label>
                      <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                        <Lock className="w-4 h-4 text-[#717970] mr-2 shrink-0" />
                        <input
                          type="password"
                          required
                          placeholder="Min 6 chars"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#002c11] mb-1.5">Confirm Password</label>
                      <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                        <Lock className="w-4 h-4 text-[#717970] mr-2 shrink-0" />
                        <input
                          type="password"
                          required
                          placeholder="Repeat password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-4 py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Store Information</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Store Information */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-4 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-extrabold text-[#002c11]">Step 2: Store & Craft Concept</h3>
                  <p className="text-xs text-[#717970] mt-1">
                    Tell us about your brand, regional origins, and the eco items you produce.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">Store / Workshop Name</label>
                  <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                    <Store className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Savar Bamboo Works, Rajshahi Silk Heritage"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">Store Tagline & Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe your artisan workshop, what materials you specialize in, and what makes your products sustainable."
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 p-3.5 text-xs sm:text-sm text-[#1b1c1c] outline-none focus:border-[#1b6d24] focus:ring-2 focus:ring-[#1b6d24]/10 transition-all"
                  />
                </div>

                {/* Division & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#002c11] mb-1.5">Division</label>
                    <select
                      value={storeDivision}
                      onChange={(e) => {
                        setStoreDivision(e.target.value);
                        const firstDist = ALL_64_DISTRICTS.find((d) => d.division === e.target.value);
                        if (firstDist) setStoreDistrict(firstDist.name);
                      }}
                      className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 text-xs sm:text-sm text-[#1b1c1c] outline-none font-medium"
                    >
                      {BANGLADESH_DIVISIONS.map((div) => (
                        <option key={div.id} value={div.name}>
                          {div.name} Division
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#002c11] mb-1.5">District</label>
                    <select
                      value={storeDistrict}
                      onChange={(e) => setStoreDistrict(e.target.value)}
                      className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 text-xs sm:text-sm text-[#1b1c1c] outline-none font-medium"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} {d.bnName ? `(${d.bnName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-2">
                    Primary Craft Categories (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-[#1b6d24] text-white border-[#1b6d24] shadow-xs'
                              : 'bg-[#fbf9f8] text-[#414941] border-[#c1c9be]/40 hover:border-[#1b6d24]'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 bg-[#f5f3f3] hover:bg-[#e8e6e6] text-[#414941] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Continue to Seller Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Seller Background & Verification Info */}
            {step === 3 && (
              <form onSubmit={handleNextStep} className="space-y-4 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-extrabold text-[#002c11]">Step 3: Verification & Background</h3>
                  <p className="text-xs text-[#717970] mt-1">
                    Provide government / cooperative identification for trust & artisan verification.
                  </p>
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">Artisan Structure</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'artisan', label: 'Artisan Craftsperson' },
                      { id: 'cooperative', label: 'Rural Co-op' },
                      { id: 'registered_producer', label: 'Eco Enterprise' },
                    ].map((bt) => (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setBusinessType(bt.id as any)}
                        className={`p-2.5 text-center rounded-2xl border text-xs font-bold transition-all ${
                          businessType === bt.id
                            ? 'border-[#1b6d24] bg-[#e8f5e9] text-[#002c11]'
                            : 'border-[#c1c9be]/50 bg-[#fbf9f8] text-[#717970]'
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                    National ID (NID) / Trade License / Cooperative Reg. Number
                  </label>
                  <div className="relative flex items-center bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 focus-within:border-[#1b6d24] focus-within:ring-2 focus-within:ring-[#1b6d24]/10 transition-all">
                    <FileCheck className="w-4 h-4 text-[#717970] mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 19852691234567890 or TRAD/DH/019283"
                      value={nidOrTradeLicense}
                      onChange={(e) => setNidOrTradeLicense(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1b1c1c] outline-none font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-[#717970] mt-1">
                    Encrypted and securely held solely for identity validation. Never shown publicly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                    Artisan Background & Heritage History
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell us about how your craft is created, how many rural artisans work with you, and how traditional heritage techniques are preserved."
                    value={artisanBackground}
                    onChange={(e) => setArtisanBackground(e.target.value)}
                    className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 p-3.5 text-xs sm:text-sm text-[#1b1c1c] outline-none focus:border-[#1b6d24] focus:ring-2 focus:ring-[#1b6d24]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">
                    Eco-Materials Sourcing Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% natural bamboo from Sylhet hills, natural vegetable dyes from Tangail."
                    value={ecoProductInfo}
                    onChange={(e) => setEcoProductInfo(e.target.value)}
                    className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 text-xs sm:text-sm text-[#1b1c1c] outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 py-3.5 bg-[#f5f3f3] hover:bg-[#e8e6e6] text-[#414941] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Review Eco Terms</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Eco Terms & Acceptance */}
            {step === 4 && (
              <form onSubmit={handleFinalSubmitRegistration} className="space-y-5 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-extrabold text-[#002c11]">Step 4: Seller Terms & Eco-Charter</h3>
                  <p className="text-xs text-[#717970] mt-1">
                    Accept SUNNO marketplace policies to submit your seller application.
                  </p>
                </div>

                <div className="space-y-3 bg-[#fbf9f8] p-5 rounded-2xl border border-[#c1c9be]/40">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeSellerTerms}
                      onChange={(e) => setAgreeSellerTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#1b6d24] rounded border-[#c1c9be] focus:ring-[#1b6d24]"
                    />
                    <span className="text-xs text-[#414941] leading-relaxed">
                      <strong className="text-[#002c11]">Seller Terms of Service:</strong> I agree to SUNNO's marketplace seller obligations, payout schedules (T+2 after delivery confirmation), and honest listing accuracy.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-[#c1c9be]/20">
                    <input
                      type="checkbox"
                      checked={agreeMarketplacePolicy}
                      onChange={(e) => setAgreeMarketplacePolicy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#1b6d24] rounded border-[#c1c9be] focus:ring-[#1b6d24]"
                    />
                    <span className="text-xs text-[#414941] leading-relaxed">
                      <strong className="text-[#002c11]">Marketplace & Return Policies:</strong> I agree to honor SUNNO 7-day customer return and refund standards for damaged or misdescribed craft items.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-[#c1c9be]/20">
                    <input
                      type="checkbox"
                      checked={agreeEcoCharter}
                      onChange={(e) => setAgreeEcoCharter(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#1b6d24] rounded border-[#c1c9be] focus:ring-[#1b6d24]"
                    />
                    <span className="text-xs text-[#414941] leading-relaxed">
                      <strong className="text-[#002c11]">Zero-Plastic & Eco-Product Transparency:</strong> I certify that all listed goods adhere to biodegradable, natural, or upcycled standards and use plastic-free packaging.
                    </span>
                  </label>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Approval Notice:</strong> Newly registered seller accounts are placed in <em>pending status</em> until authorized by a SUNNO administrator or moderator. Products cannot be sold until verification is complete.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-1/3 py-3.5 bg-[#f5f3f3] hover:bg-[#e8e6e6] text-[#414941] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !agreeSellerTerms || !agreeMarketplacePolicy || !agreeEcoCharter}
                    className="flex-1 py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit Application for Approval</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* -------------------- FORGOT PASSWORD MODAL -------------------- */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#c1c9be]/50 shadow-2xl">
            <h3 className="text-lg font-bold text-[#002c11] mb-2">Reset Seller Password</h3>
            <p className="text-xs text-[#717970] mb-4">
              Enter your registered seller email address to receive a secure password reset link.
            </p>

            {forgotSent ? (
              <div className="p-4 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] text-xs font-semibold mb-4 text-center">
                ✓ Password reset instructions have been sent to {forgotEmail}. Please check your inbox.
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="seller@yourstore.eco"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 px-3.5 h-12 text-xs sm:text-sm text-[#1b1c1c] outline-none focus:border-[#1b6d24]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setForgotSent(false);
              }}
              className="w-full mt-3 py-2.5 text-xs text-[#717970] hover:text-[#002c11] font-bold"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
