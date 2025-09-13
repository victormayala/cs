
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';

// Define a more flexible input type for the API route
interface PreviewApiInput extends Omit<CompositeImagesInput, 'overlays'> {
    overlays: (CanvasImage | CanvasText | CanvasShape)[];
}


export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();
    
    // The client now renders text/shapes into images, so the server just receives image overlays.
    // The `overlays` in the body now directly conform to what `CompositeImagesInput` expects.
    const resolvedOverlays = (body.overlays as CanvasImage[]).map(item => ({
        imageDataUri: item.dataUrl,
        mimeType: item.type || 'image/png',
        x: (item.x / 100) * body.baseImageWidthPx,
        y: (item.y / 100) * body.baseImageHeightPx,
        width: item.itemType === 'image' && 'width' in item ? item.width * item.scale : 150 * item.scale,
        height: item.itemType === 'image' && 'height' in item ? item.height * item.scale : 150 * item.scale,
        rotation: item.rotation || 0,
        zIndex: item.zIndex || 0,
    }));
    
    const compositeInput: CompositeImagesInput = {
        baseImageDataUri: body.baseImageDataUri,
        baseImageMimeType: body.baseImageMimeType,
        baseImageWidthPx: body.baseImageWidthPx,
        baseImageHeightPx: body.baseImageHeightPx,
        overlays: resolvedOverlays,
    };

    const result = await compositeImages(compositeInput);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
