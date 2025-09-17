
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle } from 'react-konva';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [backgroundImage] = useImage(activeView.imageUrl, 'anonymous');
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 700, height: 700 });
    const [renderedImageRect, setRenderedImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current && imageRef.current && backgroundImage) {
                const containerWidth = containerRef.current.offsetWidth;
                const containerHeight = containerRef.current.offsetHeight;

                const imgNaturalWidth = backgroundImage.naturalWidth;
                const imgNaturalHeight = backgroundImage.naturalHeight;
                
                const containerAspect = containerWidth / containerHeight;
                const imgAspect = imgNaturalWidth / imgNaturalHeight;

                let finalWidth, finalHeight, finalX, finalY;
                if (imgAspect > containerAspect) {
                    finalWidth = containerWidth;
                    finalHeight = finalWidth / imgAspect;
                    finalX = 0;
                    finalY = (containerHeight - finalHeight) / 2;
                } else {
                    finalHeight = containerHeight;
                    finalWidth = finalHeight * imgAspect;
                    finalY = 0;
                    finalX = (containerWidth - finalWidth) / 2;
                }

                setCanvasDimensions({ width: finalWidth, height: finalHeight });
                setRenderedImageRect({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [backgroundImage]);

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
    
    const dragBoundFunc = useMemo(() => (pos: { x: number; y: number }) => {
        if (!activeView.boundaryBoxes || activeView.boundaryBoxes.length === 0) {
            return pos;
        }

        const selectedId = selectedCanvasImageId || selectedCanvasTextId || selectedCanvasShapeId;
        if (!selectedId) return pos;
        
        const node = stageRef.current?.findOne(`#${selectedId}`);
        if (!node) return pos;

        const nodeBox = node.getClientRect({ skipTransform: true }); // Use bounding box without rotation/scale for simplicity
        const nodeWidth = nodeBox.width;
        const nodeHeight = nodeBox.height;
        const nodeHalfWidth = nodeWidth / 2;
        const nodeHalfHeight = nodeHeight / 2;

        let totalBoundX1 = Infinity, totalBoundY1 = Infinity, totalBoundX2 = -Infinity, totalBoundY2 = -Infinity;
        activeView.boundaryBoxes.forEach(box => {
            const boxX1 = (box.x / 100) * canvasDimensions.width;
            const boxY1 = (box.y / 100) * canvasDimensions.height;
            const boxX2 = ((box.x + box.width) / 100) * canvasDimensions.width;
            const boxY2 = ((box.y + box.height) / 100) * canvasDimensions.height;

            totalBoundX1 = Math.min(totalBoundX1, boxX1);
            totalBoundY1 = Math.min(totalBoundY1, boxY1);
            totalBoundX2 = Math.max(totalBoundX2, boxX2);
            totalBoundY2 = Math.max(totalBoundY2, boxY2);
        });

        // The pos is the top-left corner of the node.
        const newX = Math.max(totalBoundX1, Math.min(pos.x, totalBoundX2 - nodeWidth));
        const newY = Math.max(totalBoundY1, Math.min(pos.y, totalBoundY2 - nodeHeight));
        
        return { x: newX, y: newY };

    }, [activeView.boundaryBoxes, canvasDimensions, selectedCanvasImageId, selectedCanvasTextId, selectedCanvasShapeId, stageRef]);


    const visibleImages = canvasImages.filter(img => img.viewId === activeView.id);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeView.id);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeView.id);

    return (
        <div ref={containerRef} className="relative w-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            {/* The visual background image. CSS object-contain handles letterboxing. */}
            <img
                ref={imageRef}
                src={activeView.imageUrl}
                alt={activeView.name}
                className="absolute inset-0 object-contain w-full h-full pointer-events-none"
                crossOrigin="anonymous"
            />
            
            {/* Konva Stage sits on top, sized to match the letterboxed image */}
            <div style={{
                position: 'absolute',
                left: `${renderedImageRect.x}px`,
                top: `${renderedImageRect.y}px`,
                width: `${renderedImageRect.width}px`,
                height: `${renderedImageRect.height}px`,
            }}>
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
             
             {/* Visual Overlay for Boundary Boxes and Grid */}
             <div className="absolute inset-0 pointer-events-none" style={{
                left: `${renderedImageRect.x}px`,
                top: `${renderedImageRect.y}px`,
                width: `${renderedImageRect.width}px`,
                height: `${renderedImageRect.height}px`,
             }}>
                {showBoundaryBoxes && activeView.boundaryBoxes.map(box => (
                    <div
                        key={box.id}
                        className="absolute border-2 border-dashed border-red-500"
                        style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.width}%`,
                            height: `${box.height}%`,
                        }}
                    >
                        <div className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 py-0.5 rounded-sm">{box.name}</div>
                    </div>
                ))}
                 {showGrid && (
                    <div className="absolute inset-0 grid-pattern"></div>
                )}
            </div>
        </div>
    );
}
