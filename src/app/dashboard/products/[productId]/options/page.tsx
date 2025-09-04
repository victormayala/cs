"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Edit2, DollarSign, PlugZap, Edit3, Save, Settings, Palette, Ruler, X, Info, Gem, Package, Truck as TruckIcon, Pencil } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById } from '@/app/actions/woocommerceActions';
import type { WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, deleteField, type FieldValue } from 'firebase/firestore';
import type { ProductOptionsFirestoreData, BoundaryBox, ProductView, ColorGroupOptions, ProductAttributeOptions, NativeProductVariation, ShippingAttributes } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { ProductViewSetup } from '@/components/product-options/ProductViewSetup';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';


const CUSTOMIZATION_TECHNIQUES: CustomizationTechnique[] = ['Embroidery', 'DTF', 'DTG', 'Sublimation', 'Screen Printing'];

export interface SizeAttribute {
    id: string;
    name: string;
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
  price: number | string;
  salePrice: number | string | null;
  shipping: ShippingAttributes;
  type: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify' | 'customizer-studio';
  defaultViews: ProductView[]; 
  optionsByColor: Record<string, ColorGroupOptions>;
  groupingAttributeName: string | null;
  nativeAttributes: Omit<ProductAttributeOptions, 'sizes'> & { sizes: SizeAttribute[] };
  nativeVariations: NativeProductVariation[];
  allowCustomization: boolean;
  source: 'woocommerce' | 'shopify' | 'customizer-studio';
}


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
    let errorMessage = `Failed to load options: ${'error'}.message`;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentialsExist, setCredentialsExist] = useState(true);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [colorInputValue, setColorInputValue] = useState("");
  const [colorHexValue, setColorHexValue] = useState("#000000");
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkSalePrice, setBulkSalePrice] = useState<string>('');
  
  const [variationPriceInputs, setVariationPriceInputs] = useState<Record<string, string>>({});
  const [variationSalePriceInputs, setVariationSalePriceInputs] = useState<Record<string, string>>({});

  const [isViewEditorOpen, setIsViewEditorOpen] = useState(false);
  const [activeEditingColor, setActiveEditingColor] = useState('');

    const fetchAndSetProductData = useCallback(async (isRefresh = false) => {
        if (!user?.uid || !productIdFromUrl || !db) {
            setError("User or Product ID invalid, or DB not ready.");
            if (isRefresh) setIsRefreshing(false); else setIsLoading(false);
            return;
        }
        if (isRefresh) setIsRefreshing(true); else setIsLoading(true);
        setError(null);
        try {
            let baseProduct: { id: string; name: string; description: string; price: number | string; type: any; imageUrl: string; imageAlt: string; brand?: string; sku?: string; category?: string; customizationTechniques?: CustomizationTechnique[]; salePrice: number | string | null; shipping?: ShippingAttributes };
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
                    salePrice: null,
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
                    price: '',
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
            const nativeAttributesFromFS = firestoreOptions?.nativeAttributes || { colors: [], sizes: [] };
            if (!nativeAttributesFromFS.colors) nativeAttributesFromFS.colors = [];
            const validatedSizes = (nativeAttributesFromFS.sizes || []).map((s: any) => ({
                id: s.id || crypto.randomUUID(),
                name: s.name,
            }));

            const cleanNativeVariations = (firestoreOptions?.nativeVariations || []).map(v => ({
                ...v,
                salePrice: v.salePrice ?? null,
            }));

            const finalOptions = {
                ...baseProduct,
                source,
                price: firestoreOptions?.price ?? baseProduct.price,
                salePrice: firestoreOptions?.salePrice ?? baseProduct.salePrice,
                shipping: firestoreOptions?.shipping ?? baseProduct.shipping ?? { weight: 0, length: 0, width: 0, height: 0 },
                type: firestoreOptions?.type ?? baseProduct.type,
                defaultViews: firestoreOptions?.defaultViews || [{
                    id: crypto.randomUUID(),
                    name: 'Default View',
                    imageUrl: 'https://placehold.co/600x600/eee/ccc?text=Default',
                    boundaryBoxes: [{ id: crypto.randomUUID(), name: 'Default Area', x: 25, y: 25, width: 50, height: 50 }],
                    price: 0
                }],
                optionsByColor: firestoreOptions?.optionsByColor || {},
                groupingAttributeName: firestoreOptions?.groupingAttributeName || (source === 'customizer-studio' ? 'Color' : null),
                nativeAttributes: { colors: nativeAttributesFromFS.colors, sizes: validatedSizes },
                nativeVariations: cleanNativeVariations,
                allowCustomization: firestoreOptions?.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true,
            };
            setProductOptions(finalOptions);

            const priceInputs: Record<string, string> = {};
            const salePriceInputs: Record<string, string> = {};
            cleanNativeVariations.forEach(v => {
                priceInputs[v.id] = String(v.price ?? '');
                salePriceInputs[v.id] = v.salePrice != null ? String(v.salePrice) : '';
            });
            setVariationPriceInputs(priceInputs);
            setVariationSalePriceInputs(salePriceInputs);

            setHasUnsavedChanges(isRefresh ? hasUnsavedChanges : false);
            if (isRefresh) toast({ title: "Product Data Refreshed", description: "Details updated from your store." });
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
        if (!productOptions && !error) { 
            fetchAndSetProductData(false); 
        }
        else { 
            setIsLoading(false); 
        }
    }, [authIsLoading, user?.uid, productIdFromUrl, productOptions, error, fetchAndSetProductData]);

    const generatedVariations = useMemo(() => {
      if (!productOptions || productOptions.type !== 'variable' || productOptions.source !== 'customizer-studio') {
          return [];
      }
      const { colors = [], sizes = [] } = productOptions.nativeAttributes || {};
      const variations: NativeProductVariation[] = [];
      
      const hasColors = colors.length > 0;
      const hasSizes = sizes.length > 0;

      if (!hasColors && !hasSizes) return [];

      const colorOptions = hasColors ? colors : [{ name: '', hex: '' }];
      const sizeOptions = hasSizes ? sizes : [{ id: '', name: '' }];
      
      colorOptions.forEach(color => {
          sizeOptions.forEach(size => {
              if (!color.name && !size.name) return;

              const attributes: Record<string, string> = {};
              let idParts: string[] = [];

              if (hasColors && color.name) {
                  attributes["Color"] = color.name;
                  idParts.push(`color-${color.name}`);
              }
              if (hasSizes && size.name) {
                  attributes["Size"] = size.name;
                  idParts.push(`size-${size.name}`);
              }
              
              const id = idParts.join('-').toLowerCase().replace(/\s+/g, '-');
              const existing = productOptions.nativeVariations?.find(v => v.id === id);

              variations.push({
                  id,
                  attributes,
                  price: existing?.price ?? (typeof productOptions.price === 'number' ? productOptions.price : 0),
                  salePrice: existing?.salePrice ?? null,
              });
          });
      });

      return variations;
    }, [productOptions]);
    
    // Auto-update nativeVariations when attributes change
    useEffect(() => {
        if (productOptions?.type === 'variable' && productOptions.source === 'customizer-studio') {
            const currentVariationIds = new Set(productOptions.nativeVariations.map(v => v.id));
            const generatedVariationIds = new Set(generatedVariations.map(v => v.id));
    
            if (currentVariationIds.size !== generatedVariationIds.size || !Array.from(currentVariationIds).every(id => generatedVariationIds.has(id))) {
                setProductOptions(prev => {
                    if (!prev) return null;
                    const existingVariationsMap = new Map(prev.nativeVariations.map(v => [v.id, v]));
                    const newVariations = generatedVariations.map(genVar => existingVariationsMap.get(genVar.id) || genVar);
                    return { ...prev, nativeVariations: newVariations };
                });
                setHasUnsavedChanges(true);
            }
        }
    }, [productOptions, generatedVariations]);


    const handleRefreshData = () => {
        if (source === 'customizer-studio') {
            toast({ title: "Not applicable", description: "Native products do not need to be refreshed.", variant: "default" });
            return;
        }
        if (!authIsLoading && user && productIdFromUrl) {
            fetchAndSetProductData(true);
        } else {
            toast({ title: "Cannot Refresh", description: "User or product ID missing.", variant: "destructive" });
        }
    };


    const handleSaveChanges = async () => {
        if (!productOptions || !user?.uid || !db || !firestoreDocId) {
            toast({ title: "Error", description: "Cannot save. Missing required data.", variant: "destructive" });
            return;
        }
        setIsSaving(true);

        const productOptionsToSave = JSON.parse(JSON.stringify(productOptions));

        const cleanOptionsByColor: Record<string, ColorGroupOptions> = {};
        for (const colorKey in productOptionsToSave.optionsByColor) {
            const group = productOptionsToSave.optionsByColor[colorKey];
            const hasOverrides = group.views && group.views.length > 0;
            if (hasOverrides) {
                cleanOptionsByColor[colorKey] = {
                    selectedVariationIds: group.selectedVariationIds || [],
                    views: (group.views || []).map((view: any) => ({
                        ...view,
                        boundaryBoxes: view.boundaryBoxes || [],
                        price: Number(view.price) || 0
                    })),
                };
            } else {
                // Ensure empty/null view properties are removed if no overrides exist
                cleanOptionsByColor[colorKey] = {
                    selectedVariationIds: group.selectedVariationIds || [],
                    views: [],
                };
            }
        }

        const dataToSave: { [key: string]: any } = {
            id: productOptionsToSave.id,
            price: Number(productOptionsToSave.price) || 0,
            type: productOptionsToSave.type,
            allowCustomization: productOptionsToSave.allowCustomization,
            defaultViews: [],
            optionsByColor: cleanOptionsByColor,
            groupingAttributeName: productOptionsToSave.groupingAttributeName || null,
            nativeAttributes: {
                colors: productOptionsToSave.nativeAttributes.colors || [],
                sizes: productOptionsToSave.nativeAttributes.sizes.map((s: any) => ({ id: s.id, name: s.name })) || [],
            },
            lastSaved: serverTimestamp(),
        };

        if (productOptionsToSave.salePrice !== null && productOptionsToSave.salePrice !== undefined && String(productOptionsToSave.salePrice).trim() !== '') {
            dataToSave.salePrice = Number(productOptionsToSave.salePrice);
        } else {
            dataToSave.salePrice = deleteField();
        }

        if (productOptions.source === 'customizer-studio') {
            const productBaseData: Partial<NativeProduct> = {
                name: productOptionsToSave.name,
                description: productOptionsToSave.description,
                brand: productOptionsToSave.brand || undefined,
                sku: productOptionsToSave.sku || undefined,
                category: productOptionsToSave.category || undefined,
                customizationTechniques: productOptionsToSave.customizationTechniques || [],
                lastModified: serverTimestamp()
            };
            const productBaseRef = doc(db, `users/${user.uid}/products`, firestoreDocId);
            await setDoc(productBaseRef, productBaseData, { merge: true });
        }

        if (Array.isArray(productOptionsToSave.nativeVariations)) {
            dataToSave.nativeVariations = productOptionsToSave.nativeVariations.map((variation: any) => {
                const cleanVariation: { [key: string]: any } = {
                    id: variation.id,
                    attributes: variation.attributes,
                    price: Number(variation.price) || 0,
                };
                if (variation.salePrice !== null && variation.salePrice !== undefined && String(variation.salePrice).trim() !== '') {
                    cleanVariation.salePrice = Number(variation.salePrice);
                }
                return cleanVariation;
            });
        } else {
            dataToSave.nativeVariations = [];
        }
        
        dataToSave.shipping = productOptionsToSave.shipping || { weight: 0, length: 0, width: 0, height: 0 };


        try {
            const docRef = doc(db, 'userProductOptions', user.uid, 'products', firestoreDocId);
            await setDoc(docRef, dataToSave, { merge: true });

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
            toast({ title: "Save Changes", description: "Please save your changes before opening in customizer.", variant: "default" });
            return;
        }
        if (!productOptions.allowCustomization) {
            toast({ title: "Customization Disabled", description: "This product is currently marked as 'Do Not Customize'.", variant: "default" });
            return;
        }
        router.push(`/customizer?productId=${productOptions.id}&source=${productOptions.source}`);
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
            if (!sizeName) { toast({ title: "Size name is required.", variant: "destructive" }); return; }
            if (productOptions.nativeAttributes.sizes.some(s => s.name.toLowerCase() === sizeName.toLowerCase())) { toast({ title: "Size already exists.", variant: "destructive" }); return; }
            const newSize: SizeAttribute = { id: crypto.randomUUID(), name: sizeName };
            const newSizes = [...productOptions.nativeAttributes.sizes, newSize];
            setProductOptions(prev => prev ? { ...prev, nativeAttributes: { ...prev.nativeAttributes, sizes: newSizes } } : null);
            setSizeInputValue("");
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
        if (field === 'price') {
            setVariationPriceInputs(prev => ({ ...prev, [id]: value }));
        } else {
            setVariationSalePriceInputs(prev => ({ ...prev, [id]: value }));
        }
        setHasUnsavedChanges(true);
    };

    const handleVariationFieldBlur = (id: string, field: 'price' | 'salePrice') => {
        const value = field === 'price' ? variationPriceInputs[id] : variationSalePriceInputs[id];
        const numValue = value.trim() === '' ? null : parseFloat(value);

        if (field === 'price' && (numValue === null || isNaN(numValue))) {
            toast({ title: "Invalid Price", description: "Base price for a variation cannot be empty.", variant: "destructive" });
            setVariationPriceInputs(prev => ({ ...prev, [id]: productOptions?.nativeVariations.find(v => v.id === id)?.price.toString() || '0' }));
            return;
        }

        if (value.trim() !== '' && isNaN(numValue as number)) {
            toast({ title: "Invalid Number", description: "Please enter a valid number for the price.", variant: "destructive" });
            if (field === 'price') {
                setVariationPriceInputs(prev => ({ ...prev, [id]: productOptions?.nativeVariations.find(v => v.id === id)?.price.toString() || '0' }));
            } else {
                setVariationSalePriceInputs(prev => ({ ...prev, [id]: productOptions?.nativeVariations.find(v => v.id === id)?.salePrice?.toString() || '' }));
            }
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
                const template = generatedVariations.find(v => v.id === id);
                if (!template) return prev;

                const newVariation: NativeProductVariation = {
                    ...template,
                    salePrice: null
                };
                (newVariation as any)[field] = numValue;
                updatedVariations = [...prev.nativeVariations, newVariation];
            }
            return { ...prev, nativeVariations: updatedVariations };
        });
    };

    const handleBulkUpdate = (field: 'price' | 'salePrice') => {
        const valueStr = field === 'price' ? bulkPrice : bulkSalePrice;
        if (valueStr === '' && field === 'price') {
            toast({ title: "Invalid Price", description: "Base price cannot be empty.", variant: "destructive" });
            return;
        }
        const value = valueStr.trim() === '' ? null : parseFloat(valueStr);
        if (valueStr.trim() !== '' && isNaN(value as number)) {
            toast({ title: "Invalid Price", description: "Please enter a valid number.", variant: "destructive" });
            return;
        }

        const updatedPriceInputs = { ...variationPriceInputs };
        const updatedSalePriceInputs = { ...variationSalePriceInputs };

        generatedVariations.forEach(genVar => {
            if (field === 'price' && value !== null) {
                updatedPriceInputs[genVar.id] = value.toString();
            } else if (field === 'salePrice') {
                updatedSalePriceInputs[genVar.id] = value !== null ? value.toString() : '';
            }
        });
        setVariationPriceInputs(updatedPriceInputs);
        setVariationSalePriceInputs(updatedSalePriceInputs);

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
        toast({ title: "Prices Updated", description: `All variations' ${field}s have been updated.` });
    };

    const handleBasePriceChange = (value: string) => {
        if (!productOptions) return;
        setProductOptions({ ...productOptions, price: value });
        setHasUnsavedChanges(true);
    };

    const handleSalePriceChange = (value: string) => {
        if (!productOptions) return;
        setProductOptions({ ...productOptions, salePrice: value });
        setHasUnsavedChanges(true);
    };

    const handlePriceBlur = (field: 'price' | 'salePrice') => {
        if (!productOptions) return;
        const value = field === 'price' ? productOptions.price : productOptions.salePrice;
        const numValue = Number(value);

        if (String(value).trim() === '' && field === 'salePrice') {
            setProductOptions({ ...productOptions, salePrice: null });
            return;
        }

        if (isNaN(numValue)) {
            const originalValue = field === 'price' ? 0 : null;
            setProductOptions({ ...productOptions, [field]: originalValue });
        } else {
            setProductOptions({ ...productOptions, [field]: numValue });
        }
    };
    
    const handleOpenViewEditor = (color: string) => {
      setActiveEditingColor(color);
      setIsViewEditorOpen(true);
    };

    const handleSaveViewsForColor = (colorName: string, newViews: ProductView[]) => {
      setProductOptions(prev => {
          if (!prev) return null;
          const newOptionsByColor = { ...prev.optionsByColor };
          const currentGroup = newOptionsByColor[colorName] || { selectedVariationIds: [], views: [] };
          newOptionsByColor[colorName] = { ...currentGroup, views: newViews };
          return { ...prev, optionsByColor: newOptionsByColor };
      });
      setHasUnsavedChanges(true);
      setIsViewEditorOpen(false);
      toast({ title: "Views Updated", description: `Views for ${colorName} have been updated locally. Remember to save all changes.` });
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

    const isPriceDisabled = productOptions.source === 'customizer-studio' && productOptions.type === 'variable';


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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-md">
                        <CardHeader><CardTitle className="font-headline text-lg">Base Product Information</CardTitle><CardDescription>From your {source} store {source !== 'customizer-studio' && '(Read-only)'}.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label htmlFor="productName">Product Name</Label><Input id="productName" value={productOptions.name} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, name: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label htmlFor="productBrand">Brand</Label><Input id="productBrand" value={productOptions.brand || ''} placeholder="e.g., Gildan" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, brand: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                                <div><Label htmlFor="productSku">SKU</Label><Input id="productSku" value={productOptions.sku || ''} placeholder="e.g., G5000-WHT-LG" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, sku: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                            </div>
                            <div><Label htmlFor="productDescription">Description</Label><Textarea id="productDescription" value={productOptions.description} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} rows={4} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, description: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="productPrice">Base Price ($)</Label>
                                    <Input id="productPrice" type="text" value={productOptions.price} onChange={e => handleBasePriceChange(e.target.value)} onBlur={() => handlePriceBlur('price')} className={cn("mt-1", (source !== 'customizer-studio' || isPriceDisabled) ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio' || isPriceDisabled} title={isPriceDisabled ? "Managed by variations." : "Base price for simple product."} />
                                    {isPriceDisabled && <p className="text-xs text-muted-foreground mt-1">Disabled for variable products.</p>}
                                </div>
                                <div>
                                    <Label htmlFor="salePrice">Sale Price ($)</Label>
                                    <Input id="salePrice" type="text" value={productOptions.salePrice ?? ''} onChange={e => handleSalePriceChange(e.target.value)} onBlur={() => handlePriceBlur('salePrice')} placeholder="Optional" className={cn("mt-1", (source !== 'customizer-studio' || isPriceDisabled) ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio' || isPriceDisabled} title={isPriceDisabled ? "Managed by variations." : "Sale price for simple product."} />
                                </div>
                                <div>
                                    <Label htmlFor="productType">Type</Label>
                                    {source !== 'customizer-studio' ? (<Input id="productType" value={productOptions.type.charAt(0).toUpperCase() + productOptions.type.slice(1)} className="mt-1 bg-muted/50" readOnly />) : (
                                        <Select value={productOptions.type} onValueChange={(value: 'simple' | 'variable') => { setProductOptions(prev => prev ? { ...prev, type: value } : null); setHasUnsavedChanges(true); }}>
                                            <SelectTrigger id="productType" className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                                            <SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="variable">Variable</SelectItem></SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Customization Settings</CardTitle><CardDescription>Control how this product can be customized.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/20"><Checkbox id="allowCustomization" checked={productOptions.allowCustomization} onCheckedChange={(checked) => { const isChecked = checked as boolean; setProductOptions(prev => prev ? { ...prev, allowCustomization: isChecked } : null); setHasUnsavedChanges(true); }} /><div className="grid gap-1.5 leading-none"><Label htmlFor="allowCustomization" className="text-sm font-medium text-foreground cursor-pointer">Enable Product Customization</Label><p className="text-xs text-muted-foreground">If unchecked, the "Customize" button will not appear for this product.</p></div></div></CardContent></Card>
                    
                    {source === 'customizer-studio' && (
                        <Card className="shadow-md">
                            <CardHeader><CardTitle className="font-headline text-lg">Product Attributes &amp; Techniques</CardTitle><CardDescription>Define colors, sizes, and available customization methods for this product.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div><Label className="flex items-center mb-2"><Gem className="h-4 w-4 mr-2 text-primary" /> Customization Techniques</Label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{CUSTOMIZATION_TECHNIQUES.map(technique => (<div key={technique} className="flex items-center space-x-2"><Checkbox id={`tech-${technique}`} checked={productOptions.customizationTechniques?.includes(technique)} onCheckedChange={(checked) => handleCustomizationTechniqueChange(technique, checked as boolean)} /><Label htmlFor={`tech-${technique}`} className="font-normal">{technique}</Label></div>))}</div></div>
                                <Separator />
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div><Label className="flex items-center mb-2"><Palette className="h-4 w-4 mr-2 text-primary" /> Colors</Label><div className="flex items-center gap-2"><Input id="color-input" placeholder="e.g., Red" value={colorInputValue} onChange={e => setColorInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('colors'); } }} /><Input id="color-hex-input" type="color" value={colorHexValue} onChange={e => setColorHexValue(e.target.value)} className="p-1 h-10 w-12" /><Button type="button" onClick={() => handleAddAttribute('colors')}>Add</Button></div><div className="flex flex-wrap gap-2 mt-2">{productOptions.nativeAttributes.colors.map((color) => (<Badge key={`${color.name}-${color.hex}`} variant="secondary" className="text-sm"><div className="w-3 h-3 rounded-full mr-1.5 border" style={{ backgroundColor: color.hex }}></div>{color.name}<button onClick={() => handleRemoveAttribute('colors', color.name)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3" /></button></Badge>))}</div></div>
                                    <div><Label htmlFor="size-input" className="flex items-center mb-2"><Ruler className="h-4 w-4 mr-2 text-primary" /> Sizes</Label><div className="flex gap-2"><Input id="size-input" placeholder="e.g., XL" value={sizeInputValue} onChange={e => setSizeInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('sizes'); } }} /><Button type="button" onClick={() => handleAddAttribute('sizes')}>Add</Button></div><div className="flex flex-wrap gap-2 mt-2">{productOptions.nativeAttributes.sizes.map((size) => (<Badge key={size.id} variant="secondary" className="text-sm">{size.name}<button onClick={() => handleRemoveAttribute('sizes', size.id)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20"><X className="h-3 w-3" /></button></Badge>))}</div></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
                    <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg flex items-center gap-2"><TruckIcon /> Shipping Attributes</CardTitle><CardDescription>Enter shipping details for native store calculations.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><Label htmlFor="shippingWeight">Weight (lbs)</Label><Input id="shippingWeight" type="text" value={productOptions.shipping?.weight || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), weight: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
                        <div><Label htmlFor="shippingLength">Length (in)</Label><Input id="shippingLength" type="text" value={productOptions.shipping?.length || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), length: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
                        <div><Label htmlFor="shippingWidth">Width (in)</Label><Input id="shippingWidth" type="text" value={productOptions.shipping?.width || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), width: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
                        <div><Label htmlFor="shippingHeight">Height (in)</Label><Input id="shippingHeight" type="text" value={productOptions.shipping?.height || ''} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, shipping: { ...(prev.shipping || { weight: 0, length: 0, width: 0, height: 0 }), height: parseFloat(e.target.value) || 0 } } : null); setHasUnsavedChanges(true); }} className="mt-1" /></div>
                    </div></CardContent>
                    </Card>

                    {source === 'customizer-studio' && productOptions.type === 'variable' && (
                      <Card className="shadow-md">
                        <CardHeader>
                          <CardTitle className="font-headline text-lg">Variation Images & Areas</CardTitle>
                          <CardDescription>
                            Define specific views and customization areas for each color variation.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {productOptions.nativeAttributes.colors.length > 0 ? (
                            productOptions.nativeAttributes.colors.map(color => (
                              <div key={color.name} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full border" style={{backgroundColor: color.hex}}></div>
                                  <span className="font-medium">{color.name}</span>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleOpenViewEditor(color.name)}>
                                  <Pencil className="mr-2 h-3 w-3" /> Edit Views
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Add color attributes to set variation-specific views.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {productOptions.type === 'variable' && productOptions.source === 'customizer-studio' && <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Variation Pricing</CardTitle><CardDescription>Set individual prices for each product variant.</CardDescription></CardHeader><CardContent>{!generatedVariations || generatedVariations.length === 0 ? (<div className="text-center py-6 text-muted-foreground"><Info className="mx-auto h-10 w-10 mb-2" /><p>Define at least one color or size to create variations.</p></div>) : (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div className="flex gap-2"><Input type="text" placeholder="Set all prices..." value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="h-9" /><Button onClick={() => handleBulkUpdate('price')} variant="secondary" size="sm">Apply Price</Button></div><div className="flex gap-2"><Input type="text" placeholder="Set all sale prices..." value={bulkSalePrice} onChange={(e) => setBulkSalePrice(e.target.value)} className="h-9" /><Button onClick={() => handleBulkUpdate('salePrice')} variant="secondary" size="sm">Apply Sale Price</Button></div></div><div className="max-h-96 overflow-y-auto border rounded-md"><Table><TableHeader className="sticky top-0 bg-muted/50 z-10"><TableRow>{Object.keys(generatedVariations[0].attributes).map(attrName => (<TableHead key={attrName}>{attrName}</TableHead>))}<TableHead className="text-right">Price</TableHead><TableHead className="text-right">Sale Price</TableHead></TableRow></TableHeader><TableBody>{generatedVariations.map(variation => { return (<TableRow key={variation.id}>{Object.values(variation.attributes).map((val, i) => (<TableCell key={`${variation.id}-attr-${i}`}>{val}</TableCell>))}<TableCell className="text-right"><div className="relative flex items-center justify-end"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" value={variationPriceInputs[variation.id] ?? ''} onChange={e => { handleVariationFieldChange(variation.id, 'price', e.target.value); }} onBlur={() => handleVariationFieldBlur(variation.id, 'price')} className="h-8 w-28 pl-7 text-right" /></div></TableCell><TableCell className="text-right"><div className="relative flex items-center justify-end"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="None" value={variationSalePriceInputs[variation.id] ?? ''} onChange={e => handleVariationFieldChange(variation.id, 'salePrice', e.target.value)} onBlur={() => handleVariationFieldBlur(variation.id, 'salePrice')} className="h-8 w-28 pl-7 text-right" /></div></TableCell></TableRow>);})}</TableBody></Table></div></>)}</CardContent></Card>}
                </div>

                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-md sticky top-8">
                        <CardHeader><CardTitle className="font-headline text-lg">Summary & Actions</CardTitle><CardDescription>Review your setup and save changes.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span></div>
                            <div className="text-sm text-muted-foreground">Customization: <Badge variant={productOptions.allowCustomization ? "default" : "secondary"} className={productOptions.allowCustomization ? "bg-green-500/10 text-green-700 border-green-500/30" : ""}>{productOptions.allowCustomization ? "Enabled" : "Disabled"}</Badge></div>
                            {hasUnsavedChanges && (<div className="mt-3 text-sm text-yellow-600 flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500" />You have unsaved changes.</div>)}
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-3">
                            <Button onClick={handleSaveChanges} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save All Configurations</Button>
                            <Button variant="outline" size="lg" onClick={handleOpenInCustomizer} disabled={hasUnsavedChanges || !productOptions.allowCustomization} className="hover:bg-accent hover:text-accent-foreground"><ExternalLink className="mr-2 h-4 w-4" />Open in Customizer</Button>
                            {!productOptions.allowCustomization && <p className="text-xs text-center text-muted-foreground">Customization is currently disabled.</p>}
                        </CardFooter>
                    </Card>
                </div>
            </div>
            
            <Dialog open={isViewEditorOpen} onOpenChange={setIsViewEditorOpen}>
              <DialogContent className="max-w-4xl">
                  {productOptions && activeEditingColor && (
                      <ProductViewSetup 
                          initialViews={productOptions.optionsByColor[activeEditingColor]?.views || []}
                          variationColorName={activeEditingColor}
                          onSaveViews={(newViews) => handleSaveViewsForColor(activeEditingColor, newViews)}
                          onCancel={() => setIsViewEditorOpen(false)}
                      />
                  )}
              </DialogContent>
            </Dialog>

        </div>
    );
}
