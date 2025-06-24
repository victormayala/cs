
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const userId = searchParams.get('state');

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!code || !shop || !hmac || !userId) {
    return NextResponse.json({ error: 'Missing required parameters from Shopify callback.' }, { status: 400 });
  }

  if (!apiKey || !apiSecret || !appUrl) {
    console.error("Shopify callback error: Shopify credentials are not fully configured on the server.");
    return NextResponse.json({ error: 'Application credentials for Shopify are not configured.' }, { status: 500 });
  }

  // 1. HMAC Verification
  const map = Object.fromEntries(searchParams.entries());
  delete map.hmac;
  const message = new URLSearchParams(map).toString();
  const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

  if (generatedHmac !== hmac) {
    return NextResponse.json({ error: 'HMAC validation failed. Request might be fraudulent.' }, { status: 403 });
  }

  // 2. Exchange authorization code for an access token
  const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
  try {
    const tokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Shopify callback error: Did not receive access token. Shopify's response:", tokenData);
      const shopifyError = tokenData.error_description || JSON.stringify(tokenData);
      return NextResponse.json({ error: `Authentication failed. Shopify Error: ${shopifyError}` }, { status: 500 });
    }

    // 3. Redirect back to the dashboard with the token to be saved on the client-side
    // This ensures the write to Firestore happens with the user's authenticated context.
    const redirectDashboardUrl = new URL(`${appUrl}/dashboard`);
    redirectDashboardUrl.searchParams.set('shopify_shop', shop);
    redirectDashboardUrl.searchParams.set('shopify_access_token', accessToken);
    
    return NextResponse.redirect(redirectDashboardUrl);

  } catch (error: any) {
    console.error("Error during Shopify token exchange:", error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
