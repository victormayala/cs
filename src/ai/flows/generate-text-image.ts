
'use server';
/**
 * @fileOverview Generates an image of text with a transparent background.
 *
 * - generateTextImage - Generates an image from text.
 * - GenerateTextImageInput - Input type.
 * - GenerateTextImageOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTextImageInputSchema = z.object({
  text: z.string().describe('The text content to render.'),
  fontFamily: z.string().optional().default('Arial').describe('Font family for the text.'),
  fontSize: z.number().optional().default(48).describe('Font size in pixels.'),
  color: z.string().optional().default('#000000').describe('Text color in hex format.'),
  // TODO: Add other text style properties if needed (e.g., fontWeight, fontStyle)
  // For simplicity, keeping it basic for now.
});
export type GenerateTextImageInput = z.infer<typeof GenerateTextImageInputSchema>;

const GenerateTextImageOutputSchema = z.object({
  imageDataUri: z.string().url().describe(
    "Data URI of the generated text image (PNG with transparent background). Expected format: 'data:image/png;base64,<encoded_data>'."
  ),
  altText: z.string().describe("A brief description of the image, suitable for alt text.")
});
export type GenerateTextImageOutput = z.infer<typeof GenerateTextImageOutputSchema>;

export async function generateTextImage(input: GenerateTextImageInput): Promise<GenerateTextImageOutput> {
  return generateTextImageFlow(input);
}

const model = 'googleai/gemini-2.0-flash-exp';

const generateTextImageFlow = ai.defineFlow(
  {
    name: 'generateTextImageFlow',
    inputSchema: GenerateTextImageInputSchema,
    outputSchema: GenerateTextImageOutputSchema,
  },
  async (input) => {
    try {
      const { text, media } = await ai.generate({
        model: model,
        prompt: `Generate a high-quality PNG image of the following text: "${input.text}".
        The text must be rendered with these exact properties:
        - Font Family: A font that is very similar to ${input.fontFamily}. A standard sans-serif is acceptable if the specific font is unavailable.
        - Text Color: The text color *MUST* be the hex code ${input.color}. Do not use any other color.
        - Font Size: Approximately ${input.fontSize}px relative to a standard canvas. The text should be clear and legible.
        
        The image MUST have a transparent background.
        Do NOT add any other elements, text, or background colors to the image.
        The final image should contain only the requested text, in the specified color, on a transparent background.
        
        Return only the image and a short, one-sentence alt text describing the image (e.g., "The text 'Hello World' in red Arial font.").`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [ 
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      const imageUrl = media?.url;
      const imageDescription = (typeof text === 'string' && text.trim()) ? text.trim() : `Rendered text: ${input.text.substring(0,30)}`;

      if (!imageUrl) {
        const errorLog = `Text-to-image generation failed or did not return an image. Input: ${JSON.stringify(input)}. Model: ${model}. Text response: ${text}`;
        console.error(errorLog);
        throw new Error('Text-to-image generation failed. The model might have refused the prompt or an internal error occurred.');
      }

      return {
        imageDataUri: imageUrl,
        altText: imageDescription,
      };
    } catch (error: any) {
      console.error(`Error in generateTextImageFlow for text "${input.text}". Model: ${model}. Error: ${error.message || error}`, error);
      throw new Error(`AI Text-to-Image Generation Error: ${error.message || 'An unexpected error occurred.'}`);
    }
  }
);
    
