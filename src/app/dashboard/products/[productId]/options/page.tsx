
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Image as ImageIconLucide, Edit2, DollarSign, PlugZap, Edit3, Save, Settings, Palette, Ruler, X, Info, Gem, Package, Truck as TruckIcon } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { UserShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';
import type { WCCustomProduct, WCVariation } from '@/types/woocommerce';
import type { ShopifyProduct } from '@/types/shopify';
import { Alert as ShadCnAlert, AlertDescription as ShadCnAlertDescription, AlertTitle as ShadCnAlertTitle } from "@/components/ui/alert";
import ProductViewSetup from '@/components/product-options/ProductViewSetup';
import { Separator } from '@/components/ui/separator';
import type { ProductOptionsFirestoreData, BoundaryBox, ProductView, ColorGroupOptions, ProductAttributeOptions, NativeProductVariation, VariationImage, ShippingAttributes } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CUSTOMIZATION_TECHNIQUES: CustomizationTechnique[] = ['Embroidery', 'DTF', 'DTG', 'Sublimation', 'Screen Printing'];

interface SizeAttribute {
    id: string;
    name: string;
    priceModifier: number;
}

// This is the internal state representation. Note that salePrice can be null.
interface ProductOptionsData {
  id: string;
  name: string;
  description: string;
  brand?: string;
  sku?: string;
  category?: string;
  customizationTechniques?: CustomizationTechnique[];
  price: number;
  salePrice: number | null; // Use null for empty, not undefined
  shipping: ShippingAttributes;
  type: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify';
  defaultViews: ProductView[];
  optionsByColor: Record<string, ColorGroupOptions>;
  groupingAttributeName: string | null;
  nativeAttributes: Omit<ProductAttributeOptions, 'sizes'> & { sizes: SizeAttribute[] };
  nativeVariations: NativeProductVariation[];
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
const MAX_VARIATION_IMAGES = 4;

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
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();
  
  const productIdFromUrl = useMemo(() => decodeURIComponent(params.productId as string), [params.productId]);
  const source = useMemo(() => searchParams.get('source') as 'woocommerce' | 'shopify' | 'customizer-studio' || 'woocommerce', [searchParams]);
  const firestoreDocId = useMemo(() => productIdFromUrl.split('/').pop() || productIdFromUrl, [productIdFromUrl]);

  const [productOptions, setProductOptions] = useState<ProductOptionsData | null>(null);
  const [activeViewIdForSetup, setActiveViewIdForSetup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentialsExist, setCredentialsExist] = useState(true);
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
  const [colorHexValue, setColorHexValue] = useState("#000000");
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [sizePriceModifier, setSizePriceModifier] = useState<number>(0);
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkSalePrice, setBulkSalePrice] = useState<string>('');

  const generatedVariations = useMemo(() => {
    if (!productOptions || productOptions.type !== 'variable' || productOptions.source !== 'customizer-studio') {
        return [];
    }
    const { colors = [], sizes = [] } = productOptions.nativeAttributes || {};
    const variations: NativeProductVariation[] = [];
    if (colors.length === 0 && sizes.length === 0) return [];
    
    if (colors.length > 0) {
        colors.forEach(color => {
            if (sizes.length > 0) {
                sizes.forEach(size => {
                    const id = `color-${color.name}-size-${size.id}`.toLowerCase().replace(/\s+/g, '-');
                    const existing = productOptions.nativeVariations?.find(v => v.id === id);
                    variations.push({
                        id,
                        attributes: { "Color": color.name, "Size": size.name },
                        price: existing?.price ?? productOptions.price,
                        salePrice: existing?.salePrice ?? null,
                    });
                });
            } else {
                const id = `color-${color.name}`.toLowerCase().replace(/\s+/g, '-');
                const existing = productOptions.nativeVariations?.find(v => v.id === id);
                variations.push({ id, attributes: { "Color": color.name }, price: existing?.price ?? productOptions.price, salePrice: existing?.salePrice ?? null });
            }
        });
    } else {
        sizes.forEach(size => {
            const id = `size-${size.id}`.toLowerCase().replace(/\s+/g, '-');
            const existing = productOptions.nativeVariations?.find(v => v.id === id);
            variations.push({ id, attributes: { "Size": size.name }, price: existing?.price ?? productOptions.price, salePrice: existing?.salePrice ?? null });
        });
    }
    return variations;
  }, [productOptions]);

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
      let baseProduct: { id: string; name: string; description: string; price: number; type: any; imageUrl: string; imageAlt: string; brand?: string; sku?: string; category?: string; customizationTechniques?: CustomizationTechnique[]; salePrice: number | null; shipping?: ShippingAttributes };
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
            salePrice: null, // Shopify base product doesn't have a direct sale price here
            type: 'shopify',
            imageUrl: product.featuredImage?.url || 'https://placehold.co/600x600.png',
            imageAlt: product.featuredImage?.altText || product.title,
            shipping: { weight: 0, length: 0, width: 0, height: 0 },
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
            price: parseFloat(product.regular_price) || 0,
            salePrice: product.sale_price ? parseFloat(product.sale_price) : null,
            type: product.type,
            imageUrl: product.images?.[0]?.src || 'https://placehold.co/600x600.png',
            imageAlt: product.images?.[0]?.alt || product.name,
            shipping: { weight: 0, length: 0, width: 0, height: 0 },
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
          price: 0,
          salePrice: null,
          type: 'simple',
          imageUrl: 'https://placehold.co/600x600.png',
          imageAlt: nativeProduct.name,
          brand: nativeProduct.brand,
          sku: nativeProduct.sku,
          category: nativeProduct.category,
          customizationTechniques: nativeProduct.customizationTechniques,
          shipping: { weight: 0, length: 0, width: 0, height: 0 },
        };
      }
      const { options: firestoreOptions, error: firestoreError } = await loadProductOptionsFromFirestoreClient(user.uid, firestoreDocId);
      if (firestoreError) toast({ title: "Settings Load Issue", description: `Could not load saved settings: ${firestoreError}`, variant: "default" });
      const defaultPlaceholder = "https://placehold.co/600x600/eee/ccc.png?text=";
      const baseDefaultViews: Omit<ProductView, 'id' | 'boundaryBoxes' | 'price'>[] = [
        { name: "Front", imageUrl: baseProduct.imageUrl || `${defaultPlaceholder}Front`, aiHint: baseProduct.imageAlt.split(" ").slice(0,2).join(" ") || "front view" },
        { name: "Back", imageUrl: `${defaultPlaceholder}Back`, aiHint: "back view" },
        { name: "Left Side", imageUrl: `${defaultPlaceholder}Left`, aiHint: "left side view" },
        { name: "Right Side", imageUrl: `${defaultPlaceholder}Right`, aiHint: "right side view" },
      ];
      const existingViews = firestoreOptions?.defaultViews || [];
      const finalDefaultViews = baseDefaultViews.map(baseView => {
        const existing = existingViews.find(ev => ev.name === baseView.name);
        return existing ? {...existing, price: existing.price ?? 0 } : { ...baseView, id: crypto.randomUUID(), price: 0, boundaryBoxes: [] };
      }).slice(0, MAX_PRODUCT_VIEWS);
      const nativeAttributesFromFS = firestoreOptions?.nativeAttributes || { colors: [], sizes: [] };
      if (!nativeAttributesFromFS.colors) nativeAttributesFromFS.colors = [];
      const validatedSizes = (nativeAttributesFromFS.sizes || []).map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        name: s.name,
        priceModifier: s.priceModifier ?? 0,
      }));

      // Ensure nativeVariations have salePrice as null if it's missing
      const cleanNativeVariations = (firestoreOptions?.nativeVariations || []).map(v => ({
          ...v,
          salePrice: v.salePrice ?? null,
      }));

      setProductOptions({
        ...baseProduct,
        source,
        price: firestoreOptions?.price ?? baseProduct.price,
        salePrice: firestoreOptions?.salePrice ?? baseProduct.salePrice,
        shipping: firestoreOptions?.shipping ?? baseProduct.shipping ?? { weight: 0, length: 0, width: 0, height: 0 },
        type: firestoreOptions?.type ?? baseProduct.type,
        defaultViews: finalDefaultViews,
        optionsByColor: firestoreOptions?.optionsByColor || {},
        groupingAttributeName: firestoreOptions?.groupingAttributeName || (source === 'customizer-studio' ? 'Color' : null),
        nativeAttributes: { colors: nativeAttributesFromFS.colors, sizes: validatedSizes },
        nativeVariations: cleanNativeVariations,
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
    if (authIsLoading) return;
    if (!user?.uid) { setError("User not authenticated."); setIsLoading(false); return; }
    if (!productIdFromUrl) { setError("Product ID is missing."); setIsLoading(false); return; }
    if (!productOptions && !error) { fetchAndSetProductData(false); }
    else { setIsLoading(false); }
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
    if (!productOptions || !user?.uid || !db || !firestoreDocId) {
      toast({ title: "Error", description: "Cannot save. Missing required data.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
  
    try {
      const {
        id, name, description, price, type, allowCustomization, 
        defaultViews, optionsByColor, groupingAttributeName, nativeAttributes, 
        nativeVariations, brand, sku, category, customizationTechniques, shipping, salePrice
      } = productOptions;
  
      // 1. Build the base object with guaranteed fields
      const dataToSave: any = {
        id, name, description, price, type, allowCustomization,
        defaultViews, optionsByColor, groupingAttributeName, nativeAttributes,
        lastSaved: serverTimestamp(),
      };
  
      // 2. Conditionally add optional top-level fields
      if (salePrice !== null) { dataToSave.salePrice = salePrice; } 
      else { dataToSave.salePrice = deleteField(); }

      if (brand) dataToSave.brand = brand;
      if (sku) dataToSave.sku = sku;
      if (category) dataToSave.category = category;
      if (shipping) dataToSave.shipping = shipping;
  
      // 3. Sanitize and add nativeVariations
      if (Array.isArray(nativeVariations)) {
        dataToSave.nativeVariations = nativeVariations.map(variation => {
          const cleanVariation = { ...variation };
          // Explicitly handle salePrice: if it's null, we want to remove it.
          if (cleanVariation.salePrice === null || cleanVariation.salePrice === undefined) {
            delete (cleanVariation as any).salePrice;
          }
          return cleanVariation;
        });
      }
      
      const docRef = doc(db, 'userProductOptions', user.uid, 'products', firestoreDocId);
      await setDoc(docRef, dataToSave, { merge: true });
  
      if (productOptions.source === 'customizer-studio') {
        const productBaseRef = doc(db, `users/${user.uid}/products`, firestoreDocId);
        const nativeProductData: Partial<NativeProduct> = {
          name: name,
          description: description,
          lastModified: serverTimestamp()
        };
        if (brand) nativeProductData.brand = brand;
        if (sku) nativeProductData.sku = sku;
        if (category) nativeProductData.category = category;
        if (customizationTechniques) nativeProductData.customizationTechniques = customizationTechniques;
        await setDoc(productBaseRef, nativeProductData, { merge: true });
      }
      
      toast({ title: "Saved", description: "Your product configurations have been saved." });
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving product options to Firestore:', error);
      let description = `Failed to save options: ${error.message || "Unknown Firestore error"}`;
      if (error.code === 'permission-denied') {
          description = "Save failed due to permissions. Please check your Firestore security rules for writes.";
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
      toast({ title: "Customization Disabled", description: "This product is currently marked as 'Do Not Customize'.", variant: "default"});
      return;
    }
    router.push(`/customizer?productId=${productOptions.id}&source=${productOptions.source}`);
  };

  const handleSelectView = (viewId: string) => { setActiveViewIdForSetup(viewId); setSelectedBoundaryBoxId(null); };

  const handleAddNewView = () => {
    if (!productOptions) return;
    if (productOptions.defaultViews.length >= MAX_PRODUCT_VIEWS) {
      toast({ title: "Limit Reached", description: `Max ${MAX_PRODUCT_VIEWS} views per product.`, variant: "default" });
      return;
    }
    const newView: ProductView = {
      id: crypto.randomUUID(), name: `View ${productOptions.defaultViews.length + 1}`,
      imageUrl: 'https://placehold.co/600x600/eee/ccc.png?text=New+View', aiHint: 'product view',
      boundaryBoxes: [], price: 0
    };
    setProductOptions(prev => prev ? { ...prev, defaultViews: [...prev.defaultViews, newView] } : null);
    setActiveViewIdForSetup(newView.id); setSelectedBoundaryBoxId(null); setHasUnsavedChanges(true);
  };
  
  const handleViewDetailChange = (viewId: string, field: keyof Omit<ProductView, 'id' | 'boundaryBoxes'>, value: string | number) => {
    if (!productOptions) return;
    setProductOptions(prev => prev ? { ...prev, defaultViews: prev.defaultViews.map(v => v.id === viewId ? { ...v, [field]: value } : v) } : null);
    setHasUnsavedChanges(true);
  };

  const handleDeleteView = (viewId: string) => {
    if (!productOptions || productOptions.defaultViews.length <= 1) {
      toast({ title: "Cannot Delete", description: "At least one view must remain.", variant: "default" });
      return;
    }
    setViewIdToDelete(viewId); setIsDeleteViewDialogOpen(true);
  };

  const confirmDeleteView = () => {
    if (!productOptions || !viewIdToDelete) return;
    const updatedViews = productOptions.defaultViews.filter(v => v.id !== viewIdToDelete);
    setProductOptions(prev => prev ? { ...prev, defaultViews: updatedViews } : null);
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
      let variationIdsToSet: string[] = [];
      if (checked) {
          if (prev.source === 'woocommerce' && groupedVariations) {
            variationIdsToSet = groupedVariations[groupKey]?.map(v => v.id.toString()) || [];
          } else { // native
            variationIdsToSet = prev.nativeAttributes?.sizes.map(size => `${groupKey}-${size.id}`) || [groupKey];
          }
      }
      if (!updatedOptionsByColor[groupKey]) {
          updatedOptionsByColor[groupKey] = { selectedVariationIds: variationIdsToSet, variantImages: [] };
      } else {
          updatedOptionsByColor[groupKey].selectedVariationIds = variationIdsToSet;
      }
      return { ...prev, optionsByColor: updatedOptionsByColor };
    });
    setHasUnsavedChanges(true);
  };
  
  const handleVariantViewImageChange = (
    colorKey: string,
    imageIndex: number,
    field: 'imageUrl' | 'aiHint',
    value: string
  ) => {
    setProductOptions(prev => {
        if (!prev) return null;
        const updatedOptionsByColor = JSON.parse(JSON.stringify(prev.optionsByColor));
        if (!updatedOptionsByColor[colorKey]) {
            updatedOptionsByColor[colorKey] = { selectedVariationIds: [], variantImages: [] };
        }
        const variantImages = updatedOptionsByColor[colorKey].variantImages || [];
        while (variantImages.length <= imageIndex) {
            variantImages.push({ imageUrl: '', aiHint: '' });
        }
        variantImages[imageIndex] = { ...variantImages[imageIndex], [field]: value };
        if (field === 'imageUrl' && !value) {
            variantImages[imageIndex].aiHint = '';
        }
        updatedOptionsByColor[colorKey].variantImages = variantImages.slice(0, MAX_VARIATION_IMAGES);
        return { ...prev, optionsByColor: updatedOptionsByColor };
    });
    setHasUnsavedChanges(true);
  };
  
  const handleAddAttribute = (type: 'colors' | 'sizes') => {
    if (!productOptions) return;
    if (type === 'colors') {
      const name = colorInputValue.trim();
      if (!name) { toast({ title: "Color name is required.", variant: "destructive" }); return; }
      if (!/^#[0-9a-fA-F]{6}$/.test(colorHexValue)) { toast({ title: "Invalid Hex Code", description: "Please enter a valid 6-digit hex code.", variant: "destructive" }); return; }
      if (productOptions.nativeAttributes.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast({ title: "Color already exists.", variant: "destructive" }); return; }
      const newColor = { name, hex: colorHexValue };
      const newColors = [...productOptions.nativeAttributes.colors, newColor];
      setProductOptions(prev => prev ? { ...prev, nativeAttributes: { ...prev.nativeAttributes, colors: newColors } } : null);
      setColorInputValue(""); setColorHexValue("#000000");
    } else {
      const sizeName = sizeInputValue.trim();
      const modifier = sizePriceModifier;
      if (!sizeName) { toast({ title: "Size name is required.", variant: "destructive" }); return; }
      if (productOptions.nativeAttributes.sizes.some(s => s.name.toLowerCase() === sizeName.toLowerCase())) { toast({ title: "Size already exists.", variant: "destructive" }); return; }
      const newSize: SizeAttribute = { id: crypto.randomUUID(), name: sizeName, priceModifier: modifier };
      const newSizes = [...productOptions.nativeAttributes.sizes, newSize];
      setProductOptions(prev => prev ? { ...prev, nativeAttributes: { ...prev.nativeAttributes, sizes: newSizes } } : null);
      setSizeInputValue(""); setSizePriceModifier(0);
    }
    setHasUnsavedChanges(true);
  };

  const handleRemoveAttribute = (type: 'colors' | 'sizes', value: string) => {
    if (!productOptions) return;
    setProductOptions(prev => {
      if (!prev) return null;
      let updatedAttributes = { ...prev.nativeAttributes };
      if (type === 'colors') {
        updatedAttributes.colors = updatedAttributes.colors.filter(item => item.name !== value);
        const updatedOptionsByColor = { ...prev.optionsByColor };
        delete updatedOptionsByColor[value];
        return { ...prev, nativeAttributes: updatedAttributes, optionsByColor: updatedOptionsByColor };
      } else {
        const newSizes = prev.nativeAttributes.sizes.filter(item => item.id !== value);
        updatedAttributes = { ...updatedAttributes, sizes: newSizes };
      }
      return { ...prev, nativeAttributes: updatedAttributes };
    });
    setHasUnsavedChanges(true);
  };

  const handleCustomizationTechniqueChange = (technique: CustomizationTechnique, checked: boolean) => {
      setProductOptions(prev => {
          if (!prev) return null;
          const currentTechniques = prev.customizationTechniques || [];
          const newTechniques = checked ? [...currentTechniques, technique] : currentTechniques.filter(t => t !== technique);
          const uniqueTechniques = Array.from(new Set(newTechniques));
          return { ...prev, customizationTechniques: uniqueTechniques };
      });
      setHasUnsavedChanges(true);
  };

  const handleVariationFieldChange = (id: string, field: 'price' | 'salePrice', value: string) => {
    // If the value is an empty string, we treat it as `null` to signify clearing the field.
    // Otherwise, parse it to a float.
    const numValue = value.trim() === '' ? null : parseFloat(value);
  
    // For the base price, we don't allow it to be null/empty.
    if (field === 'price' && numValue === null) {
      toast({ title: "Invalid Price", description: "Base price for a variation cannot be empty.", variant: "destructive" });
      return;
    }
  
    // If it's not empty, but still not a valid number (e.g., "abc"), ignore the change.
    if (numValue !== null && isNaN(numValue)) {
      return;
    }
  
    setProductOptions(prev => {
      if (!prev) return null;
  
      const variationExists = prev.nativeVariations.some(v => v.id === id);
      let updatedVariations: NativeProductVariation[];
  
      if (variationExists) {
        updatedVariations = prev.nativeVariations.map(v =>
          v.id === id ? { ...v, [field]: numValue } : v
        );
      } else {
        // Find the template variation to create a new entry
        const template = generatedVariations.find(v => v.id === id);
        if (!template) return prev; // Should not happen
        
        // Create a new variation object ensuring `salePrice` is `null` by default
        const newVariation: NativeProductVariation = { 
          ...template, 
          salePrice: null // Explicitly initialize salePrice as null
        };
        // Now, apply the update
        (newVariation as any)[field] = numValue;
        updatedVariations = [...prev.nativeVariations, newVariation];
      }
      return { ...prev, nativeVariations: updatedVariations };
    });
    setHasUnsavedChanges(true);
  };

  const handleBulkUpdate = (field: 'price' | 'salePrice') => {
      const valueStr = field === 'price' ? bulkPrice : bulkSalePrice;
      if (valueStr === '' && field === 'price') {
          toast({ title: "Invalid Price", description: "Base price cannot be empty.", variant: "destructive"});
          return;
      }
      const value = valueStr.trim() === '' ? null : parseFloat(valueStr);
      if (value !== null && isNaN(value)) {
        toast({ title: "Invalid Price", description: "Please enter a valid number.", variant: "destructive" });
        return;
      }
      setProductOptions(prev => {
        if (!prev) return null;
        const existingVariationsMap = new Map(prev.nativeVariations.map(v => [v.id, v]));
        const updatedVariations = generatedVariations.map(genVar => {
            const newVariation: NativeProductVariation = { ...(existingVariationsMap.get(genVar.id) || genVar) };
            if (field === 'price' && value !== null) {
                (newVariation as any)[field] = value;
            } else if (field === 'salePrice') {
                (newVariation as any)[field] = value;
            }
            return newVariation;
        });
        return { ...prev, nativeVariations: updatedVariations };
      });
      setHasUnsavedChanges(true);
      toast({ title: "Prices Updated", description: `All variations' ${field}s have been updated.`});
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
           <Button variant="link" asChild><Link href="/dashboard"><PlugZap className="mr-2 h-4 w-4" />Go to Dashboard to Connect</Link></Button>
        )}
        <Button variant="outline" asChild className="mt-2"><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
      </div>
    );
  }
  if (!productOptions) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Product Data Not Available</h2>
            <p className="text-muted-foreground text-center mb-6">Could not load the options for this product.</p>
            <Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
        </div>
    );
  }

  const currentView = productOptions.defaultViews.find(v => v.id === activeViewIdForSetup);
  const isPriceDisabled = source === 'customizer-studio' && productOptions.type === 'variable';

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
      {!credentialsExist && (<ShadCnAlert variant="destructive" className="mb-6"><PlugZap className="h-4 w-4" /><ShadCnAlertTitle>Store Not Connected</ShadCnAlertTitle><ShadCnAlertDescription>Your {source} store credentials are not configured. Please go to <Link href="/dashboard" className="underline hover:text-destructive/80">your dashboard</Link> and set them up.</ShadCnAlertDescription></ShadCnAlert>)}
      {error && credentialsExist && <ShadCnAlert variant="destructive" className="mb-6"><AlertTriangle className="h-4 w-4" /><ShadCnAlertTitle>Product Data Error</ShadCnAlertTitle><ShadCnAlertDescription>{error}</ShadCnAlertDescription></ShadCnAlert>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg">Base Product Information</CardTitle><CardDescription>From your {source} store {source !== 'customizer-studio' && '(Read-only)'}.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="productName">Product Name</Label><Input id="productName" value={productOptions.name} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, name: e.target.value} : null); setHasUnsavedChanges(true);}} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label htmlFor="productBrand">Brand</Label><Input id="productBrand" value={productOptions.brand || ''} placeholder="e.g., Gildan" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, brand: e.target.value} : null); setHasUnsavedChanges(true);}} /></div>
                <div><Label htmlFor="productSku">SKU</Label><Input id="productSku" value={productOptions.sku || ''} placeholder="e.g., G5000-WHT-LG" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, sku: e.target.value} : null); setHasUnsavedChanges(true);}} /></div>
                <div><Label htmlFor="productCategory">Category</Label><Input id="productCategory" value={productOptions.category || ''} placeholder="e.g., T-Shirts" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, category: e.target.value} : null); setHasUnsavedChanges(true);}} /></div>
              </div>
              <div><Label htmlFor="productDescription">Description</Label><Textarea id="productDescription" value={productOptions.description} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} rows={4} readOnly={source !== 'customizer-studio'} onChange={(e) => {setProductOptions(prev => prev ? {...prev, description: e.target.value} : null); setHasUnsavedChanges(true);}} /></div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="productPrice">Base Price ($)</Label>
                  <Input id="productPrice" type="number" value={productOptions.price} className={cn("mt-1", (source !== 'customizer-studio' || isPriceDisabled) ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio' || isPriceDisabled} onChange={(e) => {setProductOptions(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null); setHasUnsavedChanges(true);}} title={isPriceDisabled ? "Managed by variations." : "Base price for simple product."}/>
                  {isPriceDisabled && <p className="text-xs text-muted-foreground mt-1">Disabled for variable products.</p>}
                </div>
                 <div>
                  <Label htmlFor="salePrice">Sale Price ($)</Label>
                  <Input id="salePrice" type="number" value={productOptions.salePrice ?? ''} placeholder="Optional" className={cn("mt-1", (source !== 'customizer-studio' || isPriceDisabled) ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio' || isPriceDisabled} onChange={(e) => { const value = e.target.value; setProductOptions(prev => prev ? {...prev, salePrice: value === '' ? null : parseFloat(value)} : null); setHasUnsavedChanges(true); }} title={isPriceDisabled ? "Managed by variations." : "Sale price for simple product."} />
                </div>
                <div>
                  <Label htmlFor="productType">Type</Label>
                  {source !== 'customizer-studio' ? (<Input id="productType" value={productOptions.type.charAt(0).toUpperCase() + productOptions.type.slice(1)} className="mt-1 bg-muted/50" readOnly />) : (
                    <Select value={productOptions.type} onValueChange={(value: 'simple' | 'variable') => {setProductOptions(prev => prev ? {...prev, type: value} : null); setHasUnsavedChanges(true);}}>
                      <SelectTrigger id="productType" className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="variable">Variable</SelectItem></SelectContent>
                    </Select>
                  )}
                </div>
              </div>
               {source === 'customizer-studio' && (<div><Label className="flex items-center"><Gem className="mr-2 h-4 w-4 text-primary" /> Customization Techniques</Label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{CUSTOMIZATION_TECHNIQUES.map(technique => (<div key={technique} className="flex items-center space-x-2"><Checkbox id={`tech-${technique}`} checked={productOptions.customizationTechniques?.includes(technique)} onCheckedChange={(checked) => handleCustomizationTechniqueChange(technique, checked as boolean)}/><Label htmlFor={`tech-${technique}`} className="font-normal">{technique}</Label></div>))}</div></div>)}
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg flex items-center gap-2"><TruckIcon /> Shipping Attributes</CardTitle><CardDescription>Enter shipping details for native store calculations.</CardDescription></CardHeader>
            <CardContent><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><Label htmlFor="shippingWeight">Weight (lbs)</Label><Input id="shippingWeight" type="number" step="0.01" value={productOptions.shipping?.weight || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), weight: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
              <div><Label htmlFor="shippingLength">Length (in)</Label><Input id="shippingLength" type="number" step="0.01" value={productOptions.shipping?.length || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), length: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
              <div><Label htmlFor="shippingWidth">Width (in)</Label><Input id="shippingWidth" type="number" step="0.01" value={productOptions.shipping?.width || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), width: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
              <div><Label htmlFor="shippingHeight">Height (in)</Label><Input id="shippingHeight" type="number" step="0.01" value={productOptions.shipping?.height || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), height: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
            </div></CardContent>
          </Card>
          <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Customization Settings</CardTitle><CardDescription>Control how this product can be customized.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/20"><Checkbox id="allowCustomization" checked={productOptions.allowCustomization} onCheckedChange={(checked) => { const isChecked = checked as boolean; setProductOptions(prev => prev ? { ...prev, allowCustomization: isChecked } : null); setHasUnsavedChanges(true); }}/><div className="grid gap-1.5 leading-none"><Label htmlFor="allowCustomization" className="text-sm font-medium text-foreground cursor-pointer">Enable Product Customization</Label><p className="text-xs text-muted-foreground">If unchecked, the "Customize" button will not appear for this product.</p></div></div></CardContent></Card>
          {source === 'customizer-studio' && (<Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Product Attributes</CardTitle><CardDescription>Define colors and sizes for this native product.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="grid md:grid-cols-2 gap-6"><div><Label className="flex items-center mb-2"><Palette className="h-4 w-4 mr-2 text-primary" /> Colors</Label><div className="flex items-center gap-2"><Input id="color-input" placeholder="e.g., Red" value={colorInputValue} onChange={e => setColorInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('colors');} }}/><Input id="color-hex-input" type="color" value={colorHexValue} onChange={e => setColorHexValue(e.target.value)} className="p-1 h-10 w-12" /><Button type="button" onClick={() => handleAddAttribute('colors')}>Add</Button></div><div className="flex flex-wrap gap-2 mt-2">{productOptions.nativeAttributes.colors.map((color) => (<Badge key={`${color.name}-${color.hex}`} variant="secondary" className="text-sm"><div className="w-3 h-3 rounded-full mr-1.5 border" style={{ backgroundColor: color.hex }}></div>{color.name}<button onClick={() => handleRemoveAttribute('colors', color.name)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3"/></button></Badge>))}</div></div><div><Label htmlFor="size-input" className="flex items-center mb-2"><Ruler className="h-4 w-4 mr-2 text-primary" /> Sizes</Label><div className="grid grid-cols-[2fr_1fr_auto] gap-2"><Input id="size-input" placeholder="e.g., XL" value={sizeInputValue} onChange={e => setSizeInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('sizes');} }}/><Input type="number" step="0.01" placeholder="+/- $" value={sizePriceModifier} onChange={(e) => setSizePriceModifier(parseFloat(e.target.value) || 0)} /><Button type="button" onClick={() => handleAddAttribute('sizes')}>Add</Button></div><div className="flex flex-wrap gap-2 mt-2">{productOptions.nativeAttributes.sizes.map((size) => (<Badge key={size.id} variant="secondary" className="text-sm">{size.name} {size.priceModifier !== 0 && `(${size.priceModifier > 0 ? '+' : ''}$${size.priceModifier.toFixed(2)})`}<button onClick={() => handleRemoveAttribute('sizes', size.id)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3"/></button></Badge>))}</div></div></div></CardContent></Card>)}
          {productOptions.type === 'variable' && productOptions.source === 'customizer-studio' && <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Variation Pricing</CardTitle><CardDescription>Set individual prices for each product variant.</CardDescription></CardHeader><CardContent>{!generatedVariations || generatedVariations.length === 0 ? (<div className="text-center py-6 text-muted-foreground"><Info className="mx-auto h-10 w-10 mb-2" /><p>Define at least one color or size to create variations.</p></div>) : (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div className="flex gap-2"><Input type="number" placeholder="Set all prices..." value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="h-9" /><Button onClick={() => handleBulkUpdate('price')} variant="secondary" size="sm">Apply Price</Button></div><div className="flex gap-2"><Input type="number" placeholder="Set all sale prices..." value={bulkSalePrice} onChange={(e) => setBulkSalePrice(e.target.value)} className="h-9" /><Button onClick={() => handleBulkUpdate('salePrice')} variant="secondary" size="sm">Apply Sale Price</Button></div></div><div className="max-h-96 overflow-y-auto border rounded-md"><Table><TableHeader className="sticky top-0 bg-muted/50 z-10"><TableRow>{Object.keys(generatedVariations[0].attributes).map(attrName => (<TableHead key={attrName}>{attrName}</TableHead>))}<TableHead className="text-right">Price</TableHead><TableHead className="text-right">Sale Price</TableHead></TableRow></TableHeader><TableBody>{generatedVariations.map(variation => { const sizeModifier = productOptions.nativeAttributes.sizes.find(s => s.name === variation.attributes.Size)?.priceModifier || 0; const currentVariationData = productOptions.nativeVariations?.find(v => v.id === variation.id); const basePriceForVariation = currentVariationData?.price ?? productOptions.price; const displayPrice = basePriceForVariation + sizeModifier; return (<TableRow key={variation.id}>{Object.values(variation.attributes).map((val, i) => (<TableCell key={`${variation.id}-attr-${i}`}>{val}</TableCell>))}<TableCell className="text-right"><div className="relative flex items-center justify-end"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" value={displayPrice.toFixed(2)} onChange={e => { const priceWithoutModifier = (parseFloat(e.target.value) || 0) - sizeModifier; handleVariationFieldChange(variation.id, 'price', priceWithoutModifier.toString()); }} className="h-8 w-28 pl-7 text-right"/></div></TableCell><TableCell className="text-right"><div className="relative flex items-center justify-end"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="None" value={currentVariationData?.salePrice ?? ''} onChange={e => handleVariationFieldChange(variation.id, 'salePrice', e.target.value)} className="h-8 w-28 pl-7 text-right"/></div></TableCell></TableRow>);})}</TableBody></Table></div></>)}</CardContent></Card>}
        </div>
        <div className="md:col-span-1 space-y-6">
          <ProductViewSetup productOptions={productOptions} activeViewId={activeViewIdForSetup} selectedBoundaryBoxId={selectedBoundaryBoxId} setSelectedBoundaryBoxId={setSelectedBoundaryBoxId} handleSelectView={handleSelectView} handleViewDetailChange={handleViewDetailChange} handleDeleteView={handleDeleteView} handleAddNewView={handleAddNewView} handleAddBoundaryBox={handleAddBoundaryBox} handleRemoveBoundaryBox={handleRemoveBoundaryBox} handleBoundaryBoxNameChange={handleBoundaryBoxNameChange} handleBoundaryBoxPropertyChange={handleBoundaryBoxPropertyChange} imageWrapperRef={imageWrapperRef} handleInteractionStart={handleInteractionStart} activeDrag={activeDrag} isDeleteViewDialogOpen={isDeleteViewDialogOpen} setIsDeleteViewDialogOpen={setIsDeleteViewDialogOpen} viewIdToDelete={viewIdToDelete} setViewIdToDelete={setViewIdToDelete} confirmDeleteView={confirmDeleteView} />
          <Card className="shadow-md sticky top-8">
            <CardHeader><CardTitle className="font-headline text-lg">Summary & Actions</CardTitle><CardDescription>Review your setup and save changes.</CardDescription></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span></div>
              <div className="text-sm text-muted-foreground">Customization: <Badge variant={productOptions.allowCustomization ? "default" : "secondary"} className={productOptions.allowCustomization ? "bg-green-500/10 text-green-700 border-green-500/30" : ""}>{productOptions.allowCustomization ? "Enabled" : "Disabled"}</Badge></div>
              <div className="text-sm text-muted-foreground">Total Default Views: <span className="font-semibold text-foreground">{productOptions.defaultViews.length}</span></div>
              <div className="text-sm text-muted-foreground">Active Setup View: <span className="font-semibold text-foreground">{currentView?.name || "N/A"}</span></div>
              {currentView && (<div className="text-sm text-muted-foreground">Areas in <span className="font-semibold text-primary">{currentView.name}</span>: <span className="font-semibold text-foreground">{currentView.boundaryBoxes.length}</span></div>)}
              {hasUnsavedChanges && (<div className="mt-3 text-sm text-yellow-600 flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500" />You have unsaved changes.</div>)}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button onClick={handleSaveChanges} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }Save All Configurations</Button>
              <Button variant="outline" size="lg" onClick={handleOpenInCustomizer} disabled={hasUnsavedChanges || !productOptions.allowCustomization} className="hover:bg-accent hover:text-accent-foreground"><ExternalLink className="mr-2 h-4 w-4" />Open in Customizer</Button>
              {!productOptions.allowCustomization && <p className="text-xs text-center text-muted-foreground">Customization is currently disabled.</p>}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
