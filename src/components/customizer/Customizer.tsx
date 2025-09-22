
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape, type ImageTransform } from "@/contexts/UploadContext";
import type { ProductView, ProductVariation, WooCommerceVariation } from '@/types/customization';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import Konva from 'konva';
import type { BaseProduct, ProductForCustomizer } from '@/types/product-types';
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import type { ProductOptionsFirestoreData, NativeProductVariation, BoundaryBox } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { uploadString, ref as storageRef, getDownloadURL } from 'firebase/storage';
import dynamic from 'next/dynamic';


import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import {
  Loader2, AlertTriangle, ShoppingCart, UploadCloud, Layers, Type, Shapes as ShapesIconLucide, Smile, Palette, Gem as GemIcon, Settings2 as SettingsIcon,
  PanelLeftClose, PanelRightOpen, PanelRightClose, PanelLeftOpen, Ban, ArrowLeft
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
import type { WCCustomProduct, WCVariation } from '@/types/woocommerce';
import { useToast } from '@/hooks/use-toast';
import CustomizerIconNav, { type CustomizerTool } from '@/components/customizer/CustomizerIconNav';
import { cn } from '@/lib/utils';
import Image from 'next/image';

import UploadArea from '@/components/customizer/UploadArea';
import LayersPanel from '@/components/customizer/LayersPanel';
import TextToolPanel from '@/components/customizer/TextToolPanel';
import ShapesPanel from '@/components/customizer/ShapesPanel';
import ClipartPanel from '@/components/customizer/ClipartPanel';
import FreeDesignsPanel from '@/components/customizer/FreeDesignsPanel';
import PremiumDesignsPanel from '@/components/customizer/PremiumDesignsPanel';
import VariantSelector from '@/components/customizer/VariantSelector';
import RightPanel from '@/components/customizer/RightPanel';
import type { IRect } from 'konva/lib/types';
import TransformToolbar from '@/components/customizer/TransformToolbar';


const DesignCanvas = dynamic(() => import('@/components/customizer/DesignCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});


// --- Main Customizer Component ---

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
      embroideryAdditionalFee: 0,
      printAdditionalFee: 0,
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
    console.error(`loadProductOptionsFromFirestore: Error loading product options from Firestore for user/config ${userIdForOptions}, product ${firestoreDocId}:`, error);
    return { error: detailedError };
  }
}

// Function to proxy image URL and get a data URI
async function proxyImageUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) {
    return url;
  }
  try {
    const response = await fetch('/api/proxy-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      console.error(`Proxy failed for ${url}. Status: ${response.status}`);
      return url; // Fallback to original URL on error
    }
    const { dataUrl } = await response.json();
    return dataUrl;
  } catch (error) {
    console.error(`Error proxying image URL ${url}:`, error);
    return url; // Fallback to original URL on error
  }
}

