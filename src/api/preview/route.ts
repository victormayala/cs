
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';

// Define a more flexible input type for the API route
interface PreviewApiInput extends Omit<CompositeImagesInput, 'overlays' | 'baseImageDataUri'> {
    baseImageUrl: string; // URL instead of data URI
    overlays: (CanvasImage | CanvasText | CanvasShape)[];
}

// Function to fetch an image and convert it to a data URI
async function imageToDataUri(url: string): Promise<{ dataUrl: string, mimeType: string }> {
    try {
        const response = await fetch(url, {
            headers: {
                // Add a user-agent to mimic a browser and avoid some server blocks
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText} for URL: ${url}`);
        }
        const blob = await response.blob();
        
        // Use Buffer for server-side conversion
        const buffer = Buffer.from(await blob.arrayBuffer());
        const mimeType = blob.type || 'image/png';
        return { 
            dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
            mimeType: mimeType
        };
    } catch (error: any) {
        console.error(`Error converting image URL to data URI: ${url}`, error);
        // Fallback for failed fetches
        const fallbackMime = 'image/png';
        const fallbackData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent png
        return { dataUrl: `data:${fallbackMime};base64,${fallbackData}`, mimeType: fallbackMime };
    }
}


export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();

    // Convert base image URL to data URI
    const { dataUrl: baseImageDataUri, mimeType: baseImageMimeType } = await imageToDataUri(body.baseImageUrl);
    
    // The client now renders text/shapes into images, so the server just receives image overlays.
    // The `overlays` in the body now directly conform to what `CompositeImagesInput` expects.
    const resolvedOverlays = (body.overlays as CanvasImage[]).map(item => ({
        imageDataUri: item.dataUrl,
        mimeType: item.type || 'image/png',
        x: (item.x / 100) * body.baseImageWidthPx,
        y: (item.y / 100) * body.baseImageHeightPx,
        width: 'width' in item ? item.width * item.scale : 150 * item.scale,
        height: 'height' in item ? item.height * item.scale : 150 * item.scale,
        rotation: item.rotation || 0,
        zIndex: item.zIndex || 0,
    }));
    
    const compositeInput: CompositeImagesInput = {
        baseImageDataUri,
        baseImageMimeType,
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
