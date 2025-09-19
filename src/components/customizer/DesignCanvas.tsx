
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle, Group, Line, Path } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IRect } from 'konva/lib/types';


// --- Inner Canvas Components ---

interface InteractiveCanvasImageProps {
  imageProps: CanvasImage;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y: number};
  pixelBoundaryBoxes: IRect[];
  stageDimensions: { width: number; height: number; x: number; y: number } | null;
}

const InteractiveCanvasImage: React.FC<InteractiveCanvasImageProps> = ({ imageProps, isSelected, onSelect, onTransform, onTransformEnd, onDragEnd, dragBoundFunc, pixelBoundaryBoxes, stageDimensions }) => {
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    const img = new window.Image();
    img.src = imageProps.dataUrl;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
  }, [imageProps.dataUrl]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const transformerBoundBoxFunc = useMemo(() => {
    return function(oldBox: IRect, newBox: IRect): IRect {
      const node = shapeRef.current;
      if (!node) return oldBox;

      if (!pixelBoundaryBoxes || pixelBoundaryBoxes.length === 0 || !stageDimensions) {
        // No specific boundaries, just constrain to stage
        if (newBox.width > stageDimensions.width || newBox.height > stageDimensions.height) {
          return oldBox;
        }
        return newBox;
      }

      // Find containing boundary
      const nodeCenter = { x: node.x(), y: node.y() };
      const containingBox = pixelBoundaryBoxes.find(box => 
        nodeCenter.x >= box.x && nodeCenter.x <= box.x + box.width &&
        nodeCenter.y >= box.y && nodeCenter.y <= box.y + box.height
      ) || pixelBoundaryBoxes[0];
      
      if (newBox.width > containingBox.width || newBox.height > containingBox.height) {
        return oldBox;
      }

      return newBox;
    }
  }, [pixelBoundaryBoxes, stageDimensions]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={imageProps.id}
        image={image}
        x={imageProps.x}
        y={imageProps.y}
        width={imageProps.width}
        height={imageProps.height}
        scaleX={imageProps.scaleX}
        scaleY={imageProps.scaleY}
        rotation={imageProps.rotation}
        draggable={!imageProps.isLocked}
        onClick={onSelect}
        onTap={onSelect}
        onTransform={onTransform}
        onTransformEnd={onTransformEnd}
        onDragEnd={onDragEnd}
        zIndex={imageProps.zIndex}
        dragBoundFunc={dragBoundFunc}
        offsetX={imageProps.width / 2}
        offsetY={imageProps.height / 2}
      />
      {isSelected && !imageProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={transformerBoundBoxFunc}
          anchorFill="#000"
          anchorStroke="#000"
          anchorSize={10}
          anchorCornerRadius={5}
          borderDash={[6, 2]}
          borderStrokeWidth={1.5}
          borderStroke="#000"
          rotateEnabled={true}
          rotationSnaps={[0, 90, 180, 270]}
          rotateAnchorOffset={30}
        />
      )}
    </>
  );
};

interface InteractiveCanvasTextProps {
  textProps: CanvasText;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y:number};
  pixelBoundaryBoxes: IRect[];
  stageDimensions: { width: number; height: number; x: number; y: number } | null;
}

