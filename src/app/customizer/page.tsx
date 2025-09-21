
"use client";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadProvider } from "@/contexts/UploadContext";
import { Customizer } from '@/components/customizer/Customizer';

function CustomizerLayoutAndLogic() {
  return <Customizer />
}

export default function CustomizerPage() {
  return (
    <UploadProvider>
      <Suspense fallback={ <div className="flex min-h-svh h-screen w-full items-center justify-center bg-background"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading customizer page...</p> </div> }>
        <CustomizerLayoutAndLogic />
      </Suspense>
    </UploadProvider>
  );
}
