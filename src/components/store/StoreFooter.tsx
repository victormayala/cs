
'use client';

import Link from 'next/link';

interface StoreFooterProps {
  storeConfig: {
    id: string;
    storeName: string;
  };
}

export function StoreFooter({ storeConfig }: StoreFooterProps) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {storeConfig.storeName}. All rights reserved.
          </p>
          <nav className="flex gap-4">
            <Link href={`/store/${storeConfig.id}/products`} className="text-sm text-muted-foreground hover:text-primary">
              Products
            </Link>
            {/* Add more links like About, Contact as needed */}
          </nav>
        </div>
      </div>
    </footer>
  );
}
