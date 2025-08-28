
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-design-elements.ts';
import '@/ai/flows/generate-design-ideas.ts';
import '@/ai/flows/generate-design-from-prompt.ts';
import '@/ai/flows/make-background-transparent.ts';
import '@/ai/flows/generate-text-image.ts'; // Added back
import '@/ai/flows/generate-shape-image.ts'; // Added back
import '@/ai/flows/composite-images.ts'; // Added back
import '@/ai/flows/deploy-store.ts';
    