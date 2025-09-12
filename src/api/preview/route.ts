
'use server';

// This entire route is deprecated as of the switch to client-side html-to-image screenshots.
// It is left here as a placeholder to prevent 404 errors in case any old client-side
// code still tries to call it before a full refresh. It now returns a simple error.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.warn("DEPRECATED: The /api/preview route was called, but the application has switched to client-side screenshot generation.");
    return NextResponse.json(
        { error: 'This preview generation endpoint is deprecated. The client should be using html-to-image.' },
        { status: 410 } // 410 Gone
    );
}
