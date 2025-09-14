
"use client";

import { UploadProvider } from "@/contexts/UploadContext";
import dynamic from "next/dynamic";
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Customizer = dynamic(() => import("./Customizer"), {
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
                <p className="ml-3 text-muted-foreground">Loading Customizer Page...</p>
              </div>
            }>
                <Customizer />
            </Suspense>
        </UploadProvider>
    );
}
