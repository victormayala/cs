
"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle, Path } from 'react-konva';
import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import useImage from 'use-image';
import type Konva from 'konva';
import type { ProductView } from '@/app/customizer/Customizer';

// --- Inner Canvas Components ---

interface InteractiveCanvasImageProps {
  imageProps: CanvasImage;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

const InteractiveCanvasImage: React.FC<InteractiveCanvasImageProps> = ({ imageProps, isSelected, onSelect, onTransformEnd }) => {
  const [img] = useImage(imageProps.dataUrl, 'anonymous');
  const shapeRef = useRef<Konva.Image>(null);
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
      <KonvaImage
        ref={shapeRef}
        image={img}
        id={imageProps.id}
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
}

const InteractiveCanvasText: React.FC<InteractiveCanvasTextProps> = ({ textProps, isSelected, onSelect, onTransformEnd }) => {
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
}

const InteractiveCanvasShape: React.FC<InteractiveCanvasShapeProps> = ({ shapeProps, isSelected, onSelect, onTransformEnd }) => {
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

// NEW: State for rendered image dimensions
interface RenderedImageRect {
  width: number;
  height: number;
  x: number;
  y: number;
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
    
    const [backgroundImage] = useImage(activeView.imageUrl, 'anonymous');
    const stageRef = getStageRef();
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 700, height: 700 });
    const containerRef = useRef<HTMLDivElement>(null);
    
    // NEW: State to hold the final rendered dimensions and position of the background image.
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);

    useEffect(() => {
        const checkSize = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setCanvasDimensions({ width: width, height: width });
            }
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);
    
    const handleBackgroundImageLoad = (bgImage: HTMLImageElement) => {
        const canvasWidth = canvasDimensions.width;
        const canvasHeight = canvasDimensions.height;
        const imgWidth = bgImage.naturalWidth;
        const imgHeight = bgImage.naturalHeight;

        const canvasRatio = canvasWidth / canvasHeight;
        const imgRatio = imgWidth / imgHeight;

        let finalWidth, finalHeight, finalX, finalY;

        if (imgRatio > canvasRatio) {
            finalWidth = canvasWidth;
            finalHeight = canvasWidth / imgRatio;
            finalX = 0;
            finalY = (canvasHeight - finalHeight) / 2;
        } else {
            finalHeight = canvasHeight;
            finalWidth = canvasHeight * imgRatio;
            finalY = 0;
            finalX = (canvasWidth - finalWidth) / 2;
        }

        setRenderedImageRect({ width: finalWidth, height: finalHeight, x: finalX, y: finalY });
    };

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
            (newAttrs as Partial<CanvasText | CanvasShape>).scale = node.scaleX(); // Assume uniform scaling for text/shapes
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
        <div ref={containerRef} className="relative w-full aspect-square bg-muted/20 rounded-lg overflow-hidden border">
            <Stage
                ref={stageRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="absolute top-0 left-0"
                onClick={handleStageClick}
                onTap={handleStageClick}
            >
                <Layer>
                    {backgroundImage && (
                        <KonvaImage 
                            image={backgroundImage} 
                            // The onLoad event is now used to set our state
                            onLoad={() => handleBackgroundImageLoad(backgroundImage)}
                            // The rendered dimensions are now from state
                            width={renderedImageRect?.width} 
                            height={renderedImageRect?.height}
                            x={renderedImageRect?.x}
                            y={renderedImageRect?.y}
                        />
                    )}
                </Layer>
                <Layer>
                    {visibleImages.map((img) => (
                        <InteractiveCanvasImage
                            key={`${img.id}-${img.zIndex}`}
                            imageProps={img}
                            isSelected={img.id === selectedCanvasImageId && !img.isLocked}
                            onSelect={() => selectCanvasImage(img.id)}
                            onTransformEnd={(e) => handleTransformEnd(e, 'image')}
                        />
                    ))}
                    {visibleTexts.map((text) => (
                        <InteractiveCanvasText
                            key={`${text.id}-${text.zIndex}`}
                            textProps={text}
                            isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                            onSelect={() => selectCanvasText(text.id)}
                            onTransformEnd={(e) => handleTransformEnd(e, 'text')}
                        />
                    ))}
                    {visibleShapes.map((shape) => (
                        <InteractiveCanvasShape
                            key={`${shape.id}-${shape.zIndex}`}
                            shapeProps={shape}
                            isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                            onSelect={() => selectCanvasShape(shape.id)}
                            onTransformEnd={(e) => handleTransformEnd(e, 'shape')}
                        />
                    ))}
                </Layer>
            </Stage>

            {/* NEW, CORRECTED BOUNDARY BOX LOGIC */}
            {showBoundaryBoxes && renderedImageRect && activeView.boundaryBoxes.map(box => {
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${(box.x / 100) * renderedImageRect.width + renderedImageRect.x}px`,
                    top: `${(box.y / 100) * renderedImageRect.height + renderedImageRect.y}px`,
                    width: `${(box.width / 100) * renderedImageRect.width}px`,
                    height: `${(box.height / 100) * renderedImageRect.height}px`,
                };

                return (
                    <div key={box.id} className="border-2 border-dashed border-primary/50 pointer-events-none" style={style}>
                        <div className="absolute -top-5 left-0 text-xs bg-primary/50 text-white px-1 py-0.5 rounded-sm">{box.name}</div>
                    </div>
                );
            })}

            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid-pattern" style={{
                '--grid-size': '25px', '--grid-color': 'hsl(var(--border) / 0.5)',
                backgroundSize: 'var(--grid-size) var(--grid-size)',
                backgroundImage: 'linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)',
              } as React.CSSProperties}></div>
            )}
        </div>
    );
}
