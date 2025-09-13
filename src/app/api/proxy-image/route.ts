
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const imageUrl = body.url;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required in the POST body' }, { status: 400 });
        }

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Proxy failed to fetch image. URL: ${imageUrl}, Status: ${response.status}`);
            return NextResponse.json({ error: `Failed to fetch image. Status: ${response.status}` }, { status: response.status });
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64Image}`;

        return NextResponse.json({ dataUrl });

    } catch (error: any) {
        console.error('Error in image proxy:', error);
        return NextResponse.json({ error: 'Internal Server Error processing image proxy request.', details: error.message }, { status: 500 });
    }
}
