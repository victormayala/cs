
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shirt, RefreshCcw, ExternalLink, Loader2, AlertTriangle, LayersIcon, Tag, Image as ImageIconLucide, Edit2, DollarSign, PlugZap, Edit3, Save, Settings } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWooCommerceProductById, fetchWooCommerceProductVariations, type WooCommerceCredentials } from '@/app/actions/woocommerceActions';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import type { UserWooCommerceCredentials } from '@/app/actions/userCredentialsActions';
import type { WCCustomProduct, WCVariation, WCVariationAttribute } from '@/types/woocommerce';
import { Alert as ShadCnAlert, AlertDescription as ShadCnAlertDescription, AlertTitle as ShadCnAlertTitle } from "@/components/ui/alert";
import ProductViewSetup from '@/components/product-options/ProductViewSetup'; 
import { Separator } from '@/components/ui/separator';

interface BoundaryBox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  aiHint?: string;
  boundaryBoxes: BoundaryBox[];
  price?: number; 
}

interface ColorGroupOptions {
  selectedVariationIds: string[];
  variantViewImages: Record<string, { imageUrl: string; aiHint?: string }>; 
}

export interface ProductOptionsFirestoreData {
  id: string; 
  name: string;
  description: string;
  price: number;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  defaultViews: ProductView[];
  optionsByColor: Record<string, ColorGroupOptions>;
  groupingAttributeName: string | null;
  allowCustomization?: boolean; // Added field
  lastSaved?: any; 
  createdAt?: any; 
}

interface ProductOptionsData {
  id: string; 
  name: string; 
  description: string; 
  price: number; 
  type: 'simple' | 'variable' | 'grouped' | 'external'; 
  defaultViews: ProductView[]; 
  optionsByColor: Record<string, ColorGroupOptions>; 
  groupingAttributeName: string | null;
  allowCustomization: boolean; // Added field
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

export default function ProductOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();

