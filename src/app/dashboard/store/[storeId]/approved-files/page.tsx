
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, doc, onSnapshot, addDoc, deleteDoc, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import AppHeader from '@/components/layout/AppHeader';
import { ArrowLeft, Loader2, UploadCloud, Trash2, FileCheck, FolderOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserStoreConfig } from '@/app/actions/userStoreActions';


export interface ApprovedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  path: string; // Full path in Firebase Storage
  createdAt: any;
}

function ApprovedFilesPageContent() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [approvedFiles, setApprovedFiles] = useState<ApprovedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToDelete, setFileToDelete] = useState<ApprovedFile | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !storeId) return;

    // Fetch store config
    const storeRef = doc(db, 'userStores', storeId);
    getDoc(storeRef).then(docSnap => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        setStoreConfig({ id: docSnap.id, ...docSnap.data() } as UserStoreConfig);
      } else {
        toast({ title: "Error", description: "Store not found or permission denied.", variant: "destructive" });
        router.push('/dashboard');
      }
    });

    // Listen for approved files
    const filesQuery = query(collection(db, `userStores/${storeId}/approvedFiles`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const files: ApprovedFile[] = [];
      snapshot.forEach(doc => files.push({ id: doc.id, ...doc.data() } as ApprovedFile));
      setApprovedFiles(files);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching approved files:", error);
      toast({ title: "Error", description: "Could not fetch approved files.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, router, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storeId) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "File too large", description: "Please upload a file smaller than 5MB.", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `users/${user.uid}/stores/${storeId}/approved_files/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload Error:", error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const filesCollectionRef = collection(db, `userStores/${storeId}/approvedFiles`);
        await addDoc(filesCollectionRef, {
          name: file.name,
          url: downloadURL,
          type: file.type,
          path: storagePath,
          createdAt: serverTimestamp(),
        });
        toast({ title: "File Uploaded", description: `${file.name} has been added to approved files.` });
        setIsUploading(false);
      }
    );
  };
  
  const confirmDeleteFile = async () => {
    if (!fileToDelete || !storeId) return;

    const fileRef = ref(storage, fileToDelete.path);
    try {
      await deleteObject(fileRef); // Delete from Storage
      await deleteDoc(doc(db, `userStores/${storeId}/approvedFiles`, fileToDelete.id)); // Delete from Firestore
      toast({ title: "File Deleted", description: `${fileToDelete.name} has been removed.` });
      setFileToDelete(null);
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  };


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                Approved Files for "{storeConfig?.storeName}"
              </h1>
              <p className="text-muted-foreground">
                Manage pre-approved brand assets like logos for this store.
              </p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
                <CardTitle>Upload New File</CardTitle>
                <CardDescription>Upload logos or other assets to make them available in the customizer for this store.</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-center">
                        <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="font-semibold">Click to upload or drag & drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG, etc. (Max 5MB)</p>
                    </div>
                </div>
                <Input 
                    ref={fileInputRef} 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                    disabled={isUploading}
                />
                 {isUploading && (
                    <div className="mt-4">
                        <Progress value={uploadProgress} className="w-full" />
                        <p className="text-sm text-center mt-1 text-muted-foreground">{Math.round(uploadProgress)}%</p>
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>File Library</CardTitle>
                <CardDescription>These files are available in the customizer under the "Approved" tab for this store.</CardDescription>
            </CardHeader>
            <CardContent>
                {approvedFiles.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <FolderOpen className="mx-auto h-12 w-12 mb-2" />
                        <p>No approved files yet. Upload a file to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {approvedFiles.map(file => (
                            <div key={file.id} className="relative group border rounded-lg p-2 flex flex-col items-center justify-center gap-2 aspect-square">
                                <Image src={file.url} alt={file.name} width={80} height={80} className="object-contain" />
                                <p className="text-xs text-center truncate w-full" title={file.name}>{file.name}</p>
                                <div className="absolute top-1 right-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => setFileToDelete(file)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete File "{fileToDelete?.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the file from your approved assets library. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ApprovedFilesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
            <ApprovedFilesPageContent />
        </Suspense>
    )
}
