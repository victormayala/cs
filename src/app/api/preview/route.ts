

'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';

export async function POST(request: Request) {
  try {
    const body: CompositeImagesInput = await request.json();

    // Basic validation to ensure required fields are present
    if (!body.baseImageDataUri || !body.baseImageMimeType || !body.baseImageWidthPx || !body.baseImageHeightPx || !Array.isArray(body.overlays)) {
        return NextResponse.json({ error: 'Invalid request body. Missing required fields.' }, { status: 400 });
    }

    const result = await compositeImages(body);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    // If the body is malformed JSON, request.json() will throw.
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON format in request body.', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}

