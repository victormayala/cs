
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { ArrowLeft, Loader2, AlertTriangle, Users, ShoppingCart, DollarSign, BarChart2 } from 'lucide-react';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { StoreOrder, StoreCustomer, SalesData } from '@/lib/data-types';
import { format, subDays } from 'date-fns';

function StoreDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !storeId) {
      if (!authIsLoading) setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const storeRef = doc(db, 'userStores', storeId);
    getDoc(storeRef).then(docSnap => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        setStoreConfig({ id: docSnap.id, ...docSnap.data() } as UserStoreConfig);
      } else {
        setError("Store not found or permission denied.");
      }
    }).catch(err => {
      setError(`Failed to load store: ${err.message}`);
      console.error(err);
    });

    const ordersQuery = query(
        collection(db, `users/${user.uid}/orders`), 
        where("storeId", "==", storeId), 
        orderBy("createdAt", "desc"),
        limit(5)
    );
    const customersQuery = query(
        collection(db, `users/${user.uid}/customers`), 
        where("storeId", "==", storeId),
        orderBy("createdAt", "desc"),
        limit(50) // Fetch more customers for stats
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        const fetchedOrders: StoreOrder[] = [];
        snapshot.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() } as StoreOrder));
        setOrders(fetchedOrders);
        setIsLoading(false);
    }, (err) => {
        setError(`Failed to load orders: ${err.message}`);
        setIsLoading(false);
    });
    
    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
        const fetchedCustomers: StoreCustomer[] = [];
        snapshot.forEach(doc => fetchedCustomers.push({ id: doc.id, ...doc.data() } as StoreCustomer));
        setCustomers(fetchedCustomers);
    }, (err) => {
        setError(`Failed to load customers: ${err.message}`);
    });


    return () => {
      unsubOrders();
      unsubCustomers();
    };

  }, [user, storeId, authIsLoading]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const totalSales = orders.length;
    const totalCustomers = customers.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    return { totalRevenue, totalSales, totalCustomers, avgOrderValue };
  }, [orders, customers]);
  
  const salesChartData = useMemo(() => {
      const last7Days: SalesData[] = [];
      for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          last7Days.push({ date: format(date, 'EEE'), revenue: 0 });
      }
      
      orders.forEach(order => {
          if (order.createdAt) {
              const orderDateStr = format(order.createdAt.toDate(), 'EEE');
              const dayEntry = last7Days.find(d => d.date === orderDateStr);
              if (dayEntry) {
                  dayEntry.revenue += order.totalAmount;
              }
          }
      });
      return last7Days;
  }, [orders]);


  if (isLoading || authIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Store Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Main Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Dashboard</span>
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
                    {storeConfig?.storeName} Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Analytics and insights for your store.
                </p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Sales</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">+{stats.totalSales}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">New Customers</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">+{stats.totalCustomers}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle><BarChart2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div></CardContent></Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader><CardTitle>Sales Overview</CardTitle></CardHeader>
              <CardContent className="pl-2">
                 <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}/>
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No orders found for this store yet.</p>
                ) : (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>
                            <div className="font-medium">{order.customerName}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                            <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}

export default StoreDashboardPage;
