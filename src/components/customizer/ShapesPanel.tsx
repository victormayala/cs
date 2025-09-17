
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUploads, type ShapeType, type CanvasShape } from '@/contexts/UploadContext';
import { Square, Circle, Shapes as ShapesIconLucide, Palette, PenLine } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import type { BoundaryBox } from '@/app/actions/productOptionsActions'; // Import BoundaryBox

interface ShapeOption {
  type: ShapeType;
  label: string;
  icon: React.ElementType;
}

const shapeOptions: ShapeOption[] = [
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'circle', label: 'Circle', icon: Circle },
];

const sanitizeHex = (hex: string): string => {
  let sanitized = hex.replace(/[^0-9a-fA-F]/g, '');
  if (sanitized.startsWith('#')) {
    sanitized = sanitized.substring(1);
  }
  if (sanitized.length > 6) {
    sanitized = sanitized.substring(0, 6);
  }
  if (sanitized.length === 3) {
    sanitized = sanitized.split('').map(char => char + char).join('');
  }
  return `#${sanitized.padEnd(6, '0').substring(0,6)}`;
};

interface ShapesPanelProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[];
}

export default function ShapesPanel({ activeViewId, boundaryBoxes }: ShapesPanelProps) {
  const { 
    addCanvasShape, 
    selectedCanvasShapeId, 
    canvasShapes, 
    updateCanvasShape,
    startInteractiveOperation,
    endInteractiveOperation
  } = useUploads();
  const { toast } = useToast();
  const selectedShape = canvasShapes.find(s => s.id === selectedCanvasShapeId && s.viewId === activeViewId);

  const [fillColorHex, setFillColorHex] = useState(selectedShape?.color || '#468189');
  const [strokeColorHex, setStrokeColorHex] = useState(selectedShape?.strokeColor || '#000000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number | string>(selectedShape?.strokeWidth ?? 0);

  useEffect(() => {
    if (selectedShape) {
      setFillColorHex(selectedShape.color);
      setStrokeColorHex(selectedShape.strokeColor);
      setCurrentStrokeWidth(selectedShape.strokeWidth);
    }
  }, [selectedShape]);

  const handleAddShape = (shapeType: ShapeType) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    addCanvasShape(shapeType, activeViewId, boundaryBoxes, {
      color: fillColorHex, 
      strokeColor: strokeColorHex,
      strokeWidth: Number(currentStrokeWidth),
    });
  };
  
  const handleFillColorBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const finalColor = sanitizeHex(e.target.value);
    setFillColorHex(finalColor); 
    if (selectedCanvasShapeId && selectedShape) {
      updateCanvasShape(selectedCanvasShapeId, { color: finalColor });
    }
  };
  
  const handleStrokeColorBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const finalColor = sanitizeHex(e.target.value);
    setStrokeColorHex(finalColor); 
     if (selectedCanvasShapeId && selectedShape) {
      updateCanvasShape(selectedCanvasShapeId, { strokeColor: finalColor });
    }
  };

  const handleStrokeWidthChange = (value: number | string) => {
    const numValue = Number(value);
    const newWidth = isNaN(numValue) ? 0 : Math.max(0, Math.min(numValue, 20));
    setCurrentStrokeWidth(value); // Keep string for direct input, but use numValue for update
    if (selectedCanvasShapeId && selectedShape) {
      updateCanvasShape(selectedCanvasShapeId, { strokeWidth: newWidth });
    }
  };
  
  const handleStrokeWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentStrokeWidth(e.target.value);
  };
  
  const handleStrokeWidthInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleStrokeWidthChange(e.target.value);
  };

  return (
    <div className="p-4 space-y-4 flex flex-col">
      <div>
        <p className="text-xs text-muted-foreground mb-3">Click a shape to add it to the canvas.</p>
        {shapeOptions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {shapeOptions.map((shape) => (
                <Button
                  key={shape.type}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-3 space-y-1 aspect-square hover:bg-accent/10"
                  onClick={() => handleAddShape(shape.type)}
                  title={`Add ${shape.label}`}
                >
                  <shape.icon className="w-8 h-8 text-secondary" />
                  <span className="text-xs text-foreground">{shape.label}</span>
                </Button>
              ))}
            </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20">
            <ShapesIconLucide className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No shapes available.</p>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex-grow space-y-4 py-2 pr-1 -mr-1">
        <Accordion type="multiple" defaultValue={['shape-colors']} className="w-full">
          <AccordionItem value="shape-colors">
            <AccordionTrigger className="font-medium text-sm py-3 px-1">
              <Palette className="mr-2 h-4 w-4 text-primary" /> Color Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-3 pb-1 px-1">
              <div className="space-y-1.5">
                <Label htmlFor="shapeFillColorSwatch" className="text-xs">Fill Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    id="shapeFillColorSwatch"
                    className="h-8 w-10 p-0.5 border-none rounded-md"
                    value={fillColorHex} 
                    onPointerDownCapture={startInteractiveOperation}
                    onPointerUpCapture={endInteractiveOperation}
                    onChange={(e) => {
                        setFillColorHex(e.target.value); 
                        if (selectedCanvasShapeId && selectedShape) {
                            updateCanvasShape(selectedCanvasShapeId, { color: e.target.value });
                        }
                    }}
                  />
                  <Input
                    id="shapeFillColorHex"
                    className="h-8 text-xs flex-grow max-w-[100px]"
                    value={fillColorHex} 
                    onChange={(e) => setFillColorHex(e.target.value)}
                    onBlur={handleFillColorBlur}
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shapeStrokeColorSwatch" className="text-xs">Outline Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    id="shapeStrokeColorSwatch"
                    className="h-8 w-10 p-0.5 border-none rounded-md"
                    value={strokeColorHex} 
                    onPointerDownCapture={startInteractiveOperation}
                    onPointerUpCapture={endInteractiveOperation}
                    onChange={(e) => {
                        setStrokeColorHex(e.target.value); 
                        if (selectedCanvasShapeId && selectedShape) {
                            updateCanvasShape(selectedCanvasShapeId, { strokeColor: e.target.value });
                        }
                    }}
                  />
                  <Input
                    id="shapeStrokeColorHex"
                    className="h-8 text-xs flex-grow max-w-[100px]"
                    value={strokeColorHex} 
                    onChange={(e) => setStrokeColorHex(e.target.value)}
                    onBlur={handleStrokeColorBlur}
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="mt-6 mb-6">
                <div className="flex justify-between items-center">
                  <Label htmlFor="shapeStrokeWidthInput" className="text-xs">Outline Width (px)</Label>
                  <Input
                    id="shapeStrokeWidthInput"
                    type="number"
                    min={0} max={20} step={0.5}
                    value={currentStrokeWidth}
                    onChange={handleStrokeWidthInputChange}
                    onBlur={handleStrokeWidthInputBlur}
                    className="h-8 w-20 text-xs"
                  />
                </div>
                <Slider
                  id="shapeStrokeWidthSlider"
                  min={0}
                  max={20}
                  step={0.5}
                  value={[Number(currentStrokeWidth)]}
                  onValueChange={([value]) => handleStrokeWidthChange(value)}
                  onPointerDownCapture={startInteractiveOperation}
                  onPointerUpCapture={endInteractiveOperation}
                  className="mt-6"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {!selectedShape && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20 mt-2">
                <PenLine className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Select a shape on the canvas to edit its properties.</p>
                <p className="text-xs text-muted-foreground mt-1">Current settings will apply to new shapes.</p>
            </div>
        )}
      </div>
    </div>
  );
}
