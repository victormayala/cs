
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit, startAfter, endBefore, documentId, getDoc, QueryDocumentSnapshot, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, ChevronsRight, ChevronsLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { StoreCustomer } from '@/lib/data-types';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';

const PAGE_SIZE = 15;

function CustomersPage() {
    const params = useParams();
    const storeId = params.storeId as string;
    const { user, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
    const [customers, setCustomers] = useState<StoreCustomer[]>([]);
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

        const customersQuery = query(
            collection(db, `users/${user.uid}/customers`),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
        );

        const unsubscribe = onSnapshot(customersQuery, (snapshot) => {
            if (snapshot.empty) {
                setCustomers([]);
                setFirstVisible(null);
                setLastVisible(null);
                setIsLastPage(true);
                setIsFirstPage(true);
            } else {
                const fetchedCustomers: StoreCustomer[] = [];
                snapshot.forEach(doc => fetchedCustomers.push({ id: doc.id, ...doc.data() } as StoreCustomer));
                setCustomers(fetchedCustomers);
                setFirstVisible(snapshot.docs[0]);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setIsLastPage(snapshot.docs.length < PAGE_SIZE);
                setIsFirstPage(true);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError("Failed to load customers.");
            setIsLoading(false);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        });

        return () => unsubscribe();
    }, [user, storeId, toast]);

    const fetchPage = async (direction: 'next' | 'prev') => {
        if (!user || !storeId) return;
        setIsLoading(true);

        const baseQuery = query(
            collection(db, `users/${user.uid}/customers`),
            where("storeId", "==", storeId),
            orderBy("createdAt", "desc")
        );

        let pageQuery;
        if (direction === 'next' && lastVisible) {
            pageQuery = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
            setIsFirstPage(false);
        } else if (direction === 'prev' && firstVisible) {
            pageQuery = query(baseQuery, endBefore(firstVisible), limit(PAGE_SIZE));
            setIsLastPage(false);
        } else {
            setIsLoading(false);
            return;
        }

        const querySnapshot = await getDocs(pageQuery);
        if (!querySnapshot.empty) {
            const fetchedCustomers: StoreCustomer[] = [];
            querySnapshot.forEach(doc => fetchedCustomers.push({ id: doc.id, ...doc.data() } as StoreCustomer));
            setCustomers(fetchedCustomers);
            setFirstVisible(querySnapshot.docs[0]);
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            if (direction === 'next') setIsLastPage(querySnapshot.docs.length < PAGE_SIZE);
            if (direction === 'prev') {
                const firstDocQuery = query(baseQuery, limit(1));
                const firstDocSnap = await getDocs(firstDocQuery);
                setIsFirstPage(firstDocSnap.docs[0].id === querySnapshot.docs[0].id);
            }
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
                <CardTitle className="flex items-center gap-2"><Users /> Store Customers</CardTitle>
                <CardDescription>A list of all customers who have made purchases from this store.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No customers found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">Orders</TableHead>
                                <TableHead className="text-right">Total Spent</TableHead>
                                <TableHead>First Purchase</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell className="text-center">{customer.orderCount}</TableCell>
                                    <TableCell className="text-right">${customer.totalSpent.toFixed(2)}</TableCell>
                                    <TableCell>{customer.createdAt ? format(customer.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
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

export default CustomersPage;
