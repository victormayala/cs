
"use client";

import { Rect, Circle, Transformer } from 'react-konva';
import type { CanvasShape } from '@/contexts/UploadContext';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';


interface InteractiveCanvasShapeProps {
  shape: CanvasShape;
  isSelected: boolean;
  onSelect: () => void;
}

export function InteractiveCanvasShape({
  shape,
  isSelected,
  onSelect
}: InteractiveCanvasShapeProps) {
  const shapeRef = useRef<Konva.Rect | Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const commonProps = {
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    scaleX: shape.scale,
    scaleY: shape.scale,
    fill: shape.color,
    stroke: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    draggable: !shape.isLocked,
    onClick: onSelect,
    onTap: onSelect,
    // onDragEnd, onTransformEnd would go here to update state in UploadContext
  };

  const renderShape = () => {
    switch (shape.shapeType) {
      case 'rectangle':
        return <Rect ref={shapeRef as React.Ref<Konva.Rect>} {...commonProps} width={shape.width} height={shape.height} />;
      case 'circle':
        return <Circle ref={shapeRef as React.Ref<Konva.Circle>} {...commonProps} radius={shape.width / 2} />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && !shape.isLocked && (
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

    