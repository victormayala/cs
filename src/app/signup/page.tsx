
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/hooks/use-toast'; 
import { Loader2, UserPlus } from 'lucide-react'; 
import { FcGoogle } from 'react-icons/fc'; // Using react-icons for Google logo

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, signInWithGoogle, isLoading } = useAuth(); 
  const { toast } = useToast(); 

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault();
    if (isLoading) return;
    if (password !== confirmPassword) {
      toast({ 
        title: "Passwords Mismatch",
        description: "The passwords you entered do not match.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password should be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signUp(email, password);
      // Navigation is handled by AuthContext
    } catch (error) {
      // Error toast is handled within signUp method
    }
  };

  const handleGoogleSignUp = async () => {
    if (isLoading) return;
    try {
      await signInWithGoogle(); // Firebase handles account creation or sign-in seamlessly
      // Navigation is handled by AuthContext
    } catch (error) {
      // Error toast is handled within signInWithGoogle method
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20 bg-card">
         <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-foreground">Create Your Account</CardTitle>
            <CardDescription>Join Customizer Studio and start customizing today!</CardDescription>
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
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (min. 6 characters)</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Create a password"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input/50"
                  disabled={isLoading}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm your password"
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input/50"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Sign Up
              </Button>
            </form>
            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-muted-foreground/20"></div>
              <span className="mx-4 text-xs uppercase text-muted-foreground">Or continue with</span>
              <div className="flex-grow border-t border-muted-foreground/20"></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FcGoogle className="mr-2 h-5 w-5" />}
              Sign Up with Google
            </Button>
            <div className="text-center mt-4">
                 <p className="text-xs text-muted-foreground px-2">
                    By signing up, you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> and 
                    {' '}<Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
                  </p>
              </div>
            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/signin" className="font-medium text-primary hover:underline">
                  Sign in here
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
