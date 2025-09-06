
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, BarChart3, Users, Store, DollarSign } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useToast } from '@/hooks/use-toast';

function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You must be an administrator to view this page.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [user, isLoading, router, toast]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Placeholder data - in a real implementation, you would fetch this data
  const platformStats = {
    totalUsers: 1250,
    activeStores: 342,
    totalOrders: 8790,
    totalRevenue: 250123.45,
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto space-y-8">
          <div className="flex items-center gap-4">
             <ShieldCheck className="h-10 w-10 text-primary" />
             <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                    Administrator Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Platform-wide analytics and management tools.
                </p>
             </div>
          </div>
          
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{platformStats.totalUsers.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+50 in the last month</p>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
                      <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{platformStats.activeStores.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+20 in the last month</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{platformStats.totalOrders.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+12% from last month</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${platformStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <p className="text-xs text-muted-foreground">Analysis coming soon</p>
                  </CardContent>
              </Card>
          </div>
          
          <Card>
              <CardHeader>
                  <CardTitle>Platform Management</CardTitle>
                  <CardDescription>More tools for managing users, stores, and platform settings will be available here.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Feature development in progress...</p>
              </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

export default AdminDashboardPage;
