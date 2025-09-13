
'use server';
/**
 * @fileOverview Generates an image of a geometric shape with a transparent background.
 *
 * - generateShapeImage - Generates an image of a shape.
 * - GenerateShapeImageInput - Input type.
 * - GenerateShapeImageOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShapeTypeSchema = z.enum(['rectangle', 'circle']);

const GenerateShapeImageInputSchema = z.object({
  shapeType: ShapeTypeSchema.describe('The type of shape to generate (e.g., rectangle, circle).'),
  color: z.string().optional().default('#FF0000').describe('Fill color for the shape in hex format.'),
  strokeColor: z.string().optional().default('#000000').describe('Stroke color for the shape in hex format.'),
  strokeWidth: z.number().optional().default(0).describe('Stroke width in pixels. 0 for no stroke.'),
  aspectRatio: z.string().optional().default('1:1').describe('Desired aspect ratio (e.g., "1:1" for square/circle, "2:1" for wide rectangle).'),
});
export type GenerateShapeImageInput = z.infer<typeof GenerateShapeImageInputSchema>;

const GenerateShapeImageOutputSchema = z.object({
  imageDataUri: z.string().url().describe(
    "Data URI of the generated shape image (PNG with transparent background). Expected format: 'data:image/png;base64,<encoded_data>'."
  ),
  altText: z.string().describe("A brief description of the image, suitable for alt text.")
});
export type GenerateShapeImageOutput = z.infer<typeof GenerateShapeImageOutputSchema>;

export async function generateShapeImage(input: GenerateShapeImageInput): Promise<GenerateShapeImageOutput> {
  return generateShapeImageFlow(input);
}

const model = 'googleai/gemini-2.0-flash-exp';

const generateShapeImageFlow = ai.defineFlow(
  {
    name: 'generateShapeImageFlow',
    inputSchema: GenerateShapeImageInputSchema,
    outputSchema: GenerateShapeImageOutputSchema,
  },
  async (input) => {
    try {
      const strokeInstruction = input.strokeWidth > 0 
        ? `with a ${input.strokeWidth}px stroke (outline) using the exact hex color ${input.strokeColor}` 
        : 'with no stroke (outline)';

      const { text, media } = await ai.generate({
        model: model,
        prompt: `Generate a high-quality PNG image of a simple geometric ${input.shapeType}.
        The shape MUST be filled with the exact hex color ${input.color}.
        The shape must have ${strokeInstruction}.
        The shape should have an approximate aspect ratio of ${input.aspectRatio}.
        The image MUST have a transparent background.
        Do NOT add any other elements, text, or background colors to the image.
        Return only the image and a short, one-sentence alt text describing the image (e.g., "A red circle with a black outline.").`,
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
      const imageDescription = (typeof text === 'string' && text.trim()) ? text.trim() : `Rendered ${input.shapeType}: ${input.color}`;

      if (!imageUrl) {
         const errorLog = `Shape-to-image generation failed or did not return an image. Input: ${JSON.stringify(input)}. Model: ${model}. Text response: ${text}`;
        console.error(errorLog);
        throw new Error('Shape-to-image generation failed. The model might have refused the prompt or an internal error occurred.');
      }

      return {
        imageDataUri: imageUrl,
        altText: imageDescription,
      };
    } catch (error: any) {
      console.error(`Error in generateShapeImageFlow for shape "${input.shapeType}". Model: ${model}. Error: ${error.message || error}`, error);
      throw new Error(`AI Shape-to-Image Generation Error: ${error.message || 'An unexpected error occurred.'}`);
    }
  }
);
    
