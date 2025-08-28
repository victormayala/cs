
'use server';
/**
 * @fileOverview A flow to handle the deployment of a user's generated store.
 *
 * - deployStore - A function that takes the store configuration and triggers deployment.
 * - DeployStoreInput - The input type for the deployStore function.
 * - DeployStoreOutput - The return type for the deployStore function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { UserStoreConfig } from '@/app/actions/userStoreActions';

// We can't import UserStoreConfig directly into the schema, so we define a Zod schema that matches it.
// This schema represents the plain object received from the client.
const DeployStoreInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  storeName: z.string(),
  layout: z.enum(['casual', 'corporate', 'marketing']),
  branding: z.object({
    logoUrl: z.string().optional(),
    primaryColorHex: z.string(),
    secondaryColorHex: z.string(),
  }),
  // Timestamps will be plain objects after JSON serialization from the client.
  createdAt: z.any().optional(),
  lastSaved: z.any().optional(),
  // Deployment object is not needed as input since the flow's job is to create it.
});

export type DeployStoreInput = z.infer<typeof DeployStoreInputSchema>;

const DeployStoreOutputSchema = z.object({
  deploymentUrl: z.string().url().describe("The final URL of the deployed store."),
  status: z.string().describe("The final status of the deployment."),
});
export type DeployStoreOutput = z.infer<typeof DeployStoreOutputSchema>;

// Exported wrapper function
export async function deployStore(input: UserStoreConfig): Promise<DeployStoreOutput> {
  // We cast the UserStoreConfig to DeployStoreInput. This is safe because we know they match.
  return deployStoreFlow(input as DeployStoreInput);
}

const deployStoreFlow = ai.defineFlow(
  {
    name: 'deployStoreFlow',
    inputSchema: DeployStoreInputSchema,
    outputSchema: DeployStoreOutputSchema,
  },
  async (config) => {
    console.log(`[deployStoreFlow] Starting deployment simulation for store: ${config.storeName} (User: ${config.userId})`);

    // In a real application, this is where you would call a cloud build service,
    // generate files, and run deployment scripts. This flow no longer interacts with Firestore.
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate a 5-second deployment

    // This is a mock URL. In a real deployment, you'd get this from your hosting provider.
    const mockDeployedUrl = `https://${config.storeName.toLowerCase().replace(/\s+/g, '-')}-${config.userId.substring(0, 4)}.preview.app`;

    console.log(`[deployStoreFlow] Mock deployment complete for store: ${config.storeName}. URL: ${mockDeployedUrl}`);
    
    // The flow now only returns the result of the deployment.
    // The client is responsible for updating the database.
    return {
      deploymentUrl: mockDeployedUrl,
      status: 'active',
    };
  }
);
