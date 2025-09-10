
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react';

function AboutPageLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-6 w-1/4" /></div>
            </header>
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-3xl mx-auto px-4">
                    <Skeleton className="h-10 w-1/2 mb-8" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            </main>
            <footer className="border-t bg-muted/50 h-20 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-4 w-1/4" /></div>
            </footer>
        </div>
    );
}

export default function AboutPage() {
    const params = useParams();
    const storeId = params.storeId as string;
    
    const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storeId) {
            setError("Store ID is missing.");
            setIsLoading(false);
            return;
        }

        const fetchStoreData = async () => {
            setIsLoading(true);
            try {
                const storeDocRef = doc(db, 'userStores', storeId);
                const storeDocSnap = await getDoc(storeDocRef);
                if (storeDocSnap.exists()) {
                    setStoreConfig({ id: storeDocSnap.id, ...storeDocSnap.data() } as UserStoreConfig);
                } else {
                    throw new Error("Store not found.");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoreData();
    }, [storeId]);

    if (isLoading || !storeConfig) {
        return <AboutPageLoadingSkeleton />;
    }

    if (error) {
        return (
             <div className="flex flex-col min-h-screen items-center justify-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive">Error</h2>
                <p className="text-muted-foreground">{error}</p>
            </div>
        )
    }

    const pageContent = storeConfig.pages?.about;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <StoreHeader storeConfig={storeConfig} />
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-3xl mx-auto px-4">
                    <h1 className="text-4xl font-bold font-headline text-foreground mb-8">{pageContent?.title || 'About Us'}</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground">
                        {pageContent?.body ? (
                            <div dangerouslySetInnerHTML={{ __html: pageContent.body.replace(/\n/g, '<br />') }} />
                        ) : (
                            <p>Welcome to our store! We're passionate about providing high-quality, customizable products that you'll love. Content for this page can be edited in the store dashboard.</p>
                        )}
                    </div>
                </div>
            </main>
            <StoreFooter storeConfig={storeConfig} />
        </div>
    );
}
