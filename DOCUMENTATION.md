
# Customizer Studio Documentation

## 1. Overview

Customizer Studio is a full-stack Next.js application designed to provide a powerful product customization experience. It allows end-users to personalize products with text, images, and AI-generated designs. The application serves two primary functions:

1.  **A SaaS Dashboard**: A secure, multi-tenant interface where business owners (merchants) can connect their e-commerce stores (Shopify, WooCommerce), configure customization options for their products, and build their own standalone storefronts.
2.  **An Embeddable Customizer Tool**: A highly interactive interface that can be embedded via an iframe into external e-commerce sites (like Shopify or WordPress) or used within its own generated storefronts.

The stack includes Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Firebase (for authentication and database), and Google's Genkit (for all generative AI features).

---

## 2. Core Architectural Concepts

### 2.1. The `configUserId`

The `configUserId` is the **most critical identifier** in the system. It is the unique ID of a registered user (merchant) in Customizer Studio. This ID acts as the primary key that links a merchant's account to all their associated data, including:

-   **Product Configurations**: Which products are customizable, their views (e.g., front, back), design areas, and variant-specific images.
-   **Store Credentials**: Securely stored API keys for connected Shopify or WooCommerce stores.
-   **Generated Store Settings**: The configuration for a merchant's own generated storefront, including layout, branding, volume discounts, and shipping options.

When the customizer tool is embedded, the `configUserId` is passed as a query parameter, allowing the application to fetch the correct set of rules and assets for the specific merchant's store.

### 2.2. Product Types

The system handles three distinct types of products:

1.  **Shopify & WooCommerce Products (External)**: Products synced from an external e-commerce store. The base product information (name, price, images) is fetched live from the respective platform's API. The customization options are defined within Customizer Studio and stored in Firestore, linked by the product ID and the `configUserId`.
2.  **Native Products (Internal)**: Products created and managed entirely within Customizer Studio. All data, including base information and customization options, is stored in Firestore. These are the products that populate a user's generated storefront.
3.  **Generated Storefronts**: Merchants can design, configure, and deploy a complete, standalone e-commerce store from the dashboard. These stores are powered by the merchant's "Native Products" and feature their chosen branding, layout, and business logic (like volume discounts).

---

## 3. Key Features and Flows

### 3.1. Generated Storefronts

-   **Creation & Configuration**: Managed in `/dashboard/store/create` (and the subsequent `/dashboard/store/[storeId]/...` pages). Merchants can set a store name, choose a layout, and define branding.
-   **Page Content Management**: A comprehensive editor allows merchants to define the content for all key pages of their store, including:
    -   **Homepage**: Hero section, features, testimonials, and call-to-action content.
    -   **Static Pages**: About, Contact, FAQ, Terms of Service, and Privacy Policy.
-   **Store-Level Management**: Each created store has its own dedicated management area, which includes:
    -   A **Dashboard** with analytics for total revenue, sales, and customers.
    -   An **Orders** page to view all purchases made through the store.
    -   A **Customers** page to see a list of all customers.
    -   An **Approved Files** manager to upload brand assets (e.g., logos) that become available in the customizer's "Uploads" panel for that specific store.
-   **Business Logic**: Merchants can configure:
    -   **Volume Discounts**: Set quantity-based percentage discounts.
    -   **Shipping**: A simple "Local Delivery" option can be enabled with a custom fee and text.
    -   **Embroidery Fee**: A store-wide, one-time setup fee for embroidery.
-   **Deployment**: The `deployStore` Genkit flow simulates a deployment process, generating a mock URL for the storefront. In a real-world scenario, this flow would trigger a CI/CD pipeline.
-   **Public Access**: The generated store is accessible via `/store/{storeId}`, with its associated pages like `/store/{storeId}/about`, `/store/{storeId}/faq`, etc.

### 3.2. The Customizer (`/customizer`)