export function Customizer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    if (productIdFromUrl && productIdFromUrl.startsWith('gid://shopify/Product/')) {
      return 'shopify';
    }
    if (productIdFromUrl && productIdFromUrl.startsWith('cs_')) {
      return 'customizer-studio';
    }
    return 'woocommerce'; 
  }, [searchParams, productIdFromUrl]);
  const wpApiBaseUrlFromUrl = useMemo(() => searchParams.get('wpApiBaseUrl'), [searchParams]);
  const configUserIdFromUrl = useMemo(() => searchParams.get('configUserId'), [searchParams]);
  const basePriceFromUrl = useMemo(() => searchParams.get('basePrice'), [searchParams]);

  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { 
    canvasImages, 
    selectedCanvasImageId, 
    canvasTexts, 
    selectedCanvasTextId, 
    canvasShapes, 
    selectedCanvasShapeId,
    restoreFromSnapshot, 
    getStageRef 
  } = useUploads();

  const [productDetails, setProductDetails] = useState<ProductForCustomizer | null>(null);
  
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [onConfirmLeaveAction, setOnConfirmLeaveAction] = useState<(() => void) | null>(null);

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

  const lastLoadedProductIdRef = useRef<string | null | undefined>(undefined);
  const lastLoadedProxyUrlRef = useRef<string | null | undefined>(undefined);
  const lastLoadedConfigUserIdRef = useRef<string | null | undefined>(undefined);

  const [pixelBoundaryBoxes, setPixelBoundaryBoxes] = useState<IRect[]>([]);
  const [stageDimensions, setStageDimensions] = useState<{ width: number, height: number, x: number, y: number } | null>(null);


  const handleViewChange = useCallback((newViewId: string) => {
    setActiveViewId(newViewId);
  }, []);

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


  const toggleGrid = useCallback(() => setShowGrid((prev: boolean) => !prev), []);
  const toggleBoundaryBoxes = useCallback(() => setShowBoundaryBoxes((prev: boolean) => !prev), []);
  const toggleToolPanel = useCallback(() => setIsToolPanelOpen((prev: boolean) => !prev), []);
  const toggleRightSidebar = useCallback(() => setIsRightSidebarOpen((prev: boolean) => !prev), []);

  const handleVariantOptionSelect = useCallback((attributeName: string, optionValue: string) => {
    setSelectedVariationOptions((prev: Record<string, string>) => ({ ...prev, [attributeName]: optionValue }));
  }, []);


  const loadCustomizerData = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      setActiveViewId(null);
      setProductVariations(null); setConfigurableAttributes(null);
      setSelectedVariationOptions({}); setViewBaseImages({}); setLoadedOptionsByColor(null);
      setLoadedGroupingAttributeName(null); setTotalCustomizationPrice(0);
      setSelectedTechnique(null);
      
      const metaForProduct = { proxyUsed: !!wpApiBaseUrlFromUrl, configUserIdUsed: configUserIdFromUrl, source: sourceFromUrl };

      if (!productIdFromUrl) {
          setError("No product ID provided. Displaying default customizer.");
          setProductDetails({...defaultFallbackProduct, meta: metaForProduct});
          setActiveViewId(defaultFallbackProduct.views[0]?.id || null);
          setIsLoading(false);
          return;
      }

      const userIdForFirestoreOptions = configUserIdFromUrl || user?.uid;
      let baseProductDetails: { id: string; name: string; type: ProductForCustomizer['type']; basePrice: number; customizationTechniques?: CustomizationTechnique[] };
      let fetchedVariations: WCVariation[] | null = null;
      
      if (!userIdForFirestoreOptions && !wpApiBaseUrlFromUrl) {
           setError("Cannot load product without user credentials or a proxy URL.");
           setIsLoading(false);
           return;
      }

      try {
          if (sourceFromUrl === 'shopify') {
              if (!userIdForFirestoreOptions) throw new Error("User credentials required for Shopify.");
              const credDocRef = doc(db, 'userShopifyCredentials', userIdForFirestoreOptions);
              const credDocSnap = await getDoc(credDocRef);
              if (!credDocSnap.exists()) throw new Error("Shopify store not connected.");
              const creds = credDocSnap.data() as UserShopifyCredentials;
              const { product, error } = await fetchShopifyProductById(creds.shop, creds.accessToken, productIdFromUrl);
              if (error || !product) throw new Error(error || `Shopify product not found.`);
              baseProductDetails = {
                  id: product.id, name: product.title, type: 'shopify',
                  basePrice: parseFloat(product.priceRangeV2?.minVariantPrice.amount || '0'),
              };
          } else if (sourceFromUrl === 'woocommerce') {
              let userWCCredentialsToUse: WooCommerceCredentials | undefined;
              if (user?.uid && !wpApiBaseUrlFromUrl && (!configUserIdFromUrl || !isEmbedded)) {
                  const credDocRef = doc(db, 'userWooCommerceCredentials', user.uid);
                  const credDocSnap = await getDoc(credDocRef);
                  if (credDocSnap.exists()) {
                      const credData = credDocSnap.data() as UserWooCommerceCredentials;
                      userWCCredentialsToUse = { storeUrl: credData.storeUrl, consumerKey: credData.consumerKey, consumerSecret: credData.consumerSecret };
                  }
              }
              
              const wcProductId = productIdFromUrl.split('/').pop() || productIdFromUrl;
              const { product: wcProduct, error: fetchError } = await fetchWooCommerceProductById(wcProductId, userWCCredentialsToUse, wpApiBaseUrlFromUrl || undefined);
              
              if (fetchError || !wcProduct) {
                throw new Error(fetchError || "Failed to load WooCommerce product.");
              }

              baseProductDetails = { id: wcProduct.id.toString(), name: wcProduct.name, type: wcProduct.type, basePrice: parseFloat(wcProduct.price || wcProduct.regular_price || '0')};

              if (wcProduct.type === 'variable') {
                  const { variations, error: variationsError } = await fetchWooCommerceProductVariations(wcProductId, userWCCredentialsToUse, wpApiBaseUrlFromUrl || undefined);
                  if (variationsError) toast({ title: "Variations Load Error", description: variationsError, variant: "destructive" });
                  else fetchedVariations = variations;
              }
          } else { // 'customizer-studio'
              if (!userIdForFirestoreOptions) throw new Error("User credentials required for native product.");
              const productDocRef = doc(db, `users/${userIdForFirestoreOptions}/products`, productIdFromUrl);
              const productDocSnap = await getDoc(productDocRef);
              if (!productDocSnap.exists()) {
                throw new Error(`Failed to fetch product ${productIdFromUrl}. Status: 404.`);
              }
              const nativeProduct = productDocSnap.data() as NativeProduct;
              baseProductDetails = {
                  id: productIdFromUrl,
                  name: nativeProduct.name,
                  type: 'simple', 
                  basePrice: 0, 
                  customizationTechniques: nativeProduct.customizationTechniques
              };
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
              const defaultImageUrl = 'https://placehold.co/700x700.png';
              finalDefaultViews = [{
                  id: `default_view_${baseProductDetails.id}`, name: "Front View",
                  imageUrl: defaultImageUrl,
                  aiHint: defaultFallbackProduct.views[0].aiHint,
                  boundaryBoxes: defaultFallbackProduct.views[0].boundaryBoxes,
                  price: 0,
              }];
              if (!isEmbedded) toast({ title: "No Saved Settings", description: "Using default view for this product.", variant: "default" });
          }

          // Proxy all view image URLs
          const proxiedViews = await Promise.all(
            finalDefaultViews.map(async (view) => ({
              ...view,
              price: view.price ?? 0,
              embroideryAdditionalFee: view.embroideryAdditionalFee ?? 0,
              printAdditionalFee: view.printAdditionalFee ?? 0,
              imageUrl: await proxyImageUrl(view.imageUrl),
            }))
          );
          
          if (sourceFromUrl === 'customizer-studio' && firestoreOptions) {
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
          proxiedViews.forEach(view => { baseImagesMapFinal[view.id] = { url: view.imageUrl, aiHint: view.aiHint }; });
          setViewBaseImages(baseImagesMapFinal);
          
          const productWithViews: ProductForCustomizer = {
            ...baseProductDetails,
            views: proxiedViews,
            allowCustomization: true,
            nativeVariations: firestoreOptions?.nativeVariations,
            meta: metaForProduct,
            customizationTechniques: baseProductDetails.customizationTechniques
          };

          if (productWithViews.customizationTechniques && productWithViews.customizationTechniques.length > 0) {
              setSelectedTechnique(productWithViews.customizationTechniques[0]);
          }

          if (sourceFromUrl === 'customizer-studio' && firestoreOptions?.nativeAttributes) {
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
          if (proxiedViews.length > 0) {
            setActiveViewId(proxiedViews[0].id);
          }

          if (sourceFromUrl === 'woocommerce' && fetchedVariations) {
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

          if (editCartItemId && userIdForFirestoreOptions) {
              const cartKey = `cs_cart_${userIdForFirestoreOptions}`;
              try {
                  const cartData = JSON.parse(localStorage.getItem(cartKey) || '[]');
                  const itemToEdit = cartData.find((item: any) => item.id === editCartItemId);
                  if (itemToEdit?.customizationDetails?.viewData) {
                      toast({ title: "Editing Mode", description: "Canvas re-population is not fully implemented." });
                  }
              } catch (e) {
                  console.error("Failed to load cart item for editing:", e);
              }
          }
          setIsLoading(false);
      } catch(e: any) {
          console.error("Error in loadCustomizerData:", e);
          setError(e.message || "An unknown error occurred while loading product data.");
          setProductDetails(defaultFallbackProduct);
          setIsLoading(false);
      }
  }, [user?.uid, authLoading, toast, isEmbedded, router, productIdFromUrl, sourceFromUrl, wpApiBaseUrlFromUrl, configUserIdFromUrl, basePriceFromUrl, editCartItemId]);

  // This effect now only triggers when the fundamental context changes.
  useEffect(() => {
      const canLoadPublicly = configUserIdFromUrl || wpApiBaseUrlFromUrl;
      const canLoadAuthed = !authLoading && user;

      if (canLoadPublicly || canLoadAuthed) {
          loadCustomizerData();
      } else if (!authLoading) {
          loadCustomizerData(); // Attempt to load fallback
      }
  }, [productIdFromUrl, sourceFromUrl, configUserIdFromUrl, wpApiBaseUrlFromUrl, user, authLoading, loadCustomizerData]);


 useEffect(() => {
    if (!productDetails) return;

    let matchingVariationPrice: number | null = null;
    let finalViews: ProductView[] = [...productDetails.views]; 

    const isVariable = productDetails.type === 'variable' || (productDetails.nativeVariations && productDetails.nativeVariations.length > 0);
    let matchingNativeVariation: NativeProductVariation | undefined;
    let matchingWcVariation: WCVariation | undefined;

    if (isVariable) {
        if (productDetails.source === 'customizer-studio' && productDetails.nativeVariations) {
            matchingNativeVariation = productDetails.nativeVariations.find((v: NativeProductVariation) => 
                Object.entries(selectedVariationOptions).every(([key, value]: [string, string]) => v.attributes[key] === value)
            );
            if (matchingNativeVariation) {
                matchingVariationPrice = matchingNativeVariation.price;
            }
        } else if (productDetails.source === 'woocommerce' && productVariations) {
            matchingWcVariation = productVariations.find((variation: WooCommerceVariation) => 
                variation.attributes.every((attr: {name: string, option: string}) => selectedVariationOptions[attr.name] === attr.option)
            );
            if (matchingWcVariation) {
                matchingVariationPrice = parseFloat(matchingWcVariation.price || '0');
            }
        }
    }
    
    const colorKey = loadedGroupingAttributeName ? selectedVariationOptions[loadedGroupingAttributeName] : null;
    const colorSpecificViews = colorKey && loadedOptionsByColor?.[colorKey]?.views;

    const processAndProxyViews = async (views: ProductView[]): Promise<ProductView[]> => {
      return Promise.all(views.map(async (view) => ({
        ...view,
        imageUrl: await proxyImageUrl(view.imageUrl),
      })));
    };

    const updateViews = async () => {
      if (colorSpecificViews && colorSpecificViews.length > 0) {
        finalViews = await processAndProxyViews(colorSpecificViews);
      } else if (matchingWcVariation?.image?.src) {
        finalViews = [{
          id: `wc_variation_view_${matchingWcVariation.id}`,
          name: matchingWcVariation.attributes.map((a: {option: string}) => a.option).join(' '),
          imageUrl: await proxyImageUrl(matchingWcVariation.image.src),
          aiHint: matchingWcVariation.image?.alt || 'product variation',
          boundaryBoxes: productDetails.views[0]?.boundaryBoxes || [],
          price: 0,
          embroideryAdditionalFee: 0,
          printAdditionalFee: 0,
        }];
      } else {
        const baseViews = Object.entries(viewBaseImages).map(([id, base]: [string, {url: string, aiHint?: string}], index) => {
          const matchingView = productDetails.views.find((v: ProductView) => v.id === id);
          return {
            id,
            name: matchingView?.name || `View ${index + 1}`,
            imageUrl: base.url, // Already proxied
            aiHint: base.aiHint,
            price: matchingView?.price || 0,
            embroideryAdditionalFee: matchingView?.embroideryAdditionalFee || 0,
            printAdditionalFee: matchingView?.printAdditionalFee || 0,
            boundaryBoxes: matchingView?.boundaryBoxes || [],
          };
        });
        finalViews = await processAndProxyViews(baseViews);
      }

      const newBasePrice = matchingVariationPrice !== null ? matchingVariationPrice : productDetails.basePrice;

      const activeViewStillExists = finalViews.some(v => v.id === activeViewId);
      let newActiveViewId = activeViewId;
      if (!activeViewStillExists) {
        newActiveViewId = finalViews[0]?.id || null;
        setActiveViewId(newActiveViewId);
      }
      
      const viewsChanged = JSON.stringify(productDetails.views) !== JSON.stringify(finalViews);
      const priceChanged = productDetails.basePrice !== newBasePrice;

      if (viewsChanged || priceChanged) {
        setProductDetails(prev => prev ? { ...prev, views: finalViews, basePrice: newBasePrice } : null);
      }
    };

    updateViews();
}, [
    selectedVariationOptions, productVariations, viewBaseImages,
    loadedOptionsByColor, loadedGroupingAttributeName, activeViewId, productDetails
]);

  // This useEffect hook recalculates the pixel boundaries whenever the active view or stage dimensions change.
  useEffect(() => {
    // 1. Check if we have the necessary data to perform calculations.
    if (!stageDimensions || !productDetails || !activeViewId) {
      setPixelBoundaryBoxes([]); // If not, clear any existing boxes.
      return;
    }

    // 2. Find the currently active view from the product details.
    const currentView = productDetails.views.find(v => v.id === activeViewId);
    if (!currentView || !currentView.boundaryBoxes) {
      setPixelBoundaryBoxes([]); // If the view has no boxes, clear any existing ones.
      return;
    }

    // 3. THE CALCULATION LOGIC:
    const newPixelBoxes = currentView.boundaryBoxes.map(box => {
      // Original width in pixels
      const baseWidth = stageDimensions.width * box.width / 100;

      // New width (60% wider)
      const calculatedWidth = baseWidth * 1.6;

      // Shift X so it expands evenly left + right
      const extraWidth = calculatedWidth - baseWidth;
      const calculatedX = stageDimensions.x + (stageDimensions.width * box.x / 100) - (extraWidth / 2);

      return {
          x: calculatedX,
          y: stageDimensions.y + (stageDimensions.height * box.y / 100),
          width: calculatedWidth,
          height: stageDimensions.height * box.height / 100,
      };

    });

    setPixelBoundaryBoxes(newPixelBoxes);
  }, [activeViewId, productDetails, stageDimensions]);


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
  }, [canvasImages, canvasTexts, canvasShapes, productDetails?.views, productDetails?.basePrice, selectedTechnique]);

  const getToolPanelTitle = (toolId: string): string => {
    const tool = toolItems.find(item => item.id === toolId);
    return tool ? tool.label : "Design Tool";
  };
  
  const activeView = productDetails?.views.find(v => v.id === activeViewId) || productDetails?.views[0];

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

    const boundaryBoxes = activeView?.boundaryBoxes || [];
    const canvasDims = { width: stageDimensions?.width || 0, height: stageDimensions?.height || 0 };

    switch (activeTool) {
      case "layers": return <LayersPanel activeViewId={activeViewId} />;
      case "uploads": return <UploadArea activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
      case "text": return <TextToolPanel activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
      case "shapes": return <ShapesPanel activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
      case "clipart": return <ClipartPanel activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
      case "free-designs": return <FreeDesignsPanel activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
      case "premium-designs": return <PremiumDesignsPanel activeViewId={activeViewId} boundaryBoxes={boundaryBoxes} stageDimensions={canvasDims} />;
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
    if (!productDetails || productDetails.allowCustomization === false || isAddingToCart) {
      toast({ title: "Cannot Add to Cart", description: "Customization is disabled or an operation is in progress.", variant: "destructive" });
      return;
    }

    const customizedViewIds = new Set<string>();
    [...canvasImages, ...canvasTexts, ...canvasShapes].forEach(item => {
      if (item.viewId) customizedViewIds.add(item.viewId);
    });

    if (customizedViewIds.size === 0) {
      toast({ title: "Empty Design", description: "Please add design elements before adding to cart.", variant: "default" });
      return;
    }
    if (!isEmbedded && !user) {
      toast({ title: "Please Sign In", description: "Sign in to save your design and add to cart.", variant: "default" });
      return;
    }
    setIsAddingToCart(true);
    toast({ title: "Preparing Your Design...", description: "Generating final previews. This may take a moment." });
    
    try {
        const stage = getStageRef()?.current;
        if (!stage) {
            throw new Error("Canvas is not ready. Please try again.");
        }

        const originalActiveViewId = activeViewId;
        const finalThumbnails: { viewId: string; viewName: string; url: string; }[] = [];
        
        try {
            for (const viewId of Array.from(customizedViewIds)) {
                const viewInfo = productDetails.views.find(v => v.id === viewId);
                if (!viewInfo) continue;

                // Create an offscreen canvas for better control
                const offscreenCanvas = document.createElement('canvas');
                const offscreenCtx = offscreenCanvas.getContext('2d');
                if (!offscreenCtx) return;

                // Set canvas size to match stage
                const width = stage.width();
                const height = stage.height();
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;

                // Temporarily switch view to generate customizations
                setActiveViewId(viewId);
                // Wait for re-render
                await new Promise(resolve => setTimeout(resolve, 100));

                // Use the stage directly to render the final preview
                stage.clear();
                
                // Draw white background first
                const layer = stage.getLayers()[0];
                const backgroundRect = layer.getContext().canvas;
                // Create the background layer
                const backgroundLayer = new Konva.Layer();
                const background = new Konva.Rect({
                  width: stage.width(),
                  height: stage.height(),
                  fill: '#FFFFFF',
                });
                backgroundLayer.add(background);
                stage.add(backgroundLayer);
                
                // Draw all canvas content
                stage.draw();
                
                // Get the final composite image
                const stageDataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
                try {
                    if (storage && user) {
                        const storagePath = `users/${user.uid}/cart_previews/${crypto.randomUUID()}.png`;
                        const imageRef = storageRef(storage, storagePath);
                        const snapshot = await uploadString(imageRef, stageDataUrl, 'data_url');
                        const downloadURL = await getDownloadURL(snapshot.ref);
                        finalThumbnails.push({ viewId: viewId, viewName: viewInfo.name, url: downloadURL });
                    } else {
                        // Fallback to using data URLs directly when Firebase Storage is not available
                        finalThumbnails.push({ viewId: viewId, viewName: viewInfo.name, url: stageDataUrl });
                    }
                } catch (error) {
                    console.error("Error generating preview for view:", viewId, error);
                    // Still add the data URL as fallback even if Firebase upload fails
                    finalThumbnails.push({ viewId: viewId, viewName: viewInfo.name, url: stageDataUrl });
                }
            }
        } finally {
            // Always restore the original view
            setActiveViewId(originalActiveViewId);
        }
        
        const createLightweightViewData = () => {
          const stripDataUrls = (items: (CanvasImage | CanvasText | CanvasShape)[]) => {
            return items.map(item => {
              if ('dataUrl' in item) {
                const { dataUrl, ...rest } = item as CanvasImage;
                return { ...rest, sourceImageId: item.sourceImageId };
              }
              return item;
            });
          };

          return productDetails.views
            .filter((view: {id: string}) => customizedViewIds.has(view.id))
            .map((view: {id: string}) => ({
              viewId: view.id,
              items: stripDataUrls([
                ...canvasImages.filter((item: CanvasImage) => item.viewId === view.id),
                ...canvasTexts.filter((item: CanvasText) => item.viewId === view.id),
                ...canvasShapes.filter((item: CanvasShape) => item.viewId === view.id)
              ]),
            }));
        };

        const newCartItem = {
          id: editCartItemId || crypto.randomUUID(),
          productId: productDetails.id,
          productName: productDetails.name,
          quantity: 1,
          totalCustomizationPrice: totalCustomizationPrice,
          previewImageUrls: finalThumbnails,
          customizationDetails: {
            viewData: createLightweightViewData(),
            selectedOptions: selectedVariationOptions,
          }
        };

        const cartKey = `cs_cart_${storeIdFromUrl || user?.uid}`;
        let cartData = [];
        const storedCart = localStorage.getItem(cartKey);
        if (storedCart) {
          try { cartData = JSON.parse(storedCart); if (!Array.isArray(cartData)) cartData = []; } catch { cartData = []; }
        }
        const existingItemIndex = cartData.findIndex((item: any) => item.id === editCartItemId);
        if (existingItemIndex > -1) {
          cartData[existingItemIndex] = newCartItem;
        } else {
          cartData.push(newCartItem);
        }
        localStorage.setItem(cartKey, JSON.stringify(cartData));
        toast({ title: "Success!", description: `${productDetails.name} has been added to your cart.` });
        if (storeIdFromUrl) {
          router.push(`/store/${storeIdFromUrl}/cart`);
        }

    } catch (err: any) {
      console.error("Error adding to cart:", err);
      toast({
        title: "Add to Cart Failed",
        description: err.message,
        variant: "destructive"
      });
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

  if (!activeView && !isLoading) {
    // Handle case where product might have loaded but no views are available
     return (
        <div className="flex flex-col min-h-svh h-screen w-full items-center justify-center bg-background p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground text-center mb-6">This product has no views configured. Please add a view in the product options.</p>
            {!isEmbedded && user && (
              <Button variant="outline" asChild>
                  <Link href={`/dashboard/products/${productIdFromUrl}/options?source=${sourceFromUrl}`}>
                      <SettingsIcon className="mr-2 h-4 w-4" /> Go to Product Options
                  </Link>
              </Button>
            )}
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
  
  const selectedItem =
    canvasImages.find(i => i.id === selectedCanvasImageId) ||
    canvasTexts.find(t => t.id === selectedCanvasTextId) ||
    canvasShapes.find(s => s.id === selectedCanvasShapeId) ||
    null;

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
          <TransformToolbar
            selectedItem={selectedItem}
            pixelBoundaryBoxes={pixelBoundaryBoxes}
            stageDimensions={stageDimensions}
          />
          {error && productDetails?.id === defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
           {error && productDetails && productDetails.id !== defaultFallbackProduct.id && ( <div className="w-full max-w-4xl p-3 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex-shrink-0"> <AlertTriangle className="inline h-4 w-4 mr-1" /> {error} </div> )}
           <div className="w-full flex flex-col flex-1 min-h-0 pb-4">
            {isClient && activeView ? (
              <DesignCanvas 
                activeView={activeView}
                showGrid={showGrid} 
                showBoundaryBoxes={showBoundaryBoxes}
                onStageRectChange={setStageDimensions}
                pixelBoundaryBoxes={pixelBoundaryBoxes}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
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
          onViewChange={handleViewChange}
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

      {!isEmbedded && (
        <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
            <AlertDialogContent>
            <AlertDialogHeader> <AlertDialogTitle>Unsaved Changes</AlertDialogTitle> <AlertDialogDescription> You have unsaved changes on the canvas. Are you sure you want to leave? Your changes will be lost. </AlertDialogDescription> </AlertDialogHeader>
            <AlertDialogFooter> <AlertDialogCancel onClick={() => { setIsLeaveConfirmOpen(false); setOnConfirmLeaveAction(null); }}> Stay </AlertDialogCancel> <AlertDialogAction onClick={() => { if (onConfirmLeaveAction) onConfirmLeaveAction(); setIsLeaveConfirmOpen(false); setOnConfirmLeaveAction(null); }} className={cn(buttonVariants({variant: "destructive"}))}> Leave </AlertDialogAction> </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
