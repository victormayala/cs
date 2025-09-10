
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowLeft, BarChart3, ShoppingCart, Users, FileCheck, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';

interface StoreNavProps {
  storeId: string;
  storeName?: string;
}

const navItems = [
    { href: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: 'orders', label: 'Orders', icon: ShoppingCart },
    { href: 'customers', label: 'Customers', icon: Users },
    { href: 'approved-files', label: 'Approved Files', icon: FileCheck },
    { href: 'settings', label: 'Store Settings', icon: Settings },
];

export function StoreNav({ storeId, storeName }: StoreNavProps) {
  const pathname = usePathname();

  const renderNavLinks = (isSheet: boolean = false) => (
    <nav className={cn(isSheet ? "flex flex-col space-y-2" : "hidden md:flex md:flex-row md:gap-4 lg:gap-6")}>
      {navItems.map(item => (
        <Link
          key={item.href}
          href={`/dashboard/store/${storeId}/${item.href}`}
          className={cn(
            "flex items-center gap-2 transition-colors text-sm font-medium",
            pathname.endsWith(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
  
  const SidebarNav = () => (
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
                            size="default"
                            variant="ghost"
                            className="justify-start"
                            isActive={pathname.endsWith(item.href)}
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

  return (
    <>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="lg:hidden" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to All Stores</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold">{storeName || 'Store Management'}</h1>
            </div>
            <div className="ml-auto flex items-center gap-4">
                 <Button asChild>
                    <Link href={`/store/${storeId}`} target="_blank">
                        <Home className="mr-2 h-4 w-4" /> View Store
                    </Link>
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Navigation</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-4">
                        {renderNavLinks(true)}
                    </SheetContent>
                </Sheet>
            </div>
        </header>
        <div className="flex flex-1">
          <SidebarNav />
          <div className="flex-1 overflow-auto">
            {/* The page content will be rendered here */}
          </div>
        </div>
    </>
  );
}

// Wrapper component to apply layout
export function StoreLayout({ children, storeId, storeName }: { children: React.ReactNode; storeId: string; storeName?: string; }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <StoreNav storeId={storeId} storeName={storeName} />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
    </div>
  );
}
