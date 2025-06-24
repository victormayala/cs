
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Creates an HTML response that redirects the top-level window, breaking out of Shopify's iframe.
 * @param url The URL to redirect to.
 * @returns A Response object containing the redirect script.
 */
function createExitIframeRedirectResponse(url: string): Response {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="text/javascript">
          window.top.location.href = "${url}";
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const userId = searchParams.get('state');

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const dashboardUrl = new URL(appUrl ? `${appUrl}/dashboard` : '/dashboard');

  // Helper to create a standardized error redirect response
  const createErrorRedirect = (description: string) => {
    dashboardUrl.searchParams.set('error', 'shopify_auth_failed');
    dashboardUrl.searchParams.set('error_description', description);
    return createExitIframeRedirectResponse(dashboardUrl.toString());
  };

  if (!code || !shop || !hmac || !userId) {
    return createErrorRedirect('Missing required parameters from Shopify callback.');
  }

  if (!apiKey || !apiSecret || !appUrl) {
    console.error("Shopify callback error: Shopify credentials are not fully configured on the server.");
    return createErrorRedirect('Application credentials for Shopify are not configured on the server.');
  }

  // 1. HMAC Verification
  const map = Object.fromEntries(searchParams.entries());
  delete map.hmac;
  const message = new URLSearchParams(map).toString();
  const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

  if (generatedHmac !== hmac) {
    return createErrorRedirect('HMAC validation failed. The request could not be verified. Please try again.');
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

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(`Shopify token exchange failed with status ${tokenResponse.status}:`, errorBody);
      return createErrorRedirect(`Shopify API returned an error (Status: ${tokenResponse.status}). Please check the server logs.`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      const shopifyError = tokenData.error_description || JSON.stringify(tokenData);
      console.error("Shopify callback error: Did not receive access token. Shopify's response:", tokenData);
      return createErrorRedirect(`Authentication failed. Shopify's reason: ${shopifyError}`);
    }

    // 3. Success: Redirect back to the dashboard with the token
    dashboardUrl.searchParams.set('shopify_shop', shop);
    dashboardUrl.searchParams.set('shopify_access_token', accessToken);
    
    return createExitIframeRedirectResponse(dashboardUrl.toString());

  } catch (error: any) {
    console.error("Error during Shopify token exchange fetch call:", error);
    return createErrorRedirect(`An unexpected network or server error occurred: ${error.message}`);
  }
}
