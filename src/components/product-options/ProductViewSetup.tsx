
"use client";

import React, { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Image as ImageIcon, Maximize2, LayersIcon, Edit3, DollarSign, Redo } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
  name: string;
  imageUrl: string;
  aiHint?: string;
  boundaryBoxes: BoundaryBox[];
  price?: number;
}

interface ProductViewSetupData {
  defaultViews: ProductView[]; 
}

interface ActiveDragState {
  type: 'move' | 'resize_br' | 'resize_bl' | 'resize_tr' | 'resize_tl';
  boxId: string;
  pointerStartX: number;
  pointerStartY: number;
  initialBoxX: number;
  initialBoxY: number;
  initialBoxWidth: number;
  initialBoxHeight: number;
  containerWidthPx: number;
  containerHeightPx: number;
}

const MIN_BOX_SIZE_PERCENT = 5;
const MAX_PRODUCT_VIEWS = 4;

interface ProductViewSetupProps {
  productOptions: ProductViewSetupData; 
  activeViewId: string | null; 
  selectedBoundaryBoxId: string | null;
  setSelectedBoundaryBoxId: (id: string | null) => void;
  handleSelectView: (viewId: string) => void;
  handleViewDetailChange: (viewId: string, field: keyof Pick<ProductView, 'name' | 'imageUrl' | 'aiHint' | 'price'>, value: string | number) => void;
  handleDeleteView: (viewId: string) => void;
  handleAddNewView: () => void;
  handleAddBoundaryBox: () => void;
  handleRemoveBoundaryBox: (boxId: string) => void;
  handleBoundaryBoxNameChange: (boxId: string, newName: string) => void;
  handleBoundaryBoxPropertyChange: (boxId: string, property: keyof Pick<BoundaryBox, 'x' | 'y' | 'width' | 'height'>, value: string) => void;
  imageWrapperRef: React.RefObject<HTMLDivElement>;
  handleInteractionStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, boxId: string, type: ActiveDragState['type']) => void;
  activeDrag: ActiveDragState | null;
  isDeleteViewDialogOpen: boolean;
  setIsDeleteViewDialogOpen: (open: boolean) => void;
  viewIdToDelete: string | null;
  setViewIdToDelete: (id: string | null) => void; 
  confirmDeleteView: () => void;
  viewType: 'Default' | 'Variation Override';
  onResetToDefault?: () => void;
}

