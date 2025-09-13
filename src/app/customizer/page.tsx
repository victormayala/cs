"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { UploadProvider } from '@/contexts/UploadContext';
import { Loader2 } from 'lucide-react';

// Dynamically import the main customizer component with SSR turned off.
// This is the key to preventing server-side rendering of client-only libraries like Konva.
const Customizer = dynamic(() => import('@/app/customizer/Customizer'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-svh h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Loading Customizer...</p>
    </div>
  ),
});

export default function CustomizerPage() {
  return (
    <UploadProvider>
      <Suspense fallback={
        <div className="flex min-h-svh h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading customizer page...</p>
        </div>
      }>
        <Customizer />
      </Suspense>
    </UploadProvider>
  );
}
