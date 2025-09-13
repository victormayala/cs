
"use client";

import { useMemo } from 'react';
import type { CanvasImage } from '@/contexts/UploadContext';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';

interface InteractiveCanvasImageProps {
  image: CanvasImage;
  isSelected: boolean;
  onSelect: () => void;
}

export function InteractiveCanvasImage({ 
  image,
  isSelected,
  onSelect
}: InteractiveCanvasImageProps) {
  const [img] = useImage(image.dataUrl, 'anonymous');
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const width = useMemo(() => img?.width ?? 0, [img]);
  const height = useMemo(() => img?.height ?? 0, [img]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={img}
        x={image.x}
        y={image.y}
        width={width}
        height={height}
        scaleX={image.scale}
        scaleY={image.scale}
        rotation={image.rotation}
        draggable={!image.isLocked}
        onClick={onSelect}
        onTap={onSelect}
        // onDragEnd, onTransformEnd would go here to update state in UploadContext
      />
      {isSelected && !image.isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
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

    