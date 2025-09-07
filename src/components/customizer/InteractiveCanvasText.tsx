
"use client";

import type { CanvasText } from '@/contexts/UploadContext';
import { Trash2, RefreshCwIcon, MoveIcon } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import React from 'react';

const HANDLE_SIZE = 24;

interface InteractiveCanvasTextProps {
  textItem: CanvasText;
  isSelected: boolean;
  isBeingDragged: boolean;
  onTextSelect: (textId: string) => void;
  onTextSelectAndDragStart: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, textItem: CanvasText) => void;
  onRotateHandleMouseDown: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, textItem: CanvasText) => void;
  onResizeHandleMouseDown: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, textItem: CanvasText) => void;
  onRemoveHandleClick: (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>, textId: string) => void;
}

export function InteractiveCanvasText({ 
  textItem,
  isSelected,
  isBeingDragged,
  onTextSelect,
  onTextSelectAndDragStart,
  onRotateHandleMouseDown,
  onResizeHandleMouseDown,
  onRemoveHandleClick,
}: InteractiveCanvasTextProps) {
  const showHandles = isSelected && !textItem.isLocked;
  
  const dynamicZIndex = React.useMemo(() => {
    return isSelected && !textItem.isLocked ? textItem.zIndex + 100 : textItem.zIndex;
  }, [isSelected, textItem.isLocked, textItem.zIndex]);

  const textShadowValue = React.useMemo(() => textItem.shadowEnabled && (textItem.shadowOffsetX !== 0 || textItem.shadowOffsetY !== 0 || textItem.shadowBlur !== 0)
    ? `${textItem.shadowOffsetX}px ${textItem.shadowOffsetY}px ${textItem.shadowBlur}px ${textItem.shadowColor}`
    : 'none', [textItem.shadowEnabled, textItem.shadowOffsetX, textItem.shadowOffsetY, textItem.shadowBlur, textItem.shadowColor]);

  const textStrokeValue = React.useMemo(() => textItem.outlineEnabled && textItem.outlineWidth > 0
    ? `${textItem.outlineWidth}px ${textItem.outlineColor}`
    : undefined, [textItem.outlineEnabled, textItem.outlineWidth, textItem.outlineColor]);


  const style = React.useMemo(() => {
    const baseStyle: React.CSSProperties = {
      top: `${textItem.y}%`,
      left: `${textItem.x}%`,
      zIndex: dynamicZIndex,
      color: textItem.color,
      fontFamily: textItem.fontFamily,
      fontSize: `${textItem.fontSize * textItem.scale}px`,
      fontWeight: textItem.fontWeight,
      fontStyle: textItem.fontStyle,
      textDecoration: textItem.textDecoration,
      textTransform: textItem.textTransform,
      lineHeight: textItem.lineHeight,
      letterSpacing: `${textItem.letterSpacing}px`,
      transform: `translate(-50%, -50%) rotate(${textItem.rotation}deg)`,
      transition: isBeingDragged ? 'none' : 'transform 0.1s ease-out, border 0.1s ease-out, font-size 0.1s ease-out, color 0.1s ease-out',
      userSelect: 'none' as const, 
      whiteSpace: 'pre-wrap', 
      textShadow: textShadowValue,
    };
    
    if (textStrokeValue) {
        (baseStyle as any).WebkitTextStroke = textStrokeValue;
        (baseStyle as any).textStroke = textStrokeValue;
    }
    
    return baseStyle;

  }, [
      textItem.y, textItem.x, textItem.color, textItem.fontFamily, 
      textItem.fontSize, textItem.scale, textItem.rotation, isBeingDragged,
      textItem.fontWeight, textItem.fontStyle, textItem.textDecoration, textItem.textTransform,
      textItem.lineHeight, textItem.letterSpacing, 
      textShadowValue, textStrokeValue, dynamicZIndex 
  ]);
  

  return (
    <div
      id={`canvas-text-${textItem.id}`}
      className={`absolute group
                  ${textItem.isLocked ? 'cursor-not-allowed' : 'cursor-grab'}
                  ${isSelected && !textItem.isLocked ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${!textItem.isLocked ? 'hover:ring-1 hover:ring-primary/50' : ''}
                  p-1 
                  `}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (!textItem.isLocked) {
          onTextSelect(textItem.id);
        }
      }}
      onMouseDown={(e) => {
        if (!textItem.isLocked) {
          onTextSelectAndDragStart(e, textItem);
        } else {
          e.stopPropagation();
        }
      }}
      onTouchStart={(e) => {
         if (!textItem.isLocked) {
          onTextSelectAndDragStart(e, textItem);
        } else {
          e.stopPropagation();
        }
      }}
    >
      {textItem.content}
      {showHandles && (
        <>
          
          <div
            className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1 cursor-pointer hover:bg-destructive/80 transition-colors flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }}
            onClick={(e) => onRemoveHandleClick(e, textItem.id)}
            onMouseDown={(e) => e.stopPropagation()} 
            onTouchStart={(e) => { e.stopPropagation(); onRemoveHandleClick(e, textItem.id);}}
            title="Remove text"
          >
            <Trash2 size={HANDLE_SIZE * 0.6} />
          </div>

          
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-1 cursor-[grab] active:cursor-[grabbing] flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }}
            onMouseDown={(e) => onRotateHandleMouseDown(e, textItem)}
            onTouchStart={(e) => onRotateHandleMouseDown(e, textItem)}
            title="Rotate text"
          >
            <RefreshCwIcon size={HANDLE_SIZE * 0.6} />
          </div>

          
          <div
            className="absolute -bottom-3 -right-3 bg-primary text-primary-foreground rounded-full p-1 cursor-nwse-resize flex items-center justify-center"
            style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, zIndex: dynamicZIndex + 1 }}
            onMouseDown={(e) => onResizeHandleMouseDown(e, textItem)}
            onTouchStart={(e) => onResizeHandleMouseDown(e, textItem)}
            title="Resize text"
          >
            <MoveIcon size={HANDLE_SIZE * 0.6} /> 
          </div>
        </>
      )}
    </div>
  );
}
