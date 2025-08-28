
"use client";

import Image from 'next/image';

export function Logo() {
  const logoSrc = "/customizer-studio-logo.png"; 

  return (
    <div className="relative h-12 w-[180px]" aria-label="Customizer Studio Logo">
      <Image
        key={logoSrc}
        src={logoSrc}
        alt="Customizer Studio Logo"
        fill
        style={{ objectFit: 'contain' }}
        priority // Ensures the logo loads quickly, important for LCP
      />
    </div>
  );
}
