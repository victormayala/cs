
# Shopify App Integration Requirements for Customizer Studio

## 1. Overview

This document outlines the technical requirements and data flow for building a Shopify App to seamlessly integrate the Customizer Studio into a Shopify product page. The goal is to allow customers to personalize a product using the Customizer Studio iframe and have their unique design data attached to the product when they add it to the cart.

The integration relies on three main components:
1.  **A Shopify App**: Handles authentication and provides the necessary Theme App Extension.
2.  **A Theme App Extension (App Block)**: The frontend component that gets added to a product page in the Shopify Theme Editor. It renders the "Customize" button and the iframe that loads Customizer Studio.
3.  **The Customizer Studio Application**: The existing application which runs inside the iframe and serves the customization experience.

---

## 2. Core Concepts: How Customizer Studio Options Work

Before diving into the implementation, it's crucial to understand how the Shopify store, the Shopify App, and Customizer Studio are linked.

### The `configUserId`: The Link Between Systems

Every user account in Customizer Studio has a unique **User ID**. In the context of this integration, we refer to it as the `configUserId`. This ID is the **single most important piece of data** for the integration.

- **What it does**: The `configUserId` acts as a key that links a Shopify store to a specific set of product configurations (views, design areas, color-variant images, etc.) saved within the Customizer Studio database.
- **How it's used**: The Shopify merchant will copy their User ID from their Customizer Studio profile and paste it into a setting field within the Shopify App Block on their product page.

### The Data Lookup Process (The "Magic")

When a customer visits a product page on the Shopify store, here is the sequence of events that happens behind the scenes to load the correct customizer:

1.  The Shopify App Block on the page reads two critical pieces of data:
    *   The **Shopify Product ID** of the current product.
    *   The **`configUserId`** that the merchant saved in the block's settings.
2.  The App Block uses this information to construct a special URL for the Customizer Studio iframe. This URL contains the `productId` and `configUserId` as query parameters.
3.  When the iframe loads this URL, the Customizer Studio application performs the following actions:
    *   It uses the `configUserId` and `productId` to query its own database (Firestore) and find the specific customization options that the merchant has saved for that exact product (e.g., "Front" and "Back" views, defined design areas, etc.).
    *   It uses the same `configUserId` to retrieve the merchant's securely stored Shopify API credentials from its database.
    *   Using those credentials, it makes a server-to-server API call to Shopify to fetch the live product details, such as the base product image.
    *   Finally, it combines the live product data from Shopify with the saved configuration settings from its own database to present a fully configured, ready-to-use customizer to the end-user.

This entire process ensures that the correct, up-to-date product information is always displayed with the merchant's specific customization rules applied.

---

## 3. Shopify App Setup (Partner Dashboard)

1.  **Create a New App**: In your Shopify Partner Dashboard, create a new "Public App" or "Custom App".
2.  **Authentication**:
    *   The app must use OAuth 2.0 to get API credentials from merchants. This allows Customizer Studio to fetch product data on their behalf.
    *   **App URL**: `https://<your-app-domain>/`
    *   **Allowed redirection URL(s)**: `https://<your-app-domain>/api/shopify/callback`
3.  **API Scopes**: Request the following minimum access scopes.
    *   `read_products`: To get product details (like the main image) for the customizer.
    *   You may require more scopes in the future (e.g., `write_products` if you want to manage metafields).
