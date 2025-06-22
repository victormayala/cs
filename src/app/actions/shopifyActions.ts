
'use server';

import type { ShopifyProduct } from '@/types/shopify';

interface FetchShopifyProductsResponse {
  products?: ShopifyProduct[];
  error?: string;
}

const getProductsQuery = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          status
          updatedAt
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`;

export async function fetchShopifyProducts(
  shop: string,
  accessToken: string
): Promise<FetchShopifyProductsResponse> {
  const endpoint = `https://${shop}/admin/api/2024-07/graphql.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: getProductsQuery,
        variables: { first: 50 }, // Fetch up to 50 products
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorLog = `Shopify API error during product fetch: ${response.status} ${response.statusText}. URL: ${endpoint}. Response: ${errorBody}`;
      console.error(errorLog);
      return { error: `Failed to fetch Shopify products. Status: ${response.status}. Please check server logs.` };
    }

    const jsonResponse = await response.json();

    if (jsonResponse.errors) {
      console.error('Shopify GraphQL Errors:', jsonResponse.errors);
      return { error: `GraphQL error fetching products: ${jsonResponse.errors[0].message}` };
    }
    
    const products: ShopifyProduct[] = jsonResponse.data.products.edges.map(
      (edge: { node: any }) => edge.node
    );

    return { products };
  } catch (error: any) {
    const errorLog = `Network or fetch error during Shopify product fetch. URL: ${endpoint}. Error: ${error.message || error}`;
    console.error(errorLog, error);
    return { error: `An unexpected network or fetch error occurred with Shopify. Please check server logs.` };
  }
}

// ---- New function and types for fetching a single product ----

interface FetchShopifyProductByIdResponse {
  product?: ShopifyProduct;
  error?: string;
}

const getProductByIdQuery = `
  query getProductById($id: ID!) {
    node(id: $id) {
      ... on Product {
        id
        title
        handle
        status
        updatedAt
        description(truncateAt: 1000)
        featuredImage {
          url
          altText
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export async function fetchShopifyProductById(
  shop: string,
  accessToken: string,
  productId: string
): Promise<FetchShopifyProductByIdResponse> {
  const endpoint = `https://${shop}/admin/api/2024-07/graphql.json`;

  // Defensively format the productId to ensure it's a valid GID
  let gqlProductId = productId;
  if (!/gid:\/\/shopify\/Product\/\d+/.test(productId)) {
    console.warn(`Shopify Product ID "${productId}" was not in GID format. Attempting to format it.`);
    // Extracts numeric part from a GID-like string or uses the string if it's already numeric.
    const numericId = productId.split('/').pop();
    gqlProductId = `gid://shopify/Product/${numericId}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: getProductByIdQuery,
        variables: { id: gqlProductId },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorLog = `Shopify API error fetching product ${gqlProductId}: ${response.status} ${response.statusText}. URL: ${endpoint}. Response: ${errorBody}`;
      console.error(errorLog);
      return { error: `Failed to fetch Shopify product. Status: ${response.status}. Please check server logs.` };
    }

    const jsonResponse = await response.json();

    if (jsonResponse.errors) {
      console.error(`Shopify GraphQL Errors for product ${gqlProductId}:`, jsonResponse.errors);
      return { error: `GraphQL error fetching product: ${jsonResponse.errors[0].message}` };
    }

    const product: ShopifyProduct = jsonResponse.data.node;

    if (!product) {
      return { error: `Product with ID ${gqlProductId} not found or is not a Product type.` };
    }

    return { product };
  } catch (error: any) {
    const errorLog = `Network or fetch error fetching Shopify product ${gqlProductId}. URL: ${endpoint}. Error: ${error.message || error}`;
    console.error(errorLog, error);
    return { error: `An unexpected network or fetch error occurred with Shopify. Please check server logs.` };
  }
}
    