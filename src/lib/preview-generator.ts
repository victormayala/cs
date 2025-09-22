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
  try {
    // Wait for a brief moment to ensure all stage updates are complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force stage update
    stage.batchDraw();

    // Use Konva's built-in toDataURL method which properly handles all layers and transformations
    const dataUrl = stage.toDataURL({
      pixelRatio: 2, // Higher quality output
      mimeType: 'image/png',
      quality: 1,
      callback: (dataUrl: string) => {
        return dataUrl;
      }
    });

    // Validate the generated image
    const validationPromise = new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create a temporary canvas to check the image content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context for validation'));
          return;
        }

        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Check if the image has non-transparent pixels
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const hasContent = Array.from(imageData.data).some((value, index) => {
          // Check RGB values (skip alpha)
          return index % 4 !== 3 && value > 0;
        });

        if (hasContent) {
          resolve(dataUrl);
        } else {
          reject(new Error('Generated preview appears to be empty'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load generated preview for validation'));
      img.src = dataUrl;
    });

    return await validationPromise;
  } catch (error) {
    console.error('Error generating canvas preview:', error);
    throw error;
  }
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
  
  // Store original state
  const originalView = stage.getLayers().map(layer => ({
    layer,
    visible: layer.isVisible(),
    children: layer.children?.map(child => ({
      node: child,
      visible: child.isVisible()
    }))
  }));

  for (const viewId of Array.from(customizedViewIds)) {
    const viewInfo = views.find(v => v.id === viewId);
    if (!viewInfo) continue;

    try {
      // Switch to this view if we have a setter
      if (setActiveViewId) {
        setActiveViewId(viewId);
        
        // Show all layers and nodes for this view
        stage.getLayers().forEach(layer => {
          layer.show();
          layer.children?.forEach(child => {
            if (child.attrs.viewId === viewId) {
              child.show();
            }
          });
        });

        // Wait for the stage to update with the new view
        await new Promise(resolve => {
          const checkStage = () => {
            // Ensure all layers are properly loaded
            const allLayersReady = stage.getLayers().every(layer => {
              const images = layer.find('.Image') as KonvaImage[];
              return images.every(img => {
                const imageElement = (img as any).imageElement;
                const isReady = !imageElement || imageElement.complete;
                if (!isReady) {
                  console.log('Waiting for image to load:', img.attrs.id);
                }
                return isReady;
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
        // Force a full stage update
        stage.batchDraw();
      }

      console.log('Generating preview for view:', viewId);

      // Wait to ensure all animations and updates are complete
      await new Promise(resolve => setTimeout(resolve, 200));

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
            console.error('Could not get validation canvas context');
            resolve(false);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Check for non-white pixels
          let hasContent = false;
          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            // Check if pixel is not white
            if (r !== 255 || g !== 255 || b !== 255) {
              hasContent = true;
              break;
            }
          }

          if (!hasContent) {
            console.error('Preview validation failed: Image appears to be empty');
          }
          resolve(hasContent);
        };
        img.onerror = () => {
          console.error('Preview validation failed: Could not load generated image');
          resolve(false);
        };
        img.src = dataUrl;
      });

      if (!validateImage) {
        console.error('Generated preview validation failed for view:', viewId);
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
    } finally {
      // Restore the original visibility state for this view
      stage.getLayers().forEach((layer, i) => {
        const originalLayerState = originalView[i];
        if (originalLayerState) {
          if (originalLayerState.visible) {
            layer.show();
          } else {
            layer.hide();
          }
          
          layer.children?.forEach((child, j) => {
            const originalChildState = originalLayerState.children?.[j];
            if (originalChildState) {
              if (originalChildState.visible) {
                child.show();
              } else {
                child.hide();
              }
            }
          });
        }
      });
      stage.batchDraw();
    }
  }

  return previews;
}