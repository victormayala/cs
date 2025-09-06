
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { CreditCard, Lock, AlertTriangle, ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { StoreOrder, StoreCustomer } from '@/lib/data-types';

// Represents a single item in the shopping cart
interface CartItem {
    id: string; // Unique ID for this cart item instance (e.g., crypto.randomUUID())
    productId: string;
    productName: string; 
    quantity: number;
    totalCustomizationPrice: number;
    previewImageUrl?: string; 
    customizationDetails: any; 
}


function CheckoutLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-5xl mx-auto px-4">
                <Skeleton className="h-10 w-1/3 mb-8" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <Skeleton className="h-8 w-1/2 mb-4" />
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                    <div>
                        <Skeleton className="h-8 w-1/2 mb-4" />
                        <Skeleton className="h-64 w-full" />
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

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const { toast } = useToast();
  const { user } = useAuth(); // We don't require login for checkout, but can use if available

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerInfo, setCustomerInfo] = useState({
      firstName: '',
      lastName: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
  });
  
  const getCartStorageKey = useCallback(() => `cs_cart_${storeId}`, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing.');
      setIsLoading(false);
      return;
    }

    const fetchPageData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (storeDocSnap.exists()) {
          setStoreConfig({ ...storeDocSnap.data(), id: storeDocSnap.id } as UserStoreConfig);
        } else {
          throw new Error("Store configuration not found.");
        }

        const storedCart = localStorage.getItem(getCartStorageKey());
        const parsedCart = storedCart ? JSON.parse(storedCart) : [];
        if (parsedCart.length === 0) {
            toast({ title: "Cart is empty", description: "Redirecting to product page.", variant: "default"});
            router.replace(`/store/${storeId}/products`);
            return;
        }
        setCartItems(parsedCart);

      } catch (err: any) {
        setError(err.message);
        console.error("Error loading checkout page:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPageData();
  }, [storeId, router, toast, getCartStorageKey]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setCustomerInfo(prev => ({...prev, [id]: value }));
  }

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => acc + (item.totalCustomizationPrice * item.quantity), 0), [cartItems]);
  const shippingCost = useMemo(() => storeConfig?.shipping?.localDeliveryEnabled ? storeConfig.shipping.localDeliveryFee : 5.00, [storeConfig]);
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeConfig) {
        toast({ title: "Error", description: "Store config not loaded.", variant: "destructive" });
        return;
    }
    setIsPlacingOrder(true);
    toast({ title: "Processing Order...", description: "Please wait while we finalize your purchase." });

    try {
        const customerRef = collection(db, `users/${storeConfig.userId}/customers`);
        const newCustomer: Omit<StoreCustomer, 'id'> = {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            email: customerInfo.email,
            storeId: storeId,
            createdAt: serverTimestamp(),
            totalSpent: total,
            orderCount: 1,
        };
        const customerDocRef = await addDoc(customerRef, newCustomer);

        const orderRef = collection(db, `users/${storeConfig.userId}/orders`);
        const newOrder: Omit<StoreOrder, 'id'> = {
            storeId: storeId,
            customerId: customerDocRef.id,
            customerName: newCustomer.name,
            totalAmount: total,
            status: 'processing',
            items: cartItems,
            createdAt: serverTimestamp(),
        };
        await addDoc(orderRef, newOrder);

        // On successful order creation, clear the cart and redirect
        localStorage.removeItem(getCartStorageKey());
        router.push(`/store/${storeId}/order/success`);

    } catch (err: any) {
        console.error("Failed to place order:", err);
        toast({ title: "Order Failed", description: `Could not save your order: ${err.message}`, variant: "destructive" });
        setIsPlacingOrder(false);
    }
  };


  if (isLoading || !storeConfig) {
      return <CheckoutLoadingSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-5xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-8">
                Checkout
            </h1>

            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Left side: Shipping and Payment */}
                <div className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Contact & Shipping Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={customerInfo.email} onChange={handleInputChange} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={customerInfo.firstName} onChange={handleInputChange} required /></div>
                                <div className="space-y-1"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={customerInfo.lastName} onChange={handleInputChange} required /></div>
                            </div>
                            <div className="space-y-1"><Label htmlFor="address">Address</Label><Input id="address" value={customerInfo.address} onChange={handleInputChange} required /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1"><Label htmlFor="city">City</Label><Input id="city" value={customerInfo.city} onChange={handleInputChange} required /></div>
                                <div className="space-y-1"><Label htmlFor="state">State</Label><Input id="state" value={customerInfo.state} onChange={handleInputChange} required /></div>
                                <div className="space-y-1"><Label htmlFor="zip">ZIP Code</Label><Input id="zip" value={customerInfo.zip} onChange={handleInputChange} required /></div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
                        <CardContent className="text-center py-10 text-muted-foreground">
                            <CreditCard className="mx-auto h-12 w-12 mb-4" />
                            <p className="font-medium">Payment Integration Coming Soon</p>
                            <p className="text-sm mt-1">This is a simulated checkout. No real payment will be processed.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: Order Summary */}
                <div>
                    <Card className="sticky top-28">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted border flex-shrink-0">
                                            <Image src={item.previewImageUrl || '/placeholder-image.png'} alt={item.productName} fill className="object-contain" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm truncate">{item.productName}</p>
                                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-semibold">${item.totalCustomizationPrice.toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <Separator className="my-4" />
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>${shippingCost.toFixed(2)}</span></div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg"><span >Total</span><span>${total.toFixed(2)}</span></div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-4">
                             <Button type="submit" size="lg" className="w-full" disabled={isPlacingOrder}>
                                {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                {isPlacingOrder ? "Processing..." : "Place Order"}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                <Lock className="inline-block h-3 w-3 mr-1" />
                                Secure checkout simulation.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
