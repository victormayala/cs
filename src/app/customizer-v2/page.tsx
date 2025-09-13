
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import DesignCanvas from '@/components/customizer/DesignCanvas';
import RightPanel from '@/components/customizer/RightPanel';
import { UploadProvider, useUploads } from "@/contexts/UploadContext";
import {
  Loader2,
  ShoppingCart,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import CustomizerIconNav, { type CustomizerTool } from '@/components/customizer/CustomizerIconNav';
import { cn } from '@/lib/utils';

import TextToolPanel from '@/components/customizer/TextToolPanel';
import LayersPanel from '@/components/customizer/LayersPanel';


// Simplified interfaces for the new customizer
export interface ProductViewV2 {
  id: string;
  name: string;
  imageUrl: string;
  boundaryBoxes: { id: string; name: string; x: number; y: number; width: number; height: number; }[];
}

export interface ProductForCustomizerV2 {
  id: string;
  name: string;
  basePrice: number;
  views: ProductViewV2[];
}

// A single, hardcoded product to start with for stability
const defaultProduct: ProductForCustomizerV2 = {
  id: 'v2-product-default',
  name: 'New Customizer Demo Product',
  basePrice: 20.00,
  views: [
    {
      id: 'v2-view-front',
      name: 'Front',
      imageUrl: 'https://placehold.co/800x800/f0f0f0/ccc?text=Front',
      boundaryBoxes: [
        { id: 'v2-area-1', name: 'Center Chest', x: 25, y: 25, width: 50, height: 30 },
      ],
    },
    {
      id: 'v2-view-back',
      name: 'Back',
      imageUrl: 'https://placehold.co/800x800/e0e0e0/ccc?text=Back',
       boundaryBoxes: [
        { id: 'v2-area-2', name: 'Upper Back', x: 25, y: 15, width: 50, height: 40 },
      ],
    }
  ],
};

const toolItems: CustomizerTool[] = [
    { id: "layers", label: "Layers", icon: LayersPanel },
    { id: "text", label: "Text", icon: Type },
];

function CustomizerV2Layout() {
  const { toast } = useToast();
  const { canvasImages, canvasTexts, canvasShapes } = useUploads();

  const [product, setProduct] = useState<ProductForCustomizerV2>(defaultProduct);
  const [activeViewId, setActiveViewId] = useState<string | null>(defaultProduct.views[0]?.id || null);
  const [activeTool, setActiveTool] = useState<string>('text');
  
  const handleViewChange = useCallback((newViewId: string) => {
    setActiveViewId(newViewId);
  }, []);

  const handleAddToCart = () => {
    const designData = {
      productId: product.id,
      activeViewId: activeViewId,
      texts: canvasTexts.filter(t => t.viewId === activeViewId),
      // In the future, we'll add images and shapes here
    };

    console.log("--- Design Data for Cart ---", designData);
    toast({
      title: "Design Captured",
      description: "The design data has been logged to the browser console. 'Add to Cart' functionality is pending.",
    });
  };

  const activeViewData = product.views.find(v => v.id === activeViewId);

  return (
    <div className="flex flex-col min-h-svh h-screen w-full bg-muted/20">
      <AppHeader />
      <div className="relative flex flex-1 overflow-hidden">
        <CustomizerIconNav tools={toolItems} activeTool={activeTool} setActiveTool={setActiveTool} />
        
        <div className="border-r bg-card shadow-sm flex flex-col flex-shrink-0 w-80">
            <div className="p-4 border-b">
                <h2 className="font-headline text-lg font-semibold text-foreground">
                    {activeTool === 'text' ? 'Text Tool' : 'Layers'}
                </h2>
            </div>
             <div className="flex-1 overflow-y-auto">
                {activeTool === 'text' && <TextToolPanel activeViewId={activeViewId} />}
                {activeTool === 'layers' && <LayersPanel activeViewId={activeViewId} />}
            </div>
        </div>

        <main className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
          <div className="w-full flex flex-col flex-1 min-h-0 pb-4">
            <DesignCanvas 
                productImageUrl={activeViewData?.imageUrl}
                productImageAlt={activeViewData?.name}
                productDefinedBoundaryBoxes={activeViewData?.boundaryBoxes}
                activeViewId={activeViewId}
                showGrid={true}
                showBoundaryBoxes={true}
            />
          </div>
        </main>

        <div className="shadow-sm border-l bg-card flex flex-col w-80">
            <div className="flex-1 h-full overflow-y-auto p-4 space-y-4">
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Product Views</h3>
                    <div className="flex flex-wrap gap-2">
                        {product.views.map(view => (
                            <button
                                key={view.id}
                                onClick={() => handleViewChange(view.id)}
                                className={cn(
                                    "rounded-md border-2 p-1 transition-all",
                                    activeViewId === view.id ? 'border-primary ring-1 ring-primary' : 'border-transparent'
                                )}
                            >
                                <div className="w-16 h-16 bg-muted rounded-sm overflow-hidden relative">
                                <Image src={view.imageUrl} alt={view.name} fill className="object-contain" />
                                </div>
                                <p className="text-xs mt-1">{view.name}</p>
                            </button>
                        ))}
                    </div>
                 </div>
                 {/* Simplified controls */}
            </div>
        </div>
      </div>

       <footer className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card shadow-md px-4 py-2 flex items-center justify-between gap-4 z-40">
            <div className="text-md font-medium text-muted-foreground truncate">
                {product.name}
            </div>
            <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-foreground">Total: ${product.basePrice.toFixed(2)}</div>
                <Button size="default" onClick={handleAddToCart}> 
                    <ShoppingCart className="mr-2 h-5 w-5" /> 
                    Add to Cart (Log Data)
                </Button>
            </div>
        </footer>
    </div>
  );
}

export default function CustomizerV2Page() {
  return (
    <UploadProvider>
      <Suspense fallback={ <div className="flex h-screen w-full items-center justify-center bg-background"> <Loader2 className="h-10 w-10 animate-spin text-primary" /></div> }>
        <CustomizerV2Layout />
      </Suspense>
    </UploadProvider>
  );
}
