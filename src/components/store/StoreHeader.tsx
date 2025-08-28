
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';

interface StoreHeaderProps {
  storeConfig: UserStoreConfig;
}

export function StoreHeader({ storeConfig }: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href={`/store/${storeConfig.id}`} className="text-xl font-bold font-headline" style={{ color: `hsl(var(--primary))` }}>
          {storeConfig.storeName}
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href={`/store/${storeConfig.id}/products`}>
              All Products
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/store/${storeConfig.id}/cart`}>
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">View Cart</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
