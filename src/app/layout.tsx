
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Customizer Studio - Your Product Customization Platform',
  description: 'Easily create and embed product customizers with Customizer Studio. Connect with Shopify, WordPress, and more.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/embedz.firebasestorage.app/o/misc%2Ffavicon.png?alt=media&token=be00daa8-3460-4da0-86dc-bd6e67f7bce8" sizes="any" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
