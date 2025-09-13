
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import DesignCanvas from '@/components/customizer/DesignCanvas';
import RightPanel from '@/components/customizer/RightPanel';
import { UploadProvider, useUploads } from "@/contexts/UploadContext";
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import type { ProductOptionsFirestoreData, NativeProductVariation } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import {
  Loader2, AlertTriangle, ShoppingCart, UploadCloud, Layers, Type, Shapes as ShapesIconLucide, Smile, Palette, Gem as GemIcon, Settings2 as SettingsIcon,
  PanelLeftClose, PanelRightOpen, PanelRightClose, PanelLeftOpen, Sparkles, Ban, ArrowLeft
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
import { toPng } from 'html-to-image';


import UploadArea from '@/components/customizer/UploadArea';
import LayersPanel from '@/components/customizer/LayersPanel';
import TextToolPanel from '@/components/customizer/TextToolPanel';
import ShapesPanel from '@/components/customizer/ShapesPanel';
import ClipartPanel from '@/components/customizer/ClipartPanel';
import FreeDesignsPanel from '@/components/customizer/FreeDesignsPanel';
import PremiumDesignsPanel from '@/components/customizer/PremiumDesignsPanel';
import VariantSelector from '@/components/customizer/VariantSelector';
import AiAssistant from '@/components/customizer/AiAssistant';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';


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
  price?: number;
  embroideryAdditionalFee?: number;
  printAdditionalFee?: number;
  boundaryBoxes: BoundaryBox[];
}

interface ColorGroupOptionsForCustomizer {
  selectedVariationIds: string[];
  views?: ProductView[]; // Views are now optional within the color group
}

export interface ProductForCustomizer {
  id: string;
  name: string;
  basePrice: number;
  views: ProductView[];
  type?: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify' | 'customizer-studio';
  allowCustomization?: boolean;
  customizationTechniques?: CustomizationTechnique[];
  nativeVariations?: NativeProductVariation[];
  nativeAttributes?: { name: string, options: string[] }[];
  meta?: {
    proxyUsed?: boolean;
    configUserIdUsed?: string | null;
    source: 'woocommerce' | 'shopify' | 'customizer-studio';
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
      price: 0,
      boundaryBoxes: [
        { id: 'fallback_area_1', name: 'Default Area', x: 25, y: 25, width: 50, height: 50 },
      ],
    }
  ],
  type: 'simple',
  allowCustomization: true,
  meta: { proxyUsed: false, configUserIdUsed: null, source: 'woocommerce' },
};

const toolItems: CustomizerTool[] = [
  { id: "layers", label: "Layers", icon: Layers },
  { id: "ai-assistant", label: "AI Assistant", icon: Sparkles },
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
    console.warn(`loadProductOptionsFromFirestore: ${message}`);
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
    console.error(`loadProductOptionsFromFirestore: Error loading product options from Firestore for user/config ${userIdForOptions}, product ${firestoreDocId}:`, error);
    return { error: detailedError };
  }
}


function CustomizerLayoutAndLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewMode = useMemo(() => searchParams.get('viewMode'), [searchParams]);
  const isEmbedded = useMemo(() => viewMode === 'embedded', [viewMode]);
  const productIdFromUrl = useMemo(() => searchParams.get('productId'), [searchParams]);
  const editCartItemId = useMemo(() => searchParams.get('editCartItemId'), [searchParams]);
  const storeIdFromUrl = useMemo(() => searchParams.get('storeId'), [searchParams]);
  const sourceFromUrl = useMemo(() => {
    const sourceParam = searchParams.get('source');
    if (sourceParam === 'shopify' || sourceParam === 'woocommerce' || sourceParam === 'customizer-studio') {
      return sourceParam as 'shopify' | 'woocommerce' | 'customizer-studio';
    }
    // Fallback logic if source is missing, which can happen in some navigation scenarios.
    if (productIdFromUrl && productIdFromUrl.startsWith('gid://shopify/Product/')) {
      return 'shopify';
    }
    if (productIdFromUrl && productIdFromUrl.startsWith('cs_')) {
      return 'customizer-studio';
    }
    return 'woocommerce'; // Default if no other clues are present.
  }, [searchParams, productIdFromUrl]);
  const wpApiBaseUrlFromUrl = useMemo(() => searchParams.get('wpApiBaseUrl'), [searchParams]);
  const configUserIdFromUrl = useMemo(() => searchParams.get('configUserId'), [searchParams]);
  const basePriceFromUrl = useMemo(() => searchParams.get('basePrice'), [searchParams]);

  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { canvasImages, canvasTexts, canvasShapes, restoreFromSnapshot } = useUploads();

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
  const [selectedTechnique, setSelectedTechnique] = useState<CustomizationTechnique | null>(null);

  const [loadedOptionsByColor, setLoadedOptionsByColor] = useState<Record<string, ColorGroupOptionsForCustomizer> | null>(null);
  const [loadedGroupingAttributeName, setLoadedGroupingAttributeName] = useState<string | null>(null);
  const [viewBaseImages, setViewBaseImages] = useState<Record<string, {url: string, aiHint?: string}>>({});
  const [totalCustomizationPrice, setTotalCustomizationPrice] = useState<number>(0);

  const [hasCanvasElements, setHasCanvasElements] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [onConfirmLeaveAction, setOnConfirmLeaveAction] = useState<(() => void) | null>(null);

  const lastLoadedProductIdRef = useRef<string | null | undefined>(undefined);
  const lastLoadedProxyUrlRef = useRef<string | null | undefined>(undefined);
  const lastLoadedConfigUserIdRef = useRef<string | null | undefined>(undefined);
  const designCanvasWrapperRef = useRef<HTMLDivElement>(null);


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


  const loadCustomizerData = useCallback(async (productIdToLoad: string | null, source: 'woocommerce' | 'shopify' | 'customizer-studio', wpApiBaseUrlToUse: string | null, configUserIdToUse: string | null) => {
    setIsLoading(true);
    setError(null);
    setActiveViewId(null);
    setProductVariations(null); setConfigurableAttributes(null);
    setSelectedVariationOptions({}); setViewBaseImages({}); setLoadedOptionsByColor(null);
    setLoadedGroupingAttributeName(null); setTotalCustomizationPrice(0);
    setSelectedTechnique(null);
    
    const metaForProduct = { proxyUsed: !!wpApiBaseUrlToUse, configUserIdUsed: configUserIdToUse, source };

    if (!productIdToLoad) {
      setError("No product ID provided. Displaying default customizer.");
      const defaultViews = defaultFallbackProduct.views;
      const baseImagesMap: Record<string, {url: string, aiHint?: string}> = {};
      defaultViews.forEach(view => { baseImagesMap[view.id] = { url: view.imageUrl, aiHint: view.aiHint }; });
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
    let baseProductDetails: { id: string; name: string; type: ProductForCustomizer['type']; basePrice: number; customizationTechniques?: CustomizationTechnique[] };
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
    } else if (source === 'woocommerce') {
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
    } else { // 'customizer-studio'
        if (!userIdForFirestoreOptions) { setError("User not available for native product."); setIsLoading(false); return; }
        try {
            const productDocRef = doc(db, `users/${userIdForFirestoreOptions}/products`, productIdToLoad);
            const productDocSnap = await getDoc(productDocRef);
            if (!productDocSnap.exists()) {
              throw new Error(`Failed to fetch product ${productIdToLoad}. Status: 404.`);
            }
            const nativeProduct = productDocSnap.data() as NativeProduct;
            baseProductDetails = {
                id: productIdToLoad,
                name: nativeProduct.name,
                type: 'simple', // Will be overridden by options if available
                basePrice: 0, // Will be overridden by options
                customizationTechniques: nativeProduct.customizationTechniques
            };
        } catch (e: any) {
            setError(`${e.message}. Displaying default.`);
            setProductDetails(defaultFallbackProduct); setIsLoading(false); return;
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
    
    let finalDefaultViews = firestoreOptions?.defaultViews || [];
    if (finalDefaultViews.length === 0) {
        let defaultImageUrl: string = 'https://placehold.co/700x700.png'; // Default placeholder
        try {
          if (source === 'shopify' && userIdForFirestoreOptions) {
              const credDoc = await getDoc(doc(db, 'userShopifyCredentials', userIdForFirestoreOptions));
              if (credDoc.exists()) {
                const creds = credDoc.data();
                if (creds?.shop && creds.accessToken) {
                    const { product } = await fetchShopifyProductById(creds.shop, creds.accessToken, baseProductDetails.id);
                    defaultImageUrl = product?.featuredImage?.url || defaultImageUrl;
                }
              }
          }
        } catch (e) {
            console.warn("Could not fetch featured Shopify image for default view.", e);
        }
        
        finalDefaultViews = [{
            id: `default_view_${baseProductDetails.id}`, name: "Front View",
            imageUrl: defaultImageUrl,
            aiHint: defaultFallbackProduct.views[0].aiHint,
            boundaryBoxes: defaultFallbackProduct.views[0].boundaryBoxes,
            price: 0,
        }];
        if (!isEmbedded) toast({ title: "No Saved Settings", description: "Using default view for this product.", variant: "default" });
    }

    if (source === 'customizer-studio' && firestoreOptions) {
        baseProductDetails.type = firestoreOptions.type;
        baseProductDetails.basePrice = basePriceFromUrl ? parseFloat(basePriceFromUrl) : firestoreOptions.price;
    } else if (firestoreOptions?.price) {
        baseProductDetails.basePrice = basePriceFromUrl ? parseFloat(basePriceFromUrl) : firestoreOptions.price;
    } else if (basePriceFromUrl) {
        baseProductDetails.basePrice = parseFloat(basePriceFromUrl);
    }

    setLoadedOptionsByColor(firestoreOptions?.optionsByColor || {});
    setLoadedGroupingAttributeName(firestoreOptions?.groupingAttributeName || null);

    const baseImagesMapFinal: Record<string, {url: string, aiHint?: string}> = {};
    finalDefaultViews.forEach(view => { baseImagesMapFinal[view.id] = { url: view.imageUrl, aiHint: view.aiHint }; });
    setViewBaseImages(baseImagesMapFinal);
    
    const productWithViews: ProductForCustomizer = {
      ...baseProductDetails,
      views: finalDefaultViews,
      allowCustomization: true,
      nativeVariations: firestoreOptions?.nativeVariations,
      meta: metaForProduct,
      customizationTechniques: baseProductDetails.customizationTechniques
    };

    if (productWithViews.customizationTechniques && productWithViews.customizationTechniques.length > 0) {
        setSelectedTechnique(productWithViews.customizationTechniques[0]);
    }

    if (source === 'customizer-studio' && firestoreOptions?.nativeAttributes) {
        const nativeAttrs: ConfigurableAttribute[] = [];
        if (firestoreOptions.nativeAttributes.colors.length > 0) {
            nativeAttrs.push({ name: 'Color', options: firestoreOptions.nativeAttributes.colors.map(c => c.name) });
        }
        if (firestoreOptions.nativeAttributes.sizes.length > 0) {
            nativeAttrs.push({ name: 'Size', options: firestoreOptions.nativeAttributes.sizes.map(s => s.name) });
        }
        setConfigurableAttributes(nativeAttrs);
        if(nativeAttrs.length > 0) {
            const initialSelectedOptions: Record<string, string> = {};
            nativeAttrs.forEach(attr => { if (attr.options.length > 0) initialSelectedOptions[attr.name] = attr.options[0]; });
            setSelectedVariationOptions(initialSelectedOptions);
        }
    }
    
    setProductDetails(productWithViews);
    // Explicitly set the active view after loading everything
    if (finalDefaultViews.length > 0) {
      setActiveViewId(finalDefaultViews[0].id);
    }


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

    if (editCartItemId && (configUserIdToUse || user?.uid)) {
        const cartKey = `cs_cart_${configUserIdToUse || user?.uid}`;
        try {
            const cartData = JSON.parse(localStorage.getItem(cartKey) || '[]');
            const itemToEdit = cartData.find((item: any) => item.id === editCartItemId);
            if (itemToEdit?.customizationDetails?.viewData) {
                const images: CanvasImage[] = [];
                const texts: CanvasText[] = [];
                const shapes: CanvasShape[] = [];

                itemToEdit.customizationDetails.viewData.forEach((view: any) => {
                    images.push(...(view.images || []));
                    texts.push(...(view.texts || []));
                    shapes.push(...(view.shapes || []));
                });
                
                restoreFromSnapshot({ images, texts, shapes });
                setSelectedVariationOptions(itemToEdit.customizationDetails.selectedOptions || {});
                toast({ title: "Design Loaded", description: "Your saved design is ready for editing." });
            }
        } catch (e) {
            console.error("Failed to load cart item for editing:", e);
            toast({ title: "Load Error", description: "Could not load the design from your cart.", variant: "destructive" });
        }
    }
    
    setIsLoading(false);
  }, [user?.uid, authLoading, toast, isEmbedded, router, editCartItemId, restoreFromSnapshot, basePriceFromUrl]);


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
        if (!prevProductDetails) return null;

        let matchingVariationPrice: number | null = null;
        let finalViews = prevProductDetails.views;

        // Determine which variation is selected
        const isVariable = prevProductDetails.type === 'variable' || (prevProductDetails.nativeVariations && prevProductDetails.nativeVariations.length > 0);
        let matchingNativeVariation: NativeProductVariation | undefined;
        let matchingWcVariation: WCVariation | undefined;

        if (isVariable) {
            if (prevProductDetails.source === 'customizer-studio' && prevProductDetails.nativeVariations) {
                matchingNativeVariation = prevProductDetails.nativeVariations.find(v => 
                    Object.entries(selectedVariationOptions).every(([key, value]) => v.attributes[key] === value)
                );
                if (matchingNativeVariation) {
                    matchingVariationPrice = matchingNativeVariation.price;
                }
            } else if (prevProductDetails.source === 'woocommerce' && productVariations) {
                matchingWcVariation = productVariations.find(variation => 
                    variation.attributes.every(attr => selectedVariationOptions[attr.name] === attr.option)
                );
                if (matchingWcVariation) {
                    matchingVariationPrice = parseFloat(matchingWcVariation.price || '0');
                }
            }
        }
        
        // Determine which views to display based on selected color
        const colorKey = loadedGroupingAttributeName ? selectedVariationOptions[loadedGroupingAttributeName] : null;
        const colorSpecificViews = colorKey && loadedOptionsByColor?.[colorKey]?.views;

        if (colorSpecificViews && colorSpecificViews.length > 0) {
            finalViews = colorSpecificViews;
        } else if (matchingWcVariation?.image?.src) {
             // For WC, if there's a variation image but no override views, create a temporary view
             finalViews = [{
                 id: `wc_variation_view_${matchingWcVariation.id}`,
                 name: matchingWcVariation.attributes.map(a => a.option).join(' '),
                 imageUrl: matchingWcVariation.image.src,
                 aiHint: matchingWcVariation.image.alt || 'product variation',
                 boundaryBoxes: prevProductDetails.views[0]?.boundaryBoxes || [], // Fallback to first default boundary
                 price: 0,
             }];
        } else {
             // Fallback to the base views from the initial load
             finalViews = Object.entries(viewBaseImages).map(([id, base], index) => ({
                id,
                name: prevProductDetails.views.find(v => v.id === id)?.name || `View ${index + 1}`,
                imageUrl: base.url,
                aiHint: base.aiHint,
                price: prevProductDetails.views.find(v => v.id === id)?.price,
                embroideryAdditionalFee: prevProductDetails.views.find(v => v.id === id)?.embroideryAdditionalFee,
                printAdditionalFee: prevProductDetails.views.find(v => v.id === id)?.printAdditionalFee,
                boundaryBoxes: prevProductDetails.views.find(v => v.id === id)?.boundaryBoxes || [],
            }));
        }

        const newBasePrice = matchingVariationPrice !== null ? matchingVariationPrice : prevProductDetails.basePrice;

        const activeViewStillExists = finalViews.some(v => v.id === activeViewId);
        if (!activeViewStillExists) {
            setActiveViewId(finalViews[0]?.id || null);
        }

        // Only update state if something has actually changed
        if (JSON.stringify(prevProductDetails.views) !== JSON.stringify(finalViews) || prevProductDetails.basePrice !== newBasePrice) {
            return { ...prevProductDetails, views: finalViews, basePrice: newBasePrice };
        }

        return prevProductDetails;
    });
}, [
    selectedVariationOptions, productVariations, viewBaseImages,
    loadedOptionsByColor, loadedGroupingAttributeName, activeViewId
]);


  useEffect(() => {
    const usedViewIdsWithElements = new Set<string>();
    canvasImages.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    canvasTexts.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    canvasShapes.forEach(item => { if (item.viewId) usedViewIdsWithElements.add(item.viewId); });
    const viewsToPrice = new Set<string>(usedViewIdsWithElements);
    
    let viewSurcharges = 0;
    if (productDetails?.views) {
      viewsToPrice.forEach(viewId => {
        const view = productDetails.views.find(v => v.id === viewId);
        if (view) {
          if (selectedTechnique === 'Embroidery') {
            viewSurcharges += view.embroideryAdditionalFee ?? view.price ?? 0;
          } else {
            viewSurcharges += view.printAdditionalFee ?? view.price ?? 0;
          }
        }
      });
    }

    const basePrice = productDetails?.basePrice ?? 0;
    setTotalCustomizationPrice(basePrice + viewSurcharges);
  }, [canvasImages, canvasTexts, canvasShapes, productDetails?.views, productDetails?.basePrice, activeViewId, selectedTechnique]);

  const getToolPanelTitle = (toolId: string): string => {
    const tool = toolItems.find(item => item.id === toolId);
    return tool ? tool.label : "Design Tool";
  };
  
  const getToolPanelContent = () => {
     if (!activeViewId && (activeTool !== "layers" && activeTool !== "ai-assistant")) {
       return (
         <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
           <SettingsIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
           <h3 className="text-lg font-semibold mb-1">Select a View</h3>
           <p className="text-sm">Please select a product view before adding elements.</p>
         </div>
       );
    }
    switch (activeTool) {
      case "layers": return <LayersPanel activeViewId={activeViewId} />;
      case "ai-assistant": return <AiAssistant activeViewId={activeViewId} />;
      case "uploads": return <UploadArea activeViewId={activeViewId} configUserId={productDetails?.meta?.configUserIdUsed || user?.uid} />;
      case "text": return <TextToolPanel activeViewId={activeViewId} />;
      case "shapes": return <ShapesPanel activeViewId={activeViewId} />;
      case "clipart": return <ClipartPanel activeViewId={activeViewId} />;
      case "free-designs": return <FreeDesignsPanel activeViewId={activeViewId} />;
      case "premium-designs": return <PremiumDesignsPanel activeViewId={activeViewId} />;
      default:
        return (
          <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
            <SettingsIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-1">{getToolPanelTitle(activeTool)}</h3>
            <p className="text-sm">Tool panel not yet implemented.</p>
          </div>
        );
    }
  };

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const handleAddToCart = async () => {
    if (productDetails?.allowCustomization === false || isAddingToCart) { return; }
    if (canvasImages.length === 0 && canvasTexts.length === 0 && canvasShapes.length === 0) {
        toast({ title: "Empty Design", description: "Please add some design elements to the canvas before adding to cart.", variant: "default" });
        return;
    }
    if (!isEmbedded && !user && hasCanvasElements) {
        toast({ title: "Please Sign In", description: "Sign in to save your design and add to cart.", variant: "default" });
        return;
    }

    setIsAddingToCart(true);
    toast({ title: "Preparing Your Design...", description: "Generating previews of your custom product. This can take a moment." });
    
    // This is the robust image fetcher using the server-side proxy
    const fetchAsDataURL = async (url: string, cache: Map<string, string>): Promise<string> => {
        if (cache.has(url)) {
            return cache.get(url)!;
        }
        if (url.startsWith('data:')) {
            return url;
        }
        try {
            const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Proxy failed for ${url} with status ${response.status}`);
            }
            const data = await response.json();
            if (data.dataUrl) {
                cache.set(url, data.dataUrl);
                return data.dataUrl;
            } else {
                throw new Error(`Proxy did not return a dataUrl for: ${url}`);
            }
        } catch (e: any) {
            console.error(`Could not load and process image via proxy: ${url}. Error: ${e.message}`, e);
            throw e; 
        }
    };
    
    const imageCache = new Map<string, string>();
    
    try {
        const customizedViewIds = new Set<string>();
        [...canvasImages, ...canvasTexts, ...canvasShapes].forEach(item => {
            if (item.viewId) customizedViewIds.add(item.viewId);
        });

        if (customizedViewIds.size === 0) {
            throw new Error("No customizations found on any view.");
        }

        const previewImageUrls: { viewId: string; viewName: string; url: string; }[] = [];
        
        for (const viewId of Array.from(customizedViewIds)) {
            const view = productDetails?.views.find(v => v.id === viewId);
            if (!view) continue;

            const previewContainer = document.createElement('div');
            previewContainer.style.position = 'absolute';
            previewContainer.style.left = '-9999px';
            previewContainer.style.width = '600px'; 
            previewContainer.style.height = '600px';
            previewContainer.style.backgroundColor = 'white'; 
            document.body.appendChild(previewContainer);

            try {
                const backgroundDataUrl = await fetchAsDataURL(view.imageUrl, imageCache);
                const bgImage = document.createElement('img');
                bgImage.src = backgroundDataUrl;
                bgImage.style.position = 'absolute';
                bgImage.style.width = '100%';
                bgImage.style.height = '100%';
                bgImage.style.objectFit = 'contain';
                previewContainer.appendChild(bgImage);
            } catch (bgError) {
                console.error(`Failed to load background for view: ${view.name}`, bgError);
                // The container will just have a white background, but the process continues.
            }
            
            const overlayItems = [
                ...canvasImages.filter(i => i.viewId === viewId),
                ...canvasTexts.filter(t => t.viewId === viewId),
                ...canvasShapes.filter(s => s.viewId === viewId),
            ].sort((a, b) => a.zIndex - b.zIndex);

            // Pre-fetch all overlay images for this view to populate the cache
            const overlayImageUrls = canvasImages.filter(i => i.viewId === viewId).map(i => i.dataUrl);
            await Promise.all(
              overlayImageUrls.map(url => fetchAsDataURL(url, imageCache).catch(e => {
                console.warn(`Could not preload overlay image for preview: ${url}. It will be skipped.`, e);
              }))
            );

            for (const item of overlayItems) {
                const el = document.createElement('div');
                el.style.position = 'absolute';
                el.style.left = `${item.x}%`;
                el.style.top = `${item.y}%`;
                el.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg)`;
                
                if (item.itemType === 'image') {
                    const imgDataUrl = imageCache.get(item.dataUrl);
                    if (imgDataUrl) {
                        const imgEl = document.createElement('img');
                        imgEl.src = imgDataUrl;
                        imgEl.style.width = `${200 * item.scale}px`;
                        imgEl.style.height = `${200 * item.scale}px`;
                        imgEl.style.objectFit = 'contain';
                        el.appendChild(imgEl);
                    }
                } else if (item.itemType === 'text') {
                    el.style.fontFamily = item.fontFamily;
                    el.style.fontSize = `${item.fontSize * item.scale}px`;
                    el.style.color = item.color;
                    el.style.fontWeight = item.fontWeight;
                    el.style.fontStyle = item.fontStyle;
                    el.style.whiteSpace = 'pre-wrap';
                    el.innerText = item.content;
                    if (item.outlineEnabled && item.outlineWidth > 0) {
                        el.style.webkitTextStroke = `${item.outlineWidth}px ${item.outlineColor}`;
                    }
                } else if (item.itemType === 'shape') {
                     const svgNS = "http://www.w3.org/2000/svg";
                     const svg = document.createElementNS(svgNS, "svg");
                     svg.style.width = `${item.width * item.scale}px`;
                     svg.style.height = `${item.height * item.scale}px`;
                     svg.setAttribute("viewBox", `0 0 ${item.width} ${item.height}`);

                     let shapeEl;
                     if(item.shapeType === 'rectangle') {
                         shapeEl = document.createElementNS(svgNS, "rect");
                         shapeEl.setAttribute('width', '100%');
                         shapeEl.setAttribute('height', '100%');
                     } else { // circle
                         shapeEl = document.createElementNS(svgNS, "circle");
                         shapeEl.setAttribute('cx', `${item.width/2}`);
                         shapeEl.setAttribute('cy', `${item.height/2}`);
                         shapeEl.setAttribute('r', `${item.width/2}`);
                     }
                     shapeEl.setAttribute('fill', item.color);
                     shapeEl.setAttribute('stroke', item.strokeColor);
                     shapeEl.setAttribute('stroke-width', String(item.strokeWidth));
                     svg.appendChild(shapeEl);
                     el.appendChild(svg);
                }
                previewContainer.appendChild(el);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(previewContainer, { cacheBust: true, pixelRatio: 1.5 });
            previewImageUrls.push({
                viewId: view.id,
                viewName: view.name,
                url: dataUrl
            });
            
            document.body.removeChild(previewContainer);
        }

      const customizedViewsData = (productDetails?.views || [])
        .map(view => ({
            viewId: view.id,
            viewName: view.name,
            viewImageUrl: view.imageUrl,
            images: canvasImages.filter(item => item.viewId === view.id),
            texts: canvasTexts.filter(item => item.viewId === view.id),
            shapes: canvasShapes.filter(item => item.viewId === view.id),
        }))
        .filter(view => view.images.length > 0 || view.texts.length > 0 || view.shapes.length > 0);

      const designData = {
          productId: productIdFromUrl || productDetails?.id,
          variationId: productVariations?.find(v => v.attributes.every(attr => selectedVariationOptions[attr.name] === attr.option))?.id.toString() || null,
          quantity: 1,
          productName: productDetails?.name || 'Custom Product',
          customizationDetails: {
            viewData: customizedViewsData,
            selectedOptions: selectedVariationOptions,
            baseProductPrice: productDetails?.basePrice ?? 0,
            totalCustomizationPrice: totalCustomizationPrice,
          },
          userId: user?.uid || null,
          configUserId: productDetails?.meta?.configUserIdUsed || null,
        };
      
      const isNativeStore = sourceFromUrl === 'customizer-studio';

      if (isEmbedded) {
        let targetOrigin = '*';
        if (document.referrer) {
          try { targetOrigin = new URL(document.referrer).origin; }
          catch (e) { console.warn("Could not parse document.referrer for targetOrigin. Defaulting to '*'. Parent site MUST validate event.origin.", e); }
        } else {
          console.warn("document.referrer is empty, but app is in an iframe. Defaulting to targetOrigin '*' for postMessage. Parent site MUST validate event.origin.");
        }
        window.parent.postMessage({ customizerStudioDesignData: designData }, targetOrigin);
        toast({ title: "Design Sent!", description: `Your design details have been sent to the parent site.` });
      } else if (isNativeStore && storeIdFromUrl) {
        const cartKey = `cs_cart_${storeIdFromUrl}`;
        try {
          let currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
          const newCartItem = {
            id: editCartItemId || crypto.randomUUID(), 
            productId: designData.productId,
            variationId: designData.variationId,
            quantity: 1,
            productName: designData.productName,
            totalCustomizationPrice: designData.customizationDetails.totalCustomizationPrice,
            previewImageUrls: previewImageUrls, 
            customizationDetails: designData.customizationDetails,
          };
          
          if (editCartItemId) {
            currentCart = currentCart.map((item: any) => item.id === editCartItemId ? newCartItem : item);
            toast({ title: "Cart Updated!", description: "Your custom product has been updated in your cart." });
          } else {
            currentCart.push(newCartItem);
            toast({ title: "Added to Cart!", description: "Your custom product has been added to your cart." });
          }

          localStorage.setItem(cartKey, JSON.stringify(currentCart));
          window.dispatchEvent(new CustomEvent('cartUpdated'));
          router.push(`/store/${storeIdFromUrl}/cart`);
        } catch (e: any) {
          console.error("Error saving to local cart:", e);
          let errorDescription = "Could not add item to local cart.";
          if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
            errorDescription = "Could not save to cart because storage is full. Please try removing some items or clearing your browser's local storage for this site.";
          }
          toast({ title: "Error", description: errorDescription, variant: "destructive" });
        }
      } else {
          toast({ title: "Add to Cart Clicked (Standalone)", description: "This action would normally send data to a store. Design data logged to console.", variant: "default"});
          console.log("Add to Cart - Design Data:", designData);
          console.log("Previews:", previewImageUrls);
      }
    } catch (err: any) {
        console.error("Error during 'Add to Cart' process:", err);
        toast({ title: "Add to Cart Failed", description: err.message || "An unknown error occurred during preview generation.", variant: "destructive" });
    } finally {
        setIsAddingToCart(false);
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
  
  const isNativeStoreContext = sourceFromUrl === 'customizer-studio';
  const pdpLink = isNativeStoreContext && storeIdFromUrl && productIdFromUrl
    ? `/store/${storeIdFromUrl}/shop/${productIdFromUrl}`
    : `/dashboard`;

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
               {getToolPanelContent()}
            </div>
          </div>
          <Button onClick={toggleToolPanel} variant="outline" size="icon" className={cn("absolute top-1/2 -translate-y-1/2 z-30 h-12 w-8 rounded-l-none border-l-0 shadow-md bg-card hover:bg-accent/20", "transition-all duration-300 ease-in-out", isToolPanelOpen ? "left-[calc(theme(spacing.16)_+_theme(spacing.72))] md:left-[calc(theme(spacing.16)_+_theme(spacing.80))]" : "left-16")} aria-label={isToolPanelOpen ? "Collapse tool panel" : "Expand tool panel"} aria-expanded={isToolPanelOpen} aria-controls="tool-panel-content">
            {isToolPanelOpen ? <PanelLeftClose className="h-5 w-5"/> : <PanelRightOpen className="h-5 w-5"/>}
          </Button>

          <main className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
            {error && productDetails?.id === defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
             {error && productDetails && productDetails.id !== defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
             <div ref={designCanvasWrapperRef} className="w-full flex flex-col flex-1 min-h-0 pb-4">
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
            configurableAttributes={configurableAttributes}
            selectedVariationOptions={selectedVariationOptions}
            onVariantOptionSelect={handleVariantOptionSelect} 
            productVariations={productDetails?.source === 'woocommerce' ? productVariations : null}
            selectedTechnique={selectedTechnique}
            setSelectedTechnique={setSelectedTechnique}
          />
        </div>

        <footer className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card shadow-md px-4 py-2 flex items-center justify-between gap-4 z-40">
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild className="hover:bg-accent/20">
                    <Link href={pdpLink}>
                       <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Product
                    </Link>
                </Button>
                <div className="text-md font-medium text-muted-foreground truncate hidden md:block" title={currentProductName}> {currentProductName} </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-foreground hidden sm:block">Total: ${totalCustomizationPrice.toFixed(2)}</div>
                {isNativeStoreContext && storeIdFromUrl && (
                    <Button variant="outline" size="sm" asChild>
                    <Link href={`/store/${storeIdFromUrl}/cart`}>
                        <ShoppingCart className="mr-0 sm:mr-2 h-5 w-5" />
                        <span className="hidden sm:inline">View Cart</span>
                    </Link>
                    </Button>
                )}
                <Button size="default" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddToCart} disabled={productDetails?.allowCustomization === false || isAddingToCart}> 
                    {isAddingToCart ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (productDetails?.allowCustomization === false ? <Ban className="mr-2 h-5 w-5" /> : <ShoppingCart className="mr-2 h-5 w-5" />)}
                    {isAddingToCart ? "Processing..." : (editCartItemId ? "Update Cart Item" : "Add to Cart")}
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
