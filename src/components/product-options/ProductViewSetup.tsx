
"use client";

import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Maximize2, LayersIcon, Edit3, Image as ImageIcon } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ProductOptionsForSetup {
  optionsByColor: Record<string, { views?: ProductView[] }>;
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

interface ProductViewSetupProps {
  productOptions: ProductOptionsForSetup;
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
  variationViewOverrideColor: string;
  setVariationViewOverrideColor: (color: string) => void;
  colorGroupsForSelect: string[];
}
const MAX_PRODUCT_VIEWS = 4;
export function ProductViewSetup({
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
  variationViewOverrideColor,
  setVariationViewOverrideColor,
  colorGroupsForSelect,
}: ProductViewSetupProps) {

  const viewsForCurrentVariation = productOptions.optionsByColor[variationViewOverrideColor]?.views || [];
  const currentView = viewsForCurrentVariation.find(v => v.id === activeViewId);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-lg">Variation-Specific Views</CardTitle>
        <CardDescription>
          For each color, you can define a unique set of views (images) and customization areas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="variation-override-select">Select a Color Group to Configure</Label>
          <Select
            value={variationViewOverrideColor}
            onValueChange={setVariationViewOverrideColor}
            disabled={colorGroupsForSelect.length === 0}
          >
            <SelectTrigger id="variation-override-select" className="mt-1">
              <SelectValue placeholder="Select a color..." />
            </SelectTrigger>
            <SelectContent>
              {colorGroupsForSelect.map(color => (
                <SelectItem key={color} value={color}>{color}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           {colorGroupsForSelect.length === 0 && <p className="text-xs text-muted-foreground mt-1">Add a color attribute to begin.</p>}
        </div>

        {variationViewOverrideColor && (
          <div className="border p-4 rounded-md bg-muted/20 space-y-4">
            <h4 className="text-base font-semibold text-foreground mb-1">
              Editing Views for: <span className="text-primary">{variationViewOverrideColor}</span>
            </h4>
            <div ref={imageWrapperRef} className="relative w-full aspect-square border rounded-md overflow-hidden group bg-background select-none" onMouseDown={(e) => { if (e.target === imageWrapperRef.current) setSelectedBoundaryBoxId(null); }}>
              {currentView?.imageUrl ? (
                <Image src={currentView.imageUrl} alt={currentView.name || 'Product View'} fill className="object-contain pointer-events-none w-full h-full" data-ai-hint={currentView.aiHint || "product view"} priority />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">No view selected or image missing.<br/>Select or add a view below.</p>
                </div>
              )}
              {currentView && currentView.boundaryBoxes && currentView.boundaryBoxes.map((box) => (
                <div key={`${activeViewId}-${box.id}`} className={cn("absolute transition-colors duration-100 ease-in-out group/box", selectedBoundaryBoxId === box.id ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-2 border-dashed border-accent/70 hover:border-primary hover:bg-primary/10', activeDrag?.boxId === box.id && activeDrag.type === 'move' ? 'cursor-grabbing' : 'cursor-grab')} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%`, zIndex: selectedBoundaryBoxId === box.id ? 10 : 1 }} onMouseDown={(e) => handleInteractionStart(e, box.id, 'move')} onTouchStart={(e) => handleInteractionStart(e, box.id, 'move')}>
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

            <Tabs defaultValue="views" className="w-full">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="views">Manage Views</TabsTrigger><TabsTrigger value="areas" disabled={!activeViewId}>Customization Areas</TabsTrigger></TabsList>
              <TabsContent value="views" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewsForCurrentVariation.map((view, index) => (
                         <div key={view.id} className={cn("p-3 border rounded-md", activeViewId === view.id ? 'border-primary ring-2 ring-primary' : 'bg-background')}>
                            <Label htmlFor={`viewName-${view.id}`}>View {index + 1} Name</Label>
                            <Input id={`viewName-${view.id}`} value={view.name} onChange={(e) => handleViewDetailChange(view.id, 'name', e.target.value)} className="mt-1 h-8"/>
                            
                            <Label htmlFor={`viewImageUrl-${view.id}`} className="mt-2 block">Image URL</Label>
                            <Input id={`viewImageUrl-${view.id}`} value={view.imageUrl} onChange={(e) => handleViewDetailChange(view.id, 'imageUrl', e.target.value)} placeholder="https://placehold.co/600x600.png" className="mt-1 h-8"/>
                             
                            <div className="flex gap-2 mt-3">
                              <Button onClick={() => handleSelectView(view.id)} variant="outline" size="sm" className="flex-1">
                                <Edit3 className="mr-2 h-3 w-3" /> Edit Areas
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteView(view.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                         </div>
                    ))}
                </div>
                 {viewsForCurrentVariation.length < MAX_PRODUCT_VIEWS && (
                    <Button onClick={handleAddNewView} variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add View for {variationViewOverrideColor}</Button>
                 )}
              </TabsContent>
              <TabsContent value="areas" className="mt-4">
                {!activeViewId || !currentView ? (<div className="text-center py-6 text-muted-foreground"><LayersIcon className="mx-auto h-10 w-10 mb-2" /><p>Select a view to manage its areas.</p></div>) : (<>
                    <div className="flex justify-between items-center mb-3"><h4 className="text-base font-semibold text-foreground">Areas for: <span className="text-primary">{currentView.name}</span></h4>{currentView.boundaryBoxes.length < 3 ? (<Button onClick={handleAddBoundaryBox} variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground" disabled={!activeViewId}><PlusCircle className="mr-1.5 h-4 w-4" />Add Area</Button>) : null}</div>
                    {currentView.boundaryBoxes.length > 0 ? (
                    <div className="space-y-3">
                      {currentView.boundaryBoxes.map((box) => (
                      <div key={`${box.id}-${box.name}`} className={cn("p-3 border rounded-md transition-all", selectedBoundaryBoxId === box.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-background hover:bg-muted/50', "cursor-pointer")} onClick={() => setSelectedBoundaryBoxId(box.id)}>
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
          </div>
        )}
      </CardContent>
      <AlertDialog open={isDeleteViewDialogOpen} onOpenChange={setIsDeleteViewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this view?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. It will permanently delete the view and its customization areas for this variation.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteViewDialogOpen(false); setViewIdToDelete(null);}}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteView} className={cn(buttonVariants({variant: "destructive"}))}>Delete View</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
