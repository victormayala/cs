
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bold, Italic, Underline, CaseUpper, CaseLower, Type, Palette, Settings2, Pilcrow, TextCursorInput, Pipette, Waves } from 'lucide-react';
import { useUploads, type CanvasText } from '@/contexts/UploadContext';
import { googleFonts } from '@/lib/google-fonts';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BoundaryBox } from '@/app/actions/productOptionsActions'; // Import BoundaryBox

const sanitizeHex = (hex: string): string => {
  let sanitized = hex.replace(/[^0-9a-fA-F]/g, '');
  if (sanitized.startsWith('#')) {
    sanitized = sanitized.substring(1);
  }
  if (sanitized.length > 6) {
    sanitized = sanitized.substring(0, 6);
  }
  if (sanitized.length === 3) {
    sanitized = sanitized.split('').map(char => char + char).join('');
  }
  return `#${sanitized.padEnd(6, '0').substring(0,6)}`;
};

interface TextToolPanelProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[];
  stageDimensions: { width: number; height: number };
}

const DEFAULT_FONT_FAMILY = googleFonts.find(f => f.name === 'Arial')?.family || 'Arial, sans-serif';
const initialTextToolPanelDefaultStyle: Omit<CanvasText, 'id' | 'viewId' | 'zIndex' | 'isLocked' | 'itemType' | 'movedFromDefault' | 'x' | 'y' | 'rotation' | 'scale'> = {
  content: '',
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: 24,
  textTransform: 'none',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  lineHeight: 1.2,
  letterSpacing: 0,
  color: '#333333',
  outlineEnabled: false,
  outlineColor: '#000000',
  outlineWidth: 0,
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  archAmount: 0,
};


