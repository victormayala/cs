
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, BarChart3, Users, Store, DollarSign, Package } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, collectionGroup, orderBy, limit } from 'firebase/firestore';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { StoreOrder } from '@/lib/data-types';
import { format } from 'date-fns';

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin';
}

function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [storesList, setStoresList] = useState<UserStoreConfig[]>([]);
  const [ordersList, setOrdersList] = useState<StoreOrder[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You must be an administrator to view this page.',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch Users
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const fetchedUsers = usersSnapshot.docs.map(doc => doc.data() as AdminUser);
        setUsersList(fetchedUsers);

        // Fetch Stores
        const storesQuery = query(collection(db, 'userStores'));
        const storesSnapshot = await getDocs(storesQuery);
        const fetchedStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserStoreConfig));
        setStoresList(fetchedStores);
        
        // Fetch Recent Orders
        const ordersQuery = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
        const ordersSnapshot = await getDocs(ordersQuery);
        const fetchedOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreOrder));
        setOrdersList(fetchedOrders);

      } catch (error: any) {
        console.error("Error fetching admin data:", error);
        toast({
          title: "Error Fetching Data",
          description: "Could not load platform data. Check Firestore rules and console for errors.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user, authLoading, router, toast]);

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Placeholder stats - in a real implementation, you would calculate these
  const totalUsers = usersList.length;
  const activeStores = storesList.filter(s => s.deployment?.status === 'active').length;
  const totalOrders = ordersList.length; // Or a separate count query
  const totalRevenue = ordersList.reduce((acc, order) => acc + order.totalAmount, 0);


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
                      <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">All registered users</p>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
                      <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{activeStores.toLocaleString()}</div>
                       <p className="text-xs text-muted-foreground">out of {storesList.length} total stores</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders (Recent)</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Showing last 20 orders</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue (Recent)</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <p className="text-xs text-muted-foreground">From last 20 orders</p>
                  </CardContent>
              </Card>
          </div>
          
          {isLoadingData ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {usersList.map(u => (
                        <TableRow key={u.uid}>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.displayName || 'N/A'}</TableCell>
                          <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>All Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Store Name</TableHead><TableHead>Owner ID</TableHead><TableHead>Layout</TableHead></TableRow></TableHeader>
                    <TableBody>
                       {storesList.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{s.storeName}</TableCell>
                          <TableCell className="font-mono text-xs">{s.userId}</TableCell>
                          <TableCell><Badge variant="outline">{s.layout}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
               <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Store ID</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {ordersList.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell className="font-mono text-xs">{order.storeId}</TableCell>
                          <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                          <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboardPage;
