
'use server';
/**
 * @fileOverview Composites multiple images onto a base image using server-side canvas.
 * This is a non-AI, much faster alternative to the visual model-based composition.
 *
 * - compositeImagesFast - Composites images based on specified transforms.
 * - CompositeImagesInput - Input type.
 * - CompositeImagesOutput - Output type.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Konva from 'konva';
import { createCanvas, loadImage } from 'canvas';

// Define schemas matching the old composite flow for easy swapping
const ImageTransformSchema = z.object({
  imageDataUri: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional().default(0),
  zIndex: z.number().optional().default(0),
});

export const CompositeImagesInputSchema = z.object({
  baseImageUrl: z.string().describe("URL of the base product image."),
  baseImageWidthPx: z.number(),
  baseImageHeightPx: z.number(),
  overlays: z.array(ImageTransformSchema),
});
export type CompositeImagesInput = z.infer<typeof CompositeImagesInputSchema>;

export const CompositeImagesOutputSchema = z.object({
  compositeImageUrl: z.string().describe("Data URI of the final composited image."),
  altText: z.string().describe("A brief description of the composited image."),
});
export type CompositeImagesOutput = z.infer<typeof CompositeImagesOutputSchema>;


// Exported wrapper function
export async function compositeImagesFast(input: CompositeImagesInput): Promise<CompositeImagesOutput> {
  return compositeImagesFastFlow(input);
}


// Define the flow using Genkit
const compositeImagesFastFlow = ai.defineFlow(
  {
    name: 'compositeImagesFastFlow',
    inputSchema: CompositeImagesInputSchema,
    outputSchema: CompositeImagesOutputSchema,
  },
  async (input) => {
    try {
      const { baseImageUrl, baseImageWidthPx, baseImageHeightPx, overlays } = input;

      // Create a Konva stage on a server-side canvas
      const stage = new Konva.Stage({
        width: baseImageWidthPx,
        height: baseImageHeightPx,
        container: createCanvas(baseImageWidthPx, baseImageHeightPx) as any,
      });

      const layer = new Konva.Layer();
      stage.add(layer);

      // Load and add the base image
      const baseImage = await loadImage(baseImageUrl);
      const konvaBaseImage = new Konva.Image({
        image: baseImage as any,
        width: baseImageWidthPx,
        height: baseImageHeightPx,
      });
      layer.add(konvaBaseImage);

      // Sort overlays by z-index
      const sortedOverlays = [...overlays].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Load and add all overlay images
      for (const overlay of sortedOverlays) {
        const overlayImage = await loadImage(overlay.imageDataUri);
        
        // To apply rotation around the center, we need to offset the position
        const offsetX = overlay.width / 2;
        const offsetY = overlay.height / 2;

        const konvaOverlay = new Konva.Image({
          image: overlayImage as any,
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height,
          rotation: overlay.rotation,
          offsetX: offsetX,
          offsetY: offsetY,
        });
        layer.add(konvaOverlay);
      }
      
      // Draw the stage
      layer.draw();

      // Get the final image as a data URI
      const dataUrl = stage.toDataURL({ mimeType: 'image/png' });

      return {
        compositeImageUrl: dataUrl,
        altText: "A preview of the customized product design.",
      };
    } catch (error: any) {
      console.error('Error in compositeImagesFastFlow:', error);
      throw new Error(`Failed to composite images: ${error.message}`);
    }
  }
);
