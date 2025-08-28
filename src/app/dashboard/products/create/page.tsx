
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, PackagePlus } from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { createProduct } from "@/app/actions/productActions";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateProductPage() {
  const [productName, setProductName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      toast({
        title: "Product name is required",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a product.", variant: "destructive" });
        return;
    }

    setIsCreating(true);
    try {
      const result = await createProduct({ name: productName, userId: user.uid });
      if (result.success && result.productId) {
        toast({
          title: "Product Created!",
          description: `"${productName}" has been successfully created.`,
        });
        router.push(`/dashboard/products/${result.productId}/options?source=customizer-studio`);
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("Failed to create product:", error);
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                Create New Product
              </h1>
              <p className="text-muted-foreground">
                Start by giving your new native product a name.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg border-border bg-card">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-card-foreground">
                  Product Details
                </CardTitle>
                <CardDescription>
                  This will create a new product within Customizer Studio. You can add images, design areas, and other options in the next step.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="productName" className="text-base">Product Name</Label>
                  <Input
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Cotton T-Shirt"
                    required
                    disabled={isCreating}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isCreating || !productName.trim()}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PackagePlus className="mr-2 h-4 w-4" />
                  )}
                  {isCreating ? "Creating..." : "Create & Continue"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </main>
    </div>
  );
}
