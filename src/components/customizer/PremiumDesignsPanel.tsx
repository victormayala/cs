
"use client";

import React from 'react';
import { useUploads } from '@/contexts/UploadContext';
import { premiumDesignsData, type PremiumDesignItem } from '@/lib/premium-designs-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Gem, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { BoundaryBox } from '@/app/actions/productOptionsActions';

interface PremiumDesignsPanelProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[];
  stageDimensions?: { width: number; height: number } | null;
}

export default function PremiumDesignsPanel({ activeViewId, boundaryBoxes, stageDimensions }: PremiumDesignsPanelProps) {
  const { addCanvasImageFromUrl } = useUploads();
  const { toast } = useToast();

  const handleDesignClick = (design: PremiumDesignItem) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    if (!stageDimensions || stageDimensions.width === 0 || stageDimensions.height === 0) {
      toast({ title: "Canvas Not Ready", description: "Please wait for the canvas to load before adding elements.", variant: "default" });
      return;
    }
    addCanvasImageFromUrl(design.name, design.imageUrl, design.type, activeViewId, stageDimensions.width, stageDimensions.height, design.id);
  };

  return (
    <div className="p-4 space-y-4 flex flex-col">
      <p className="text-xs text-muted-foreground px-1">Click a design to add it to the canvas. Costs vary.</p>

      {premiumDesignsData.length > 0 ? (
        <div className="flex-grow border rounded-md bg-background overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {premiumDesignsData.map((design) => (
              <div
                key={design.id}
                onClick={() => handleDesignClick(design)}
                className="relative border rounded-md cursor-pointer bg-card hover:bg-accent/5 transition-all border-border group aspect-square p-3 flex items-center justify-center"
                title={`Add "${design.name}" to canvas - $${design.price.toFixed(2)}`}
              >
                <Badge
                  variant="default" 
                  className={cn(
                    "absolute top-1 right-1 text-xs font-semibold z-10",
                    "bg-primary text-primary-foreground px-1.5 py-0.5 h-auto min-w-[24px] justify-center" 
                  )}
                >
                  ${design.price.toFixed(0)}
                </Badge>
                <PlusCircle className="absolute top-1 left-1 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                
                <div className="relative w-full h-full">
                  <Image
                    src={design.imageUrl}
                    alt={design.name}
                    fill
                    sizes="(max-width: 768px) 30vw, (max-width: 1200px) 20vw, 15vw" 
                    className="object-contain"
                    data-ai-hint={design.aiHint}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20">
          <Gem className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No premium designs available currently.</p>
        </div>
      )}
    </div>
  );
}
