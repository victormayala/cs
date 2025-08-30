
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig, VolumeDiscountTier } from '@/app/actions/userStoreActions';
import { Loader2, ShoppingCart, AlertTriangle, ArrowRight, Trash2, Tag } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

// Represents a single item in the shopping cart
interface CartItem {
    id: string; // Unique ID for this cart item instance (e.g., crypto.randomUUID())
    productId: string;
    variationId: string | null;
    quantity: number;
    productName: string; 
    totalCustomizationPrice: number;
    previewImageUrl?: string; // Generated on the customizer page
    customizationDetails: any; 
}

function CartLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-4xl mx-auto px-4">
                <Skeleton className="h-10 w-1/3 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                    <div className="md:col-span-1">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        </main>
      <footer className="border-t bg-muted/50 h-20 flex items-center">
        <div className="container mx-auto px-4 md:px-6">
            <Skeleton className="h-4 w-1/4" />
        </div>
      </footer>
    </div>
    )
}

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const { toast } = useToast();

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCartStorageKey = useCallback(() => `cs_cart_${storeId}`, [storeId]);

  // Function to save cart to localStorage
  const saveCart = useCallback((items: CartItem[]) => {
      localStorage.setItem(getCartStorageKey(), JSON.stringify(items));
      setCartItems(items);
  }, [getCartStorageKey]);

  // Load cart from localStorage
  useEffect(() => {
    if (!storeId) return;
    try {
        const storedCart = localStorage.getItem(getCartStorageKey());
        if (storedCart) {
            setCartItems(JSON.parse(storedCart));
        }
    } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        localStorage.removeItem(getCartStorageKey());
    }
  }, [storeId, getCartStorageKey]);

  // This effect listens for postMessage from the customizer iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const designData = event.data?.customizerStudioDesignData;
      if (designData) {
        const cartKey = getCartStorageKey();
        try {
          const currentCart: CartItem[] = JSON.parse(localStorage.getItem(cartKey) || '[]');
          const newCartItem: CartItem = {
            id: crypto.randomUUID(),
            productId: designData.productId,
            variationId: designData.variationId,
            quantity: 1,
            productName: designData.customizationDetails.productName || 'Custom Product',
            totalCustomizationPrice: designData.customizationDetails.totalCustomizationPrice,
            previewImageUrl: designData.customizationDetails.previewImageUrl,
            customizationDetails: designData.customizationDetails,
          };
          const updatedCart = [...currentCart, newCartItem];
          saveCart(updatedCart);
          toast({ title: "Item Added to Cart!", description: `${newCartItem.productName} is now in your cart.` });
        } catch (e) {
            console.error("Error updating cart from postMessage:", e);
            toast({ title: "Cart Error", description: "Could not add item to cart.", variant: "destructive" });
        }
      }
    };
  
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [storeId, toast, router, getCartStorageKey, saveCart]);

  // Fetch store config
  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing from the URL.');
      setIsLoading(false);
      return;
    }
    const fetchStoreConfig = async () => {
      setIsLoading(true);
      try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (storeDocSnap.exists()) {
          setStoreConfig({ ...storeDocSnap.data(), id: storeDocSnap.id } as UserStoreConfig);
        } else {
          throw new Error("Store configuration not found.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreConfig();
  }, [storeId]);

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const quantity = Math.max(1, newQuantity); // Ensure quantity is at least 1
    const updatedItems = cartItems.map(item => 
        item.id === itemId ? { ...item, quantity } : item
    );
    saveCart(updatedItems);
  };


  const handleRemoveItem = (itemId: string) => {
    const newItems = cartItems.filter(item => item.id !== itemId);
    saveCart(newItems);
    toast({ title: "Item Removed", description: "The item has been removed from your cart." });
  };
  
  const totalQuantity = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((acc, item) => acc + (item.totalCustomizationPrice * item.quantity), 0), [cartItems]);

  const { discountAmount, discountPercentage } = useMemo(() => {
    if (!storeConfig?.volumeDiscounts?.enabled || storeConfig.volumeDiscounts.tiers.length === 0) {
      return { discountAmount: 0, discountPercentage: 0 };
    }
    
    const applicableTier = storeConfig.volumeDiscounts.tiers
      .filter(tier => totalQuantity >= tier.quantity)
      .sort((a, b) => b.quantity - a.quantity)[0];
      
    if (applicableTier) {
      const discount = subtotal * (applicableTier.percentage / 100);
      return { discountAmount: discount, discountPercentage: applicableTier.percentage };
    }
    
    return { discountAmount: 0, discountPercentage: 0 };
  }, [totalQuantity, subtotal, storeConfig]);

  const total = subtotal - discountAmount;


  if (isLoading || !storeConfig) {
    return <CartLoadingSkeleton />;
  }
  
  if (error) {
     return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16"></header>
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-6">
                    <div className="text-center text-destructive">
                        <AlertTriangle className="mx-auto h-12 w-12" />
                        <h2 className="mt-4 text-xl font-semibold">Error</h2>
                        <p className="mt-2 text-sm">{error}</p>
                    </div>
                </Card>
            </main>
            <footer className="border-t bg-muted/50 h-20"></footer>
        </div>
     )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-8">
            Your Shopping Cart
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-0">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Your cart is empty</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                        Looks like you haven't added any custom items yet.
                        </p>
                        <Button asChild className="mt-6">
                        <Link href={`/store/${storeId}/products`}>
                            Start Shopping
                        </Link>
                        </Button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                        {cartItems.map(item => (
                            <li key={item.id} className="flex gap-4 p-4">
                                <div className="relative h-24 w-24 rounded-md overflow-hidden bg-muted/50 flex-shrink-0 border">
                                    <Image 
                                        src={item.previewImageUrl || '/placeholder-image.png'} 
                                        alt={item.productName} 
                                        fill 
                                        className="object-contain" 
                                    />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-foreground">{item.productName}</h4>
                                    <p className="text-sm text-muted-foreground">Custom Design</p>
                                    <p className="text-sm font-medium mt-1">${item.totalCustomizationPrice.toFixed(2)}</p>
                                </div>
                                <div className="flex flex-col items-end justify-between">
                                    <p className="font-semibold">${(item.totalCustomizationPrice * item.quantity).toFixed(2)}</p>
                                    <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                        className="h-8 w-16 text-center"
                                        min="1"
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Remove item</span>
                                    </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-1">
              <Card className="sticky top-28">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                   {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        <Tag className="inline-block h-4 w-4 mr-1" />
                        Volume Discount ({discountPercentage}%)
                      </span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at next step</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild disabled={cartItems.length === 0}>
                     <Link href={`/store/${storeId}/checkout`}>
                        Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