This is the core interactive component. It's a single page that dynamically loads product data based on URL query parameters.

-   **Loading Logic**: It checks for `productId`, `source`, `configUserId`, `storeId`, and `basePrice` to fetch the correct product details and customization options.
-   **Tool Panels**:
    -   **AI Assistant**: Generates new designs from a text prompt (`generateDesignFromPrompt` flow) and can make backgrounds transparent (`makeBackgroundTransparent` flow).
    -   **Uploads**: A unified panel where users can upload their own images, and also access any pre-approved brand assets (like logos) specific to the store they are using.
    -   **Text, Shapes, Clipart, Designs**: Tools for adding and manipulating various elements on the canvas.
    -   **Layers**: Manages the stacking order (z-index) of all canvas elements.
-   **Technique Selection**: If a product has multiple customization techniques enabled (e.g., Embroidery, Print), the user can select their preferred method from a dropdown, which dynamically adjusts the pricing based on per-view fees.
-   **`postMessage` API**: When in `embedded` mode, the customizer uses the browser's `postMessage` API to send the final, complete design data object back to the parent window (the Shopify or WordPress site). This is crucial for adding the customization details to the cart.

### 3.3. Product Options Configuration (`/dashboard/products/.../options`)

This is where merchants define how a product can be customized.

-   **Customization Techniques**: Merchants can enable various techniques for a native product, such as Embroidery, DTF, DTG, etc. This selection determines which fees are applied on the storefront.
-   **Product Views**: Merchants can define multiple views (e.g., front, back, sleeve) for a single product, each with its own base image.
-   **Per-View Pricing**: For each view, merchants can set an `Embroidery Additional Fee` and a `Print Additional Fee`. This allows for granular pricing based on both the location of the customization and the technique used.
-   **Design Areas (Boundary Boxes)**: For each view, merchants can draw rectangular "boundary boxes" to constrain where customers can place their designs.
-   **Variant Images**: For variable products, merchants can upload specific images that should be displayed when a customer selects a particular color variant.
-   **Attribute Ordering**: Merchants can re-order color and size attributes using up/down arrows, and this order will be reflected on the Product Detail Page.

---

## 4. AI Flows (Genkit)

All AI functionality is handled by Genkit flows located in `src/ai/flows/`.

-   **`generateDesignFromPrompt`**: Takes a user's text prompt and uses a multimodal model to generate a design image with a transparent background and a descriptive alt text.
-   **`compositeImages`**: The engine behind the "Preview" feature. It takes a base product image and an array of overlay images (text, uploads, clipart) with their transform data (position, scale, rotation). It then uses an AI model to composite them into a single, final preview image.
-   **`generateTextImage` / `generateShapeImage`**: Utility flows that convert text and geometric shape definitions into actual image data (PNGs with transparent backgrounds) so they can be treated as standard image overlays by the `compositeImages` flow.
-   **`makeBackgroundTransparent`**: An AI-powered utility to remove the background from an image uploaded by a user.
-   **`suggestDesignElements`**: A simple flow that analyzes the current design composition and suggests related elements.

---

## 5. Public API Endpoints

The application exposes several serverless API routes under `src/app/api/` that are primarily consumed by the generated storefronts and external plugins.

-   **`/api/store/products`**: Fetches all "Native Products" for a given `configUserId`. Used by the Product Listing Page (PLP) of a generated store.
-   **`/api/store/products/{productId}`**: Fetches the detailed public data for a single native product, including all its views and attributes. Used by the Product Detail Page (PDP).
-   **`/api/preview`**: A POST endpoint that receives the state of the customizer canvas (base image, elements, transforms) and returns a final composited preview image by calling the `compositeImages` flow.
-   **`/api/product-customization-check`**: A simple endpoint for the WordPress plugin to check if customization is enabled for a specific product ID for a given `configUserId`.
-   **`/api/shopify/...`**: Handles the OAuth flow for connecting a Shopify store.
