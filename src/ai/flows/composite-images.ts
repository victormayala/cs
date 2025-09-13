
'use server';
/**
 * @fileOverview Composites multiple images onto a base image using AI.
 *
 * - compositeImages - Composites images based on specified transforms.
 * - CompositeImagesInput - Input type.
 * - CompositeImagesOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImageTransformSchema = z.object({
  imageDataUri: z.string().describe(
    "Data URI of the image to overlay. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  // Replacing percentage-based coordinates with exact pixel coordinates
  x: z.number().describe('X-coordinate (in pixels from left) for the center of the overlay image.'),
  y: z.number().describe('Y-coordinate (in pixels from top) for the center of the overlay image.'),
  width: z.number().describe('Width of the overlay image in pixels.'),
  height: z.number().describe('Height of the overlay image in pixels.'),
  rotation: z.number().optional().default(0).describe('Rotation angle in degrees (0-360).'),
  zIndex: z.number().optional().default(0).describe('Stacking order (higher is on top).'),
  // Removing optional scale and original size context as we now provide exact dimensions
});
export type ImageTransform = z.infer<typeof ImageTransformSchema>;

const CompositeImagesInputSchema = z.object({
  baseImageDataUri: z.string().describe(
    "Data URI of the base product image. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  baseImageWidthPx: z.number().describe('Width of the base image/design canvas in pixels.'),
  baseImageHeightPx: z.number().describe('Height of the base image/design canvas in pixels.'),
  overlays: z.array(ImageTransformSchema).describe('Array of images to overlay with their transforms.'),
});
export type CompositeImagesInput = z.infer<typeof CompositeImagesInputSchema>;

const CompositeImagesOutputSchema = z.object({
  compositeImageUrl: z.string().url().describe(
    "Data URI of the final composited image. Expected format: 'data:image/png;base64,<encoded_data>'."
  ),
  altText: z.string().describe("A brief description of the composited image, suitable for alt text.")
});
export type CompositeImagesOutput = z.infer<typeof CompositeImagesOutputSchema>;

export async function compositeImages(input: CompositeImagesInput): Promise<CompositeImagesOutput> {
  return compositeImagesFlow(input);
}

const model = 'googleai/gemini-2.0-flash-exp';

const compositeImagesFlow = ai.defineFlow(
  {
    name: 'compositeImagesFlow',
    inputSchema: CompositeImagesInputSchema,
    outputSchema: CompositeImagesOutputSchema,
  },
  async (input) => {
    try {
      const sortedOverlays = [...input.overlays].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      const promptParts: any[] = [
        { media: { url: input.baseImageDataUri, mimeType: input.baseImageDataUri.split(';')[0].split(':')[1] } },
        { text: `
          You are an expert image composition AI.
          The first image provided is the base image. Create a final canvas with the exact dimensions: ${input.baseImageWidthPx}px width, ${input.baseImageHeightPx}px height. The base image should fill this canvas.
          The subsequent images are overlays that need to be placed with pixel-perfect precision onto this base image.
          For each overlay, I will provide its image data, its target center X and Y coordinates in pixels, its target width and height in pixels, and its rotation in degrees.
          All overlay images have transparent backgrounds unless their content is opaque. Preserve transparency during composition.
          Generate a single image that composites all overlays onto the base image *exactly* according to their transforms.
          Do not add any extra elements or embellishments not specified.
          The final output should be the composited image and a one-sentence alt text describing the final image.
        `}
      ];

      sortedOverlays.forEach((overlay, index) => {
        promptParts.push({ media: { url: overlay.imageDataUri, mimeType: overlay.imageDataUri.split(';')[0].split(':')[1] } });
        // Updated prompt with exact pixel values
        const overlayInstruction = `
          Overlay Image ${index + 1}:
          - Target Width: ${overlay.width.toFixed(0)}px
          - Target Height: ${overlay.height.toFixed(0)}px
          - Target Center X: ${overlay.x.toFixed(0)}px (from left of canvas)
          - Target Center Y: ${overlay.y.toFixed(0)}px (from top of canvas)
          - Rotation: ${overlay.rotation.toFixed(0)} degrees
          Place this overlay (Overlay Image ${index + 1}) onto the base image with these exact dimensions and position.
        `;
        promptParts.push({ text: overlayInstruction });
      });

      const { text, media } = await ai.generate({
        model: model,
        prompt: promptParts,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        },
      });
      
      const imageUrl = media?.url;
      const imageDescription = (typeof text === 'string' && text.trim()) ? text.trim() : "AI-composited product preview.";

      if (!imageUrl) {
        const errorLog = `Image compositing failed or did not return an image. Number of overlays: ${input.overlays.length}. Model: ${model}. Text response: ${text}`;
        console.error(errorLog);
        throw new Error('Image compositing failed. The model might have refused the prompt or an internal error occurred.');
      }

      return {
        compositeImageUrl: imageUrl,
        altText: imageDescription,
      };
    } catch (error: any) {
      console.error(`Error in compositeImagesFlow. Model: ${model}. Error: ${error.message || error}`, error);
      throw new Error(`AI Image Compositing Error: ${error.message || 'An unexpected error occurred.'}`);
    }
  }
);
