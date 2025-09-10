
"use client";

import { useState, Suspense, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Store, Settings, Palette, Zap, Loader2, Save, LayoutTemplate, CheckCircle, Upload, X, PlusCircle, Trash2, Percent, Truck, PackageCheck, Scissors, FileText, Settings2, Brush, Star, MessageSquare } from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, type FieldValue, deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { UserStoreConfig, VolumeDiscountTier } from "@/app/actions/userStoreActions";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";


const layouts = [
  {
    name: 'casual',
    title: 'Casual',
    description: 'A fun, modern layout with rounded elements and a friendly feel.',
    preview: 'https://picsum.photos/seed/casual-layout/300/180',
    aiHint: 'casual website layout'
  },
  {
    name: 'corporate',
    title: 'Corporate',
    description: 'A clean, professional, and structured layout for trust and clarity.',
    preview: 'https://picsum.photos/seed/corporate-layout/300/180',
    aiHint: 'corporate website layout'
  },
  {
    name: 'marketing',
    title: 'Marketing',
    description: 'A conversion-focused layout with a strong hero and calls-to-action.',
    preview: 'https://picsum.photos/seed/marketing-layout/300/180',
    aiHint: 'marketing website layout'
  }
] as const;

type LayoutName = typeof layouts[number]['name'];

type HomePageContent = NonNullable<NonNullable<UserStoreConfig['pages']>['homepage']>;
type PageContent = NonNullable<UserStoreConfig['pages']>;
type ActiveSection = 'settings' | 'branding' | 'pages' | 'shipping' | 'embroidery' | 'discounts';


// Client-side function to save user store configuration
async function saveUserStoreConfig(config: Omit<UserStoreConfig, 'id' | 'createdAt' | 'lastSaved'>, existingStoreId?: string | null): Promise<{ storeId: string, isNew: boolean }> {
  if (!config.userId || !db) {
    throw new Error("User not authenticated or database not available.");
  }

  const isNew = !existingStoreId;
  const storeId = existingStoreId || doc(collection(db, 'userStores')).id;
  const storeRef = doc(db, 'userStores', storeId);

  const dataToSave: any = {
    ...config,
    lastSaved: serverTimestamp(),
  };

  if (isNew) {
    dataToSave.createdAt = serverTimestamp();
    // Ensure productIds is initialized
    dataToSave.productIds = config.productIds || [];
    if (dataToSave.branding && dataToSave.branding.logoUrl === undefined) {
      delete dataToSave.branding.logoUrl;
    }
  } else {
    // For existing docs, handle undefined fields to remove them from Firestore
    if (dataToSave.branding && dataToSave.branding.logoUrl === undefined) {
      dataToSave.branding.logoUrl = deleteField();
    }
    if (dataToSave.pages?.homepage?.backgroundImageUrl === undefined) {
        if (!dataToSave.pages.homepage) dataToSave.pages.homepage = {};
        dataToSave.pages.homepage.backgroundImageUrl = deleteField();
    }
  }
  
  await setDoc(storeRef, dataToSave, { merge: !isNew });

  return { storeId, isNew };
}

function CreateStorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const storeId = searchParams.get('storeId');

  const [storeName, setStoreName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#468189");
  const [secondaryColor, setSecondaryColor] = useState("#8A56AC");
  const [selectedLayout, setSelectedLayout] = useState<LayoutName>('casual');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('settings');

  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<VolumeDiscountTier[]>([
    { quantity: 10, percentage: 5 },
    { quantity: 25, percentage: 10 },
  ]);

  const [localDeliveryEnabled, setLocalDeliveryEnabled] = useState(false);
  const [localDeliveryFee, setLocalDeliveryFee] = useState<number | string>(0);
  const [localDeliveryText, setLocalDeliveryText] = useState("Available for local delivery");

  const [embroideryFeeEnabled, setEmbroideryFeeEnabled] = useState(false);
  const [embroideryFeeAmount, setEmbroideryFeeAmount] = useState<number | string>(25);
  const [embroideryFeeDescription, setEmbroideryFeeDescription] = useState("One-time fee to convert your logo file into a format that embroidery machines can read. Once paid, you can reuse this embroidery file on future orders for free.");

  const [pageContent, setPageContent] = useState<PageContent>({
    homepage: { 
        hero: { headline: '', subheading: '', primaryButtonText: '', secondaryButtonText: '', backgroundImageUrl: '' },
        features: { enabled: true, title: 'Why Choose Us?', items: [{ title: '', description: ''}] },
        testimonials: { enabled: true, title: 'What Our Customers Say', items: [{ quote: '', author: ''}] },
        callToAction: { enabled: true, headline: '', subheading: '', buttonText: '' }
    },
    about: { title: 'About Us', body: '' },
    faq: { title: 'Frequently Asked Questions', introduction: '', questions: [{ question: '', answer: '' }] },
    contact: { title: 'Contact Us', email: '', phone: '', address: '' },
    terms: { title: 'Terms of Service', body: '' },
    privacy: { title: 'Privacy Policy', body: '' }
  });

  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchExistingConfig = useCallback(async () => {
    if (!user || !storeId) {
      setIsLoadingExisting(false);
      return;
    }
    setIsLoadingExisting(true);
    const storeRef = doc(db, 'userStores', storeId);
    const docSnap = await getDoc(storeRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserStoreConfig;
      if (data.userId !== user.uid) {
        toast({ title: "Unauthorized", description: "You do not have permission to edit this store.", variant: "destructive" });
        router.push('/dashboard');
        return;
      }
      setStoreName(data.storeName || "");
      setSelectedLayout(data.layout || 'casual');
      setPrimaryColor(data.branding?.primaryColorHex || "#468189");
      setSecondaryColor(data.branding?.secondaryColorHex || "#8A56AC");
      setLogoDataUrl(data.branding?.logoUrl || null);
      setDiscountsEnabled(data.volumeDiscounts?.enabled || false);
      if (data.volumeDiscounts?.tiers && data.volumeDiscounts.tiers.length > 0) {
        setDiscountTiers(data.volumeDiscounts.tiers);
      }
      setLocalDeliveryEnabled(data.shipping?.localDeliveryEnabled || false);
      setLocalDeliveryFee(data.shipping?.localDeliveryFee || 0);
      setLocalDeliveryText(data.shipping?.localDeliveryText || "Available for local delivery");
      
      setEmbroideryFeeEnabled(data.embroidery?.setupFeeEnabled || false);
      setEmbroideryFeeAmount(data.embroidery?.setupFeeAmount || 25);
      setEmbroideryFeeDescription(data.embroidery?.setupFeeDescription || "One-time fee to convert your logo file into a format that embroidery machines can read. Once paid, you can reuse this embroidery file on future orders for free.");

      setPageContent(current => ({
        ...current,
        ...data.pages,
        homepage: { ...current.homepage, ...data.pages?.homepage } as HomePageContent
      }));

    } else if (storeId) {
      toast({ title: "Not Found", description: "The requested store could not be found.", variant: "destructive" });
      router.push('/dashboard');
    }
    setIsLoadingExisting(false);
  }, [user, storeId, toast, router]);

  useEffect(() => {
    fetchExistingConfig();
  }, [fetchExistingConfig]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, field: 'logo' | 'heroBackground') => {
    if (!user || !storeId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File Too Large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
        return;
    }

    setUploadProgress(0);
    const storagePath = `users/${user.uid}/stores/${storeId}/${field}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error("Upload error:", error);
            toast({ title: "Upload Failed", variant: "destructive" });
            setUploadProgress(0);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                if (field === 'logo') {
                    setLogoDataUrl(downloadURL);
                } else if (field === 'heroBackground') {
                    handleHomepageContentChange('hero', 'backgroundImageUrl', downloadURL);
                }
                toast({ title: "Upload Complete" });
                setUploadProgress(0);
            });
        }
    );
  };
  
  const handleDiscountTierChange = (index: number, field: 'quantity' | 'percentage', value: string) => {
    const newTiers = [...discountTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setDiscountTiers(newTiers);
  };

  const handleDiscountTierBlur = (index: number, field: 'quantity' | 'percentage') => {
    const newTiers = [...discountTiers];
    const numValue = parseInt(String(newTiers[index][field]), 10);
    newTiers[index] = { ...newTiers[index], [field]: isNaN(numValue) ? 0 : numValue };
    setDiscountTiers(newTiers);
  };

  const addDiscountTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1] || { quantity: 0, percentage: 0 };
    setDiscountTiers([...discountTiers, { quantity: lastTier.quantity + 10, percentage: lastTier.percentage + 2 }]);
  };
  
  const removeDiscountTier = (index: number) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };
  
  const handleHomepageContentChange = <T extends keyof HomePageContent>(section: T, field: keyof HomePageContent[T], value: any) => {
      setPageContent(prev => ({
          ...prev,
          homepage: {
              ...prev.homepage,
              [section]: {
                  ...prev.homepage?.[section],
                  [field]: value,
              },
          } as HomePageContent,
      }));
  };

  const handleHomepageNestedItemChange = <T extends 'features' | 'testimonials'>(section: T, index: number, field: keyof HomePageContent[T]['items'][number], value: string) => {
    setPageContent(prev => {
        const sectionContent = prev.homepage?.[section];
        if (!sectionContent) return prev;
        const newItems = [...sectionContent.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return {
            ...prev,
            homepage: {
                ...prev.homepage,
                [section]: {
                    ...sectionContent,
                    items: newItems,
                }
            } as HomePageContent
        }
    });
  };

  const addHomepageNestedItem = (section: 'features' | 'testimonials') => {
      setPageContent(prev => {
          const sectionContent = prev.homepage?.[section];
          if (!sectionContent) return prev;
          const newItem = section === 'features' ? { title: '', description: '' } : { quote: '', author: '' };
          return {
              ...prev,
              homepage: {
                  ...prev.homepage,
                  [section]: { ...sectionContent, items: [...sectionContent.items, newItem] }
              } as HomePageContent
          }
      });
  };

  const removeHomepageNestedItem = (section: 'features' | 'testimonials', index: number) => {
      setPageContent(prev => {
          const sectionContent = prev.homepage?.[section];
          if (!sectionContent) return prev;
          return {
              ...prev,
              homepage: {
                  ...prev.homepage,
                  [section]: { ...sectionContent, items: sectionContent.items.filter((_, i) => i !== index) }
              } as HomePageContent
          }
      });
  };

  const handlePageContentChange = <T extends keyof PageContent>(page: T, field: keyof PageContent[T], value: string) => {
    setPageContent(prev => ({
        ...prev,
        [page]: {
            ...prev[page],
            [field]: value
        }
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setPageContent(prev => {
        const newFaq = { ...prev.faq };
        if (newFaq.questions) {
            newFaq.questions[index] = { ...newFaq.questions[index], [field]: value };
        }
        return { ...prev, faq: newFaq };
    });
  };

  const addFaq = () => {
    setPageContent(prev => ({
        ...prev,
        faq: {
            ...prev.faq,
            questions: [...(prev.faq?.questions || []), { question: '', answer: '' }]
        }
    }));
  };
  
  const removeFaq = (index: number) => {
    setPageContent(prev => ({
        ...prev,
        faq: {
            ...prev.faq,
            questions: (prev.faq?.questions || []).filter((_, i) => i !== index)
        }
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!storeName.trim()) {
      toast({ title: "Store name is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const storeConfigData: Omit<UserStoreConfig, 'id' | 'createdAt' | 'lastSaved'> = {
          userId: user.uid,
          storeName,
          layout: selectedLayout,
          branding: {
              primaryColorHex: primaryColor,
              secondaryColorHex: secondaryColor,
              logoUrl: logoDataUrl || undefined,
          },
          volumeDiscounts: {
              enabled: discountsEnabled,
              tiers: discountTiers.map(t => ({ quantity: Number(t.quantity), percentage: Number(t.percentage) })).filter(t => t.quantity > 0 && t.percentage > 0).sort((a,b) => a.quantity - b.quantity),
          },
          shipping: {
              localDeliveryEnabled,
              localDeliveryFee: Number(localDeliveryFee),
              localDeliveryText,
          },
          embroidery: {
              setupFeeEnabled: embroideryFeeEnabled,
              setupFeeAmount: Number(embroideryFeeAmount),
              setupFeeDescription: embroideryFeeDescription,
          },
          pages: pageContent,
      };

      const { storeId: savedStoreId, isNew } = await saveUserStoreConfig(storeConfigData, storeId);
      
      toast({
        title: isNew ? "Store Created!" : "Store Updated!",
        description: "Now, let's add some products.",
      });

      router.push(`/dashboard/store/${savedStoreId}/select-products`);

    } catch (error: any) {
      let errorMessage = `Failed to save store: ${error.message}`;
      if (error.code === 'permission-denied') {
          errorMessage = "Permission denied. Please check your Firestore security rules for 'userStores'.";
      }
      toast({ title: "Save Failed", description: errorMessage, variant: "destructive" });
      console.error("Save store error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Set the basic name and layout for your new store.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-base">Store Name</Label>
                <Input id="storeName" placeholder="e.g., My Awesome T-Shirt Shop" value={storeName} onChange={(e) => setStoreName(e.target.value)} disabled={isSaving} required />
              </div>
              <div className="space-y-4">
                <Label className="text-base">Select a Layout</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {layouts.map((layout) => (
                    <div key={layout.name} onClick={() => setSelectedLayout(layout.name)} className={cn("p-3 border-2 rounded-lg cursor-pointer transition-all", selectedLayout === layout.name ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border hover:border-primary/50' )}>
                      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted/50 mb-3">
                        <Image src={layout.preview} alt={layout.title} fill className="object-cover" data-ai-hint={layout.aiHint} sizes="(max-width: 768px) 100vw, 33vw"/>
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{layout.title}</h4>
                        {selectedLayout === layout.name && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{layout.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'branding':
        return (
           <Card>
            <CardHeader><CardTitle>Branding & Style</CardTitle><CardDescription>Customize the look and feel of your store.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1"><Label htmlFor="primaryColor" className="text-sm">Primary Color</Label><Input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} disabled={isSaving} className="h-10 p-1"/></div>
                  <div className="space-y-1"><Label htmlFor="secondaryColor" className="text-sm">Secondary Color</Label><Input id="secondaryColor" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} disabled={isSaving} className="h-10 p-1"/></div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logoUpload" className="text-sm">Store Logo</Label>
                    {logoDataUrl ? (
                      <div className="flex items-center gap-3 p-2 border rounded-md">
                        <div className="relative w-16 h-16 bg-muted/50 rounded"><Image src={logoDataUrl} alt="Logo preview" fill className="object-contain" /></div>
                        <Button variant="destructive" size="sm" onClick={() => setLogoDataUrl(null)}><X className="mr-1.5 h-4 w-4" /> Remove</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-8 h-8 mb-3 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PNG, JPG, or GIF (max 2MB)</p></div>
                            <input id="logo-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} accept="image/*" />
                        </label>
                      </div> 
                    )}
                  </div>
                </div>
            </CardContent>
          </Card>
        );
      case 'pages':
        return (
            <Card>
                <CardHeader><CardTitle>Page Content</CardTitle><CardDescription>Edit the content for your store's generated pages.</CardDescription></CardHeader>
                <CardContent>
                    <Tabs defaultValue="homepage" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto flex-wrap"><TabsTrigger value="homepage">Homepage</TabsTrigger><TabsTrigger value="about">About</TabsTrigger><TabsTrigger value="faq">FAQ</TabsTrigger><TabsTrigger value="contact">Contact</TabsTrigger><TabsTrigger value="terms">Terms</TabsTrigger><TabsTrigger value="privacy">Privacy</TabsTrigger></TabsList>
                        
                        <TabsContent value="homepage" className="mt-4">
                            <Accordion type="multiple" defaultValue={['hero']} className="w-full space-y-2">
                                <AccordionItem value="hero">
                                    <AccordionTrigger className="text-base font-semibold px-3 bg-muted/50 rounded-md">Hero Section</AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="space-y-1"><Label htmlFor="hero-headline">Headline</Label><Input id="hero-headline" value={pageContent.homepage?.hero?.headline || ''} onChange={e => handleHomepageContentChange('hero', 'headline', e.target.value)} /></div>
                                        <div className="space-y-1"><Label htmlFor="hero-subheading">Subheading</Label><Textarea id="hero-subheading" value={pageContent.homepage?.hero?.subheading || ''} onChange={e => handleHomepageContentChange('hero', 'subheading', e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><Label htmlFor="hero-primaryBtn">Primary Button Text</Label><Input id="hero-primaryBtn" value={pageContent.homepage?.hero?.primaryButtonText || ''} onChange={e => handleHomepageContentChange('hero', 'primaryButtonText', e.target.value)} /></div>
                                            <div className="space-y-1"><Label htmlFor="hero-secondaryBtn">Secondary Button Text</Label><Input id="hero-secondaryBtn" value={pageContent.homepage?.hero?.secondaryButtonText || ''} onChange={e => handleHomepageContentChange('hero', 'secondaryButtonText', e.target.value)} /></div>
                                        </div>
                                         <div className="space-y-2"><Label>Background Image</Label>
                                            {pageContent.homepage?.hero?.backgroundImageUrl ? (
                                                <div className="flex items-center gap-3 p-2 border rounded-md"><div className="relative w-24 h-16 bg-muted/50 rounded"><Image src={pageContent.homepage.hero.backgroundImageUrl} alt="Hero BG preview" fill className="object-cover" /></div><Button variant="destructive" size="sm" onClick={() => handleHomepageContentChange('hero', 'backgroundImageUrl', undefined)}><X className="mr-1.5 h-4 w-4" /> Remove</Button></div>
                                            ) : (
                                                <div><label htmlFor="hero-bg-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50"><div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-8 h-8 mb-3 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span></p></div><input id="hero-bg-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'heroBackground')} accept="image/*" /></label>{uploadProgress > 0 && <Progress value={uploadProgress} className="mt-2" />}</div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="features">
                                    <AccordionTrigger className="text-base font-semibold px-3 bg-muted/50 rounded-md">Features Section</AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="flex items-center space-x-2"><Checkbox id="features-enabled" checked={pageContent.homepage?.features?.enabled} onCheckedChange={checked => handleHomepageContentChange('features', 'enabled', !!checked)}/><Label htmlFor="features-enabled">Show Features Section</Label></div>
                                        <div className="space-y-1"><Label htmlFor="features-title">Section Title</Label><Input id="features-title" value={pageContent.homepage?.features?.title || ''} onChange={e => handleHomepageContentChange('features', 'title', e.target.value)} /></div>
                                        {pageContent.homepage?.features?.items.map((item, index) => (<div key={index} className="p-3 border rounded-md space-y-2 relative"><Label>Feature {index+1}</Label><Input placeholder="Feature Title" value={item.title} onChange={e => handleHomepageNestedItemChange('features', index, 'title', e.target.value)} /><Textarea placeholder="Feature Description" value={item.description} onChange={e => handleHomepageNestedItemChange('features', index, 'description', e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeHomepageNestedItem('features', index)}><Trash2 className="h-4 w-4" /></Button></div>))}
                                        <Button type="button" variant="outline" onClick={() => addHomepageNestedItem('features')}><PlusCircle className="mr-2 h-4 w-4" /> Add Feature</Button>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="testimonials">
                                     <AccordionTrigger className="text-base font-semibold px-3 bg-muted/50 rounded-md">Testimonials Section</AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="flex items-center space-x-2"><Checkbox id="testimonials-enabled" checked={pageContent.homepage?.testimonials?.enabled} onCheckedChange={checked => handleHomepageContentChange('testimonials', 'enabled', !!checked)}/><Label htmlFor="testimonials-enabled">Show Testimonials Section</Label></div>
                                        <div className="space-y-1"><Label htmlFor="testimonials-title">Section Title</Label><Input id="testimonials-title" value={pageContent.homepage?.testimonials?.title || ''} onChange={e => handleHomepageContentChange('testimonials', 'title', e.target.value)} /></div>
                                        {pageContent.homepage?.testimonials?.items.map((item, index) => (<div key={index} className="p-3 border rounded-md space-y-2 relative"><Label>Testimonial {index+1}</Label><Textarea placeholder="Quote" value={item.quote} onChange={e => handleHomepageNestedItemChange('testimonials', index, 'quote', e.target.value)} /><Input placeholder="Author" value={item.author} onChange={e => handleHomepageNestedItemChange('testimonials', index, 'author', e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeHomepageNestedItem('testimonials', index)}><Trash2 className="h-4 w-4" /></Button></div>))}
                                        <Button type="button" variant="outline" onClick={() => addHomepageNestedItem('testimonials')}><PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial</Button>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="cta">
                                     <AccordionTrigger className="text-base font-semibold px-3 bg-muted/50 rounded-md">Call to Action Section</AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="flex items-center space-x-2"><Checkbox id="cta-enabled" checked={pageContent.homepage?.callToAction?.enabled} onCheckedChange={checked => handleHomepageContentChange('callToAction', 'enabled', !!checked)}/><Label htmlFor="cta-enabled">Show Call to Action Section</Label></div>
                                        <div className="space-y-1"><Label htmlFor="cta-headline">Headline</Label><Input id="cta-headline" value={pageContent.homepage?.callToAction?.headline || ''} onChange={e => handleHomepageContentChange('callToAction', 'headline', e.target.value)} /></div>
                                        <div className="space-y-1"><Label htmlFor="cta-subheading">Subheading</Label><Input id="cta-subheading" value={pageContent.homepage?.callToAction?.subheading || ''} onChange={e => handleHomepageContentChange('callToAction', 'subheading', e.target.value)} /></div>
                                        <div className="space-y-1"><Label htmlFor="cta-button">Button Text</Label><Input id="cta-button" value={pageContent.homepage?.callToAction?.buttonText || ''} onChange={e => handleHomepageContentChange('callToAction', 'buttonText', e.target.value)} /></div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </TabsContent>
                        
                        <TabsContent value="about" className="mt-4 space-y-4"><div className="space-y-1"><Label htmlFor="page-about-title">Page Title</Label><Input id="page-about-title" value={pageContent.about?.title || ''} onChange={e => handlePageContentChange('about', 'title', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-about-body">Content</Label><Textarea id="page-about-body" rows={10} value={pageContent.about?.body || ''} onChange={e => handlePageContentChange('about', 'body', e.target.value)} /></div></TabsContent>
                        <TabsContent value="faq" className="mt-4 space-y-4"><div className="space-y-1"><Label htmlFor="page-faq-title">Page Title</Label><Input id="page-faq-title" value={pageContent.faq?.title || ''} onChange={e => handlePageContentChange('faq', 'title', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-faq-intro">Introduction</Label><Textarea id="page-faq-intro" rows={3} value={pageContent.faq?.introduction || ''} onChange={e => handlePageContentChange('faq', 'introduction', e.target.value)} /></div><Separator /><div className="space-y-4">{pageContent.faq?.questions?.map((item, index) => (<div key={index} className="p-3 border rounded-md space-y-2 relative"><Label>Question {index + 1}</Label><Input placeholder="Question" value={item.question} onChange={e => handleFaqChange(index, 'question', e.target.value)} /><Textarea placeholder="Answer" value={item.answer} onChange={e => handleFaqChange(index, 'answer', e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeFaq(index)}><Trash2 className="h-4 w-4" /></Button></div>))}<Button type="button" variant="outline" onClick={addFaq}><PlusCircle className="mr-2 h-4 w-4" /> Add FAQ Item</Button></div></TabsContent>
                        <TabsContent value="contact" className="mt-4 space-y-4"><div className="space-y-1"><Label htmlFor="page-contact-title">Page Title</Label><Input id="page-contact-title" value={pageContent.contact?.title || ''} onChange={e => handlePageContentChange('contact', 'title', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-contact-email">Contact Email</Label><Input id="page-contact-email" type="email" value={pageContent.contact?.email || ''} onChange={e => handlePageContentChange('contact', 'email', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-contact-phone">Contact Phone</Label><Input id="page-contact-phone" value={pageContent.contact?.phone || ''} onChange={e => handlePageContentChange('contact', 'phone', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-contact-address">Address</Label><Textarea id="page-contact-address" value={pageContent.contact?.address || ''} onChange={e => handlePageContentChange('contact', 'address', e.target.value)} /></div></TabsContent>
                        <TabsContent value="terms" className="mt-4 space-y-4"><div className="space-y-1"><Label htmlFor="page-terms-title">Page Title</Label><Input id="page-terms-title" value={pageContent.terms?.title || ''} onChange={e => handlePageContentChange('terms', 'title', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-terms-body">Content</Label><Textarea id="page-terms-body" rows={15} value={pageContent.terms?.body || ''} onChange={e => handlePageContentChange('terms', 'body', e.target.value)} /></div></TabsContent>
                        <TabsContent value="privacy" className="mt-4 space-y-4"><div className="space-y-1"><Label htmlFor="page-privacy-title">Page Title</Label><Input id="page-privacy-title" value={pageContent.privacy?.title || ''} onChange={e => handlePageContentChange('privacy', 'title', e.target.value)} /></div><div className="space-y-1"><Label htmlFor="page-privacy-body">Content</Label><Textarea id="page-privacy-body" rows={15} value={pageContent.privacy?.body || ''} onChange={e => handlePageContentChange('privacy', 'body', e.target.value)} /></div></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        );
      case 'shipping':
        return (
          <Card><CardHeader><CardTitle>Shipping Fees</CardTitle><CardDescription>Configure shipping options for your store.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-2"><Checkbox id="enable-local-delivery" checked={localDeliveryEnabled} onCheckedChange={(checked) => setLocalDeliveryEnabled(checked as boolean)} /><Label htmlFor="enable-local-delivery" className="font-medium">Enable Local Delivery</Label></div>{localDeliveryEnabled && (<div className="space-y-3 pt-2 pl-6 border-l"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label htmlFor="delivery-fee">Delivery Fee ($)</Label><Input id="delivery-fee" type="number" value={localDeliveryFee} onChange={(e) => setLocalDeliveryFee(e.target.value)} onBlur={() => setLocalDeliveryFee(Number(localDeliveryFee) || 0)} min="0" step="0.01" /></div><div><Label htmlFor="delivery-text">Delivery Text</Label><Input id="delivery-text" value={localDeliveryText} onChange={(e) => setLocalDeliveryText(e.target.value)} placeholder="e.g., Available for local delivery" /></div></div></div>)}</CardContent></Card>
        );
      case 'embroidery':
        return (
          <Card><CardHeader><CardTitle className="flex items-center"><Scissors className="mr-2 h-5 w-5" />Embroidery Settings</CardTitle><CardDescription>Configure a one-time setup fee for embroidery designs.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-2"><Checkbox id="enable-embroidery-fee" checked={embroideryFeeEnabled} onCheckedChange={(checked) => setEmbroideryFeeEnabled(checked as boolean)} /><Label htmlFor="enable-embroidery-fee" className="font-medium">Enable Embroidery Set Up Fee</Label></div>{embroideryFeeEnabled && (<div className="space-y-3 pt-2 pl-6 border-l"><div><Label htmlFor="embroidery-fee">Set Up Fee ($)</Label><Input id="embroidery-fee" type="number" value={embroideryFeeAmount} onChange={(e) => setEmbroideryFeeAmount(e.target.value)} onBlur={() => setEmbroideryFeeAmount(Number(embroideryFeeAmount) || 0)} min="0" step="0.01"/></div><div><Label htmlFor="embroidery-description">Fee Description</Label><Input id="embroidery-description" value={embroideryFeeDescription} onChange={(e) => setEmbroideryFeeDescription(e.target.value)}/><p className="text-xs text-muted-foreground mt-1">This text will be shown to the customer when the fee is applied.</p></div></div>)}</CardContent></Card>
        );
      case 'discounts':
        return (
          <Card><CardHeader><CardTitle>Volume Discounts</CardTitle><CardDescription>Offer percentage-based discounts for bulk orders.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center space-x-2"><Checkbox id="enable-discounts" checked={discountsEnabled} onCheckedChange={(checked) => setDiscountsEnabled(checked as boolean)} /><Label htmlFor="enable-discounts" className="font-medium">Enable volume discounts for this store</Label></div>{discountsEnabled && (<div className="space-y-3 pt-2 pl-6 border-l"><div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center text-xs text-muted-foreground"><span>Min. Quantity</span><span>Discount</span><span></span><span></span></div>{discountTiers.map((tier, index) => (<div key={index} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center"><Input type="number" placeholder="e.g., 10" value={tier.quantity} onChange={(e) => handleDiscountTierChange(index, 'quantity', e.target.value)} onBlur={() => handleDiscountTierBlur(index, 'quantity')} min="1"/><Input type="number" placeholder="e.g., 5" value={tier.percentage} onChange={(e) => handleDiscountTierChange(index, 'percentage', e.target.value)} onBlur={() => handleDiscountTierBlur(index, 'percentage')} min="0" max="100"/><Percent className="h-4 w-4 text-muted-foreground" /><Button type="button" variant="ghost" size="icon" onClick={() => removeDiscountTier(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></div>))}<Button type="button" variant="outline" onClick={addDiscountTier}><PlusCircle className="mr-2 h-4 w-4" /> Add Tier</Button></div>)}</CardContent></Card>
        );
      default:
        return null;
    }
  };

  if (isLoadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3">Loading Store Settings...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex-1">
        <form onSubmit={handleSubmit}>
          <div className="flex">
             <Sidebar className="h-[calc(100vh-4rem)] sticky top-[calc(4rem+1px)] w-64 hidden lg:flex">
                <SidebarContent className="px-4 pt-6">
                    <SidebarMenu className="gap-2">
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('settings')} isActive={activeSection === 'settings'} size="lg"><Settings2 className="mr-2 h-5 w-5" />General Settings</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('branding')} isActive={activeSection === 'branding'} size="lg"><Brush className="mr-2 h-5 w-5" />Branding</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('pages')} isActive={activeSection === 'pages'} size="lg"><FileText className="mr-2 h-5 w-5" />Page Content</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('shipping')} isActive={activeSection === 'shipping'} size="lg"><Truck className="mr-2 h-5 w-5" />Shipping</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('embroidery')} isActive={activeSection === 'embroidery'} size="lg"><Scissors className="mr-2 h-5 w-5" />Embroidery</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton type="button" onClick={() => setActiveSection('discounts')} isActive={activeSection === 'discounts'} size="lg"><Percent className="mr-2 h-5 w-5" />Discounts</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
             </Sidebar>

            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                      <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                      </Link>
                    </Button>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight font-headline text-foreground">
                        {storeId ? 'Edit Store' : 'Build Your Store'}
                      </h1>
                      <p className="text-muted-foreground text-sm">
                        {storeName ? `Editing: ${storeName}` : 'Create and configure your new e-commerce storefront.'}
                      </p>
                    </div>
                  </div>
                  <Button type="submit" size="default" disabled={isSaving || !storeName}>
                      {isSaving ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" />) : ( <PackageCheck className="mr-2 h-4 w-4" /> )}
                      {isSaving ? "Saving..." : "Save & Select Products"}
                  </Button>
                </div>

              {isSaving && (
                  <Alert variant="default" className="bg-primary/5 border-primary/20">
                    <Zap className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary/90 font-medium">Saving Store...</AlertTitle>
                    <AlertDescription className="text-primary/80">
                      Your store configuration is being saved. You will be redirected shortly.
                    </AlertDescription>
                  </Alert>
              )}
              {renderActiveSection()}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function CreateStorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3">Loading Page...</p>
      </div>
    }>
      <CreateStorePageContent />
    </Suspense>
  );
}
