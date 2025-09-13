
"use client";

import { useMemo } from 'react';
import type { CanvasImage } from '@/contexts/UploadContext';
import useImage from 'use-image';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';
import dynamic from 'next/dynamic';

// Dynamically import Konva components
const KonvaImage = dynamic(() => import('react-konva').then(mod => mod.Image), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then(mod => mod.Transformer), { ssr: false });

interface InteractiveCanvasImageProps {
  imageProps: CanvasImage;
  isSelected: boolean;
  onSelect: () => void;
}

export function InteractiveCanvasImage({ 
  imageProps,
  isSelected,
  onSelect
}: InteractiveCanvasImageProps) {
  const [img] = useImage(imageProps.dataUrl, 'anonymous');
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  if (!KonvaImage || !Transformer) {
    return null; // Or a loading indicator
  }

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={img}
        x={imageProps.x}
        y={imageProps.y}
        width={img?.width}
        height={img?.height}
        scaleX={imageProps.scale}
        scaleY={imageProps.scale}
        rotation={imageProps.rotation}
        draggable={!imageProps.isLocked}
        onClick={onSelect}
        onTap={onSelect}
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
}

    