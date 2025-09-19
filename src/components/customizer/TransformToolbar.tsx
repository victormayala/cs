
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useUploads, type CanvasText, type CanvasImage, type CanvasShape } from '@/contexts/UploadContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, RotateCw, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IRect } from 'konva/lib/types';


interface TransformToolbarProps {
  pixelBoundaryBoxes: IRect[];
  stageDimensions: { width: number; height: number; x: number; y: number } | null;
}

export default function TransformToolbar({ pixelBoundaryBoxes, stageDimensions }: TransformToolbarProps) {
  const {
    selectedCanvasImageId, canvasImages, updateCanvasImage, removeCanvasImage,
    selectedCanvasTextId, canvasTexts, updateCanvasText, removeCanvasText,
    selectedCanvasShapeId, canvasShapes, updateCanvasShape, removeCanvasShape,
  } = useUploads();

  const [selectedItem, setSelectedItem] = useState<CanvasImage | CanvasText | CanvasShape | null>(null);
  
  useEffect(() => {
    if (selectedCanvasImageId) {
      setSelectedItem(canvasImages.find(item => item.id === selectedCanvasImageId) || null);
    } else if (selectedCanvasTextId) {
      setSelectedItem(canvasTexts.find(item => item.id === selectedCanvasTextId) || null);
    } else if (selectedCanvasShapeId) {
      setSelectedItem(canvasShapes.find(item => item.id === selectedCanvasShapeId) || null);
    } else {
      setSelectedItem(null);
    }
  }, [selectedCanvasImageId, canvasImages, selectedCanvasTextId, canvasTexts, selectedCanvasShapeId, canvasShapes]);

  const handleRotationChange = (value: number[]) => {
    if (!selectedItem) return;
    const rotation = value[0];
    if (selectedItem.itemType === 'image') updateCanvasImage(selectedItem.id, { rotation });
    else if (selectedItem.itemType === 'text') updateCanvasText(selectedItem.id, { rotation });
    else if (selectedItem.itemType === 'shape') updateCanvasShape(selectedItem.id, { rotation });
  };
  
  const handleScaleChange = (value: number[]) => {
    if (!selectedItem) return;
    const newScale = value[0];

    // --- Boundary Check Logic ---
    const node = selectedItem;
    const originalWidth = 'width' in node ? node.width : (node as CanvasText).fontSize * (node as CanvasText).content.length * 0.6;
    const potentialWidth = originalWidth * newScale;

    if (pixelBoundaryBoxes && pixelBoundaryBoxes.length > 0 && stageDimensions) {
        const nodeCenter = { x: node.x, y: node.y };
        const containingBox = pixelBoundaryBoxes.find(box => 
            nodeCenter.x >= box.x && nodeCenter.x <= box.x + box.width &&
            nodeCenter.y >= box.y && nodeCenter.y <= box.y + box.height
        ) || pixelBoundaryBoxes[0];
        
        if (potentialWidth > containingBox.width) {
            // Do not apply the update if it exceeds the boundary
            return; 
        }
    } else if (stageDimensions && potentialWidth > stageDimensions.width) {
        // Fallback to stage width if no boundaries
        return;
    }
    // --- End Boundary Check ---

    if (selectedItem.itemType === 'image') {
      updateCanvasImage(selectedItem.id, { scaleX: newScale, scaleY: newScale });
    } else {
      if (selectedItem.itemType === 'text') updateCanvasText(selectedItem.id, { scale: newScale });
      else if (selectedItem.itemType === 'shape') updateCanvasShape(selectedItem.id, { scale: newScale });
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    if (selectedItem.itemType === 'image') removeCanvasImage(selectedItem.id);
    else if (selectedItem.itemType === 'text') removeCanvasText(selectedItem.id);
    else if (selectedItem.itemType === 'shape') removeCanvasShape(selectedItem.id);
  };
  
  const getScaleValue = () => {
    if (!selectedItem) return 1;
    if (selectedItem.itemType === 'image') return selectedItem.scaleX;
    return selectedItem.scale;
  }

  if (!selectedItem) {
    return <div className="h-14 mb-4"></div>; // Occupy space but stay invisible
  }
  
  return (
    <div className={cn(
      "mb-4 flex justify-center transition-all duration-300",
      selectedItem ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-md">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Maximize className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4">
            <div className="space-y-4">
              <label className="text-sm font-medium">Scale</label>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                value={[getScaleValue()]}
                onValueChange={handleScaleChange}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <RotateCw className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4">
            <div className="space-y-4">
              <label className="text-sm font-medium">Rotate</label>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={[selectedItem.rotation || 0]}
                onValueChange={handleRotationChange}
              />
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
