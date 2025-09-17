
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle, Path } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';
import useImage from 'use-image';

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
  const [image] = useImage(imageProps.dataUrl);

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
  const [pathData, setPathData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (shapeRef.current && textProps.archAmount !== 0) {
      const textWidth = shapeRef.current.width();
      const radius = (textWidth * 180) / (Math.abs(textProps.archAmount) * Math.PI);
      const isUpward = textProps.archAmount > 0;
      
      const M = `M 0 ${isUpward ? radius : 0}`;
      const A = `A ${radius} ${radius} 0 0 ${isUpward ? 1 : 0} ${textWidth} ${isUpward ? radius : 0}`;
      
      setPathData(`${M} ${A}`);
      shapeRef.current.text(''); // Clear normal text
    } else {
      setPathData(undefined); // Reset path data if not arched
    }
  }, [textProps.content, textProps.archAmount, textProps.fontSize, textProps.fontFamily, textProps.letterSpacing, shapeRef.current?.width()]);


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
      <KonvaText
        ref={shapeRef}
        id={textProps.id}
        text={textProps.content}
        x={(textProps.x / 100) * stageWidth}
        y={(textProps.y / 100) * stageHeight}
        rotation={textProps.rotation}
        scaleX={textProps.scale}
        scaleY={textProps.scale}
        fontSize={textProps.fontSize}
        fontFamily={textProps.fontFamily}
        fill={textProps.color}
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
        data={pathData}
        textArr={pathData ? [{ text: textProps.content, x: 0, y:0 }] : undefined}
        dragBoundFunc={dragBoundFunc}
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
        return <Rect ref={shapeRef as React.Ref<Konva.Rect>} {...commonProps} width={shapeProps.width} height={shapeProps.height} />;
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
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 700, height: 700 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [backgroundImage, backgroundImageLoadStatus] = useImage(activeView.imageUrl);
    const [renderedImageRect, setRenderedImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setCanvasDimensions({ width: width, height: width });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (backgroundImage && backgroundImageLoadStatus === 'loaded') {
            const canvasWidth = canvasDimensions.width;
            const canvasHeight = canvasDimensions.height;
            const imgWidth = backgroundImage.naturalWidth;
            const imgHeight = backgroundImage.naturalHeight;

            const canvasAspect = canvasWidth / canvasHeight;
            const imgAspect = imgWidth / imgHeight;

            let finalWidth, finalHeight, finalX, finalY;

            if (imgAspect > canvasAspect) {
                finalWidth = canvasWidth;
                finalHeight = finalWidth / imgAspect;
                finalX = 0;
                finalY = (canvasHeight - finalHeight) / 2;
            } else {
                finalHeight = canvasHeight;
                finalWidth = finalHeight * imgAspect;
                finalY = 0;
                finalX = (canvasWidth - finalWidth) / 2;
            }
            setRenderedImageRect({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
        }
    }, [backgroundImage, backgroundImageLoadStatus, canvasDimensions]);
    

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            selectCanvasImage(null);
            selectCanvasText(null);
            selectCanvasShape(null);
        }
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
        const node = e.target;
        const newAttrs: Partial<CanvasImage> = {
            rotation: node.rotation(),
            x: (node.x() / canvasDimensions.width) * 100,
            y: (node.y() / canvasDimensions.height) * 100,
            movedFromDefault: true
        };

        if (itemType === 'image') {
            (newAttrs as Partial<CanvasImage>).scaleX = node.scaleX();
            (newAttrs as Partial<CanvasImage>).scaleY = node.scaleY();
            updateCanvasImage(node.id(), newAttrs);
        } else {
            (newAttrs as Partial<CanvasText | CanvasShape>).scale = node.scaleX();
            if(itemType === 'text') {
                updateCanvasText(node.id(), newAttrs as Partial<CanvasText>);
            } else {
                updateCanvasShape(node.id(), newAttrs as Partial<CanvasShape>);
            }
        }
    };

    const dragBoundFunc = useMemo(() => (pos: {x: number, y: number}) => {
        if (!activeView.boundaryBoxes || activeView.boundaryBoxes.length === 0) {
            return pos;
        }
        
        const selectedId = selectedCanvasImageId || selectedCanvasTextId || selectedCanvasShapeId;
        if (!selectedId) return pos;

        const node = stageRef.current?.findOne(`#${selectedId}`);
        if (!node) return pos;

        const nodeBox = node.getClientRect();
        
        let unionBox = {
            x1: Infinity, y1: Infinity,
            x2: -Infinity, y2: -Infinity,
        };

        activeView.boundaryBoxes.forEach(b => {
            const boxLeftPx = (b.x / 100) * renderedImageRect.width + renderedImageRect.x;
            const boxTopPx = (b.y / 100) * renderedImageRect.height + renderedImageRect.y;
            const boxWidthPx = (b.width / 100) * renderedImageRect.width;
            const boxHeightPx = (b.height / 100) * renderedImageRect.height;
            
            unionBox.x1 = Math.min(unionBox.x1, boxLeftPx);
            unionBox.y1 = Math.min(unionBox.y1, boxTopPx);
            unionBox.x2 = Math.max(unionBox.x2, boxLeftPx + boxWidthPx);
            unionBox.y2 = Math.max(unionBox.y2, boxTopPx + boxHeightPx);
        });

        const newX = Math.max(unionBox.x1, Math.min(pos.x, unionBox.x2 - nodeBox.width));
        const newY = Math.max(unionBox.y1, Math.min(pos.y, unionBox.y2 - nodeBox.height));

        return { x: newX, y: newY };
    }, [activeView.boundaryBoxes, renderedImageRect, stageRef, selectedCanvasImageId, selectedCanvasTextId, selectedCanvasShapeId]);


    const visibleImages = canvasImages.filter(img => img.viewId === activeView.id);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeView.id);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeView.id);

    return (
        <div ref={containerRef} className="relative w-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            <img
                src={activeView.imageUrl}
                alt={activeView.name}
                className="absolute inset-0 object-contain w-full h-full pointer-events-none"
             />
             
             <div className="absolute inset-0 pointer-events-none">
                {showBoundaryBoxes && activeView.boundaryBoxes.map(box => {
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${renderedImageRect.x + (box.x / 100) * renderedImageRect.width}px`,
                        top: `${renderedImageRect.y + (box.y / 100) * renderedImageRect.height}px`,
                        width: `${(box.width / 100) * renderedImageRect.width}px`,
                        height: `${(box.height / 100) * renderedImageRect.height}px`,
                    };
                    return (
                        <div
                            key={box.id}
                            className="border-2 border-dashed border-red-500"
                            style={style}
                        >
                            <div className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 py-0.5 rounded-sm">{box.name}</div>
                        </div>
                    );
                })}
            </div>

            <Stage
                ref={stageRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="absolute top-0 left-0"
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
                            onDragEnd={(e) => handleTransformEnd(e, 'image')}
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
                            onDragEnd={(e) => handleTransformEnd(e, 'text')}
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
                            onDragEnd={(e) => handleTransformEnd(e, 'shape')}
                            dragBoundFunc={dragBoundFunc}
                        />
                    ))}
                </Layer>
            </Stage>
            
             <div className="absolute inset-0 w-full h-full pointer-events-none">
                {showGrid && (
                <div className="absolute inset-0 grid-pattern" style={{
                    left: `${renderedImageRect.x}px`,
                    top: `${renderedImageRect.y}px`,
                    width: `${renderedImageRect.width}px`,
                    height: `${renderedImageRect.height}px`,
                    backgroundSize: '25px 25px',
                    backgroundImage: 'linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)',
                } as React.CSSProperties}></div>
                )}
            </div>
        </div>
    );
}

    