4.  **API Credentials**: Note the **Client ID (API key)** and **Client secret**. These will be used as environment variables in your Customizer Studio deployment (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET_KEY`).

---

## 4. Theme App Extension: The Integration Bridge

This is the most critical part of the integration. This block will be added to product templates via the Shopify Theme Editor.

### User Flow (Merchant & Customer)

- **Merchant**: Adds the "Customizer" block to their product page template, enters their unique `configUserId` into the block's settings, and saves the theme.
- **Customer**: Sees a "Customize Product" button. Clicking it opens a full-screen modal containing the Customizer Studio iframe. After creating their design, they click "Add to Cart" *inside the iframe*. The iframe sends the design data back to the product page, the modal closes, and the data is silently attached to the main product form.

### App Block Settings (The Merchant's Configuration)

The app block must have one crucial setting:

*   **Customizer Studio User ID (`config_user_id`)**: A text field where the merchant pastes their unique User ID from their Customizer Studio profile. This is the `configUserId` discussed in the Core Concepts section.

### Frontend Logic (Liquid & JavaScript - The Technical Implementation)

The app block will contain Liquid to render HTML and JavaScript to handle all the logic.

**File Structure (Conceptual):**
```
/extensions
  /theme-app-ext
    /blocks
      - customizer-button.liquid
    /assets
      - customizer.js
```

**`customizer-button.liquid` (Simplified):**

This file sets up the HTML structure.

```liquid
{{ 'customizer.js' | asset_url | script_tag }}

{# This container holds the necessary data for the JavaScript file. #}
<div
  class="customizer-studio-container"
  data-product-id="{{ product.id }}"
  data-config-user-id="{{ block.settings.config_user_id }}"
>
  <button id="cs-open-customizer-btn" type="button" class="your-button-styles">
    Customize Product
  </button>
</div>

{# This is the modal that will contain the iframe. It's hidden by default. #}
<div id="cs-iframe-modal" class="cs-modal-hidden">
  <div class="cs-modal-content">
    <button id="cs-close-iframe-btn">&times;</button>
    <iframe id="cs-iframe-element" frameborder="0"></iframe>
  </div>
</div>

{# This hidden input is the key to adding the customization data to the cart. Shopify automatically picks up inputs with name="properties[...]" as line item properties. #}
<input type="hidden" name="properties[_customizationData]" id="cs-customization-data-input" form="{{ product_form_id }}">

<style>
  /* Basic modal styles for a full-screen overlay. */
  .cs-modal-hidden { display: none; }
  .cs-modal-content { /* styles for a full-screen modal */ }
</style>
```

**`customizer.js` (Core Logic):**

This script is the brain of the operation.

1.  **Initialize**: On page load, get the `productId` and `configUserId` from the `data-*` attributes of the container `div`.

2.  **Open Modal & Construct URL**: When the "Customize" button is clicked, it must construct the correct Customizer Studio URL and set it as the `iframe`'s `src`.
    *   **URL Structure**: `https://<your-app-domain>/customizer`
    *   **Required Query Parameters**:
        *   `productId`: The product's GID (e.g., `gid://shopify/Product/12345`). The script must construct this from the numeric product ID.
        *   `source`: Set to `shopify`.
        *   `configUserId`: The ID from the block settings.
        *   `viewMode`: Set to `embedded`. This tells the Customizer Studio UI to hide its standard header/footer, making it look seamless inside the modal.

3.  **Listen for Design Data (`postMessage`)**: The script must listen for a `message` event from the iframe. This is how the final design data is sent back from Customizer Studio.
    *   **SECURITY**: It is **critical** to validate the origin of the message (`event.origin`) to ensure it's coming from your Customizer Studio domain. This prevents malicious data from being injected.
    *   The data will be in a specific format, e.g., `event.data.customizerStudioDesignData`.

4.  **Update Form**: When valid data is received, the script must `JSON.stringify()` the data object and set it as the `value` of the hidden `_customizationData` input field. It then closes the modal.

---

## 5. How Customization Data is Saved to the Order

### Line Item Properties Explained

By using `name="properties[_customizationData]"`, Shopify automatically treats the data from the hidden input as a **Line Item Property**. This is a standard Shopify feature for associating extra information with a specific item in the cart.

-   **In the Cart**: The customization data will be attached to the product when the customer adds it to their cart. You may need to edit your theme's cart template to display this information to the customer for confirmation.
-   **In the Order**: The data is saved with the order and will be visible in the Shopify Admin on the order details page. This provides the fulfillment team with all the necessary information to create the custom product. The data will be a JSON string and will need to be parsed to be read easily.
