
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle, Path } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';
import useImage from 'use-image';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
  const [image] = useImage(imageProps.dataUrl, 'anonymous');

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const stage = shapeRef.current?.getStage();
  const stageWidth = stage?.width() || 0;
  const stageHeight = stage?.height() || 0;

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={imageProps.id}
        image={image}
        x={(imageProps.x / 100) * stageWidth}
        y={(imageProps.y / 100) * stageHeight}
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
  dragBoundFunc: (pos: {x: number, y: number}) => {x: number, y: number};
}

const InteractiveCanvasText: React.FC<InteractiveCanvasTextProps> = ({ textProps, isSelected, onSelect, onTransformEnd, dragBoundFunc }) => {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  // This useImage is a trick to try and force a re-render when a font might load.
  // Konva has its own font loading mechanisms, but this can help in some cases.
  useImage(`https://fonts.googleapis.com/css2?family=${textProps.fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, textProps.content, textProps.fontSize]);
  
  const stage = shapeRef.current?.getStage();
  const stageWidth = stage?.width() || 0;
  const stageHeight = stage?.height() || 0;
  
  const textPath = useMemo(() => {
    if (textProps.archAmount === 0 || !stageWidth) return undefined;
    const isArchUp = textProps.archAmount > 0;
    const amount = Math.abs(textProps.archAmount) / 100;
    const textWidth = shapeRef.current?.getTextWidth() || stageWidth * 0.8;
    const arcWidth = textWidth * 1.2;
    const arcHeight = arcWidth * amount * 0.4;
    const startX = (stageWidth - arcWidth) / 2;
    const startY = isArchUp ? (stageHeight / 2) + arcHeight / 2 : (stageHeight / 2) - arcHeight / 2;
    const controlX = stageWidth / 2;
    const controlY = isArchUp ? startY - arcHeight : startY + arcHeight;
    const endX = startX + arcWidth;
    const endY = startY;
    return `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`;
  }, [textProps.archAmount, stageWidth, stageHeight, textProps.content, textProps.fontSize, textProps.fontFamily]);

  const commonTextProps = {
    id: textProps.id,
    text: textProps.content,
    rotation: textProps.rotation,
    scaleX: textProps.scale,
    scaleY: textProps.scale,
    fontSize: textProps.fontSize,
    fontFamily: textProps.fontFamily,
    fill: textProps.color,
    draggable: !textProps.isLocked,
    onClick: onSelect,
    onTap: onSelect,
    onTransformEnd: onTransformEnd,
    onDragEnd: onTransformEnd,
    fontStyle: `${textProps.fontWeight} ${textProps.fontStyle}`,
    textDecoration: textProps.textDecoration,
    lineHeight: textProps.lineHeight,
    letterSpacing: textProps.letterSpacing,
    stroke: textProps.outlineColor,
    strokeWidth: textProps.outlineWidth,
    shadowColor: textProps.shadowColor,
    shadowBlur: textProps.shadowBlur,
    shadowOffsetX: textProps.shadowOffsetX,
    shadowOffsetY: textProps.shadowOffsetY,
    shadowEnabled: textProps.shadowEnabled,
    zIndex: textProps.zIndex,
    dragBoundFunc: dragBoundFunc,
  };

  return (
    <>
      <KonvaText
        ref={shapeRef}
        x={(textProps.x / 100) * stageWidth}
        y={(textProps.y / 100) * stageHeight}
        data={textPath}
        textPath={textPath ? textProps.content : undefined}
        {...commonTextProps}
        text={textPath ? undefined : textProps.content}
        // Offset to drag from center
        offsetX={shapeRef.current?.width() ? shapeRef.current.width() / 2 : 0}
        offsetY={shapeRef.current?.height() ? shapeRef.current.height() / 2 : 0}
      />
      {isSelected && !textProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
          enabledAnchors={textProps.archAmount !== 0 ? [] : undefined}
          rotateEnabled={textProps.archAmount === 0}
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
  
  const stage = shapeRef.current?.getStage();
  const stageWidth = stage?.width() || 0;
  const stageHeight = stage?.height() || 0;

  const commonProps = {
    id: shapeProps.id,
    x: (shapeProps.x / 100) * stageWidth,
    y: (shapeProps.y / 100) * stageHeight,
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
        return <Circle ref={shapeRef as React.Ref<Konva.Circle>} {...commonProps} radius={shapeProps.width / 2} />; // Circle doesn't need offset for centering
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

export default function DesignCanvas({
    activeView, showGrid, showBoundaryBoxes
}: DesignCanvasProps) {
    const {
        canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
        canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText,
        canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
        getStageRef,
    } = useUploads();
    
    const stageRef = getStageRef();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [backgroundImage, bgImageLoadingStatus] = useImage(activeView.imageUrl, 'anonymous');
    const [renderedImageRect, setRenderedImageRect] = useState({ x: 0, y: 0, width: 1, height: 1 });

    useEffect(() => {
        const image = imageRef.current;
        if (!image) return;

        const observer = new ResizeObserver(() => {
            const { x, y, width, height } = image.getBoundingClientRect();
            const containerRect = containerRef.current?.getBoundingClientRect();
            if(containerRect) {
                 setRenderedImageRect({ 
                    x: x - containerRect.left, 
                    y: y - containerRect.top, 
                    width, 
                    height 
                });
            }
        });

        observer.observe(image);
        return () => observer.disconnect();
    }, []);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            selectCanvasImage(null);
            selectCanvasText(null);
            selectCanvasShape(null);
        }
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
        const node = e.target;
        const stage = node.getStage();
        if(!stage) return;
        const stageWidth = stage.width();
        const stageHeight = stage.height();

        const newAttrs: Partial<CanvasImage | CanvasText | CanvasShape> = {
            rotation: node.rotation(),
            x: (node.x() / stageWidth) * 100,
            y: (node.y() / stageHeight) * 100,
            movedFromDefault: true
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
    
    const dragBoundFunc = useMemo(() => {
        return function(this: Konva.Node, pos: { x: number; y: number }) {
            const { boundaryBoxes } = activeView;
            if (!boundaryBoxes || boundaryBoxes.length === 0) return pos;

            const stage = this.getStage();
            if (!stage) return pos;

            // Use the node's dimensions for accurate clamping
            const selfRect = this.getClientRect({ skipTransform: true });
            const nodeWidth = selfRect.width;
            const nodeHeight = selfRect.height;
            const offsetX = this.offsetX() * this.scaleX();
            const offsetY = this.offsetY() * this.scaleY();
            
            // This is the union of all boundary boxes. An element can be dragged within any defined area.
            const unionBox = boundaryBoxes.reduce((acc, box) => ({
                x1: Math.min(acc.x1, box.x),
                y1: Math.min(acc.y1, box.y),
                x2: Math.max(acc.x2, box.x + box.width),
                y2: Math.max(acc.y2, box.y + box.height),
            }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
            
            // Convert percentage-based boundary to pixel values based on the stage (which matches the image)
            const minX = (unionBox.x1 / 100) * stage.width() + offsetX;
            const maxX = (unionBox.x2 / 100) * stage.width() - (nodeWidth - offsetX);
            const minY = (unionBox.y1 / 100) * stage.height() + offsetY;
            const maxY = (unionBox.y2 / 100) * stage.height() - (nodeHeight - offsetY);
            
            return {
                x: Math.max(minX, Math.min(pos.x, maxX)),
                y: Math.max(minY, Math.min(pos.y, maxY)),
            };
        };
    }, [activeView.boundaryBoxes]);

    const visibleImages = canvasImages.filter(img => img.viewId === activeView.id);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeView.id);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeView.id);

    return (
        <div ref={containerRef} className="relative w-full h-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            {bgImageLoadingStatus === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            
            <img
                ref={imageRef}
                src={activeView.imageUrl}
                alt={activeView.name}
                crossOrigin="anonymous"
                className="absolute inset-0 object-contain w-full h-full pointer-events-none"
                style={{ opacity: bgImageLoadingStatus === 'loaded' ? 1 : 0 }}
            />
            
            <Stage
                ref={stageRef}
                width={renderedImageRect.width}
                height={renderedImageRect.height}
                className="absolute"
                style={{ top: `${renderedImageRect.y}px`, left: `${renderedImageRect.x}px` }}
                onClick={handleStageClick}
                onTap={handleStageClick}
            >
                <Layer>
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
             
            <div className="absolute inset-0 pointer-events-none" style={{ top: `${renderedImageRect.y}px`, left: `${renderedImageRect.x}px`, width: `${renderedImageRect.width}px`, height: `${renderedImageRect.height}px` }}>
                {showBoundaryBoxes && activeView.boundaryBoxes.map(box => (
                    <div
                        key={box.id}
                        className="absolute border-2 border-dashed border-red-500/70"
                        style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.width}%`,
                            height: `${box.height}%`,
                        }}
                    >
                        <div className="absolute -top-5 left-0 text-xs bg-red-500/80 text-white px-1 py-0.5 rounded-sm">{box.name}</div>
                    </div>
                ))}
                 {showGrid && (
                    <div 
                        className="absolute inset-0 grid-pattern"
                    ></div>
                )}
            </div>
        </div>
    );
}

