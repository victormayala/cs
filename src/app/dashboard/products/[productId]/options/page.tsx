
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Edit2, DollarSign, PlugZap, Edit3, Save, Settings, Palette, Ruler, X, Info, Gem, Package, Truck as TruckIcon, Pencil, PlusCircle, Maximize2, Trash2, UploadCloud, FolderIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById } from '@/app/actions/woocommerceActions';
import type { WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, deleteField, collection, query, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { ProductOptionsFirestoreData, BoundaryBox, ProductView, ColorGroupOptions, ProductAttributeOptions, NativeProductVariation, ShippingAttributes } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';


export interface SizeAttribute {
    id: string;
    name: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId: string | null;
  children?: ProductCategory[];
}

const CUSTOMIZATION_TECHNIQUES_OPTIONS: CustomizationTechnique[] = ['Embroidery', 'DTF', 'DTG', 'Sublimation', 'Screen Printing'];

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
  nativeVariations: (Omit<NativeProductVariation, 'price'|'salePrice'> & { price: number|string, salePrice?: number|string|null })[];
  allowCustomization: boolean;
  source: 'woocommerce' | 'shopify' | 'customizer-studio';
}

const MAX_PRODUCT_VIEWS = 5;
const MIN_BOX_SIZE_PERCENT = 5;

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

