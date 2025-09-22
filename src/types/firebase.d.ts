declare module 'firebase/firestore' {
    import type { Firestore } from '@firebase/firestore-types';
    export function doc(db: Firestore, ...pathSegments: string[]): any;
    export function getDoc(doc: any): Promise<{ exists: () => boolean; data: () => any }>;
}

declare module 'firebase/storage' {
    export function uploadString(storageRef: any, dataUrl: string, format: string): Promise<any>;
    export function ref(storage: any, path: string): any;
    export function getDownloadURL(ref: any): Promise<string>;
}

declare module 'next/dynamic' {
    export default function dynamic<T>(dynamicOptions: () => Promise<{ default: T }>, options?: {
        loading?: () => JSX.Element;
        ssr?: boolean;
    }): T;
}