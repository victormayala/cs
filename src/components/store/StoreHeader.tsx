
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu } from 'lucide-react';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useState } from 'react';

interface StoreHeaderProps {
  storeConfig: UserStoreConfig;
}

export function StoreHeader({ storeConfig }: StoreHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: `/store/${storeConfig.id}`, label: 'Home' },
    { href: `/store/${storeConfig.id}/shop`, label: 'Shop' },
    { href: `/store/${storeConfig.id}/faq`, label: 'FAQ' },
    { href: `/store/${storeConfig.id}/contact`, label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href={`/store/${storeConfig.id}`} className="text-xl font-bold font-headline" style={{ color: `hsl(var(--primary))` }}>
          {storeConfig.storeName}
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map(link => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/store/${storeConfig.id}/cart`}>
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">View Cart</span>
            </Link>
          </Button>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="grid gap-4 py-6">
                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
