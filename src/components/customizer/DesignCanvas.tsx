
"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';
import useImage from 'use-image';
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
  const [image] = useImage(imageProps.dataUrl, 'anonymous');

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
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const { boundaryBoxes } = activeView;
    
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                setCanvasSize({ width, height });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const dragBoundFunc = useCallback(function(this: Konva.Node, pos: { x: number; y: number }) {
        if (!boundaryBoxes || boundaryBoxes.length === 0 || !canvasSize.width || !canvasSize.height) {
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

        const minX = (unionBox.x1 / 100) * canvasSize.width;
        const maxX = (unionBox.x2 / 100) * canvasSize.width;
        const minY = (unionBox.y1 / 100) * canvasSize.height;
        const maxY = (unionBox.y2 / 100) * canvasSize.height;

        return {
            x: Math.max(minX + offsetX, Math.min(pos.x, maxX - offsetX)),
            y: Math.max(minY + offsetY, Math.min(pos.y, maxY - offsetY)),
        };
    }, [boundaryBoxes, canvasSize]);

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
            {!canvasSize.width && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            
            <img
                src={activeView.imageUrl}
                alt={activeView.name}
                className="w-full h-full object-contain pointer-events-none"
                crossOrigin="anonymous"
            />
            
            <div 
                className="absolute inset-0 flex items-center justify-center"
            >
                <div style={{ width: canvasSize.width, height: canvasSize.height }} className="relative">
                    {showGrid && <div className="absolute grid-pattern pointer-events-none inset-0" />}

                    {showBoundaryBoxes && (
                        <div className="absolute inset-0 pointer-events-none">
                            {activeView.boundaryBoxes.map(box => (
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
                        width={canvasSize.width}
                        height={canvasSize.height}
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
        </div>
    );
}

    