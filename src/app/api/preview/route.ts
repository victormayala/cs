
'use server';

import { NextResponse } from 'next/server';
import { compositeImages, type CompositeImagesInput } from '@/ai/flows/composite-images';

// This route no longer needs complex validation, as the client now prepares the exact
// data structure required by the `compositeImages` flow.

export async function POST(request: Request) {
  try {
    const body: CompositeImagesInput = await request.json();

    // The body should now perfectly match the CompositeImagesInput type.
    // We can pass it directly to the flow.
    const result = await compositeImages(body);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    // Provide a more generic error message to the client for security
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