const InteractiveCanvasText: React.FC<InteractiveCanvasTextProps> = ({ textProps, isSelected, onSelect, onTransform, onTransformEnd, onDragEnd, dragBoundFunc, pixelBoundaryBoxes, stageDimensions }) => {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const transformerBoundBoxFunc = useMemo(() => {
    return function(oldBox: IRect, newBox: IRect): IRect {
      const node = shapeRef.current;
      if (!node) return oldBox;

      if (!pixelBoundaryBoxes || pixelBoundaryBoxes.length === 0 || !stageDimensions) {
        if (newBox.width > stageDimensions.width || newBox.height > stageDimensions.height) {
          return oldBox;
        }
        return newBox;
      }
      
      const nodeCenter = { x: node.x(), y: node.y() };
      const containingBox = pixelBoundaryBoxes.find(box => 
        nodeCenter.x >= box.x && nodeCenter.x <= box.x + box.width &&
        nodeCenter.y >= box.y && nodeCenter.y <= box.y + box.height
      ) || pixelBoundaryBoxes[0];
      
      if (newBox.width > containingBox.width || newBox.height > containingBox.height) {
        return oldBox;
      }
      return newBox;
    }
  }, [pixelBoundaryBoxes, stageDimensions]);

  return (
    <>
      <KonvaText
        ref={shapeRef}
        id={textProps.id}
        x={textProps.x}
        y={textProps.y}
        text={textProps.content}
        fontSize={textProps.fontSize}
        fontFamily={textProps.fontFamily}
        fill={textProps.color}
        rotation={textProps.rotation}
        scaleX={textProps.scale}
        scaleY={textProps.scale}
        draggable={!textProps.isLocked}
        onClick={onSelect}
        onTap={onSelect}
        onTransform={onTransform}
        onTransformEnd={onTransformEnd}
        onDragEnd={onDragEnd}
        fontStyle={`${textProps.fontWeight} ${textProps.fontStyle}`}
        textDecoration={textProps.textDecoration}
        lineHeight={textProps.lineHeight}
        letterSpacing={textProps.letterSpacing}
        stroke={textProps.outlineColor}
        strokeWidth={textProps.outlineWidth}
        shadowColor={textProps.shadowColor}
        shadowBlur={textProps.shadowBlur}
        shadowOffsetX={textProps.shadowOffsetX}
        shadowOffsetY={textProps.shadowOffsetY}
        shadowEnabled={textProps.shadowEnabled}
        zIndex={textProps.zIndex}
        dragBoundFunc={dragBoundFunc}
        offsetX={shapeRef.current?.width() ? shapeRef.current.width() / 2 : 0}
        offsetY={shapeRef.current?.height() ? shapeRef.current.height() / 2 : 0}
      />
      {isSelected && !textProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={transformerBoundBoxFunc}
          anchorFill="#000"
          anchorStroke="#000"
          anchorSize={10}
          anchorCornerRadius={5}
          borderDash={[6, 2]}
          borderStrokeWidth={1.5}
          borderStroke="#000"
          rotateEnabled={true}
          rotationSnaps={[0, 90, 180, 270]}
          rotateAnchorOffset={30}
        />
      )}
    </>
  );
}

interface InteractiveCanvasShapeProps {
  shapeProps: CanvasShape;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y: number};
  pixelBoundaryBoxes: IRect[];
  stageDimensions: { width: number; height: number; x: number; y: number } | null;
}

const InteractiveCanvasShape: React.FC<InteractiveCanvasShapeProps> = ({ shapeProps, isSelected, onSelect, onTransform, onTransformEnd, onDragEnd, dragBoundFunc, pixelBoundaryBoxes, stageDimensions }) => {
  const shapeRef = useRef<Konva.Rect | Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
   const transformerBoundBoxFunc = useMemo(() => {
    return function(oldBox: IRect, newBox: IRect): IRect {
      const node = shapeRef.current;
      if (!node) return oldBox;
      
      if (!pixelBoundaryBoxes || pixelBoundaryBoxes.length === 0 || !stageDimensions) {
        if (newBox.width > stageDimensions.width || newBox.height > stageDimensions.height) {
          return oldBox;
        }
        return newBox;
      }

      const nodeCenter = { x: node.x(), y: node.y() };
      const containingBox = pixelBoundaryBoxes.find(box => 
        nodeCenter.x >= box.x && nodeCenter.x <= box.x + box.width &&
        nodeCenter.y >= box.y && nodeCenter.y <= box.y + box.height
      ) || pixelBoundaryBoxes[0];
      
      if (newBox.width > containingBox.width || newBox.height > containingBox.height) {
        return oldBox;
      }

      return newBox;
    }
  }, [pixelBoundaryBoxes, stageDimensions]);

  const commonProps = {
    id: shapeProps.id,
    x: shapeProps.x,
    y: shapeProps.y,
    rotation: shapeProps.rotation,
    scaleX: shapeProps.scale,
    scaleY: shapeProps.scale,
    fill: shapeProps.color,
    stroke: shapeProps.strokeColor,
    strokeWidth: shapeProps.strokeWidth,
    draggable: !shapeProps.isLocked,
    onClick: onSelect,
    onTap: onSelect,
    onTransform: onTransform,
    onTransformEnd: onTransformEnd,
    onDragEnd: onDragEnd,
    zIndex: shapeProps.zIndex,
    dragBoundFunc: dragBoundFunc,
  };

  const renderShape = () => {
    switch (shapeProps.shapeType) {
      case 'rectangle':
        return <Rect ref={shapeRef as React.Ref<Konva.Rect>} {...commonProps} width={shapeProps.width} height={shapeProps.height} offsetX={shapeProps.width / 2} offsetY={shapeProps.height / 2} />;
      case 'circle':
        return <Circle ref={shapeRef as React.Ref<Konva.Circle>} {...commonProps} radius={shapeProps.width / 2} />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && !shapeProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={transformerBoundBoxFunc}
          anchorFill="#000"
          anchorStroke="#000"
          anchorSize={10}
          anchorCornerRadius={5}
          borderDash={[6, 2]}
          borderStrokeWidth={1.5}
          borderStroke="#000"
          rotateEnabled={true}
          rotationSnaps={[0, 90, 180, 270]}
          rotateAnchorOffset={30}
        />
      )}
    </>
  );
}

