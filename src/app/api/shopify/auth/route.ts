
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const userId = searchParams.get('userId');

  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_APP_SCOPES || 'read_products';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!shop) {
    return NextResponse.json({ error: 'Shop name is required.' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required for authentication state.' }, { status: 400 });
  }
  if (!apiKey || !appUrl) {
    console.error("Shopify auth error: SHOPIFY_API_KEY or NEXT_PUBLIC_APP_URL is not set in environment variables.");
    return NextResponse.json({ error: 'Shopify application credentials are not configured on the server.' }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/shopify/callback`;
  
  // The state parameter is used for security and to pass the userId back to the callback.
  const state = userId; 

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
