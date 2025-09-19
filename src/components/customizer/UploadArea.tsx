
"use client";

import React, { ChangeEvent, useRef, useState, useEffect } from 'react';
import { useUploads, type UploadedImage } from '@/contexts/UploadContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { UploadCloud, PlusCircle, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { ApprovedFile } from '@/app/dashboard/store/[storeId]/approved-files/page';
import type { BoundaryBox } from '@/app/actions/productOptionsActions'; // Import BoundaryBox

interface UploadAreaProps {
  activeViewId: string | null;
  boundaryBoxes: BoundaryBox[]; // Add boundaryBoxes to props
}

export default function UploadArea({ activeViewId, boundaryBoxes }: UploadAreaProps) {
  const { uploadedImages, addUploadedImage, addCanvasImage, addCanvasImageFromUrl } = useUploads();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');

  const [approvedFiles, setApprovedFiles] = useState<ApprovedFile[]>([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);
  const [errorApproved, setErrorApproved] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setIsLoadingApproved(false);
      return;
    }
    setIsLoadingApproved(true);
    const filesQuery = query(collection(db, `userStores/${storeId}/approvedFiles`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const files: ApprovedFile[] = [];
      snapshot.forEach(doc => files.push({ id: doc.id, ...doc.data() } as ApprovedFile));
      setApprovedFiles(files);
      setIsLoadingApproved(false);
      setErrorApproved(null);
    }, (err) => {
      console.error("Error fetching approved files:", err);
      setErrorApproved("Could not load approved files.");
      setIsLoadingApproved(false);
    });

    return () => unsubscribe();
  }, [storeId]);


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an image file (PNG, JPG, GIF, etc.).",
        });
        event.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
         toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB.",
        });
        event.target.value = '';
        return;
      }
      await addUploadedImage(file);
      event.target.value = '';
    }
  };

  const handleImageClick = (image: UploadedImage) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    addCanvasImage(image.id, activeViewId, boundaryBoxes);
  };
  
  const handleApprovedFileClick = (file: ApprovedFile) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    addCanvasImageFromUrl(file.name, file.url, file.type, activeViewId, boundaryBoxes, file.id);
  };

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      <div>
        <Input
          type="file"
          id="fileUpload"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
        <p className="text-xs text-muted-foreground mt-1 text-center">Max 5MB. PNG, JPG, GIF.</p>
      </div>

      {uploadedImages.length > 0 && (
        <div className="flex-grow border rounded-md bg-background overflow-y-auto">
          <div className="p-2 space-y-2">
            <p className="text-xs text-muted-foreground px-1 pb-1">Your Uploads:</p>
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                onClick={() => handleImageClick(image)}
                className="p-2 border rounded-md cursor-pointer bg-card hover:bg-accent/5 flex items-center gap-3 transition-all border-border group"
                title={`Add "${image.name}" to canvas`}
              >
                <Image
                  src={image.dataUrl}
                  alt={image.name}
                  width={40}
                  height={40}
                  className="rounded object-cover aspect-square bg-muted-foreground/10"
                />
                <span className="text-sm truncate flex-grow">{image.name}</span>
                <PlusCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
            ))}
          </div>
        </div>
      )}

      {storeId && (
          <>
            <Separator />
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2"><FileCheck className="h-4 w-4 text-primary"/> Approved Assets</h4>
                {isLoadingApproved ? (
                     <div className="flex items-center justify-center text-sm text-muted-foreground p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                    </div>
                ) : errorApproved ? (
                     <div className="flex items-center justify-center text-sm text-destructive p-4">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {errorApproved}
                    </div>
                ) : approvedFiles.length > 0 ? (
                    <div className="flex-grow border rounded-md bg-background overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2 p-2">
                             {approvedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => handleApprovedFileClick(file)}
                                    className="p-2 border rounded-md cursor-pointer bg-card hover:bg-accent/5 flex flex-col items-center justify-center gap-2 transition-all border-border group aspect-square"
                                    title={`Add "${file.name}" to canvas`}
                                >
                                    <div className="relative w-12 h-12">
                                        <Image
                                            src={file.url}
                                            alt={file.name}
                                            fill
                                            sizes="(max-width: 768px) 33vw, 10vw"
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-xs text-center truncate w-full">{file.name}</span>
                                    <PlusCircle className="absolute top-1 right-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground p-2">No approved files for this store.</p>
                )}
            </div>
          </>
      )}

      {uploadedImages.length === 0 && !storeId && (
         <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20">
          <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
          <p className="text-xs text-muted-foreground">Click the button above to upload.</p>
        </div>
      )}

    </div>
  );
}
