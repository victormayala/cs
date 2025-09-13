
import { config } from 'dotenv';
config();

// Not all flows are used, but we keep them for potential future use
import '@/ai/flows/generate-design-from-prompt.ts';
import '@/ai/flows/composite-images.ts';
import '@/ai/flows/deploy-store.ts';
    
