
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';
import { generateTextImage, type GenerateTextImageInput } from '@/ai/flows/generate-text-image';
import { generateShapeImage, type GenerateShapeImageInput } from '@/ai/flows/generate-shape-image';
import { z, ZodError } from 'zod';

const overlaySchema = z.object({
  type: z.enum(['image', 'text', 'shape']),
  id: z.string(),
  viewId: z.string(),
  zIndex: z.number(),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotation: z.number(),
  // Image specific
  dataUrl: z.string().optional(),
  // Text specific
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  // Shape specific
  shapeType: z.enum(['rectangle', 'circle']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
});

const requestBodySchema = z.object({
  baseImageDataUri: z.string().url(),
  baseImageWidthPx: z.number(),
  baseImageHeightPx: z.number(),
  overlays: z.array(overlaySchema),
});


async function fetchAsDataURL(url: string): Promise<string> {
    try {
        const response = await fetch('/api/proxy-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!response.ok) {
            throw new Error(`Proxy fetch failed with status ${response.status}`);
        }
        const { dataUrl } = await response.json();
        return dataUrl;
    } catch (error) {
        console.error(`Failed to proxy image ${url}:`, error);
        throw error;
    }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = requestBodySchema.parse(body);

    const { baseImageDataUri, baseImageWidthPx, baseImageHeightPx, overlays } = parsedBody;

    const compositionInput: CompositeImagesInput = {
      baseImageDataUri: baseImageDataUri,
      baseImageWidthPx,
      baseImageHeightPx,
      overlays: [],
    };
    
    // Process overlays: generate images for text and shapes
    for (const item of overlays) {
        let imageDataUri: string | undefined;

        if (item.type === 'image' && item.dataUrl) {
            imageDataUri = item.dataUrl;
        } else if (item.type === 'text' && item.content) {
            const textInput: GenerateTextImageInput = {
                text: item.content,
                fontFamily: item.fontFamily || 'Arial',
                fontSize: item.fontSize || 48,
                color: item.color || '#000000',
            };
            const textImageResult = await generateTextImage(textInput);
            imageDataUri = textImageResult.imageDataUri;
        } else if (item.type === 'shape' && item.shapeType) {
            const shapeInput: GenerateShapeImageInput = {
                shapeType: item.shapeType,
                color: item.color || '#FF0000',
                strokeColor: item.strokeColor || '#000000',
                strokeWidth: item.strokeWidth || 0,
                aspectRatio: `${item.width}:${item.height}`
            };
            const shapeImageResult = await generateShapeImage(shapeInput);
            imageDataUri = shapeImageResult.imageDataUri;
        }

        if (imageDataUri) {
            // Convert canvas percentages to pixel values for the AI
            const overlayWidth = (item.width || (item.scale * 100)); // Fallback logic
            const overlayHeight = (item.height || (item.scale * 100));

            compositionInput.overlays.push({
                imageDataUri,
                x: item.x / 100 * baseImageWidthPx,
                y: item.y / 100 * baseImageHeightPx,
                width: overlayWidth,
                height: overlayHeight,
                rotation: item.rotation,
                zIndex: item.zIndex,
            });
        }
    }

    const result = await compositeImages(compositionInput);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    if (error instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid request body.', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
