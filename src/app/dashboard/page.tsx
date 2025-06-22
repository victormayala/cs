
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCcw, MoreHorizontal, Settings, Code, Trash2, AlertTriangle, Loader2, LogOut, Link as LinkIcon, KeyRound, Save, Package as PackageIcon, PlugZap, UserCircle, XCircle, Clipboard, Check, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';

import { fetchWooCommerceProducts, type WooCommerceCredentials } from "@/app/actions/woocommerceActions";
import type { UserWooCommerceCredentials } from "@/app/actions/userCredentialsActions"; 
import { fetchShopifyProducts } from "@/app/actions/shopifyActions";
import type { UserShopifyCredentials, ShopifyCredentials } from "@/app/actions/userShopifyCredentialsActions";
import { db } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'; 
import type { WCCustomProduct } from '@/types/woocommerce';
import type { ShopifyProduct } from '@/types/shopify';
import {format} from 'date-fns';

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/layout/AppHeader";
import { UploadProvider } from "@/contexts/UploadContext";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Alert as ShadCnAlert, AlertDescription as ShadCnAlertDescription, AlertTitle as ShadCnAlertTitle } from "@/components/ui/alert";
import { FaShopify } from "react-icons/fa";


interface DisplayProduct {
  id: string;
  name: string;
  status: string;
  lastEdited: string;
  imageUrl?: string;
  aiHint?: string;
  source: 'woocommerce' | 'shopify';
}

type ActiveDashboardTab = 'products' | 'storeIntegration' | 'settings' | 'profile';

interface ProductToDelete {
  id: string;
  name: string;
}

