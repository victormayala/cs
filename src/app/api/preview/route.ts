'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput, type ImageTransform } from '@/ai/flows/composite-images';
import { generateTextImage, type GenerateTextImageInput } from '@/ai/flows/generate-text-image';
import { generateShapeImage, type GenerateShapeImageInput } from '@/ai/flows/generate-shape-image';
import type { CanvasImage, CanvasText, CanvasShape } from '@/contexts/UploadContext';

// Extended type that includes all possible element properties
type DesignElement = Partial<CanvasImage> & Partial<CanvasText> & Partial<CanvasShape> & {
    itemType: 'image' | 'text' | 'shape';
    viewId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
};

interface PreviewRequestBody {
  baseImageDataUri: string;
  elements: DesignElement[];
  widthPx: number; 
  heightPx: number; 
}

export async function POST(request: Request) {
  try {
    const body: PreviewRequestBody = await request.json();
    const { baseImageDataUri, elements, widthPx, heightPx } = body;

    if (!baseImageDataUri || !elements || !widthPx || !heightPx) {
      return NextResponse.json({ error: 'Missing required parameters: baseImageDataUri, elements, widthPx, heightPx.' }, { status: 400 });
    }

    const overlayTransforms: ImageTransform[] = [];

    // Process elements in parallel to generate images for text and shapes
    const processingPromises = elements.map(async (element) => {
      let imageDataUri: string | undefined;

      if (element.itemType === 'text' && element.content) {
        const textInput: GenerateTextImageInput = {
          text: element.content,
          fontFamily: element.fontFamily || 'Arial',
          fontSize: element.fontSize || 24,
          color: element.color || '#000000',
        };
        try {
          const { imageDataUri: textImgUri } = await generateTextImage(textInput);
          imageDataUri = textImgUri;
        } catch (textGenError: any) {
          console.warn(`Skipping text element "${element.content}" due to generation error: ${textGenError.message}`);
          return null; // Skip this element on error
        }
      } else if (element.itemType === 'shape' && element.shapeType) {
        const shapeInput: GenerateShapeImageInput = {
          shapeType: element.shapeType,
          color: element.color || '#FF0000',
          strokeColor: element.strokeColor || '#000000',
          strokeWidth: element.strokeWidth || 0,
          aspectRatio: (element.width && element.height && element.height !== 0) 
            ? `${element.width / element.height}:1` 
            : '1:1',
        };
         try {
          const { imageDataUri: shapeImgUri } = await generateShapeImage(shapeInput);
          imageDataUri = shapeImgUri;
        } catch (shapeGenError: any) {
          console.warn(`Skipping shape element "${element.shapeType}" due to generation error: ${shapeGenError.message}`);
          return null; // Skip this element on error
        }
      } else if (element.itemType === 'image' && element.dataUrl) {
          imageDataUri = element.dataUrl;
      }

      if (imageDataUri) {
        return {
          imageDataUri,
          x: element.x,
          y: element.y,
          scale: element.scale,
          rotation: element.rotation,
          zIndex: element.zIndex,
          originalWidthPx: element.width,
          originalHeightPx: element.height,
        } as ImageTransform;
      }
      return null;
    });

    const results = await Promise.all(processingPromises);
    const validTransforms = results.filter((r): r is ImageTransform => r !== null);
    
    if (validTransforms.length === 0 && elements.length > 0) {
      console.warn("No valid image data could be prepared for compositing. All text/shape elements might have failed generation, or no image elements were present.");
      return NextResponse.json({ previewImageUrl: baseImageDataUri, altText: "Base image preview (overlay generation failed)." });
    }

    const compositeInput: CompositeImagesInput = {
      baseImageDataUri,
      baseImageWidthPx: widthPx,
      baseImageHeightPx: heightPx,
      overlays: validTransforms,
    };

    const { compositeImageUrl, altText } = await compositeImages(compositeInput);

    return NextResponse.json({ previewImageUrl: compositeImageUrl, altText: altText });

  } catch (error: any) {
    console.error('Error in /api/preview:', error);
    if (error.issues && Array.isArray(error.issues)) {
      const validationErrors = error.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join('; ');
      return NextResponse.json({ error: `Input validation failed: ${validationErrors}` }, { status: 400 });
    }
    return NextResponse.json({ error: `Preview generation failed: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
