
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Image as ImageIconLucide, Edit2, DollarSign, PlugZap, Edit3, Save, Settings, Palette, Ruler, X } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import type { WCCustomProduct, WCVariation } from '@/types/woocommerce';
import type { ShopifyProduct } from '@/types/shopify';
import { Alert as ShadCnAlert, AlertDescription as ShadCnAlertDescription, AlertTitle as ShadCnAlertTitle } from "@/components/ui/alert";
import ProductViewSetup from '@/components/product-options/ProductViewSetup'; 
import { Separator } from '@/components/ui/separator';
import type { ProductOptionsFirestoreData, BoundaryBox, ProductView, ColorGroupOptions, ProductAttributeOptions } from '@/app/actions/productOptionsActions';
import type { NativeProduct } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductOptionsData {
  id: string; 
  name: string; 
  description: string; 
  price: number; 
  type: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify';
  defaultViews: ProductView[]; 
  optionsByColor: Record<string, ColorGroupOptions>; 
  groupingAttributeName: string | null;
  nativeAttributes: ProductAttributeOptions;
  allowCustomization: boolean;
  source: 'woocommerce' | 'shopify' | 'customizer-studio';
}

interface ActiveDragState {
  type: 'move' | 'resize_br' | 'resize_bl' | 'resize_tr' | 'resize_tl';
  boxId: string;
  pointerStartX: number;
  pointerStartY: number;
  initialBoxX: number;
  initialBoxY: number;
  initialBoxWidth: number;
  initialBoxHeight: number;
  containerWidthPx: number;
  containerHeightPx: number;
}

const MIN_BOX_SIZE_PERCENT = 5; 
const MAX_PRODUCT_VIEWS = 4; 

async function loadProductOptionsFromFirestoreClient(userId: string, productId: string): Promise<{ options?: ProductOptionsFirestoreData; error?: string }> {
  if (!userId || !productId || !db) {
    return { error: "User, Product ID, or DB service is missing." };
  }
  try {
    const docRef = doc(db, 'userProductOptions', userId, 'products', productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { options: docSnap.data() as ProductOptionsFirestoreData };
    }
    return { options: undefined };
  } catch (error: any) {
    let errorMessage = `Failed to load options: ${error.message}`;
    if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firestore security rules to allow reads on 'userProductOptions' for authenticated users.";
    }
    console.error(`Error loading product options from Firestore for user ${userId}, product ${productId}:`, error);
    return { error: errorMessage };
  }
}

