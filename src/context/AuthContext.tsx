import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider, sanitizeForFirestore } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export type AuthModalMode = 'login' | 'signup' | 'forgot_password';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  loading: boolean;
  isEmailVerified: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: AuthModalMode;
  setAuthModalMode: (mode: AuthModalMode) => void;
  authModalNotice: string | null;
  setAuthModalNotice: (notice: string | null) => void;
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;
  openAuthModal: (mode?: AuthModalMode, notice?: string | null) => void;
  closeAuthModal: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  signOutUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  switchAccountMode: (mode: 'customer' | 'seller') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login', notice: string | null = null) => {
    setAuthModalMode(mode);
    setAuthModalNotice(notice);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalNotice(null);
  }, []);

  const syncUserProfile = useCallback(async (user: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existingData = snap.data() as UserProfile;
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      }).catch(() => {});
      return {
        ...existingData,
        id: user.uid,
      };
    }

    const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'SUNNO Member');
    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      fullName: fallbackName,
      displayName: fallbackName,
      photoURL: user.photoURL || '',
      role: 'customer',
      ecoPoints: 50,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      userRef,
      sanitizeForFirestore({
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
    );

    return newProfile;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const synced = await syncUserProfile(user);
          setUserProfile(synced);
        } catch (err) {
          console.error('[Auth] Profile sync warning:', err);
          setUserProfile({
            id: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'SUNNO Member',
            displayName: user.displayName || 'SUNNO Member',
            photoURL: user.photoURL || '',
            role: 'customer',
            ecoPoints: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserProfile]);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  };

  const loginWithFacebook = async () => {
    await signInWithPopup(auth, facebookProvider);
    closeAuthModal();
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    closeAuthModal();
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    selectedRole: UserRole = 'customer'
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await firebaseUpdateProfile(cred.user, { displayName: name });

    const safeRole: UserRole = selectedRole === 'seller' ? 'seller' : 'customer';
    const userRef = doc(db, 'users', cred.user.uid);

    const newProfile: UserProfile = {
      id: cred.user.uid,
      email,
      fullName: name,
      displayName: name,
      photoURL: '',
      role: safeRole,
      ecoPoints: 50,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      userRef,
      sanitizeForFirestore({
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
    );
    setUserProfile(newProfile);
    closeAuthModal();
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    const updated = await syncUserProfile(currentUser);
    setUserProfile(updated);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const { role: _r, ...safeUpdates } = data;
    await updateDoc(
      userRef,
      sanitizeForFirestore({
        ...safeUpdates,
        updatedAt: serverTimestamp(),
      })
    );
    setUserProfile({ ...userProfile, ...safeUpdates });
  };

  const switchRole = async (newRole: UserRole) => {
    if (!currentUser || !userProfile) return;
    if (newRole === 'admin' || newRole === 'super_admin') return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    setUserProfile({ ...userProfile, role: newRole });
  };

  const switchAccountMode = async (mode: 'customer' | 'seller') => {
    await switchRole(mode);
  };

  const role: UserRole = userProfile?.role || 'customer';
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
  const isSeller = role === 'seller' || isAdmin;
  const isEmailVerified = Boolean(currentUser?.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser: currentUser,
        userProfile,
        profile: userProfile,
        role,
        isLoading,
        loading: isLoading,
        isEmailVerified,
        isAdmin,
        isSeller,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        authModalNotice,
        setAuthModalNotice,
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        loginWithFacebook,
        loginWithEmail,
        registerWithEmail,
        logout,
        signOutUser: logout,
        sendVerificationEmail,
        refreshProfile,
        updateUserProfile,
        switchRole,
        switchAccountMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function validateBangladeshPhoneNumber(phone: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const cleaned = (phone || '').replace(/[\s\-()]/g, '');
  const bdRegex = /^(?:\+?88)?(01[3-9]\d{8})$/;
  const match = cleaned.match(bdRegex);

  if (!match) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).',
    };
  }

  return {
    valid: true,
    normalized: `+88${match[1]}`,
  };
}
