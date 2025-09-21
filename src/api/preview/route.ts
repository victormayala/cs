
"use server";

import { NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
import Konva from 'konva';

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

async function processImage(url: string): Promise<string> {
    if (url.startsWith('data:')) {
        return url;
    }
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
        return `data:${blob.type || 'image/png'};base64,${buffer.toString('base64')}`;
    } catch (error: any) {
        console.error(`Error processing image URL: ${url}`, error);
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
}

export async function POST(request: Request) {
  try {
    const body: PreviewApiInput = await request.json();

    const baseImageDataUri = await processImage(body.baseImageUrl);
    const baseImage = await loadImage(baseImageDataUri);

    const stageWidth = body.baseImageWidthPx;
    const stageHeight = body.baseImageHeightPx;

    const stage = new Konva.Stage({
        width: stageWidth,
        height: stageHeight,
    });
    
    const canvas = stage.toCanvas();
    const ctx = canvas.getContext('2d');
    
    // Clear and draw base image
    ctx.clearRect(0, 0, stageWidth, stageHeight);
    ctx.drawImage(baseImage, 0, 0, stageWidth, stageHeight);

    // Sort overlays by zIndex
    const sortedOverlays = body.overlays.sort((a, b) => a.zIndex - b.zIndex);

    for (const overlay of sortedOverlays) {
        const overlayImage = await loadImage(overlay.imageDataUri);
        
        ctx.save();
        ctx.translate(overlay.x, overlay.y);
        ctx.rotate(overlay.rotation * (Math.PI / 180));
        
        const offsetX = overlay.width / 2;
        const offsetY = overlay.height / 2;
        
        ctx.drawImage(overlayImage, -offsetX, -offsetY, overlay.width, overlay.height);
        
        ctx.restore();
    }
    
    const finalDataUrl = canvas.toDataURL('image/png');

    return NextResponse.json({ finalImageUrl: finalDataUrl });

  } catch (error: any) {
    console.error("Error in /api/preview route:", error);
    return NextResponse.json({ error: 'Failed to generate preview.', details: error.message }, { status: 500 });
  }
}