  const [productOptions, setProductOptions] = useState<ProductOptionsData | null>(null);
  const [activeViewIdForSetup, setActiveViewIdForSetup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [credentialsExist, setCredentialsExist] = useState(false);

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


  const fetchAndSetProductData = useCallback(async (isRefresh = false) => {
    if (!user?.uid || !productId || !db) { 
        setError("User or Product ID invalid, or DB not ready.");
        if (isRefresh) setIsRefreshing(false); else setIsLoading(false);
        return;
    }
    
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true); 
    }
    setError(null); 
    setVariationsError(null);
    
    try {
      let userWCCredentialsToUse: WooCommerceCredentials | undefined;
      try {
        const credDocRef = doc(db, 'userWooCommerceCredentials', user.uid);
        const credDocSnap = await getDoc(credDocRef);
        if (credDocSnap.exists()) {
          const credData = credDocSnap.data() as UserWooCommerceCredentials;
          userWCCredentialsToUse = { 
            storeUrl: credData.storeUrl, 
            consumerKey: credData.consumerKey, 
            consumerSecret: credData.consumerSecret 
          };
          setCredentialsExist(true);
        } else {
          setCredentialsExist(false);
          throw new Error("WooCommerce store not connected. Please go to Dashboard > 'Store Integration' to connect your store first.");
        }
      } catch (credError: any) {
        toast({ title: "Credential Error", description: credError.message, variant: "destructive"});
        throw credError;
      }

      const { product: wcProduct, error: fetchError } = await fetchWooCommerceProductById(productId, userWCCredentialsToUse);
      if (fetchError || !wcProduct) {
        toast({ title: "Error Fetching Product", description: fetchError || `Product ${productId} not found.`, variant: "destructive"});
        throw new Error(fetchError || `Product with ID ${productId} not found in your connected store.`);
      }
      
      let tempGroupedVariationsData: Record<string, WCVariation[]> | null = null;
      let identifiedGroupingAttr: string | null = null;

      if (wcProduct.type === 'variable') {
        setIsLoadingVariations(true);
        try {
            const { variations: fetchedVars, error: varsError } = await fetchWooCommerceProductVariations(productId, userWCCredentialsToUse);
            if (varsError) {
                setVariationsError(varsError);
            } else if (fetchedVars && fetchedVars.length > 0) {
                setVariations(fetchedVars); 
                const firstVarAttributes = fetchedVars[0].attributes;
                const colorAttr = firstVarAttributes.find(attr => attr.name.toLowerCase() === 'color' || attr.name.toLowerCase() === 'colour');
                if (colorAttr) {
                identifiedGroupingAttr = colorAttr.name;
                } else {
                const nonSizeAttr = firstVarAttributes.find(attr => !['size', 'talla'].includes(attr.name.toLowerCase()));
                if (nonSizeAttr) identifiedGroupingAttr = nonSizeAttr.name;
                else if (firstVarAttributes.length > 0) identifiedGroupingAttr = firstVarAttributes[0].name;
                }

                if (identifiedGroupingAttr) {
                const groups: Record<string, WCVariation[]> = {};
                fetchedVars.forEach(v => {
                    const groupAttr = v.attributes.find(a => a.name === identifiedGroupingAttr);
                    const groupKey = groupAttr ? groupAttr.option : 'Other';
                    if (!groups[groupKey]) groups[groupKey] = [];
                    groups[groupKey].push(v);
                });
                tempGroupedVariationsData = groups;
                setGroupedVariations(groups);
                } else {
                tempGroupedVariationsData = { 'All Variations': fetchedVars };
                setGroupedVariations({ 'All Variations': fetchedVars });
                }
            }
        } finally {
            setIsLoadingVariations(false);
        }
      }

      const defaultImageUrl = wcProduct.images && wcProduct.images.length > 0 ? wcProduct.images[0].src : 'https://placehold.co/600x600.png';
      const defaultAiHint = wcProduct.images && wcProduct.images.length > 0 && wcProduct.images[0].alt ? wcProduct.images[0].alt.split(" ").slice(0,2).join(" ") : 'product image';
      const initialDefaultViews: ProductView[] = [{ id: crypto.randomUUID(), name: "Front", imageUrl: defaultImageUrl, aiHint: defaultAiHint, boundaryBoxes: [], price: 0 }];
      
      let plainTextDescription = 'No description available.';
      const descriptionSource = wcProduct.description || wcProduct.short_description || '';
      if (descriptionSource) { plainTextDescription = descriptionSource.replace(/<[^>]+>/g, ''); }

      let loadedDefaultViews: ProductView[] = [];
      let loadedOptionsByColor: Record<string, ColorGroupOptions> = {};
      let loadedGroupingAttributeName: string | null = null;
      let loadedAllowCustomization: boolean = true; // Default to true
      
      let firestoreOptions: ProductOptionsFirestoreData | undefined;
      try {
        const optionsDocRef = doc(db, 'userProductOptions', user.uid, 'products', productId);
        const optionsDocSnap = await getDoc(optionsDocRef);
        if (optionsDocSnap.exists()) {
          firestoreOptions = optionsDocSnap.data() as ProductOptionsFirestoreData;
        }
      } catch (e: any) {
        let detailedError = `Could not load saved settings: ${e.message || "Unknown Firestore error"}. Using defaults.`;
        if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
          detailedError += " This could be a Firestore security rule issue. Ensure your rules allow read access for your user ID.";
        }
        console.error("Error loading product options from Firestore (client-side):", detailedError, e);
        toast({ title: "Loading Issue", description: detailedError, variant: "default" });
      }

      if (firestoreOptions) {
          loadedDefaultViews = firestoreOptions.defaultViews.map((view: any) => ({ ...view, price: view.price ?? 0 })) || [];
          loadedOptionsByColor = firestoreOptions.optionsByColor || {};
          loadedGroupingAttributeName = firestoreOptions.groupingAttributeName || null;
          loadedAllowCustomization = firestoreOptions.allowCustomization !== undefined ? firestoreOptions.allowCustomization : true;
      }

      const finalDefaultViews = loadedDefaultViews.length > 0 ? loadedDefaultViews : initialDefaultViews;
      let finalOptionsByColor = loadedOptionsByColor;
      if (!firestoreOptions && tempGroupedVariationsData) { 
          finalOptionsByColor = {};
          Object.keys(tempGroupedVariationsData).forEach(colorKey => { finalOptionsByColor[colorKey] = { selectedVariationIds: [], variantViewImages: {} }; });
      } else if (!firestoreOptions && wcProduct.type !== 'variable') { 
          finalOptionsByColor = { 'default': { selectedVariationIds: [], variantViewImages: {} }};
      }

      setProductOptions({
        id: wcProduct.id.toString(), name: wcProduct.name || `Product ${productId}`, description: plainTextDescription,
        price: parseFloat(wcProduct.price) || 0, type: wcProduct.type,
        defaultViews: finalDefaultViews.map(view => ({...view, price: view.price ?? 0})), 
        optionsByColor: finalOptionsByColor,
        groupingAttributeName: loadedGroupingAttributeName || identifiedGroupingAttr,
        allowCustomization: loadedAllowCustomization,
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
  }, [productId, user?.uid, toast, hasUnsavedChanges]); 

  useEffect(() => {
    let didCancel = false;

    const loadInitialData = async () => {
        if (authIsLoading) {
            return;
        }

        if (!user?.uid) {
            if (!didCancel) {
                setError("User not authenticated. Please sign in.");
                setIsLoading(false); 
                setProductOptions(null);
            }
            return;
        }
        if (!productId) {
            if (!didCancel) {
                setError("Product ID is missing.");
                setIsLoading(false); 
                setProductOptions(null);
            }
            return;
        }
        
        if (!productOptions && !error) {
            await fetchAndSetProductData(false); 
        } else if (productOptions || error) {
            if (!didCancel) setIsLoading(false);
        }
    };
    
    loadInitialData();

    return () => {
        didCancel = true;
    };
  }, [authIsLoading, user?.uid, productId, productOptions, error, fetchAndSetProductData]);


  const handleRefreshData = () => {
    if (!authIsLoading && user && productId) {
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
    if (!productOptions.id) {
      toast({ title: "Error", description: "Product ID is missing from options data. Cannot save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const dataToSave: Omit<ProductOptionsFirestoreData, 'createdAt' | 'lastSaved'> & { lastSaved: any; createdAt?: any } = {
      id: productOptions.id, 
      name: productOptions.name,
      description: productOptions.description,
      price: productOptions.price,
      type: productOptions.type,
      defaultViews: productOptions.defaultViews,
      optionsByColor: productOptions.optionsByColor,
      groupingAttributeName: productOptions.groupingAttributeName,
      allowCustomization: productOptions.allowCustomization,
      lastSaved: serverTimestamp(),
    };

    try {
      const docRef = doc(db, 'userProductOptions', user.uid, 'products', productOptions.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        dataToSave.createdAt = serverTimestamp();
      }
      await setDoc(docRef, dataToSave, { merge: true });
      
      toast({ title: "Saved", description: "Custom views, areas, and variation selections saved to your account." });
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving product options to Firestore (client-side):', error);
      toast({ title: "Save Error", description: `Failed to save options: ${error.message || "Unknown Firestore error"}`, variant: "destructive" });
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
    router.push(`/customizer?productId=${productOptions.id}`);
  };

  const handleSelectViewForSetup = (viewId: string) => { 
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

  const handleDeleteDefaultView = (viewId: string) => { 
    if (!productOptions) return;
    if (productOptions.defaultViews.length <= 1) {
      toast({ title: "Cannot Delete", description: "At least one view must remain.", variant: "default" });
      return;
    }
    setViewIdToDelete(viewId);
    setIsDeleteViewDialogOpen(true);
  };

  const confirmDeleteDefaultView = () => { 
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

  const handleDefaultViewDetailChange = (viewId: string, field: keyof Pick<ProductView, 'name' | 'imageUrl' | 'aiHint' | 'price'>, value: string | number) => { 
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
    if (!productOptions || !groupedVariations || !groupedVariations[groupKey]) return;
    const groupVariationIds = groupedVariations[groupKey].map(v => v.id.toString());
    
    setProductOptions(prev => {
      if (!prev) return null;
      const updatedOptionsByColor = { ...prev.optionsByColor };
      if (!updatedOptionsByColor[groupKey]) { 
        updatedOptionsByColor[groupKey] = { selectedVariationIds: [], variantViewImages: {} };
      }

      let newSelectedIds;
      if (checked) {
        newSelectedIds = Array.from(new Set([...updatedOptionsByColor[groupKey].selectedVariationIds, ...groupVariationIds]));
      } else {
        newSelectedIds = updatedOptionsByColor[groupKey].selectedVariationIds.filter(id => !groupVariationIds.includes(id));
      }
      updatedOptionsByColor[groupKey].selectedVariationIds = newSelectedIds;
      return { ...prev, optionsByColor: updatedOptionsByColor };
    });
    setHasUnsavedChanges(true);
  };

  const getSecondaryAttributeOptionsForGroup = (variationsInGroup: WCVariation[]): string[] => {
    if (!productOptions?.groupingAttributeName) return [];
    
    let sizeLikeAttributeName: string | null = null;
    if (variationsInGroup.length > 0) {
        const firstVarAttrs = variationsInGroup[0].attributes;
        const sizeAttr = firstVarAttrs.find(attr => (attr.name.toLowerCase() === 'size' || attr.name.toLowerCase() === 'talla') && attr.name !== productOptions.groupingAttributeName);
        if (sizeAttr) {
            sizeLikeAttributeName = sizeAttr.name;
        } else {
            const otherAttr = firstVarAttrs.find(attr => attr.name !== productOptions!.groupingAttributeName);
            if (otherAttr) sizeLikeAttributeName = otherAttr.name;
        }
    }
    if (!sizeLikeAttributeName) return [];
    
    const options = new Set<string>();
    variationsInGroup.forEach(variation => {
      const attr = variation.attributes.find(a => a.name === sizeLikeAttributeName);
      if (attr) options.add(attr.option);
    });
    return Array.from(options).sort();
  };
  
  const getSecondaryAttributeNameForDisplay = (variationsInGroup: WCVariation[]): string | null => {
    if (!productOptions?.groupingAttributeName || variationsInGroup.length === 0) return null;
    const firstVarAttrs = variationsInGroup[0].attributes;
    const sizeAttr = firstVarAttrs.find(attr => (attr.name.toLowerCase() === 'size' || attr.name.toLowerCase() === 'talla') && attr.name !== productOptions.groupingAttributeName);
    if (sizeAttr) return sizeAttr.name;
    const otherAttr = firstVarAttrs.find(attr => attr.name !== productOptions!.groupingAttributeName);
    return otherAttr ? otherAttr.name : null;
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
      // Deep clone to avoid direct state mutation
      const updatedOptionsByColor = JSON.parse(JSON.stringify(baseOptionsByColor));

      if (!updatedOptionsByColor[colorKey]) {
        updatedOptionsByColor[colorKey] = { selectedVariationIds: [], variantViewImages: {} };
      }
      if (!updatedOptionsByColor[colorKey].variantViewImages) { 
          updatedOptionsByColor[colorKey].variantViewImages = {};
      }
      if (!updatedOptionsByColor[colorKey].variantViewImages[viewId]) {
        updatedOptionsByColor[colorKey].variantViewImages[viewId] = { imageUrl: '', aiHint: '' };
      }
      
      updatedOptionsByColor[colorKey].variantViewImages[viewId][field] = value;

      if (field === 'imageUrl' && !value && updatedOptionsByColor[colorKey].variantViewImages[viewId]) {
          updatedOptionsByColor[colorKey].variantViewImages[viewId].aiHint = '';
      }
      
      return { ...prev, optionsByColor: updatedOptionsByColor };
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
        {error.includes("store not connected") && (
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


  const currentSetupView = productOptions.defaultViews.find(v => v.id === activeViewIdForSetup);
  
  const allVariationsSelectedOverall = productOptions.type === 'variable' && variations.length > 0 && 
    Object.keys(groupedVariations || {}).length > 0 && 
    Object.entries(groupedVariations || {}).every(([groupKey, variationsInGroup]) => {
      const groupOpts = productOptions.optionsByColor[groupKey];
      return groupOpts && variationsInGroup.every(v => groupOpts.selectedVariationIds.includes(v.id.toString()));
    });

  const someVariationsSelectedOverall = productOptions.type === 'variable' && variations.length > 0 &&
    Object.values(productOptions.optionsByColor).some(group => group.selectedVariationIds.length > 0) && !allVariationsSelectedOverall;


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" asChild className="hover:bg-accent hover:text-accent-foreground">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>
        <Button variant="outline" onClick={handleRefreshData} disabled={isRefreshing || isLoading} className="hover:bg-accent hover:text-accent-foreground">
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Refresh Product Data
        </Button>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-foreground">Product Options</h1>
      <p className="text-muted-foreground mb-8">Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span> (ID: {productOptions.id})</p>
      {!credentialsExist && (
         <ShadCnAlert variant="destructive" className="mb-6">
            <PlugZap className="h-4 w-4" />
            <ShadCnAlertTitle>Store Not Connected</ShadCnAlertTitle>
            <ShadCnAlertDescription>
            Your WooCommerce store credentials are not configured. Product data cannot be fetched. 
            Please go to <Link href="/dashboard" className="underline hover:text-destructive/80">your dashboard</Link> and set them up in the 'Store Integration' tab.
            </ShadCnAlertDescription>
        </ShadCnAlert>
      )}
      {error && credentialsExist && <ShadCnAlert variant="destructive" className="mb-6"><AlertTriangle className="h-4 w-4" /><ShadCnAlertTitle>Product Data Error</ShadCnAlertTitle><ShadCnAlertDescription>{error}</ShadCnAlertDescription></ShadCnAlert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg">Base Product Information</CardTitle><CardDescription>From your WooCommerce store (Read-only).</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="productName">Product Name</Label><Input id="productName" value={productOptions.name} className="mt-1 bg-muted/50" readOnly /></div>
              <div><Label htmlFor="productDescription">Description</Label><Textarea id="productDescription" value={productOptions.description} className="mt-1 bg-muted/50" rows={4} readOnly /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="productPrice">Price ($)</Label><Input id="productPrice" type="number" value={productOptions.price} className="mt-1 bg-muted/50" readOnly /></div>
                <div><Label htmlFor="productType">Type</Label><Input id="productType" value={productOptions.type.charAt(0).toUpperCase() + productOptions.type.slice(1)} className="mt-1 bg-muted/50" readOnly /></div>
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

          {productOptions.type === 'variable' && (
            <Card className="shadow-md">
              <CardHeader><CardTitle className="font-headline text-lg">Product Variations</CardTitle><CardDescription>Select which variation color groups should be available in the customizer. Configure view-specific images per color.</CardDescription></CardHeader>
              <CardContent>
                {isLoadingVariations || (isRefreshing && isLoading) ? <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading variations...</p></div>
                : variationsError ? <div className="text-center py-6"><AlertTriangle className="mx-auto h-10 w-10 text-destructive" /><p className="mt-3 text-destructive font-semibold">Error loading variations</p><p className="text-sm text-muted-foreground mt-1">{variationsError}</p></div>
                : groupedVariations && Object.keys(groupedVariations).length > 0 && productOptions.groupingAttributeName ? (<>
                    <div className="mb-4 flex items-center space-x-2 p-2 border-b">
                      <Checkbox id="selectAllVariationGroups" 
                        checked={allVariationsSelectedOverall} 
                        onCheckedChange={(cs) => {
                           const isChecked = cs === 'indeterminate' ? true : cs as boolean;
                           Object.keys(groupedVariations).forEach(groupKey => handleSelectAllVariationsInGroup(groupKey, isChecked));
                        }}
                        data-state={someVariationsSelectedOverall && !allVariationsSelectedOverall ? 'indeterminate' : (allVariationsSelectedOverall ? 'checked' : 'unchecked')} />
                      <Label htmlFor="selectAllVariationGroups" className="text-sm font-medium">{allVariationsSelectedOverall ? "Deselect All Color Groups" : "Select All Color Groups"}</Label>
                    </div>
                    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                    {Object.entries(groupedVariations).map(([groupKey, variationsInGroup]) => {
                      const groupOptions = productOptions.optionsByColor[groupKey] || { selectedVariationIds: [], variantViewImages: {} };
                      const allInGroupSelected = variationsInGroup.every(v => groupOptions.selectedVariationIds.includes(v.id.toString()));
                      const someInGroupSelected = variationsInGroup.some(v => groupOptions.selectedVariationIds.includes(v.id.toString())) && !allInGroupSelected;
                      
                      const representativeImage = variationsInGroup[0]?.image?.src || currentSetupView?.imageUrl || 'https://placehold.co/100x100.png';
                      const representativeImageAlt = variationsInGroup[0]?.image?.alt || productOptions.name;
                      const representativeImageAiHint = variationsInGroup[0]?.image?.alt ? variationsInGroup[0].image.alt.split(" ").slice(0,2).join(" ") : "variation group";
                      
                      const secondaryAttributeDisplayName = getSecondaryAttributeNameForDisplay(variationsInGroup);
                      const secondaryOptions = getSecondaryAttributeOptionsForGroup(variationsInGroup);
                      const stockStatusSummary = variationsInGroup.some(v => v.stock_status === 'outofstock') ? 'Some Out of Stock' : (variationsInGroup.every(v => v.stock_status === 'instock') ? 'All In Stock' : 'Mixed Stock');
                      
                      return (
                        <div key={groupKey} className={cn("p-4 border rounded-md flex flex-col gap-4 transition-colors", allInGroupSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/30 hover:bg-muted/50")}>
                          <div className="flex items-start sm:items-center gap-4">
                            <Checkbox 
                                id={`selectGroup-${groupKey.replace(/\s+/g, '-')}`} 
                                checked={allInGroupSelected} 
                                onCheckedChange={(cs) => handleSelectAllVariationsInGroup(groupKey, cs === 'indeterminate' ? true : cs as boolean)} 
                                data-state={someInGroupSelected ? 'indeterminate' : (allInGroupSelected ? 'checked' : 'unchecked')}
                                className="mt-1 flex-shrink-0"
                            />
                            <div className="relative h-20 w-20 rounded-md overflow-hidden border bg-card flex-shrink-0">
                                <NextImage src={representativeImage} alt={representativeImageAlt} fill className="object-contain" data-ai-hint={representativeImageAiHint}/>
                            </div>
                            <div className="flex-grow">
                              <h4 className="text-md font-semibold text-foreground mb-1">
                                {productOptions.groupingAttributeName}: <span className="text-primary">{groupKey}</span>
                              </h4>
                              {secondaryAttributeDisplayName && secondaryOptions.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-muted-foreground flex items-center">
                                    <Tag className="mr-1.5 h-3 w-3" /> {secondaryAttributeDisplayName}:
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {secondaryOptions.map(opt => <Badge key={opt} variant="secondary" className="text-xs">{opt}</Badge>)}
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">Stock: {stockStatusSummary}</p>
                              <p className="text-xs text-muted-foreground">Variations (SKUs) in group: {variationsInGroup.length}</p>
                            </div>
                          </div>
                          <div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingImagesForColor(editingImagesForColor === groupKey ? null : groupKey)}
                                className="w-full sm:w-auto hover:bg-accent/20"
                            >
                                <Edit3 className="mr-2 h-4 w-4" />
                                {editingImagesForColor === groupKey ? "Done Editing" : "Manage View Images for"} {groupKey}
                            </Button>
                            {editingImagesForColor === groupKey && (
                                <div className="mt-4 space-y-3 p-3 border rounded-md bg-card">
                                    <h5 className="text-sm font-medium text-foreground mb-2">Configure images for <span className="text-primary">{groupKey}</span>:</h5>
                                    {productOptions.defaultViews.map(defaultView => (
                                    <div key={defaultView.id} className="p-2 border-b last:border-b-0">
                                        <Label htmlFor={`variant-view-url-${groupKey}-${defaultView.id}`} className="text-xs font-medium text-muted-foreground">
                                        {defaultView.name} Image URL
                                        </Label>
                                        <Input
                                            id={`variant-view-url-${groupKey}-${defaultView.id}`}
                                            value={productOptions.optionsByColor[groupKey]?.variantViewImages[defaultView.id]?.imageUrl || ''}
                                            onChange={(e) => handleVariantViewImageChange(groupKey, defaultView.id, 'imageUrl', e.target.value)}
                                            className="h-8 text-xs mt-1 bg-background"
                                            placeholder={`Optional override for ${defaultView.name}`}
                                        />
                                        <Label htmlFor={`variant-view-ai-${groupKey}-${defaultView.id}`} className="text-xs font-medium text-muted-foreground mt-2 block">
                                        {defaultView.name} AI Hint <span className="text-muted-foreground/70">(for Unsplash search)</span>
                                        </Label>
                                        <Input
                                            id={`variant-view-ai-${groupKey}-${defaultView.id}`}
                                            value={productOptions.optionsByColor[groupKey]?.variantViewImages[defaultView.id]?.aiHint || ''}
                                            onChange={(e) => handleVariantViewImageChange(groupKey, defaultView.id, 'aiHint', e.target.value)}
                                            className="h-8 text-xs mt-1 bg-background"
                                            placeholder="e.g., t-shirt back"
                                        />
                                        {productOptions.optionsByColor[groupKey]?.variantViewImages[defaultView.id]?.imageUrl && (
                                        <div className="relative h-16 w-16 mt-2 border rounded-sm overflow-hidden bg-muted/10">
                                            <NextImage
                                            src={productOptions.optionsByColor[groupKey].variantViewImages[defaultView.id].imageUrl}
                                            alt={`${groupKey} - ${defaultView.name}`}
                                            fill
                                            className="object-contain"
                                            data-ai-hint={productOptions.optionsByColor[groupKey]?.variantViewImages[defaultView.id]?.aiHint || "variant view"}
                                            />
                                        </div>
                                        )}
                                    </div>
                                    ))}
                                </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                ) : <div className="text-center py-6"><LayersIcon className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 text-muted-foreground">No variations found or grouping failed for this product.</p></div>}
              </CardContent>
            </Card>
          )}
          {productOptions.type !== 'variable' && (
            <Card className="shadow-md"><CardHeader><CardTitle className="font-headline text-lg">Product Variations</CardTitle></CardHeader><CardContent className="text-center py-8 text-muted-foreground"><Shirt className="mx-auto h-10 w-10 mb-2" />This is a simple product and does not have variations to configure here.</CardContent></Card>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
           <ProductViewSetup
            productOptions={{views: productOptions.defaultViews}} 
            activeViewId={activeViewIdForSetup}
            selectedBoundaryBoxId={selectedBoundaryBoxId}
            setSelectedBoundaryBoxId={setSelectedBoundaryBoxId}
            handleSelectView={handleSelectViewForSetup}
            handleViewDetailChange={handleDefaultViewDetailChange}
            handleDeleteView={handleDeleteDefaultView}
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
            confirmDeleteView={confirmDeleteDefaultView}
          />

          <Card className="shadow-md sticky top-8">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Summary & Actions</CardTitle>
              <CardDescription>Review your product setup and save changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Editing for: <span className="font-semibold text-foreground">{productOptions.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Customization: <Badge variant={productOptions.allowCustomization ? "default" : "secondary"} className={productOptions.allowCustomization ? "bg-green-500/10 text-green-700 border-green-500/30" : ""}>{productOptions.allowCustomization ? "Enabled" : "Disabled"}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Total Default Views: <span className="font-semibold text-foreground">{productOptions.defaultViews.length}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Active Setup View: <span className="font-semibold text-foreground">{currentSetupView?.name || "N/A"}</span>
              </p>
              {currentSetupView && (
                <p className="text-sm text-muted-foreground">
                  Areas in <span className="font-semibold text-primary">{currentSetupView.name}</span>: <span className="font-semibold text-foreground">{currentSetupView.boundaryBoxes.length}</span>
                </p>
              )}
              {productOptions.type === 'variable' && (
                <p className="text-sm text-muted-foreground">
                  Total Variation SKUs enabled for customizer: <span className="font-semibold text-foreground">
                    {Object.values(productOptions.optionsByColor).reduce((acc, group) => acc + group.selectedVariationIds.length, 0)}
                    </span> of {variations.length}
                </p>
              )}
              {hasUnsavedChanges && (<p className="mt-3 text-sm text-yellow-600 flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500" />You have unsaved changes.</p>)}
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
    


    

