
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Store, Settings, Palette, Zap, Loader2, Save } from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserStoreConfig } from "@/app/actions/userStoreActions";

const generatedPages = [
  'Homepage', 'About', 'FAQ', 'Contact', 
  'Product Listing (PLP)', 'Product Detail (PDP)', 
  'Cart', 'Checkout', 'Order Confirmation', 
  'User Account', 'Terms of Service', 'Privacy Policy'
];

export default function CreateStorePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [storeName, setStoreName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0635C9");
  const [secondaryColor, setSecondaryColor] = useState("#1BE5BE");
  const [isSaving, setIsSaving] = useState(false);

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
      const result = await saveUserStoreConfig({
        storeName,
        primaryColorHex: primaryColor,
        secondaryColorHex: secondaryColor,
      });

      if (result.success) {
        toast({
          title: "Configuration Saved!",
          description: "Your store settings have been saved. Deployment is coming soon!",
        });
        // Potentially redirect or update UI state here in the future
      } else {
        throw new Error(result.error || "An unknown error occurred while saving.");
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

              <div className="space-y-2">
                <Label className="flex items-center text-base">
                  <Palette className="mr-2 h-5 w-5 text-primary" />
                  Branding & Style
                </Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
                    <Input 
                      id="primaryColor" 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={isSaving}
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
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="logoUpload" className="text-sm">Store Logo</Label>
                    <Input id="logoUpload" type="file" disabled />
                     <p className="text-xs text-muted-foreground">Logo uploads are coming soon.</p>
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
            <CardFooter className="flex-col items-start gap-4">
              <Button type="submit" size="lg" disabled={isSaving || !storeName}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
               <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary/90 font-medium">Deployment Coming Soon!</AlertTitle>
                <AlertDescription className="text-primary/80">
                  After saving your configuration, the next step will be to automatically build and deploy your store. This feature is on its way!
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
