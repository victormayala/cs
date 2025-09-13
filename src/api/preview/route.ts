
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';

interface PreviewApiInput {
    baseImageUrl: string;
    baseImageWidthPx: number;
    baseImageHeightPx: number;
    overlays: {
      imageDataUri: string;
      mimeType: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      zIndex: number;
    }[];
}

// Function to fetch an image and convert it to a data URI if it's a URL
async function processBaseImage(url: string): Promise<{ dataUrl: string, mimeType: string }> {
    // If it's already a data URI, just extract mime type
    if (url.startsWith('data:')) {
        const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
        return { dataUrl: url, mimeType: mimeType || 'image/png' };
    }

    // If it's a URL, fetch and convert it
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText} for URL: ${url}`);
        }
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const mimeType = blob.type || 'image/png';
        return { 
            dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
            mimeType: mimeType
        };
    } catch (error: any) {
        console.error(`Error processing base image URL: ${url}`, error);
        // Provide a fallback transparent pixel
        const fallbackMime = 'image/png';
        const fallbackData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        return { dataUrl: `data:${fallbackMime};base64,${fallbackData}`, mimeType: fallbackMime };
    }
}


export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();

    // Process the base image (might be a URL or a data URI)
    const { dataUrl: baseImageDataUri, mimeType: baseImageMimeType } = await processBaseImage(body.baseImageUrl);
    
    const compositeInput: CompositeImagesInput = {
        baseImageDataUri,
        baseImageMimeType,
        baseImageWidthPx: body.baseImageWidthPx,
        baseImageHeightPx: body.baseImageHeightPx,
        overlays: body.overlays, // The client now sends the overlays in the correct format
    };

    const result = await compositeImages(compositeInput);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
