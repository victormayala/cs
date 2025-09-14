
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
import { createStripeAccount } from '@/app/actions/stripeActions';

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

// This component uses hooks that require a router. We wrap it in Suspense.
function AuthRedirectHandler() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      const isAuthPage = pathname === '/signin' || pathname === '/signup';
      const isAdminPage = pathname.startsWith('/admin');

      if (isAdminPage && user.role !== 'admin') {
        toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
        router.push('/dashboard');
        return;
      }
      
      const redirectUrl = searchParams.get('redirect');
      if (isAuthPage) {
        router.push(redirectUrl || '/dashboard');
      }
    } else {
      const protectedUserPaths = ['/dashboard', '/admin', '/customizer'];
      const isCurrentlyOnProtectedPath = protectedUserPaths.some(p => pathname.startsWith(p));
      if (isCurrentlyOnProtectedPath) {
        const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        router.push(`/signin?redirect=${encodeURIComponent(fullPath)}`);
      }
    }
  }, [user, isLoading, pathname, router, searchParams, toast]);

  return null;
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const createUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        try {
            await setDoc(userDocRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: 'user', // Default role
                createdAt: serverTimestamp(),
            });

            // Asynchronously create the Stripe account
            const stripeResult = await createStripeAccount({
                userId: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email || '',
            });

            if (stripeResult.success && stripeResult.accountId) {
                // Now, update the user doc with the Stripe account ID
                await setDoc(userDocRef, { 
                    stripeConnectAccountId: stripeResult.accountId,
                    connectOnboardingStatus: 'not_started',
                    chargesEnabled: false,
                    payoutsEnabled: false,
                    detailsSubmitted: false,
                }, { merge: true });
            } else {
                 console.error("Failed to create Stripe account on signup:", stripeResult.error);
                 await setDoc(userDocRef, { stripeConnectAccountError: stripeResult.error || 'Failed to create account.' }, { merge: true });
            }
        } catch (error) {
            console.error("Error during user profile and Stripe account creation:", error);
        }
    } else {
        const userData = userDocSnap.data();
        if (!userData.stripeConnectAccountId) {
            try {
                const stripeResult = await createStripeAccount({
                    userId: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || firebaseUser.email || '',
                });
                if (stripeResult.success && stripeResult.accountId) {
                    await updateDoc(userDocRef, { 
                        stripeConnectAccountId: stripeResult.accountId,
                        connectOnboardingStatus: 'not_started',
                    });
                } else {
                     await updateDoc(userDocRef, { stripeConnectAccountError: stripeResult.error || 'Failed to create account.' });
                }
             } catch (error) {
                 console.error(`Error during Stripe account creation for existing user ${firebaseUser.uid}:`, error);
             }
        }
    }
  }, []);

  useEffect(() => {
    if (firebaseInitializationError || !auth || !db) {
        setIsLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setUser({
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
                });
            } else {
                await createUserProfile(firebaseUser);
                const newUserDocSnap = await getDoc(userDocRef); // Re-fetch to get all data
                const newData = newUserDocSnap.data();
                 setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    role: newData?.role || 'user',
                    stripeConnectAccountId: newData?.stripeConnectAccountId,
                    onboardingStatus: newData?.connectOnboardingStatus || 'not_started',
                    chargesEnabled: newData?.chargesEnabled || false,
                    payoutsEnabled: newData?.payoutsEnabled || false,
                    detailsSubmitted: newData?.detailsSubmitted || false,
                });
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [createUserProfile]);


  if (firebaseInitializationError) {
    const errorPageStyles: React.CSSProperties = {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh',
      backgroundColor: '#fff1f2', color: '#881337', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center',
    };
    return (
      <div style={errorPageStyles}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#9f1239' }}>Application Configuration Error</h1>
        <p style={{ marginTop: '1rem', maxWidth: '700px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {firebaseInitializationError}
        </p>
      </div>
    );
  }

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Authentication service is not available.");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await createUserProfile(userCredential.user);
  }, [auth, createUserProfile]);

  const signUp = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Authentication service is not available.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await createUserProfile(userCredential.user);
    toast({ title: "Sign Up Successful", description: "Welcome! Your account has been created." });
  }, [auth, createUserProfile, toast]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Authentication service is not available.");
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await createUserProfile(userCredential.user);
    toast({ title: "Signed In with Google", description: "Welcome!" });
  }, [auth, createUserProfile, toast]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    await clearAccessCookie(); 
    toast({ title: "Signed Out", description: "You have been successfully signed out." });
    // The redirect will be handled by the AuthRedirectHandler
  }, [auth, toast]);

  const contextValue = useMemo(() => ({
    user, isLoading, signIn, signUp, signInWithGoogle, signOut,
  }), [user, isLoading, signIn, signUp, signInWithGoogle, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>
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
