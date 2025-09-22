'use client';

import Konva from 'konva';
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
    console.log('Generating canvas preview...');
    console.log('Stage state:', {
      width: stage.width(),
      height: stage.height(),
      layers: stage.getLayers().length,
    });

    // Ensure white background
    let bgLayer = stage.findOne('.background') as Konva.Layer;
    if (!bgLayer) {
      console.log('Creating background layer');
      bgLayer = new Konva.Layer({ name: 'background' });
      const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: '#FFFFFF',
      });
      bgLayer.add(background);
      stage.add(bgLayer);
    }
    bgLayer.moveToBottom();
    bgLayer.show();
    
    // Log visible content
    stage.getLayers().forEach((layer, i) => {
      const visibleNodes = layer.children?.filter(node => node.isVisible()) || [];
      console.log(`Layer ${i} contents:`, {
        visible: layer.isVisible(),
        totalNodes: layer.children?.length || 0,
        visibleNodes: visibleNodes.length,
        nodeTypes: visibleNodes.map(n => n.getClassName()),
      });
    });

    // Force stage update
    stage.draw();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Generate high-quality preview
    console.log('Capturing stage content...');
    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    });

    // Validate content
    const isValid = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Could not get validation context');
          resolve(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Check for non-white content
        let nonWhitePixels = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          if (r !== 255 || g !== 255 || b !== 255) {
            nonWhitePixels++;
          }
        }

        const totalPixels = (canvas.width * canvas.height);
        const nonWhitePercentage = (nonWhitePixels / totalPixels) * 100;
        
        console.log('Content validation:', {
          dimensions: `${canvas.width}x${canvas.height}`,
          nonWhitePixels,
          nonWhitePercentage: `${nonWhitePercentage.toFixed(2)}%`
        });

        resolve(nonWhitePercentage > 0.1); // More than 0.1% non-white
      };
      img.onerror = () => {
        console.error('Failed to load preview for validation');
        resolve(false);
      };
      img.src = dataUrl;
    });

    if (!isValid) {
      throw new Error('Generated preview appears to be empty');
    }

    return dataUrl;
  } catch (error) {
    console.error('Error generating preview:', error);
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
  try {
    console.log('Starting preview generation for views:', Array.from(customizedViewIds));
    
    const previews: ViewPreview[] = [];
    const width = stage.width();
    const height = stage.height();

    // Store original state
    const originalState = {
      activeView: stage.findOne('.active-view')?.attrs.id,
      layerStates: stage.getLayers().map(layer => ({
        layer,
        visible: layer.isVisible(),
        children: layer.children?.map(child => ({
          node: child,
          visible: child.isVisible(),
          attrs: { ...child.attrs }
        }))
      }))
    };

    for (const viewId of Array.from(customizedViewIds)) {
      console.log(`Processing view: ${viewId}`);
      const viewInfo = views.find(v => v.id === viewId);
      if (!viewInfo) {
        console.log(`Skipping unknown view: ${viewId}`);
        continue;
      }

      try {
        // Switch view if needed
        if (setActiveViewId) {
          console.log(`Switching to view: ${viewId}`);
          setActiveViewId(viewId);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Show all content for this view
        console.log('Preparing view content...');
        stage.getLayers().forEach(layer => {
          // Skip background layer
          if (layer.attrs.name === 'background') return;
          
          layer.show();
          layer.children?.forEach(child => {
            // Only show nodes for this view
            if (child.attrs.viewId === viewId) {
              console.log(`Showing node: ${child.attrs.id}`);
              child.show();
              child.moveToTop();
            } else {
              child.hide();
            }
          });
        });

        // Wait for images to load
        console.log('Waiting for images to load...');
        await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 5000;
          
          const checkImages = () => {
            if (Date.now() - startTime > timeout) {
              reject(new Error('Image loading timeout'));
              return;
            }

            const images = stage.find('.Image').filter(node => node.isVisible());
            console.log(`Checking ${images.length} visible images...`);
            
            const notLoaded = images.filter(img => {
              const imageElement = (img as any).imageElement;
              return imageElement && !imageElement.complete;
            });

            if (notLoaded.length > 0) {
              console.log(`Waiting for ${notLoaded.length} images...`);
              setTimeout(checkImages, 100);
            } else {
              resolve(true);
            }
          };
          
          setTimeout(checkImages, 200);
        });

        // Generate and validate preview
        console.log('Generating view preview...');
        const dataUrl = await generateCanvasPreview(stage, width, height);

        // Upload to storage if available
        if (storage && user) {
          try {
            const filename = `${crypto.randomUUID()}.png`;
            const storagePath = `users/${user.uid}/cart_previews/${filename}`;
            
            console.log(`Uploading preview to ${storagePath}`);
            const storageRef = storage.ref(storagePath);
            const snapshot = await storageRef.putString(dataUrl, 'data_url');
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            previews.push({
              viewId,
              viewName: viewInfo.name,
              url: downloadURL
            });
          } catch (uploadError) {
            console.error('Upload failed:', uploadError);
            previews.push({
              viewId,
              viewName: viewInfo.name,
              url: dataUrl
            });
          }
        } else {
          previews.push({
            viewId,
            viewName: viewInfo.name,
            url: dataUrl
          });
        }
      } catch (error) {
        console.error(`Error processing view ${viewId}:`, error);
        previews.push({
          viewId,
          viewName: viewInfo.name,
          url: 'https://placehold.co/400x400?text=Preview+Failed'
        });
      }
    }

    // Restore original state
    console.log('Restoring original state...');
    if (originalState.activeView && setActiveViewId) {
      setActiveViewId(originalState.activeView);
    }

    originalState.layerStates.forEach(({ layer, visible, children }) => {
      if (visible) {
        layer.show();
      } else {
        layer.hide();
      }
      
      children?.forEach(({ node, visible, attrs }) => {
        if (visible) {
          node.show();
        } else {
          node.hide();
        }
        node.setAttrs(attrs);
      });
    });

    stage.batchDraw();
    
    return previews;
  } catch (error) {
    console.error('Preview generation failed:', error);
    throw error;
  }
}