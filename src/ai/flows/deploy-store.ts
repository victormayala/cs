
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// We can't import UserStoreConfig directly into the schema, so we define a Zod schema that matches it.
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
  deployment: z.object({
    status: z.enum(['uninitialized', 'pending', 'active', 'error']),
    deployedUrl: z.string().optional(),
    lastDeployedAt: z.any().optional(),
  }),
  createdAt: z.any(),
  lastSaved: z.any(),
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
    console.log(`[deployStoreFlow] Starting deployment for store: ${config.storeName} (User: ${config.userId})`);

    const storeRef = doc(db, 'userStores', config.userId);

    // 1. Update status to 'pending' in Firestore
    await setDoc(storeRef, {
        deployment: {
            ...config.deployment,
            status: 'pending',
        }
    }, { merge: true });

    // 2. Simulate the deployment process
    // In a real application, this is where you would call a cloud build service,
    // generate files, and run deployment scripts.
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate a 5-second deployment

    // This is a mock URL. In a real deployment, you'd get this from your hosting provider.
    const mockDeployedUrl = `https://${config.storeName.toLowerCase().replace(/\s+/g, '-')}-${config.userId.substring(0, 4)}.preview.app`;

    console.log(`[deployStoreFlow] Mock deployment complete for store: ${config.storeName}. URL: ${mockDeployedUrl}`);
    
    // 3. Update status to 'active' and save the URL in Firestore
    try {
        await setDoc(storeRef, {
            deployment: {
                status: 'active',
                deployedUrl: mockDeployedUrl,
                lastDeployedAt: serverTimestamp(),
            }
        }, { merge: true });

        console.log(`[deployStoreFlow] Successfully updated Firestore with active status for store: ${config.storeName}`);
        
        return {
          deploymentUrl: mockDeployedUrl,
          status: 'active',
        };
    } catch (error: any) {
        console.error(`[deployStoreFlow] Error updating Firestore after deployment for user ${config.userId}:`, error);
        
        // Try to update status to 'error'
        await setDoc(storeRef, {
            deployment: {
                ...config.deployment,
                status: 'error',
            }
        }, { merge: true });
        
        throw new Error(`Deployment simulation succeeded, but failed to update status in database: ${error.message}`);
    }
  }
);
