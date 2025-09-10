
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, type QueryDocumentSnapshot, limit, startAfter, endBefore, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, ChevronsRight, ChevronsLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { StoreOrder } from '@/lib/data-types';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';

const PAGE_SIZE = 15;

function OrdersPage() {
    const params = useParams();
    const storeId = params.storeId as string;
    const { user, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [isFirstPage, setIsFirstPage] = useState(true);

    useEffect(() => {
        if (!user || !storeId) return;

        const storeDocRef = doc(db, 'userStores', storeId);
        getDoc(storeDocRef).then((docSnap) => {
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                setStoreConfig(docSnap.data() as UserStoreConfig);
            } else {
                setError("Store not found or you do not have permission to view it.");
            }
        });
    }, [user, storeId]);

    useEffect(() => {
        if (!user || !storeId) {
            setIsLoading(false);
            return;
        }

        const ordersQuery = query(
            collection(db, `users/${user.uid}/orders`),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
        );

        const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            if (snapshot.empty) {
                setOrders([]);
                setFirstVisible(null);
                setLastVisible(null);
                setIsLastPage(true);
                setIsFirstPage(true);
            } else {
                const fetchedOrders: StoreOrder[] = [];
                snapshot.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() } as StoreOrder));
                setOrders(fetchedOrders);
                setFirstVisible(snapshot.docs[0]);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setIsLastPage(snapshot.docs.length < PAGE_SIZE);
                setIsFirstPage(true);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError("Failed to load orders.");
            setIsLoading(false);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        });

        return () => unsubscribe();
    }, [user, storeId, toast]);

    const fetchPage = async (direction: 'next' | 'prev') => {
        if (!user || !storeId) return;
        setIsLoading(true);

        const baseQuery = query(
            collection(db, `users/${user.uid}/orders`),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc")
        );

        let pageQuery;
        if (direction === 'next' && lastVisible) {
            pageQuery = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
            setIsFirstPage(false);
        } else if (direction === 'prev' && firstVisible) {
            // Firestore doesn't have a simple `endBefore` with `limit`. We need `limitToLast`.
            // So we reverse the query and then reverse the result array.
            const prevQuery = query(
                collection(db, `users/${user.uid}/orders`),
                where("storeId", "==", storeId),
                orderBy("createdAt", "asc"), // Reverse order
                startAfter(firstVisible.data().createdAt), // Start after the first visible item of current page
                limit(PAGE_SIZE)
            );
            const prevSnapshot = await getDocs(prevQuery);
            if (!prevSnapshot.empty) {
                 const fetchedOrders: StoreOrder[] = [];
                 prevSnapshot.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() } as StoreOrder));
                 setOrders(fetchedOrders.reverse()); // Reverse back to desc
                 setFirstVisible(prevSnapshot.docs[0]);
                 setLastVisible(prevSnapshot.docs[prevSnapshot.docs.length - 1]);
                 setIsLastPage(false);
                 setIsFirstPage(false); // Can likely go back further
            } else {
                setIsFirstPage(true);
            }
            setIsLoading(false);
            return;
        } else {
            setIsLoading(false);
            return;
        }

        const querySnapshot = await getDocs(pageQuery);
        if (!querySnapshot.empty) {
            const fetchedOrders: StoreOrder[] = [];
            querySnapshot.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() } as StoreOrder));
            setOrders(fetchedOrders);
            setFirstVisible(querySnapshot.docs[0]);
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            setIsLastPage(querySnapshot.docs.length < PAGE_SIZE);
        } else {
            if (direction === 'next') setIsLastPage(true);
        }
        setIsLoading(false);
    };

    if (authIsLoading) {
        return <div className="flex min-h-screen items-center justify-center"><Skeleton className="h-64 w-full max-w-4xl" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive">Error</h2>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart /> Store Orders</CardTitle>
                <CardDescription>A list of all purchases made from this store.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No orders found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                    <TableCell className="font-medium">{order.customerName}</TableCell>
                                    <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => fetchPage('prev')} disabled={isFirstPage || isLoading}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => fetchPage('next')} disabled={isLastPage || isLoading}>Next</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default OrdersPage;
