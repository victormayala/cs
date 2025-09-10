
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function FaqPageLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-6 w-1/4" /></div>
            </header>
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-3xl mx-auto px-4">
                    <Skeleton className="h-10 w-1/2 mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-12" />
                    <div className="space-y-4">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                </div>
            </main>
            <footer className="border-t bg-muted/50 h-20 flex items-center">
                <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-4 w-1/4" /></div>
            </footer>
        </div>
    );
}

export default function FaqPage() {
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
        return <FaqPageLoadingSkeleton />;
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

    const pageContent = storeConfig.pages?.faq;
    const hasFaqs = pageContent?.questions && pageContent.questions.length > 0;

    return (
        <div className="flex flex-col min-h-screen bg-muted/10">
            <StoreHeader storeConfig={storeConfig} />
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-3xl mx-auto px-4">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold font-headline text-foreground mb-4">{pageContent?.title || 'Frequently Asked Questions'}</h1>
                        {pageContent?.introduction && <p className="text-lg text-muted-foreground mb-12">{pageContent.introduction}</p>}
                    </div>

                    {hasFaqs ? (
                         <Accordion type="single" collapsible className="w-full space-y-4">
                            {pageContent.questions.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`} className="border-b-0 rounded-lg shadow-sm bg-card">
                                <AccordionTrigger className="p-6 text-left font-semibold text-card-foreground hover:no-underline hover:text-primary">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0 text-muted-foreground">
                                    <div dangerouslySetInnerHTML={{ __html: item.answer.replace(/\n/g, '<br />') }} />
                                </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground mt-8">No frequently asked questions have been added yet. This content can be managed in the store dashboard.</p>
                    )}
                </div>
            </main>
            <StoreFooter storeConfig={storeConfig} />
        </div>
    );
}
