
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
  
  const footerLinks = [
    { href: `/store/${storeConfig.id}`, label: 'Home' },
    { href: `/store/${storeConfig.id}/products`, label: 'Products' },
    { href: `/store/${storeConfig.id}/about`, label: 'About Us' },
    { href: `/store/${storeConfig.id}/faq`, label: 'FAQ' },
    { href: `/store/${storeConfig.id}/contact`, label: 'Contact' },
    { href: `/store/${storeConfig.id}/terms`, label: 'Terms' },
    { href: `/store/${storeConfig.id}/privacy`, label: 'Privacy' },
  ];

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {currentYear} {storeConfig.storeName}. All rights reserved.
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