export default function TextToolPanel({ activeViewId, boundaryBoxes, stageDimensions }: TextToolPanelProps) {
  const {
    addCanvasText,
    selectedCanvasTextId,
    canvasTexts,
    updateCanvasText,
    startInteractiveOperation,
    endInteractiveOperation
  } = useUploads();
  const { toast } = useToast();
  
  const selectedText = canvasTexts.find(t => t.id === selectedCanvasTextId && t.viewId === activeViewId);

  const [textValue, setTextValue] = useState(initialTextToolPanelDefaultStyle.content);
  const [currentStyle, setCurrentStyle] = useState<Omit<CanvasText, 'id' | 'viewId' | 'zIndex' | 'isLocked' | 'itemType' | 'movedFromDefault' | 'x' | 'y' | 'rotation' | 'scale'>>({...initialTextToolPanelDefaultStyle});
  const [localTextColorHex, setLocalTextColorHex] = useState(initialTextToolPanelDefaultStyle.color);
  const [localOutlineColorHex, setLocalOutlineColorHex] = useState(initialTextToolPanelDefaultStyle.outlineColor);
  const [localShadowColorHex, setLocalShadowColorHex] = useState(initialTextToolPanelDefaultStyle.shadowColor);

  // States to hold string values for number inputs to allow empty fields
  const [fontSizeStr, setFontSizeStr] = useState<string | number>(initialTextToolPanelDefaultStyle.fontSize);
  const [lineHeightStr, setLineHeightStr] = useState<string | number>(initialTextToolPanelDefaultStyle.lineHeight);
  const [letterSpacingStr, setLetterSpacingStr] = useState<string | number>(initialTextToolPanelDefaultStyle.letterSpacing);
  const [outlineWidthStr, setOutlineWidthStr] = useState<string | number>(initialTextToolPanelDefaultStyle.outlineWidth);
  const [shadowOffsetXStr, setShadowOffsetXStr] = useState<string | number>(initialTextToolPanelDefaultStyle.shadowOffsetX);
  const [shadowOffsetYStr, setShadowOffsetYStr] = useState<string | number>(initialTextToolPanelDefaultStyle.shadowOffsetY);
  const [shadowBlurStr, setShadowBlurStr] = useState<string | number>(initialTextToolPanelDefaultStyle.shadowBlur);
  const [archAmountStr, setArchAmountStr] = useState<string | number>(initialTextToolPanelDefaultStyle.archAmount);

  useEffect(() => {
    if (selectedText) {
      const { id, viewId, zIndex, isLocked, itemType, movedFromDefault, x, y, rotation, scale, ...styleProps } = selectedText;
      setCurrentStyle(styleProps);
      setTextValue(selectedText.content);
      setLocalTextColorHex(selectedText.color);
      setLocalOutlineColorHex(selectedText.outlineColor);
      setLocalShadowColorHex(selectedText.shadowColor);
      // Set string states from selected text
      setFontSizeStr(selectedText.fontSize);
      setLineHeightStr(selectedText.lineHeight);
      setLetterSpacingStr(selectedText.letterSpacing);
      setOutlineWidthStr(selectedText.outlineWidth);
      setShadowOffsetXStr(selectedText.shadowOffsetX);
      setShadowOffsetYStr(selectedText.shadowOffsetY);
      setShadowBlurStr(selectedText.shadowBlur);
      setArchAmountStr(selectedText.archAmount);
    } else {
      const resetStyle = { ...initialTextToolPanelDefaultStyle, content: '', archAmount: 0 };
      setCurrentStyle(resetStyle);
      setTextValue(resetStyle.content); 
      setLocalTextColorHex(resetStyle.color);
      setLocalOutlineColorHex(resetStyle.outlineColor);
      setLocalShadowColorHex(resetStyle.shadowColor);
      // Reset string states
      setFontSizeStr(resetStyle.fontSize);
      setLineHeightStr(resetStyle.lineHeight);
      setLetterSpacingStr(resetStyle.letterSpacing);
      setOutlineWidthStr(resetStyle.outlineWidth);
      setShadowOffsetXStr(resetStyle.shadowOffsetX);
      setShadowOffsetYStr(resetStyle.shadowOffsetY);
      setShadowBlurStr(resetStyle.shadowBlur);
      setArchAmountStr(resetStyle.archAmount);
    }
  }, [selectedText, activeViewId]);


  const handleStyleChange = useCallback(<K extends keyof typeof currentStyle>(property: K, value: (typeof currentStyle)[K]) => {
    setCurrentStyle(prev => {
      const newState = { ...prev, [property]: value };
      if (selectedCanvasTextId && selectedText) {
        updateCanvasText(selectedCanvasTextId, { [property]: value } as Partial<CanvasText>);
      }
      return newState;
    });
  }, [selectedCanvasTextId, updateCanvasText, selectedText]);

  const handleBulkStyleChange = useCallback((updates: Partial<typeof currentStyle>) => {
    setCurrentStyle(prev => {
      const newState = { ...prev, ...updates };
      if (selectedCanvasTextId && selectedText) {
        updateCanvasText(selectedCanvasTextId, updates as Partial<CanvasText>);
      }
      return newState;
    });
  }, [selectedCanvasTextId, updateCanvasText, selectedText]);


  const handleAddText = () => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    if (stageDimensions.width === 0 || stageDimensions.height === 0) {
      toast({ title: "Canvas Not Ready", description: "Please wait for the canvas to load before adding elements.", variant: "default" });
      return;
    }
    const contentToAdd = textValue.trim() || "Your Text"; 
    const styleForNewText: Partial<CanvasText> = {
      ...currentStyle, 
      content: contentToAdd,
      archAmount: currentStyle.archAmount, // Ensure archAmount is passed
    };
    addCanvasText(contentToAdd, activeViewId, stageDimensions.width, stageDimensions.height, styleForNewText);
    
    if (!selectedText) { 
        setTextValue(''); 
        setCurrentStyle(prev => ({...prev, content: '', archAmount: 0})); // Reset archAmount for new text
    }
  };

  const handleContentChange = (newContent: string) => {
    setTextValue(newContent);
    if (selectedCanvasTextId && selectedText) {
       handleStyleChange('content', newContent);
    } else {
        setCurrentStyle(prev => ({...prev, content: newContent}));
    }
  };

  const toggleGroupValue = useMemo(() => {
    return [
      currentStyle.fontWeight === 'bold' ? 'bold' : undefined,
      currentStyle.fontStyle === 'italic' ? 'italic' : undefined,
      currentStyle.textDecoration === 'underline' ? 'underline' : undefined,
    ].filter(Boolean) as string[];
  }, [currentStyle.fontWeight, currentStyle.fontStyle, currentStyle.textDecoration]);


  const renderControls = () => (
    <Accordion type="multiple" defaultValue={['text-font', 'text-spacing', 'text-color', 'text-effects', 'text-arch']} className="w-full">
      <AccordionItem value="text-font">
        <AccordionTrigger className="font-medium text-sm py-3 px-1">
          <Pilcrow className="mr-2 h-4 w-4 text-secondary" />Font
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-3 pb-1 px-1">
          <div>
            <Label htmlFor="fontFamilySelect" className="text-xs mb-1 block">Font Family</Label>
            <Select
              value={currentStyle.fontFamily} 
              onValueChange={(value) => handleStyleChange('fontFamily', value)}
            >
              <SelectTrigger id="fontFamilySelect" className="h-9">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {googleFonts.map((font) => (
                  <SelectItem key={font.name} value={font.family} style={{ fontFamily: font.family }}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
              <Label className="text-xs mb-1 block">Style</Label>
              <ToggleGroup
                  type="multiple"
                  variant="outline"
                  className="w-full grid grid-cols-3 gap-px"
                  value={toggleGroupValue}
                  onValueChange={(styles) => {
                      handleBulkStyleChange({
                          fontWeight: styles.includes('bold') ? 'bold' : 'normal',
                          fontStyle: styles.includes('italic') ? 'italic' : 'normal',
                          textDecoration: styles.includes('underline') ? 'underline' : 'none',
                      });
                  }}
              >
                  <ToggleGroupItem value="bold" aria-label="Toggle bold" className="h-9 w-full px-1 rounded-l-md rounded-r-none border-r-0"><Bold size={18}/></ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Toggle italic" className="h-9 w-full px-1 rounded-none border-r-0"><Italic size={18} /></ToggleGroupItem>
                  <ToggleGroupItem value="underline" aria-label="Toggle underline" className="h-9 w-full px-1 rounded-r-md rounded-l-none"><Underline size={18}/></ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label htmlFor="textTransform" className="text-xs mb-1 block">Case</Label>
              <Select
                value={currentStyle.textTransform} 
                onValueChange={(value: 'none' | 'uppercase' | 'lowercase') => handleStyleChange('textTransform', value)}
              >
                <SelectTrigger id="textTransform" className="h-9"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Normal</SelectItem>
                  <SelectItem value="uppercase"><CaseUpper className="inline h-4 w-4 mr-1"/>Uppercase</SelectItem>
                  <SelectItem value="lowercase"><CaseLower className="inline h-4 w-4 mr-1"/>Lowercase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
              <div className="flex justify-between items-center">
                  <Label htmlFor="fontSizeInput" className="text-xs">Font Size (px)</Label>
                  <Input
                  id="fontSizeInput"
                  type="number"
                  min={8} max={128} step={1}
                  value={fontSizeStr}
                  onChange={e => setFontSizeStr(e.target.value)}
                  onBlur={() => handleStyleChange('fontSize', Math.max(8, Math.min(Number(fontSizeStr), 128)))}
                  className="h-8 w-20 text-xs"
                  />
              </div>
              <Slider
                  id="fontSizeSlider"
                  min={8} max={128} step={1}
                  value={[currentStyle.fontSize]} 
                  onValueChange={([value]) => { setFontSizeStr(value); handleStyleChange('fontSize', value); }}
                  onPointerDownCapture={startInteractiveOperation}
                  onPointerUpCapture={endInteractiveOperation}
                  className="mt-6" 
              />
          </div>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="text-spacing">
        <AccordionTrigger className="font-medium text-sm py-3 px-1">
          <TextCursorInput className="mr-2 h-4 w-4 text-secondary" />Spacing
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-3 pb-1 px-1">
          <div className="mt-6 mb-6">
            <div className="flex justify-between items-center">
              <Label htmlFor="lineHeightInput" className="text-xs">Line Height</Label>
              <Input
                id="lineHeightInput"
                type="number"
                min={0.5} max={3} step={0.1}
                value={lineHeightStr}
                onChange={e => setLineHeightStr(e.target.value)}
                onBlur={() => handleStyleChange('lineHeight', Math.max(0.5, Math.min(Number(lineHeightStr), 3)))}
                className="h-8 w-20 text-xs"
              />
            </div>
            <Slider
              id="lineHeightSlider"
              min={0.5} max={3} step={0.1}
              value={[currentStyle.lineHeight]} 
              onValueChange={([value]) => { setLineHeightStr(value); handleStyleChange('lineHeight', value); }}
              onPointerDownCapture={startInteractiveOperation}
              onPointerUpCapture={endInteractiveOperation}
              className="mt-6"
            />
          </div>
          <div className="mt-6 mb-6">
            <div className="flex justify-between items-center">
              <Label htmlFor="letterSpacingInput" className="text-xs">Letter Spacing (px)</Label>
              <Input
                id="letterSpacingInput"
                type="number"
                min={-5} max={20} step={0.5}
                value={letterSpacingStr}
                onChange={e => setLetterSpacingStr(e.target.value)}
                onBlur={() => handleStyleChange('letterSpacing', Math.max(-5, Math.min(Number(letterSpacingStr), 20)))}
                className="h-8 w-20 text-xs"
              />
            </div>
            <Slider
              id="letterSpacingSlider"
              min={-5} max={20} step={0.5}
              value={[currentStyle.letterSpacing]} 
              onValueChange={([value]) => { setLetterSpacingStr(value); handleStyleChange('letterSpacing', value); }}
              onPointerDownCapture={startInteractiveOperation}
              onPointerUpCapture={endInteractiveOperation}
              className="mt-6"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="text-color">
        <AccordionTrigger className="font-medium text-sm py-3 px-1">
          <Pipette className="mr-2 h-4 w-4 text-secondary" />Color
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-3 pb-1 px-1">
          <div className="flex items-center space-x-2">
            <Label htmlFor="textColorSwatch" className="text-xs shrink-0">Fill Color</Label>
            <Input
              type="color"
              id="textColorSwatch"
              className="h-8 w-10 p-0.5 border-none rounded-md"
              value={localTextColorHex}
              onPointerDownCapture={startInteractiveOperation}
              onPointerUpCapture={endInteractiveOperation}
              onChange={(e) => {
                  setLocalTextColorHex(e.target.value);
                  handleStyleChange('color', e.target.value);
              }}
            />
            <Input
              id="textColorHex"
              className="h-8 text-xs flex-grow max-w-[100px]"
              value={localTextColorHex}
              onChange={(e) => setLocalTextColorHex(e.target.value)}
              onBlur={(e) => {
                  const finalColor = sanitizeHex(e.target.value);
                  setLocalTextColorHex(finalColor);
                  handleStyleChange('color', finalColor);
              }}
              maxLength={7}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="text-effects">
        <AccordionTrigger className="font-medium text-sm py-3 px-1">
          <Palette className="mr-2 h-4 w-4 text-secondary" /> Effects
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-3 pb-1 px-1">
          <div className="space-y-3 pt-2">
              <h4 className="text-xs font-medium text-foreground">Text Outline</h4>
              <div className="pt-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="outlineColorSwatch" className="text-xs shrink-0">Outline Color</Label>
                  <Input
                      type="color"
                      id="outlineColorSwatch"
                      className="h-8 w-10 p-0.5 border-none rounded-md"
                      value={localOutlineColorHex}
                      onPointerDownCapture={startInteractiveOperation}
                      onPointerUpCapture={endInteractiveOperation}
                      onChange={(e) => {
                          setLocalOutlineColorHex(e.target.value);
                          handleStyleChange('outlineColor', e.target.value);
                      }}
                      disabled={currentStyle.outlineWidth === 0 && !selectedText} 
                  />
                  <Input
                      id="outlineColorHex"
                      className="h-8 text-xs flex-grow max-w-[100px]"
                      value={localOutlineColorHex}
                      onChange={(e) => setLocalOutlineColorHex(e.target.value)}
                      onBlur={(e) => {
                          const finalColor = sanitizeHex(e.target.value);
                          setLocalOutlineColorHex(finalColor);
                          handleStyleChange('outlineColor', finalColor);
                      }}
                      maxLength={7}
                      disabled={currentStyle.outlineWidth === 0 && !selectedText} 
                  />
                </div>
                <div className="mt-6 mb-6">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="outlineWidthInput" className="text-xs">Outline Width (px)</Label>
                    <Input
                      id="outlineWidthInput"
                      type="number"
                      min={0} max={10} step={0.5}
                      value={outlineWidthStr}
                      onChange={e => setOutlineWidthStr(e.target.value)}
                      onBlur={() => handleStyleChange('outlineWidth', Math.max(0, Math.min(Number(outlineWidthStr), 10)))}
                      className="h-8 w-20 text-xs"
                    />
                  </div>
                  <Slider
                      id="outlineWidthSlider"
                      min={0} max={10} step={0.5}
                      value={[currentStyle.outlineWidth]} 
                      onValueChange={([value]) => { setOutlineWidthStr(value); handleStyleChange('outlineWidth', value); }}
                      onPointerDownCapture={startInteractiveOperation}
                      onPointerUpCapture={endInteractiveOperation}
                      className="mt-6"
                  />
                </div>
              </div>
          </div>

          <Separator className="my-3" />

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-medium text-foreground">Text Shadow</h4>
              <div className={cn("pt-2 space-y-3")}>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="shadowColorSwatch" className="text-xs shrink-0">Shadow Color</Label>
                  <Input
                      type="color"
                      id="shadowColorSwatch"
                      className="h-8 w-10 p-0.5 border-none rounded-md"
                      value={localShadowColorHex}
                      onPointerDownCapture={startInteractiveOperation}
                      onPointerUpCapture={endInteractiveOperation}
                      onChange={(e) => {
                          setLocalShadowColorHex(e.target.value);
                          handleStyleChange('shadowColor', e.target.value);
                      }}
                      disabled={currentStyle.shadowOffsetX === 0 && currentStyle.shadowOffsetY === 0 && currentStyle.shadowBlur === 0 && !selectedText}
                  />
                  <Input
                      id="shadowColorHex"
                      className="h-8 text-xs flex-grow max-w-[100px]"
                      value={localShadowColorHex}
                      onChange={(e) => setLocalShadowColorHex(e.target.value)}
                      onBlur={(e) => {
                          const finalColor = sanitizeHex(e.target.value);
                          setLocalShadowColorHex(finalColor);
                          handleStyleChange('shadowColor', finalColor);
                      }}
                      maxLength={7}
                      disabled={currentStyle.shadowOffsetX === 0 && currentStyle.shadowOffsetY === 0 && currentStyle.shadowBlur === 0 && !selectedText}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="mt-6 mb-6">
                      <div className="flex justify-between items-center">
                          <Label htmlFor="shadowOffsetXInput" className="text-xs">Shadow Offset X (px)</Label>
                          <Input
                              id="shadowOffsetXInput"
                              type="number"
                              min={-20} max={20} step={1}
                              value={shadowOffsetXStr}
                              onChange={e => setShadowOffsetXStr(e.target.value)}
                              onBlur={() => handleStyleChange('shadowOffsetX', Math.max(-20, Math.min(Number(shadowOffsetXStr), 20)))}
                              className="h-8 w-20 text-xs"
                          />
                      </div>
                      <Slider
                          id="shadowOffsetXSlider"
                          min={-20} max={20} step={1}
                          value={[currentStyle.shadowOffsetX]} 
                          onValueChange={([value]) => { setShadowOffsetXStr(value); handleStyleChange('shadowOffsetX', value); }}
                          onPointerDownCapture={startInteractiveOperation}
                          onPointerUpCapture={endInteractiveOperation}
                          className="mt-6"
                      />
                  </div>
                  <div className="mt-6 mb-6">
                      <div className="flex justify-between items-center">
                          <Label htmlFor="shadowOffsetYInput" className="text-xs">Shadow Offset Y (px)</Label>
                          <Input
                              id="shadowOffsetYInput"
                              type="number"
                              min={-20} max={20} step={1}
                              value={shadowOffsetYStr}
                              onChange={e => setShadowOffsetYStr(e.target.value)}
                              onBlur={() => handleStyleChange('shadowOffsetY', Math.max(-20, Math.min(Number(shadowOffsetYStr), 20)))}
                              className="h-8 w-20 text-xs"
                          />
                      </div>
                      <Slider
                          id="shadowOffsetYSlider"
                          min={-20} max={20} step={1}
                          value={[currentStyle.shadowOffsetY]} 
                          onValueChange={([value]) => { setShadowOffsetYStr(value); handleStyleChange('shadowOffsetY', value); }}
                          onPointerDownCapture={startInteractiveOperation}
                          onPointerUpCapture={endInteractiveOperation}
                          className="mt-6"
                      />
                  </div>
                </div>
                <div className="mt-6 mb-6">
                  <div className="flex justify-between items-center">
                      <Label htmlFor="shadowBlurInput" className="text-xs">Shadow Blur (px)</Label>
                      <Input
                          id="shadowBlurInput"
                          type="number"
                          min={0} max={30} step={1}
                          value={shadowBlurStr}
                          onChange={e => setShadowBlurStr(e.target.value)}
                          onBlur={() => handleStyleChange('shadowBlur', Math.max(0, Math.min(Number(shadowBlurStr), 30)))}
                          className="h-8 w-20 text-xs"
                      />
                  </div>
                  <Slider
                      id="shadowBlurSlider"
                      min={0} max={30} step={1}
                      value={[currentStyle.shadowBlur]} 
                      onValueChange={([value]) => { setShadowBlurStr(value); handleStyleChange('shadowBlur', value); }}
                      onPointerDownCapture={startInteractiveOperation}
                      onPointerUpCapture={endInteractiveOperation}
                      className="mt-6"
                  />
                </div>
              </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="text-arch">
        <AccordionTrigger className="font-medium text-sm py-3 px-1">
          <Waves className="mr-2 h-4 w-4 text-secondary" /> Arch Effect <span className="text-muted-foreground/70 ml-1">(Visual Only)</span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-3 pb-1 px-1">
            <div className="mt-6 mb-6">
              <div className="flex justify-between items-center">
                <Label htmlFor="archAmountInput" className="text-xs">Arch Amount</Label>
                <Input
                  id="archAmountInput"
                  type="number"
                  min={-100} max={100} step={1}
                  value={archAmountStr}
                  onChange={e => setArchAmountStr(e.target.value)}
                  onBlur={() => handleStyleChange('archAmount', Math.max(-100, Math.min(Number(archAmountStr), 100)))}
                  className="h-8 w-20 text-xs"
                />
              </div>
              <Slider
                id="archAmountSlider"
                min={-100} max={100} step={1}
                value={[currentStyle.archAmount]}
                onValueChange={([value]) => { setArchAmountStr(value); handleStyleChange('archAmount', value); }}
                onPointerDownCapture={startInteractiveOperation}
                onPointerUpCapture={endInteractiveOperation}
                className="mt-6"
              />
            </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div className="p-4 space-y-4"> 
      <div>
        <Label htmlFor="textInput" className="text-sm font-medium">Text Content</Label>
        <Textarea
          id="textInput"
          value={textValue}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Enter text here..."
          rows={3}
          className="bg-background mt-1 text-base"
        />
      </div>
      
      <Button onClick={handleAddText} className="w-full bg-primary text-primary-foreground hover:bg-primary/80">
        <Type className="mr-2 h-4 w-4" />
        {selectedText ? "Update Selected Text" : "Add Text to Canvas"}
      </Button>
      
      <Separator />
      
      {renderControls()}

    </div>
  );
}
