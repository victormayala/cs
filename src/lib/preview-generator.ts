'use client';

import Konva from 'konva';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';
import type { Node as KonvaNode } from 'konva/lib/Node';

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
}

function cloneStage(sourceStage: KonvaStage, width: number, height: number): KonvaStage {
    // Create a new container div for the temporary stage
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    // Create new stage with same dimensions
    const newStage = new Konva.Stage({
        container: container,
        width: width,
        height: height
    });

    // Clone each layer and its contents
    sourceStage.getLayers().forEach(layer => {
        const newLayer = new Konva.Layer();
        
        // Clone each node in the layer
        layer.getChildren().forEach(node => {
            const clone = node.clone();
            clone.setAttrs({
                x: node.x(),
                y: node.y(),
                scaleX: node.scaleX(),
                scaleY: node.scaleY(),
                rotation: node.rotation(),
                opacity: node.opacity(),
                visible: node.isVisible()
            });
            newLayer.add(clone);
        });

        newStage.add(newLayer);
    });

    return newStage;
}

function cleanupClonedStage(stage: KonvaStage) {
    const container = stage.container();
    stage.destroy();
    if (container.parentNode) {
        container.parentNode.removeChild(container);
    }
}

export async function generateCanvasPreview(stage: KonvaStage, width: number, height: number): Promise<string> {
    let previewStage: KonvaStage | null = null;
    
    try {
        // Clone the stage to avoid modifying the original
        previewStage = cloneStage(stage, width, height);

        // Ensure white background in the cloned stage
        const bgLayer = new Konva.Layer({ name: 'background' });
        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: height,
            fill: '#FFFFFF',
        });
        bgLayer.add(background);
        previewStage.add(bgLayer);
        bgLayer.moveToBottom();

        // Force an update of the cloned stage
        previewStage.batchDraw();

        // Generate preview at 2x resolution for better quality
        const dataUrl = previewStage.toDataURL({
            pixelRatio: 2,
            mimeType: 'image/png',
            quality: 1
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating preview:', error);
        throw new Error('Failed to generate preview image');
    } finally {
        // Clean up the cloned stage
        if (previewStage) {
            cleanupClonedStage(previewStage);
        }
    }
}

export async function generateViewPreviews({
    stage,
    customizedViewIds,
    views,
    storage,
    user
}: PreviewGeneratorOptions): Promise<ViewPreview[]> {
    const width = stage.width();
    const height = stage.height();

    // Generate previews for each customized view
    const previews = await Promise.all(
        Array.from(customizedViewIds).map(async viewId => {
            const view = views.find(v => v.id === viewId);
            if (!view) return null;

            try {
                const previewDataUrl = await generateCanvasPreview(stage, width, height);
                
                // Upload to storage if available
                if (storage && user) {
                    try {
                        const filename = `${crypto.randomUUID()}.png`;
                        const storagePath = `users/${user.uid}/cart_previews/${filename}`;
                        const storageRef = storage.ref(storagePath);
                        const snapshot = await storageRef.putString(previewDataUrl, 'data_url');
                        const downloadURL = await snapshot.ref.getDownloadURL();
                        
                        return {
                            viewId: view.id,
                            viewName: view.name,
                            url: downloadURL
                        };
                    } catch (uploadError) {
                        console.error('Upload failed:', uploadError);
                        return {
                            viewId: view.id,
                            viewName: view.name,
                            url: previewDataUrl
                        };
                    }
                }
                
                return {
                    viewId: view.id,
                    viewName: view.name,
                    url: previewDataUrl
                };
            } catch (error) {
                console.error(`Error generating preview for view ${viewId}:`, error);
                return null;
            }
        })
    );

    return previews.filter(Boolean) as ViewPreview[];
}
}

