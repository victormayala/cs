
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';
import { generateTextImage } from '@/ai/flows/generate-text-image';
import { generateShapeImage } from '@/ai/flows/generate-shape-image';
import type { CanvasImage, CanvasText, CanvasShape, ImageTransform } from '@/contexts/UploadContext';

// Define a more flexible input type for the API route
interface PreviewApiInput extends Omit<CompositeImagesInput, 'overlays'> {
    overlays: (Partial<CanvasImage> & Partial<CanvasText> & Partial<CanvasShape> & { itemType: 'image' | 'text' | 'shape' })[];
}


export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();

    // Process overlays: generate images for text/shapes and prepare transforms
    const resolvedOverlays: ImageTransform[] = await Promise.all(
        body.overlays.map(async (item): Promise<ImageTransform> => {
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
                width: item.itemType === 'shape' ? (item as CanvasShape).width * item.scale! : 100 * item.scale!, // Approximation
                height: item.itemType === 'shape' ? (item as CanvasShape).height * item.scale! : 100 * item.scale!, // Approximation
                rotation: item.rotation || 0,
                zIndex: item.zIndex || 0,
            };
        })
    );
    
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
