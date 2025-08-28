// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase/auth';
import { auth } from './lib/firebase'; // Ensure auth is exported from firebase.ts

// This is a conceptual approach. In a real-world app, you would use
// a more robust solution like 'next-firebase-auth' or manage session cookies
// to get the user's token on the server.
function getUserIdFromRequest(request: NextRequest): string | null {
    // 1. Check for a custom header set by the client (e.g., 'X-User-ID')
    const userId = request.headers.get('X-User-ID');
    if (userId) {
        return userId;
    }
    
    // 2. Check for an Authorization Bearer token
    // In a real app, you would verify this token using Firebase Admin SDK.
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Here you would normally verify the token.
        // For this context, we are just illustrating the pattern.
        // A robust implementation is needed for production.
        // console.warn("Middleware found a Bearer token, but is not verifying it. Production requires verification.");
    }
    
    // 3. Fallback to checking a session cookie (conceptual)
    const sessionCookie = request.cookies.get('firebase-session');
    if (sessionCookie) {
        // Again, verification with Admin SDK is needed.
        // console.warn("Middleware found a session cookie, but is not verifying it.");
    }

    return null;
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const userId = getUserIdFromRequest(request);

  // If a user ID is found, forward it in the request headers to Server Components/Actions
  if (userId) {
    requestHeaders.set('X-User-ID', userId);
  }
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