export async function generateViewPreviews({
    stage,
    customizedViewIds,
    views,
    storage,
    user
}: PreviewGeneratorOptions): Promise<ViewPreview[]> {
    const width = stage.width();
    const height = stage.height();

    // Generate previews for each customized view
    const previews = await Promise.all(
        Array.from(customizedViewIds).map(async viewId => {
            const view = views.find(v => v.id === viewId);
            if (!view) return null;

            try {
                const previewDataUrl = await generateCanvasPreview(stage, width, height);
                
                // Upload to storage if available
                if (storage && user) {
                    try {
                        const filename = `${crypto.randomUUID()}.png`;
                        const storagePath = `users/${user.uid}/cart_previews/${filename}`;
                        const storageRef = storage.ref(storagePath);
                        const snapshot = await storageRef.putString(previewDataUrl, 'data_url');
                        const downloadURL = await snapshot.ref.getDownloadURL();
                        
                        return {
                            viewId: view.id,
                            viewName: view.name,
                            url: downloadURL
                        };
                    } catch (uploadError) {
                        console.error('Upload failed:', uploadError);
                        return {
                            viewId: view.id,
                            viewName: view.name,
                            url: previewDataUrl
                        };
                    }
                }
                
                return {
                    viewId: view.id,
                    viewName: view.name,
                    url: previewDataUrl
                };
            } catch (error) {
                console.error(`Error generating preview for view ${viewId}:`, error);
                return null;
            }
        })
    );

    return previews.filter(Boolean) as ViewPreview[];
}      console.log(`Layer ${i} detailed contents:`, {
        layerName: layer.attrs.name || 'unnamed',
        visible: layer.isVisible(),
        opacity: layer.opacity(),
        totalNodes: layer.children?.length || 0,
        visibleNodes: visibleNodes.length,
        nodeTypes: visibleNodes.map(n => n.getClassName()),
        nodes: nodeDetails,
      });

      if (visibleNodes.length > 0) {
        hasVisibleContent = true;
      }
    });

    if (!hasVisibleContent) {
      console.warn('No visible content found in any layer!');
    }

    // Force stage update
    stage.draw();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Generate high-quality preview
    console.log('Preparing to capture stage content...');
    
    // Create a new canvas for manual compositing
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = width * 2; // 2x for higher quality
    renderCanvas.height = height * 2;
    const renderCtx = renderCanvas.getContext('2d');
    
    if (!renderCtx) {
      throw new Error('Could not get render context');
    }

    // Fill white background
    renderCtx.fillStyle = '#FFFFFF';
    renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    // Draw each layer manually
    for (const layer of stage.getLayers()) {
      if (!layer.isVisible()) continue;

      console.log(`Rendering layer: ${layer.attrs.name || 'unnamed'}`, {
        visible: layer.isVisible(),
        hasContent: layer.children?.length > 0,
      });

      const layerCanvas = layer.getCanvas()._canvas;
      renderCtx.drawImage(
        layerCanvas, 
        0, 0, layerCanvas.width, layerCanvas.height,
        0, 0, renderCanvas.width, renderCanvas.height
      );
    }

    // Convert to data URL
    console.log('Converting canvas to data URL...');
    const dataUrl = renderCanvas.toDataURL('image/png', 1.0);

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
        
        // Initialize counters for different pixel types
        let stats = {
          white: 0,
          black: 0,
          colored: 0,
          transparent: 0
        };

        // Check content by analyzing pixel distribution
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];

          if (a < 250) {
            stats.transparent++;
          } else if (r === 255 && g === 255 && b === 255) {
            stats.white++;
          } else if (r === 0 && g === 0 && b === 0) {
            stats.black++;
          } else {
            stats.colored++;
          }
        }

        const totalPixels = (canvas.width * canvas.height);
        const percentages = {
          white: (stats.white / totalPixels) * 100,
          black: (stats.black / totalPixels) * 100,
          colored: (stats.colored / totalPixels) * 100,
          transparent: (stats.transparent / totalPixels) * 100
        };
        
        console.log('Content analysis:', {
          dimensions: `${canvas.width}x${canvas.height}`,
          totalPixels,
          pixelCounts: stats,
          percentages: Object.fromEntries(
            Object.entries(percentages).map(
              ([key, value]) => [key, `${value.toFixed(2)}%`]
            )
          )
        });

        // Image is valid if it has significant non-white content
        const nonWhiteContent = stats.black + stats.colored;
        const hasContent = (nonWhiteContent / totalPixels) * 100 > 0.5; // More than 0.5% non-white

        if (!hasContent) {
          console.warn('Preview validation failed: insufficient content detected');
        }

        resolve(hasContent);
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
        
        // First, reset all layers and nodes
        stage.getLayers().forEach(layer => {
          layer.show();
          layer.opacity(1);
          layer.children?.forEach(child => {
            child.hide(); // Hide all initially
            child.opacity(1);
            child.scale({ x: 1, y: 1 });
            child.rotation(0);
          });
        });

        // Then, show only the relevant nodes
        let foundContent = false;
        stage.getLayers().forEach(layer => {
          if (layer.attrs.name === 'background') {
            console.log('Ensuring background layer is visible');
            layer.show();
            layer.moveToBottom();
            return;
          }
          
          layer.show();
          layer.children?.forEach(child => {
            if (child.attrs.viewId === viewId) {
              console.log(`Showing node for view ${viewId}:`, {
                id: child.attrs.id,
                type: child.getClassName(),
                bounds: child.getClientRect()
              });
              child.show();
              child.moveToTop();
              foundContent = true;
            }
          });
        });

        if (!foundContent) {
          console.warn(`No content found for view ${viewId}!`);
        }

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