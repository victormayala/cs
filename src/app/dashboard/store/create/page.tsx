
"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Store, Settings, Palette, Zap, Loader2, Save, LayoutTemplate, CheckCircle, Upload, X, PlusCircle, Trash2, Percent, Info } from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, type FieldValue } from 'firebase/firestore';
import type { UserStoreConfig, VolumeDiscountTier } from "@/app/actions/userStoreActions";
import { deployStore } from "@/ai/flows/deploy-store";
import { Checkbox } from "@/components/ui/checkbox";


const generatedPages = [
  'Homepage', 'About', 'FAQ', 'Contact', 
  'Product Listing (PLP)', 'Product Detail (PDP)', 
  'Cart', 'Checkout', 'Order Confirmation', 
  'User Account', 'Terms of Service', 'Privacy Policy'
];

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

function CreateStorePageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [storeName, setStoreName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#468189");
  const [secondaryColor, setSecondaryColor] = useState("#8A56AC");
  const [selectedLayout, setSelectedLayout] = useState<LayoutName>('casual');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // Volume Discounts State
  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<VolumeDiscountTier[]>([
    { quantity: 10, percentage: 5 },
    { quantity: 25, percentage: 10 },
  ]);

  useEffect(() => {
    if (!user) return;
    const fetchExistingConfig = async () => {
      setIsLoadingExisting(true);
      const storeRef = doc(db, 'userStores', user.uid);
      const docSnap = await getDoc(storeRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserStoreConfig;
        setStoreName(data.storeName || "");
        setSelectedLayout(data.layout || 'casual');
        setPrimaryColor(data.branding?.primaryColorHex || "#468189");
        setSecondaryColor(data.branding?.secondaryColorHex || "#8A56AC");
        setLogoDataUrl(data.branding?.logoUrl || null);
        setDiscountsEnabled(data.volumeDiscounts?.enabled || false);
        if (data.volumeDiscounts?.tiers && data.volumeDiscounts.tiers.length > 0) {
          setDiscountTiers(data.volumeDiscounts.tiers);
        }
      }
      setIsLoadingExisting(false);
    };
    fetchExistingConfig();
  }, [user]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File Too Large", description: "Please upload a logo smaller than 2MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        setLogoDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleDiscountTierChange = (index: number, field: 'quantity' | 'percentage', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) && value !== '') return;
    
    const newTiers = [...discountTiers];
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
    const storeRef = doc(db, 'userStores', user.uid);

    try {
      // Step 1: Save initial config with 'pending' status
      const initialStoreData: Omit<UserStoreConfig, 'createdAt' | 'id'> & { lastSaved: FieldValue; createdAt?: FieldValue } = {
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
          tiers: discountTiers.filter(t => t.quantity > 0 && t.percentage > 0).sort((a,b) => a.quantity - b.quantity),
        },
        deployment: {
          status: 'pending', // Start as pending
        },
        lastSaved: serverTimestamp(),
      };

      const docSnap = await getDoc(storeRef);
      if (!docSnap.exists()) {
        initialStoreData.createdAt = serverTimestamp();
      }

      await setDoc(storeRef, initialStoreData, { merge: true });
      
      toast({
        title: "Configuration Saved!",
        description: "Your store settings have been saved. Now starting deployment...",
      });
      
      // Step 2: Call the deployment flow (which no longer touches the DB)
      const storeConfigForFlow: UserStoreConfig = {
        ...initialStoreData,
        id: user.uid,
        createdAt: docSnap.data()?.createdAt || serverTimestamp(), // Use existing or new timestamp
        deployment: { status: 'pending' }, // Pass current deployment state
      };
      
      const plainStoreConfig = JSON.parse(JSON.stringify(storeConfigForFlow));
      const deploymentResult = await deployStore(plainStoreConfig);

      // Step 3: Update the doc with the deployment result from the client
      await setDoc(storeRef, {
        deployment: {
          status: 'active',
          deployedUrl: deploymentResult.deploymentUrl,
          lastDeployedAt: serverTimestamp(),
        }
      }, { merge: true });

      toast({
        title: "Deployment Succeeded!",
        description: `Your store is now active.`,
      });

      router.push(`/store/${user.uid}`);

    } catch (error: any) {
      let errorMessage = `Failed to save or deploy: ${error.message}`;
      if (error.code === 'permission-denied') {
          errorMessage = "Permission denied. Please check your Firestore security rules for 'userStores'.";
      }
      toast({
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Save/Deploy error:", error);
      // Optional: Set status to 'error' in Firestore
      await setDoc(storeRef, { deployment: { status: 'error' } }, { merge: true }).catch(e => console.error("Failed to set error status:", e));

    } finally {
      setIsSaving(false);
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
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="container max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                Build Your Store
              </h1>
              <p className="text-muted-foreground">
                Create and configure your new e-commerce storefront.
              </p>
            </div>
          </div>

          <Card className="shadow-lg border-border bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-card-foreground">
                Store Configuration
              </CardTitle>
              <CardDescription>
                Set the basic branding and details for your new store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="storeName" className="flex items-center text-base">
                  <Store className="mr-2 h-5 w-5 text-primary" />
                  Store Name
                </Label>
                <Input 
                  id="storeName" 
                  placeholder="e.g., My Awesome T-Shirt Shop" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={isSaving}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be the public name of your store.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="flex items-center text-base">
                  <LayoutTemplate className="mr-2 h-5 w-5 text-primary" />
                  Select a Layout
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {layouts.map((layout) => (
                    <div
                      key={layout.name}
                      onClick={() => setSelectedLayout(layout.name)}
                      className={cn(
                        "p-3 border-2 rounded-lg cursor-pointer transition-all",
                        selectedLayout === layout.name
                          ? 'border-primary ring-2 ring-primary ring-offset-2'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
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

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center text-base">
                  <Palette className="mr-2 h-5 w-5 text-primary" />
                  Branding & Style
                </Label>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
                    <Input 
                      id="primaryColor" 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={isSaving}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="secondaryColor" className="text-sm">Secondary Color</Label>
                    <Input 
                      id="secondaryColor" 
                      type="color" 
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled={isSaving}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logoUpload" className="text-sm">Store Logo</Label>
                    {logoDataUrl ? (
                      <div className="flex items-center gap-3 p-2 border rounded-md">
                        <div className="relative w-16 h-16 bg-muted/50 rounded">
                           <Image src={logoDataUrl} alt="Logo preview" fill className="object-contain" />
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setLogoDataUrl(null)}>
                            <X className="mr-1.5 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, or GIF (max 2MB)</p>
                            </div>
                            <input id="logo-upload" type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                        </label>
                      </div> 
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />

              <div className="space-y-2">
                 <Label className="flex items-center text-base">
                  <Settings className="mr-2 h-5 w-5 text-primary" />
                  Store Pages
                </Label>
                 <p className="text-sm text-muted-foreground">
                  The following pages will be automatically generated for your store:
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {generatedPages.map(page => (
                    <Badge key={page} variant="secondary">{page}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Volume Discounts Card */}
          <Card className="shadow-lg border-border bg-card">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-card-foreground">
                  Volume Discounts
                </CardTitle>
                <CardDescription>
                  Offer percentage-based discounts for bulk orders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="enable-discounts" 
                        checked={discountsEnabled} 
                        onCheckedChange={(checked) => setDiscountsEnabled(checked as boolean)}
                      />
                      <Label htmlFor="enable-discounts" className="font-medium">
                        Enable volume discounts for this store
                      </Label>
                  </div>

                  {discountsEnabled && (
                    <div className="space-y-3 pt-2 pl-6 border-l">
                      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center text-xs text-muted-foreground">
                        <span>Min. Quantity</span>
                        <span>Discount</span>
                        <span></span>
                        <span></span>
                      </div>
                      {discountTiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center">
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            value={tier.quantity}
                            onChange={(e) => handleDiscountTierChange(index, 'quantity', e.target.value)}
                            min="1"
                          />
                          <Input
                            type="number"
                            placeholder="e.g., 5"
                            value={tier.percentage}
                            onChange={(e) => handleDiscountTierChange(index, 'percentage', e.target.value)}
                            min="0"
                            max="100"
                          />
                           <Percent className="h-4 w-4 text-muted-foreground" />
                           <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeDiscountTier(index)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      ))}
                       <Button type="button" variant="outline" onClick={addDiscountTier}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Tier
                      </Button>
                    </div>
                  )}
              </CardContent>
          </Card>

          <Card className="shadow-lg border-border bg-card">
            <CardFooter className="flex-col items-start gap-4 p-6">
               <Button type="submit" size="lg" disabled={isSaving || !storeName}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? "Saving & Deploying..." : "Save & Deploy Store"}
              </Button>
               {isSaving && (
                <Alert variant="default" className="bg-primary/5 border-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary/90 font-medium">Deployment In Progress</AlertTitle>
                  <AlertDescription className="text-primary/80">
                    Your store is being built. This may take a few minutes. You will be redirected when it's complete.
                  </AlertDescription>
                </Alert>
               )}
            </CardFooter>
          </Card>
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
