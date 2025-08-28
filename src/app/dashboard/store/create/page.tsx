
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Store, Settings, Palette, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CreateStorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container max-w-4xl mx-auto space-y-8">
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
                This feature is currently under development. The interface below is a preview of what's to come.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary/90 font-medium">Coming Soon!</AlertTitle>
                <AlertDescription className="text-primary/80">
                  The ability to automatically build and deploy a full-featured store is on its way. Stay tuned for updates!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="storeName" className="flex items-center text-base">
                  <Store className="mr-2 h-5 w-5 text-primary" />
                  Store Name
                </Label>
                <Input id="storeName" placeholder="e.g., My Awesome T-Shirt Shop" disabled />
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
                    <Input id="primaryColor" type="color" defaultValue="#0635C9" disabled />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="logoUpload" className="text-sm">Store Logo</Label>
                    <Input id="logoUpload" type="file" disabled />
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
                  {['Homepage', 'About', 'FAQ', 'Contact', 'Products', 'Cart', 'Checkout', 'Account'].map(page => (
                    <Badge key={page} variant="secondary">{page}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button size="lg" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploy Store (Coming Soon)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
