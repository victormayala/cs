
'use server';

import { NextResponse } from 'next/server';
import { compositeImagesFast, type CompositeImagesInput } from '@/ai/flows/composite-images-fast';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';

// Define a more flexible input type for the API route
interface PreviewApiInput extends Omit<CompositeImagesInput, 'overlays' | 'baseImageDataUri'> {
    baseImageUrl: string; // URL instead of data URI
    overlays: (CanvasImage | CanvasText | CanvasShape)[];
}

export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();
    
    // The client renders text/shapes into images, so the server just receives image overlays.
    const resolvedOverlays = (body.overlays as CanvasImage[]).map(item => ({
        imageDataUri: item.dataUrl,
        mimeType: item.type || 'image/png', // Default to png if type is missing
        x: (item.x / 100) * body.baseImageWidthPx,
        y: (item.y / 100) * body.baseImageHeightPx,
        width: 'width' in item ? item.width * item.scale : 150 * item.scale,
        height: 'height' in item ? item.height * item.scale : 150 * item.scale,
        rotation: item.rotation || 0,
        zIndex: item.zIndex || 0,
    }));
    
    const compositeInput: CompositeImagesInput = {
        baseImageUrl: body.baseImageUrl, // Pass URL directly to the new flow
        baseImageWidthPx: body.baseImageWidthPx,
        baseImageHeightPx: body.baseImageHeightPx,
        overlays: resolvedOverlays,
    };

    // Call the new, faster, non-AI composition flow
    const result = await compositeImagesFast(compositeInput);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
