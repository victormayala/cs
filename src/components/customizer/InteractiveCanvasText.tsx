
"use client";

import type { CanvasText } from '@/contexts/UploadContext';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';
import dynamic from 'next/dynamic';

const KonvaText = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then(mod => mod.Transformer), { ssr: false });


interface InteractiveCanvasTextProps {
  textProps: CanvasText;
  isSelected: boolean;
  onSelect: () => void;
}

export function InteractiveCanvasText({ 
  textProps,
  isSelected,
  onSelect
}: InteractiveCanvasTextProps) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  if (!KonvaText || !Transformer) {
    return null; // Or a loading indicator
  }

  return (
    <>
      <KonvaText
        ref={shapeRef}
        text={textProps.content}
        x={textProps.x}
        y={textProps.y}
        rotation={textProps.rotation}
        scaleX={textProps.scale}
        scaleY={textProps.scale}
        fontSize={textProps.fontSize}
        fontFamily={textProps.fontFamily}
        fill={textProps.color}
        draggable={!textProps.isLocked}
        onClick={onSelect}
        onTap={onSelect}
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

    