
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';
import { generateTextImage } from '@/ai/flows/generate-text-image';
import { generateShapeImage } from '@/ai/flows/generate-shape-image';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';

// Define a more flexible input type for the API route
interface PreviewApiInput extends Omit<CompositeImagesInput, 'overlays' | 'baseImageDataUri'> {
    baseImageUrl: string; // URL instead of data URI
    overlays: (Partial<CanvasImage> & Partial<CanvasText> & Partial<CanvasShape> & { itemType: 'image' | 'text' | 'shape' })[];
}

// Function to fetch an image and convert it to a data URI
async function imageToDataUri(url: string): Promise<{ dataUrl: string, mimeType: string }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
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
    
    // Process overlays: generate images for text/shapes and prepare transforms
    const resolvedOverlays = await Promise.all(
        body.overlays.map(async (item) => {
            let imageDataUri: string | undefined;
            let mimeType: string = 'image/png';

            if (item.itemType === 'image' && item.dataUrl) {
                imageDataUri = item.dataUrl;
                mimeType = item.type || 'image/png';
            } else if (item.itemType === 'text') {
                const textResult = await generateTextImage({
                    text: item.content!,
                    fontFamily: item.fontFamily!,
                    fontSize: item.fontSize!,
                    color: item.color!,
                });
                imageDataUri = textResult.imageDataUri;
            } else if (item.itemType === 'shape') {
                const shapeResult = await generateShapeImage({
                    shapeType: item.shapeType!,
                    color: item.color,
                    strokeColor: item.strokeColor,
                    strokeWidth: item.strokeWidth
                });
                imageDataUri = shapeResult.imageDataUri;
            }

            if (!imageDataUri) {
                // This should not happen if logic is correct, but as a fallback:
                console.warn("Could not resolve image data for an overlay item:", item);
                throw new Error(`Failed to get image data for overlay item of type ${item.itemType}`);
            }

            return {
                imageDataUri,
                mimeType,
                x: (item.x! / 100) * body.baseImageWidthPx,
                y: (item.y! / 100) * body.baseImageHeightPx,
                width: (item.itemType === 'image' || item.itemType === 'text') ? (item.width! * (item.scale || 1)) : (item.width! * (item.scale || 1)),
                height: (item.itemType === 'image' || item.itemType === 'text') ? (item.height! * (item.scale || 1)) : (item.height! * (item.scale || 1)),
                rotation: item.rotation || 0,
                zIndex: item.zIndex || 0,
            };
        })
    );
    
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

    