export default function ProductViewSetup({
  productOptions,
  activeViewId,
  selectedBoundaryBoxId,
  setSelectedBoundaryBoxId,
  handleSelectView,
  handleViewDetailChange,
  handleDeleteView,
  handleAddNewView,
  handleAddBoundaryBox,
  handleRemoveBoundaryBox,
  handleBoundaryBoxNameChange,
  handleBoundaryBoxPropertyChange,
  imageWrapperRef,
  handleInteractionStart,
  activeDrag,
  isDeleteViewDialogOpen,
  setIsDeleteViewDialogOpen,
  viewIdToDelete,
  setViewIdToDelete,
  confirmDeleteView,
  viewType,
  onResetToDefault
}: ProductViewSetupProps) {
  
  if (!productOptions) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Product Views & Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading product data...</p>
        </CardContent>
      </Card>
    );
  }

  const currentView = productOptions.defaultViews.find(v => v.id === activeViewId);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-lg">{viewType} Views & Areas</CardTitle>
        <CardDescription>Define views and clickable areas for customization.</CardDescription>
         {viewType === 'Variation Override' && onResetToDefault && (
          <Button onClick={onResetToDefault} variant="outline" size="sm" className="mt-2">
            <Redo className="mr-2 h-4 w-4" />
            Reset to Default Views
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="mb-6">
          <h4 className="text-base font-semibold text-foreground mb-1">Image for: <span className="text-primary">{currentView?.name || "N/A"}</span></h4>
          <p className="text-xs text-muted-foreground mb-3">Click &amp; drag areas. Use handles to resize. Select a view in the 'Views' tab below to change image.</p>
          <div ref={imageWrapperRef} className="relative w-full aspect-square border rounded-md overflow-hidden group bg-muted/20 select-none mb-4" onMouseDown={(e) => { if (e.target === imageWrapperRef.current) setSelectedBoundaryBoxId(null); }}>
            {currentView?.imageUrl ? (
              <Image src={currentView.imageUrl} alt={currentView.name || 'Product View'} fill className="object-contain pointer-events-none w-full h-full" data-ai-hint={currentView.aiHint || "product view"} priority />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><ImageIcon className="w-16 h-16 text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No image for this view. Set URL below.</p></div>
            )}
            {currentView && currentView.boundaryBoxes && currentView.boundaryBoxes.map((box) => (
              <div key={box.id} className={cn("absolute transition-colors duration-100 ease-in-out group/box", selectedBoundaryBoxId === box.id ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-2 border-dashed border-accent/70 hover:border-primary hover:bg-primary/10', activeDrag?.boxId === box.id && activeDrag.type === 'move' ? 'cursor-grabbing' : 'cursor-grab')} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%`, zIndex: selectedBoundaryBoxId === box.id ? 10 : 1 }} onMouseDown={(e) => handleInteractionStart(e, box.id, 'move')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'move')}>
                {selectedBoundaryBoxId === box.id && (<>
                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Top-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_tr')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_tr')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nesw-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Left)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_bl')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_bl')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md cursor-nwse-resize hover:opacity-80 active:opacity-100" title="Resize (Bottom-Right)" onMouseDown={(e) => handleInteractionStart(e, box.id, 'resize_br')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'resize_br')}><Maximize2 className="w-2.5 h-2.5 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                </>)}
                <div className={cn("absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded-br-sm opacity-0 group-hover/box:opacity-100 group-[.is-selected]/box:opacity-100 transition-opacity select-none pointer-events-none", selectedBoundaryBoxId === box.id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{box.name}</div>
              </div>
            ))}
          </div>
        </div>
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="views">Views</TabsTrigger><TabsTrigger value="areas" disabled={!activeViewId}>Customization Areas</TabsTrigger></TabsList>
          <TabsContent value="views" className="mt-4">
            <div className="mb-4"><h4 className="text-sm font-medium text-muted-foreground mb-2">Select a View:</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {productOptions.defaultViews.map(view => (<Button key={view.id} variant={activeViewId === view.id ? "default" : "outline"} onClick={() => handleSelectView(view.id)} size="sm" className="flex-grow sm:flex-grow-0">{view.name}</Button>))}
              </div>
            </div><Separator className="my-4"/>
            <div>
              <div className="flex justify-between items-center mb-3"><h4 className="text-sm font-medium text-muted-foreground">{currentView ? `Editing View: ` : "Manage Views"}{currentView && <span className="text-primary font-semibold">{currentView.name}</span>}</h4>{productOptions.defaultViews.length < MAX_PRODUCT_VIEWS && (<Button onClick={handleAddNewView} variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground"><PlusCircle className="mr-1.5 h-4 w-4" />Add New View</Button>)}</div>
              {productOptions.defaultViews.length >= MAX_PRODUCT_VIEWS && !currentView && (<p className="text-xs text-muted-foreground mb-4 text-center">Maximum {MAX_PRODUCT_VIEWS} views reached.</p>)}
              {currentView && (<div className="space-y-3 p-3 border rounded-md bg-muted/20">
                  <div><Label htmlFor={`viewName-${currentView.id}`} className="text-xs mb-1 block">View Name</Label><Input id={`viewName-${currentView.id}`} value={currentView.name} onChange={(e) => handleViewDetailChange(currentView.id, 'name', e.target.value)} className="mt-1 h-8 bg-background"/></div>
                  <div><Label htmlFor={`viewImageUrl-${currentView.id}`} className="text-xs mb-1 block">Image URL</Label><Input id={`viewImageUrl-${currentView.id}`} value={currentView.imageUrl} onChange={(e) => handleViewDetailChange(currentView.id, 'imageUrl', e.target.value)} placeholder="https://placehold.co/600x600.png" className="mt-1 h-8 bg-background"/></div>
                  <div><Label htmlFor={`viewPrice-${currentView.id}`} className="text-xs mb-1 block">Surcharge for this View ($)</Label><Input id={`viewPrice-${currentView.id}`} type="number" value={currentView.price || 0} onChange={(e) => handleViewDetailChange(currentView.id, 'price', Number(e.target.value))} className="mt-1 h-8 bg-background"/></div>
                  <div><Label htmlFor={`viewAiHint-${currentView.id}`} className="text-xs mb-1 block">AI Hint <span className="text-muted-foreground/70">(for Unsplash search)</span></Label><Input id={`viewAiHint-${currentView.id}`} value={currentView.aiHint || ''} onChange={(e) => handleViewDetailChange(currentView.id, 'aiHint', e.target.value)} placeholder="e.g., t-shirt back" className="mt-1 h-8 bg-background"/></div>
                  {productOptions.defaultViews.length > 1 && (<Button variant="destructive" onClick={() => handleDeleteView(currentView!.id)} size="sm" className="w-full mt-2"><Trash2 className="mr-2 h-4 w-4" />Delete This View</Button>)}
              </div>)}
              {!currentView && productOptions.defaultViews.length > 0 && (<p className="text-sm text-muted-foreground text-center py-2">Select a view to edit or add new.</p>)}
              {!currentView && productOptions.defaultViews.length === 0 && (<p className="text-sm text-muted-foreground text-center py-2">No views. Click "Add New View".</p>)}
            </div>
          </TabsContent>
          <TabsContent value="areas" className="mt-4">
            {!activeViewId && (<div className="text-center py-6 text-muted-foreground"><LayersIcon className="mx-auto h-10 w-10 mb-2" /><p>Select a view to manage its areas.</p></div>)}
            {activeViewId && currentView && (<>
                <div className="flex justify-between items-center mb-3"><h4 className="text-base font-semibold text-foreground">Areas for: <span className="text-primary">{currentView.name}</span></h4>{currentView.boundaryBoxes.length < 3 ? (<Button onClick={handleAddBoundaryBox} variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground" disabled={!activeViewId}><PlusCircle className="mr-1.5 h-4 w-4" />Add Area</Button>) : null}</div>
                {currentView.boundaryBoxes.length > 0 ? (
                <div className="space-y-3">
                  {currentView.boundaryBoxes.map((box) => (
                  <div key={box.id} className={cn("p-3 border rounded-md transition-all", selectedBoundaryBoxId === box.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-muted/30 hover:bg-muted/50', "cursor-pointer")} onClick={() => setSelectedBoundaryBoxId(box.id)}>
                    <div className="flex justify-between items-center mb-1.5"><Input value={box.name} onChange={(e) => handleBoundaryBoxNameChange(box.id, e.target.value)} className="text-sm font-semibold text-foreground h-8 flex-grow mr-2 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring p-1" onClick={(e) => e.stopPropagation()} /><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveBoundaryBox(box.id);}} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7" title="Remove Area"><Trash2 className="h-4 w-4" /></Button></div>
                    {selectedBoundaryBoxId === box.id ? (
                    <div className="mt-3 pt-3 border-t border-border/50"><h4 className="text-xs font-medium mb-1.5 text-muted-foreground">Edit Dimensions (%):</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div><Label htmlFor={`box-x-${box.id}`} className="text-xs mb-1 block">X</Label><Input type="number" step="0.1" min="0" max="100" id={`box-x-${box.id}`} value={box.x.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'x', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-y-${box.id}`} className="text-xs mb-1 block">Y</Label><Input type="number" step="0.1" min="0" max="100" id={`box-y-${box.id}`} value={box.y.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'y', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-w-${box.id}`} className="text-xs mb-1 block">Width</Label><Input type="number" step="0.1" min={MIN_BOX_SIZE_PERCENT.toString()} max="100" id={`box-w-${box.id}`} value={box.width.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'width', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                        <div><Label htmlFor={`box-h-${box.id}`} className="text-xs mb-1 block">Height</Label><Input type="number" step="0.1" min={MIN_BOX_SIZE_PERCENT.toString()} max="100" id={`box-h-${box.id}`} value={box.height.toFixed(1)} onChange={(e) => handleBoundaryBoxPropertyChange(box.id, 'height', e.target.value)} className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()} /></div>
                      </div>
                    </div>) : (<div className="text-xs text-muted-foreground space-y-0.5"><p><strong>X:</strong> {box.x.toFixed(1)}% | <strong>Y:</strong> {box.y.toFixed(1)}%</p><p><strong>W:</strong> {box.width.toFixed(1)}% | <strong>H:</strong> {box.height.toFixed(1)}%</p></div>)}
                  </div>))}
                </div>) : (<p className="text-sm text-muted-foreground text-center py-2">No areas. Click "Add Area".</p>)}
                {currentView.boundaryBoxes.length >= 3 && (<p className="text-sm text-muted-foreground text-center py-2">Max 3 areas for this view.</p>)}
            </>)}
          </TabsContent>
        </Tabs>
      </CardContent>
      <AlertDialog open={isDeleteViewDialogOpen} onOpenChange={setIsDeleteViewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this view?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. It will permanently delete the view and its customization areas. For variation overrides, this will also remove any variant-specific image assignments for this view.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);}}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteView} className={cn(buttonVariants({variant: "destructive"}))}>Delete View</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
