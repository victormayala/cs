
"use client";

import Image from 'next/image';
import { useUploads } from '@/contexts/UploadContext';
import type { ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type Konva from 'konva';

// Dynamically import Konva-dependent components with SSR turned off
const InteractiveCanvasImage = dynamic(() => import('./InteractiveCanvasImage').then(mod => mod.InteractiveCanvasImage), { ssr: false });
const InteractiveCanvasText = dynamic(() => import('./InteractiveCanvasText').then(mod => mod.InteractiveCanvasText), { ssr: false });
const InteractiveCanvasShape = dynamic(() => import('./InteractiveCanvasShape').then(mod => mod.InteractiveCanvasShape), { ssr: false });
const Stage = dynamic(() => import('react-konva/lib/ReactKonvaCore').then(mod => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva/lib/ReactKonvaCore').then(mod => mod.Layer), { ssr: false });


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

interface DesignCanvasProps {
  productImageUrl?: string;
  productImageAlt?: string;
  productImageAiHint?: string;
  productDefinedBoundaryBoxes?: BoundaryBox[];
  activeViewId: string | null;
  showGrid: boolean;
  showBoundaryBoxes: boolean;
}

export default function DesignCanvas({ 
  productImageUrl,
  productImageAlt,
  productImageAiHint,
  productDefinedBoundaryBoxes = [],
  activeViewId,
  showGrid,
  showBoundaryBoxes
}: DesignCanvasProps) {

  const productToDisplay = {
    ...defaultProductBase,
    imageUrl: productImageUrl || defaultProductBase.imageUrl,
    imageAlt: productImageAlt || defaultProductBase.imageAlt,
    aiHint: productImageAiHint || defaultProductBase.aiHint,
    name: productImageAlt || defaultProductBase.name,
  };
  
  const {
    canvasImages, selectedCanvasImageId, selectCanvasImage,
    canvasTexts, selectedCanvasTextId, selectCanvasText,
    canvasShapes, selectedCanvasShapeId, selectCanvasShape,
    getStageRef,
  } = useUploads();
  
  const stageRef = getStageRef();
  const canvasRef = useRef<HTMLDivElement>(null); 
  
  const visibleImages = canvasImages.filter(img => img.viewId === activeViewId);
  const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeViewId);
  const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeViewId);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const { width } = canvasRef.current.getBoundingClientRect();
        // Since it's a square, height is the same as width
        setCanvasDimensions({ width, height: width });
      }
    };
    
    // Set initial size
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if(canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }
    
    return () => {
      if(canvasRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        resizeObserver.unobserve(canvasRef.current);
      }
    }
  }, []);

  const handleCanvasClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Check if the click is on the stage background itself
    // @ts-ignore Konva event handling
    if (e.target === e.target.getStage()) {
      selectCanvasImage(null);
      selectCanvasText(null);
      selectCanvasShape(null);
    }
  };
  
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
     // deselect when clicked on empty area
    const emptySpace = e.target === e.target.getStage();
    if (emptySpace) {
      selectCanvasImage(null);
      selectCanvasText(null);
      selectCanvasShape(null);
    }
  }


  return (
    <div
      className="w-full h-full flex flex-col bg-card border border-dashed border-border rounded-lg shadow-inner relative overflow-hidden select-none product-image-outer-container"
    >
      <div className="relative w-full flex-1 flex items-center justify-center product-canvas-wrapper min-h-0">
        <div
          id="product-image-canvas-area"
          ref={canvasRef} 
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

            {/* Konva Stage */}
            {stageRef && (
              <Stage
                ref={stageRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="absolute top-0 left-0"
                onClick={handleStageClick}
                onTap={handleStageClick}
              >
                <Layer>
                  {/* Render design elements here */}
                  {visibleImages.map((img) => (
                      <InteractiveCanvasImage
                          key={`${img.id}-${img.zIndex}`}
                          imageProps={img}
                          isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                          onSelect={() => selectCanvasImage(img.id)}
                      />
                  ))}
                  {visibleTexts.map((text) => (
                      <InteractiveCanvasText
                          key={`${text.id}-${text.zIndex}`}
                          textProps={text}
                          isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                          onSelect={() => selectCanvasText(text.id)}
                      />
                  ))}
                  {visibleShapes.map((shape) => (
                      <InteractiveCanvasShape
                          key={`${shape.id}-${shape.zIndex}`}
                          shapeProps={shape}
                          isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                          onSelect={() => selectCanvasShape(shape.id)}
                      />
                  ))}
                </Layer>
              </Stage>
            )}
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

    