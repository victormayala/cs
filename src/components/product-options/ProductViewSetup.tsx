
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Maximize2, LayersIcon, Edit3, Image as ImageIcon, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Re-defining these interfaces here makes the component self-contained
interface BoundaryBox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProductView {
  id: string;
  name:string;
  imageUrl: string;
  aiHint?: string;
  boundaryBoxes: BoundaryBox[];
  price?: number;
}

interface ProductViewSetupProps {
  initialViews: ProductView[];
  variationColorName: string;
  onSaveViews: (newViews: ProductView[]) => void;
  onCancel: () => void;
}

const MIN_BOX_SIZE_PERCENT = 5;
const MAX_PRODUCT_VIEWS = 4;

export function ProductViewSetup({
  initialViews,
  variationColorName,
  onSaveViews,
  onCancel,
}: ProductViewSetupProps) {
  
  // Internal state for this editor component
  const [views, setViews] = useState<ProductView[]>(initialViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViews[0]?.id || null);
  const [selectedBoundaryBoxId, setSelectedBoundaryBoxId] = useState<string | null>(null);
  const [isDeleteViewDialogOpen, setIsDeleteViewDialogOpen] = useState(false);
  const [viewIdToDelete, setViewIdToDelete] = useState<string | null>(null);

  const imageWrapperRef = useRef<HTMLDivElement>(null);
  
  type ActiveDragState = { type: 'move' | 'resize_br' | 'resize_bl' | 'resize_tr' | 'resize_tl'; boxId: string; pointerStartX: number; pointerStartY: number; initialBoxX: number; initialBoxY: number; initialBoxWidth: number; initialBoxHeight: number; containerWidthPx: number; containerHeightPx: number; };
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const dragUpdateRef = useRef(0);

  // Set the first view as active whenever the views array changes and there's no active view
  useEffect(() => {
    if (!activeViewId && views.length > 0) {
      setActiveViewId(views[0].id);
    }
  }, [views, activeViewId]);
  
  const currentView = views.find(v => v.id === activeViewId);

  // Interaction Handlers (drag/drop for boundary boxes)
  const getPointerCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, boxId: string, type: ActiveDragState['type']) => {
    e.preventDefault(); e.stopPropagation();
    if (!currentView) return;

    const currentBox = currentView.boundaryBoxes.find(b => b.id === boxId);
    if (!currentBox || !imageWrapperRef.current) return;
    setSelectedBoundaryBoxId(boxId);
    const pointerCoords = getPointerCoords(e);
    const containerRect = imageWrapperRef.current.getBoundingClientRect();
    setActiveDrag({ type, boxId, pointerStartX: pointerCoords.x, pointerStartY: pointerCoords.y, initialBoxX: currentBox.x, initialBoxY: currentBox.y, initialBoxWidth: currentBox.width, initialBoxHeight: currentBox.height, containerWidthPx: containerRect.width, containerHeightPx: containerRect.height });
  };
  
  const handleDragging = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!activeDrag || !imageWrapperRef.current) return;
    e.preventDefault();
    cancelAnimationFrame(dragUpdateRef.current);
    dragUpdateRef.current = requestAnimationFrame(() => {
        const pointerCoords = getPointerCoords(e);
        let deltaXPercent = ((pointerCoords.x - activeDrag.pointerStartX) / activeDrag.containerWidthPx) * 100;
        let deltaYPercent = ((pointerCoords.y - activeDrag.pointerStartY) / activeDrag.containerHeightPx) * 100;
        let newX = activeDrag.initialBoxX, newY = activeDrag.initialBoxY, newWidth = activeDrag.initialBoxWidth, newHeight = activeDrag.initialBoxHeight;
        
        if (activeDrag.type === 'move') { newX += deltaXPercent; newY += deltaYPercent; } else {
            if (activeDrag.type.includes('_br')) { newWidth += deltaXPercent; newHeight += deltaYPercent; }
            if (activeDrag.type.includes('_bl')) { newX += deltaXPercent; newWidth -= deltaXPercent; newHeight += deltaYPercent; }
            if (activeDrag.type.includes('_tr')) { newY += deltaYPercent; newWidth += deltaXPercent; newHeight -= deltaYPercent; }
            if (activeDrag.type.includes('_tl')) { newX += deltaXPercent; newY += deltaYPercent; newWidth -= deltaXPercent; newHeight -= deltaYPercent; }
        }

        newWidth = Math.max(MIN_BOX_SIZE_PERCENT, newWidth); newHeight = Math.max(MIN_BOX_SIZE_PERCENT, newHeight);
        newX = Math.max(0, Math.min(newX, 100 - newWidth)); newY = Math.max(0, Math.min(newY, 100 - newHeight));

        setViews(currentViews => currentViews.map(view => view.id === activeViewId ? { ...view, boundaryBoxes: view.boundaryBoxes.map(b => b.id === activeDrag.boxId ? { ...b, x: newX, y: newY, width: newWidth, height: newHeight } : b) } : view));
    });
  }, [activeDrag, activeViewId]);
  
  const handleInteractionEnd = React.useCallback(() => {
      cancelAnimationFrame(dragUpdateRef.current);
      setActiveDrag(null);
  }, []);

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('mousemove', handleDragging); window.addEventListener('touchmove', handleDragging, { passive: false });
      window.addEventListener('mouseup', handleInteractionEnd); window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragging); window.removeEventListener('touchmove', handleDragging);
      window.removeEventListener('mouseup', handleInteractionEnd); window.removeEventListener('touchend', handleInteractionEnd);
      cancelAnimationFrame(dragUpdateRef.current);
    };
  }, [activeDrag, handleDragging, handleInteractionEnd]);


  // State Update Handlers
  const handleSelectView = (viewId: string) => { setActiveViewId(viewId); setSelectedBoundaryBoxId(null); };

  const handleAddNewView = () => {
    setViews(prev => {
        if (prev.length >= MAX_PRODUCT_VIEWS) return prev;
        const newView: ProductView = { id: crypto.randomUUID(), name: `View ${prev.length + 1}`, imageUrl: 'https://placehold.co/600x600/eee/ccc.png?text=New+View', aiHint: 'product view', boundaryBoxes: [], price: 0 };
        setActiveViewId(newView.id);
        setSelectedBoundaryBoxId(null);
        return [...prev, newView];
    });
  };

  const handleViewDetailChange = (viewId: string, field: keyof Omit<ProductView, 'id' | 'boundaryBoxes'>, value: string | number) => {
    setViews(prev => prev.map(v => v.id === viewId ? { ...v, [field]: value } : v));
  };

  const confirmDeleteView = () => {
    if (!viewIdToDelete) return;
    setViews(prev => {
        const remainingViews = prev.filter(v => v.id !== viewIdToDelete);
        if (activeViewId === viewIdToDelete) {
            setActiveViewId(remainingViews[0]?.id || null);
        }
        return remainingViews;
    });
    setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);
  };
  
  const handleAddBoundaryBox = () => {
    if (!currentView || currentView.boundaryBoxes.length >= 3) return;
    const newBox: BoundaryBox = { id: crypto.randomUUID(), name: `Area ${currentView.boundaryBoxes.length + 1}`, x: 10 + currentView.boundaryBoxes.length * 5, y: 10 + currentView.boundaryBoxes.length * 5, width: 30, height: 20 };
    setViews(prev => prev.map(v => v.id === activeViewId ? { ...v, boundaryBoxes: [...v.boundaryBoxes, newBox] } : v));
    setSelectedBoundaryBoxId(newBox.id);
  };

  const handleRemoveBoundaryBox = (boxId: string) => {
    setViews(prev => prev.map(v => v.id === activeViewId ? { ...v, boundaryBoxes: v.boundaryBoxes.filter(b => b.id !== boxId) } : v));
    if (selectedBoundaryBoxId === boxId) setSelectedBoundaryBoxId(null);
  };

  const handleBoundaryBoxNameChange = (boxId: string, newName: string) => {
    setViews(prev => prev.map(view => view.id === activeViewId ? { ...view, boundaryBoxes: view.boundaryBoxes.map(box => box.id === boxId ? { ...box, name: newName } : box) } : view));
  };
  
  const handleBoundaryBoxPropertyChange = (boxId: string, property: keyof Pick<BoundaryBox, 'x'|'y'|'width'|'height'>, value: string) => {
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) return;
    setViews(prev => prev.map(view => view.id === activeViewId ? { ...view, boundaryBoxes: view.boundaryBoxes.map(box => box.id === boxId ? { ...box, [property]: parsedValue } : box) } : view));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-lg">Variation View Editor</CardTitle>
        <CardDescription>
          Editing views and customization areas for: <span className="font-semibold text-primary">{variationColorName}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div ref={imageWrapperRef} className="relative w-full aspect-square border rounded-md overflow-hidden group bg-background select-none" onMouseDown={(e) => { if (e.target === imageWrapperRef.current) setSelectedBoundaryBoxId(null); }}>
          {currentView?.imageUrl ? (
            <Image src={currentView.imageUrl} alt={currentView.name || 'Product View'} fill className="object-contain pointer-events-none w-full h-full" data-ai-hint={currentView.aiHint || "product view"} priority />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <ImageIcon className="w-16 h-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2 text-center">No view selected or image missing.<br/>Select or add a view below.</p>
            </div>
          )}
          {currentView?.boundaryBoxes.map((box, index) => (
            <div key={`${activeViewId}-${box.id}-${index}`} className={cn("absolute transition-colors duration-100 ease-in-out group/box", selectedBoundaryBoxId === box.id ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-2 border-dashed border-accent/70 hover:border-primary hover:bg-primary/10', activeDrag?.boxId === box.id && activeDrag.type === 'move' ? 'cursor-grabbing' : 'cursor-grab')} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%`, zIndex: selectedBoundaryBoxId === box.id ? 10 : 1 }} onMouseDown={(e) => handleInteractionStart(e, box.id, 'move')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'move')}>
              {selectedBoundaryBoxId === box.id && (<>
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tr')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tr')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_bl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_bl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_br')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_br')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
              </>)}
              <div className={cn("absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded-br-sm opacity-0 group-hover/box:opacity-100 transition-opacity select-none pointer-events-none", selectedBoundaryBoxId === box.id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{box.name}</div>
            </div>
          ))}
        </div>
        
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="views">Manage Views</TabsTrigger><TabsTrigger value="areas" disabled={!activeViewId}>Customization Areas</TabsTrigger></TabsList>
          <TabsContent value="views" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {views.map((view, index) => (
                      <div key={view.id} className={cn("p-3 border rounded-md", activeViewId === view.id ? 'border-primary ring-2 ring-primary' : 'bg-background')}>
                        <Label htmlFor={`viewName-${view.id}`}>View {index + 1} Name</Label>
                        <Input id={`viewName-${view.id}`} value={view.name} onChange={(e) => handleViewDetailChange(view.id, 'name', e.target.value)} className="mt-1 h-8"/>
                        
                        <Label htmlFor={`viewImageUrl-${view.id}`} className="mt-2 block">Image URL</Label>
                        <Input id={`viewImageUrl-${view.id}`} value={view.imageUrl} onChange={(e) => handleViewDetailChange(view.id, 'imageUrl', e.target.value)} placeholder="https://placehold.co/600x600.png" className="mt-1 h-8"/>
                          
                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => handleSelectView(view.id)} variant="outline" size="sm" className="flex-1">
                            <Edit3 className="mr-2 h-3 w-3" /> Edit Areas
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { setViewIdToDelete(view.id); setIsDeleteViewDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                ))}
            </div>
              {views.length < MAX_PRODUCT_VIEWS && (
                <Button onClick={handleAddNewView} variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add View for {variationColorName}</Button>
              )}
          </TabsContent>
          <TabsContent value="areas" className="mt-4">
            {!activeViewId || !currentView ? (<div className="text-center py-6 text-muted-foreground"><LayersIcon className="mx-auto h-10 w-10 mb-2" /><p>Select a view to manage its areas.</p></div>) : (<>
                <div className="flex justify-between items-center mb-3"><h4 className="text-base font-semibold text-foreground">Areas for: <span className="text-primary">{currentView.name}</span></h4>{currentView.boundaryBoxes.length < 3 ? (<Button onClick={handleAddBoundaryBox} variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground" disabled={!activeViewId}><PlusCircle className="mr-1.5 h-4 w-4" />Add Area</Button>) : null}</div>
                {currentView.boundaryBoxes.length > 0 ? (
                <div className="space-y-3">
                  {currentView.boundaryBoxes.map((box, index) => (
                  <div key={`${box.id}-${index}`} className={cn("p-3 border rounded-md transition-all", selectedBoundaryBoxId === box.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-background hover:bg-muted/50', "cursor-pointer")} onClick={() => setSelectedBoundaryBoxId(box.id)}>
                    <div className="flex justify-between items-center mb-1.5"><Input value={box.name} onChange={(e) => handleBoundaryBoxNameChange(box.id, e.target.value)} className="text-sm font-semibold text-foreground h-8 flex-grow mr-2 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring p-1" onClick={(e) => e.stopPropagation()} /><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveBoundaryBox(box.id);}} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7" title="Remove Area"><Trash2 className="h-4 w-4" /></Button></div>
                    {selectedBoundaryBoxId === box.id ? (
                    <div className="mt-3 pt-3 border-t border-border/50"><h4 className="text-xs font-medium mb-1.5 text-muted-foreground">Edit Dimensions (%):</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div><Label htmlFor={`box-x-${box.id}`} className="text-xs mb-1 block">X</Label><Input type="number" step="0.1" min="0" max="100" id={`box-x-${box.id}`} value={box.x.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'x', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-y-${box.id}`} className="text-xs mb-1 block">Y</Label><Input type="number" step="0.1" min="0" max="100" id={`box-y-${box.id}`} value={box.y.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'y', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-w-${box.id}`} className="text-xs mb-1 block">Width</Label><Input type="number" step="0.1" min="5" max="100" id={`box-w-${box.id}`} value={box.width.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'width', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-h-${box.id}`} className="text-xs mb-1 block">Height</Label><Input type="number" step="0.1" min="5" max="100" id={`box-h-${box.id}`} value={box.height.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'height', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                      </div>
                    </div>) : (<div className="text-xs text-muted-foreground space-y-0.5"><p><strong>X:</strong> {box.x.toFixed(1)}% | <strong>Y:</strong> {box.y.toFixed(1)}%</p><p><strong>W:</strong> {box.width.toFixed(1)}% | <strong>H:</strong> {box.height.toFixed(1)}%</p></div>)}
                  </div>))}
                </div>) : (<p className="text-sm text-muted-foreground text-center py-2">No areas. Click "Add Area".</p>)}
                {currentView.boundaryBoxes.length >= 3 && (<p className="text-sm text-muted-foreground text-center py-2">Max 3 areas for this view.</p>)}
            </>)}
          </TabsContent>
        </Tabs>
      </CardContent>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSaveViews(views)}>
          <Save className="mr-2 h-4 w-4" />
          Save and Close
        </Button>
      </div>
      <AlertDialog open={isDeleteViewDialogOpen} onOpenChange={setIsDeleteViewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this view?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. It will permanently delete the view and its customization areas for this variation.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);}}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteView} className={cn(buttonVariants({variant: "destructive"}))}>Delete View</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
