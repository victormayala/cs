
"use client";

import React, { useState, useEffect } from 'react';
import { useUploads } from '@/contexts/UploadContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import { FileCheck, PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import type { ApprovedFile } from '@/app/dashboard/store/[storeId]/approved-files/page';

interface ApprovedFilesPanelProps {
  activeViewId: string | null;
  configUserId?: string | null;
}

export default function ApprovedFilesPanel({ activeViewId, configUserId }: ApprovedFilesPanelProps) {
  const { addCanvasImageFromUrl } = useUploads();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');

  const [approvedFiles, setApprovedFiles] = useState<ApprovedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false);
      // It's a valid state to not have a storeId (e.g., when customizing from the main dashboard)
      return;
    }

    setIsLoading(true);
    const filesQuery = query(collection(db, `userStores/${storeId}/approvedFiles`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const files: ApprovedFile[] = [];
      snapshot.forEach(doc => files.push({ id: doc.id, ...doc.data() } as ApprovedFile));
      setApprovedFiles(files);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching approved files:", err);
      setError("Could not load approved files for this store.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleFileClick = (file: ApprovedFile) => {
    if (!activeViewId) {
      toast({ title: "No Active View", description: "Please select a product view first.", variant: "default" });
      return;
    }
    addCanvasImageFromUrl(file.name, file.url, file.type, activeViewId, file.id);
  };

  if (isLoading) {
    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading files...</p>
        </div>
    );
  }

  if (!storeId) {
     return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20 m-4">
          <FileCheck className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground font-semibold">Approved Files</p>
          <p className="text-xs text-muted-foreground mt-1">This panel is active for native stores.</p>
        </div>
      );
  }

  if (error) {
     return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-destructive/20 rounded-md bg-destructive/10 m-4">
          <AlertCircle className="h-10 w-10 text-destructive mb-2" />
          <p className="text-sm text-destructive font-semibold">Error Loading Files</p>
          <p className="text-xs text-destructive/80 mt-1">{error}</p>
        </div>
      );
  }


  return (
    <div className="p-4 space-y-4 flex flex-col">
      <p className="text-xs text-muted-foreground px-1">Click a file to add it to the canvas. These assets are pre-approved for this store.</p>

      {approvedFiles.length > 0 ? (
        <div className="flex-grow border rounded-md bg-background overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {approvedFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="p-2 border rounded-md cursor-pointer bg-card hover:bg-accent/5 flex flex-col items-center justify-center gap-2 transition-all border-border group aspect-square"
                title={`Add "${file.name}" to canvas`}
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-contain"
                  />
                </div>
                <span className="text-xs text-center truncate w-full">{file.name}</span>
                <PlusCircle className="absolute top-2 right-2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md bg-muted/20">
          <FileCheck className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No approved files found for this store.</p>
        </div>
      )}
    </div>
  );
}
