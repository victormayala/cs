'use client';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { googleFonts } from '@/lib/google-fonts';
import type Konva from 'konva';
import useImageDefault from 'use-image'; // Import the hook

// Represents a file uploaded by the user
export interface UploadedImage {
  id: string; // Unique ID for the uploaded file itself
  name: string;
  dataUrl: string; // Will now always be a Base64 data URI
  type: string; // e.g., 'image/png'
}

// Represents an instance of an image on the canvas
export interface CanvasImage {
  id: string; // Unique ID for THIS INSTANCE on the canvas
  sourceImageId: string; // ID of the original UploadedImage or a clipart ID
  viewId: string; // ID of the product view this image belongs to
  name: string;
  dataUrl: string; // Will now always be a Base64 data URI
  type: string;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  x: number; // percentage for left
  y: number; // percentage for top
  zIndex: number;
  isLocked: boolean;
  itemType: 'image';
  movedFromDefault?: boolean;
}

// Represents an instance of a text element on the canvas
export interface CanvasText {
  id: string;
  viewId: string; // ID of the product view this text belongs to
  content: string;
  x: number; // percentage for left
  y: number; // percentage for top
  rotation: number;
  scale: number; // General scale, also affects visual font size
  zIndex: number;
  isLocked: boolean;
  itemType: 'text'; // To help differentiate in combined lists

  // Font Settings
  fontFamily: string;
  fontSize: number; // Base font size in px, will be multiplied by scale
  textTransform: 'none' | 'uppercase' | 'lowercase';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  lineHeight: number; // Multiplier, e.g., 1.2
  letterSpacing: number; // In px

  // Color Settings
  color: string; // Text fill color
  outlineEnabled: boolean;
  outlineColor: string;
  outlineWidth: number; // In px
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOffsetX: number; // In px
  shadowOffsetY: number; // In px
  shadowBlur: number; // In px

  // Arch Effect
  archAmount: number; // e.g., -100 to 100 for curvature intensity (0 means no arch)

  movedFromDefault?: boolean;
}

// Represents an instance of a shape on the canvas
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star'; // Add more as needed

export interface CanvasShape {
  id: string;
  viewId: string; // ID of the product view this shape belongs to
  shapeType: ShapeType;
  x: number; // percentage for left (center of shape)
  y: number; // percentage for top (center of shape)
  width: number; // base width in px
  height: number; // base height in px
  rotation: number;
  scale: number;
  color: string; // fill color
  strokeColor: string;
  strokeWidth: number;
  zIndex: number;
  isLocked: boolean;
  itemType: 'shape';
  movedFromDefault?: boolean;
}

// Snapshot of the entire canvas state for history
export interface CanvasStateSnapshot {
  images: CanvasImage[];
  texts: CanvasText[];
  shapes: CanvasShape[];
  selectedCanvasImageId?: string | null;
  selectedCanvasTextId?: string | null;
  selectedCanvasShapeId?: string | null;
}

// Helper type for combined operations
type CanvasItem = (CanvasImage & { itemType: 'image' }) | (CanvasText & { itemType: 'text' }) | (CanvasShape & { itemType: 'shape' });

export interface ImageTransform {
  imageDataUri: string;
  mimeType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}


const HISTORY_LIMIT = 30;

interface UploadContextType {
  uploadedImages: UploadedImage[];
  addUploadedImage: (file: File) => Promise<void>;
  
  canvasImages: CanvasImage[];
  addCanvasImage: (sourceImageId: string, viewId: string) => void;
  addCanvasImageFromUrl: (name: string, dataUrl: string, type: string, viewId: string, sourceId?: string) => void;
  removeCanvasImage: (canvasImageId: string) => void;
  selectedCanvasImageId: string | null;
  selectCanvasImage: (canvasImageId: string | null) => void;
  updateCanvasImage: (canvasImageId: string, updates: Partial<CanvasImage>) => void;
  bringLayerForward: (canvasImageId: string) => void;
  sendLayerBackward: (canvasImageId: string) => void;
  duplicateCanvasImage: (canvasImageId: string) => void; 
  toggleLockCanvasImage: (canvasImageId: string) => void;

