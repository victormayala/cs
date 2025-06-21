
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { saveShopifyCredentials } from '@/app/actions/userShopifyCredentialsActions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const userId = searchParams.get('state'); // We passed userId in the state parameter

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

  // 1. HMAC Verification (Security Step)
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Shopify callback error: Did not receive access token.", tokenData);
      return NextResponse.json({ error: 'Failed to obtain access token from Shopify.' }, { status: 500 });
    }

    // 3. Save the credentials securely
    const { success, error } = await saveShopifyCredentials(userId, shop, accessToken);

    if (!success) {
      console.error("Shopify callback error: Failed to save credentials to Firestore.", error);
      return NextResponse.json({ error: `Failed to save credentials: ${error}` }, { status: 500 });
    }
    
    // 4. Redirect user back to the dashboard with a success indicator
    return NextResponse.redirect(`${appUrl}/dashboard?shopify_connected=true`);

  } catch (error: any) {
    console.error("Error during Shopify token exchange:", error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
