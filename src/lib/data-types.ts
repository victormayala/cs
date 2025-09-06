
import type { Timestamp } from 'firebase/firestore';

// Represents a customer who has made a purchase from a specific store
export interface StoreCustomer {
    id: string; // Firestore document ID
    name: string;
    email: string;
    storeId: string; // The ID of the store they purchased from
    createdAt: Timestamp;
    totalSpent: number;
    orderCount: number;
}

// Represents an order placed in a specific store
export interface StoreOrder {
    id: string; // Firestore document ID
    storeId: string;
    customerId: string;
    customerName: string;
    totalAmount: number;
    status: 'processing' | 'shipped' | 'completed' | 'cancelled';
    items: any[]; // A detailed list of items in the order
    createdAt: Timestamp;
}

// Data for the sales chart
export interface SalesData {
  date: string; // e.g., "Mon"
  revenue: number;
}
