
"use client";

import Link from 'next/link';
import { Logo } from '@/components/icons/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, LayoutDashboardIcon, UserCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingHeader() {
  const isMobile = useIsMobile();
  const { user, signOut, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Toast is handled in AuthContext signOut
    } catch (error) {
      console.error("Sign out error:", error);
      toast({ title: "Sign Out Failed", description: "Could not sign you out. Please try again.", variant: "destructive" });
    }
  };

  const UserNav = () => {
    if (!user) return null;

    const getInitials = (name: string | null | undefined) => {
      if (!name) return "?";
      const names = name.split(' ');
      if (names.length === 1) return names[0][0].toUpperCase();
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL || ''} alt={user.displayName || user.email || 'User'} />
              <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center cursor-pointer">
              <LayoutDashboardIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          {/* Add more items like Profile, Settings if needed */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={authIsLoading} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  const AuthButtonsMobile = () => {
    if (user) {
      return (
        <>
          <DropdownMenuLabel className="font-normal px-2 pt-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Button asChild variant="ghost" className="w-full justify-start text-base font-medium">
            <Link href="/dashboard"><LayoutDashboardIcon className="mr-2 h-5 w-5" />Dashboard</Link>
          </Button>
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-base font-medium text-destructive hover:text-destructive" disabled={authIsLoading}>
            <LogOut className="mr-2 h-5 w-5" />Sign out
          </Button>
        </>
      );
    }
    return (
      <>
        <Button asChild variant="outline" className="w-full text-base">
          <Link href="/signin">Sign In</Link>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full cursor-not-allowed">
                <Button asChild variant="default" className="w-full text-base" disabled>
                  <Link href="#">Sign Up</Link>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Launching soon! Sign-ups will open shortly.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card flex justify-center">
      <div className="container flex h-16 max-w-[1440px] items-center justify-center px-4 md:px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
          </Link>
        </div>

        {isMobile ? (
          <div className="ml-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-6 bg-card">
                <nav className="flex flex-col space-y-3">
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-base font-medium text-foreground hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <hr className="my-2 border-border" />
                  <AuthButtonsMobile />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <>
            <nav className="flex flex-1 items-center justify-center space-x-6 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center space-x-3">
              {user ? (
                <UserNav />
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/signin">Sign In</Link>
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block cursor-not-allowed">
                          <Button asChild variant="default" size="sm" disabled>
                            <Link href="#">Sign Up</Link>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Launching soon! Sign-ups will open shortly.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
