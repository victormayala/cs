
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Konva from 'konva';
import AppHeader from '@/components/layout/AppHeader';
import { useUploads, type CanvasImage, type CanvasText } from "@/contexts/UploadContext";
import {
  Loader2,
  ShoppingCart,
  Type,
  Layers as LayersIcon,
  UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CustomizerIconNav, { type CustomizerTool } from '@/components/customizer/CustomizerIconNav';
import TextToolPanel from '@/components/customizer/TextToolPanel';
import LayersPanel from '@/components/customizer/LayersPanel';
import UploadArea from '@/components/customizer/UploadArea';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const Stage = dynamic(() => import('react-konva').then((mod) => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then((mod) => mod.Layer), { ssr: false });
const KonvaImage = dynamic(() => import('react-konva').then((mod) => mod.Image), { ssr: false });
const KonvaText = dynamic(() => import('react-konva').then((mod) => mod.Text), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then((mod) => mod.Transformer), { ssr: false });


const useImage = (url: string | undefined): [HTMLImageElement | undefined, string] => {
    const [img, setImg] = useState<HTMLImageElement>();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!url) return;
        const imgEl = new window.Image();
        imgEl.crossOrigin = 'anonymous'; 
        const onLoad = () => {
            setStatus('loaded');
            setImg(imgEl);
        };
        const onError = () => {
            setStatus('failed');
            setImg(undefined);
        };
        imgEl.addEventListener('load', onLoad);
        imgEl.addEventListener('error', onError);
        imgEl.src = url;

        return () => {
            imgEl.removeEventListener('load', onLoad);
            imgEl.removeEventListener('error', onError);
        };
    }, [url]);

    return [img, status];
};

export interface ProductViewV2 {
  id: string;
  name: string;
  imageUrl: string;
  boundaryBoxes: { id: string; name: string; x: number; y: number; width: number; height: number; }[];
}

export interface ProductForCustomizerV2 {
  id: string;
  name: string;
  basePrice: number;
  views: ProductViewV2[];
}

const defaultProduct: ProductForCustomizerV2 = {
  id: 'v2-product-default',
  name: 'New Customizer Demo Product',
  basePrice: 20.00,
  views: [
    {
      id: 'v2-view-front',
      name: 'Front',
      imageUrl: 'https://placehold.co/800x800/f0f0f0/ccc?text=Front',
      boundaryBoxes: [
        { id: 'v2-area-1', name: 'Center Chest', x: 25, y: 25, width: 50, height: 30 },
      ],
    },
    {
      id: 'v2-view-back',
      name: 'Back',
      imageUrl: 'https://placehold.co/800x800/e0e0e0/ccc?text=Back',
       boundaryBoxes: [
        { id: 'v2-area-2', name: 'Upper Back', x: 25, y: 15, width: 50, height: 40 },
      ],
    }
  ],
};

const toolItems: CustomizerTool[] = [
    { id: "layers", label: "Layers", icon: LayersIcon },
    { id: "uploads", label: "Uploads", icon: UploadCloud },
    { id: "text", label: "Text", icon: Type },
];

interface SelectableItem {
  id: string;
  type: 'image' | 'text';
}

