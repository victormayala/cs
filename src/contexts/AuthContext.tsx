
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseInitializationError } from '@/lib/firebase'; 
import { clearAccessCookie } from '@/app/access-login/actions';
import { useToast } from '@/hooks/use-toast';
import { createDeferredStripeAccount } from '@/app/actions/stripeActions';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  stripeConnectAccountId?: string;
  onboardingStatus?: 'not_started' | 'in_progress' | 'completed';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, pass:string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This new component will handle the logic that uses client-side router hooks
function AuthLogicHandler({ 
  setAuthProviderUser, 
  setAuthProviderIsLoading,
  setAuthProviderSignOut
}: { 
  setAuthProviderUser: Dispatch<SetStateAction<User | null>>;
  setAuthProviderIsLoading: Dispatch<SetStateAction<boolean>>;
  setAuthProviderSignOut: Dispatch<SetStateAction<() => Promise<void>>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth || !db) {
        setAuthProviderIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Fetch user role from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let userData: User;

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: data?.role || 'user',
                stripeConnectAccountId: data?.stripeConnectAccountId,
                onboardingStatus: data?.connectOnboardingStatus || 'not_started',
                chargesEnabled: data?.chargesEnabled || false,
                payoutsEnabled: data?.payoutsEnabled || false,
                detailsSubmitted: data?.detailsSubmitted || false,
            };
        } else {
             // This case should be handled by createUserProfile, but as a fallback:
            userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: 'user',
            };
        }

        setAuthProviderUser(userData);

        if (typeof window !== 'undefined') {
          (window as any).__USER_ID__ = firebaseUser.uid;
        }
        
        // --- Redirection Logic ---
        const isAuthPage = pathname === '/signin' || pathname === '/signup';
        const isAdminPage = pathname.startsWith('/admin');
        
        // If user is not an admin but tries to access an admin page, redirect them
        if (isAdminPage && userData.role !== 'admin') {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive"});
            router.push('/dashboard');
            return; // Stop further redirection logic
        }

        const redirectUrl = searchParams.get('redirect');
        if (isAuthPage) {
          router.push(redirectUrl && redirectUrl !== '/' && !redirectUrl.startsWith('/signin') && !redirectUrl.startsWith('/signup') ? redirectUrl : '/dashboard');
        } else if (redirectUrl && redirectUrl !== '/' && !redirectUrl.startsWith('/signin') && !redirectUrl.startsWith('/signup')) {
          router.push(redirectUrl);
        }

      } else { // User is signed out
        setAuthProviderUser(null);
        if (typeof window !== 'undefined') {
          delete (window as any).__USER_ID__;
        }

        const protectedUserPaths = ['/dashboard', '/admin', '/customizer'];
        const isCurrentlyOnProtectedPath = protectedUserPaths.some(p => pathname.startsWith(p));

        if (isCurrentlyOnProtectedPath) {
          const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
          router.push(`/signin?redirect=${encodeURIComponent(fullPath)}`);
        }
      }
      setAuthProviderIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router, pathname, searchParams, setAuthProviderUser, setAuthProviderIsLoading, toast]);

  const handleSignOut = useCallback(async () => {
    if (!auth) return;
    setAuthProviderIsLoading(true);
    try {
      await firebaseSignOut(auth);
      await clearAccessCookie(); 
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/signin'); 
    } catch (error: any)      {
      console.error("Sign out error:", error);
      toast({ title: "Sign Out Failed", description: error.message, variant: "destructive" });
      setAuthProviderIsLoading(false);
      throw error;
    }
  }, [auth, router, toast, setAuthProviderIsLoading]);

  useEffect(() => {
    setAuthProviderSignOut(() => handleSignOut);
  }, [handleSignOut, setAuthProviderSignOut]);

  return null;
}

// Interceptor for fetch to add user ID header
const originalFetch = typeof window !== 'undefined' ? window.fetch : () => Promise.reject('fetch is not available in this environment');

