
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowLeft, BarChart3, ShoppingCart, Users, FileCheck, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';

interface StoreNavProps {
  storeId: string;
}

interface StoreNavHeaderProps extends StoreNavProps {
    storeName?: string;
}

const navItems = [
    { href: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: 'orders', label: 'Orders', icon: ShoppingCart },
    { href: 'customers', label: 'Customers', icon: Users },
    { href: 'approved-files', label: 'Approved Files', icon: FileCheck },
    { href: 'settings', label: 'Store Settings', icon: Settings },
];

export function StoreNav({ storeId }: StoreNavProps) {
  const pathname = usePathname();
  const activePath = pathname.split('/').pop();

  return (
    <Sidebar className="sticky top-16 h-[calc(100vh-4rem)] w-64 hidden lg:flex border-r">
        <SidebarContent className="p-4">
            <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild size="lg" variant="ghost" className="justify-start mb-4">
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            All Stores
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {navItems.map(item => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            size="lg"
                            variant="ghost"
                            className="justify-start"
                            isActive={activePath === item.href}
                        >
                            <Link href={`/dashboard/store/${storeId}/${item.href}`}>
                                <item.icon className="mr-2 h-5 w-5" />
                                {item.label}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
    </Sidebar>
  );
}


export function StoreNavHeader({ storeId, storeName }: StoreNavHeaderProps) {
    const pathname = usePathname();
    const activePath = pathname.split('/').pop();

    const renderMobileNavLinks = () => (
        <nav className="flex flex-col space-y-2 pt-4">
          {navItems.map(item => (
            <Button
              key={item.href}
              asChild
              variant={activePath === item.href ? 'secondary' : 'ghost'}
              className="justify-start"
            >
              <Link href={`/dashboard/store/${storeId}/${item.href}`}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
    );

    return (
        <header className="sticky top-16 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 lg:hidden">
            <div className="flex items-center gap-4">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Navigation</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-4 pt-10">
                        <SidebarMenuButton asChild size="lg" variant="ghost" className="justify-start mb-4">
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                All Stores
                            </Link>
                        </SidebarMenuButton>
                        {renderMobileNavLinks()}
                    </SheetContent>
                </Sheet>
                <h1 className="text-xl font-semibold">{storeName || 'Store Management'}</h1>
            </div>
            <div className="ml-auto flex items-center gap-4">
                 <Button asChild>
                    <Link href={`/store/${storeId}`} target="_blank">
                        <Home className="mr-2 h-4 w-4" /> View Store
                    </Link>
                </Button>
            </div>
        </header>
    );
}

// Wrapper component to apply layout
export function StoreLayout({ children, storeId, storeName }: { children: React.ReactNode; storeId: string; storeName?: string; }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <StoreNavHeader storeId={storeId} storeName={storeName} />
        <div className="flex flex-1">
            <StoreNav storeId={storeId} />
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {children}
            </main>
        </div>
    </div>
  );
}
