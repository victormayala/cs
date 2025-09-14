"use client";

import Image from 'next/image';
import { useUploads } from '@/contexts/UploadContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';
import dynamic from 'next/dynamic';
import type Konva from 'konva';

// Dynamically import Konva components
const Stage = dynamic(() => import('react-konva').then((mod) => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then((mod) => mod.Layer), { ssr: false });
const KonvaImage = dynamic(() => import('react-konva').then((mod) => mod.Image), { ssr: false });
const KonvaText = dynamic(() => import('react-konva').then((mod) => mod.Text), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then((mod) => mod.Transformer), { ssr: false });
const Rect = dynamic(() => import('react-konva').then((mod) => mod.Rect), { ssr: false });
const Circle = dynamic(() => import('react-konva').then((mod) => mod.Circle), { ssr: false });

// --- InteractiveCanvasImage ---
interface InteractiveCanvasImageProps {
  imageProps: CanvasImage;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

const InteractiveCanvasImage = ({ imageProps, isSelected, onSelect, onTransformEnd }: InteractiveCanvasImageProps) => {
  const { useImage } = useUploads();
  const [img] = useImage(imageProps.dataUrl, 'anonymous');
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

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
        image={img}
        id={imageProps.id}
        x={(imageProps.x / 100) * (shapeRef.current?.getStage()?.width() || 0) }
        y={(imageProps.y / 100) * (shapeRef.current?.getStage()?.height() || 0)}
        width={imageProps.width}
        height={imageProps.height}
        scaleX={imageProps.scale}
        scaleY={imageProps.scale}
        rotation={imageProps.rotation}
        draggable={!imageProps.isLocked}
        onClick={onSelect}
        onTap={onSelect}
        onTransformEnd={onTransformEnd}
        onDragEnd={onTransformEnd}
      />
      {isSelected && !imageProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};


// --- InteractiveCanvasText ---
interface InteractiveCanvasTextProps {
  textProps: CanvasText;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

const InteractiveCanvasText = ({ textProps, isSelected, onSelect, onTransformEnd }: InteractiveCanvasTextProps) => {
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
        text={textProps.content}
        x={(textProps.x / 100) * (shapeRef.current?.getStage()?.width() || 0) }
        y={(textProps.y / 100) * (shapeRef.current?.getStage()?.height() || 0)}
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
        textTransform={textProps.textTransform}
        lineHeight={textProps.lineHeight}
        letterSpacing={textProps.letterSpacing}
        stroke={textProps.outlineColor}
        strokeWidth={textProps.outlineWidth}
        shadowColor={textProps.shadowColor}
        shadowBlur={textProps.shadowBlur}
        shadowOffsetX={textProps.shadowOffsetX}
        shadowOffsetY={textProps.shadowOffsetY}
        shadowEnabled={textProps.shadowEnabled}
      />
      {isSelected && !textProps.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}


// --- InteractiveCanvasShape ---
interface InteractiveCanvasShapeProps {
  shapeProps: CanvasShape;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

const InteractiveCanvasShape = ({ shapeProps, isSelected, onSelect, onTransformEnd }: InteractiveCanvasShapeProps) => {
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
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}


// --- Main DesignCanvas Component ---
interface BoundaryBox {
  id: string; name: string; x: number; y: number; width: number; height: number;
}
interface DesignCanvasProps {
  productImageUrl?: string;
  productImageAlt?: string;
  productImageAiHint?: string;
  productDefinedBoundaryBoxes?: BoundaryBox[];
  activeViewId: string | null;
  showGrid: boolean;
  showBoundaryBoxes: boolean;
}

const defaultProductBase = {
  name: 'Plain White T-shirt (Default)',
  imageUrl: 'https://placehold.co/700x700.png',
  imageAlt: 'Plain white T-shirt ready for customization',
  aiHint: 't-shirt mockup',
};

export default function DesignCanvas({ 
  productImageUrl, productImageAlt, productImageAiHint, 
  productDefinedBoundaryBoxes = [], activeViewId, showGrid, showBoundaryBoxes 
}: DesignCanvasProps) {

  const productToDisplay = {
    ...defaultProductBase,
    imageUrl: productImageUrl || defaultProductBase.imageUrl,
    imageAlt: productImageAlt || defaultProductBase.imageAlt,
    aiHint: productImageAiHint || defaultProductBase.aiHint,
    name: productImageAlt || defaultProductBase.name,
  };
  
  const {
    canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
    canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText,
    canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
    getStageRef,
  } = useUploads();
  
  const stageRef = getStageRef();
  const canvasRef = useRef<HTMLDivElement>(null); 
  
  const visibleImages = canvasImages.filter(img => img.viewId === activeViewId);
  const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeViewId);
  const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeViewId);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const { width } = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width, height: width });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if(canvasRef.current) resizeObserver.observe(canvasRef.current);
    return () => { if(canvasRef.current) resizeObserver.unobserve(canvasRef.current); };
  }, []);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      selectCanvasImage(null); selectCanvasText(null); selectCanvasShape(null);
    }
  }

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
    const node = e.target;
    const scale = node.scaleX(); 
    const rotation = node.rotation();

    const stage = node.getStage();
    if (!stage) return;
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    
    // Convert absolute pixel coords back to percentages
    const x = (node.x() / stageWidth) * 100;
    const y = (node.y() / stageHeight) * 100;

    switch (itemType) {
      case 'image': updateCanvasImage(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
      case 'text': updateCanvasText(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
      case 'shape': updateCanvasShape(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-card border border-dashed border-border rounded-lg shadow-inner relative overflow-hidden select-none">
      <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
        <div
          id="product-image-canvas-area"
          ref={canvasRef} 
          className="relative" 
          style={{ width: 'min(100%, calc(100svh - 10rem))', aspectRatio: '1 / 1' }}
        >
            <Image
              id="design-canvas-background-image"
              src={productToDisplay.imageUrl}
              alt={productToDisplay.imageAlt}
              key={productToDisplay.imageUrl}
              fill 
              style={{ objectFit: 'contain' }} 
              className="rounded-md pointer-events-none select-none" 
              data-ai-hint={productToDisplay.aiHint}
              priority
            />

            {stageRef && (
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
                          onSelect={() => { selectCanvasImage(img.id); }}
                          onTransformEnd={(e) => handleTransformEnd(e, 'image')}
                      />
                  ))}
                  {visibleTexts.map((text) => (
                      <InteractiveCanvasText
                          key={`${text.id}-${text.zIndex}`}
                          textProps={text}
                          isSelected={text.id === selectedCanvasTextId && !text.isLocked}
                          onSelect={() => { selectCanvasText(text.id); }}
                           onTransformEnd={(e) => handleTransformEnd(e, 'text')}
                      />
                  ))}
                  {visibleShapes.map((shape) => (
                      <InteractiveCanvasShape
                          key={`${shape.id}-${shape.zIndex}`}
                          shapeProps={shape}
                          isSelected={shape.id === selectedCanvasShapeId && !shape.isLocked}
                          onSelect={() => { selectCanvasShape(shape.id); }}
                           onTransformEnd={(e) => handleTransformEnd(e, 'shape')}
                      />
                  ))}
                </Layer>
              </Stage>
            )}
        </div> 
      </div>
      <div className="text-center pt-2 pb-1 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {selectedCanvasImageId || selectedCanvasTextId || selectedCanvasShapeId ? 
            "Click & drag item or handles to transform." : 
            "Add items from the left panel."
          }
        </p>
      </div>
    </div>
  );
}

