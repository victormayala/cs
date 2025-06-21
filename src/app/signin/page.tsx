
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext'; 
import { Loader2, LogIn, AlertCircle } from 'lucide-react'; 
import { FcGoogle } from 'react-icons/fc'; 

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signInWithGoogle, isLoading: authIsLoading } = useAuth(); 
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (authIsLoading || localIsLoading) return;

    setLocalIsLoading(true);
    setLocalError(null);
    try {
      await signIn(email, password);
      // Navigation is handled by AuthContext's onAuthStateChanged effect
    } catch (error: any) {
      let friendlyMessage = "Oops! Sign-in failed. Please check your details and try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            friendlyMessage = "Hmm, that email and password don't quite match. Please double-check or sign up if you're new!";
            break;
          case 'auth/too-many-requests':
            friendlyMessage = "Too many attempts! For security, please try again in a little while, or you can reset your password.";
            break;
          case 'auth/network-request-failed':
            friendlyMessage = "Could not connect to the authentication service. Please check your internet connection and try again.";
            break;
          case 'auth/invalid-api-key':
            friendlyMessage = "Configuration Error: The Firebase API key is invalid. Please check your .env.local file and restart the server.";
            break;
          default:
            // Use the error message from Firebase if it's somewhat specific, otherwise our generic one.
            friendlyMessage = error.message?.includes('Firebase') ? "An authentication error occurred. Please try again." : (error.message || friendlyMessage);
        }
      }
      console.error("Sign in page local error:", error.message || error, "Code:", error.code);
      setLocalError(friendlyMessage);
    } finally {
      setLocalIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authIsLoading || localIsLoading) return;
    setLocalIsLoading(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      // Navigation is handled by AuthContext
    } catch (error: any) {
      // AuthContext's signInWithGoogle method already toasts.
      setLocalError(error.message || "Google sign-in failed. Please try again.");
    } finally {
      setLocalIsLoading(false);
    }
  };

  const currentIsLoading = authIsLoading || localIsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20 bg-card">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-foreground">Welcome Back!</CardTitle>
            <CardDescription>Sign in to access your Customizer Studio dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input/50"
                  disabled={currentIsLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {/* <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link> */}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input/50"
                  disabled={currentIsLoading}
                />
              </div>

              {localError && (
                <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {localError}
                </div>
              )}

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={currentIsLoading}>
                {currentIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>
            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-muted-foreground/20"></div>
              <span className="mx-4 text-xs uppercase text-muted-foreground">Or continue with</span>
              <div className="flex-grow border-t border-muted-foreground/20"></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={currentIsLoading}>
              {currentIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FcGoogle className="mr-2 h-5 w-5" />}
              Sign In with Google
            </Button>
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
