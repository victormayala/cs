
"use client";

import { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Edit2, DollarSign, PlugZap, Edit3, Save, Settings, Palette, Ruler, X, Info, Gem, Package, Truck as TruckIcon, UploadCloud, Trash2, Pencil, Redo, Image as ImageIcon, ChevronRight, PlusCircle, Maximize2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { fetchShopifyProductById } from '@/app/actions/shopifyActions';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp, deleteField, FieldValue, query, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { ProductOptionsFirestoreData, BoundaryBox, ProductView, ColorGroupOptions, ProductAttributeOptions, NativeProductVariation, VariationImage, ShippingAttributes } from '@/app/actions/productOptionsActions';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductCategory } from '@/app/dashboard/categories/page';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const CUSTOMIZATION_TECHNIQUES: CustomizationTechnique[] = ['Embroidery', 'DTF', 'DTG', 'Sublimation', 'Screen Printing'];
const MAX_PRODUCT_VIEWS = 4;

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

function VariantImageView({
    view,
    index,
    onViewDetailChange,
    onDeleteView,
    onSelectView,
    isActive,
    onImageUpload,
    isUploading
}: {
    view: ProductView;
    index: number;
    onViewDetailChange: (viewId: string, field: keyof Pick<ProductView, 'name' | 'imageUrl' | 'aiHint'>, value: string) => void;
    onDeleteView: (viewId: string) => void;
    onSelectView: (viewId: string) => void;
    isActive: boolean;
    onImageUpload: (viewId: string, file: File) => void;
    isUploading: string | null;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(view.id, e.target.files[0]);
        }
    };

    return (
        <div key={view.id} className={cn("p-4 border rounded-lg w-full", isActive ? 'border-primary ring-2 ring-primary bg-background' : 'bg-muted/30 hover:bg-muted/50')}>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp, image/gif"
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative aspect-square w-full rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer",
                            isUploading === view.id && "cursor-wait opacity-50"
                        )}
                    >
                        {view.imageUrl && !view.imageUrl.includes('placehold.co') ? (
                            <Image src={view.imageUrl} alt={view.name || `View ${index + 1}`} fill className="object-contain p-1" />
                        ) : (
                            <div className="text-center">
                                <UploadCloud className="mx-auto h-8 w-8" />
                                <p className="text-xs mt-1">Click to upload</p>
                            </div>
                        )}
                        {isUploading === view.id && <Loader2 className="absolute h-6 w-6 animate-spin text-primary" />}
                    </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                    <div>
                        <Label htmlFor={`viewName-${view.id}`}>View Name</Label>
                        <Input
                            id={`viewName-${view.id}`}
                            value={view.name}
                            onChange={(e) => onViewDetailChange(view.id, 'name', e.target.value)}
                            className="mt-1 h-9 bg-background"
                            placeholder={`e.g., Front View`}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => onSelectView(view.id)} variant="outline" size="sm" className="flex-1 bg-background">
                            <Edit3 className="mr-2 h-3 w-3" /> Edit Areas
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => onDeleteView(view.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
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
  
  const [variationsError, setVariationsError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [selectedBoundaryBoxId, setSelectedBoundaryBoxId] = useState<string | null>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const dragUpdateRef = useRef(0);
  const [isDeleteViewDialogOpen, setIsDeleteViewDialogOpen] = useState(false);
  const [viewIdToDelete, setViewIdToDelete] = useState<string | null>(null);
  
  const [colorInputValue, setColorInputValue] = useState("");
  const [colorHexValue, setColorHexValue] = useState("#000000");
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkSalePrice, setBulkSalePrice] = useState<string>('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  
  const [activeEditingColor, setActiveEditingColor] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<string | null>(null);


  // NEW: State for variation price input fields
  const [variationPriceInputs, setVariationPriceInputs] = useState<Record<string, string>>({});
  const [variationSalePriceInputs, setVariationSalePriceInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const fetchCategories = async () => {
        const catRef = collection(db, `users/${user.uid}/productCategories`);
        const q = query(catRef, orderBy("name"));
        const snapshot = await getDocs(q);
        const fetchedCategories: ProductCategory[] = [];
        snapshot.forEach(doc => {
            fetchedCategories.push({ id: doc.id, ...doc.data() } as ProductCategory);
        });
        setCategories(fetchedCategories);
    };
    fetchCategories();
  }, [user]);

  const categoryTree = useMemo(() => {
    type TreeNode = ProductCategory & { children: TreeNode[] };
    const nodeMap = new Map<string, TreeNode>();
    const tree: TreeNode[] = [];

    categories.forEach(cat => {
      nodeMap.set(cat.id, { ...cat, children: [] });
    });

    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    nodeMap.forEach(node => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    tree.sort((a, b) => a.name.localeCompare(b.name));
    
    return tree;
  }, [categories]);

  const renderCategoryOptions = (categoriesToRender: (ProductCategory & { children: any[] })[], level = 0): JSX.Element[] => {
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
                    const id = `color-${color.name}-size-${size.name}`.toLowerCase().replace(/\s+/g, '-');
                    const existing = productOptions.nativeVariations?.find(v => v.id === id);
                    variations.push({
                        id,
                        attributes: { "Color": color.name, "Size": size.name },
                        price: existing?.price ?? (typeof productOptions.price === 'number' ? productOptions.price : 0),
                        salePrice: existing?.salePrice ?? null,
                    });
                });
            } else {
                const id = `color-${color.name}`.toLowerCase().replace(/\s+/g, '-');
                const existing = productOptions.nativeVariations?.find(v => v.id === id);
                variations.push({ 
                    id, 
                    attributes: { "Color": color.name }, 
                    price: existing?.price ?? (typeof productOptions.price === 'number' ? productOptions.price : 0), 
                    salePrice: existing?.salePrice ?? null 
                });
            }
        });
    } else { // Only sizes exist
        sizes.forEach(size => {
            const id = `size-${size.name}`.toLowerCase().replace(/\s+/g, '-');
            const existing = productOptions.nativeVariations?.find(v => v.id === id);
            variations.push({ 
                id, 
                attributes: { "Size": size.name }, 
                price: existing?.price ?? (typeof productOptions.price === 'number' ? productOptions.price : 0), 
                salePrice: existing?.salePrice ?? null 
            });
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
                optionsByColor: firestoreOptions?.optionsByColor || {},
                groupingAttributeName: firestoreOptions?.groupingAttributeName || (source === 'customizer-studio' ? 'Color' : null),
                nativeAttributes: { colors: nativeAttributesFromFS.colors, sizes: validatedSizes },
                nativeVariations: cleanNativeVariations,
                allowCustomization: firestoreOptions?.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true,
            });

            // Populate variation input state
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
            toast({ title: "Cannot Refresh", description: "User or product ID missing.", variant: "destructive" });
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
        if (!productOptions || !activeEditingColor || !activeViewIdForSetup) return;

        let currentView: ProductView | undefined = productOptions.optionsByColor?.[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup);
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
    }, [productOptions, activeViewIdForSetup, activeEditingColor]);

    const handleDragging = useCallback((e: MouseEvent | TouchEvent) => {
        if (!activeDrag || !productOptions || !activeEditingColor || !activeViewIdForSetup || !imageWrapperRef.current) return;
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
            newWidth = Math.max(0, Math.min(newX, 100 - MIN_BOX_SIZE_PERCENT)); newWidth = Math.min(newWidth, 100 - newX); newWidth = Math.max(MIN_BOX_SIZE_PERCENT, newWidth); newX = Math.max(0, Math.min(newX, 100 - newWidth));
            newY = Math.max(0, Math.min(newY, 100 - MIN_BOX_SIZE_PERCENT)); newHeight = Math.min(newHeight, 100 - newY); newHeight = Math.max(MIN_BOX_SIZE_PERCENT, newHeight); newY = Math.max(0, Math.min(newY, 100 - newHeight));
            if (isNaN(newX) || isNaN(newY) || isNaN(newWidth) || isNaN(newHeight)) return;

            setProductOptions(prev => {
                if (!prev) return null;
                const updater = (view: ProductView) => view.id === activeViewIdForSetup ? { ...view, boundaryBoxes: view.boundaryBoxes.map(b => b.id === activeDrag.boxId ? { ...b, x: newX, y: newY, width: newWidth, height: newHeight } : b) } : view;

                const newOptions = { ...prev.optionsByColor };
                if (newOptions[activeEditingColor]?.views) {
                    newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
                }
                return { ...prev, optionsByColor: newOptions };
            });
            setHasUnsavedChanges(true);
        });
    }, [activeDrag, productOptions, activeViewIdForSetup, activeEditingColor]);

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
            window.removeEventListener('mouseup', handleDragging); window.removeEventListener('touchend', handleInteractionEnd);
            cancelAnimationFrame(dragUpdateRef.current);
        };
    }, [activeDrag, handleDragging, handleInteractionEnd]);

    const handleSaveChanges = async () => {
        if (!productOptions || !user?.uid || !db || !firestoreDocId) {
            toast({ title: "Error", description: "Cannot save. Missing required data.", variant: "destructive" });
            return;
        }
        setIsSaving(true);

        // Deep clone the object to avoid direct state mutation.
        const productOptionsToSave = JSON.parse(JSON.stringify(productOptions));

        // Clean the optionsByColor structure before saving.
        const cleanOptionsByColor: Record<string, ColorGroupOptions> = {};
        for (const colorKey in productOptionsToSave.optionsByColor) {
            const group = productOptionsToSave.optionsByColor[colorKey];

            const hasOverrides = (group.views && group.views.length > 0);

            // Only add the color group if it has selected variations or view overrides
            if (hasOverrides) {
                cleanOptionsByColor[colorKey] = {
                    selectedVariationIds: group.selectedVariationIds || [],
                    views: (group.views || []).map((view: any) => ({ ...view, price: Number(view.price) || 0 })),
                };
            }
        }

        const dataToSave: { [key: string]: any } = {
            id: productOptionsToSave.id,
            price: Number(productOptionsToSave.price) || 0,
            type: productOptionsToSave.type,
            allowCustomization: productOptionsToSave.allowCustomization,
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

    const handleSelectView = (viewId: string) => { setActiveViewIdForSetup(viewId); setSelectedBoundaryBoxId(null); };

    const handleAddNewView = () => {
        if (!productOptions || !activeEditingColor) return;
        const viewsList = productOptions.optionsByColor[activeEditingColor]?.views || [];

        if (viewsList.length >= MAX_PRODUCT_VIEWS) {
            toast({ title: "Limit Reached", description: `Max ${MAX_PRODUCT_VIEWS} views.`, variant: "default" });
            return;
        }
        const newView: ProductView = {
            id: crypto.randomUUID(), name: `View ${viewsList.length + 1}`,
            imageUrl: 'https://placehold.co/600x600/eee/ccc.png?text=New+View', aiHint: 'product view',
            boundaryBoxes: [], price: 0
        };

        setProductOptions(prev => {
            if (!prev) return null;
            const newOptions = { ...prev.optionsByColor };
            if (!newOptions[activeEditingColor]) newOptions[activeEditingColor] = { selectedVariationIds: [], views: [] };
            newOptions[activeEditingColor].views = [...(newOptions[activeEditingColor].views || []), newView];
            return { ...prev, optionsByColor: newOptions };
        });

        setActiveViewIdForSetup(newView.id); setSelectedBoundaryBoxId(null); setHasUnsavedChanges(true);
    };

    const handleViewDetailChange = (viewId: string, field: keyof Omit<ProductView, 'id' | 'boundaryBoxes'>, value: string | number) => {
        if (!productOptions || !activeEditingColor) return;
        setProductOptions(prev => {
            if (!prev) return null;
            const updater = (v: ProductView) => v.id === viewId ? { ...v, [field]: value } : v;
            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
            }
            return { ...prev, optionsByColor: newOptions };
        });
        setHasUnsavedChanges(true);
    };

    const handleDeleteView = (viewId: string) => {
        setViewIdToDelete(viewId); setIsDeleteViewDialogOpen(true);
    };

    const confirmDeleteView = () => {
        if (!productOptions || !viewIdToDelete || !activeEditingColor) return;

        setProductOptions(prev => {
            if (!prev) return null;
            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.filter(v => v.id !== viewIdToDelete);
            }
            if (activeViewIdForSetup === viewIdToDelete) {
                setActiveViewIdForSetup(newOptions[activeEditingColor].views?.[0]?.id || null);
            }
            return { ...prev, optionsByColor: newOptions };
        });

        setSelectedBoundaryBoxId(null);
        setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);
        toast({ title: "View Deleted" }); setHasUnsavedChanges(true);
    };

    const handleAddBoundaryBox = () => {
        if (!productOptions || !activeViewIdForSetup || !activeEditingColor) return;
        let currentView: ProductView | undefined = productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup);

        if (!currentView || currentView.boundaryBoxes.length >= 3) {
            toast({ title: "Limit Reached", description: "Max 3 areas per view.", variant: "destructive" });
            return;
        }
        const newBox: BoundaryBox = {
            id: crypto.randomUUID(), name: `Area ${currentView.boundaryBoxes.length + 1}`,
            x: 10 + currentView.boundaryBoxes.length * 5, y: 10 + currentView.boundaryBoxes.length * 5,
            width: 30, height: 20,
        };

        setProductOptions(prev => {
            if (!prev) return null;
            const updater = (v: ProductView) => v.id === activeViewIdForSetup ? { ...v, boundaryBoxes: [...v.boundaryBoxes, newBox] } : v;
            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
            }
            return { ...prev, optionsByColor: newOptions };
        });

        setSelectedBoundaryBoxId(newBox.id); setHasUnsavedChanges(true);
    };

    const handleRemoveBoundaryBox = (boxId: string) => {
        if (!productOptions || !activeViewIdForSetup || !activeEditingColor) return;
        setProductOptions(prev => {
            if (!prev) return null;
            const updater = (v: ProductView) => v.id === activeViewIdForSetup ? { ...v, boundaryBoxes: v.boundaryBoxes.filter(b => b.id !== boxId) } : v;
            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
            }
            return { ...prev, optionsByColor: newOptions };
        });
        if (selectedBoundaryBoxId === boxId) setSelectedBoundaryBoxId(null);
        setHasUnsavedChanges(true);
    };

    const handleBoundaryBoxNameChange = (boxId: string, newName: string) => {
        if (!productOptions || !activeViewIdForSetup || !activeEditingColor) return;
        setProductOptions(prev => {
            if (!prev) return null;
            const updater = (view: ProductView) => view.id === activeViewIdForSetup ? { ...view, boundaryBoxes: view.boundaryBoxes.map(box => box.id === boxId ? { ...box, name: newName } : box) } : view;
            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
            }
            return { ...prev, optionsByColor: newOptions };
        });
        setHasUnsavedChanges(true);
    };

    const handleBoundaryBoxPropertyChange = (boxId: string, property: keyof Pick<BoundaryBox, 'x' | 'y' | 'width' | 'height'>, value: string) => {
        if (!productOptions || !activeViewIdForSetup || !activeEditingColor) return;
        setProductOptions(prev => {
            if (!prev || !activeViewIdForSetup) return null;
            const updater = (view: ProductView) => {
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
            };

            const newOptions = { ...prev.optionsByColor };
            if (newOptions[activeEditingColor]?.views) {
                newOptions[activeEditingColor].views = newOptions[activeEditingColor].views!.map(updater);
            }
            return { ...prev, optionsByColor: newOptions };
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

    const openEditModal = (color: string) => {
        setActiveEditingColor(color);
        const firstViewId = productOptions?.optionsByColor?.[color]?.views?.[0]?.id || null;
        setActiveViewIdForSetup(firstViewId);
        setIsEditModalOpen(true);
    };

    const handleImageUpload = async (viewId: string, file: File) => {
        if (!user || !productOptions) return;
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "File too large", description: "Please upload images under 5MB.", variant: "destructive" });
            return;
        }

        setIsUploadingImage(viewId);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;
                const storageRef = ref(storage, `users/${user.uid}/product_view_images/${firestoreDocId}/${viewId}-${Date.now()}`);
                const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);

                handleViewDetailChange(viewId, 'imageUrl', downloadURL);
                handleViewDetailChange(viewId, 'aiHint', 'product view');
                toast({ title: "Image Uploaded", description: "The view image has been updated." });
            };
        } catch (error: any) {
            console.error("Error uploading image:", error);
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploadingImage(null);
        }
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

    const colorGroupsForSelect = source === 'customizer-studio'
        ? productOptions.nativeAttributes.colors.map(c => c.name)
        : [];


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
            {!credentialsExist && (<Card><CardContent><AlertTriangle className="h-4 w-4" /><AlertTitle>Store Not Connected</AlertTitle><AlertDescription>Your {source} store credentials are not configured. Please go to <Link href="/dashboard" className="underline hover:text-destructive/80">your dashboard</Link> and set them up.</AlertDescription></CardContent></Card>)}
            {error && credentialsExist && <Card><CardContent><AlertTriangle className="h-4 w-4" /><AlertTitle>Product Data Error</AlertTitle><AlertDescription>{error}</AlertDescription></CardContent></Card>}
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
                            <div>
                                <Label htmlFor="productCategory">Category</Label>
                                <Select
                                    value={productOptions.category || 'none'}
                                    onValueChange={(value) => {
                                        if (source === 'customizer-studio') {
                                            setProductOptions(prev => prev ? { ...prev, category: value === 'none' ? undefined : value } : null);
                                            setHasUnsavedChanges(true);
                                        }
                                    }}
                                    disabled={source !== 'customizer-studio'}
                                >
                                    <SelectTrigger id="productCategory" className={cn("mt-1", source !== 'customizer-studio' ? "bg-muted/50" : "bg-background")}>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none"><em>Uncategorized</em></SelectItem>
                                        {renderCategoryOptions(categoryTree)}
                                    </SelectContent>
                                </Select>
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

                    {productOptions.type === 'variable' && (
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg">Images &amp; Customization</CardTitle>
                                <CardDescription>
                                    For each color, you can define a unique set of views (images) and customization areas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {colorGroupsForSelect.map(color => (
                                    <Card key={color} className="bg-muted/40">
                                        <div className="p-4 flex justify-between items-center">
                                            <h4 className="font-semibold text-foreground">{color}</h4>
                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(color)}>
                                                <Edit3 className="mr-2 h-4 w-4" />
                                                Edit Views & Areas
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                                {colorGroupsForSelect.length === 0 && (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <p>Add color attributes above to begin configuring variation-specific images and design areas.</p>
                                    </div>
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

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-4xl h-[90svh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Views for <span className="text-primary">{activeEditingColor}</span></DialogTitle>
                        <DialogDescription>
                            Define the images and customization areas for this specific product variation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
                        <div className="md:col-span-1 flex flex-col">
                            <div ref={imageWrapperRef} className="relative w-full flex-1 aspect-square border rounded-md overflow-hidden group bg-background select-none" onMouseDown={(e) => { if (e.target === imageWrapperRef.current) setSelectedBoundaryBoxId(null); }}>
                                {activeViewIdForSetup && productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)?.imageUrl ? (
                                    <Image src={productOptions.optionsByColor[activeEditingColor]!.views!.find(v => v.id === activeViewIdForSetup)!.imageUrl} alt={productOptions.optionsByColor[activeEditingColor]!.views!.find(v => v.id === activeViewIdForSetup)!.name || 'Product View'} fill className="object-contain pointer-events-none w-full h-full" data-ai-hint={productOptions.optionsByColor[activeEditingColor]!.views!.find(v => v.id === activeViewIdForSetup)!.aiHint || "product view"} priority />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <ImageIcon className="w-16 h-16 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mt-2 text-center">No view selected or image missing.<br />Select or add a view.</p>
                                    </div>
                                )}
                                {activeViewIdForSetup && productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)?.boundaryBoxes.map((box) => (
                                    <div key={box.id} className={cn("absolute transition-colors duration-100 ease-in-out group/box", selectedBoundaryBoxId === box.id ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-2 border-dashed border-accent/70 hover:border-primary hover:bg-primary/10', activeDrag?.boxId === box.id && activeDrag.type === 'move' ? 'cursor-grabbing' : 'cursor-grab')} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%`, zIndex: selectedBoundaryBoxId === box.id ? 10 : 1 }} onMouseDown={(e) => handleInteractionStart(e, box.id, 'move')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'move')}>
                                        {selectedBoundaryBoxId === box.id && (<>
                                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tr')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tr')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_bl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_bl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_br')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_br')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                                        </>)}
                                        <div className={cn("absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded-br-sm opacity-0 group-hover/box:opacity-100 group-[.is-selected]/box:opacity-100 transition-opacity select-none pointer-events-none", selectedBoundaryBoxId === box.id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{box.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                                {(productOptions.optionsByColor[activeEditingColor]?.views || []).map((view, index) => (
                                    <VariantImageView
                                        key={view.id}
                                        view={view}
                                        index={index}
                                        isActive={activeViewIdForSetup === view.id}
                                        onViewDetailChange={handleViewDetailChange}
                                        onDeleteView={handleDeleteView}
                                        onSelectView={handleSelectView}
                                        onImageUpload={handleImageUpload}
                                        isUploading={isUploadingImage}
                                    />
                                ))}
                                {(productOptions.optionsByColor[activeEditingColor]?.views || []).length < MAX_PRODUCT_VIEWS && (
                                    <Button onClick={handleAddNewView} variant="outline" className="w-full mt-4"><PlusCircle className="mr-2 h-4 w-4" />Add View for {activeEditingColor}</Button>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <Tabs defaultValue="areas">
                                    <TabsList className="grid w-full grid-cols-1"><TabsTrigger value="areas" disabled={!activeViewIdForSetup}>Customization Areas</TabsTrigger></TabsList>
                                    <TabsContent value="areas" className="mt-4">
                                        {!activeViewIdForSetup || !productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup) ? (
                                            <div className="text-center py-6 text-muted-foreground"><LayersIcon className="mx-auto h-10 w-10 mb-2" /><p>Select a view to manage its areas.</p></div>
                                        ) : (<>
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-base font-semibold text-foreground">Areas for: <span className="text-primary">{productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)?.name}</span></h4>
                                                {productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)!.boundaryBoxes.length < 3 ? (
                                                    <Button onClick={handleAddBoundaryBox} variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground" disabled={!activeViewIdForSetup}>
                                                        <PlusCircle className="mr-1.5 h-4 w-4" />Add Area
                                                    </Button>
                                                ) : null}
                                            </div>
                                            {productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)!.boundaryBoxes.length > 0 ? (
                                                <div className="space-y-3">
                                                    {productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)!.boundaryBoxes.map((box) => (
                                                        <div key={box.id} className={cn("p-3 border rounded-md transition-all", selectedBoundaryBoxId === box.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-background hover:bg-muted/50', "cursor-pointer")} onClick={() => setSelectedBoundaryBoxId(box.id)}>
                                                            <div className="flex justify-between items-center mb-1.5"><Input value={box.name} onChange={(e) => handleBoundaryBoxNameChange(box.id, e.target.value)} className="text-sm font-semibold text-foreground h-8 flex-grow mr-2 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring p-1" onClick={(e) => e.stopPropagation()} /><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveBoundaryBox(box.id); }} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7" title="Remove Area"><Trash2 className="h-4 w-4" /></Button></div>
                                                            {selectedBoundaryBoxId === box.id ? (
                                                                <div className="mt-3 pt-3 border-t border-border/50"><h4 className="text-xs font-medium mb-1.5 text-muted-foreground">Edit Dimensions (%):</h4>
                                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                                                        <div><Label htmlFor={`box-x-${box.id}`} className="text-xs mb-1 block">X</Label><Input type="number" step="0.1" min="0" max="100" id={`box-x-${box.id}`} value={box.x.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'x', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                                                                        <div><Label htmlFor={`box-y-${box.id}`} className="text-xs mb-1 block">Y</Label><Input type="number" step="0.1" min="0" max="100" id={`box-y-${box.id}`} value={box.y.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'y', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                                                                        <div><Label htmlFor={`box-w-${box.id}`} className="text-xs mb-1 block">Width</Label><Input type="number" step="0.1" min="5" max="100" id={`box-w-${box.id}`} value={box.width.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'width', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                                                                        <div><Label htmlFor={`box-h-${box.id}`} className="text-xs mb-1 block">Height</Label><Input type="number" step="0.1" min="5" max="100" id={`box-h-${box.id}`} value={box.height.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'height', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                                                                    </div>
                                                                </div>) : (<div className="text-xs text-muted-foreground space-y-0.5"><p><strong>X:</strong> {box.x.toFixed(1)}% | <strong>Y:</strong> {box.y.toFixed(1)}%</p><p><strong>W:</strong> {box.width.toFixed(1)}% | <strong>H:</strong> {box.height.toFixed(1)}%</p></div>)}
                                                        </div>))}
                                                </div>) : (<p className="text-sm text-muted-foreground text-center py-2">No areas. Click "Add Area".</p>)}
                                            {productOptions.optionsByColor[activeEditingColor]?.views?.find(v => v.id === activeViewIdForSetup)!.boundaryBoxes.length >= 3 && (<p className="text-sm text-muted-foreground text-center py-2">Max 3 areas for this view.</p>)}
                                        </>)}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button">Done</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteViewDialogOpen} onOpenChange={setIsDeleteViewDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this view?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. It will permanently delete the view and its customization areas for this variation.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteViewDialogOpen(false); setViewIdToDelete(null); }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteView} className={cn(buttonVariants({ variant: "destructive" }))}>Delete View</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    
