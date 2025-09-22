'use client';

import type Konva from 'konva';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';
import type { Image as KonvaImage } from 'konva/lib/shapes/Image';

export interface ViewPreview {
  viewId: string;
  viewName: string;
  url: string;
}

interface PreviewGeneratorOptions {
  stage: KonvaStage;
  customizedViewIds: Set<string>;
  views: Array<{ id: string; name: string }>;
  storage?: any;
  user?: { uid: string } | null;
  setActiveViewId?: (viewId: string | null) => void;
}

async function generateCanvasPreview(stage: KonvaStage, width: number, height: number): Promise<string> {
  // Create a new canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size
  canvas.width = width;
  canvas.height = height;

  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw all layers from the stage
  stage.getLayers().forEach((layer: KonvaLayer) => {
    if (!layer.isVisible()) return;
    const layerCanvas = layer.getCanvas()._canvas;
    ctx.drawImage(layerCanvas, 0, 0);
  });

  // Return data URL
  return canvas.toDataURL('image/png');
}

export async function generateViewPreviews({
  stage,
  customizedViewIds,
  views,
  storage,
  user,
  setActiveViewId
}: PreviewGeneratorOptions): Promise<ViewPreview[]> {
  const previews: ViewPreview[] = [];
  const width = stage.width();
  const height = stage.height();

  for (const viewId of Array.from(customizedViewIds)) {
    const viewInfo = views.find(v => v.id === viewId);
    if (!viewInfo) continue;

    try {
      // Switch to this view if we have a setter
      if (setActiveViewId) {
        setActiveViewId(viewId);
        // Wait for the stage to update with the new view
        await new Promise(resolve => {
          const checkStage = () => {
            // Ensure all layers are properly loaded
            const allLayersReady = stage.getLayers().every(layer => {
              const images = layer.find('.Image') as KonvaImage[];
              return images.every(img => {
                const imageElement = (img as any).imageElement;
                return !imageElement || imageElement.complete;
              });
            });
            
            if (allLayersReady) {
              resolve(true);
            } else {
              setTimeout(checkStage, 50); // Check again in 50ms
            }
          };
          setTimeout(checkStage, 100); // Initial check after view change
        });

        // Force a redraw to ensure everything is rendered
        stage.batchDraw();
      }

      // Wait a bit more to ensure all animations have completed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate preview for this view
      const dataUrl = await generateCanvasPreview(stage, width, height);

      // Validate that the preview actually contains content
      const validateImage = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Check if the image is not just a blank canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(false);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Check if there's any non-white pixel
          const hasContent = Array.from(imageData.data).some((value, index) => {
            // Skip alpha channel
            return index % 4 !== 3 && value !== 255;
          });
          resolve(hasContent);
        };
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });

      if (!validateImage) {
        throw new Error('Generated preview appears to be empty');
      }

      // If Firebase storage is available, upload the preview
      if (storage && user) {
        try {
          const filename = `${crypto.randomUUID()}.png`;
          const storagePath = `users/${user.uid}/cart_previews/${filename}`;
          const storageRef = storage.ref(storagePath);
          
          // Upload the data URL
          const snapshot = await storageRef.putString(dataUrl, 'data_url');
          const downloadURL = await snapshot.ref.getDownloadURL();
          
          previews.push({
            viewId,
            viewName: viewInfo.name,
            url: downloadURL
          });
        } catch (uploadError) {
          console.error('Failed to upload preview to Firebase:', uploadError);
          // Fall back to using data URL
          previews.push({
            viewId,
            viewName: viewInfo.name,
            url: dataUrl
          });
        }
      } else {
        // Use data URL directly if no storage is available
        previews.push({
          viewId,
          viewName: viewInfo.name,
          url: dataUrl
        });
      }
    } catch (error) {
      console.error(`Failed to generate preview for view ${viewId}:`, error);
      // Add a placeholder for failed previews
      previews.push({
        viewId,
        viewName: viewInfo.name,
        url: 'https://placehold.co/400x400?text=Preview+Failed'
      });
    }
  }

  return previews;
}