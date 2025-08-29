'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { PublicProduct } from '@/types/product';
import { ArrowRight, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

// PDP needs more details than the PLP card, especially all views.
interface ProductDetail extends PublicProduct {
    views: {
        id: string;
        name: string;
        imageUrl: string;
    }[];
}

function PDPSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-6 w-1/4" /></div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-5xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    <div>
                        <Skeleton className="w-full aspect-square rounded-lg" />
                        <div className="flex gap-2 mt-4">
                            <Skeleton className="w-20 h-20 rounded-md" />
                            <Skeleton className="w-20 h-20 rounded-md" />
                            <Skeleton className="w-20 h-20 rounded-md" />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-5/6" />
                        <Skeleton className="h-12 w-1/2 mt-4" />
                    </div>
                </div>
            </div>
        </main>
        <footer className="border-t bg-muted/50 h-20 flex items-center">
            <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-4 w-1/4" /></div>
        </footer>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const productId = params.productId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  useEffect(() => {
    if (!storeId || !productId) {
        setError("Store or Product ID is missing.");
        setIsLoading(false);
        return;
    }

    const fetchPageData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch store config and product data in parallel
            const [storeRes, productRes] = await Promise.all([
                getDoc(doc(db, 'userStores', storeId)),
                fetch(`/api/store/products/${productId}?configUserId=${storeId}`)
            ]);

            // Process store config
            if (storeRes.exists()) {
                setStoreConfig({ ...storeRes.data(), id: storeRes.id } as UserStoreConfig);
            } else {
                throw new Error("This store could not be found.");
            }

            // Process product data
            if (!productRes.ok) {
                const errorData = await productRes.json();
                throw new Error(errorData.error || 'Failed to fetch product details.');
            }
            const productData = await productRes.json();
            if (!productData.product) {
                throw new Error("Product not found.");
            }
            setProduct(productData.product);
            setActiveImage(productData.product.views[0]?.imageUrl || productData.product.imageUrl);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchPageData();
  }, [storeId, productId]);

  if (isLoading || !storeConfig) {
    return <PDPSkeleton />;
  }

  if (error) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <StoreHeader storeConfig={storeConfig || { id: storeId, storeName: 'Store' } as UserStoreConfig} />
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-destructive">
                    <AlertTriangle className="mx-auto h-12 w-12" />
                    <h2 className="mt-4 text-xl font-semibold">Error</h2>
                    <p className="mt-2 text-sm">{error}</p>
                    <Button asChild variant="outline" className="mt-6">
                        <Link href={`/store/${storeId}/products`}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Products
                        </Link>
                    </Button>
                </div>
            </main>
            <StoreFooter storeConfig={storeConfig || { id: storeId, storeName: 'Store' } as UserStoreConfig} />
        </div>
    )
  }

  if (!product) {
      return <div></div>; // Should be handled by error state, but as a fallback.
  }

  // The link to the customizer
  const customizerLink = `/customizer?productId=${product.id}&source=customizer-studio&configUserId=${storeId}`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
        <StoreHeader storeConfig={storeConfig} />
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-5xl mx-auto px-4">
                 <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <div>
                        <div className="aspect-square w-full bg-muted/50 rounded-lg overflow-hidden border flex items-center justify-center mb-4">
                            <div className="relative w-full h-full">
                                {activeImage && (
                                <Image
                                    src={activeImage}
                                    alt={product.name}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {product.views.map(view => (
                                <button
                                    key={view.id}
                                    className={cn(
                                        "w-20 h-20 rounded-md border-2 overflow-hidden bg-muted/50 transition",
                                        activeImage === view.imageUrl ? 'border-primary' : 'border-transparent hover:border-muted-foreground/50'
                                    )}
                                    onClick={() => setActiveImage(view.imageUrl)}
                                >
                                    <div className="relative w-full h-full">
                                         <Image
                                            src={view.imageUrl}
                                            alt={view.name}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Product Info */}
                    <div className="flex flex-col pt-4">
                         <h1 className="text-3xl lg:text-4xl font-bold font-headline text-foreground">{product.name}</h1>
                         <p className="text-2xl font-semibold mt-2 mb-4" style={{ color: `hsl(var(--primary))` }}>
                            From ${product.price.toFixed(2)}
                         </p>
                         <div className="text-muted-foreground space-y-4">
                            <p>{product.description}</p>
                         </div>
                         <div className="mt-8">
                            <Button asChild size="lg" className="w-full md:w-auto">
                                <Link href={customizerLink}>
                                    Customize This Product <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                         </div>
                    </div>
                 </div>
            </div>
        </main>
        <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
