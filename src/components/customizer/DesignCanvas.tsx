
"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // useImage hook is removed to prevent re-renders and use native Image object instead for stability
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
}

export default function DesignCanvas({ activeView, showGrid, showBoundaryBoxes }: DesignCanvasProps) {
    const {
        canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
        canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText,
        canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
        getStageRef,
    } = useUploads();
    
    const stageRef = getStageRef();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [renderedImageRect, setRenderedImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isImageLoading, setIsImageLoading] = useState(true);

    const { boundaryBoxes } = activeView;
    
    useEffect(() => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image) return;

        const calculateRect = () => {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const imageNaturalWidth = image.naturalWidth;
            const imageNaturalHeight = image.naturalHeight;

            if (containerWidth === 0 || containerHeight === 0 || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
                return; // Not ready yet
            }

            const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
            const containerAspectRatio = containerWidth / containerHeight;

            let renderWidth, renderHeight, x, y;

            if (containerAspectRatio > imageAspectRatio) {
                renderHeight = containerHeight;
                renderWidth = renderHeight * imageAspectRatio;
                x = (containerWidth - renderWidth) / 2;
                y = 0;
            } else {
                renderWidth = containerWidth;
                renderHeight = renderWidth / imageAspectRatio;
                x = 0;
                y = (containerHeight - renderHeight) / 2;
            }
            
            setRenderedImageRect({ width: renderWidth, height: renderHeight, x, y });
        };
        
        const resizeObserver = new ResizeObserver(calculateRect);
        resizeObserver.observe(container);

        image.addEventListener('load', () => {
            setIsImageLoading(false);
            calculateRect();
        });

        if (image.complete) {
            setIsImageLoading(false);
            calculateRect();
        }

        return () => {
          resizeObserver.disconnect();
          if (image) image.removeEventListener('load', calculateRect);
        };
    }, [activeView.imageUrl]); // Rerun when image URL changes


    const dragBoundFunc = useCallback(function(this: Konva.Node, pos: { x: number; y: number }) {
        if (!boundaryBoxes || boundaryBoxes.length === 0 || !renderedImageRect.width || !renderedImageRect.height) {
            return pos;
        }

        const selfRect = this.getClientRect({ relativeTo: this.getParent() });
        const offsetX = selfRect.width / 2;
        const offsetY = selfRect.height / 2;
        
        const unionBox = boundaryBoxes.reduce((acc, box) => ({
            x1: Math.min(acc.x1, box.x),
            y1: Math.min(acc.y1, box.y),
            x2: Math.max(acc.x2, box.x + box.width),
            y2: Math.max(acc.y2, box.y + box.height),
        }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

        const minX = (unionBox.x1 / 100) * renderedImageRect.width;
        const maxX = ((unionBox.x2 / 100) * renderedImageRect.width) * 1.3; // ADDING 30%
        const minY = (unionBox.y1 / 100) * renderedImageRect.height;
        const maxY = (unionBox.y2 / 100) * renderedImageRect.height;

        return {
            x: Math.max(minX + offsetX, Math.min(pos.x, maxX - offsetX)),
            y: Math.max(minY + offsetY, Math.min(pos.y, maxY - offsetY)),
        };
    }, [boundaryBoxes, renderedImageRect]);

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
                className={cn("w-full h-full object-contain pointer-events-none transition-opacity", isImageLoading ? 'opacity-0' : 'opacity-100')}
                crossOrigin="anonymous"
            />
            
            <div 
                className="absolute"
                style={{
                  top: `${renderedImageRect.y}px`,
                  left: `${renderedImageRect.x}px`,
                  width: `${renderedImageRect.width}px`,
                  height: `${renderedImageRect.height}px`,
                }}
            >
                {showGrid && <div className="absolute grid-pattern pointer-events-none inset-0" />}

                {showBoundaryBoxes && (
                    <div className="absolute inset-0 pointer-events-none">
                        {boundaryBoxes.map(box => (
                            <div key={box.id} className="absolute border-2 border-dashed border-red-500" style={{
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.width}%`,
                                height: `${box.height}%`,
                            }} />
                        ))}
                    </div>
                )}

                <Stage
                    ref={stageRef}
                    width={renderedImageRect.width}
                    height={renderedImageRect.height}
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
