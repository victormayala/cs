
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { EmbedCodeModal } from "@/components/customizer/EmbedCodeModal";
import { CodeXml, LayoutDashboard, Settings, X as CloseIcon, LogOut } from "lucide-react"; // Added LogOut
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; // Added useToast
import { Logo } from '../icons/Logo';

export default function AppHeader() {
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const { user, signOut: authSignOut } = useAuth(); // Destructure signOut as authSignOut
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast(); // Initialize toast

  const [customizerShareUrlPath, setCustomizerShareUrlPath] = useState<string | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  useEffect(() => {
    const productIdFromParams = searchParams.get('productId');
    const sourceFromParams = searchParams.get('source');
    setCurrentProductId(productIdFromParams);

    if (pathname.startsWith('/customizer')) {
      if (productIdFromParams) {
        let urlPath = `/customizer?productId=${productIdFromParams}`;
        if(sourceFromParams) {
          urlPath += `&source=${sourceFromParams}`;
        }
        if (user?.uid) {
          urlPath += `&userId=${user.uid}`;
        }
        setCustomizerShareUrlPath(urlPath);
      } else {
        let urlPath = `/customizer`;
        if (user?.uid) {
          urlPath += `?userId=${user.uid}`;
        }
         setCustomizerShareUrlPath(urlPath);
      }
    } else {
      setCustomizerShareUrlPath(null);
    }
  }, [pathname, searchParams, user]);


  const handleAttemptCloseCustomizer = () => {
    window.dispatchEvent(new CustomEvent('attemptCloseCustomizer'));
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      // Toast for sign out is handled by AuthContext now
    } catch (error) {
      console.error("AppHeader sign out error:", error);
      toast({
        title: "Sign Out Failed",
        description: "Could not sign you out at this time. Please try again.",
        variant: "destructive",
      });
    }
  };

  const showCustomizerSpecificButtons = pathname.startsWith('/customizer');
  const source = searchParams.get('source');

  return (
    <header className="flex items-center justify-between h-16 border-b bg-card shadow-sm px-4 md:px-6 w-full flex-shrink-0">
      <div className="flex items-center gap-4">
        <Logo />
      </div>
      <div className="flex items-center gap-2">
        {showCustomizerSpecificButtons && (
          <Button
            onClick={() => setIsEmbedModalOpen(true)}
            variant="outline"
            className="hover:bg-accent hover:text-accent-foreground"
            disabled={!customizerShareUrlPath}
          >
            <CodeXml className="mr-2 h-4 w-4" />
            Embed Code
          </Button>
        )}
        {showCustomizerSpecificButtons && currentProductId && (
          <Button asChild variant="outline" className="hover:bg-accent hover:text-accent-foreground">
            <Link href={`/dashboard/products/${encodeURIComponent(currentProductId)}/options?source=${source}`}>
              <Settings className="mr-2 h-4 w-4" />
              Product Options
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="hover:bg-accent hover:text-accent-foreground">
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        {user && showCustomizerSpecificButtons && (
          <Button
            onClick={handleAttemptCloseCustomizer}
            variant="outline"
            size="icon"
            className="hover:bg-destructive/10 hover:text-destructive"
            title="Close Customizer"
            aria-label="Close Customizer"
          >
            <CloseIcon className="h-5 w-5" />
          </Button>
        )}
        {user && !showCustomizerSpecificButtons && (
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm" // Changed to sm for consistency or icon
            className="hover:bg-accent hover:text-accent-foreground"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        )}
      </div>
      <EmbedCodeModal
        isOpen={isEmbedModalOpen}
        onOpenChange={setIsEmbedModalOpen}
        customizerUrlPath={customizerShareUrlPath}
      />
    </header>
  );
}