  canvasTexts: CanvasText[];
  addCanvasText: (content: string, viewId: string, initialStyle?: Partial<CanvasText>) => void;
  removeCanvasText: (canvasTextId: string) => void;
  selectedCanvasTextId: string | null;
  selectCanvasText: (canvasTextId: string | null) => void;
  updateCanvasText: (canvasTextId: string, updates: Partial<CanvasText>) => void;
  bringTextLayerForward: (canvasTextId: string) => void;
  sendTextLayerBackward: (canvasTextId: string) => void;
  duplicateCanvasText: (canvasTextId: string) => void;
  toggleLockCanvasText: (canvasTextId: string) => void;

  canvasShapes: CanvasShape[];
  addCanvasShape: (shapeType: ShapeType, viewId: string, initialProps?: Partial<CanvasShape>) => void;
  removeCanvasShape: (shapeId: string) => void;
  selectedCanvasShapeId: string | null;
  selectCanvasShape: (shapeId: string | null) => void;
  updateCanvasShape: (shapeId: string, updates: Partial<CanvasShape>) => void;
  bringShapeLayerForward: (shapeId: string) => void;
  sendShapeLayerBackward: (shapeId: string) => void;
  duplicateCanvasShape: (shapeId: string) => void;
  toggleLockCanvasShape: (shapeId: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  startInteractiveOperation: () => void;
  endInteractiveOperation: () => void;
  restoreFromSnapshot: (snapshot: Partial<CanvasStateSnapshot>) => void;

  // New function to provide access to the Konva stage for exporting
  getStageRef: () => React.RefObject<Konva.Stage> | null;
  useImage: typeof useImageDefault;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const [selectedCanvasImageId, setSelectedCanvasImageId] = useState<string | null>(null);

  const [canvasTexts, setCanvasTexts] = useState<CanvasText[]>([]);
  const [selectedCanvasTextId, setSelectedCanvasTextId] = useState<string | null>(null);
  
  const [canvasShapes, setCanvasShapes] = useState<CanvasShape[]>([]);
  const [selectedCanvasShapeId, setSelectedCanvasShapeId] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<CanvasStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasStateSnapshot[]>([]);

  const isInteractiveOperationInProgressRef = useRef(false);
  const stageRef = useRef<Konva.Stage>(null); // Ref for the Konva stage

  const getStageRef = useCallback(() => stageRef, []);

  const createSnapshot = useCallback((): CanvasStateSnapshot => ({
    images: canvasImages,
    texts: canvasTexts,
    shapes: canvasShapes,
    selectedCanvasImageId,
    selectedCanvasTextId,
    selectedCanvasShapeId,
  }), [canvasImages, canvasTexts, canvasShapes, selectedCanvasImageId, selectedCanvasTextId, selectedCanvasShapeId]);

  const pushToUndoStack = useCallback((snapshot: CanvasStateSnapshot) => {
    setUndoStack(prev => [snapshot, ...prev].slice(0, HISTORY_LIMIT));
    setRedoStack([]);
  }, []);
  
  useEffect(() => {
    if (undoStack.length === 0 && !isInteractiveOperationInProgressRef.current) {
        pushToUndoStack({ images: [], texts: [], shapes: [], selectedCanvasImageId: null, selectedCanvasTextId: null, selectedCanvasShapeId: null });
    }
  }, [pushToUndoStack, undoStack.length]);


  const restoreState = useCallback((snapshot: CanvasStateSnapshot) => {
    setCanvasImages(snapshot.images);
    setCanvasTexts(snapshot.texts);
    setCanvasShapes(snapshot.shapes);
    setSelectedCanvasImageId(snapshot.selectedCanvasImageId ?? null);
    setSelectedCanvasTextId(snapshot.selectedCanvasTextId ?? null);
    setSelectedCanvasShapeId(snapshot.selectedCanvasShapeId ?? null);
  }, []);

   const restoreFromSnapshot = useCallback((snapshot: Partial<CanvasStateSnapshot>) => {
    pushToUndoStack(createSnapshot());
    if (snapshot.images) setCanvasImages(snapshot.images);
    if (snapshot.texts) setCanvasTexts(snapshot.texts);
    if (snapshot.shapes) setCanvasShapes(snapshot.shapes);
    setSelectedCanvasImageId(snapshot.selectedCanvasImageId ?? null);
    setSelectedCanvasTextId(snapshot.selectedCanvasTextId ?? null);
    setSelectedCanvasShapeId(snapshot.selectedCanvasShapeId ?? null);
  }, [createSnapshot, pushToUndoStack]);

  const undo = useCallback(() => {
    if (isInteractiveOperationInProgressRef.current || undoStack.length <= 1) return; 
    const currentState = createSnapshot();
    setRedoStack(prev => [currentState, ...prev]);
    const prevState = undoStack[1]; 
    restoreState(prevState);
    setUndoStack(prev => prev.slice(1));
  }, [undoStack, createSnapshot, restoreState]);

  const redo = useCallback(() => {
    if (isInteractiveOperationInProgressRef.current || redoStack.length === 0) return;
    const currentState = createSnapshot();
    setUndoStack(prev => [currentState, ...prev]);
    const nextState = redoStack[0];
    restoreState(nextState);
    setRedoStack(prev => prev.slice(1));
  }, [redoStack, createSnapshot, restoreState]);

  const canUndo = undoStack.length > 1 && !isInteractiveOperationInProgressRef.current;
  const canRedo = redoStack.length > 0 && !isInteractiveOperationInProgressRef.current;

  const startInteractiveOperation = useCallback(() => {
    pushToUndoStack(createSnapshot());
    isInteractiveOperationInProgressRef.current = true;
  }, [pushToUndoStack, createSnapshot]);

  const endInteractiveOperation = useCallback(() => {
    isInteractiveOperationInProgressRef.current = false;
  }, []);


  const addUploadedImage = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                const newImage: UploadedImage = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    dataUrl,
                    type: file.type,
                };
                setUploadedImages((prev) => [...prev, newImage]);
                resolve();
            } else {
                reject(new Error("Failed to read file as data URL."));
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
  }, []);

  const getMaxZIndexForView = useCallback((viewId: string) => {
    const imageZIndexes = canvasImages.filter(img => img.viewId === viewId).map(img => img.zIndex);
    const textZIndexes = canvasTexts.filter(txt => txt.viewId === viewId).map(txt => txt.zIndex);
    const shapeZIndexes = canvasShapes.filter(shp => shp.viewId === viewId).map(shp => shp.zIndex);
    return Math.max(-1, ...imageZIndexes, ...textZIndexes, ...shapeZIndexes);
  }, [canvasImages, canvasTexts, canvasShapes]);

  // Image Functions
  const addCanvasImage = useCallback((sourceImageId: string, viewId: string) => {
    if (!viewId) { console.error("addCanvasImage: viewId is required"); return; }
    const sourceImage = uploadedImages.find(img => img.id === sourceImageId);
    if (!sourceImage) return;
    
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(viewId);
      const newCanvasImage: CanvasImage = {
        id: crypto.randomUUID(), sourceImageId: sourceImage.id, viewId, name: sourceImage.name,
        dataUrl: sourceImage.dataUrl, type: sourceImage.type, 
        width: 150, height: 150, // Default size
        scale: 1, rotation: 0, 
        x: 50, y: 50, zIndex: currentMaxZIndex + 1, isLocked: false, itemType: 'image',
        movedFromDefault: false,
      };
      setCanvasImages(prev => [...prev, newCanvasImage]);
      setSelectedCanvasImageId(newCanvasImage.id);
      setSelectedCanvasTextId(null); setSelectedCanvasShapeId(null);
    });
  }, [uploadedImages, getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const addCanvasImageFromUrl = useCallback((name: string, dataUrl: string, type: string, viewId: string, sourceId?: string) => {
    if (!viewId) { console.error("addCanvasImageFromUrl: viewId is required"); return; }

    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(viewId);
      const newCanvasImage: CanvasImage = {
        id: crypto.randomUUID(), sourceImageId: sourceId || `url-${crypto.randomUUID()}`, viewId,
        name: name, dataUrl: dataUrl, type: type, 
        width: 150, height: 150, // Default size
        scale: 1, rotation: 0, 
        x: 50, y: 50, zIndex: currentMaxZIndex + 1, isLocked: false, itemType: 'image',
        movedFromDefault: false,
      };
      setCanvasImages(prev => [...prev, newCanvasImage]);
      setSelectedCanvasImageId(newCanvasImage.id);
      setSelectedCanvasTextId(null); setSelectedCanvasShapeId(null);
    });
  }, [getMaxZIndexForView, createSnapshot, pushToUndoStack]);


  const removeCanvasImage = useCallback((canvasImageId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasImages(prev => prev.filter(img => img.id !== canvasImageId));
      if (selectedCanvasImageId === canvasImageId) setSelectedCanvasImageId(null);
    });
  }, [selectedCanvasImageId, createSnapshot, pushToUndoStack]);

  const selectCanvasImage = useCallback((canvasImageId: string | null) => {
    setSelectedCanvasImageId(canvasImageId);
    if (canvasImageId !== null) {
      setSelectedCanvasTextId(null); setSelectedCanvasShapeId(null);
    }
  }, []); 

  const updateCanvasImage = useCallback((canvasImageId: string, updates: Partial<CanvasImage>) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasImages(prev => prev.map(img => img.id === canvasImageId ? { ...img, ...updates } : img));
    });
  }, [createSnapshot, pushToUndoStack]); 

  const duplicateCanvasImage = useCallback((canvasImageId: string) => {
    const originalImage = canvasImages.find(img => img.id === canvasImageId);
    if (!originalImage) return;

    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(originalImage.viewId);
      const newCanvasImage: CanvasImage = {
        ...originalImage, id: crypto.randomUUID(), x: originalImage.x + 2, y: originalImage.y + 2, 
        zIndex: currentMaxZIndex + 1, isLocked: false, movedFromDefault: true,
      };
      setCanvasImages(prev => [...prev, newCanvasImage]);
      setSelectedCanvasImageId(newCanvasImage.id); 
      setSelectedCanvasTextId(null); setSelectedCanvasShapeId(null);
    });
  }, [canvasImages, getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const toggleLockCanvasImage = useCallback((canvasImageId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasImages(prevImages =>
        prevImages.map(img => {
          if (img.id === canvasImageId) {
            const isNowLocked = !img.isLocked;
            if (isNowLocked && selectedCanvasImageId === canvasImageId) setSelectedCanvasImageId(null);
            return { ...img, isLocked: isNowLocked };
          }
          return img;
        })
      );
    });
  }, [selectedCanvasImageId, createSnapshot, pushToUndoStack]);

  // Text Functions
  const addCanvasText = useCallback((content: string, viewId: string, initialStyle?: Partial<CanvasText>) => {
    if (!viewId) { console.error("addCanvasText: viewId is required"); return; }
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(viewId);
      const defaultFont = googleFonts.find(f => f.name === 'Arial');
      
      const newText: CanvasText = {
        id: crypto.randomUUID(), viewId, content, x: 50, y: 50, rotation: 0, scale: 1, 
        zIndex: currentMaxZIndex + 1, isLocked: false, itemType: 'text',
        fontFamily: initialStyle?.fontFamily || (defaultFont ? defaultFont.family : 'Arial, sans-serif'),
        fontSize: initialStyle?.fontSize || 24, 
        textTransform: initialStyle?.textTransform || 'none',
        fontWeight: initialStyle?.fontWeight || 'normal', fontStyle: initialStyle?.fontStyle || 'normal',
        textDecoration: initialStyle?.textDecoration || 'none', lineHeight: initialStyle?.lineHeight || 1.2, 
        letterSpacing: initialStyle?.letterSpacing || 0,
        color: initialStyle?.color || '#333333',
        outlineEnabled: (initialStyle?.outlineWidth ?? 0) > 0,
        outlineColor: initialStyle?.outlineColor || '#000000',
        outlineWidth: initialStyle?.outlineWidth || 0,
        shadowEnabled: (initialStyle?.shadowOffsetX ?? 0) !== 0 ||
                      (initialStyle?.shadowOffsetY ?? 0) !== 0 ||
                      (initialStyle?.shadowBlur ?? 0) !== 0,
        shadowColor: initialStyle?.shadowColor || '#000000',
        shadowOffsetX: initialStyle?.shadowOffsetX || 0,
        shadowOffsetY: initialStyle?.shadowOffsetY || 0,
        shadowBlur: initialStyle?.shadowBlur || 0,
        archAmount: initialStyle?.archAmount || 0,
        movedFromDefault: false,
      };
      setCanvasTexts(prev => [...prev, newText]);
      setSelectedCanvasTextId(newText.id);
      setSelectedCanvasImageId(null); setSelectedCanvasShapeId(null);
    });
  }, [getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const removeCanvasText = useCallback((canvasTextId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasTexts(prev => prev.filter(txt => txt.id !== canvasTextId));
      if (selectedCanvasTextId === canvasTextId) setSelectedCanvasTextId(null);
    });
  }, [selectedCanvasTextId, createSnapshot, pushToUndoStack]);

  const selectCanvasText = useCallback((canvasTextId: string | null) => {
    setSelectedCanvasTextId(canvasTextId);
    if (canvasTextId !== null) {
      setSelectedCanvasImageId(null); setSelectedCanvasShapeId(null);
    }
  }, []);

  const updateCanvasText = useCallback((canvasTextId: string, updates: Partial<CanvasText>) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasTexts(prev => prev.map(txt => {
        if (txt.id === canvasTextId) {
          const newValues = { ...txt, ...updates };
          
          if (updates.outlineWidth !== undefined) {
            newValues.outlineEnabled = updates.outlineWidth > 0;
          }
          
          if (updates.shadowOffsetX !== undefined || updates.shadowOffsetY !== undefined || updates.shadowBlur !== undefined) {
            const offX = updates.shadowOffsetX !== undefined ? updates.shadowOffsetX : newValues.shadowOffsetX;
            const offY = updates.shadowOffsetY !== undefined ? updates.shadowOffsetY : newValues.shadowOffsetY;
            const blur = updates.shadowBlur !== undefined ? updates.shadowBlur : newValues.shadowBlur;
            newValues.shadowEnabled = offX !== 0 || offY !== 0 || blur !== 0;
          }
          return newValues;
        }
        return txt;
      }));
    });
  }, [createSnapshot, pushToUndoStack]);

  const duplicateCanvasText = useCallback((canvasTextId: string) => {
    const originalText = canvasTexts.find(txt => txt.id === canvasTextId);
    if (!originalText) return;

    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(originalText.viewId);
      const newText: CanvasText = {
        ...originalText, id: crypto.randomUUID(), x: originalText.x + 2, y: originalText.y + 2,
        zIndex: currentMaxZIndex + 1, isLocked: false, movedFromDefault: true,
      };
      setCanvasTexts(prev => [...prev, newText]);
      setSelectedCanvasTextId(newText.id);
      setSelectedCanvasImageId(null); setSelectedCanvasShapeId(null);
    });
  }, [canvasTexts, getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const toggleLockCanvasText = useCallback((canvasTextId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasTexts(prevTexts =>
        prevTexts.map(txt => {
          if (txt.id === canvasTextId) {
            const isNowLocked = !txt.isLocked;
            if (isNowLocked && selectedCanvasTextId === canvasTextId) setSelectedCanvasTextId(null);
            return { ...txt, isLocked: isNowLocked };
          }
          return txt;
        })
      );
    });
  }, [selectedCanvasTextId, createSnapshot, pushToUndoStack]);

  // Shape Functions
  const addCanvasShape = useCallback((shapeType: ShapeType, viewId: string, initialProps?: Partial<CanvasShape>) => {
    if (!viewId) { console.error("addCanvasShape: viewId is required"); return; }

    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(viewId);
      const defaultProps: CanvasShape = {
        id: crypto.randomUUID(), viewId, shapeType, x: 50, y: 50,
        width: 100, height: 100, rotation: 0, scale: 1,
        color: initialProps?.color || '#468189', strokeColor: initialProps?.strokeColor || '#000000',
        strokeWidth: initialProps?.strokeWidth || 0, zIndex: currentMaxZIndex + 1,
        isLocked: false, itemType: 'shape',
        movedFromDefault: false, ...initialProps,
      };
      if (shapeType === 'circle') { defaultProps.height = defaultProps.width; }

      setCanvasShapes(prev => [...prev, defaultProps]);
      setSelectedCanvasShapeId(defaultProps.id);
      setSelectedCanvasImageId(null); setSelectedCanvasTextId(null);
    });
  }, [getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const removeCanvasShape = useCallback((shapeId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasShapes(prev => prev.filter(shp => shp.id !== shapeId));
      if (selectedCanvasShapeId === shapeId) setSelectedCanvasShapeId(null);
    });
  }, [selectedCanvasShapeId, createSnapshot, pushToUndoStack]);

  const selectCanvasShape = useCallback((shapeId: string | null) => {
    setSelectedCanvasShapeId(shapeId);
    if (shapeId !== null) {
      setSelectedCanvasImageId(null); setSelectedCanvasTextId(null);
    }
  }, []);

  const updateCanvasShape = useCallback((shapeId: string, updates: Partial<CanvasShape>) => {
     queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasShapes(prev => prev.map(shp => shp.id === shapeId ? { ...shp, ...updates } : shp));
    });
  }, [createSnapshot, pushToUndoStack]);

  const duplicateCanvasShape = useCallback((shapeId: string) => {
    const originalShape = canvasShapes.find(shp => shp.id === shapeId);
    if (!originalShape) return;

    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      const currentMaxZIndex = getMaxZIndexForView(originalShape.viewId);
      const newShape: CanvasShape = {
        ...originalShape, id: crypto.randomUUID(), x: originalShape.x + 2, y: originalShape.y + 2,
        zIndex: currentMaxZIndex + 1, isLocked: false, movedFromDefault: true,
      };
      setCanvasShapes(prev => [...prev, newShape]);
      setSelectedCanvasShapeId(newShape.id);
      setSelectedCanvasImageId(null); setSelectedCanvasTextId(null);
    });
  }, [canvasShapes, getMaxZIndexForView, createSnapshot, pushToUndoStack]);

  const toggleLockCanvasShape = useCallback((shapeId: string) => {
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
        pushToUndoStack(createSnapshot());
      }
      setCanvasShapes(prevShapes =>
        prevShapes.map(shp => {
          if (shp.id === shapeId) {
            const isNowLocked = !shp.isLocked;
            if (isNowLocked && selectedCanvasShapeId === shapeId) setSelectedCanvasShapeId(null);
            return { ...shp, isLocked: isNowLocked };
          }
          return shp;
        })
      );
    });
  }, [selectedCanvasShapeId, createSnapshot, pushToUndoStack]);

  // Generic Layer Reordering
  const reorderLayers = useCallback((itemId: string, itemType: 'image' | 'text' | 'shape', direction: 'forward' | 'backward') => {
    const sourceItem = 
      itemType === 'image' ? canvasImages.find(i => i.id === itemId) :
      itemType === 'text' ? canvasTexts.find(t => t.id === itemId) :
      canvasShapes.find(s => s.id === itemId);

    if (!sourceItem || sourceItem.isLocked) return;
    const currentViewId = sourceItem.viewId;
    
    queueMicrotask(() => {
      if (!isInteractiveOperationInProgressRef.current) {
          pushToUndoStack(createSnapshot());
      }

      let itemsInCurrentView: CanvasItem[] = [
        ...canvasImages.filter(img => img.viewId === currentViewId).map(img => ({ ...img, itemType: 'image' as const })),
        ...canvasTexts.filter(txt => txt.viewId === currentViewId).map(txt => ({ ...txt, itemType: 'text' as const })),
        ...canvasShapes.filter(shp => shp.viewId === currentViewId).map(shp => ({ ...shp, itemType: 'shape' as const })),
      ];
      itemsInCurrentView.sort((a, b) => a.zIndex - b.zIndex);

      const currentIndexInView = itemsInCurrentView.findIndex(item => item.id === itemId && item.itemType === itemType);
      if (currentIndexInView === -1) {
        console.warn("reorderLayers: Item not found in current view for z-index operations.");
        if (!isInteractiveOperationInProgressRef.current) {
          setUndoStack(prev => prev.slice(1)); 
        }
        return;
      }

      let targetIndexInView = -1;
      if (direction === 'forward') {
        if (currentIndexInView < itemsInCurrentView.length - 1) {
          for (let i = currentIndexInView + 1; i < itemsInCurrentView.length; i++) {
            if (!itemsInCurrentView[i].isLocked) { targetIndexInView = i; break; }
          }
          if (targetIndexInView === -1) { if (!isInteractiveOperationInProgressRef.current) setUndoStack(prev => prev.slice(1)); return; } 
        } else { if (!isInteractiveOperationInProgressRef.current) setUndoStack(prev => prev.slice(1)); return; } 
      } else { 
        if (currentIndexInView > 0) {
          for (let i = currentIndexInView - 1; i >= 0; i--) {
            if (!itemsInCurrentView[i].isLocked) { targetIndexInView = i; break; }
          }
          if (targetIndexInView === -1) { if (!isInteractiveOperationInProgressRef.current) setUndoStack(prev => prev.slice(1)); return; } 
        } else { if (!isInteractiveOperationInProgressRef.current) setUndoStack(prev => prev.slice(1)); return; } 
      }
      
      const tempZIndex = itemsInCurrentView[currentIndexInView].zIndex;
      itemsInCurrentView[currentIndexInView].zIndex = itemsInCurrentView[targetIndexInView].zIndex;
      itemsInCurrentView[targetIndexInView].zIndex = tempZIndex;
      
      setCanvasImages(prevImages => prevImages.map(img => {
        const updatedImgInView = itemsInCurrentView.find(i => i.id === img.id && i.itemType === 'image' && i.viewId === currentViewId);
        return updatedImgInView ? { ...img, zIndex: updatedImgInView.zIndex } : img;
      }));
      setCanvasTexts(prevTexts => prevTexts.map(txt => {
        const updatedTxtInView = itemsInCurrentView.find(i => i.id === txt.id && i.itemType === 'text' && i.viewId === currentViewId);
        return updatedTxtInView ? { ...txt, zIndex: updatedTxtInView.zIndex } : txt;
      }));
      setCanvasShapes(prevShapes => prevShapes.map(shp => {
        const updatedShpInView = itemsInCurrentView.find(i => i.id === shp.id && i.itemType === 'shape' && i.viewId === currentViewId);
        return updatedShpInView ? { ...shp, zIndex: updatedShpInView.zIndex } : shp;
      }));
    });
  }, [canvasImages, canvasTexts, canvasShapes, createSnapshot, pushToUndoStack]);

  const bringLayerForward = useCallback((id: string) => reorderLayers(id, 'image', 'forward'), [reorderLayers]);
  const sendLayerBackward = useCallback((id: string) => reorderLayers(id, 'image', 'backward'), [reorderLayers]);
  const bringTextLayerForward = useCallback((id: string) => reorderLayers(id, 'text', 'forward'), [reorderLayers]);
  const sendTextLayerBackward = useCallback((id: string) => reorderLayers(id, 'text', 'backward'), [reorderLayers]);
  const bringShapeLayerForward = useCallback((id: string) => reorderLayers(id, 'shape', 'forward'), [reorderLayers]);
  const sendShapeLayerBackward = useCallback((id: string) => reorderLayers(id, 'shape', 'backward'), [reorderLayers]);

  return (
    <UploadContext.Provider
      value={{
        uploadedImages, addUploadedImage,
        canvasImages, addCanvasImage, addCanvasImageFromUrl, removeCanvasImage, selectedCanvasImageId, selectCanvasImage, updateCanvasImage,
        bringLayerForward, sendLayerBackward, duplicateCanvasImage, toggleLockCanvasImage,
        canvasTexts, addCanvasText, removeCanvasText, selectedCanvasTextId, selectCanvasText, updateCanvasText,
        bringTextLayerForward, sendTextLayerBackward, duplicateCanvasText, toggleLockCanvasText,
        canvasShapes, addCanvasShape, removeCanvasShape, selectedCanvasShapeId, selectCanvasShape, updateCanvasShape,
        bringShapeLayerForward, sendShapeLayerBackward, duplicateCanvasShape, toggleLockCanvasShape,
        undo, redo, canUndo, canRedo,
        startInteractiveOperation, endInteractiveOperation, restoreFromSnapshot, getStageRef,
        useImage: useImageDefault,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUploads must be used within an UploadProvider');
  }
  return context;
}

