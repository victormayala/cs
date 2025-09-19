'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { PublicProduct } from '@/types/product';
import { ArrowRight, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Check, Gem, InfoIcon, Truck, Rocket, MapPin } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import type { ProductAttributeOptions, NativeProductVariation, ProductView as ProductViewType } from '@/app/actions/productOptionsActions';
import { Separator } from '@/components/ui/separator';
import { CustomizationTechnique } from '@/app/actions/productActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from '@/components/ui/label';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


// Redefine SizeAttribute here to match the structure on the options page
interface SizeAttribute {
    id: string;
    name: string;
}

interface ProductAttributeOptionsForPDP extends Omit<ProductAttributeOptions, 'sizes'> {
    sizes: SizeAttribute[];
}

// PDP needs more details than the PLP card, especially all views.
interface ProductDetail extends PublicProduct {
    salePrice?: number | null;
    views: ProductViewType[];
    attributes?: ProductAttributeOptionsForPDP; // Use the more specific type
    variationImages?: Record<string, ProductViewType[]>; // Key: Color Name
    brand?: string;
    sku?: string;
    category?: string;
    customizationTechniques?: CustomizationTechnique[];
    nativeVariations?: NativeProductVariation[];
}

function PDPSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6"><Skeleton className="h-6 w-1/4" /></div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-7xl mx-auto px-4">
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
                        <div className="space-y-2 pt-4">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-5/6" />
                        <div className="space-y-4 pt-4">
                           <Skeleton className="h-6 w-1/4" />
                           <div className="flex gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div>
                           <Skeleton className="h-6 w-1/4" />
                           <div className="flex gap-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-8 w-12" /></div>
                        </div>
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
  const router = useRouter();
  const storeId = params.storeId as string;
  const productId = params.productId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<CustomizationTechnique | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string>('standard');

  const displayedImages = useMemo(() => {
    if (!product) return [];
    if (selectedColor && product.variationImages && product.variationImages[selectedColor]?.length > 0) {
        return product.variationImages[selectedColor];
    }
    // Fallback to default views
    return product.views;
  }, [product, selectedColor]);
  
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    // Update active image when displayedImages change
    if (displayedImages.length > 0) {
        setActiveImage(displayedImages[0].imageUrl);
    } else if (product?.imageUrl) {
        setActiveImage(product.imageUrl);
    }
  }, [displayedImages, product?.imageUrl]);
  
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
            // Fetch store config, product data, and recommended products in parallel
            const [storeRes, productRes, recommendationsRes] = await Promise.all([
                getDoc(doc(db, 'userStores', storeId)),
                fetch(`/api/store/products/${productId}?storeId=${storeId}`, { cache: 'no-store' }),
                fetch(`/api/store/products?storeId=${storeId}`, { cache: 'no-store' })
            ]);

            // Process store config
            if (storeRes.exists()) {
                setStoreConfig({ ...storeRes.data(), id: storeRes.id } as UserStoreConfig);
            } else {
                throw new Error("This store could not be found.");
            }

            // Process main product data
            if (!productRes.ok) {
                const errorData = await productRes.json();
                throw new Error(errorData.error || 'Failed to fetch product details.');
            }
            const productData = await productRes.json();
            if (!productData.product) {
                throw new Error("Product not found.");
            }
            const fetchedProduct = productData.product as ProductDetail;
            setProduct(fetchedProduct);
            
            // Process recommendations
            if (recommendationsRes.ok) {
                const recommendationsData = await recommendationsRes.json();
                const allStoreProducts = recommendationsData.products || [];
                // Filter out the current product and take the first 4
                setRecommendedProducts(allStoreProducts.filter((p: PublicProduct) => p.id !== productId).slice(0, 4));
            } else {
                console.warn("Could not fetch recommended products.");
            }

            // Set default selections for attributes
            if (fetchedProduct.attributes?.colors?.length > 0) {
              setSelectedColor(fetchedProduct.attributes.colors[0].name);
            }
            if (fetchedProduct.attributes?.sizes?.length > 0) {
              setSelectedSize(fetchedProduct.attributes.sizes[0].name);
            }
            if (fetchedProduct.customizationTechniques?.length > 0) {
              setSelectedTechnique(fetchedProduct.customizationTechniques[0]);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchPageData();
  }, [storeId, productId]);

  const currentPriceInfo = useMemo(() => {
    if (!product) return { price: 0, salePrice: null };

    let variationPrice = product.price;
    let variationSalePrice: number | null = product.salePrice ?? null;

    if (product.nativeVariations && product.nativeVariations.length > 0) {
      const matchingVariation = product.nativeVariations.find(v => {
        const colorMatch = !selectedColor || v.attributes.Color === selectedColor;
        const sizeMatch = !selectedSize || v.attributes.Size === selectedSize;
        return colorMatch && sizeMatch;
      });

      if (matchingVariation) {
        variationPrice = matchingVariation.price;
        variationSalePrice = matchingVariation.salePrice ?? null;
      }
    }

    const finalPrice = variationPrice;
    const finalSalePrice = variationSalePrice;

    return { price: finalPrice, salePrice: finalSalePrice };
  }, [product, selectedColor, selectedSize]);

  if (isLoading) {
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
                        <Link href={`/store/${storeId}/shop`}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Shop
                        </Link>
                    </Button>
                </div>
            </main>
            <StoreFooter storeConfig={storeConfig || { id: storeId, storeName: 'Store' } as UserStoreConfig} />
        </div>
    )
  }

  if (!product) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <StoreHeader storeConfig={storeConfig!} />
          <main className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                  <AlertTriangle className="mx-auto h-12 w-12" />
                  <h2 className="mt-4 text-xl font-semibold">Product Not Found</h2>
                  <p className="mt-2 text-sm">The requested product could not be loaded.</p>
                   <Button asChild variant="outline" className="mt-6">
                        <Link href={`/store/${storeId}/shop`}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Shop
                        </Link>
                    </Button>
              </div>
          </main>
          <StoreFooter storeConfig={storeConfig!} />
        </div>
      );
  }

  const priceToPass = currentPriceInfo.salePrice ?? currentPriceInfo.price;
  const customizerLink = `/customizer?productId=${product.id}&source=customizer-studio&configUserId=${storeConfig?.userId}&storeId=${storeId}&basePrice=${priceToPass}`;

  const showEmbroideryFeeMessage = 
    storeConfig?.embroidery?.setupFeeEnabled &&
    selectedTechnique === 'Embroidery';

  return (
    <div className="flex flex-col min-h-screen bg-background">
        <StoreHeader storeConfig={storeConfig!} />
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-7xl mx-auto px-4">
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
                                    priority
                                />
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {displayedImages.map((view, index) => {
                                let fee = 0;
                                if (selectedTechnique === 'Embroidery') {
                                    fee = view.embroideryAdditionalFee ?? 0;
                                } else if (selectedTechnique && ['DTF', 'DTG', 'Screen Printing', 'Sublimation'].includes(selectedTechnique)) {
                                    fee = view.printAdditionalFee ?? 0;
                                }
                                return (
                                <button
                                    key={`${view.id}-${index}`}
                                    className={cn(
                                        "w-20 rounded-md border-2 p-1.5 transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 flex flex-col items-center text-center",
                                        activeImage === view.imageUrl ? 'border-primary opacity-100 ring-1 ring-primary ring-offset-background shadow-sm' : 'border-transparent opacity-70 hover:border-muted-foreground/30 bg-muted/30 hover:bg-muted/50'
                                    )}
                                    onClick={() => setActiveImage(view.imageUrl)}
                                    title={`Select ${view.name} view`}
                                    aria-pressed={activeImage === view.imageUrl}
                                >
                                    <div className="relative w-full h-16 bg-background rounded-sm overflow-hidden shadow-sm">
                                         <Image
                                            src={view.imageUrl}
                                            alt={view.name || product.name}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-xs mt-1 w-full truncate font-medium">{view.name}</span>
                                    {fee > 0 && <span className="text-xs text-primary font-semibold">+${fee.toFixed(2)}</span>}
                                </button>
                            )})}
                        </div>
                    </div>
                    {/* Product Info */}
                    <div className="flex flex-col pt-4">
                         <h1 className="text-3xl lg:text-4xl font-bold font-headline text-foreground">{product.name}</h1>
                         <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            {product.brand && <span>Brand: <span className="font-medium text-foreground">{product.brand}</span></span>}
                            {(product.brand && (product.sku || product.category)) && <span>|</span>}
                            {product.sku && <span>SKU: <span className="font-medium text-foreground">{product.sku}</span></span>}
                            {(product.sku && product.category) && <span>|</span>}
                            {product.category && <span>Category: <span className="font-medium text-foreground">{product.category}</span></span>}
                         </div>
                         <div className="flex items-baseline gap-2 mt-2 mb-1">
                            <p className={cn("text-2xl font-semibold", currentPriceInfo.salePrice != null ? "text-destructive" : "text-primary")} style={{ color: currentPriceInfo.salePrice == null ? `hsl(var(--primary))` : '' }}>
                                ${currentPriceInfo.salePrice != null ? currentPriceInfo.salePrice.toFixed(2) : currentPriceInfo.price.toFixed(2)}
                            </p>
                            {currentPriceInfo.salePrice != null && (
                                <p className="text-lg text-muted-foreground line-through">
                                    ${currentPriceInfo.price.toFixed(2)}
                                </p>
                            )}
                         </div>
                         {storeConfig.volumeDiscounts?.enabled && (
                            <p className="text-sm text-muted-foreground mb-4">
                                Learn more about <a href="#volume-discounts-chart" className="text-primary hover:underline font-semibold">Volume Discounts.</a>
                            </p>
                         )}
                         
                         <div className="mt-6 space-y-6">
                            {product.attributes && product.attributes.colors && product.attributes.colors.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-2">Color: <span className="font-normal text-muted-foreground">{selectedColor}</span></h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.attributes.colors.map(color => (
                                            <Button 
                                                key={color.name} 
                                                variant="outline" 
                                                size="icon" 
                                                className={cn(
                                                    "h-8 w-8 rounded-full border-2", 
                                                    selectedColor === color.name ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-gray-200'
                                                )}
                                                onClick={() => setSelectedColor(color.name)}
                                                style={{ backgroundColor: color.hex }}
                                                title={color.name}
                                            >
                                               <span className="sr-only">{color.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {product.attributes && product.attributes.sizes && product.attributes.sizes.length > 0 && (
                                 <div>
                                    <h3 className="text-sm font-medium text-foreground mb-2">Size: <span className="font-normal text-muted-foreground">{selectedSize}</span></h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.attributes.sizes.map(size => (
                                            <Button
                                                key={size.id}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedSize(size.name)}
                                                className={cn("h-9", selectedSize === size.name && 'bg-primary text-primary-foreground hover:bg-primary/90')}
                                            >
                                                {size.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                             {product.customizationTechniques && product.customizationTechniques.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-2">Available Techniques:</h3>
                                    <RadioGroup value={selectedTechnique ?? ''} onValueChange={(value) => {
                                        if (value) setSelectedTechnique(value as CustomizationTechnique);
                                    }} className="flex flex-wrap gap-2">
                                        {product.customizationTechniques.map(technique => (
                                            <div key={technique} className="flex items-center">
                                                <RadioGroupItem value={technique} id={technique} className="sr-only" />
                                                <Label htmlFor={technique} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-secondary hover:text-secondary-foreground h-9 px-3 cursor-pointer", selectedTechnique === technique && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                                                    {technique}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                             {showEmbroideryFeeMessage && (
                               <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4 flex items-start">
                                        <InfoIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-blue-900">Embroidery Fee</h4>
                                            <p className="text-sm text-blue-700">
                                                A one-time setup fee of ${storeConfig.embroidery?.setupFeeAmount.toFixed(2)} applies for new logo uploads.
                                                <TooltipProvider delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <a href="#" className="font-semibold underline hover:text-blue-800 ml-1" onClick={(e) => e.preventDefault()}>Learn more.</a>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs p-3" side="top" align="center">
                                                            <div className="space-y-2">
                                                                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                                                    <Image src="https://firebasestorage.googleapis.com/v0/b/embedz.firebasestorage.app/o/misc%2Fembroidery-setup.png?alt=media&token=151d19bf-f929-4d23-b6fc-c55f504bce1a" alt="Embroidery setup example" fill className="object-cover"/>
                                                                </div>
                                                                <p className="text-xs font-bold">One-Time Digitization Fee</p>
                                                                <p className="text-xs">
                                                                    {storeConfig.embroidery?.setupFeeDescription || 'This is a one-time fee to convert your logo file into a format that embroidery machines can read. Once paid, you can reuse this embroidery file on future orders for free.'}
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Shipping Options Section moved here */}
                            <div className="pt-2">
                                <h3 className="text-sm font-medium text-foreground mb-2">Shipping Options</h3>
                                <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping} className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Label htmlFor="shipping-standard" className={cn("flex rounded-lg border p-4 cursor-pointer transition-colors", selectedShipping === 'standard' && "border-primary ring-2 ring-primary")}>
                                            <RadioGroupItem value="standard" id="shipping-standard" className="mt-0.5" />
                                            <div className="ml-4">
                                                <div className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /> Standard Shipping</div>
                                                <p className="text-sm text-muted-foreground">Get it by Wed, Sep 3 - Mon, Sep 8</p>
                                                <p className="text-sm text-muted-foreground">Free on orders over $50.</p>
                                            </div>
                                        </Label>
                                        <Label htmlFor="shipping-rush" className={cn("flex rounded-lg border p-4 cursor-pointer transition-colors", selectedShipping === 'rush' && "border-primary ring-2 ring-primary")}>
                                            <RadioGroupItem value="rush" id="shipping-rush" className="mt-0.5" />
                                            <div className="ml-4">
                                                <div className="font-semibold flex items-center gap-2"><Rocket className="h-4 w-4 text-muted-foreground" /> Rush Shipping (+$12.00)</div>
                                                <p className="text-sm text-muted-foreground">Get it by Sun, Aug 31 - Tue, Sep 2</p>
                                                <p className="text-xs text-muted-foreground mt-1">*Rush applies to shipping time only, not order production.</p>
                                            </div>
                                        </Label>
                                    </div>
                                    {storeConfig.shipping?.localDeliveryEnabled && (
                                        <Label htmlFor="shipping-local" className={cn("flex rounded-lg border p-4 cursor-pointer transition-colors", selectedShipping === 'local' && "border-primary ring-2 ring-primary")}>
                                            <RadioGroupItem value="local" id="shipping-local" className="mt-0.5" />
                                            <div className="ml-4">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    Local Delivery {storeConfig.shipping.localDeliveryFee > 0 ? `(+$${storeConfig.shipping.localDeliveryFee.toFixed(2)})` : ''}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{storeConfig.shipping.localDeliveryText}</p>
                                                <p className="text-xs text-muted-foreground mt-1">*Someone from the shop will reach out to coordinate the order delivery.</p>
                                            </div>
                                        </Label>
                                    )}
                                </RadioGroup>
                            </div>
                        </div>
                        
                         <div className="mt-auto pt-8">
                            <Button asChild size="lg" className="w-full md:w-auto">
                                <Link href={customizerLink}>
                                    Customize This Product <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                         </div>
                    </div>
                 </div>
                 {/* Two-column Description and Discounts Section */}
                 <div className="mt-12 md:mt-16 pt-8 border-t">
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        <div>
                            <h2 className="text-2xl font-bold mb-4 font-headline text-foreground">Product Description</h2>
                            <div className="prose prose-sm text-muted-foreground max-w-none">
                                <p>{product.description}</p>
                            </div>
                        </div>
                        <div>
                            {storeConfig.volumeDiscounts?.enabled && storeConfig.volumeDiscounts.tiers.length > 0 && (
                                <Card className="bg-blue-50 border-blue-200" id="volume-discounts-chart">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-semibold flex items-center mb-4 text-blue-900">
                                            <InfoIcon className="h-5 w-5 mr-2 text-blue-600" />
                                            Volume Discounts
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between font-medium text-blue-800/80">
                                                <span>Quantity</span>
                                                <span>Discount</span>
                                            </div>
                                            <Separator className="bg-blue-200" />
                                            {storeConfig.volumeDiscounts.tiers.map((tier, index) => (
                                                <div key={index} className="flex justify-between items-center text-blue-800/90">
                                                    <span>{tier.quantity}+ units</span>
                                                    <span className="font-bold text-green-600">{tier.percentage}% Off</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-blue-700/80 mt-4">*Discount is applied to the subtotal in your cart.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                 </div>

                 {/* Recommendations Section */}
                <div className="mt-12 md:mt-20 pt-8 border-t">
                    <h2 className="text-3xl font-bold font-headline text-foreground mb-8">You Might Also Like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recommendedProducts.length > 0
                            ? recommendedProducts.map((p) => <ProductCard key={p.id} product={p} />)
                            : Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                        }
                    </div>
                </div>
            </div>
        </main>
        <StoreFooter storeConfig={storeConfig!} />
    </div>
  );
}