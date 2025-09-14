
"use client";

import { useUploads, type CanvasImage, type CanvasText, type CanvasShape } from "@/contexts/UploadContext";
import React, { useRef, useEffect, useState } from 'react';
import useImage from 'use-image';
import type Konva from 'konva';
import dynamic from 'next/dynamic';

// Dynamically import react-konva components
const Stage = dynamic(() => import('react-konva').then((mod) => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then((mod) => mod.Layer), { ssr: false });
const KonvaImage = dynamic(() => import('react-konva').then((mod) => mod.Image), { ssr: false });
const KonvaText = dynamic(() => import('react-konva').then((mod) => mod.Text), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then((mod) => mod.Transformer), { ssr: false });
const Rect = dynamic(() => import('react-konva').then((mod) => mod.Rect), { ssr: false });
const Circle = dynamic(() => import('react-konva').then((mod) => mod.Circle), { ssr: false });

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

const InteractiveCanvasText: React.FC<InteractiveCanvasTextProps> = ({ textProps, isSelected, onSelect, onTransformEnd }) => {
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

export default function DesignCanvas({
    productImageUrl, productImageAlt, productImageAiHint,
    productDefinedBoundaryBoxes = [], activeViewId, showGrid, showBoundaryBoxes
}: DesignCanvasProps) {
    const {
        canvasImages, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
        canvasTexts, selectedCanvasTextId, selectCanvasText, updateCanvasText,
        canvasShapes, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
        getStageRef,
    } = useUploads();

    const stageRef = getStageRef();

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            selectCanvasImage(null);
            selectCanvasText(null);
            selectCanvasShape(null);
        }
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, itemType: 'image' | 'text' | 'shape') => {
        const node = e.target;
        const scale = node.scaleX();
        const rotation = node.rotation();

        const stage = node.getStage();
        if (!stage) return;
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        
        const x = (node.x() / stageWidth) * 100;
        const y = (node.y() / stageHeight) * 100;

        switch (itemType) {
            case 'image': updateCanvasImage(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
            case 'text': updateCanvasText(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
            case 'shape': updateCanvasShape(node.id(), { x, y, scale, rotation, movedFromDefault: true }); break;
        }
    };

    const visibleImages = canvasImages.filter(img => img.viewId === activeViewId);
    const visibleTexts = canvasTexts.filter(txt => txt.viewId === activeViewId);
    const visibleShapes = canvasShapes.filter(shp => shp.viewId === activeViewId);

    return (
        <Stage
            ref={stageRef}
            width={700}
            height={700}
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
    );
};
