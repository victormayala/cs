
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
import { auth } from '@/lib/firebase'; 
import { clearAccessCookie } from '@/app/access-login/actions';
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>; // This will be provided by AuthLogicHandler via context update
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setAuthProviderUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        
        const redirectUrl = searchParams.get('redirect');
        const isAuthPage = pathname === '/signin' || pathname === '/signup';

        if (isAuthPage) {
          router.push(redirectUrl && redirectUrl !== '/' && !redirectUrl.startsWith('/signin') && !redirectUrl.startsWith('/signup') ? redirectUrl : '/dashboard');
        } else if (redirectUrl && redirectUrl !== '/' && !redirectUrl.startsWith('/signin') && !redirectUrl.startsWith('/signup')) {
          router.push(redirectUrl);
        }
      } else {
        setAuthProviderUser(null);
        const protectedUserPaths = ['/dashboard', '/dashboard/products']; 
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

  // Update the signOut function in the context provider
  useEffect(() => {
    setAuthProviderSignOut(() => handleSignOut);
  }, [handleSignOut, setAuthProviderSignOut]);

  return null; // This component doesn't render anything itself
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Placeholder for signOut initially, will be updated by AuthLogicHandler
  const [signOutFunction, setSignOutFunction] = useState<() => Promise<void>>(() => async () => {
    console.warn("SignOut called before AuthLogicHandler initialized router.");
  });
  const { toast } = useToast();

  if (!auth) {
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
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#9f1239' }}>Firebase Configuration Error</h1>
        <p style={{ maxWidth: '600px', lineHeight: '1.5' }}>
            The application cannot connect to Firebase. This usually happens when the
            Firebase environment variables are missing or invalid.
        </p>
        <p style={{ marginTop: '1rem', maxWidth: '600px', lineHeight: '1.5' }}>
            Please check your <code style={codeStyle}>.env.local</code> file and ensure all <code style={codeStyle}>NEXT_PUBLIC_FIREBASE_...</code> variables are present and correct.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
            After saving changes to <code style={codeStyle}>.env.local</code>, you must restart the development server for them to take effect.
        </p>
      </div>
    );
  }

  const signIn = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Firebase sign in error in AuthContext:", error);
      throw error; 
    }
  }, [auth]);

  const signUp = useCallback(async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast({ title: "Sign Up Successful", description: "Welcome! Your account has been created." });
    } catch (error: any) {
      console.error("Firebase sign up error in AuthContext:", error);
      let friendlyMessage = "Sign up failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered. Please try signing in or use a different email.";
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = "Password is too weak. Please choose a stronger password (at least 6 characters).";
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      toast({
        title: "Sign Up Failed",
        description: friendlyMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [auth, toast]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Signed In with Google", description: "Welcome!" });
    } catch (error: any) {
      console.error("Google sign in error in AuthContext:", error);
      let description = "Could not sign in with Google. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Sign-in popup closed. Please try again.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "An account already exists with this email address. Try signing in with a different method.";
      }
      toast({
        title: "Google Sign In Failed",
        description,
        variant: "destructive",
      });
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
      <Suspense fallback={null}> {/* Simple fallback, can be a spinner */}
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
