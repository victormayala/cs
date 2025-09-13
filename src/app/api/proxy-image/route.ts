
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }

  try {
    // Set a timeout for the fetch request and a standard User-Agent header
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Log the actual status and text from the failed response
      const errorText = await response.text();
      console.error(`[Image Proxy] Failed to fetch image. Status: ${response.status}. URL: ${imageUrl}. Response: ${errorText}`);
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Check if we actually got image data
    if (imageBuffer.byteLength < 100) { // Arbitrary small size to detect likely empty/error responses
        console.warn(`[Image Proxy] Fetched very small buffer for ${imageUrl}. Content-Type: ${contentType}. It might be an error page instead of an image.`);
    }

    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    return NextResponse.json({ dataUrl });

  } catch (error: any) {
    console.error(`[Image Proxy] Error fetching ${imageUrl}:`, error.message);
    // Return a more specific error message
    return NextResponse.json({ error: `Failed to proxy image: ${error.message}` }, { status: 502 }); // 502 Bad Gateway is appropriate here
  }
}
