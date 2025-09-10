
import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';

// This function will fetch data at build time or on-demand
async function getStoreConfig(storeId: string): Promise<UserStoreConfig | null> {
    if (!db) return null; // Firestore not initialized
    try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (storeDocSnap.exists()) {
            return storeDocSnap.data() as UserStoreConfig;
        }
        return null;
    } catch (error) {
        console.error("Error fetching store config for metadata:", error);
        return null;
    }
}

function hexToHsl(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;

  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h=0, s=0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}


export async function generateMetadata({ params }: { params: { storeId: string } }): Promise<Metadata> {
  const storeConfig = await getStoreConfig(params.storeId);
  const storeName = storeConfig?.storeName || 'Custom Store';
  return {
    title: storeName,
    description: `Shop for customizable products at ${storeName}.`,
    // You could add more metadata from storeConfig here, like an Open Graph image
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
}) {
  const storeConfig = await getStoreConfig(params.storeId);
  const primaryHsl = storeConfig ? hexToHsl(storeConfig.branding.primaryColorHex) : null;
  const secondaryHsl = storeConfig ? hexToHsl(storeConfig.branding.secondaryColorHex) : null;

  return (
    <>
      <style jsx global>{`
        :root {
          ${primaryHsl ? `--primary: ${primaryHsl};` : ''}
          ${secondaryHsl ? `--secondary: ${secondaryHsl};` : ''}
          ${secondaryHsl ? `--accent: ${secondaryHsl};` : ''}
        }
      `}</style>
      {children}
    </>
  );
}