if (typeof window !== 'undefined') {
    window.fetch = async (...args) => {
        const [resource, config] = args;
        const newHeaders = new Headers(config?.headers);

        const userId = (window as any).__USER_ID__;
        if (userId) {
            newHeaders.set('X-User-ID', userId);
        }

        const newConfig = {
            ...config,
            headers: newHeaders,
        };

        return originalFetch(resource, newConfig);
    };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signOutFunction, setSignOutFunction] = useState<() => Promise<void>>(() => async () => {
    console.warn("SignOut called before AuthLogicHandler initialized router.");
  });
  const { toast } = useToast();

  if (firebaseInitializationError) {
    const errorPageStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#fff1f2',
      color: '#881337',
      fontFamily: 'sans-serif',
      padding: '2rem',
      textAlign: 'center',
    };
    const codeStyle: React.CSSProperties = {
      backgroundColor: '#ffe4e6',
      padding: '0.2rem 0.4rem',
      borderRadius: '4px',
      fontFamily: 'monospace',
      color: '#9f1239',
    };
    const iconStyle: React.CSSProperties = {
        height: '3rem',
        width: '3rem',
        color: '#be123c',
        marginBottom: '1rem',
    };
    return (
      <div style={errorPageStyles}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#9f1239' }}>Application Configuration Error</h1>
        <p style={{ marginTop: '1rem', maxWidth: '700px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {firebaseInitializationError}
        </p>
      </div>
    );
  }
  
  const createUserProfile = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user', // Default role
            createdAt: serverTimestamp(),
        });
        
        // Asynchronously create the deferred Stripe account
        createDeferredStripeAccount({
            userId: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email || ''
        }).catch(err => {
            console.error("Failed to create deferred Stripe account:", err);
            // Optionally, you could set a flag in the user's doc to retry this later
        });
    }
  };


  const signIn = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Authentication service is not available.");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      await createUserProfile(userCredential.user);
    } catch (error: any) {
      if (error.code !== 'auth/invalid-credential') {
        console.error("Firebase sign in error in AuthContext:", error);
      }
      throw error; 
    }
  }, [auth]);

  const signUp = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Authentication service is not available.");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await createUserProfile(userCredential.user);
      toast({ title: "Sign Up Successful", description: "Welcome! Your account has been created." });
    } catch (error: any) {
      const expectedErrorCodes = ['auth/email-already-in-use', 'auth/weak-password', 'auth/invalid-email'];
      if (!expectedErrorCodes.includes(error.code)) {
        console.error("Firebase sign up error in AuthContext:", error);
      }
      let friendlyMessage = "Sign up failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered. Please try signing in or use a different email.";
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = "Password is too weak. Please choose a stronger password (at least 6 characters).";
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      toast({ title: "Sign Up Failed", description: friendlyMessage, variant: "destructive" });
      throw error;
    }
  }, [auth, toast]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Authentication service is not available.");
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      await createUserProfile(userCredential.user);
      toast({ title: "Signed In with Google", description: "Welcome!" });
    } catch (error: any) {
      const expectedErrorCodes = ['auth/popup-closed-by-user', 'auth/account-exists-with-different-credential', 'auth/popup-blocked'];
      if (!expectedErrorCodes.includes(error.code)) {
        console.error("Google sign in error in AuthContext:", error);
      }
      let description = "Could not sign in with Google. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Sign-in popup closed. Please try again.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "An account already exists with this email address. Try signing in with a different method.";
      }
      toast({ title: "Google Sign In Failed", description, variant: "destructive" });
      throw error;
    }
  }, [auth, toast]);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut: signOutFunction,
  }), [user, isLoading, signIn, signUp, signInWithGoogle, signOutFunction]);

  return (
    <AuthContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <AuthLogicHandler 
          setAuthProviderUser={setUser} 
          setAuthProviderIsLoading={setIsLoading}
          setAuthProviderSignOut={setSignOutFunction}
        />
      </Suspense>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
