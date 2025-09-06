
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-design-elements.ts';
import '@/ai/flows/generate-design-ideas.ts';
import '@/ai/flows/generate-design-from-prompt.ts';
import '@/ai/flows/make-background-transparent.ts';
// The following flows are no longer used by the application for cart previews,
// but are kept for potential other uses or as reference.
// import '@/ai/flows/generate-text-image.ts';
// import '@/ai/flows/generate-shape-image.ts';
// import '@/ai/flows/composite-images.ts';
import '@/ai/flows/deploy-store.ts';
    