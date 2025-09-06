
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { ArrowLeft, Loader2, Package, AlertTriangle, ExternalLink, PackageCheck } from 'lucide-react';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { NativeProduct } from '@/app/actions/productActions';
import { fetchShopifyProducts } from '@/app/actions/shopifyActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import { fetchWooCommerceProducts } from '@/app/actions/woocommerceActions';
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import { deployStore } from '@/ai/flows/deploy-store';

interface DisplayProduct {
  id: string;
  name: string;
  imageUrl?: string;
  source: 'woocommerce' | 'shopify' | 'customizer-studio';
}

function SelectProductsStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [allProducts, setAllProducts] = useState<DisplayProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllProductsAndConfig = useCallback(async () => {
    if (!user || !storeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const storeRef = doc(db, 'userStores', storeId);
      const storeSnap = await getDoc(storeRef);
      if (!storeSnap.exists() || storeSnap.data()?.userId !== user.uid) {
        throw new Error("Store not found or you don't have permission to access it.");
      }
      const config = storeSnap.data() as UserStoreConfig;
      setStoreConfig(config);
      setSelectedProductIds(new Set(config.productIds || []));

      // Fetch all products from all sources
      let fetchedProducts: DisplayProduct[] = [];
      
      // Native Products
      const nativeProductsRef = collection(db, `users/${user.uid}/products`);
      const nativeSnapshot = await getDocs(nativeProductsRef);
      fetchedProducts.push(...nativeSnapshot.docs.map(doc => {
          const data = doc.data() as NativeProduct;
          return {
            id: doc.id,
            name: data.name,
            imageUrl: `https://picsum.photos/seed/${doc.id}/150`,
            source: 'customizer-studio' as const
          };
      }));
      
      // Shopify Products
      const shopifyCredsRef = doc(db, 'userShopifyCredentials', user.uid);
      const shopifyCredsSnap = await getDoc(shopifyCredsRef);
      if (shopifyCredsSnap.exists()) {
          const creds = shopifyCredsSnap.data() as UserShopifyCredentials;
          const { products } = await fetchShopifyProducts(creds.shop, creds.accessToken);
          if (products) {
              fetchedProducts.push(...products.map(p => ({
                  id: p.id,
                  name: p.title,
                  imageUrl: p.featuredImage?.url,
                  source: 'shopify' as const
              })));
          }
      }

      // WooCommerce Products
      const wcCredsRef = doc(db, 'userWooCommerceCredentials', user.uid);
      const wcCredsSnap = await getDoc(wcCredsRef);
      if (wcCredsSnap.exists()) {
          const creds = wcCredsSnap.data() as UserWooCommerceCredentials;
          const { products } = await fetchWooCommerceProducts(creds);
           if (products) {
              fetchedProducts.push(...products.map(p => ({
                  id: p.id.toString(),
                  name: p.name,
                  imageUrl: p.images?.[0]?.src,
                  source: 'woocommerce' as const
              })));
          }
      }

      setAllProducts(fetchedProducts);

    } catch (err: any) {
      console.error("Error loading products/config:", err);
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, storeId, toast]);

  useEffect(() => {
    if (user) {
      loadAllProductsAndConfig();
    }
  }, [user, loadAllProductsAndConfig]);

  const handleProductSelectionChange = async (productId: string, isSelected: boolean) => {
    if (!storeId || !user) return;
    
    const newSelectedIds = new Set(selectedProductIds);
    if (isSelected) {
      newSelectedIds.add(productId);
    } else {
      newSelectedIds.delete(productId);
    }
    setSelectedProductIds(newSelectedIds);

    try {
        const storeRef = doc(db, 'userStores', storeId);
        await updateDoc(storeRef, {
          productIds: Array.from(newSelectedIds),
          lastSaved: serverTimestamp()
        });
        toast({ title: "Selection Saved", description: "Your product list for this store has been updated.", duration: 2000 });
    } catch (err: any) {
        console.error("Error updating product selection:", err);
        toast({ title: "Update Failed", description: "Could not save your selection.", variant: "destructive"});
        // Revert UI change on error
        const revertedIds = new Set(selectedProductIds);
        if (isSelected) revertedIds.delete(productId); else revertedIds.add(productId);
        setSelectedProductIds(revertedIds);
    }
  };

  const handleDeploy = async () => {
      if (!storeConfig) {
          toast({ title: "Error", description: "Store configuration not loaded.", variant: "destructive" });
          return;
      }
      setIsDeploying(true);
      try {
        toast({ title: "Deployment Started", description: "Your store is being deployed. This may take a moment." });
        
        const storeRef = doc(db, 'userStores', storeId);
        await updateDoc(storeRef, { 'deployment.status': 'pending' });

        const plainStoreConfig = JSON.parse(JSON.stringify({ ...storeConfig, productIds: Array.from(selectedProductIds) }));
        const deploymentResult = await deployStore(plainStoreConfig);
        
        await updateDoc(storeRef, {
            deployment: {
                status: 'active',
                deployedUrl: deploymentResult.deploymentUrl,
                lastDeployedAt: serverTimestamp(),
            }
        });

        toast({ title: "Deployment Successful!", description: "Your store is now live." });
        router.push(`/store/${storeId}`);

      } catch (err: any) {
        console.error("Deployment failed:", err);
        toast({ title: "Deployment Failed", description: err.message, variant: "destructive" });
        const storeRef = doc(db, 'userStores', storeId);
        await updateDoc(storeRef, { 'deployment.status': 'error' });
      } finally {
        setIsDeploying(false);
      }
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Products...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <AppHeader />
            <main className="flex-1 flex items-center justify-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Page</h2>
                <p className="text-muted-foreground text-center mb-6">{error}</p>
                <Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
              <Link href={`/dashboard/store/create?storeId=${storeId}`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Store Settings</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                Select Products for "{storeConfig?.storeName}"
              </h1>
              <p className="text-muted-foreground">
                Choose which products will appear in this store. Changes are saved automatically.
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
                {allProducts.length === 0 ? (
                    <div className="text-center py-10">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">No products found in your account.</p>
                        <Button asChild variant="link" className="mt-2">
                           <Link href="/dashboard">Go to Dashboard to add products</Link>
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allProducts.map(product => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedProductIds.has(product.id)}
                                            onCheckedChange={(checked) => handleProductSelectionChange(product.id, checked as boolean)}
                                            id={`product-${product.id}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted/30">
                                            <Image src={product.imageUrl || `https://placehold.co/150x150.png`} alt={product.name} fill className="object-contain" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{product.source === 'customizer-studio' ? 'Native' : product.source}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
          </Card>
           <div className="flex justify-end gap-2">
                {storeConfig?.deployment?.status === 'active' && storeConfig?.deployment?.deployedUrl && (
                    <Button variant="outline" asChild>
                        <Link href={storeConfig.deployment.deployedUrl} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Live Store
                        </Link>
                    </Button>
                )}
                <Button onClick={handleDeploy} disabled={isDeploying || selectedProductIds.size === 0}>
                    {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                    {isDeploying ? "Deploying..." : "Deploy Store"}
                </Button>
           </div>
        </div>
      </main>
    </div>
  );
}

export default SelectProductsStorePage;