function ProductOptionsPage() {
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
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [colorInputValue, setColorInputValue] = useState("");
  const [colorHexValue, setColorHexValue] = useState("#000000");
  const [sizeInputValue, setSizeInputValue] = useState("");
  
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // State for the View Editor Modal
  const [isViewEditorOpen, setIsViewEditorOpen] = useState(false);
  const [activeEditingColor, setActiveEditingColor] = useState('');
  // Internal state for the editor
  const [editorViews, setEditorViews] = useState<ProductView[]>([]);
  const [activeViewIdInEditor, setActiveViewIdInEditor] = useState<string | null>(null);
  const [selectedBoundaryBoxId, setSelectedBoundaryBoxId] = useState<string | null>(null);
  const [isDeleteViewDialogOpen, setIsDeleteViewDialogOpen] = useState(false);
  const [viewIdToDelete, setViewIdToDelete] = useState<string | null>(null);
  
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<DOMRect | null>(null);
  type ActiveDragState = { type: 'move' | 'resize_br' | 'resize_bl' | 'resize_tr' | 'resize_tl'; boxId: string; pointerStartX: number; pointerStartY: number; initialBoxX: number; initialBoxY: number; initialBoxWidth: number; initialBoxHeight: number; };
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        if (!user) return;
        const fetchCategories = async () => {
            const catRef = collection(db, `users/${user.uid}/productCategories`);
            const q = query(catRef);
            const querySnapshot = await getDocs(q);
            const fetchedCategories: ProductCategory[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                fetchedCategories.push({ id: doc.id, name: data.name, parentId: data.parentId || null });
            });
            setCategories(fetchedCategories);
        };
        fetchCategories();
    }, [user]);

    const handleImageUpload = async (file: File, viewId: string, isDefaultImage: boolean = false) => {
        if (!user || !storage) {
            toast({ title: "Error", description: "User not authenticated or storage service is unavailable.", variant: "destructive" });
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid file type", description: "Please upload an image (PNG, JPG, etc.).", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
            return;
        }

        const storagePath = `users/${user.uid}/products/${firestoreDocId}/${viewId}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({ ...prev, [viewId]: progress }));
            },
            (error) => {
                console.error("Upload error:", error);
                toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
                setUploadProgress(prev => ({ ...prev, [viewId]: 0 }));
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    if(isDefaultImage) {
                        setProductOptions(prev => {
                            if (!prev) return null;
                            const newDefaultViews = [{ ...prev.defaultViews[0], imageUrl: downloadURL }];
                            return { ...prev, defaultViews: newDefaultViews };
                        })
                    } else {
                        handleEditorViewDetailChange(viewId, 'imageUrl', downloadURL);
                    }
                    toast({ title: "Upload Complete", description: `Image has been updated.` });
                    setUploadProgress(prev => ({ ...prev, [viewId]: 0 }));
                });
            }
        );
    };

    const fetchAndSetProductData = useCallback(async (isRefresh = false) => {
        if (!user?.uid || !productIdFromUrl || !db) {
            setError("User or Product ID invalid, or DB not ready.");
            if (isRefresh) setIsRefreshing(false); else setIsLoading(false);
            return;
        }
        if (isRefresh) setIsRefreshing(true); else setIsLoading(true);
        setError(null);
        try {
            const { options: firestoreOptions, error: firestoreError } = await loadProductOptionsFromFirestoreClient(user.uid, firestoreDocId);
            if (firestoreError) toast({ title: "Settings Load Issue", description: `Could not load saved settings: ${firestoreError}`, variant: "default" });

            let baseProduct: { id: string; name: string; description: string; price: number | string; type: any; salePrice: number | string | null; brand?: string; sku?: string; category?: string; customizationTechniques?: CustomizationTechnique[]; shipping?: ShippingAttributes };
            if (source === 'shopify') {
                const credDocRef = doc(db, 'userShopifyCredentials', user.uid);
                const credDocSnap = await getDoc(credDocRef);
                if (!credDocSnap.exists()) throw new Error("Shopify store not connected. Please go to Dashboard > 'Store Integration'.");
                const creds = credDocSnap.data() as UserShopifyCredentials;
                const { product, error } = await fetchShopifyProductById(creds.shop, creds.accessToken, productIdFromUrl);
                if (error || !product) throw new Error(error || `Shopify product ${productIdFromUrl} not found.`);
                baseProduct = {
                    id: product.id, name: product.title,
                    description: product.description || 'No description available.',
                    price: parseFloat(product.priceRangeV2?.minVariantPrice.amount || '0'),
                    salePrice: null,
                    type: 'shopify',
                    shipping: { weight: 0, length: 0, width: 0, height: 0 },
                };
            } else if (source === 'woocommerce') {
                const credDocRef = doc(db, 'userWooCommerceCredentials', user.uid);
                const credDocSnap = await getDoc(credDocRef);
                if (!credDocSnap.exists()) throw new Error("WooCommerce store not connected. Please go to Dashboard > 'Store Integration'.");
                const credsData = credDocSnap.data() as UserWooCommerceCredentials;
                const userCredentialsToUse: WooCommerceCredentials = { storeUrl: credsData.storeUrl, consumerKey: credsData.consumerKey, consumerSecret: credsData.consumerSecret, };
                const { product, error } = await fetchWooCommerceProductById(firestoreDocId, userCredentialsToUse);
                if (error || !product) throw new Error(error || `WooCommerce product ${firestoreDocId} not found.`);
                baseProduct = {
                    id: product.id.toString(), name: product.name,
                    description: product.description?.replace(/<[^>]+>/g, '') || product.short_description?.replace(/<[^>]+>/g, '') || 'No description.',
                    price: parseFloat(product.regular_price) || 0,
                    salePrice: product.sale_price ? parseFloat(product.sale_price) : null,
                    type: product.type,
                    shipping: { weight: 0, length: 0, width: 0, height: 0 },
                };
            } else { // source === 'customizer-studio'
                const productDocRef = doc(db, `users/${user.uid}/products`, firestoreDocId);
                const productDocSnap = await getDoc(productDocRef);
                if (!productDocSnap.exists()) throw new Error(`Native product with ID ${firestoreDocId} not found.`);
                const nativeProduct = productDocSnap.data() as NativeProduct;
                baseProduct = {
                    id: firestoreDocId, name: nativeProduct.name,
                    description: nativeProduct.description || 'No description provided.',
                    price: firestoreOptions?.price ?? 0,
                    salePrice: firestoreOptions?.salePrice ?? null,
                    type: firestoreOptions?.type ?? 'simple',
                    brand: nativeProduct.brand, sku: nativeProduct.sku,
                    category: nativeProduct.category, customizationTechniques: nativeProduct.customizationTechniques,
                    shipping: { weight: 0, length: 0, width: 0, height: 0 },
                };
            }

            const nativeAttributesFromFS = firestoreOptions?.nativeAttributes || { colors: [], sizes: [] };
            if (!nativeAttributesFromFS.colors) nativeAttributesFromFS.colors = [];
            const validatedSizes = (nativeAttributesFromFS.sizes || []).map((s: any) => ({ id: s.id || crypto.randomUUID(), name: s.name, }));

            const finalOptions: ProductOptionsData = {
                ...baseProduct,
                source,
                price: firestoreOptions?.price ?? baseProduct.price,
                salePrice: firestoreOptions?.salePrice ?? baseProduct.salePrice,
                shipping: firestoreOptions?.shipping ?? baseProduct.shipping ?? { weight: 0, length: 0, width: 0, height: 0 },
                type: firestoreOptions?.type ?? baseProduct.type,
                defaultViews: firestoreOptions?.defaultViews && firestoreOptions.defaultViews.length > 0 
                    ? firestoreOptions.defaultViews 
                    : [{ id: 'default_plp_view', name: 'Default Image', imageUrl: 'https://placehold.co/600x600/eee/ccc?text=Default', boundaryBoxes: [], price: 0 }],
                optionsByColor: firestoreOptions?.optionsByColor || {},
                groupingAttributeName: firestoreOptions?.groupingAttributeName || (source === 'customizer-studio' ? 'Color' : null),
                nativeAttributes: { colors: nativeAttributesFromFS.colors, sizes: validatedSizes },
                nativeVariations: (firestoreOptions?.nativeVariations || []).map(v => ({ ...v, salePrice: v.salePrice ?? null })),
                allowCustomization: firestoreOptions?.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true,
            };
            setProductOptions(finalOptions);
            setHasUnsavedChanges(false);
            if (isRefresh) toast({ title: "Product Data Refreshed", description: "Details updated from your store." });
        } catch (e: any) {
            console.error("Error in fetchAndSetProductData:", e.message);
            setError(e.message);
            setProductOptions(null);
        } finally {
            if (isRefresh) setIsRefreshing(false);
            else setIsLoading(false);
        }
    }, [productIdFromUrl, firestoreDocId, source, user?.uid, toast]);

    useEffect(() => {
        if (authIsLoading) return;
        if (!user?.uid) { setError("User not authenticated."); setIsLoading(false); return; }
        if (!productIdFromUrl) { setError("Product ID is missing."); setIsLoading(false); return; }
        fetchAndSetProductData(false);
    }, [authIsLoading, user?.uid, productIdFromUrl, fetchAndSetProductData]);

    const handleRefreshData = () => {
        if (source === 'customizer-studio') { toast({ title: "Not applicable", description: "Native products do not need to be refreshed.", variant: "default" }); return; }
        if (!authIsLoading && user && productIdFromUrl) { fetchAndSetProductData(true); }
        else { toast({ title: "Cannot Refresh", description: "User or product ID missing.", variant: "destructive" }); }
    };

    const handleSaveChanges = async () => {
        if (!productOptions || !user?.uid || !db || !firestoreDocId) {
            toast({ title: "Error", description: "Cannot save. Missing required data.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
    
        const dataToSave: { [key: string]: any } = {};
    
        dataToSave.price = Number(productOptions.price) || 0;
        dataToSave.type = productOptions.type;
        dataToSave.allowCustomization = productOptions.allowCustomization;
        dataToSave.defaultViews = productOptions.defaultViews || [];
        dataToSave.optionsByColor = productOptions.optionsByColor || {};
        dataToSave.groupingAttributeName = productOptions.groupingAttributeName || null;
        dataToSave.nativeAttributes = {
            colors: productOptions.nativeAttributes.colors || [],
            sizes: (productOptions.nativeAttributes.sizes || []).map((s: any) => ({ id: s.id, name: s.name })),
        };
        dataToSave.shipping = productOptions.shipping || { weight: 0, length: 0, width: 0, height: 0 };
        dataToSave.lastSaved = serverTimestamp();
    
        if (productOptions.salePrice !== null && productOptions.salePrice !== undefined && String(productOptions.salePrice).trim() !== '') {
            dataToSave.salePrice = Number(productOptions.salePrice);
        } else {
            dataToSave.salePrice = deleteField();
        }
    
        if (source === 'customizer-studio') {
            const productBaseData: { [key: string]: any } = {
                name: productOptions.name,
                description: productOptions.description,
                lastModified: serverTimestamp()
            };
            productBaseData.brand = productOptions.brand || deleteField();
            productBaseData.sku = productOptions.sku || deleteField();
            productBaseData.category = productOptions.category || deleteField();
            productBaseData.customizationTechniques = productOptions.customizationTechniques?.length ? productOptions.customizationTechniques : deleteField();
            
            await setDoc(doc(db, `users/${user.uid}/products`, firestoreDocId), productBaseData, { merge: true });
        }
    
        if (Array.isArray(productOptions.nativeVariations)) {
            dataToSave.nativeVariations = productOptions.nativeVariations.map((variation) => {
                const cleanVariation: { [key: string]: any } = {
                    id: variation.id,
                    attributes: variation.attributes,
                    price: Number(variation.price) || 0,
                };
                const salePriceNum = Number(variation.salePrice);
                if (variation.salePrice != null && String(variation.salePrice).trim() !== '' && !isNaN(salePriceNum)) {
                    cleanVariation.salePrice = salePriceNum;
                } else {
                    cleanVariation.salePrice = null;
                }
                return cleanVariation;
            });
        } else {
            dataToSave.nativeVariations = [];
        }
    
        try {
            await setDoc(doc(db, 'userProductOptions', user.uid, 'products', firestoreDocId), dataToSave, { merge: true });
            toast({ title: "Saved", description: "Your product configurations have been saved." });
            setHasUnsavedChanges(false);
        } catch (error: any) {
            let description = `Failed to save options: ${error.message || "Unknown Firestore error"}`;
            if (error.code === 'permission-denied') {
                description = "Save failed due to permissions. Please check your Firestore security rules for writes.";
            }
            toast({ title: "Save Error", description, variant: "destructive" });
            console.error("Firestore save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenInCustomizer = () => {
        if (!productOptions || hasUnsavedChanges) { toast({ title: "Save Changes", description: "Please save your changes before opening in customizer.", variant: "default" }); return; }
        if (!productOptions.allowCustomization) { toast({ title: "Customization Disabled", description: "This product is currently marked as 'Do Not Customize'.", variant: "default" }); return; }
        router.push(`/customizer?productId=${productOptions.id}&source=${productOptions.source}`);
    };
    
    const regenerateVariations = useCallback((options: ProductOptionsData): ProductOptionsData['nativeVariations'] => {
      if (options.type !== 'variable' || options.source !== 'customizer-studio') return options.nativeVariations || [];
      const { colors = [], sizes = [] } = options.nativeAttributes || {};
      if (colors.length === 0 && sizes.length === 0) return [];
      const colorOptions = colors.length > 0 ? colors : [{ name: '', hex: '' }];
      const sizeOptions = sizes.length > 0 ? sizes : [{ id: '', name: '' }];
      const newVariations: ProductOptionsData['nativeVariations'] = [];
      colorOptions.forEach(color => {
          sizeOptions.forEach(size => {
              if (!color.name && !size.name) return;
              const attributes: Record<string, string> = {};
              let idParts: string[] = [];
              if (color.name) { attributes["Color"] = color.name; idParts.push(`color-${color.name}`); }
              if (size.name) { attributes["Size"] = size.name; idParts.push(`size-${size.name}`); }
              const id = idParts.join('-').toLowerCase().replace(/\s+/g, '-');
              const existing = options.nativeVariations?.find(v => v.id === id);
              newVariations.push({ id, attributes, price: existing?.price ?? (typeof options.price === 'number' ? options.price : 0), salePrice: existing?.salePrice ?? null });
          });
      });
      return newVariations;
    }, []);
    
    const handleAddAttribute = useCallback((type: 'colors' | 'sizes') => {
        setProductOptions(prev => {
            if (!prev) return null;
            let updatedAttributes = { ...prev.nativeAttributes };
            if (type === 'colors') {
                const name = colorInputValue.trim();
                if (!name) { toast({ title: "Color name is required.", variant: "destructive" }); return prev; }
                if (prev.nativeAttributes.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast({ title: "Color already exists.", variant: "destructive" }); return prev; }
                updatedAttributes.colors = [...prev.nativeAttributes.colors, { name, hex: colorHexValue }];
            } else {
                const sizeName = sizeInputValue.trim();
                if (!sizeName) { toast({ title: "Size name is required.", variant: "destructive" }); return prev; }
                if (prev.nativeAttributes.sizes.some(s => s.name.toLowerCase() === sizeName.toLowerCase())) { toast({ title: "Size already exists.", variant: "destructive" }); return prev; }
                updatedAttributes.sizes = [...prev.nativeAttributes.sizes, { id: crypto.randomUUID(), name: sizeName }];
            }
            const updatedOptions = { ...prev, nativeAttributes: updatedAttributes };
            const newVariations = regenerateVariations(updatedOptions);

            if (type === 'colors') { setColorInputValue(""); setColorHexValue("#000000"); }
            else { setSizeInputValue(""); }
            setHasUnsavedChanges(true);
            return { ...updatedOptions, nativeVariations: newVariations };
        });
    }, [colorInputValue, colorHexValue, sizeInputValue, toast, regenerateVariations]);
    
    const handleRemoveAttribute = useCallback((type: 'colors' | 'sizes', value: string) => {
        setProductOptions(prev => {
            if (!prev) return null;
            let updatedAttributes = { ...prev.nativeAttributes };
            let updatedOptionsByColor = { ...prev.optionsByColor };
            if (type === 'colors') {
                updatedAttributes.colors = updatedAttributes.colors.filter(item => item.name !== value);
                delete updatedOptionsByColor[value];
            } else {
                updatedAttributes.sizes = prev.nativeAttributes.sizes.filter(item => item.id !== value);
            }
            const updatedOptions = { ...prev, nativeAttributes: updatedAttributes, optionsByColor: updatedOptionsByColor };
            const newVariations = regenerateVariations(updatedOptions);
            setHasUnsavedChanges(true);
            return { ...updatedOptions, nativeVariations: newVariations };
        });
    }, [regenerateVariations]);

    const handleReorderAttribute = useCallback((type: 'colors' | 'sizes', index: number, direction: 'up' | 'down') => {
        setProductOptions(prev => {
            if (!prev) return null;
            const list = [...prev.nativeAttributes[type]];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= list.length) return prev;
            
            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;

            const updatedAttributes = { ...prev.nativeAttributes, [type]: list };
            setHasUnsavedChanges(true);
            return { ...prev, nativeAttributes: updatedAttributes };
        });
    }, []);

    const handleCustomizationTechniqueChange = (technique: CustomizationTechnique, checked: boolean) => {
        setHasUnsavedChanges(true);
        setProductOptions(prev => {
            if (!prev) return null;
            const newTechniques = checked ? [...(prev.customizationTechniques || []), technique] : (prev.customizationTechniques || []).filter(t => t !== technique);
            return { ...prev, customizationTechniques: Array.from(new Set(newTechniques)) };
        });
    };
    
    const handleVariationPriceChange = (id: string, field: 'price' | 'salePrice', value: string) => {
        setHasUnsavedChanges(true);
        setProductOptions(prev => {
          if (!prev) return null;
          const newVariations = prev.nativeVariations.map(v =>
            v.id === id ? { ...v, [field]: value } : v
          );
          return { ...prev, nativeVariations: newVariations };
        });
      };
      
      const handleVariationPriceBlur = (id: string, field: 'price' | 'salePrice') => {
        setProductOptions(prev => {
          if (!prev) return null;
          return {
            ...prev,
            nativeVariations: prev.nativeVariations.map(v => {
              if (v.id === id) {
                const value = v[field];
                const numValue = Number(value);
                if (value === '' || value == null) {
                  return { ...v, [field]: field === 'price' ? 0 : null };
                }
                if (isNaN(numValue)) {
                  toast({ title: "Invalid Price", description: "Please enter a valid number.", variant: "destructive" });
                  return { ...v, [field]: field === 'price' ? 0 : null };
                }
                return { ...v, [field]: numValue };
              }
              return v;
            })
          };
        });
      };

    const handleBulkUpdate = (field: 'price' | 'salePrice') => {
        if (!productOptions) return;
        setProductOptions(prev => {
            if (!prev) return null;
            const valueStr = (document.getElementById(`bulk-${field}-input`) as HTMLInputElement)?.value;
            if (valueStr === '' && field === 'price') { toast({ title: "Invalid Price", description: "Base price cannot be empty.", variant: "destructive" }); return prev; }
            const value = valueStr.trim() === '' ? null : parseFloat(valueStr);
            if (valueStr.trim() !== '' && isNaN(value as number)) { toast({ title: "Invalid Price", description: "Please enter a valid number.", variant: "destructive" }); return prev; }

            const updatedVariations = prev.nativeVariations.map(genVar => ({ ...genVar, [field]: value }));
            setHasUnsavedChanges(true);
            toast({ title: "Prices Updated", description: `All variations' ${field}s have been updated.` });
            return { ...prev, nativeVariations: updatedVariations };
        });
    };
    const handlePriceChange = (field: 'price' | 'salePrice', value: string) => {
        if (!productOptions) return;
        setHasUnsavedChanges(true);
        setProductOptions({ ...productOptions, [field]: value });
    };
    const handlePriceBlur = (field: 'price' | 'salePrice') => {
        if (!productOptions) return;
        const value = field === 'price' ? productOptions.price : productOptions.salePrice;
        const numValue = Number(value);
        if (String(value).trim() === '' && field === 'salePrice') { setProductOptions({ ...productOptions, salePrice: null }); return; }
        if (isNaN(numValue)) { setProductOptions({ ...productOptions, [field]: field === 'price' ? 0 : null }); }
        else { setProductOptions({ ...productOptions, [field]: numValue }); }
    };
    
    const handleOpenViewEditor = useCallback(async (color: string) => {
      if (!productOptions) return;
      setActiveEditingColor(color);
      
      const viewsToProcess = productOptions.optionsByColor[color]?.views || productOptions.defaultViews;
      
      const proxiedViews = await Promise.all(
        viewsToProcess.map(async (v) => ({
          ...v,
          imageUrl: await proxyImageUrl(v.imageUrl),
          boundaryBoxes: v.boundaryBoxes || [] 
        }))
      );
      
      setEditorViews(proxiedViews);
      setActiveViewIdInEditor(proxiedViews[0]?.id || null);
      setIsViewEditorOpen(true);
    }, [productOptions]);

    const handleSaveViewsForColor = () => {
        if (!productOptions) return;
        setHasUnsavedChanges(true);
        setProductOptions(prev => {
            if (!prev) return null;
            const newOptionsByColor = { ...prev.optionsByColor };
            const currentGroup = newOptionsByColor[activeEditingColor] || { selectedVariationIds: [], views: [] };
            newOptionsByColor[activeEditingColor] = { ...currentGroup, views: editorViews };
            return { ...prev, optionsByColor: newOptionsByColor };
        });
        setIsViewEditorOpen(false);
        toast({ title: "Views Updated", description: `Views for ${activeEditingColor} have been updated locally. Remember to save all changes.` });
    };

    // New handlers for inside the modal
    const handleAddNewViewInEditor = useCallback(() => {
        setEditorViews(prev => {
            if (prev.length >= MAX_PRODUCT_VIEWS) {
                toast({ title: "View Limit Reached", description: `You can only have up to ${MAX_PRODUCT_VIEWS} views.`, variant: "destructive" });
                return prev;
            }
            const newView: ProductView = { 
                id: crypto.randomUUID(), 
                name: `View ${prev.length + 1}`, 
                imageUrl: 'https://placehold.co/600x600/eee/ccc.png?text=New+View', 
                aiHint: 'product view', 
                boundaryBoxes: [], 
                price: 0 
            };
            setActiveViewIdInEditor(newView.id);
            return [...prev, newView];
        });
        setHasUnsavedChanges(true);
    }, [toast]);
    const handleEditorViewDetailChange = (viewId: string, field: keyof Omit<ProductView, 'id'|'boundaryBoxes'>, value: string | number) => {
        setHasUnsavedChanges(true);
        setEditorViews(prev => prev.map(v => v.id === viewId ? { ...v, [field]: value } : v));
    };
    const confirmDeleteViewInEditor = () => {
        if (!viewIdToDelete) return;
        setEditorViews(prev => {
            const remaining = prev.filter(v => v.id !== viewIdToDelete);
            if (activeViewIdInEditor === viewIdToDelete) setActiveViewIdInEditor(remaining[0]?.id || null);
            return remaining;
        });
        setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);
    };
    
    const handleAddBoundaryBoxToEditor = useCallback(() => {
        if (!imageRect) {
            toast({ title: "Image Not Ready", description: "Please wait for the view image to load." });
            return;
        }
        setEditorViews(currentViews => {
            return currentViews.map(view => {
                if (view.id === activeViewIdInEditor) {
                    const currentBoxes = view.boundaryBoxes || [];
                    if (currentBoxes.length >= 3) {
                        toast({ title: "Limit Reached", description: "You can add a maximum of 3 customization areas per view." });
                        return view;
                    }
                    const newBox: BoundaryBox = {
                        id: crypto.randomUUID(),
                        name: `Area ${currentBoxes.length + 1}`,
                        x: 10 + currentBoxes.length * 5,
                        y: 10 + currentBoxes.length * 5,
                        width: 30,
                        height: 20
                    };
                    setHasUnsavedChanges(true);
                    return { ...view, boundaryBoxes: [...currentBoxes, newBox] };
                }
                return view;
            });
        });
    }, [activeViewIdInEditor, toast, imageRect]);

    const handleRemoveBoundaryBoxFromEditor = useCallback((boxId: string) => {
      setEditorViews(prevViews => prevViews.map(v => {
        if (v.id === activeViewIdInEditor) {
          return { ...v, boundaryBoxes: v.boundaryBoxes.filter(b => b.id !== boxId) };
        }
        return v;
      }));
      if (selectedBoundaryBoxId === boxId) {
        setSelectedBoundaryBoxId(null);
      }
      setHasUnsavedChanges(true);
    }, [activeViewIdInEditor, selectedBoundaryBoxId]);

    const handleBoundaryBoxNameChangeInEditor = (boxId: string, newName: string) => {
        if (!activeViewIdInEditor) return;
        setEditorViews(prev => prev.map(v => v.id === activeViewIdInEditor ? { ...v, boundaryBoxes: v.boundaryBoxes.map(b => b.id === boxId ? {...b, name: newName} : b) } : v));
    };

    const getMouseOrTouchCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };

    const handleInteractionStart = (
        e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
        box: BoundaryBox,
        interactionType: 'move' | 'resize_br' | 'resize_bl' | 'resize_tr' | 'resize_tl'
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!imageRect) return;
        
        const coords = getMouseOrTouchCoords(e);
        activeDragRef.current = {
            type: interactionType,
            boxId: box.id,
            pointerStartX: coords.x,
            pointerStartY: coords.y,
            initialBoxX: box.x,
            initialBoxY: box.y,
            initialBoxWidth: box.width,
            initialBoxHeight: box.height,
        };
        
        document.addEventListener('mousemove', handleInteractionMove);
        document.addEventListener('touchmove', handleInteractionMove, { passive: false });
        document.addEventListener('mouseup', handleInteractionEnd);
        document.addEventListener('touchend', handleInteractionEnd);
    };
    
    const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!activeDragRef.current || !imageRect) return;
        
        e.preventDefault();
        
        const { type, boxId, pointerStartX, pointerStartY, initialBoxX, initialBoxY, initialBoxWidth, initialBoxHeight } = activeDragRef.current;
        const boxEl = document.getElementById(`boundary-box-${boxId}`);
        if (!boxEl) return;
        
        const coords = getMouseOrTouchCoords(e);
        if (imageRect.width === 0 || imageRect.height === 0) return;
        
        const dx = coords.x - pointerStartX;
        const dy = coords.y - pointerStartY;
        const dxPercent = (dx / imageRect.width) * 100;
        const dyPercent = (dy / imageRect.height) * 100;
        
        let newX = initialBoxX, newY = initialBoxY, newWidth = initialBoxWidth, newHeight = initialBoxHeight;
        
        switch (type) {
            case 'move': newX = initialBoxX + dxPercent; newY = initialBoxY + dyPercent; break;
            case 'resize_br': newWidth = initialBoxWidth + dxPercent; newHeight = initialBoxHeight + dyPercent; break;
            case 'resize_bl': newX = initialBoxX + dxPercent; newWidth = initialBoxWidth - dxPercent; newHeight = initialBoxHeight + dyPercent; break;
            case 'resize_tr': newY = initialBoxY + dyPercent; newWidth = initialBoxWidth + dxPercent; newHeight = initialBoxHeight - dyPercent; break;
            case 'resize_tl': newX = initialBoxX + dxPercent; newY = initialBoxY + dyPercent; newWidth = initialBoxWidth - dxPercent; newHeight = initialBoxHeight - dyPercent; break;
        }

        newWidth = Math.max(MIN_BOX_SIZE_PERCENT, newWidth);
        newHeight = Math.max(MIN_BOX_SIZE_PERCENT, newHeight);
        newX = Math.max(0, Math.min(newX, 100 - newWidth));
        newY = Math.max(0, Math.min(newY, 100 - newHeight));
    
        boxEl.style.left = `${newX}%`;
        boxEl.style.top = `${newY}%`;
        boxEl.style.width = `${newWidth}%`;
        boxEl.style.height = `${newHeight}%`;
    }, [imageRect]);
    
    const handleInteractionEnd = useCallback(() => {
        if (!activeDragRef.current) return;
        const { boxId } = activeDragRef.current;
        const boxEl = document.getElementById(`boundary-box-${boxId}`);
        
        if (boxEl) {
            const newX = parseFloat(boxEl.style.left);
            const newY = parseFloat(boxEl.style.top);
            const newWidth = parseFloat(boxEl.style.width);
            const newHeight = parseFloat(boxEl.style.height);

            setHasUnsavedChanges(true);
            setEditorViews(currentViews => currentViews.map(view => {
                if (view.id !== activeViewIdInEditor) return view;
                return {
                    ...view,
                    boundaryBoxes: view.boundaryBoxes.map(box => 
                        box.id === boxId ? { ...box, x: newX, y: newY, width: newWidth, height: newHeight } : box
                    ),
                };
            }));
        }
        
        activeDragRef.current = null;
        document.removeEventListener('mousemove', handleInteractionMove);
        document.removeEventListener('touchmove', handleInteractionMove);
        document.removeEventListener('mouseup', handleInteractionEnd);
        document.removeEventListener('touchend', handleInteractionEnd);
    }, [activeViewIdInEditor, handleInteractionMove]);

    useEffect(() => {
      const container = imageWrapperRef.current;
      if (!isViewEditorOpen || !container) return;

      const calculateRect = () => {
        const image = imageRef.current;
        if (!container || !image?.complete || image.naturalWidth === 0) return;

        const containerRect = container.getBoundingClientRect();
        const imageAspectRatio = image.naturalWidth / image.naturalHeight;
        const containerAspectRatio = containerRect.width / containerRect.height;
        
        let width, height, x, y;

        if (containerAspectRatio > imageAspectRatio) {
            height = containerRect.height;
            width = height * imageAspectRatio;
            x = (containerRect.width - width) / 2;
            y = 0;
        } else {
            width = containerRect.width;
            height = width / imageAspectRatio;
            x = 0;
            y = (containerRect.height - height) / 2;
        }
        setImageRect(new DOMRect(x, y, width, height));
      };

      const observer = new ResizeObserver(calculateRect);
      observer.observe(container);

      const image = imageRef.current;
      if (image) {
        image.addEventListener('load', calculateRect);
        if (image.complete) {
            calculateRect(); // If image is already loaded (e.g., from cache)
        }
      }
      
      return () => {
        observer.disconnect();
        if (image) {
            image.removeEventListener('load', calculateRect);
        }
      }
    }, [isViewEditorOpen, activeViewIdInEditor, editorViews]);


      const categoryTree = useMemo(() => {
        const nodeMap = new Map<string, ProductCategory>();
        const tree: ProductCategory[] = [];
    
        categories.forEach(cat => {
          nodeMap.set(cat.id, { ...cat, children: [] });
        });
    
        nodeMap.forEach(node => {
          if (node.parentId && nodeMap.has(node.parentId)) {
            const parent = nodeMap.get(node.parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
            }
          } else {
            tree.push(node);
          }
        });
    
        return tree;
      }, [categories]);

      const renderCategoryOptions = (categoriesToRender: ProductCategory[], level = 0): JSX.Element[] => {
        let options: JSX.Element[] = [];
        categoriesToRender.forEach(cat => {
            options.push(
                <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: `${level * 1.5}rem` }}>{level > 0 && '— '}{cat.name}</span>
                </SelectItem>
            );
            if (cat.children && cat.children.length > 0) {
                options = options.concat(renderCategoryOptions(cat.children, level + 1));
            }
        });
        return options;
      };


    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="ml-3">Loading product options...</p></div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Product Options</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Button variant="outline" asChild className="mt-2"><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
        </div>
    );
    if (!productOptions) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Product Data Not Available</h2>
            <p className="text-muted-foreground text-center mb-6">Could not load the options for this product.</p>
            <Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
        </div>
    );

    const isPriceDisabled = productOptions.type === 'variable' && productOptions.source === 'customizer-studio';
    const currentViewInEditor = editorViews.find(v => v.id === activeViewIdInEditor);
    const defaultProductImage = productOptions.defaultViews[0]?.imageUrl || 'https://placehold.co/600x600/eee/ccc?text=Default';
    const defaultProductViewId = productOptions.defaultViews[0]?.id || 'default_plp_view';
    
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen">
            <div className="mb-6 flex justify-between items-center">
                <Button variant="outline" asChild className="hover:bg-accent hover:text-accent-foreground">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
                </Button>
                {source !== 'customizer-studio' && <Button variant="outline" onClick={handleRefreshData} disabled={isRefreshing || isLoading}><RefreshCcw className="mr-2 h-4 w-4" />Refresh Product Data</Button>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-foreground">Product Options</h1>
            <div className="text-muted-foreground mb-8">Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span> (ID: {firestoreDocId})</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {/* ... Main Product Info Cards ... */}
                    <Card className="shadow-md">
                        <CardHeader><CardTitle className="font-headline text-lg">Base Product Information</CardTitle><CardDescription>From your {source} store {source !== 'customizer-studio' && '(Read-only)'}.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label htmlFor="productName">Product Name</Label><Input id="productName" value={productOptions.name} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, name: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div><Label htmlFor="productBrand">Brand</Label><Input id="productBrand" value={productOptions.brand || ''} placeholder="e.g., Gildan" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, brand: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                                <div><Label htmlFor="productSku">SKU</Label><Input id="productSku" value={productOptions.sku || ''} placeholder="e.g., G5000-WHT-LG" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, sku: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                                {source === 'customizer-studio' && (
                                    <div>
                                        <Label htmlFor="productCategory">Category</Label>
                                        <Select 
                                            value={productOptions.category || 'none'} 
                                            onValueChange={(value) => {
                                                setProductOptions(prev => prev ? { ...prev, category: value === 'none' ? undefined : value } : null);
                                                setHasUnsavedChanges(true);
                                            }}
                                        >
                                            <SelectTrigger id="productCategory" className="mt-1">
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Uncategorized</SelectItem>
                                                {renderCategoryOptions(categoryTree)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div><Label htmlFor="productDescription">Description</Label><Textarea id="productDescription" value={productOptions.description} className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")} rows={4} readOnly={source !== 'customizer-studio'} onChange={(e) => { setProductOptions(prev => prev ? { ...prev, description: e.target.value } : null); setHasUnsavedChanges(true); }} /></div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="productPrice">Base Price ($)</Label>
                                    <Input id="productPrice" type="text" value={productOptions.price} onChange={e => handlePriceChange('price', e.target.value)} onBlur={() => handlePriceBlur('price')} className={cn("mt-1", isPriceDisabled ? "bg-muted/50" : "bg-background")} readOnly={isPriceDisabled} title={isPriceDisabled ? "Managed by variations." : "Base price for simple product."} />
                                    {isPriceDisabled && <p className="text-xs text-muted-foreground mt-1">Managed by variations.</p>}
                                </div>
                                <div>
                                    <Label htmlFor="salePrice">Sale Price ($)</Label>
                                    <Input id="salePrice" type="text" value={productOptions.salePrice ?? ''} onChange={e => handlePriceChange('salePrice', e.target.value)} onBlur={() => handlePriceBlur('salePrice')} placeholder="Optional" className={cn("mt-1", isPriceDisabled ? "bg-muted/50" : "bg-background")} readOnly={isPriceDisabled} title={isPriceDisabled ? "Managed by variations." : "Sale price for simple product."} />
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

                    <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Customization Settings</CardTitle><CardDescription>Control how this product can be customized.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/20"><Checkbox id="allowCustomization" checked={productOptions.allowCustomization} onCheckedChange={(checked) => { setProductOptions(prev => prev ? { ...prev, allowCustomization: checked as boolean } : null); setHasUnsavedChanges(true); }} /><div className="grid gap-1.5 leading-none"><Label htmlFor="allowCustomization" className="text-sm font-medium text-foreground cursor-pointer">Enable Product Customization</Label><p className="text-xs text-muted-foreground">If unchecked, the "Customize" button will not appear for this product.</p></div></div></CardContent></Card>
                    
                    {source === 'customizer-studio' && (
                        <Card className="shadow-md">
                            <CardHeader><CardTitle className="font-headline text-lg">Product Attributes &amp; Techniques</CardTitle><CardDescription>Define colors, sizes, and available customization methods for this product.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div><Label className="flex items-center mb-2"><Gem className="h-4 w-4 mr-2 text-primary" /> Customization Techniques</Label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{CUSTOMIZATION_TECHNIQUES_OPTIONS.map(technique => (<div key={technique} className="flex items-center space-x-2"><Checkbox id={`tech-${technique}`} checked={productOptions.customizationTechniques?.includes(technique)} onCheckedChange={(checked) => handleCustomizationTechniqueChange(technique, checked as boolean)} /><Label htmlFor={`tech-${technique}`} className="font-normal">{technique}</Label></div>))}</div></div>
                                <Separator />
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div><Label className="flex items-center mb-2"><Palette className="h-4 w-4 mr-2 text-primary" /> Colors</Label><div className="flex items-center gap-2"><Input id="color-input" placeholder="e.g., Red" value={colorInputValue} onChange={e => setColorInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('colors'); } }} /><Input id="color-hex-input" type="color" value={colorHexValue} onChange={e => setColorHexValue(e.target.value)} className="p-1 h-10 w-12" /><Button type="button" onClick={() => handleAddAttribute('colors')}>Add</Button></div><div className="space-y-2 mt-2">{productOptions.nativeAttributes.colors.map((color, index) => (<div key={`${color.name}-${color.hex}`} className="flex items-center gap-2 p-1 rounded-md hover:bg-muted/50"><div className="w-5 h-5 rounded-full border flex-shrink-0" style={{ backgroundColor: color.hex }}></div><span className="text-sm flex-grow">{color.name}</span><div className="flex items-center"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderAttribute('colors', index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderAttribute('colors', index, 'down')} disabled={index === productOptions.nativeAttributes.colors.length - 1}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAttribute('colors', color.name)}><X className="h-4 w-4" /></Button></div></div>))}</div></div>
                                    <div><Label htmlFor="size-input" className="flex items-center mb-2"><Ruler className="h-4 w-4 mr-2 text-primary" /> Sizes</Label><div className="flex gap-2"><Input id="size-input" placeholder="e.g., XL" value={sizeInputValue} onChange={e => setSizeInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute('sizes'); } }} /><Button type="button" onClick={() => handleAddAttribute('sizes')}>Add</Button></div><div className="space-y-2 mt-2">{productOptions.nativeAttributes.sizes.map((size, index) => (<div key={size.id} className="flex items-center gap-2 p-1 rounded-md hover:bg-muted/50"><span className="text-sm flex-grow">{size.name}</span><div className="flex items-center"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderAttribute('sizes', index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderAttribute('sizes', index, 'down')} disabled={index === productOptions.nativeAttributes.sizes.length - 1}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAttribute('sizes', size.id)}><X className="h-4 w-4" /></Button></div></div>))}</div></div>
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

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Variation Images &amp; Areas</CardTitle>
                            <CardDescription>
                            Define views and design areas for each color variation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="p-3 border rounded-md bg-muted/20">
                                <Label className="font-medium">Default Product Image (PLP)</Label>
                                <p className="text-xs text-muted-foreground mb-3">This is the main image that will show on the product listing page.</p>
                                <div className="mt-2 flex items-center gap-4">
                                     <div className="relative w-24 h-24 rounded-md border bg-background overflow-hidden flex-shrink-0">
                                        <Image
                                          src={defaultProductImage}
                                          alt="Default product image"
                                          fill
                                          sizes="(max-width: 768px) 10vw, 5vw"
                                          data-ai-hint="product photo"
                                          className="object-contain"
                                          key={defaultProductImage}
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => fileInputRef.current[defaultProductViewId]?.click()}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" /> Change Image
                                        </Button>
                                        <Input 
                                            id={`file-upload-${defaultProductViewId}`}
                                            ref={(el) => (fileInputRef.current[defaultProductViewId] = el)}
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleImageUpload(e.target.files[0], defaultProductViewId, true);
                                                }
                                            }}
                                        />
                                        {uploadProgress[defaultProductViewId] > 0 && uploadProgress[defaultProductViewId] < 100 && (
                                            <Progress value={uploadProgress[defaultProductViewId]} className="h-2 mt-2" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <Label className="font-medium">Customization Views by Color</Label>
                            <p className="text-xs text-muted-foreground">
                                {source === 'customizer-studio' && productOptions.nativeAttributes.colors.length > 0
                                ? "Each color can have its own set of views. If no custom views are set, the product will use the Default Image but won't be customizable for that color."
                                : "Define the default views available for this product. These can be overridden for specific colors if attributes are defined."
                                }
                            </p>
                            <div className="space-y-2">
                            {source === 'customizer-studio' && productOptions.nativeAttributes.colors.length > 0 && productOptions.nativeAttributes.colors.map(color => (
                                <div key={color.name} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full border" style={{backgroundColor: color.hex}}></div>
                                    <span className="font-medium">{color.name}</span>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleOpenViewEditor(color.name)}>
                                    <Pencil className="mr-2 h-3 w-3" />
                                    {productOptions.optionsByColor[color.name]?.views?.length > 0 ? `Edit ${productOptions.optionsByColor[color.name]?.views?.length} Views` : 'Set Custom Views'}
                                </Button>
                                </div>
                            ))}
                            </div>
                        </CardContent>
                    </Card>
                    
                    {productOptions.type === 'variable' && productOptions.source === 'customizer-studio' && (
                        <Card className="shadow-md">
                            <CardHeader><CardTitle className="font-headline text-lg">Variation Pricing</CardTitle><CardDescription>Set individual prices for each product variant.</CardDescription></CardHeader>
                            <CardContent>
                                {productOptions.nativeVariations.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground"><Info className="mx-auto h-10 w-10 mb-2" /><p>Define at least one color or size to create variations.</p></div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div className="flex gap-2"><Input id="bulk-price-input" type="text" placeholder="Set all prices..." className="h-9" /><Button onClick={() => handleBulkUpdate('price')} variant="secondary" size="sm">Apply Price</Button></div>
                                            <div className="flex gap-2"><Input id="bulk-salePrice-input" type="text" placeholder="Set all sale prices..." className="h-9" /><Button onClick={() => handleBulkUpdate('salePrice')} variant="secondary" size="sm">Apply Sale Price</Button></div>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto border rounded-md">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                                                    <TableRow>
                                                        {Object.keys(productOptions.nativeVariations[0].attributes).map(attrName => (<TableHead key={attrName}>{attrName}</TableHead>))}
                                                        <TableHead className="text-right">Price</TableHead>
                                                        <TableHead className="text-right">Sale Price</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {productOptions.nativeVariations.map(variation => (
                                                        <TableRow key={variation.id}>
                                                            {Object.values(variation.attributes).map((val, i) => (<TableCell key={`${variation.id}-attr-${i}`}>{val}</TableCell>))}
                                                            <TableCell className="text-right">
                                                                <div className="relative flex items-center justify-end">
                                                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input type="text" value={variation.price} onChange={e => handleVariationPriceChange(variation.id, 'price', e.target.value)} onBlur={() => handleVariationPriceBlur(variation.id, 'price')} className="h-8 w-28 pl-7 text-right" />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="relative flex items-center justify-end">
                                                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input type="text" placeholder="None" value={variation.salePrice ?? ''} onChange={e => handleVariationPriceChange(variation.id, 'salePrice', e.target.value)} onBlur={() => handleVariationPriceBlur(variation.id, 'salePrice')} className="h-8 w-28 pl-7 text-right" />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-md sticky top-8">
                        <CardHeader><CardTitle className="font-headline text-lg">Summary &amp; Actions</CardTitle><CardDescription>Review your setup and save changes.</CardDescription></CardHeader>
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
            
             {isViewEditorOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsViewEditorOpen(false)}>
                  <div className="relative w-full h-full max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <Card className="w-full h-full flex flex-col border-0 shadow-lg rounded-lg">
                      <CardHeader>
                        <CardTitle className="font-headline text-lg">View Editor</CardTitle>
                        <CardDescription>Editing views for: <span className="font-semibold text-primary">{activeEditingColor}</span></CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 grid md:grid-cols-2 gap-6 overflow-y-auto min-h-0">
                        <div ref={imageWrapperRef} className="relative w-full aspect-square border rounded-md overflow-hidden group bg-muted/20 select-none">
                           {currentViewInEditor?.imageUrl ? (<img key={currentViewInEditor.imageUrl} ref={imageRef} src={currentViewInEditor.imageUrl} alt={currentViewInEditor.name || 'Product View'} className="object-contain pointer-events-none w-full h-full" crossOrigin="anonymous"/>) : (<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><LayersIcon className="w-16 h-16 text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2 text-center">No view selected or image missing.</p></div>)}
                           {imageRect && (currentViewInEditor?.boundaryBoxes || []).map((box, index) => (
                             <div
                                key={`box-key-${box.id}-${index}`}
                                id={`boundary-box-${box.id}`}
                                className={cn("absolute transition-colors duration-100 ease-in-out group/box", 
                                              selectedBoundaryBoxId === box.id ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-2 border-dashed border-accent/70 hover:border-primary hover:bg-primary/10',
                                              activeDragRef.current?.boxId === box.id && activeDragRef.current.type === 'move' ? 'cursor-grabbing' : 'cursor-grab'
                                            )} 
                                style={{ 
                                    left: `calc(${imageRect.x}px + (${imageRect.width}px * ${box.x} / 100))`,
                                    top: `calc(${imageRect.y}px + (${imageRect.height}px * ${box.y} / 100))`,
                                    width: `calc(${imageRect.width}px * ${box.width} / 100)`,
                                    height: `calc(${imageRect.height}px * ${box.height} / 100)`,
                                    zIndex: selectedBoundaryBoxId === box.id ? 10 : 1 
                                }}
                                onMouseDown={(e) => { e.stopPropagation(); setSelectedBoundaryBoxId(box.id); handleInteractionStart(e, box, 'move'); }}
                                onTouchStart={(e) => { e.stopPropagation(); setSelectedBoundaryBoxId(box.id); handleInteractionStart(e, box, 'move'); }}
                              >
                                {selectedBoundaryBoxId === box.id && (
                                  <>
                                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Left)" onMouseDown={(e) => handleInteractionStart(e, box, 'resize_tl')} onTouchStart={(e) => handleInteractionStart(e, box, 'resize_tl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Right)" onMouseDown={(e) => handleInteractionStart(e, box, 'resize_tr')} onTouchStart={(e) => handleInteractionStart(e, box, 'resize_tr')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Left)" onMouseDown={(e) => handleInteractionStart(e, box, 'resize_bl')} onTouchStart={(e) => handleInteractionStart(e, box, 'resize_bl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Right)" onMouseDown={(e) => handleInteractionStart(e, box, 'resize_br')} onTouchStart={(e) => handleInteractionStart(e, box, 'resize_br')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                  </>
                                )}
                             </div>
                           ))}
                        </div>
                        <div className="overflow-y-auto">
                          <Tabs defaultValue="views" className="w-full">
                            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="views">Manage Views</TabsTrigger><TabsTrigger value="areas" disabled={!currentViewInEditor}>Customization Areas</TabsTrigger></TabsList>
                            <TabsContent value="views" className="mt-4 space-y-4">
                              {editorViews.length < MAX_PRODUCT_VIEWS && (<Button onClick={handleAddNewViewInEditor} variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add New View</Button>)}
                              <div className="grid grid-cols-1 gap-4">
                                  {editorViews.map((view, index) => (
                                    <div
                                      key={`${view.id}-${index}`}
                                      onClick={() => setActiveViewIdInEditor(view.id)}
                                      className={cn("p-3 border rounded-md w-full text-left cursor-pointer", activeViewIdInEditor === view.id ? 'border-primary ring-2 ring-primary' : 'bg-background hover:bg-muted/50')}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => e.key === 'Enter' && setActiveViewIdInEditor(view.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`viewName-${view.id}`} className="text-sm font-medium cursor-pointer">View {index + 1}</Label>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setViewIdToDelete(view.id); setIsDeleteViewDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                        <Input id={`viewName-${view.id}`} value={view.name} onChange={(e) => handleEditorViewDetailChange(view.id, 'name', e.target.value)} onClick={e => e.stopPropagation()} className="mt-1 h-8"/>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <div>
                                            <Label htmlFor={`embroideryFee-${view.id}`} className="mt-2 block text-xs">Embroidery Fee ($)</Label>
                                            <Input id={`embroideryFee-${view.id}`} type="number" placeholder="Optional" value={view.embroideryAdditionalFee ?? ''} onChange={(e) => handleEditorViewDetailChange(view.id, 'embroideryAdditionalFee', parseFloat(e.target.value) || 0)} onClick={e => e.stopPropagation()} className="mt-1 h-8" />
                                          </div>
                                          <div>
                                            <Label htmlFor={`printFee-${view.id}`} className="mt-2 block text-xs">Print Fee ($)</Label>
                                            <Input id={`printFee-${view.id}`} type="number" placeholder="Optional" value={view.printAdditionalFee ?? ''} onChange={(e) => handleEditorViewDetailChange(view.id, 'printAdditionalFee', parseFloat(e.target.value) || 0)} onClick={e => e.stopPropagation()} className="mt-1 h-8" />
                                          </div>
                                        </div>
                                        <Label htmlFor={`viewImageUrl-${view.id}`} className="mt-2 block text-xs">View Image</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="relative w-16 h-16 rounded-md border bg-muted/30 overflow-hidden flex-shrink-0">
                                                <Image
                                                  src={view.imageUrl}
                                                  alt={view.name || 'View preview'}
                                                  fill
                                                  sizes="(max-width: 768px) 10vw, 5vw"
                                                  data-ai-hint={view.aiHint || "product view"}
                                                  className="object-contain"
                                                  key={view.imageUrl}
                                                />
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <Button type="button" size="sm" variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); fileInputRef.current[view.id]?.click();}}>
                                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload
                                                </Button>
                                                <Input 
                                                    id={`file-upload-${view.id}`}
                                                    ref={(el) => (fileInputRef.current[view.id] = el)}
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleImageUpload(e.target.files[0], view.id);
                                                        }
                                                    }}
                                                />
                                                {uploadProgress[view.id] > 0 && uploadProgress[view.id] < 100 && (
                                                    <Progress value={uploadProgress[view.id]} className="h-2" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                  ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="areas" className="mt-4">
                                {currentViewInEditor ? (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-base font-semibold">Areas for: <span className="text-primary">{currentViewInEditor.name}</span></h4>
                                            {(!currentViewInEditor.boundaryBoxes || currentViewInEditor.boundaryBoxes.length < 3) && (
                                                <Button onClick={handleAddBoundaryBoxToEditor} variant="outline" size="sm"><PlusCircle className="mr-1.5 h-4 w-4" />Add Area</Button>
                                            )}
                                        </div>
                                        {currentViewInEditor.boundaryBoxes && currentViewInEditor.boundaryBoxes.map((box) => (
                                            <div key={box.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedBoundaryBoxId(box.id); }} className={cn("p-2 mb-2 border rounded-md cursor-pointer", selectedBoundaryBoxId === box.id ? 'border-primary' : 'border-border')}>
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        value={box.name}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={e => handleBoundaryBoxNameChangeInEditor(box.id, e.target.value)} 
                                                        className="flex-grow h-8 text-sm"
                                                    />
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveBoundaryBoxFromEditor(box.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentViewInEditor.boundaryBoxes || currentViewInEditor.boundaryBoxes.length === 0) && (
                                            <p className="text-sm text-center text-muted-foreground py-4">No areas defined for this view.</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-center text-muted-foreground p-4">Select a view from the "Manage Views" tab to edit its customization areas.</p>
                                )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-6 border-t bg-muted/30">
                        <Button variant="ghost" onClick={() => setIsViewEditorOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveViewsForColor}><Save className="mr-2 h-4 w-4" />Save and Close</Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
             )}
             <AlertDialog open={isDeleteViewDialogOpen} onOpenChange={setIsDeleteViewDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this view?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteViewInEditor} className={cn(buttonVariants({variant: "destructive"}))}>Delete View</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
    );
}

export default function ProductOptions() {
  return (
    <ProductOptionsPage />
  );
}
