
"use client";

import React from 'react';
import { useUploads } from '@/contexts/UploadContext';
import { clipartData, type ClipartItem } from '@/lib/clipart-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Smile, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BoundaryBox } from '@/app/actions/productOptionsActions';

interface ClipartPanelProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[];
  stageDimensions: { width: number; height: number };
}

export default function ClipartPanel({ activeViewId, boundaryBoxes, stageDimensions }: ClipartPanelProps) {
  const { addCanvasImageFromUrl } = useUploads();
  const { toast } = useToast();

  const handleClipartClick = (clipart: ClipartItem) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    if (stageDimensions.width === 0 || stageDimensions.height === 0) {
      toast({ title: "Canvas Not Ready", description: "Please wait for the canvas to load before adding elements.", variant: "default" });
      return;
    }
    addCanvasImageFromUrl(clipart.name, clipart.imageUrl, clipart.type, activeViewId, stageDimensions.width, stageDimensions.height, clipart.id);
  };

  return (
    <div className="p-4 space-y-4 flex flex-col">
      <p className="text-xs text-muted-foreground px-1">Click an item to add it to the canvas.</p>

      {clipartData.length > 0 ? (
        <div className="flex-grow border rounded-md bg-background overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {clipartData.map((clipart) => (
              <div
                key={clipart.id}
                onClick={() => handleClipartClick(clipart)}
                className="p-2 border rounded-md cursor-pointer bg-card hover:bg-accent/5 flex flex-col items-center justify-center gap-2 transition-all border-border group aspect-square"
                title={`Add "${clipart.name}" to canvas`}
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={clipart.imageUrl}
                    alt={clipart.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-contain"
                    data-ai-hint={clipart.aiHint}
                  />
                </div>
                <span className="text-xs text-center truncate w-full">{clipart.name}</span>
                <PlusCircle className="absolute top-2 right-2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20">
          <Smile className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No clipart available.</p>
        </div>
      )}
    </div>
  );
}
