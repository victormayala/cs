
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { StoreNav, StoreNavHeader } from '@/components/layout/StoreNav';

export default function StoreManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const storeId = params.storeId as string;
  const { user } = useAuth();
  const [storeName, setStoreName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && storeId) {
      const storeRef = doc(db, 'userStores', storeId);
      getDoc(storeRef).then(docSnap => {
        if (docSnap.exists() && docSnap.data().userId === user.uid) {
          setStoreName(docSnap.data().storeName);
        } else {
          setError("Store not found or permission denied.");
        }
        setIsLoading(false);
      });
    } else if (!user) {
      setIsLoading(false)
    }
  }, [user, storeId]);
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
     return <div className="flex h-screen w-full items-center justify-center"><p className="text-destructive">{error}</p></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
        <AppHeader />
        <StoreNavHeader storeId={storeId} storeName={storeName} />
        <div className="flex flex-1">
            <StoreNav storeId={storeId} />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {children}
            </main>
        </div>
    </div>
  );
}