interface DesignCanvasProps {
  activeView: ProductView;
  showGrid: boolean;
  showBoundaryBoxes: boolean;
  onStageRectChange: (rect: { width: number; height: number; x: number; y: number }) => void;
  pixelBoundaryBoxes: IRect[];
}

export default function DesignCanvas({ activeView, showGrid, showBoundaryBoxes, onStageRectChange, pixelBoundaryBoxes }: DesignCanvasProps) {
    const {
        canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage, removeCanvasImage,
        canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText, removeCanvasText,
        canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape, removeCanvasShape,
        getStageRef,
        startInteractiveOperation,
        endInteractiveOperation
    } = useUploads();
    
    const stageRef = getStageRef();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
    const hasCenteredRef = useRef(false);

    const [isImageLoading, setIsImageLoading] = useState(true);

    const handleStageRectChange = useCallback((rect: { width: number; height: number; x: number; y: number }) => {
        setStageDimensions(rect);
        onStageRectChange(rect);
    }, [onStageRectChange]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedCanvasImageId) removeCanvasImage(selectedCanvasImageId);
                if (selectedCanvasTextId) removeCanvasText(selectedCanvasTextId);
                if (selectedCanvasShapeId) removeCanvasShape(selectedCanvasShapeId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCanvasImageId, removeCanvasImage, selectedCanvasTextId, removeCanvasText, selectedCanvasShapeId, removeCanvasShape]);


    useEffect(() => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image) return;
        
        hasCenteredRef.current = false; 

        const calculateRect = () => {
            const containerRect = container.getBoundingClientRect();
            const imageNaturalWidth = image.naturalWidth;
            const imageNaturalHeight = image.naturalHeight;

            if (containerRect.width === 0 || containerRect.height === 0 || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
                return;
            }

            const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
            const containerAspectRatio = containerRect.width / containerRect.height;

            let renderWidth, renderHeight, x, y;

            if (containerAspectRatio > imageAspectRatio) {
                renderHeight = containerRect.height;
                renderWidth = renderHeight * imageAspectRatio;
                x = (containerRect.width - renderWidth) / 2;
                y = 0;
            } else {
                renderWidth = containerRect.width;
                renderHeight = renderWidth / imageAspectRatio;
                x = 0;
                y = (containerRect.height - renderHeight) / 2;
            }
            
            const newRect = { width: renderWidth, height: renderHeight, x, y };
            handleStageRectChange(newRect);
        };
        
        const resizeObserver = new ResizeObserver(calculateRect);
        resizeObserver.observe(container);

        const handleImageLoad = () => {
            setIsImageLoading(false);
            calculateRect();
        };

        image.addEventListener('load', handleImageLoad);
        if (image.complete) {
            handleImageLoad();
        }

        return () => {
          resizeObserver.disconnect();
          if (image) {
            image.removeEventListener('load', handleImageLoad);
          }
        };
    }, [activeView.imageUrl, handleStageRectChange]);

    useEffect(() => {
        if (!stageDimensions || stageDimensions.width === 0 || stageDimensions.height === 0 || hasCenteredRef.current) return;
    
        const center = { x: stageDimensions.width / 2, y: stageDimensions.height / 2 };
        
        const uncenteredImages = canvasImages.filter(img => !img.movedFromDefault && img.viewId === activeView.id);
        const uncenteredTexts = canvasTexts.filter(txt => !txt.movedFromDefault && txt.viewId === activeView.id);
        const uncenteredShapes = canvasShapes.filter(shp => !shp.movedFromDefault && shp.viewId === activeView.id);

        if (uncenteredImages.length > 0 || uncenteredTexts.length > 0 || uncenteredShapes.length > 0) {
            queueMicrotask(() => {
                uncenteredImages.forEach(img => {
                  updateCanvasImage(img.id, { x: center.x, y: center.y, movedFromDefault: true });
                });
                uncenteredTexts.forEach(txt => {
                  updateCanvasText(txt.id, { x: center.x, y: center.y, movedFromDefault: true });
                });
                uncenteredShapes.forEach(shp => {
                  updateCanvasShape(shp.id, { x: center.x, y: center.y, movedFromDefault: true });
                });
            });
            hasCenteredRef.current = true;
        }
    }, [stageDimensions, canvasImages, canvasTexts, canvasShapes, updateCanvasImage, updateCanvasText, updateCanvasShape, activeView.id]);


    const dragBoundFunc = useMemo(() => {
        return function(this: Konva.Node, pos: { x: number; y: number }) {
            if (!pixelBoundaryBoxes || pixelBoundaryBoxes.length === 0 || !stageDimensions) {
                 const selfRect = this.getClientRect({ relativeTo: this.getParent() });
                const itemWidth = selfRect.width;
                const itemHeight = selfRect.height;
                const newX = Math.max(
                    itemWidth / 2,
                    Math.min(pos.x, stageDimensions!.width - itemWidth / 2)
                );
                const newY = Math.max(
                    itemHeight / 2,
                    Math.min(pos.y, stageDimensions!.height - itemHeight / 2)
                );

                return { x: newX, y: newY };
            }

            const selfRect = this.getClientRect({ relativeTo: this.getParent() });
            const itemWidth = selfRect.width;
            const itemHeight = selfRect.height;

            let bestBox = pixelBoundaryBoxes[0];
            let minDistance = Infinity;

            for (const box of pixelBoundaryBoxes) {
                const boxCenterX = box.x + box.width / 2;
                const boxCenterY = box.y + box.height / 2;
                const distance = Math.sqrt(Math.pow(pos.x - boxCenterX, 2) + Math.pow(pos.y - boxCenterY, 2));

                if (distance < minDistance) {
                    minDistance = distance;
                    bestBox = box;
                }
            }

            const newX = Math.max(
                bestBox.x + itemWidth / 2,
                Math.min(pos.x, bestBox.x + bestBox.width - itemWidth / 2)
            );
            const newY = Math.max(
                bestBox.y + itemHeight / 2,
                Math.min(pos.y, bestBox.y + bestBox.height - itemHeight / 2)
            );

            return { x: newX, y: newY };
        };
    }, [pixelBoundaryBoxes, stageDimensions]);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            selectCanvasImage(null);
            selectCanvasText(null);
            selectCanvasShape(null);
        }
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, itemType: 'image' | 'text' | 'shape') => {
      endInteractiveOperation();
      const node = e.target;
      const updates = {
          x: node.x(),
          y: node.y(),
          movedFromDefault: true,
      };
      if (itemType === 'image') updateCanvasImage(node.id(), updates);
      if (itemType === 'text') updateCanvasText(node.id(), updates);
      if (itemType === 'shape') updateCanvasShape(node.id(), updates);
    };

    const handleTransform = (e: Konva.KonvaEventObject<Event>) => {
    };
    
    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
        endInteractiveOperation();
        const node = e.target;
        
        const newAttrs: Partial<CanvasImage | CanvasText | CanvasShape> = {
            rotation: node.rotation(),
            x: node.x(),
            y: node.y(),
            movedFromDefault: true,
        };

        if (itemType === 'image') {
            (newAttrs as Partial<CanvasImage>).scaleX = node.scaleX();
            (newAttrs as Partial<CanvasImage>).scaleY = node.scaleY();
            updateCanvasImage(node.id(), newAttrs as Partial<CanvasImage>);
        } else {
            (newAttrs as Partial<CanvasText | CanvasShape>).scale = node.scaleX();
            if(itemType === 'text') {
                updateCanvasText(node.id(), newAttrs as Partial<CanvasText>);
            } else {
                updateCanvasShape(node.id(), newAttrs as Partial<CanvasShape>);
            }
        }
    };
    
    const visibleImages = canvasImages.filter(img => img.viewId === activeView.id);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeView.id);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeView.id);

    return (
        <div ref={containerRef} className="relative w-full h-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            {isImageLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            
            <img
                ref={imageRef}
                src={activeView.imageUrl}
                alt={activeView.name}
                className={cn("absolute w-full h-full object-contain pointer-events-none transition-opacity", isImageLoading ? 'opacity-0' : 'opacity-100')}
                crossOrigin="anonymous"
            />
            
            <div className="absolute inset-0">
                {showGrid && stageDimensions && (
                    <div 
                        className="absolute grid-pattern pointer-events-none" 
                        style={{
                            top: `${stageDimensions.y}px`,
                            left: `${stageDimensions.x}px`,
                            width: `${stageDimensions.width}px`,
                            height: `${stageDimensions.height}px`,
                        }}
                    />
                )}

                {showBoundaryBoxes && pixelBoundaryBoxes.map((box, index) => (
                    <div 
                        key={`box-${index}`} 
                        className="absolute border-2 border-dashed border-red-500 pointer-events-none" 
                        style={{
                            left: `${box.x}px`,
                            top: `${box.y}px`,
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                        }}
                    />
                ))}

                <Stage
                    ref={stageRef}
                    width={containerRef.current?.offsetWidth}
                    height={containerRef.current?.offsetHeight}
                    className="absolute top-0 left-0"
                    onClick={handleStageClick}
                    onTap={handleStageClick}
                    onMouseDown={startInteractiveOperation}
                    onMouseUp={endInteractiveOperation}
                    onTouchStart={startInteractiveOperation}
                    onTouchEnd={endInteractiveOperation}
                >
                    <Layer name="interactive-layer">
                        {visibleImages.map((img) => (
                            <InteractiveCanvasImage
                                key={`${img.id}-${img.zIndex}`}
                                imageProps={img}
                                isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                                onSelect={() => selectCanvasImage(img.id)}
                                onTransform={(e) => handleTransform(e)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'image')}
                                onDragEnd={(e) => handleDragEnd(e, 'image')}
                                dragBoundFunc={dragBoundFunc}
                                pixelBoundaryBoxes={pixelBoundaryBoxes}
                                stageDimensions={stageDimensions}
                            />
                        ))}
                        {visibleTexts.map((text) => (
                            <InteractiveCanvasText
                                key={`${text.id}-${text.zIndex}`}
                                textProps={text}
                                isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                                onSelect={() => selectCanvasText(text.id)}
                                onTransform={(e) => handleTransform(e)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'text')}
                                onDragEnd={(e) => handleDragEnd(e, 'text')}
                                dragBoundFunc={dragBoundFunc}
                                pixelBoundaryBoxes={pixelBoundaryBoxes}
                                stageDimensions={stageDimensions}
                            />
                        ))}
                        {visibleShapes.map((shape) => (
                            <InteractiveCanvasShape
                                key={`${shape.id}-${shape.zIndex}`}
                                shapeProps={shape}
                                isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                                onSelect={() => selectCanvasShape(shape.id)}
                                onTransform={(e) => handleTransform(e)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'shape')}
                                onDragEnd={(e) => handleDragEnd(e, 'shape')}
                                dragBoundFunc={dragBoundFunc}
                                pixelBoundaryBoxes={pixelBoundaryBoxes}
                                stageDimensions={stageDimensions}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}
