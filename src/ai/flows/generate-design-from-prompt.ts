
'use server';
/**
 * @fileOverview Generates a design image and description based on a user prompt.
 *
 * - generateDesignFromPrompt - A function that takes a text prompt and returns a generated image URL and description.
 * - GenerateDesignFromPromptInput - The input type.
 * - GenerateDesignFromPromptOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDesignFromPromptInputSchema = z.object({
  userPrompt: z.string().describe('The user_s textual design idea or prompt.'),
});
export type GenerateDesignFromPromptInput = z.infer<typeof GenerateDesignFromPromptInputSchema>;

const GenerateDesignFromPromptOutputSchema = z.object({
  generatedImageUrl: z.string().url().describe(
    "The data URI of the generated image. Expected format: 'data:image/png;base64,<encoded_data>'."
  ),
  generatedImageDescription: z.string().describe(
    'A brief textual description of the generated image, suitable for alt text.'
  ),
});
export type GenerateDesignFromPromptOutput = z.infer<typeof GenerateDesignFromPromptOutputSchema>;


export async function generateDesignFromPrompt(input: GenerateDesignFromPromptInput): Promise<GenerateDesignFromPromptOutput> {
  return generateDesignFromPromptFlow(input);
}

const model = 'googleai/gemini-2.5-flash-image-preview';

const generateDesignFromPromptFlow = ai.defineFlow(
  {
    name: 'generateDesignFromPromptFlow',
    inputSchema: GenerateDesignFromPromptInputSchema,
    outputSchema: GenerateDesignFromPromptOutputSchema,
  },
  async (input) => {
    try {
      const { text, media } = await ai.generate({
        model: model,
        prompt: `User's design idea: "${input.userPrompt}"

        Based on the user's design idea provided above:
        1. Generate a visually appealing image that represents this idea. The image *MUST* have a transparent background (e.g., like a PNG with an alpha channel) to allow it to be placed on various products. Do NOT generate a solid white or any other color background unless that color is part of the design requested by the user. If the subject of the design is complex, focus on making the background immediately surrounding the main subject transparent.
        2. Provide a concise, one-sentence textual description of the generated image. This description will be used as alt text.

        Example of desired text output if user asks for "a happy cat":
        "A cheerful cartoon cat with bright green eyes and a playful smile."

        Return ONLY the image and the textual description. Do not add any other conversational text or markdown.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const imageUrl = media?.url;
      // Ensure text is a string, default to a generic description if text is empty or not a string
      const imageDescription = (typeof text === 'string' && text.trim()) ? text.trim() : `AI Generated: ${input.userPrompt.substring(0,30)}`;


      if (!imageUrl) {
        const errorLog = `Image generation failed or did not return an image. User prompt: "${input.userPrompt}". Model: ${model}. Text response: ${text}`;
        console.error(errorLog);
        // This error should be caught by the client-side try...catch in AiAssistant.tsx
        throw new Error('Image generation failed. The model might have refused the prompt or an internal error occurred. Please check server logs for details.');
      }

      return {
        generatedImageUrl: imageUrl,
        generatedImageDescription: imageDescription,
      };
    } catch (error: any) {
      console.error(`Error in generateDesignFromPromptFlow for prompt "${input.userPrompt}". Model: ${model}. Error: ${error.message || error}`, error);
      // Re-throw a more specific error or one that's easier for the client to handle
      // This helps ensure the client-side catch block in AiAssistant.tsx gets a clear error
      throw new Error(`AI Design Generation Error: ${error.message || 'An unexpected error occurred. Please check server logs for more details.'}`);
    }
  }
);
