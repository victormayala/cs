
"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Play, RefreshCcwIcon, Wand2, Lightbulb } from "lucide-react";
import { generateDesignFromPrompt, type GenerateDesignFromPromptInput, type GenerateDesignFromPromptOutput } from '@/ai/flows/generate-design-from-prompt';
import { makeBackgroundTransparent, type MakeBackgroundTransparentInput, type MakeBackgroundTransparentOutput } from '@/ai/flows/make-background-transparent';
import { suggestDesignElements } from '@/ai/flows/suggest-design-elements';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUploads } from '@/contexts/UploadContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { BoundaryBox } from '@/app/actions/productOptionsActions';

interface AiAssistantProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[];
}

export default function AiAssistant({ activeViewId, boundaryBoxes }: AiAssistantProps) {
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string | null>(null);
  const [generatedImageDescription, setGeneratedImageDescription] = useState<string | null>(null);

  const [isMakingTransparent, setIsMakingTransparent] = useState(false);
  const [transparencyError, setTransparencyError] = useState<string | null>(null);
  
  // New state for suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const { addCanvasImageFromUrl, canvasImages, canvasTexts, canvasShapes } = useUploads();
  const { toast } = useToast();

  const triggerDesignGeneration = useCallback(async (currentPrompt: string) => {
    if (!currentPrompt.trim()) {
      setError("Please enter a design idea.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTransparencyError(null);
    setSuggestionError(null);
    setGeneratedImageDataUrl(null);
    setGeneratedImageDescription(null);

    try {
      const input: GenerateDesignFromPromptInput = { userPrompt: currentPrompt };
      const result: GenerateDesignFromPromptOutput = await generateDesignFromPrompt(input);
      setGeneratedImageDataUrl(result.generatedImageUrl);
      setGeneratedImageDescription(result.generatedImageDescription);
    } catch (err) {
      console.error("AI design generation error:", err);
      let errorMessage = "Failed to generate design. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({
        title: "Design Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerDesignGeneration(promptText);
  };

  const handleUseDesign = () => {
    if (!generatedImageDataUrl || !activeViewId) {
      toast({
        title: "Error",
        description: !activeViewId ? "Please select a product view first." : "No generated design to use.",
        variant: "destructive",
      });
      return;
    }
    const imageName = generatedImageDescription || `AI Design: ${promptText.substring(0, 20)}`;
    addCanvasImageFromUrl(imageName, generatedImageDataUrl, 'image/png', activeViewId, boundaryBoxes, `ai_gen_${Date.now()}`);
    toast({
      title: "Design Added",
      description: "The AI generated design has been added to your canvas.",
    });
    // Reset after using
    setGeneratedImageDataUrl(null);
    setGeneratedImageDescription(null);
    setPromptText(''); 
    setError(null);
    setTransparencyError(null);
    setSuggestionError(null);
  };

  const handleTryAgain = async () => {
    setGeneratedImageDataUrl(null);
    setGeneratedImageDescription(null);
    setError(null); 
    setTransparencyError(null);
    await triggerDesignGeneration(promptText);
  };

  const handleMakeTransparent = async () => {
    if (!generatedImageDataUrl) {
      setTransparencyError("No image available to process.");
      return;
    }
    setIsMakingTransparent(true);
    setTransparencyError(null);
    setError(null); 

    try {
      const input: MakeBackgroundTransparentInput = { imageDataUri: generatedImageDataUrl };
      const result: MakeBackgroundTransparentOutput = await makeBackgroundTransparent(input);
      setGeneratedImageDataUrl(result.processedImageUrl);
      if (result.feedbackText) {
        toast({ title: "Background Removal", description: result.feedbackText, variant: "default" });
      }
    } catch (err) {
      console.error("Background transparency error:", err);
      let errorMessage = "Failed to process background. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setTransparencyError(errorMessage);
      toast({
        title: "Background Removal Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsMakingTransparent(false);
    }
  };

  const handleGetSuggestions = useCallback(async () => {
    if (!activeViewId) {
      toast({
        title: "No Active View",
        description: "Please select a product view before analyzing the canvas.",
        variant: "default"
      });
      return;
    }
    setIsSuggesting(true);
    setSuggestionError(null);
    setSuggestions([]);

    const imageDescriptions = canvasImages.filter(i => i.viewId === activeViewId).map(i => i.name);
    const textDescriptions = canvasTexts.filter(t => t.viewId === activeViewId).map(t => `the text "${t.content}"`);
    const shapeDescriptions = canvasShapes.filter(s => s.viewId === activeViewId).map(s => `a ${s.shapeType}`);
    
    const allElements = [...imageDescriptions, ...textDescriptions, ...shapeDescriptions];
    const composition = allElements.length > 0 
      ? `The canvas currently contains: ${allElements.join(', ')}.`
      : "The canvas is currently empty.";

    try {
      const result = await suggestDesignElements({ designComposition: composition });
      setSuggestions(result.suggestedElements);
    } catch (err) {
      console.error("AI suggestion error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get suggestions. Please try again.";
      setSuggestionError(errorMessage);
      toast({
        title: "Suggestion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
    }
  }, [activeViewId, canvasImages, canvasTexts, canvasShapes, toast]);


  return (
    <div className="p-4 space-y-6">
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-foreground">Generate New Design</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <Label htmlFor="designIdeaPrompt" className="block text-sm font-medium text-foreground mb-1">
              Enter your design idea:
            </Label>
            <Textarea
              id="designIdeaPrompt"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., a cute cat wearing sunglasses, a retro sunset over mountains..."
              rows={3}
              className="bg-background"
              disabled={isLoading || isMakingTransparent || isSuggesting}
            />
          </div>
          <Button type="submit" disabled={isLoading || isMakingTransparent || isSuggesting || !promptText.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {(isLoading && !generatedImageDataUrl && !isMakingTransparent) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Design
          </Button>
        </form>

        {(isLoading || isMakingTransparent) && (
          <div className="flex flex-col items-center justify-center text-center py-4 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isMakingTransparent ? "Attempting to remove background..." : "Generating your design..."} this may take a moment.
              </p>
          </div>
        )}

        {error && !isLoading && !isMakingTransparent && (
          <Alert variant="destructive">
            <AlertTitle>Generation Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={handleTryAgain} variant="outline" size="sm" className="mt-2" disabled={isMakingTransparent || !promptText.trim()}>
                <RefreshCcwIcon className="mr-2 h-4 w-4" /> Try Again With Same Prompt
              </Button>
          </Alert>
        )}

        {transparencyError && !isLoading && !isMakingTransparent && (
          <Alert variant="destructive">
            <AlertTitle>Transparency Helper Error</AlertTitle>
            <AlertDescription>{transparencyError}</AlertDescription>
          </Alert>
        )}

        {generatedImageDataUrl && !isLoading && !isMakingTransparent && (
          <div className="space-y-3 p-3 border rounded-md bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">Generated Design Preview:</h3>
            <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-background">
              <Image 
                src={generatedImageDataUrl} 
                alt={generatedImageDescription || "AI Generated Design Preview"} 
                fill 
                className="object-contain"
                data-ai-hint={generatedImageDescription?.split(" ").slice(0,2).join(" ") || "ai generated"}
                key={generatedImageDataUrl} 
              />
            </div>
            {generatedImageDescription && (
              <p className="text-xs text-muted-foreground italic">Description: {generatedImageDescription}</p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-2">
              <Button onClick={handleUseDesign} className="sm:col-span-1 bg-green-600 hover:bg-green-700 text-white">
                <Play className="mr-2 h-4 w-4" /> Use
              </Button>
              <Button onClick={handleTryAgain} variant="outline" className="sm:col-span-1" disabled={isLoading || isMakingTransparent || !promptText.trim()}>
                <RefreshCcwIcon className="mr-2 h-4 w-4" /> Try Again
              </Button>
              <Button onClick={handleMakeTransparent} variant="outline" className="sm:col-span-2" disabled={isLoading || isMakingTransparent}>
                <Wand2 className="mr-2 h-4 w-4" /> Make Transparent
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-md font-semibold text-foreground">Get Suggestions</h3>
        <p className="text-xs text-muted-foreground">Let AI analyze your current design and suggest additions.</p>
        <Button onClick={handleGetSuggestions} disabled={isSuggesting || isLoading || isMakingTransparent} className="w-full">
            {isSuggesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Lightbulb className="mr-2 h-4 w-4" />
            )}
            Analyze Canvas & Suggest
        </Button>
        {isSuggesting && (
            <div className="flex items-center justify-center text-sm text-muted-foreground p-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Thinking...
            </div>
        )}
        {suggestionError && !isSuggesting && (
            <Alert variant="destructive">
                <AlertTitle>Suggestion Error</AlertTitle>
                <AlertDescription>{suggestionError}</AlertDescription>
            </Alert>
        )}
        {suggestions.length > 0 && !isSuggesting && (
            <div className="p-3 border rounded-md bg-muted/20 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Suggestions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
}
