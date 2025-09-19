
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle } from 'react-konva';
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
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y: number};
}

const InteractiveCanvasImage: React.FC<InteractiveCanvasImageProps> = ({ imageProps, isSelected, onSelect, onTransformEnd, dragBoundFunc }) => {
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
        onTransformEnd={onTransformEnd}
        onDragEnd={onTransformEnd}
        zIndex={imageProps.zIndex}
        dragBoundFunc={dragBoundFunc}
        offsetX={imageProps.width / 2}
        offsetY={imageProps.height / 2}
      />
      {isSelected && !imageProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
        />
      )}
    </>
  );
};

interface InteractiveCanvasTextProps {
  textProps: CanvasText;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y:number};
}

const InteractiveCanvasText: React.FC<InteractiveCanvasTextProps> = ({ textProps, isSelected, onSelect, onTransformEnd, dragBoundFunc }) => {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

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
        onTransformEnd={onTransformEnd}
        onDragEnd={onTransformEnd}
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
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
        />
      )}
    </>
  );
}

interface InteractiveCanvasShapeProps {
  shapeProps: CanvasShape;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y: number};
}

const InteractiveCanvasShape: React.FC<InteractiveCanvasShapeProps> = ({ shapeProps, isSelected, onSelect, onTransformEnd, dragBoundFunc }) => {
  const shapeRef = useRef<Konva.Rect | Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

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
    onTransformEnd: onTransformEnd,
    onDragEnd: onTransformEnd,
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
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
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
        canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
        canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText,
        canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
        getStageRef,
    } = useUploads();
    
    const stageRef = getStageRef();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

    const [isImageLoading, setIsImageLoading] = useState(true);

    const handleStageRectChange = useCallback((rect: { width: number; height: number; x: number; y: number }) => {
        setStageDimensions(rect);
        onStageRectChange(rect);
    }, [onStageRectChange]);

    useEffect(() => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image) return;

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


    const dragBoundFunc = useMemo(() => {
        return function(this: Konva.Node, pos: { x: number; y: number }) {
            if (!pixelBoundaryBoxes || pixelBoundaryBoxes.length === 0) {
                return pos;
            }

            const selfRect = this.getClientRect({ relativeTo: this.getParent() });
            const itemWidth = selfRect.width;
            const itemHeight = selfRect.height;

            for (const box of pixelBoundaryBoxes) {
                const boxLeft = box.x;
                const boxRight = box.x + box.width;
                const boxTop = box.y;
                const boxBottom = box.y + box.height;

                const itemLeft = pos.x - itemWidth / 2;
                const itemRight = pos.x + itemWidth / 2;
                const itemTop = pos.y - itemHeight / 2;
                const itemBottom = pos.y + itemHeight / 2;

                if (
                    itemLeft >= boxLeft &&
                    itemRight <= boxRight &&
                    itemTop >= boxTop &&
                    itemBottom <= boxBottom
                ) {
                    return pos; // The item is fully inside this box, so the position is valid
                }
            }
            
            // If we are here, the item is not fully inside any single box.
            // Find the closest valid position.
            const oldPos = this.absolutePosition();
            let newX = pos.x;
            let newY = pos.y;
            
            const unionBox = pixelBoundaryBoxes.reduce((acc, box) => ({
                minX: Math.min(acc.minX, box.x),
                minY: Math.min(acc.minY, box.y),
                maxX: Math.max(acc.maxX, box.x + box.width),
                maxY: Math.max(acc.maxY, box.y + box.height),
            }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

            newX = Math.max(unionBox.minX + itemWidth / 2, Math.min(newX, unionBox.maxX - itemWidth / 2));
            newY = Math.max(unionBox.minY + itemHeight / 2, Math.min(newY, unionBox.maxY - itemHeight / 2));
            
            // This is a simplified fallback. A more complex one would find the closest point
            // within ANY of the boxes, but for now, we constrain to the union.
            return { x: newX, y: newY };
        };
    }, [pixelBoundaryBoxes]);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            selectCanvasImage(null);
            selectCanvasText(null);
            selectCanvasShape(null);
        }
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
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
                >
                    <Layer name="interactive-layer">
                        {visibleImages.map((img) => (
                            <InteractiveCanvasImage
                                key={`${img.id}-${img.zIndex}`}
                                imageProps={img}
                                isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                                onSelect={() => selectCanvasImage(img.id)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'image')}
                                dragBoundFunc={dragBoundFunc}
                            />
                        ))}
                        {visibleTexts.map((text) => (
                            <InteractiveCanvasText
                                key={`${text.id}-${text.zIndex}`}
                                textProps={text}
                                isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                                onSelect={() => selectCanvasText(text.id)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'text')}
                                dragBoundFunc={dragBoundFunc}
                            />
                        ))}
                        {visibleShapes.map((shape) => (
                            <InteractiveCanvasShape
                                key={`${shape.id}-${shape.zIndex}`}
                                shapeProps={shape}
                                isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                                onSelect={() => selectCanvasShape(shape.id)}
                                onTransformEnd={(e) => handleTransformEnd(e, 'shape')}
                                dragBoundFunc={dragBoundFunc}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}