const LOCALLY_HIDDEN_PRODUCTS_KEY_PREFIX = 'customizer_studio_locally_hidden_products_';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authIsLoading, signOut: authSignOut } = useAuth();
  const { toast } = useToast(); 

  const [activeTab, setActiveTab] = useState<ActiveDashboardTab>('products');
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WooCommerce State
  const [wcStoreUrl, setWcStoreUrl] = useState('');
  const [wcConsumerKey, setWcConsumerKey] = useState('');
  const [wcConsumerSecret, setWcConsumerSecret] = useState('');
  const [isSavingWcCredentials, setIsSavingWcCredentials] = useState(false);
  const [isLoadingWcCredentials, setIsLoadingWcCredentials] = useState(true);
  const [wcCredentialsExist, setWcCredentialsExist] = useState(false);

  // Shopify State
  const [shopifyStoreName, setShopifyStoreName] = useState('');
  const [isSavingShopifyCredentials, setIsSavingShopifyCredentials] = useState(false);
  const [isLoadingShopifyCredentials, setIsLoadingShopifyCredentials] = useState(true);
  const [shopifyCredentialsExist, setShopifyCredentialsExist] = useState(false);
  const [connectedShopifyStore, setConnectedShopifyStore] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductToDelete | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Client-side function to save Shopify credentials
  const saveShopifyCredentialsClientSide = useCallback(async (credentials: ShopifyCredentials) => {
    if (!user || !user.uid || !db) {
      toast({ title: "Error", description: "User not authenticated or database unavailable.", variant: "destructive" });
      return;
    }
    setIsSavingShopifyCredentials(true);
    try {
      const docRef = doc(db, 'userShopifyCredentials', user.uid);
      const dataToSave: Partial<UserShopifyCredentials> = { ...credentials, lastSaved: serverTimestamp() };
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        dataToSave.createdAt = serverTimestamp();
      }
      await setDoc(docRef, dataToSave, { merge: true });
      setShopifyCredentialsExist(true);
      setConnectedShopifyStore(credentials.shop);
      toast({ title: "Shopify Store Connected!", description: "Your credentials have been securely saved." });
      if (activeTab === 'products') {
        loadAllProducts(true, false);
      }
    } catch (error: any) {
      console.error('Error saving Shopify credentials:', error);
      let description = `Failed to save: ${error.message}`;
      if (error.code === 'permission-denied') {
          description = "Save failed due to permissions. Please check your Firestore security rules for 'userShopifyCredentials'.";
      }
      toast({ title: "Error Saving Shopify Credentials", description, variant: "destructive" });
    } finally {
      setIsSavingShopifyCredentials(false);
    }
  }, [user, toast, activeTab, loadAllProducts]);

  // Effect to handle the callback from Shopify OAuth
  useEffect(() => {
    const shop = searchParams.get('shopify_shop');
    const accessToken = searchParams.get('shopify_access_token');
    
    if (shop && accessToken && user) {
      saveShopifyCredentialsClientSide({ shop, accessToken });
      // Clean up URL
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, user, saveShopifyCredentialsClientSide, router]);


  const getLocallyHiddenProductIds = useCallback((): string[] => {
    if (typeof window === 'undefined' || !user || !user.uid) { 
        return [];
    }
    const key = `${LOCALLY_HIDDEN_PRODUCTS_KEY_PREFIX}${user.uid}`;
    try {
      const storedIds = localStorage.getItem(key);
      if (storedIds === null || storedIds === undefined) { 
        return [];
      }
      return JSON.parse(storedIds);
    } catch (e) {
      console.error("Error parsing locally hidden product IDs from localStorage:", e);
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.error("Error removing malformed item from localStorage:", removeError);
      }
      return [];
    }
  }, [user]);

  const setLocallyHiddenProductIds = useCallback((ids: string[]): void => {
    if (typeof window === 'undefined' || !user || !user.uid) return; 
    try {
      localStorage.setItem(`${LOCALLY_HIDDEN_PRODUCTS_KEY_PREFIX}${user.uid}`, JSON.stringify(ids));
    } catch (e) {
      console.error("Error setting locally hidden product IDs:", e);
      toast({
        title: "Storage Error",
        description: "Could not save hidden product preference locally.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const loadAllProducts = useCallback(async (isManualRefresh?: boolean, ignoreHiddenList: boolean = false) => {
    if (!user) {
      setError("Please sign in to view products.");
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setError(null);
    const startTime = Date.now();

    const hasAnyCredentials = wcCredentialsExist || shopifyCredentialsExist;
    if (!hasAnyCredentials) {
      setError("Connect your WooCommerce or Shopify store via the 'Store Integration' tab to see your products.");
      setProducts([]);
      setIsLoadingProducts(false);
      if (isManualRefresh) {
        toast({
          title: "No Store Connected",
          description: "Please connect a store in 'Store Integration' to see products here.",
          variant: "default",
        });
      }
      return;
    }

    let allDisplayProducts: DisplayProduct[] = [];
    const hiddenProductIds = ignoreHiddenList ? [] : getLocallyHiddenProductIds();
    let wcError, shopifyError;

    // Fetch WooCommerce Products
    if (wcCredentialsExist) {
      const userCredentialsToUse: WooCommerceCredentials = { storeUrl: wcStoreUrl, consumerKey: wcConsumerKey, consumerSecret: wcConsumerSecret };
      const { products: fetchedWcProducts, error: fetchWcError } = await fetchWooCommerceProducts(userCredentialsToUse);
      if (fetchedWcProducts) {
        const wcDisplayProducts = fetchedWcProducts
          .filter(p => !hiddenProductIds.includes(p.id.toString()))
          .map(p => ({
            id: p.id.toString(), name: p.name, status: p.status,
            lastEdited: format(new Date(p.date_modified_gmt || p.date_modified || p.date_created_gmt || p.date_created), "PPP"),
            imageUrl: p.images?.[0]?.src || `https://placehold.co/150x150.png`,
            aiHint: p.images?.[0]?.alt?.split(" ").slice(0,2).join(" ") || "product image",
            source: 'woocommerce' as const,
          }));
        allDisplayProducts.push(...wcDisplayProducts);
      }
      if (fetchWcError) wcError = `WooCommerce: ${fetchWcError}`;
    }

    // Fetch Shopify Products
    if (shopifyCredentialsExist && user.uid) {
        try {
            const credDocRef = doc(db, 'userShopifyCredentials', user.uid);
            const credDocSnap = await getDoc(credDocRef);
            if (credDocSnap.exists()) {
                const credentials = credDocSnap.data() as UserShopifyCredentials;
                 if (credentials?.shop && credentials.accessToken) {
                    const { products: fetchedShopifyProducts, error: fetchShopifyError } = await fetchShopifyProducts(credentials.shop, credentials.accessToken);
                    if (fetchedShopifyProducts) {
                    const shopifyDisplayProducts = fetchedShopifyProducts
                        .filter(p => !hiddenProductIds.includes(p.id))
                        .map(p => ({
                        id: p.id, name: p.title, status: p.status.toLowerCase(),
                        lastEdited: format(new Date(p.updatedAt), "PPP"),
                        imageUrl: p.featuredImage?.url || `https://placehold.co/150x150.png`,
                        aiHint: p.featuredImage?.altText?.split(" ").slice(0,2).join(" ") || "product image",
                        source: 'shopify' as const,
                        }));
                    allDisplayProducts.push(...shopifyDisplayProducts);
                    }
                    if (fetchShopifyError) shopifyError = `Shopify: ${fetchShopifyError}`;
                } else {
                    shopifyError = "Shopify credentials could not be loaded.";
                }
            }
        } catch (e: any) {
            shopifyError = `Failed to load Shopify credentials from DB: ${e.message}`;
        }
    }
    
    setProducts(allDisplayProducts);
    const combinedError = [wcError, shopifyError].filter(Boolean).join(' | ');
    setError(combinedError || null);

    const duration = Date.now() - startTime;
    if (isManualRefresh) {
      toast({
        title: "Products Refreshed",
        description: `Fetched ${allDisplayProducts.length} products in ${duration}ms. ${ignoreHiddenList ? 'Hidden items temporarily shown.' : ''}`,
      });
      if (combinedError) {
         toast({ title: "Fetch Errors", description: combinedError, variant: "destructive"});
      }
    }

    setIsLoadingProducts(false);
  }, [user, getLocallyHiddenProductIds, wcCredentialsExist, shopifyCredentialsExist, wcStoreUrl, wcConsumerKey, wcConsumerSecret, toast, db]);
  
  // Load WC Credentials (Client-side)
  useEffect(() => {
    if (user?.uid && db) {
      setIsLoadingWcCredentials(true);
      const docRef = doc(db, 'userWooCommerceCredentials', user.uid);
      getDoc(docRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const credentials = docSnap.data() as UserWooCommerceCredentials;
            setWcStoreUrl(credentials.storeUrl || '');
            setWcConsumerKey(credentials.consumerKey || '');
            setWcConsumerSecret(credentials.consumerSecret || '');
            setWcCredentialsExist(true);
          } else {
            setWcCredentialsExist(false);
          }
        })
        .catch(e => {
          console.error("Error loading WC credentials:", e);
          let description = "Could not read saved WooCommerce credentials.";
          if (e.code === 'permission-denied') {
            description = "Permission denied. Please check your Firestore security rules for 'userWooCommerceCredentials'.";
          }
          toast({ title: "WC Credential Load Error", description, variant: "destructive"});
        })
        .finally(() => setIsLoadingWcCredentials(false));
    } else if (!user) {
      setIsLoadingWcCredentials(false);
    }
  }, [user, toast, db]);

  // Load Shopify Credentials (Client-side)
  useEffect(() => {
    if (user?.uid && db) {
      setIsLoadingShopifyCredentials(true);
      const docRef = doc(db, 'userShopifyCredentials', user.uid);
      getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            const credentials = docSnap.data() as UserShopifyCredentials;
            setShopifyCredentialsExist(true);
            setConnectedShopifyStore(credentials.shop);
        } else {
            setShopifyCredentialsExist(false);
            setConnectedShopifyStore('');
        }
      }).catch(e => {
        console.error("Error loading Shopify credentials:", e);
        let description = "Could not read saved Shopify credentials.";
        if (e.code === 'permission-denied') {
            description = "Permission denied. Please check your Firestore security rules for 'userShopifyCredentials'.";
        }
        toast({ title: "Shopify Credential Load Error", description, variant: "destructive"});
      }).finally(() => {
        setIsLoadingShopifyCredentials(false);
      });
    }
  }, [user, toast, db]);

  const handleSaveWcCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.uid || isSavingWcCredentials || !db) {
      toast({ title: "Error", description: "User not authenticated or database unavailable.", variant: "destructive" });
      return;
    }
    setIsSavingWcCredentials(true);
    const credentialsToSave: WooCommerceCredentials = { storeUrl: wcStoreUrl, consumerKey: wcConsumerKey, consumerSecret: wcConsumerSecret };
    try {
      await setDoc(doc(db, 'userWooCommerceCredentials', user.uid), { ...credentialsToSave, lastSaved: serverTimestamp() }, { merge: true });
      setWcCredentialsExist(true);
      toast({ title: "WooCommerce Credentials Saved" });
      if (activeTab === 'products') {
         loadAllProducts(true, false); 
      }
    } catch (error: any) {
      console.error('Error saving WC credentials:', error);
      let description = `Failed to save: ${error.message}`;
      if (error.code === 'permission-denied') {
            description = "Save failed due to permissions. Please check your Firestore security rules for 'userWooCommerceCredentials'.";
      }
      toast({ title: "Error Saving WC Credentials", description, variant: "destructive" });
    } finally {
      setIsSavingWcCredentials(false);
    }
  };

  const handleClearWcCredentials = async () => {
    if (!user || !user.uid || isSavingWcCredentials || !db) return;
    setIsSavingWcCredentials(true); 
    try {
        const docRef = doc(db, 'userWooCommerceCredentials', user.uid);
        await deleteDoc(docRef);
        setWcStoreUrl(''); setWcConsumerKey(''); setWcConsumerSecret('');
        setWcCredentialsExist(false);
        toast({ title: "WooCommerce Credentials Cleared" });
        if (activeTab === 'products') {
            loadAllProducts();
        }
    } catch (error: any) {
        let description = `Failed to delete credentials: ${error.message}`;
        if (error.code === 'permission-denied') {
            description = "Delete failed due to permissions. Please check your Firestore security rules for 'userWooCommerceCredentials'.";
        }
        toast({ title: "Error Clearing WC Credentials", description, variant: "destructive" });
    } finally {
        setIsSavingWcCredentials(false);
    }
  };
  
  const handleConnectShopify = () => {
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be signed in to connect a store.", variant: "destructive" });
      return;
    }
    if (!shopifyStoreName.trim()) {
      toast({ title: "Missing Information", description: "Please enter your Shopify store name (e.g., your-store-name).", variant: "destructive" });
      return;
    }
    const shopDomain = `${shopifyStoreName.replace(/.myshopify.com/gi, '').trim()}.myshopify.com`;
    const authUrl = `/api/shopify/auth?shop=${shopDomain}&userId=${user.uid}`;
    window.top?.location.assign(authUrl);
  };

  const handleClearShopifyCredentials = async () => {
    if (!user || !user.uid || isSavingShopifyCredentials || !db) return;
    setIsSavingShopifyCredentials(true);
    try {
        const docRef = doc(db, 'userShopifyCredentials', user.uid);
        await deleteDoc(docRef);
        setShopifyStoreName('');
        setShopifyCredentialsExist(false);
        setConnectedShopifyStore('');
        toast({ title: "Shopify Connection Removed" });
        if (activeTab === 'products') {
            loadAllProducts();
        }
    } catch(error: any) {
       let description = `Failed to delete credentials: ${error.message}`;
       if (error.code === 'permission-denied') {
           description = "Delete failed due to permissions. Please check your Firestore security rules for 'userShopifyCredentials'.";
       }
       toast({ title: "Error Removing Shopify Connection", description, variant: "destructive" });
    } finally {
        setIsSavingShopifyCredentials(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'products' && user && !isLoadingWcCredentials && !isLoadingShopifyCredentials && products.length === 0 && !isLoadingProducts && !error) {
      if (wcCredentialsExist || shopifyCredentialsExist) {
        loadAllProducts(false, false);
      } else if (!isLoadingProducts) {
        setError("Connect your WooCommerce or Shopify store via the 'Store Integration' tab to see your products.");
      }
    }
  }, [activeTab, user, isLoadingWcCredentials, isLoadingShopifyCredentials, products.length, isLoadingProducts, error, loadAllProducts, wcCredentialsExist, shopifyCredentialsExist]);

  const handleDeleteProduct = (product: DisplayProduct) => {
    setProductToDelete({ id: product.id, name: product.name });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete || !user) return;
    const currentHiddenIds = getLocallyHiddenProductIds();
    if (!currentHiddenIds.includes(productToDelete.id)) {
      setLocallyHiddenProductIds([...currentHiddenIds, productToDelete.id]);
    }
    toast({
      title: "Product Hidden",
      description: `${productToDelete.name} has been hidden from your dashboard view. It is not deleted from your store.`,
    });
    setProducts(prev => prev.filter(p => p.id !== productToDelete.id)); 
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };
  
  const handleCopyUserId = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUserId(true);
      toast({ title: "User ID Copied!", description: "Your User ID has been copied to the clipboard." });
      setTimeout(() => setCopiedUserId(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy User ID. Please try again or copy manually.", variant: "destructive" });
      console.error('Failed to copy User ID: ', err);
    }
  };

  if (authIsLoading || !user) {
    return <div className="flex min-h-svh w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  const isLoadingAnyCredentials = isLoadingWcCredentials || isLoadingShopifyCredentials;
  const isAnyStoreConnected = wcCredentialsExist || shopifyCredentialsExist;
  const isStoreConnectionIssueError = error && (error.includes("Connect your") || error.includes("Store Integration"));


  return (
    <UploadProvider>
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <SidebarProvider defaultOpen>
          <div className="flex flex-1">
            <Sidebar side="left" className="h-full shadow-md border-r">
              <SidebarHeader className="p-4 border-b">
                <h2 className="font-headline text-lg font-semibold text-foreground">Navigation</h2>
              </SidebarHeader>
              <SidebarContent className="flex flex-col p-0">
                <div className="p-2">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveTab('products')} isActive={activeTab === 'products'} className="w-full justify-start">
                        <PackageIcon className="mr-2 h-5 w-5" /> Products
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveTab('storeIntegration')} isActive={activeTab === 'storeIntegration'} className="w-full justify-start">
                        <PlugZap className="mr-2 h-5 w-5" /> Store Integration
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
              </SidebarContent>
              <SidebarFooter className="p-4 border-t mt-auto">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveTab('settings')} isActive={activeTab === 'settings'} className="w-full justify-start">
                      <Settings className="mr-2 h-5 w-5" /> Settings
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveTab('profile')} isActive={activeTab === 'profile'} className="w-full justify-start">
                      <UserCircle className="mr-2 h-5 w-5" /> Profile
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset className="flex-1 overflow-hidden">
              <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/30 overflow-y-auto h-full">
                <div className="container mx-auto space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Your Dashboard</h1>
                      <p className="text-muted-foreground">Welcome, {user?.displayName || user?.email}!</p>
                    </div>
                    {activeTab === 'products' && (
                       <div className="flex items-center gap-2">
                        <Button onClick={() => loadAllProducts(true, true)} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoadingProducts || isLoadingAnyCredentials || !isAnyStoreConnected}>
                          {isLoadingProducts ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
                          Refresh Product Data
                        </Button>
                      </div>
                    )}
                  </div>

                  {activeTab === 'products' && (
                    <Card className="shadow-lg border-border bg-card">
                      <CardHeader>
                        <CardTitle className="font-headline text-xl text-card-foreground">Your Products</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          View and manage customizable products from your connected stores.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingProducts || isLoadingAnyCredentials ? ( 
                          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Loading products...</p></div>
                        ) : error && !isStoreConnectionIssueError ? (
                           <div className="text-center py-10"><AlertTriangle className="mx-auto h-12 w-12 text-orange-500" /><p className="mt-4 text-orange-600 font-semibold">Error Fetching Products</p><p className="text-sm text-muted-foreground mt-1 px-4">{error}</p></div>
                        ) : !isAnyStoreConnected ? (
                           <div className="text-center py-10"><PlugZap className="mx-auto h-12 w-12 text-orange-500" /><p className="mt-4 text-orange-600 font-semibold">No Store Connected</p><p className="text-sm text-muted-foreground mt-1 px-4">To list products, please connect your WooCommerce or Shopify store via the 'Store Integration' tab.</p><Button variant="link" onClick={() => setActiveTab('storeIntegration')} className="mt-3 text-orange-600 hover:text-orange-700">Connect a Store</Button></div>
                        ) : products.length > 0 ? (
                          <Table>
                            <TableHeader><TableRow><TableHead className="w-[80px]">Image</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Last Edited</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {products.map((product) => (
                                <TableRow key={`${product.source}-${product.id}`}>
                                  <TableCell><div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted/30"><NextImage src={product.imageUrl || `https://placehold.co/150x150.png`} alt={product.name} fill className="object-contain" data-ai-hint={product.aiHint || "product image"}/></div></TableCell>
                                  <TableCell className="font-medium">{product.name}</TableCell>
                                  <TableCell><Badge variant={product.status === 'publish' || product.status === 'active' ? 'default' : 'secondary'} className={product.status === 'publish' || product.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-500/30' : ''}>{product.status.charAt(0).toUpperCase() + product.status.slice(1)}</Badge></TableCell>
                                  <TableCell><Badge variant="outline">{product.source}</Badge></TableCell>
                                  <TableCell>{product.lastEdited}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(`/dashboard/products/${encodeURIComponent(product.id)}/options?source=${product.source}`)}}>
                                          <Settings className="mr-2 h-4 w-4" /> Configure Options
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => router.push(`/customizer?productId=${product.id}`)} >
                                          <Code className="mr-2 h-4 w-4" /> Open in Customizer
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => handleDeleteProduct(product)}>
                                          <Trash2 className="mr-2 h-4 w-4" /> Hide From View
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : ( 
                          <div className="text-center py-10"><PackageIcon className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-4 text-muted-foreground">No products found in your connected stores.</p><p className="text-sm text-muted-foreground mt-1">Click "Refresh Product Data" to try fetching again.</p></div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'storeIntegration' && (
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                       {/* WooCommerce Card */}
                       <Card className="shadow-lg border-border bg-card">
                        <CardHeader>
                          <CardTitle className="font-headline text-xl text-card-foreground">WooCommerce Store</CardTitle>
                          <CardDescription className="text-muted-foreground">Connect using API keys from your WooCommerce store for dashboard features.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoadingWcCredentials ? (<div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading...</p></div>
                          ) : (
                            <form onSubmit={handleSaveWcCredentials} className="space-y-6">
                              <div className="space-y-2"><Label htmlFor="storeUrl" className="flex items-center"><LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Store URL</Label><Input id="storeUrl" type="url" placeholder="https://yourstore.com" value={wcStoreUrl} onChange={(e) => setWcStoreUrl(e.target.value)} required className="bg-input/50" disabled={isSavingWcCredentials} /></div>
                              <div className="space-y-2"><Label htmlFor="consumerKey" className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Consumer Key</Label><Input id="consumerKey" type="text" placeholder="ck_xxxxxxxxxx" value={wcConsumerKey} onChange={(e) => setWcConsumerKey(e.target.value)} required className="bg-input/50" disabled={isSavingWcCredentials}/></div>
                              <div className="space-y-2"><Label htmlFor="consumerSecret" className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Consumer Secret</Label><Input id="consumerSecret" type="password" placeholder="cs_xxxxxxxxxx" value={wcConsumerSecret} onChange={(e) => setWcConsumerSecret(e.target.value)} required className="bg-input/50" disabled={isSavingWcCredentials}/></div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button type="submit" className="w-full sm:w-auto" disabled={isSavingWcCredentials || !wcStoreUrl || !wcConsumerKey || !wcConsumerSecret}>{isSavingWcCredentials ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Credentials</Button>
                                <Button type="button" variant="destructive" onClick={handleClearWcCredentials} className="w-full sm:w-auto" disabled={isSavingWcCredentials || !wcCredentialsExist}>{isSavingWcCredentials ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Clear Credentials</Button>
                              </div>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                      {/* Shopify Card */}
                      <Card className="shadow-lg border-border bg-card">
                        <CardHeader>
                          <CardTitle className="font-headline text-xl text-card-foreground">Shopify Store</CardTitle>
                          <CardDescription className="text-muted-foreground">Connect your Shopify store using the secure one-click OAuth flow.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoadingShopifyCredentials ? (<div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading...</p></div>
                          ) : shopifyCredentialsExist ? (
                            <div className="space-y-4">
                              <ShadCnAlert variant="default" className="bg-green-500/10 border-green-500/30">
                                <FaShopify className="h-5 w-5 text-green-700" />
                                <ShadCnAlertTitle className="text-green-800 font-medium">Shopify Store Connected</ShadCnAlertTitle>
                                <ShadCnAlertDescription className="text-green-700">
                                  Your store <strong>{connectedShopifyStore}</strong> is successfully connected.
                                </ShadCnAlertDescription>
                              </ShadCnAlert>
                              <Button type="button" variant="destructive" onClick={handleClearShopifyCredentials} className="w-full" disabled={isSavingShopifyCredentials}>
                                {isSavingShopifyCredentials ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                Disconnect Shopify Store
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="shopifyStoreName" className="flex items-center"><FaShopify className="mr-2 h-4 w-4 text-muted-foreground" /> Your Shopify Store Name</Label>
                                <Input id="shopifyStoreName" type="text" placeholder="your-store-name" value={shopifyStoreName} onChange={(e) => setShopifyStoreName(e.target.value)} required className="bg-input/50" />
                                <p className="text-xs text-muted-foreground">Just the name, not the full ".myshopify.com" URL.</p>
                              </div>
                              <Button onClick={handleConnectShopify} className="w-full bg-[#588a38] hover:bg-[#4d7830] text-white" disabled={isSavingShopifyCredentials || !shopifyStoreName}>
                                <FaShopify className="mr-2 h-5 w-5" /> Connect to Shopify
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <Card className="shadow-lg border-border bg-card"><CardHeader><CardTitle className="font-headline text-xl text-card-foreground">Settings</CardTitle><CardDescription className="text-muted-foreground">Application settings and preferences.</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">Settings content will go here. (Coming Soon)</p></CardContent></Card>
                  )}

                  {activeTab === 'profile' && (
                     <Card className="shadow-lg border-border bg-card">
                       <CardHeader><CardTitle className="font-headline text-xl text-card-foreground">User Profile</CardTitle><CardDescription className="text-muted-foreground">Manage your account details.</CardDescription></CardHeader>
                      <CardContent className="space-y-4">
                        <div><Label>Email Address</Label><p className="text-sm text-foreground mt-1">{user?.email || "N/A"}</p></div>
                        <div><Label>Customizer Studio User ID</Label>
                          <div className="flex items-center gap-2 mt-1"><Input id="userIdDisplay" value={user?.uid || "N/A"} readOnly className="bg-muted/50 text-sm"/><Button onClick={handleCopyUserId} variant="outline" size="sm" disabled={!user?.uid}>{copiedUserId ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{copiedUserId ? "Copied!" : "Copy ID"}</span></Button></div>
                           <ShadCnAlert variant="default" className="mt-3 bg-primary/5 border-primary/20"><Info className="h-4 w-4 text-primary" /><ShadCnAlertTitle className="text-primary/90 font-medium">User ID for WordPress Plugin</ShadCnAlertTitle><ShadCnAlertDescription className="text-primary/80">Copy this User ID and paste it into the "Customizer Studio User ID" field in your Customizer Studio WordPress plugin settings. This allows the plugin to load your specific product configurations (views, areas, etc.) when embedding the customizer.</ShadCnAlertDescription></ShadCnAlert>
                        </div>
                        <p className="mt-4 text-muted-foreground">More profile options will be available here. (Coming Soon)</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action will hide the product "{productToDelete?.name}" from your dashboard view. It will not be deleted from your store. You can refresh your product data to see it again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className={cn(buttonVariants({variant: "destructive"}))}>Hide Product</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UploadProvider>
  );
}
