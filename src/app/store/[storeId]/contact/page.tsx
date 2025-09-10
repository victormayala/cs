
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ContactPageLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-6 w-1/4" /></div>
            </header>
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-3xl mx-auto px-4">
                    <Skeleton className="h-10 w-1/2 mb-8" />
                    <div className="grid md:grid-cols-2 gap-8">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </main>
            <footer className="border-t bg-muted/50 h-20 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-4 w-1/4" /></div>
            </footer>
        </div>
    );
}

export default function ContactPage() {
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
        return <ContactPageLoadingSkeleton />;
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

    const pageContent = storeConfig.pages?.contact;

    return (
        <div className="flex flex-col min-h-screen bg-muted/10">
            <StoreHeader storeConfig={storeConfig} />
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-4xl mx-auto px-4">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold font-headline text-foreground mb-4">{pageContent?.title || 'Get In Touch'}</h1>
                        <p className="text-lg text-muted-foreground mb-12">We'd love to hear from you. Here's how you can reach us.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pageContent?.email && (
                            <Card className="text-center">
                                <CardHeader><Mail className="mx-auto h-8 w-8 text-primary mb-2" /><CardTitle>Email Us</CardTitle></CardHeader>
                                <CardContent><a href={`mailto:${pageContent.email}`} className="text-primary hover:underline">{pageContent.email}</a></CardContent>
                            </Card>
                        )}
                        {pageContent?.phone && (
                            <Card className="text-center">
                                <CardHeader><Phone className="mx-auto h-8 w-8 text-primary mb-2" /><CardTitle>Call Us</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">{pageContent.phone}</p></CardContent>
                            </Card>
                        )}
                        {pageContent?.address && (
                            <Card className="text-center md:col-span-2 lg:col-span-1">
                                <CardHeader><MapPin className="mx-auto h-8 w-8 text-primary mb-2" /><CardTitle>Visit Us</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground whitespace-pre-line">{pageContent.address}</p></CardContent>
                            </Card>
                        )}
                    </div>

                    {!pageContent?.email && !pageContent?.phone && !pageContent?.address && (
                        <p className="text-center text-muted-foreground mt-8">Contact information can be added in the store dashboard.</p>
                    )}
                </div>
            </main>
            <StoreFooter storeConfig={storeConfig} />
        </div>
    );
}
