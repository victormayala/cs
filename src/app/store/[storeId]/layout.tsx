import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import ThemeInjector from './ThemeInjector'; // Import the new client component

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
  
  return (
    <>
      <ThemeInjector
        primaryColor={storeConfig?.branding.primaryColorHex}
        secondaryColor={storeConfig?.branding.secondaryColorHex}
      />
      {children}
    </>
  );
}
