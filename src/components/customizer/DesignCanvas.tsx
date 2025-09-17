
"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  if (!stage) return null;

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
  useImage(`https://fonts.googleapis.com/css2?family=${textProps.fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, textProps.content, textProps.fontSize]);
  
  const stage = shapeRef.current?.getStage();
  if (!stage) return null;

  const textPath = useMemo(() => {
    if (textProps.archAmount === 0) return undefined;
    const isArchUp = textProps.archAmount > 0;
    const amount = Math.abs(textProps.archAmount) / 100;
    const textWidth = shapeRef.current?.getTextWidth() || stage.width() * 0.8;
    const arcWidth = textWidth * 1.2;
    const arcHeight = arcWidth * amount * 0.4;
    const startX = (stage.width() - arcWidth) / 2;
    const startY = isArchUp ? (stage.height() / 2) + arcHeight / 2 : (stage.height() / 2) - arcHeight / 2;
    const controlX = stage.width() / 2;
    const controlY = isArchUp ? startY - arcHeight : startY + arcHeight;
    const endX = startX + arcWidth;
    const endY = startY;
    return `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`;
  }, [textProps.archAmount, stage?.width(), stage?.height(), textProps.content, textProps.fontSize, textProps.fontFamily]);

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
        x={textProps.x}
        y={textProps.y}
        data={textPath}
        textPath={textPath ? textProps.content : undefined}
        {...commonTextProps}
        text={textPath ? undefined : textProps.content}
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
  if (!stage) return null;

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
    const [backgroundImage, bgImageLoadingStatus] = useImage(activeView.imageUrl, 'anonymous');
    
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            setStageSize({
                width: container.offsetWidth,
                height: container.offsetHeight,
            });
        });
        observer.observe(container);
        
        return () => observer.disconnect();
    }, []);
    
    const imageRect = useMemo(() => {
        if (!backgroundImage || stageSize.width === 0 || stageSize.height === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const stageRatio = stageSize.width / stageSize.height;
        const imageRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;

        let width, height, x, y;

        if (stageRatio > imageRatio) { // Stage is wider than image (letterboxed on sides)
            height = stageSize.height;
            width = height * imageRatio;
            x = (stageSize.width - width) / 2;
            y = 0;
        } else { // Stage is taller than or same as image (letterboxed on top/bottom)
            width = stageSize.width;
            height = width / imageRatio;
            x = 0;
            y = (stageSize.height - height) / 2;
        }
        return { x, y, width, height };
    }, [backgroundImage, stageSize]);


    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage() || e.target.attrs.id === 'background-image') {
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
    
    const dragBoundFunc = useMemo(() => {
        return function(this: Konva.Node, pos: { x: number; y: number }) {
            const { boundaryBoxes } = activeView;
            if (!boundaryBoxes || boundaryBoxes.length === 0) return pos;

            const selfRect = this.getClientRect({ skipTransform: true });
            const nodeWidth = selfRect.width;
            const nodeHeight = selfRect.height;
            const offsetX = this.offsetX() * this.scaleX();
            const offsetY = this.offsetY() * this.scaleY();

            const unionBox = boundaryBoxes.reduce((acc, box) => ({
                x1: Math.min(acc.x1, box.x),
                y1: Math.min(acc.y1, box.y),
                x2: Math.max(acc.x2, box.x + box.width),
                y2: Math.max(acc.y2, box.y + box.height),
            }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
            
            const minX = imageRect.x + (unionBox.x1 / 100) * imageRect.width + offsetX;
            const maxX = imageRect.x + (unionBox.x2 / 100) * imageRect.width - (nodeWidth - offsetX);
            const minY = imageRect.y + (unionBox.y1 / 100) * imageRect.height + offsetY;
            const maxY = imageRect.y + (unionBox.y2 / 100) * imageRect.height - (nodeHeight - offsetY);
            
            return {
                x: Math.max(minX, Math.min(pos.x, maxX)),
                y: Math.max(minY, Math.min(pos.y, maxY)),
            };
        };
    }, [activeView.boundaryBoxes, imageRect]);

    const visibleImages = canvasImages.filter(img => img.viewId === activeView.id);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeView.id);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeView.id);

    return (
        <div ref={containerRef} className="relative w-full h-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            {bgImageLoadingStatus === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            
            <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                className="absolute top-0 left-0"
                onClick={handleStageClick}
                onTap={handleStageClick}
            >
                <Layer>
                    {/* Background Product Image */}
                    {backgroundImage && imageRect.width > 0 && (
                        <KonvaImage
                            id="background-image"
                            image={backgroundImage}
                            x={imageRect.x}
                            y={imageRect.y}
                            width={imageRect.width}
                            height={imageRect.height}
                            listening={false}
                            zIndex={0}
                        />
                    )}

                    {/* Grid */}
                    {showGrid && imageRect.width > 0 && Array.from({ length: 9 }).map((_, i) => (
                        <React.Fragment key={`grid-${i}`}>
                            <Rect
                                x={imageRect.x}
                                y={imageRect.y + ((i + 1) * imageRect.height / 10)}
                                width={imageRect.width}
                                height={1}
                                fill="rgba(128, 128, 128, 0.3)"
                                listening={false}
                            />
                            <Rect
                                x={imageRect.x + ((i + 1) * imageRect.width / 10)}
                                y={imageRect.y}
                                width={1}
                                height={imageRect.height}
                                fill="rgba(128, 128, 128, 0.3)"
                                listening={false}
                            />
                        </React.Fragment>
                    ))}

                    {/* Boundary Boxes */}
                    {showBoundaryBoxes && imageRect.width > 0 && activeView.boundaryBoxes.map(box => (
                        <Rect
                            key={box.id}
                            x={imageRect.x + (box.x / 100) * imageRect.width}
                            y={imageRect.y + (box.y / 100) * imageRect.height}
                            width={(box.width / 100) * imageRect.width}
                            height={(box.height / 100) * imageRect.height}
                            stroke="red"
                            strokeWidth={2}
                            dash={[10, 5]}
                            listening={false}
                        />
                    ))}

                    {/* Interactive Elements */}
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
    );
}
