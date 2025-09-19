
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import DesignCanvas from '@/components/customizer/DesignCanvas';
import RightPanel from '@/components/customizer/RightPanel';
import { UploadProvider, useUploads } from "@/contexts/UploadContext";
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import type { ProductOptionsFirestoreData } from '@/app/actions/productOptionsActions';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import {
  Loader2, AlertTriangle, ShoppingCart, UploadCloud, Layers, Type, Shapes as ShapesIconLucide, Smile, Palette, Gem as GemIcon, Settings2 as SettingsIcon,
  PanelLeftClose, PanelRightOpen, PanelRightClose, PanelLeftOpen, Sparkles, Ban
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import Link from 'next/link';
import type { WCCustomProduct, WCVariation, WCVariationAttribute } from '@/types/woocommerce';
import { useToast } from '@/hooks/use-toast';
import CustomizerIconNav, { type CustomizerTool } from '@/components/customizer/CustomizerIconNav';
import { cn } from '@/lib/utils';

import UploadArea from '@/components/customizer/UploadArea';
import LayersPanel from '@/components/customizer/LayersPanel';
import TextToolPanel from '@/components/customizer/TextToolPanel';
import ShapesPanel from '@/components/customizer/ShapesPanel';
import ClipartPanel from '@/components/customizer/ClipartPanel';
import FreeDesignsPanel from '@/components/customizer/FreeDesignsPanel';
import PremiumDesignsPanel from '@/components/customizer/PremiumDesignsPanel';
import VariantSelector from '@/components/customizer/VariantSelector';

interface BoundaryBox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  aiHint?: string;
  boundaryBoxes: BoundaryBox[];
  price?: number;
}

interface ColorGroupOptionsForCustomizer {
  selectedVariationIds: string[];
  variantViewImages: Record<string, { imageUrl: string; aiHint?: string }>;
}

interface LoadedCustomizerOptions {
  defaultViews: ProductView[];
  optionsByColor: Record<string, ColorGroupOptionsForCustomizer>;
  groupingAttributeName: string | null;
  allowCustomization?: boolean;
}

export interface ProductForCustomizer {
  id: string;
  name: string;
  basePrice: number;
  views: ProductView[];
  type?: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify';
  allowCustomization?: boolean;
  meta?: {
    proxyUsed?: boolean;
    configUserIdUsed?: string | null;
    source: 'woocommerce' | 'shopify';
  };
}

export interface ConfigurableAttribute {
  name: string;
  options: string[];
}

const defaultFallbackProduct: ProductForCustomizer = {
  id: 'fallback_product',
  name: 'Product Customizer (Default)',
  basePrice: 25.00,
  views: [
    {
      id: 'fallback_view_1',
      name: 'Front View',
      imageUrl: 'https://placehold.co/700x700.png',
      aiHint: 'product mockup',
      boundaryBoxes: [
        { id: 'fallback_area_1', name: 'Default Area', x: 25, y: 25, width: 50, height: 50 },
      ],
      price: 0,
    }
  ],
  type: 'simple',
  allowCustomization: true,
  meta: { proxyUsed: false, configUserIdUsed: null, source: 'woocommerce' },
};

const toolItems: CustomizerTool[] = [
  { id: "layers", label: "Layers", icon: Layers },
  { id: "uploads", label: "Uploads", icon: UploadCloud },
  { id: "text", label: "Text", icon: Type },
  { id: "shapes", label: "Shapes", icon: ShapesIconLucide },
  { id: "clipart", label: "Clipart", icon: Smile },
  { id: "free-designs", label: "Free Designs", icon: Palette },
  { id: "premium-designs", label: "Premium Designs", icon: GemIcon },
];

async function loadProductOptionsFromFirestore(
  userIdForOptions: string, 
  productId: string
): Promise<{ options?: ProductOptionsFirestoreData; error?: string }> {
  if (!userIdForOptions || !productId || !db) {
    const message = 'User/Config ID, Product ID, or DB service is missing for loading options.';
    console.warn(`loadProductOptionsFromFirestore: ${'message'}`);
    return { error: message };
  }
  const firestoreDocId = productId.split('/').pop() || productId;
  try {
    const docRef = doc(db, 'userProductOptions', userIdForOptions, 'products', firestoreDocId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { options: docSnap.data() as ProductOptionsFirestoreData };
    }
    return { options: undefined }; 
  } catch (error: any) {
    let detailedError = `Failed to load options from cloud: ${'error.message'}`;
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        detailedError += " This is likely a Firestore security rule issue. Ensure public read access is configured for userProductOptions/{configUserId}/products/{productId} if using configUserId, or that the current user has permission.";
    }
    console.error(`loadProductOptionsFromFirestore: Error loading product options from Firestore for user/config ${userIdForOptions}, product ${firestoreDocId}:`, detailedError, error);
    return { error: detailedError };
  }
}


function CustomizerLayoutAndLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewMode = useMemo(() => searchParams.get('viewMode'), [searchParams]);
  const isEmbedded = useMemo(() => viewMode === 'embedded', [viewMode]);
  const productIdFromUrl = useMemo(() => searchParams.get('productId'), [searchParams]);
  const sourceFromUrl = useMemo(() => {
    const sourceParam = searchParams.get('source');
    if (sourceParam === 'shopify' || sourceParam === 'woocommerce') {
      return sourceParam as 'shopify' | 'woocommerce';
    }
    // Fallback logic if source is missing, which can happen in some navigation scenarios.
    if (productIdFromUrl && productIdFromUrl.startsWith('gid://shopify/Product/')) {
      return 'shopify';
    }
    return 'woocommerce'; // Default if no other clues are present.
  }, [searchParams, productIdFromUrl]);
  const wpApiBaseUrlFromUrl = useMemo(() => searchParams.get('wpApiBaseUrl'), [searchParams]);
  const configUserIdFromUrl = useMemo(() => searchParams.get('configUserId'), [searchParams]);

  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { canvasImages, canvasTexts, canvasShapes } = useUploads();

  const [productDetails, setProductDetails] = useState<ProductForCustomizer | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>(toolItems[0]?.id || "layers");
  const [showGrid, setShowGrid] = useState(false);
  const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(true);

  const [isToolPanelOpen, setIsToolPanelOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [productVariations, setProductVariations] = useState<WCVariation[] | null>(null);
  const [configurableAttributes, setConfigurableAttributes] = useState<ConfigurableAttribute[] | null>(null);
  const [selectedVariationOptions, setSelectedVariationOptions] = useState<Record<string, string>>({});

  const [loadedOptionsByColor, setLoadedOptionsByColor] = useState<Record<string, ColorGroupOptionsForCustomizer> | null>(null);
  const [loadedGroupingAttributeName, setLoadedGroupingAttributeName] = useState<string | null>(null);
  const [viewBaseImages, setViewBaseImages] = useState<Record<string, {url: string, aiHint?: string, price?: number}>>({});
  const [totalCustomizationPrice, setTotalCustomizationPrice] = useState<number>(0);

  const [hasCanvasElements, setHasCanvasElements] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [onConfirmLeaveAction, setOnConfirmLeaveAction] = useState<(() => void) | null>(null);

  const lastLoadedProductIdRef = useRef<string | null | undefined>(undefined);
  const lastLoadedProxyUrlRef = useRef<string | null | undefined>(undefined);
  const lastLoadedConfigUserIdRef = useRef<string | null | undefined>(undefined);


  useEffect(() => {
    const anyElementsExist = canvasImages.length > 0 || canvasTexts.length > 0 || canvasShapes.length > 0;
    setHasCanvasElements(anyElementsExist);
  }, [canvasImages, canvasTexts, canvasShapes]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasCanvasElements && !isEmbedded) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasCanvasElements, isEmbedded]);

  useEffect(() => {
    const handleAttemptClose = () => {
      if (hasCanvasElements && !isEmbedded) {
        setOnConfirmLeaveAction(() => () => {
          if (user) router.push('/dashboard');
          else router.push('/');
        });
        setIsLeaveConfirmOpen(true);
      } else if (!isEmbedded) {
        if (user) router.push('/dashboard');
        else router.push('/');
      }
    };
    const eventListener = () => handleAttemptClose();
    window.addEventListener('attemptCloseCustomizer', eventListener);
    return () => window.removeEventListener('attemptCloseCustomizer', eventListener);
  }, [hasCanvasElements, router, user, isEmbedded]);

  const toggleGrid = useCallback(() => setShowGrid(prev => !prev), []);
  const toggleBoundaryBoxes = useCallback(() => setShowBoundaryBoxes(prev => !prev), []);
  const toggleToolPanel = useCallback(() => setIsToolPanelOpen(prev => !prev), []);
  const toggleRightSidebar = useCallback(() => setIsRightSidebarOpen(prev => !prev), []);

  const handleVariantOptionSelect = useCallback((attributeName: string, optionValue: string) => {
    setSelectedVariationOptions(prev => ({ ...prev, [attributeName]: optionValue }));
  }, []);


  const loadCustomizerData = useCallback(async (productIdToLoad: string | null, source: 'woocommerce' | 'shopify', wpApiBaseUrlToUse: string | null, configUserIdToUse: string | null) => {
    setIsLoading(true);
    setError(null);
    setProductVariations(null); setConfigurableAttributes(null);
    setSelectedVariationOptions({}); setViewBaseImages({}); setLoadedOptionsByColor(null);
    setLoadedGroupingAttributeName(null); setTotalCustomizationPrice(0); setActiveViewId(null);
    
    const metaForProduct = { proxyUsed: !!wpApiBaseUrlToUse, configUserIdUsed: configUserIdToUse, source };

    if (!productIdToLoad) {
      setError("No product ID provided. Displaying default customizer.");
      const defaultViews = defaultFallbackProduct.views;
      const baseImagesMap: Record<string, {url: string, aiHint?: string, price?: number}> = {};
      defaultViews.forEach(view => { baseImagesMap[view.id] = { url: view.imageUrl, aiHint: view.aiHint, price: view.price ?? 0 }; });
      setViewBaseImages(baseImagesMap);
      setProductDetails({...defaultFallbackProduct, meta: metaForProduct});
      setActiveViewId(defaultViews[0]?.id || null);
      setIsLoading(false);
      return;
    }
    
    if (authLoading && !user?.uid && !wpApiBaseUrlToUse && !configUserIdToUse) {
      setIsLoading(false); 
      return;
    }

    const userIdForFirestoreOptions = configUserIdToUse || user?.uid;
    let baseProductDetails: { id: string; name: string; type: ProductForCustomizer['type']; basePrice: number; };
    let fetchedVariations: WCVariation[] | null = null;

    if (source === 'shopify') {
        if (!userIdForFirestoreOptions) { setError("User not available for Shopify."); setIsLoading(false); return; }
        try {
            const credDocRef = doc(db, 'userShopifyCredentials', userIdForFirestoreOptions);
            const credDocSnap = await getDoc(credDocRef);
            if (!credDocSnap.exists()) throw new Error("Shopify store not connected.");
            const creds = credDocSnap.data() as UserShopifyCredentials;
            const { product, error } = await fetchShopifyProductById(creds.shop, creds.accessToken, productIdToLoad);
            if (error || !product) throw new Error(error || `Shopify product not found.`);
            baseProductDetails = {
                id: product.id, name: product.title, type: 'shopify',
                basePrice: parseFloat(product.priceRangeV2?.minVariantPrice.amount || '0'),
            };
        } catch (e: any) {
            setError(`Shopify Error: ${e.message}. Displaying default.`);
            setProductDetails(defaultFallbackProduct); setIsLoading(false); return;
        }
    } else { // WooCommerce
        let userWCCredentialsToUse: WooCommerceCredentials | undefined;
        if (user?.uid && !wpApiBaseUrlToUse && (!configUserIdToUse || !isEmbedded)) {
            const credDocRef = doc(db, 'userWooCommerceCredentials', user.uid);
            const credDocSnap = await getDoc(credDocRef);
            if (credDocSnap.exists()) {
                const credData = credDocSnap.data() as UserWooCommerceCredentials;
                userWCCredentialsToUse = { storeUrl: credData.storeUrl, consumerKey: credData.consumerKey, consumerSecret: credData.consumerSecret };
            }
        }
        
        const wcProductId = productIdToLoad.split('/').pop() || productIdToLoad;
        const { product: wcProduct, error: fetchError } = await fetchWooCommerceProductById(wcProductId, userWCCredentialsToUse, wpApiBaseUrlToUse || undefined);
        
        if (fetchError || !wcProduct) {
          setError((fetchError || "Failed to load product") + ". Displaying default.");
          setProductDetails(defaultFallbackProduct); setIsLoading(false); return;
        }

        baseProductDetails = { id: wcProduct.id.toString(), name: wcProduct.name, type: wcProduct.type, basePrice: parseFloat(wcProduct.price || wcProduct.regular_price || '0')};

        if (wcProduct.type === 'variable') {
            const { variations, error: variationsError } = await fetchWooCommerceProductVariations(wcProductId, userWCCredentialsToUse, wpApiBaseUrlToUse || undefined);
            if (variationsError) toast({ title: "Variations Load Error", description: variationsError, variant: "destructive" });
            else fetchedVariations = variations;
        }
    }

    let firestoreOptions: ProductOptionsFirestoreData | undefined;
    if (userIdForFirestoreOptions) {
        const { options, error: firestoreError } = await loadProductOptionsFromFirestore(userIdForFirestoreOptions, baseProductDetails.id);
        if (firestoreError) toast({ title: "Settings Load Issue", description: `Could not load saved settings.`, variant: "default" });
        firestoreOptions = options;
    }
    
    const finalAllowCustomization = firestoreOptions?.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true;
    if (!finalAllowCustomization) {
        setError(`Customization for product "${baseProductDetails.name}" is disabled.`);
        setProductDetails({ ...baseProductDetails, views: [], allowCustomization: false, meta: metaForProduct });
        setIsLoading(false);
        return;
    }
    
    let finalDefaultViews = firestoreOptions?.defaultViews?.map(v => ({...v, price: v.price ?? 0})) || [];
    if (finalDefaultViews.length === 0) {
        const defaultImageUrl = source === 'shopify' 
            ? (await fetchShopifyProductById((await getDoc(doc(db, 'userShopifyCredentials', userIdForFirestoreOptions!))).data()?.shop, (await getDoc(doc(db, 'userShopifyCredentials', userIdForFirestoreOptions!))).data()?.accessToken, baseProductDetails.id)).product?.featuredImage?.url || defaultFallbackProduct.views[0].imageUrl
            : defaultFallbackProduct.views[0].imageUrl;
        
        finalDefaultViews = [{
            id: `default_view_${baseProductDetails.id}`, name: "Front View",
            imageUrl: defaultImageUrl,
            aiHint: defaultFallbackProduct.views[0].aiHint,
            boundaryBoxes: defaultFallbackProduct.views[0].boundaryBoxes, price: 0,
        }];
        if (!isEmbedded) toast({ title: "No Saved Settings", description: "Using default view for this product.", variant: "default" });
    }

    setLoadedOptionsByColor(firestoreOptions?.optionsByColor || {});
    setLoadedGroupingAttributeName(firestoreOptions?.groupingAttributeName || null);

    const baseImagesMapFinal: Record<string, {url: string, aiHint?: string, price?:number}> = {};
    finalDefaultViews.forEach(view => { baseImagesMapFinal[view.id] = { url: view.imageUrl, aiHint: view.aiHint, price: view.price ?? 0 }; });
    setViewBaseImages(baseImagesMapFinal);
    
    setProductDetails({ ...baseProductDetails, views: finalDefaultViews, allowCustomization: true, meta: metaForProduct });
    setActiveViewId(finalDefaultViews[0]?.id || null);

    if (source === 'woocommerce' && fetchedVariations) {
        setProductVariations(fetchedVariations);
        const attributesMap: Record<string, Set<string>> = {};
        fetchedVariations.forEach(variation => variation.attributes.forEach(attr => {
            if (!attributesMap[attr.name]) attributesMap[attr.name] = new Set();
            attributesMap[attr.name].add(attr.option);
        }));
        const allConfigurableAttributes: ConfigurableAttribute[] = Object.entries(attributesMap).map(([name, optionsSet]) => ({ name, options: Array.from(optionsSet) }));
        setConfigurableAttributes(allConfigurableAttributes);
        if (allConfigurableAttributes.length > 0) {
            const initialSelectedOptions: Record<string, string> = {};
            allConfigurableAttributes.forEach(attr => { if (attr.options.length > 0) initialSelectedOptions[attr.name] = attr.options[0]; });
            setSelectedVariationOptions(initialSelectedOptions);
        }
    }
    
    setIsLoading(false);
  }, [user?.uid, authLoading, toast, isEmbedded, router]);


  useEffect(() => {
    const targetProductId = productIdFromUrl || null;
    const targetSource = sourceFromUrl;
    const targetProxyUrl = wpApiBaseUrlFromUrl || null;
    const targetConfigUserId = configUserIdFromUrl || null;

    if (authLoading && !user && !targetProxyUrl && !targetConfigUserId) {
        if (lastLoadedProductIdRef.current === undefined) { 
            loadCustomizerData(null, 'woocommerce', null, null);
            lastLoadedProductIdRef.current = null;
        }
        return; 
    }
    
    if (
        (lastLoadedProductIdRef.current !== targetProductId ||
         productDetails?.meta?.source !== targetSource ||
         lastLoadedProxyUrlRef.current !== targetProxyUrl ||
         lastLoadedConfigUserIdRef.current !== targetConfigUserId) ||
        !productDetails 
    ) {
        loadCustomizerData(targetProductId, targetSource, targetProxyUrl, targetConfigUserId);
        lastLoadedProductIdRef.current = targetProductId;
        lastLoadedProxyUrlRef.current = targetProxyUrl;
        lastLoadedConfigUserIdRef.current = targetConfigUserId;
    }
  }, [
      authLoading, user, productIdFromUrl, sourceFromUrl, wpApiBaseUrlFromUrl, configUserIdFromUrl,
      loadCustomizerData, productDetails 
  ]);


 useEffect(() => {
    setProductDetails(prevProductDetails => {
      if (!prevProductDetails || !viewBaseImages || prevProductDetails.type !== 'variable') return prevProductDetails;
      if (!productVariations && Object.keys(selectedVariationOptions).length > 0) return prevProductDetails;

      const matchingVariation = productVariations ? productVariations.find(variation => {
        if (Object.keys(selectedVariationOptions).length === 0 && configurableAttributes && configurableAttributes.length > 0) return false;
        return variation.attributes.every(attr => selectedVariationOptions[attr.name] === attr.option);
      }) : null;

      let primaryVariationImageSrc: string | null = null;
      let primaryVariationImageAiHint: string | undefined = undefined;
      if (matchingVariation?.image?.src) {
        primaryVariationImageSrc = matchingVariation.image.src;
        primaryVariationImageAiHint = matchingVariation.image.alt?.split(" ").slice(0, 2).join(" ") || undefined;
      }

      let currentColorKey: string | null = null;
      if (loadedGroupingAttributeName && selectedVariationOptions[loadedGroupingAttributeName]) {
        currentColorKey = selectedVariationOptions[loadedGroupingAttributeName];
      }
      const currentVariantViewImages = currentColorKey && loadedOptionsByColor ? loadedOptionsByColor[currentColorKey]?.variantViewImages : null;

      let viewsContentActuallyChanged = false;
      const updatedViews = prevProductDetails.views.map(view => {
        let finalImageUrl: string | undefined = undefined;
        let finalAiHint: string | undefined = undefined;
        const baseImageInfo = viewBaseImages[view.id];
        const baseImageUrl = baseImageInfo?.url || defaultFallbackProduct.views[0].imageUrl;
        const baseAiHint = baseImageInfo?.aiHint || defaultFallbackProduct.views[0].aiHint;

        if (currentVariantViewImages && currentVariantViewImages[view.id]?.imageUrl) {
          finalImageUrl = currentVariantViewImages[view.id].imageUrl;
          finalAiHint = currentVariantViewImages[view.id].aiHint || baseAiHint;
        } else if (primaryVariationImageSrc && view.id === activeViewId) { 
          finalImageUrl = primaryVariationImageSrc;
          finalAiHint = primaryVariationImageAiHint || baseAiHint;
        } else {
          finalImageUrl = baseImageUrl;
          finalAiHint = baseAiHint;
        }

        if (view.imageUrl !== finalImageUrl || view.aiHint !== finalAiHint || (view.price ?? 0) !== (baseImageInfo?.price ?? view.price ?? 0)) {
          viewsContentActuallyChanged = true;
        }
        return { ...view, imageUrl: finalImageUrl!, aiHint: finalAiHint, price: baseImageInfo?.price ?? view.price ?? 0 };
      });

      const basePriceChanged = prevProductDetails.basePrice !== (matchingVariation ? parseFloat(matchingVariation.price || '0') : prevProductDetails.basePrice);

      if (!viewsContentActuallyChanged && !basePriceChanged) {
        return prevProductDetails; 
      }
      return { ...prevProductDetails, views: updatedViews, basePrice: matchingVariation ? parseFloat(matchingVariation.price || '0') : prevProductDetails.basePrice };
    });
  }, [
    selectedVariationOptions, productVariations, activeViewId, viewBaseImages,
    loadedOptionsByColor, loadedGroupingAttributeName, configurableAttributes
  ]);

  useEffect(() => {
    const usedViewIdsWithElements = new Set<string>();
    canvasImages.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    canvasTexts.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    canvasShapes.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    const viewsToPrice = new Set<string>(usedViewIdsWithElements);
    if (activeViewId) viewsToPrice.add(activeViewId); 

    let viewSurcharges = 0;
    if (productDetails?.views) {
      viewsToPrice.forEach(viewId => {
        const view = productDetails.views.find(v => v.id === viewId);
        viewSurcharges += view?.price ?? 0;
      });
    }
    const basePrice = productDetails?.basePrice ?? 0;
    setTotalCustomizationPrice(basePrice + viewSurcharges);
  }, [canvasImages, canvasTexts, canvasShapes, productDetails?.views, productDetails?.basePrice, activeViewId]);

  const getToolPanelTitle = (toolId: string): string => {
    const tool = toolItems.find(item => item.id === toolId);
    return tool ? tool.label : "Design Tool";
  };

  const renderActiveToolPanelContent = () => {
     if (!activeViewId && (activeTool !== "layers" && activeTool !== "ai-assistant")) {
       return (
         <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center">
           <SettingsIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
           <h3 className="text-lg font-semibold mb-1">Select a View</h3>
           <p className="text-sm">Please select a product view before adding elements.</p>
         </div>
       );
    }
    switch (activeTool) {
      case "layers": return <LayersPanel activeViewId={activeViewId} />;
      case "uploads": return <UploadArea activeViewId={activeViewId} />;
      case "text": return <TextToolPanel activeViewId={activeViewId} />;
      case "shapes": return <ShapesPanel activeViewId={activeViewId} />;
      case "clipart": return <ClipartPanel activeViewId={activeViewId} />;
      case "free-designs": return <FreeDesignsPanel activeViewId={activeViewId} />;
      case "premium-designs": return <PremiumDesignsPanel activeViewId={activeViewId} />;
      default:
        return (
          <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center">
            <SettingsIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-1">{getToolPanelTitle(activeTool)}</h3>
            <p className="text-sm">Tool panel not yet implemented.</p>
          </div>
        );
    }
  };

  const handleAddToCart = () => {
    if (productDetails && productDetails.allowCustomization === false) {
      toast({ title: "Customization Disabled", description: "This product is not available for customization at this time.", variant: "destructive" });
      return;
    }
    if (!activeViewId && (canvasImages.length > 0 || canvasTexts.length > 0 || canvasShapes.length > 0)){
       toast({ title: "Select a View", description: "Please ensure an active product view is selected before adding to cart if you have customizations.", variant: "default"});
      return;
    }
    if (canvasImages.length === 0 && canvasTexts.length === 0 && canvasShapes.length === 0) {
      toast({ title: "Empty Design", description: "Please add some design elements to the canvas before adding to cart.", variant: "default" });
      return;
    }
    if (!isEmbedded && !user && (canvasImages.length > 0 || canvasTexts.length > 0 || canvasShapes.length > 0)) {
       toast({ title: "Please Sign In", description: "Sign in to save your design and add to cart (if applicable).", variant: "default" });
      return;
    }

    const currentProductIdFromUrlResolved = productIdFromUrl;
    const baseProductPrice = productDetails?.basePrice ?? 0;
    const viewsUsedForSurcharge = new Set<string>();
    canvasImages.forEach(item => { if(item.viewId) viewsUsedForSurcharge.add(item.viewId); });
    canvasTexts.forEach(item => { if(item.viewId) viewsUsedForSurcharge.add(item.viewId); });
    canvasShapes.forEach(item => { if(item.viewId) viewsUsedForSurcharge.add(item.viewId); });
    if (activeViewId && (viewsUsedForSurcharge.has(activeViewId) || viewsUsedForSurcharge.size === 0)) {
        viewsUsedForSurcharge.add(activeViewId);
    }
    let totalViewSurcharge = 0;
    viewsUsedForSurcharge.forEach(vid => { totalViewSurcharge += productDetails?.views.find(v => v.id === vid)?.price ?? 0; });

    const designData = {
      productId: currentProductIdFromUrlResolved || productDetails?.id,
      variationId: productVariations?.find(v => v.attributes.every(attr => selectedVariationOptions[attr.name] === attr.option))?.id.toString() || null,
      quantity: 1,
      customizationDetails: {
        viewData: productDetails?.views.map(view => ({
            viewId: view.id, viewName: view.name,
            images: canvasImages.filter(item => item.viewId === view.id).map(img => ({ src: img.dataUrl, name: img.name, type: img.type, x: img.x, y: img.y, scale: img.scale, rotation: img.rotation })),
            texts: canvasTexts.filter(item => item.viewId === view.id).map(txt => ({ content: txt.content, fontFamily: txt.fontFamily, fontSize: txt.fontSize, color: txt.color, x: txt.x, y: txt.y, scale: txt.scale, rotation: txt.rotation, outlineColor: txt.outlineColor, outlineWidth: txt.outlineWidth, shadowColor: txt.shadowColor, shadowOffsetX: txt.shadowOffsetX, shadowOffsetY: txt.shadowBlur, archAmount: txt.archAmount })),
            shapes: canvasShapes.filter(item => item.viewId === view.id).map(shp => ({ type: shp.shapeType, color: shp.color, strokeColor: shp.strokeColor, strokeWidth: shp.strokeWidth, x: shp.x, y: shp.y, scale: shp.scale, rotation: shp.rotation, width: shp.width, height: shp.height })),
        })).filter(view => view.images.length > 0 || view.texts.length > 0 || view.shapes.length > 0),
        selectedOptions: selectedVariationOptions, baseProductPrice: baseProductPrice, totalViewSurcharge: totalViewSurcharge,
        totalCustomizationPrice: totalCustomizationPrice, activeViewIdUsed: activeViewId,
      },
      userId: user?.uid || null, 
      configUserId: productDetails?.meta?.configUserIdUsed || null, 
    };

    let targetOrigin = '*';
    if (window.parent !== window && document.referrer) {
      try { targetOrigin = new URL(document.referrer).origin; }
      catch (e) { console.warn("Could not parse document.referrer for targetOrigin. Defaulting to '*'. Parent site MUST validate event.origin.", e); }
    } else if (window.parent !== window) {
        console.warn("document.referrer is empty, but app is in an iframe. Defaulting to targetOrigin '*' for postMessage. Parent site MUST validate event.origin.");
    }

    if (window.parent !== window) {
      window.parent.postMessage({ customizerStudioDesignData: designData }, targetOrigin);
      toast({ title: "Design Sent!", description: `Your design details have been sent. The embedding site must verify the origin of this message (${targetOrigin === '*' ? 'any origin, or a specific one if referrer was available' : targetOrigin}) for security.`});
    } else {
       toast({ title: "Add to Cart Clicked (Standalone)", description: "This action would normally send data to an embedded store. Design data logged to console.", variant: "default"});
      console.log("Add to Cart - Design Data:", designData);
    }
  };

  if (isLoading || (authLoading && !user && !wpApiBaseUrlFromUrl && !configUserIdFromUrl)) {
    return (
      <div className="flex min-h-svh h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading customizer...</p>
      </div>
    );
  }

  if (productDetails && productDetails.allowCustomization === false) {
    return (
      <div className="flex flex-col min-h-svh h-screen w-full items-center justify-center bg-background p-4">
        {!isEmbedded && <AppHeader />}
        <div className="text-center">
          <Ban className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-destructive mb-3">Customization Disabled</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Product customization for "{productDetails.name}" is currently disabled by the store owner.
          </p>
          {!isEmbedded && user && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/products/${productDetails.id}/options?source=${productDetails.meta?.source}`}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Go to Product Options
              </Link>
            </Button>
          )}
          {!isEmbedded && !user && (
             <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const activeViewData = productDetails?.views.find(v => v.id === activeViewId);
  const currentProductImage = activeViewData?.imageUrl || defaultFallbackProduct.views[0].imageUrl;
  const currentProductAlt = activeViewData?.name || defaultFallbackProduct.views[0].name;
  const currentProductAiHint = activeViewData?.aiHint || defaultFallbackProduct.views[0].aiHint;
  const currentBoundaryBoxes = activeViewData?.boundaryBoxes || defaultFallbackProduct.views[0].boundaryBoxes;
  const currentProductName = productDetails?.name || defaultFallbackProduct.name;

  if (error && !productDetails) { 
    return (
      <div className="flex flex-col min-h-svh h-screen w-full items-center justify-center bg-background p-4">
        {!isEmbedded && <AppHeader />}
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Customizer Error</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-lg">{error}</p>
        {!isEmbedded && ( <Button variant="outline" asChild><Link href="/dashboard">Back to Dashboard</Link></Button> )}
      </div>
    );
  }

  return (
      <div className={cn("flex flex-col min-h-svh h-screen w-full", isEmbedded ? "bg-transparent" : "bg-muted/20")}>
        {!isEmbedded && <AppHeader />}
        <div className="relative flex flex-1 overflow-hidden">
          <CustomizerIconNav tools={toolItems} activeTool={activeTool} setActiveTool={setActiveTool} />
          <div id="tool-panel-content" className={cn("border-r bg-card shadow-sm flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out h-full", isToolPanelOpen ? "w-72 md:w-80 opacity-100" : "w-0 opacity-0 pointer-events-none")}>
            <div className="p-4 border-b flex-shrink-0"> <h2 className="font-headline text-lg font-semibold text-foreground">{getToolPanelTitle(activeTool)}</h2> </div>
            <div className={cn("flex-1 h-full overflow-y-auto overflow-x-hidden pb-20 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500", !isToolPanelOpen && "invisible opacity-0")}>
               {renderActiveToolPanelContent()}
            </div>
          </div>
          <Button onClick={toggleToolPanel} variant="outline" size="icon" className={cn("absolute top-1/2 -translate-y-1/2 z-30 h-12 w-8 rounded-l-none border-l-0 shadow-md bg-card hover:bg-accent/20", "transition-all duration-300 ease-in-out", isToolPanelOpen ? "left-[calc(theme(spacing.16)_+_theme(spacing.72))] md:left-[calc(theme(spacing.16)_+_theme(spacing.80))]" : "left-16")} aria-label={isToolPanelOpen ? "Collapse tool panel" : "Expand tool panel"} aria-expanded={isToolPanelOpen} aria-controls="tool-panel-content">
            {isToolPanelOpen ? <PanelLeftClose className="h-5 w-5"/> : <PanelRightOpen className="h-5 w-5"/>}
          </Button>

          <main className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
            {error && productDetails?.id === defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
             {error && productDetails && productDetails.id !== defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
             <div className="w-full flex flex-col flex-1 min-h-0 pb-4">
              <DesignCanvas productImageUrl={currentProductImage} productImageAlt={`${currentProductName} - ${currentProductAlt}`} productImageAiHint={currentProductAiHint} productDefinedBoundaryBoxes={currentBoundaryBoxes} activeViewId={activeViewId} showGrid={showGrid} showBoundaryBoxes={showBoundaryBoxes} />
            </div>
          </main>

           <Button onClick={toggleRightSidebar} variant="outline" size="icon" className={cn("absolute top-1/2 -translate-y-1/2 z-30 h-12 w-8 rounded-r-none border-r-0 shadow-md bg-card hover:bg-accent/20", "transition-all duration-300 ease-in-out", isRightSidebarOpen ? "right-[theme(spacing.72)] md:right-[theme(spacing.80)] lg:right-[theme(spacing.96)]" : "right-0")} aria-label={isRightSidebarOpen ? "Collapse right sidebar" : "Expand right sidebar"} aria-expanded={isRightSidebarOpen} aria-controls="right-panel-content">
            {isRightSidebarOpen ? <PanelRightClose className="h-5 w-5"/> : <PanelLeftOpen className="h-5 w-5"/>}
          </Button>
          <RightPanel 
            showGrid={showGrid} 
            toggleGrid={toggleGrid} 
            showBoundaryBoxes={showBoundaryBoxes} 
            toggleBoundaryBoxes={toggleBoundaryBoxes} 
            productDetails={productDetails} 
            activeViewId={activeViewId} 
            setActiveViewId={setActiveViewId} 
            className={cn("transition-all duration-300 ease-in-out flex-shrink-0 h-full", isRightSidebarOpen ? "w-72 md:w-80 lg:w-96 opacity-100" : "w-0 opacity-0 pointer-events-none")} 
            configurableAttributes={productDetails?.source === 'woocommerce' ? configurableAttributes : null}
            selectedVariationOptions={productDetails?.source === 'woocommerce' ? selectedVariationOptions : {}}
            onVariantOptionSelect={handleVariantOptionSelect} 
            productVariations={productDetails?.source === 'woocommerce' ? productVariations : null}
          />
        </div>

        <footer className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card shadow-md px-4 py-2 flex items-center justify-between gap-4 z-40">
            <div className="text-md font-medium text-muted-foreground truncate max-w-xs sm:max-w-sm md:max-w-md" title={currentProductName}> {currentProductName} </div>
            <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-foreground">Total: ${totalCustomizationPrice.toFixed(2)}</div>
                <Button size="default" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddToCart} disabled={productDetails?.allowCustomization === false}> 
                    {productDetails?.allowCustomization === false ? <Ban className="mr-2 h-5 w-5" /> : <ShoppingCart className="mr-2 h-5 w-5" /> }
                    {productDetails?.allowCustomization === false ? "Not Customizable" : "Add to Cart"}
                </Button>
            </div>
        </footer>

        {!isEmbedded && <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader> <AlertDialogTitle>Unsaved Changes</AlertDialogTitle> <AlertDialogDescription> You have unsaved changes on the canvas. Are you sure you want to leave? Your changes will be lost. </AlertDialogDescription> </AlertDialogHeader>
            <AlertDialogFooter> <AlertDialogCancel onClick={() => { setIsLeaveConfirmOpen(false); setOnConfirmLeaveAction(null); }}> Stay </AlertDialogCancel> <AlertDialogAction onClick={() => { if (onConfirmLeaveAction) onConfirmLeaveAction(); setIsLeaveConfirmOpen(false); setOnConfirmLeaveAction(null); }} className={cn(buttonVariants({variant: "destructive"}))}> Leave </AlertDialogAction> </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>}
      </div>
  );
}

export default function CustomizerPage() {
  return (
    <UploadProvider>
      <Suspense fallback={ <div className="flex min-h-svh h-screen w-full items-center justify-center bg-background"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-3 text-muted-foreground">Loading customizer page...</p> </div> }>
        <CustomizerLayoutAndLogic />
      </Suspense>
    </UploadProvider>
  );
}
    
    

    

    



    




    

    
