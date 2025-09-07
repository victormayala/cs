
"use client";

import Image from 'next/image';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from '@/contexts/UploadContext';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { InteractiveCanvasImage } from './InteractiveCanvasImage';
import { InteractiveCanvasText } from './InteractiveCanvasText';
import { InteractiveCanvasShape } from './InteractiveCanvasShape';

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
  } = useUploads();

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


  useEffect(() => {
    if (!canvasRef.current || !productDefinedBoundaryBoxes || productDefinedBoundaryBoxes.length === 0 || !activeViewId || !lastAddedItemId) return;

    const autoMoveItem = (item: CanvasImage | CanvasText | CanvasShape, updateFunc: (id: string, updates: Partial<any>) => void) => {
      if (item.x === 50 && item.y === 50 && item.id === lastAddedItemId && item.viewId === activeViewId && !item.movedFromDefault) {
        const firstBox = productDefinedBoundaryBoxes[0];
        
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect || canvasRect.width === 0 || canvasRect.height === 0) return;

        // Calculate position relative to the centered square container first
        const parentW = canvasRect.width;
        const parentH = canvasRect.height;
        const squareSide = Math.min(parentW, parentH); // Assuming square is based on smaller dimension
        const squareOffsetX = (parentW - squareSide) / 2;
        const squareOffsetY = (parentH - squareSide) / 2;

        // Center of the boundary box in pixels, relative to the top-left of the square container
        const boxCenterXpx_sq = (firstBox.x + firstBox.width / 2) / 100 * squareSide;
        const boxCenterYpx_sq = (firstBox.y + firstBox.height / 2) / 100 * squareSide;
        
        // Convert these square-relative pixel coordinates to canvas-relative percentages
        const newXpercent_canvas = ((squareOffsetX + boxCenterXpx_sq) / parentW) * 100;
        const newYpercent_canvas = ((squareOffsetY + boxCenterYpx_sq) / parentH) * 100;
        
        updateFunc(item.id, { x: newXpercent_canvas, y: newYpercent_canvas, movedFromDefault: true });
        setLastAddedItemId(null); 
      } else if (item.id === lastAddedItemId) {
        // If it was already moved or not at default, just clear the flag
        setLastAddedItemId(null);
      }
    };
    
    let itemToMove: CanvasImage | CanvasText | CanvasShape | undefined;
    let updateFunction: ((id: string, updates: Partial<any>) => void) | undefined;

    itemToMove = canvasImages.find(img => img.id === lastAddedItemId);
    if (itemToMove) {
        updateFunction = updateCanvasImage;
    } else {
      itemToMove = canvasTexts.find(txt => txt.id === lastAddedItemId);
      if (itemToMove) {
        updateFunction = updateCanvasText;
      } else {
        itemToMove = canvasShapes.find(shp => shp.id === lastAddedItemId);
        if (itemToMove) {
          updateFunction = updateCanvasShape;
        }
      }
    }

    if (itemToMove && updateFunction) {
      autoMoveItem(itemToMove, updateFunction);
    } else if (lastAddedItemId) {
      // If item was removed before auto-move could happen
      setLastAddedItemId(null);
    }

  }, [lastAddedItemId, productDefinedBoundaryBoxes, activeViewId, canvasImages, canvasTexts, canvasShapes, updateCanvasImage, updateCanvasText, updateCanvasShape]);


  useEffect(() => {
    // Logic to set lastAddedItemId for new images
    if (canvasImages.length > 0 && activeViewId) {
      const latestImage = canvasImages[canvasImages.length - 1];
      // Check if this is a truly new item intended for auto-positioning
      if (lastAddedItemId === null && latestImage && latestImage.x === 50 && latestImage.y === 50 && !latestImage.movedFromDefault && latestImage.viewId === activeViewId) {
        setLastAddedItemId(latestImage.id);
      }
    }
  }, [canvasImages, activeViewId, lastAddedItemId]);

  useEffect(() => {
    // Logic to set lastAddedItemId for new texts
    if (canvasTexts.length > 0 && activeViewId) {
      const latestText = canvasTexts[canvasTexts.length - 1];
      if (lastAddedItemId === null && latestText && latestText.x === 50 && latestText.y === 50 && !latestText.movedFromDefault && latestText.viewId === activeViewId) {
        setLastAddedItemId(latestText.id);
      }
    }
  }, [canvasTexts, activeViewId, lastAddedItemId]);

  useEffect(() => {
    // Logic to set lastAddedItemId for new shapes
    if (canvasShapes.length > 0 && activeViewId) {
      const latestShape = canvasShapes[canvasShapes.length - 1];
      if (lastAddedItemId === null && latestShape && latestShape.x === 50 && latestShape.y === 50 && !latestShape.movedFromDefault && latestShape.viewId === activeViewId) {
         setLastAddedItemId(latestShape.id);
      }
    }
  }, [canvasShapes, activeViewId, lastAddedItemId]);


  const getMouseOrTouchCoords = (e: MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent<SVGElement> | ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handleCanvasClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Check if the click is on the canvas itself or the direct product image container, not on an interactive item
    if (target === canvasRef.current || target.classList.contains('centered-square-container') ||
        target === canvasRef.current?.parentElement || // product-canvas-wrapper
        target.classList.contains('product-image-outer-container') ||
        target.classList.contains('product-canvas-wrapper')) { // Check direct parent as well
        selectCanvasImage(null);
        selectCanvasText(null);
        selectCanvasShape(null);
    }
  };

  const handleImageSelectAndDragStart = (
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    image: CanvasImage
  ) => {
    if (image.isLocked) return;
    handleDragStart(e, 'move', image, 'image');
  };

  const handleTextSelectAndDragStart = (
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    textItem: CanvasText
  ) => {
    if (textItem.isLocked) return;
    handleDragStart(e, 'move', textItem, 'text');
  };

  const handleShapeSelectAndDragStart = (
    e: ReactMouseEvent<SVGElement> | ReactTouchEvent<SVGElement>,
    shape: CanvasShape
  ) => {
    if (shape.isLocked) return;
    handleDragStart(e, 'move', shape, 'shape');
  };

  const handleDragStart = (
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement> | ReactMouseEvent<SVGElement> | ReactTouchEvent<SVGElement>,
    type: 'rotate' | 'resize' | 'move',
    item: CanvasImage | CanvasText | CanvasShape,
    itemType: 'image' | 'text' | 'shape'
  ) => {
    if (item.isLocked && type !== 'move') return; 
    if (item.isLocked && type === 'move') return; 

    e.preventDefault();
    e.stopPropagation();
    
    if (itemType === 'image') { selectCanvasImage(item.id); selectCanvasText(null); selectCanvasShape(null); }
    else if (itemType === 'text') { selectCanvasText(item.id); selectCanvasImage(null); selectCanvasShape(null); }
    else if (itemType === 'shape') { selectCanvasShape(item.id); selectCanvasImage(null); selectCanvasText(null); }

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const coords = getMouseOrTouchCoords(e);

    const itemCenterXInCanvasPx = item.x/100 * canvasRect.width;
    const itemCenterYInCanvasPx = item.y/100 * canvasRect.height;
    
    let itemInitialUnscaledWidth = 0;
    let itemInitialUnscaledHeight = 0;

    if (itemType === 'image') {
        itemInitialUnscaledWidth = BASE_IMAGE_DIMENSION;
        itemInitialUnscaledHeight = BASE_IMAGE_DIMENSION;
    } else if (itemType === 'text') {
        const textEl = document.getElementById(`canvas-text-${item.id}`);
        if (textEl) {
            const currentScaledWidth = textEl.offsetWidth;
            const currentScaledHeight = textEl.offsetHeight;
            itemInitialUnscaledWidth = (item.scale && item.scale !== 0) ? currentScaledWidth / item.scale : BASE_TEXT_DIMENSION_APPROX_WIDTH;
            itemInitialUnscaledHeight = (item.scale && item.scale !== 0) ? currentScaledHeight / item.scale : BASE_TEXT_DIMENSION_APPROX_HEIGHT;
        } else {
            itemInitialUnscaledWidth = BASE_TEXT_DIMENSION_APPROX_WIDTH;
            itemInitialUnscaledHeight = BASE_TEXT_DIMENSION_APPROX_HEIGHT;
        }
    } else if (itemType === 'shape') {
        const shapeItem = item as CanvasShape; // Already has unscaled width/height
        itemInitialUnscaledWidth = shapeItem.width;
        itemInitialUnscaledHeight = shapeItem.height;
    }

    // Ensure these are always positive for calculations
    const finalItemInitialWidth = itemInitialUnscaledWidth > 0 ? itemInitialUnscaledWidth : (itemType === 'image' ? BASE_IMAGE_DIMENSION : (itemType === 'text' ? BASE_TEXT_DIMENSION_APPROX_WIDTH : BASE_SHAPE_DIMENSION));
    const finalItemInitialHeight = itemInitialUnscaledHeight > 0 ? itemInitialUnscaledHeight : (itemType === 'image' ? BASE_IMAGE_DIMENSION : (itemType === 'text' ? BASE_TEXT_DIMENSION_APPROX_HEIGHT : BASE_SHAPE_DIMENSION));

    startInteractiveOperation(); 

    setActiveDrag({
      type, itemId: item.id, itemType,
      startX: coords.x, startY: coords.y,
      initialRotation: item.rotation, initialScale: item.scale,
      initialX: item.x, initialY: item.y,
      itemCenterX: itemCenterXInCanvasPx, itemCenterY: itemCenterYInCanvasPx,
      itemInitialWidth: finalItemInitialWidth, 
      itemInitialHeight: finalItemInitialHeight,
    });
  };

  const handleDragging = useCallback((e: MouseEvent | TouchEvent) => {
    if (!activeDrag || !canvasRef.current) return; // Initial check

    cancelAnimationFrame(dragUpdateRef.current);
    dragUpdateRef.current = requestAnimationFrame(() => {
      // Re-check canvasRef.current inside requestAnimationFrame as it might have changed
      if (!canvasRef.current || !activeDrag) { 
        console.warn("DesignCanvas: canvasRef.current or activeDrag is null inside requestAnimationFrame. Aborting drag update.");
        if (activeDrag) setActiveDrag(null); 
        endInteractiveOperation();
        return;
      }
      
      let activeItemData: CanvasImage | CanvasText | CanvasShape | undefined;
      if (activeDrag.itemType === 'image') activeItemData = canvasImages.find(img => img.id === activeDrag.itemId);
      else if (activeDrag.itemType === 'text') activeItemData = canvasTexts.find(txt => txt.id === activeDrag.itemId);
      else if (activeDrag.itemType === 'shape') activeItemData = canvasShapes.find(shp => shp.id === activeDrag.itemId);

      if (activeItemData?.isLocked) { setActiveDrag(null); return; }

      const coords = getMouseOrTouchCoords(e);
      const {
          type, itemId, itemType, startX, startY,
          initialRotation, initialScale, initialX, initialY,
          itemCenterX, itemCenterY, itemInitialWidth, itemInitialHeight // These are now guaranteed > 0
      } = activeDrag;

      if (initialRotation === undefined || initialScale === undefined || initialX === undefined || initialY === undefined || itemCenterX === undefined || itemCenterY === undefined) {
          console.warn("Dragging with undefined initial values", activeDrag);
          return;
      }
      
      const canvasRect = canvasRef.current.getBoundingClientRect(); // Now safe to call

      if (type === 'rotate') {
        const angle = Math.atan2(coords.y - (canvasRect.top + itemCenterY) , coords.x - (canvasRect.left + itemCenterX)) * (180 / Math.PI);
        const startAngle = Math.atan2(startY - (canvasRect.top + itemCenterY), startX - (canvasRect.left + itemCenterX)) * (180 / Math.PI);
        let newRotation = initialRotation + (angle - startAngle);
        if (itemType === 'image') updateCanvasImage(itemId, { rotation: newRotation % 360 });
        else if (itemType === 'text') updateCanvasText(itemId, { rotation: newRotation % 360 });
        else if (itemType === 'shape') updateCanvasShape(itemId, { rotation: newRotation % 360 });
      } else if (type === 'resize') {
        const distFromCenter = Math.sqrt(Math.pow(coords.x - (canvasRect.left + itemCenterX), 2) + Math.pow(coords.y - (canvasRect.top + itemCenterY), 2));
        const initialDistFromCenter = Math.sqrt(Math.pow(startX - (canvasRect.left + itemCenterX), 2) + Math.pow(startY - (canvasRect.top + itemCenterY), 2));
        
        if (initialDistFromCenter === 0) return; // Guard against division by zero

        const scaleRatio = distFromCenter / initialDistFromCenter;
        let newScale = initialScale * scaleRatio;
        newScale = Math.max(0.1, Math.min(newScale, itemType === 'text' ? 20 : 10)); 
        
        if (productDefinedBoundaryBoxes && productDefinedBoundaryBoxes.length > 0 && itemInitialWidth > 0 && itemInitialHeight > 0 && canvasRect.width > 0 && canvasRect.height > 0) {
          const targetBox = productDefinedBoundaryBoxes[0]; 

          const parentW = canvasRect.width;
          const parentH = canvasRect.height;
          const squareSide = Math.min(parentW, parentH);
          
          const boxMinXPercent_sq = targetBox.x;
          const boxMaxXPercent_sq = targetBox.x + targetBox.width;
          const boxMinYPercent_sq = targetBox.y;
          const boxMaxYPercent_sq = targetBox.y + targetBox.height;

          const squareOffsetX = (parentW - squareSide) / 2;
          const squareOffsetY = (parentH - squareSide) / 2;
          const itemCenterXpx_canvas = (activeItemData?.x || initialX) / 100 * parentW;
          const itemCenterYpx_canvas = (activeItemData?.y || initialY) / 100 * parentH;
          
          const itemCenterXpercent_sq = ((itemCenterXpx_canvas - squareOffsetX) / squareSide) * 100;
          const itemCenterYpercent_sq = ((itemCenterYpx_canvas - squareOffsetY) / squareSide) * 100;

          const distToBoxLeftEdge_sq = itemCenterXpercent_sq - boxMinXPercent_sq;
          const distToBoxRightEdge_sq = boxMaxXPercent_sq - itemCenterXpercent_sq;
          const distToBoxTopEdge_sq = itemCenterYpercent_sq - boxMinYPercent_sq;
          const distToBoxBottomEdge_sq = boxMaxYPercent_sq - itemCenterYpercent_sq;

          const maxAllowedHalfWidthPercent_sq = Math.min(distToBoxLeftEdge_sq, distToBoxRightEdge_sq);
          const maxAllowedHalfHeightPercent_sq = Math.min(distToBoxTopEdge_sq, distToBoxBottomEdge_sq);

          if (maxAllowedHalfWidthPercent_sq < 0 || maxAllowedHalfHeightPercent_sq < 0) {
              if (newScale > initialScale) { 
                   newScale = initialScale;
              }
          } else {
              const maxAllowedWidthPx_sq = (maxAllowedHalfWidthPercent_sq * 2 / 100) * squareSide;
              const maxAllowedHeightPx_sq = (maxAllowedHalfHeightPercent_sq * 2 / 100) * squareSide;

              const maxScaleBasedOnWidth = itemInitialWidth > 0 ? maxAllowedWidthPx_sq / itemInitialWidth : Infinity;
              const maxScaleBasedOnHeight = itemInitialHeight > 0 ? maxAllowedHeightPx_sq / itemInitialHeight : Infinity;
              
              newScale = Math.min(newScale, maxScaleBasedOnWidth, maxScaleBasedOnHeight);
          }
          newScale = Math.max(0.1, newScale); 
        }
        
        if (itemType === 'image') updateCanvasImage(itemId, { scale: newScale });
        else if (itemType === 'text') updateCanvasText(itemId, { scale: newScale });
        else if (itemType === 'shape') updateCanvasShape(itemId, { scale: newScale });
      } else if (type === 'move') {
          const dx = coords.x - startX;
          const dy = coords.y - startY;
          const dxPercent_canvas = (dx / canvasRect.width) * 100;
          const dyPercent_canvas = (dy / canvasRect.height) * 100;
          let newX_canvas = initialX + dxPercent_canvas;
          let newY_canvas = initialY + dyPercent_canvas;
          
          const currentItemScaleFactor = activeItemData?.scale || initialScale;
          // itemInitialWidth and itemInitialHeight are unscaled base dimensions.
          const scaledItemWidthPx = itemInitialWidth * currentItemScaleFactor;
          const scaledItemHeightPx = itemInitialHeight * currentItemScaleFactor;

          const itemHalfWidthPercent_canvas = canvasRect.width > 0 ? (scaledItemWidthPx / 2 / canvasRect.width) * 100 : 0;
          const itemHalfHeightPercent_canvas = canvasRect.height > 0 ? (scaledItemHeightPx / 2 / canvasRect.height) * 100 : 0;

          if (productDefinedBoundaryBoxes && productDefinedBoundaryBoxes.length > 0) {
              const targetBox = productDefinedBoundaryBoxes[0]; 
              
              const parentW = canvasRect.width;
              const parentH = canvasRect.height;
              const squareSide = Math.min(parentW, parentH);
              const squareOffsetX = (parentW - squareSide) / 2;
              const squareOffsetY = (parentH - squareSide) / 2;

              const boxMinXpx_canvas = squareOffsetX + (targetBox.x / 100 * squareSide);
              const boxMaxXpx_canvas = squareOffsetX + ((targetBox.x + targetBox.width) / 100 * squareSide);
              const boxMinYpx_canvas = squareOffsetY + (targetBox.y / 100 * squareSide);
              const boxMaxYpx_canvas = squareOffsetY + ((targetBox.y + targetBox.height) / 100 * squareSide);

              const boxMinXpercent_canvas = (boxMinXpx_canvas / parentW) * 100;
              const boxMaxXpercent_canvas = (boxMaxXpx_canvas / parentW) * 100;
              const boxMinYpercent_canvas = (boxMinYpx_canvas / parentH) * 100;
              const boxMaxYpercent_canvas = (boxMaxYpx_canvas / parentH) * 100;

              let clampedX_canvas = Math.max(
                  boxMinXpercent_canvas + itemHalfWidthPercent_canvas,
                  Math.min(newX_canvas, boxMaxXpercent_canvas - itemHalfWidthPercent_canvas)
              );
              let clampedY_canvas = Math.max(
                  boxMinYpercent_canvas + itemHalfHeightPercent_canvas,
                  Math.min(newY_canvas, boxMaxYpercent_canvas - itemHalfHeightPercent_canvas)
              );

              // If item is wider/taller than the box, center it in the box
              if (itemHalfWidthPercent_canvas * 2 > (boxMaxXpercent_canvas - boxMinXpercent_canvas)) { 
                  clampedX_canvas = boxMinXpercent_canvas + (boxMaxXpercent_canvas - boxMinXpercent_canvas) / 2; 
              }
               if (itemHalfHeightPercent_canvas * 2 > (boxMaxYpercent_canvas - boxMinYpercent_canvas)) { 
                  clampedY_canvas = boxMinYpercent_canvas + (boxMaxYpercent_canvas - boxMinYpercent_canvas) / 2; 
              }
              newX_canvas = clampedX_canvas;
              newY_canvas = clampedY_canvas;
          } else {
              // Default canvas boundary clamping if no specific boxes are defined
              newX_canvas = Math.max(itemHalfWidthPercent_canvas, Math.min(newX_canvas, 100 - itemHalfWidthPercent_canvas));
              newY_canvas = Math.max(itemHalfHeightPercent_canvas, Math.min(newY_canvas, 100 - itemHalfHeightPercent_canvas));
          }
          
          if (isNaN(newX_canvas) || isNaN(newY_canvas)) return;
          if (itemType === 'image') updateCanvasImage(itemId, { x: newX_canvas, y: newY_canvas, movedFromDefault: true });
          else if (itemType === 'text') updateCanvasText(itemId, { x: newX_canvas, y: newY_canvas, movedFromDefault: true });
          else if (itemType === 'shape') updateCanvasShape(itemId, { x: newX_canvas, y: newY_canvas, movedFromDefault: true });
      }
    });
  }, [activeDrag, updateCanvasImage, canvasImages, updateCanvasText, canvasTexts, updateCanvasShape, canvasShapes, productDefinedBoundaryBoxes, endInteractiveOperation]);

  const handleDragEnd = useCallback(() => {
    cancelAnimationFrame(dragUpdateRef.current);
    endInteractiveOperation(); 
    setActiveDrag(null);
  }, [endInteractiveOperation]);

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('mousemove', handleDragging);
      window.addEventListener('touchmove', handleDragging, { passive: false });
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragging);
      window.removeEventListener('touchmove',handleDragging);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
      cancelAnimationFrame(dragUpdateRef.current);
    };
  }, [activeDrag, handleDragging, handleDragEnd]);

  const handleRemoveItem = (e: ReactMouseEvent | ReactTouchEvent, itemId: string, itemType: 'image' | 'text' | 'shape') => {
    e.stopPropagation();
    if (itemType === 'image') removeCanvasImage(itemId);
    else if (itemType === 'text') removeCanvasText(itemId);
    else if (itemType === 'shape') removeCanvasShape(itemId);
  };

  const visibleImages = canvasImages.filter(img => img.viewId === activeViewId);
  const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeViewId);
  const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeViewId);

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
              key={productToDisplay.imageUrl} // Added key to force re-render on src change
              fill 
              style={{ objectFit: 'contain' }} 
              className="rounded-md pointer-events-none select-none" 
              data-ai-hint={productToDisplay.aiHint}
              priority
            />

            
            {productDefinedBoundaryBoxes && productDefinedBoundaryBoxes.length > 0 && showGrid && (
              <div
                style={{
                  position: 'absolute',
                  left: `${productDefinedBoundaryBoxes[0].x}%`,
                  top: `${productDefinedBoundaryBoxes[0].y}%`,
                  width: `${productDefinedBoundaryBoxes[0].width}%`,
                  height: `${productDefinedBoundaryBoxes[0].height}%`,
                  pointerEvents: 'none',
                  zIndex: 0, 
                  overflow: 'hidden', 
                  backgroundImage: `
                    repeating-linear-gradient(to right, hsla(var(--primary) / 0.8) 0, hsla(var(--primary) / 0.8) 1px, transparent 1px, transparent 100%),
                    repeating-linear-gradient(to bottom, hsla(var(--primary) / 0.8) 0, hsla(var(--primary) / 0.8) 1px, transparent 1px, transparent 100%)
                  `,
                  backgroundSize: '10% 10%', 
                }}
                className="grid-overlay"
              />
            )}

            {productDefinedBoundaryBoxes && showBoundaryBoxes && productDefinedBoundaryBoxes.map((box, index) => (
              <div
                key={`defined-${box.id}-${index}`}
                className="absolute border-2 border-dashed border-primary/30 pointer-events-none"
                style={{
                  left: `${box.x}%`, top: `${box.y}%`,
                  width: `${box.width}%`, height: `${box.height}%`,
                  zIndex: 1, 
                }}
                title={box.name}
              >
                <span className="absolute -top-5 left-0 text-xs text-primary/50 bg-background/30 px-1 rounded-t-sm">
                  {box.name}
                </span>
              </div>
            ))}
          
            {/* The interactive elements are now siblings of the background Image */}
            {visibleImages.map((img) => (
              <InteractiveCanvasImage
                key={`${img.id}-${img.zIndex}`} image={img}
                isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                isBeingDragged={activeDrag?.itemId === img.id && activeDrag?.type === 'move' && activeDrag?.itemType === 'image'}
                baseImageDimension={BASE_IMAGE_DIMENSION}
                onImageSelect={selectCanvasImage}
                onImageSelectAndDragStart={handleImageSelectAndDragStart}
                onRotateHandleMouseDown={(e, item) => handleDragStart(e, 'rotate', item, 'image')}
                onResizeHandleMouseDown={(e, item) => handleDragStart(e, 'resize', item, 'image')}
                onRemoveHandleClick={(e, id) => handleRemoveItem(e, id, 'image')}
              />
            ))}
            {visibleTexts.map((textItem) => (
              <InteractiveCanvasText
                key={`${textItem.id}-${textItem.zIndex}`} textItem={textItem}
                isSelected={textItem.id === selectedCanvasTextId && !textItem.isLocked}
                isBeingDragged={activeDrag?.itemId === textItem.id && activeDrag?.type === 'move' && activeDrag?.itemType === 'text'}
                onTextSelect={selectCanvasText}
                onTextSelectAndDragStart={handleTextSelectAndDragStart}
                onRotateHandleMouseDown={(e, item) => handleDragStart(e, 'rotate', item, 'text')}
                onResizeHandleMouseDown={(e, item) => handleDragStart(e, 'resize', item, 'text')}
                onRemoveHandleClick={(e, id) => handleRemoveItem(e, id, 'text')}
              />
            ))}
            {visibleShapes.map((shape) => (
              <InteractiveCanvasShape
                key={`${shape.id}-${shape.zIndex}`} shape={shape}
                isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                isBeingDragged={activeDrag?.itemId === shape.id && activeDrag?.type === 'move' && activeDrag?.itemType === 'shape'}
                onShapeSelect={selectCanvasShape}
                onShapeSelectAndDragStart={handleShapeSelectAndDragStart}
                onRotateHandleMouseDown={(e, item) => handleDragStart(e, 'rotate', item, 'shape')}
                onResizeHandleMouseDown={(e, item) => handleDragStart(e, 'resize', item, 'shape')}
                onRemoveHandleClick={(e, id) => handleRemoveItem(e, id, 'shape')}
              />
            ))}
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
