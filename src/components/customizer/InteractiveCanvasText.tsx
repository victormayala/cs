
"use client";

import { Text as KonvaText, Transformer } from 'react-konva';
import type { CanvasText } from '@/contexts/UploadContext';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';

interface InteractiveCanvasTextProps {
  text: CanvasText;
  isSelected: boolean;
  onSelect: () => void;
}

export function InteractiveCanvasText({ 
  text,
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

  return (
    <>
      <KonvaText
        ref={shapeRef}
        text={text.content}
        x={text.x}
        y={text.y}
        rotation={text.rotation}
        scaleX={text.scale}
        scaleY={text.scale}
        fontSize={text.fontSize}
        fontFamily={text.fontFamily}
        fill={text.color}
        draggable={!text.isLocked}
        onClick={onSelect}
        onTap={onSelect}
        // onDragEnd, onTransformEnd would go here to update state in UploadContext
      />
      {isSelected && !text.isLocked && (
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

    