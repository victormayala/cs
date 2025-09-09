
"use client";

import React from 'react'; // Import React for React.memo
import GridControls from './GridControls'; 
import HistoryControls from './HistoryControls'; 
import ViewSwitcher from './ViewSwitcher';
import VariantSelector from './VariantSelector'; 
import BoundaryBoxControls from './BoundaryBoxControls';
import type { ProductForCustomizer, ConfigurableAttribute } from '@/app/customizer/page';
import type { WCVariation } from '@/types/woocommerce'; 
import { cn } from '@/lib/utils';
import { type CustomizationTechnique } from '@/app/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';


interface RightPanelProps {
  showGrid: boolean;
  toggleGrid: () => void;
  showBoundaryBoxes: boolean; 
  toggleBoundaryBoxes: () => void; 
  productDetails: ProductForCustomizer | null;
  activeViewId: string | null;
  setActiveViewId: (id: string) => void;
  className?: string;
  configurableAttributes: ConfigurableAttribute[] | null; 
  selectedVariationOptions: Record<string, string>; 
  onVariantOptionSelect: (attributeName: string, optionValue: string) => void; 
  productVariations?: WCVariation[] | null; 
  selectedTechnique: CustomizationTechnique | null;
  setSelectedTechnique: (technique: CustomizationTechnique) => void;
}

const RightPanelComponent = ({ 
  showGrid, 
  toggleGrid,
  showBoundaryBoxes, 
  toggleBoundaryBoxes, 
  productDetails,
  activeViewId,
  setActiveViewId,
  className,
  configurableAttributes,
  selectedVariationOptions,
  onVariantOptionSelect,
  productVariations, 
  selectedTechnique,
  setSelectedTechnique,
}: RightPanelProps) => {
  return (
  <div 
    id="right-panel-content"
    className={cn(
      "shadow-sm border-l bg-card flex flex-col", 
      className 
    )}
  >
    <div 
      className={cn(
        "flex-1 h-full overflow-y-auto overflow-x-hidden pb-20",
        "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
      )}
    >
  
      {/* Product Variants Section */}
      {productDetails?.type === 'variable' && configurableAttributes && configurableAttributes.length > 0 && (
        <div>
          <div className="px-4 pt-4 pb-1">
            <h2 className="font-headline text-lg font-semibold text-foreground">
              Select Options
            </h2>
          </div>
          <div className="border-b mx-0"></div> 
          <div className="px-4 py-3">
            <VariantSelector
              attributes={configurableAttributes}
              selectedOptions={selectedVariationOptions}
              onOptionSelect={onVariantOptionSelect}
              productVariations={productVariations} 
            />
          </div>
        </div>
      )}

      {/* Technique Selector */}
      {productDetails?.customizationTechniques && productDetails.customizationTechniques.length > 0 && (
          <div>
              <div className="px-4 pt-3 pb-1 border-t">
                  <h2 className="font-headline text-lg font-semibold text-foreground">
                      Customization
                  </h2>
              </div>
              <div className="border-b mx-0"></div>
              <div className="px-4 py-3 space-y-2">
                <Label htmlFor="technique-select" className="text-sm text-muted-foreground">Technique:</Label>
                <Select
                  value={selectedTechnique ?? ''}
                  onValueChange={(value) => {
                    if (value) setSelectedTechnique(value as CustomizationTechnique);
                  }}
                >
                    <SelectTrigger id="technique-select">
                        <SelectValue placeholder="Select a technique" />
                    </SelectTrigger>
                    <SelectContent>
                        {productDetails.customizationTechniques.map(technique => (
                            <SelectItem key={technique} value={technique}>
                                {technique}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          </div>
      )}

      {/* Product Views Section */}
      <div>
        <div className="px-4 pt-3 pb-1 border-t"> 
          <h2 className="font-headline text-lg font-semibold text-foreground">
            Product Views
          </h2>
        </div>
        <div className="border-b mx-0"></div> 
        <div className="px-4 py-3"> 
          {productDetails && productDetails.views && productDetails.views.length > 0 ? (
            <ViewSwitcher
              productViews={productDetails.views}
              activeViewId={activeViewId}
              setActiveViewId={setActiveViewId}
              selectedTechnique={selectedTechnique}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center">No views available.</p>
          )}
        </div>
      </div>
      
      {/* Canvas Helpers Section */}
      <div>
        <div className="px-4 pt-3 pb-1 border-t"> 
          <h2 className="font-headline text-lg font-semibold text-foreground">Canvas Helpers</h2>
        </div>
        <div className="border-b mx-0"></div> 
        <div className="px-4 py-3 space-y-3"> 
          <HistoryControls />
          <BoundaryBoxControls showBoundaryBoxes={showBoundaryBoxes} toggleBoundaryBoxes={toggleBoundaryBoxes} /> 
          <GridControls showGrid={showGrid} toggleGrid={toggleGrid} />
        </div>
      </div>
    </div>
  </div>
  );
}

const RightPanel = React.memo(RightPanelComponent);
RightPanel.displayName = 'RightPanel';
export default RightPanel;
