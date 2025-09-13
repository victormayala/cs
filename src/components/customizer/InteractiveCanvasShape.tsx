
"use client";

import type { CanvasShape } from '@/contexts/UploadContext';
import { Trash2, RefreshCwIcon, MoveIcon, LockKeyholeIcon, UnlockKeyholeIcon } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import React from 'react';

const HANDLE_SIZE = 24; 

interface InteractiveCanvasShapeProps {
  shape: CanvasShape;
  isSelected: boolean;
  isBeingDragged: boolean; 
  onShapeSelect: (shapeId: string) => void;
  onShapeSelectAndDragStart: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, shape: CanvasShape) => void;
  onRotateHandleMouseDown: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, shape: CanvasShape) => void;
  onResizeHandleMouseDown: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, shape: CanvasShape) => void;
  onRemoveHandleClick: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, shapeId: string) => void;
}

export function InteractiveCanvasShape({
  shape,
  isSelected,
  isBeingDragged,
  onShapeSelect,
  onShapeSelectAndDragStart,
  onRotateHandleMouseDown,
  onResizeHandleMouseDown,
  onRemoveHandleClick,
}: InteractiveCanvasShapeProps) {
  const showHandles = isSelected && !shape.isLocked;

  const dynamicZIndex = shape.zIndex + (isSelected && !shape.isLocked ? 100 : 0);

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${shape.y}%`,
    left: `${shape.x}%`,
    width: `${shape.width * shape.scale}px`,
    height: `${shape.height * shape.scale}px`,
    transform: `translate(-50%, -50%) rotate(${shape.rotation}deg)`,
    zIndex: dynamicZIndex,
    cursor: shape.isLocked ? 'not-allowed' : 'grab',
    transition: isBeingDragged ? 'none' : 'transform 0.1s ease-out, border 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out',
  };

  const svgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'visible', 
  };

  const renderShape = () => {
    const commonProps = {
      fill: shape.color,
      stroke: shape.strokeColor,
      strokeWidth: shape.strokeWidth,
    };

    switch (shape.shapeType) {
      case 'rectangle':
        return <rect x="0" y="0" width="100%" height="100%" {...commonProps} />;
      case 'circle':
        return <circle cx="50%" cy="50%" r="50%" {...commonProps} />;
      
      default:
        return <rect x="0" y="0" width="100%" height="100%" fill="grey" />; 
    }
  };

  return (
    <div
      className={`absolute group
                  ${isSelected && !shape.isLocked ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${!shape.isLocked ? 'hover:ring-1 hover:ring-primary/50' : ''}
                  `}
      style={wrapperStyle}
      onClick={(e) => {
          e.stopPropagation();
          if (!shape.isLocked) onShapeSelect(shape.id);
        }}
      onMouseDown={(e) => {
        if (!shape.isLocked) onShapeSelectAndDragStart(e, shape);
        else e.stopPropagation();
      }}
      onTouchStart={(e) => {
        if (!shape.isLocked) onShapeSelectAndDragStart(e, shape);
        else e.stopPropagation();
      }}
    >
      <svg
        data-id={`canvas-shape-${shape.id}`}
        viewBox={`0 0 ${shape.width} ${shape.height}`} 
        preserveAspectRatio="none" 
        style={svgStyle}
      >
        {renderShape()}
      </svg>
      
      {shape.isLocked && (
        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 bg-background/70 rounded-full"
            title="Shape is locked"
        >
            <LockKeyholeIcon size={HANDLE_SIZE * 0.7} className="text-foreground/80" />
        </div>
      )}

      {showHandles && (
        <>
          
          <div
            className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1 cursor-pointer hover:bg-destructive/80 transition-colors flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }} 
            onClick={(e) => onRemoveHandleClick(e, shape.id)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); onRemoveHandleClick(e, shape.id);}}
            title="Remove shape"
          >
            <Trash2 size={HANDLE_SIZE * 0.6} />
          </div>

          
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-1 cursor-[grab] active:cursor-[grabbing] flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }}
            onMouseDown={(e) => onRotateHandleMouseDown(e, shape)}
            onTouchStart={(e) => onRotateHandleMouseDown(e, shape)}
            title="Rotate shape"
          >
            <RefreshCwIcon size={HANDLE_SIZE * 0.6} />
          </div>

          
          <div
            className="absolute -bottom-3 -right-3 bg-primary text-primary-foreground rounded-full p-1 cursor-nwse-resize flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }}
            onMouseDown={(e) => onResizeHandleMouseDown(e, shape)}
            onTouchStart={(e) => onResizeHandleMouseDown(e, shape)}
            title="Resize shape"
          >
            <MoveIcon size={HANDLE_SIZE * 0.6} />
          </div>
        </>
      )}
    </div>
  );
}