function CustomizerV2Layout() {
  const { toast } = useToast();
  const { 
      canvasImages, canvasTexts,
      selectCanvasImage, selectCanvasText,
      updateCanvasImage, updateCanvasText,
      selectedCanvasImageId, selectedCanvasTextId,
  } = useUploads();

  const [product, setProduct] = useState<ProductForCustomizerV2>(defaultProduct);
  const [activeViewId, setActiveViewId] = useState<string | null>(defaultProduct.views[0]?.id || null);
  const [activeTool, setActiveTool] = useState<string>('uploads');

  const [stageSize, setStageSize] = useState({ width: 800, height: 800 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const activeViewData = product.views.find(v => v.id === activeViewId);
  const [productImage, productImageStatus] = useImage(activeViewData?.imageUrl);
  
  const trRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);

  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const size = Math.min(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
        setStageSize({
          width: size,
          height: size
        });
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    
    let selectedNode: Konva.Node | undefined;
    if (selectedItem) {
        selectedNode = layerRef.current.findOne('#' + selectedItem.id);
    }
    
    if (selectedNode) {
      trRef.current.nodes([selectedNode]);
    } else {
      trRef.current.nodes([]);
    }
    trRef.current.getLayer()?.batchDraw();
  }, [selectedItem]);


  const handleViewChange = useCallback((newViewId: string) => {
    setActiveViewId(newViewId);
  }, []);

  const handleAddToCart = () => {
    const designData = {
      productId: product.id,
      activeViewId: activeViewId,
      texts: canvasTexts.filter(t => t.viewId === activeViewId),
      images: canvasImages.filter(i => i.viewId === activeViewId),
    };

    console.log("--- Design Data for Cart ---", designData);
    toast({
      title: "Design Captured",
      description: "The design data has been logged to the browser console. 'Add to Cart' functionality is pending.",
    });
  };

  const deselectAll = () => {
      selectCanvasImage(null);
      selectCanvasText(null);
      setSelectedItem(null);
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      deselectAll();
    }
  };

  const getToolPanelContent = () => {
    switch (activeTool) {
      case "layers": return <LayersPanel activeViewId={activeViewId} />;
      case "uploads": return <UploadArea activeViewId={activeViewId} />;
      case "text": return <TextToolPanel activeViewId={activeViewId} />;
      default: return <div className="p-4">Select a tool</div>
    }
  }
  
  const CanvasImageComponent = ({ image }: { image: CanvasImage }) => {
    const [img] = useImage(image.dataUrl);
    return (
      <KonvaImage
        image={img}
        id={image.id}
        x={image.x * stageSize.width / 100}
        y={image.y * stageSize.height / 100}
        scaleX={image.scale}
        scaleY={image.scale}
        rotation={image.rotation}
        draggable
        onClick={() => {
            selectCanvasImage(image.id);
            selectCanvasText(null);
            setSelectedItem({id: image.id, type: 'image'});
        }}
        onTap={() => {
            selectCanvasImage(image.id);
            selectCanvasText(null);
            setSelectedItem({id: image.id, type: 'image'});
        }}
        onDragEnd={(e) => {
          updateCanvasImage(image.id, { 
            x: e.target.x() / stageSize.width * 100, 
            y: e.target.y() / stageSize.height * 100,
            movedFromDefault: true,
          });
        }}
        onTransformEnd={(e) => {
           const node = e.target;
           updateCanvasImage(image.id, {
            x: node.x() / stageSize.width * 100,
            y: node.y() / stageSize.height * 100,
            scale: node.scaleX(), // Assuming uniform scaling
            rotation: node.rotation(),
          });
        }}
        offsetX={img ? img.width / 2 : 0}
        offsetY={img ? img.height / 2 : 0}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-svh h-screen w-full bg-muted/20">
      <AppHeader />
      <div className="relative flex flex-1 overflow-hidden">
        <CustomizerIconNav tools={toolItems} activeTool={activeTool} setActiveTool={setActiveTool} />
        
        <div className="border-r bg-card shadow-sm flex flex-col flex-shrink-0 w-80">
            <div className="p-4 border-b">
                <h2 className="font-headline text-lg font-semibold text-foreground">
                    {toolItems.find(t => t.id === activeTool)?.label}
                </h2>
            </div>
             <div className="flex-1 overflow-y-auto">
                {getToolPanelContent()}
            </div>
        </div>

        <main ref={containerRef} className="flex-1 p-4 md:p-6 flex flex-col min-h-0 items-center justify-center">
          <div className="w-full h-full max-w-[800px] max-h-[800px] aspect-square border-dashed border-muted-foreground border-2 rounded-md">
            <Stage 
                ref={stageRef}
                width={stageSize.width} 
                height={stageSize.height}
                onClick={handleStageClick}
                onTap={handleStageClick}
                className="bg-card"
            >
              <Layer ref={layerRef}>
                {productImageStatus === 'loaded' && productImage && (
                    <KonvaImage
                        image={productImage}
                        width={stageSize.width}
                        height={stageSize.height}
                    />
                )}
                 {canvasImages.filter(i => i.viewId === activeViewId).map(image => (
                    <CanvasImageComponent key={image.id} image={image} />
                ))}
                {canvasTexts.filter(t => t.viewId === activeViewId).map(text => (
                    <KonvaText 
                        key={text.id}
                        id={text.id}
                        text={text.content}
                        x={text.x * stageSize.width / 100}
                        y={text.y * stageSize.height / 100}
                        rotation={text.rotation}
                        scaleX={text.scale}
                        scaleY={text.scale}
                        fontSize={text.fontSize}
                        fontFamily={text.fontFamily}
                        fill={text.color}
                        draggable
                        onClick={() => {
                            selectCanvasText(text.id);
                            selectCanvasImage(null);
                            setSelectedItem({id: text.id, type: 'text'});
                        }}
                        onTap={() => {
                            selectCanvasText(text.id);
                            selectCanvasImage(null);
                            setSelectedItem({id: text.id, type: 'text'});
                        }}
                        onDragEnd={(e) => {
                          updateCanvasText(text.id, { 
                            x: e.target.x() / stageSize.width * 100, 
                            y: e.target.y() / stageSize.height * 100,
                            movedFromDefault: true,
                           });
                        }}
                        onTransformEnd={(e) => {
                           const node = e.target;
                           const scaleX = node.scaleX();
                           updateCanvasText(text.id, {
                            x: node.x() / stageSize.width * 100,
                            y: node.y() / stageSize.height * 100,
                            scale: scaleX,
                            rotation: node.rotation(),
                            // Konva updates font size directly on scale, so we back-calculate
                            fontSize: node.fontSize() / scaleX,
                          });
                        }}
                        offsetX={0} // Let Konva handle centering based on its logic
                        offsetY={0}
                    />
                ))}
                <Transformer ref={trRef} />
              </Layer>
            </Stage>
          </div>
        </main>

        <div className="shadow-sm border-l bg-card flex flex-col w-80">
            <div className="flex-1 h-full overflow-y-auto p-4 space-y-4">
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Product Views</h3>
                    <div className="flex flex-wrap gap-2">
                        {product.views.map(view => (
                            <button
                                key={view.id}
                                onClick={() => handleViewChange(view.id)}
                                className={cn(
                                    "rounded-md border-2 p-1 transition-all",
                                    activeViewId === view.id ? 'border-primary ring-1 ring-primary' : 'border-transparent'
                                )}
                            >
                                <div className="w-16 h-16 bg-muted rounded-sm overflow-hidden relative">
                                <Image src={view.imageUrl} alt={view.name} fill className="object-contain" />
                                </div>
                                <p className="text-xs mt-1">{view.name}</p>
                            </button>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
      </div>

       <footer className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card shadow-md px-4 py-2 flex items-center justify-between gap-4 z-40">
            <div className="text-md font-medium text-muted-foreground truncate">
                {product.name}
            </div>
            <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-foreground">Total: ${product.basePrice.toFixed(2)}</div>
                <Button size="default" onClick={handleAddToCart}> 
                    <ShoppingCart className="mr-2 h-5 w-5" /> 
                    Add to Cart (Log Data)
                </Button>
            </div>
        </footer>
    </div>
  );
}

export default function CustomizerV2Page() {
  return (
    <UploadProvider>
      <Suspense fallback={ <div className="flex h-screen w-full items-center justify-center bg-background"> <Loader2 className="h-10 w-10 animate-spin text-primary" /></div> }>
        <CustomizerV2Layout />
      </Suspense>
    </UploadProvider>
  );
}

    