export default function ProductOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFromUrl = decodeURIComponent(params.productId as string);
  const source = searchParams.get('source') as 'woocommerce' | 'shopify' | 'customizer-studio' || 'woocommerce';
  const firestoreDocId = productIdFromUrl.split('/').pop() || productIdFromUrl;

  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();

  const [productOptions, setProductOptions] = useState<ProductOptionsData | null>(null);
  const [activeViewIdForSetup, setActiveViewIdForSetup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [credentialsExist, setCredentialsExist] = useState(true); // Assume true for native products

  const [variations, setVariations] = useState<WCVariation[]>([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  const [variationsError, setVariationsError] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [selectedBoundaryBoxId, setSelectedBoundaryBoxId] = useState<string | null>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const dragUpdateRef = useRef(0);

  const [isDeleteViewDialogOpen, setIsDeleteViewDialogOpen] = useState(false);
  const [viewIdToDelete, setViewIdToDelete] = useState<string | null>(null);
  
  const [groupedVariations, setGroupedVariations] = useState<Record<string, WCVariation[]> | null>(null);
  const [editingImagesForColor, setEditingImagesForColor] = useState<string | null>(null);
  
  const [colorInputValue, setColorInputValue] = useState("");
  const [sizeInputValue, setSizeInputValue] = useState("");


  const fetchAndSetProductData = useCallback(async (isRefresh = false) => {
    if (!user?.uid || !productIdFromUrl || !db) { 
        setError("User or Product ID invalid, or DB not ready.");
        if (isRefresh) setIsRefreshing(false); else setIsLoading(false);
        return;
    }
    
    if (isRefresh) setIsRefreshing(true); else setIsLoading(true); 
    setError(null); 
    setVariationsError(null);
    
    try {
      let baseProduct: { id: string; name: string; description: string; price: number; type: any; imageUrl: string; imageAlt: string; };
      
      if (source === 'shopify') {
          const credDocRef = doc(db, 'userShopifyCredentials', user.uid);
          const credDocSnap = await getDoc(credDocRef);
          if (!credDocSnap.exists()) {
            setCredentialsExist(false);
            throw new Error("Shopify store not connected. Please go to Dashboard > 'Store Integration'.");
          }
          setCredentialsExist(true);
          const creds = credDocSnap.data() as UserShopifyCredentials;
          const { product, error } = await fetchShopifyProductById(creds.shop, creds.accessToken, productIdFromUrl);
          if (error || !product) throw new Error(error || `Shopify product ${productIdFromUrl} not found.`);
          baseProduct = {
            id: product.id, name: product.title,
            description: product.description || 'No description available.',
            price: parseFloat(product.priceRangeV2?.minVariantPrice.amount || '0'),
            type: 'shopify',
            imageUrl: product.featuredImage?.url || 'https://placehold.co/600x600.png',
            imageAlt: product.featuredImage?.altText || product.title,
          };
      } else if (source === 'woocommerce') { 
          const credDocRef = doc(db, 'userWooCommerceCredentials', user.uid);
          const credDocSnap = await getDoc(credDocRef);
           if (!credDocSnap.exists()) {
            setCredentialsExist(false);
            throw new Error("WooCommerce store not connected. Please go to Dashboard > 'Store Integration'.");
          }
          setCredentialsExist(true);
          const credsData = credDocSnap.data() as UserWooCommerceCredentials;
          const userCredentialsToUse: WooCommerceCredentials = {
            storeUrl: credsData.storeUrl,
            consumerKey: credsData.consumerKey,
            consumerSecret: credsData.consumerSecret,
          };
          const { product, error } = await fetchWooCommerceProductById(firestoreDocId, userCredentialsToUse);
          if (error || !product) throw new Error(error || `WooCommerce product ${firestoreDocId} not found.`);
          baseProduct = {
            id: product.id.toString(), name: product.name,
            description: product.description?.replace(/<[^>]+>/g, '') || product.short_description?.replace(/<[^>]+>/g, '') || 'No description.',
            price: parseFloat(product.price) || 0,
            type: product.type,
            imageUrl: product.images?.[0]?.src || 'https://placehold.co/600x600.png',
            imageAlt: product.images?.[0]?.alt || product.name,
          };

          if (product.type === 'variable') {
            setIsLoadingVariations(true);
            try {
                const { variations: fetchedVars, error: varsError } = await fetchWooCommerceProductVariations(firestoreDocId, userCredentialsToUse);
                if (varsError) setVariationsError(varsError);
                else if (fetchedVars?.length) {
                  setVariations(fetchedVars);
                  const firstVarAttributes = fetchedVars[0].attributes;
                  const colorAttr = firstVarAttributes.find(attr => attr.name.toLowerCase() === 'color' || attr.name.toLowerCase() === 'colour');
                  let identifiedGroupingAttr = colorAttr ? colorAttr.name : (firstVarAttributes.find(attr => !['size', 'talla'].includes(attr.name.toLowerCase()))?.name || firstVarAttributes[0]?.name);
                  if (identifiedGroupingAttr) {
                      const groups: Record<string, WCVariation[]> = {};
                      fetchedVars.forEach(v => {
                          const groupKey = v.attributes.find(a => a.name === identifiedGroupingAttr)?.option || 'Other';
                          if (!groups[groupKey]) groups[groupKey] = [];
                          groups[groupKey].push(v);
                      });
                      setGroupedVariations(groups);
                  }
                }
            } finally { setIsLoadingVariations(false); }
          }
      } else { // source === 'customizer-studio'
        const productDocRef = doc(db, `users/${user.uid}/products`, firestoreDocId);
        const productDocSnap = await getDoc(productDocRef);
        if (!productDocSnap.exists()) {
          throw new Error(`Native product with ID ${firestoreDocId} not found.`);
        }
        const nativeProduct = productDocSnap.data() as NativeProduct;
        baseProduct = {
          id: firestoreDocId,
          name: nativeProduct.name,
          description: nativeProduct.description || 'No description provided.',
          price: 0, // Native products price is managed in options
          type: 'simple',
          imageUrl: 'https://placehold.co/600x600.png', // Placeholder, to be configured in options
          imageAlt: nativeProduct.name,
        };
      }

      const { options: firestoreOptions, error: firestoreError } = await loadProductOptionsFromFirestoreClient(user.uid, firestoreDocId);
      if (firestoreError) toast({ title: "Settings Load Issue", description: `Could not load saved settings: ${firestoreError}`, variant: "default" });

      const defaultPlaceholder = "https://placehold.co/600x600/eee/ccc.png?text=";
      const initialDefaultViews: ProductView[] = [
        { id: crypto.randomUUID(), name: "Front", imageUrl: baseProduct.imageUrl || `${defaultPlaceholder}Front`, aiHint: baseProduct.imageAlt.split(" ").slice(0,2).join(" ") || "front view", boundaryBoxes: [], price: 0 },
        { id: crypto.randomUUID(), name: "Back", imageUrl: `${defaultPlaceholder}Back`, aiHint: "back view", boundaryBoxes: [], price: 0 },
        { id: crypto.randomUUID(), name: "Left Side", imageUrl: `${defaultPlaceholder}Left`, aiHint: "left side view", boundaryBoxes: [], price: 0 },
        { id: crypto.randomUUID(), name: "Right Side", imageUrl: `${defaultPlaceholder}Right`, aiHint: "right side view", boundaryBoxes: [], price: 0 },
      ];
      
      const finalDefaultViews = firestoreOptions?.defaultViews?.length ? firestoreOptions.defaultViews.map((v: any) => ({ ...v, price: v.price ?? 0 })) : initialDefaultViews;
      
      setProductOptions({
        ...baseProduct,
        source,
        price: firestoreOptions?.price ?? baseProduct.price,
        type: firestoreOptions?.type ?? baseProduct.type,
        defaultViews: finalDefaultViews,
        optionsByColor: firestoreOptions?.optionsByColor || {},
        groupingAttributeName: firestoreOptions?.groupingAttributeName || (source === 'customizer-studio' ? 'Color' : null),
        nativeAttributes: firestoreOptions?.nativeAttributes || { colors: [], sizes: [] },
        allowCustomization: firestoreOptions?.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true,
      });

      setActiveViewIdForSetup(finalDefaultViews[0]?.id || null);
      setSelectedBoundaryBoxId(null);
      setHasUnsavedChanges(isRefresh ? hasUnsavedChanges : false); 
      if (isRefresh) toast({ title: "Product Data Refreshed", description: "Details updated from your store."});

    } catch (e: any) {
        console.error("Error in fetchAndSetProductData:", e.message);
        setError(e.message);
        setProductOptions(null);
    } finally {
        if (isRefresh) setIsRefreshing(false);
        else setIsLoading(false); 
    }
  }, [productIdFromUrl, firestoreDocId, source, user?.uid, toast, hasUnsavedChanges]); 

  useEffect(() => {
    let didCancel = false;
    if (authIsLoading) return;
    if (!user?.uid) { if (!didCancel) { setError("User not authenticated."); setIsLoading(false); } return; }
    if (!productIdFromUrl) { if (!didCancel) { setError("Product ID is missing."); setIsLoading(false); } return; }
    if (!productOptions && !error) { fetchAndSetProductData(false); } 
    else { if (!didCancel) setIsLoading(false); }
    return () => { didCancel = true; };
  }, [authIsLoading, user?.uid, productIdFromUrl, productOptions, error, fetchAndSetProductData]);


  const handleRefreshData = () => {
    if (source === 'customizer-studio') {
        toast({ title: "Not applicable", description: "Native products do not need to be refreshed.", variant: "default" });
        return;
    }
    if (!authIsLoading && user && productIdFromUrl) {
        fetchAndSetProductData(true);
    } else {
        toast({ title: "Cannot Refresh", description: "User or product ID missing.", variant: "destructive"});
    }
  };

  const getPointerCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handleInteractionStart = useCallback((
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    boxId: string,
    type: ActiveDragState['type']
  ) => {
    e.preventDefault(); e.stopPropagation();
    if (!productOptions || !activeViewIdForSetup) return;
    const currentView = productOptions.defaultViews.find(v => v.id === activeViewIdForSetup);
    const currentBox = currentView?.boundaryBoxes.find(b => b.id === boxId);
    if (!currentBox || !imageWrapperRef.current) return;

    setSelectedBoundaryBoxId(boxId);
    const pointerCoords = getPointerCoords(e);
    const containerRect = imageWrapperRef.current.getBoundingClientRect();

    setActiveDrag({
      type, boxId, pointerStartX: pointerCoords.x, pointerStartY: pointerCoords.y,
      initialBoxX: currentBox.x, initialBoxY: currentBox.y,
      initialBoxWidth: currentBox.width, initialBoxHeight: currentBox.height,
      containerWidthPx: containerRect.width, containerHeightPx: containerRect.height,
    });
  }, [productOptions, activeViewIdForSetup]);

  const handleDragging = useCallback((e: MouseEvent | TouchEvent) => {
    if (!activeDrag || !productOptions || !activeViewIdForSetup || !imageWrapperRef.current) return;
    e.preventDefault();
    cancelAnimationFrame(dragUpdateRef.current);
    dragUpdateRef.current = requestAnimationFrame(() => {
      const pointerCoords = getPointerCoords(e);
      const deltaXpx = pointerCoords.x - activeDrag.pointerStartX;
      const deltaYpx = pointerCoords.y - activeDrag.pointerStartY;
      let deltaXPercent = (deltaXpx / activeDrag.containerWidthPx) * 100;
      let deltaYPercent = (deltaYpx / activeDrag.containerHeightPx) * 100;
      let newX = activeDrag.initialBoxX, newY = activeDrag.initialBoxY;
      let newWidth = activeDrag.initialBoxWidth, newHeight = activeDrag.initialBoxHeight;

      if (activeDrag.type === 'move') { newX += deltaXPercent; newY += deltaYPercent; }
      else {
          const originalProposedWidth = newWidth, originalProposedHeight = newHeight;
          if (activeDrag.type === 'resize_br') { newWidth += deltaXPercent; newHeight += deltaYPercent; }
          else if (activeDrag.type === 'resize_bl') { newX += deltaXPercent; newWidth -= deltaXPercent; newHeight += deltaYPercent; }
          else if (activeDrag.type === 'resize_tr') { newY += deltaYPercent; newWidth += deltaXPercent; newHeight -= deltaYPercent; }
          else if (activeDrag.type === 'resize_tl') { newX += deltaXPercent; newY += deltaYPercent; newWidth -= deltaXPercent; newHeight -= deltaYPercent; }
          newWidth = Math.max(MIN_BOX_SIZE_PERCENT, newWidth); newHeight = Math.max(MIN_BOX_SIZE_PERCENT, newHeight);
          if (activeDrag.type === 'resize_tl') { if (newWidth !== originalProposedWidth) newX = activeDrag.initialBoxX + activeDrag.initialBoxWidth - newWidth; if (newHeight !== originalProposedHeight) newY = activeDrag.initialBoxY + activeDrag.initialBoxHeight - newHeight; }
          else if (activeDrag.type === 'resize_tr') { if (newHeight !== originalProposedHeight) newY = activeDrag.initialBoxY + activeDrag.initialBoxHeight - newHeight; }
          else if (activeDrag.type === 'resize_bl') { if (newWidth !== originalProposedWidth) newX = activeDrag.initialBoxX + activeDrag.initialBoxWidth - newWidth; }
      }
      newX = Math.max(0, Math.min(newX, 100 - MIN_BOX_SIZE_PERCENT)); newWidth = Math.min(newWidth, 100 - newX); newWidth = Math.max(MIN_BOX_SIZE_PERCENT, newWidth); newX = Math.max(0, Math.min(newX, 100 - newWidth));
      newY = Math.max(0, Math.min(newY, 100 - MIN_BOX_SIZE_PERCENT)); newHeight = Math.min(newHeight, 100 - newY); newHeight = Math.max(MIN_BOX_SIZE_PERCENT, newHeight); newY = Math.max(0, Math.min(newY, 100 - newHeight));
      if (isNaN(newX) || isNaN(newY) || isNaN(newWidth) || isNaN(newHeight)) return;

      setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(view => view.id === activeViewIdForSetup ? { ...view, boundaryBoxes: view.boundaryBoxes.map(b => b.id === activeDrag.boxId ? { ...b, x: newX, y: newY, width: newWidth, height: newHeight } : b)} : view)} : null);
      setHasUnsavedChanges(true);
    });
  }, [activeDrag, productOptions, activeViewIdForSetup]);

  const handleInteractionEnd = useCallback(() => {
    cancelAnimationFrame(dragUpdateRef.current);
    setActiveDrag(null);
  }, []);

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('mousemove', handleDragging); window.addEventListener('touchmove', handleDragging, { passive: false });
      window.addEventListener('mouseup', handleInteractionEnd); window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragging); window.removeEventListener('touchmove', handleDragging);
      window.removeEventListener('mouseup', handleInteractionEnd); window.removeEventListener('touchend', handleInteractionEnd);
      cancelAnimationFrame(dragUpdateRef.current);
    };
  }, [activeDrag, handleDragging, handleInteractionEnd]);

  const handleSaveChanges = async () => {
    if (!productOptions || !user?.uid || !db) {
      toast({ title: "Error", description: "Product data, user session, or DB is missing. Cannot save.", variant: "destructive" });
      return;
    }
    if (!firestoreDocId) {
      toast({ title: "Error", description: "Product ID is missing from options data. Cannot save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const dataToSave: Omit<ProductOptionsFirestoreData, 'createdAt' | 'lastSaved'> & { lastSaved: any; createdAt?: any } = {
      id: productOptions.id, 
      name: productOptions.name,
      description: productOptions.description,
      price: productOptions.price,
      type: productOptions.type === 'shopify' ? 'simple' : productOptions.type,
      defaultViews: productOptions.defaultViews,
      optionsByColor: productOptions.optionsByColor,
      groupingAttributeName: productOptions.groupingAttributeName,
      nativeAttributes: productOptions.nativeAttributes,
      allowCustomization: productOptions.allowCustomization,
      lastSaved: serverTimestamp(),
    };

    try {
      const docRef = doc(db, 'userProductOptions', user.uid, 'products', firestoreDocId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        dataToSave.createdAt = serverTimestamp();
      }
      await setDoc(docRef, dataToSave, { merge: true });

      if (source === 'customizer-studio') {
        const productBaseRef = doc(db, `users/${user.uid}/products`, firestoreDocId);
        await setDoc(productBaseRef, { name: productOptions.name, description: productOptions.description, lastModified: serverTimestamp() }, { merge: true });
      }
      
      toast({ title: "Saved", description: "Custom views, areas, and variation selections saved to your account." });
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving product options to Firestore (client-side):', error);
      let description = `Failed to save options: ${error.message || "Unknown Firestore error"}`;
      if (error.code === 'permission-denied') {
          description = "Save failed due to permissions. Please check your Firestore security rules to allow writes on 'userProductOptions' for authenticated users.";
      }
      toast({ title: "Save Error", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInCustomizer = () => {
    if (!productOptions || hasUnsavedChanges) {
      toast({ title: "Save Changes", description: "Please save your changes before opening in customizer.", variant: "default"});
      return;
    }
    if (!productOptions.allowCustomization) {
      toast({ title: "Customization Disabled", description: "This product is currently marked as 'Do Not Customize'. Enable customization to open in the customizer.", variant: "default"});
      return;
    }
    router.push(`/customizer?productId=${productOptions.id}&source=${productOptions.source}`);
  };

  const handleSelectView = (viewId: string) => { 
    setActiveViewIdForSetup(viewId); setSelectedBoundaryBoxId(null);
  };

  const handleAddNewView = () => { 
    if (!productOptions) return;
    if (productOptions.defaultViews.length >= MAX_PRODUCT_VIEWS) {
      toast({ title: "Limit Reached", description: `Max ${MAX_PRODUCT_VIEWS} views per product.`, variant: "default" });
      return;
    }
    const newView: ProductView = {
      id: crypto.randomUUID(), name: `View ${productOptions.defaultViews.length + 1}`,
      imageUrl: 'https://placehold.co/600x600/eee/ccc.png?text=New+View', aiHint: 'product view',
      boundaryBoxes: [], price: 0, 
    };
    setProductOptions(prev => prev ? { ...prev, defaultViews: [...prev.defaultViews, newView] } : null);
    setActiveViewIdForSetup(newView.id); setSelectedBoundaryBoxId(null); setHasUnsavedChanges(true);
  };
  
  const handleViewDetailChange = (viewId: string, field: keyof Pick<ProductView, 'name' | 'imageUrl' | 'aiHint' | 'price'>, value: string | number) => { 
    if (!productOptions) return;
    setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(v => {
      if (v.id === viewId) {
        if (field === 'price') {
          const newPrice = typeof value === 'number' ? value : parseFloat(value.toString());
          return { ...v, price: isNaN(newPrice) ? (v.price ?? 0) : Math.max(0, newPrice) };
        }
        return { ...v, [field]: value };
      }
      return v;
    })} : null);
    setHasUnsavedChanges(true);
  };

  const handleDeleteView = (viewId: string) => {
    if (!productOptions) return;
    if (productOptions.defaultViews.length <= 1) {
      toast({ title: "Cannot Delete", description: "At least one view must remain.", variant: "default" });
      return;
    }
    setViewIdToDelete(viewId);
    setIsDeleteViewDialogOpen(true);
  };

  const confirmDeleteView = () => { 
    if (!productOptions || !viewIdToDelete) return;
    const updatedViews = productOptions.defaultViews.filter(v => v.id !== viewIdToDelete);
    
    const updatedOptionsByColor = { ...productOptions.optionsByColor };
    Object.keys(updatedOptionsByColor).forEach(colorKey => {
      if (updatedOptionsByColor[colorKey].variantViewImages[viewIdToDelete]) {
        delete updatedOptionsByColor[colorKey].variantViewImages[viewIdToDelete];
      }
    });

    setProductOptions(prev => prev ? { ...prev, defaultViews: updatedViews, optionsByColor: updatedOptionsByColor } : null);
    if (activeViewIdForSetup === viewIdToDelete) {
      setActiveViewIdForSetup(updatedViews[0]?.id || null); setSelectedBoundaryBoxId(null);
    }
    setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);
    toast({title: "View Deleted"}); setHasUnsavedChanges(true);
  };

  const handleAddBoundaryBox = () => { 
    if (!productOptions || !activeViewIdForSetup) return;
    const currentView = productOptions.defaultViews.find(v => v.id === activeViewIdForSetup);
    if (!currentView || currentView.boundaryBoxes.length >= 3) {
      toast({ title: "Limit Reached", description: "Max 3 areas per view.", variant: "destructive" });
      return;
    }
    const newBox: BoundaryBox = {
      id: crypto.randomUUID(), name: `Area ${currentView.boundaryBoxes.length + 1}`,
      x: 10 + currentView.boundaryBoxes.length * 5, y: 10 + currentView.boundaryBoxes.length * 5,
      width: 30, height: 20,
    };
    setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(v => v.id === activeViewIdForSetup ? { ...v, boundaryBoxes: [...v.boundaryBoxes, newBox] } : v)} : null);
    setSelectedBoundaryBoxId(newBox.id); setHasUnsavedChanges(true);
  };

  const handleRemoveBoundaryBox = (boxId: string) => { 
    if (!productOptions || !activeViewIdForSetup) return;
    setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(v => v.id === activeViewIdForSetup ? { ...v, boundaryBoxes: v.boundaryBoxes.filter(b => b.id !== boxId) } : v)} : null);
    if (selectedBoundaryBoxId === boxId) setSelectedBoundaryBoxId(null);
    setHasUnsavedChanges(true);
  };

  const handleBoundaryBoxNameChange = (boxId: string, newName: string) => { 
    if (!productOptions || !activeViewIdForSetup) return;
    setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(view => view.id === activeViewIdForSetup ? { ...view, boundaryBoxes: view.boundaryBoxes.map(box => box.id === boxId ? { ...box, name: newName } : box) } : view)} : null);
    setHasUnsavedChanges(true);
  };

  const handleBoundaryBoxPropertyChange = (boxId: string, property: keyof Pick<BoundaryBox, 'x' | 'y' | 'width' | 'height'>, value: string) => { 
    if (!productOptions || !activeViewIdForSetup) return;
    setProductOptions(prev => {
      if (!prev || !activeViewIdForSetup) return null;
      return {
        ...prev, defaultViews: prev.defaultViews.map(view => {
          if (view.id === activeViewIdForSetup) {
            const newBoxes = view.boundaryBoxes.map(box => {
              if (box.id === boxId) {
                let newBox = { ...box }; const parsedValue = parseFloat(value);
                if (isNaN(parsedValue)) return box;
                if (property === 'x') newBox.x = parsedValue; else if (property === 'y') newBox.y = parsedValue;
                else if (property === 'width') newBox.width = parsedValue; else if (property === 'height') newBox.height = parsedValue;
                let { x: tempX, y: tempY, width: tempW, height: tempH } = newBox;
                tempW = Math.max(MIN_BOX_SIZE_PERCENT, tempW); tempH = Math.max(MIN_BOX_SIZE_PERCENT, tempH);
                tempX = Math.max(0, Math.min(tempX, 100 - tempW)); tempY = Math.max(0, Math.min(tempY, 100 - tempH));
                tempW = Math.min(tempW, 100 - tempX); tempH = Math.min(tempH, 100 - tempY);
                newBox = { ...newBox, x: tempX, y: tempY, width: tempW, height: tempH };
                if (isNaN(newBox.x)) newBox.x = 0; if (isNaN(newBox.y)) newBox.y = 0;
                if (isNaN(newBox.width)) newBox.width = MIN_BOX_SIZE_PERCENT; if (isNaN(newBox.height)) newBox.height = MIN_BOX_SIZE_PERCENT;
                return newBox;
              } return box;
            }); return { ...view, boundaryBoxes: newBoxes };
          } return view;
        })
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSelectAllVariationsInGroup = (groupKey: string, checked: boolean) => {
    if (!productOptions) return;
  
    setProductOptions(prev => {
      if (!prev) return null;
      const updatedOptionsByColor = { ...prev.optionsByColor };
  
      if (checked) {
        // For native products, there's no list of variation IDs. We can use a placeholder.
        const mockVariationIds = prev.nativeAttributes?.sizes.map(size => `${groupKey}-${size}`) || [];
        updatedOptionsByColor[groupKey] = {
          selectedVariationIds: mockVariationIds.length > 0 ? mockVariationIds : [groupKey], // Use groupKey as ID if no sizes
          variantViewImages: updatedOptionsByColor[groupKey]?.variantViewImages || {},
        };
      } else {
        // If unchecked, clear the selected IDs but keep the images.
        if (updatedOptionsByColor[groupKey]) {
          updatedOptionsByColor[groupKey].selectedVariationIds = [];
        }
      }
      return { ...prev, optionsByColor: updatedOptionsByColor };
    });
    setHasUnsavedChanges(true);
  };
  
  const handleVariantViewImageChange = (
    colorKey: string,
    viewId: string,
    field: 'imageUrl' | 'aiHint',
    value: string
  ) => {
    setProductOptions(prev => {
      if (!prev) return null; 

      const baseOptionsByColor = typeof prev.optionsByColor === 'object' && prev.optionsByColor !== null
                                 ? prev.optionsByColor
                                 : {};
      const updatedOptionsByColor = JSON.parse(JSON.stringify(baseOptionsByColor));

      if (!updatedOptionsByColor[colorKey]) updatedOptionsByColor[colorKey] = { selectedVariationIds: [], variantViewImages: {} };
      if (!updatedOptionsByColor[colorKey].variantViewImages) updatedOptionsByColor[colorKey].variantViewImages = {};
      if (!updatedOptionsByColor[colorKey].variantViewImages[viewId]) updatedOptionsByColor[colorKey].variantViewImages[viewId] = { imageUrl: '', aiHint: '' };
      
      updatedOptionsByColor[colorKey].variantViewImages[viewId][field] = value;

      if (field === 'imageUrl' && !value && updatedOptionsByColor[colorKey].variantViewImages[viewId]) {
          updatedOptionsByColor[colorKey].variantViewImages[viewId].aiHint = '';
      }
      
      return { ...prev, optionsByColor: updatedOptionsByColor };
    });
    setHasUnsavedChanges(true);
  };
  
  const handleAddAttribute = (type: 'colors' | 'sizes') => {
    const value = (type === 'colors' ? colorInputValue : sizeInputValue).trim();
    if (!value) return;

    setProductOptions(prev => {
      if (!prev) return null;
      const updatedAttributes = { ...prev.nativeAttributes };
      if (!updatedAttributes[type].includes(value)) {
        updatedAttributes[type] = [...updatedAttributes[type], value];
      }
      return { ...prev, nativeAttributes: updatedAttributes };
    });

    if (type === 'colors') setColorInputValue("");
    else setSizeInputValue("");
    setHasUnsavedChanges(true);
  };

  const handleRemoveAttribute = (type: 'colors' | 'sizes', value: string) => {
    setProductOptions(prev => {
      if (!prev) return null;
      const updatedAttributes = { ...prev.nativeAttributes };
      updatedAttributes[type] = updatedAttributes[type].filter(item => item !== value);
      
      if (type === 'colors') {
        const updatedOptionsByColor = { ...prev.optionsByColor };
        delete updatedOptionsByColor[value];
        return { ...prev, nativeAttributes: updatedAttributes, optionsByColor: updatedOptionsByColor };
      }
      
      return { ...prev, nativeAttributes: updatedAttributes };
    });
    setHasUnsavedChanges(true);
  };


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="ml-3">Loading product options...</p></div>;
  }
  
  if (error) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Product Options</h2>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        {(error.includes("store not connected") || error.includes("credentials")) && (
           <Button variant="link" asChild>
              <Link href="/dashboard"><PlugZap className="mr-2 h-4 w-4" />Go to Dashboard to Connect</Link>
          </Button>
        )}
        <Button variant="outline" asChild className="mt-2">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>
      </div>
    );
  }
  
  if (!productOptions) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Product Data Not Available</h2>
            <p className="text-muted-foreground text-center mb-6">Could not load the specific options for this product. It might be missing or there was an issue fetching it.</p>
            <Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
        </div>
    );
  }

  const currentView = productOptions.defaultViews.find(v => v.id === activeViewIdForSetup);
  
  const renderWooCommerceVariations = () => {
    if (isLoadingVariations || (isRefreshing && isLoading)) return <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading variations...</p></div>;
    if (variationsError) return <div className="text-center py-6"><AlertTriangle className="mx-auto h-10 w-10 text-destructive" /><p className="mt-3 text-destructive font-semibold">Error loading variations</p><p className="text-sm text-muted-foreground mt-1">{variationsError}</p></div>;
    if (!groupedVariations || Object.keys(groupedVariations).length === 0) return <div className="text-center py-6"><LayersIcon className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 text-muted-foreground">This product has no variations, or they could not be grouped automatically.</p></div>;
    
    const allVariationsSelectedOverall = variations.length > 0 && 
        Object.entries(groupedVariations).every(([groupKey, variationsInGroup]) => {
        const groupOpts = productOptions.optionsByColor[groupKey];
        return groupOpts && variationsInGroup.every(v => groupOpts.selectedVariationIds.includes(v.id.toString()));
    });

    const someVariationsSelectedOverall = Object.values(productOptions.optionsByColor).some(group => group.selectedVariationIds.length > 0) && !allVariationsSelectedOverall;

    return (<>
        <div className="mb-4 flex items-center space-x-2 p-2 border-b">
            <Checkbox id="selectAllVariationGroups"
            checked={allVariationsSelectedOverall}
            onCheckedChange={(cs) => {
                const isChecked = cs === 'indeterminate' ? true : cs as boolean;
                Object.keys(groupedVariations).forEach(groupKey => handleSelectAllVariationsInGroup(groupKey, isChecked));
            }}
            data-state={someVariationsSelectedOverall ? 'indeterminate' : (allVariationsSelectedOverall ? 'checked' : 'unchecked')} />
            <Label htmlFor="selectAllVariationGroups" className="text-sm font-medium">{allVariationsSelectedOverall ? "Deselect All Color Groups" : "Select All Color Groups"}</Label>
        </div>
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {Object.entries(groupedVariations).map(([groupKey, variationsInGroup]) => {
            const groupOptions = productOptions.optionsByColor[groupKey] || { selectedVariationIds: [], variantViewImages: {} };
            const allInGroupSelected = variationsInGroup.every(v => groupOptions.selectedVariationIds.includes(v.id.toString()));
            
            const representativeImage = variationsInGroup[0]?.image?.src || currentView?.imageUrl || 'https://placehold.co/100x100.png';
            const stockStatusSummary = variationsInGroup.some(v => v.stock_status === 'outofstock') ? 'Some Out of Stock' : (variationsInGroup.every(v => v.stock_status === 'instock') ? 'All In Stock' : 'Mixed Stock');
            
            return (
            <div key={groupKey} className={cn("p-4 border rounded-md flex flex-col gap-4 transition-colors", allInGroupSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/30 hover:bg-muted/50")}>
                <div className="flex items-start sm:items-center gap-4">
                <Checkbox id={`selectGroup-${groupKey.replace(/\s+/g, '-')}`} checked={allInGroupSelected} onCheckedChange={(cs) => handleSelectAllVariationsInGroup(groupKey, cs as boolean)} className="mt-1 flex-shrink-0" />
                <div className="relative h-20 w-20 rounded-md overflow-hidden border bg-card flex-shrink-0">
                    <img src={representativeImage} alt={groupKey} className="object-contain w-full h-full" />
                </div>
                <div className="flex-grow">
                    <h4 className="text-md font-semibold text-foreground mb-1">{productOptions.groupingAttributeName}: <span className="text-primary">{groupKey}</span></h4>
                    <p className="text-xs text-muted-foreground">Stock: {stockStatusSummary}</p>
                    <p className="text-xs text-muted-foreground">Variations (SKUs) in group: {variationsInGroup.length}</p>
                </div>
                </div>
                <div>
                <Button variant="outline" size="sm" onClick={() => setEditingImagesForColor(editingImagesForColor === groupKey ? null : groupKey)} className="w-full sm:w-auto hover:bg-accent/20">
                    <Edit3 className="mr-2 h-4 w-4" /> {editingImagesForColor === groupKey ? "Done Editing" : `Manage Images for ${groupKey}`}
                </Button>
                {editingImagesForColor === groupKey && (
                    <div className="mt-4 space-y-3 p-3 border rounded-md bg-card">
                    {productOptions.defaultViews.map(defaultView => (
                    <div key={defaultView.id} className="p-2 border-b last:border-b-0">
                        <Label htmlFor={`variant-view-url-${groupKey}-${defaultView.id}`} className="text-xs font-medium text-muted-foreground">{defaultView.name} Image URL</Label>
                        <Input id={`variant-view-url-${groupKey}-${defaultView.id}`} value={productOptions.optionsByColor[groupKey]?.variantViewImages[defaultView.id]?.imageUrl || ''} onChange={(e) => handleVariantViewImageChange(groupKey, defaultView.id, 'imageUrl', e.target.value)} className="h-8 text-xs mt-1 bg-background" placeholder={`Optional override for ${defaultView.name}`} />
                    </div>))}
                    </div>
                )}
                </div>
            </div>);
        })}
        </div>
    </>);
  };

  const renderNativeVariations = () => {
    const { colors = [], sizes = [] } = productOptions.nativeAttributes || {};
    if (colors.length === 0) return <div className="text-center py-6"><Palette className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 text-muted-foreground">Add colors in 'Product Attributes' to create variations.</p></div>;

    const allColorsSelected = colors.every(color => productOptions.optionsByColor[color]?.selectedVariationIds?.length > 0);
    const someColorsSelected = colors.some(color => productOptions.optionsByColor[color]?.selectedVariationIds?.length > 0) && !allColorsSelected;

    return (<>
        <div className="mb-4 flex items-center space-x-2 p-2 border-b">
            <Checkbox id="selectAllNativeColors"
            checked={allColorsSelected}
            onCheckedChange={(cs) => {
                const isChecked = cs === 'indeterminate' ? true : cs as boolean;
                colors.forEach(color => handleSelectAllVariationsInGroup(color, isChecked));
            }}
            data-state={someColorsSelected ? 'indeterminate' : 'checked'} />
            <Label htmlFor="selectAllNativeColors" className="text-sm font-medium">{allColorsSelected ? "Deselect All Colors" : "Select All Colors"}</Label>
        </div>
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {colors.map(color => {
            const isSelected = productOptions.optionsByColor[color]?.selectedVariationIds?.length > 0;
            return (
            <div key={color} className={cn("p-4 border rounded-md flex flex-col gap-4 transition-colors", isSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/30 hover:bg-muted/50")}>
                <div className="flex items-start sm:items-center gap-4">
                    <Checkbox id={`selectGroup-${color}`} checked={isSelected} onCheckedChange={(cs) => handleSelectAllVariationsInGroup(color, cs as boolean)} className="mt-1 flex-shrink-0" />
                    <div className="flex-grow">
                        <h4 className="text-md font-semibold text-foreground mb-1">Color: <span className="text-primary">{color}</span></h4>
                        {sizes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                            {sizes.map(size => <Badge key={size} variant="secondary" className="text-xs">{size}</Badge>)}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <Button variant="outline" size="sm" onClick={() => setEditingImagesForColor(editingImagesForColor === color ? null : color)} className="w-full sm:w-auto hover:bg-accent/20">
                        <Edit3 className="mr-2 h-4 w-4" /> {editingImagesForColor === color ? "Done" : `Manage Images for ${color}`}
                    </Button>
                    {editingImagesForColor === color && (
                        <div className="mt-4 space-y-3 p-3 border rounded-md bg-card">
                        {productOptions.defaultViews.map(defaultView => (
                        <div key={defaultView.id} className="p-2 border-b last:border-b-0">
                            <Label htmlFor={`variant-view-url-${color}-${defaultView.id}`} className="text-xs font-medium text-muted-foreground">{defaultView.name} Image URL</Label>
                            <Input id={`variant-view-url-${color}-${defaultView.id}`} value={productOptions.optionsByColor[color]?.variantViewImages[defaultView.id]?.imageUrl || ''} onChange={(e) => handleVariantViewImageChange(color, defaultView.id, 'imageUrl', e.target.value)} className="h-8 text-xs mt-1 bg-background" placeholder={`Optional override for ${defaultView.name}`} />
                        </div>))}
                        </div>
                    )}
                </div>
            </div>);
        })}
        </div>
    </>);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" asChild className="hover:bg-accent hover:text-accent-foreground">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>
        {source !== 'customizer-studio' && (
            <Button variant="outline" onClick={handleRefreshData} disabled={isRefreshing || isLoading} className="hover:bg-accent hover:text-accent-foreground">
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Refresh Product Data
            </Button>
        )}
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-foreground">Product Options</h1>
      <div className="text-muted-foreground mb-8">Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span> (ID: {firestoreDocId})</div>
      {!credentialsExist && (
         <ShadCnAlert variant="destructive" className="mb-6">
            <PlugZap className="h-4 w-4" />
            <ShadCnAlertTitle>Store Not Connected</ShadCnAlertTitle>
            <ShadCnAlertDescription>
            Your {source} store credentials are not configured. Product data cannot be fetched. 
            Please go to <Link href="/dashboard" className="underline hover:text-destructive/80">your dashboard</Link> and set them up in the 'Store Integration' tab.
            </ShadCnAlertDescription>
        </ShadCnAlert>
      )}
      {error && credentialsExist && <ShadCnAlert variant="destructive" className="mb-6"><AlertTriangle className="h-4 w-4" /><ShadCnAlertTitle>Product Data Error</ShadCnAlertTitle><ShadCnAlertDescription>{error}</ShadCnAlertDescription></ShadCnAlert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg">Base Product Information</CardTitle><CardDescription>From your {source} store {source !== 'customizer-studio' && '(Read-only)'}.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input id="productName" value={productOptions.name} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, name: e.target.value} : null); setHasUnsavedChanges(true);}} />
              </div>
              <div>
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea id="productDescription" value={productOptions.description} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} rows={4} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, description: e.target.value} : null); setHasUnsavedChanges(true);}} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productPrice">Price ($)</Label>
                  <Input id="productPrice" type="number" value={productOptions.price} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null); setHasUnsavedChanges(true);}} />
                </div>
                <div>
                  <Label htmlFor="productType">Type</Label>
                  {source !== 'customizer-studio' ? (
                      <Input id="productType" value={productOptions.type.charAt(0).toUpperCase() + productOptions.type.slice(1)} className="mt-1 bg-muted/50" readOnly />
                  ) : (
                    <Select value={productOptions.type} onValueChange={(value: 'simple' | 'variable') => {setProductOptions(prev => prev ? {...prev, type: value} : null); setHasUnsavedChanges(true);}}>
                      <SelectTrigger id="productType" className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg">Customization Settings</CardTitle><CardDescription>Control how this product can be customized.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/20">
                    <Checkbox
                        id="allowCustomization"
                        checked={productOptions.allowCustomization}
                        onCheckedChange={(checked) => {
                            const isChecked = checked as boolean;
                            setProductOptions(prev => prev ? { ...prev, allowCustomization: isChecked } : null);
                            setHasUnsavedChanges(true);
                        }}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="allowCustomization" className="text-sm font-medium text-foreground cursor-pointer">
                        Enable Product Customization
                        </Label>
                        <p className="text-xs text-muted-foreground">
                        If unchecked, the "Customize" button will not appear for this product on your store (requires WordPress plugin update to check this flag).
                        </p>
                    </div>
                </div>
            </CardContent>
          </Card>

          {source === 'customizer-studio' && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Product Attributes</CardTitle>
                  <CardDescription>Define the colors and sizes available for this native product.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="color-input" className="flex items-center mb-2">
                        <Palette className="h-4 w-4 mr-2 text-primary" /> Colors
                    </Label>
                    <div className="flex gap-2">
                        <Input id="color-input" placeholder="e.g., Red, Navy Blue" value={colorInputValue} onChange={e => setColorInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('colors');} }}/>
                        <Button type="button" onClick={() => handleAddAttribute('colors')}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {productOptions.nativeAttributes.colors.map(color => (
                            <Badge key={color} variant="secondary" className="text-sm">
                                {color}
                                <button onClick={() => handleRemoveAttribute('colors', color)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3"/></button>
                            </Badge>
                        ))}
                    </div>
                  </div>
                   <div>
                    <Label htmlFor="size-input" className="flex items-center mb-2">
                        <Ruler className="h-4 w-4 mr-2 text-primary" /> Sizes
                    </Label>
                    <div className="flex gap-2">
                        <Input id="size-input" placeholder="e.g., S, M, XL" value={sizeInputValue} onChange={e => setSizeInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('sizes');} }}/>
                        <Button type="button" onClick={() => handleAddAttribute('sizes')}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {productOptions.nativeAttributes.sizes.map(size => (
                            <Badge key={size} variant="secondary" className="text-sm">
                                {size}
                                <button onClick={() => handleRemoveAttribute('sizes', size)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3"/></button>
                            </Badge>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {productOptions.type === 'variable' && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Product Variations</CardTitle>
                  <CardDescription>Select which variation color groups should be available in the customizer. Configure view-specific images per color.</CardDescription>
                </CardHeader>
                <CardContent>
                    {productOptions.source === 'woocommerce' && renderWooCommerceVariations()}
                    {productOptions.source === 'customizer-studio' && renderNativeVariations()}
                </CardContent>
              </Card>
            )}
        </div>

        <div className="md:col-span-1 space-y-6">
           <ProductViewSetup
            productOptions={{defaultViews: productOptions.defaultViews}} 
            activeViewId={activeViewIdForSetup}
            selectedBoundaryBoxId={selectedBoundaryBoxId}
            setSelectedBoundaryBoxId={setSelectedBoundaryBoxId}
            handleSelectView={handleSelectView}
            handleViewDetailChange={handleViewDetailChange}
            handleDeleteView={handleDeleteView}
            handleAddNewView={handleAddNewView}
            handleAddBoundaryBox={handleAddBoundaryBox}
            handleRemoveBoundaryBox={handleRemoveBoundaryBox}
            handleBoundaryBoxNameChange={handleBoundaryBoxNameChange}
            handleBoundaryBoxPropertyChange={handleBoundaryBoxPropertyChange}
            imageWrapperRef={imageWrapperRef}
            handleInteractionStart={handleInteractionStart}
            activeDrag={activeDrag}
            isDeleteViewDialogOpen={isDeleteViewDialogOpen}
            setIsDeleteViewDialogOpen={setIsDeleteViewDialogOpen}
            viewIdToDelete={viewIdToDelete}
            setViewIdToDelete={setViewIdToDelete} 
            confirmDeleteView={confirmDeleteView}
          />

          <Card className="shadow-md sticky top-8">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Summary & Actions</CardTitle>
              <CardDescription>Review your product setup and save changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Customization: <Badge variant={productOptions.allowCustomization ? "default" : "secondary"} className={productOptions.allowCustomization ? "bg-green-500/10 text-green-700 border-green-500/30" : ""}>{productOptions.allowCustomization ? "Enabled" : "Disabled"}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Total Default Views: <span className="font-semibold text-foreground">{productOptions.defaultViews.length}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Active Setup View: <span className="font-semibold text-foreground">{currentView?.name || "N/A"}</span>
              </div>
              {currentView && (
                <div className="text-sm text-muted-foreground">
                  Areas in <span className="font-semibold text-primary">{currentView.name}</span>: <span className="font-semibold text-foreground">{currentView.boundaryBoxes.length}</span>
                </div>
              )}
              {productOptions.type === 'variable' && (
                <div className="text-sm text-muted-foreground">
                  Total Variation SKUs enabled for customizer: <span className="font-semibold text-foreground">
                    {Object.values(productOptions.optionsByColor).reduce((acc, group) => acc + group.selectedVariationIds.length, 0)}
                    </span>
                    {productOptions.source === 'woocommerce' && ` of ${variations.length}`}
                </div>
              )}
              {hasUnsavedChanges && (<div className="mt-3 text-sm text-yellow-600 flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500" />You have unsaved changes.</div>)}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button onClick={handleSaveChanges} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }
                Save All Configurations
              </Button>
              <Button variant="outline" size="lg" onClick={handleOpenInCustomizer} disabled={hasUnsavedChanges || !productOptions.allowCustomization} className="hover:bg-accent hover:text-accent-foreground"><ExternalLink className="mr-2 h-4 w-4" />Open in Customizer</Button>
              {!productOptions.allowCustomization && <p className="text-xs text-center text-muted-foreground">Customization is currently disabled for this product.</p>}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
