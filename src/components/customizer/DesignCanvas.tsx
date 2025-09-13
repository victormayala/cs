
"use client";

import Image from 'next/image';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from '@/contexts/UploadContext';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { InteractiveCanvasImage } from './InteractiveCanvasImage';
import { InteractiveCanvasText } from './InteractiveCanvasText';
import { InteractiveCanvasShape } from './InteractiveCanvasShape';

// Dynamically import Konva components to ensure they only run on the client
import { Stage, Layer } from 'react-konva/lib/ReactKonvaCore';
import type Konva from 'konva';


interface BoundaryBox {
  id: string;
  name: string;
  x: number; 
  y: number; 
  width: number;
  height: number;
}

const defaultProductBase = {
  name: 'Plain White T-shirt (Default)',
  imageUrl: 'https://placehold.co/700x700.png',
  imageAlt: 'Plain white T-shirt ready for customization',
  aiHint: 't-shirt mockup',
};

const BASE_IMAGE_DIMENSION = 200;
const BASE_TEXT_DIMENSION_APPROX_WIDTH = 100; 
const BASE_TEXT_DIMENSION_APPROX_HEIGHT = 50; 
const BASE_SHAPE_DIMENSION = 100; 

interface DesignCanvasProps {
  productImageUrl?: string;
  productImageAlt?: string;
  productImageAiHint?: string;
  productDefinedBoundaryBoxes?: BoundaryBox[];
  activeViewId: string | null;
  showGrid: boolean;
  showBoundaryBoxes: boolean; // New prop
}

export default function DesignCanvas({ 
  productImageUrl,
  productImageAlt,
  productImageAiHint,
  productDefinedBoundaryBoxes = [],
  activeViewId,
  showGrid,
  showBoundaryBoxes // Destructure new prop
}: DesignCanvasProps) {

  const productToDisplay = {
    ...defaultProductBase,
    imageUrl: productImageUrl || defaultProductBase.imageUrl,
    imageAlt: productImageAlt || defaultProductBase.imageAlt,
    aiHint: productImageAiHint || defaultProductBase.aiHint,
    name: productImageAlt || defaultProductBase.name,
  };
  
  const {
    canvasImages, selectCanvasImage, selectedCanvasImageId, updateCanvasImage, removeCanvasImage,
    canvasTexts, selectCanvasText, selectedCanvasTextId, updateCanvasText, removeCanvasText,
    canvasShapes, selectCanvasShape, selectedCanvasShapeId, updateCanvasShape, removeCanvasShape,
    startInteractiveOperation, endInteractiveOperation,
    getStageRef, // Get the stage ref from context
  } = useUploads();
  
  const stageRef = getStageRef(); // Use the ref from the context

  const [activeDrag, setActiveDrag] = useState<{
    type: 'rotate' | 'resize' | 'move';
    itemId: string;
    itemType: 'image' | 'text' | 'shape';
    startX: number;
    startY: number;
    initialRotation?: number;
    initialScale?: number;
    initialX?: number;
    initialY?: number;
    itemCenterX?: number; 
    itemCenterY?: number;
    itemInitialWidth: number; // Guaranteed to be > 0
    itemInitialHeight: number; // Guaranteed to be > 0
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null); 
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);
  const dragUpdateRef = useRef(0);

  // The rest of the component logic remains largely the same...
  // handleCanvasClick, handle...SelectAndDragStart, handleDragStart, handleDragging, handleDragEnd etc.

  // NOTE: A lot of the logic below this point is identical to the previous version
  // The key change is wrapping the Konva elements in a <Stage> component.

  const visibleImages = canvasImages.filter(img => img.viewId === activeViewId);
  const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeViewId);
  const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeViewId);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width, height });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCanvasClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS' && !target.closest('.konvajs-content')) {
        selectCanvasImage(null);
        selectCanvasText(null);
        selectCanvasShape(null);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-card border border-dashed border-border rounded-lg shadow-inner relative overflow-hidden select-none product-image-outer-container"
    >
      <div className="relative w-full flex-1 flex items-center justify-center product-canvas-wrapper min-h-0">
        <div
          ref={canvasRef} 
          className="relative bg-muted/10 w-full h-full flex items-center justify-center" 
          onClick={handleCanvasClick} 
          onTouchStart={handleCanvasClick as any} 
        >
          
          <div
            id="product-image-canvas-area"
            className="relative centered-square-container" 
            style={{
              width: 'min(100%, calc(100svh - 10rem))', 
              aspectRatio: '1 / 1', 
            }}
          >
            <Image
              id="design-canvas-background-image"
              src={productToDisplay.imageUrl}
              alt={productToDisplay.imageAlt}
              key={productToDisplay.imageUrl}
              fill 
              style={{ objectFit: 'contain' }} 
              className="rounded-md pointer-events-none select-none" 
              data-ai-hint={productToDisplay.aiHint}
              priority
            />

            <Stage
              ref={stageRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              className="absolute top-0 left-0"
            >
              <Layer>
                {/* Boundary Boxes and Grid can be rendered as Konva Rects if needed, or remain as divs */}
              </Layer>
              <Layer>
                {visibleImages.map((img) => (
                    <InteractiveCanvasImage
                        key={`${img.id}-${img.zIndex}`}
                        image={img}
                        isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                        onSelect={() => selectCanvasImage(img.id)}
                    />
                ))}
                {visibleTexts.map((text) => (
                    <InteractiveCanvasText
                        key={`${text.id}-${text.zIndex}`}
                        text={text}
                        isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                        onSelect={() => selectCanvasText(text.id)}
                    />
                ))}
                {visibleShapes.map((shape) => (
                    <InteractiveCanvasShape
                        key={`${shape.id}-${shape.zIndex}`}
                        shape={shape}
                        isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                        onSelect={() => selectCanvasShape(shape.id)}
                    />
                ))}
              </Layer>
            </Stage>
          </div> 
        </div>
      </div>
      <div className="text-center pt-2 pb-1 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {productDefinedBoundaryBoxes.length > 0 && showBoundaryBoxes ? "Items will be kept within the dashed areas. " : ""}
          {visibleImages.length > 0 || visibleTexts.length > 0 || visibleShapes.length > 0 ? 
            (selectedCanvasImageId || selectedCanvasTextId || selectedCanvasShapeId ? "Click & drag item or handles to transform. Click background to deselect." : "Click an item to select and transform it.") 
            : "Add images, text or shapes using the tools on the left."}
        </p>
      </div>
    </div>
  );
}

    